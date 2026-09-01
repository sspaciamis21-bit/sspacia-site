'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, Loader2, ChevronDown, Check, User } from 'lucide-react';
import { toast } from 'sonner';
import { validatePassword } from '@/lib/password-validator';

interface Role {
  id: number;
  name: string;
}

interface Location {
  id: number;
  name: string;
}

interface UserToEdit {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  roleId: number;
  role: { id: number; name: string };
  assignedLocations?: { id: number; name: string }[];
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: UserToEdit;
}

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-[10px] font-black text-[#616161] uppercase tracking-[0.2em] mb-2">
      {children} {required && <span className="text-[var(--primary)]">*</span>}
    </label>
  );
}

const inputClass =
  'w-full px-5 py-4 bg-white border border-[var(--outline-variant)]/40 rounded-none text-sm text-[#1B1B1B] placeholder:text-[#9E9E9E] focus:outline-none focus:border-[var(--primary)] transition-all';

const selectClass =
  'w-full px-5 py-4 bg-white border border-[var(--outline-variant)]/40 rounded-none text-sm text-[#1B1B1B] focus:outline-none focus:border-[var(--primary)] transition-all appearance-none cursor-pointer';

export function EditUserModal({ isOpen, onClose, onSuccess, user }: EditUserModalProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [assignedLocationIds, setAssignedLocationIds] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [passwordChanged, setPasswordChanged] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Load roles
    setRolesLoading(true);
    fetch('/api/admin/roles')
      .then((r) => r.json())
      .then((json) => setRoles(json.data ?? []))
      .catch(() => {})
      .finally(() => setRolesLoading(false));

    // Load locations
    setLocationsLoading(true);
    fetch('/api/admin/locations')
      .then((r) => r.json())
      .then((json) => setLocations(json.data ?? []))
      .catch(() => {})
      .finally(() => setLocationsLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setEmail('');
      setPassword('');
      setRoleId('');
      setAssignedLocationIds([]);
      setIsActive(true);
      setPasswordChanged(false);
      return;
    }

    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPassword('');
      setRoleId(String(user.roleId));
      setAssignedLocationIds((user.assignedLocations ?? []).map((loc) => loc.id));
      setIsActive(user.isActive);
      setPasswordChanged(false);
    }
  }, [isOpen, user]);

  const toggleLocation = (locationId: number) => {
    setAssignedLocationIds((prev) =>
      prev.includes(locationId)
        ? prev.filter((id) => id !== locationId)
        : [...prev, locationId]
    );
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordChanged(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !roleId) {
      toast.error('Required identity parameters missing.');
      return;
    }

    // Password validation if provided
    if (password) {
      const pwdCheck = validatePassword(password);
      if (!pwdCheck.isValid) {
        toast.error(pwdCheck.error || 'Secure passcode must be at least 6 characters with 1 capital and 1 number.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const body: Record<string, any> = {
        name,
        email,
        roleId: parseInt(roleId),
        isActive,
        assignedLocationIds,
      };

      if (passwordChanged && password) {
        body.password = password;
      }

      const response = await fetch(`/api/admin/users/${user?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? 'Modification failed');

      toast.success(`Identity updated: ${name}`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'System modification failed');
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
            className="relative flex flex-col w-full max-w-3xl bg-white rounded-none border border-white/10 shadow-2xl overflow-hidden max-h-[90vh]"
          >
             {/* Industrial Accents */}
             <div className="absolute top-0 left-0 w-full h-1 bg-[var(--primary)]" />
             
            {/* Header */}
            <div className="flex items-center justify-between px-10 py-8 border-b border-[var(--outline-variant)]/20 flex-shrink-0 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#1B1B1B] text-[var(--primary)] border border-white/10 shadow-xl">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-display font-black text-[#1B1C1C] tracking-tighter uppercase">Modify Identity</h2>
                  <p className="text-[10px] text-[#616161] font-bold uppercase tracking-[0.3em] mt-1 opacity-60">Re-indexing personnel parameters</p>
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
            <div ref={bodyRef} className="flex-1 overflow-y-auto px-10 py-10 space-y-12 custom-scrollbar">
              <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-12">

                {/* ── Basic Info ── */}
                <section className="space-y-8">
                  <div className="flex items-center gap-4 border-b border-[var(--outline-variant)]/20 pb-4">
                     <span className="text-[11px] font-black text-[#1B1C1C] uppercase tracking-[0.4em]">Core Parameters</span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name" required>Assigned Name</Label>
                      <input
                        id="edit-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="AUTHENTIC_NAME"
                        className={`${inputClass} bg-neutral-50/50 uppercase font-bold tracking-wider`}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                       <Label htmlFor="edit-roleId" required>Clearance Level</Label>
                       <div className="relative">
                         <select
                           id="edit-roleId"
                           value={roleId}
                           onChange={(e) => setRoleId(e.target.value)}
                           className={`${selectClass} bg-neutral-50/50 font-bold uppercase tracking-wider`}
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

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label htmlFor="edit-email" required>Communication Link (Email)</Label>
                      <input
                        id="edit-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="identity@sector.link"
                        className={`${inputClass} bg-neutral-50/50 font-bold tracking-wider`}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-password">Secure Passcode Override</Label>
                      <input
                        id="edit-password"
                        type="password"
                        value={password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        placeholder="LEAVE_BLANK_FOR_NO_CHANGE"
                        className={`${inputClass} bg-neutral-50/50 font-bold`}
                      />
                      <p className="text-[9px] text-[#9E9E9E] font-bold uppercase tracking-widest italic opacity-60">System only updates if field is populated</p>
                    </div>
                  </div>
                </section>

                {/* ── Location Assignment ── */}
                <section className="space-y-8">
                   <div className="flex items-center gap-4 border-b border-[var(--outline-variant)]/20 pb-4">
                     <span className="text-[11px] font-black text-[#1B1C1C] uppercase tracking-[0.4em]">Node Access Permissions</span>
                  </div>

                  {locationsLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 bg-neutral-50/50 border border-dashed border-[var(--outline-variant)]/40">
                      <Loader2 className="h-6 w-6 text-[var(--primary)] animate-spin mb-3" />
                      <p className="text-[10px] font-black text-[#616161] uppercase tracking-[0.3em] animate-pulse">Syncing nodes...</p>
                    </div>
                  ) : locations.length === 0 ? (
                    <div className="py-12 bg-neutral-50/50 border border-dashed border-[var(--outline-variant)]/40 text-center">
                      <p className="text-[10px] font-black text-[#616161] uppercase tracking-[0.3em]">No operational nodes detected</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {locations.map((location) => {
                        const isSelected = assignedLocationIds.includes(location.id);
                        return (
                          <button
                            key={location.id}
                            type="button"
                            onClick={() => toggleLocation(location.id)}
                            className={`flex items-center justify-between p-4 border transition-all text-left ${
                              isSelected 
                                ? 'bg-[#1B1B1B] text-white border-[#1B1B1B]' 
                                : 'bg-white text-[#616161] border-[var(--outline-variant)]/40 hover:border-[var(--primary)]/60'
                            }`}
                          >
                            <span className="text-[10px] font-black uppercase tracking-widest truncate mr-2">{location.name}</span>
                            {isSelected && <Check size={14} className="text-[var(--primary)] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>

                {/* ── Status ── */}
                <section className="space-y-8 pt-4">
                   <div className="flex items-center gap-4 border-b border-[var(--outline-variant)]/20 pb-4">
                     <span className="text-[11px] font-black text-[#1B1C1C] uppercase tracking-[0.4em]">Operating Status</span>
                  </div>

                  <div 
                    onClick={() => setIsActive(!isActive)}
                    className="flex items-center justify-between p-6 bg-neutral-50 border border-[var(--outline-variant)]/40 cursor-pointer group hover:border-[var(--primary)]/60 transition-all"
                  >
                    <div className="flex items-center gap-4">
                       <div className={`h-3 w-3 ${isActive ? 'bg-[#4DB6AC]' : 'bg-red-400'} shadow-[0_0_8px_currentColor]`} />
                       <div>
                         <p className="text-[11px] font-black text-[#1B1C1C] uppercase tracking-widest">
                           Personnel {isActive ? 'Operational' : 'Decommissioned'}
                         </p>
                         <p className="text-[9px] text-[#616161] font-bold uppercase tracking-widest mt-1 opacity-60">
                           {isActive ? 'Authorized for system interaction' : 'Identity locked - access denied'}
                         </p>
                       </div>
                    </div>
                    <div className={`w-12 h-6 rounded-none p-1 transition-colors ${isActive ? 'bg-[#1B1B1B]' : 'bg-neutral-300'}`}>
                       <div className={`w-4 h-4 bg-[var(--primary)] transition-transform ${isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
                  </div>
                </section>
              </form>
            </div>

            {/* Sticky Footer */}
            <div className="flex items-center justify-end gap-0 px-0 py-0 border-t border-[var(--outline-variant)]/20 bg-neutral-50 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-6 text-[10px] font-black text-[#616161] uppercase tracking-[0.3em] hover:bg-neutral-100 transition-all border-r border-[var(--outline-variant)]/20 disabled:opacity-50"
              >
                Abort
              </button>
              <button
                type="submit"
                form="edit-user-form"
                disabled={isSubmitting}
                className="flex-[2] inline-flex items-center justify-center gap-3 py-6 bg-[#1B1B1B] text-white font-black text-[10px] uppercase tracking-[0.3em] hover:bg-[var(--primary)] transition-all disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Syncing Registry…
                  </>
                ) : (
                  <>
                    <User size={16} />
                    Update Identity
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
