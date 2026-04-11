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
    <div className="bg-[#12121A] border border-[#2A2A3E] rounded-[2rem] p-8 hover:border-[#7C6FFF]/50 transition-all group relative overflow-hidden flex flex-col h-full">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#7C6FFF]/5 blur-[40px] group-hover:bg-[#7C6FFF]/10 transition-all" />
      
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div className="p-3 bg-[#1A1A26] rounded-2xl border border-[#2A2A3E]">
          <FileText size={20} className="text-[#7C6FFF]" />
        </div>
        <StatusBadge status={status} size="sm" pulse={status === 'PENDING_SIGN'} />
      </div>

      <div className="flex-1 relative z-10">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white tracking-tight mb-1">{title}</h3>
          <p className="text-[10px] text-[#5A5A72] font-mono uppercase tracking-widest">{subtitle}</p>
        </div>

        <div className="space-y-3 mb-8">
          <div className="flex items-center gap-3 text-[11px] text-[#9090A8]">
            <Calendar size={14} className="text-[#5A5A72]" />
            <span>{new Date(date!).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          {productName && (
            <div className="flex items-center gap-3 text-[11px] text-[#9090A8]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#7C6FFF]" />
              <span>{productName} @ {locationName}</span>
            </div>
          )}
        </div>
      </div>

      <div className="pt-6 border-t border-[#2A2A3E] mt-auto relative z-10">
        {isContract ? (
          <Link 
            href={`/dashboard/contracts/${contract.id}`}
            className="flex items-center justify-between group/btn text-[11px] font-bold uppercase tracking-widest text-[#7C6FFF] hover:text-white transition-colors"
          >
            Manage Agreement
            <div className="p-2 rounded-lg bg-[#7C6FFF]/10 group-hover/btn:bg-[#7C6FFF] transition-all">
              <ArrowRight size={14} className="group-hover/btn:text-white" />
            </div>
          </Link>
        ) : (
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#5A5A72] italic">
            Awaiting Manager Review
          </div>
        )}
      </div>
    </div>
  );
}
