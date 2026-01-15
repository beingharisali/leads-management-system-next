"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import http from "@/services/http";
import CSRStatsChart from "@/components/CSRStatsChart";

type FilterType = "day" | "week" | "month";

interface StatsData {
    labels: string[];
    leads: number[];
    sales: number[];
    totalLeads: number;
    totalSales: number;
    conversionRate: number;
}

export default function CsrDashboard() {
    const [filter, setFilter] = useState<FilterType>("day");
    const [stats, setStats] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchStats = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await http.get(`/dashboard/csr-stats?filter=${filter}`);
            setStats(res.data);
        } catch (err: any) {
            console.error(err);
            setError("Failed to load dashboard stats");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [filter]);

    return (
        <ProtectedRoute>
            <RoleGuard allowedRole="csr">
                <div className="min-h-screen p-6 bg-gray-100">
                    <h1 className="text-3xl font-bold mb-6">CSR Dashboard</h1>

                    {/* Filter Buttons */}
                    <div className="mb-6 flex gap-3">
                        {(["day", "week", "month"] as FilterType[]).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded font-medium ${filter === f ? "bg-black text-white" : "bg-white border hover:bg-gray-200"
                                    }`}
                            >
                                {f === "day" ? "Today" : f === "week" ? "This Week" : "This Month"}
                            </button>
                        ))}
                    </div>

                    {loading && <p className="text-gray-600">Loading stats...</p>}
                    {error && <p className="text-red-500">{error}</p>}

                    {stats && (
                        <>
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                                <div className="bg-white p-4 rounded shadow text-center">
                                    <p className="text-gray-500">Total Leads</p>
                                    <p className="text-2xl font-bold">{stats.totalLeads}</p>
                                </div>
                                <div className="bg-white p-4 rounded shadow text-center">
                                    <p className="text-gray-500">Total Sales</p>
                                    <p className="text-2xl font-bold">{stats.totalSales}</p>
                                </div>
                                <div className="bg-white p-4 rounded shadow text-center">
                                    <p className="text-gray-500">Conversion Rate</p>
                                    <p className="text-2xl font-bold">{stats.conversionRate}%</p>
                                </div>
                            </div>

                            {/* CSR Stats Bar Chart */}
                            <div className="bg-white p-4 rounded shadow">
                                <CSRStatsChart
                                    labels={stats.labels}
                                    leads={stats.leads}
                                    sales={stats.sales}
                                />
                            </div>
                        </>
                    )}
                </div>
            </RoleGuard>
        </ProtectedRoute>
    );
}
