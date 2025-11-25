import { Component, ChangeDetectionStrategy, output, inject, signal, computed, OnInit, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdherenceService } from '../../services/adherence.service';
import { AdherenceReport } from '../../models/adherence.model';
import { Profile } from '../../models/profile.model';

@Component({
  selector: 'app-adherence-report',
  templateUrl: './adherence-report.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  standalone: true,
  styles: [`
    @media print {
      body * {
        visibility: hidden;
      }
      .printable-container, .printable-container * {
        visibility: visible;
      }
      .no-print {
        display: none !important;
      }
      .printable-container {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        overflow: visible;
        background-color: white;
        z-index: 9999;
      }
      .printable-modal {
        box-shadow: none !important;
        height: auto;
        max-height: none;
        width: 100% !important;
        max-width: 100% !important;
        border: 1px solid #ccc;
      }
      .printable-content {
         max-height: none !important;
         overflow-y: visible !important;
      }
    }
  `]
})
export class AdherenceReportComponent implements OnInit {
  private adherenceService = inject(AdherenceService);

  activeProfile = input<Profile | null>();
  closeModal = output<void>();

  report = signal<AdherenceReport | null>(null);

  chartData = computed(() => {
    const adherence = this.report()?.overallAdherence ?? 0;
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (adherence / 100) * circumference;

    let colorClass = 'text-green-500';
    let trackColorClass = 'text-green-100';
    if (adherence < 90) {
      colorClass = 'text-yellow-500';
      trackColorClass = 'text-yellow-100';
    }
    if (adherence < 70) {
      colorClass = 'text-red-500';
      trackColorClass = 'text-red-100';
    }

    return {
      radius,
      circumference,
      offset,
      colorClass,
      trackColorClass
    };
  });

  motivationalMessage = computed(() => {
    const adherence = this.report()?.overallAdherence ?? 0;
     if (adherence >= 95) return 'Harika gidiyorsun!';
     if (adherence >= 85) return 'Çok iyi iş!';
     if (adherence >= 70) return 'İyi bir çaba!';
     if (adherence >= 50) return 'Biraz daha dikkat edebilirsin.';
     return 'Hadi toparlayalım!';
  });


  ngOnInit() {
    const adherenceReport = this.adherenceService.calculateAdherenceReport(this.activeProfile() ?? null);
    this.report.set(adherenceReport);
  }
  
  printReport() {
    window.print();
  }
}
