import React from 'react';
import { User, AlertCircle, Heart, CheckCircle2 } from 'lucide-react';
import { PatientInfo, VitalAlert } from '../types';

interface PatientSummaryCardsProps {
  patients: PatientInfo[];
  currentPatientId: string;
  onSelectPatient: (id: string) => void;
  alerts: VitalAlert[];
  currentHR: number;
  currentSpO2: number;
}

export const PatientSummaryCards: React.FC<PatientSummaryCardsProps> = ({
  patients,
  currentPatientId,
  onSelectPatient,
  alerts,
  currentHR,
  currentSpO2
}) => {
  return (
    <div className="bg-[#ffffff] border border-[#e2e8f0] shadow-xs rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold tracking-wider text-[#64748b] uppercase flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-[#059669]" />
          Patient Summary Cards · Multi-Bed Overview
        </h2>
        <span className="text-[11px] text-[#64748b]">Telemetry Units</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {patients.map((patient) => {
          const isSelected = patient.id === currentPatientId;
          const patientAlerts = alerts.filter((a) => a.patientId === patient.id && a.status === 'active');
          const hasCrit = patientAlerts.some((a) => a.level === 'crit');
          const hasMod = patientAlerts.some((a) => a.level === 'mod');

          const riskStatus = hasCrit
            ? 'Critical Risk'
            : hasMod
            ? 'Moderate Risk'
            : 'Normal Corridor';

          const riskBadgeStyle = hasCrit
            ? 'bg-[#fee2e2] text-[#b91c1c] border-[#fecaca] font-semibold'
            : hasMod
            ? 'bg-[#fff7ed] text-[#b45309] border-[#fed7aa] font-semibold'
            : 'bg-[#ecfdf5] text-[#047857] border-[#a7f3d0]';

          return (
            <div
              key={patient.id}
              onClick={() => onSelectPatient(patient.id)}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'border-[#059669] bg-[#f0fdf4] shadow-[0_0_10px_rgba(5,150,105,0.08)]'
                  : 'border-[#e2e8f0] bg-[#ffffff] hover:border-[#cbd5e1] hover:bg-[#f8fafc]'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#0f172a]">
                      Bed {patient.bed}
                    </span>
                    {isSelected && (
                      <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-[#059669]/10 text-[#059669] border border-[#059669]/30 font-semibold">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#475569] mt-0.5 font-medium">
                    {patient.name}, {patient.age} {patient.ageUnit}
                  </div>
                </div>

                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${riskBadgeStyle}`}>
                  {riskStatus}
                </span>
              </div>

              <div className="mt-2.5 pt-2 border-t border-[#e2e8f0] flex items-center justify-between text-xs font-mono">
                <div className="text-[#475569]">
                  {isSelected ? (
                    <span className="text-[#059669] font-semibold">HR: {Math.round(currentHR)} bpm</span>
                  ) : (
                    <span>HR: ~74 bpm</span>
                  )}
                  <span className="mx-1.5 text-[#94a3b8]">·</span>
                  {isSelected ? (
                    <span className="text-[#0284c7] font-semibold">SpO₂: {currentSpO2.toFixed(1)}%</span>
                  ) : (
                    <span>SpO₂: ~98%</span>
                  )}
                </div>

                <div className="text-[11px] text-[#64748b]">
                  {patientAlerts.length > 0 ? (
                    <span className="text-[#b91c1c] font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {patientAlerts.length} flags
                    </span>
                  ) : (
                    <span className="text-[#059669] font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Stable
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
