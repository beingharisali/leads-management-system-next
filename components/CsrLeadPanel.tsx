"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { deleteLead, convertLeadToSale } from "@/services/lead.api";
import { FiCheckCircle, FiTrash2, FiDollarSign, FiUser } from "react-icons/fi";

interface Lead {
    _id: string;
    name: string;
    phone: string;
    course: string;
    status?: string;
    saleAmount?: number;
    amount?: number; // Dono fields handle karne ke liye
    assignedTo?: { _id: string; name: string } | null;
}

interface Props {
    leads: Lead[];
    selectedCSR: string | null;
    onConvertToSale: () => void;
    onDeleteLead: () => void;
}

export default function CSRLeadsPanel({
    leads,
    selectedCSR,
    onConvertToSale,
    onDeleteLead,
}: Props) {
    const [processingId, setProcessingId] = useState<string | null>(null);

    const filteredLeads = selectedCSR
        ? leads.filter((lead) => lead.assignedTo?._id === selectedCSR)
        : leads;

    /* ================= ACTIONS ================= */

    const handleConvert = async (id: string) => {
        const amount = prompt("Enter Sale Amount (PKR):", "0");
        if (amount === null || amount === "" || isNaN(Number(amount))) {
            toast.error("Please enter a valid amount");
            return;
        }

        setProcessingId(id);
        try {
            await convertLeadToSale(id, Number(amount));
            toast.success("Lead converted to sale!");
            onConvertToSale(); // Refresh dashboard data
        } catch (err: any) {
            toast.error(err.message || "Failed to convert lead");
        } finally {
            setProcessingId(null);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this lead?")) return;

        setProcessingId(id);
        try {
            await deleteLead(id);
            toast.success("Lead deleted successfully");
            onDeleteLead(); // Refresh dashboard data
        } catch (err: any) {
            toast.error(err.message || "Failed to delete lead");
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="bg-white rounded-[2.5rem] p-6 h-full flex flex-col shadow-sm border border-slate-100">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 px-2">
                <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">
                        {selectedCSR ? "CSR Performance" : "Lead Activities"}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                        Real-time Data Tracking
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-tighter">
                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                    {filteredLeads.length} Records
                </div>
            </div>

            {/* Content */}
            {filteredLeads.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[2.5rem] p-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <FiUser className="text-slate-200 text-2xl" />
                    </div>
                    <p className="text-slate-400 font-bold text-sm tracking-tight">No data available for this view</p>
                </div>
            ) : (
                <div className="overflow-auto max-h-[650px] pr-2 custom-scrollbar">
                    <table className="w-full text-left border-separate border-spacing-y-3">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="text-slate-400 text-[10px] uppercase tracking-[0.15em] font-black">
                                <th className="px-5 py-3">Lead Identity</th>
                                <th className="px-5 py-3">Interest</th>
                                <th className="px-5 py-3">Revenue status</th>
                                <th className="px-5 py-3">Ownership</th>
                                <th className="px-5 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeads.map((lead) => {
                                const isSold = lead.status?.toLowerCase() === "sale" || lead.status?.toLowerCase() === "converted";
                                const currentAmount = lead.saleAmount || lead.amount || 0;

                                return (
                                    <tr key={lead._id} className="group">
                                        {/* Identity */}
                                        <td className="px-5 py-5 bg-slate-50/50 group-hover:bg-white group-hover:shadow-md transition-all rounded-l-[1.5rem] border-y border-l border-slate-100/50">
                                            <p className="font-black text-slate-800 text-sm leading-none">{lead.name}</p>
                                            <p className="text-[11px] text-indigo-500 font-bold mt-1.5">{lead.phone}</p>
                                        </td>

                                        {/* Course */}
                                        <td className="px-5 py-5 bg-slate-50/50 group-hover:bg-white group-hover:shadow-md transition-all border-y border-slate-100/50">
                                            <span className="text-[10px] font-black text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 uppercase tracking-tighter group-hover:border-indigo-100 group-hover:text-indigo-600 transition-colors">
                                                {lead.course}
                                            </span>
                                        </td>

                                        {/* Revenue Status */}
                                        <td className="px-5 py-5 bg-slate-50/50 group-hover:bg-white group-hover:shadow-md transition-all border-y border-slate-100/50">
                                            {isSold ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="p-1.5 bg-emerald-100 rounded-lg">
                                                        <FiDollarSign className="text-emerald-600 text-xs" />
                                                    </div>
                                                    <div>
                                                        <p className="text-emerald-600 font-black text-sm leading-none">
                                                            {new Intl.NumberFormat('en-PK').format(currentAmount)}
                                                        </p>
                                                        <p className="text-[9px] text-emerald-400 uppercase font-black mt-0.5">Success</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 text-[10px] font-black uppercase italic tracking-widest">In Pipeline</span>
                                            )}
                                        </td>

                                        {/* CSR */}
                                        <td className="px-5 py-5 bg-slate-50/50 group-hover:bg-white group-hover:shadow-md transition-all border-y border-slate-100/50 text-[11px] font-black text-slate-400 uppercase">
                                            {lead.assignedTo?.name || "Unassigned"}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-5 py-5 bg-slate-50/50 group-hover:bg-white group-hover:shadow-md transition-all rounded-r-[1.5rem] border-y border-r border-slate-100/50 text-center">
                                            <div className="flex justify-center gap-2">
                                                {isSold ? (
                                                    <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black border border-emerald-100">
                                                        <FiCheckCircle /> SOLD
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleConvert(lead._id)}
                                                        disabled={processingId !== null}
                                                        className="bg-slate-900 hover:bg-indigo-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-20 active:scale-95"
                                                    >
                                                        {processingId === lead._id ? "..." : "Convert"}
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => handleDelete(lead._id)}
                                                    disabled={processingId !== null}
                                                    className="p-2.5 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all disabled:opacity-20"
                                                    title="Delete Lead"
                                                >
                                                    <FiTrash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}