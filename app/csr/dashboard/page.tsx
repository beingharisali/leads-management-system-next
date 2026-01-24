"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getLeadsByRole, updateLead } from "@/services/lead.api";
import { getCSRStats } from "@/services/dashboard.api";
import SummaryCard from "@/components/SummaryCard";
import CSRStatsChart from "@/components/CSRStatsChart";
import Loading from "@/components/Loading";
import { getUserRole, getUserId, logout } from "@/utils/decodeToken";
import toast, { Toaster } from "react-hot-toast";
import { motion } from "framer-motion";
import {
    FiLogOut, FiCheckCircle, FiPhone, FiDollarSign, FiSearch, FiMessageSquare
} from "react-icons/fi";

type FilterRange = "day" | "week" | "month" | "custom";

// ✅ Backend Enum ke mutabiq Lowercase Types
type LeadStatus = "new" | "contacted" | "interested" | "converted" | "sale" | "rejected" | "follow-up" | "paid" | "not pick" | "busy" | "wrong number";

interface Lead {
    _id: string;
    name: string;
    course: string;
    phone: string;
    status: LeadStatus;
    remarks?: string;
    followUpDate?: string;
    createdAt: string;
    saleAmount?: number;
}

export default function CSRDashboard() {
    const router = useRouter();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState<FilterRange>("day");
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [stats, setStats] = useState({
        totalLeads: 0,
        totalSales: 0,
        conversionRate: "0%",
        leadsStats: { day: 0, week: 0, month: 0 },
        salesStats: { day: 0, week: 0, month: 0 },
    });

    // ✅ Dashboard ke liye simplified options
    const statusOptions: LeadStatus[] = ["new", "not pick", "interested", "follow-up", "paid", "rejected", "busy"];

    const fetchData = useCallback(async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            const [role, userId] = await Promise.all([getUserRole(), getUserId()]);
            if (!role || !userId) {
                logout();
                return router.push("/login");
            }

            const [leadsRes, statsRes]: [any, any] = await Promise.all([
                getLeadsByRole(role, userId),
                getCSRStats(filter === "custom" ? "month" : filter),
            ]);

            setLeads(Array.isArray(leadsRes) ? (leadsRes as Lead[]) : []);
            if (statsRes) setStats(statsRes);
        } catch (err: any) {
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    }, [filter, router]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleUpdate = async (id: string, data: Partial<Lead>) => {
        // ✅ Payload ko hamesha lowercase bhejien backend validation ke liye
        let updatePayload: any = { ...data };
        if (data.status) updatePayload.status = data.status.toLowerCase();

        if (updatePayload.status === "paid" || updatePayload.status === "sale") {
            const amount = prompt("Enter Sale Amount:");
            if (amount === null) return;

            if (!amount || isNaN(Number(amount))) {
                toast.error("Valid amount is required for Paid status");
                return;
            }
            updatePayload.saleAmount = Number(amount);
        }

        const tid = toast.loading("Updating lead...");
        try {
            await updateLead(id, updatePayload);

            // ✅ Local State Update
            setLeads(prev => prev.map(l => l._id === id ? { ...l, ...updatePayload } : l));
            toast.success("Lead Updated!", { id: tid });

            if (data.status) fetchData(true);
        } catch (err) {
            toast.error("Update failed. Check backend console.", { id: tid });
        }
    };

    const filteredLeads = useMemo(() => {
        return leads.filter((lead) => {
            const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || lead.phone.includes(searchTerm);
            if (!matchesSearch) return false;

            const leadDate = new Date(lead.createdAt).setHours(0, 0, 0, 0);
            if (filter === "custom" && startDate && endDate) {
                const start = new Date(startDate).setHours(0, 0, 0, 0);
                const end = new Date(endDate).setHours(0, 0, 0, 0);
                return leadDate >= start && leadDate <= end;
            }

            const diffInDays = (Date.now() - leadDate) / (1000 * 3600 * 24);
            if (filter === "day") return diffInDays <= 1;
            if (filter === "week") return diffInDays <= 7;
            if (filter === "month") return diffInDays <= 30;
            return true;
        });
    }, [leads, searchTerm, filter, startDate, endDate]);

    const myMetrics = useMemo(() => {
        const sales = filteredLeads.filter(l => l.status === "paid" || l.status === "sale");
        const revenue = sales.reduce((sum, l) => sum + (l.saleAmount || 0), 0);
        const rate = filteredLeads.length > 0 ? ((sales.length / filteredLeads.length) * 100).toFixed(1) + "%" : "0%";
        return { revenue, salesCount: sales.length, rate };
    }, [filteredLeads]);

    if (loading) return <Loading />;

    return (
        <ProtectedRoute role="csr">
            <Toaster position="top-right" />
            <div className="min-h-screen bg-[#F4F7FE] p-4 lg:p-10 font-sans">

                {/* --- Header --- */}
                <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">CSR Dashboard</h1>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                placeholder="Search leads..."
                                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border-none shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <button onClick={() => logout()} className="p-3 bg-white text-rose-500 rounded-2xl shadow-sm hover:bg-rose-50 transition-all">
                            <FiLogOut size={20} />
                        </button>
                    </div>
                </div>

                {/* --- Metrics --- */}
                <div className="max-w-[1600px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <SummaryCard title="Leads Found" value={filteredLeads.length} icon={<FiPhone />} color="blue" />
                    <SummaryCard title="Revenue" value={`$${myMetrics.revenue.toLocaleString()}`} icon={<FiDollarSign />} color="green" />
                    <SummaryCard title="Conv. Rate" value={myMetrics.rate} icon={<FiCheckCircle />} color="purple" />
                </div>

                {/* --- Filters --- */}
                <div className="max-w-[1600px] mx-auto flex flex-wrap items-center gap-4 bg-white p-5 rounded-[2rem] shadow-sm mb-8">
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        {(["day", "week", "month", "custom"] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setFilter(t)}
                                className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${filter === t ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
                            >
                                {t.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {filter === "custom" && (
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-slate-50 border-none rounded-lg p-2 text-xs font-bold text-slate-600 outline-none ring-1 ring-slate-200" />
                            <span className="text-slate-400 text-xs font-bold px-1">TO</span>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-slate-50 border-none rounded-lg p-2 text-xs font-bold text-slate-600 outline-none ring-1 ring-slate-200" />
                        </motion.div>
                    )}
                </div>

                {/* --- Table --- */}
                <div className="max-w-[1600px] mx-auto bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-slate-100">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-widest font-black">
                                    <th className="px-6 py-6">Date</th>
                                    <th className="px-6 py-6">Name</th>
                                    <th className="px-6 py-6">Number</th>
                                    <th className="px-6 py-6">Course</th>
                                    <th className="px-6 py-6">Status</th>
                                    <th className="px-6 py-6">Remarks</th>
                                    <th className="px-6 py-6">Follow-up</th>
                                    <th className="px-6 py-6 text-center">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredLeads.map((lead) => (
                                    <tr key={lead._id} className="hover:bg-slate-50/50 transition-all">
                                        <td className="px-6 py-5 text-xs text-slate-500 font-medium">
                                            {new Date(lead.createdAt).toLocaleDateString('en-GB')}
                                        </td>
                                        <td className="px-6 py-5 font-bold text-slate-800">{lead.name}</td>
                                        <td className="px-6 py-5 text-sm font-semibold text-blue-600">{lead.phone}</td>
                                        <td className="px-6 py-5 text-sm text-slate-600 font-medium">{lead.course}</td>
                                        <td className="px-6 py-5">
                                            <select
                                                value={lead.status.toLowerCase()}
                                                onChange={(e) => handleUpdate(lead._id, { status: e.target.value as LeadStatus })}
                                                className={`text-[10px] font-black uppercase px-3 py-2 rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-blue-500 cursor-pointer
                                                    ${lead.status === 'paid' ? 'bg-green-100 text-green-700' :
                                                        lead.status === 'interested' ? 'bg-blue-100 text-blue-700' :
                                                            lead.status === 'not pick' ? 'bg-orange-100 text-orange-700' :
                                                                'bg-slate-100 text-slate-600'}`}
                                            >
                                                {statusOptions.map(opt => <option key={opt} value={opt}>{opt.toUpperCase()}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <FiMessageSquare className="text-slate-300" />
                                                <input
                                                    defaultValue={lead.remarks}
                                                    onBlur={(e) => handleUpdate(lead._id, { remarks: e.target.value })}
                                                    placeholder="Add note..."
                                                    className="bg-transparent border-b border-transparent focus:border-blue-400 outline-none text-sm text-slate-600 w-full transition-all"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <input
                                                type="date"
                                                defaultValue={lead.followUpDate ? lead.followUpDate.split('T')[0] : ""}
                                                onChange={(e) => handleUpdate(lead._id, { followUpDate: e.target.value })}
                                                className="bg-slate-50 border-none text-[11px] font-bold text-slate-500 rounded-lg p-1 outline-none focus:ring-1 focus:ring-blue-400"
                                            />
                                        </td>
                                        <td className="px-6 py-5 text-center font-bold text-slate-700">
                                            {lead.saleAmount ? <span className="text-green-600">${lead.saleAmount}</span> : "-"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- Graphs --- */}
                <div className="max-w-[1600px] mx-auto grid lg:grid-cols-2 gap-8 mt-10">
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                        <CSRStatsChart title="Lead Generation Trend" day={stats.leadsStats.day} week={stats.leadsStats.week} month={stats.leadsStats.month} />
                    </div>
                    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
                        <CSRStatsChart title="Sales Conversion Trend" day={stats.salesStats.day} week={stats.salesStats.week} month={stats.salesStats.month} />
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}