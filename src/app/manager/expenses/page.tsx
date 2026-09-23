"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2,
  Loader2,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { FadeUp } from "@/components/ui/fade-up";
import { ExpenseRegister } from "@/components/admin/expense-register";
import { useAuth } from "@/context/AuthContext";

interface LocationInfo {
  id: number;
  name: string;
  slug: string;
  city?: { name: string };
}

const ACCOUNTANT_EMAIL = "ssinfrazone21@gmail.com";

export default function ManagerExpensesPage() {
  const { user, isRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationInfo[]>([]);
  const [activeLocationId, setActiveLocationId] = useState<number | null>(null);

  const userEmail = user?.email?.toLowerCase() || "";
  const userRoleUpper = user?.role?.toUpperCase() || "";
  const isAccountant =
    userEmail === ACCOUNTANT_EMAIL ||
    user?.name?.toLowerCase() === "accounts" ||
    userRoleUpper === "ACCOUNTS" ||
    userRoleUpper === "ACCOUNTANT" ||
    isRole("ACCOUNTS") ||
    isRole("ACCOUNTANT");
  const isAdmin = isRole("ADMIN");

  useEffect(() => {
    fetchExpensesData(true);
  }, []);

  const fetchExpensesData = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      }
      const res = await fetch("/api/admin/expenses");
      if (!res.ok) {
        // Fallback to locations endpoint
        const locRes = await fetch("/api/admin/locations");
        if (locRes.ok) {
          const locData = await locRes.json();
          const fallbackLocs = locData.locations || locData || [];
          setLocations(fallbackLocs);
          if (fallbackLocs.length > 0 && !activeLocationId) {
            setActiveLocationId(fallbackLocs[0].id);
          }
          return;
        }
        throw new Error("Failed to load center expenses");
      }
      const data = await res.json();
      const fetchedLocations = data.locations || [];
      setLocations(fetchedLocations);

      if (fetchedLocations.length > 0 && !activeLocationId) {
        setActiveLocationId(fetchedLocations[0].id);
      }
    } catch (err: any) {
      console.warn("[MANAGER_EXPENSES_WARNING]", err);
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  const activeLocation =
    locations.find((l) => l.id === activeLocationId) || locations[0] || null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#1ab0bc]" />
        <p className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest">
          Loading Center Operating Expenses...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 font-sans">
      {/* ── HEADER ── */}
      <FadeUp>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-display font-black text-[#1B1C1C] uppercase tracking-tight flex items-center gap-2.5">
                <Receipt className="w-7 h-7 text-[#1ab0bc]" />
                <span>Center Operating Expenses</span>
              </h1>
              <span className="bg-[#1ab0bc] text-white text-[9px] font-mono px-2.5 py-0.5 uppercase tracking-widest">
                {isAccountant ? "ACCOUNTANT PORTAL" : "COMMUNITY MANAGER"}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
              {isAccountant
                ? "Accountant payment verification, settlement & month-wise expense audit."
                : "Daily Center Operating Expenses, vendor invoices & settlement tracking"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/manager/vendor-master"
              className="bg-white hover:bg-gray-100 text-gray-800 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider border border-gray-300 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Open Vendor Master: Centralized vendor directory, banking details, GSTIN, PAN & contact records"
            >
              <Building2 className="w-3.5 h-3.5 text-[#1ab0bc]" />
              <span>Vendor Master</span>
            </Link>
          </div>
        </div>
      </FadeUp>

      {/* ── NEW FORMAT REGISTER (Client Master Style) ── */}
      <ExpenseRegister
        initialLocationId={activeLocation?.id || null}
        isAccountant={isAccountant}
        isAdmin={isAdmin}
        currentUserName={user?.name || (isAccountant ? "Accountant" : "Community Manager")}
      />
    </div>
  );
}
