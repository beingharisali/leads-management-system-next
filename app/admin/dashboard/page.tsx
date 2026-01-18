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
} from "@/services/lead.api";
import SummaryCard from "@/components/SummaryCard";
import CSRStatsChart from "@/components/CSRStatsChart";
import Loading from "@/components/Loading";
import ErrorMessage from "@/components/ErrorMessage";

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

export default function AdminDashboardPage() {
    const [data, setData] = useState<StatsData | null>(null);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState<"day" | "week" | "month">("day");

    // CSR Modal State
    const [showCSRModal, setShowCSRModal] = useState(false);
    const [csrName, setCsrName] = useState("");
    const [csrEmail, setCsrEmail] = useState("");
    const [csrPassword, setCsrPassword] = useState("");
    const [csrError, setCsrError] = useState("");
    const [csrLoading, setCsrLoading] = useState(false);
    const [csrSuccess, setCsrSuccess] = useState("");

    // Lead Modal State
    const [showLeadModal, setShowLeadModal] = useState(false);
    const [leadName, setLeadName] = useState("");
    const [leadPhone, setLeadPhone] = useState("");
    const [leadCourse, setLeadCourse] = useState("");
    const [assignedCSR, setAssignedCSR] = useState<string | null>(null);
    const [leadIdEditing, setLeadIdEditing] = useState<string | null>(null);

    const [uploading, setUploading] = useState(false);

    // ================= FETCH STATS & LEADS =================
    const fetchStats = async () => {
        setLoading(true);
        setError("");
        try {
            const [statsRes, leadsRes] = await Promise.all([
                getAdminStats(filter),
                getLeadsByRole("admin"),
            ]);

            setData({
                totalLeads: statsRes.totalLeads || 0,
                totalSales: statsRes.totalSales || 0,
                totalCSRs: statsRes.totalCSRs || 0,
                conversionRate: statsRes.conversionRate || "0%",
                leadsStats: {
                    day: statsRes.leadsStats?.day || 0,
                    week: statsRes.leadsStats?.week || 0,
                    month: statsRes.leadsStats?.month || 0,
                },
                salesStats: {
                    day: statsRes.salesStats?.day || 0,
                    week: statsRes.salesStats?.week || 0,
                    month: statsRes.salesStats?.month || 0,
                },
                csrPerformance: statsRes.csrPerformance || [],
            });

            setLeads(leadsRes || []);
        } catch (err: any) {
            console.error(err);
            setError("Failed to load admin dashboard stats");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [filter]);

    // ================= CREATE CSR =================
    const handleCreateCSR = async (e: React.FormEvent) => {
        e.preventDefault();
        setCsrError("");
        setCsrSuccess("");
        setCsrLoading(true);

        try {
            const res = await createCSR({ name: csrName, email: csrEmail, password: csrPassword });
            setCsrSuccess(`CSR "${res.user.name}" created successfully!`);
            setCsrName(""); setCsrEmail(""); setCsrPassword(""); setShowCSRModal(false);
            await fetchStats();
        } catch (err: any) {
            setCsrError(err.response?.data?.msg || "Failed to create CSR");
        } finally {
            setCsrLoading(false);
        }
    };

    // ================= CREATE / UPDATE LEAD =================
    const handleLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (leadIdEditing) {
                await updateLead(leadIdEditing, {
                    name: leadName,
                    phone: leadPhone,
                    course: leadCourse,
                    assignedTo: assignedCSR || undefined,
                });
            } else {
                await createLead({
                    name: leadName,
                    phone: leadPhone,
                    course: leadCourse,
                    assignedTo: assignedCSR || undefined,
                });
            }
            setShowLeadModal(false);
            setLeadIdEditing(null);
            setLeadName(""); setLeadPhone(""); setLeadCourse(""); setAssignedCSR(null);
            fetchStats();
        } catch (err: any) {
            alert(err.response?.data?.msg || "Failed to save lead");
        }
    };

    // ================= DELETE LEAD =================
    const handleDeleteLead = async (id: string) => {
        if (!confirm("Are you sure you want to delete this lead?")) return;
        try {
            await deleteLead(id);
            fetchStats();
        } catch (err: any) {
            alert(err.response?.data?.msg || "Failed to delete lead");
        }
    };

    // ================= EXCEL UPLOAD =================
    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];
        setUploading(true);
        try {
            await uploadExcelLeads(file);
            alert("✅ Excel uploaded successfully");
            fetchStats();
        } catch (err: any) {
            alert(err.response?.data?.msg || "❌ Failed to upload Excel");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;

    // ================= JSX =================
    return (
        <div className="space-y-6 p-6">
            {/* HEADER + CREATE CSR */}
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-bold">Admin Dashboard</h1>
                <button onClick={() => setShowCSRModal(true)} className="bg-green-600 text-white px-4 py-2 rounded">
                    + Create CSR
                </button>
            </div>

            {/* CSR MODAL */}
            {showCSRModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded shadow w-96 relative">
                        <h2 className="text-lg font-semibold mb-4">Create New CSR</h2>
                        <form onSubmit={handleCreateCSR} className="flex flex-col gap-3">
                            <input placeholder="Name" value={csrName} onChange={e => setCsrName(e.target.value)} required className="border p-2 rounded" />
                            <input type="email" placeholder="Email" value={csrEmail} onChange={e => setCsrEmail(e.target.value)} required className="border p-2 rounded" />
                            <input type="password" placeholder="Password" value={csrPassword} onChange={e => setCsrPassword(e.target.value)} required className="border p-2 rounded" />
                            <button type="submit" disabled={csrLoading} className="bg-blue-600 text-white py-2 rounded mt-2">
                                {csrLoading ? "Creating..." : "Create CSR"}
                            </button>
                            {csrError && <p className="text-red-500 text-sm">{csrError}</p>}
                            {csrSuccess && <p className="text-green-500 text-sm">{csrSuccess}</p>}
                        </form>
                        <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-700" onClick={() => setShowCSRModal(false)}>✖</button>
                    </div>
                </div>
            )}

            {/* CREATE LEAD + UPLOAD */}
            <div className="flex space-x-4 mb-4">
                <button onClick={() => setShowLeadModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">+ Create Lead</button>
                <label className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer">
                    {uploading ? "Uploading..." : "Upload Excel Leads"}
                    <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} disabled={uploading} />
                </label>
            </div>

            {/* LEADS TABLE */}
            <div className="bg-white p-4 rounded shadow">
                <h2 className="text-lg font-semibold mb-4">All Leads</h2>
                {leads.length ? (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left p-2">Name</th>
                                <th className="text-left p-2">Course</th>
                                <th className="text-left p-2">Phone</th>
                                <th className="text-left p-2">Status</th>
                                <th className="text-left p-2">Assigned CSR</th>
                                <th className="text-left p-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leads.map((lead) => (
                                <tr key={lead._id} className="border-b">
                                    <td className="p-2">{lead.name}</td>
                                    <td className="p-2">{lead.course}</td>
                                    <td className="p-2">{lead.phone}</td>
                                    <td className="p-2">{lead.status || "Pending"}</td>
                                    <td className="p-2">{lead.assignedTo?.name || "-"}</td>
                                    <td className="p-2 flex space-x-2">
                                        <button onClick={() => {
                                            setShowLeadModal(true);
                                            setLeadIdEditing(lead._id);
                                            setLeadName(lead.name);
                                            setLeadPhone(lead.phone);
                                            setLeadCourse(lead.course);
                                            setAssignedCSR(lead.assignedTo?._id || null);
                                        }} className="bg-yellow-500 text-white px-2 py-1 rounded">Edit</button>
                                        <button onClick={() => handleDeleteLead(lead._id)} className="bg-red-600 text-white px-2 py-1 rounded">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : <p className="text-gray-500">No leads available</p>}
            </div>

            {/* FILTER & SUMMARY CARDS */}
            <div className="flex items-center space-x-4 mb-4">
                <label className="font-semibold">Select Time Filter:</label>
                <select value={filter} onChange={(e) => setFilter(e.target.value as "day" | "week" | "month")} className="border rounded px-2 py-1">
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard title="Total Leads" value={data?.totalLeads || 0} />
                <SummaryCard title="Total Sales" value={data?.totalSales || 0} />
                <SummaryCard title="Total CSRs" value={data?.totalCSRs || 0} />
                <SummaryCard title="Conversion Rate" value={data?.conversionRate || "0%"} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CSRStatsChart title="Leads Analytics" day={data?.leadsStats?.day || 0} week={data?.leadsStats?.week || 0} month={data?.leadsStats?.month || 0} />
                <CSRStatsChart title="Sales Analytics" day={data?.salesStats?.day || 0} week={data?.salesStats?.week || 0} month={data?.salesStats?.month || 0} />
            </div>

            {/* CSR PERFORMANCE TABLE */}
            <div className="bg-white p-4 rounded shadow">
                <h2 className="text-lg font-semibold mb-4">CSR Performance</h2>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b">
                            <th className="text-left p-2">CSR Name</th>
                            <th className="text-left p-2">Leads</th>
                            <th className="text-left p-2">Sales</th>
                            <th className="text-left p-2">Conversion</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data?.csrPerformance.length ? data.csrPerformance.map(csr => (
                            <tr key={csr.csrId} className="border-b">
                                <td className="p-2">{csr.name}</td>
                                <td className="p-2">{csr.totalLeads}</td>
                                <td className="p-2">{csr.totalSales}</td>
                                <td className="p-2">{csr.conversionRate}</td>
                            </tr>
                        )) : <tr><td colSpan={4} className="text-center p-4 text-gray-500">No CSR data available</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
