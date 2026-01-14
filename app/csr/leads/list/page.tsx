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

type FilterType = "day" | "week" | "month";

export default function LeadsListPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState<FilterType>("day");

    useEffect(() => {
        async function fetchLeads() {
            setLoading(true);
            setError("");

            try {
                const res = await http.get(`/lead/csr-leads?filter=${filter}`); // backend must handle query
                setLeads(res.data);
            } catch (err: any) {
                console.error(err);
                setError("Failed to load leads");
            } finally {
                setLoading(false);
            }
        }

        fetchLeads();
    }, [filter]); // fetch again if filter changes

    return (
        <ProtectedRoute>
            <RoleGuard allowedRole="csr">
                <div className="min-h-screen p-6 bg-gray-100">
                    <h1 className="text-3xl font-bold mb-6">My Leads</h1>

                    {/* Filter Buttons */}
                    <div className="mb-6 flex gap-3">
                        {(["day", "week", "month"] as FilterType[]).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded font-medium ${filter === f
                                        ? "bg-black text-white"
                                        : "bg-white border hover:bg-gray-200"
                                    }`}
                            >
                                {f === "day" ? "Today" : f === "week" ? "This Week" : "This Month"}
                            </button>
                        ))}
                    </div>

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
                        !loading && <p>No leads found for selected filter.</p>
                    )}
                </div>
            </RoleGuard>
        </ProtectedRoute>
    );
}
