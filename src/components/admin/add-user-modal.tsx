'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface Role {
  id: number;
  name: string;
}

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-bold text-[#616161] uppercase tracking-widest mb-1.5">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

const inputClass =
  'w-full px-4 py-2.5 bg-[#F8F9FA] border border-[#CFD8DC]/50 rounded-lg text-sm text-[#212121] placeholder:text-[#9E9E9E] focus:outline-none focus:ring-4 focus:ring-[#006064]/8 focus:border-[#006064] transition-all';

const selectClass =
  'w-full px-4 py-2.5 bg-[#F8F9FA] border border-[#CFD8DC]/50 rounded-lg text-sm text-[#212121] focus:outline-none focus:ring-4 focus:ring-[#006064]/8 focus:border-[#006064] transition-all appearance-none cursor-pointer';


export function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');

  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setRolesLoading(true);
    fetch('/api/admin/roles')
      .then((r) => r.json())
      .then((json) => setRoles(json.data ?? []))
      .catch(() => {})
      .finally(() => setRolesLoading(false));
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setEmail('');
      setPassword('');
      setRoleId('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !password || !roleId) {
      toast.error('Required fields missing.');
      return;
    }

    setIsSubmitting(true);
    try {
      const body = {
        name,
        email,
        password,
        roleId,
      };

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? 'Failed to create user');

      toast.success(`Personnel registered: ${name}`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to register personnel');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-10">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative flex flex-col w-full max-w-2xl bg-white rounded-none border border-white/10 shadow-2xl overflow-hidden max-h-full"
          >
             {/* Industrial Accents */}
             <div className="absolute top-0 left-0 w-full h-1 bg-[var(--primary)]" />
             
            {/* Header */}
            <div className="flex items-center justify-between px-10 py-8 border-b border-[var(--outline-variant)]/20 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#1B1B1B] text-[var(--primary)] border border-white/10 shadow-xl">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-display font-black text-[#1B1C1C] tracking-tighter uppercase">Personnel Registration</h2>
                  <p className="text-[10px] text-[#616161] font-bold uppercase tracking-[0.3em] mt-1 opacity-60">System identity initialization</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-[#9E9E9E] hover:text-[#1B1B1B] hover:bg-neutral-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable form body */}
            <div ref={bodyRef} className="flex-1 overflow-y-auto px-10 py-10 space-y-10 custom-scrollbar">
              <form id="add-user-form" onSubmit={handleSubmit} className="space-y-10">

                {/* ── Basic Info ── */}
                <section className="space-y-6">
                  <div className="flex items-center gap-4 border-b border-[var(--outline-variant)]/20 pb-4">
                     <span className="text-[11px] font-black text-[#1B1C1C] uppercase tracking-[0.4em]">Identity Parameters</span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label htmlFor="name" required>Assigned Name</Label>
                      <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="AUTHENTIC_NAME"
                        className={`${inputClass} rounded-none border-[var(--outline-variant)]/40 focus:border-[var(--primary)] bg-neutral-50/50 uppercase font-bold tracking-wider`}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                       <Label htmlFor="roleId" required>Access Level</Label>
                       <div className="relative">
                         <select
                           id="roleId"
                           value={roleId}
                           onChange={(e) => setRoleId(e.target.value)}
                           className={`${selectClass} rounded-none border-[var(--outline-variant)]/40 focus:border-[var(--primary)] bg-neutral-50/50 font-bold uppercase tracking-wider`}
                           required
                         >
                           <option value="" className="text-[#9E9E9E]">SELECT_CLEARANCE</option>
                           {roles.map((role) => (
                             <option key={role.id} value={role.id} className="text-[#1B1B1B]">
                               {role.name}
                             </option>
                           ))}
                         </select>
                         <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9E9E9E] pointer-events-none" />
                       </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" required>Communication Link (Email)</Label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="identity@sector.link"
                      className={`${inputClass} rounded-none border-[var(--outline-variant)]/40 focus:border-[var(--primary)] bg-neutral-50/50 font-bold tracking-wider`}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" required>Secure Passcode</Label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className={`${inputClass} rounded-none border-[var(--outline-variant)]/40 focus:border-[var(--primary)] bg-neutral-50/50 font-bold`}
                      required
                    />
                  </div>
                </section>
              </form>
            </div>

            {/* Sticky Footer */}
            <div className="flex items-center justify-end gap-0 px-0 py-0 border-t border-[var(--outline-variant)]/20 bg-neutral-50">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-5 text-[10px] font-black text-[#616161] uppercase tracking-[0.3em] hover:bg-neutral-100 transition-all border-r border-[var(--outline-variant)]/20 disabled:opacity-50"
              >
                Abort
              </button>
              <button
                type="submit"
                form="add-user-form"
                disabled={isSubmitting}
                className="flex-[2] inline-flex items-center justify-center gap-3 py-5 bg-[#1B1B1B] text-white font-black text-[10px] uppercase tracking-[0.3em] hover:bg-[var(--primary)] transition-all disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Initializing Registry…
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    Commit Identity
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
