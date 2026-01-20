"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Toaster, toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";

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
    // Data States
    const [data, setData] = useState<any>(null);
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState<"day" | "week" | "month">("day");

    // Action States
    const [uploading, setUploading] = useState(false);
    const [csrLoading, setCsrLoading] = useState(false);
    const [showCSRModal, setShowCSRModal] = useState(false);
    const [showExcelPreview, setShowExcelPreview] = useState(false);

    // Form & Selection States
    const [csrForm, setCsrForm] = useState({ name: "", email: "", password: "" });
    const [selectedCSR, setSelectedCSR] = useState<string | null>(null);
    const [previewLeads, setPreviewLeads] = useState<any[]>([]);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    /* ================= DYNAMIC FILTERING LOGIC ================= */
    // Yeh logic leads ko filter karega based on Day, Week, Month
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

    /* ================= FETCH DATA ================= */
    const fetchDashboardData = useCallback(async (showSilent = false) => {
        if (!showSilent) setLoading(true);
        try {
            const [statsRes, leadsRes] = await Promise.all([
                getAdminStats(filter),
                getLeadsByRole("admin"),
            ]);

            // Filter out leads that are already converted/sale
            const activeLeads = (leadsRes || []).filter(
                (l: any) => l.status !== "sale" && l.status !== "converted"
            );

            setData(statsRes);
            setLeads(activeLeads);
            setError("");
        } catch (err: any) {
            console.error("Dashboard Fetch Error:", err);
            setError(err.message || "Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    /* ================= ACTIONS ================= */

    const handleDataRefresh = async () => {
        await fetchDashboardData(true); // Silent refresh for smoother UI
    };

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = "/login";
    };

    const handleCreateCSR = async (e: React.FormEvent) => {
        e.preventDefault();
        setCsrLoading(true);
        try {
            await createCSR(csrForm);
            toast.success("CSR account created!");
            setCsrForm({ name: "", email: "", password: "" });
            setShowCSRModal(false);
            fetchDashboardData();
        } catch (err: any) {
            toast.error(err.message || "Could not create CSR");
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
        try {
            const invalidRow = previewLeads.find(l => !l.phone || l.phone.length < 5);
            if (invalidRow) throw new Error(`Invalid phone number near row ${invalidRow.rowIndex}`);

            await bulkInsertLeads(selectedFile);
            toast.success("Leads imported successfully!");
            setShowExcelPreview(false);
            setSelectedFile(null);
            fetchDashboardData();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || "Server Error");
        } finally {
            setUploading(false);
        }
    };

    if (loading && !data) return <Loading />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <div className="p-4 md:p-8 space-y-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans overflow-hidden">
            <Toaster position="top-right" />

            {/* --- HEADER --- */}
            <motion.header
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200/60 gap-4"
            >
                <div className="text-center md:text-left">
                    <h1 className="text-3xl font-black tracking-tight text-slate-800">
                        Admin <span className="text-indigo-600 italic">Central</span>
                    </h1>
                    <p className="text-slate-400 text-sm font-medium italic uppercase tracking-wider">
                        Monitoring {filter}ly performance
                    </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                    <button onClick={() => setShowCSRModal(true)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-lg">+ Create CSR</button>
                    <label className={`bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm cursor-pointer shadow-lg active:scale-95 transition-all ${uploading ? 'opacity-50' : 'hover:bg-indigo-700'}`}>
                        {uploading ? "Importing..." : "Bulk Import"}
                        <input type="file" hidden accept=".xlsx, .xls" disabled={uploading} onChange={handleExcelSelection} />
                    </label>
                    <button onClick={handleLogout} className="bg-rose-50 text-rose-600 px-6 py-3 rounded-2xl font-bold text-sm hover:bg-rose-100 transition-all">Logout</button>
                </div>
            </motion.header>

            {/* --- STATS GRID --- */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
                <SummaryCard title="Active Leads" value={filteredLeadsByTime.length} trend="+12%" />
                <SummaryCard title="Total Sales" value={data?.totalSales || 0} color="green" />
                <SummaryCard title="Team Size" value={data?.totalCSRs || 0} color="blue" />
                <SummaryCard title="Conversion" value={data?.conversionRate || "0%"} color="purple" />
            </motion.div>

            {/* --- MAIN CONTENT --- */}
            <main className="grid grid-cols-12 gap-8">
                {/* Sidebar */}
                <aside className="col-span-12 lg:col-span-3">
                    <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="sticky top-8">
                        <CSRSidebar
                            csrs={data?.csrPerformance || []}
                            selectedCSR={selectedCSR}
                            onSelect={setSelectedCSR}
                        />
                    </motion.div>
                </aside>

                {/* Main Panel */}
                <section className="col-span-12 lg:col-span-9 space-y-8">
                    {/* LEADS PANEL - SYNCED WITH FILTER */}
                    <motion.div
                        key={filter} // Forces animation when filter changes
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden min-h-[500px]"
                    >
                        <CSRLeadsPanel
                            leads={filteredLeadsByTime} // Here is the magic
                            selectedCSR={selectedCSR}
                            onConvertToSale={handleDataRefresh}
                            onDeleteLead={handleDataRefresh}
                        />
                    </motion.div>

                    {/* GRAPHS PANEL */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm"
                    >
                        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Analytics Overview</h3>
                            <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner">
                                {["day", "week", "month"].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f as any)}
                                        className={`px-6 py-2 rounded-xl text-xs font-black capitalize transition-all duration-300 ${filter === f ? "bg-white text-indigo-600 shadow-sm scale-105" : "text-slate-400 hover:text-slate-600"}`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="h-[400px]">
                            {data?.leadsStats && (
                                <DashboardGraphs
                                    leadsStats={data.leadsStats}
                                    salesStats={data.salesStats}
                                    filter={filter}
                                    setFilter={setFilter}
                                />
                            )}
                        </div>
                    </motion.div>
                </section>
            </main>

            {/* --- MODALS --- */}
            <AnimatePresence>
                {showExcelPreview && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl p-10 flex flex-col border border-slate-100"
                        >
                            <h2 className="text-2xl font-black text-slate-800">Review Import</h2>
                            <div className="flex-1 max-h-[400px] overflow-y-auto border border-slate-100 rounded-3xl my-6 custom-scrollbar">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-400 text-[10px] font-bold sticky top-0 uppercase">
                                        <tr><th className="p-4">Name</th><th className="p-4">Phone</th><th className="p-4">Course</th></tr>
                                    </thead>
                                    <tbody>
                                        {previewLeads.map((l, i) => (
                                            <tr key={i} className="border-t border-slate-50">
                                                <td className="p-4 font-semibold">{l.name}</td>
                                                <td className="p-4 text-indigo-500 font-mono">{l.phone}</td>
                                                <td className="p-4">{l.course}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setShowExcelPreview(false)} className="flex-1 font-bold text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
                                <button onClick={confirmExcelUpload} disabled={uploading} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all">{uploading ? "Importing..." : "Confirm & Import"}</button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {showCSRModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-[60] p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white p-10 rounded-[3rem] w-full max-w-md shadow-2xl"
                        >
                            <h2 className="text-2xl font-black text-slate-800 mb-6">New Team Member</h2>
                            <form onSubmit={handleCreateCSR} className="space-y-4">
                                <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-indigo-600 transition-all" placeholder="Full Name" value={csrForm.name} onChange={e => setCsrForm({ ...csrForm, name: e.target.value })} required />
                                <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-indigo-600 transition-all" type="email" placeholder="Email" value={csrForm.email} onChange={e => setCsrForm({ ...csrForm, email: e.target.value })} required />
                                <input className="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-indigo-600 transition-all" type="password" placeholder="Password" value={csrForm.password} onChange={e => setCsrForm({ ...csrForm, password: e.target.value })} required minLength={6} />
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setShowCSRModal(false)} className="flex-1 font-bold text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
                                    <button type="submit" disabled={csrLoading} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all">{csrLoading ? "Creating..." : "Save Member"}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}