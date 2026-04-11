'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Check, Clock, Edit3, Send, PenTool, FileCheck } from 'lucide-react';

interface ContractTimelineProps {
  currentStatus: string;
}

const statusSteps = [
  { id: 'REQUESTED',    label: 'Requested',         icon: Clock },
  { id: 'DRAFT',        label: 'Drafting',          icon: Edit3 },
  { id: 'SENT',         label: 'Review',            icon: Send },
  { id: 'NEGOTIATION',  label: 'Negotiation',       icon: Edit3 },
  { id: 'PENDING_SIGN', label: 'Pending Signature', icon: PenTool },
  { id: 'SIGNED',       label: 'Signed',            icon: FileCheck },
];

export const ContractTimeline: React.FC<ContractTimelineProps> = ({ currentStatus }) => {
  const currentIndex = statusSteps.findIndex(s => s.id === currentStatus);
  const displayStatus = (status: string) => {
    // If the status isn't in our primary list (e.g. EXPIRED), just show its index in context.
    if (currentIndex === -1) return -1;
    return currentIndex;
  };

  const activeIndex = displayStatus(currentStatus);

  return (
    <div className="w-full py-8 overflow-x-auto">
      <div className="flex items-center min-w-[700px] justify-between px-4">
        {statusSteps.map((step, index) => {
          const isCompleted = index < activeIndex;
          const isActive = index === activeIndex;
          const Icon = step.icon;

          return (
            <React.Fragment key={step.id}>
              {/* Step Circle */}
              <div className="flex flex-col items-center relative group">
                <motion.div
                  initial={false}
                  animate={{
                    backgroundColor: isCompleted || isActive ? 'var(--primary)' : 'var(--surface-low)',
                    scale: isActive ? 1.2 : 1,
                    borderColor: isActive ? 'var(--primary-container)' : 'transparent',
                    boxShadow: isActive ? '0 0 15px var(--primary-container)' : 'none'
                  }}
                  className={`
                    w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all duration-500
                    ${isCompleted ? 'text-white' : isActive ? 'text-white' : 'text-gray-400'}
                  `}
                >
                  {isCompleted ? <Check size={20} /> : <Icon size={20} />}
                </motion.div>
                
                <div className={`
                    absolute -bottom-8 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.2em] italic transition-colors
                    ${isActive ? 'text-[var(--primary)]' : 'text-gray-400 opacity-60'}
                `}>
                  {step.label}
                </div>
              </div>

              {/* Connector Line */}
              {index < statusSteps.length - 1 && (
                <div className="flex-1 h-[2px] mx-4 bg-gray-100 relative overflow-hidden">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: isCompleted ? '100%' : '0%' }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="absolute h-full bg-[var(--primary)]"
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
