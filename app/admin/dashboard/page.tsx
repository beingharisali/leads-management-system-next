"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Toaster, toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import { FiPlus, FiUploadCloud, FiLogOut, FiTrendingUp, FiRefreshCw, FiGrid } from "react-icons/fi";

// APIs
import { getAdminStats } from "@/services/dashboard.api";
import { createCSR } from "@/services/auth.api";
import { getLeadsByRole, bulkInsertLeads } from "@/services/lead.api";

// Components
import CSRSidebar from "@/components/CsrSidebar";
import CSRLeadsPanel from "@/components/CsrLeadPanel";
import DashboardGraphs from "@/components/DashboardGraphs";
import SummaryCard from "@/components/SummaryCard";
import Loading from "@/components/Loading";
import ErrorMessage from "@/components/ErrorMessage";

export default function AdminDashboardPage() {
    // --- Data States ---
    const [data, setData] = useState<any>(null);
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState<"day" | "week" | "month">("month");

    // --- Action States ---
    const [uploading, setUploading] = useState(false);
    const [csrLoading, setCsrLoading] = useState(false);
    const [showCSRModal, setShowCSRModal] = useState(false);
    const [showExcelPreview, setShowExcelPreview] = useState(false);

    // --- Form & Selection States ---
    const [csrForm, setCsrForm] = useState({ name: "", email: "", password: "" });
    const [selectedCSR, setSelectedCSR] = useState<string | null>(null);
    const [previewLeads, setPreviewLeads] = useState<any[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    /* ================= DYNAMIC FILTERING LOGIC ================= */
    const filteredLeadsByTime = useMemo(() => {
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

    /* ================= UTILS ================= */
    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 0
        }).format(val || 0);
    };

    /* ================= FETCH DATA ================= */
    const fetchDashboardData = useCallback(async (showSilent = false) => {
        if (!showSilent) setLoading(true);
        else setRefreshing(true);

        try {
            const [statsRes, leadsRes] = await Promise.all([
                getAdminStats(filter),
                getLeadsByRole("admin"),
            ]);
            setData(statsRes);
            setLeads(leadsRes || []);
            setError("");
        } catch (err: any) {
            console.error("Dashboard Fetch Error:", err);
            setError(err.message || "Failed to load dashboard data");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const handleDataRefresh = async () => {
        await fetchDashboardData(true);
    };

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = "/login";
    };

    /* ================= HANDLERS ================= */
    const handleCreateCSR = async (e: React.FormEvent) => {
        e.preventDefault();
        setCsrLoading(true);
        const toastId = toast.loading("Creating account...");
        try {
            await createCSR(csrForm);
            toast.success("CSR account created!", { id: toastId });
            setCsrForm({ name: "", email: "", password: "" });
            setShowCSRModal(false);
            fetchDashboardData(true);
        } catch (err: any) {
            toast.error(err.message || "Could not create CSR", { id: toastId });
        } finally {
            setCsrLoading(false);
        }
    };

    const handleExcelSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
                if (rawJson.length === 0) throw new Error("File is empty");

                const headers = Object.keys(rawJson[0]);
                const mapped = rawJson.slice(0, 10).map((row, idx) => {
                    const nameKey = headers.find(h => h.toLowerCase().includes("name")) || "";
                    const phoneKey = headers.find(h => h.toLowerCase().includes("phone")) || "";
                    const courseKey = headers.find(h => h.toLowerCase().includes("course")) || "";
                    return {
                        name: row[nameKey] || "No Name",
                        phone: String(row[phoneKey] || "").trim(),
                        course: row[courseKey] || "N/A",
                        source: "Excel Import",
                        rowIndex: idx + 2
                    };
                });
                setPreviewLeads(mapped);
                setShowExcelPreview(true);
            } catch (err: any) {
                toast.error(err.message || "Invalid Excel format");
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = "";
    };

    const confirmExcelUpload = async () => {
        if (!selectedFile) return;
        setUploading(true);
        const toastId = toast.loading("Uploading leads...");
        try {
            await bulkInsertLeads(selectedFile);
            toast.success("Leads imported successfully!", { id: toastId });
            setShowExcelPreview(false);
            setSelectedFile(null);
            fetchDashboardData(true);
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || "Server Error", { id: toastId });
        } finally {
            setUploading(false);
        }
    };

    if (loading && !data) return <Loading />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <div className="p-4 md:p-10 space-y-12 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans relative">
            <Toaster position="top-right" />

            {/* --- HEADER --- */}
            <motion.header
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60 gap-6"
            >
                <div className="text-center md:text-left">
                    <h1 className="text-3xl font-black tracking-tight text-slate-800">
                        Admin <span className="text-indigo-600 italic">Central</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                            {filter}ly Monitoring System
                        </p>
                        {refreshing && <FiRefreshCw className="animate-spin text-indigo-500 text-xs" />}
                    </div>
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                    <button onClick={() => setShowCSRModal(true)} className="flex items-center gap-2 bg-slate-900 text-white px-7 py-3.5 rounded-2xl font-bold text-sm hover:shadow-xl hover:-translate-y-0.5 transition-all">
                        <FiPlus className="text-lg" /> Create CSR
                    </button>
                    <label className={`flex items-center gap-2 bg-indigo-600 text-white px-7 py-3.5 rounded-2xl font-bold text-sm cursor-pointer shadow-lg transition-all ${uploading ? 'opacity-50' : 'hover:bg-indigo-700 hover:-translate-y-0.5'}`}>
                        <FiUploadCloud className="text-lg" />
                        {uploading ? "Importing..." : "Bulk Import"}
                        <input type="file" hidden accept=".xlsx, .xls" disabled={uploading} onChange={handleExcelSelection} />
                    </label>
                    <button onClick={handleLogout} className="flex items-center gap-2 bg-rose-50 text-rose-600 px-6 py-3.5 rounded-2xl font-bold text-sm hover:bg-rose-100 transition-all border border-rose-100">
                        <FiLogOut /> Logout
                    </button>
                </div>
            </motion.header>

            {/* --- TOP FILTER & STATS --- */}
            <div className="space-y-8">
                <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200/60 w-fit">
                    {["day", "week", "month"].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as any)}
                            className={`px-8 py-2.5 rounded-xl text-xs font-black capitalize transition-all duration-300 ${filter === f ? "bg-indigo-600 text-white shadow-md scale-105" : "text-slate-400 hover:text-slate-600"}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                    <SummaryCard title="Total Leads" value={filteredLeadsByTime.length.toString()} trend="Live" color="purple" />
                    <SummaryCard title="Closed Sales" value={(data?.totalSales || data?.convertedLeads || 0).toString()} color="green" />
                    <SummaryCard title="Revenue" value={formatCurrency(data?.totalRevenue || data?.revenue || 0)} color="blue" trend={data?.totalRevenue > 0 ? "Profit" : "Awaiting"} />
                    <SummaryCard title="Conv. Rate" value={`${data?.conversionRate || 0}%`} color="orange" />
                </div>
            </div>

            {/* --- MAIN CONTENT AREA --- */}
            <main className="grid grid-cols-12 gap-8 items-start">
                {/* Sidebar Section */}
                <aside className="col-span-12 lg:col-span-3 lg:sticky lg:top-8">
                    <CSRSidebar
                        csrs={data?.csrPerformance || []}
                        selectedCSR={selectedCSR}
                        onSelect={setSelectedCSR}
                    />
                </aside>

                {/* Data Sections */}
                <section className="col-span-12 lg:col-span-9 flex flex-col gap-12">

                    {/* 1. Analytics Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-8 rounded-[3rem] border border-slate-200/60 shadow-sm"
                    >
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Performance Analytics</h3>
                                <p className="text-slate-400 text-xs font-medium mt-1">Real-time data visualization</p>
                            </div>
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                                <FiTrendingUp size={22} />
                            </div>
                        </div>

                        {/* Graph Wrapper with Fixed Height to prevent overlap */}
                        <div className="min-h-[400px] w-full">
                            {data?.leadsStats && (
                                <DashboardGraphs
                                    leadsStats={data.leadsStats}
                                    salesStats={data.salesStats || data.revenueStats}
                                    filter={filter}
                                />
                            )}
                        </div>
                    </motion.div>

                    {/* 2. Leads Management Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden"
                    >
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                            <div>
                                <h3 className="font-black text-slate-800 tracking-tight text-lg">Lead Management</h3>
                                <p className="text-slate-400 text-xs font-medium mt-1">Track and manage your sales pipeline</p>
                            </div>
                            <span className="text-[10px] font-black bg-indigo-600 text-white px-4 py-2 rounded-full uppercase tracking-widest shadow-md">
                                {filter}ly Data
                            </span>
                        </div>

                        <div className="p-2">
                            <CSRLeadsPanel
                                leads={filteredLeadsByTime}
                                selectedCSR={selectedCSR}
                                onConvertToSale={handleDataRefresh}
                                onDeleteLead={handleDataRefresh}
                            />
                        </div>
                    </motion.div>
                </section>
            </main>

            {/* --- MODALS --- */}
            <AnimatePresence>
                {/* Excel Preview Modal */}
                {showExcelPreview && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-[100] p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl p-8 lg:p-12 flex flex-col border border-slate-100"
                        >
                            <h2 className="text-2xl font-black text-slate-800">Review Data Preview</h2>
                            <p className="text-slate-400 font-medium text-sm mt-1">Showing first 10 rows of your file.</p>

                            <div className="flex-1 max-h-[350px] overflow-y-auto border border-slate-100 rounded-3xl my-6 shadow-inner custom-scrollbar">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-400 text-[10px] font-bold sticky top-0 uppercase">
                                        <tr><th className="p-5">Name</th><th className="p-5">Phone</th><th className="p-5">Course</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {previewLeads.map((l, i) => (
                                            <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="p-5 font-bold text-slate-700">{l.name}</td>
                                                <td className="p-5 text-indigo-500 font-mono font-medium">{l.phone}</td>
                                                <td className="p-5 text-slate-500 font-medium">{l.course}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex gap-4">
                                <button onClick={() => setShowExcelPreview(false)} className="flex-1 font-bold text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
                                <button onClick={confirmExcelUpload} disabled={uploading} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all">
                                    {uploading ? "Importing..." : "Confirm & Import"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Create CSR Modal */}
                {showCSRModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-[100] p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white p-10 rounded-[3rem] w-full max-w-md shadow-2xl"
                        >
                            <h2 className="text-2xl font-black text-slate-800 mb-2">New Team Member</h2>
                            <p className="text-slate-400 text-sm font-medium mb-8 uppercase tracking-wider">Access Configuration</p>

                            <form onSubmit={handleCreateCSR} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-widest">Full Name</label>
                                    <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all font-medium" placeholder="Ex: Ali Ahmed" value={csrForm.name} onChange={e => setCsrForm({ ...csrForm, name: e.target.value })} required />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-widest">Email Address</label>
                                    <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all font-medium" type="email" placeholder="ali@agency.com" value={csrForm.email} onChange={e => setCsrForm({ ...csrForm, email: e.target.value })} required />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 ml-2 uppercase tracking-widest">Secure Password</label>
                                    <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-indigo-600 focus:bg-white transition-all font-medium" type="password" placeholder="••••••••" value={csrForm.password} onChange={e => setCsrForm({ ...csrForm, password: e.target.value })} required minLength={6} />
                                </div>

                                <div className="flex gap-4 pt-6">
                                    <button type="button" onClick={() => setShowCSRModal(false)} className="flex-1 font-bold text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
                                    <button type="submit" disabled={csrLoading} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all">
                                        {csrLoading ? "Creating..." : "Save Member"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}