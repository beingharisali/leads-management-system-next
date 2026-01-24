"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Toaster, toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
    FiPlus,
    FiUploadCloud,
    FiLogOut,
    FiTrendingUp,
    FiRefreshCw,
    FiTrash2,
    FiUserPlus,
    FiX,
} from "react-icons/fi";

// APIs
import { getAdminStats } from "@/services/dashboard.api";
import { updateCSRStatus, createCSR } from "@/services/auth.api";
import { getLeadsByRole, bulkInsertLeads, deleteAllLeads, createLead } from "@/services/lead.api";

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

    // Modal & Action States
    const [uploading, setUploading] = useState(false);
    const [showExcelPreview, setShowExcelPreview] = useState(false);
    const [showManualLeadModal, setShowManualLeadModal] = useState(false);
    const [showAddCSRModal, setShowAddCSRModal] = useState(false);

    const [selectedCSR, setSelectedCSR] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [assignToCSR, setAssignToCSR] = useState<string>("");

    // Form States
    const [manualLeadForm, setManualLeadForm] = useState({
        name: "", phone: "", course: "Web Development", source: "Manual",
        city: "", assignedTo: "", status: "New", remarks: "", followUpDate: ""
    });

    const [csrForm, setCsrForm] = useState({
        name: "", email: "", password: "", role: "csr"
    });

    /* ================= DATA FETCHING (FIXED REDLINE) ================= */
    const fetchDashboardData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        try {
            const [statsRes, leadsRes] = await Promise.all([
                getAdminStats(filter),
                getLeadsByRole("admin"),
            ]);

            setData(statsRes);

            // Redline Fix: Cast leadsRes as any to access .data
            const responseData = leadsRes as any;
            const extractedLeads = responseData?.data && Array.isArray(responseData.data)
                ? responseData.data
                : (Array.isArray(leadsRes) ? leadsRes : []);

            setLeads(extractedLeads);
            setError("");
        } catch (err: any) {
            setError(err.message || "Failed to load dashboard data");
            toast.error("Fetch Error: Check connection");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    /* ================= ACTION HANDLERS ================= */

    const handleCSRSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const toastId = toast.loading("Creating CSR account...");
        try {
            await createCSR(csrForm);
            toast.success("CSR Registered Successfully!", { id: toastId });
            setShowAddCSRModal(false);
            setCsrForm({ name: "", email: "", password: "", role: "csr" });
            fetchDashboardData(true);
        } catch (err: any) {
            toast.error(err.message || "Registration failed", { id: toastId });
        }
    };

    const handleManualLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualLeadForm.assignedTo) return toast.error("Please select a CSR first");
        const toastId = toast.loading("Creating lead...");
        try {
            await createLead(manualLeadForm as any);
            toast.success("Lead created!", { id: toastId });
            setShowManualLeadModal(false);
            setManualLeadForm({
                name: "", phone: "", course: "Web Development", source: "Manual",
                city: "", assignedTo: "", status: "New", remarks: "", followUpDate: ""
            });
            fetchDashboardData(true);
        } catch (err: any) {
            toast.error(err.message || "Creation failed", { id: toastId });
        }
    };

    const confirmExcelUpload = async () => {
        if (!selectedFile || !assignToCSR) return toast.error("Select file and CSR first");
        setUploading(true);
        const toastId = toast.loading("Uploading leads...");
        try {
            await bulkInsertLeads(selectedFile, assignToCSR);
            toast.success("Import Successful!", { id: toastId });
            setShowExcelPreview(false);
            setSelectedFile(null);
            setAssignToCSR("");
            fetchDashboardData(true);
        } catch (err: any) {
            toast.error(err.message || "Excel Upload Failed", { id: toastId });
        } finally {
            setUploading(false);
        }
    };

    const handleToggleStatus = async (csrId: string, currentStatus: string) => {
        const newStatus = currentStatus === "active" ? "inactive" : "active";
        try {
            await updateCSRStatus(csrId, newStatus);
            toast.success(`User is now ${newStatus}`);
            fetchDashboardData(true);
        } catch (err: any) {
            toast.error("Status update failed");
        }
    };

    const handleDeleteAllLeads = async () => {
        if (!window.confirm("CRITICAL: Wipe all lead data?")) return;
        const toastId = toast.loading("Wiping database...");
        try {
            await deleteAllLeads();
            toast.success("Database cleared!", { id: toastId });
            fetchDashboardData(true);
        } catch (err: any) {
            toast.error("Deletion failed", { id: toastId });
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        window.location.href = "/login";
    };

    /* ================= CALCULATIONS ================= */
    const stats = useMemo(() => {
        const safeLeads = leads || [];
        const sales = safeLeads.filter(l => ["paid", "sale", "closed"].includes(l.status?.toLowerCase()));
        const revenue = sales.reduce((sum, l) => sum + (Number(l.saleAmount) || 0), 0);
        const convRate = safeLeads.length > 0 ? ((sales.length / safeLeads.length) * 100).toFixed(1) : "0";
        return { total: safeLeads.length, sales: sales.length, revenue, rate: convRate };
    }, [leads]);

    const filteredLeads = useMemo(() => {
        if (!selectedCSR) return leads;
        return leads.filter(l => (typeof l.assignedTo === 'object' ? l.assignedTo?._id : l.assignedTo) === selectedCSR);
    }, [leads, selectedCSR]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', minimumFractionDigits: 0 }).format(val);
    };

    if (loading && !data) return <Loading />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <div className="p-4 md:p-8 bg-[#F8FAFC] min-h-screen">
            <Toaster position="top-right" />

            {/* HEADER */}
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-6 rounded-3xl shadow-sm border border-slate-100 gap-6 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        Admin <span className="bg-indigo-600 text-white px-3 py-1 rounded-xl text-sm italic">Panel</span>
                    </h1>
                    <p className="text-slate-400 text-[10px] mt-1 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                        System Live {refreshing && <FiRefreshCw className="animate-spin text-indigo-500" />}
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button onClick={() => setShowManualLeadModal(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md">
                        <FiPlus /> Add Lead
                    </button>

                    <button onClick={() => setShowAddCSRModal(true)} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-md">
                        <FiUserPlus /> Add CSR
                    </button>

                    <label className="flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-100 px-5 py-3 rounded-2xl font-bold text-sm cursor-pointer hover:bg-emerald-100 transition-all">
                        <FiUploadCloud /> {uploading ? "Wait..." : "Import Excel"}
                        <input type="file" hidden accept=".xlsx, .xls" onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) { setSelectedFile(file); setShowExcelPreview(true); }
                        }} />
                    </label>

                    <button onClick={handleLogout} className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all">
                        <FiLogOut />
                    </button>
                </div>
            </header>

            {/* STATS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <SummaryCard title="Total Leads" value={stats.total.toString()} color="purple" trend="Overall" />
                <SummaryCard title="Closed Paid" value={stats.sales.toString()} color="green" trend="Target" />
                <SummaryCard title="Total Revenue" value={formatCurrency(stats.revenue)} color="blue" trend="Verified" />
                <SummaryCard title="Performance" value={`${stats.rate}%`} color="orange" trend="Rate" />
            </div>

            <div className="grid grid-cols-12 gap-8">
                <aside className="col-span-12 lg:col-span-3">
                    <div className="sticky top-8 space-y-4">
                        <CSRSidebar csrs={data?.csrPerformance || []} selectedCSR={selectedCSR} onSelect={setSelectedCSR} onToggleStatus={handleToggleStatus} />
                        {selectedCSR && (
                            <button onClick={() => setSelectedCSR(null)} className="w-full p-4 text-xs font-black text-indigo-600 bg-indigo-50 rounded-2xl border border-indigo-100">
                                SHOW ALL SYSTEM LEADS
                            </button>
                        )}
                    </div>
                </aside>

                <section className="col-span-12 lg:col-span-9 space-y-8">
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2"><FiTrendingUp className="text-indigo-600" /> Growth Analytics</h3>
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                {["day", "week", "month"].map((f) => (
                                    <button key={f} onClick={() => setFilter(f as any)} className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${filter === f ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}>{f}</button>
                                ))}
                            </div>
                        </div>
                        <DashboardGraphs leadsStats={data?.leadsStats} salesStats={data?.salesStats} filter={filter} />
                    </div>

                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                            <div className="flex items-center gap-4">
                                <h2 className="font-black text-slate-800">Leads Database</h2>
                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">{filteredLeads.length} Records</span>
                            </div>
                            <button onClick={handleDeleteAllLeads} className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs hover:bg-rose-600 hover:text-white transition-all"><FiTrash2 /> Wipe Data</button>
                        </div>
                        <CSRLeadsPanel leads={filteredLeads} selectedCSR={selectedCSR} onConvertToSale={() => fetchDashboardData(true)} onDeleteLead={() => fetchDashboardData(true)} />
                    </div>
                </section>
            </div>

            {/* MODALS */}
            <AnimatePresence>
                {/* ADD CSR MODAL */}
                {showAddCSRModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-[130] p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden">
                            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                                <h2 className="text-xl font-bold">Create CSR Account</h2>
                                <button onClick={() => setShowAddCSRModal(false)}><FiX size={24} /></button>
                            </div>
                            <form onSubmit={handleCSRSubmit} className="p-8 space-y-4">
                                <input required placeholder="Full Name" className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-indigo-500/20 font-bold"
                                    value={csrForm.name} onChange={e => setCsrForm({ ...csrForm, name: e.target.value })} />
                                <input required type="email" placeholder="Email Address" className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-indigo-500/20 font-bold"
                                    value={csrForm.email} onChange={e => setCsrForm({ ...csrForm, email: e.target.value })} />
                                <input required type="password" placeholder="Password" className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 ring-indigo-500/20 font-bold"
                                    value={csrForm.password} onChange={e => setCsrForm({ ...csrForm, password: e.target.value })} />
                                <button type="submit" className="w-full bg-slate-900 text-white p-5 rounded-2xl font-black shadow-lg hover:opacity-90 transition-all">REGISTER AGENT</button>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* MANUAL LEAD MODAL */}
                {showManualLeadModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-[110] p-4">
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden">
                            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                                <h2 className="text-xl font-bold">New Lead Entry</h2>
                                <button onClick={() => setShowManualLeadModal(false)}><FiX size={24} /></button>
                            </div>
                            <form onSubmit={handleManualLeadSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <input required placeholder="Client Name" className="p-4 bg-slate-50 rounded-2xl font-bold" value={manualLeadForm.name} onChange={e => setManualLeadForm({ ...manualLeadForm, name: e.target.value })} />
                                <input required placeholder="Phone" className="p-4 bg-slate-50 rounded-2xl font-bold" value={manualLeadForm.phone} onChange={e => setManualLeadForm({ ...manualLeadForm, phone: e.target.value })} />
                                <input placeholder="City" className="p-4 bg-slate-50 rounded-2xl font-bold" value={manualLeadForm.city} onChange={e => setManualLeadForm({ ...manualLeadForm, city: e.target.value })} />
                                <select required className="p-4 bg-slate-50 rounded-2xl font-bold text-indigo-600" value={manualLeadForm.assignedTo} onChange={e => setManualLeadForm({ ...manualLeadForm, assignedTo: e.target.value })}>
                                    <option value="">Assign To CSR...</option>
                                    {data?.csrPerformance?.map((c: any) => <option key={c.csrId || c._id} value={c.csrId || c._id}>{c.name}</option>)}
                                </select>
                                <textarea placeholder="Remarks" className="p-4 bg-slate-50 rounded-2xl md:col-span-2 h-24 font-medium" value={manualLeadForm.remarks} onChange={e => setManualLeadForm({ ...manualLeadForm, remarks: e.target.value })} />
                                <button type="submit" className="md:col-span-2 bg-indigo-600 text-white p-5 rounded-2xl font-black shadow-lg">SAVE LEAD</button>
                            </form>
                        </motion.div>
                    </div>
                )}

                {/* EXCEL MODAL */}
                {showExcelPreview && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-[120] p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl text-center">
                            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6"><FiUploadCloud size={40} /></div>
                            <h2 className="text-2xl font-black text-slate-800 mb-2">Assign Batch</h2>
                            <select value={assignToCSR} onChange={(e) => setAssignToCSR(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl mb-8 font-bold border-2 border-slate-100 outline-none">
                                <option value="">Target CSR...</option>
                                {data?.csrPerformance?.map((c: any) => <option key={c.csrId || c._id} value={c.csrId || c._id}>{c.name}</option>)}
                            </select>
                            <div className="flex gap-4">
                                <button onClick={() => { setShowExcelPreview(false); setSelectedFile(null); }} className="flex-1 font-bold text-slate-400">Cancel</button>
                                <button onClick={confirmExcelUpload} disabled={!assignToCSR || uploading} className="flex-[2] p-4 bg-slate-900 text-white rounded-2xl font-black">IMPORT NOW</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}