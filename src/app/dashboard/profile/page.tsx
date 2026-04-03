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
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="relative inline-block"
        >
          <div className="h-28 w-28 bg-[var(--primary)]/10 rounded-[2.5rem] flex items-center justify-center border border-[var(--primary)]/20 mb-4 overflow-hidden group shadow-inner">
             <User className="h-12 w-12 text-[var(--primary)] group-hover:scale-110 transition-transform duration-500" />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-green-500 h-8 w-8 rounded-2xl border-4 border-[var(--surface-lowest)] flex items-center justify-center shadow-lg" title="Account Active">
            <ShieldCheck className="h-4 w-4 text-white" />
          </div>
        </motion.div>
        
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-display font-bold text-[#1B1C1C] uppercase tracking-tighter italic"
          >
            Public <span className="text-[var(--primary)] not-italic">Profile</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-[#616161] mt-2 font-bold text-sm uppercase tracking-widest opacity-70"
          >
            Refine your professional identity and organization footprint.
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
           <motion.div variants={itemVariants} className="bg-[var(--surface-lowest)] rounded-[3rem] p-10 md:p-12 border border-[var(--outline-variant)] shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--primary)]/5 blur-[100px] -mr-16 -mt-16 group-hover:bg-[var(--primary)]/10 transition-colors" />
              <h2 className="text-xl font-display font-bold text-[#1B1C1C] mb-10 flex items-center gap-4 uppercase tracking-tight">
                 <div className="p-2.5 bg-[var(--primary)]/10 rounded-xl text-[var(--primary)] shadow-sm">
                   <User size={20} />
                 </div>
                 Member Foundation
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-2.5">
                    <label className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">Legal Full Name</label>
                    <div className="relative group/field">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E] group-focus-within/field:text-[var(--primary)] transition-colors" />
                      <input name="name" type="text" value={formData.name} onChange={handleInputChange} className="w-full pl-14 pr-5 py-5 rounded-2xl border border-[var(--outline-variant)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/5 outline-none text-[15px] transition-all bg-[var(--surface-low)]/50 font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/50" placeholder="E.g., John Doe" />
                    </div>
                 </div>

                 <div className="space-y-2.5 opacity-60">
                    <label className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">Registered Email</label>
                    <div className="relative">
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E]" />
                      <input disabled type="email" value={formData.email} className="w-full pl-14 pr-5 py-5 rounded-2xl border border-[var(--outline-variant)] outline-none text-[15px] bg-[var(--surface-low)]/30 font-bold text-[#1B1C1C] cursor-not-allowed" />
                    </div>
                 </div>

                 <div className="space-y-2.5">
                    <label className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">Contact Phone</label>
                    <div className="relative group/field">
                      <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E] group-focus-within/field:text-[var(--primary)] transition-colors" />
                      <input name="phone" required type="tel" value={formData.phone} onChange={handleInputChange} className="w-full pl-14 pr-5 py-5 rounded-2xl border border-[var(--outline-variant)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/5 outline-none text-[15px] transition-all bg-[var(--surface-low)]/50 font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/50" placeholder="+91 90000 00000" />
                    </div>
                 </div>

                 <div className="space-y-2.5">
                    <label className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">Professional Title</label>
                    <div className="relative group/field">
                      <Briefcase className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E] group-focus-within/field:text-[var(--primary)] transition-colors" />
                      <input name="designation" required type="text" value={formData.designation} onChange={handleInputChange} className="w-full pl-14 pr-5 py-5 rounded-2xl border border-[var(--outline-variant)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/5 outline-none text-[15px] transition-all bg-[var(--surface-low)]/50 font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/50" placeholder="E.g., CEO" />
                    </div>
                 </div>

                 <div className="space-y-2.5 md:col-span-2">
                    <label className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">Alternative Contact (Optional)</label>
                    <div className="relative group/field">
                      <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E] group-focus-within/field:text-[var(--primary)] transition-colors" />
                      <input name="contactNumber" type="tel" value={formData.contactNumber} onChange={handleInputChange} className="w-full pl-14 pr-5 py-5 rounded-2xl border border-[var(--outline-variant)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/5 outline-none text-[15px] transition-all bg-[var(--surface-low)]/50 font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/50" placeholder="+91 80000 00000" />
                    </div>
                 </div>
              </div>
           </motion.div>

           <motion.div variants={itemVariants} className="bg-[var(--surface-lowest)] rounded-[3rem] p-10 md:p-12 border border-[var(--outline-variant)] shadow-sm relative overflow-hidden group">
              <h2 className="text-xl font-display font-bold text-[#1B1C1C] mb-10 flex items-center gap-4 uppercase tracking-tight">
                 <div className="p-2.5 bg-[var(--primary)]/10 rounded-xl text-[var(--primary)] shadow-sm">
                   <Building2 size={20} />
                 </div>
                 Firm Architecture
              </h2>

              <div className="space-y-8">
                <div className="space-y-2.5">
                    <label className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">Legal Organization Name</label>
                    <div className="relative group/field">
                      <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E] group-focus-within/field:text-[var(--primary)] transition-colors" />
                      <input name="companyName" required type="text" value={formData.companyName} onChange={handleInputChange} className="w-full pl-14 pr-5 py-5 rounded-2xl border border-[var(--outline-variant)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/5 outline-none text-[15px] transition-all bg-[var(--surface-low)]/50 font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/50" placeholder="Acme Interactive Pvt Ltd" />
                    </div>
                </div>

                <div className="space-y-2.5">
                    <label className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">Street Address</label>
                    <div className="relative group/field">
                      <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9E9E9E] group-focus-within/field:text-[var(--primary)] transition-colors" />
                      <input name="companyStreet" type="text" value={formData.companyStreet} onChange={handleInputChange} className="w-full pl-14 pr-5 py-5 rounded-2xl border border-[var(--outline-variant)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/5 outline-none text-[15px] transition-all bg-[var(--surface-low)]/50 font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/50" placeholder="101, Business Park" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   <div className="space-y-2.5">
                      <label className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">City</label>
                      <input name="companyCity" type="text" value={formData.companyCity} onChange={handleInputChange} className="w-full px-5 py-5 rounded-2xl border border-[var(--outline-variant)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/5 outline-none text-[15px] transition-all bg-[var(--surface-low)]/50 font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/50" placeholder="City" />
                   </div>
                   <div className="space-y-2.5">
                      <label className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">State</label>
                      <input name="companyState" type="text" value={formData.companyState} onChange={handleInputChange} className="w-full px-5 py-5 rounded-2xl border border-[var(--outline-variant)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/5 outline-none text-[15px] transition-all bg-[var(--surface-low)]/50 font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/50" placeholder="State" />
                   </div>
                   <div className="space-y-2.5">
                      <label className="text-[10px] font-bold text-[#9E9E9E] uppercase tracking-[0.2em] ml-1">Postal Code</label>
                      <input name="companyZip" type="text" value={formData.companyZip} onChange={handleInputChange} className="w-full px-5 py-5 rounded-2xl border border-[var(--outline-variant)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/5 outline-none text-[15px] transition-all bg-[var(--surface-low)]/50 font-bold text-[#1B1C1C] placeholder:text-[#9E9E9E]/50" placeholder="380001" />
                   </div>
                </div>
              </div>
           </motion.div>
        </div>

        {/* Right Column: Actions & Meta */}
        <div className="space-y-10">
           <motion.div variants={itemVariants} className="bg-[var(--primary)] text-white rounded-[3rem] p-10 md:p-12 shadow-2xl shadow-[var(--primary)]/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 blur-[80px] -mr-16 -mt-16 rounded-full group-hover:bg-white/20 transition-all duration-700" />
              <div className="relative z-10 space-y-8">
                 <h2 className="text-xl font-display font-bold uppercase tracking-widest italic flex items-center gap-3">
                   <Save size={24} className="text-white/80" />
                   Operation
                 </h2>
                 <p className="text-white/70 text-sm font-medium leading-relaxed italic uppercase tracking-tighter">Please ensure all changes are reviewed. Your professional details reflect across your bookings and invoice generation.</p>
                 
                 <button 
                   disabled={isSaving}
                   type="submit"
                   className="w-full bg-[#1B1B1B] text-white rounded-3xl font-bold py-6 text-[11px] uppercase tracking-[0.3em] shadow-2xl hover:scale-[1.03] hover:shadow-[var(--primary)]/40 active:scale-[0.97] transition-all duration-500 flex items-center justify-center gap-4 disabled:opacity-70 group/btn"
                 >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 group-hover/btn:scale-125 transition-transform" />}
                    {isSaving ? "Synchronizing Identity" : "Commit Changes"}
                 </button>
              </div>
           </motion.div>

           <motion.div variants={itemVariants} className="bg-[#1B1B1B] text-white rounded-[3rem] p-10 md:p-12 relative overflow-hidden shadow-2xl border border-white/5">
              <div className="space-y-8 relative z-10">
                 <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center shadow-inner group-hover/perk:scale-110 transition-transform">
                    <Heart className="w-6 h-6 text-red-500/80" />
                 </div>
                 <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-white/30 italic">Member Privileges</h2>
                 <ul className="space-y-6">
                    <li className="flex items-start gap-4">
                       <CheckCircle2 className="w-5 h-5 text-[var(--primary)] mt-0.5 shrink-0" />
                       <span className="text-xs font-bold text-white/50 leading-relaxed italic uppercase tracking-wider">Priority Logic Clusters Enabled</span>
                    </li>
                    <li className="flex items-start gap-4">
                       <CheckCircle2 className="w-5 h-5 text-[var(--primary)] mt-0.5 shrink-0" />
                       <span className="text-xs font-bold text-white/50 leading-relaxed italic uppercase tracking-wider">Verified Identity Protocol Active</span>
                    </li>
                 </ul>
              </div>
           </motion.div>
        </div>
      </motion.form>
    </div>
  );
}
