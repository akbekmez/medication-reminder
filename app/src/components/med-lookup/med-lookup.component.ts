import { Component, ChangeDetectionStrategy, output, inject, signal, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService } from '../../services/gemini.service';
import { VapiService, VapiMedicationInfo } from '../../services/vapi.service';

type LookupState = 'idle' | 'processing' | 'success' | 'error';

@Component({
  selector: 'app-med-lookup',
  templateUrl: './med-lookup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class MedLookupComponent implements OnDestroy {
  private geminiService = inject(GeminiService);
  private vapiService = inject(VapiService);

  closeModal = output<void>();

  @ViewChild('videoElement') videoElement: ElementRef<HTMLVideoElement> | undefined;
  @ViewChild('canvasElement') canvasElement: ElementRef<HTMLCanvasElement> | undefined;
  @ViewChild('fileInput') fileInput: ElementRef<HTMLInputElement> | undefined;

  lookupState = signal<LookupState>('idle');
  isCameraOpen = signal(false);
  processingMessage = signal('');
  errorMessage = signal<string | null>(null);
  medicationDetails = signal<VapiMedicationInfo | null>(null);
  
  private stream: MediaStream | null = null;

  ngOnDestroy() {
    this.closeCamera();
  }
  
  resetState() {
    this.lookupState.set('idle');
    this.medicationDetails.set(null);
    this.errorMessage.set(null);
    this.processingMessage.set('');
  }

  triggerFileUpload() {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const base64Image = (reader.result as string).split(',')[1];
      this.processImage(base64Image);
    };
    reader.onerror = (error) => {
      this.errorMessage.set('Dosya okunurken bir hata oluştu.');
      this.lookupState.set('error');
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  async openCamera() {
    try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            if (this.videoElement) {
                this.isCameraOpen.set(true);
                this.errorMessage.set(null);
                setTimeout(() => {
                  if(this.videoElement) {
                    this.videoElement.nativeElement.srcObject = this.stream;
                  }
                }, 50);
            }
        } else {
            this.handleCameraError('Kamera desteği bu tarayıcıda bulunamadı.');
        }
    } catch (err) {
        this.handleCameraError('Kamera erişimi reddedildi. Lütfen tarayıcı ayarlarından izin verin.');
    }
  }

  private handleCameraError(message: string) {
    this.errorMessage.set(message);
    this.lookupState.set('error');
    this.isCameraOpen.set(false); // Make sure camera view is closed and error is shown in modal.
  }

  closeCamera() {
      if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
      }
      this.stream = null;
      this.isCameraOpen.set(false);
      if (this.lookupState() === 'processing') {
        this.resetState();
      }
  }

  async captureImage() {
      if (!this.videoElement || !this.canvasElement || !this.stream) return;
      
      const video = this.videoElement.nativeElement;
      const canvas = this.canvasElement.nativeElement;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64Image = canvas.toDataURL('image/jpeg').split(',')[1];
      this.closeCamera();
      await this.processImage(base64Image);
  }

  private async processImage(base64Image: string) {
      this.lookupState.set('processing');
      this.processingMessage.set('İlaç adı fotoğraftan okunuyor...');
      this.errorMessage.set(null);

      try {
          const geminiResult = await this.geminiService.extractMedicationInfoFromImage(base64Image);
          if (geminiResult && geminiResult.name) {
              const medName = geminiResult.name;
              this.processingMessage.set(`'${medName}' bulundu. Detaylar getiriliyor...`);
              
              const vapiResult = await this.vapiService.getMedicationInfo(medName);

              if (vapiResult) {
                this.medicationDetails.set(vapiResult);
                this.lookupState.set('success');
              } else {
                this.errorMessage.set(`'${medName}' için detaylı bilgi bulunamadı.`);
                this.lookupState.set('error');
              }
          } else {
               this.errorMessage.set('İlaç bilgileri okunamadı. Lütfen daha net bir fotoğraf deneyin.');
               this.lookupState.set('error');
          }
      } catch (error) {
          console.error('Error during image processing chain:', error);
          this.errorMessage.set('İşlem sırasında bir hata oluştu. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.');
          this.lookupState.set('error');
      }
  }
}