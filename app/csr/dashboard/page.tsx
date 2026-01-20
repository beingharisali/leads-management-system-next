"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
    getLeadsByRole,
    deleteLead,
    convertLeadToSale,
    createLead,
    updateLead,
} from "@/services/lead.api";
import { getCSRStats } from "@/services/dashboard.api";
import SummaryCard from "@/components/SummaryCard";
import CSRStatsChart from "@/components/CSRStatsChart";
import Loading from "@/components/Loading";
import ErrorMessage from "@/components/ErrorMessage";
import { getUserRole, getUserId, logout, getToken } from "@/utils/decodeToken";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlus, FiLogOut, FiEdit2, FiTrash2, FiCheckCircle, FiPhone, FiBookOpen, FiUser, FiDollarSign, FiClock } from "react-icons/fi";

type Filter = "day" | "week" | "month";

interface Lead {
    _id: string;
    name: string;
    course: string;
    phone: string;
    status?: "new" | "contacted" | "converted";
    saleAmount?: number; // Backend se amount yahan aayega
    createdAt?: string;
}

export default function CSRDashboard() {
    const router = useRouter();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [stats, setStats] = useState({
        totalLeads: 0,
        totalSales: 0,
        conversionRate: "0%",
        leadsStats: { day: 0, week: 0, month: 0 },
        salesStats: { day: 0, week: 0, month: 0 },
    });

    const [filter, setFilter] = useState<Filter>("day");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [leadForm, setLeadForm] = useState({ name: "", course: "", phone: "" });

    // ================= DYNAMIC FILTERING LOGIC =================
    const filteredLeads = useMemo(() => {
        if (!leads.length) return [];
        const now = new Date();
        return leads.filter((lead) => {
            const leadDate = new Date(lead.createdAt || Date.now());
            const diffInTime = now.getTime() - leadDate.getTime();
            const diffInDays = diffInTime / (1000 * 3600 * 24);

            if (filter === "day") return diffInDays <= 1;
            if (filter === "week") return diffInDays <= 7;
            if (filter === "month") return diffInDays <= 30;
            return true;
        });
    }, [leads, filter]);

    const fetchData = async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const role = await getUserRole();
            const userId = await getUserId();
            if (!role || !userId) throw new Error("Authentication failed");

            const [leadsRes, statsRes] = await Promise.all([
                getLeadsByRole(role, userId),
                getCSRStats(filter),
            ]);

            // Backend response map karein
            setLeads((leadsRes as Lead[]) || []);
            setStats({
                totalLeads: statsRes?.totalLeads ?? 0,
                totalSales: statsRes?.totalSales ?? 0,
                conversionRate: statsRes?.conversionRate ?? "0%",
                leadsStats: statsRes?.leadsStats ?? { day: 0, week: 0, month: 0 },
                salesStats: statsRes?.salesStats ?? { day: 0, week: 0, month: 0 },
            });
        } catch (err: any) {
            setError(err.message || "Failed to load dashboard");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filter]);

    // ================= ACTIONS =================
    const handleConvertToSale = async (id: string) => {
        const amount = prompt("Enter Sale Amount (e.g. 50000):");
        if (!amount || isNaN(Number(amount))) {
            return toast.error("Please enter a valid numeric amount");
        }

        try {
            toast.loading("Converting...", { id: "convert" });
            await convertLeadToSale(id, Number(amount));
            toast.success("Lead Converted! 🚀", { id: "convert" });

            // Critical: Force data refresh from server to see the amount
            await fetchData(true);
        } catch (err) {
            toast.error("Conversion failed", { id: "convert" });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this lead?")) return;
        try {
            await deleteLead(id);
            toast.success("Lead removed");
            fetchData(true);
        } catch (err) { toast.error("Delete failed"); }
    };

    const handleLeadFormSubmit = async () => {
        if (leadForm.name.length < 3 || leadForm.phone.length < 11) {
            return toast.error("Invalid Name or Phone Number");
        }
        try {
            const userId = await getUserId();
            const payload = { ...leadForm, assignedTo: userId, createdBy: userId, source: "manual" };

            editingLead
                ? await updateLead(editingLead._id, payload as any)
                : await createLead(payload as any);

            toast.success(editingLead ? "Updated" : "Created");
            setIsModalOpen(false);
            fetchData(true);
        } catch (err) { toast.error("Operation failed"); }
    };

    const handleLogout = () => { logout(); router.push("/login"); };

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <ProtectedRoute role="csr">
            <Toaster position="top-right" />
            <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">

                {/* Header */}
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <h1 className="text-4xl font-black text-slate-800">CSR Dashboard</h1>
                        <p className="text-slate-500 font-medium flex items-center gap-2">
                            <FiClock className="text-blue-500" /> Currently viewing <span className="font-bold text-blue-600 underline capitalize">{filter}ly</span> data
                        </p>
                    </motion.div>
                    <button onClick={handleLogout} className="flex items-center gap-2 bg-white border border-slate-200 px-6 py-2.5 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all font-bold shadow-sm">
                        <FiLogOut /> Logout
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <SummaryCard title={`Leads (${filter})`} value={filteredLeads.length} />
                    <SummaryCard title="Total Sales" value={stats.totalSales} />
                    <SummaryCard title="Conversion %" value={stats.conversionRate} />
                </div>

                {/* Action Bar */}
                <div className="max-w-7xl mx-auto bg-white p-5 rounded-[2rem] shadow-sm border flex flex-wrap justify-between items-center gap-4 mb-10">
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                        {["day", "week", "month"].map((f) => (
                            <button key={f} onClick={() => setFilter(f as Filter)} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${filter === f ? "bg-white text-blue-600 shadow-sm scale-105" : "text-slate-500"}`}>
                                {f.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <button onClick={() => { setEditingLead(null); setLeadForm({ name: "", course: "", phone: "" }); setIsModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
                        <FiPlus /> Add Manual Lead
                    </button>
                </div>

                {/* Leads Table */}
                <div className="max-w-7xl mx-auto bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden mb-10">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b">
                                    <th className="px-8 py-5">Prospect Info</th>
                                    <th className="px-8 py-5">Enrolled Course</th>
                                    <th className="px-8 py-5 text-center">Sale Amount</th>
                                    <th className="px-8 py-5 text-center">Status</th>
                                    <th className="px-8 py-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredLeads.map((lead) => (
                                    <tr key={lead._id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-slate-700">{lead.name}</div>
                                            <div className="text-xs text-slate-400 font-mono">{lead.phone}</div>
                                        </td>
                                        <td className="px-8 py-5 text-slate-500 font-medium">{lead.course}</td>
                                        <td className="px-8 py-5 text-center">
                                            {lead.status === 'converted' ? (
                                                <div className="inline-flex items-center px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-black">
                                                    <FiDollarSign className="mr-1" />
                                                    {lead.saleAmount?.toLocaleString() || "0"}
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 font-bold">---</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${lead.status === 'converted' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {lead.status || 'new'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingLead(lead); setLeadForm({ name: lead.name, course: lead.course, phone: lead.phone }); setIsModalOpen(true); }} className="p-2 text-amber-500 hover:bg-amber-100 rounded-lg" title="Edit"><FiEdit2 /></button>
                                                {lead.status !== 'converted' && (
                                                    <button onClick={() => handleConvertToSale(lead._id)} className="p-2 text-emerald-500 hover:bg-emerald-100 rounded-lg" title="Convert to Sale"><FiCheckCircle /></button>
                                                )}
                                                <button onClick={() => handleDelete(lead._id)} className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg" title="Delete"><FiTrash2 /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Charts */}
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8 mb-10">
                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
                        <CSRStatsChart title="Leads Volume" day={stats.leadsStats.day} week={stats.leadsStats.week} month={stats.leadsStats.month} />
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
                        <CSRStatsChart title="Sales Performance" day={stats.salesStats.day} week={stats.salesStats.week} month={stats.salesStats.month} />
                    </div>
                </div>

                {/* Modal */}
                <AnimatePresence>
                    {isModalOpen && (
                        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex justify-center items-center z-50 p-6">
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl">
                                <h2 className="text-3xl font-black mb-8 text-slate-800">{editingLead ? "Edit Lead" : "New Prospect"}</h2>
                                <div className="space-y-6">
                                    <div className="relative">
                                        <FiUser className="absolute left-4 top-4 text-slate-400" />
                                        <input value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} className="w-full bg-slate-50 pl-12 pr-4 py-4 rounded-2xl outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500 transition-all" placeholder="Full Name" />
                                    </div>
                                    <div className="relative">
                                        <FiBookOpen className="absolute left-4 top-4 text-slate-400" />
                                        <input value={leadForm.course} onChange={(e) => setLeadForm({ ...leadForm, course: e.target.value })} className="w-full bg-slate-50 pl-12 pr-4 py-4 rounded-2xl outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500 transition-all" placeholder="Course Name" />
                                    </div>
                                    <div className="relative">
                                        <FiPhone className="absolute left-4 top-4 text-slate-400" />
                                        <input value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} className="w-full bg-slate-50 pl-12 pr-4 py-4 rounded-2xl outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500 transition-all" placeholder="Phone Number" />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-4 mt-10">
                                    <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-slate-400 font-bold">Cancel</button>
                                    <button onClick={handleLeadFormSubmit} className="px-10 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-transform">Save Details</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </ProtectedRoute>
    );
}