import { Component, ChangeDetectionStrategy, input, output, signal, inject, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Profile } from '../../models/profile.model';
import { BloodPressureReading, BloodSugarReading } from '../../models/health-reading.model';
import { SymptomLog } from '../../models/symptom-log.model';

interface Point {
  x: number;
  y: number;
}
interface BloodPressurePoint extends Point { reading: BloodPressureReading; }
interface BloodSugarPoint extends Point { reading: BloodSugarReading; }

@Component({
  selector: 'app-health-tracker',
  templateUrl: './health-tracker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, DatePipe],
  standalone: true,
})
export class HealthTrackerComponent {
  private fb = inject(FormBuilder);

  activeProfile = input.required<Profile | null>();

  closeModal = output<void>();
  addBloodPressureReading = output<Omit<BloodPressureReading, 'id'>>();
  addBloodSugarReading = output<Omit<BloodSugarReading, 'id'>>();
  deleteBloodPressureReading = output<string>();
  deleteBloodSugarReading = output<string>();
  addSymptomLog = output<Omit<SymptomLog, 'id'>>();
  deleteSymptomLog = output<string>();
  exportData = output<void>();

  activeTab = signal<'bp' | 'bs' | 'symptoms'>('bp');
  showBpForm = signal(false);
  showBsForm = signal(false);
  showSymptomForm = signal(false);

  hoveredBpPoint = signal<{ x: number, y: number, reading: BloodPressureReading } | null>(null);
  hoveredBsPoint = signal<{ x: number, y: number, reading: BloodSugarReading } | null>(null);

  bpForm: FormGroup;
  bsForm: FormGroup;
  symptomForm: FormGroup;

  constructor() {
    const today = new Date().toISOString().substring(0, 10);

    this.bpForm = this.fb.group({
      date: [today, Validators.required],
      systolic: ['', [Validators.required, Validators.min(50), Validators.max(300)]],
      diastolic: ['', [Validators.required, Validators.min(30), Validators.max(200)]],
      pulse: ['', [Validators.required, Validators.min(30), Validators.max(250)]],
      notes: [''],
    });

    this.bsForm = this.fb.group({
      date: [today, Validators.required],
      level: ['', [Validators.required, Validators.min(20), Validators.max(600)]],
      measurementTime: ['before_meal', Validators.required],
      notes: [''],
    });

    this.symptomForm = this.fb.group({
        date: [today, Validators.required],
        symptom: ['', [Validators.required]],
        severity: [3, [Validators.required, Validators.min(1), Validators.max(5)]],
        notes: ['']
    });
  }

  sortedBpReadings = computed(() => {
    return this.activeProfile()?.bloodPressureReadings?.slice().sort((a, b) => a.timestamp - b.timestamp) ?? [];
  });

  sortedBsReadings = computed(() => {
    return this.activeProfile()?.bloodSugarReadings?.slice().sort((a, b) => a.timestamp - b.timestamp) ?? [];
  });
  
  sortedSymptomLogs = computed(() => {
    return this.activeProfile()?.symptomLogs?.slice().sort((a, b) => b.timestamp - a.timestamp) ?? [];
  });
  
  private getChartConfig() {
    return { width: 450, height: 200, padding: 30 };
  }

