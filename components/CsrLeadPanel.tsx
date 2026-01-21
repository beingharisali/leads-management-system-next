"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { deleteLead, convertLeadToSale } from "@/services/lead.api";

interface Lead {
    _id: string;
    name: string;
    phone: string;
    course: string;
    status?: string;
    saleAmount?: number; // Added to show amount
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
            toast.success("Lead converted to sale successfully!");
            onConvertToSale();
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
            onDeleteLead();
        } catch (err: any) {
            toast.error(err.message || "Failed to delete lead");
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="bg-white rounded-[2rem] p-6 h-full flex flex-col shadow-sm border border-slate-100">
            {/* Header Section */}
            <div className="flex justify-between items-center mb-6 px-2">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">
                    {selectedCSR ? "Assigned Leads" : "All Leads Activity"}
                </h3>
                <span className="bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-tighter">
                    {filteredLeads.length} Total Records
                </span>
            </div>

            {/* Table or Empty State */}
            {filteredLeads.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[2rem] p-10 text-center">
                    <p className="text-slate-400 font-medium italic">No leads found for this view</p>
                </div>
            ) : (
                <div className="overflow-auto max-h-[600px] pr-2 custom-scrollbar">
                    <table className="w-full text-left border-separate border-spacing-y-3">
                        <thead className="sticky top-0 bg-white z-10">
                            <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-black">
                                <th className="px-4 py-2">Lead Detail</th>
                                <th className="px-4 py-2">Course</th>
                                <th className="px-4 py-2">Sale Amount</th>
                                <th className="px-4 py-2">CSR</th>
                                <th className="px-4 py-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLeads.map((lead) => (
                                <tr key={lead._id} className="group">
                                    {/* Detail */}
                                    <td className="px-4 py-4 bg-slate-50 group-hover:bg-slate-100/50 transition-colors rounded-l-2xl border-y border-l border-slate-100/50">
                                        <p className="font-bold text-slate-800 text-sm">{lead.name}</p>
                                        <p className="text-xs text-indigo-500 font-mono mt-0.5">{lead.phone}</p>
                                    </td>

                                    {/* Course */}
                                    <td className="px-4 py-4 bg-slate-50 group-hover:bg-slate-100/50 transition-colors border-y border-slate-100/50">
                                        <span className="text-[10px] font-black text-slate-600 bg-white px-2 py-1 rounded-md border border-slate-200 uppercase tracking-tighter">
                                            {lead.course}
                                        </span>
                                    </td>

                                    {/* AMOUNT COLUMN (NEW) */}
                                    <td className="px-4 py-4 bg-slate-50 group-hover:bg-slate-100/50 transition-colors border-y border-slate-100/50">
                                        {lead.status === "converted" ? (
                                            <div className="flex flex-col">
                                                <span className="text-emerald-600 font-black text-sm">
                                                    PKR {lead.saleAmount?.toLocaleString() || "0"}
                                                </span>
                                                <span className="text-[9px] text-emerald-400 uppercase font-bold tracking-tighter">Received</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-300 text-xs italic">Pending</span>
                                        )}
                                    </td>

                                    {/* CSR */}
                                    <td className="px-4 py-4 bg-slate-50 group-hover:bg-slate-100/50 transition-colors border-y border-slate-100/50 text-xs font-bold text-slate-500">
                                        {lead.assignedTo?.name || "Unassigned"}
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-4 bg-slate-50 group-hover:bg-slate-100/50 transition-colors rounded-r-2xl border-y border-r border-slate-100/50 text-center">
                                        <div className="flex justify-center gap-2">
                                            {lead.status === "converted" ? (
                                                <span className="bg-emerald-100 text-emerald-600 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tight border border-emerald-200">
                                                    ✓ Sold Out
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleConvert(lead._id)}
                                                    disabled={processingId !== null}
                                                    className="bg-slate-900 hover:bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all disabled:opacity-50"
                                                >
                                                    {processingId === lead._id ? "..." : "Convert"}
                                                </button>
                                            )}

                                            <button
                                                onClick={() => handleDelete(lead._id)}
                                                disabled={processingId !== null}
                                                className="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all disabled:opacity-50"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}