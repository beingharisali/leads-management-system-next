"use client";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import CSRStatsChart from "@/components/CSRStatsChart";
import SummaryCard from "@/components/SummaryCard"; // new component
import { useEffect, useState } from "react";
import axios from "@/services/axios";

interface CSRStat {
    csrName: string;
    totalLeads: number;
    totalSales: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<CSRStat[]>([]);
    const [loading, setLoading] = useState(true);

    // Summary state
    const [totalLeads, setTotalLeads] = useState(0);
    const [totalSales, setTotalSales] = useState(0);
    const [conversionRate, setConversionRate] = useState(0);
    const [totalCSRs, setTotalCSRs] = useState(0);

    const fetchCSRStats = async () => {
        setLoading(true);
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

        } catch (err) {
            console.error(err);
            alert("Failed to fetch CSR stats");
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
                <div className="p-6">
                    <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

                    {loading ? (
                        <p>Loading CSR stats...</p>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <SummaryCard title="Total Leads" value={totalLeads} color="bg-teal-500" />
                                <SummaryCard title="Total Sales" value={totalSales} color="bg-green-500" />
                                <SummaryCard title="Conversion Rate" value={`${conversionRate}%`} color="bg-indigo-500" />
                                <SummaryCard title="Total CSRs" value={totalCSRs} color="bg-purple-500" />
                            </div>

                            {/* CSR Stats Chart */}
                            <CSRStatsChart labels={labels} leads={leads} sales={sales} />
                        </>
                    )}
                </div>
            </RoleGuard>
        </ProtectedRoute>
    );
}
