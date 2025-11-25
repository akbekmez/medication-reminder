import { Injectable } from '@angular/core';
import { Profile } from '../models/profile.model';
import { AdherenceReport, MedicationAdherence } from '../models/adherence.model';
import { Medication } from '../models/medication.model';

const REPORT_DAYS = 7;

@Injectable({ providedIn: 'root' })
export class AdherenceService {

  calculateAdherenceReport(profile: Profile | null): AdherenceReport | null {
    if (!profile || !profile.medications) {
      return null;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - REPORT_DAYS);
    startDate.setHours(0, 0, 0, 0);

    let totalExpectedDoses = 0;
    let totalTakenDoses = 0;

    const medicationReports: MedicationAdherence[] = profile.medications.map(med => {
      const expectedDoses = this.calculateExpectedDoses(med, startDate, endDate);
      const takenDoses = med.takenHistory.filter(t => t >= startDate.getTime() && t <= endDate.getTime()).length;

      // Cap taken doses at expected doses to prevent > 100% adherence
      const cappedTakenDoses = Math.min(takenDoses, expectedDoses);

      const adherence = expectedDoses > 0
        ? Math.round((cappedTakenDoses / expectedDoses) * 100)
        : 100; // If no doses were expected, adherence is 100%

      totalExpectedDoses += expectedDoses;
      totalTakenDoses += cappedTakenDoses;

      return {
        name: med.name,
        expectedDoses,
        takenDoses: cappedTakenDoses,
        adherence,
      };
    });

    const overallAdherence = totalExpectedDoses > 0
      ? Math.round((totalTakenDoses / totalExpectedDoses) * 100)
      : 100;

    return {
      overallAdherence,
      medications: medicationReports,
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
    };
  }

  private calculateExpectedDoses(med: Medication, startDate: Date, endDate: Date): number {
    let expectedCount = 0;
    
    if (med.schedule.type === 'timeOfDay') {
      const times = med.schedule.times;
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        if (times.morning) expectedCount++;
        if (times.noon) expectedCount++;
        if (times.evening) expectedCount++;
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else if (med.schedule.type === 'interval') {
      // This is an approximation but robust for common intervals.
      const dosesPerDay = 24 / med.schedule.hours;
      expectedCount = Math.floor(dosesPerDay * REPORT_DAYS);
    }
    
    return expectedCount;
  }
}
