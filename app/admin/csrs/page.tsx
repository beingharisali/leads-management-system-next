"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import axios from "@/services/axios";

interface CSR {
    id: string;
    name: string;
    email: string;
    totalLeads: number;
    totalSales: number;
}

export default function AdminCSRListPage() {
    const [csrs, setCsrs] = useState<CSR[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchCSRs = async () => {
        setLoading(true);
        setError("");
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get("/api/v1/admin/csrs", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setCsrs(res.data.data || []);
        } catch (err: any) {
            console.error(err);
            setError("Failed to fetch CSR list");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCSRs();
    }, []);

    return (
        <ProtectedRoute>
            <RoleGuard allowedRole="admin">
                <div className="min-h-screen p-6 bg-gray-100">
                    <h1 className="text-2xl font-bold mb-6">CSR List</h1>

                    {loading && <p className="text-gray-600">Loading CSRs...</p>}
                    {error && <p className="text-red-500">{error}</p>}

                    {!loading && !error && (
                        <div className="overflow-x-auto bg-white shadow rounded">
                            <table className="min-w-full">
                                <thead className="bg-gray-100">
                                    <tr className="text-left">
                                        <th className="px-4 py-2 border">Name</th>
                                        <th className="px-4 py-2 border">Email</th>
                                        <th className="px-4 py-2 border text-center">Total Leads</th>
                                        <th className="px-4 py-2 border text-center">Total Sales</th>
                                        <th className="px-4 py-2 border text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {csrs.map((csr) => (
                                        <tr key={csr.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 border">{csr.name}</td>
                                            <td className="px-4 py-2 border">{csr.email}</td>
                                            <td className="px-4 py-2 border text-center">{csr.totalLeads}</td>
                                            <td className="px-4 py-2 border text-center">{csr.totalSales}</td>
                                            <td className="px-4 py-2 border text-center">
                                                <button
                                                    onClick={() => alert(`View CSR ${csr.name} details (future)`)}
                                                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </RoleGuard>
        </ProtectedRoute>
    );
}
