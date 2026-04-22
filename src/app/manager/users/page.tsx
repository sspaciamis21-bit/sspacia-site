'use client';

import { useEffect, useState } from 'react';
import { Users as UsersIcon, Eye, EyeOff, Loader2, Mail } from 'lucide-react';
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
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 size={40} className="text-[var(--primary)] animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9E9E] animate-pulse">Scanning Personnel Hub...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 px-4">
      <FadeUp>
        <div className="flex items-center gap-6 mb-10">
          <div className="inline-flex p-4 bg-white border border-[var(--outline-variant)] text-[var(--primary)]">
            <UsersIcon size={24} />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-[#1B1C1C] uppercase tracking-tight italic">Personnel Registry</h1>
            <p className="text-[#616161] font-bold text-[11px] uppercase tracking-widest mt-1 opacity-60">Database of registered network nodes and operators</p>
          </div>
        </div>

        <div className="bg-white border border-[var(--outline-variant)] shadow-sm overflow-hidden rounded-none">
          {users.length === 0 ? (
            <div className="text-center py-24 bg-white">
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#9E9E9E]">No personnel signals identified</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-[var(--outline-variant)] bg-neutral-50/50">
                    <th className="py-6 px-10 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em]">Identity Profile</th>
                    <th className="py-6 px-10 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em]">Communication ID</th>
                    <th className="py-6 px-10 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em]">Access Privilege</th>
                    <th className="py-6 px-10 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em]">Assigned Nodes</th>
                    <th className="py-6 px-10 text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.3em] text-right">System Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 bg-white">
                  {users.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50 transition-all group">
                      <td className="py-10 px-10">
                         <div className="font-bold text-[#1B1C1C] text-[14px] uppercase tracking-tight group-hover:text-[var(--primary)] transition-colors">{item.name}</div>
                         <p className="text-[10px] text-[#9E9E9E] font-bold uppercase mt-1.5 opacity-60 tracking-widest">ID: {item.id}</p>
                      </td>
                      <td className="py-10 px-10">
                        <div className="flex items-center gap-3 font-bold text-[11px] uppercase text-[#616161] tracking-tight group-hover:text-[var(--primary)] transition-colors">
                          <Mail size={12} className="opacity-40" />
                          {item.email}
                        </div>
                      </td>
                      <td className="py-10 px-10">
                        <span className="inline-block px-4 py-1.5 bg-neutral-100 text-[#1B1C1C] rounded-none text-[8px] font-black tracking-[0.3em] uppercase border border-neutral-200">
                          {item.role?.name || 'GUEST_ACCESS'}
                        </span>
                      </td>
                      <td className="py-10 px-10">
                        <div className="flex gap-2 flex-wrap">
                          {item.assignedLocations && item.assignedLocations.length > 0 ? (
                            item.assignedLocations.map((loc) => (
                              <span key={loc.id} className="inline-block px-3 py-1 bg-white text-[var(--primary)] rounded-none text-[8px] font-bold border border-[var(--primary)]/20 uppercase tracking-widest">
                                {loc.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[#9E9E9E] font-bold text-[9px] uppercase opacity-30">—</span>
                          )}
                        </div>
                      </td>
                      <td className="py-10 px-10 text-right">
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-none text-[8px] font-black uppercase tracking-[0.4em] border transition-all ${
                          item.isActive 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-neutral-100 text-neutral-400 border-neutral-200'
                        }`}>
                          <div className={`h-1 w-1 ${item.isActive ? 'bg-emerald-600' : 'bg-neutral-400'}`}></div>
                          {item.isActive ? 'ACTIVE_SIGNAL' : 'OFFLINE_NODE'}
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
