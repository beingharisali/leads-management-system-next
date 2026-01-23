"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Toaster, toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import { FiPlus, FiUploadCloud, FiLogOut, FiTrendingUp, FiRefreshCw } from "react-icons/fi";

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
    const [data, setData] = useState<any>(null);
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState<"day" | "week" | "month">("month");

    const [uploading, setUploading] = useState(false);
    const [csrLoading, setCsrLoading] = useState(false);
    const [showCSRModal, setShowCSRModal] = useState(false);
    const [showExcelPreview, setShowExcelPreview] = useState(false);

    const [csrForm, setCsrForm] = useState({ name: "", email: "", password: "" });
    const [selectedCSR, setSelectedCSR] = useState<string | null>(null);
    const [previewLeads, setPreviewLeads] = useState<any[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [assignToCSR, setAssignToCSR] = useState<string>("");

    /* ================= DYNAMIC REVENUE & SALES CALCULATION ================= */
    // Ye hissa sabse important hai revenue show karne ke liye
    const { totalRevenue, totalSalesCount } = useMemo(() => {
        if (!leads.length) return { totalRevenue: 0, totalSalesCount: 0 };

        // 1. Leads filter karein (Dono status check karein: 'sale' aur 'converted')
        const salesLeads = leads.filter(l =>
            l.status?.toLowerCase() === "sale" ||
            l.status?.toLowerCase() === "converted"
        );

        // 2. Amount calculate karein (Check all possible field names)
        const total = salesLeads.reduce((sum, lead) => {
            const val = lead.saleAmount || lead.amount || 0;
            return sum + (Number(val) || 0);
        }, 0);

        return {
            totalRevenue: total,
            totalSalesCount: salesLeads.length
        };
    }, [leads]);

    /* ================= TIME FILTERING LOGIC ================= */
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

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-PK', {
            style: 'currency',
            currency: 'PKR',
            minimumFractionDigits: 0
        }).format(val || 0);
    };

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
                const mapped = rawJson.slice(0, 10).map((row) => {
                    const nameKey = headers.find(h => h.toLowerCase().includes("name")) || "";
                    const phoneKey = headers.find(h => h.toLowerCase().includes("phone")) || "";
                    const courseKey = headers.find(h => h.toLowerCase().includes("course")) || "";
                    return {
                        name: row[nameKey] || "No Name",
                        phone: String(row[phoneKey] || "").trim(),
                        course: row[courseKey] || "N/A",
                        source: "Excel Import",
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
        if (!selectedFile || !assignToCSR) {
            toast.error("File aur CSR select karein");
            return;
        }
        setUploading(true);
        const toastId = toast.loading("Uploading...");
        try {
            await bulkInsertLeads(selectedFile, assignToCSR);
            toast.success("Leads imported!", { id: toastId });
            setShowExcelPreview(false);
            fetchDashboardData(true);
        } catch (err: any) {
            toast.error(err.message || "Upload failed", { id: toastId });
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
            <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60 gap-6">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl font-black text-slate-800">Admin <span className="text-indigo-600 italic">Central</span></h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{filter}ly Monitoring</p>
                        {refreshing && <FiRefreshCw className="animate-spin text-indigo-500 text-xs" />}
                    </div>
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                    <button onClick={() => setShowCSRModal(true)} className="flex items-center gap-2 bg-slate-900 text-white px-7 py-3.5 rounded-2xl font-bold text-sm"> <FiPlus /> Create CSR </button>
                    <label className="flex items-center gap-2 bg-indigo-600 text-white px-7 py-3.5 rounded-2xl font-bold text-sm cursor-pointer shadow-lg hover:bg-indigo-700">
                        <FiUploadCloud /> {uploading ? "Importing..." : "Bulk Import"}
                        <input type="file" hidden accept=".xlsx, .xls" disabled={uploading} onChange={handleExcelSelection} />
                    </label>
                    <button onClick={handleLogout} className="flex items-center gap-2 bg-rose-50 text-rose-600 px-6 py-3.5 rounded-2xl font-bold text-sm hover:bg-rose-100 border border-rose-100"> <FiLogOut /> Logout </button>
                </div>
            </motion.header>

            {/* --- TOP FILTER & STATS --- */}
            <div className="space-y-8">
                <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200/60 w-fit">
                    {["day", "week", "month"].map((f) => (
                        <button key={f} onClick={() => setFilter(f as any)} className={`px-8 py-2.5 rounded-xl text-xs font-black capitalize transition-all ${filter === f ? "bg-indigo-600 text-white shadow-md" : "text-slate-400"}`}> {f} </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                    <SummaryCard title="Total Leads" value={leads.length.toString()} trend="Live" color="purple" />
                    <SummaryCard title="Closed Sales" value={totalSalesCount.toString()} trend="+Active" color="green" />

                    {/* REVENUE CARD (Now uses calculated totalRevenue) */}
                    <SummaryCard
                        title="Revenue"
                        value={formatCurrency(totalRevenue)}
                        color="blue"
                        trend={totalRevenue > 0 ? "Profit" : "Awaiting Sales"}
                    />

                    <SummaryCard title="Conv. Rate" value={`${data?.conversionRate || 0}%`} color="orange" trend="Calculated" />
                </div>
            </div>

            <main className="grid grid-cols-12 gap-8">
                <aside className="col-span-12 lg:col-span-3 lg:sticky lg:top-8">
                    <CSRSidebar csrs={data?.csrPerformance || []} selectedCSR={selectedCSR} onSelect={setSelectedCSR} />
                </aside>

                <section className="col-span-12 lg:col-span-9 space-y-12">
                    {/* Performance Graph Section */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-[3rem] border border-slate-200/60 shadow-sm">
                        <div className="flex justify-between items-center mb-10 font-black text-xl tracking-tight text-slate-800">Analytics Insights <FiTrendingUp className="text-indigo-600" /></div>
                        <div className="min-h-[400px]">
                            {data?.leadsStats && <DashboardGraphs leadsStats={data.leadsStats} salesStats={data.salesStats} filter={filter} />}
                        </div>
                    </motion.div>

                    {/* Leads Table Section */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden">
                        <div className="p-8 border-b bg-slate-50/30 font-black text-lg text-slate-800">Lead Management Control</div>
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

            {/* Modals */}
            <AnimatePresence>
                {showExcelPreview && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-[100] p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] p-10 max-w-xl w-full">
                            <h2 className="text-2xl font-black mb-6 text-slate-800">Assign Imported Leads</h2>
                            <select value={assignToCSR} onChange={(e) => setAssignToCSR(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl mb-6 font-bold border-2 border-slate-100 focus:border-indigo-500 outline-none">
                                <option value="">Select CSR...</option>
                                {data?.csrPerformance?.map((csr: any) => (
                                    <option key={csr.csrId || csr._id} value={csr.csrId || csr._id}>{csr.name}</option>
                                ))}
                            </select>
                            <div className="flex gap-4">
                                <button onClick={() => setShowExcelPreview(false)} className="flex-1 font-bold text-slate-400">Cancel</button>
                                <button onClick={confirmExcelUpload} disabled={!assignToCSR || uploading} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg disabled:opacity-50">
                                    {uploading ? "Uploading..." : "Confirm & Assign"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {showCSRModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-[100] p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-10 rounded-[3rem] w-full max-w-md shadow-2xl">
                            <h2 className="text-2xl font-black text-slate-800 mb-8">New Team Member</h2>
                            <form onSubmit={handleCreateCSR} className="space-y-5">
                                <input className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none font-medium text-slate-800" placeholder="Full Name" value={csrForm.name} onChange={e => setCsrForm({ ...csrForm, name: e.target.value })} required />
                                <input className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none font-medium text-slate-800" type="email" placeholder="Email Address" value={csrForm.email} onChange={e => setCsrForm({ ...csrForm, email: e.target.value })} required />
                                <input className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none font-medium text-slate-800" type="password" placeholder="Password" value={csrForm.password} onChange={e => setCsrForm({ ...csrForm, password: e.target.value })} required />
                                <div className="flex gap-4 pt-6">
                                    <button type="button" onClick={() => setShowCSRModal(false)} className="flex-1 font-bold text-slate-400 hover:text-slate-600">Cancel</button>
                                    <button type="submit" disabled={csrLoading} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-transform">
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