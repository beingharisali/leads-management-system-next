"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Toaster, toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import {
    FiPlus,
    FiUploadCloud,
    FiLogOut,
    FiTrendingUp,
    FiRefreshCw,
    FiTrash2,
} from "react-icons/fi";

// APIs
import { getAdminStats } from "@/services/dashboard.api";
import { createCSR, updateCSRStatus } from "@/services/auth.api";
import { getLeadsByRole, bulkInsertLeads, deleteAllLeads } from "@/services/lead.api";

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

    /* ================= DYNAMIC CALCULATIONS ================= */
    const { totalRevenue, totalSalesCount } = useMemo(() => {
        if (!leads.length) return { totalRevenue: 0, totalSalesCount: 0 };
        const salesLeads = leads.filter(l =>
            l.status?.toLowerCase() === "sale" ||
            l.status?.toLowerCase() === "converted"
        );
        const total = salesLeads.reduce((sum, lead) => sum + (Number(lead.saleAmount || lead.amount) || 0), 0);
        return { totalRevenue: total, totalSalesCount: salesLeads.length };
    }, [leads]);

    const filteredLeadsByTime = useMemo(() => {
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
            setError(err.message || "Failed to load dashboard data");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const handleDataRefresh = () => fetchDashboardData(true);

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = "/login";
    };

    /* ================= ACTION HANDLERS ================= */

    // 1. Delete All Leads
    const handleDeleteAllLeads = async () => {
        if (!window.confirm("WARNING: Are you sure? This will wipe the ENTIRE leads database!")) return;

        const toastId = toast.loading("Cleaning database...");
        try {
            await deleteAllLeads();
            toast.success("Database cleared!", { id: toastId });
            setLeads([]); // Instant UI update
            handleDataRefresh();
        } catch (err: any) {
            toast.error(err.message || "Deletion failed", { id: toastId });
        }
    };

    // 2. Toggle CSR Status (Now with State Update)
    const handleToggleStatus = async (csrId: string, currentStatus: string) => {
        const newStatus = currentStatus === "active" ? "inactive" : "active";
        try {
            const res = await updateCSRStatus(csrId, newStatus);

            // ✅ Update local state so UI changes immediately
            if (data?.csrPerformance) {
                const updatedCsrs = data.csrPerformance.map((member: any) =>
                    (member.csrId === csrId || member._id === csrId)
                        ? { ...member, status: res.user.status }
                        : member
                );
                setData({ ...data, csrPerformance: updatedCsrs });
            }

            toast.success(`User is now ${res.user.status}`);
        } catch (err: any) {
            toast.error(err.response?.data?.msg || "Status update failed");
        }
    };

    // 3. Create CSR
    const handleCreateCSR = async (e: React.FormEvent) => {
        e.preventDefault();
        setCsrLoading(true);
        const toastId = toast.loading("Registering CSR...");
        try {
            await createCSR(csrForm);
            toast.success("Account Created!", { id: toastId });
            setCsrForm({ name: "", email: "", password: "" });
            setShowCSRModal(false);
            handleDataRefresh();
        } catch (err: any) {
            toast.error(err.message || "Signup failed", { id: toastId });
        } finally {
            setCsrLoading(false);
        }
    };

    // 4. Excel Logic
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
                const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });
                if (!rawJson.length) throw new Error("File is empty");
                setPreviewLeads(rawJson.slice(0, 5));
                setShowExcelPreview(true);
            } catch (err: any) {
                toast.error(err.message);
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = "";
    };

    const confirmExcelUpload = async () => {
        if (!selectedFile || !assignToCSR) return toast.error("Select file and CSR first");
        setUploading(true);
        const toastId = toast.loading("Processing Excel...");
        try {
            await bulkInsertLeads(selectedFile, assignToCSR);
            toast.success("Leads Imported Successfully!", { id: toastId });
            setShowExcelPreview(false);
            handleDataRefresh();
        } catch (err: any) {
            toast.error("Import failed", { id: toastId });
        } finally {
            setUploading(false);
        }
    };

    if (loading && !data) return <Loading />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <div className="p-4 md:p-10 space-y-12 bg-[#F8FAFC] min-h-screen text-slate-900">
            <Toaster position="top-right" />

            {/* --- HEADER --- */}
            <header className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200/60 gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800">Admin <span className="text-indigo-600 italic">Central</span></h1>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{filter}ly Performance</p>
                        {refreshing && <FiRefreshCw className="animate-spin text-indigo-500 text-xs" />}
                    </div>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                    <button onClick={() => setShowCSRModal(true)} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-bold text-sm hover:scale-105 transition-all"> <FiPlus /> New CSR </button>

                    <label className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-bold text-sm cursor-pointer shadow-lg hover:bg-indigo-700 transition-all">
                        <FiUploadCloud /> {uploading ? "Importing..." : "Bulk Upload"}
                        <input type="file" hidden accept=".xlsx, .xls" onChange={handleExcelSelection} />
                    </label>

                    <button onClick={handleDeleteAllLeads} className="flex items-center gap-2 bg-rose-50 text-rose-600 px-6 py-3.5 rounded-2xl font-bold text-sm hover:bg-rose-100 border border-rose-100 transition-all">
                        <FiTrash2 /> Clean DB
                    </button>

                    <button onClick={handleLogout} className="flex items-center gap-2 bg-slate-100 text-slate-600 px-6 py-3.5 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"> <FiLogOut /> </button>
                </div>
            </header>

            {/* --- STATS GRID --- */}
            <div className="space-y-8">
                <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 w-fit">
                    {["day", "week", "month"].map((f) => (
                        <button key={f} onClick={() => setFilter(f as any)} className={`px-8 py-2.5 rounded-xl text-xs font-black capitalize transition-all ${filter === f ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-slate-600"}`}> {f} </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <SummaryCard title="Total Leads" value={leads.length.toString()} trend="Live" color="purple" />
                    <SummaryCard title="Closed Sales" value={totalSalesCount.toString()} trend="Success" color="green" />
                    <SummaryCard title="Revenue" value={formatCurrency(totalRevenue)} color="blue" trend="Verified" />
                    <SummaryCard title="Conv. Rate" value={`${data?.conversionRate || 0}%`} color="orange" trend="Avg" />
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <main className="grid grid-cols-12 gap-8">
                <aside className="col-span-12 lg:col-span-3">
                    <CSRSidebar
                        csrs={data?.csrPerformance || []}
                        selectedCSR={selectedCSR}
                        onSelect={setSelectedCSR}
                        onToggleStatus={handleToggleStatus}
                    />
                </aside>

                <section className="col-span-12 lg:col-span-9 space-y-12">
                    {/* Graphs */}
                    <div className="bg-white p-8 rounded-[3rem] border border-slate-200/60 shadow-sm">
                        <div className="flex justify-between items-center mb-10 font-black text-xl text-slate-800">Analytics Insights <FiTrendingUp className="text-indigo-600" /></div>
                        {data?.leadsStats && <DashboardGraphs leadsStats={data.leadsStats} salesStats={data.salesStats} filter={filter} />}
                    </div>

                    {/* Leads Panel */}
                    <div className="bg-white rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden">
                        <div className="p-8 border-b bg-slate-50/50 flex justify-between items-center">
                            <h2 className="font-black text-lg text-slate-800">Recent Leads Activity</h2>
                            <span className="text-xs bg-indigo-100 text-indigo-600 px-4 py-1.5 rounded-full font-bold uppercase tracking-widest"> {filteredLeadsByTime.length} Leads </span>
                        </div>
                        <CSRLeadsPanel
                            leads={filteredLeadsByTime}
                            selectedCSR={selectedCSR}
                            onConvertToSale={handleDataRefresh}
                            onDeleteLead={handleDataRefresh}
                        />
                    </div>
                </section>
            </main>

            {/* MODALS */}
            <AnimatePresence>
                {/* Excel Modal */}
                {showExcelPreview && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl">
                            <h2 className="text-2xl font-black mb-2 text-slate-800">Confirm Assignment</h2>
                            <p className="text-slate-500 mb-8 text-sm">Select a CSR to assign these imported leads to.</p>

                            <select value={assignToCSR} onChange={(e) => setAssignToCSR(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl mb-8 font-bold border-2 border-slate-100 focus:border-indigo-500 outline-none">
                                <option value="">Click to select member...</option>
                                {data?.csrPerformance?.map((csr: any) => (
                                    <option key={csr.csrId || csr._id} value={csr.csrId || csr._id}>{csr.name}</option>
                                ))}
                            </select>

                            <div className="flex gap-4">
                                <button onClick={() => setShowExcelPreview(false)} className="flex-1 font-bold text-slate-400">Cancel</button>
                                <button onClick={confirmExcelUpload} disabled={!assignToCSR || uploading} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg disabled:opacity-50">
                                    {uploading ? "Importing..." : "Import Leads Now"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* CSR Signup Modal */}
                {showCSRModal && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-[100] p-4">
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl">
                            <h2 className="text-2xl font-black text-slate-800 mb-6">New Team Member</h2>
                            <form onSubmit={handleCreateCSR} className="space-y-4">
                                <input className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none font-medium" placeholder="Full Name" value={csrForm.name} onChange={e => setCsrForm({ ...csrForm, name: e.target.value })} required />
                                <input className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none font-medium" type="email" placeholder="Email Address" value={csrForm.email} onChange={e => setCsrForm({ ...csrForm, email: e.target.value })} required />
                                <input className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none font-medium" type="password" placeholder="Set Password" value={csrForm.password} onChange={e => setCsrForm({ ...csrForm, password: e.target.value })} required />
                                <div className="flex gap-4 pt-6">
                                    <button type="button" onClick={() => setShowCSRModal(false)} className="flex-1 font-bold text-slate-400">Cancel</button>
                                    <button type="submit" disabled={csrLoading} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg">
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