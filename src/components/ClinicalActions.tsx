import React from 'react';
import { RotateCcw, AlertTriangle, RefreshCw, BellOff, Flag } from 'lucide-react';

interface ClinicalActionsProps {
  onSoftReset: () => void;
  onHardReset: () => void;
  onReBaseline: () => void;
  onSnoozeNonCritical: () => void;
  onFlagForReview: () => void;
  snoozeSecondsRemaining: number;
}

export const ClinicalActions: React.FC<ClinicalActionsProps> = ({
  onSoftReset,
  onHardReset,
  onReBaseline,
  onSnoozeNonCritical,
  onFlagForReview,
  snoozeSecondsRemaining
}) => {
  return (
    <div className="bg-[#ffffff] border border-[#e2e8f0] shadow-xs rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold tracking-wider text-[#64748b] uppercase">
          Clinical Actions
        </h2>
        {snoozeSecondsRemaining > 0 && (
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#fef3c7] text-[#b45309] border border-[#fde68a] font-semibold">
            Snoozed: {Math.floor(snoozeSecondsRemaining / 60)}m {snoozeSecondsRemaining % 60}s
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          id="btn-soft-reset"
          onClick={onSoftReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-[#fde68a] bg-[#fffbeb] text-[#b45309] hover:bg-[#fef3c7] shadow-xs transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Soft reset
        </button>

        <button
          id="btn-hard-reset"
          onClick={onHardReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-[#fecaca] bg-[#fef2f2] text-[#b91c1c] hover:bg-[#fee2e2] shadow-xs transition-all"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Hard reset
        </button>

        <button
          id="btn-rebaseline"
          onClick={onReBaseline}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-[#cbd5e1] bg-[#ffffff] text-[#475569] hover:border-[#94a3b8] hover:text-[#0f172a] shadow-xs transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Re-baseline now
        </button>

        <button
          id="btn-snooze"
          onClick={onSnoozeNonCritical}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border shadow-xs transition-all ${
            snoozeSecondsRemaining > 0
              ? 'border-[#fed7aa] bg-[#fff7ed] text-[#c2410c] font-semibold'
              : 'border-[#cbd5e1] bg-[#ffffff] text-[#475569] hover:border-[#94a3b8] hover:text-[#0f172a]'
          }`}
        >
          <BellOff className="w-3.5 h-3.5" />
          {snoozeSecondsRemaining > 0 ? 'Snooze active' : 'Snooze non-critical (10 min)'}
        </button>

        <button
          id="btn-flag-review"
          onClick={onFlagForReview}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-[#cbd5e1] bg-[#ffffff] text-[#475569] hover:border-[#94a3b8] hover:text-[#0f172a] shadow-xs transition-all"
        >
          <Flag className="w-3.5 h-3.5" />
          Flag for clinical review
        </button>
      </div>

      <div className="mt-3 text-[11px] text-[#64748b] leading-relaxed border-t border-[#e2e8f0] pt-2.5">
        <strong className="text-[#0f172a]">Soft reset</strong> clears the active alert queue and response metrics but retains the learned corridor and profile (use between shifts).<br />
        <strong className="text-[#0f172a]">Hard reset</strong> clears baseline corridor, profile, and buffers (use on new admission or new patient).<br />
        <strong className="text-[#0f172a]">Re-baseline</strong> recomputes the personal standard corridor from the most recent 20 stable readings without a full reset.
      </div>
    </div>
  );
};
