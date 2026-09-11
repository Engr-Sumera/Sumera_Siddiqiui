import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { VitalCard } from './components/VitalCard';
import { ClinicalActions } from './components/ClinicalActions';
import { SimulationControls } from './components/SimulationControls';
import { ProfilingAgent } from './components/ProfilingAgent';
import { AlertFeed } from './components/AlertFeed';
import { ResponseMetrics } from './components/ResponseMetrics';
import { AgentDecisionLog } from './components/AgentDecisionLog';
import { PatientSummaryCards } from './components/PatientSummaryCards';
import { FhirModal } from './components/FhirModal';
import { AiAnalysisModal } from './components/AiAnalysisModal';
import { playAlertChime } from './utils/audio';
import {
  PatientInfo,
  VitalsReading,
  Thresholds,
  ActiveProfile,
  ProfileSuggestion,
  VitalAlert,
  AgentLogEntry,
  DismissReason,
  SeverityLevel
} from './types';
import {
  DEFAULT_HR,
  DEFAULT_SPO2,
  DEBOUNCE_N,
  ESCALATE_MS,
  COLD_START_TARGET,
  AGE_BANDS,
  computeProfileThresholds,
  formatProfileLabel
} from './clinicalConstants';

const INITIAL_PATIENTS: PatientInfo[] = [
  {
    id: '4471-B',
    bed: '#4471-B',
    name: 'Eleanor Vance',
    age: 78,
    ageUnit: 'years',
    condition: 'copd',
    admissionReason: 'Acute exacerbation of COPD · Cardiology step-down',
    baselineCorridor: null,
    activeProfile: null
  },
  {
    id: '4472-A',
    bed: '#4472-A',
    name: 'Marcus Chen',
    age: 54,
    ageUnit: 'years',
    condition: 'postop',
    admissionReason: 'Post-CABG recovery · Surgical ICU',
    baselineCorridor: null,
    activeProfile: null
  },
  {
    id: '4473-C',
    bed: '#4473-C',
    name: 'Baby Lucas',
    age: 18,
    ageUnit: 'days',
    condition: 'none',
    admissionReason: 'Neonatal observation · NICU Step-down',
    baselineCorridor: null,
    activeProfile: null
  }
];

