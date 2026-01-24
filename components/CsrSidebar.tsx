"use client";

import { FiUsers, FiUserCheck, FiUserX, FiActivity, FiRefreshCw, FiInfo } from "react-icons/fi";
import { useState } from "react";

interface CSR {
    csrId: string;
    _id?: string;
    name: string;
    totalLeads: number;
    totalSales: number;
    conversionRate: string;
    status?: string;
}

interface Props {
    csrs: CSR[];
    selectedCSR: string | null;
    onSelect: (csrId: string | null) => void;
    onToggleStatus: (csrId: string, currentStatus: string) => void;
}

export default function CSRSidebar({ csrs = [], selectedCSR, onSelect, onToggleStatus }: Props) {
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const handleToggle = async (id: string, currentStatus: string) => {
        if (!id) return;
        setTogglingId(id);
        try {
            await onToggleStatus(id, currentStatus);
        } finally {
            setTogglingId(null);
        }
    };

    return (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200/60 p-6 flex flex-col h-full w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 px-2">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                        <FiUsers size={20} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">Team</h3>
                </div>
                <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-1 rounded-lg font-bold uppercase">
                    {csrs.length} CSRs
                </span>
            </div>

            {/* --- ALL LEADS BUTTON --- */}
            <button
                onClick={() => onSelect(null)}
                className={`w-full text-left px-5 py-4 mb-6 rounded-2xl font-black transition-all flex items-center justify-between group border-2 ${selectedCSR === null
                    ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200"
                    : "bg-white border-slate-100 text-slate-500 hover:border-indigo-200"
                    }`}
            >
                <span className="flex items-center gap-2 text-xs uppercase tracking-wider">
                    <FiActivity className={selectedCSR === null ? "text-indigo-400" : "text-slate-400"} />
                    Global Overview
                </span>
                {selectedCSR === null && <div className="h-2 w-2 bg-indigo-400 rounded-full animate-pulse"></div>}
            </button>

            {/* --- SCROLLABLE CSR LIST --- */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                {csrs.length === 0 ? (
                    <div className="text-center py-10">
                        <FiInfo className="mx-auto text-slate-300 mb-2" size={24} />
                        <p className="text-slate-400 text-xs font-bold uppercase">No CSRs found</p>
                    </div>
                ) : (
                    csrs.map((csr) => {
                        // Fallback logic for IDs
                        const id = csr.csrId || (csr as any)._id || "";
                        const currentStatus = (csr.status || "active").toLowerCase();
                        const isActive = currentStatus === "active";
                        const isSelected = selectedCSR === id;

                        return (
                            <div
                                key={id}
                                className={`group relative p-5 rounded-[2rem] border-2 transition-all duration-300 ${isSelected
                                    ? "border-indigo-500 bg-white shadow-xl shadow-indigo-100/50"
                                    : "border-slate-50 bg-slate-50/50 hover:border-slate-200 hover:bg-white"
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div
                                        className="cursor-pointer flex-1"
                                        onClick={() => onSelect(id)}
                                    >
                                        <p className={`font-black text-sm truncate max-w-[120px] transition-colors ${isSelected ? "text-indigo-600" : "text-slate-700 group-hover:text-indigo-600"
                                            }`}>
                                            {csr.name}
                                        </p>

                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                                                }`}></span>
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-emerald-600' : 'text-slate-400'
                                                }`}>
                                                {isActive ? 'Live' : 'Offline'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggle(id, currentStatus);
                                        }}
                                        disabled={togglingId === id}
                                        className={`p-2 rounded-xl transition-all ${isActive
                                            ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white"
                                            : "bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white"
                                            } disabled:opacity-30`}
                                        title={isActive ? "Deactivate CSR" : "Activate CSR"}
                                    >
                                        {togglingId === id ? (
                                            <FiRefreshCw size={14} className="animate-spin" />
                                        ) : isActive ? (
                                            <FiUserCheck size={14} />
                                        ) : (
                                            <FiUserX size={14} />
                                        )}
                                    </button>
                                </div>

                                {/* Stats Grid */}
                                <div
                                    className="grid grid-cols-3 gap-2 mt-4 cursor-pointer"
                                    onClick={() => onSelect(id)}
                                >
                                    <div className="bg-white/80 p-2 rounded-2xl border border-slate-100 text-center group-hover:border-indigo-100 transition-colors">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Leads</p>
                                        <p className="text-xs font-black text-slate-700">{csr.totalLeads}</p>
                                    </div>
                                    <div className="bg-white/80 p-2 rounded-2xl border border-slate-100 text-center group-hover:border-indigo-100 transition-colors">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Sales</p>
                                        <p className="text-xs font-black text-emerald-600">{csr.totalSales}</p>
                                    </div>
                                    <div className="bg-white/80 p-2 rounded-2xl border border-slate-100 text-center group-hover:border-indigo-100 transition-colors">
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">CR %</p>
                                        <p className="text-xs font-black text-indigo-600">{csr.conversionRate}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 3px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </div>
    );
}
