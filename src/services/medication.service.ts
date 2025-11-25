import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { Medication, MedicationWithNextDose } from '../models/medication.model';
import { ProfileService } from './profile.service';

const MORNING_HOUR = 8;
const NOON_HOUR = 13;
const EVENING_HOUR = 20;

@Injectable({ providedIn: 'root' })
export class MedicationService {
  private profileService = inject(ProfileService);

  public medicationsWithNextDose = computed<MedicationWithNextDose[]>(() => {
    const meds = this.profileService.activeProfile()?.medications ?? [];
    const now = Date.now();
    return meds
      .map(med => ({
        ...med,
        nextDose: this.calculateNextDose(med, now)
      }))
      .sort((a, b) => {
        if (a.nextDose === null) return 1;
        if (b.nextDose === null) return -1;
        return a.nextDose - b.nextDose;
      });
  });
  
  init() {
    if (Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
    setInterval(() => this.checkAndSendNotifications(), 30 * 1000); // Check every 30 seconds
  }

  private checkAndSendNotifications() {
    const now = Date.now();
    const activeProfileName = this.profileService.activeProfile()?.name;

    this.medicationsWithNextDose().forEach(med => {
      if (med.nextDose && med.nextDose <= now) {
        const notificationKey = `notified_${this.profileService.activeProfile()?.id}_${med.id}`;
        const lastNotified = localStorage.getItem(notificationKey);
        if (!lastNotified || Number(lastNotified) < med.nextDose) {
          this.sendNotification(med, activeProfileName);
          localStorage.setItem(notificationKey, med.nextDose.toString());
        }
      }
    });
  }
  
  private sendNotification(med: Medication, profileName: string = 'Sizin') {
    if (Notification.permission === 'granted') {
      const notification = new Notification(`${profileName} için İlaç Zamanı!`, {
        body: `Lütfen '${med.name}' ilacınızı alınız. Doz: ${med.quantity} ${med.unit}`,
        icon: '/favicon.ico',
      });
    }
  }

  private calculateNextDose(med: Medication, now: number): number | null {
    const today = new Date(now);
    const candidateDoses: number[] = [];
    const lastTakenTime = med.takenHistory.length > 0 ? Math.max(...med.takenHistory) : 0;

    if (med.schedule.type === 'timeOfDay') {
      const schedule = med.schedule.times;
      const hours = [];
      if (schedule.morning) hours.push(MORNING_HOUR);
      if (schedule.noon) hours.push(NOON_HOUR);
      if (schedule.evening) hours.push(EVENING_HOUR);

      hours.forEach(hour => {
        const todayDose = new Date(today).setHours(hour, 0, 0, 0);
        const tomorrowDose = new Date(todayDose).setDate(new Date(todayDose).getDate() + 1);

        if (todayDose > lastTakenTime && todayDose > now - (5*60*1000)) { // 5 min grace period
          candidateDoses.push(todayDose);
        } else {
          candidateDoses.push(tomorrowDose);
        }
      });

    } else if (med.schedule.type === 'interval') {
      const intervalMillis = med.schedule.hours * 60 * 60 * 1000;

      if (!lastTakenTime) {
          const firstDoseToday = new Date(today).setHours(med.schedule.startHour, 0, 0, 0);
          if (firstDoseToday >= now) {
            candidateDoses.push(firstDoseToday);
          } else {
            // Find next interval from start time
            let nextDose = firstDoseToday;
            while(nextDose < now) {
                nextDose += intervalMillis;
            }
            candidateDoses.push(nextDose);
          }
      } else {
          let nextDose = lastTakenTime + intervalMillis;
          while(nextDose < now) {
            nextDose += intervalMillis;
          }
          candidateDoses.push(nextDose);
      }
    }

    if (candidateDoses.length === 0) return null;
    return Math.min(...candidateDoses);
  }
}
