"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import http from "@/services/http";

interface Lead {
    id: string;
    name: string;
    phone: string;
    course: string;
    source?: string;
    status: string;
    createdAt: string;
}

export default function LeadsListPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function fetchLeads() {
            setLoading(true);
            setError("");

            try {
                const res = await http.get("/lead/csr-leads"); // backend endpoint
                setLeads(res.data);
            } catch (err: any) {
                console.error(err);
                setError("Failed to load leads");
            } finally {
                setLoading(false);
            }
        }

        fetchLeads();
    }, []);

    return (
        <ProtectedRoute>
            <RoleGuard allowedRole="csr">
                <div className="min-h-screen p-6 bg-gray-100">
                    <h1 className="text-3xl font-bold mb-6">My Leads</h1>

                    {loading && <p>Loading leads...</p>}
                    {error && <p className="text-red-500">{error}</p>}

                    {leads.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white shadow rounded">
                                <thead>
                                    <tr>
                                        <th className="px-4 py-2 border">Name</th>
                                        <th className="px-4 py-2 border">Phone</th>
                                        <th className="px-4 py-2 border">Course</th>
                                        <th className="px-4 py-2 border">Source</th>
                                        <th className="px-4 py-2 border">Status</th>
                                        <th className="px-4 py-2 border">Created At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leads.map((lead) => (
                                        <tr key={lead.id} className="text-center">
                                            <td className="border px-4 py-2">{lead.name}</td>
                                            <td className="border px-4 py-2">{lead.phone}</td>
                                            <td className="border px-4 py-2">{lead.course}</td>
                                            <td className="border px-4 py-2">{lead.source || "-"}</td>
                                            <td className="border px-4 py-2">{lead.status}</td>
                                            <td className="border px-4 py-2">
                                                {new Date(lead.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        !loading && <p>No leads found.</p>
                    )}
                </div>
            </RoleGuard>
        </ProtectedRoute>
    );
}
