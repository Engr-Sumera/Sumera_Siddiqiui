export type SeverityLevel = 'normal' | 'low' | 'mod' | 'crit';

export type AgeCategory = 'neonate' | 'infant' | 'child' | 'adolescent' | 'adult' | 'geriatric';

export type ChronicCondition = 'none' | 'copd' | 'chf' | 'arrhythmia' | 'postop';

export interface VitalsReading {
  timestamp: number;
  hr: number;
  spo2: number;
  bpSys: number;
  bpDia: number;
  tempC: number;
  respirationRate: number;
  ecgPoint?: number;
  isArtifact?: boolean;
}

export interface Thresholds {
  hr: {
    crit_low: number;
    mod_low: number;
    mod_high: number;
    crit_high: number;
  };
  spo2: {
    crit: number;
    mod: number;
    low_low: number;
  };
  bpSys?: {
    crit_low: number;
    crit_high: number;
  };
}

export interface ActiveProfile {
  label: string;
  confidence: number;
  years: number | null;
  unit: string;
  condition: ChronicCondition;
  cat: AgeCategory | null;
}

export interface ProfileSuggestion {
  years: number | null;
  unit: string;
  condition: ChronicCondition;
  confidence: number;
  notes: string[];
  cat: AgeCategory | null;
  hr: Thresholds['hr'];
  spo2: Thresholds['spo2'];
}

export type DismissReason = 'false_positive' | 'patient_stable' | 'duplicate' | 'other';

export interface VitalAlert {
  id: number;
  patientId: string;
  param: 'hr' | 'spo2' | 'bp' | 'temp';
  level: 'crit' | 'mod' | 'low';
  value: string;
  time: Date;
  status: 'active' | 'acked' | 'dismissed';
  escalated: boolean;
  escalateTimerId?: any;
  tta?: string;
  reason?: DismissReason;
  reasonLabel?: string;
}

export interface AgentLogEntry {
  id: string;
  time: Date;
  kind: 'agent' | 'clinician' | 'system';
  text: string;
}

export interface PatientInfo {
  id: string;
  bed: string;
  name: string;
  age: number;
  ageUnit: 'years' | 'months' | 'days';
  condition: ChronicCondition;
  admissionReason: string;
  baselineCorridor: {
    hrMean: number;
    hrSD: number;
    spo2Mean: number;
  } | null;
  activeProfile: ActiveProfile | null;
}
