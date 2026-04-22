"use client";

import { FileText, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import StatusBadge from "./StatusBadge";
import type { ContractRequest, ContractSummary, ContractStatusName } from "@/types/clm";

interface Props {
  contract?: ContractSummary;
  request?: ContractRequest;
}

export default function UserContractCard({ contract, request }: Props) {
  const isContract = !!contract;
  const title = isContract ? contract.title : "Agreement Preparation";
  const subtitle = isContract ? contract.contractNumber : `Ref: ${request?.booking?.bookingNumber || 'New Request'}`;
  const status = (isContract ? contract.status?.name : "REQUESTED") as ContractStatusName;
  const date = isContract ? contract.createdAt : request?.createdAt;
  const productName = isContract ? contract.booking?.product?.name : request?.booking?.product?.name;
  const locationName = isContract ? contract.booking?.location?.name : request?.booking?.location?.name;

  return (
    <div className="bg-white border border-[var(--outline-variant)] rounded-none p-8 hover:border-[var(--primary)] transition-all group relative overflow-hidden flex flex-col h-full shadow-sm hover:shadow-lg">
      
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div className="p-3 bg-[var(--surface-low)] border border-[var(--outline-variant)]">
          <FileText size={20} className="text-[var(--primary)]" />
        </div>
        <StatusBadge status={status} size="sm" pulse={status === 'PENDING_SIGN'} />
      </div>

      <div className="flex-1 relative z-10">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-[#1B1C1C] tracking-tight mb-1">{title}</h3>
          <p className="text-[10px] text-[#9E9E9E] font-bold uppercase tracking-widest">{subtitle}</p>
        </div>

        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 text-[11px] font-bold text-[#616161]">
            <Calendar size={14} className="text-[#9E9E9E]" />
            <span className="uppercase tracking-widest">{new Date(date!).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          {productName && (
            <div className="flex items-center gap-3 text-[11px] font-bold text-[#616161]">
              <div className="w-1.5 h-1.5 bg-[var(--primary)]" />
              <span className="uppercase tracking-widest leading-relaxed">{productName} <br /> <span className="text-[#9E9E9E] opacity-70">@ {locationName}</span></span>
            </div>
          )}
        </div>
      </div>

      <div className="pt-6 border-t border-[var(--outline-variant)]/40 mt-auto relative z-10">
        {isContract ? (
          <Link 
            href={`/dashboard/contracts/${contract.id}`}
            className="flex items-center justify-between group/btn text-[11px] font-bold uppercase tracking-widest text-[#1B1C1C] hover:text-[var(--primary)] transition-colors"
          >
            Manage Agreement
            <div className="p-2 bg-[var(--primary)] text-white hover:bg-black transition-all">
              <ArrowRight size={14} />
            </div>
          </Link>
        ) : (
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#9E9E9E] flex items-center gap-2">
            <div className="w-1 h-1 bg-amber-500 animate-pulse"></div>
            Awaiting Manager Review
          </div>
        )}
      </div>
    </div>
  );
}
