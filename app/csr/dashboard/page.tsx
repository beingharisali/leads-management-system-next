"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import * as XLSX from "xlsx"; // <--- Add this
import {
    getLeadsByRole,
    deleteLead,
    convertLeadToSale,
    createLead,
    updateLead,
    bulkInsertLeads, // <--- Add this
} from "@/services/lead.api";
import { getCSRStats } from "@/services/dashboard.api";
import SummaryCard from "@/components/SummaryCard";
import CSRStatsChart from "@/components/CSRStatsChart";
import Loading from "@/components/Loading";
import ErrorMessage from "@/components/ErrorMessage";
import { getUserRole, getUserId, logout } from "@/utils/decodeToken";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { FiPlus, FiLogOut, FiEdit2, FiTrash2, FiCheckCircle, FiPhone, FiBookOpen, FiUser, FiDollarSign, FiClock, FiUploadCloud } from "react-icons/fi";

type Filter = "day" | "week" | "month";

interface Lead {
    _id: string;
    name: string;
    course: string;
    phone: string;
    status?: "new" | "contacted" | "converted";
    saleAmount?: number;
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

    // Form & Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [leadForm, setLeadForm] = useState({ name: "", course: "", phone: "" });

    // Excel States (ADDED)
    const [uploading, setUploading] = useState(false);
    const [showExcelPreview, setShowExcelPreview] = useState(false);
    const [previewLeads, setPreviewLeads] = useState<any[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // ================= DATA FETCHING =================
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

    // ================= EXCEL LOGIC (ADDED) =================
    const handleExcelSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

                const mapped = rawJson.slice(0, 10).map((row) => ({
                    name: row.Name || row.name || "No Name",
                    phone: String(row.Phone || row.phone || "").trim(),
                    course: row.Course || row.course || "N/A",
                }));
                setPreviewLeads(mapped);
                setShowExcelPreview(true);
            } catch (err) {
                toast.error("Invalid Excel format");
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = "";
    };

    const confirmExcelUpload = async () => {
        if (!selectedFile) return;
        setUploading(true);
        try {
            await bulkInsertLeads(selectedFile);
            toast.success("Leads imported successfully! 🚀");
            setShowExcelPreview(false);
            fetchData(true);
        } catch (err: any) {
            toast.error(err.message || "Upload failed");
        } finally {
            setUploading(false);
        }
    };

    // ================= DYNAMIC FILTERING =================
    const filteredLeads = useMemo(() => {
        if (!leads.length) return [];
        const now = new Date();
        return leads.filter((lead) => {
            const leadDate = new Date(lead.createdAt || Date.now());
            const diffInDays = (now.getTime() - leadDate.getTime()) / (1000 * 3600 * 24);
            if (filter === "day") return diffInDays <= 1;
            if (filter === "week") return diffInDays <= 7;
            if (filter === "month") return diffInDays <= 30;
            return true;
        });
    }, [leads, filter]);

