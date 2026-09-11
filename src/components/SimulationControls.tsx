import React, { useState } from 'react';
import { Sliders, CheckCircle2, ShieldAlert } from 'lucide-react';

interface SimulationControlsProps {
  isStaticMode: boolean;
  onInjectAnomaly: (type: 'hr_high' | 'hr_low' | 'spo2_drop' | 'artifact' | 'bp_high') => void;
  onApplyStaticInput: (hr: number | null, spo2: number | null) => void;
  onResumeStream: () => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  isStaticMode,
  onInjectAnomaly,
  onApplyStaticInput,
  onResumeStream
}) => {
  const [staticHR, setStaticHR] = useState<string>('');
  const [staticSpO2, setStaticSpO2] = useState<string>('');

  const handleApply = () => {
    const hrVal = staticHR ? parseFloat(staticHR) : null;
    const spo2Val = staticSpO2 ? parseFloat(staticSpO2) : null;
    onApplyStaticInput(hrVal, spo2Val);
  };

  const applyPreset = (hr: number, spo2: number) => {
    setStaticHR(String(hr));
    setStaticSpO2(String(spo2));
    onApplyStaticInput(hr, spo2);
  };

  return (
    <div className="space-y-3.5">
      {/* Simulation Controls (Noise / Dynamic Anomaly) */}
      <div className="bg-[#ffffff] border border-[#e2e8f0] shadow-xs rounded-lg p-4">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-semibold tracking-wider text-[#64748b] uppercase flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#0284c7]" />
            Simulation Controls
          </h2>
          <span className="text-[11px] text-[#64748b]">
            Standing in for live physiological telemetry
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onInjectAnomaly('hr_high')}
            disabled={isStaticMode}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-[#fed7aa] bg-[#ffffff] text-[#b45309] hover:bg-[#fff7ed] disabled:opacity-40 shadow-xs transition-all"
          >
            Inject tachycardia (+45 bpm)
          </button>

          <button
            onClick={() => onInjectAnomaly('hr_low')}
            disabled={isStaticMode}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-[#bae6fd] bg-[#ffffff] text-[#0284c7] hover:bg-[#f0f9ff] disabled:opacity-40 shadow-xs transition-all"
          >
            Inject bradycardia (-35 bpm)
          </button>

          <button
            onClick={() => onInjectAnomaly('spo2_drop')}
            disabled={isStaticMode}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-[#fecaca] bg-[#ffffff] text-[#b91c1c] hover:bg-[#fef2f2] disabled:opacity-40 shadow-xs transition-all"
          >
            Inject SpO₂ desaturation (-10%)
          </button>

          <button
            onClick={() => onInjectAnomaly('artifact')}
            disabled={isStaticMode}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-[#ddd6fe] bg-[#ffffff] text-[#7c3aed] hover:bg-[#f5f3ff] disabled:opacity-40 shadow-xs transition-all"
            title="Tests median noise filter: single 60bpm spike gets rejected"
          >
            Inject artifact spike (noise test)
          </button>

          <button
            onClick={() => onInjectAnomaly('bp_high')}
            disabled={isStaticMode}
            className="px-2.5 py-1.5 rounded-md text-xs font-medium border border-[#fecaca] bg-[#ffffff] text-[#b91c1c] hover:bg-[#fef2f2] disabled:opacity-40 shadow-xs transition-all"
          >
            Inject BP crisis (185/110)
          </button>
        </div>
      </div>

      {/* Static Test Inputs (Accuracy / Sensor Calibration Checks) */}
      <div className="bg-[#ffffff] border border-[#e2e8f0] shadow-xs rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold tracking-wider text-[#64748b] uppercase flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-[#d97706]" />
            Static Calibration Inputs
          </h2>
          <span className="text-[11px] text-[#64748b]">Fixed verification values</span>
        </div>

        <p className="text-[11px] text-[#475569] leading-relaxed mb-3">
          Holds parameters at a fixed, unchanging value with zero noise to confirm mathematical threshold classification, debounce timing, and verify clinical bedside monitors against reference calibrators.
        </p>

        {/* Inputs */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-[#64748b] font-mono font-medium">HR</label>
            <input
              type="number"
              value={staticHR}
              onChange={(e) => setStaticHR(e.target.value)}
              placeholder="bpm"
              className="w-18 px-2 py-1 text-xs font-mono rounded border border-[#cbd5e1] bg-[#ffffff] text-[#0f172a] focus:outline-none focus:border-[#0284c7] shadow-xs"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <label className="text-[11px] text-[#64748b] font-mono font-medium">SpO₂</label>
            <input
              type="number"
              step="0.1"
              value={staticSpO2}
              onChange={(e) => setStaticSpO2(e.target.value)}
              placeholder="%"
              className="w-18 px-2 py-1 text-xs font-mono rounded border border-[#cbd5e1] bg-[#ffffff] text-[#0f172a] focus:outline-none focus:border-[#0284c7] shadow-xs"
            />
          </div>

          <button
            onClick={handleApply}
            className="px-3 py-1 text-xs font-medium rounded border border-[#fde68a] bg-[#fffbeb] text-[#b45309] hover:bg-[#fef3c7] shadow-xs transition-all"
          >
            Apply static input
          </button>

          {isStaticMode && (
            <button
              onClick={() => {
                setStaticHR('');
                setStaticSpO2('');
                onResumeStream();
              }}
              className="px-3 py-1 text-xs font-medium rounded border border-[#a7f3d0] bg-[#ecfdf5] text-[#047857] hover:bg-[#d1fae5] shadow-xs transition-all"
            >
              Resume simulated stream
            </button>
          )}
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#e2e8f0]">
          <span className="text-[11px] text-[#64748b] mr-1 self-center font-medium">Presets:</span>
          <button
            onClick={() => applyPreset(75, 98)}
            className="px-2 py-1 text-[11px] font-mono rounded border border-[#cbd5e1] bg-[#ffffff] text-[#475569] hover:text-[#0f172a] hover:bg-[#f8fafc] shadow-xs"
          >
            Normal (75 / 98%)
          </button>
          <button
            onClick={() => applyPreset(112, 98)}
            className="px-2 py-1 text-[11px] font-mono rounded border border-[#cbd5e1] bg-[#ffffff] text-[#475569] hover:text-[#0f172a] hover:bg-[#f8fafc] shadow-xs"
          >
            HR mod boundary (112)
          </button>
          <button
            onClick={() => applyPreset(135, 98)}
            className="px-2 py-1 text-[11px] font-mono rounded border border-[#cbd5e1] bg-[#ffffff] text-[#475569] hover:text-[#0f172a] hover:bg-[#f8fafc] shadow-xs"
          >
            HR critical (135)
          </button>
          <button
            onClick={() => applyPreset(75, 91)}
            className="px-2 py-1 text-[11px] font-mono rounded border border-[#cbd5e1] bg-[#ffffff] text-[#475569] hover:text-[#0f172a] hover:bg-[#f8fafc] shadow-xs"
          >
            SpO₂ mod boundary (91%)
          </button>
          <button
            onClick={() => applyPreset(75, 86)}
            className="px-2 py-1 text-[11px] font-mono rounded border border-[#cbd5e1] bg-[#ffffff] text-[#475569] hover:text-[#0f172a] hover:bg-[#f8fafc] shadow-xs"
          >
            SpO₂ critical (86%)
          </button>
        </div>
      </div>
    </div>
  );
};
