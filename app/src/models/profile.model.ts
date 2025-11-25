import { Medication } from './medication.model';
import { BloodPressureReading, BloodSugarReading } from './health-reading.model';
import { SymptomLog } from './symptom-log.model';

export interface Profile {
  id: string;
  name: string;
  avatar: string; // emoji character
  medications: Medication[];
  doctorName?: string;
  doctorEmail?: string;
  bloodPressureReadings?: BloodPressureReading[];
  bloodSugarReadings?: BloodSugarReading[];
  symptomLogs?: SymptomLog[];
}