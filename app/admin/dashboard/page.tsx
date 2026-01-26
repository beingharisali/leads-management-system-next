"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Toaster, toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
    FiPlus, FiUploadCloud, FiLogOut, FiTrendingUp,
    FiRefreshCw, FiTrash2, FiUserPlus, FiX, FiUser, FiPhone,
    FiSearch, FiBook, FiMap, FiShare2, FiCalendar
} from "react-icons/fi";

// APIs
import { getAdminStats } from "@/services/dashboard.api";
import { createCSR, updateCSRStatus } from "@/services/auth.api";
import { getLeadsByRole, bulkInsertLeads, deleteAllLeads, createLead, LeadPayload } from "@/services/lead.api";

// Components
import CSRSidebar from "@/components/CsrSidebar";
import CSRLeadsPanel from "@/components/CsrLeadPanel";
import DashboardGraphs from "@/components/DashboardGraphs";
import SummaryCard from "@/components/SummaryCard";
import Loading from "@/components/Loading";
import ErrorMessage from "@/components/ErrorMessage";

// --- TYPES DEFINITION ---
type FilterType = "day" | "week" | "month" | "custom";

export default function AdminDashboardPage() {
    const [data, setData] = useState<any>(null);
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    // Filter & Search States
    const [filter, setFilter] = useState<FilterType>("month");
    const [customDates, setCustomDates] = useState({ start: "", end: "" });
    const [searchQuery, setSearchQuery] = useState("");

    // Modal States
    const [uploading, setUploading] = useState(false);
    const [showExcelPreview, setShowExcelPreview] = useState(false);
    const [showAddCSRModal, setShowAddCSRModal] = useState(false);
    const [showCreateLeadModal, setShowCreateLeadModal] = useState(false);
    const [showCustomDateModal, setShowCustomDateModal] = useState(false);

    const [selectedCSR, setSelectedCSR] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [assignToCSR, setAssignToCSR] = useState<string>("");

    const [csrForm, setCsrForm] = useState({ name: "", email: "", password: "", role: "csr" });
    const [leadForm, setLeadForm] = useState({
        name: "", phone: "", city: "", course: "", source: "", remarks: "", assignedTo: ""
    });

    /* ================= DATA FETCHING ================= */
    const fetchDashboardData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        try {
            // TypeScript Fix: Explicitly defining as string to allow concatenation
            let filterParam: string = filter;
            if (filter === "custom" && customDates.start && customDates.end) {
                filterParam = `custom&start=${customDates.start}&end=${customDates.end}`;
            }

            const [statsRes, leadsRes] = await Promise.all([
                getAdminStats(filterParam),
                getLeadsByRole("admin"),
            ]);

            setData(statsRes);
            setLeads(Array.isArray(leadsRes) ? leadsRes : []);
            setError("");
        } catch (err: any) {
            setError(err.message || "Failed to load dashboard data");
            toast.error("Error fetching data");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filter, customDates]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    /* ================= HANDLERS ================= */
    const handleLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const toastId = toast.loading("Creating Lead...");
        try {
            const payload: LeadPayload = { ...leadForm, status: "new" };
            await createLead(payload);
            toast.success("Lead Created Successfully!", { id: toastId });
            setShowCreateLeadModal(false);
            setLeadForm({ name: "", phone: "", city: "", course: "", source: "", remarks: "", assignedTo: "" });
            fetchDashboardData(true);
        } catch (err: any) {
            toast.error(err.message || "Failed to create lead", { id: toastId });
        }
    };

    const handleCSRSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const toastId = toast.loading("Registering Agent...");
        try {
            await createCSR(csrForm);
            toast.success("Agent Created!", { id: toastId });
            setShowAddCSRModal(false);
            setCsrForm({ name: "", email: "", password: "", role: "csr" });
            fetchDashboardData(true);
        } catch (err: any) {
            toast.error(err.message || "Failed to create", { id: toastId });
        }
    };

    const handleToggleStatus = async (csrId: string, currentStatus: string) => {
        const toastId = toast.loading("Updating agent status...");
        const nextStatus = currentStatus.toLowerCase().trim() === "active" ? "inactive" : "active";
        try {
            setData((prev: any) => ({
                ...prev,
                csrPerformance: prev.csrPerformance.map((csr: any) =>
                    (csr._id === csrId || csr.csrId === csrId) ? { ...csr, status: nextStatus } : csr
                )
            }));
            await updateCSRStatus(csrId, currentStatus);
            toast.success(`Agent is now ${nextStatus.toUpperCase()}`, { id: toastId });
        } catch (err: any) {
            toast.error("Server update failed", { id: toastId });
            fetchDashboardData(true);
        }
    };

    const confirmExcelUpload = async () => {
        if (!selectedFile || !assignToCSR) return toast.error("Please select an agent");
        setUploading(true);
        const toastId = toast.loading("Processing leads...");
        try {
            await bulkInsertLeads(selectedFile, assignToCSR);
            toast.success("Leads Imported!", { id: toastId });
            setShowExcelPreview(false);
            setSelectedFile(null);
            fetchDashboardData(true);
        } catch (err: any) {
            toast.error("Format error or network issue", { id: toastId });
        } finally {
            setUploading(false);
        }
    };

    /* ================= CALCULATIONS & FILTERING ================= */
    const stats = useMemo(() => {
        const sales = leads.filter(l => ["paid", "sale", "converted", "closed", "active"].includes(l.status?.toLowerCase()));
        const revenue = sales.reduce((sum, l) => sum + (Number(l.saleAmount) || 0), 0);
        const rate = leads.length > 0 ? ((sales.length / leads.length) * 100).toFixed(1) : "0";
        return { total: leads.length, sales: sales.length, revenue, rate };
    }, [leads]);

    const filteredLeads = useMemo(() => {
        let result = leads;
        if (selectedCSR) {
            result = result.filter(l => {
                const targetId = typeof l.assignedTo === 'object' ? (l.assignedTo?._id || l.assignedTo?.csrId) : l.assignedTo;
                return targetId === selectedCSR;
            });
        }
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(l =>
                l.name?.toLowerCase().includes(query) || l.phone?.includes(query)
            );
        }
        return result;
    }, [leads, selectedCSR, searchQuery]);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(val);
    };

    if (loading && !data) return <Loading />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <div className="p-4 md:p-8 bg-[#F8FAFC] min-h-screen font-sans">
            <Toaster position="bottom-center" />

            {/* --- HEADER --- */}
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                        <FiTrendingUp className="text-white text-2xl" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Admin <span className="text-indigo-600">Console</span></h1>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mt-0.5">
                            Real-time Sync {refreshing && <FiRefreshCw className="animate-spin text-indigo-500" />}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <button onClick={() => setShowCreateLeadModal(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
                        <FiPlus size={18} /> Create Lead
                    </button>
                    <button onClick={() => setShowAddCSRModal(true)} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl font-bold text-sm shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95">
                        <FiUserPlus size={18} /> New Csr
                    </button>
                    <label className="flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-100 px-6 py-3.5 rounded-2xl font-bold text-sm cursor-pointer hover:bg-emerald-100 transition-all">
                        <FiUploadCloud size={18} /> {uploading ? "Importing..." : "Excel Import"}
                        <input type="file" hidden accept=".xlsx, .xls" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setSelectedFile(file); setShowExcelPreview(true); } }} />
                    </label>
                    <button onClick={() => { localStorage.clear(); window.location.href = "/login"; }} className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all">
                        <FiLogOut size={20} />
                    </button>
                </div>
            </header>

            {/* --- DATE FILTER BAR --- */}
            <div className="flex flex-wrap items-center gap-3 mb-8 bg-white p-3 rounded-[2rem] border border-slate-100 shadow-sm w-fit">
                {(['day', 'week', 'month'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${filter === f ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-400 hover:bg-slate-50"}`}
                    >
                        {f}
                    </button>
                ))}
                <button
                    onClick={() => setShowCustomDateModal(true)}
                    className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${filter === "custom" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-slate-400 hover:bg-slate-50 border-l border-slate-100 pl-5"}`}
                >
                    <FiCalendar /> {filter === "custom" && customDates.start ? `${customDates.start} to ${customDates.end}` : "Custom Range"}
                </button>
            </div>

            {/* --- STATS CARDS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <SummaryCard title="Total Pool" value={stats.total.toString()} color="purple" trend="System Wide" />
                <SummaryCard title="Conversions" value={stats.sales.toString()} color="green" trend="Target Hit" />
                <SummaryCard title="Total Revenue" value={formatCurrency(stats.revenue)} color="blue" trend="Gross PKR" />
                <SummaryCard title="Performance" value={`${stats.rate}%`} color="orange" trend="Efficiency" />
            </div>

            {/* --- MAIN CONTENT GRID --- */}
            <div className="grid grid-cols-12 gap-8">
                <aside className="col-span-12 lg:col-span-3">
                    <CSRSidebar
                        csrs={data?.csrPerformance || []}
                        selectedCSR={selectedCSR}
                        onSelect={setSelectedCSR}
                        onToggleStatus={handleToggleStatus}
                    />
                </aside>

                <section className="col-span-12 lg:col-span-9 space-y-8">
                    <DashboardGraphs
                        leadsStats={data?.leadsStats}
                        salesStats={data?.salesStats}
                        filter={filter}
                    />

                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-7 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center bg-slate-50/40 gap-4">
                            <h2 className="font-black text-slate-800 text-lg">Active Leads ({filteredLeads.length})</h2>

                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="relative flex-1 md:w-64">
                                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search name or phone..."
                                        className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 font-bold"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={async () => { if (window.confirm("DANGER: This will wipe all leads permanently. Continue?")) { await deleteAllLeads(); fetchDashboardData(true); } }}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 text-rose-600 rounded-xl font-black text-[10px] hover:bg-rose-600 hover:text-white transition-all whitespace-nowrap"
                                >
                                    <FiTrash2 /> Wipe DB
                                </button>
                            </div>
                        </div>
                        <CSRLeadsPanel
                            leads={filteredLeads}
                            selectedCSR={selectedCSR}
                            onConvertToSale={() => fetchDashboardData(true)}
                            onDeleteLead={() => fetchDashboardData(true)}
                        />
                    </div>
                </section>
            </div>

            {/* ================= MODALS ================= */}
            <AnimatePresence>
                {showCustomDateModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-[200] p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl">
                            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><FiCalendar className="text-indigo-600" /> Select Range</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Start Date</label>
                                    <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold mt-1"
                                        value={customDates.start} onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">End Date</label>
                                    <input type="date" className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 outline-none font-bold mt-1"
                                        value={customDates.end} onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })} />
                                </div>
                                <button
                                    onClick={() => {
                                        if (!customDates.start || !customDates.end) return toast.error("Please select both dates");
                                        setFilter("custom");
                                        setShowCustomDateModal(false);
                                        fetchDashboardData();
                                    }}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all mt-4"
                                >
                                    APPLY FILTER
                                </button>
                                <button onClick={() => setShowCustomDateModal(false)} className="w-full text-slate-400 font-bold text-sm">CANCEL</button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {showCreateLeadModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-[150] p-4">
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl relative">
                            <button onClick={() => setShowCreateLeadModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-rose-500 transition-colors"><FiX size={24} /></button>
                            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3"><FiPlus className="text-indigo-600" /> New Lead Entry</h2>
                            <form onSubmit={handleLeadSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Customer Name</label>
                                        <div className="relative">
                                            <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input required className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border border-slate-100 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" placeholder="Ali Ahmed" value={leadForm.name} onChange={e => setLeadForm({ ...leadForm, name: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Phone Number</label>
                                        <div className="relative">
                                            <FiPhone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input required className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border border-slate-100 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" placeholder="03XXXXXXXXX" value={leadForm.phone} onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2">City Name</label>
                                        <div className="relative">
                                            <FiMap className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input required className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border border-slate-100 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" placeholder="e.g. Lahore" value={leadForm.city} onChange={e => setLeadForm({ ...leadForm, city: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Source</label>
                                        <div className="relative">
                                            <FiShare2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                                            <select required className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border border-slate-100 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 appearance-none" value={leadForm.source} onChange={e => setLeadForm({ ...leadForm, source: e.target.value })}>
                                                <option value="">Select Source</option>
                                                <option value="Facebook">Facebook</option>
                                                <option value="Instagram">Instagram</option>
                                                <option value="WhatsApp">WhatsApp</option>
                                                <option value="LinkedIn">LinkedIn</option>
                                                <option value="TikTok">TikTok</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Course Name</label>
                                    <div className="relative">
                                        <FiBook className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input required className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border border-slate-100 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" placeholder="e.g. Graphic Design" value={leadForm.course} onChange={e => setLeadForm({ ...leadForm, course: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Assign To Agent</label>
                                    <select required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" value={leadForm.assignedTo} onChange={e => setLeadForm({ ...leadForm, assignedTo: e.target.value })}>
                                        <option value="">Select an Agent...</option>
                                        {data?.csrPerformance?.map((c: any) => (
                                            <option key={c._id || c.csrId} value={c._id || c.csrId}>{c.name} ({c.status})</option>
                                        ))}
                                    </select>
                                </div>
                                <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] mt-4">SAVE & ASSIGN LEAD</button>
                            </form>
                        </motion.div>
                    </div>
                )}

                {showExcelPreview && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-[150] p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[3rem] w-full max-w-md p-10 text-center relative shadow-2xl">
                            <button onClick={() => setShowExcelPreview(false)} className="absolute top-6 right-6 text-slate-300 hover:text-rose-500"><FiX size={24} /></button>
                            <div className="h-20 w-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6"><FiUploadCloud size={40} /></div>
                            <h2 className="text-2xl font-black text-slate-800 mb-8">Assign Bulk Leads</h2>
                            <select className="w-full p-5 bg-slate-50 rounded-2xl font-bold mb-8 border-2 border-slate-100 outline-none focus:border-indigo-500" value={assignToCSR} onChange={e => setAssignToCSR(e.target.value)}>
                                <option value="">Select Agent...</option>
                                {data?.csrPerformance?.map((c: any) => (<option key={c._id || c.csrId} value={c._id || c.csrId}>{c.name}</option>))}
                            </select>
                            <button onClick={confirmExcelUpload} disabled={uploading || !assignToCSR} className="w-full p-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl disabled:opacity-50 hover:bg-indigo-700 transition-all">{uploading ? "IMPORTING..." : "CONFIRM IMPORT"}</button>
                        </motion.div>
                    </div>
                )}

                {showAddCSRModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-[150] p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-[3rem] w-full max-w-md p-10 relative shadow-2xl">
                            <h2 className="text-2xl font-black text-slate-800 mb-6">Register Agent</h2>
                            <form onSubmit={handleCSRSubmit} className="space-y-4">
                                <input className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 outline-none font-bold" placeholder="Full Name" required value={csrForm.name} onChange={e => setCsrForm({ ...csrForm, name: e.target.value })} />
                                <input className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 outline-none font-bold" placeholder="Email Address" type="email" required value={csrForm.email} onChange={e => setCsrForm({ ...csrForm, email: e.target.value })} />
                                <input className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 outline-none font-bold" placeholder="Password" type="password" required value={csrForm.password} onChange={e => setCsrForm({ ...csrForm, password: e.target.value })} />
                                <button type="submit" className="w-full p-5 bg-slate-900 text-white rounded-2xl font-black hover:bg-black transition-all">CREATE ACCOUNT</button>
                                <button type="button" onClick={() => setShowAddCSRModal(false)} className="w-full p-4 text-slate-400 font-bold">CANCEL</button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}