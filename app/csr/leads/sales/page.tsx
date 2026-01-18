"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import Loading from "@/components/Loading";
import ErrorMessage from "@/components/ErrorMessage";
import http from "@/services/http";

interface Sale {
    _id: string;
    name: string;
    course: string;
    phone: string;
    amount: number;
    date: string;
}

export default function SalesPage() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // ================= Fetch CSR Sales =================
    const fetchSales = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await http.get("/sales/my-sales"); // CSR: own sales
            setSales(res.data || []);
        } catch (err: any) {
            console.error(err);
            setError(err?.response?.data?.msg || err?.message || "Failed to fetch sales");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSales();
    }, []);

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <ProtectedRoute role="csr">
            <RoleGuard allowedRole="csr">
                <div className="max-w-4xl mx-auto mt-10 p-6 bg-white shadow rounded space-y-4">
                    <h1 className="text-2xl font-bold mb-4">My Sales</h1>

                    {sales.length ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead>
                                    <tr className="border-b bg-gray-100">
                                        <th className="text-left p-2">Name</th>
                                        <th className="text-left p-2">Course</th>
                                        <th className="text-left p-2">Phone</th>
                                        <th className="text-left p-2">Amount</th>
                                        <th className="text-left p-2">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sales.map((sale) => (
                                        <tr key={sale._id} className="border-b hover:bg-gray-50">
                                            <td className="p-2">{sale.name}</td>
                                            <td className="p-2">{sale.course}</td>
                                            <td className="p-2">{sale.phone}</td>
                                            <td className="p-2">₹{sale.amount}</td>
                                            <td className="p-2">{new Date(sale.date).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-gray-500">No sales available</p>
                    )}
                </div>
            </RoleGuard>
        </ProtectedRoute>
    );
}
