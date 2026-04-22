"use client";

import { STATE_FLOW, STATUS_META } from "@/lib/clm/transitions";
import type { ContractStatusName } from "@/types/clm";

interface Props {
  current: ContractStatusName;
}

export default function ContractStateBar({ current }: Props) {
  const currentIdx = STATE_FLOW.indexOf(current);

  return (
    <div className="flex items-center w-full px-2 py-6 overflow-x-auto no-scrollbar">
      {STATE_FLOW.map((step, i) => {
        const meta = STATUS_META[step];
        const isDone = i < currentIdx;
        const isCurrent = step === current;
        const isLast = i === STATE_FLOW.length - 1;

        if (!meta) return null;

        return (
          <div key={step} className="flex items-center flex-shrink-0 group">
            <div className={`flex items-center gap-2.5 px-4 py-2 rounded-none transition-all duration-300 ${
              isCurrent 
                ? 'bg-black text-white' 
                : ''
            }`}>
              {isDone ? (
                <div className="flex items-center justify-center h-5 w-5 rounded-none bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6L5 8.5L9.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : isCurrent ? (
                <div className="h-2 w-2 bg-[var(--primary)] animate-pulse"></div>
              ) : (
                <div className="h-1.5 w-1.5 bg-gray-200 group-hover:bg-gray-400"></div>
              )}
              
              <span className={`text-[10px] uppercase tracking-[0.2em] font-bold ${
                isCurrent 
                  ? 'text-white' 
                  : isDone 
                    ? 'text-emerald-500' 
                    : 'text-gray-400 group-hover:text-gray-600'
              }`}>
                {meta.label}
              </span>
            </div>
            
            {!isLast && (
              <div className="mx-3 text-gray-200">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                   <path d="M4.5 9L7.5 6L4.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

