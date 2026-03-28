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
      if (!hasPermission('manage_users') && !hasPermission('create_user')) {
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
      const response = await fetch('/api/manager/dashboard', {
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
        <Loader size={48} className="text-[#006064] animate-spin mb-4" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <FadeUp>
        <div className="flex items-center gap-3 mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-[#006064]/10">
            <UsersIcon size={32} className="text-[#006064]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#004D40]">Users & Team Members</h1>
            <p className="text-[#616161]">View members and staff at your assigned locations</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-[#E0E0E0] shadow-sm">
          {users.length === 0 ? (
            <div className="text-center py-12 text-[#9E9E9E]">
              <UsersIcon size={48} className="mx-auto mb-4 opacity-50" />
              <p className="font-semibold text-lg">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#E0E0E0]">
                    <th className="p-4 text-sm font-semibold text-[#616161] uppercase tracking-wider">Name</th>
                    <th className="p-4 text-sm font-semibold text-[#616161] uppercase tracking-wider">Email</th>
                    <th className="p-4 text-sm font-semibold text-[#616161] uppercase tracking-wider">Role</th>
                    <th className="p-4 text-sm font-semibold text-[#616161] uppercase tracking-wider">Assigned Locations</th>
                    <th className="p-4 text-sm font-semibold text-[#616161] uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {users.map((item) => (
                    <tr key={item.id} className="hover:bg-[#F8F9FA] transition-colors">
                      <td className="p-4 font-bold text-[#004D40]">{item.name}</td>
                      <td className="p-4 text-[#616161]">
                        <div className="flex items-center gap-2 font-medium">
                          <Mail size={16} className="text-[#9E9E9E]" />
                          {item.email}
                        </div>
                      </td>
                      <td className="p-4 text-[#616161]">
                        <span className="inline-block px-3 py-1 bg-[#F3E5F5] text-[#6A1B9A] rounded-full text-xs font-bold tracking-wider">
                          {item.role?.name || 'No Role'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 flex-wrap">
                          {item.assignedLocations && item.assignedLocations.length > 0 ? (
                            item.assignedLocations.map((loc) => (
                              <span key={loc.id} className="inline-block px-2.5 py-1 bg-[#E0F2F1] text-[#00695C] rounded-lg text-xs font-bold border border-[#00695C]/20">
                                {loc.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-[#9E9E9E] font-medium">—</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          item.isActive 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {item.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
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
