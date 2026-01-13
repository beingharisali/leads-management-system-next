"use client";

import { useEffect, useState } from "react";
import { getCsrDashboardStats, DashboardStats } from "@/services/dashboard.api";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";

import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    PieChart, Pie, Cell
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FF8042"];

export default function CsrDashboard() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function fetchStats() {
            setLoading(true);
            setError("");
            try {
                const data = await getCsrDashboardStats();
                setStats(data);
            } catch (err: any) {
                console.error(err);
                setError("Failed to load dashboard stats");
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    return (
        <ProtectedRoute>
            <RoleGuard allowedRole="csr">
                <div className="min-h-screen p-6 bg-gray-100">
                    <h1 className="text-3xl font-bold mb-6">CSR Dashboard</h1>

                    {loading && <p>Loading stats...</p>}
                    {error && <p className="text-red-500">{error}</p>}

                    {stats && (
                        <>
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Line Chart: Leads & Sales Over Time */}
                                <div className="bg-white p-4 rounded shadow">
                                    <h2 className="text-xl font-semibold mb-4">Leads & Sales Over Time</h2>
                                    <LineChart width={500} height={300} data={stats.leadsOverTime}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="leads" stroke="#0088FE" />
                                        <Line type="monotone" dataKey="sales" stroke="#00C49F" />
                                    </LineChart>
                                </div>

                                {/* Pie Chart: Conversion Ratio */}
                                <div className="bg-white p-4 rounded shadow">
                                    <h2 className="text-xl font-semibold mb-4">Conversion Ratio</h2>
                                    <PieChart width={300} height={300}>
                                        <Pie
                                            data={[
                                                { name: "Converted", value: stats.totalSales },
                                                { name: "Not Converted", value: stats.totalLeads - stats.totalSales },
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                            label
                                        >
                                            {[
                                                { name: "Converted", value: stats.totalSales },
                                                { name: "Not Converted", value: stats.totalLeads - stats.totalSales },
                                            ].map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </RoleGuard>
        </ProtectedRoute>
    );
}
