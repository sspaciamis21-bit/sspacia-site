'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, Loader2, Check } from 'lucide-react';
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
    <label htmlFor={htmlFor} className="block text-xs font-bold text-[#616161] uppercase tracking-widest mb-1.5">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

const inputClass =
  'w-full px-4 py-2.5 bg-[#F8F9FA] border border-[#CFD8DC]/50 rounded-lg text-sm text-[#212121] placeholder:text-[#9E9E9E] focus:outline-none focus:ring-4 focus:ring-[#006064]/8 focus:border-[#006064] transition-all';

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
      .catch(() => toast.error('Failed to load permissions'))
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
      toast.error('Role name is required.');
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
      if (!response.ok) throw new Error(json.error ?? `Failed to ${role ? 'update' : 'create'} role`);

      toast.success(`Role "${name}" ${role ? 'updated' : 'added'} successfully!`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${role ? 'update' : 'create'} role`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative flex flex-col w-full max-w-xl bg-white shadow-2xl h-full"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#CFD8DC]/30 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#E0F7FA] text-[#006064]">
                  <Shield size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#004D40]">
                    {role ? 'Edit Role' : 'Add New Role'}
                  </h2>
                  <p className="text-xs text-[#9E9E9E]">
                    {role ? 'Update role and permissions' : 'Create a new user role with permissions'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-[#9E9E9E] hover:text-[#212121] hover:bg-[#F8F9FA] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <form id="add-role-form" onSubmit={handleSubmit} className="space-y-6">
                <section className="space-y-4">
                  <h3 className="text-xs font-bold text-[#9E9E9E] uppercase tracking-widest border-b border-[#CFD8DC]/30 pb-2">
                    Role Details
                  </h3>

                  <div>
                    <Label htmlFor="name" required>
                      Role Name
                    </Label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Manager"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional description for this role"
                      rows={2}
                      className={inputClass + ' resize-y'}
                    />
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-xs font-bold text-[#9E9E9E] uppercase tracking-widest border-b border-[#CFD8DC]/30 pb-2">
                    Permissions
                  </h3>

                  {permissionsLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="mx-auto h-5 w-5 text-[#006064] animate-spin" />
                      <p className="text-xs text-[#9E9E9E] mt-2">Loading permissions…</p>
                    </div>
                  ) : permissions.length === 0 ? (
                    <p className="text-sm text-[#9E9E9E]">No permissions available.</p>
                  ) : (
                    <div className="space-y-2">
                      {permissions.map((perm) => (
                        <label
                          key={perm.id}
                          className="flex items-start gap-3 p-3 border border-[#CFD8DC]/50 rounded-lg hover:bg-[#F8F9FA] transition-colors cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(perm.id)}
                            onChange={() => togglePermission(perm.id)}
                            className="mt-0.5 h-4 w-4 text-[#006064] border-[#CFD8DC] rounded focus:ring-[#006064]/8"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-[#212121]">{perm.name}</p>
                            {perm.description && (
                              <p className="text-xs text-[#9E9E9E]">{perm.description}</p>
                            )}
                          </div>
                          {selectedPermissions.includes(perm.id) && (
                            <Check size={16} className="text-[#006064] flex-shrink-0 mt-0.5" />
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </section>
              </form>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#CFD8DC]/30 bg-white flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-lg border border-[#CFD8DC]/50 text-sm font-bold text-[#616161] hover:bg-[#F8F9FA] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-role-form"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#006064] text-white rounded-lg text-sm font-bold shadow-md shadow-[#006064]/20 hover:bg-[#004D40] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Shield size={15} />
                    {role ? 'Update Role' : 'Add Role'}
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
