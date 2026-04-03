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
  Filter
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
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to load users');
      setUsers(json.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load users');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const response = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Delete failed');
      toast.success('User deleted successfully');
      fetchUsers();
    } catch {
      toast.error('Failed to delete user');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <FadeUp>
          <h1 className="text-3xl font-bold text-[#004D40]">Member Management</h1>
          <p className="text-[#616161]">View and manage all registered SSPACIA workspace members.</p>
        </FadeUp>
        
        <FadeUp delay={0.1}>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#006064] text-white rounded-lg font-bold shadow-lg shadow-[#006064]/20 hover:bg-[#004D40] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <UserPlus size={20} />
            Add New Member
          </button>
        </FadeUp>
      </div>

      <FadeUp delay={0.2}>
        <div className="bg-white rounded-xl border border-[#CFD8DC]/30 shadow-sm overflow-hidden">
          {/* Table Header / Toolbar */}
          <div className="p-6 border-b border-[#CFD8DC]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#9E9E9E] group-focus-within:text-[#006064] transition-colors">
                <Search size={18} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-11 pr-4 py-3 bg-[#F8F9FA] border border-[#CFD8DC]/30 rounded-lg focus:ring-4 focus:ring-[#006064]/5 focus:border-[#006064] outline-none transition-all placeholder:text-[#9E9E9E]"
              />
            </div>
            
            <div className="flex items-center gap-3">
              <button className="p-3 text-[#616161] hover:bg-[#F8F9FA] rounded-lg border border-[#CFD8DC]/30 transition-colors">
                <Filter size={18} />
              </button>
              <div className="text-sm text-[#9E9E9E] font-bold uppercase tracking-widest whitespace-nowrap">
                {filteredUsers.length} Total Members
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8F9FA]">
                  <th className="px-6 py-4 text-xs font-bold text-[#9E9E9E] uppercase tracking-widest">Member</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#9E9E9E] uppercase tracking-widest">Role</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#9E9E9E] uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#9E9E9E] uppercase tracking-widest">Joined</th>
                  <th className="px-6 py-4 text-xs font-bold text-[#9E9E9E] uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CFD8DC]/20">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <Loader2 className="mx-auto h-8 w-8 text-[#006064] animate-spin" />
                      <p className="mt-4 text-[#616161] font-bold">Fetching members...</p>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-[#616161]">
                      No members found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <motion.tr 
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-[#E0F7FA]/20 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-[#E0F7FA] text-[#006064] flex items-center justify-center font-bold border border-[#006064]/10">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#212121]">{user.name}</p>
                            <p className="text-xs text-[#616161]">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          user.role.name === 'ADMIN' ? 'bg-[#004D40] text-white' :
                          user.role.name === 'MANAGER' ? 'bg-[#006064] text-white' :
                          'bg-[#E0F7FA] text-[#006064]'
                        }`}>
                          {user.role.name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {user.isActive ? (
                            <><CheckCircle2 size={14} className="text-[#4DB6AC]" /> <span className="text-xs font-bold text-[#4DB6AC]">Active</span></>
                          ) : (
                            <><XCircle size={14} className="text-red-400" /> <span className="text-xs font-bold text-red-400">Inactive</span></>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-[#616161]">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEditUser(user)}
                            className="p-2 text-[#9E9E9E] hover:text-[#006064] hover:bg-[#E0F7FA] rounded-md transition-all" 
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(user.id)}
                            className="p-2 text-[#9E9E9E] hover:text-red-600 hover:bg-red-50 rounded-md transition-all" 
                            title="Delete"
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

      <EditUserModal
        isOpen={!!editingUser}
        user={editingUser!}
        onClose={() => setEditingUser(null)}
        onSuccess={fetchUsers}
      />
    </div>
  );
}
