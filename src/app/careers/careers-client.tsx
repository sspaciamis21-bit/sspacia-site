'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Users,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Search,
  Building2,
  FileCheck,
  X,
  Loader2,
  Calendar,
  GraduationCap,
  Clock,
  UserCheck,
  Share2,
  HeartHandshake,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface JobPosition {
  id: number;
  title: string;
  openings: string;
  gender: string;
  description: string;
  location: string;
  isActive: boolean;
  sortOrder: number;
}

const EXPERIENCE_OPTIONS = [
  'Fresher',
  '6 Months',
  '1 Year',
  '2 Years',
  '3 Years',
  '5 Years',
  'More than 5 Years',
  'Other / Custom',
];

export function CareersClient({ initialPositions }: { initialPositions: JobPosition[] }) {
  const [positions, setPositions] = useState<JobPosition[]>(initialPositions);
  const [filteredPositions, setFilteredPositions] = useState<JobPosition[]>(initialPositions);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGender, setSelectedGender] = useState('ALL');

  // Application Modal State
  const [selectedJob, setSelectedJob] = useState<JobPosition | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 4-Second Success Popup State
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successCountdown, setSuccessCountdown] = useState(4);
  const [submittedCandidateName, setSubmittedCandidateName] = useState('');
  const [submittedJobTitle, setSubmittedJobTitle] = useState('');

  // Form Fields
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobileNo: '',
    age: '',
    gender: 'Male',
    qualification: '',
    experience: 'Fresher',
    customExperience: '',
    address: '',
  });

  // 4-Second Auto-Closing Timer for Success Popup
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showSuccessPopup && successCountdown > 0) {
      timer = setInterval(() => {
        setSuccessCountdown((prev) => prev - 1);
      }, 1000);
    } else if (showSuccessPopup && successCountdown === 0) {
      setShowSuccessPopup(false);
      setIsApplyModalOpen(false);
      setSelectedJob(null);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showSuccessPopup, successCountdown]);

  // Filter positions when search or gender changes
  useEffect(() => {
    let list = positions.filter((p) => p.isActive);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.openings.toLowerCase().includes(q)
      );
    }

    if (selectedGender !== 'ALL') {
      list = list.filter((p) => p.gender.toLowerCase().includes(selectedGender.toLowerCase()));
    }

    setFilteredPositions(list);
  }, [searchQuery, selectedGender, positions]);

  const handleOpenApply = (job: JobPosition) => {
    setSelectedJob(job);
    setShowSuccessPopup(false);
    setFormData({
      fullName: '',
      email: '',
      mobileNo: '',
      age: '',
      gender: 'Male',
      qualification: '',
      experience: 'Fresher',
      customExperience: '',
      address: '',
    });
    setIsApplyModalOpen(true);
  };

  const handleCloseApply = () => {
    if (isSubmitting) return;
    setIsApplyModalOpen(false);
    setSelectedJob(null);
    setShowSuccessPopup(false);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      toast.error('Please enter your Full Name');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('Please enter your Email Address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.error('Please enter a valid Email Address');
      return;
    }

    const cleanMobile = formData.mobileNo.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      toast.error('Please enter a valid 10-digit Mobile Number');
      return;
    }

    const numAge = Number(formData.age);
    if (!formData.age || isNaN(numAge) || numAge < 16 || numAge > 75) {
      toast.error('Please enter a valid Age (16 to 75 years)');
      return;
    }

    if (!formData.gender) {
      toast.error('Please select your Gender');
      return;
    }

    if (!formData.qualification.trim()) {
      toast.error('Please enter your Educational Qualification');
      return;
    }

    let finalExp = formData.experience;
    if (formData.experience === 'Other / Custom') {
      if (!formData.customExperience.trim()) {
        toast.error('Please enter your custom Experience details');
        return;
      }
      finalExp = formData.customExperience.trim();
    }

    if (!selectedJob) {
      toast.error('Please select a position to apply for');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/careers/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobPositionId: selectedJob.id,
          appliedPosition: selectedJob.title,
          fullName: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          mobileNo: cleanMobile,
          age: numAge,
          gender: formData.gender,
          qualification: formData.qualification.trim(),
          experience: finalExp,
          address: formData.address.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      setSubmittedCandidateName(formData.fullName.trim());
      setSubmittedJobTitle(selectedJob.title);
      setShowSuccessPopup(true);
      setSuccessCountdown(4);
      toast.success('Application submitted successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalOpeningsCount = positions
    .filter((p) => p.isActive)
    .reduce((acc, curr) => {
      const match = curr.openings.match(/\d+/);
      return acc + (match ? parseInt(match[0], 10) : 1);
    }, 0);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1E293B]">
      {/* ── LEAN & SLEEK HERO BANNER ────────────────────────────── */}
      <section className="relative bg-gradient-to-r from-[#00363A] via-[#006064] to-[#00838F] text-white py-8 md:py-10 px-4 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-[#80DEEA] text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>{positions.filter((p) => p.isActive).length} Open Positions ({totalOpeningsCount} Vacancies)</span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
              We’re Hiring at SSPACIA!
            </h1>

            <p className="text-xs sm:text-sm text-[#E0F7FA] max-w-xl leading-relaxed">
              Join the SSPACIA team at <strong>CG Road, Ahmedabad</strong>. We are seeking energetic, talented & communication-driven professionals.
            </p>
          </div>

          {/* Compact HR Contact Pill */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs shrink-0">
            <a
              href="mailto:hr.ssinfrazone@gmail.com"
              className="flex items-center gap-2 bg-black/25 hover:bg-black/40 px-3.5 py-2 rounded-xl border border-white/15 text-white transition-all shadow-xs"
            >
              <Mail className="w-3.5 h-3.5 text-[#80DEEA]" />
              <span className="font-mono font-medium">hr.ssinfrazone@gmail.com</span>
            </a>

            <a
              href="tel:+919213005428"
              className="flex items-center gap-2 bg-[#004D40] hover:bg-[#00363A] px-3.5 py-2 rounded-xl border border-[#80DEEA]/30 text-white font-bold transition-all shadow-xs"
            >
              <Phone className="w-3.5 h-3.5 text-[#80DEEA]" />
              <span>HR: +91 92130 05428</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── FILTER & SEARCH BAR ───────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search job title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#006064] focus:bg-white"
            />
          </div>

          {/* Gender Filter Tabs */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {[
              { id: 'ALL', label: 'All Openings' },
              { id: 'Female', label: 'Female' },
              { id: 'Male', label: 'Male' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedGender(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  selectedGender === tab.id
                    ? 'bg-[#006064] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── JOB POSITIONS GRID ─────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Available Positions</h2>
            <p className="text-xs text-slate-500">Explore open roles and apply online in 1 minute</p>
          </div>
          <span className="text-xs font-bold text-[#006064] bg-[#E0F2F1] px-3 py-1 rounded-full border border-[#006064]/20">
            {filteredPositions.length} Positions Available
          </span>
        </div>

        {filteredPositions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center shadow-xs">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No positions matched your search</h3>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedGender('ALL');
              }}
              className="mt-3 px-4 py-1.5 bg-[#006064] text-white text-xs font-bold rounded-lg hover:bg-[#004D40] transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPositions.map((job, idx) => {
              const isFemaleOnly = job.gender.toLowerCase() === 'female';
              const isMaleOnly = job.gender.toLowerCase() === 'male';

              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: idx * 0.03 }}
                  className="bg-white rounded-xl border border-slate-200 hover:border-[#006064]/50 hover:shadow-md transition-all p-4 flex flex-col justify-between group"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[#E0F2F1] text-[#006064] flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-[#006064] group-hover:text-white transition-colors">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#006064] transition-colors">
                            {job.title}
                          </h3>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {job.location || 'CG Road, Ahmedabad'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-2 my-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        ⚡ {job.openings}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          isFemaleOnly
                            ? 'bg-pink-50 text-pink-700 border-pink-200'
                            : isMaleOnly
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        👤 {job.gender}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 line-clamp-2 my-2 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {job.description}
                    </p>
                  </div>

                  {/* Apply Button */}
                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-3 mt-2">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Full-time • Immediate Joining
                    </span>
                    <button
                      onClick={() => handleOpenApply(job)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#006064] text-white text-xs font-bold rounded-lg hover:bg-[#004D40] active:scale-98 transition-all shadow-xs"
                    >
                      <span>Apply Now</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── APPLICATION MODAL & FULL-SCREEN BACKDROP BLUR ───────── */}
      <AnimatePresence>
        {isApplyModalOpen && selectedJob && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto relative"
            >
              {/* Modal Header */}
              <div className="bg-[#006064] text-white px-6 py-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#80DEEA]">
                    OFFICIAL APPLICATION FORM
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">
                    Apply for {selectedJob.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleCloseApply}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmitApplication} className="p-6 sm:p-8 space-y-4 text-xs">
                {/* Position Summary Banner */}
                <div className="bg-[#E0F2F1] border border-[#006064]/20 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="font-bold text-[#006064] text-sm">
                    {selectedJob.title}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-700">
                    <span className="bg-white px-2.5 py-0.5 rounded-full border border-[#006064]/20 font-bold">
                      {selectedJob.openings}
                    </span>
                    <span className="bg-white px-2.5 py-0.5 rounded-full border border-[#006064]/20 font-bold">
                      {selectedJob.gender}
                    </span>
                  </div>
                </div>

                {/* 1. Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Full Name <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#006064] focus:bg-white transition-all shadow-2xs"
                  />
                </div>

                {/* 2. Email Address & 3. Mobile Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Email Address <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#006064] focus:bg-white transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Mobile Number <span className="text-red-500 font-bold">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-xs font-bold text-slate-500 select-none">
                        +91
                      </span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={formData.mobileNo}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            mobileNo: e.target.value.replace(/\D/g, ''),
                          })
                        }
                        className="w-full pl-12 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 font-mono tracking-wider focus:outline-hidden focus:ring-2 focus:ring-[#006064] focus:bg-white transition-all shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Age & 5. Gender */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Age <span className="text-red-500 font-bold">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={16}
                      max={75}
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#006064] focus:bg-white transition-all shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Gender <span className="text-red-500 font-bold">*</span>
                    </label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#006064] focus:bg-white transition-all shadow-2xs cursor-pointer"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                {/* 6. Educational Qualification */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Educational Qualification <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#006064] focus:bg-white transition-all shadow-2xs"
                  />
                </div>

                {/* 7. Experience Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Experience <span className="text-red-500 font-bold">*</span>
                  </label>
                  <select
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#006064] focus:bg-white transition-all shadow-2xs cursor-pointer"
                  >
                    {EXPERIENCE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>

                  {/* Custom Experience Input if "Other / Custom" selected */}
                  {formData.experience === 'Other / Custom' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-2"
                    >
                      <input
                        type="text"
                        required
                        value={formData.customExperience}
                        onChange={(e) => setFormData({ ...formData, customExperience: e.target.value })}
                        className="w-full px-3.5 py-2 bg-amber-50 border border-amber-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#006064] focus:bg-white transition-all shadow-2xs"
                      />
                    </motion.div>
                  )}
                </div>

                {/* 8. Address / Current Location (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Address / Current Location <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#006064] focus:bg-white transition-all shadow-2xs resize-none"
                  />
                </div>

                {/* Submit Actions */}
                <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseApply}
                    className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center justify-center gap-2 px-7 py-2.5 bg-[#006064] text-white text-xs font-bold rounded-xl hover:bg-[#004D40] disabled:opacity-50 transition-all shadow-md active:scale-98"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting Application...</span>
                      </>
                    ) : (
                      <>
                        <FileCheck className="w-4 h-4" />
                        <span>Submit Application</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 4-SECOND SUCCESS POPUP MODAL ────────────────────────── */}
      <AnimatePresence>
        {showSuccessPopup && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-emerald-100 space-y-5 relative overflow-hidden"
            >
              {/* Top Progress bar for 4-second auto-close */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100">
                <motion.div
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 4, ease: 'linear' }}
                  className="h-full bg-emerald-500"
                />
              </div>

              {/* Success Badge */}
              <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-11 h-11" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900">
                  Thank You for Your Response!
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                  Hello <strong className="text-slate-900">{submittedCandidateName}</strong>, your application for{' '}
                  <strong className="text-[#006064]">{submittedJobTitle}</strong> has been received by SSPACIA HR.
                </p>
              </div>

              <div className="bg-[#F0FDF4] border border-emerald-200/80 rounded-2xl p-4 text-xs text-slate-700 text-left space-y-1.5">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Next Steps:</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Our HR team will review your application details. Shortlisted candidates will be contacted on mobile / WhatsApp shortly.
                </p>
              </div>

              <div className="pt-1 flex items-center justify-between text-xs text-slate-400">
                <span>Auto closing in <strong>{successCountdown}s</strong>...</span>
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessPopup(false);
                    setIsApplyModalOpen(false);
                    setSelectedJob(null);
                  }}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs transition-colors"
                >
                  Close Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
