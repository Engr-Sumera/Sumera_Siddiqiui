import React from 'react';
import { Bell, AlertOctagon, CheckCheck, Clock } from 'lucide-react';
import { VitalAlert, DismissReason } from '../types';

interface AlertFeedProps {
  alerts: VitalAlert[];
  onAcknowledge: (id: number) => void;
  onDismiss: (id: number, reason: DismissReason) => void;
}

export const AlertFeed: React.FC<AlertFeedProps> = ({
  alerts,
  onAcknowledge,
  onDismiss
}) => {
  const activeAlerts = alerts.filter((a) => a.status === 'active');

  const formatParam = (p: string) => {
    switch (p) {
      case 'hr':
        return 'Heart Rate';
      case 'spo2':
        return 'SpO₂';
      case 'bp':
        return 'Blood Pressure';
      case 'temp':
        return 'Temperature';
      default:
        return p.toUpperCase();
    }
  };

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="bg-[#ffffff] border border-[#e2e8f0] shadow-xs rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold tracking-wider text-[#64748b] uppercase flex items-center gap-1.5">
          <Bell className="w-4 h-4 text-[#dc2626]" />
          Alert Feed
        </h2>
        <span
          className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
            activeAlerts.length > 0
              ? 'border-[#fecaca] bg-[#fee2e2] text-[#b91c1c] animate-pulse font-bold'
              : 'border-[#e2e8f0] text-[#64748b]'
          }`}
        >
          {activeAlerts.length} active
        </span>
      </div>

      <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
        {alerts.length === 0 ? (
          <div className="text-xs text-[#64748b] py-6 text-center border border-dashed border-[#cbd5e1] rounded-md bg-[#f8fafc]">
            No physiological anomalies detected yet. System actively monitoring.
          </div>
        ) : (
          alerts.slice(0, 25).map((alert, idx) => {
            const isCrit = alert.level === 'crit';
            const isMod = alert.level === 'mod';

            return (
              <div
                key={`alert-${alert.id}-${idx}`}
                className={`p-3 rounded-lg border transition-all text-xs shadow-xs ${
                  isCrit
                    ? 'border-[#fecaca] bg-[#fef2f2] shadow-[0_0_8px_rgba(220,38,38,0.06)]'
                    : isMod
                    ? 'border-[#fed7aa] bg-[#fff7ed]'
                    : 'border-[#e2e8f0] bg-[#f8fafc]'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {isCrit && <AlertOctagon className="w-3.5 h-3.5 text-[#dc2626]" />}
                    <span
                      className={`font-bold ${
                        isCrit ? 'text-[#b91c1c]' : isMod ? 'text-[#b45309]' : 'text-[#047857]'
                      }`}
                    >
                      {formatParam(alert.param)}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-[#ffffff] border border-[#cbd5e1] text-[#475569] font-medium">
                      {alert.level === 'crit' ? 'Critical' : alert.level === 'mod' ? 'Moderate Risk' : 'Low Risk'}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-[#64748b]">
                    {formatTime(alert.time)}
                  </span>
                </div>

                {/* Value & Escalation body */}
                <div className="my-2 text-xs text-[#475569]">
                  <span className="font-mono text-sm font-bold text-[#0f172a]">
                    {alert.value}
                    {alert.param === 'hr' ? ' bpm' : alert.param === 'spo2' ? '%' : ''}
                  </span>
                  {alert.escalated && alert.status === 'active' && (
                    <div className="mt-1 text-[11px] font-semibold text-[#b91c1c] flex items-center gap-1 bg-[#fee2e2] px-2 py-0.5 rounded border border-[#fecaca]">
                      <Clock className="w-3 h-3" />
                      ESCALATED: &gt;15s unacknowledged — primary charge pager notified
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {alert.status === 'active' ? (
                    <>
                      <button
                        onClick={() => onAcknowledge(alert.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded text-[11.5px] font-medium bg-[#ecfdf5] text-[#047857] border border-[#a7f3d0] hover:bg-[#d1fae5] shadow-xs transition-all"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Acknowledge
                      </button>

                      <select
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) {
                            onDismiss(alert.id, e.target.value as DismissReason);
                          }
                        }}
                        className="px-2 py-1 text-[11.5px] rounded border border-[#cbd5e1] bg-[#ffffff] text-[#475569] hover:text-[#0f172a] focus:outline-none shadow-xs"
                      >
                        <option value="" disabled>
                          Dismiss as…
                        </option>
                        <option value="false_positive">False positive (sensor artifact)</option>
                        <option value="patient_stable">Patient stable (verified)</option>
                        <option value="duplicate">Duplicate alarm</option>
                        <option value="other">Other clinical justification</option>
                      </select>
                    </>
                  ) : alert.status === 'acked' ? (
                    <span className="text-[11px] text-[#047857] font-mono font-medium flex items-center gap-1">
                      <CheckCheck className="w-3.5 h-3.5" />
                      Acknowledged in {alert.tta}s
                    </span>
                  ) : (
                    <span className="text-[11px] text-[#64748b] italic font-mono">
                      Dismissed — {alert.reasonLabel || alert.reason} (in {alert.tta}s)
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
