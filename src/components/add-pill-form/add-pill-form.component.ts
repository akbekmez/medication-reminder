import { Component, ChangeDetectionStrategy, input, output, OnInit, inject, signal, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Medication, Schedule } from '../../models/medication.model';
import { GeminiService } from '../../services/gemini.service';
import { IlacabakService } from '../../services/ilacabak.service';

@Component({
  selector: 'app-add-pill-form',
  templateUrl: './add-pill-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
})
export class AddPillFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private geminiService = inject(GeminiService);
  private ilacabakService = inject(IlacabakService);

  medicationToEdit = input<Medication | undefined>();
  closeModal = output<void>();
  savePill = output<Omit<Medication, 'id' | 'takenHistory'>>();
  
  @ViewChild('videoElement') videoElement: ElementRef<HTMLVideoElement> | undefined;
  @ViewChild('canvasElement') canvasElement: ElementRef<HTMLCanvasElement> | undefined;
  @ViewChild('fileInput') fileInput: ElementRef<HTMLInputElement> | undefined;

  pillForm: FormGroup;
  showMoreDetails = signal(false);
  isCameraOpen = signal(false);
  isProcessing = signal(false);
  processingMessage = signal('');
  errorMessage = signal<string | null>(null);
  scanOptionsOpen = signal(false);

  private stream: MediaStream | null = null;

  constructor() {
    this.pillForm = this.fb.group({
      name: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unit: ['', Validators.required],
      notes: [''],
      purpose: [''],
      prescribedFor: [''],
      stock: [null, [Validators.min(0)]],
      lowStockThreshold: [null, [Validators.min(0)]],
      prescriptionReport: this.fb.group({
        isEnabled: [false],
        endDate: ['']
      }),
      // Detailed fields
      company: [''],
      activeSubstance: [''],
      prescriptionStatus: ['prescription'],
      instructions: [''],
      barcode: [''],
      price: [null, [Validators.min(0)]],
      atcCode: [''],

      scheduleType: ['timeOfDay', Validators.required],
      times: this.fb.group({
        morning: [true],
        noon: [false],
        evening: [false],
      }),
      interval: this.fb.group({
        hours: [12],
        startHour: [8],
      }),
    });
  }

  ngOnInit() {
    const med = this.medicationToEdit();
    if (med) {
      this.pillForm.patchValue({
        name: med.name,
        quantity: med.quantity,
        unit: med.unit,
        notes: med.notes,
        purpose: med.purpose,
        prescribedFor: med.prescribedFor,
        stock: med.stock,
        lowStockThreshold: med.lowStockThreshold,
        scheduleType: med.schedule.type,
        company: med.company,
        activeSubstance: med.activeSubstance,
        prescriptionStatus: med.prescriptionStatus,
        instructions: med.instructions,
        barcode: med.barcode,
        price: med.price,
        atcCode: med.atcCode,
      });

      if (med.prescriptionReport) {
        this.pillForm.get('prescriptionReport')?.patchValue(med.prescriptionReport);
      }

      if (med.schedule.type === 'timeOfDay') {
        this.pillForm.get('times')?.patchValue(med.schedule.times);
      } else {
        this.pillForm.get('interval')?.patchValue({
          hours: med.schedule.hours,
          startHour: med.schedule.startHour
        });
      }
    }

    this.pillForm.get('scheduleType')?.valueChanges.subscribe(type => {
      this.updateValidators(type);
    });
    this.updateValidators(this.pillForm.get('scheduleType')?.value);

    this.pillForm.get('prescriptionReport.isEnabled')?.valueChanges.subscribe(isEnabled => {
        const endDateControl = this.pillForm.get('prescriptionReport.endDate');
        if (isEnabled) {
            endDateControl?.setValidators([Validators.required]);
        } else {
            endDateControl?.clearValidators();
        }
        endDateControl?.updateValueAndValidity();
    });
  }
  
  ngOnDestroy() {
    this.closeCamera();
  }

  toggleScanOptions() {
    this.scanOptionsOpen.set(!this.scanOptionsOpen());
  }

  triggerFileUpload() {
    this.scanOptionsOpen.set(false);
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const base64Image = (reader.result as string).split(',')[1];
      this.processImage(base64Image);
    };
    reader.onerror = (error) => {
      console.error('File reading error:', error);
      this.errorMessage.set('Dosya okunurken bir hata oluştu.');
    };
    reader.readAsDataURL(file);
    input.value = ''; // Reset input to allow same file selection again
  }

  async openCamera() {
    this.scanOptionsOpen.set(false);
    try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } // Prefer back camera
            });
            if (this.videoElement) {
                this.isCameraOpen.set(true);
                this.errorMessage.set(null);
                // Use a short delay to ensure the video element is visible before playing
                setTimeout(() => {
                  if(this.videoElement) {
                    this.videoElement.nativeElement.srcObject = this.stream;
                  }
                }, 50);
            }
        } else {
            this.errorMessage.set('Kamera desteği bu tarayıcıda bulunamadı.');
            this.isCameraOpen.set(true); // Open to show error
        }
    } catch (err) {
        console.error("Camera access error:", err);
        this.errorMessage.set('Kamera erişimi reddedildi. Lütfen tarayıcı ayarlarından izin verin.');
        this.isCameraOpen.set(true); // Open to show error
    }
  }

  closeCamera() {
      if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
      }
      this.stream = null;
      this.isCameraOpen.set(false);
      this.isProcessing.set(false);
      this.errorMessage.set(null);
  }

  async captureImage() {
      if (!this.videoElement || !this.canvasElement || !this.stream) return;
      
      const video = this.videoElement.nativeElement;
      const canvas = this.canvasElement.nativeElement;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];
      await this.processImage(base64Image);
  }
  
  private async processImage(base64Image: string) {
      this.isProcessing.set(true);
      this.processingMessage.set('Fotoğraf analiz ediliyor...');
      this.errorMessage.set(null);

      try {
          const geminiResult = await this.geminiService.extractMedicationInfoFromImage(base64Image);
          if (geminiResult) {
              this.pillForm.patchValue({
                name: geminiResult.name || '',
                company: geminiResult.company || '',
                activeSubstance: geminiResult.activeSubstance || '',
                barcode: geminiResult.barcode || '',
                quantity: geminiResult.quantity || 1,
                unit: geminiResult.unit || ''
              });

              if (this.isCameraOpen()) {
                this.closeCamera();
              }
              
              if (geminiResult.name) {
                this.processingMessage.set(`'${geminiResult.name}' bulundu. Detaylar ilacabak.com'dan alınıyor...`);
                const webResult = await this.ilacabakService.searchDrug(geminiResult.name);
                if (webResult) {
                  this.pillForm.patchValue({
                    company: webResult.company || this.pillForm.value.company,
                    activeSubstance: webResult.activeSubstance || this.pillForm.value.activeSubstance,
                    barcode: webResult.barcode || this.pillForm.value.barcode,
                    price: webResult.price ?? this.pillForm.value.price,
                    atcCode: webResult.atcCode || this.pillForm.value.atcCode,
                    instructions: webResult.instructions || this.pillForm.value.instructions,
                  });
                  this.showMoreDetails.set(true);
                }
              }

          } else {
               this.errorMessage.set('İlaç bilgileri okunamadı. Lütfen daha net bir fotoğraf çekmeyi/yüklemeyi deneyin.');
          }
      } catch (error) {
          console.error('Error during image processing chain:', error);
          this.errorMessage.set('Yapay zeka ile iletişim kurulamadı. İnternet bağlantınızı kontrol edin.');
      } finally {
          this.isProcessing.set(false);
          this.processingMessage.set('');
      }
  }

  updateValidators(scheduleType: 'timeOfDay' | 'interval') {
    const timesGroup = this.pillForm.get('times') as FormGroup;
    if (scheduleType === 'timeOfDay') {
      timesGroup.setValidators(this.atLeastOneCheckboxChecked());
    } else {
      timesGroup.clearValidators();
    }
    timesGroup.updateValueAndValidity();
  }

  atLeastOneCheckboxChecked() {
    return (group: FormGroup): { [key: string]: any } | null => {
      const atLeastOneChecked = Object.keys(group.controls).some(key => group.get(key)?.value);
      return atLeastOneChecked ? null : { 'atLeastOneRequired': true };
    };
  }

  get scheduleType() {
    return this.pillForm.get('scheduleType')?.value;
  }
  
  onSubmit() {
    if (this.pillForm.invalid) {
      this.pillForm.markAllAsTouched();
      return;
    }
    const formValue = this.pillForm.value;
    let schedule: Schedule;

    if (formValue.scheduleType === 'timeOfDay') {
      schedule = {
        type: 'timeOfDay',
        times: formValue.times
      };
    } else {
      schedule = {
        type: 'interval',
        hours: Number(formValue.interval.hours),
        startHour: Number(formValue.interval.startHour)
      };
    }

    const medicationData: Omit<Medication, 'id' | 'takenHistory'> = {
      name: formValue.name,
      quantity: Number(formValue.quantity),
      unit: formValue.unit,
      notes: formValue.notes,
      purpose: formValue.purpose || undefined,
      prescribedFor: formValue.prescribedFor || undefined,
      stock: formValue.stock !== null ? Number(formValue.stock) : undefined,
      lowStockThreshold: formValue.lowStockThreshold !== null ? Number(formValue.lowStockThreshold) : undefined,
      prescriptionReport: formValue.prescriptionReport.isEnabled ? formValue.prescriptionReport : undefined,
      schedule,
      company: formValue.company || undefined,
      activeSubstance: formValue.activeSubstance || undefined,
      prescriptionStatus: formValue.prescriptionStatus,
      instructions: formValue.instructions || undefined,
      barcode: formValue.barcode || undefined,
      price: formValue.price !== null ? Number(formValue.price) : undefined,
      atcCode: formValue.atcCode || undefined,
    };
    
    this.savePill.emit(medicationData);
  }
}