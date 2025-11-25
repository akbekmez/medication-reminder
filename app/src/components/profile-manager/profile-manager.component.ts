import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Profile } from '../../models/profile.model';

@Component({
  selector: 'app-profile-manager',
  templateUrl: './profile-manager.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
})
export class ProfileManagerComponent {
  profiles = input.required<Profile[]>();
  closeModal = output<void>();
  addProfile = output<Omit<Profile, 'id' | 'medications'>>();
  updateProfile = output<Profile>();
  deleteProfile = output<string>();

  newProfileName = signal('');
  newProfileAvatar = signal('👤');
  newProfileDoctorName = signal('');
  newProfileDoctorEmail = signal('');

  editingProfile = signal<Profile | null>(null);

  availableAvatars = ['👤', '👩', '👨', '👧', '👦', '👵', '👴', '🐶', '🐱', '❤️', '💊'];

  startEditing(profile: Profile) {
    this.editingProfile.set({ ...profile });
  }

  cancelEditing() {
    this.editingProfile.set(null);
  }

  updateEditingAvatar(avatar: string) {
    const currentProfile = this.editingProfile();
    if (currentProfile) {
      this.editingProfile.set({
        ...currentProfile,
        avatar: avatar
      });
    }
  }

  saveNewProfile() {
    if (this.newProfileName().trim()) {
      this.addProfile.emit({
        name: this.newProfileName().trim(),
        avatar: this.newProfileAvatar(),
        doctorName: this.newProfileDoctorName().trim() || undefined,
        doctorEmail: this.newProfileDoctorEmail().trim() || undefined,
      });
      this.newProfileName.set('');
      this.newProfileAvatar.set('👤');
      this.newProfileDoctorName.set('');
      this.newProfileDoctorEmail.set('');
    }
  }

  saveEditedProfile() {
    const profile = this.editingProfile();
    if (profile && profile.name.trim()) {
      this.updateProfile.emit(profile);
      this.editingProfile.set(null);
    }
  }

  confirmDelete(id: string) {
    const profileToDelete = this.profiles().find(p => p.id === id);
    if (profileToDelete && confirm(`'${profileToDelete.name}' profilini silmek istediğinizden emin misiniz? Bu profile ait tüm ilaç kayıtları silinecektir.`)) {
      this.deleteProfile.emit(id);
    }
  }
}