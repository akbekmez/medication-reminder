export interface BloodPressureReading {
  id: string;
  timestamp: number;
  systolic: number; // Büyük tansiyon
  diastolic: number; // Küçük tansiyon
  pulse: number; // Nabız
  notes?: string;
}

export interface BloodSugarReading {
  id: string;
  timestamp: number;
  level: number; // mg/dL
  measurementTime: 'before_meal' | 'after_meal' | 'fasting' | 'random';
  notes?: string;
}
