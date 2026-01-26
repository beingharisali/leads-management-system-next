"use client";

import { useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import { deleteLead, convertLeadToSale } from "@/services/lead.api";
import {
    FiTrash2, FiDollarSign, FiUser,
    FiMapPin, FiLink, FiCalendar, FiSearch, FiCheckCircle
} from "react-icons/fi";

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
    saleAmount?: number;
    assignedTo?: { _id: string; name: string } | string | null;
}

interface Props {
    leads: Lead[];
    selectedCSR: string | null;
    onConvertToSale: () => void;
    onDeleteLead: () => void;
}

export default function CSRLeadsPanel({
    leads = [],
    selectedCSR,
    onConvertToSale,
    onDeleteLead,
}: Props) {
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredLeads = useMemo(() => {
        return leads.filter((lead) => {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch =
                (lead.name?.toLowerCase() || "").includes(searchLower) ||
                (lead.phone || "").includes(searchTerm) ||
                (lead.course?.toLowerCase() || "").includes(searchLower) ||
                (lead.city?.toLowerCase() || "").includes(searchLower) ||
                (lead.remarks?.toLowerCase() || "").includes(searchLower);

            if (!matchesSearch) return false;
            if (!selectedCSR) return true;

            const leadCsrId = typeof lead.assignedTo === 'object'
                ? lead.assignedTo?._id
                : lead.assignedTo;

            return leadCsrId === selectedCSR;
        });
    }, [leads, selectedCSR, searchTerm]);

    const handleConvert = async (id: string) => {
        const amountStr = prompt("Enter Sale Amount (PKR):");
        if (amountStr === null) return;
        const amount = Number(amountStr);
        if (!amountStr || isNaN(amount) || amount <= 0) {
            toast.error("Please enter a valid sale amount");
            return;
        }
        const toastId = toast.loading("Processing payment...");
        setProcessingId(id);
        try {
            await convertLeadToSale(id, amount);
            toast.success("Payment Recorded Successfully!", { id: toastId });
            onConvertToSale();
        } catch (err: any) {
            toast.error(err.message || "Failed to convert lead", { id: toastId });
        } finally {
            setProcessingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to wipe this lead?")) return;
        const toastId = toast.loading("Deleting lead...");
        setProcessingId(id);
        try {
            await deleteLead(id);
            toast.success("Lead wiped from system", { id: toastId });
            onDeleteLead();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete lead", { id: toastId });
        } finally {
            setProcessingId(null);
        }
    };

    return (
        /* Change: Added 'relative z-0' and ensured padding is consistent */
        <div className="bg-white rounded-[2.5rem] p-6 md:p-10 min-h-[500px] flex flex-col shadow-sm border border-slate-100 transition-all mb-12 relative z-0">

            {/* Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6 px-2">
                <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight italic">
                        {selectedCSR ? "CSR Performance" : "Global Lead Feed"}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">
                        Live Lead Stream
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                    <div className="relative flex-1 min-w-[280px]">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search name, phone, city..."
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 px-5 py-3 rounded-2xl text-[11px] font-black text-indigo-600 shadow-sm">
                        <FiCheckCircle className={processingId ? "animate-spin" : "animate-pulse"} />
                        {filteredLeads.length} Leads Found
                    </div>
                </div>
            </div>

            {/* Table Content */}
            {filteredLeads.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[3rem] py-20 text-center bg-slate-50/30">
                    <FiSearch className="text-slate-200 text-5xl mb-4" />
                    <p className="text-slate-400 font-black text-sm uppercase tracking-widest">No matching leads</p>
                </div>
            ) : (
                <div className="w-full overflow-visible"> {/* Change: overflow-visible for tooltips/dropdowns */}
                    <div className="overflow-x-auto pb-6">
                        <table className="w-full text-left border-separate border-spacing-y-4"> {/* Increased spacing */}
                            <thead>
                                <tr className="text-slate-400 text-[9px] uppercase tracking-[0.2em] font-black">
                                    <th className="px-6 py-2">Identity</th>
                                    <th className="px-6 py-2">Details</th>
                                    <th className="px-6 py-2">City / Date</th>
                                    <th className="px-6 py-2">Current Status</th>
                                    <th className="px-6 py-2 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLeads.map((lead) => {
                                    const statusLower = lead.status?.toLowerCase();
                                    const isSold = ["paid", "sale", "sold", "converted"].includes(statusLower || "");
                                    const isProcessing = processingId === lead._id;
                                    const csrName = typeof lead.assignedTo === 'object'
                                        ? lead.assignedTo?.name
                                        : (lead.assignedTo ? "Assigned" : "Unassigned");

                                    return (
                                        <tr key={lead._id} className={`group transition-all duration-300 ${isProcessing ? 'opacity-40' : ''}`}>
                                            <td className="px-6 py-5 bg-slate-50/50 group-hover:bg-white group-hover:shadow-xl group-hover:shadow-indigo-500/5 transition-all rounded-l-3xl border-y border-l border-slate-100">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-800 text-sm">{lead.name || "N/A"}</span>
                                                    <span className="text-[10px] text-indigo-500 font-bold">{lead.phone}</span>
                                                    <span className="text-[8px] mt-1 font-black uppercase flex items-center gap-1 text-slate-400">
                                                        <FiUser size={10} className={lead.assignedTo ? "text-indigo-400" : "text-amber-400"} />
                                                        {csrName}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="px-6 py-5 bg-slate-50/50 group-hover:bg-white border-y border-slate-100">
                                                <div className="flex flex-col gap-1">
                                                    <span className="w-fit text-[9px] font-black text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100 uppercase">
                                                        {lead.course || "General"}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-[9px] font-bold text-slate-500">
                                                        <FiLink size={10} /> {lead.source || "Direct"}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="px-6 py-5 bg-slate-50/50 group-hover:bg-white border-y border-slate-100">
                                                <div className="flex flex-col">
                                                    <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-700 uppercase">
                                                        <FiCalendar className="text-indigo-500" />
                                                        {lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString() : "Pending"}
                                                    </span>
                                                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 italic">
                                                        <FiMapPin size={10} /> {lead.city || "Unknown"}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="px-6 py-5 bg-slate-50/50 group-hover:bg-white border-y border-slate-100">
                                                {isSold ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-2 bg-emerald-100 rounded-lg">
                                                            <FiDollarSign size={14} className="text-emerald-600" />
                                                        </div>
                                                        <div>
                                                            <p className="text-emerald-700 font-black text-sm leading-none">
                                                                {lead.saleAmount?.toLocaleString()}
                                                            </p>
                                                            <p className="text-[8px] text-emerald-500 uppercase font-black">Verified Sale</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col max-w-[150px]">
                                                        <span className={`text-[9px] font-black uppercase tracking-wider ${statusLower === 'interested' ? 'text-blue-500' : 'text-slate-400'}`}>
                                                            {lead.status || 'New Lead'}
                                                        </span>
                                                        <p className="text-[9px] text-slate-500 font-medium line-clamp-1 italic">
                                                            {lead.remarks || "No comments..."}
                                                        </p>
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-6 py-5 bg-slate-50/50 group-hover:bg-white group-hover:shadow-xl group-hover:shadow-indigo-500/5 transition-all rounded-r-3xl border-y border-r border-slate-100 text-center">
                                                <div className="flex justify-center gap-2">
                                                    {!isSold && (
                                                        <button
                                                            onClick={() => handleConvert(lead._id)}
                                                            className="bg-slate-900 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                                        >
                                                            Convert
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(lead._id)}
                                                        className="p-2.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                    >
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}