"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { toast } from "sonner";
import { FadeUp } from "@/components/ui/fade-up";
import { ExpenseSpreadsheet } from "@/components/admin/expense-spreadsheet";
import { useAuth } from "@/context/AuthContext";

interface LocationInfo {
  id: number;
  name: string;
  slug: string;
  city?: { name: string };
}

interface ExpenseSheetData {
  id: number;
  locationId: number;
  title: string;
  columns: any[];
  rows: any[];
  location: LocationInfo;
  updatedAt: string;
}

const ACCOUNTANT_EMAIL = 'ssinfrazone21@gmail.com';

export default function ManagerExpensesPage() {
  const { user, isRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locations, setLocations] = useState<LocationInfo[]>([]);
  const [sheets, setSheets] = useState<ExpenseSheetData[]>([]);
  const [activeLocationId, setActiveLocationId] = useState<number | null>(null);

  const userEmail = user?.email?.toLowerCase() || '';
  const isAccountant = userEmail === ACCOUNTANT_EMAIL || user?.name?.toLowerCase() === 'accounts';
  const isAdmin = isRole('ADMIN');
  const userRoleView: 'CM' | 'ACCOUNTANT' = isAccountant ? 'ACCOUNTANT' : 'CM';

  useEffect(() => {
    fetchExpensesData(true);
  }, []);

  const fetchExpensesData = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const res = await fetch("/api/admin/expenses");
      if (!res.ok) {
        throw new Error("Failed to load center expenses");
      }
      const data = await res.json();
      const fetchedLocations = data.locations || [];
      setLocations(fetchedLocations);
      setSheets(data.sheets || []);

      if (fetchedLocations.length > 0 && !activeLocationId) {
        setActiveLocationId(fetchedLocations[0].id);
      }
    } catch (err: any) {
      console.error(err);
      if (isInitial) {
        toast.error(err.message || "Failed to load expense sheet");
      }
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  const activeLocation = locations.find((l) => l.id === activeLocationId) || locations[0] || null;
  const activeSheet = sheets.find((s) => s.locationId === (activeLocation?.id ?? -1)) || sheets[0] || null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#1ab0bc]" />
        <p className="text-xs font-mono font-bold text-gray-500 uppercase tracking-widest">
          Loading Center Expense Spreadsheets...
        </p>
      </div>
    );
  }

  if (!activeLocation || !activeSheet) {
    return (
      <div className="bg-white p-12 text-center border border-gray-200 shadow-sm max-w-2xl mx-auto my-12 space-y-4">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 uppercase tracking-tight">No Center Assigned Yet</h2>
        <p className="text-xs text-gray-500 max-w-md mx-auto">
          You are currently not assigned to any specific coworking location center.
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
            <h1 className="text-2xl md:text-3xl font-display font-black text-[#1B1C1C] uppercase tracking-tight flex items-center gap-3">
              <span>{isAccountant ? 'Center Expense Spreadsheets' : `${activeLocation.name} Expense Sheet`}</span>
              <span className="bg-[#1ab0bc] text-white text-[9px] font-mono px-2.5 py-0.5 uppercase tracking-widest">
                {isAccountant ? 'ACCOUNTANT PAYMENT VIEW' : 'COMMUNITY MANAGER'}
              </span>
            </h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
              {isAccountant
                ? 'Accountant payment details upload & center expense audit. CM columns are read-only.'
                : 'Daily Center Operating Expenses Spreadsheet'}
            </p>
          </div>

          <button
            onClick={() => fetchExpensesData(false)}
            disabled={refreshing}
            className="bg-white hover:bg-gray-100 text-gray-800 px-4 py-2 text-xs font-bold uppercase tracking-wider border border-gray-300 transition-all flex items-center gap-2 shadow-xs cursor-pointer self-start md:self-auto"
          >
            <RefreshCcw className={`w-4 h-4 text-[#1ab0bc] ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Refreshing..." : "Refresh Sheet"}</span>
          </button>
        </div>
      </FadeUp>

      {/* ── TOP CENTER TABS (For Accountant and Multi-Center Managers) ── */}
      {(isAccountant || locations.length > 1) && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-gray-200">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#1ab0bc] shrink-0 mr-2 flex items-center gap-1">
              <Building2 className="w-4 h-4" /> SELECT CENTER:
            </span>

            {locations.map((loc) => {
              const isSelected = (activeLocationId ?? activeLocation.id) === loc.id;
              return (
                <button
                  key={loc.id}
                  onClick={() => setActiveLocationId(loc.id)}
                  className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap border flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? "bg-[#1ab0bc] text-white border-[#1ab0bc] shadow-md scale-105"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <Building2 className={`w-4 h-4 ${isSelected ? "text-white" : "text-[#1ab0bc]"}`} />
                  <span>{loc.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CLEAN FULL-SCREEN SPREADSHEET ── */}
      <ExpenseSpreadsheet
        key={`${activeLocation.id}_${userRoleView}`}
        locationId={activeLocation.id}
        locationName={activeLocation.name}
        initialColumns={activeSheet.columns || []}
        initialRows={activeSheet.rows || []}
        isSuperAdmin={isAdmin}
        userRoleView={userRoleView}
        currentUserName={user?.name || (isAccountant ? 'Accountant' : 'Community Manager')}
        currentUserId={user?.id ? Number(user.id) : (isAccountant ? 5 : 2)}
      />
    </div>
  );
}
