"use client";

import { useState, useMemo, useEffect } from "react";
import { toast } from "react-hot-toast";
import { deleteLead, convertLeadToSale } from "@/services/lead.api";
import {
    FiTrash2, FiUser, FiMapPin, FiCalendar, FiSearch,
    FiCheckCircle, FiFilter, FiLoader, FiClock
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

// --- Types ---
interface Lead {
    _id: string;
    name: string;
    phone: string;
    course: string;
    status?: string;
    source?: string;
    city?: string;
    remarks?: string;
    followUpDate?: string;
    createdAt?: string;
    saleAmount?: number;
    assignedTo?: { _id: string; name: string } | string | null;
}

interface LeadStats {
    totalLeads: number;
    soldLeads: number;
    totalRevenue: number;
    convRate: string;
}

interface Props {
    leads: Lead[];
    selectedCSR: string | null;
    onConvertToSale: () => void;
    onDeleteLead: () => void;
    onStatsUpdate?: (stats: LeadStats) => void;
}

type FilterPeriod = "all" | "day" | "week" | "month" | "custom";

export default function CSRLeadsPanel({
    leads = [],
    selectedCSR,
    onConvertToSale,
    onDeleteLead,
    onStatsUpdate,
}: Props) {
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [period, setPeriod] = useState<FilterPeriod>("all");
    const [customRange, setCustomRange] = useState({ start: "", end: "" });

    // --- Memoized Filtering & Stats Calculation ---
    const { filteredLeads, stats } = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        const filtered = leads.filter((lead) => {
            const leadDate = new Date(lead.createdAt || 0).getTime();

            // 1. Logic: Date Range Filter
            if (period !== "all") {
                if (period === "day" && leadDate < todayStart) return false;
                if (period === "week" && leadDate < (todayStart - 7 * 24 * 60 * 60 * 1000)) return false;
                if (period === "month" && leadDate < (todayStart - 30 * 24 * 60 * 60 * 1000)) return false;
                if (period === "custom") {
                    if (customRange.start && leadDate < new Date(customRange.start).getTime()) return false;
                    if (customRange.end && leadDate > (new Date(customRange.end).getTime() + 86399999)) return false;
                }
            }

            // 2. Logic: Text Search Filter
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm || [
                lead.name, lead.phone, lead.course, lead.city, lead.remarks
            ].some(field => field?.toLowerCase().includes(searchLower));

            if (!matchesSearch) return false;

            // 3. Logic: CSR Filter
            const leadCsrId = typeof lead.assignedTo === 'object' ? lead.assignedTo?._id : lead.assignedTo;
            if (selectedCSR && leadCsrId !== selectedCSR) return false;

            return true;
        }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

        // Stats Calculation
        const totalLeads = filtered.length;
        const soldLeads = filtered.filter(l =>
            ["paid", "sale", "sold", "converted"].includes(l.status?.toLowerCase() || "")
        ).length;
        const totalRevenue = filtered.reduce((acc, curr) => acc + (curr.saleAmount || 0), 0);
        const convRate = totalLeads > 0 ? ((soldLeads / totalLeads) * 100).toFixed(1) : "0";

        return {
            filteredLeads: filtered,
            stats: { totalLeads, soldLeads, totalRevenue, convRate }
        };
    }, [leads, selectedCSR, searchTerm, period, customRange]);

    // Sync stats with parent
    useEffect(() => {
        onStatsUpdate?.(stats);
    }, [stats, onStatsUpdate]);

    // --- Handlers ---
    const handleConvert = async (id: string) => {
        const amountStr = prompt("Enter Sale Amount (PKR):");
        if (!amountStr) return;
        const amount = Number(amountStr);
        if (isNaN(amount) || amount <= 0) return toast.error("Please enter a valid amount");

        setProcessingId(id);
        const toastId = toast.loading("Processing conversion...");
        try {
            await convertLeadToSale(id, amount);
            toast.success("Lead Converted Successfully!", { id: toastId });
            onConvertToSale();
        } catch (err: any) {
            toast.error(err.message || "Failed to convert", { id: toastId });
        } finally {
            setProcessingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        setProcessingId(id);
        try {
            await deleteLead(id);
            toast.success("Lead deleted");
            onDeleteLead();
        } catch (err: any) {
            toast.error("Error deleting lead");
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-[2.5rem] p-6 lg:p-8 shadow-sm border border-slate-100 min-h-[600px] flex flex-col">

                {/* --- Toolbar: Search & Filters --- */}
                <div className="flex flex-col xl:flex-row justify-between gap-6 mb-8">
                    <div className="space-y-1">
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                            {selectedCSR ? <FiUser className="text-indigo-600" /> : <FiClock className="text-indigo-600" />}
                            {selectedCSR ? "Performance Feed" : "Live Lead Stream"}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] px-1">
                            {filteredLeads.length} Leads matching filters
                        </p>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        {/* Search Bar */}
                        <div className="relative w-full md:w-80 group">
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Search name, phone, city..."
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/5 focus:bg-white transition-all outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Period Select */}
                        <div className="flex bg-slate-100/50 p-1.5 rounded-2xl border border-slate-100 w-full md:w-auto overflow-x-auto">
                            {(['all', 'day', 'week', 'month', 'custom'] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setPeriod(t)}
                                    className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${period === t
                                            ? "bg-white text-indigo-600 shadow-sm scale-105"
                                            : "text-slate-500 hover:bg-white/50"
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Custom Date Inputs */}
                <AnimatePresence>
                    {period === "custom" && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="flex items-center gap-3 mb-6 bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100 w-fit overflow-hidden"
                        >
                            <input
                                type="date"
                                className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold outline-none focus:ring-2 ring-indigo-500/20"
                                value={customRange.start}
                                onChange={(e) => setCustomRange(p => ({ ...p, start: e.target.value }))}
                            />
                            <span className="text-indigo-300 font-black text-[10px] uppercase">to</span>
                            <input
                                type="date"
                                className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs font-bold outline-none focus:ring-2 ring-indigo-500/20"
                                value={customRange.end}
                                onChange={(e) => setCustomRange(p => ({ ...p, end: e.target.value }))}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* --- Table Section --- */}
                <div className="flex-1 overflow-x-auto custom-scrollbar">
                    {filteredLeads.length === 0 ? (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                                <FiFilter className="text-slate-300 text-3xl" />
                            </div>
                            <h4 className="font-black text-slate-800 text-lg uppercase tracking-tight">No Data Found</h4>
                            <p className="text-slate-400 text-xs font-bold max-w-[200px] mt-2 leading-relaxed">
                                Try adjusting your filters or search terms to find what you're looking for.
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-separate border-spacing-y-3">
                            <thead>
                                <tr className="text-slate-400 text-[9px] uppercase tracking-[0.25em] font-black">
                                    <th className="px-6 py-2">Entry Date</th>
                                    <th className="px-6 py-2">Lead Contact</th>
                                    <th className="px-6 py-2">Interest</th>
                                    <th className="px-6 py-2">Status & Notes</th>
                                    <th className="px-6 py-2 text-center">Operations</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence mode="popLayout">
                                    {filteredLeads.map((lead) => {
                                        const isSold = ["paid", "sale", "sold", "converted"].includes(lead.status?.toLowerCase() || "");
                                        const isProcessing = processingId === lead._id;
                                        const csrName = typeof lead.assignedTo === 'object' ? lead.assignedTo?.name : (lead.assignedTo || "Unassigned");

                                        return (
                                            <motion.tr
                                                layout
                                                key={lead._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className={`group transition-all ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
                                            >
                                                {/* Date Column */}
                                                <td className="px-6 py-5 bg-slate-50 group-hover:bg-indigo-50/50 transition-colors rounded-l-[1.5rem] border-y border-l border-slate-100">
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-black text-slate-700">
                                                            {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : "N/A"}
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                                                            {lead.createdAt ? new Date(lead.createdAt).getFullYear() : ""}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Identity Column */}
                                                <td className="px-6 py-5 bg-slate-50 group-hover:bg-indigo-50/50 border-y border-slate-100">
                                                    <p className="font-black text-slate-800 text-sm tracking-tight mb-1 truncate max-w-[150px]">{lead.name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-indigo-600 font-black">{lead.phone}</span>
                                                        <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
                                                        <span className="text-[8px] font-black uppercase text-slate-400">{csrName}</span>
                                                    </div>
                                                </td>

                                                {/* Product Column */}
                                                <td className="px-6 py-5 bg-slate-50 group-hover:bg-indigo-50/50 border-y border-slate-100">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className="text-[9px] font-black text-indigo-700 bg-white px-2 py-1 rounded-lg border border-indigo-100 w-fit uppercase">
                                                            {lead.course || "General"}
                                                        </span>
                                                        <div className="flex items-center gap-1.5 text-[8px] font-black text-rose-500 uppercase tracking-widest">
                                                            <FiMapPin size={10} /> {lead.city || "Online"}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Status Column */}
                                                <td className="px-6 py-5 bg-slate-50 group-hover:bg-indigo-50/50 border-y border-slate-100">
                                                    {isSold ? (
                                                        <div className="flex items-center gap-3 bg-emerald-500 text-white p-1.5 pr-4 rounded-xl shadow-lg shadow-emerald-500/20 w-fit">
                                                            <div className="bg-white/20 p-1.5 rounded-lg"><FiCheckCircle /></div>
                                                            <span className="text-[10px] font-black tracking-tighter whitespace-nowrap">Rs. {lead.saleAmount?.toLocaleString()}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            <span className="text-[9px] font-black uppercase text-blue-600 tracking-[0.1em]">{lead.status || 'Active'}</span>
                                                            <p className="text-[9px] text-slate-400 italic line-clamp-1 max-w-[180px]">{lead.remarks || "No notes..."}</p>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Actions Column */}
                                                <td className="px-6 py-5 bg-slate-50 group-hover:bg-indigo-50/50 rounded-r-[1.5rem] border-y border-r border-slate-100 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {!isSold && (
                                                            <button
                                                                onClick={() => handleConvert(lead._id)}
                                                                disabled={isProcessing}
                                                                className="bg-slate-900 hover:bg-indigo-600 text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-90 flex items-center gap-2 disabled:bg-slate-300"
                                                            >
                                                                {isProcessing ? <FiLoader className="animate-spin" /> : "Convert"}
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDelete(lead._id)}
                                                            className="text-slate-300 hover:text-rose-600 transition-all p-2 hover:bg-rose-50 rounded-lg active:scale-90"
                                                        >
                                                            <FiTrash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        );
                                    })}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { height: 6px; width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            `}</style>
        </div>
    );
}