"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
    getLeadsByRole,
    updateLead,
    deleteLead,
    convertLeadToSale,
    uploadExcelLeads,
} from "@/services/lead.api";
import { getCSRStats } from "@/services/dashboard.api";
import SummaryCard from "@/components/SummaryCard";
import CSRStatsChart from "@/components/CSRStatsChart";
import Loading from "@/components/Loading";
import ErrorMessage from "@/components/ErrorMessage";
import { getUserRole, getUserId } from "@/utils/decodeToken";

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

    // ================= Fetch Leads & Stats =================
    const fetchData = async () => {
        const role = await getUserRole();
        const userId = await getUserId(); // CSR ID

        if (!role || !userId) {
            setError("User role or ID not found");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");

        try {
            // ✅ Fixed getLeadsByRole call type
            const leadsRes: Lead[] = await getLeadsByRole(role, userId);
            const statsRes = await getCSRStats(filter);

            setLeads(leadsRes ?? []);

            setStats({
                totalLeads: statsRes?.totalLeads ?? 0,
                totalSales: statsRes?.totalSales ?? 0,
                conversionRate: statsRes?.conversionRate ?? "0%",
                leadsStats: {
                    day: statsRes?.leadsStats?.day ?? 0,
                    week: statsRes?.leadsStats?.week ?? 0,
                    month: statsRes?.leadsStats?.month ?? 0,
                },
                salesStats: {
                    day: statsRes?.salesStats?.day ?? 0,
                    week: statsRes?.salesStats?.week ?? 0,
                    month: statsRes?.salesStats?.month ?? 0,
                },
            });
        } catch (err: any) {
            console.error("CSR fetch error:", err);
            setError(err.message || "Failed to load CSR data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filter]);

    // ================= Excel Upload =================
    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];

        setUploading(true);
        setError("");

        try {
            await uploadExcelLeads(file);
            alert("✅ Excel uploaded successfully");
            fetchData();
        } catch (err: any) {
            console.error("Excel upload error:", err);
            setError(err.message || "❌ Failed to upload Excel");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    // ================= Lead Actions =================
    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure to delete this lead?")) return;
        try {
            await deleteLead(id);
            fetchData();
        } catch (err: any) {
            console.error("Delete lead error:", err);
            alert("❌ Failed to delete lead");
        }
    };

    const handleConvertToSale = async (id: string) => {
        const amount = parseFloat(prompt("Enter sale amount:") || "0");
        if (!amount) return;
        try {
            await convertLeadToSale(id, amount);
            fetchData();
        } catch (err: any) {
            console.error("Convert to sale error:", err);
            alert("❌ Failed to convert lead to sale");
        }
    };

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <ProtectedRoute role="csr">
            <div className="space-y-6 p-6">
                <h1 className="text-xl font-bold mb-4">CSR Dashboard</h1>

                {/* Action Buttons */}
                <div className="flex space-x-4 mb-4">
                    <button
                        onClick={() => router.push("/csr/leads/create")}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        + Create Lead
                    </button>

                    <label className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer">
                        {uploading ? "Uploading..." : "Upload Excel Leads"}
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={handleExcelUpload}
                            disabled={uploading}
                        />
                    </label>

                    <button
                        onClick={() => router.push("/csr/leads/sales")}
                        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                        View Sales
                    </button>
                </div>

                {/* Filter */}
                <div className="flex items-center space-x-4 mb-4">
                    <label className="font-semibold">Select Time Filter:</label>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as Filter)}
                        className="border rounded px-2 py-1"
                    >
                        <option value="day">Day</option>
                        <option value="week">Week</option>
                        <option value="month">Month</option>
                    </select>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <SummaryCard title="Total Leads" value={stats.totalLeads} />
                    <SummaryCard title="Total Sales" value={stats.totalSales} />
                    <SummaryCard title="Conversion Rate" value={stats.conversionRate} />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                    <CSRStatsChart
                        title="Leads Analytics"
                        day={stats.leadsStats.day}
                        week={stats.leadsStats.week}
                        month={stats.leadsStats.month}
                    />
                    <CSRStatsChart
                        title="Sales Analytics"
                        day={stats.salesStats.day}
                        week={stats.salesStats.week}
                        month={stats.salesStats.month}
                    />
                </div>

                {/* Leads Table */}
                <div className="bg-white p-4 rounded shadow">
                    <h2 className="text-lg font-semibold mb-4">My Leads</h2>
                    {leads.length ? (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2">Name</th>
                                    <th className="text-left p-2">Course</th>
                                    <th className="text-left p-2">Phone</th>
                                    <th className="text-left p-2">Status</th>
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
                                        <td className="p-2 space-x-2">
                                            <button
                                                onClick={() => handleConvertToSale(lead._id)}
                                                className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs"
                                            >
                                                Convert to Sale
                                            </button>
                                            <button
                                                onClick={() => handleDelete(lead._id)}
                                                className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-xs"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-gray-500">No leads available</p>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
