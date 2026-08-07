'use client';

import { useState, useEffect } from 'react';
import { 
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Shield,
  Search,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { FadeUp } from '@/components/ui/fade-up';
import { AddRoleModal } from '@/components/admin/add-role-modal';
import { motion, AnimatePresence } from 'motion/react';

interface Role {
  id: number;
  name: string;
  description: string | null;
  permissions: { id: number; name: string }[];
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/roles');
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to load roles');
      setRoles(json.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load roles');
      setRoles([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchRoles();
  }, []);

  const handleDelete = async () => {
    if (!deletingRole) return;
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/admin/roles/${deletingRole.id}`, {
        method: 'DELETE',
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? 'Failed to delete role');

      toast.success(`Role "${deletingRole.name}" purged from registry.`);
      setDeletingRole(null);
      await fetchRoles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'System rejection: Clearances linked');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setIsAddModalOpen(true);
  };

  const handleAddClick = () => {
    setEditingRole(null);
    setIsAddModalOpen(true);
  };

  const filteredRoles = roles.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-12 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="flex items-center gap-6">
          <div className="h-20 w-20 bg-white text-[var(--primary)] flex items-center justify-center rounded-none border border-[var(--outline-variant)]/40 shadow-xl">
            <Shield size={40} />
          </div>
          <div>
            <h1 className="text-4xl font-display font-black text-[#1B1C1C] tracking-tighter uppercase">Clearance Registry</h1>
            <p className="text-[#616161] font-bold text-[11px] uppercase tracking-widest mt-1 opacity-60 italic">Permission matrices and authentication thresholds</p>
          </div>
        </div>

        <button
          onClick={handleAddClick}
          className="inline-flex items-center justify-center gap-3 px-10 py-5 bg-[var(--primary)] text-white rounded-none text-[11px] font-black uppercase tracking-[0.3em] hover:bg-[#1B1B1B] transition-all shadow-2xl border border-transparent group"
        >
          <Plus size={18} className="group-hover:scale-110 transition-transform" />
          Initialize Clearance
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-[var(--outline-variant)]/40 p-2 flex flex-col md:flex-row items-stretch gap-2 shadow-sm rounded-none">
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={18} />
          <input
            type="text"
            placeholder="FILTER_CLEARANCE_BY_NAME_OR_DATA…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-16 pr-6 py-5 bg-neutral-50 border-none focus:ring-0 text-[11px] font-bold uppercase tracking-widest text-[#1B1C1C] placeholder:text-[#9E9E9E]"
          />
        </div>
        <div className="px-8 flex items-center gap-4 bg-neutral-50 text-[10px] font-black text-[#616161] uppercase tracking-widest border-l border-[var(--outline-variant)]/10">
          <span>Active Definitions:</span>
          <span className="bg-white text-[var(--primary)] px-3 py-1 font-black border border-[var(--outline-variant)]/30 shadow-sm">{roles.length}</span>
        </div>
      </div>

      <FadeUp delay={0.2}>
        <div className="bg-white rounded-none border border-[var(--outline-variant)]/40 shadow-2xl overflow-hidden">
          {isLoading ? (
            <div className="px-10 py-40 flex flex-col items-center justify-center text-center">
              <Loader2 className="h-10 w-10 text-[var(--primary)] animate-spin mb-6" />
              <p className="text-[11px] font-black text-[#1B1C1C] uppercase tracking-[0.4em] animate-pulse">Syncing Permission Matrix...</p>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="px-10 py-40 text-center">
               <Shield size={48} className="mx-auto mb-6 text-[var(--primary)] opacity-20" />
               <p className="text-[11px] font-black text-[#1B1C1C] uppercase tracking-[0.4em]">Registry Empty</p>
               <p className="text-[9px] text-[#616161] font-bold uppercase tracking-widest mt-2 opacity-60 italic">No access clearance definitions detected in the database.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-neutral-50/50 border-b border-[var(--outline-variant)]/20">
                    <th className="px-10 py-6 text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.3em]">Clearance Designation</th>
                    <th className="px-10 py-6 text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.3em]">Functional Scope</th>
                    <th className="px-10 py-6 text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.3em]">Authorized Vectors</th>
                    <th className="px-10 py-6 text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.3em] text-right">Directives</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--outline-variant)]/10 font-bold">
                  {filteredRoles.map((role) => (
                    <tr key={role.id} className="hover:bg-neutral-50/80 transition-colors group">
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-4">
                           <div className="h-2 w-2 bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]" />
                           <span className="text-xs font-black text-[#1B1C1C] uppercase tracking-wider group-hover:text-[var(--primary)] transition-colors">{role.name}</span>
                        </div>
                      </td>
                      <td className="px-10 py-6 max-w-sm">
                        <p className="text-[10px] text-[#616161] font-bold uppercase tracking-widest leading-relaxed">
                          {role.description || 'GENERIC_ACCESS_PROFILE'}
                        </p>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex flex-wrap gap-2">
                          {role.permissions.length === 0 ? (
                            <span className="text-[9px] font-black text-[#9E9E9E] uppercase tracking-widest italic opacity-40">Zero Permissions Assigned</span>
                          ) : (
                            role.permissions.map((perm) => (
                              <span
                                key={perm.id}
                                className="inline-flex items-center px-3 py-1 bg-neutral-100 text-[#1B1B1B] text-[8px] font-black uppercase tracking-widest border border-[var(--outline-variant)]/20"
                              >
                                {perm.name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex justify-end gap-2 text-right">
                          <button
                            onClick={() => handleEditRole(role)}
                            className="p-3 text-[#616161] hover:text-[var(--primary)] hover:bg-neutral-50 transition-all border border-transparent hover:border-[var(--outline-variant)]/20"
                            title="Modify Clearance"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDeletingRole(role)}
                            className="p-3 text-[#616161] hover:text-red-600 hover:bg-neutral-100 transition-all border border-transparent"
                            title="Purge Definition"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </FadeUp>

      <AddRoleModal
        isOpen={isAddModalOpen}
        role={editingRole ?? undefined}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingRole(null);
        }}
        onSuccess={async () => {
          await fetchRoles();
          setEditingRole(null);
        }}
      />

      {/* Modern Industrial Deletion Modal */}
      <AnimatePresence>
        {deletingRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
             <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingRole(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-none border border-white/10 shadow-2xl overflow-hidden"
            >
               <div className="absolute top-0 left-0 w-full h-1 bg-red-600" />
               
               <div className="p-10 text-center">
                  <div className="w-20 h-20 bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-8 rounded-none border border-red-100 shadow-xl">
                    <AlertCircle size={40} />
                  </div>
                  <h3 className="text-2xl font-display font-black text-[#1B1C1C] tracking-tighter uppercase mb-4">
                    Purge Clearance Definition?
                  </h3>
                  <p className="text-[11px] text-[#616161] font-bold uppercase tracking-widest leading-relaxed mb-10 opacity-70">
                    Warning: Purging the <span className="text-[#1B1B1B] font-black decoration-red-600/30 underline decoration-2 underline-offset-4">{deletingRole.name}</span> matrix will disconnect all associated personnel. This operation is irreversible.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setDeletingRole(null)}
                      disabled={isDeleting}
                      className="py-5 bg-white border border-[#1B1B1B] text-[#1B1B1B] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-neutral-100 transition-all disabled:opacity-50"
                    >
                      Abort Command
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="py-5 bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.3em] hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl"
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Purging…
                        </>
                      ) : (
                        'Confirm Purge'
                      )}
                    </button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
