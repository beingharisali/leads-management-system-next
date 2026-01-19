"use client";

import { useEffect, useState } from "react";
import { getAdminStats } from "@/services/dashboard.api";
import { createCSR } from "@/services/auth.api";
import {
    getLeadsByRole,
    createLead,
    updateLead,
    deleteLead,
    uploadExcelLeads,
    convertLeadToSale,
    LeadPayload,
} from "@/services/lead.api";
import SummaryCard from "@/components/SummaryCard";
import CSRStatsChart from "@/components/CSRStatsChart";
import Loading from "@/components/Loading";
import ErrorMessage from "@/components/ErrorMessage";
import toast, { Toaster } from "react-hot-toast";
import { getUserId } from "@/utils/decodeToken";

/* ================= TYPES ================= */

interface CSRPerformance {
    csrId: string;
    name: string;
    totalLeads: number;
    totalSales: number;
    conversionRate: string;
}

interface Lead {
    _id: string;
    name: string;
    phone: string;
    course: string;
    status?: string;
    assignedTo?: { _id: string; name: string } | null;
}

interface StatsData {
    totalLeads: number;
    totalSales: number;
    totalCSRs: number;
    conversionRate: string;
    leadsStats: { day: number; week: number; month: number };
    salesStats: { day: number; week: number; month: number };
    csrPerformance: CSRPerformance[];
}

/* ================= COMPONENT ================= */

