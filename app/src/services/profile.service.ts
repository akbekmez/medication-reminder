import { Injectable, signal, computed, effect } from '@angular/core';
import { Profile } from '../models/profile.model';
import { Medication } from '../models/medication.model';
import { BloodPressureReading, BloodSugarReading } from '../models/health-reading.model';
import { SymptomLog } from '../models/symptom-log.model';

const PROFILES_STORAGE_KEY = 'profilesData';
const ACTIVE_PROFILE_ID_KEY = 'activeProfileId';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  profiles = signal<Profile[]>([]);
  activeProfileId = signal<string | null>(null);

  activeProfile = computed<Profile | null>(() => {
    const id = this.activeProfileId();
    if (!id) return null;
    return this.profiles().find(p => p.id === id) ?? null;
  });

  constructor() {
    effect(() => this.saveToLocalStorage());
  }

  init() {
    this.loadFromLocalStorage();
  }
  
  switchProfile(id: string) {
    this.activeProfileId.set(id);
    localStorage.setItem(ACTIVE_PROFILE_ID_KEY, id);
  }

  addProfile(profileData: Omit<Profile, 'id' | 'medications'>) {
    const newProfile: Profile = {
      ...profileData,
      id: Date.now().toString(),
      medications: [],
    };
    this.profiles.update(profiles => [...profiles, newProfile]);
    if (!this.activeProfileId()) {
      this.switchProfile(newProfile.id);
    }
  }

  updateProfile(updatedProfile: Profile) {
    this.profiles.update(profiles =>
      profiles.map(p => (p.id === updatedProfile.id ? updatedProfile : p))
    );
  }

  deleteProfile(id: string) {
    this.profiles.update(profiles => profiles.filter(p => p.id !== id));
    if (this.activeProfileId() === id) {
      if (this.profiles().length > 0) {
        this.switchProfile(this.profiles()[0].id);
      } else {
        this.activeProfileId.set(null);
        localStorage.removeItem(ACTIVE_PROFILE_ID_KEY);
        // If all profiles are deleted, create the default one.
        this.createDefaultProfile();
      }
    }
  }

  addMedicationToActiveProfile(medData: Omit<Medication, 'id' | 'takenHistory'>) {
    const newMed: Medication = {
      ...medData,
      id: Date.now().toString(),
      takenHistory: [],
    };
    this.profiles.update(profiles =>
      profiles.map(p =>
        p.id === this.activeProfileId()
          ? { ...p, medications: [...p.medications, newMed] }
          : p
      )
    );
  }

  updateMedicationInActiveProfile(updatedMed: Medication) {
    this.profiles.update(profiles =>
      profiles.map(p => {
        if (p.id === this.activeProfileId()) {
          const updatedMeds = p.medications.map(m =>
            m.id === updatedMed.id ? updatedMed : m
          );
          return { ...p, medications: updatedMeds };
        }
        return p;
      })
    );
  }

  deleteMedicationFromActiveProfile(medId: string) {
    this.profiles.update(profiles =>
      profiles.map(p => {
        if (p.id === this.activeProfileId()) {
          const updatedMeds = p.medications.filter(m => m.id !== medId);
          return { ...p, medications: updatedMeds };
        }
        return p;
      })
    );
  }

  takePillInActiveProfile(medId: string) {
     this.profiles.update(profiles =>
      profiles.map(p => {
        if (p.id === this.activeProfileId()) {
          const updatedMeds = p.medications.map(m => {
             if (m.id === medId) {
                const updatedHistory = [...m.takenHistory, Date.now()];
                let newStock = m.stock;
                if (typeof m.stock === 'number' && m.stock > 0) {
                  newStock = Math.max(0, m.stock - m.quantity);
                }
                return { ...m, takenHistory: updatedHistory, stock: newStock };
              }
              return m;
          });
          return { ...p, medications: updatedMeds };
        }
        return p;
      })
    );
  }
  
  addBloodPressureReadingToActiveProfile(readingData: Omit<BloodPressureReading, 'id'>) {
    const newReading: BloodPressureReading = {
      ...readingData,
      id: Date.now().toString(),
    };
    this.profiles.update(profiles =>
      profiles.map(p =>
        p.id === this.activeProfileId()
          ? { ...p, bloodPressureReadings: [...(p.bloodPressureReadings || []), newReading] }
          : p
      )
    );
  }

  deleteBloodPressureReadingFromActiveProfile(readingId: string) {
    this.profiles.update(profiles =>
      profiles.map(p => {
        if (p.id === this.activeProfileId() && p.bloodPressureReadings) {
          const updatedReadings = p.bloodPressureReadings.filter(r => r.id !== readingId);
          return { ...p, bloodPressureReadings: updatedReadings };
        }
        return p;
      })
    );
  }

  addBloodSugarReadingToActiveProfile(readingData: Omit<BloodSugarReading, 'id'>) {
    const newReading: BloodSugarReading = {
      ...readingData,
      id: Date.now().toString(),
    };
    this.profiles.update(profiles =>
      profiles.map(p =>
        p.id === this.activeProfileId()
          ? { ...p, bloodSugarReadings: [...(p.bloodSugarReadings || []), newReading] }
          : p
      )
    );
  }

  deleteBloodSugarReadingFromActiveProfile(readingId: string) {
    this.profiles.update(profiles =>
      profiles.map(p => {
        if (p.id === this.activeProfileId() && p.bloodSugarReadings) {
          const updatedReadings = p.bloodSugarReadings.filter(r => r.id !== readingId);
          return { ...p, bloodSugarReadings: updatedReadings };
        }
        return p;
      })
    );
  }

  addSymptomLogToActiveProfile(logData: Omit<SymptomLog, 'id'>) {
    const newLog: SymptomLog = {
      ...logData,
      id: Date.now().toString(),
    };
    this.profiles.update(profiles =>
      profiles.map(p =>
        p.id === this.activeProfileId()
          ? { ...p, symptomLogs: [...(p.symptomLogs || []), newLog] }
          : p
      )
    );
  }

  deleteSymptomLogFromActiveProfile(logId: string) {
    this.profiles.update(profiles =>
      profiles.map(p => {
        if (p.id === this.activeProfileId() && p.symptomLogs) {
          const updatedLogs = p.symptomLogs.filter(l => l.id !== logId);
          return { ...p, symptomLogs: updatedLogs };
        }
        return p;
      })
    );
  }

  private loadFromLocalStorage() {
    const profilesData = localStorage.getItem(PROFILES_STORAGE_KEY);
    let loadedProfiles: Profile[] = [];
    let migrated = false;

    if (profilesData) {
      loadedProfiles = JSON.parse(profilesData);
    } else {
      // Migration logic for old data
      const oldMedData = localStorage.getItem('medications');
      if (oldMedData) {
        const oldMeds: Medication[] = JSON.parse(oldMedData).map((med: any) => {
             if (med.lastTaken && !med.takenHistory) {
              med.takenHistory = [med.lastTaken];
              delete med.lastTaken;
            } else if (!med.takenHistory) {
              med.takenHistory = [];
            }
            return med;
        });
        
        const defaultProfile: Profile = {
          id: 'default-user-migrated',
          name: 'Kendim',
          avatar: '👤',
          medications: oldMeds,
        };
        loadedProfiles = [defaultProfile];
        localStorage.removeItem('medications'); // Clean up old data
        migrated = true;
      }
    }
    
    if (loadedProfiles.length === 0 && !migrated) {
       loadedProfiles = [this.createDefaultProfile(false)]; // Don't update state yet
    }
    
    this.profiles.set(loadedProfiles);

    const activeId = localStorage.getItem(ACTIVE_PROFILE_ID_KEY);
    if (activeId && this.profiles().some(p => p.id === activeId)) {
        this.activeProfileId.set(activeId);
    } else if (this.profiles().length > 0) {
        const newActiveId = this.profiles()[0].id;
        this.activeProfileId.set(newActiveId);
        localStorage.setItem(ACTIVE_PROFILE_ID_KEY, newActiveId);
    } else {
        this.activeProfileId.set(null);
    }
  }

  private createDefaultProfile(updateState: boolean = true): Profile {
    const defaultProfile: Profile = {
      id: 'default-user',
      name: 'Kendim',
      avatar: '👤',
      medications: [],
    };
    if (updateState) {
        this.profiles.set([defaultProfile]);
        this.switchProfile(defaultProfile.id);
    }
    return defaultProfile;
  }

  private saveToLocalStorage() {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(this.profiles()));
    const activeId = this.activeProfileId();
    if (activeId) {
        localStorage.setItem(ACTIVE_PROFILE_ID_KEY, activeId);
    }
  }
}