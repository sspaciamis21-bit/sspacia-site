"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, X } from "lucide-react";

interface Option {
  id: string | number;
  name: string;
}

interface FilterDropdownProps {
  label: string;
  options: Option[];
  selectedId?: string | number;
  onSelect: (id: string | number | undefined) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function FilterDropdown({
  label,
  options,
  selectedId,
  onSelect,
  placeholder = "Select option",
  icon,
  className = "",
  disabled = false
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.id === selectedId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative space-y-2 ${className}`} ref={dropdownRef}>
      <label className="text-[10px] font-sans font-bold text-primary uppercase tracking-[0.4em] ml-1">
        {label}
      </label>
      
      <div className="relative">
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full flex items-center justify-between bg-surface-lowest px-6 py-4 text-sm transition-all border-b-2 h-14 ${
            disabled ? "opacity-40 grayscale cursor-not-allowed border-outline-variant/10" :
            isOpen ? "border-primary shadow-2xl bg-surface-high" : "border-outline-variant/20 hover:border-primary/50"
          }`}
        >
          <div className="flex items-center gap-3">
            {icon && <span className="text-primary/60">{icon}</span>}
            <span className={selectedOption ? "text-on-surface font-medium" : "text-tertiary"}>
              {selectedOption ? selectedOption.name : placeholder}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedId && (
              <X 
                className="h-3 w-3 text-tertiary hover:text-primary transition-colors cursor-pointer" 
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(undefined);
                }}
              />
            )}
            <ChevronDown className={`h-4 w-4 text-primary transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
          </div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="absolute z-[60] left-0 right-0 mt-2 bg-surface-lowest shadow-[0_30px_60px_rgba(0,0,0,0.2)] max-h-72 overflow-y-auto no-scrollbar border border-outline-variant/10"
            >
              {options.length === 0 ? (
                <div className="px-6 py-4 text-xs text-tertiary italic">No options available</div>
              ) : (
                options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      onSelect(option.id);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-6 py-4 text-sm transition-colors hover:bg-surface-high ${
                      selectedId === option.id ? "text-primary font-bold bg-primary/5" : "text-on-surface"
                    }`}
                  >
                    {option.name}
                  </button>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
