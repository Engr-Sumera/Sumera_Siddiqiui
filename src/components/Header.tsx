import React from 'react';
import { Volume2, VolumeX, Play, Pause, Activity, ShieldCheck, Zap } from 'lucide-react';
import { PatientInfo } from '../types';

interface HeaderProps {
  currentPatient: PatientInfo;
  patients: PatientInfo[];
  onSelectPatient: (patientId: string) => void;
  bedCategoryLabel: string;
  isStreaming: boolean;
  onToggleStreaming: () => void;
  speed: number;
  onToggleSpeed: () => void;
  isAudioMuted: boolean;
  onToggleAudio: () => void;
  latencyMs: number;
  onOpenFhir: () => void;
  onOpenAiAnalysis: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPatient,
  patients,
  onSelectPatient,
  bedCategoryLabel,
  isStreaming,
  onToggleStreaming,
  speed,
  onToggleSpeed,
  isAudioMuted,
  onToggleAudio,
  latencyMs,
  onOpenFhir,
  onOpenAiAnalysis
}) => {
  return (
    <header className="border-b border-[#e2e8f0] pb-4 mb-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Brand & Mode */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-[#059669] shadow-[0_0_8px_#059669]" />
            <div className="absolute w-5 h-5 rounded-full bg-[#059669]/25 animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-[#0f172a]">
                Vital Sign Anomaly Detector
              </h1>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#f1f5f9] text-[#475569] border border-[#cbd5e1] font-semibold">
                AI Agent
              </span>
            </div>
            <p className="text-xs text-[#64748b]">
              Phase 1 MVP · Contextual Thresholding · Profiling Agent · Edge Telemetry
            </p>
          </div>
        </div>

        {/* Patient Selection & Status */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-[#475569]">
          {/* Bed selector */}
          <div className="flex items-center gap-1.5 bg-[#ffffff] border border-[#cbd5e1] shadow-xs rounded-md px-2.5 py-1">
            <span className="text-[#64748b] font-medium">Bed:</span>
            <select
              value={currentPatient.id}
              onChange={(e) => onSelectPatient(e.target.value)}
              className="bg-transparent text-[#0f172a] font-mono font-semibold focus:outline-none cursor-pointer"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#ffffff] text-[#0f172a]">
                  {p.bed} ({p.name})
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:flex items-center gap-1">
            <span className="text-[#64748b]">Bed category:</span>
            <span className="font-semibold text-[#7c3aed]">{bedCategoryLabel}</span>
          </div>

          {/* Edge Node & SLA Latency */}
          <div className="flex items-center gap-2 bg-[#ffffff] border border-[#cbd5e1] shadow-xs rounded-md px-2.5 py-1">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse" />
              <span className="text-[11px] text-[#64748b]">Edge Node</span>
            </div>
            <span className="text-[11px] font-mono text-[#059669] font-medium flex items-center gap-0.5">
              <Zap className="w-3 h-3" />
              {latencyMs}ms <span className="text-[9px] text-[#64748b]">(SLA &lt; 2.0s)</span>
            </span>
          </div>

          {/* Stream controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleStreaming}
              title={isStreaming ? 'Pause Stream' : 'Resume Stream'}
              className={`p-1.5 rounded border transition-colors shadow-xs ${
                isStreaming
                  ? 'border-[#cbd5e1] bg-[#ffffff] text-[#475569] hover:text-[#0f172a] hover:bg-[#f8fafc]'
                  : 'border-[#d97706]/50 text-[#d97706] bg-[#fef3c7]'
              }`}
            >
              {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onToggleSpeed}
              title="Stream Simulation Speed"
              className="px-2 py-1 text-[11px] font-mono rounded border border-[#cbd5e1] bg-[#ffffff] text-[#475569] hover:text-[#0f172a] hover:bg-[#f8fafc] shadow-xs"
            >
              {speed}x
            </button>

            <button
              onClick={onToggleAudio}
              title={isAudioMuted ? 'Unmute Critical Alarms' : 'Mute Alarms'}
              className={`p-1.5 rounded border transition-colors shadow-xs ${
                !isAudioMuted
                  ? 'border-[#059669]/40 text-[#059669] bg-[#ecfdf5]'
                  : 'border-[#cbd5e1] bg-[#ffffff] text-[#94a3b8] hover:text-[#475569]'
              }`}
            >
              {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Quick AI & FHIR tools */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenAiAnalysis}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-[11.5px] font-medium bg-[#f5f3ff] text-[#7c3aed] border border-[#7c3aed]/30 hover:bg-[#ede9fe] shadow-xs transition-all"
            >
              <Activity className="w-3.5 h-3.5" />
              AI Copilot
            </button>

            <button
              onClick={onOpenFhir}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono text-[#475569] bg-[#ffffff] border border-[#cbd5e1] hover:text-[#0f172a] hover:border-[#94a3b8] shadow-xs transition-all"
            >
              <ShieldCheck className="w-3 h-3 text-[#059669]" />
              FHIR R4
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
