"use client";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import CSRStatsChart from "@/components/CSRStatsChart";
import { useEffect, useState } from "react";
import axios from "@/services/axios"; // your configured axios instance

interface CSRStat {
    csrName: string;
    totalLeads: number;
    totalSales: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<CSRStat[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCSRStats = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get("/api/v1/admin/csr-stats", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setStats(res.data.data);
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
                        <CSRStatsChart labels={labels} leads={leads} sales={sales} />
                    )}
                </div>
            </RoleGuard>
        </ProtectedRoute>
    );
}
