import React from 'react';
import { VitalTraceCanvas } from './VitalTraceCanvas';
import { SeverityLevel } from '../types';

interface VitalCardProps {
  id: string;
  canvasId: string;
  label: string;
  value: string | number;
  unit: string;
  level: SeverityLevel;
  data: number[];
  color: string;
  isStaticMode: boolean;
  referenceRangeText: string;
  hasAnomaly?: boolean;
  anomalyText?: string;
  secondaryInfo?: string;
}

export const VitalCard: React.FC<VitalCardProps> = ({
  id,
  canvasId,
  label,
  value,
  unit,
  level,
  data,
  color,
  isStaticMode,
  referenceRangeText,
  hasAnomaly,
  anomalyText,
  secondaryInfo
}) => {
  const getBadgeStyle = () => {
    if (isStaticMode) {
      return 'text-[#b45309] border-[#fde68a] bg-[#fef3c7]';
    }
    switch (level) {
      case 'crit':
        return 'text-[#b91c1c] border-[#fecaca] bg-[#fee2e2] animate-pulse font-semibold';
      case 'mod':
        return 'text-[#b45309] border-[#fed7aa] bg-[#fff7ed] font-semibold';
      case 'low':
        return 'text-[#047857] border-[#a7f3d0] bg-[#ecfdf5]';
      default:
        return 'text-[#475569] border-[#e2e8f0] bg-[#f8fafc]';
    }
  };

  const getBadgeLabel = () => {
    if (isStaticMode) return 'calibration test';
    switch (level) {
      case 'crit':
        return 'critical';
      case 'mod':
        return 'moderate risk';
      case 'low':
        return 'low risk';
      default:
        return 'normal';
    }
  };

  return (
    <div
      id={id}
      className={`bg-[#ffffff] border rounded-lg p-3.5 shadow-xs transition-colors ${
        level === 'crit' && !isStaticMode
          ? 'border-[#dc2626] bg-[#fef2f2]/40 shadow-[0_0_12px_rgba(220,38,38,0.12)]'
          : 'border-[#e2e8f0]'
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[11px] font-semibold text-[#64748b] uppercase tracking-wider">
            {label}
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-[#0f172a]">
              {value}
            </span>
            <span className="text-xs font-medium text-[#475569]">{unit}</span>
            {secondaryInfo && (
              <span className="ml-2 text-[11px] font-mono text-[#64748b]">
                {secondaryInfo}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${getBadgeStyle()}`}
          >
            {getBadgeLabel()}
          </span>
          <span className="text-[10px] font-mono text-[#64748b]">
            Ref: {referenceRangeText}
          </span>
        </div>
      </div>

      <VitalTraceCanvas
        id={canvasId}
        data={data}
        color={color}
        unit={unit}
        hasAnomaly={hasAnomaly}
        anomalyLabel={anomalyText}
      />
    </div>
  );
};
