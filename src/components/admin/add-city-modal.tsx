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
      toast.error('Required hub parameters missing.');
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
      if (!response.ok) throw new Error(json.error ?? 'Hub establishment failed');

      toast.success(`Hub established: ${name}`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'System failed to establish hub');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-10">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative flex flex-col w-full max-w-2xl bg-white rounded-none border border-white/10 shadow-2xl overflow-hidden max-h-[90vh]"
          >
             {/* Industrial Accents */}
             <div className="absolute top-0 left-0 w-full h-1 bg-[var(--primary)]" />
             
            {/* Header */}
            <div className="flex items-center justify-between px-10 py-8 border-b border-[var(--outline-variant)]/20 flex-shrink-0 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white text-[var(--primary)] border border-[var(--outline-variant)]/40 shadow-xl">
                  <Map size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-display font-black text-[#1B1C1C] tracking-tighter uppercase">Establish Hub</h2>
                  <p className="text-[10px] text-[#616161] font-bold uppercase tracking-[0.3em] mt-1 opacity-60">Initializing metropolitan vertex</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-[#9E9E9E] hover:text-[#1B1B1B] hover:bg-neutral-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable form body */}
            <div ref={bodyRef} className="flex-1 overflow-y-auto px-10 py-10 space-y-12 custom-scrollbar">
              <form id="add-city-form" onSubmit={handleSubmit} className="space-y-12">

                {/* ── Basic Info ── */}
                <section className="space-y-8">
                  <div className="flex items-center gap-4 border-b border-[var(--outline-variant)]/20 pb-4">
                     <span className="text-[11px] font-black text-[#1B1C1C] uppercase tracking-[0.4em]">Metro Registry</span>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label htmlFor="name" required>Hub Identity (City)</Label>
                      <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="CITY_NAME"
                        className={`${inputClass} bg-neutral-50/50 uppercase font-bold tracking-wider`}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                       <Label htmlFor="slug" required>Registry Slug</Label>
                       <input
                        id="slug"
                        type="text"
                        value={slug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        placeholder="slug-path"
                        className={`${inputClass} bg-neutral-50/50 font-bold tracking-wider text-[#9E9E9E]`}
                        required
                      />
                    </div>
                  </div>

                  <div 
                    onClick={() => setIsActive(!isActive)}
                    className="flex items-center justify-between p-6 bg-neutral-50 border border-[var(--outline-variant)]/40 cursor-pointer group hover:border-[var(--primary)]/60 transition-all"
                  >
                    <div className="flex items-center gap-4">
                       <div className={`h-3 w-3 ${isActive ? 'bg-[#4DB6AC]' : 'bg-red-400'} shadow-[0_0_8px_currentColor]`} />
                       <div>
                         <p className="text-[11px] font-black text-[#1B1C1C] uppercase tracking-widest">
                           Hub Link Status: {isActive ? 'BROADCASTING' : 'OFFLINE'}
                         </p>
                         <p className="text-[9px] text-[#616161] font-bold uppercase tracking-widest mt-1 opacity-60">
                           {isActive ? 'Authorized for node deployment' : 'Registry access denied'}
                         </p>
                       </div>
                    </div>
                    <div className={`w-12 h-6 rounded-none p-1 transition-colors ${isActive ? 'bg-[var(--primary)]' : 'bg-neutral-300'}`}>
                       <div className={`w-4 h-4 bg-white transition-transform shadow-sm ${isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                    </div>
                  </div>
                </section>
              </form>
            </div>

            {/* Sticky Footer */}
            <div className="flex items-center justify-end gap-0 px-0 py-0 border-t border-[var(--outline-variant)]/20 bg-neutral-50 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 py-6 text-[10px] font-black text-[#616161] uppercase tracking-[0.3em] hover:bg-neutral-100 transition-all border-r border-[var(--outline-variant)]/20 disabled:opacity-50"
              >
                Abort
              </button>
              <button
                type="submit"
                form="add-city-form"
                disabled={isSubmitting}
                className="flex-[2] inline-flex items-center justify-center gap-3 py-6 bg-[var(--primary)] text-white font-black text-[10px] uppercase tracking-[0.3em] hover:bg-neutral-900 transition-all disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Linking Vertex…
                  </>
                ) : (
                  <>
                    <Map size={16} />
                    Establish Hub
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
