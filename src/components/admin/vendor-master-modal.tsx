"use client";

import React from "react";
import { createPortal } from "react-dom";
import { X, ExternalLink, Building2 } from "lucide-react";
import Link from "next/link";
import { VendorMasterView } from "./vendor-master-view";

interface VendorMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  isAccountant?: boolean;
  onVendorChange?: () => void;
}

export function VendorMasterModal({
  isOpen,
  onClose,
  isAdmin = false,
  isAccountant = false,
  onVendorChange,
}: VendorMasterModalProps) {
  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  const vendorMasterHref = isAdmin || isAccountant ? "/admin/vendor-master" : "/manager/vendor-master";

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-gray-300 w-full max-w-7xl h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 font-sans">
        {/* Top Modal Header */}
        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-[#006064] text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-amber-300" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-display font-black uppercase tracking-wider text-white">
                  Vendor Master Directory
                </h3>
                <span className="bg-white/20 text-white text-[9px] font-mono px-2 py-0.5 uppercase tracking-widest font-bold">
                  Accessible from Expenses
                </span>
              </div>
              <p className="text-[10px] text-cyan-100 font-medium hidden sm:block">
                View verified suppliers, bank accounts, IFSC, GSTIN & PAN details. Changes reflect live in expenses.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={vendorMasterHref}
              target="_blank"
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border border-white/20 cursor-pointer"
              title="Open Vendor Master in a new tab"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">Open Full Page</span>
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer border border-transparent hover:border-white/20"
              title="Close Vendor Master"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Scrollable container rendering VendorMasterView */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-[#F8F9FA]">
          <VendorMasterView isModal={true} onClose={onClose} onVendorChange={onVendorChange} />
        </div>
      </div>
    </div>,
    document.body
  );
}
