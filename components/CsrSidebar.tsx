"use client";

import { FiUsers, FiUserCheck, FiUserX, FiActivity, FiRefreshCw } from "react-icons/fi";
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

export default function CSRSidebar({ csrs, selectedCSR, onSelect, onToggleStatus }: Props) {
    // Local loading state taake pata chale toggle ho raha hai
    const [togglingId, setTogglingId] = useState<string | null>(null);

    const handleToggle = async (id: string, currentStatus: string) => {
        setTogglingId(id);
        try {
            await onToggleStatus(id, currentStatus);
        } finally {
            setTogglingId(null);
        }
    };

    return (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200/60 p-6 flex flex-col h-full w-full">
            <div className="flex items-center gap-3 mb-6 px-2">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <FiUsers size={20} />
                </div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Team Members</h3>
            </div>

            {/* --- ALL CSRs BUTTON --- */}
            <button
                onClick={() => onSelect(null)}
                className={`w-full text-left px-5 py-4 mb-4 rounded-2xl font-bold transition-all flex items-center justify-between group ${selectedCSR === null
                        ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                        : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                    }`}
            >
                <span className="flex items-center gap-2">
                    <FiActivity className={selectedCSR === null ? "text-indigo-400" : "text-slate-400"} />
                    All Leads View
                </span>
                {selectedCSR === null && <div className="h-2 w-2 bg-indigo-400 rounded-full animate-pulse"></div>}
            </button>

            {/* --- SCROLLABLE CSR LIST --- */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                {csrs.map((csr) => {
                    const id = csr.csrId || csr._id || "";
                    // ✅ Strict Status Check: Backend hamesha lowercase bhejta hai
                    const currentStatus = (csr.status || "active").toLowerCase();
                    const isActive = currentStatus === "active";

                    return (
                        <div
                            key={id}
                            className={`group relative p-5 rounded-[2rem] border-2 transition-all duration-300 ${selectedCSR === id
                                    ? "border-indigo-500 bg-white shadow-xl shadow-indigo-100/50"
                                    : "border-slate-50 bg-slate-50/50 hover:border-slate-200 hover:bg-white"
                                }`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="cursor-pointer flex-1" onClick={() => onSelect(id)}>
                                    <p className={`font-black text-md transition-colors ${selectedCSR === id ? "text-indigo-600" : "text-slate-700 group-hover:text-indigo-600"
                                        }`}>
                                        {csr.name}
                                    </p>

                                    {/* ✅ Dynamic Badge with Animation */}
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className={`h-2 w-2 rounded-full transition-all duration-500 ${isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-rose-400'
                                            }`}></span>
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-emerald-600' : 'text-rose-500'
                                            }`}>
                                            {isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>

                                {/* ✅ Action Button (Toggle) */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggle(id, currentStatus);
                                    }}
                                    disabled={togglingId === id}
                                    className={`p-2.5 rounded-xl transition-all shadow-sm ${isActive
                                            ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:scale-110"
                                            : "bg-rose-50 text-rose-600 hover:bg-rose-100 hover:scale-110"
                                        } disabled:opacity-50`}
                                >
                                    {togglingId === id ? (
                                        <FiRefreshCw size={18} className="animate-spin" />
                                    ) : isActive ? (
                                        <FiUserCheck size={18} />
                                    ) : (
                                        <FiUserX size={18} />
                                    )}
                                </button>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-2 mt-4 cursor-pointer" onClick={() => onSelect(id)}>
                                <div className="bg-white/60 p-2 rounded-xl border border-slate-100 text-center">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Leads</p>
                                    <p className="text-sm font-black text-slate-700">{csr.totalLeads}</p>
                                </div>
                                <div className="bg-white/60 p-2 rounded-xl border border-slate-100 text-center">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Sales</p>
                                    <p className="text-sm font-black text-emerald-600">{csr.totalSales}</p>
                                </div>
                                <div className="bg-white/60 p-2 rounded-xl border border-slate-100 text-center">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Conv.</p>
                                    <p className="text-sm font-black text-indigo-600">{csr.conversionRate}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </div>
    );
}