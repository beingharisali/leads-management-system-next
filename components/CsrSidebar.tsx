"use client";

import { FiUsers, FiActivity, FiInfo, FiTrendingUp, FiPower } from "react-icons/fi";

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
    onToggleStatus: (csrId: string, currentStatus: string) => void; // ✅ New prop for status toggle
}

export default function CSRSidebar({ csrs = [], selectedCSR, onSelect, onToggleStatus }: Props) {
    return (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6 flex flex-col h-[calc(100vh-180px)] w-full">
            {/* Header */}
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
                <span className="bg-slate-100 text-slate-500 text-[10px] px-2.5 py-1.5 rounded-xl font-black uppercase">
                    {csrs.length} Agents
                </span>
            </div>

            {/* Global Overview Button */}
            <button
                onClick={() => onSelect(null)}
                className={`w-full text-left px-5 py-4 mb-6 rounded-[2rem] font-black transition-all duration-300 flex items-center justify-between group border-2 shrink-0 ${selectedCSR === null
                    ? "bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-300"
                    : "bg-white border-slate-100 text-slate-500 hover:border-indigo-200"
                    }`}
            >
                <span className="flex items-center gap-3 text-xs uppercase tracking-wider">
                    <FiActivity className={selectedCSR === null ? "text-indigo-400" : "text-slate-400"} />
                    Global Overview
                </span>
            </button>

            {/* Agent List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                {csrs.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                        <FiInfo className="mx-auto text-slate-300 mb-2" size={28} />
                        <p className="text-slate-400 text-[10px] font-black uppercase">No Agents Found</p>
                    </div>
                ) : (
                    csrs.map((csr) => {
                        const actualId = (csr._id || csr.csrId) as string;
                        const status = (csr.status || "active").toLowerCase().trim();
                        const isActive = status === "active";
                        const isSelected = selectedCSR === actualId;

                        return (
                            <div
                                key={actualId}
                                onClick={() => onSelect(actualId)}
                                className={`group relative p-6 rounded-[2.5rem] transition-all duration-300 cursor-pointer border-2 ${isSelected
                                    ? "border-[#6366f1] bg-white shadow-xl shadow-indigo-100/50"
                                    : "border-transparent bg-white shadow-sm hover:border-slate-200"
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-5">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-xl text-[#4338ca] tracking-tight truncate pr-2">
                                            {csr.name}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`h-2.5 w-2.5 rounded-full ${isActive ? 'bg-[#4ade80] shadow-[0_0_8px_#4ade80]' : 'bg-rose-500'}`}></span>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-[#059669]' : 'text-rose-600'}`}>
                                                {isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* ✅ Status Toggle Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // Card click event ko rokne ke liye
                                            onToggleStatus(actualId, status);
                                        }}
                                        title={isActive ? "Deactivate Agent" : "Activate Agent"}
                                        className={`p-2.5 rounded-xl transition-all active:scale-90 shadow-sm border ${isActive
                                                ? "bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-500 hover:text-white"
                                                : "bg-emerald-50 text-emerald-500 border-emerald-100 hover:bg-emerald-500 hover:text-white"
                                            }`}
                                    >
                                        <FiPower size={18} />
                                    </button>
                                </div>

                                {/* Stats Section */}
                                <div className="grid grid-cols-3 gap-2">
                                    <StatBox label="Leads" value={csr.totalLeads} />
                                    <StatBox label="Sales" value={csr.totalSales} color="text-[#059669]" />
                                    <StatBox label="CR %" value={`${csr.conversionRate}%`} color="text-[#4338ca]" />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </div>
    );
}

function StatBox({ label, value, color = "text-slate-700" }: { label: string, value: string | number, color?: string }) {
    return (
        <div className="bg-slate-50/50 rounded-2xl border border-slate-100 py-3 px-1 flex flex-col items-center justify-center transition-transform hover:scale-105">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">{label}</p>
            <p className={`text-sm font-black ${color}`}>{value}</p>
        </div>
    );
}