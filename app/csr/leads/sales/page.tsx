"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import axios from "@/services/http";

interface Sale {
    _id: string;
    lead: { name: string; email: string };
    amount: number;
    status: string;
    createdAt: string;
}

export default function CsrSalesPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const limit = 10; // 10 sales per page

    const fetchSales = async (pageNumber = 1) => {
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            const userId = localStorage.getItem("userId");
            if (!userId) throw new Error("User ID not found");

            const res = await axios.get(
                `/api/v1/sales/get-sales-by-csr/${userId}?page=${pageNumber}&limit=${limit}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setSales(res.data.data || []);
            setTotalPages(res.data.totalPages || 1);
            setPage(res.data.page || 1);
        } catch (err: any) {
            console.error(err);
            alert(err?.response?.data?.message || "Failed to fetch sales");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSales(page);
    }, [page]);

    return (
        <ProtectedRoute>
            <RoleGuard allowedRole="csr">
                <div className="p-6 min-h-screen bg-gray-100">
                    <h1 className="text-2xl font-bold mb-4">My Sales</h1>

                    {loading ? (
                        <p className="text-gray-600">Loading sales...</p>
                    ) : sales.length === 0 ? (
                        <p className="text-gray-600">No sales found.</p>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded shadow bg-white">
                                <table className="min-w-full border-collapse">
                                    <thead className="bg-gray-200">
                                        <tr>
                                            <th className="p-2 border">Lead Name</th>
                                            <th className="p-2 border">Email</th>
                                            <th className="p-2 border">Amount</th>
                                            <th className="p-2 border">Status</th>
                                            <th className="p-2 border">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sales.map((sale) => (
                                            <tr key={sale._id} className="text-center hover:bg-gray-50">
                                                <td className="p-2 border">{sale.lead.name}</td>
                                                <td className="p-2 border">{sale.lead.email}</td>
                                                <td className="p-2 border">${sale.amount}</td>
                                                <td className="p-2 border">{sale.status}</td>
                                                <td className="p-2 border">
                                                    {new Date(sale.createdAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Buttons */}
                            <div className="flex justify-center gap-2 mt-4">
                                <button
                                    className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50 hover:bg-gray-400 transition-colors"
                                    disabled={page <= 1}
                                    onClick={() => setPage((p) => p - 1)}
                                >
                                    Previous
                                </button>
                                <span className="px-3 py-1">{page} / {totalPages}</span>
                                <button
                                    className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50 hover:bg-gray-400 transition-colors"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage((p) => p + 1)}
                                >
                                    Next
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </RoleGuard>
        </ProtectedRoute>
    );
}
