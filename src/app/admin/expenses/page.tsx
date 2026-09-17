"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  Loader2,
  RefreshCcw,
  UserCheck,
  Calculator,
  ShieldAlert,
  Sparkles,
  Table as TableIcon
} from "lucide-react";
import { toast } from "sonner";
import { FadeUp } from "@/components/ui/fade-up";
import { ExpenseSpreadsheet } from "@/components/admin/expense-spreadsheet";
import { ExpenseRegister } from "@/components/admin/expense-register";

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

export default function SuperAdminExpensesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locations, setLocations] = useState<LocationInfo[]>([]);
  const [sheets, setSheets] = useState<ExpenseSheetData[]>([]);
  const [activeLocationId, setActiveLocationId] = useState<number | null>(null);

  // Format Switcher: 'REGISTER' (Client Master Style) vs 'SPREADSHEET' (Excel Legacy Grid)
  const [viewMode, setViewMode] = useState<"REGISTER" | "SPREADSHEET">("REGISTER");

  // Role detection: Super Admin vs Accountant
  const userEmail = (user?.email || "").toLowerCase();
  const roleName = ((user?.role as any)?.name || (user as any)?.roleName || (user?.role as any) || '').toLowerCase();
  const isAccountantRole =
    roleName === 'accountant' ||
    roleName === 'accounts' ||
    userEmail === 'ssinfrazone21@gmail.com' ||
    user?.name?.toLowerCase() === 'accounts';

  const isSuperAdmin =
    !isAccountantRole && (
      roleName === 'admin' ||
      roleName === 'super_admin' ||
      roleName === 'super-admin' ||
      roleName === 'super admin' ||
      userEmail === 'praveen@sspacia.com'
    );

  const [userRoleView, setUserRoleView] = useState<'CM' | 'ACCOUNTANT'>(isAccountantRole ? 'ACCOUNTANT' : 'CM');

  useEffect(() => {
    if (isAccountantRole || !isSuperAdmin) {
      if (isAccountantRole) {
        setUserRoleView('ACCOUNTANT');
      }
      setViewMode('REGISTER');
    }
  }, [isAccountantRole, isSuperAdmin]);

  useEffect(() => {
    fetchExpensesData(true);
  }, []);

  const fetchExpensesData = async (isInitial = false, retryCount = 0) => {
    try {
      if (isInitial && retryCount === 0) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      const res = await fetch("/api/admin/expenses");
      if (!res.ok) {
        if (retryCount < 2) {
          await new Promise((r) => setTimeout(r, 600));
          return fetchExpensesData(isInitial, retryCount + 1);
        }
        // Graceful fallback to locations endpoint so tabs and centers load reliably
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
      setLocations(data.locations || []);
      setSheets(data.sheets || []);

      if (data.locations && data.locations.length > 0 && !activeLocationId) {
        setActiveLocationId(data.locations[0].id);
      }
    } catch (err: any) {
      console.warn("[EXPENSES_LOAD_WARNING]", err);
      // In REGISTER mode, ExpenseRegister manages its own robust records fetching
      if (isInitial && viewMode === "SPREADSHEET") {
        toast.error(err.message || "Failed to load expense sheets");
      }
    } finally {
      if (isInitial) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  const activeSheet = sheets.find((s) => s.locationId === activeLocationId);
  const activeLocation = locations.find((l) => l.id === activeLocationId);

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
            <h1 className="text-2xl md:text-3xl font-display font-black text-[#1B1C1C] uppercase tracking-tight flex items-center gap-3">
              <span>Center Operating Expenses</span>
              <span className="bg-[#006064] text-white text-[9px] font-mono px-2.5 py-0.5 uppercase tracking-widest font-bold">
                {isAccountantRole
                  ? "ACCOUNTANT PORTAL"
                  : viewMode === "REGISTER"
                  ? "CLIENT MASTER STYLE"
                  : "SUPER ADMIN MASTER"}
              </span>
            </h1>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
              {isAccountantRole
                ? "Accountant payment verification, settlement & month-wise expense audit. CM columns are read-only."
                : viewMode === "REGISTER"
                ? "Structured Client Master-style expense register with vendor bills, payments & Super Admin approval."
                : "Center-wise Community Manager Expense Spreadsheets & Financial Audit."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* FORMAT SWITCHER: ONLY VISIBLE TO SUPER ADMIN */}
            {isSuperAdmin && (
              <div className="flex items-center gap-1 bg-gray-100 p-1 border border-gray-300">
                <button
                  type="button"
                  onClick={() => setViewMode("REGISTER")}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === "REGISTER"
                      ? "bg-[#006064] text-white shadow-xs"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>New Format (Client Master)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("SPREADSHEET")}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === "SPREADSHEET"
                      ? "bg-[#006064] text-white shadow-xs"
                      : "text-gray-700 hover:text-gray-900"
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Spreadsheet (Excel)</span>
                </button>
              </div>
            )}

            {isSuperAdmin && viewMode === "SPREADSHEET" && (
              <>
                {/* ROLE VIEW SWITCHER (CM VIEW vs ACCOUNTANT VIEW) */}
                <div className="flex items-center gap-1 bg-[#F5F5F5] p-1 border border-gray-300">
                  <button
                    type="button"
                    onClick={() => setUserRoleView("CM")}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                      userRoleView === "CM"
                        ? "bg-[#1ab0bc] text-white shadow-xs"
                        : "text-[#616161] hover:text-[#1B1C1C]"
                    }`}
                  >
                    <UserCheck size={14} /> CM View
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserRoleView("ACCOUNTANT")}
                    className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                      userRoleView === "ACCOUNTANT"
                        ? "bg-[#1ab0bc] text-white shadow-xs"
                        : "text-[#616161] hover:text-[#1B1C1C]"
                    }`}
                  >
                    <Calculator size={14} /> Accountant View
                  </button>
                </div>

                <button
                  onClick={() => fetchExpensesData(false)}
                  disabled={refreshing}
                  className="bg-white hover:bg-gray-100 text-gray-800 px-4 py-2 text-xs font-bold uppercase tracking-wider border border-gray-300 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <RefreshCcw
                    className={`w-4 h-4 text-[#1ab0bc] ${refreshing ? "animate-spin" : ""}`}
                  />
                  <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </FadeUp>

      {/* ── VIEW MODE 1: NEW FORMAT (CLIENT MASTER STYLE) ── */}
      {viewMode === "REGISTER" && (
        <ExpenseRegister
          initialLocationId={activeLocationId}
          isAccountant={isAccountantRole}
          isAdmin={isSuperAdmin}
          currentUserName={user?.name || (isAccountantRole ? "Accountant" : "Super Admin")}
          onSwitchToSpreadsheet={isSuperAdmin ? () => setViewMode("SPREADSHEET") : undefined}
        />
      )}

      {/* ── VIEW MODE 2: LEGACY SPREADSHEET (SUPER ADMIN ONLY) ── */}
      {isSuperAdmin && viewMode === "SPREADSHEET" && (
        <div className="space-y-6">
          {/* Top Center Tabs */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-gray-200">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#1ab0bc] shrink-0 mr-2 flex items-center gap-1">
                <Building2 className="w-4 h-4" /> SELECT CENTER:
              </span>

              {locations.map((loc) => {
                const isSelected = activeLocationId === loc.id;
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
                    <Building2
                      className={`w-4 h-4 ${isSelected ? "text-white" : "text-[#1ab0bc]"}`}
                    />
                    <span>{loc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Spreadsheet */}
          {activeLocationId && activeLocation ? (
            <ExpenseSpreadsheet
              key={`${activeLocationId}_${userRoleView}`}
              locationId={activeLocationId}
              locationName={activeLocation.name}
              initialColumns={activeSheet?.columns || []}
              initialRows={activeSheet?.rows || []}
              isSuperAdmin={true}
              userRoleView={userRoleView}
              currentUserName={
                user?.name || (userRoleView === "ACCOUNTANT" ? "Accountant" : "Super Admin")
              }
              currentUserId={user?.id ? Number(user.id) : 1}
            />
          ) : (
            <div className="bg-white p-12 text-center border border-gray-200 text-gray-400 italic">
              Please select a center tab above to view its expense spreadsheet.
            </div>
          )}
        </div>
      )}

    </div>
  );
}
