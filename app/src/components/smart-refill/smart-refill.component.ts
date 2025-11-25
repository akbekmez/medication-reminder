import { Component, ChangeDetectionStrategy, input, output, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MedicationWithNextDose } from '../../models/medication.model';
import { Profile } from '../../models/profile.model';
import { GeminiChatService } from '../../services/gemini-chat.service';

type ViewState = 'initial' | 'needsInfo' | 'generating' | 'ready' | 'error';

@Component({
  selector: 'app-smart-refill',
  templateUrl: './smart-refill.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  standalone: true,
})
export class SmartRefillComponent implements OnInit {
  private geminiService = inject(GeminiChatService);

  medication = input.required<MedicationWithNextDose>();
  activeProfile = input.required<Profile>();

  closeModal = output<void>();
  openProfileManager = output<void>();

  viewState = signal<ViewState>('initial');
  generatedEmail = signal('');
  errorMessage = signal('');
  
  ngOnInit() {
    this.checkDoctorInfo();
  }

  checkDoctorInfo() {
    if (!this.activeProfile().doctorName || !this.activeProfile().doctorEmail) {
      this.viewState.set('needsInfo');
    } else {
      this.viewState.set('initial');
    }
  }

  async generateEmail() {
    const profile = this.activeProfile();
    const med = this.medication();

    if (!profile.doctorName || !profile.doctorEmail) {
      this.viewState.set('needsInfo');
      return;
    }

    this.viewState.set('generating');
    this.errorMessage.set('');

    try {
      const emailBody = await this.geminiService.generateRefillRequestEmail(
        profile.name,
        profile.doctorName,
        med.name
      );
      this.generatedEmail.set(emailBody);
      this.viewState.set('ready');
    } catch (error) {
      this.errorMessage.set('E-posta oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
      this.viewState.set('error');
    }
  }
  
  get mailtoLink(): string {
    const profile = this.activeProfile();
    const subject = `${this.medication().name} Reçete Yenileme Talebi`;
    const body = this.generatedEmail();
    return `mailto:${profile.doctorEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  manageProfile() {
    this.openProfileManager.emit();
    this.closeModal.emit();
  }
}
