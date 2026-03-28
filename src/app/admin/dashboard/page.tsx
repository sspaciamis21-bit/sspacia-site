'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { AddProductModal } from '@/components/admin/add-product-modal';
import {
  Users,
  Package,
  MapPin,
  CheckCircle2,
  Loader2,
  TrendingUp,
  Edit2,
  Trash2,
  XCircle,
  Star,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { FadeUp } from '@/components/ui/fade-up';
import { ProductType, SpaceCategory } from '@prisma/client';

// ─── Types ──────────────────────────────────────────────────
interface DashboardStats {
  totalProducts: number;
  totalLocations: number;
  totalUsers: number;
  activeListings: number;
}

interface RecentProduct {
  id: number;
  name: string;
  type: ProductType;
  category: SpaceCategory;
  isActive: boolean;
  isFeatured: boolean;
  location: { name: string };
}

// ─── Display Helpers ────────────────────────────────────────
const TYPE_LABELS: Record<ProductType, string> = {
  FLEX_DESK: 'Flex Desk',
  FIXED_DESK: 'Fixed Desk',
  DEDICATED_CABIN: 'Dedicated Cabin',
  PRIVATE_CABIN: 'Private Cabin',
  EXECUTIVE_CABIN: 'Executive Cabin',
  MEETING_ROOM: 'Meeting Room',
  BOARD_ROOM: 'Board Room',
  EVENT_ROOM: 'Event Room',
};

// ─── Stat Card ───────────────────────────────────────────────
interface StatCardProps {
  name: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  bg: string;
  delay: number;
}

function StatCard({ name, value, icon: Icon, color, bg, delay }: StatCardProps) {
  return (
    <FadeUp delay={delay}>
      <div className="bg-white p-6 rounded-xl border border-[#CFD8DC]/30 shadow-sm hover:shadow-xl hover:shadow-[#006064]/5 transition-all group">
        <div className="flex items-center justify-between mb-4">
          <div
            className={`p-3 rounded-lg ${bg} ${color} transition-transform group-hover:scale-110`}
          >
            <Icon size={24} />
          </div>
        </div>
        <div>
          <p className="text-sm font-bold text-[#616161]">{name}</p>
          <h3 className="text-2xl font-black text-[#004D40] mt-1">{value}</h3>
        </div>
      </div>
    </FadeUp>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchRecentProducts = () => {
    setProductsLoading(true);
    fetch('/api/admin/products')
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setRecentProducts(json.data.slice(0, 5));
      })
      .catch(() => toast.error('Failed to load recent products'))
      .finally(() => setProductsLoading(false));
  };

  useEffect(() => {
    // Fetch stats
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setStats(json.data);
      })
      .catch(() => toast.error('Failed to load stats'))
      .finally(() => setStatsLoading(false));

    // Fetch recent products (last 5)
    fetchRecentProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeactivate = async (id: number, name: string) => {
    if (!confirm(`Deactivate "${name}"?`)) return;
    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      toast.success(`"${name}" deactivated`);
      // refresh
      const r = await fetch('/api/admin/products');
      const updated = await r.json();
      if (updated.data) setRecentProducts(updated.data.slice(0, 5));
    } catch {
      toast.error('Failed to deactivate product');
    }
  };

  const statCards: Omit<StatCardProps, 'delay'>[] = [
    {
      name: 'Total Products',
      value: statsLoading ? '—' : (stats?.totalProducts ?? 0),
      icon: Package,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      name: 'Total Locations',
      value: statsLoading ? '—' : (stats?.totalLocations ?? 0),
      icon: MapPin,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      name: 'Total Users',
      value: statsLoading ? '—' : (stats?.totalUsers ?? 0),
      icon: Users,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      name: 'Active Listings',
      value: statsLoading ? '—' : (stats?.activeListings ?? 0),
      icon: TrendingUp,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <FadeUp>
        <h1 className="text-3xl font-bold text-[#004D40]">Admin Dashboard</h1>
        <p className="text-[#616161] mt-2">
          Welcome back! Here&apos;s a live overview of your workspace.
        </p>
      </FadeUp>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <StatCard key={stat.name} {...stat} delay={i * 0.1} />
        ))}
      </div>

      {/* Bottom Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Products Table */}
        <FadeUp delay={0.4} className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-[#CFD8DC]/30 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-[#CFD8DC]/30 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#004D40]">
                Recent Products
              </h3>
              <a
                href="/admin/products"
                className="text-xs font-bold text-[#006064] hover:underline"
              >
                View all →
              </a>
            </div>

            {productsLoading ? (
              <div className="px-6 py-12 text-center">
                <Loader2 className="mx-auto h-6 w-6 text-[#006064] animate-spin" />
                <p className="mt-3 text-sm text-[#616161] font-bold">
                  Loading products...
                </p>
              </div>
            ) : recentProducts.length === 0 ? (
              <div className="px-6 py-12 text-center text-[#616161] text-sm">
                No products found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#F8F9FA]">
                      <th className="px-6 py-3 text-xs font-bold text-[#9E9E9E] uppercase tracking-widest">
                        Name
                      </th>
                      <th className="px-6 py-3 text-xs font-bold text-[#9E9E9E] uppercase tracking-widest">
                        Type
                      </th>
                      <th className="px-6 py-3 text-xs font-bold text-[#9E9E9E] uppercase tracking-widest">
                        Status
                      </th>
                      <th className="px-6 py-3 text-xs font-bold text-[#9E9E9E] uppercase tracking-widest text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#CFD8DC]/20">
                    {recentProducts.map((product) => (
                      <motion.tr
                        key={product.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-[#E0F7FA]/20 transition-colors"
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-[#212121]">
                              {product.name}
                            </p>
                            {product.isFeatured && (
                              <Star
                                size={11}
                                className="text-amber-500 fill-amber-500"
                              />
                            )}
                          </div>
                          <p className="text-xs text-[#9E9E9E]">
                            {product.location.name}
                          </p>
                        </td>
                        <td className="px-6 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#004D40] text-white uppercase tracking-wider">
                            {TYPE_LABELS[product.type]}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          {product.isActive ? (
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 size={13} className="text-[#4DB6AC]" />
                              <span className="text-xs font-bold text-[#4DB6AC]">
                                Active
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <XCircle size={13} className="text-red-400" />
                              <span className="text-xs font-bold text-red-400">
                                Inactive
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() =>
                                toast.info('Product editor coming soon!')
                              }
                              className="p-1.5 text-[#9E9E9E] hover:text-[#006064] hover:bg-[#E0F7FA] rounded-md transition-all"
                              title="Edit"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() =>
                                handleDeactivate(product.id, product.name)
                              }
                              className="p-1.5 text-[#9E9E9E] hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                              title="Deactivate"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </FadeUp>

        {/* Quick Actions */}
        <FadeUp delay={0.5}>
          <div className="bg-white p-6 rounded-xl border border-[#CFD8DC]/30 shadow-sm h-full">
            <h3 className="text-lg font-bold text-[#004D40] mb-6">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full inline-flex items-center gap-3 px-4 py-3 bg-[#006064] text-white rounded-lg font-bold hover:bg-[#004D40] transition-all shadow-sm shadow-[#006064]/20"
              >
                <Plus size={18} />
                Add New Product
              </button>
              <button
                onClick={() => toast.info('Location creation coming soon!')}
                className="w-full inline-flex items-center gap-3 px-4 py-3 bg-[#F8F9FA] text-[#004D40] border border-[#CFD8DC]/30 rounded-lg font-bold hover:bg-[#E0F7FA] transition-all"
              >
                <MapPin size={18} />
                Add New Location
              </button>
              <a
                href="/admin/users"
                className="w-full inline-flex items-center gap-3 px-4 py-3 bg-[#F8F9FA] text-[#004D40] border border-[#CFD8DC]/30 rounded-lg font-bold hover:bg-[#E0F7FA] transition-all"
              >
                <Users size={18} />
                Manage Members
              </a>
            </div>

            {/* Mini stats */}
            {!statsLoading && stats && (
              <div className="mt-6 pt-6 border-t border-[#CFD8DC]/30 space-y-3">
                <p className="text-xs font-bold text-[#9E9E9E] uppercase tracking-widest">
                  At a glance
                </p>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#616161]">Active products</span>
                  <span className="font-black text-[#004D40]">
                    {stats.activeListings}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#616161]">Total products</span>
                  <span className="font-black text-[#004D40]">
                    {stats.totalProducts}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#616161]">Locations</span>
                  <span className="font-black text-[#004D40]">
                    {stats.totalLocations}
                  </span>
                </div>
              </div>
            )}
          </div>
        </FadeUp>
      </div>

      <AddProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchRecentProducts}
      />
    </div>
  );
}
