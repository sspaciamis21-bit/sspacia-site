'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, Loader2, Check, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface Permission {
  id: number;
  name: string;
  description: string | null;
}

interface RolePermission {
  id: number;
  name: string;
}

interface RoleToEdit {
  id: number;
  name: string;
  description: string | null;
  permissions: RolePermission[];
}

interface AddRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  role?: RoleToEdit;
}

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-[10px] font-black text-[#616161] uppercase tracking-[0.2em] mb-2">
      {children} {required && <span className="text-[var(--primary)]">*</span>}
    </label>
  );
}

const inputClass =
  'w-full px-5 py-4 bg-white border border-[var(--outline-variant)]/40 rounded-none text-sm text-[#1B1B1B] placeholder:text-[#9E9E9E] focus:outline-none focus:border-[var(--primary)] transition-all uppercase font-bold tracking-wider';

export function AddRoleModal({ isOpen, onClose, onSuccess, role }: AddRoleModalProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);

  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPermissionsLoading(true);
    fetch('/api/admin/permissions')
      .then((r) => r.json())
      .then((json) => setPermissions(json.data ?? []))
      .catch(() => toast.error('Registry link failed'))
      .finally(() => setPermissionsLoading(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setSelectedPermissions([]);
      return;
    }

    if (role) {
      setName(role.name);
      setDescription(role.description ?? '');
      setSelectedPermissions(role.permissions.map((p) => p.id));
    }
  }, [isOpen, role]);

  const togglePermission = (permissionId: number) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Identity key required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const body = {
        name,
        displayName: name,
        description: description || undefined,
        permissionIds: selectedPermissions,
      };

      const method = role ? 'PATCH' : 'POST';
      const url = role ? `/api/admin/roles/${role.id}` : '/api/admin/roles';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error);

      toast.success(`Access level ${role ? 'reconfigured' : 'initialized'}: ${name}`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registry update failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative flex flex-col w-full max-w-2xl bg-white rounded-none border border-white/10 shadow-2xl overflow-hidden max-h-[90vh]"
          >
             <div className="absolute top-0 left-0 w-full h-1 bg-[var(--primary)]" />
             
            <div className="flex items-center justify-between px-10 py-8 border-b border-[var(--outline-variant)]/20 flex-shrink-0 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#1B1B1B] text-[var(--primary)] border border-white/10 shadow-xl">
                  <Shield size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-display font-black text-[#1B1C1C] tracking-tighter uppercase">
                    {role ? 'Modify Access' : 'Initialize Access Level'}
                  </h2>
                  <p className="text-[10px] text-[#616161] font-bold uppercase tracking-[0.3em] mt-1 opacity-60">Security privilege configuration</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-[#9E9E9E] hover:text-[#1B1B1B] hover:bg-neutral-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div ref={bodyRef} className="flex-1 overflow-y-auto px-10 py-10 space-y-10 custom-scrollbar">
              <form id="add-role-form" onSubmit={handleSubmit} className="space-y-10">
                <section className="space-y-6">
                  <div className="flex items-center gap-4 border-b border-[var(--outline-variant)]/20 pb-4">
                     <span className="text-[11px] font-black text-[#1B1C1C] uppercase tracking-[0.4em]">Core Parameters</span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="name" required>Role Designation</Label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="ACCESS_ROLE_ID"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Mission Directives (Description)</Label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional role description"
                      rows={3}
                      className={inputClass + ' resize-none'}
                    />
                  </div>
                </section>

                <section className="space-y-6">
                   <div className="flex items-center gap-4 border-b border-[var(--outline-variant)]/20 pb-4">
                     <span className="text-[11px] font-black text-[#1B1C1C] uppercase tracking-[0.4em]">Privilege Matrix</span>
                  </div>

                  {permissionsLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 text-[var(--primary)] animate-spin mb-4" />
                      <p className="text-[10px] font-black text-[#9E9E9E] uppercase tracking-widest animate-pulse">Syncing Permissions...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {permissions.map((perm) => {
                        const isSelected = selectedPermissions.includes(perm.id);
                        return (
                          <div
                            key={perm.id}
                            onClick={() => togglePermission(perm.id)}
                            className={`flex items-center justify-between p-5 border transition-all cursor-pointer group ${isSelected ? 'bg-[#1B1B1B] text-white border-[#1B1B1B]' : 'bg-white text-[#616161] border-[var(--outline-variant)]/40 hover:border-[var(--primary)]/60'}`}
                          >
                            <div className="flex-1">
                              <p className={`text-[11px] font-black uppercase tracking-wider ${isSelected ? 'text-[var(--primary)]' : 'text-[#1B1C1C]'}`}>{perm.name}</p>
                              {perm.description && (
                                <p className={`text-[9px] font-bold uppercase tracking-widest mt-1 opacity-60 ${isSelected ? 'text-white/60' : 'text-[#616161]'}`}>{perm.description}</p>
                              )}
                            </div>
                            <div className={`h-5 w-5 border flex items-center justify-center transition-colors ${isSelected ? 'bg-[var(--primary)] border-[var(--primary)]' : 'bg-neutral-50 border-[var(--outline-variant)]/40 text-transparent'}`}>
                               <Check size={14} className={isSelected ? 'text-[#1B1B1B]' : ''} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </form>
            </div>

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
                form="add-role-form"
                disabled={isSubmitting}
                className="flex-[2] py-6 bg-[#1B1B1B] text-white font-black text-[10px] uppercase tracking-[0.3em] hover:bg-[var(--primary)] transition-all disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin inline mr-3" />
                    Synchronizing Registry…
                  </>
                ) : (
                  <>
                    <Shield size={16} className="inline mr-3" />
                    {role ? 'Commit Privilege Update' : 'Initialize Access Level'}
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
