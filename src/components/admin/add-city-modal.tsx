'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Map, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface AddCityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const toSlug = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-bold text-[#616161] uppercase tracking-widest mb-1.5">
      {children} {required && <span className="text-red-500">*</span>}
    </label>
  );
}

const inputClass =
  'w-full px-4 py-2.5 bg-[#F8F9FA] border border-[#CFD8DC]/50 rounded-lg text-sm text-[#212121] placeholder:text-[#9E9E9E] focus:outline-none focus:ring-4 focus:ring-[#006064]/8 focus:border-[#006064] transition-all';

export function AddCityModal({ isOpen, onClose, onSuccess }: AddCityModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isActive, setIsActive] = useState(true);

  const bodyRef = useRef<HTMLDivElement>(null);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setSlug('');
      setIsActive(true);
      setSlugManuallyEdited(false);
    }
  }, [isOpen]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugManuallyEdited) {
      setSlug(toSlug(val));
    }
  };

  const handleSlugChange = (val: string) => {
    setSlugManuallyEdited(true);
    setSlug(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !slug) {
      toast.error('Please fill in Name and Slug.');
      return;
    }

    setIsSubmitting(true);
    try {
      const body = {
        name,
        slug,
        isActive,
      };

      const response = await fetch('/api/admin/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? 'Failed to create city');

      toast.success(`City "${name}" added successfully!`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create city');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Slide-over panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative flex flex-col w-full max-w-md bg-white shadow-2xl h-full"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#CFD8DC]/30 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#E0F7FA] text-[#006064]">
                  <Map size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#004D40]">Add New City</h2>
                  <p className="text-xs text-[#9E9E9E]">Create a new city for locations</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-[#9E9E9E] hover:text-[#212121] hover:bg-[#F8F9FA] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable form body */}
            <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <form id="add-city-form" onSubmit={handleSubmit} className="space-y-6">

                {/* ── Basic Info ── */}
                <section className="space-y-4">
                  <h3 className="text-xs font-bold text-[#9E9E9E] uppercase tracking-widest border-b border-[#CFD8DC]/30 pb-2">
                    City Information
                  </h3>

                  <div>
                    <Label htmlFor="name" required>City Name</Label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. New Delhi"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug" required>URL Slug</Label>
                    <input
                      id="slug"
                      type="text"
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="new-delhi"
                      className={inputClass}
                      required
                    />
                    <p className="text-[10px] text-[#9E9E9E] mt-1">
                      Auto-generated from name. Must be unique.
                    </p>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer group pt-2">
                    <div
                      onClick={() => setIsActive((v) => !v)}
                      className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${isActive ? 'bg-[#006064]' : 'bg-[#CFD8DC]'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-1'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#212121]">Active</p>
                      <p className="text-[10px] text-[#9E9E9E]">Available for new locations</p>
                    </div>
                  </label>
                </section>
              </form>
            </div>

            {/* Sticky Footer */}
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
                form="add-city-form"
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
                    <Map size={15} />
                    Add City
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
