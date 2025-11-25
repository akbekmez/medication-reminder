export interface AdherenceReport {
  overallAdherence: number;
  medications: MedicationAdherence[];
  startDate: number;
  endDate: number;
}

export interface MedicationAdherence {
  name: string;
  expectedDoses: number;
  takenDoses: number;
  adherence: number; // Percentage
}
