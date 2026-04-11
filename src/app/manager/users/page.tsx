'use client';

import { useEffect, useState } from 'react';
import { Users as UsersIcon, Eye, EyeOff, Loader, Mail } from 'lucide-react';
import { FadeUp } from '@/components/ui/fade-up';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

interface UserItem {
  id: number;
  name: string;
  email: string;
  role?: { name: string };
  isActive: boolean;
  assignedLocations?: { id: number; name: string }[];
}

export default function ManagerUsersPage() {
  const { user, hasPermission, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      if (!hasPermission('users.create')) {
        toast.error('Unauthorized to view users.');
        router.push('/manager/dashboard');
        return;
      }
      fetchUsers();
    }
  }, [user, authLoading, hasPermission, router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch data');

      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader size={40} className="text-[var(--primary)] animate-spin mb-4" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <FadeUp>
        <div className="flex items-center gap-4 mb-10">
          <div className="inline-flex p-3.5 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
            <UsersIcon size={28} />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-[#1B1C1C] tracking-tight">Users & Team Members</h1>
            <p className="text-[#616161] font-medium text-sm mt-1">View members and staff at your assigned locations</p>
          </div>
        </div>

        <div className="bg-[var(--surface-lowest)] rounded-3xl p-8 border border-[var(--outline-variant)]/50 shadow-sm overflow-hidden">
          {users.length === 0 ? (
            <div className="text-center py-20 text-[#9E9E9E]">
              <div className="inline-flex p-6 rounded-3xl bg-[var(--surface-low)] text-[#9E9E9E] mb-6">
                <UsersIcon size={48} />
              </div>
              <p className="font-display font-bold text-xl text-[#1B1C1C]">No users found</p>
              <p className="text-sm font-medium mt-2">There are no users associated with your assigned locations.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-8 px-8">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-[var(--outline-variant)]/30">
                    <th className="pb-5 px-4 text-[11px] font-bold text-[#9E9E9E] uppercase tracking-widest">Name</th>
                    <th className="pb-5 px-4 text-[11px] font-bold text-[#9E9E9E] uppercase tracking-widest">Email</th>
                    <th className="pb-5 px-4 text-[11px] font-bold text-[#9E9E9E] uppercase tracking-widest">Role</th>
                    <th className="pb-5 px-4 text-[11px] font-bold text-[#9E9E9E] uppercase tracking-widest">Assigned Locations</th>
                    <th className="pb-5 px-4 text-[11px] font-bold text-[#9E9E9E] uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--outline-variant)]/10">
                  {users.map((item) => (
                    <tr key={item.id} className="hover:bg-[var(--surface-low)]/30 transition-colors group">
                      <td className="py-5 px-4 font-bold text-[#1B1C1C] group-hover:text-[var(--primary)] transition-colors">{item.name}</td>
                      <td className="py-5 px-4 text-[#616161]">
                        <div className="flex items-center gap-2 font-medium text-sm">
                          <Mail size={16} className="text-[#9E9E9E]" />
                          {item.email}
                        </div>
                      </td>
                      <td className="py-5 px-4 text-[#616161]">
                        <span className="inline-block px-3 py-1 bg-[var(--surface-low)] text-[var(--primary)] rounded-full text-[10px] font-bold tracking-widest uppercase border border-[var(--primary)]/10">
                          {item.role?.name || 'No Role'}
                        </span>
                      </td>
                      <td className="py-5 px-4">
                        <div className="flex gap-2 flex-wrap">
                          {item.assignedLocations && item.assignedLocations.length > 0 ? (
                            item.assignedLocations.map((loc) => (
                              <span key={loc.id} className="inline-block px-2.5 py-1 bg-[var(--surface-low)] text-[var(--primary)] rounded-lg text-[10px] font-bold border border-[var(--primary)]/10">
                                {loc.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[#9E9E9E] font-medium text-sm">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                          item.isActive 
                            ? 'bg-green-50 text-green-700 border border-green-100' 
                            : 'bg-gray-50 text-gray-700 border border-gray-100'
                        }`}>
                          {item.isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </FadeUp>
    </div>
  );
}
