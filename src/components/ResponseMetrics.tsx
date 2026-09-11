import React from 'react';
import { VitalAlert } from '../types';

interface ResponseMetricsProps {
  alerts: VitalAlert[];
}

export const ResponseMetrics: React.FC<ResponseMetricsProps> = ({ alerts }) => {
  const resolved = alerts.filter((a) => a.status !== 'active');
  const total = alerts.length;

  const ackRate = total ? Math.round((resolved.length / total) * 100) + '%' : '—';

  const ttas = resolved
    .filter((a) => a.tta)
    .map((a) => parseFloat(a.tta!))
    .sort((a, b) => a - b);

  const medianTTA = ttas.length
    ? ttas[Math.floor(ttas.length / 2)].toFixed(1) + 's'
    : '—';

  const escalatedCount = alerts.filter((a) => a.escalated).length;
  const fpCount = alerts.filter((a) => a.reason === 'false_positive').length;

  return (
    <div className="bg-[#ffffff] border border-[#e2e8f0] shadow-xs rounded-lg p-4">
      <h2 className="text-xs font-semibold tracking-wider text-[#64748b] uppercase mb-3">
        Response & Alarm Fatigue Metrics
      </h2>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3 shadow-xs">
          <div className="text-2xl font-bold font-mono text-[#0f172a]">{ackRate}</div>
          <div className="text-[11px] text-[#64748b] mt-0.5">Acknowledgment rate</div>
        </div>

        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3 shadow-xs">
          <div className="text-2xl font-bold font-mono text-[#0f172a]">{medianTTA}</div>
          <div className="text-[11px] text-[#64748b] mt-0.5">Median time to ack (TTA)</div>
        </div>

        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3 shadow-xs">
          <div
            className={`text-2xl font-bold font-mono ${
              escalatedCount > 0 ? 'text-[#b91c1c]' : 'text-[#0f172a]'
            }`}
          >
            {escalatedCount}
          </div>
          <div className="text-[11px] text-[#64748b] mt-0.5">Escalated alerts (&gt;15s)</div>
        </div>

        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3 shadow-xs">
          <div className="text-2xl font-bold font-mono text-[#0284c7]">
            {total ? fpCount : '—'}
          </div>
          <div className="text-[11px] text-[#64748b] mt-0.5">Dismissed as false positive</div>
        </div>
      </div>
    </div>
  );
};
