"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import axios from "@/services/axios";

interface Sale {
    id: string;
    csrName: string;
    leadName: string;
    course: string;
    amount: number;
    status: string;
    createdAt: string;
}

type FilterType = "all" | "day" | "week" | "month";

export default function AllSalesPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<FilterType>("all");

    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    const fetchSales = async () => {
        setLoading(true);
        setError("");
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(
                `/api/v1/admin/all-sales?filter=${filter}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            setSales(res.data.data || []);
        } catch (err: any) {
            console.error(err);
            setError("Failed to load sales");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSales();
    }, [filter]);

    // Search filter
    const filteredSales = sales.filter(
        (s) =>
            s.csrName.toLowerCase().includes(search.toLowerCase()) ||
            s.leadName.toLowerCase().includes(search.toLowerCase()) ||
            s.course.toLowerCase().includes(search.toLowerCase())
    );

    // Pagination
    const totalPages = Math.ceil(filteredSales.length / pageSize);
    const paginatedSales = filteredSales.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    return (
        <ProtectedRoute>
            <RoleGuard allowedRole="admin">
                <div className="min-h-screen p-6 bg-gray-100">
                    <h1 className="text-3xl font-bold mb-6">All Sales</h1>

                    {/* Filter Buttons */}
                    <div className="mb-4 flex gap-3 flex-wrap">
                        {(["all", "day", "week", "month"] as FilterType[]).map((f) => (
                            <button
                                key={f}
                                onClick={() => {
                                    setFilter(f);
                                    setCurrentPage(1);
                                }}
                                className={`px-4 py-2 rounded font-medium ${filter === f
                                        ? "bg-black text-white"
                                        : "bg-white border hover:bg-gray-200"
                                    }`}
                            >
                                {f === "all"
                                    ? "All"
                                    : f === "day"
                                        ? "Today"
                                        : f === "week"
                                            ? "This Week"
                                            : "This Month"}
                            </button>
                        ))}
                    </div>

                    {/* Search Input */}
                    <input
                        type="text"
                        placeholder="Search by CSR, Lead, Course..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="mb-4 w-full max-w-md border p-2 rounded"
                    />

                    {loading && <p className="text-gray-600">Loading sales...</p>}
                    {error && <p className="text-red-500">{error}</p>}
                    {!loading && filteredSales.length === 0 && (
                        <p>No sales found.</p>
                    )}

                    {paginatedSales.length > 0 && (
                        <div className="overflow-x-auto bg-white shadow rounded">
                            <table className="min-w-full">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 border text-left">CSR Name</th>
                                        <th className="p-3 border text-left">Lead Name</th>
                                        <th className="p-3 border text-left">Course</th>
                                        <th className="p-3 border text-center">Amount</th>
                                        <th className="p-3 border text-center">Status</th>
                                        <th className="p-3 border text-center">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedSales.map((sale) => (
                                        <tr key={sale.id} className="hover:bg-gray-50 text-center">
                                            <td className="p-3 border text-left">{sale.csrName}</td>
                                            <td className="p-3 border text-left">{sale.leadName}</td>
                                            <td className="p-3 border text-left">{sale.course}</td>
                                            <td className="p-3 border text-center">{sale.amount}</td>
                                            <td className="p-3 border">
                                                <span
                                                    className={`px-2 py-1 rounded text-sm font-medium ${sale.status === "converted"
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-blue-100 text-blue-700"
                                                        }`}
                                                >
                                                    {sale.status}
                                                </span>
                                            </td>
                                            <td className="p-3 border">
                                                {new Date(sale.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex gap-2 mt-4">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                            >
                                Prev
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentPage(i + 1)}
                                    className={`px-3 py-1 rounded ${currentPage === i + 1
                                            ? "bg-black text-white"
                                            : "bg-gray-200"
                                        }`}
                                >
                                    {i + 1}
                                </button>
                            ))}
                            <button
                                onClick={() =>
                                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                                }
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </RoleGuard>
        </ProtectedRoute>
    );
}
