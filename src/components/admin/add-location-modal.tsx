'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

interface City {
  id: number;
  name: string;
}

interface AddLocationModalProps {
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

const selectClass =
  'w-full px-4 py-2.5 bg-[#F8F9FA] border border-[#CFD8DC]/50 rounded-lg text-sm text-[#212121] focus:outline-none focus:ring-4 focus:ring-[#006064]/8 focus:border-[#006064] transition-all appearance-none cursor-pointer';

export function AddLocationModal({ isOpen, onClose, onSuccess }: AddLocationModalProps) {
  const [cities, setCities] = useState<City[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [cityId, setCityId] = useState('');
  const [address, setAddress] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [mapEmbed, setMapEmbed] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState('0');

  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCitiesLoading(true);
    fetch('/api/admin/cities')
      .then((r) => r.json())
      .then((json) => setCities(json.data ?? []))
      .catch(() => toast.error('Failed to load cities'))
      .finally(() => setCitiesLoading(false));
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setSlug('');
      setCityId('');
      setAddress('');
      setMapUrl('');
      setMapEmbed('');
      setPhone('');
      setEmail('');
      setIsActive(true);
      setSortOrder('0');
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

    if (!name || !slug || !cityId) {
      toast.error('Please fill in Name, Slug, and City.');
      return;
    }

    setIsSubmitting(true);
    try {
      const body = {
        name,
        slug,
        cityId: Number(cityId),
        address: address || undefined,
        mapUrl: mapUrl || undefined,
        mapEmbed: mapEmbed || undefined,
        phone: phone || undefined,
        email: email || undefined,
        isActive,
        sortOrder: Number(sortOrder) || 0,
      };

      const response = await fetch('/api/admin/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? 'Failed to create location');

      toast.success(`Location "${name}" added successfully!`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create location');
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
            className="relative flex flex-col w-full max-w-lg bg-white shadow-2xl h-full"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#CFD8DC]/30 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#E0F7FA] text-[#006064]">
                  <MapPin size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#004D40]">Add New Location</h2>
                  <p className="text-xs text-[#9E9E9E]">Create a new SSPACIA location</p>
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
              <form id="add-location-form" onSubmit={handleSubmit} className="space-y-6">

                {/* ── Basic Info ── */}
                <section className="space-y-4">
                  <h3 className="text-xs font-bold text-[#9E9E9E] uppercase tracking-widest border-b border-[#CFD8DC]/30 pb-2">
                    Basic Information
                  </h3>

                  <div>
                    <Label htmlFor="cityId" required>City</Label>
                    <div className="relative">
                      <select
                        id="cityId"
                        value={cityId}
                        onChange={(e) => setCityId(e.target.value)}
                        className={selectClass}
                        required
                      >
                        <option value="">
                          {citiesLoading ? 'Loading cities…' : 'Select a city'}
                        </option>
                        {cities.map((city) => (
                          <option key={city.id} value={city.id}>
                            {city.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9E9E9E] pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="name" required>Location Name</Label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. SSPACIA Hub"
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
                      placeholder="sspacia-hub"
                      className={inputClass}
                      required
                    />
                    <p className="text-[10px] text-[#9E9E9E] mt-1">
                      Auto-generated from name. Must be unique.
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="sortOrder">Sort Order</Label>
                    <input
                      id="sortOrder"
                      type="number"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value)}
                      placeholder="0"
                      className={inputClass}
                    />
                  </div>
                </section>

                {/* ── Contact Details ── */}
                <section className="space-y-4">
                  <h3 className="text-xs font-bold text-[#9E9E9E] uppercase tracking-widest border-b border-[#CFD8DC]/30 pb-2">
                    Contact Details
                  </h3>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <input
                      id="phone"
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. hub@sspacia.com"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Physical Address</Label>
                    <textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Full street address..."
                      rows={3}
                      className={`${inputClass} resize-none`}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="mapUrl">Google Maps URL</Label>
                    <input
                      id="mapUrl"
                      type="url"
                      value={mapUrl}
                      onChange={(e) => setMapUrl(e.target.value)}
                      placeholder="https://maps.google.com/..."
                      className={inputClass}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="mapEmbed">Google Maps Embed HTML</Label>
                    <textarea
                      id="mapEmbed"
                      value={mapEmbed}
                      onChange={(e) => setMapEmbed(e.target.value)}
                      placeholder="<iframe src='...' ></iframe>"
                      rows={3}
                      className={`${inputClass} font-mono text-xs`}
                    />
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
                      <p className="text-[10px] text-[#9E9E9E]">Visible on the main site</p>
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
                form="add-location-form"
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
                    <MapPin size={15} />
                    Add Location
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
