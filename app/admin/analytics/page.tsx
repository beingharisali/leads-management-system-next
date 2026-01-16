"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import axios from "@/services/http";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
} from "recharts";

interface TeamStat {
    csrName: string;
    totalLeads: number;
    totalSales: number;
}

const COLORS = ["#0088FE", "#00C49F", "#FF8042", "#FFBB28", "#FF6384"];

export default function TeamAnalytics() {
    const [stats, setStats] = useState<TeamStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchTeamStats = async () => {
        setLoading(true);
        setError("");
        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("Unauthorized: Token not found");

            const res = await axios.get("/api/v1/admin/team-analytics", {
                headers: { Authorization: `Bearer ${token}` },
            });

            setStats(res.data.data || []);
        } catch (err: any) {
            console.error(err);
            setError(err?.response?.data?.message || "Failed to fetch team analytics");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeamStats();
    }, []);

    // Prepare data for charts safely
    const barData = stats.map((s) => ({
        name: s.csrName,
        Leads: s.totalLeads,
        Sales: s.totalSales,
        Conversion: s.totalLeads > 0 ? +(s.totalSales / s.totalLeads * 100).toFixed(1) : 0,
    }));

    const pieData = stats.map((s) => ({
        name: s.csrName,
        value: s.totalSales,
    }));

    return (
        <ProtectedRoute>
            <RoleGuard allowedRole="admin">
                <div className="min-h-screen p-6 bg-gray-100">
                    <h1 className="text-3xl font-bold mb-6">Team Analytics</h1>

                    {loading && <p className="text-gray-600">Loading analytics...</p>}
                    {error && <p className="text-red-500">{error}</p>}

                    {!loading && !error && stats.length > 0 && (
                        <>
                            {/* Bar Chart: Leads, Sales, Conversion */}
                            <div className="bg-white p-4 rounded shadow mb-6">
                                <h2 className="text-xl font-semibold mb-4">CSR Performance</h2>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={barData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="Leads" fill="#0088FE" />
                                        <Bar dataKey="Sales" fill="#00C49F" />
                                        <Bar dataKey="Conversion" fill="#FF8042" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Pie Chart: Sales by CSR */}
                            <div className="bg-white p-4 rounded shadow">
                                <h2 className="text-xl font-semibold mb-4">Sales Distribution</h2>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            label
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={COLORS[index % COLORS.length]}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    )}

                    {!loading && !error && stats.length === 0 && (
                        <p className="text-gray-600">No analytics data available.</p>
                    )}
                </div>
            </RoleGuard>
        </ProtectedRoute>
    );
}
