'use client';

import { useState, useEffect } from 'react';
import { 
  Plus,
  Edit2,
  Trash2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { FadeUp } from '@/components/ui/fade-up';
import { AddRoleModal } from '@/components/admin/add-role-modal';

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

      toast.success(`Role "${deletingRole.name}" deleted.`);
      setDeletingRole(null);
      await fetchRoles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete role');
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <FadeUp>
          <h1 className="text-3xl font-bold text-[#004D40]">Role Management</h1>
          <p className="text-[#616161]">Manage user roles and their permissions.</p>
        </FadeUp>

        <FadeUp delay={0.1}>
          <button
            onClick={handleAddClick}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#006064] text-white rounded-lg font-bold shadow-lg shadow-[#006064]/20 hover:bg-[#004D40] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus size={20} />
            Add New Role
          </button>
        </FadeUp>
      </div>

      <FadeUp delay={0.2}>
        <div className="bg-white rounded-xl border border-[#CFD8DC]/30 shadow-sm p-6">
          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 className="mx-auto h-6 w-6 text-[#006064] animate-spin" />
              <p className="text-sm font-bold text-[#616161] mt-3">Loading roles...</p>
            </div>
          ) : roles.length === 0 ? (
            <div className="text-center text-[#616161] py-16">
              <p className="text-lg font-bold">No roles found.</p>
              <p className="text-sm mt-2">Create your first role to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8F9FA] uppercase text-xs font-bold text-[#9E9E9E] tracking-widest">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Permissions</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CFD8DC]/20">
                  {roles.map((role) => (
                    <tr key={role.id} className="hover:bg-[#E0F7FA]/20 transition-colors">
                      <td className="px-4 py-3 text-sm font-bold text-[#212121]">{role.name}</td>
                      <td className="px-4 py-3 text-sm text-[#616161]">
                        {role.description || <span className="text-[#9E9E9E] italic">No description</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {role.permissions.length === 0 ? (
                            <span className="text-xs text-[#9E9E9E]">No permissions</span>
                          ) : (
                            role.permissions.slice(0, 2).map((perm) => (
                              <span
                                key={perm.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-[#E0F7FA] text-[#006064]"
                              >
                                {perm.name}
                              </span>
                            ))
                          )}
                          {role.permissions.length > 2 && (
                            <span className="text-xs text-[#9E9E9E] font-bold">+{role.permissions.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                          onClick={() => handleEditRole(role)}
                          className="p-1.5 text-[#9E9E9E] hover:text-[#006064] hover:bg-[#E0F7FA] rounded-md"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingRole(role)}
                          className="p-1.5 text-[#9E9E9E] hover:text-red-600 hover:bg-red-50 rounded-md"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
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

      {deletingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-[#CFD8DC]/30 overflow-hidden">
            <div className="px-6 py-5 border-b border-[#CFD8DC]/30 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50 text-red-600">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#004D40]">Confirm Deletion</h3>
                <p className="mt-1 text-sm text-[#616161]">
                  Are you sure you want to delete the <strong>{deletingRole.name}</strong> role?
                </p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[#424242]">
                This action cannot be undone. Users with this role will lose their permissions.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeletingRole(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg border border-[#CFD8DC]/60 text-sm font-bold text-[#616161] hover:bg-[#F8F9FA] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {isDeleting && <Loader2 size={14} className="animate-spin" />}
                  {isDeleting ? 'Deleting…' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