export default function AdminDashboardPage() {
    const [data, setData] = useState<StatsData | null>(null);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [sales, setSales] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState<"day" | "week" | "month">("day");
    const [uploading, setUploading] = useState(false);

    /* ================= CSR MODAL ================= */
    const [showCSRModal, setShowCSRModal] = useState(false);
    const [csrName, setCsrName] = useState("");
    const [csrEmail, setCsrEmail] = useState("");
    const [csrPassword, setCsrPassword] = useState("");
    const [csrLoading, setCsrLoading] = useState(false);

    /* ================= LEAD MODAL ================= */
    const [showLeadModal, setShowLeadModal] = useState(false);
    const [leadName, setLeadName] = useState("");
    const [leadPhone, setLeadPhone] = useState("");
    const [leadCourse, setLeadCourse] = useState("");
    const [assignedCSR, setAssignedCSR] = useState<string | null>(null);
    const [leadIdEditing, setLeadIdEditing] = useState<string | null>(null);

    /* ================= FETCH DATA ================= */
    const fetchStats = async () => {
        setLoading(true);
        try {
            const [statsRes, leadsRes] = await Promise.all([
                getAdminStats(filter),
                getLeadsByRole("admin"),
            ]);

            // Split leads into active and sales
            const activeLeads = leadsRes.filter((l: Lead) => l.status !== "sale");
            const convertedSales = leadsRes.filter((l: Lead) => l.status === "sale");

            setData({
                totalLeads: statsRes.totalLeads || 0,
                totalSales: statsRes.totalSales || 0,
                totalCSRs: statsRes.totalCSRs || 0,
                conversionRate: statsRes.conversionRate || "0%",
                leadsStats: statsRes.leadsStats,
                salesStats: statsRes.salesStats,
                csrPerformance: statsRes.csrPerformance || [],
            });

            setLeads(activeLeads || []);
            setSales(convertedSales || []);
        } catch (err: any) {
            console.error(err);
            setError("Failed to load dashboard");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [filter]);

    const csrOptions = data?.csrPerformance || [];

    /* ================= CREATE CSR ================= */
    const handleCreateCSR = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!csrName || !csrEmail || !csrPassword) return toast.error("All fields required");
        setCsrLoading(true);
        try {
            await createCSR({ name: csrName, email: csrEmail, password: csrPassword });
            toast.success("CSR created successfully");
            setShowCSRModal(false);
            setCsrName(""); setCsrEmail(""); setCsrPassword("");
            fetchStats();
        } catch (err: any) {
            console.error(err);
            toast.error(err.response?.data?.msg || "CSR creation failed");
        } finally {
            setCsrLoading(false);
        }
    };

    /* ================= CREATE / UPDATE LEAD ================= */
    const handleLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!leadName || !leadPhone || !leadCourse) return toast.error("All fields required");

        const userId = await getUserId();
        if (!userId) return toast.error("User not authenticated");

        const payload: LeadPayload = {
            name: leadName,
            phone: leadPhone,
            course: leadCourse,
            assignedTo: assignedCSR || undefined,
            createdBy: userId,
        };

        try {
            if (leadIdEditing) {
                await updateLead(leadIdEditing, payload);
                setLeads(prev =>
                    prev.map(l => (l._id === leadIdEditing ? { ...l, ...payload } : l))
                );
                toast.success("Lead updated successfully");
            } else {
                const newLead = await createLead(payload);
                setLeads(prev => [...prev, newLead]);
                toast.success("Lead created successfully");
            }

            setShowLeadModal(false);
            setLeadIdEditing(null);
            setLeadName(""); setLeadPhone(""); setLeadCourse(""); setAssignedCSR(null);
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message || "Failed to save lead");
        }
    };

    /* ================= DELETE LEAD ================= */
    const handleDeleteLead = async (id: string) => {
        if (!confirm("Are you sure you want to delete this lead?")) return;
        try {
            await deleteLead(id);
            setLeads(prev => prev.filter(l => l._id !== id));
            setSales(prev => prev.filter(l => l._id !== id));
            toast.success("Lead deleted successfully");
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message || "Delete failed");
        }
    };

    /* ================= CONVERT TO SALE ================= */
    const handleConvertLeadToSale = async (leadId: string) => {
        const amountStr = prompt("Enter sale amount:");
        const amount = amountStr ? Number(amountStr) : 0;
        if (!amount || amount <= 0) return toast.error("Invalid sale amount");

        try {
            await convertLeadToSale(leadId, amount);

            // Move lead from leads to sales
            setLeads(prev => prev.filter(l => l._id !== leadId));
            const convertedLead = leads.find(l => l._id === leadId);
            if (convertedLead) {
                setSales(prev => [...prev, { ...convertedLead, status: "sale" }]);
            }

            // Update stats locally
            setData(prev => prev ? {
                ...prev,
                totalSales: prev.totalSales + 1,
                conversionRate: `${((prev.totalSales + 1) / prev.totalLeads * 100).toFixed(2)}%`,
                salesStats: {
                    day: prev.salesStats.day + 1,
                    week: prev.salesStats.week + 1,
                    month: prev.salesStats.month + 1,
                },
            } : prev);

            toast.success("Lead converted to sale successfully");
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message || "Conversion failed");
        }
    };

    /* ================= EXCEL UPLOAD ================= */
    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        setUploading(true);
        try {
            await uploadExcelLeads(e.target.files[0]);
            toast.success("Excel uploaded successfully");
            fetchStats();
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message || "Excel upload failed");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <div className="p-6 space-y-6">
            <Toaster position="top-right" reverseOrder={false} />

            {/* HEADER */}
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setShowCSRModal(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition"
                    >
                        + Create CSR
                    </button>
                    <label className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded cursor-pointer transition">
                        {uploading ? "Uploading..." : "Upload Excel"}
                        <input type="file" hidden onChange={handleExcelUpload} />
                    </label>
                </div>
            </div>

            {/* FILTER */}
            <div className="mb-4">
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as "day" | "week" | "month")}
                    className="border p-2 rounded"
                >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                </select>
            </div>

            {/* CREATE LEAD */}
            <button
                onClick={() => setShowLeadModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mb-4 transition"
            >
                + Create Lead
            </button>

            {/* LEAD MODAL */}
            {showLeadModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded w-96 shadow-lg">
                        <form onSubmit={handleLeadSubmit} className="space-y-3">
                            <input
                                value={leadName}
                                onChange={e => setLeadName(e.target.value)}
                                placeholder="Name"
                                required
                                className="border p-2 w-full rounded"
                            />
                            <input
                                value={leadPhone}
                                onChange={e => setLeadPhone(e.target.value)}
                                placeholder="Phone"
                                required
                                className="border p-2 w-full rounded"
                            />
                            <input
                                value={leadCourse}
                                onChange={e => setLeadCourse(e.target.value)}
                                placeholder="Course"
                                required
                                className="border p-2 w-full rounded"
                            />
                            <select
                                value={assignedCSR || ""}
                                onChange={e => setAssignedCSR(e.target.value)}
                                className="border p-2 w-full rounded"
                            >
                                <option value="">Assign CSR</option>
                                {csrOptions.map(csr => (
                                    <option key={csr.csrId} value={csr.csrId}>{csr.name}</option>
                                ))}
                            </select>

                            <button
                                type="submit"
                                className="bg-blue-600 hover:bg-blue-700 text-white py-2 w-full rounded transition"
                            >
                                {leadIdEditing ? "Update Lead" : "Create Lead"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* LEADS TABLE */}
            <div className="bg-white p-4 rounded shadow overflow-x-auto">
                <h2 className="font-semibold mb-2">Active Leads</h2>
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b">
                            <th className="p-2">Name</th>
                            <th className="p-2">Phone</th>
                            <th className="p-2">Course</th>
                            <th className="p-2">CSR</th>
                            <th className="p-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leads.map(l => (
                            <tr key={l._id} className="border-b hover:bg-gray-50">
                                <td className="p-2">{l.name}</td>
                                <td className="p-2">{l.phone}</td>
                                <td className="p-2">{l.course}</td>
                                <td className="p-2">{l.assignedTo?.name || "-"}</td>
                                <td className="p-2 space-x-2">
                                    <button
                                        onClick={() => {
                                            setShowLeadModal(true);
                                            setLeadIdEditing(l._id);
                                            setLeadName(l.name);
                                            setLeadPhone(l.phone);
                                            setLeadCourse(l.course);
                                            setAssignedCSR(l.assignedTo?._id || null);
                                        }}
                                        className="text-blue-600 hover:underline"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteLead(l._id)}
                                        className="text-red-600 hover:underline"
                                    >
                                        Delete
                                    </button>
                                    <button
                                        onClick={() => handleConvertLeadToSale(l._id)}
                                        className="text-green-600 hover:underline"
                                    >
                                        Convert
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* SALES TABLE */}
            {sales.length > 0 && (
                <div className="bg-white p-4 rounded shadow overflow-x-auto mt-6">
                    <h2 className="font-semibold mb-2">Converted Sales</h2>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2">Name</th>
                                <th className="p-2">Phone</th>
                                <th className="p-2">Course</th>
                                <th className="p-2">CSR</th>
                                <th className="p-2">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sales.map(l => (
                                <tr key={l._id} className="border-b hover:bg-gray-50">
                                    <td className="p-2">{l.name}</td>
                                    <td className="p-2">{l.phone}</td>
                                    <td className="p-2">{l.course}</td>
                                    <td className="p-2">{l.assignedTo?.name || "-"}</td>
                                    <td className="p-2 text-green-600 font-semibold">Sale</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-4 gap-4 mt-4">
                <SummaryCard title="Total Leads" value={data?.totalLeads || 0} />
                <SummaryCard title="Total Sales" value={data?.totalSales || 0} />
                <SummaryCard title="Total CSRs" value={data?.totalCSRs || 0} />
                <SummaryCard title="Conversion Rate" value={data?.conversionRate || "0%"} />
            </div>

            {/* CHARTS */}
            <div className="grid grid-cols-2 gap-6 mt-6">
                <CSRStatsChart title="Leads" {...data!.leadsStats} />
                <CSRStatsChart title="Sales" {...data!.salesStats} />
            </div>
        </div>
    );
}
