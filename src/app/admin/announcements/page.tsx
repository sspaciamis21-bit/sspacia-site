"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Plus, Edit2, Trash2, Power, Loader2, CheckCircle2, ArrowUpDown } from "lucide-react";
import { FadeUp } from "@/components/ui/fade-up";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface AnnouncementItem {
  id: number;
  text: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export default function AdminAnnouncementsPage() {
  const { isRole } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AnnouncementItem | null>(null);
  const [text, setText] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/announcements");
      if (res.ok) {
        const json = await res.json();
        setAnnouncements(json.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setText("");
    setIsActive(true);
    setSortOrder(announcements.length + 1);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: AnnouncementItem) => {
    setEditingItem(item);
    setText(item.text);
    setIsActive(item.isActive);
    setSortOrder(item.sortOrder);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setSubmitting(true);
    try {
      if (editingItem) {
        const res = await fetch(`/api/admin/announcements/${editingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, isActive, sortOrder }),
        });
        if (!res.ok) throw new Error("Failed to update announcement");
        toast.success("Top bar announcement label updated!");
      } else {
        const res = await fetch("/api/admin/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, isActive, sortOrder }),
        });
        if (!res.ok) throw new Error("Failed to create announcement");
        toast.success("New top bar announcement label created!");
      }

      setIsModalOpen(false);
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Error saving announcement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (item: AnnouncementItem) => {
    try {
      const res = await fetch(`/api/admin/announcements/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (!res.ok) throw new Error("Failed to toggle status");
      toast.success(`Label ${!item.isActive ? "activated" : "deactivated"}`);
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
      toast.error("Error toggling active status");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this top bar marquee label?")) return;

    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete label");
      toast.success("Announcement label deleted");
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
      toast.error("Error deleting announcement");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 size={40} className="text-[#1ab0bc] animate-spin" />
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#9E9E9E] animate-pulse">Loading Top Bar Announcement Controls...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4">
      <FadeUp>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-6">
            <div className="inline-flex p-4 bg-red-600 text-white">
              <Sparkles size={24} />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-[#1B1C1C] uppercase tracking-tight italic">
                Top Bar Marquee Controls
              </h1>
              <p className="text-[#616161] font-bold text-[11px] uppercase tracking-widest mt-1 opacity-60">
                Super Admin Management for Public Red Moving Announcement Banner Labels
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="bg-red-600 text-white px-6 py-3 text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-all flex items-center gap-2 shadow-md hover:scale-105"
          >
            <Plus size={16} />
            <span>Add Announcement Label</span>
          </button>
        </div>
      </FadeUp>

      {/* ANNOUNCEMENT TABLE */}
      <FadeUp delay={0.1}>
        <div className="bg-white border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-red-50 border-b border-red-100 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-red-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-red-600" />
              <span>Active Marquee Text Labels ({announcements.length})</span>
            </span>
          </div>

          {announcements.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
              No top bar announcement labels found. Click "Add Announcement Label" to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-100 border-b border-gray-200 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                    <th className="p-4">Sort</th>
                    <th className="p-4">Announcement Marquee Text</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {announcements.map((item) => (
                    <tr key={item.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="p-4 font-mono font-bold text-gray-500">#{item.sortOrder}</td>
                      <td className="p-4 font-bold text-gray-900 leading-relaxed max-w-xl">
                        {item.text}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-full border ${
                          item.isActive ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-gray-100 text-gray-500 border-gray-300"
                        }`}>
                          {item.isActive ? "ACTIVE LIVE" : "HIDDEN"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleActive(item)}
                            className={`p-2 border transition-all ${
                              item.isActive ? "text-amber-600 border-amber-200 hover:bg-amber-50" : "text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                            }`}
                            title={item.isActive ? "Deactivate Label" : "Activate Label"}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-2 text-blue-600 border border-blue-200 hover:bg-blue-50 transition-all"
                            title="Edit Text"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 text-rose-600 border border-rose-200 hover:bg-rose-50 transition-all"
                            title="Delete Label"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-gray-200 max-w-lg w-full p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b pb-4 border-gray-100">
              <h3 className="text-xl font-bold font-display uppercase tracking-tight text-gray-900">
                {editingItem ? "Edit Announcement Label" : "Add Announcement Label"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block mb-1">
                  Marquee Announcement Text
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. MEETING ROOM EXCLUSIVE: 50% OFF* on first booking | 25% OFF * on full day booking. •"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full p-3 border border-gray-300 focus:border-red-600 outline-none text-xs font-bold"
                />
              </div>

              <div className="flex items-center gap-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(Number(e.target.value))}
                    className="w-24 px-3 py-2 border border-gray-300 focus:border-red-600 outline-none text-xs font-mono font-bold"
                  />
                </div>

                <div className="pt-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold uppercase text-gray-700">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 accent-red-600"
                    />
                    <span>Active Live Marquee</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-gray-500 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-red-600 text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider shadow-md hover:bg-red-700 transition-all flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Save Label</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
