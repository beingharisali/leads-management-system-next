"use client";

import { useEffect, useState, useCallback, useMemo, FormEvent } from "react";
import { Toaster, toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
    FiPlus, FiUploadCloud, FiLogOut, FiTrendingUp,
    FiRefreshCw, FiTrash2, FiUserPlus, FiX, FiSearch, FiFilter,
    FiCheckCircle, FiDollarSign, FiUsers, FiActivity, FiPhoneCall, FiClock, FiXCircle, FiStar, FiAlertCircle, FiCalendar,
    FiChevronLeft, FiChevronRight
} from "react-icons/fi";

// APIs 
import { getAdminStats } from "@/services/dashboard.api";
import { createCSR, updateCSRStatus } from "@/services/auth.api";
import { getLeadsByRole, bulkInsertLeads, deleteAllLeads, createLead, LeadPayload, Lead } from "@/services/lead.api";

// Components
import CSRSidebar from "@/components/CsrSidebar";
import CSRLeadsPanel from "@/components/CsrLeadPanel";
import DashboardGraphs from "@/components/DashboardGraphs";
import SummaryCard from "@/components/SummaryCard";
import Loading from "@/components/Loading";
import ErrorMessage from "@/components/ErrorMessage";

export type FilterType = "day" | "week" | "month" | "custom";

/* ===================== TYPES & INTERFACES ===================== */
interface DashboardData {
    csrPerformance: any[];
    leadsStats: any;
    salesStats: any;
}

interface CSRFormData {
    name: string;
    email: string;
    password: string;
}

