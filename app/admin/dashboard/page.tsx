"use client";

import { useEffect, useState } from "react";
import { getAdminStats } from "@/services/dashboard.api";
import { createCSR } from "@/services/auth.api";
import SummaryCard from "@/components/SummaryCard";
import CSRStatsChart from "@/components/CSRStatsChart";
import Loading from "@/components/Loading";
import ErrorMessage from "@/components/ErrorMessage";

interface CSRPerformance {
    csrId: string;
    name: string;
    totalLeads: number;
    totalSales: number;
    conversionRate: string;
}

interface StatsData {
    totalLeads: number;
    totalSales: number;
    totalCSRs: number;
    conversionRate: string;
    leadsStats: { day: number; week: number; month: number };
    salesStats: { day: number; week: number; month: number };
    csrPerformance: CSRPerformance[];
}

export default function AdminDashboardPage() {
    const [data, setData] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState<"day" | "week" | "month">("day");

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [csrName, setCsrName] = useState("");
    const [csrEmail, setCsrEmail] = useState("");
    const [csrPassword, setCsrPassword] = useState("");
    const [csrError, setCsrError] = useState("");
    const [csrLoading, setCsrLoading] = useState(false);
    const [csrSuccess, setCsrSuccess] = useState("");

    // Fetch stats whenever filter changes
    const fetchStats = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await getAdminStats(filter);
            setData({
                totalLeads: res.totalLeads || 0,
                totalSales: res.totalSales || 0,
                totalCSRs: res.totalCSRs || 0,
                conversionRate: res.conversionRate || "0%",
                leadsStats: {
                    day: res.leadsStats?.day || 0,
                    week: res.leadsStats?.week || 0,
                    month: res.leadsStats?.month || 0,
                },
                salesStats: {
                    day: res.salesStats?.day || 0,
                    week: res.salesStats?.week || 0,
                    month: res.salesStats?.month || 0,
                },
                csrPerformance: res.csrPerformance || [],
            });
        } catch (err: any) {
            console.error(err);
            setError("Failed to load admin dashboard stats");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [filter]);

    const handleCreateCSR = async (e: React.FormEvent) => {
        e.preventDefault();
        setCsrError("");
        setCsrSuccess("");
        setCsrLoading(true);

        try {
            const res = await createCSR({ name: csrName, email: csrEmail, password: csrPassword });
            setCsrSuccess(`CSR "${res.user.name}" created successfully!`);

            // Clear modal inputs
            setCsrName("");
            setCsrEmail("");
            setCsrPassword("");
            setShowModal(false);

            // Refresh stats automatically
            await fetchStats();
        } catch (err: any) {
            setCsrError(err.response?.data?.msg || "Failed to create CSR");
        } finally {
            setCsrLoading(false);
        }
    };

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <div className="space-y-6 p-6">
            {/* ===== CREATE CSR BUTTON ===== */}
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-bold">Admin Dashboard</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded"
                >
                    + Create CSR
                </button>
            </div>

            {/* ===== CSR MODAL ===== */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded shadow w-96 relative">
                        <h2 className="text-lg font-semibold mb-4">Create New CSR</h2>
                        <form onSubmit={handleCreateCSR} className="flex flex-col gap-3">
                            <input
                                placeholder="Name"
                                value={csrName}
                                onChange={(e) => setCsrName(e.target.value)}
                                required
                                className="border p-2 rounded"
                            />
                            <input
                                type="email"
                                placeholder="Email"
                                value={csrEmail}
                                onChange={(e) => setCsrEmail(e.target.value)}
                                required
                                className="border p-2 rounded"
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={csrPassword}
                                onChange={(e) => setCsrPassword(e.target.value)}
                                required
                                className="border p-2 rounded"
                            />
                            <button
                                type="submit"
                                disabled={csrLoading}
                                className="bg-blue-600 text-white py-2 rounded mt-2"
                            >
                                {csrLoading ? "Creating..." : "Create CSR"}
                            </button>
                            {csrError && <p className="text-red-500 text-sm">{csrError}</p>}
                            {csrSuccess && <p className="text-green-500 text-sm">{csrSuccess}</p>}
                        </form>
                        <button
                            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                            onClick={() => setShowModal(false)}
                        >
                            ✖
                        </button>
                    </div>
                </div>
            )}

            {/* ===== FILTER DROPDOWN ===== */}
            <div className="flex items-center space-x-4 mb-4">
                <label className="font-semibold">Select Time Filter:</label>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as "day" | "week" | "month")}
                    className="border rounded px-2 py-1"
                >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                </select>
            </div>

            {/* ===== SUMMARY CARDS ===== */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <SummaryCard title="Total Leads" value={data?.totalLeads || 0} />
                <SummaryCard title="Total Sales" value={data?.totalSales || 0} />
                <SummaryCard title="Total CSRs" value={data?.totalCSRs || 0} />
                <SummaryCard title="Conversion Rate" value={data?.conversionRate || "0%"} />
            </div>

            {/* ===== CHARTS ===== */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CSRStatsChart
                    title="Leads Analytics"
                    day={data?.leadsStats?.day || 0}
                    week={data?.leadsStats?.week || 0}
                    month={data?.leadsStats?.month || 0}
                />
                <CSRStatsChart
                    title="Sales Analytics"
                    day={data?.salesStats?.day || 0}
                    week={data?.salesStats?.week || 0}
                    month={data?.salesStats?.month || 0}
                />
            </div>

            {/* ===== CSR PERFORMANCE TABLE ===== */}
            <div className="bg-white p-4 rounded shadow">
                <h2 className="text-lg font-semibold mb-4">CSR Performance</h2>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b">
                            <th className="text-left p-2">CSR Name</th>
                            <th className="text-left p-2">Leads</th>
                            <th className="text-left p-2">Sales</th>
                            <th className="text-left p-2">Conversion</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data?.csrPerformance.length ? (
                            data.csrPerformance.map((csr) => (
                                <tr key={csr.csrId} className="border-b">
                                    <td className="p-2">{csr.name}</td>
                                    <td className="p-2">{csr.totalLeads}</td>
                                    <td className="p-2">{csr.totalSales}</td>
                                    <td className="p-2">{csr.conversionRate}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="text-center p-4 text-gray-500">
                                    No CSR data available
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
