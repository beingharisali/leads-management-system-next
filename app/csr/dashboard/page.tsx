"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
    getLeadsByRole,
    updateLead,
    convertLeadToSale,
    createLead,
    bulkInsertLeads
} from "@/services/lead.api";
import SummaryCard from "@/components/SummaryCard";
import Loading from "@/components/Loading";
import { getUserRole, getUserId, logout } from "@/utils/decodeToken";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import ColumnFilterDropdown from "@/components/filters/ColumnFilterDropdown";
import MyActivityTimer from "@/components/MyActivityTimer";
import { monthKeyOf, monthOptionsFrom, textOptionsFrom } from "@/utils/leadFilterOptions";
import { isClosedStatus, canSetFollowUp, localDateKey, leadAgeDays, leadAgeLabel, leadAgeClass, LEAD_STATUS_OPTIONS, isUrgentStatus, pinUrgentFirst, statusBadgeClass } from "@/utils/leadStatus";
import FollowUpBell from "@/components/FollowUpBell";
import UrgentLeadsBanner from "@/components/UrgentLeadsBanner";
import { useUrgentLeads, useOnUrgentChange } from "@/hooks/useUrgentLeads";
import {
    FiLogOut, FiPhone, FiSearch,
    FiPlus, FiUploadCloud, FiX, FiCalendar, FiFilter, FiClock, FiUserCheck, FiArchive,
    FiChevronLeft, FiChevronRight, // New Icons for Pagination
    FiAlertTriangle, FiFileText
} from "react-icons/fi";

type LeadStatus = "new" | "interested" | "converted" | "sale" | "not interested" | "paid" | "not pick" | "busy" | "wrong number" | "active" | "inactive" | string;

interface Lead {
    _id: string;
    name: string;
    course: string;
    phone: string;
    city?: string;
    source?: string;
    status: LeadStatus;
    remarks?: string;
    followUpDate?: string;
    createdAt: string;
    statusUpdatedAt?: string;

    saleAmount?: number;
}