  bpChartData = computed(() => {
    const readings = this.sortedBpReadings();
    if (readings.length < 2) return null;

    const { width, height, padding } = this.getChartConfig();
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const filteredReadings = readings.filter(r => r.timestamp >= thirtyDaysAgo);
    if (filteredReadings.length < 2) return null;

    const timestamps = filteredReadings.map(r => r.timestamp);
    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Date.now();

    const allValues = filteredReadings.flatMap(r => [r.systolic, r.diastolic]);
    const minVal = Math.floor(Math.min(...allValues) / 10) * 10 - 10;
    const maxVal = Math.ceil(Math.max(...allValues) / 10) * 10 + 10;
    
    const timeRange = maxTimestamp - minTimestamp;
    const effectiveTimeRange = timeRange > 0 ? timeRange : 1;
    const valRange = maxVal - minVal;
    const effectiveValRange = valRange > 0 ? valRange : 1;

    const xScale = (timestamp: number) => padding + ((timestamp - minTimestamp) / effectiveTimeRange) * (width - 2 * padding);
    const yScale = (value: number) => (height - padding) - ((value - minVal) / effectiveValRange) * (height - 2 * padding);

    const systolicPoints: BloodPressurePoint[] = filteredReadings.map(r => ({ x: xScale(r.timestamp), y: yScale(r.systolic), reading: r }));
    const diastolicPoints: BloodPressurePoint[] = filteredReadings.map(r => ({ x: xScale(r.timestamp), y: yScale(r.diastolic), reading: r }));

    const toPath = (points: Point[]) => points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');

    return {
        viewBox: `0 0 ${width} ${height}`,
        systolicPath: toPath(systolicPoints),
        diastolicPath: toPath(diastolicPoints),
        systolicPoints,
        diastolicPoints,
        yAxisLabels: [{ y: yScale(maxVal), label: maxVal }, { y: yScale(minVal), label: minVal }],
    };
  });

  bsChartData = computed(() => {
    const readings = this.sortedBsReadings();
    if (readings.length < 2) return null;

    const { width, height, padding } = this.getChartConfig();
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const filteredReadings = readings.filter(r => r.timestamp >= thirtyDaysAgo);
     if (filteredReadings.length < 2) return null;

    const timestamps = filteredReadings.map(r => r.timestamp);
    const minTimestamp = Math.min(...timestamps);
    const maxTimestamp = Date.now();

    const allValues = filteredReadings.map(r => r.level);
    const minVal = Math.floor(Math.min(...allValues) / 10) * 10 - 10;
    const maxVal = Math.ceil(Math.max(...allValues) / 10) * 10 + 10;
    
    const timeRange = maxTimestamp - minTimestamp;
    const effectiveTimeRange = timeRange > 0 ? timeRange : 1;
    const valRange = maxVal - minVal;
    const effectiveValRange = valRange > 0 ? valRange : 1;

    const xScale = (timestamp: number) => padding + ((timestamp - minTimestamp) / effectiveTimeRange) * (width - 2 * padding);
    const yScale = (value: number) => (height - padding) - ((value - minVal) / effectiveValRange) * (height - 2 * padding);

    const points: BloodSugarPoint[] = filteredReadings.map(r => ({ x: xScale(r.timestamp), y: yScale(r.level), reading: r }));
    const toPath = (pts: Point[]) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');

    return {
        viewBox: `0 0 ${width} ${height}`,
        path: toPath(points),
        points,
        yAxisLabels: [{ y: yScale(maxVal), label: maxVal }, { y: yScale(minVal), label: minVal }],
    };
  });

  onSaveBp() {
    if (this.bpForm.invalid) return;
    const { date, ...values } = this.bpForm.value;
    const timestamp = new Date(date).getTime();
    this.addBloodPressureReading.emit({ ...values, timestamp });
    this.bpForm.reset({ date: new Date().toISOString().substring(0, 10) });
    this.showBpForm.set(false);
  }

  onSaveBs() {
    if (this.bsForm.invalid) return;
    const { date, ...values } = this.bsForm.value;
    const timestamp = new Date(date).getTime();
    this.addBloodSugarReading.emit({ ...values, timestamp });
    this.bsForm.reset({ date: new Date().toISOString().substring(0, 10), measurementTime: 'before_meal' });
    this.showBsForm.set(false);
  }

  onSaveSymptom() {
    if (this.symptomForm.invalid) return;
    const { date, ...values } = this.symptomForm.value;
    const timestamp = new Date(date).getTime();
    this.addSymptomLog.emit({ ...values, timestamp });
    this.symptomForm.reset({
        date: new Date().toISOString().substring(0, 10),
        symptom: '',
        severity: 3,
        notes: ''
    });
    this.showSymptomForm.set(false);
  }

  setSymptomSeverity(rating: number) {
      this.symptomForm.get('severity')?.setValue(rating);
  }
}
