"use client";

import { useEffect, useState, useCallback } from "react";
import { Toaster, toast } from "react-hot-toast";
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

    /* ================= FETCH DATA ================= */
    const fetchDashboardData = useCallback(async () => {
        if (!data) setLoading(true);
        try {
            const [statsRes, leadsRes] = await Promise.all([
                getAdminStats(filter),
                getLeadsByRole("admin"),
            ]);

            const activeLeads = (leadsRes || []).filter((l: any) => l.status !== "sale");

            setData(statsRes);
            setLeads(activeLeads);
            setError("");
        } catch (err: any) {
            console.error("Dashboard Fetch Error:", err);
            setError(err.message || "Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    }, [filter, data]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    /* ================= ACTIONS ================= */
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

                // FIXED: 'raw: false' ensures we get formatted strings for phone numbers
                const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });

                if (rawJson.length === 0) throw new Error("File is empty");

                const headers = Object.keys(rawJson[0]);

                // Map leads for preview
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
        e.target.value = ""; // Reset input
    };

    const confirmExcelUpload = async () => {
        if (!selectedFile) return;
        setUploading(true);
        try {
            // Frontend validation for empty phone numbers
            const invalidRow = previewLeads.find(l => !l.phone || l.phone.length < 5);
            if (invalidRow) {
                throw new Error(`Invalid phone number found near row ${invalidRow.rowIndex}`);
            }

            await bulkInsertLeads(selectedFile);
            toast.success("Leads imported successfully!");
            setShowExcelPreview(false);
            setSelectedFile(null);
            fetchDashboardData();
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || err.message || "Server Error 500";
            toast.error(errorMsg);
        } finally {
            setUploading(false);
        }
    };

    if (loading && !data) return <Loading />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <div className="p-4 md:p-8 space-y-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
            <Toaster position="top-right" />

            {/* --- HEADER --- */}
            <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200/60 gap-4">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl font-black tracking-tight text-slate-800">
                        Admin <span className="text-indigo-600 italic">Central</span>
                    </h1>
                    <p className="text-slate-400 text-sm font-medium">Monitoring system performance and CSR leads</p>
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                    <button
                        onClick={() => setShowCSRModal(true)}
                        className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:scale-105 transition-all active:scale-95 shadow-lg shadow-slate-200"
                    >
                        + Create CSR
                    </button>
                    <label className={`bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all cursor-pointer shadow-lg shadow-indigo-100 ${uploading ? 'opacity-50' : 'hover:bg-indigo-700'}`}>
                        {uploading ? "Importing..." : "Bulk Import"}
                        <input type="file" hidden accept=".xlsx, .xls" disabled={uploading} onChange={handleExcelSelection} />
                    </label>
                    <button onClick={handleLogout} className="bg-rose-50 text-rose-600 px-6 py-3 rounded-2xl font-bold text-sm hover:bg-rose-100 transition-all">
                        Logout
                    </button>
                </div>
            </header>

            {/* --- STATS GRID --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <SummaryCard title="Total Leads" value={data?.totalLeads || 0} trend="+12%" />
                <SummaryCard title="Successful Sales" value={data?.totalSales || 0} color="green" />
                <SummaryCard title="Active Team" value={data?.totalCSRs || 0} color="blue" />
                <SummaryCard title="Win Rate" value={data?.conversionRate || "0%"} color="purple" />
            </div>

            {/* --- MAIN CONTENT --- */}
            <main className="grid grid-cols-12 gap-8">
                <aside className="col-span-12 lg:col-span-3">
                    <div className="sticky top-8">
                        <CSRSidebar
                            csrs={data?.csrPerformance || []}
                            selectedCSR={selectedCSR}
                            onSelect={setSelectedCSR}
                        />
                    </div>
                </aside>

                <section className="col-span-12 lg:col-span-9 space-y-8">
                    <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden min-h-[600px]">
                        <CSRLeadsPanel
                            leads={leads}
                            selectedCSR={selectedCSR}
                            onConvertToSale={fetchDashboardData}
                            onDeleteLead={fetchDashboardData}
                        />
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-bold text-slate-800">Performance Analytics</h3>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                {["day", "week", "month"].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f as any)}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${filter === f ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {data?.leadsStats && (
                            <DashboardGraphs
                                leadsStats={data.leadsStats}
                                salesStats={data.salesStats}
                                filter={filter}
                                setFilter={setFilter}
                            />
                        )}
                    </div>
                </section>
            </main>

            {/* --- EXCEL PREVIEW MODAL --- */}
            {showExcelPreview && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex justify-center items-center z-[60] p-4">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl p-10 flex flex-col border border-slate-100">
                        <h2 className="text-2xl font-black text-slate-800">Review Import</h2>
                        <p className="text-slate-400 mb-8 text-sm italic">Sample of records from {selectedFile?.name}</p>

                        <div className="flex-1 max-h-[400px] overflow-y-auto border border-slate-100 rounded-3xl mb-8">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50/50 text-slate-400 uppercase text-[10px] tracking-widest font-bold sticky top-0">
                                    <tr>
                                        <th className="p-5">Name</th>
                                        <th className="p-5">Phone</th>
                                        <th className="p-5">Course</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 text-slate-700">
                                    {previewLeads.map((lead, i) => (
                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-5 font-semibold">{lead.name}</td>
                                            <td className="p-5 font-mono text-indigo-500">{lead.phone}</td>
                                            <td className="p-5">{lead.course}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => { setShowExcelPreview(false); setSelectedFile(null); }}
                                className="flex-1 py-4 font-bold text-slate-400 hover:text-slate-600"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmExcelUpload}
                                disabled={uploading}
                                className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:bg-slate-300"
                            >
                                {uploading ? "Importing Data..." : "Confirm & Import"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CREATE CSR MODAL --- */}
            {showCSRModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex justify-center items-center z-[60] p-4">
                    <div className="bg-white p-10 rounded-[3rem] w-full max-w-md shadow-2xl border border-slate-100">
                        <div className="mb-8 text-center md:text-left">
                            <h2 className="text-2xl font-black text-slate-800">New Team Member</h2>
                            <p className="text-slate-400 text-sm">Create a new CSR account to start assigning leads.</p>
                        </div>

                        <form onSubmit={handleCreateCSR} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                                <input
                                    required
                                    className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none transition-all text-sm font-medium"
                                    placeholder="John Doe"
                                    value={csrForm.name}
                                    onChange={e => setCsrForm({ ...csrForm, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                                <input
                                    type="email" required
                                    className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none transition-all text-sm font-medium"
                                    placeholder="john@example.com"
                                    value={csrForm.email}
                                    onChange={e => setCsrForm({ ...csrForm, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Secure Password</label>
                                <input
                                    type="password" required minLength={6}
                                    className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-600 outline-none transition-all text-sm font-medium"
                                    placeholder="••••••••"
                                    value={csrForm.password}
                                    onChange={e => setCsrForm({ ...csrForm, password: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button type="button" onClick={() => setShowCSRModal(false)} className="flex-1 font-bold text-slate-400">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={csrLoading}
                                    className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                                >
                                    {csrLoading ? "Creating..." : "Save Member"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}