"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import http from "@/services/http";
import LeadList, { Lead } from "@/components/LeadList";

type FilterType = "day" | "week" | "month";

export default function LeadsListPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState<FilterType>("day");

    // Fetch leads based on selected filter
    const fetchLeads = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await http.get(`/lead/csr-leads?filter=${filter}`);
            setLeads(res.data || []);
        } catch (err: any) {
            console.error(err);
            setError("Failed to load leads");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, [filter]);

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
                                className={`px-4 py-2 rounded font-medium transition-colors duration-200 ${filter === f
                                        ? "bg-black text-white"
                                        : "bg-white border hover:bg-gray-200"
                                    }`}
                            >
                                {f === "day"
                                    ? "Today"
                                    : f === "week"
                                        ? "This Week"
                                        : "This Month"}
                            </button>
                        ))}
                    </div>

                    {/* Loading / Error */}
                    {loading && <p className="text-gray-600">Loading leads...</p>}
                    {error && <p className="text-red-500">{error}</p>}

                    {/* Lead List Component */}
                    {!loading && !error && <LeadList leads={leads} refreshLeads={fetchLeads} />}
                </div>
            </RoleGuard>
        </ProtectedRoute>
    );
}
