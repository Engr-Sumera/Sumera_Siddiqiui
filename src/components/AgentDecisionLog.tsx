import React from 'react';
import { ScrollText } from 'lucide-react';
import { AgentLogEntry } from '../types';

interface AgentDecisionLogProps {
  entries: AgentLogEntry[];
}

export const AgentDecisionLog: React.FC<AgentDecisionLogProps> = ({ entries }) => {
  const formatTime = (d: Date) => {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="bg-[#ffffff] border border-[#e2e8f0] shadow-xs rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold tracking-wider text-[#64748b] uppercase flex items-center gap-1.5">
          <ScrollText className="w-3.5 h-3.5 text-[#7c3aed]" />
          Agent Decision Log
        </h2>
        <span className="text-[11px] text-[#64748b]">HIPAA Audit Trail</span>
      </div>

      <div className="max-h-[190px] overflow-y-auto space-y-2 pr-1 custom-scrollbar text-xs">
        {entries.length === 0 ? (
          <div className="text-xs text-[#64748b] italic py-3 text-center">
            No agent or clinician decisions recorded in this session.
          </div>
        ) : (
          entries.map((entry) => {
            const isAgent = entry.kind === 'agent';
            const isClinician = entry.kind === 'clinician';

            return (
              <div
                key={entry.id}
                className={`pl-2.5 py-1.5 border-l-2 text-[11px] leading-snug rounded-r ${
                  isAgent
                    ? 'border-[#7c3aed] bg-[#f5f3ff]/60 text-[#334155]'
                    : isClinician
                    ? 'border-[#059669] bg-[#ecfdf5]/60 text-[#334155]'
                    : 'border-[#0284c7] bg-[#f0f9ff]/60 text-[#334155]'
                }`}
              >
                <span className="font-mono text-[#64748b] mr-2">
                  [{formatTime(entry.time)}]
                </span>
                <span className="font-bold mr-1.5 text-[#0f172a]">
                  {isAgent ? 'AI Agent:' : isClinician ? 'Clinician:' : 'System:'}
                </span>
                <span className="text-[#334155]">{entry.text}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
