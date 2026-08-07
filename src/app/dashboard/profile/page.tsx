"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  User, Mail, Phone, Briefcase, Building2, MapPin, 
  Save, Loader2, CheckCircle2, ShieldCheck, Heart
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    designation: "",
    companyName: "",
    companyStreet: "",
    companyCity: "",
    companyState: "",
    companyZip: "",
    contactNumber: ""
  });

  // Sync with user context
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        designation: user.designation || "",
        companyName: user.companyName || "",
        companyStreet: user.companyStreet || "",
        companyCity: user.companyCity || "",
        companyState: user.companyState || "",
        companyZip: user.companyZip || "",
        contactNumber: user.contactNumber || ""
      });
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to update profile");
      
      toast.success("Profile updated successfully!");
      await refreshUser();
    } catch {
      toast.error("Could not save profile changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Header Section */}
      <div className="mb-12 pl-2 flex items-center gap-6">
        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           className="relative inline-block"
        >
          <div className="h-24 w-24 bg-[var(--primary)]/5 rounded-none flex items-center justify-center border border-[var(--primary)]/10 mb-4 overflow-hidden group">
             <User className="h-10 w-10 text-[var(--primary)] group-hover:scale-105 transition-transform duration-500" />
          </div>

        </motion.div>
        
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold text-[#1B1C1C] uppercase tracking-tight"
          >
            My <span className="text-[var(--primary)]">Profile</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-[#616161] mt-2 font-bold text-[10px] uppercase tracking-[0.2em] opacity-50"
          >
            Edit your profile details and organization information below.
          </motion.p>
        </div>
      </div>

      <motion.form 
        onSubmit={handleProfileSubmit}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-3 gap-10"
      >
        {/* Left Column: Core Identity */}
        <div className="lg:col-span-2 space-y-10">
            <motion.div variants={itemVariants} className="bg-[var(--surface-lowest)] rounded-none p-10 md:p-12 border border-[var(--outline-variant)] shadow-sm relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--primary)]/5 blur-[100px] -mr-16 -mt-16 transition-colors" />
               <h2 className="text-xl font-display font-bold text-[#1B1C1C] mb-10 flex items-center gap-4 uppercase tracking-tight">
                  <div className="p-2 bg-[var(--primary)]/5 border border-[var(--primary)]/10 text-[var(--primary)]">
                    <User size={18} />
                  </div>
                  Personal Information
               </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2.5">
                     <label className="text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.1em] ml-1">Full Name</label>
                     <div className="relative group/field">
                       <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E] group-focus-within/field:text-[var(--primary)] transition-colors" />
                       <input name="name" type="text" value={formData.name} onChange={handleInputChange} className="w-full pl-14 pr-5 py-4 rounded-none border border-[var(--outline-variant)] focus:border-[var(--primary)] outline-none text-[14px] transition-all bg-[var(--surface-low)]/50 font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/30" placeholder="E.g., John Doe" />
                     </div>
                  </div>

                  <div className="space-y-2.5 opacity-60">
                     <label className="text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.1em] ml-1">Email Address</label>
                     <div className="relative">
                       <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E]" />
                       <input disabled type="email" value={formData.email} className="w-full pl-14 pr-5 py-4 rounded-none border border-[var(--outline-variant)] outline-none text-[14px] bg-[var(--surface-low)]/30 font-bold text-[#1B1C1C] cursor-not-allowed" />
                     </div>
                  </div>

                  <div className="space-y-2.5">
                     <label className="text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.1em] ml-1">Phone Number</label>
                     <div className="relative group/field">
                       <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E] group-focus-within/field:text-[var(--primary)] transition-colors" />
                       <input name="phone" required type="tel" value={formData.phone} onChange={handleInputChange} className="w-full pl-14 pr-5 py-4 rounded-none border border-[var(--outline-variant)] focus:border-[var(--primary)] outline-none text-[14px] transition-all bg-[var(--surface-low)]/50 font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/30" placeholder="+91 90000 00000" />
                     </div>
                  </div>

                  <div className="space-y-2.5">
                     <label className="text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.1em] ml-1">Designation</label>
                     <div className="relative group/field">
                       <Briefcase className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E] group-focus-within/field:text-[var(--primary)] transition-colors" />
                       <input name="designation" required type="text" value={formData.designation} onChange={handleInputChange} className="w-full pl-14 pr-5 py-4 rounded-none border border-[var(--outline-variant)] focus:border-[var(--primary)] outline-none text-[14px] transition-all bg-[var(--surface-low)]/50 font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/30" placeholder="E.g., CEO" />
                     </div>
                  </div>

                  <div className="space-y-2.5 md:col-span-2">
                     <label className="text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.1em] ml-1">Alternative Contact (Optional)</label>
                     <div className="relative group/field">
                       <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E] group-focus-within/field:text-[var(--primary)] transition-colors" />
                       <input name="contactNumber" type="tel" value={formData.contactNumber} onChange={handleInputChange} className="w-full pl-14 pr-5 py-4 rounded-none border border-[var(--outline-variant)] focus:border-[var(--primary)] outline-none text-[14px] transition-all bg-[var(--surface-low)]/50 font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/30" placeholder="+91 80000 00000" />
                     </div>
                  </div>
              </div>
           </motion.div>

            <motion.div variants={itemVariants} className="bg-[var(--surface-lowest)] rounded-none p-10 md:p-12 border border-[var(--outline-variant)] shadow-sm relative overflow-hidden group">
               <h2 className="text-xl font-display font-bold text-[#1B1C1C] mb-10 flex items-center gap-4 uppercase tracking-tight">
                  <div className="p-2 bg-[var(--primary)]/5 border border-[var(--primary)]/10 text-[var(--primary)]">
                    <Building2 size={18} />
                  </div>
                  Company Details
               </h2>

              <div className="space-y-8">
                 <div className="space-y-2.5">
                     <label className="text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.1em] ml-1">Company Name</label>
                     <div className="relative group/field">
                       <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E] group-focus-within/field:text-[var(--primary)] transition-colors" />
                       <input name="companyName" required type="text" value={formData.companyName} onChange={handleInputChange} className="w-full pl-14 pr-5 py-4 rounded-none border border-[var(--outline-variant)] focus:border-[var(--primary)] outline-none text-[14px] transition-all bg-[var(--surface-low)]/50 font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/30" placeholder="Acme Interactive Pvt Ltd" />
                     </div>
                 </div>

                 <div className="space-y-2.5">
                     <label className="text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.1em] ml-1">Address</label>
                     <div className="relative group/field">
                       <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E] group-focus-within/field:text-[var(--primary)] transition-colors" />
                       <input name="companyStreet" type="text" value={formData.companyStreet} onChange={handleInputChange} className="w-full pl-14 pr-5 py-4 rounded-none border border-[var(--outline-variant)] focus:border-[var(--primary)] outline-none text-[14px] transition-all bg-[var(--surface-low)]/50 font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/30" placeholder="101, Business Park" />
                     </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2.5">
                       <label className="text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.1em] ml-1">City</label>
                       <input name="companyCity" type="text" value={formData.companyCity} onChange={handleInputChange} className="w-full px-5 py-4 rounded-none border border-[var(--outline-variant)] focus:border-[var(--primary)] outline-none text-[14px] transition-all bg-[var(--surface-low)]/50 font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/30" placeholder="City" />
                    </div>
                    <div className="space-y-2.5">
                       <label className="text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.1em] ml-1">State</label>
                       <input name="companyState" type="text" value={formData.companyState} onChange={handleInputChange} className="w-full px-5 py-4 rounded-none border border-[var(--outline-variant)] focus:border-[var(--primary)] outline-none text-[14px] transition-all bg-[var(--surface-low)]/50 font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/30" placeholder="State" />
                    </div>
                    <div className="space-y-2.5">
                       <label className="text-[9px] font-bold text-[#9E9E9E] uppercase tracking-[0.1em] ml-1">Postal Code</label>
                       <input name="companyZip" type="text" value={formData.companyZip} onChange={handleInputChange} className="w-full px-5 py-4 rounded-none border border-[var(--outline-variant)] focus:border-[var(--primary)] outline-none text-[14px] transition-all bg-[var(--surface-low)]/50 font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/30" placeholder="380001" />
                    </div>
                 </div>
              </div>
           </motion.div>
        </div>

        {/* Right Column: Actions & Meta */}
        <div className="space-y-10">
            <motion.div variants={itemVariants} className="bg-[var(--primary)] text-white rounded-none p-10 md:p-12 shadow-xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 blur-[80px] -mr-16 -mt-16 group-hover:bg-white/20 transition-all duration-700" />
               <div className="relative z-10 space-y-8">
                  <h2 className="text-xl font-display font-bold uppercase tracking-widest flex items-center gap-3">
                    <Save size={22} className="text-white/80" />
                    Actions
                  </h2>
                  <p className="text-white/60 text-[11px] font-medium leading-relaxed uppercase tracking-widest">Please ensure all changes are reviewed for accuracy.</p>
                  
                  <button 
                    disabled={isSaving}
                    type="submit"
                    className="w-full bg-[#1B1B1B] text-white rounded-none font-bold py-5 text-[10px] uppercase tracking-[0.3em] shadow-xl hover:bg-black active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-4 disabled:opacity-70 group/btn"
                  >
                     {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                     {isSaving ? "Saving..." : "Save Changes"}
                  </button>
               </div>
            </motion.div>


        </div>
      </motion.form>
    </div>
  );
}
