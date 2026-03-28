"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, Building2, MapPin, Layout, FileText, Upload, X, 
  CheckCircle2, AlertCircle, Image as ImageIcon, Send, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { siteConfig } from "../../../config/site";

const spaceTypes = [
  "Flex Desk", "Fixed Desk", "Dedicated Cabin", "Private Cabin",
  "Executive Cabin", "Meeting Room", "Board Room", "Event Room", "Other"
];

const locations = siteConfig.locations.map(loc => `${loc.name}, Ahmedabad`);

// Using Filestack instead of local base64 encoding

export default function RaiseTicketPage() {
  const [formData, setFormData] = useState({
    name: "", organization: "", spaceType: "", location: "", description: "",
  });
  const [filestackUrls, setFilestackUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const removeFile = (index: number) => {
    setFilestackUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (filestackUrls.length + files.length > 5) {
      toast.error("You can only upload up to 5 files.");
      return;
    }

    setIsUploading(true);
    let errorCount = 0;
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);
        const response = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });
        if (response.ok) {
          const result = await response.json();
          urls.push(result.data.url);
        } else {
          errorCount++;
        }
      }
      setFilestackUrls(prev => [...prev, ...urls]);
      if (errorCount > 0) toast.error(`Failed to upload ${errorCount} file(s)`);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("An error occurred during upload.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.location || !formData.spaceType || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const payload = {
        name: formData.name,
        organization: formData.organization,
        spaceType: formData.spaceType,
        location: formData.location,
        description: formData.description,
        filestackUrls: filestackUrls,
      };

      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json", 
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsSuccess(true);
        toast.success("Ticket raised successfully!");
        setFormData({ name: "", organization: "", spaceType: "", location: "", description: "" });
        setFilestackUrls([]);
      } else {
        throw new Error("Failed to create ticket");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to raise ticket. Please check the connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  if (isSuccess) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 text-green-600"
        >
          <CheckCircle2 className="h-12 w-12" />
        </motion.div>
        <h1 className="mb-4 text-3xl font-bold text-[#212121]">Ticket Successfully Raised!</h1>
        <p className="mb-8 max-w-md text-[#757575]">
          Thank you for reaching out. Our support team has been notified and will get back to you shortly.
        </p>
        <button
          onClick={() => setIsSuccess(false)}
          className="rounded-full bg-[#006064] px-8 py-3 font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        >
          Raise Another Ticket
        </button>
      </div>
    );
  }

  return (
    <div className="py-8 md:py-12">
      <div className="mb-12 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 text-4xl font-extrabold tracking-tight text-[#212121] md:text-5xl"
        >
          Raise a <span className="text-[#006064]">Support Ticket</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mx-auto max-w-2xl text-lg text-[#757575]"
        >
          Experiencing an issue or need assistance with your workspace? Fill out the form below and our facility team will resolve it promptly.
        </motion.p>
      </div>

      <div className="mx-auto max-w-4xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative overflow-hidden rounded-3xl border border-[#CFD8DC] bg-white p-6 shadow-2xl md:p-10"
        >
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#E0F7FA]/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-[#E0F7FA]/20 blur-3xl" />

          <form onSubmit={handleSubmit} className="relative space-y-8">
            <div className="grid gap-6 md:grid-cols-2">
              <motion.div variants={itemVariants} className="space-y-2">
                <label htmlFor="name" className="flex items-center gap-2 text-sm font-semibold text-[#424242]">
                  <User className="h-4 w-4 text-[#006064]" />
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  className="w-full rounded-xl border border-[#CFD8DC] bg-[#F8F9FA] px-4 py-3 outline-none transition-all focus:border-[#006064] focus:bg-white focus:ring-2 focus:ring-[#006064]/20"
                />
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-2">
                <label htmlFor="organization" className="flex items-center gap-2 text-sm font-semibold text-[#424242]">
                  <Building2 className="h-4 w-4 text-[#006064]" />
                  Organization
                </label>
                <input
                  type="text"
                  id="organization"
                  name="organization"
                  value={formData.organization}
                  onChange={handleInputChange}
                  placeholder="Company Name"
                  className="w-full rounded-xl border border-[#CFD8DC] bg-[#F8F9FA] px-4 py-3 outline-none transition-all focus:border-[#006064] focus:bg-white focus:ring-2 focus:ring-[#006064]/20"
                />
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-2">
                <label htmlFor="spaceType" className="flex items-center gap-2 text-sm font-semibold text-[#424242]">
                  <Layout className="h-4 w-4 text-[#006064]" />
                  Select Space Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="spaceType"
                  name="spaceType"
                  required
                  value={formData.spaceType}
                  onChange={handleInputChange}
                  className="w-full appearance-none rounded-xl border border-[#CFD8DC] bg-[#F8F9FA] px-4 py-3 outline-none transition-all focus:border-[#006064] focus:bg-white focus:ring-2 focus:ring-[#006064]/20"
                >
                  <option value="" disabled>Select a workspace</option>
                  {spaceTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-2">
                <label htmlFor="location" className="flex items-center gap-2 text-sm font-semibold text-[#424242]">
                  <MapPin className="h-4 w-4 text-[#006064]" />
                  Office Location <span className="text-red-500">*</span>
                </label>
                <select
                  id="location"
                  name="location"
                  required
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full appearance-none rounded-xl border border-[#CFD8DC] bg-[#F8F9FA] px-4 py-3 outline-none transition-all focus:border-[#006064] focus:bg-white focus:ring-2 focus:ring-[#006064]/20"
                >
                  <option value="" disabled>Select location</option>
                  {locations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </motion.div>
            </div>

            <motion.div variants={itemVariants} className="space-y-2">
              <label htmlFor="description" className="flex items-center gap-2 text-sm font-semibold text-[#424242]">
                <FileText className="h-4 w-4 text-[#006064]" />
                Description of Issue <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Please describe the issue in detail..."
                className="w-full rounded-xl border border-[#CFD8DC] bg-[#F8F9FA] px-4 py-3 outline-none transition-all focus:border-[#006064] focus:bg-white focus:ring-2 focus:ring-[#006064]/20"
              />
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-[#424242]">
                <Upload className="h-4 w-4 text-[#006064]" />
                Upload Images or Video (Max 5MB total)
              </label>
              
              <div 
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#CFD8DC] bg-[#F8F9FA] py-10 transition-all hover:border-[#006064] hover:bg-[#E0F7FA]/10 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E0F7FA] text-[#006064] transition-transform group-hover:scale-110">
                  {isUploading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Upload className="h-8 w-8" />}
                </div>
                <p className="text-center font-medium text-[#424242]">
                  {isUploading ? 'Uploading...' : 'Click to upload'}
                </p>
                <p className="mt-1 text-center text-xs text-[#757575]">
                  Supports Images, Videos, and Documents
                </p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  accept="image/*,video/*,application/pdf"
                  className="hidden"
                />
              </div>

              <AnimatePresence>
                {filestackUrls.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4"
                  >
                    {filestackUrls.map((url, index) => (
                      <motion.div
                        key={`${url}-${index}`}
                        layout
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="group relative h-24 overflow-hidden rounded-xl border border-[#CFD8DC] bg-white shadow-sm"
                      >
                        <div className="flex h-full flex-col items-center justify-center p-2 text-center">
                          <ImageIcon className="mb-1 h-6 w-6 text-[#006064]" />
                          <p className="line-clamp-1 text-[10px] font-medium text-[#424242]">
                            Attachment {index + 1}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          className="absolute right-1 top-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div variants={itemVariants} className="flex gap-2 rounded-xl bg-amber-50 p-4 text-amber-800">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-xs">
                Check that all information is correct. Our support team responds typically within 2 hours during business hours (9 AM - 7 PM).
              </p>
            </motion.div>

            <motion.div variants={itemVariants}>
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#006064] py-4 text-lg font-bold text-white shadow-xl shadow-[#006064]/20 transition-all hover:bg-[#004D40] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Raising Ticket...
                  </>
                ) : (
                  <>
                    Raise Ticket
                    <Send className="h-5 w-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </>
                )}
              </button>
            </motion.div>
          </form>
        </motion.div>
      </div>

      <style jsx global>{`
        select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23006064'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1rem center;
          background-size: 1.5em;
        }
      `}</style>
    </div>
  );
}