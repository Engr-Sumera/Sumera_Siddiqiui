import React, { useState } from 'react';
import { Bot, Check, X, ShieldAlert } from 'lucide-react';
import { ActiveProfile, ChronicCondition, ProfileSuggestion } from '../types';
import {
  AGE_BANDS,
  ageInYears,
  detectAgeCategory,
  computeProfileThresholds,
  formatProfileLabel
} from '../clinicalConstants';

interface ProfilingAgentProps {
  activeProfile: ActiveProfile | null;
  onApplyProfile: (suggestion: ProfileSuggestion, label: string) => void;
  onLogAgentAction: (text: string, kind: 'agent' | 'clinician') => void;
}

export const ProfilingAgent: React.FC<ProfilingAgentProps> = ({
  activeProfile,
  onApplyProfile,
  onLogAgentAction
}) => {
  const [ageValue, setAgeValue] = useState<string>('78');
  const [ageUnit, setAgeUnit] = useState<'years' | 'months' | 'days'>('years');
  const [condition, setCondition] = useState<ChronicCondition>('copd');
  const [suggestion, setSuggestion] = useState<ProfileSuggestion | null>(null);

  const numAge = ageValue === '' ? null : parseFloat(ageValue);
  const yearsEquivalent = ageInYears(numAge, ageUnit);
  const detectedCategory = detectAgeCategory(yearsEquivalent);

  const handleRunAgent = () => {
    if (numAge === null && condition === 'none') {
      onLogAgentAction(
        'Profiling agent: insufficient data (no age, no comorbidity) — recommending adult population default thresholds, confidence 30%.',
        'agent'
      );
      setSuggestion(null);
      return;
    }

    const result = computeProfileThresholds(yearsEquivalent, ageUnit, condition);
    setSuggestion(result);
    const label = formatProfileLabel(result.cat, condition);
    onLogAgentAction(
      `Profiling agent: generated suggested corridor "${label}" — confidence ${result.confidence}%. Awaiting clinician bedside confirmation.`,
      'agent'
    );
  };

  const handleConfirm = () => {
    if (!suggestion) return;
    const label = formatProfileLabel(suggestion.cat, suggestion.condition);
    onApplyProfile(suggestion, label);
    onLogAgentAction(
      `Clinician verified and activated profile "${label}" — personalized thresholds deployed to edge detector.`,
      'clinician'
    );
    setSuggestion(null);
  };

  const handleDiscard = () => {
    setSuggestion(null);
    onLogAgentAction('Clinician discarded agent suggestion — current threshold corridor retained.', 'clinician');
  };

  return (
    <div className="bg-[#ffffff] border border-[#e2e8f0] shadow-xs rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold tracking-wider text-[#64748b] uppercase flex items-center gap-1.5">
          <Bot className="w-4 h-4 text-[#7c3aed]" />
          Patient Profiling Agent
        </h2>
        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#f5f3ff] text-[#7c3aed] border border-[#ddd6fe] font-semibold">
          Contextual AI
        </span>
      </div>

      {/* Input row */}
      <div className="flex flex-wrap gap-2 items-center text-xs">
        <div className="flex items-center gap-1">
          <label className="text-[11px] text-[#64748b] font-medium">Age:</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={ageValue}
            onChange={(e) => setAgeValue(e.target.value)}
            placeholder="e.g. 78"
            className="w-16 px-2 py-1 font-mono rounded border border-[#cbd5e1] bg-[#ffffff] text-[#0f172a] focus:outline-none focus:border-[#7c3aed] shadow-xs"
          />
          <select
            value={ageUnit}
            onChange={(e) => setAgeUnit(e.target.value as any)}
            className="px-1.5 py-1 rounded border border-[#cbd5e1] bg-[#ffffff] text-[#475569] focus:outline-none focus:border-[#7c3aed] shadow-xs"
          >
            <option value="years">years</option>
            <option value="months">months</option>
            <option value="days">days</option>
          </select>
        </div>

        <div className="flex items-center gap-1">
          <label className="text-[11px] text-[#64748b] font-medium">Condition:</label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as ChronicCondition)}
            className="px-2 py-1 rounded border border-[#cbd5e1] bg-[#ffffff] text-[#0f172a] focus:outline-none focus:border-[#7c3aed] shadow-xs"
          >
            <option value="none">None on record</option>
            <option value="copd">COPD (Hypoxic baseline)</option>
            <option value="chf">CHF (Heart failure)</option>
            <option value="arrhythmia">Chronic Arrhythmia</option>
            <option value="postop">Post-op / High-acuity</option>
          </select>
        </div>

        <button
          onClick={handleRunAgent}
          className="px-3 py-1 text-xs font-medium rounded-md bg-[#f5f3ff] text-[#7c3aed] border border-[#ddd6fe] hover:bg-[#ede9fe] shadow-xs transition-all"
        >
          Run profiling agent
        </button>
      </div>

      {/* Detected age category line */}
      <div className="text-[11.5px] text-[#475569] mt-2 mb-2.5">
        Detected age category:{' '}
        <span className="font-semibold text-[#7c3aed]">
          {detectedCategory ? AGE_BANDS[detectedCategory].label : '—'}
        </span>
      </div>

      {/* Suggested Profile Box */}
      {suggestion && (
        <div className="bg-[#f5f3ff] border border-[#ddd6fe] rounded-md p-3 my-2.5 text-xs text-[#334155] shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-bold text-[#6d28d9]">
              Suggested profile: {formatProfileLabel(suggestion.cat, suggestion.condition)}
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#ede9fe] text-[#5b21b6] border border-[#c4b5fd] font-semibold">
              Confidence: {suggestion.confidence}%
            </span>
          </div>

          <ul className="space-y-1 my-2 text-[11.5px] text-[#334155]">
            {suggestion.notes.map((n, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-[#7c3aed] font-bold mt-0.5">•</span>
                <span>{n}</span>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[#ddd6fe]">
            <button
              onClick={handleConfirm}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] hover:bg-[#d1fae5] shadow-xs transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              Confirm profile
            </button>
            <button
              onClick={handleDiscard}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium border border-[#cbd5e1] bg-[#ffffff] text-[#475569] hover:text-[#0f172a] hover:bg-[#f8fafc] shadow-xs transition-all"
            >
              <X className="w-3.5 h-3.5" />
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Active profile readout */}
      {activeProfile ? (
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-md p-2.5 mt-2 text-xs text-[#334155] flex items-center justify-between shadow-xs">
          <div>
            Active profile: <span className="font-semibold text-[#047857]">{activeProfile.label}</span>
          </div>
          <span className="text-[11px] font-mono text-[#64748b]">
            Confidence: {activeProfile.confidence}%
          </span>
        </div>
      ) : (
        <div className="text-[11px] text-[#64748b] italic mt-1">
          No custom profile applied — using population demographic defaults.
        </div>
      )}

      <div className="flex items-start gap-1.5 text-[10.5px] text-[#64748b] leading-relaxed mt-2.5 pt-2 border-t border-[#e2e8f0]">
        <ShieldAlert className="w-3.5 h-3.5 text-[#64748b] shrink-0 mt-0.5" />
        <span>
          Agent proposes dynamic contextual limits from clinical comorbidity and demographic factors. Nothing is activated on alerts until a registered clinician confirms bedside appropriateness.
        </span>
      </div>
    </div>
  );
};
