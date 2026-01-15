"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import SummaryCard from "@/components/SummaryCard";
import CSRStatsChart from "@/components/CSRStatsChart";
import axios from "@/services/axios";

interface CSRStats {
    csrName: string;
    totalLeads: number;
    totalSales: number;
    leadsOverTime: { date: string; leads: number; sales: number }[];
}

export default function CSRPerformancePage() {
    const { id } = useParams(); // CSR ID from URL
    const router = useRouter();

    const [stats, setStats] = useState<CSRStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchCSRStats = async () => {
        if (!id) return;
        setLoading(true);
        setError("");

        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`/api/v1/admin/csr/${id}/stats`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            setStats(res.data.data); // assume response { data: CSRStats }
        } catch (err: any) {
            console.error(err);
            setError("Failed to load CSR stats");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCSRStats();
    }, [id]);

    if (!id) return <p className="text-red-500">Invalid CSR ID</p>;

    return (
        <ProtectedRoute>
            <RoleGuard allowedRole="admin">
                <div className="min-h-screen p-6 bg-gray-100">
                    <button
                        className="mb-6 text-blue-600 underline"
                        onClick={() => router.push("/admin/csrs")}
                    >
                        ← Back to CSR List
                    </button>

                    <h1 className="text-2xl font-bold mb-4">
                        {stats?.csrName || "CSR"} Performance
                    </h1>

                    {loading && <p>Loading CSR stats...</p>}
                    {error && <p className="text-red-500">{error}</p>}

                    {stats && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                <SummaryCard
                                    title="Total Leads"
                                    value={stats.totalLeads}
                                    color="bg-teal-500"
                                />
                                <SummaryCard
                                    title="Total Sales"
                                    value={stats.totalSales}
                                    color="bg-green-500"
                                />
                                <SummaryCard
                                    title="Conversion Rate"
                                    value={
                                        stats.totalLeads > 0
                                            ? `${Math.round(
                                                (stats.totalSales / stats.totalLeads) * 100
                                            )}%`
                                            : "0%"
                                    }
                                    color="bg-indigo-500"
                                />
                            </div>

                            {/* Chart */}
                            <div className="bg-white p-4 rounded shadow">
                                <h2 className="text-xl font-semibold mb-4">Leads vs Sales Over Time</h2>
                                <CSRStatsChart
                                    labels={stats.leadsOverTime.map((d) => d.date)}
                                    leads={stats.leadsOverTime.map((d) => d.leads)}
                                    sales={stats.leadsOverTime.map((d) => d.sales)}
                                />
                            </div>
                        </>
                    )}
                </div>
            </RoleGuard>
        </ProtectedRoute>
    );
}