    const handleConvertToSale = async (id: string) => {
        const inputAmount = prompt("Enter Sale Amount:");
        const numericAmount = Number(inputAmount);
        if (!inputAmount || isNaN(numericAmount) || numericAmount <= 0) return toast.error("Invalid amount");
        try {
            toast.loading("Converting...", { id: "convert" });
            await convertLeadToSale(id, numericAmount);
            setLeads(prev => prev.map(l => l._id === id ? { ...l, status: "converted", saleAmount: numericAmount } : l));
            toast.success("Sale Recorded! 🚀", { id: "convert" });
            fetchData(true);
        } catch (err) { toast.error("Conversion failed", { id: "convert" }); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        try {
            await deleteLead(id);
            setLeads(leads.filter(l => l._id !== id));
            toast.success("Lead removed");
            fetchData(true);
        } catch (err) { toast.error("Delete failed"); }
    };

    const handleLeadFormSubmit = async () => {
        if (leadForm.name.length < 3) return toast.error("Name too short");
        try {
            const userId = await getUserId();
            const payload = { ...leadForm, assignedTo: userId, createdBy: userId, source: "manual" };
            editingLead ? await updateLead(editingLead._id, payload as any) : await createLead(payload as any);
            setIsModalOpen(false);
            fetchData(true);
            toast.success("Success");
        } catch (err) { toast.error("Save failed"); }
    };

    const handleLogout = () => { logout(); router.push("/login"); };

    if (loading) return <Loading />;

    return (
        <ProtectedRoute role="csr">
            <Toaster position="top-right" />
            <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">

                {/* Header */}
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                    <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                        <h1 className="text-4xl font-black text-slate-800 tracking-tight">CSR <span className="text-blue-600">Portal</span></h1>
                        <p className="text-slate-500 font-medium flex items-center gap-2">
                            <FiClock className="text-blue-400" /> Stats for this <span className="text-blue-600 font-bold capitalize">{filter}</span>
                        </p>
                    </motion.div>
                    <button onClick={handleLogout} className="flex items-center gap-2 bg-white border border-slate-200 px-6 py-2.5 rounded-2xl hover:text-red-600 transition-all font-bold shadow-sm">
                        <FiLogOut /> Logout
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <SummaryCard title="Filtered Leads" value={filteredLeads.length} />
                    <SummaryCard title="Total Sales" value={stats.totalSales} />
                    <SummaryCard title="Win Rate" value={stats.conversionRate} />
                </div>

                {/* Filter & Action Bar */}
                <div className="max-w-7xl mx-auto bg-white p-5 rounded-[2rem] shadow-sm border flex flex-wrap justify-between items-center gap-4 mb-10">
                    <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                        {["day", "week", "month"].map((f) => (
                            <button key={f} onClick={() => setFilter(f as Filter)} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${filter === f ? "bg-white text-blue-600 shadow-md scale-105" : "text-slate-500 hover:text-slate-700"}`}>
                                {f.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        {/* EXCEL UPLOAD BUTTON (ADDED) */}
                        <label className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-indigo-700 cursor-pointer transition-all">
                            <FiUploadCloud /> {uploading ? "Importing..." : "Bulk Import"}
                            <input type="file" hidden accept=".xlsx, .xls" onChange={handleExcelSelection} />
                        </label>

                        <button onClick={() => { setEditingLead(null); setLeadForm({ name: "", course: "", phone: "" }); setIsModalOpen(true); }} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold shadow-lg hover:scale-105 transition-all">
                            <FiPlus /> New Prospect
                        </button>
                    </div>
                </div>

                {/* Leads Table */}
                <div className="max-w-7xl mx-auto bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 border-b border-slate-100">
                                <tr className="text-slate-400 uppercase text-[10px] font-black tracking-widest">
                                    <th className="px-8 py-5">Prospect</th>
                                    <th className="px-8 py-5">Course</th>
                                    <th className="px-8 py-5 text-center">Sale Value</th>
                                    <th className="px-8 py-5 text-center">Status</th>
                                    <th className="px-8 py-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredLeads.map((lead) => (
                                    <tr key={lead._id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="font-bold text-slate-700">{lead.name}</div>
                                            <div className="text-xs text-blue-500 font-mono">{lead.phone}</div>
                                        </td>
                                        <td className="px-8 py-5 text-slate-500 font-medium">{lead.course}</td>
                                        <td className="px-8 py-5 text-center">
                                            {lead.status === 'converted' ? (
                                                <div className="inline-flex items-center px-4 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 font-black text-sm">
                                                    <FiDollarSign className="mr-0.5" />
                                                    {lead.saleAmount?.toLocaleString() || "0"}
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 font-bold">--</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter ${lead.status === 'converted' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {lead.status || 'new'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingLead(lead); setLeadForm({ name: lead.name, course: lead.course, phone: lead.phone }); setIsModalOpen(true); }} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg"><FiEdit2 /></button>
                                                {lead.status !== 'converted' && (
                                                    <button onClick={() => handleConvertToSale(lead._id)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg"><FiCheckCircle /></button>
                                                )}
                                                <button onClick={() => handleDelete(lead._id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><FiTrash2 /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Charts */}
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8 mt-10">
                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
                        <CSRStatsChart title="Leads Overview" day={stats.leadsStats.day} week={stats.leadsStats.week} month={stats.leadsStats.month} />
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
                        <CSRStatsChart title="Sales Overview" day={stats.salesStats.day} week={stats.salesStats.week} month={stats.salesStats.month} />
                    </div>
                </div>

                {/* MODALS */}
                <AnimatePresence>
                    {/* Excel Preview Modal (ADDED) */}
                    {showExcelPreview && (
                        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex justify-center items-center z-[60] p-6">
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[3rem] p-10 w-full max-w-2xl shadow-2xl">
                                <h2 className="text-2xl font-black mb-4">Review Bulk Import</h2>
                                <div className="max-h-[300px] overflow-auto border rounded-2xl mb-6">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 sticky top-0">
                                            <tr className="text-[10px] font-black uppercase text-slate-400">
                                                <th className="p-4 text-left">Name</th>
                                                <th className="p-4 text-left">Phone</th>
                                                <th className="p-4 text-left">Course</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewLeads.map((l, i) => (
                                                <tr key={i} className="border-t">
                                                    <td className="p-4 font-bold">{l.name}</td>
                                                    <td className="p-4 text-blue-600 font-mono">{l.phone}</td>
                                                    <td className="p-4">{l.course}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-end gap-4">
                                    <button onClick={() => setShowExcelPreview(false)} className="px-6 py-3 font-bold text-slate-400">Cancel</button>
                                    <button onClick={confirmExcelUpload} disabled={uploading} className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black shadow-lg">
                                        {uploading ? "Uploading..." : "Confirm & Import"}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {/* Manual Lead Modal */}
                    {isModalOpen && (
                        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex justify-center items-center z-50 p-6">
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl border border-slate-100">
                                <h2 className="text-3xl font-black mb-8 text-slate-800">{editingLead ? "Update Lead" : "New Prospect"}</h2>
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
                                        <input value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} className="w-full bg-slate-50 pl-12 pr-4 py-4 rounded-2xl outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500 transition-all" placeholder="Phone (11 digits)" />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-4 mt-10">
                                    <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-slate-400 font-bold hover:text-slate-600 transition-colors">Cancel</button>
                                    <button onClick={handleLeadFormSubmit} className="px-10 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all">Save Prospect</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </ProtectedRoute>
    );
}