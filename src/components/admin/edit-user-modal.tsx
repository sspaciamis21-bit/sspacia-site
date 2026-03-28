'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, User, Loader2, ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';

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
    <label htmlFor={htmlFor} className="block text-xs font-bold text-[#616161] uppercase tracking-widest mb-1.5">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

const inputClass =
  'w-full px-4 py-2.5 bg-[#F8F9FA] border border-[#CFD8DC]/50 rounded-lg text-sm text-[#212121] placeholder:text-[#9E9E9E] focus:outline-none focus:ring-4 focus:ring-[#006064]/8 focus:border-[#006064] transition-all';

const selectClass =
  'w-full px-4 py-2.5 bg-[#F8F9FA] border border-[#CFD8DC]/50 rounded-lg text-sm text-[#212121] focus:outline-none focus:ring-4 focus:ring-[#006064]/8 focus:border-[#006064] transition-all appearance-none cursor-pointer';

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
      .catch(() => toast.error('Failed to load roles'))
      .finally(() => setRolesLoading(false));

    // Load locations
    setLocationsLoading(true);
    fetch('/api/admin/locations')
      .then((r) => r.json())
      .then((json) => setLocations(json.data ?? []))
      .catch(() => toast.error('Failed to load locations'))
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
      toast.error('Please fill in Name, Email, and Role.');
      return;
    }

    if (user && !password && !passwordChanged) {
      // Editing user without changing password
    } else if (!user && !password) {
      // Creating new user requires password
      toast.error('Password is required for new users.');
      return;
    }

    // Password validation if provided
    if (password && password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        name,
        email,
        roleId: parseInt(roleId),
        isActive,
        assignedLocationIds,
      };

      if (password) {
        body.password = password;
      }

      const method = user ? 'PATCH' : 'POST';
      const url = user ? `/api/users/${user.id}` : '/api/users';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? `Failed to ${user ? 'update' : 'create'} user`);

      toast.success(`User "${name}" ${user ? 'updated' : 'added'} successfully!`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to ${user ? 'update' : 'create'} user`);
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
            className="relative flex flex-col w-full max-w-md bg-white shadow-2xl h-full"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#CFD8DC]/30 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#E0F7FA] text-[#006064]">
                  <User size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#004D40]">
                    {user ? 'Edit Member' : 'Add New Member'}
                  </h2>
                  <p className="text-xs text-[#9E9E9E]">
                    {user ? 'Update member details' : 'Create a new user account'}
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
              <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-6">
                <section className="space-y-4">
                  <h3 className="text-xs font-bold text-[#9E9E9E] uppercase tracking-widest border-b border-[#CFD8DC]/30 pb-2">
                    Member Information
                  </h3>

                  <div>
                    <Label htmlFor="name" required>
                      Full Name
                    </Label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" required>
                      Email Address
                    </Label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. john@example.com"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">
                      {user ? 'New Password (leave blank to keep current)' : 'Password'}
                    </Label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => handlePasswordChange(e.target.value)}
                      placeholder="••••••••"
                      className={inputClass}
                      required={!user}
                    />
                    {user && (
                      <p className="text-[10px] text-[#9E9E9E] mt-1">
                        Leave blank to keep the current password
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="roleId" required>
                      Role
                    </Label>
                    <div className="relative">
                      <select
                        id="roleId"
                        value={roleId}
                        onChange={(e) => setRoleId(e.target.value)}
                        className={selectClass}
                        required
                      >
                        <option value="">
                          {rolesLoading ? 'Loading roles…' : 'Select a role'}
                        </option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9E9E9E] pointer-events-none" />
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-xs font-bold text-[#9E9E9E] uppercase tracking-widest border-b border-[#CFD8DC]/30 pb-2">
                    Location Assignment
                  </h3>

                  {locationsLoading ? (
                    <div className="text-center py-4">
                      <Loader2 className="mx-auto h-4 w-4 text-[#006064] animate-spin" />
                      <p className="text-xs text-[#9E9E9E] mt-2">Loading locations…</p>
                    </div>
                  ) : locations.length === 0 ? (
                    <p className="text-sm text-[#9E9E9E]">No locations available.</p>
                  ) : (
                    <div className="space-y-2">
                      {locations.map((location) => (
                        <label key={location.id} className="flex items-start gap-3 p-3 border border-[#CFD8DC]/50 rounded-lg hover:bg-[#F8F9FA] transition-colors cursor-pointer">
                          <input
                            type="checkbox"
                            checked={assignedLocationIds.includes(location.id)}
                            onChange={() => toggleLocation(location.id)}
                            className="mt-0.5 h-4 w-4 text-[#006064] border-[#CFD8DC] rounded focus:ring-[#006064]/8"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-[#212121]">{location.name}</p>
                          </div>
                          {assignedLocationIds.includes(location.id) && (
                            <Check size={16} className="text-[#006064] flex-shrink-0 mt-0.5" />
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                  <p className="text-[10px] text-[#9E9E9E]">Select locations where this user has access.</p>
                </section>

                {user && (
                  <section className="space-y-4">
                    <h3 className="text-xs font-bold text-[#9E9E9E] uppercase tracking-widest border-b border-[#CFD8DC]/30 pb-2">
                      Account Status
                    </h3>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <div
                        onClick={() => setIsActive((v) => !v)}
                        className={`relative w-10 h-6 rounded-full transition-colors ${
                          isActive ? 'bg-[#006064]' : 'bg-[#CFD8DC]'
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            isActive ? 'translate-x-5' : 'translate-x-1'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#212121]">
                          {isActive ? 'Active' : 'Inactive'}
                        </p>
                        <p className="text-[10px] text-[#9E9E9E]">
                          Inactive members cannot log in
                        </p>
                      </div>
                    </label>
                  </section>
                )}
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
                form="edit-user-form"
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
                    <User size={15} />
                    {user ? 'Update Member' : 'Add Member'}
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
