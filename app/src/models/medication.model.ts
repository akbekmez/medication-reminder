export interface Medication {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  schedule: Schedule;
  takenHistory: number[];
  notes?: string;
  stock?: number;
  lowStockThreshold?: number;
  prescriptionReport?: {
    isEnabled: boolean;
    endDate: string; // YYYY-MM-DD
  };
  // New detailed fields
  company?: string;
  activeSubstance?: string;
  prescriptionStatus?: 'prescription' | 'non-prescription';
  instructions?: string;
  barcode?: string;
  price?: number;
  atcCode?: string;
  purpose?: string;
  prescribedFor?: string;
}

export type Schedule = TimeOfDaySchedule | IntervalSchedule;

export interface TimeOfDaySchedule {
  type: 'timeOfDay';
  times: {
    morning: boolean;
    noon: boolean;
    evening: boolean;
  };
}

export interface IntervalSchedule {
  type: 'interval';
  hours: number;
  startHour: number;
}

export interface MedicationWithNextDose extends Medication {
  nextDose: number | null;
}