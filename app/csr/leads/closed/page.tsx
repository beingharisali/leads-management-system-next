"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import SummaryCard from "@/components/SummaryCard";
import Loading from "@/components/Loading";
import { getLeadsByRole, Lead } from "@/services/lead.api";
import { getUserId } from "@/utils/decodeToken";
import { isClosedStatus } from "@/utils/leadStatus";
import toast, { Toaster } from "react-hot-toast";
import {
    FiArrowLeft, FiCheckCircle, FiSlash, FiPhoneOff, FiArchive, FiDollarSign, FiSearch,
    FiChevronLeft, FiChevronRight
} from "react-icons/fi";

type ClosedTab = "all" | "paid" | "not interested" | "wrong number";

const TABS: { key: ClosedTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "paid", label: "Paid" },
    { key: "not interested", label: "Not Interested" },
    { key: "wrong number", label: "Wrong Number" },
];

const PAGE_SIZE = 50;

// Legacy "sale"/"converted" records count as paid.
const bucketOf = (status: string): Exclude<ClosedTab, "all"> => {
    const s = status.toLowerCase();
    if (s === "not interested" || s === "wrong number") return s;
    return "paid";
};

const BADGE: Record<Exclude<ClosedTab, "all">, string> = {
    "paid": "bg-green-100 text-green-700",
    "not interested": "bg-orange-100 text-orange-700",
    "wrong number": "bg-rose-100 text-rose-700",
};

// Agent's closed leads (Paid / Not Interested / Wrong Number). These drop
// off the working dashboard once closed and are read-only here.
export default function ClosedLeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<ClosedTab>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [page, setPage] = useState(1);

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const userId = await getUserId();
            if (!userId) throw new Error("User session not found");
            const res = await getLeadsByRole("csr", undefined, userId);
            setLeads((Array.isArray(res) ? res : []).filter(l => isClosedStatus(l.status)));
        } catch (err: any) {
            toast.error(err.message || "Failed to load closed leads");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchLeads(); }, [fetchLeads]);
    useEffect(() => { setPage(1); }, [tab, searchTerm]);

    const stats = useMemo(() => {
        const paid = leads.filter(l => bucketOf(l.status) === "paid");
        return {
            total: leads.length,
            paid: paid.length,
            revenue: paid.reduce((sum, l) => sum + (l.saleAmount || 0), 0),
            notInterested: leads.filter(l => bucketOf(l.status) === "not interested").length,
            wrongNumber: leads.filter(l => bucketOf(l.status) === "wrong number").length,
        };
    }, [leads]);

    const filteredLeads = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return leads
            .filter(l => tab === "all" || bucketOf(l.status) === tab)
            .filter(l => (l.name?.toLowerCase() || "").includes(term) || (l.phone || "").includes(searchTerm))
            .sort((a, b) =>
                new Date(b.statusUpdatedAt || b.createdAt).getTime() -
                new Date(a.statusUpdatedAt || a.createdAt).getTime()
            );
    }, [leads, tab, searchTerm]);

    const totalPages = Math.max(Math.ceil(filteredLeads.length / PAGE_SIZE), 1);
    const paginatedLeads = filteredLeads.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    if (loading) return <Loading />;

    return (
        <ProtectedRoute role="csr">
            <Toaster position="top-right" />
            <div className="min-h-screen bg-[#F4F7FE] p-4 lg:p-10">
                <div className="max-w-[1600px] mx-auto mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div>
                        <Link href="/csr/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 mb-2">
                            <FiArrowLeft /> Back to Dashboard
                        </Link>
                        <h1 className="text-3xl font-black text-slate-900">Closed Leads</h1>
                        <p className="text-slate-500 text-sm font-medium">
                            Leads marked Paid, Not Interested or Wrong Number
                        </p>
                    </div>
                    <div className="relative w-full md:w-64">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            placeholder="Search by name/phone..."
                            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="max-w-[1600px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                    <SummaryCard title="Total Closed" value={stats.total.toString()} icon={<FiArchive />} color="purple" />
                    <SummaryCard title="Paid" value={stats.paid.toString()} icon={<FiCheckCircle />} color="green" />
                    <SummaryCard title="Revenue" value={stats.revenue.toLocaleString()} icon={<FiDollarSign />} color="green" />
                    <SummaryCard title="Not Interested" value={stats.notInterested.toString()} icon={<FiSlash />} color="orange" />
                    <SummaryCard title="Wrong Number" value={stats.wrongNumber.toString()} icon={<FiPhoneOff />} color="rose" />
                </div>

                {/* Status tabs */}
                <div className="max-w-[1600px] mx-auto mb-4 flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-fit">
                    {TABS.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${tab === t.key ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50"}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <div className="max-w-[1600px] mx-auto bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-100">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                                <tr>
                                    <th className="px-6 py-5">Closed On</th>
                                    <th className="px-6 py-5">Lead Name</th>
                                    <th className="px-6 py-5">Phone</th>
                                    <th className="px-6 py-5">Course</th>
                                    <th className="px-6 py-5">City/Source</th>
                                    <th className="px-6 py-5">Status</th>
                                    <th className="px-6 py-5">Remarks</th>
                                    <th className="px-6 py-5 text-center">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedLeads.length > 0 ? paginatedLeads.map(lead => {
                                    const bucket = bucketOf(lead.status);
                                    return (
                                        <tr key={lead._id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 text-xs font-medium text-slate-500">
                                                {new Date(lead.statusUpdatedAt || lead.createdAt).toLocaleDateString("en-GB")}
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-800">{lead.name}</td>
                                            <td className="px-6 py-4 text-sm text-blue-600 font-semibold">{lead.phone}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{lead.course}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{lead.source || "N/A"}</div>
                                                <div className="text-xs font-semibold text-slate-600">{lead.city || "No City"}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-black uppercase px-3 py-2 rounded-xl ${BADGE[bucket]}`}>
                                                    {bucket}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-slate-600">{lead.remarks || "-"}</td>
                                            <td className="px-6 py-4 text-center font-bold text-green-600">{lead.saleAmount ? lead.saleAmount : "-"}</td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan={8} className="text-center py-20 text-slate-400">No closed leads found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {totalPages > 1 && (
                        <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Page <span className="text-slate-900">{page}</span> of {totalPages}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
                                >
                                    <FiChevronLeft size={20} />
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
                                >
                                    <FiChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
