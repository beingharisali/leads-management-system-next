"use client";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getAdminStats } from "@/services/dashboard.api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function SalesAnalytics() {
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        getAdminStats().then(setStats).catch(console.log);
    }, []);

    return (
        <ProtectedRoute role="admin">
            <h1>Sales Analytics</h1>
            {stats ? (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.salesByMonth}>
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="sales" fill="#8884d8" />
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <p>Loading sales data...</p>
            )}
        </ProtectedRoute>
    );
}
