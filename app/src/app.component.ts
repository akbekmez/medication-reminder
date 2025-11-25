import { Component, ChangeDetectionStrategy, signal, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MedicationService } from './services/medication.service';
import { PillListComponent } from './components/pill-list/pill-list.component';
import { AddPillFormComponent } from './components/add-pill-form/add-pill-form.component';
import { MedLookupComponent } from './components/med-lookup/med-lookup.component';
import { Medication, MedicationWithNextDose } from './models/medication.model';
import { ProfileService } from './services/profile.service';
import { ProfileManagerComponent } from './components/profile-manager/profile-manager.component';
import { Profile } from './models/profile.model';
import { SmartAssistantComponent } from './components/smart-assistant/smart-assistant.component';
import { AdherenceReportComponent } from './components/adherence-report/adherence-report.component';
import { SmartRefillComponent } from './components/smart-refill/smart-refill.component';
import { HealthTrackerComponent } from './components/health-tracker/health-tracker.component';
import { BloodPressureReading, BloodSugarReading } from './models/health-reading.model';
import { SymptomLog } from './models/symptom-log.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, PillListComponent, AddPillFormComponent, MedLookupComponent, DatePipe, ProfileManagerComponent, SmartAssistantComponent, AdherenceReportComponent, SmartRefillComponent, HealthTrackerComponent],
})
export class AppComponent implements OnInit {
  private medicationService = inject(MedicationService);
  private profileService = inject(ProfileService);

  isAddPillModalOpen = signal(false);
  isHistoryModalOpen = signal(false);
  isDetailsModalOpen = signal(false);
  isLookupModalOpen = signal(false);
  isProfileManagerOpen = signal(false);
  isProfileMenuOpen = signal(false);
  isAssistantModalOpen = signal(false);
  isReportModalOpen = signal(false);
  isRefillModalOpen = signal(false);
  isHealthTrackerModalOpen = signal(false);

  medicationToEdit = signal<Medication | undefined>(undefined);
  medicationForHistory = signal<MedicationWithNextDose | undefined>(undefined);
  medicationForDetails = signal<MedicationWithNextDose | undefined>(undefined);
  medicationForRefill = signal<MedicationWithNextDose | undefined>(undefined);
  
  profiles = this.profileService.profiles;
  activeProfile = this.profileService.activeProfile;
  medicationsWithNextDose = this.medicationService.medicationsWithNextDose;

  ngOnInit() {
    this.profileService.init();
    this.medicationService.init();
  }

  openAddPillModal() {
    this.medicationToEdit.set(undefined);
    this.isAddPillModalOpen.set(true);
  }

  openEditPillModal(medication: Medication) {
    this.medicationToEdit.set(medication);
    this.isAddPillModalOpen.set(true);
  }

  closeAddPillModal() {
    this.isAddPillModalOpen.set(false);
    this.medicationToEdit.set(undefined);
  }

  openHistoryModal(medication: MedicationWithNextDose) {
    this.medicationForHistory.set(medication);
    this.isHistoryModalOpen.set(true);
  }

  closeHistoryModal() {
    this.isHistoryModalOpen.set(false);
    this.medicationForHistory.set(undefined);
  }

  openDetailsModal(medication: MedicationWithNextDose) {
    this.medicationForDetails.set(medication);
    this.isDetailsModalOpen.set(true);
  }

  closeDetailsModal() {
    this.isDetailsModalOpen.set(false);
    this.medicationForDetails.set(undefined);
  }

  openLookupModal() {
    this.isLookupModalOpen.set(true);
  }

  closeLookupModal() {
    this.isLookupModalOpen.set(false);
  }
  
  openProfileManager() {
    this.isProfileManagerOpen.set(true);
    this.isProfileMenuOpen.set(false);
  }

  closeProfileManager() {
    this.isProfileManagerOpen.set(false);
  }

  openAssistantModal() {
    this.isAssistantModalOpen.set(true);
  }

  closeAssistantModal() {
    this.isAssistantModalOpen.set(false);
  }

  openReportModal() {
    this.isReportModalOpen.set(true);
  }

  closeReportModal() {
    this.isReportModalOpen.set(false);
  }

  openRefillModal(medication: MedicationWithNextDose) {
    this.medicationForRefill.set(medication);
    this.isRefillModalOpen.set(true);
  }