export default function CSRDashboard() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const notifiedLeadsRef = useRef<Record<string, boolean>>({});

    // --- Pagination States ---
    const [currentPage, setCurrentPage] = useState(1);
    const leadsPerPage = 50;

    // Filtering States
    const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "custom">("all");
    const [customDates, setCustomDates] = useState({ start: "", end: "" });

    // Column header filters (checkbox multi-select, empty = no filter)
    const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

    // New Lead State
    const [newLead, setNewLead] = useState({
        name: "", phone: "", city: "", source: "", course: "", remarks: ""
    });

    const statusOptions = LEAD_STATUS_OPTIONS;
    // Only open statuses can appear on this dashboard - closed leads live
    // on the Closed Leads page - so the column filter only offers these.
    const openStatusOptions = statusOptions.filter(s => !isClosedStatus(s));

    const fetchData = useCallback(async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            const role = await getUserRole();
            const userId = await getUserId();
            if (!role || !userId) { logout(); return router.push("/login"); }

            const leadsRes = await getLeadsByRole(role, undefined, userId);
            // Paid / Not Interested / Wrong Number leads are closed: they
            // drop off the working dashboard (see /csr/leads/closed).
            const allLeads = Array.isArray(leadsRes) ? (leadsRes as unknown as Lead[]) : [];
            setLeads(allLeads.filter(l => !isClosedStatus(l.status)));
        } catch (err: any) { toast.error(err.message || "Failed to load dashboard data"); }
        finally { setLoading(false); }
    }, [router]);

    // The CSR layout polls for urgent leads; when that set changes (e.g. the
    // admin just marked a lead Urgent) re-fetch so the table re-pins.
    const urgentState = useUrgentLeads();
    useOnUrgentChange(urgentState.signature, urgentState.loaded, () => fetchData(true));

    // Follow-up reminders: Interested leads whose CSR-picked follow-up date
    // is today (or already passed without being actioned). Not Pick/Busy
    // leads roll to the next day automatically, so they never show here.
    const dueFollowUps = useMemo(() => {
        const todayKey = localDateKey(new Date());
        return leads
            .filter(l =>
                l.status.toLowerCase() === "interested" &&
                l.followUpDate &&
                localDateKey(l.followUpDate) <= todayKey
            )
            .map(l => ({ ...l, isOverdue: localDateKey(l.followUpDate!) < todayKey }))
            .sort((a, b) => new Date(a.followUpDate!).getTime() - new Date(b.followUpDate!).getTime());
    }, [leads]);

    // Pop a toast whenever a follow-up becomes due that hasn't been announced
    // yet this session (on load, and after midnight via the periodic refresh).
    useEffect(() => {
        const fresh = dueFollowUps.filter(l => !notifiedLeadsRef.current[l._id]);
        if (fresh.length === 0) return;
        fresh.forEach(l => { notifiedLeadsRef.current[l._id] = true; });

        toast(
            fresh.length === 1
                ? `Follow-up due: call ${fresh[0].name} (${fresh[0].phone})`
                : `${fresh.length} interested leads need a follow-up call today`,
            {
                icon: '🔔',
                duration: 8000,
                position: "top-center",
                style: { background: '#1E293B', color: '#fff', fontWeight: 'bold' }
            }
        );
    }, [dueFollowUps]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Silently re-fetch every 5 minutes so follow-ups that become due while
    // the dashboard is left open (e.g. past midnight) still get announced.
    useEffect(() => {
        const interval = setInterval(() => fetchData(true), 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, dateFilter, customDates, selectedMonths, selectedCities, selectedCourses, selectedSources, selectedStatuses]);

    // Column filter option lists - derived from the full (unfiltered) lead
    // set so a chosen filter never removes its own options from the list.
    const monthOptions = useMemo(() => monthOptionsFrom(leads.map(l => l.createdAt)), [leads]);
    const cityOptions = useMemo(() => textOptionsFrom(leads.map(l => l.city)), [leads]);
    const courseOptions = useMemo(() => textOptionsFrom(leads.map(l => l.course)), [leads]);
    const sourceOptions = useMemo(() => textOptionsFrom(leads.map(l => l.source)), [leads]);

    // --- Excel Import Logic ---
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const validTypes = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel", "text/csv"];
        if (!validTypes.includes(file.type) && !file.name.endsWith(".csv")) {
            toast.error("Please upload a valid Excel or CSV file");
            return;
        }
        const tid = toast.loading("Uploading leads to server...");
        try {
            const userId = await getUserId();
            if (!userId) throw new Error("User session not found");
            await bulkInsertLeads(file, userId);
            toast.success("Leads imported and assigned to you!", { id: tid });
            fetchData(true);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (err: any) {
            toast.error(err.message || "Upload failed", { id: tid });
        }
    };

    // --- Core Filtering Logic ---
    // Date filters key off `followUpDate` (when the lead is next due for
    // contact), not `createdAt`. The server keeps that date up to date:
    // closed statuses clear it (and those leads aren't loaded here at
    // all), any other status change rolls it to tomorrow (Not Pick/Busy
    // always do), and a date the CSR picked for an Interested lead is
    // respected as-is. "today" and
    // every other window include anything overdue so a lead never
    // silently disappears if a CSR misses a day.
    const filteredLeads = useMemo(() => {
        const now = new Date();

        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        // Urgent leads always sit at the top, whatever else is filtered
        return pinUrgentFirst(leads.filter(l => {
            const dueDate = l.followUpDate ? new Date(l.followUpDate) : null;

            const matchesSearch =
                (l.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
                (l.phone || "").includes(searchTerm);

            const matchesStatus =
                selectedStatuses.length === 0 ||
                selectedStatuses.includes(l.status.toLowerCase());

            const matchesMonth =
                selectedMonths.length === 0 ||
                selectedMonths.includes(monthKeyOf(l.createdAt) || "");

            const matchesCity =
                selectedCities.length === 0 ||
                selectedCities.includes((l.city || "").trim().toLowerCase());

            const matchesCourse =
                selectedCourses.length === 0 ||
                selectedCourses.includes((l.course || "").trim().toLowerCase());

            const matchesSource =
                selectedSources.length === 0 ||
                selectedSources.includes((l.source || "").trim().toLowerCase());

            let matchesDate = true;

            if (dateFilter === "today") {
                const endOfToday = new Date(startOfDay);
                endOfToday.setHours(23, 59, 59, 999);

                matchesDate = !!dueDate && dueDate <= endOfToday;
            }

            else if (dateFilter === "week") {
                const weekEnd = new Date(startOfDay);
                weekEnd.setDate(weekEnd.getDate() + 7);
                weekEnd.setHours(23, 59, 59, 999);

                matchesDate = !!dueDate && dueDate <= weekEnd;
            }

            else if (dateFilter === "month") {
                const monthEnd = new Date(startOfDay);
                monthEnd.setMonth(monthEnd.getMonth() + 1);
                monthEnd.setHours(23, 59, 59, 999);

                matchesDate = !!dueDate && dueDate <= monthEnd;
            }

            else if (
                dateFilter === "custom" &&
                customDates.start &&
                customDates.end
            ) {
                const start = new Date(customDates.start);

                const end = new Date(customDates.end);
                end.setHours(23, 59, 59, 999);

                matchesDate =
                    !!dueDate &&
                    dueDate >= start &&
                    dueDate <= end;
            }

            return (
                matchesSearch &&
                matchesStatus &&
                matchesMonth &&
                matchesCity &&
                matchesCourse &&
                matchesSource &&
                matchesDate
            );
        }));
    }, [
        leads,
        searchTerm,
        dateFilter,
        customDates,
        selectedMonths,
        selectedCities,
        selectedCourses,
        selectedSources,
        selectedStatuses
    ]);
    // --- PAGINATION CALCULATION ---
    const totalPages = Math.ceil(filteredLeads.length / leadsPerPage);
    const paginatedLeads = useMemo(() => {
        const startIndex = (currentPage - 1) * leadsPerPage;
        return filteredLeads.slice(startIndex, startIndex + leadsPerPage);
    }, [filteredLeads, currentPage]);

    const urgentLeads = useMemo(() => leads.filter(l => isUrgentStatus(l.status)), [leads]);

    const metrics = useMemo(() => {
        const getCount = (status: string) => filteredLeads.filter(l => l.status.toLowerCase() === status).length;

        return {
            total: filteredLeads.length,
            urgent: getCount("urgent"),
            newLeads: getCount("new"),
            notPick: getCount("not pick"),
            interested: getCount("interested"),
            busy: getCount("busy"),
        };
    }, [filteredLeads]);

    // Share of the currently shown leads, rounded to one decimal (0 when empty)
    const percentOfTotal = (count: number) =>
        metrics.total > 0 ? Math.round((count / metrics.total) * 1000) / 10 : 0;

    const handleUpdate = async (id: string, data: Partial<Lead>) => {
        const tid = toast.loading("Updating...");
        try {
            const normalizedStatus = data.status?.toLowerCase().trim();
            let updatedLeadData;


            if (normalizedStatus && normalizedStatus !== "paid" && normalizedStatus !== "sale") {
                data.saleAmount = null as any;
            }

            // Don't send followUpDate here on a plain status change - the
            // server auto-schedules it (clears it on a closed status, rolls
            // to tomorrow otherwise). Only the dedicated date picker (below,
            // Interested only) sends an explicit followUpDate.

            if (normalizedStatus === "paid" || normalizedStatus === "sale") {
                const amount = prompt("Enter Sale Amount:");
                if (!amount) {
                    toast.dismiss(tid);
                    return;
                }
                updatedLeadData = await convertLeadToSale(id, Number(amount));
            } else {
                updatedLeadData = await updateLead(id, data);
            }

            // A closed status takes the lead off this dashboard right away.
            if (isClosedStatus(normalizedStatus)) {
                setLeads(prev => prev.filter(l => l._id !== id));
                toast.success(`Lead closed as ${normalizedStatus!.toUpperCase()}`, { id: tid });
                fetchData(true);
                return;
            }

            setLeads(prev => prev.map(l =>
                l._id === id
                    ? {
                        ...l,
                        ...data,
                        saleAmount: updatedLeadData?.saleAmount !== undefined ? updatedLeadData.saleAmount : data.saleAmount,
                        followUpDate: updatedLeadData?.followUpDate !== undefined ? updatedLeadData.followUpDate : data.followUpDate
                    }
                    : l
            ));

            toast.success("Success", { id: tid });
            fetchData(true);

        } catch (err: any) {
            console.error("Update error detailed logs:", err);
            toast.error(err?.message || "Failed to update lead", { id: tid });
        }
    };

    const handleAddLead = async (e: React.FormEvent) => {
        e.preventDefault();
        const tid = toast.loading("Adding...");
        try {
            const userId = await getUserId();
            await createLead({ ...newLead, assignedTo: userId } as any);
            toast.success("Added!", { id: tid });
            setIsModalOpen(false);
            setNewLead({ name: "", phone: "", city: "", source: "", course: "", remarks: "" });
            fetchData(true);
        } catch (err: any) { toast.error(err.message || "Failed to add lead", { id: tid }); }
    };

    if (loading) return <Loading />;

    return (
        <ProtectedRoute role="csr">
            <Toaster position="top-right" />
            <div className="min-h-screen bg-[#F4F7FE] p-4 lg:p-10">

                {/* Header Section */}
                <div className="max-w-[1600px] mx-auto mb-8">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900">CSR Dashboard</h1>
                            <p className="text-slate-500 text-sm font-medium">
                                Showing {paginatedLeads.length} of {filteredLeads.length} leads
                            </p>
                            <div className="mt-3"><MyActivityTimer /></div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-5 py-3 bg-emerald-500 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all"
                            >
                                <FiUploadCloud /> Import Excel
                            </button>

                            <div className="relative flex-1 md:w-64">
                                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    placeholder="Search by name/phone..."
                                    className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <FollowUpBell
                                dueFollowUps={dueFollowUps}
                                onSelect={l => { setSearchTerm(l.phone); setDateFilter("all"); }}
                            />
                            <Link href="/csr/leads/closed" className="px-5 py-3 bg-white text-slate-700 rounded-2xl font-bold flex items-center gap-2 shadow-sm border border-slate-100 hover:bg-slate-50 transition-all"><FiArchive /> Closed Leads</Link>
                            <Link href="/csr/admission" className="px-5 py-3 bg-white text-slate-700 rounded-2xl font-bold flex items-center gap-2 shadow-sm border border-slate-100 hover:bg-slate-50 transition-all"><FiFileText /> Admission Form</Link>
                            <button onClick={() => setIsModalOpen(true)} className="px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"><FiPlus /> Create</button>
                            <button onClick={logout} className="p-3 bg-white text-rose-500 rounded-2xl shadow-sm border border-slate-100"><FiLogOut size={20} /></button>
                        </div>
                    </div>

                    {/* Date Filters */}
                    <div className="mt-6 flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100 w-fit">
                        {['all', 'today', 'week', 'month'].map((f) => (
                            <button key={f} onClick={() => setDateFilter(f as any)} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all ${dateFilter === f ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>{f}</button>
                        ))}
                        <div className="h-6 w-[1px] bg-slate-200 mx-2" />
                        <div className="flex items-center gap-2 pr-2">
                            <FiCalendar className="text-slate-400 ml-2" />
                            <input type="date" className="bg-transparent text-xs font-bold text-slate-600" onChange={(e) => { setCustomDates({ ...customDates, start: e.target.value }); setDateFilter('custom'); }} />
                            <span className="text-slate-300">to</span>
                            <input type="date" className="bg-transparent text-xs font-bold text-slate-600" onChange={(e) => { setCustomDates({ ...customDates, end: e.target.value }); setDateFilter('custom'); }} />
                        </div>
                    </div>

                    <UrgentLeadsBanner
                        leads={urgentLeads}
                        onSelect={l => { setSearchTerm(l.phone); setDateFilter("all"); }}
                    />
                </div>

                {/* Summary Metrics Grid */}
                <div className="max-w-[1600px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <SummaryCard title="Urgent" value={metrics.urgent.toString()} percentage={percentOfTotal(metrics.urgent)} icon={<FiAlertTriangle />} color="rose" />
                    <SummaryCard title="New Leads" value={metrics.newLeads.toString()} percentage={percentOfTotal(metrics.newLeads)} icon={<FiPlus />} color="blue" />
                    <SummaryCard title="Not Picked" value={metrics.notPick.toString()} percentage={percentOfTotal(metrics.notPick)} icon={<FiPhone />} color="orange" />
                    <SummaryCard title="Interested" value={metrics.interested.toString()} percentage={percentOfTotal(metrics.interested)} icon={<FiUserCheck />} color="green" />
                    <SummaryCard title="Busy" value={metrics.busy.toString()} percentage={percentOfTotal(metrics.busy)} icon={<FiClock />} color="indigo" />
                    <SummaryCard title="Open Leads Shown" value={metrics.total.toString()} icon={<FiFilter />} color="purple" />
                </div>

                {/* Main Table */}
                <div className="max-w-[1600px] mx-auto bg-white rounded-[2rem] shadow-sm overflow-hidden border border-slate-100">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase font-black tracking-widest">
                                <tr>
                                    <th className="px-6 py-5">
                                        <span className="inline-flex items-center">Date
                                            <ColumnFilterDropdown label="Month" options={monthOptions} selected={selectedMonths} onChange={setSelectedMonths} />
                                        </span>
                                    </th>
                                    <th className="px-6 py-5">Lead Name</th>
                                    <th className="px-6 py-5">Phone</th>
                                    <th className="px-6 py-5">
                                        <span className="inline-flex items-center">Course
                                            <ColumnFilterDropdown label="Course" options={courseOptions} selected={selectedCourses} onChange={setSelectedCourses} />
                                        </span>
                                    </th>
                                    <th className="px-6 py-5">
                                        <span className="inline-flex items-center">City/Source
                                            <ColumnFilterDropdown label="City" options={cityOptions} selected={selectedCities} onChange={setSelectedCities} />
                                            <ColumnFilterDropdown label="Source" options={sourceOptions} selected={selectedSources} onChange={setSelectedSources} />
                                        </span>
                                    </th>
                                    <th className="px-6 py-5">
                                        <span className="inline-flex items-center">Status
                                            <ColumnFilterDropdown label="Status" options={openStatusOptions.map(s => ({ value: s, label: s.toUpperCase() }))} selected={selectedStatuses} onChange={setSelectedStatuses} />
                                        </span>
                                    </th>
                                    <th className="px-6 py-5">Remarks</th>
                                    <th className="px-6 py-5">Follow-up Date</th>
                                    <th className="px-6 py-5 text-center">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {paginatedLeads.length > 0 ? paginatedLeads.map((lead) => (
                                    <tr key={lead._id} className={`transition-colors ${isUrgentStatus(lead.status) ? "bg-rose-50/70 hover:bg-rose-50 shadow-[inset_4px_0_0_#e11d48]" : "hover:bg-slate-50/50"}`}>
                                        <td className="px-6 py-4 text-xs font-medium text-slate-500">
                                            <div>{new Date(lead.createdAt).toLocaleDateString('en-GB')}</div>
                                            {(() => {
                                                const age = leadAgeDays(lead.createdAt);
                                                return (
                                                    <span className={`inline-block mt-1 px-2 py-0.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${leadAgeClass(age)}`}>
                                                        {leadAgeLabel(age)}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-800">
                                            {lead.name}
                                            {isUrgentStatus(lead.status) && (
                                                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider align-middle">
                                                    <FiAlertTriangle size={10} /> Urgent
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-blue-600 font-semibold">{lead.phone}</td>
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                                            {/* Blank is rejected (course is required) - it just snaps back */}
                                            <input
                                                key={lead.course}
                                                list="course-suggestions"
                                                defaultValue={lead.course}
                                                title="Change this lead's course"
                                                onBlur={(e) => {
                                                    const course = e.target.value.trim();
                                                    if (!course) { e.target.value = lead.course; return; }
                                                    if (course !== lead.course) handleUpdate(lead._id, { course });
                                                }}
                                                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                                                className="bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-400 outline-none w-full min-w-[120px]"
                                                placeholder="Course"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{lead.source || 'N/A'}</div>
                                            <div className="text-xs font-semibold text-slate-600">{lead.city || 'No City'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={lead.status.toLowerCase()}
                                                onChange={(e) => handleUpdate(lead._id, { status: e.target.value })}
                                                className={`text-[10px] font-black uppercase px-3 py-2 rounded-xl border-none ring-1 ring-slate-200 ${statusBadgeClass(lead.status)}`}
                                            >
                                                {statusOptions.map(opt => <option key={opt} value={opt}>{opt.toUpperCase()}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <input
                                                defaultValue={lead.remarks}
                                                onBlur={(e) => e.target.value !== lead.remarks && handleUpdate(lead._id, { remarks: e.target.value })}
                                                className="bg-transparent border-b border-transparent focus:border-blue-400 outline-none text-sm w-full"
                                                placeholder="Add note..."
                                            />
                                        </td>

                                        <td className="px-6 py-4">
                                            {canSetFollowUp(lead.status) ? (
                                                <input
                                                    key={lead.followUpDate || "none"}
                                                    type="date"
                                                    title="Pick the day to follow up with this lead - you'll get a reminder on that date"
                                                    min={localDateKey(new Date())}
                                                    defaultValue={lead.followUpDate ? localDateKey(lead.followUpDate) : ""}
                                                    onChange={(e) =>
                                                        e.target.value &&
                                                        handleUpdate(lead._id, {
                                                            // Local midnight, so the reminder fires on the picked day in the CSR's timezone
                                                            followUpDate: new Date(`${e.target.value}T00:00:00`).toISOString()
                                                        })
                                                    }
                                                    className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            ) : (
                                                <span
                                                    className="text-slate-400 text-xs"
                                                    title={isUrgentStatus(lead.status)
                                                        ? "Urgent leads are due immediately"
                                                        : ["not pick", "busy"].includes(lead.status.toLowerCase())
                                                            ? "Automatically moved to the next day"
                                                            : "Set status to Interested to schedule a follow-up"}
                                                >
                                                    -
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold text-green-600">{lead.saleAmount ? `${lead.saleAmount}` : "-"}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={9} className="text-center py-20 text-slate-400">No matching leads found.</td></tr>
                                )}
                            </tbody>
                        </table>
                        <datalist id="course-suggestions">
                            {courseOptions.map(o => <option key={o.value} value={o.label} />)}
                        </datalist>
                    </div>

                    {/* Pagination UI Controls */}
                    {totalPages > 1 && (
                        <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Page <span className="text-slate-900">{currentPage}</span> of {totalPages}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
                                >
                                    <FiChevronLeft size={20} />
                                </button>

                                <div className="flex items-center gap-1">
                                    {[...Array(totalPages)].map((_, i) => {
                                        const pageNum = i + 1;
                                        // Display logic: show first, last, and pages around current
                                        if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${currentPage === pageNum ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-slate-500 hover:bg-slate-100'}`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                            return <span key={pageNum} className="text-slate-300">...</span>;
                                        }
                                        return null;
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
                                >
                                    <FiChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Create Modal (Remains same as your original) */}
                <AnimatePresence>
                    {isModalOpen && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl">
                                <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                                    <div>
                                        <h2 className="text-xl font-bold">Create New Lead</h2>
                                        <p className="text-slate-400 text-xs">Fill in the lead details manually</p>
                                    </div>
                                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><FiX size={20} /></button>
                                </div>
                                <form onSubmit={handleAddLead} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Full Name</label>
                                        <input placeholder="Ex: John Doe" className="w-full p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={newLead.name} onChange={e => setNewLead({ ...newLead, name: e.target.value })} required />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Phone Number</label>
                                        <input placeholder="Ex: 03001234567" className="w-full p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={newLead.phone} onChange={e => setNewLead({ ...newLead, phone: e.target.value })} required />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">City</label>
                                        <input placeholder="Ex: Lahore" className="w-full p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={newLead.city} onChange={e => setNewLead({ ...newLead, city: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Course</label>
                                        <input placeholder="Ex: Web Development" className="w-full p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={newLead.course} onChange={e => setNewLead({ ...newLead, course: e.target.value })} />
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Source</label>
                                        <input placeholder="Ex: Facebook, Instagram, Referral" className="w-full p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={newLead.source} onChange={e => setNewLead({ ...newLead, source: e.target.value })} />
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Remarks</label>
                                        <textarea placeholder="Any specific details..." className="w-full p-3 bg-slate-50 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all h-24 resize-none" value={newLead.remarks} onChange={e => setNewLead({ ...newLead, remarks: e.target.value })} />
                                    </div>
                                    <button type="submit" className="md:col-span-2 mt-4 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">Save Lead Details</button>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </ProtectedRoute>
    );
}