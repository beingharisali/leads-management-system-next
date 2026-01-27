"use client";

import React from "react";
import { FiUsers, FiActivity, FiInfo, FiPower } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

/* ================= TYPES ================= */

interface CSR {
    csrId: string;
    _id?: string;
    name: string;
    totalLeads: number;
    totalSales: number;
    conversionRate: string | number;
    status?: string;
}

interface Props {
    csrs: CSR[];
    selectedCSR: string | null;
    onSelect: (csrId: string | null) => void;
    onToggleStatus: (csrId: string, currentStatus: string) => void;
}

/* ================= MAIN COMPONENT ================= */

export default function CSRSidebar({ csrs = [], selectedCSR, onSelect, onToggleStatus }: Props) {
    return (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6 flex flex-col h-[calc(100vh-140px)] w-full sticky top-8">

            {/* Header Section */}
            <div className="flex items-center justify-between mb-6 px-2 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        <FiUsers size={20} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">Team</h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Management</p>
                    </div>
                </div>
                <span className="bg-slate-100 text-slate-500 text-[10px] px-3 py-1.5 rounded-xl font-black uppercase tracking-tight">
                    {csrs.length} Agents
                </span>
            </div>

            {/* Global Overview Button */}
            <button
                onClick={() => onSelect(null)}
                className={`w-full text-left px-5 py-4 mb-6 rounded-[1.5rem] font-black transition-all duration-300 flex items-center justify-between group border-2 shrink-0 ${selectedCSR === null
                    ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200"
                    : "bg-white border-slate-50 text-slate-500 hover:border-indigo-100 hover:bg-slate-50/50"
                    }`}
            >
                <span className="flex items-center gap-3 text-[11px] uppercase tracking-widest">
                    <FiActivity className={selectedCSR === null ? "text-indigo-400" : "text-slate-400"} />
                    Global Overview
                </span>
            </button>

            {/* Agent List Container */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                <AnimatePresence mode="popLayout">
                    {csrs.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-12 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200"
                        >
                            <FiInfo className="mx-auto text-slate-300 mb-2" size={28} />
                            <p className="text-slate-400 text-[10px] font-black uppercase">No Agents Found</p>
                        </motion.div>
                    ) : (
                        csrs.map((csr) => {
                            // Unified ID system: MongoDB ki ID ya custom ID dono ko handle karta hai
                            const actualId = (csr._id || csr.csrId) as string;

                            // Normalize Status: Status check karne ke liye extra security
                            const rawStatus = String(csr.status || "active").toLowerCase().trim();
                            const isActive = rawStatus === "active";
                            const isSelected = selectedCSR === actualId;

                            return (
                                <motion.div
                                    layout
                                    key={actualId}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    onClick={() => onSelect(actualId)}
                                    className={`group relative p-5 rounded-[2rem] transition-all duration-300 cursor-pointer border-2 ${isSelected
                                        ? "border-indigo-600 bg-white shadow-xl shadow-indigo-100/50"
                                        : "border-slate-50 bg-white hover:border-slate-200"
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-black text-lg tracking-tight truncate pr-2 ${isSelected ? "text-indigo-600" : "text-slate-800"
                                                }`}>
                                                {csr.name}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`h-2 w-2 rounded-full transition-all duration-500 ${isActive
                                                    ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                                                    : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                                                    }`}></span>
                                                <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${isActive ? 'text-emerald-600' : 'text-rose-600'
                                                    }`}>
                                                    {isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Status Toggle Button: Fixed Event Handling */}
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation(); // Row selection ko rokne ke liye
                                                onToggleStatus(actualId, rawStatus);
                                            }}
                                            title={isActive ? "Deactivate Agent" : "Activate Agent"}
                                            className={`p-2.5 rounded-xl transition-all active:scale-90 shadow-sm border ${isActive
                                                ? "bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-600 hover:text-white"
                                                : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white"
                                                }`}
                                        >
                                            <FiPower size={14} className="stroke-[3px]" />
                                        </button>
                                    </div>

                                    {/* Mini Stats Grid */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <StatBox label="Leads" value={csr.totalLeads} isSelected={isSelected} />
                                        <StatBox label="Sales" value={csr.totalSales} isSelected={isSelected} color="text-emerald-600" />
                                        <StatBox label="CR %" value={`${csr.conversionRate}%`} isSelected={isSelected} color="text-indigo-600" />
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #f1f5f9; border-radius: 10px; }
                .custom-scrollbar:hover::-webkit-scrollbar-thumb { background: #e2e8f0; }
            `}</style>
        </div>
    );
}

/* ================= HELPER COMPONENTS ================= */

function StatBox({ label, value, isSelected, color = "text-slate-700" }: { label: string, value: string | number, isSelected: boolean, color?: string }) {
    return (
        <div className={`rounded-xl border py-2 px-1 flex flex-col items-center justify-center transition-all ${isSelected ? "bg-indigo-50/30 border-indigo-100" : "bg-slate-50/50 border-slate-100"
            }`}>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">{label}</p>
            <p className={`text-xs font-black ${color}`}>{value}</p>
        </div>
    );
}