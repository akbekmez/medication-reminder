import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Medication, MedicationWithNextDose } from '../../models/medication.model';

interface ReportStatus {
  status: 'none' | 'ok' | 'expiring' | 'expired';
  message: string;
}

@Component({
  selector: 'app-pill-list',
  templateUrl: './pill-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, DatePipe],
})
export class PillListComponent {
  medications = input.required<MedicationWithNextDose[]>();
  deletePill = output<string>();
  editPill = output<Medication>();
  takePill = output<string>();
  viewHistory = output<MedicationWithNextDose>();
  viewDetails = output<MedicationWithNextDose>();
  requestRefill = output<MedicationWithNextDose>();

  formatNextDose(timestamp: number | null): string {
    if (!timestamp) return 'Zamanlama bekleniyor...';

    const now = new Date();
    const doseDate = new Date(timestamp);
    const isToday = now.toDateString() === doseDate.toDateString();
    const isTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString() === doseDate.toDateString();

    const time = doseDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

    if (isToday) return `Bugün ${time}`;
    if (isTomorrow) return `Yarın ${time}`;
    return doseDate.toLocaleDateString('tr-TR', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
  }

  isOverdue(timestamp: number | null): boolean {
    if (!timestamp) return false;
    return timestamp < Date.now();
  }

  isStockLow(med: MedicationWithNextDose): boolean {
    if (typeof med.stock !== 'number' || typeof med.lowStockThreshold !== 'number') {
      return false;
    }
    return med.stock <= med.lowStockThreshold;
  }

  getReportStatus(med: MedicationWithNextDose): ReportStatus {
    if (!med.prescriptionReport?.isEnabled || !med.prescriptionReport.endDate) {
      return { status: 'none', message: '' };
    }

    const endDate = new Date(med.prescriptionReport.endDate);
    endDate.setHours(23, 59, 59, 999); // Consider end of day for expiration
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const formattedDate = endDate.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });

    if (endDate < now) {
      return { status: 'expired', message: `Rapor Süresi Doldu: ${formattedDate}` };
    }
    if (endDate <= thirtyDaysFromNow) {
      return { status: 'expiring', message: `Rapor Bitiyor: ${formattedDate}` };
    }
    return { status: 'ok', message: `Rapor Geçerli: ${formattedDate}` };
  }
  
  onDelete(id: string) {
    if (confirm('Bu ilacı silmek istediğinizden emin misiniz?')) {
      this.deletePill.emit(id);
    }
  }

  onEdit(med: MedicationWithNextDose) {
    const { nextDose, ...baseMed } = med;
    this.editPill.emit(baseMed);
  }
}