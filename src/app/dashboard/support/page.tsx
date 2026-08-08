"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, Building2, MapPin, Layout, FileText, Upload, X, 
  CheckCircle2, AlertCircle, Image as ImageIcon, Send, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function DashboardSupportPage() {
  const { user } = useAuth();
  
  const [metadata, setMetadata] = useState<{ locations: { id: number, name: string }[], productTypes: { id: number, name: string }[] }>({
    locations: [],
    productTypes: []
  });
  const [formData, setFormData] = useState({
    name: "", organization: "", productTypeId: "", locationId: "", description: "",
    category: "", subCategory: ""
  });
  const subOptionsData = {
    "House Keeping": [
      "Cleaning not done properly (dust, stains, or unclean surfaces)",
      "Washrooms not cleaned or maintained",
      "Trash bins not emptied or overflowing",
      "Floor not mopped or cleaned",
      "Cleaning staff not available or irregular",
      "Bad odor or hygiene issue",
      "Pest problem (insects, cockroaches, etc.)",
      "Other:"
    ],
    "Pantry": [
      "Cleanliness issue (unclean area, smell, overflowing bin, dirty utensils)",
      "Appliance not working (microwave, refrigerator, water dispenser, coffee machine, etc.)",
      "Pantry supplies missing (tea, coffee, sugar, milk, tissue, cups, etc.)",
      "Maintenance issue (electrical socket, lighting, leakage, damaged furniture, etc.)",
      "Hygiene or safety concern (pests, wet floor, food waste, etc.)",
      "Other:"
    ],
    "IT": [
      "Internet not working or slow connection",
      "Wi-Fi not accessible or unstable",
      "System not starting or crashing frequently",
      "Printer / scanner not working",
      "Email or login access issue",
      "Software installation or update required",
      "Network cable or LAN port issue",
      "Projector / display screen not working",
      "Data loss or file access issue",
      "Other:"
    ],
    "Reception": [
      "Reception desk unattended / no staff available",
      "Visitor not attended properly",
      "Phone or intercom not working",
      "Poor behavior or unprofessional conduct",
      "Visitor entry not recorded properly",
      "Waiting area not clean or organized",
      "Lights / air conditioning not working",
      "Signage or display board issue",
      "Delivery or courier not handled properly",
      "Other:"
    ]
  };
  const [filestackUrls, setFilestackUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);

  // Fetch dropdown data on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const response = await fetch("/api/public/support/metadata");
        if (response.ok) {
          const json = await response.json();
          if (json.data) setMetadata(json.data);
        }
      } catch (err) {
        console.error("Failed to fetch support metadata:", err);
        // Suppress toast for a smoother UX
      } finally {
        setIsLoadingMetadata(false);
      }
    };
    fetchMetadata();
  }, []);

  // Pre-fill name from authenticated user
  useEffect(() => {
    if (user?.name) {
      setFormData(prev => ({ ...prev, name: user.name }));
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: value,
      ...(name === "category" ? { subCategory: "" } : {})
    }));
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
        const response = await fetch("/api/user/upload-image", {
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
    
    if (!formData.name || !formData.locationId || !formData.productTypeId || !formData.category || !formData.subCategory || !formData.description) {
      toast.error("Please fill in all required fields including ticket category and sub-category");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const payload = {
        name: formData.name,
        organization: formData.organization,
        productTypeId: formData.productTypeId,
        locationId: formData.locationId,
        category: formData.category,
        subCategory: formData.subCategory,
        description: formData.description,
        userId: user?.id,
        filestackUrls: filestackUrls,
      };

      const response = await fetch("/api/user/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json", 
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setIsSuccess(true);
        toast.success("Ticket raised successfully!");
        setFormData({ 
          name: user?.name || "", 
          organization: "", 
          productTypeId: "", 
          locationId: "", 
          description: "",
          category: "",
          subCategory: ""
        });
        setFilestackUrls([]);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create ticket");
      }
    } catch (error: unknown) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Failed to raise ticket. Please check the connection and try again.";
      toast.error(message);
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
      <div className="flex h-full flex-col items-center justify-center text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mb-6 flex h-24 w-24 items-center justify-center rounded-none bg-green-100 text-green-600 border border-green-200"
        >
          <CheckCircle2 className="h-12 w-12" />
        </motion.div>
        <h1 className="mb-4 text-3xl font-bold text-[#212121]">Ticket Saved!</h1>
        <p className="mb-8 max-w-md text-[#757575]">
          Thank you for reaching out. Our support team has been notified and will get back to you shortly.
        </p>
        <button
          onClick={() => setIsSuccess(false)}
          className="rounded-none bg-[#006064] px-10 py-4 font-bold text-white uppercase tracking-widest text-[11px] shadow-lg transition-transform hover:bg-[#004d40]"
        >
          Raise New Ticket
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      <div className="mb-8 pl-2 flex items-center gap-6">
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="h-20 w-20 bg-[var(--primary)] text-white rounded-none flex items-center justify-center border border-[var(--primary)] shadow-sm group"
        >
          <AlertCircle className="h-8 w-8" />
        </motion.div>
        
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-display font-bold text-[#1B1C1C] uppercase tracking-tight"
          >
            Help <span className="text-[var(--primary)]">Center</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-[#616161] mt-1 font-bold text-[10px] uppercase tracking-widest opacity-50"
          >
            Need help? Fill out the support form below.
          </motion.p>
        </div>
      </div>

      <div className="max-w-4xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative overflow-hidden rounded-none border border-[var(--outline-variant)] bg-[var(--surface-lowest)] p-10 md:p-14 shadow-sm"
        >
          <div className="absolute -right-20 -top-20 h-64 w-64 bg-[var(--primary)]/5 blur-[100px] pointer-events-none group-hover:bg-[var(--primary)]/10 transition-colors" />
          
          <form onSubmit={handleSubmit} className="relative space-y-10">
            <div className="grid gap-10 md:grid-cols-2">
              <motion.div variants={itemVariants} className="space-y-3">
                <label htmlFor="name" className="flex items-center gap-2.5 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">
                  <User className="h-4 w-4 text-[var(--primary)]" />
                  Full Name <span className="text-red-500 font-bold">*</span>
                </label>
                <div className="relative group/field">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className="w-full rounded-none border border-[var(--outline-variant)] bg-[var(--surface-low)]/50 px-5 py-4 outline-none transition-all focus:border-[var(--primary)] focus:bg-white font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/40 text-[14px]"
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-3">
                <label htmlFor="organization" className="flex items-center gap-2.5 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">
                  <Building2 className="h-4 w-4 text-[var(--primary)]" />
                  Organization
                </label>
                <input
                  type="text"
                  id="organization"
                  name="organization"
                  value={formData.organization}
                  onChange={handleInputChange}
                  placeholder="Company Name"
                  className="w-full rounded-none border border-[var(--outline-variant)] bg-[var(--surface-low)]/50 px-5 py-4 outline-none transition-all focus:border-[var(--primary)] focus:bg-white font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/40 text-[14px]"
                />
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-3">
                <label htmlFor="spaceType" className="flex items-center gap-2.5 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">
                  <Layout className="h-4 w-4 text-[var(--primary)]" />
                  Select Space Type <span className="text-red-500 font-bold">*</span>
                </label>
                <div className="relative group/field">
                  <select
                    id="productTypeId"
                    name="productTypeId"
                    required
                    value={formData.productTypeId}
                    onChange={handleInputChange}
                    className="w-full appearance-none rounded-none border border-[var(--outline-variant)] bg-[var(--surface-low)]/50 px-5 py-4 outline-none transition-all focus:border-[var(--primary)] focus:bg-white font-bold text-[#1B1C1C] text-[14px] cursor-pointer"
                  >
                    <option value="" disabled className="font-bold">Select a workspace</option>
                    {metadata.productTypes.map(type => (
                      <option key={type.id} value={type.id.toString()} className="font-bold">{type.name}</option>
                    ))}
                    {isLoadingMetadata && <option disabled className="font-bold">Loading types...</option>}
                  </select>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-3">
                <label htmlFor="location" className="flex items-center gap-2.5 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">
                  <MapPin className="h-4 w-4 text-[var(--primary)]" />
                  Office Location <span className="text-red-500 font-bold">*</span>
                </label>
                <div className="relative group/field">
                  <select
                    id="locationId"
                    name="locationId"
                    required
                    value={formData.locationId}
                    onChange={handleInputChange}
                    className="w-full appearance-none rounded-none border border-[var(--outline-variant)] bg-[var(--surface-low)]/50 px-5 py-4 outline-none transition-all focus:border-[var(--primary)] focus:bg-white font-bold text-[#1B1C1C] text-[14px] cursor-pointer"
                  >
                    <option value="" disabled className="font-bold">Select location</option>
                    {metadata.locations.map(loc => (
                      <option key={loc.id} value={loc.id.toString()} className="font-bold">{loc.name}</option>
                    ))}
                    {isLoadingMetadata && <option disabled className="font-bold">Loading locations...</option>}
                  </select>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-3">
                <label htmlFor="category" className="flex items-center gap-2.5 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">
                  <Layout className="h-4 w-4 text-[var(--primary)]" />
                  Category <span className="text-red-500 font-bold">*</span>
                </label>
                <div className="relative group/field">
                  <select
                    id="category"
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full appearance-none rounded-none border border-[var(--outline-variant)] bg-[var(--surface-low)]/50 px-5 py-4 outline-none transition-all focus:border-[var(--primary)] focus:bg-white font-bold text-[#1B1C1C] text-[14px] cursor-pointer"
                  >
                    <option value="" disabled className="font-bold">Select category</option>
                    <option value="House Keeping" className="font-bold">House Keeping</option>
                    <option value="Pantry" className="font-bold">Pantry</option>
                    <option value="IT" className="font-bold">IT</option>
                    <option value="Reception" className="font-bold">Reception</option>
                    <option value="Other" className="font-bold">Other</option>
                  </select>
                </div>
              </motion.div>

              {(formData.category && formData.category !== "Other") && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  variants={itemVariants} 
                  className="space-y-3 md:col-span-2"
                >
                  <label htmlFor="subCategory" className="flex items-center gap-2.5 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">
                    <AlertCircle className="h-4 w-4 text-[var(--primary)]" />
                    Sub-category <span className="text-red-500 font-bold">*</span>
                  </label>
                  <div className="relative group/field">
                    <select
                      id="subCategory"
                      name="subCategory"
                      required
                      value={formData.subCategory}
                      onChange={handleInputChange}
                      className="w-full appearance-none rounded-none border border-[var(--outline-variant)] bg-[var(--surface-low)]/50 px-5 py-4 outline-none transition-all focus:border-[var(--primary)] focus:bg-white font-bold text-[#1B1C1C] text-[14px] cursor-pointer"
                    >
                      <option value="" disabled className="font-bold">Select specific issue</option>
                      {subOptionsData[formData.category as keyof typeof subOptionsData]?.map((option) => (
                        <option key={option} value={option} className="font-bold">{option}</option>
                      ))}
                    </select>
                  </div>
                </motion.div>
              )}

              {formData.category === "Other" && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  variants={itemVariants} 
                  className="space-y-3 md:col-span-2"
                >
                  <label htmlFor="subCategory" className="flex items-center gap-2.5 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">
                    <AlertCircle className="h-4 w-4 text-[var(--primary)]" />
                    Specify Issue <span className="text-red-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    id="subCategory"
                    name="subCategory"
                    required
                    value={formData.subCategory}
                    onChange={handleInputChange}
                    placeholder="Specify your concern..."
                    className="w-full rounded-none border border-[var(--outline-variant)] bg-[var(--surface-low)]/50 px-5 py-4 outline-none transition-all focus:border-[var(--primary)] focus:bg-white font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/40 text-[14px]"
                  />
                </motion.div>
              )}
            </div>

            <motion.div variants={itemVariants} className="space-y-3">
              <label htmlFor="description" className="flex items-center gap-2.5 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">
                <FileText className="h-4 w-4 text-[var(--primary)]" />
                Description of Issue
              </label>
              <textarea
                id="description"
                name="description"
                rows={5}
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Please describe the anomaly in detail for our technicians..."
                className="w-full rounded-none border border-[var(--outline-variant)] bg-[var(--surface-low)]/50 px-6 py-5 outline-none transition-all focus:border-[var(--primary)] focus:bg-white font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/40 text-[14px] leading-relaxed"
              />
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-5">
              <label className="flex items-center gap-2.5 text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">
                <Upload className="h-4 w-4 text-[var(--primary)]" />
                Upload Files (Max 5MB total)
              </label>
              
              <div 
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-none border border-[var(--outline-variant)] bg-[var(--surface-low)]/30 py-8 transition-all hover:border-[var(--primary)] ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-none bg-[var(--primary)] text-white shadow-sm">
                  {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                </div>
                <p className="text-center text-[10px] font-bold text-[#1B1C1C] uppercase tracking-widest group-hover:text-[var(--primary)] transition-colors">
                  {isUploading ? 'Uploading...' : 'Click to upload files'}
                </p>
                <p className="mt-1 text-center text-[9px] font-bold text-[#9E9E9E] uppercase tracking-tighter opacity-70">
                  Images, Videos, and PDF Reports
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
                    className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4"
                  >
                    {filestackUrls.map((url, index) => (
                      <motion.div
                        key={`${url}-${index}`}
                        layout
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="group relative h-24 overflow-hidden rounded-none border border-[var(--outline-variant)] bg-[var(--surface-low)]/50 group/item"
                      >
                        <div className="flex h-full flex-col items-center justify-center p-3 text-center">
                          <div className="p-2 bg-[var(--primary)] rounded-none mb-1">
                             <ImageIcon className="h-4 w-4 text-white" />
                          </div>
                          <p className="line-clamp-1 text-[8px] font-bold text-[#1B1C1C] uppercase tracking-widest">
                            Asset {index + 1}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          className="absolute right-2 top-2 rounded-none bg-red-500 p-1.5 text-white opacity-0 transition-all group-hover:opacity-100 shadow-md"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div variants={itemVariants} className="flex gap-4 rounded-none bg-amber-500/5 border border-amber-500/20 p-5 text-amber-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed opacity-60">
                Critical Note: Our support team typically responds within <span className="text-amber-700 font-black">2 business hours</span> for priority member reports.
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="pt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative flex items-center justify-center gap-4 overflow-hidden rounded-none bg-[#1B1B1B] hover:bg-black px-12 py-5 text-[10px] font-bold text-white uppercase tracking-[0.2em] shadow-xl transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70 active:scale-[0.98] w-full md:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    Submit Ticket
                    <Send className="h-4 w-4 transition-transform group-hover/btn:translate-x-2 group-hover/btn:-translate-y-2" />
                  </>
                )}
              </button>
            </motion.div>
          </form>
        </motion.div>
      </div>

      <style jsx global>{`
        select {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%231ab0bc'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='3' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 1.25rem center;
          background-size: 1em;
        }
      `}</style>
    </div>
  );
}
