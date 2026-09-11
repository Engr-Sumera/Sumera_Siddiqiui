import React, { useState } from 'react';
import { X, Sparkles, Activity, AlertCircle, CheckCircle2, Stethoscope, RefreshCw } from 'lucide-react';
import { PatientInfo, VitalsReading, VitalAlert, ActiveProfile } from '../types';

interface AiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientInfo;
  vitals: VitalsReading;
  activeAlerts: VitalAlert[];
  corridor: { hrMean: number; hrSD: number; spo2Mean: number } | null;
  activeProfile: ActiveProfile | null;
}

interface AnalysisResult {
  riskLevel: 'Low' | 'Moderate' | 'High';
  summary: string;
  etiologies: string[];
  actions: string[];
  falsePositiveSuspicion?: string;
  aiSource: string;
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({
  isOpen,
  onClose,
  patient,
  vitals,
  activeAlerts,
  corridor,
  activeProfile
}) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const runEvaluation = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/clinical-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient,
          vitals: {
            hr: Math.round(vitals.hr),
            spo2: Number(vitals.spo2.toFixed(1)),
            bpSys: Math.round(vitals.bpSys),
            bpDia: Math.round(vitals.bpDia),
            tempC: Number(vitals.tempC.toFixed(1)),
            respirationRate: vitals.respirationRate
          },
          activeAlerts: activeAlerts.map((a) => ({
            param: a.param,
            level: a.level,
            value: a.value,
            escalated: a.escalated
          })),
          corridor,
          activeProfile
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate clinical evaluation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-[#ffffff] border border-[#e2e8f0] rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#f5f3ff] text-[#7c3aed] border border-[#ddd6fe]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#0f172a]">
                AI Clinical Decision Support Agent
              </h3>
              <p className="text-[11px] text-[#64748b]">
                Multi-parameter Deterioration Risk & Differential Causality · Powered by Gemini 3.8 Flash
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Telemetry Snapshot Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3 text-xs shadow-xs">
            <div>
              <span className="text-[#64748b] block text-[10px] font-semibold">HEART RATE</span>
              <span className="font-mono text-sm font-bold text-[#059669]">
                {Math.round(vitals.hr)} bpm
              </span>
            </div>
            <div>
              <span className="text-[#64748b] block text-[10px] font-semibold">SpO₂</span>
              <span className="font-mono text-sm font-bold text-[#0284c7]">
                {vitals.spo2.toFixed(1)}%
              </span>
            </div>
            <div>
              <span className="text-[#64748b] block text-[10px] font-semibold">BLOOD PRESSURE</span>
              <span className="font-mono text-sm font-bold text-[#7c3aed]">
                {Math.round(vitals.bpSys)}/{Math.round(vitals.bpDia)}
              </span>
            </div>
            <div>
              <span className="text-[#64748b] block text-[10px] font-semibold">ACTIVE ALARMS</span>
              <span
                className={`font-mono text-sm font-bold ${
                  activeAlerts.length > 0 ? 'text-[#dc2626]' : 'text-[#059669]'
                }`}
              >
                {activeAlerts.length} active
              </span>
            </div>
          </div>

          {/* Action Trigger if not evaluated yet */}
          {!result && !loading && (
            <div className="text-center py-8 px-4 border border-dashed border-[#cbd5e1] rounded-lg bg-[#f8fafc]">
              <Stethoscope className="w-8 h-8 text-[#7c3aed] mx-auto mb-2 opacity-90" />
              <h4 className="text-sm font-semibold text-[#0f172a] mb-1">
                Synthesize Real-Time Clinical Assessment
              </h4>
              <p className="text-xs text-[#475569] max-w-md mx-auto mb-4">
                The AI Agent will examine multi-parameter cross-correlation between HR, SpO₂, Blood Pressure, learned baseline corridor, and clinical conditions to quantify deterioration risk.
              </p>
              <button
                onClick={runEvaluation}
                className="px-4 py-2 rounded-md text-xs font-semibold bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-all inline-flex items-center gap-2 shadow-xs"
              >
                <Sparkles className="w-4 h-4" />
                Run AI Clinical Analysis
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="py-12 text-center text-xs text-[#64748b] space-y-3">
              <RefreshCw className="w-6 h-6 text-[#7c3aed] animate-spin mx-auto" />
              <p>Analyzing physiological waveforms, corridors, and comorbidity layers…</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 bg-[#fee2e2] border border-[#fecaca] rounded-lg text-xs text-[#b91c1c] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Evaluation Results */}
          {result && (
            <div className="space-y-4">
              {/* Risk Score Pill */}
              <div className="flex items-center justify-between p-3.5 bg-[#f8fafc] border border-[#e2e8f0] rounded-lg shadow-xs">
                <div>
                  <span className="text-[10px] text-[#64748b] uppercase font-semibold tracking-wider block">
                    Calculated Deterioration Risk
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-base font-bold font-mono px-2.5 py-0.5 rounded border ${
                        result.riskLevel === 'High'
                          ? 'border-[#fecaca] bg-[#fee2e2] text-[#b91c1c]'
                          : result.riskLevel === 'Moderate'
                          ? 'border-[#fed7aa] bg-[#fff7ed] text-[#b45309]'
                          : 'border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]'
                      }`}
                    >
                      {result.riskLevel} Risk
                    </span>
                    <span className="text-xs text-[#64748b] font-mono">
                      (Source: {result.aiSource})
                    </span>
                  </div>
                </div>

                {result.falsePositiveSuspicion && (
                  <div className="text-right">
                    <span className="text-[10px] text-[#64748b] uppercase font-semibold tracking-wider block">
                      False Alarm Suspicion
                    </span>
                    <span className="text-xs font-mono font-medium text-[#0f172a]">
                      {result.falsePositiveSuspicion}
                    </span>
                  </div>
                )}
              </div>

              {/* Clinical Summary */}
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3.5 shadow-xs">
                <h4 className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#0284c7]" />
                  Physiological Trajectory Assessment
                </h4>
                <p className="text-xs text-[#334155] leading-relaxed">
                  {result.summary}
                </p>
              </div>

              {/* Likely Etiologies */}
              {result.etiologies && result.etiologies.length > 0 && (
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3.5 shadow-xs">
                  <h4 className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider mb-2">
                    Differential Etiologies / Contributing Factors
                  </h4>
                  <ul className="space-y-1 text-xs text-[#334155]">
                    {result.etiologies.map((et, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#d97706] font-bold mt-0.5">•</span>
                        <span>{et}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actionable Bedside Recommendations */}
              {result.actions && result.actions.length > 0 && (
                <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3.5 shadow-xs">
                  <h4 className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                    Suggested Bedside Clinical Interventions
                  </h4>
                  <ul className="space-y-1.5 text-xs text-[#0f172a]">
                    {result.actions.map((act, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-[#059669] font-mono text-[11px] font-bold">{i + 1}.</span>
                        <span className="font-medium">{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#e2e8f0] bg-[#f8fafc]">
          <span className="text-[10px] text-[#64748b]">
            Clinical decision support only. Diagnostic responsibility remains with attending healthcare providers.
          </span>
          <div className="flex items-center gap-2">
            {result && (
              <button
                onClick={runEvaluation}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium border border-[#cbd5e1] bg-[#ffffff] text-[#475569] hover:text-[#0f172a] shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Re-evaluate
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded text-xs font-medium border border-[#cbd5e1] bg-[#ffffff] text-[#0f172a] hover:bg-[#f1f5f9] shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
