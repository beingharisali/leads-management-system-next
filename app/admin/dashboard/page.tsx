"use client";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import CSRStatsChart from "@/components/CSRStatsChart";
import SummaryCard from "@/components/SummaryCard";
import { useEffect, useState } from "react";
import axios from "@/services/http";
import { useRouter } from "next/navigation";

interface CSRStat {
    csrName: string;
    totalLeads: number;
    totalSales: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<CSRStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Summary state
    const [totalLeads, setTotalLeads] = useState(0);
    const [totalSales, setTotalSales] = useState(0);
    const [conversionRate, setConversionRate] = useState(0);
    const [totalCSRs, setTotalCSRs] = useState(0);

    const router = useRouter();

    const fetchCSRStats = async () => {
        setLoading(true);
        setError("");
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get("/api/v1/admin/csr-stats", {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data: CSRStat[] = res.data.data;
            setStats(data);

            // Calculate summaries
            const leadsSum = data.reduce((sum, csr) => sum + csr.totalLeads, 0);
            const salesSum = data.reduce((sum, csr) => sum + csr.totalSales, 0);
            const csrsCount = data.length;
            const conversion = leadsSum > 0 ? Math.round((salesSum / leadsSum) * 100) : 0;

            setTotalLeads(leadsSum);
            setTotalSales(salesSum);
            setTotalCSRs(csrsCount);
            setConversionRate(conversion);

        } catch (err: any) {
            console.error(err);
            setError("Failed to fetch CSR stats");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCSRStats();
    }, []);

    const labels = stats.map((s) => s.csrName);
    const leads = stats.map((s) => s.totalLeads);
    const sales = stats.map((s) => s.totalSales);

    return (
        <ProtectedRoute>
            <RoleGuard allowedRole="admin">
                <div className="p-6 min-h-screen bg-gray-100">
                    <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

                    {loading ? (
                        <p className="text-gray-600">Loading CSR stats...</p>
                    ) : error ? (
                        <p className="text-red-500">{error}</p>
                    ) : (
                        <>
                            {/* CSR List Button */}
                            <div className="mb-6">
                                <button
                                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                                    onClick={() => router.push("/admin/csrs")}
                                >
                                    View All CSRs
                                </button>
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <SummaryCard title="Total Leads" value={totalLeads} color="bg-teal-500" />
                                <SummaryCard title="Total Sales" value={totalSales} color="bg-green-500" />
                                <SummaryCard title="Conversion Rate" value={`${conversionRate}%`} color="bg-indigo-500" />
                                <SummaryCard title="Total CSRs" value={totalCSRs} color="bg-purple-500" />
                            </div>

                            {/* CSR Stats Chart */}
                            <div className="bg-white p-4 rounded shadow">
                                <CSRStatsChart labels={labels} leads={leads} sales={sales} />
                            </div>
                        </>
                    )}
                </div>
            </RoleGuard>
        </ProtectedRoute>
    );
}