export default function App() {
  // Patient and Bed states
  const [patients] = useState<PatientInfo[]>(INITIAL_PATIENTS);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('4471-B');
  const currentPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  // Streaming and simulation states
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [streamSpeed, setStreamSpeed] = useState<number>(1);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number>(24);

  // Calibration Static Input mode
  const [isStaticMode, setIsStaticMode] = useState<boolean>(false);
  const [staticHR, setStaticHR] = useState<number | null>(null);
  const [staticSpO2, setStaticSpO2] = useState<number | null>(null);

  // Active thresholds & learned corridor
  const [currentThresholds, setCurrentThresholds] = useState<Thresholds>({
    hr: { ...DEFAULT_HR },
    spo2: { ...DEFAULT_SPO2 }
  });
  const [activeProfile, setActiveProfile] = useState<ActiveProfile | null>(null);
  const [personalBaseline, setPersonalBaseline] = useState<{
    hrMean: number;
    hrSD: number;
    spo2Mean: number;
  } | null>(null);
  const [stableReadingsCount, setStableReadingsCount] = useState<number>(0);

  // Clinical snooze timer
  const [snoozeUntil, setSnoozeUntil] = useState<number>(0);
  const [snoozeRemainingSec, setSnoozeRemainingSec] = useState<number>(0);

  // Alarms and metrics
  const [alerts, setAlerts] = useState<VitalAlert[]>([]);
  const alertSeqRef = useRef<number>(0);

  // Audit log
  const [agentLogs, setAgentLogs] = useState<AgentLogEntry[]>([
    {
      id: 'init-1',
      time: new Date(),
      kind: 'system',
      text: 'Vital Sign Anomaly Detector initialized with edge telemetry streaming node.'
    }
  ]);

  // Modals
  const [isFhirModalOpen, setIsFhirModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  // Filter & Debounce buffers (held in refs for glitch-free streaming)
  const hrRawRef = useRef<number[]>([]);
  const spo2RawRef = useRef<number[]>([]);
  const bpSysRawRef = useRef<number[]>([]);
  const bpDiaRawRef = useRef<number[]>([]);
  const hrHistoryRef = useRef<number[]>([74, 75, 74, 76, 75, 74, 75, 76]);
  const spo2HistoryRef = useRef<number[]>([98, 98, 97.9, 98.1, 98, 97.9, 98]);
  const bpHistoryRef = useRef<number[]>([120, 121, 119, 122, 120, 121]);
  const tempHistoryRef = useRef<number[]>([36.9, 37.0, 36.9, 37.1, 37.0]);

  // Current instantaneous values for UI rendering
  const [currentVitals, setCurrentVitals] = useState<VitalsReading>({
    timestamp: Date.now(),
    hr: 75,
    spo2: 98.0,
    bpSys: 120,
    bpDia: 80,
    tempC: 37.0,
    respirationRate: 16
  });

  // Recent trace buffers for sparklines/oscilloscope
  const [hrTrace, setHrTrace] = useState<number[]>([]);
  const [spo2Trace, setSpo2Trace] = useState<number[]>([]);
  const [bpTrace, setBpTrace] = useState<number[]>([]);
  const [tempTrace, setTempTrace] = useState<number[]>([]);

  // Active Anomaly injection
  const [pendingAnomaly, setPendingAnomaly] = useState<string | null>(null);
  const [lastNoiseSpikeDetected, setLastNoiseSpikeDetected] = useState<boolean>(false);

  // Debounce state tracking
  const debounceRef = useRef<{
    hr: { streak: number; level: SeverityLevel | null };
    spo2: { streak: number; level: SeverityLevel | null };
    bp: { streak: number; level: SeverityLevel | null };
  }>({
    hr: { streak: 0, level: null },
    spo2: { streak: 0, level: null },
    bp: { streak: 0, level: null }
  });

  const logAction = useCallback((text: string, kind: 'agent' | 'clinician' | 'system') => {
    setAgentLogs((prev) => [
      {
        id: `${Date.now()}-${Math.random()}`,
        time: new Date(),
        kind,
        text
      },
      ...prev.slice(0, 49)
    ]);
  }, []);

  // Helper functions for median noise filter & classifications
  const calculateMedian = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const classifyHR = useCallback(
    (hr: number): SeverityLevel => {
      const b = currentThresholds.hr;
      if (hr < b.crit_low || hr >= b.crit_high) return 'crit';
      if (hr < b.mod_low || hr >= b.mod_high) return 'mod';
      return 'normal';
    },
    [currentThresholds.hr]
  );

  const classifySpO2 = useCallback(
    (spo2: number): SeverityLevel => {
      const b = currentThresholds.spo2;
      if (spo2 < b.crit) return 'crit';
      if (spo2 < b.mod) return 'mod';
      if (spo2 < b.low_low) return 'low';
      return 'normal';
    },
    [currentThresholds.spo2]
  );

  const classifyBP = useCallback((bpSys: number): SeverityLevel => {
    if (bpSys >= 180 || bpSys < 70) return 'crit';
    if (bpSys >= 140 || bpSys < 90) return 'mod';
    return 'normal';
  }, []);

  // Trigger prioritized alert with escalation timer
  const triggerAlert = useCallback(
    (param: 'hr' | 'spo2' | 'bp' | 'temp', level: 'crit' | 'mod' | 'low', value: number) => {
      if (level !== 'crit' && Date.now() < snoozeUntil) {
        return;
      }

      alertSeqRef.current += 1;
      const nextId = alertSeqRef.current;
      const newAlert: VitalAlert = {
        id: nextId,
        patientId: currentPatient.id,
        param,
        level,
        value: value.toFixed(1),
        time: new Date(),
        status: 'active',
        escalated: false
      };

      // Sound chime if unmuted
      if (!isAudioMuted && (level === 'crit' || level === 'mod')) {
        playAlertChime(level);
      }

      // Set 15s escalation timer
      const timerId = setTimeout(() => {
        setAlerts((currentAlerts) =>
          currentAlerts.map((a) => {
            if (a.id === nextId && a.status === 'active') {
              logAction(
                `Alert #${nextId} (${param.toUpperCase()} ${value.toFixed(1)}) unacknowledged for >15s — escalated to secondary clinical team.`,
                'system'
              );
              return { ...a, escalated: true };
            }
            return a;
          })
        );
      }, ESCALATE_MS);

      newAlert.escalateTimerId = timerId;

      setAlerts((curr) => {
        if (curr.some((a) => a.id === nextId)) {
          return curr;
        }
        return [newAlert, ...curr];
      });
    },
    [snoozeUntil, currentPatient.id, isAudioMuted, logAction]
  );

  // Debounce evaluator
  const processDebounce = useCallback(
    (param: 'hr' | 'spo2' | 'bp', level: SeverityLevel, value: number) => {
      const st = debounceRef.current[param];
      if (level === 'normal') {
        st.streak = 0;
        st.level = null;
        return;
      }

      // Critical alerts fire immediately on entry
      if (level === 'crit') {
        if (st.level !== 'crit') {
          st.level = 'crit';
          st.streak = 1;
          triggerAlert(param, 'crit', value);
        }
        return;
      }

      // Moderate or Low alerts require DEBOUNCE_N consecutive samples
      if (st.level === level) {
        st.streak++;
      } else {
        st.level = level;
        st.streak = 1;
      }

      if (st.streak === DEBOUNCE_N) {
        triggerAlert(param, level, value);
      }
    },
    [triggerAlert]
  );

  // Main simulation tick
  useEffect(() => {
    if (!isStreaming) return;

    const intervalTime = Math.max(250, Math.floor(1000 / streamSpeed));

    const timer = setInterval(() => {
      // Simulate real-time processing latency (15-35ms)
      const simulatedLatency = Math.floor(16 + Math.random() * 15);
      setLatencyMs(simulatedLatency);

      let rawHR: number;
      let rawSpO2: number;
      let rawBPSys: number;
      let rawBPDia: number;
      let rawTemp: number;

      if (isStaticMode) {
        rawHR = staticHR !== null ? staticHR : 75;
        rawSpO2 = staticSpO2 !== null ? staticSpO2 : 98.0;
        rawBPSys = 120;
        rawBPDia = 80;
        rawTemp = 37.0;
      } else {
        // Base physiological signals with natural vagal respiratory sinus arrhythmia
        const baseHR = activeProfile?.condition === 'chf' ? 84 : 75;
        const baseSpO2 = activeProfile?.condition === 'copd' ? 90.5 : 98.0;
        const baseBPSys = 120;
        const baseBPDia = 80;

        const hrJitter = (Math.random() - 0.5) * 2.2;
        const spo2Jitter = (Math.random() - 0.5) * 0.4;
        const bpJitter = (Math.random() - 0.5) * 3;

        rawHR = baseHR + hrJitter;
        rawSpO2 = Math.min(100, Math.max(70, baseSpO2 + spo2Jitter));
        rawBPSys = baseBPSys + bpJitter;
        rawBPDia = baseBPDia + bpJitter * 0.6;
        rawTemp = 37.0 + (Math.random() - 0.5) * 0.15;

        // Apply active anomaly injection if present
        if (pendingAnomaly === 'hr_high') rawHR += 48;
        if (pendingAnomaly === 'hr_low') rawHR -= 35;
        if (pendingAnomaly === 'spo2_drop') rawSpO2 -= 11.5;
        if (pendingAnomaly === 'bp_high') {
          rawBPSys += 65;
          rawBPDia += 30;
        }
        if (pendingAnomaly === 'artifact') {
          rawHR += 65; // Single spike artifact to test median rejection filter
        }
      }

      // Buffer raw signals for 5-sample median noise filtering
      hrRawRef.current.push(rawHR);
      if (hrRawRef.current.length > 5) hrRawRef.current.shift();

      spo2RawRef.current.push(rawSpO2);
      if (spo2RawRef.current.length > 5) spo2RawRef.current.shift();

      bpSysRawRef.current.push(rawBPSys);
      if (bpSysRawRef.current.length > 5) bpSysRawRef.current.shift();

      bpDiaRawRef.current.push(rawBPDia);
      if (bpDiaRawRef.current.length > 5) bpDiaRawRef.current.shift();

      // Check if noise filter actively rejected a spike
      const wasArtifact = pendingAnomaly === 'artifact';
      if (wasArtifact) {
        setPendingAnomaly(null); // Clear single artifact spike immediately
        setLastNoiseSpikeDetected(true);
        setTimeout(() => setLastNoiseSpikeDetected(false), 4000);
        logAction('Noise filter engaged: Isolated 65 bpm artifact spike filtered via 5-sample median window.', 'system');
      }

      // Filtered clean values (Median filter)
      const filteredHR = isStaticMode ? rawHR : calculateMedian(hrRawRef.current);
      const filteredSpO2 = isStaticMode ? rawSpO2 : calculateMedian(spo2RawRef.current);
      const filteredBPSys = isStaticMode ? rawBPSys : calculateMedian(bpSysRawRef.current);
      const filteredBPDia = isStaticMode ? rawBPDia : calculateMedian(bpDiaRawRef.current);

      // Push to history buffers for continuous traces
      hrHistoryRef.current.push(filteredHR);
      if (hrHistoryRef.current.length > 80) hrHistoryRef.current.shift();

      spo2HistoryRef.current.push(filteredSpO2);
      if (spo2HistoryRef.current.length > 80) spo2HistoryRef.current.shift();

      bpHistoryRef.current.push(filteredBPSys);
      if (bpHistoryRef.current.length > 80) bpHistoryRef.current.shift();

      tempHistoryRef.current.push(rawTemp);
      if (tempHistoryRef.current.length > 80) tempHistoryRef.current.shift();

      // Update trace states
      setHrTrace([...hrHistoryRef.current]);
      setSpo2Trace([...spo2HistoryRef.current]);
      setBpTrace([...bpHistoryRef.current]);
      setTempTrace([...tempHistoryRef.current]);

      // Update current vitals readout
      setCurrentVitals({
        timestamp: Date.now(),
        hr: filteredHR,
        spo2: filteredSpO2,
        bpSys: filteredBPSys,
        bpDia: filteredBPDia,
        tempC: rawTemp,
        respirationRate: 16 + Math.round((Math.random() - 0.5) * 2)
      });

      // Cold start baseline learning (up to 20 stable readings)
      if (!isStaticMode) {
        const hrL = classifyHR(filteredHR);
        const spo2L = classifySpO2(filteredSpO2);

        if (stableReadingsCount < COLD_START_TARGET) {
          if (hrL === 'normal' && spo2L === 'normal') {
            setStableReadingsCount((prev) => {
              const next = prev + 1;
              if (next === COLD_START_TARGET) {
                // Compute personal baseline corridor
                const stableHRs = hrHistoryRef.current.slice(-COLD_START_TARGET);
                const stableSpO2s = spo2HistoryRef.current.slice(-COLD_START_TARGET);
                const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
                const sd = (arr: number[]) => {
                  const m = mean(arr);
                  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
                };

                const personal = {
                  hrMean: mean(stableHRs),
                  hrSD: Math.max(sd(stableHRs), 2.5),
                  spo2Mean: mean(stableSpO2s)
                };
                setPersonalBaseline(personal);
                logAction(
                  `Cold start complete (${COLD_START_TARGET} stable readings) — Personal baseline corridor established: HR ~${Math.round(
                    personal.hrMean - personal.hrSD
                  )}–${Math.round(personal.hrMean + personal.hrSD)} bpm, SpO₂ ~${Math.round(
                    personal.spo2Mean
                  )}%.`,
                  'system'
                );
              }
              return next;
            });
          }
        }

        // Run debounce and anomaly detector
        processDebounce('hr', hrL, filteredHR);
        processDebounce('spo2', spo2L, filteredSpO2);
        processDebounce('bp', classifyBP(filteredBPSys), filteredBPSys);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [
    isStreaming,
    streamSpeed,
    isStaticMode,
    staticHR,
    staticSpO2,
    pendingAnomaly,
    stableReadingsCount,
    classifyHR,
    classifySpO2,
    classifyBP,
    processDebounce,
    activeProfile,
    logAction
  ]);

  // Snooze timer countdown
  useEffect(() => {
    if (snoozeUntil <= Date.now()) {
      setSnoozeRemainingSec(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((snoozeUntil - Date.now()) / 1000));
      setSnoozeRemainingSec(remaining);
      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [snoozeUntil]);

  // Clinical Actions
  const handleSoftReset = () => {
    alerts.forEach((a) => {
      if (a.escalateTimerId) clearTimeout(a.escalateTimerId);
    });
    setAlerts([]);
    logAction('Soft reset executed — alert queue and response metrics cleared; learned baseline and profile preserved.', 'clinician');
  };

  const handleHardReset = () => {
    alerts.forEach((a) => {
      if (a.escalateTimerId) clearTimeout(a.escalateTimerId);
    });
    setAlerts([]);
    setPersonalBaseline(null);
    setStableReadingsCount(0);
    setActiveProfile(null);
    setCurrentThresholds({ hr: { ...DEFAULT_HR }, spo2: { ...DEFAULT_SPO2 } });
    setIsStaticMode(false);
    setStaticHR(null);
    setStaticSpO2(null);
    debounceRef.current = {
      hr: { streak: 0, level: null },
      spo2: { streak: 0, level: null },
      bp: { streak: 0, level: null }
    };
    logAction('Hard reset executed — baseline corridor, profile, and history purged. System returned to Cold Start.', 'clinician');
  };

  const handleReBaseline = () => {
    if (hrHistoryRef.current.length < 10) {
      logAction('Re-baseline denied — insufficient readings in memory (need at least 10 stable readings).', 'clinician');
      return;
    }
    const stableHRs = hrHistoryRef.current.slice(-20);
    const stableSpO2s = spo2HistoryRef.current.slice(-20);
    const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const sd = (arr: number[]) => {
      const m = mean(arr);
      return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
    };

    const newBaseline = {
      hrMean: mean(stableHRs),
      hrSD: Math.max(sd(stableHRs), 2.5),
      spo2Mean: mean(stableSpO2s)
    };
    setPersonalBaseline(newBaseline);
    logAction(
      `Re-baseline confirmed — personal corridor recalculated: HR ~${Math.round(
        newBaseline.hrMean - newBaseline.hrSD
      )}–${Math.round(newBaseline.hrMean + newBaseline.hrSD)} bpm.`,
      'clinician'
    );
  };

  const handleSnoozeNonCritical = () => {
    const snoozeDurationMs = 10 * 60 * 1000;
    setSnoozeUntil(Date.now() + snoozeDurationMs);
    logAction('Non-critical alarms snoozed for 10 minutes. Critical priority alarms will still fire immediately.', 'clinician');
  };

  const handleFlagForReview = () => {
    logAction(`Patient ${currentPatient.bed} flagged for formal physician clinical review. Priority status elevated.`, 'clinician');
  };

  // Static calibration inputs
  const handleApplyStaticInput = (hr: number | null, spo2: number | null) => {
    setIsStaticMode(true);
    setStaticHR(hr);
    setStaticSpO2(spo2);
    logAction(
      `Static calibration input engaged — HR locked at ${hr !== null ? hr + ' bpm' : '(unchanged)'}, SpO₂ locked at ${
        spo2 !== null ? spo2 + '%' : '(unchanged)'
      }. Zero noise calibration check active.`,
      'clinician'
    );
  };

  const handleResumeStream = () => {
    setIsStaticMode(false);
    setStaticHR(null);
    setStaticSpO2(null);
    logAction('Static calibration disengaged — resumed live simulated physiological telemetry.', 'clinician');
  };

  // Profiling agent apply
  const handleApplyProfile = (sugg: ProfileSuggestion, label: string) => {
    setCurrentThresholds({ hr: sugg.hr, spo2: sugg.spo2 });
    setActiveProfile({
      label,
      confidence: sugg.confidence,
      years: sugg.years,
      unit: sugg.unit,
      condition: sugg.condition,
      cat: sugg.cat
    });
  };

  // Alert interactions
  const handleAcknowledgeAlert = (id: number) => {
    setAlerts((curr) =>
      curr.map((a) => {
        if (a.id === id) {
          if (a.escalateTimerId) clearTimeout(a.escalateTimerId);
          const ttaSec = ((Date.now() - a.time.getTime()) / 1000).toFixed(1);
          logAction(`Alert #${id} (${a.param.toUpperCase()} ${a.value}) acknowledged by clinician in ${ttaSec}s.`, 'clinician');
          return { ...a, status: 'acked', tta: ttaSec };
        }
        return a;
      })
    );
  };

  const handleDismissAlert = (id: number, reason: DismissReason) => {
    const reasonLabels: Record<DismissReason, string> = {
      false_positive: 'false positive (motion artifact)',
      patient_stable: 'patient stable (clinically verified)',
      duplicate: 'duplicate alarm',
      other: 'other reason'
    };

    setAlerts((curr) =>
      curr.map((a) => {
        if (a.id === id) {
          if (a.escalateTimerId) clearTimeout(a.escalateTimerId);
          const ttaSec = ((Date.now() - a.time.getTime()) / 1000).toFixed(1);
          logAction(
            `Alert #${id} dismissed as "${reasonLabels[reason]}" by clinician (in ${ttaSec}s).`,
            'clinician'
          );
          return { ...a, status: 'dismissed', reason, reasonLabel: reasonLabels[reason], tta: ttaSec };
        }
        return a;
      })
    );
  };

  // Anomaly Injection trigger
  const handleInjectAnomaly = (type: 'hr_high' | 'hr_low' | 'spo2_drop' | 'artifact' | 'bp_high') => {
    if (isStaticMode) {
      logAction('Anomaly injection rejected — static calibration input is currently active. Resume live stream first.', 'clinician');
      return;
    }
    setPendingAnomaly(type);
    logAction(`Manual physiological anomaly injected: ${type}. Monitoring edge detector response.`, 'clinician');

    if (type !== 'artifact') {
      setTimeout(() => {
        setPendingAnomaly((curr) => (curr === type ? null : curr));
      }, 7000);
    }
  };

  // Switch active bed/patient
  const handleSelectPatient = (id: string) => {
    setSelectedPatientId(id);
    const targetPatient = patients.find((p) => p.id === id);
    if (targetPatient) {
      logAction(`Switched active telemetry view to Bed ${targetPatient.bed} (${targetPatient.name}).`, 'clinician');
      // Suggest profile automatically for new patient
      const years = targetPatient.ageUnit === 'days' ? targetPatient.age / 365 : targetPatient.age;
      const sugg = computeProfileThresholds(years, targetPatient.ageUnit, targetPatient.condition);
      const label = formatProfileLabel(sugg.cat, targetPatient.condition);
      setCurrentThresholds({ hr: sugg.hr, spo2: sugg.spo2 });
      setActiveProfile({
        label,
        confidence: sugg.confidence,
        years,
        unit: targetPatient.ageUnit,
        condition: targetPatient.condition,
        cat: sugg.cat
      });
    }
  };

  // Reference ranges text
  const hrRefText = `${currentThresholds.hr.mod_low}–${currentThresholds.hr.mod_high} bpm`;
  const spo2RefText = `≥ ${currentThresholds.spo2.mod}%`;
  const bpRefText = '90–140 mmHg sys';
  const tempRefText = '36.5–37.5 °C';

  const hrLevel = classifyHR(currentVitals.hr);
  const spo2Level = classifySpO2(currentVitals.spo2);
  const bpLevel = classifyBP(currentVitals.bpSys);
  const tempLevel: SeverityLevel = currentVitals.tempC > 38.0 ? 'mod' : 'normal';

  const bedCategoryLabel = activeProfile?.cat
    ? AGE_BANDS[activeProfile.cat].label
    : 'Adult (18–64 yrs)';

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] p-3 sm:p-5 font-sans selection:bg-[#7c3aed]/20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Header
          currentPatient={currentPatient}
          patients={patients}
          onSelectPatient={handleSelectPatient}
          bedCategoryLabel={bedCategoryLabel}
          isStreaming={isStreaming}
          onToggleStreaming={() => setIsStreaming((prev) => !prev)}
          speed={streamSpeed}
          onToggleSpeed={() => setStreamSpeed((prev) => (prev === 1 ? 2 : 1))}
          isAudioMuted={isAudioMuted}
          onToggleAudio={() => setIsAudioMuted((prev) => !prev)}
          latencyMs={latencyMs}
          onOpenFhir={() => setIsFhirModalOpen(true)}
          onOpenAiAnalysis={() => setIsAiModalOpen(true)}
        />

        {/* Patient Summary Cards (Multi-Bed overview) */}
        <PatientSummaryCards
          patients={patients}
          currentPatientId={selectedPatientId}
          onSelectPatient={handleSelectPatient}
          alerts={alerts}
          currentHR={currentVitals.hr}
          currentSpO2={currentVitals.spo2}
        />

        {/* Main Grid: Left Panel (Vitals & Signals) + Right Panel (AI Agent, Alerts & Audit) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT: 7 cols on LG */}
          <div className="lg:col-span-7 space-y-3.5">
            {/* Vitals Telemetry Box */}
            <div className="bg-[#ffffff] border border-[#e2e8f0] shadow-xs rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#059669] animate-ping" />
                  <h2 className="text-xs font-semibold tracking-wider text-[#64748b] uppercase">
                    Real-Time Physiological Telemetry
                  </h2>
                </div>

                {lastNoiseSpikeDetected && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#f5f3ff] text-[#7c3aed] border border-[#ddd6fe] animate-pulse font-medium">
                    ✓ Noise Filter: Artifact Spike Suppressed
                  </span>
                )}
              </div>

              {/* 2x2 Vital Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <VitalCard
                  id="card-hr"
                  canvasId="canvas-hr"
                  label="Heart rate"
                  value={Math.round(currentVitals.hr)}
                  unit="bpm"
                  level={hrLevel}
                  data={hrTrace}
                  color="#059669"
                  isStaticMode={isStaticMode}
                  referenceRangeText={hrRefText}
                  hasAnomaly={hrLevel !== 'normal'}
                  anomalyText={hrLevel === 'crit' ? 'CRITICAL HR' : 'MODERATE TACHY/BRADY'}
                />

                <VitalCard
                  id="card-spo2"
                  canvasId="canvas-spo2"
                  label="SpO₂ (Oxygen)"
                  value={currentVitals.spo2.toFixed(1)}
                  unit="%"
                  level={spo2Level}
                  data={spo2Trace}
                  color="#0284c7"
                  isStaticMode={isStaticMode}
                  referenceRangeText={spo2RefText}
                  hasAnomaly={spo2Level !== 'normal'}
                  anomalyText={spo2Level === 'crit' ? 'CRITICAL HYPOXIA' : 'DESATURATION'}
                />

                <VitalCard
                  id="card-bp"
                  canvasId="canvas-bp"
                  label="Blood Pressure"
                  value={`${Math.round(currentVitals.bpSys)}/${Math.round(currentVitals.bpDia)}`}
                  unit="mmHg"
                  level={bpLevel}
                  data={bpTrace}
                  color="#7c3aed"
                  isStaticMode={isStaticMode}
                  referenceRangeText={bpRefText}
                  secondaryInfo={`MAP ~${Math.round(currentVitals.bpDia + (currentVitals.bpSys - currentVitals.bpDia) / 3)}`}
                  hasAnomaly={bpLevel !== 'normal'}
                  anomalyText="HYPERTENSIVE"
                />

                <VitalCard
                  id="card-temp"
                  canvasId="canvas-temp"
                  label="Temperature"
                  value={currentVitals.tempC.toFixed(1)}
                  unit="°C"
                  level={tempLevel}
                  data={tempTrace}
                  color="#d97706"
                  isStaticMode={isStaticMode}
                  referenceRangeText={tempRefText}
                  secondaryInfo={`RR: ${currentVitals.respirationRate}/min`}
                />
              </div>

              {/* Baseline status row */}
              <div className="mt-3.5 pt-3 border-t border-[#e2e8f0] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-[#64748b]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[#64748b]">Baseline status:</span>
                  {personalBaseline ? (
                    <span className="text-[#059669] font-semibold">
                      Personal corridor — HR ~{Math.round(personalBaseline.hrMean - personalBaseline.hrSD)}–
                      {Math.round(personalBaseline.hrMean + personalBaseline.hrSD)} bpm
                    </span>
                  ) : (
                    <span className="text-[#334155]">
                      Cold start — using {activeProfile ? activeProfile.label : 'population'} thresholds
                    </span>
                  )}
                </div>

                <div className="font-mono text-[11px] text-[#64748b]">
                  {personalBaseline ? (
                    <span className="text-[#059669] font-medium">Corridor active (N=20)</span>
                  ) : (
                    <span>
                      Corridor buffer: {stableReadingsCount} / {COLD_START_TARGET}
                    </span>
                  )}
                </div>
              </div>

              {/* Static Mode Warning Banner */}
              {isStaticMode && (
                <div className="mt-2.5 p-2.5 rounded-md bg-[#fffbeb] border border-[#fde68a] text-xs text-[#b45309] flex items-center justify-between shadow-xs">
                  <span>⚠ Static test calibration input active — live sensor noise is disabled.</span>
                  <button
                    onClick={handleResumeStream}
                    className="underline text-[11px] font-semibold hover:text-[#78350f]"
                  >
                    Resume Live Stream
                  </button>
                </div>
              )}
            </div>

            {/* Clinical Actions */}
            <ClinicalActions
              onSoftReset={handleSoftReset}
              onHardReset={handleHardReset}
              onReBaseline={handleReBaseline}
              onSnoozeNonCritical={handleSnoozeNonCritical}
              onFlagForReview={handleFlagForReview}
              snoozeSecondsRemaining={snoozeRemainingSec}
            />

            {/* Simulation Controls & Calibration Presets */}
            <SimulationControls
              isStaticMode={isStaticMode}
              onInjectAnomaly={handleInjectAnomaly}
              onApplyStaticInput={handleApplyStaticInput}
              onResumeStream={handleResumeStream}
            />
          </div>

          {/* RIGHT: 5 cols on LG */}
          <div className="lg:col-span-5 space-y-3.5">
            {/* Patient Profiling Agent */}
            <ProfilingAgent
              activeProfile={activeProfile}
              onApplyProfile={handleApplyProfile}
              onLogAgentAction={logAction}
            />

            {/* Prioritized Alert Feed */}
            <AlertFeed
              alerts={alerts}
              onAcknowledge={handleAcknowledgeAlert}
              onDismiss={handleDismissAlert}
            />

            {/* Response & Alarm Fatigue Metrics */}
            <ResponseMetrics alerts={alerts} />

            {/* Agent Decision Log / Audit Trail */}
            <AgentDecisionLog entries={agentLogs} />
          </div>
        </div>

        {/* Modals */}
        <FhirModal
          isOpen={isFhirModalOpen}
          onClose={() => setIsFhirModalOpen(false)}
          patient={currentPatient}
          currentVitals={currentVitals}
        />

        <AiAnalysisModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          patient={currentPatient}
          vitals={currentVitals}
          activeAlerts={alerts.filter((a) => a.status === 'active')}
          corridor={personalBaseline}
          activeProfile={activeProfile}
        />

        {/* Footer */}
        <footer className="mt-6 pt-4 border-t border-[#e2e8f0] text-center text-[11px] text-[#64748b] leading-relaxed">
          Patient Vital Sign Anomaly Detector · Phase 1 (MVP) + AI Profiling Agent · Processing latency &lt; 2.0s · HL7 FHIR Interoperable · High-fidelity edge simulation
        </footer>
      </div>
    </div>
  );
}
