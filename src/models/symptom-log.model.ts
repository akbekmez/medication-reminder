export interface SymptomLog {
  id: string;
  timestamp: number;
  symptom: string;
  severity: number; // 1 to 5
  notes?: string;
}