export default function AdminDashboardPage() {
    // --- Core States ---
    const [data, setData] = useState<DashboardData | null>(null);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    // --- Pagination State ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50; // Yahan aap 50 leads set kar sakte hain

    // --- Search & Filter States ---
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCSR, setSelectedCSR] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [activeGraphFilter, setActiveGraphFilter] = useState<FilterType>("month");

    // --- Custom Date States ---
    const [customRange, setCustomRange] = useState({ start: "", end: "" });
    const [showDatePicker, setShowDatePicker] = useState(false);

    // --- Modals & UI States ---
    const [modals, setModals] = useState({ excel: false, csr: false, lead: false });
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [assignToCSR, setAssignToCSR] = useState<string>("");

    // --- Form States ---
    const [leadForm, setLeadForm] = useState<LeadPayload>({
        name: "", phone: "", city: "", course: "", source: "", remarks: "", assignedTo: ""
    });

    const [csrForm, setCsrForm] = useState<CSRFormData>({
        name: "", email: "", password: ""
    });

    const [isStatusChanging, setIsStatusChanging] = useState(false);

    const statusOptions = ["new", "not pick", "interested", "follow-up", "paid", "rejected", "busy", "wrong number", "contacted"];

    /* ================= DATA FETCHING ================= */

    const fetchDashboardData = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setRefreshing(true);

        try {
            const [statsRes, leadsRes] = await Promise.all([
                getAdminStats(activeGraphFilter),
                getLeadsByRole("admin"),
            ]);

            setData(statsRes);
            setLeads((leadsRes as Lead[]) || []);
            setError("");
        } catch (err: any) {
            setError(err.message || "Connection to server failed");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeGraphFilter]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    /* ================= ACTION HANDLERS ================= */

    const toggleModal = (modalName: keyof typeof modals, state: boolean) => {
        setModals(prev => ({ ...prev, [modalName]: state }));
    };

    const handleToggleCSRStatus = async (id: string, currentStatus: string) => {
        if (isStatusChanging) return;
        const normalized = String(currentStatus || "active").toLowerCase().trim();
        const targetStatus = normalized === "active" ? "inactive" : "active";
        const toastId = toast.loading(`Setting status to ${targetStatus}...`);
        setIsStatusChanging(true);

        setData((prev: any) => {
            if (!prev) return prev;
            return {
                ...prev,
                csrPerformance: prev.csrPerformance.map((csr: any) =>
                    (csr._id === id || csr.csrId === id) ? { ...csr, status: targetStatus } : csr
                )
            };
        });

        try {
            const res = await updateCSRStatus(id, targetStatus);
            if (res) toast.success(`Agent is now ${targetStatus.toUpperCase()}`, { id: toastId });
        } catch (err: any) {
            setData((prev: any) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    csrPerformance: prev.csrPerformance.map((csr: any) =>
                        (csr._id === id || csr.csrId === id) ? { ...csr, status: normalized } : csr
                    )
                };
            });
            toast.error("Database connection failed", { id: toastId });
        } finally { setIsStatusChanging(false); }
    };

    const handleLeadSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const toastId = toast.loading("Creating Lead...");
        try {
            await createLead({ ...leadForm, status: "new" });
            toast.success("Lead Created Successfully", { id: toastId });
            toggleModal('lead', false);
            setLeadForm({ name: "", phone: "", city: "", course: "", source: "", remarks: "", assignedTo: "" });
            fetchDashboardData(true);
        } catch (err: any) { toast.error(err.message || "Failed", { id: toastId }); }
    };

    const handleCSRSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const toastId = toast.loading("Registering Agent...");
        try {
            await createCSR(csrForm);
            toast.success("Agent Registered!", { id: toastId });
            toggleModal('csr', false);
            setCsrForm({ name: "", email: "", password: "" });
            fetchDashboardData(true);
        } catch (err: any) { toast.error(err.message || "Failed", { id: toastId }); }
    };

    const confirmExcelUpload = async () => {
        if (!selectedFile || !assignToCSR) return toast.error("Select file and agent!");
        setUploading(true);
        const toastId = toast.loading("Importing leads...");
        try {
            await bulkInsertLeads(selectedFile, assignToCSR);
            toast.success("Import Successful", { id: toastId });
            toggleModal('excel', false);
            fetchDashboardData(true);
        } catch (err: any) { toast.error(err.message, { id: toastId }); } finally { setUploading(false); }
    };

    // FIXED: Delete All Leads Function
    const handleDeleteAll = async () => {
        if (!confirm("Are you sure you want to delete ALL leads? This action cannot be undone.")) return;

        const toastId = toast.loading("Deleting all leads...");
        try {
            await deleteAllLeads();
            toast.success("All leads deleted successfully", { id: toastId });
            fetchDashboardData(true);
        } catch (err: any) {
            toast.error(err.message || "Failed to delete leads", { id: toastId });
        }
    };

    /* ================= CALCULATIONS (DATE FILTER LOGIC) ================= */

    const stats = useMemo(() => {
        const now = new Date();
        const dateFiltered = leads.filter(l => {
            if (!l.createdAt) return false;
            const leadDate = new Date(l.createdAt);

            if (activeGraphFilter === "custom") {
                if (!customRange.start || !customRange.end) return true;
                const startDate = new Date(customRange.start);
                const endDate = new Date(customRange.end);
                endDate.setHours(23, 59, 59);
                return leadDate >= startDate && leadDate <= endDate;
            }

            const diffInDays = (now.getTime() - leadDate.getTime()) / (1000 * 3600 * 24);
            if (activeGraphFilter === "day") return diffInDays <= 1;
            if (activeGraphFilter === "week") return diffInDays <= 7;
            if (activeGraphFilter === "month") return diffInDays <= 30;
            return true;
        });

        const getCount = (statusName: string) =>
            dateFiltered.filter(l => l.status?.toLowerCase() === statusName.toLowerCase()).length;

        const sales = dateFiltered.filter(l => ["paid", "sale", "active"].includes(l.status?.toLowerCase() || ""));
        const revenue = sales.reduce((sum, l) => sum + (Number(l.saleAmount) || 0), 0);
        const rate = dateFiltered.length > 0 ? ((sales.length / dateFiltered.length) * 100).toFixed(1) : 0;

        return {
            total: dateFiltered.length,
            sales: sales.length,
            revenue,
            rate: Number(rate),
            paid: getCount("paid"),
            rejected: getCount("rejected"),
            busy: getCount("busy"),
            followUp: getCount("follow-up"),
            newLeads: getCount("new"),
            wrongNumber: getCount("wrong number"),
            contacted: getCount("contacted"),
            interested: getCount("interested"),
            notPick: getCount("not pick")
        };
    }, [leads, activeGraphFilter, customRange]);

    const filteredLeadsList = useMemo(() => {
        return leads.filter(l => {
            const agentId = typeof l.assignedTo === 'object' ? (l.assignedTo as any)?._id : l.assignedTo;
            const matchesCSR = !selectedCSR || agentId === selectedCSR;
            const matchesSearch = !searchQuery || l.name?.toLowerCase().includes(searchQuery.toLowerCase()) || l.phone?.includes(searchQuery);
            const matchesStatus = statusFilter === "all" || l.status?.toLowerCase() === statusFilter.toLowerCase();
            return matchesCSR && matchesSearch && matchesStatus;
        });
    }, [leads, selectedCSR, searchQuery, statusFilter]);

    // --- PAGINATION LOGIC ---
    const paginatedLeads = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredLeadsList.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredLeadsList, currentPage]);

    const totalPages = Math.ceil(filteredLeadsList.length / itemsPerPage);

    // Reset to page 1 when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter, selectedCSR]);

    if (loading && !data) return <Loading />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <div className="p-4 md:p-8 bg-[#F8FAFC] min-h-screen">
            <Toaster position="bottom-center" />

            {/* HEADER */}
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl">
                        <FiTrendingUp className="text-white text-2xl" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800">Admin <span className="text-indigo-600">Console</span></h1>
                        <p className="text-slate-400 text-[10px] font-black uppercase flex items-center gap-2">
                            Live Sync Active {refreshing && <FiRefreshCw className="animate-spin text-indigo-500" />}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-slate-100 p-1 rounded-2xl mr-2 items-center">
                        {(["day", "week", "month"] as FilterType[]).map((f) => (
                            <button
                                key={f}
                                onClick={() => { setActiveGraphFilter(f); setShowDatePicker(false); }}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeGraphFilter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                            >
                                {f}
                            </button>
                        ))}

                        <div className="relative ml-1">
                            <button
                                onClick={() => setShowDatePicker(!showDatePicker)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeGraphFilter === 'custom' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-200'}`}
                            >
                                <FiCalendar /> Custom
                            </button>

                            {showDatePicker && (
                                <div className="absolute top-full right-0 mt-2 bg-white p-4 rounded-3xl shadow-2xl border border-slate-100 z-[100] w-64">
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Start Date</label>
                                            <input type="date" className="w-full p-2 bg-slate-50 border rounded-xl text-xs outline-none" onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })} value={customRange.start} />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">End Date</label>
                                            <input type="date" className="w-full p-2 bg-slate-50 border rounded-xl text-xs outline-none" onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })} value={customRange.end} />
                                        </div>
                                        <button
                                            onClick={() => { setActiveGraphFilter("custom"); setShowDatePicker(false); }}
                                            className="w-full py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100"
                                        >
                                            Apply Range
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <button onClick={() => toggleModal('lead', true)} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-bold text-sm hover:scale-[1.02] transition-all shadow-lg shadow-indigo-100">
                        <FiPlus /> Create Lead
                    </button>
                    <button onClick={() => toggleModal('csr', true)} className="flex items-center gap-2 bg-slate-800 text-white px-6 py-3.5 rounded-2xl font-bold text-sm hover:scale-[1.02] transition-all">
                        <FiUserPlus /> New Agent
                    </button>
                    <label className="flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-100 px-6 py-3.5 rounded-2xl font-bold text-sm cursor-pointer hover:bg-emerald-100">
                        <FiUploadCloud /> Excel Import
                        <input type="file" hidden accept=".xlsx, .xls" onChange={(e) => { setSelectedFile(e.target.files?.[0] || null); toggleModal('excel', true); }} />
                    </label>
                    <button onClick={() => { localStorage.clear(); window.location.href = "/login"; }} className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all">
                        <FiLogOut size={20} />
                    </button>
                </div>
            </header>

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <SummaryCard title="Total Leads" value={stats.total} color="purple" icon={<FiUsers />} progress={100} trend={activeGraphFilter === 'custom' ? 'Filtered Range' : `${activeGraphFilter} volume`} />
                <SummaryCard title="Revenue" value={`PKR ${stats.revenue.toLocaleString()}`} color="blue" icon={<FiDollarSign />} progress={80} trend="Gross" />
                <SummaryCard title="Sales Rate" value={`${stats.rate}%`} color="orange" icon={<FiActivity />} progress={stats.rate} trend="Conversion" />
                <SummaryCard title="Total Paid" value={stats.paid} color="green" icon={<FiCheckCircle />} progress={100} trend="Completed" />
            </div>

            {/* STATUS SPECIFIC CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <SummaryCard title="New" value={stats.newLeads} color="blue" icon={<FiPlus />} progress={100} trend="Pending" />
                <SummaryCard title="Interested" value={stats.interested} color="purple" icon={<FiStar />} progress={100} trend="Warm" />
                <SummaryCard title="Follow Up" value={stats.followUp} color="orange" icon={<FiClock />} progress={100} trend="Scheduled" />
                <SummaryCard title="Contacted" value={stats.contacted} color="indigo" icon={<FiPhoneCall />} progress={100} trend="Talked" />
                <SummaryCard title="Rejected" value={stats.rejected} color="rose" icon={<FiXCircle />} progress={100} trend="Closed" />
                <SummaryCard title="Not Pick" value={stats.notPick} color="slate" icon={<FiAlertCircle />} progress={100} trend="No Answer" />
            </div>

            <div className="grid grid-cols-12 gap-8">
                <aside className="col-span-12 lg:col-span-3">
                    <CSRSidebar
                        csrs={data?.csrPerformance || []}
                        selectedCSR={selectedCSR}
                        onSelect={setSelectedCSR}
                        onToggleStatus={handleToggleCSRStatus}
                    />
                </aside>

                <section className="col-span-12 lg:col-span-9 space-y-8">
                    <DashboardGraphs
                        leadsStats={data?.leadsStats}
                        salesStats={data?.salesStats}
                        filter={activeGraphFilter}
                    />

                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b flex flex-col xl:flex-row justify-between items-center bg-slate-50/30 gap-6">
                            <h2 className="font-black text-slate-800 text-xl flex items-center gap-3"><FiFilter className="text-indigo-500" /> Lead Management</h2>
                            <div className="flex gap-3 w-full xl:w-auto">
                                <select className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                    <option value="all">ALL STATUSES</option>
                                    {statusOptions.map(opt => <option key={opt} value={opt}>{opt.toUpperCase()}</option>)}
                                </select>
                                <div className="relative flex-1">
                                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input type="text" placeholder="Search..." className="w-full pl-11 pr-4 py-3 bg-white border rounded-2xl text-sm font-bold outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                                </div>
                                <button onClick={handleDeleteAll} className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all">
                                    <FiTrash2 />
                                </button>
                            </div>
                        </div>

                        {/* Paginated Leads List */}
                        <CSRLeadsPanel
                            leads={paginatedLeads}
                            selectedCSR={selectedCSR}
                            onConvertToSale={() => fetchDashboardData(true)}
                            onDeleteLead={() => fetchDashboardData(true)}
                        />

                        {/* PAGINATION CONTROLS */}
                        {totalPages > 1 && (
                            <div className="p-6 bg-slate-50/50 border-t flex items-center justify-between">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Showing {paginatedLeads.length} of {filteredLeadsList.length} leads
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => p - 1)}
                                        className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"
                                    >
                                        <FiChevronLeft size={20} />
                                    </button>

                                    <div className="flex items-center gap-1">
                                        {[...Array(totalPages)].map((_, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setCurrentPage(i + 1)}
                                                className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${currentPage === i + 1 ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
                                            >
                                                {i + 1}
                                            </button>
                                        )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
                                    </div>

                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(p => p + 1)}
                                        className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"
                                    >
                                        <FiChevronRight size={20} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* MODALS */}
            <AnimatePresence>
                {modals.lead && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-8 rounded-[2.5rem] w-full max-w-lg relative shadow-2xl">
                            <button onClick={() => toggleModal('lead', false)} className="absolute top-6 right-6 text-slate-400 hover:text-rose-500"><FiX size={24} /></button>
                            <h2 className="text-2xl font-black text-slate-800 mb-6">Create New Lead</h2>
                            <form onSubmit={handleLeadSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <input placeholder="Name" className="p-4 bg-slate-50 border rounded-2xl outline-none" required value={leadForm.name} onChange={e => setLeadForm({ ...leadForm, name: e.target.value })} />
                                    <input placeholder="Phone" className="p-4 bg-slate-50 border rounded-2xl outline-none" required value={leadForm.phone} onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input placeholder="City" className="p-4 bg-slate-50 border rounded-2xl outline-none" value={leadForm.city} onChange={e => setLeadForm({ ...leadForm, city: e.target.value })} />
                                    <input placeholder="Course" className="p-4 bg-slate-50 border rounded-2xl outline-none" value={leadForm.course} onChange={e => setLeadForm({ ...leadForm, course: e.target.value })} />
                                </div>
                                <select className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" value={leadForm.assignedTo} onChange={e => setLeadForm({ ...leadForm, assignedTo: e.target.value })}>
                                    <option value="">Assign to Agent (Optional)</option>
                                    {data?.csrPerformance.map((c: any) => <option key={c._id || c.csrId} value={c._id || c.csrId}>{c.name}</option>)}
                                </select>
                                <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg">CREATE LEAD</button>
                            </form>
                        </motion.div>
                    </div>
                )}

                {modals.csr && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white p-8 rounded-[2.5rem] w-full max-w-md relative shadow-2xl">
                            <button onClick={() => toggleModal('csr', false)} className="absolute top-6 right-6 text-slate-400 hover:text-rose-500"><FiX size={24} /></button>
                            <h2 className="text-2xl font-black text-slate-800 mb-6">New Agent</h2>
                            <form onSubmit={handleCSRSubmit} className="space-y-4">
                                <input placeholder="Full Name" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" required value={csrForm.name} onChange={e => setCsrForm({ ...csrForm, name: e.target.value })} />
                                <input type="email" placeholder="Email Address" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" required value={csrForm.email} onChange={e => setCsrForm({ ...csrForm, email: e.target.value })} />
                                <input type="password" placeholder="Password" className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" required value={csrForm.password} onChange={e => setCsrForm({ ...csrForm, password: e.target.value })} />
                                <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black">REGISTER AGENT</button>
                            </form>
                        </motion.div>
                    </div>
                )}

                {modals.excel && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[999] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-white p-10 rounded-[3rem] w-full max-w-md text-center shadow-2xl relative">
                            <button onClick={() => toggleModal('excel', false)} className="absolute top-8 right-8 text-slate-300 hover:text-rose-500"><FiX size={24} /></button>
                            <div className="bg-emerald-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-emerald-500 shadow-inner">
                                <FiUploadCloud size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 mb-2">Bulk Import</h2>
                            <p className="text-slate-400 text-sm mb-6">Choose an agent to assign these leads.</p>
                            <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold mb-8 outline-none" value={assignToCSR} onChange={e => setAssignToCSR(e.target.value)}>
                                <option value="">Select Agent...</option>
                                {data?.csrPerformance.map((c: any) => <option key={c._id || c.csrId} value={c._id || c.csrId}>{c.name}</option>)}
                            </select>
                            <button onClick={confirmExcelUpload} disabled={uploading || !assignToCSR} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black disabled:opacity-30 flex items-center justify-center gap-2">
                                {uploading ? <FiRefreshCw className="animate-spin" /> : <FiCheckCircle />} {uploading ? "IMPORTING..." : "START IMPORT"}
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}