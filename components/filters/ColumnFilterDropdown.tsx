"use client";

import { useState, useRef, useEffect } from "react";
import { FiFilter } from "react-icons/fi";

export interface FilterOption {
    value: string;
    label: string;
}

interface Props {
    label: string;
    options: FilterOption[];
    selected: string[];
    onChange: (selected: string[]) => void;
}

// Excel-style column header filter: click the funnel icon, check/uncheck
// values in the panel. No selection = no filter applied (shows everything).
export default function ColumnFilterDropdown({ label, options, selected, onChange }: Props) {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleValue = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter((v) => v !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    const isActive = selected.length > 0;

    return (
        <div className="relative inline-block normal-case" ref={wrapperRef}>
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
                title={`Filter by ${label}`}
                className={`inline-flex items-center gap-1 ml-1.5 p-1 rounded-md transition-colors align-middle ${isActive ? "text-indigo-600 bg-indigo-50" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    }`}
            >
                <FiFilter size={11} />
                {isActive && <span className="text-[9px] font-black leading-none">{selected.length}</span>}
            </button>

            {open && (
                <div className="absolute z-50 top-full left-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 text-left">
                    <div className="flex items-center justify-between px-1.5 pb-2 mb-1 border-b border-slate-100">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide">{label}</span>
                        {isActive && (
                            <button
                                type="button"
                                onClick={() => onChange([])}
                                className="text-[9px] font-bold text-rose-500 hover:underline"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                    <div className="max-h-56 overflow-y-auto space-y-0.5">
                        {options.length === 0 && (
                            <p className="text-[10px] text-slate-400 px-1.5 py-2">No values yet</p>
                        )}
                        {options.map((opt) => (
                            <label
                                key={opt.value}
                                className="flex items-center gap-2 px-1.5 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs font-semibold text-slate-600 normal-case"
                            >
                                <input
                                    type="checkbox"
                                    checked={selected.includes(opt.value)}
                                    onChange={() => toggleValue(opt.value)}
                                    className="rounded accent-indigo-600 shrink-0"
                                />
                                <span className="truncate">{opt.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
