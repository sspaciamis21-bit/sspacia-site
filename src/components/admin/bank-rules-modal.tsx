'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Landmark,
  X,
  Check,
  Loader2,
  HelpCircle,
  Percent,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Building2,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import type { BankRulesState } from '@/app/api/admin/bank-rules/route';

interface BankRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRulesSaved?: (rules: BankRulesState) => void;
}

export function BankRulesModal({ isOpen, onClose, onRulesSaved }: BankRulesModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [vfMethod, setVfMethod] = useState<'NONE' | 'PERCENT' | 'FIXED'>('NONE');
  const [vfValue, setVfValue] = useState<string>('0');

  const [crMethod, setCrMethod] = useState<'NONE' | 'PERCENT' | 'FIXED'>('NONE');
  const [crValue, setCrValue] = useState<string>('0');

  // Simulation test amount
  const [simulationAmount, setSimulationAmount] = useState<string>('50000');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchRules();
    }
  }, [isOpen]);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/bank-rules');
      const data = await res.json();
      if (data.success && data.rules) {
        setVfMethod(data.rules.variableFixedAccount?.method || 'NONE');
        setVfValue(String(data.rules.variableFixedAccount?.value || 0));

        setCrMethod(data.rules.crAccount?.method || 'NONE');
        setCrValue(String(data.rules.crAccount?.value || 0));
      }
    } catch (err) {
      console.error('Error loading bank rules:', err);
      toast.error('Failed to load existing bank rules');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const vfVal = Math.max(0, parseFloat(vfValue) || 0);
      const crVal = Math.max(0, parseFloat(crValue) || 0);

      const payload = {
        variableFixedAccount: {
          method: vfMethod,
          value: vfVal,
        },
        crAccount: {
          method: crMethod,
          value: crVal,
        },
      };

      const res = await fetch('/api/admin/bank-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save bank rules');
      }

      toast.success('3-Accounts Bank Rules saved and updated successfully!');
      if (onRulesSaved && data.rules) {
        onRulesSaved(data.rules);
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error saving bank rules');
    } finally {
      setSaving(false);
    }
  };

  // Live Simulation Calculation
  const testAmt = Math.max(0, parseFloat(simulationAmount) || 0);
  const parsedCrVal = Math.max(0, parseFloat(crValue) || 0);
  const parsedVfVal = Math.max(0, parseFloat(vfValue) || 0);

  let simCrAlloc = 0;
  if (crMethod === 'PERCENT') {
    simCrAlloc = Math.round(testAmt * (parsedCrVal / 100) * 100) / 100;
  } else if (crMethod === 'FIXED') {
    simCrAlloc = Math.min(parsedCrVal, testAmt);
  }

  let simVfAlloc = 0;
  if (vfMethod === 'PERCENT') {
    simVfAlloc = Math.round(testAmt * (parsedVfVal / 100) * 100) / 100;
  } else if (vfMethod === 'FIXED') {
    simVfAlloc = Math.min(parsedVfVal, Math.max(0, testAmt - simCrAlloc));
  }

  const simPrimaryBalance = Math.max(0, testAmt - simCrAlloc - simVfAlloc);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-3 sm:p-5 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-neutral-300 w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 px-5 bg-gradient-to-r from-[#00363A] via-[#006064] to-[#00838F] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4 text-cyan-200" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wide font-display">
                3 Accounts &amp; Bank Circulation Rules
              </h3>
              <p className="text-[11px] text-cyan-100/90">
                Pre-defined automatic fund split from Primary ICICI account into AU Bank accounts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-2 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin text-[#006064]" />
            <span className="text-xs font-mono">Loading bank rules configuration...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-sans">
            {/* Account 1: Primary Account (Read-Only) */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-sm">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-[#1a237e]" />
                  <span className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                    ICICI BANK
                  </span>
                  <span className="font-mono text-gray-600 font-semibold text-[11px]">
                    A/C 136705002010
                  </span>
                  <span className="text-[10px] text-gray-400">• SSPACIA INDIA PRIVATE LIMITED</span>
                </div>
                <span className="px-2 py-0.5 bg-blue-700 text-white font-mono font-bold text-[10px] rounded uppercase tracking-wider">
                  Primary Pool
                </span>
              </div>
              <p className="text-[11px] text-blue-900/80 leading-relaxed">
                <strong>100% of incoming payments</strong> (client invoices, online bookings) land in this Primary Account first. No split rule is needed here because funds circulate outward from this account based on the rules below.
              </p>
            </div>

            {/* Account 2: Variable + Fixed Account */}
            <div className="p-4 bg-neutral-50 border border-neutral-300 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-800" />
                  <span className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                    AU Bank
                  </span>
                  <span className="font-mono text-gray-600 font-semibold text-[11px]">
                    A/C 2121219825030862
                  </span>
                  <span className="text-[10px] text-gray-400">• SSPACIA INDIA PRIVATE LIMITED</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-800 text-white font-mono font-bold text-[10px] rounded uppercase tracking-wider">
                  Variable + Fixed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10.5px] mb-1">
                    Split Method
                  </label>
                  <select
                    value={vfMethod}
                    onChange={(e) => setVfMethod(e.target.value as any)}
                    className="w-full bg-white border border-gray-300 p-2 text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#006064] cursor-pointer"
                  >
                    <option value="NONE">None / No Split</option>
                    <option value="PERCENT">% (Percentage Share)</option>
                    <option value="FIXED">Fixed ₹ (Fixed Amount)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10.5px] mb-1">
                    {vfMethod === 'PERCENT' ? 'Percentage (%)' : vfMethod === 'FIXED' ? 'Fixed Amount (₹)' : 'Value'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step={vfMethod === 'PERCENT' ? '0.01' : '1'}
                      min="0"
                      disabled={vfMethod === 'NONE'}
                      value={vfValue}
                      onChange={(e) => setVfValue(e.target.value)}
                      placeholder={vfMethod === 'PERCENT' ? 'e.g. 20' : vfMethod === 'FIXED' ? 'e.g. 500' : '-'}
                      className="w-full bg-white border border-gray-300 p-2 pr-8 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#006064] disabled:bg-gray-100 disabled:text-gray-400"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono font-bold text-gray-400 text-xs">
                      {vfMethod === 'PERCENT' ? '%' : vfMethod === 'FIXED' ? '₹' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Account 3: CR Account */}
            <div className="p-4 bg-neutral-50 border border-neutral-300 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-800" />
                  <span className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                    AU Bank
                  </span>
                  <span className="font-mono text-gray-600 font-semibold text-[11px]">
                    A/C 1212129825030862
                  </span>
                  <span className="text-[10px] text-gray-400">• SSPACIA INDIA PRIVATE LIMITED</span>
                </div>
                <span className="px-2 py-0.5 bg-purple-800 text-white font-mono font-bold text-[10px] rounded uppercase tracking-wider">
                  CR Account
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10.5px] mb-1">
                    Split Method
                  </label>
                  <select
                    value={crMethod}
                    onChange={(e) => setCrMethod(e.target.value as any)}
                    className="w-full bg-white border border-gray-300 p-2 text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#006064] cursor-pointer"
                  >
                    <option value="NONE">None / No Split</option>
                    <option value="PERCENT">% (Percentage Share)</option>
                    <option value="FIXED">Fixed ₹ (Fixed Amount)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 uppercase tracking-wider text-[10.5px] mb-1">
                    {crMethod === 'PERCENT' ? 'Percentage (%)' : crMethod === 'FIXED' ? 'Fixed Amount (₹)' : 'Value'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step={crMethod === 'PERCENT' ? '0.01' : '1'}
                      min="0"
                      disabled={crMethod === 'NONE'}
                      value={crValue}
                      onChange={(e) => setCrValue(e.target.value)}
                      placeholder={crMethod === 'PERCENT' ? 'e.g. 34' : crMethod === 'FIXED' ? 'e.g. 200' : '-'}
                      className="w-full bg-white border border-gray-300 p-2 pr-8 text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#006064] disabled:bg-gray-100 disabled:text-gray-400"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-mono font-bold text-gray-400 text-xs">
                      {crMethod === 'PERCENT' ? '%' : crMethod === 'FIXED' ? '₹' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Simulation Preview */}
            <div className="p-3.5 bg-cyan-50/60 border border-cyan-200 rounded-sm">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-bold text-cyan-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#006064]" />
                  Live Calculation Simulator:
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-gray-600 font-medium">Test Payment (₹):</span>
                  <input
                    type="number"
                    value={simulationAmount}
                    onChange={(e) => setSimulationAmount(e.target.value)}
                    className="w-24 bg-white border border-cyan-300 px-2 py-0.5 text-xs font-mono font-bold text-gray-900 text-right focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div className="bg-white p-2 border border-cyan-200 text-center">
                  <span className="text-[9.5px] font-mono text-gray-500 uppercase block">Received (100%)</span>
                  <span className="font-mono font-black text-gray-900 text-xs block mt-0.5">
                    {formatCurrency(testAmt)}
                  </span>
                </div>

                <div className="bg-white p-2 border border-emerald-200 text-center">
                  <span className="text-[9.5px] font-mono text-emerald-800 uppercase block">
                    Var + Fixed ({vfMethod === 'PERCENT' ? `${vfValue}%` : vfMethod === 'FIXED' ? `₹${vfValue}` : 'None'})
                  </span>
                  <span className="font-mono font-black text-emerald-700 text-xs block mt-0.5">
                    {formatCurrency(simVfAlloc)}
                  </span>
                </div>

                <div className="bg-white p-2 border border-purple-200 text-center">
                  <span className="text-[9.5px] font-mono text-purple-800 uppercase block">
                    CR ({crMethod === 'PERCENT' ? `${crValue}%` : crMethod === 'FIXED' ? `₹${crValue}` : 'None'})
                  </span>
                  <span className="font-mono font-black text-purple-700 text-xs block mt-0.5">
                    {formatCurrency(simCrAlloc)}
                  </span>
                </div>

                <div className="bg-white p-2 border border-blue-200 text-center">
                  <span className="text-[9.5px] font-mono text-blue-900 uppercase block">Primary Net Balance</span>
                  <span className="font-mono font-black text-blue-900 text-xs block mt-0.5">
                    {formatCurrency(simPrimaryBalance)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#006064] hover:bg-[#004D40] text-white px-5 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Bank Rules</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