  closeRefillModal() {
    this.isRefillModalOpen.set(false);
    this.medicationForRefill.set(undefined);
  }
  
  openHealthTrackerModal() {
    this.isHealthTrackerModalOpen.set(true);
  }

  closeHealthTrackerModal() {
    this.isHealthTrackerModalOpen.set(false);
  }

  switchProfile(id: string) {
    this.profileService.switchProfile(id);
    this.isProfileMenuOpen.set(false);
  }
  
  handleAddProfile(profile: Omit<Profile, 'id' | 'medications'>) {
    this.profileService.addProfile(profile);
  }

  handleUpdateProfile(profile: Profile) {
    this.profileService.updateProfile(profile);
  }

  handleDeleteProfile(id: string) {
    this.profileService.deleteProfile(id);
  }

  handleSavePill(medication: Omit<Medication, 'id' | 'takenHistory'>) {
    const medToEdit = this.medicationToEdit();
    if (medToEdit) {
      const updatedMed: Medication = {
        ...medToEdit,
        ...medication,
      };
      this.profileService.updateMedicationInActiveProfile(updatedMed);
    } else {
      this.profileService.addMedicationToActiveProfile(medication);
    }
    this.closeAddPillModal();
  }

  handleDeletePill(id: string) {
    this.profileService.deleteMedicationFromActiveProfile(id);
  }
  
  handleTakePill(id: string) {
    this.profileService.takePillInActiveProfile(id);
  }

  handleAddBloodPressureReading(reading: Omit<BloodPressureReading, 'id'>) {
    this.profileService.addBloodPressureReadingToActiveProfile(reading);
  }

  handleAddBloodSugarReading(reading: Omit<BloodSugarReading, 'id'>) {
    this.profileService.addBloodSugarReadingToActiveProfile(reading);
  }

  handleDeleteBloodPressureReading(id: string) {
    this.profileService.deleteBloodPressureReadingFromActiveProfile(id);
  }

  handleDeleteBloodSugarReading(id: string) {
    this.profileService.deleteBloodSugarReadingFromActiveProfile(id);
  }
  
  handleAddSymptomLog(log: Omit<SymptomLog, 'id'>) {
    this.profileService.addSymptomLogToActiveProfile(log);
  }

  handleDeleteSymptomLog(id: string) {
    this.profileService.deleteSymptomLogFromActiveProfile(id);
  }

  handleExportHealthData() {
    const profile = this.activeProfile();
    if (!profile) return;

    const datePipe = new DatePipe('tr-TR');
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Tip,Tarih,Saat,Detay 1,Detay 2,Detay 3,Notlar\r\n";

    // Blood Pressure
    (profile.bloodPressureReadings || []).forEach(r => {
      const date = datePipe.transform(r.timestamp, 'dd.MM.yyyy');
      const time = datePipe.transform(r.timestamp, 'HH:mm');
      const row = `Tansiyon,${date},${time},Sistolik: ${r.systolic},Diyastolik: ${r.diastolic},Nabız: ${r.pulse},"${r.notes || ''}"`;
      csvContent += row + "\r\n";
    });

    // Blood Sugar
    (profile.bloodSugarReadings || []).forEach(r => {
      const date = datePipe.transform(r.timestamp, 'dd.MM.yyyy');
      const time = datePipe.transform(r.timestamp, 'HH:mm');
      const measurementTimeMap = {
        'before_meal': 'Yemekten Önce',
        'after_meal': 'Yemekten Sonra',
        'fasting': 'Açlık',
        'random': 'Rastgele'
      };
      const measurementTime = measurementTimeMap[r.measurementTime];
      const row = `Kan Şekeri,${date},${time},Değer: ${r.level} mg/dL,Ölçüm Zamanı: ${measurementTime},,"${r.notes || ''}"`;
      csvContent += row + "\r\n";
    });

    // Symptoms
    (profile.symptomLogs || []).forEach(s => {
        const date = datePipe.transform(s.timestamp, 'dd.MM.yyyy');
        const time = datePipe.transform(s.timestamp, 'HH:mm');
        const row = `Semptom,${date},${time},Semptom: ${s.symptom},Şiddet: ${s.severity}/5,,"${s.notes || ''}"`;
        csvContent += row + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const todayStr = datePipe.transform(new Date(), 'yyyy-MM-dd');
    link.setAttribute("download", `${profile.name}-Saglik-Verileri-${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
