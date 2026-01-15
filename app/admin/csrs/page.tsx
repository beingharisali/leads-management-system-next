"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import axios from "@/services/axios";
import { useRouter } from "next/navigation";

interface CSR {
    _id: string;
    name: string;
    email: string;
    totalLeads: number;
    totalSales: number;
}

export default function CSRListPage() {
    const [csrs, setCsrs] = useState<CSR[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const router = useRouter();

    const fetchCSRs = async () => {
        setLoading(true);
        setError("");
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get("/api/v1/admin/csrs", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setCsrs(res.data.data); // assume API returns { data: CSR[] }
        } catch (err: any) {
            console.error(err);
            setError("Failed to load CSRs");
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

                    {loading && <p>Loading CSRs...</p>}
                    {error && <p className="text-red-500">{error}</p>}

                    {!loading && !error && csrs.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white shadow rounded">
                                <thead>
                                    <tr className="text-left">
                                        <th className="px-4 py-2 border">Name</th>
                                        <th className="px-4 py-2 border">Email</th>
                                        <th className="px-4 py-2 border">Total Leads</th>
                                        <th className="px-4 py-2 border">Total Sales</th>
                                        <th className="px-4 py-2 border">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {csrs.map((csr) => (
                                        <tr key={csr._id} className="text-center">
                                            <td className="border px-4 py-2">{csr.name}</td>
                                            <td className="border px-4 py-2">{csr.email}</td>
                                            <td className="border px-4 py-2">{csr.totalLeads}</td>
                                            <td className="border px-4 py-2">{csr.totalSales}</td>
                                            <td className="border px-4 py-2">
                                                <button
                                                    className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                                                    onClick={() => router.push(`/admin/csr/${csr._id}`)}
                                                >
                                                    View Performance
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        !loading && <p>No CSRs found.</p>
                    )}
                </div>
            </RoleGuard>
        </ProtectedRoute>
    );
}
