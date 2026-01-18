"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
    getLeadsByRole,
    deleteLead,
    convertLeadToSale,
    uploadExcelLeads,
} from "@/services/lead.api";
import { getCSRStats } from "@/services/dashboard.api";
import SummaryCard from "@/components/SummaryCard";
import CSRStatsChart from "@/components/CSRStatsChart";
import Loading from "@/components/Loading";
import ErrorMessage from "@/components/ErrorMessage";
import { getUserRole, getUserId, logout } from "@/utils/decodeToken";

// ================= TYPES =================
type Filter = "day" | "week" | "month";

interface Stats {
    totalLeads: number;
    totalSales: number;
    conversionRate: string;
    leadsStats: { day: number; week: number; month: number };
    salesStats: { day: number; week: number; month: number };
}

interface Lead {
    _id: string;
    name: string;
    course: string;
    phone: string;
    status?: string;
    assignedTo?: { _id: string; name: string } | null;
}

// ================= CSR DASHBOARD =================
export default function CSRDashboard() {
    const router = useRouter();

    const [leads, setLeads] = useState<Lead[]>([]);
    const [stats, setStats] = useState<Stats>({
        totalLeads: 0,
        totalSales: 0,
        conversionRate: "0%",
        leadsStats: { day: 0, week: 0, month: 0 },
        salesStats: { day: 0, week: 0, month: 0 },
    });

    const [filter, setFilter] = useState<Filter>("day");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [uploading, setUploading] = useState(false);
    const [csrId, setCsrId] = useState<string | null>(null);

    // ================= FETCH DATA =================
    const fetchData = async () => {
        try {
            setLoading(true);
            setError("");

            const role = await getUserRole();
            const userId = await getUserId();

            if (!role || !userId) throw new Error("User not authenticated");

            setCsrId(userId);

            // Fetch CSR leads and stats in parallel
            const [leadsRes, statsRes] = await Promise.all([
                getLeadsByRole(role, userId),
                getCSRStats(filter),
            ]);

            setLeads(leadsRes || []);
            setStats({
                totalLeads: statsRes?.totalLeads ?? 0,
                totalSales: statsRes?.totalSales ?? 0,
                conversionRate: statsRes?.conversionRate ?? "0%",
                leadsStats: statsRes?.leadsStats ?? { day: 0, week: 0, month: 0 },
                salesStats: statsRes?.salesStats ?? { day: 0, week: 0, month: 0 },
            });
        } catch (err: any) {
            setError(err.message || "Failed to load dashboard");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filter]);

    // ================= ACTIONS =================
    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this lead?")) return;
        try {
            await deleteLead(id);
            fetchData();
        } catch {
            alert("Delete failed");
        }
    };

    const handleConvertToSale = async (id: string) => {
        const amount = Number(prompt("Enter sale amount:"));
        if (!amount || amount <= 0) return alert("Invalid amount");

        try {
            await convertLeadToSale(id, amount);
            fetchData();
        } catch (err: any) {
            alert(err?.response?.data?.message || "Convert to sale failed");
        }
    };

    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        try {
            setUploading(true);
            await uploadExcelLeads(e.target.files[0]);
            fetchData();
        } catch {
            alert("Excel upload failed");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;

    // ================= JSX =================
    return (
        <ProtectedRoute role="csr">
            <div className="p-6 space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">CSR Dashboard</h1>
                        <p className="text-sm text-gray-500">CSR ID: {csrId}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-600 text-white rounded"
                    >
                        Logout
                    </button>
                </div>

                {/* Filters */}
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as Filter)}
                    className="border p-2 rounded"
                >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                </select>

                {/* Summary Cards */}
                <div className="grid md:grid-cols-3 gap-4">
                    <SummaryCard title="Total Leads" value={stats.totalLeads} />
                    <SummaryCard title="Total Sales" value={stats.totalSales} />
                    <SummaryCard title="Conversion Rate" value={stats.conversionRate} />
                </div>

                {/* Charts */}
                <div className="grid md:grid-cols-2 gap-6">
                    <CSRStatsChart title="Leads Analytics" {...stats.leadsStats} />
                    <CSRStatsChart title="Sales Analytics" {...stats.salesStats} />
                </div>

                {/* Leads Table */}
                <div className="bg-white shadow rounded p-4">
                    <h2 className="font-semibold mb-3">My Leads</h2>
                    {leads.length ? (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th>Name</th>
                                    <th>Course</th>
                                    <th>Phone</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leads.map((l) => (
                                    <tr key={l._id} className="border-b">
                                        <td>{l.name}</td>
                                        <td>{l.course}</td>
                                        <td>{l.phone}</td>
                                        <td>{l.status || "Pending"}</td>
                                        <td className="space-x-2">
                                            <button
                                                onClick={() => handleConvertToSale(l._id)}
                                                className="bg-green-600 text-white px-2 py-1 rounded"
                                            >
                                                Convert
                                            </button>
                                            <button
                                                onClick={() => handleDelete(l._id)}
                                                className="bg-red-600 text-white px-2 py-1 rounded"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-gray-500">No leads found</p>
                    )}
                </div>

                {/* Excel Upload */}
                <label className="inline-block bg-blue-600 text-white px-4 py-2 rounded cursor-pointer">
                    {uploading ? "Uploading..." : "Upload Excel"}
                    <input type="file" hidden onChange={handleExcelUpload} />
                </label>
            </div>
        </ProtectedRoute>
    );
}
