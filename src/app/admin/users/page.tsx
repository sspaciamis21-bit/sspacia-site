'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  UserPlus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Filter,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { FadeUp } from '@/components/ui/fade-up';
import { AddUserModal } from '@/components/admin/add-user-modal';
import { EditUserModal } from '@/components/admin/edit-user-modal';

interface User {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  role: { id: number; name: string };
  roleId: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      const json = await response.json();
      setUsers(json.data ?? []);
    } catch {
      toast.error('Failed to access personnel registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (id: number, currentStatus: boolean, name: string) => {
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (!response.ok) throw new Error();
      toast.success(`${name} ${!currentStatus ? 'Activated' : 'Deactivated'}`);
      fetchUsers();
    } catch {
      toast.error('Failed to modify status');
    }
  };

  const handleEditUser = (user: User) => {
    setUserToEdit(user);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to purge this record?')) return;
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error();
      toast.success('Personnel record purged');
      fetchUsers();
    } catch {
      toast.error('Failed to purge record');
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-12">
      {/* Header */}
      <FadeUp>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 bg-white text-[var(--primary)] flex items-center justify-center rounded-none border border-[var(--outline-variant)]/40 shadow-xl">
              <Users size={40} />
            </div>
            <div>
              <h1 className="text-4xl font-display font-black text-[#1B1C1C] tracking-tighter uppercase">Personnel Registry</h1>
              <p className="text-[#616161] font-bold text-[11px] uppercase tracking-widest mt-1 opacity-60 italic">Identity verification and access control</p>
            </div>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[var(--primary)] text-white rounded-none font-black text-[11px] uppercase tracking-[0.3em] hover:bg-[#1B1B1B] transition-all shadow-xl group border border-transparent"
          >
            <UserPlus size={18} className="group-hover:scale-110 transition-transform" />
            Initialize Personnel
          </button>
        </div>
      </FadeUp>

      {/* Registry Table */}
      <FadeUp delay={0.2}>
        <div className="bg-white rounded-none border border-[var(--outline-variant)]/40 shadow-2xl overflow-hidden flex flex-col">
          {/* Table Controls */}
          <div className="px-10 py-8 border-b border-[var(--outline-variant)]/20 flex flex-col md:flex-row gap-6 justify-between bg-neutral-50/30">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-[#9E9E9E]" size={16} />
              <input
                type="text"
                placeholder="SEARCH_BY_NAME_OR_EMAIL…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-white border border-[var(--outline-variant)]/30 rounded-none text-[11px] font-bold uppercase tracking-widest focus:outline-none focus:border-[var(--primary)] transition-all placeholder:opacity-50"
              />
            </div>
            <div className="flex items-center gap-4 text-[10px] font-black text-[#616161] uppercase tracking-[0.2em]">
              <span>Identity Count:</span>
              <span className="bg-neutral-50 text-[var(--primary)] px-3 py-1 font-black border border-[var(--outline-variant)]/40 shadow-sm">{filteredUsers.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-neutral-50/50 border-b border-[var(--outline-variant)]/20">
                  <th className="px-10 py-6 text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.3em]">Identity Profile</th>
                  <th className="px-10 py-6 text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.3em]">Access Level</th>
                  <th className="px-10 py-6 text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.3em]">Operating Status</th>
                  <th className="px-10 py-6 text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.3em]">Registry Date</th>
                  <th className="px-10 py-6 text-[10px] font-black text-[#9E9E9E] uppercase tracking-[0.3em] text-right">Directives</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--outline-variant)]/10 font-bold">
                {loading ? (
                   <tr>
                    <td colSpan={5} className="px-10 py-32 text-center">
                      <div className="flex flex-col items-center justify-center">
                         <Loader2 className="h-12 w-12 text-[var(--primary)] animate-spin mb-6" />
                         <p className="text-[11px] font-black text-[#1B1C1C] uppercase tracking-[0.4em] animate-pulse italic">Scanning Neural Linked Directory...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                   <tr>
                    <td colSpan={5} className="px-10 py-24 text-center">
                       <p className="text-[11px] font-black text-[#616161] uppercase tracking-[0.3em] opacity-40">Zero matches found in registry database</p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, i) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="hover:bg-neutral-50/80 transition-colors group"
                    >
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-6">
                          <div className="h-12 w-12 bg-white text-[var(--primary)] flex items-center justify-center rounded-none font-black text-sm border border-[var(--outline-variant)]/40 shadow-sm group-hover:scale-105 transition-transform">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-[#1B1C1C] uppercase tracking-wider truncate mb-1 group-hover:text-[var(--primary)] transition-colors">
                              {user.name}
                            </p>
                            <p className="text-[10px] text-[#616161] font-bold lowercase tracking-normal truncate opacity-60 italic">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <span className="inline-flex items-center px-3 py-1 bg-neutral-100 text-[#1B1B1B] text-[9px] font-black uppercase tracking-widest border border-[var(--outline-variant)]/20">
                          {user.role.name}
                        </span>
                      </td>
                      <td className="px-10 py-6">
                        <button 
                          onClick={() => handleToggleStatus(user.id, user.isActive, user.name)}
                          className={`flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all hover:scale-105 ${user.isActive ? 'text-[#4DB6AC]' : 'text-red-400 opacity-60'}`}
                        >
                          <div className={`h-2 w-2 ${user.isActive ? 'bg-[#4DB6AC]' : 'bg-red-400'} shadow-[0_0_6px_currentColor]`} />
                          {user.isActive ? 'Active' : 'Deactivated'}
                        </button>
                      </td>
                      <td className="px-10 py-6 text-[10px] text-[#616161] font-mono">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-10 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEditUser(user)}
                            className="p-3 text-[#616161] hover:text-[var(--primary)] hover:bg-[#1B1B1B] transition-all border border-transparent hover:border-white/10" 
                            title="Modify Record"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(user.id)}
                            className="p-3 text-[#616161] hover:text-red-600 hover:bg-neutral-100 transition-all border border-transparent" 
                            title="Purge Identity"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </FadeUp>

      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchUsers}
      />

      {userToEdit && (
        <EditUserModal
          isOpen={!!userToEdit}
          user={userToEdit}
          onClose={() => setUserToEdit(null)}
          onSuccess={fetchUsers}
        />
      )}
    </div>
  );
}
