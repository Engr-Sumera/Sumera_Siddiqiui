import { AgeCategory, ChronicCondition, Thresholds, ProfileSuggestion } from './types';

export const AGE_BANDS: Record<AgeCategory, { hr: Thresholds['hr']; spo2: Thresholds['spo2']; label: string; rangeText: string }> = {
  neonate: {
    hr: { crit_low: 90, mod_low: 100, mod_high: 170, crit_high: 180 },
    spo2: { crit: 88, mod: 92, low_low: 95 },
    label: 'Neonate (0–28 days)',
    rangeText: 'HR 100–170 bpm · SpO₂ ≥ 92%'
  },
  infant: {
    hr: { crit_low: 80, mod_low: 90, mod_high: 160, crit_high: 170 },
    spo2: { crit: 88, mod: 92, low_low: 95 },
    label: 'Infant (29 days – 1 yr)',
    rangeText: 'HR 90–160 bpm · SpO₂ ≥ 92%'
  },
  child: {
    hr: { crit_low: 60, mod_low: 70, mod_high: 120, crit_high: 140 },
    spo2: { crit: 88, mod: 92, low_low: 95 },
    label: 'Child (1–12 yrs)',
    rangeText: 'HR 70–120 bpm · SpO₂ ≥ 92%'
  },
  adolescent: {
    hr: { crit_low: 50, mod_low: 60, mod_high: 100, crit_high: 120 },
    spo2: { crit: 88, mod: 92, low_low: 95 },
    label: 'Adolescent (13–17 yrs)',
    rangeText: 'HR 60–100 bpm · SpO₂ ≥ 92%'
  },
  adult: {
    hr: { crit_low: 40, mod_low: 50, mod_high: 111, crit_high: 131 },
    spo2: { crit: 88, mod: 92, low_low: 95 },
    label: 'Adult (18–64 yrs)',
    rangeText: 'HR 50–111 bpm · SpO₂ ≥ 92%'
  },
  geriatric: {
    hr: { crit_low: 45, mod_low: 50, mod_high: 111, crit_high: 131 },
    spo2: { crit: 88, mod: 93, low_low: 95 },
    label: 'Geriatric (65+ yrs)',
    rangeText: 'HR 50–111 bpm · SpO₂ ≥ 93%'
  }
};

export const DEFAULT_HR = { ...AGE_BANDS.adult.hr };
export const DEFAULT_SPO2 = { ...AGE_BANDS.adult.spo2 };

export const DEBOUNCE_N = 3;
export const ESCALATE_MS = 15000;
export const COLD_START_TARGET = 20;

export function ageInYears(value: number | null, unit: string): number | null {
  if (value === null || isNaN(value)) return null;
  if (unit === 'days') return value / 365;
  if (unit === 'months') return value / 12;
  return value;
}

export function detectAgeCategory(years: number | null): AgeCategory | null {
  if (years === null) return null;
  if (years <= 28 / 365) return 'neonate';
  if (years < 1) return 'infant';
  if (years < 13) return 'child';
  if (years < 18) return 'adolescent';
  if (years < 65) return 'adult';
  return 'geriatric';
}

export function computeProfileThresholds(
  years: number | null,
  unit: string,
  condition: ChronicCondition
): ProfileSuggestion {
  const cat = detectAgeCategory(years);
  const base = cat ? AGE_BANDS[cat] : AGE_BANDS.adult;
  const hr = { ...base.hr };
  let spo2 = { ...base.spo2 };
  const notes: string[] = [];

  notes.push(
    cat
      ? `Age category: ${AGE_BANDS[cat].label} — loaded demographic vital reference ranges`
      : 'Age not specified — defaulting to standard Adult population baseline'
  );

  switch (condition) {
    case 'copd':
      spo2 = { crit: 84, mod: 88, low_low: 90 };
      notes.push(
        'COPD on record: SpO₂ corridor shifted downward (crit <84%, mod <88%) to accommodate baseline hypoxic drive and eliminate benign false alarms.'
      );
      break;
    case 'chf':
      hr.mod_high = Math.round(hr.mod_high * 0.92);
      hr.crit_high = Math.round(hr.crit_high * 0.92);
      notes.push(
        'CHF on record: Tachycardia thresholds tightened by 8% (mod > ' +
          hr.mod_high +
          ', crit > ' +
          hr.crit_high +
          ' bpm) for prompt detection of cardiac decompensation.'
      );
      break;
    case 'arrhythmia':
      hr.mod_low = Math.round(hr.mod_low * 0.85);
      hr.mod_high = Math.round(hr.mod_high * 1.03);
      notes.push(
        'Chronic arrhythmia on record: HR acceptable corridor broadened (mod low ' +
          hr.mod_low +
          ', mod high ' +
          hr.mod_high +
          ' bpm) to dampen benign baseline rate variability.'
      );
      break;
    case 'postop':
      hr.mod_high = Math.round(hr.mod_high * 0.92);
      hr.crit_high = Math.round(hr.crit_high * 0.92);
      spo2.mod = Math.max(spo2.mod, 93);
      spo2.crit = Math.max(spo2.crit, 90);
      notes.push(
        'Post-operative high-acuity: Both HR and SpO₂ tightened — early warning for occult hemorrhage, pulmonary atelectasis, or sepsis.'
      );
      break;
    default:
      notes.push('No chronic comorbidity flagged — standard demographic baseline applied.');
  }

  let confidence = 30;
  if (years !== null) confidence += 25;
  if (condition !== 'none') confidence += 35;
  confidence = Math.min(confidence, 95);

  return {
    years,
    unit,
    condition,
    confidence,
    notes,
    cat,
    hr,
    spo2
  };
}

export function formatProfileLabel(cat: AgeCategory | null, condition: ChronicCondition): string {
  const parts: string[] = [];
  if (cat) {
    parts.push(AGE_BANDS[cat].label.split(' (')[0]);
  }
  const condMap: Record<ChronicCondition, string | null> = {
    none: null,
    copd: 'COPD',
    chf: 'CHF',
    arrhythmia: 'Arrhythmia',
    postop: 'Post-op / High Acuity'
  };
  if (condMap[condition]) {
    parts.push(condMap[condition]!);
  }
  return parts.length ? parts.join(' + ') : 'Unclassified Adult';
}
