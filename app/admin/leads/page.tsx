"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import http from "@/services/http";
import FilterButtons from "@/components/buttons/FilterButtons";

// Lazy load LeadList to optimize initial bundle
const LeadList = lazy(() => import("@/components/LeadList"));

export interface Lead {
    _id: string;
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

    // Fetch leads based on selected filter
    const fetchLeads = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await http.get(`/lead/csr-leads?filter=${filter}`);
            setLeads(res.data.data || []); // ✅ ensures proper data path
        } catch (err: any) {
            console.error("Failed to fetch leads:", err);
            setError(err.response?.data?.message || err.message || "Failed to load leads");
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

                    {/* Filter Buttons (Reusable Component) */}
                    <FilterButtons
                        options={["day", "week", "month"]}
                        selected={filter}
                        onChange={(f: FilterType) => setFilter(f)}
                        labels={{ day: "Today", week: "This Week", month: "This Month" }}
                    />

                    {/* Loading / Error */}
                    {loading && <p className="text-gray-600 mt-4">Loading leads...</p>}
                    {error && <p className="text-red-500 mt-4">{error}</p>}

                    {/* Lead List Component (lazy-loaded) */}
                    {!loading && !error && leads.length > 0 && (
                        <Suspense fallback={<p>Loading table...</p>}>
                            <LeadList leads={leads} refreshLeads={fetchLeads} role="csr" />
                        </Suspense>
                    )}

                    {/* No leads */}
                    {!loading && !error && leads.length === 0 && (
                        <p className="text-gray-600 mt-4">No leads found for this filter.</p>
                    )}
                </div>
            </RoleGuard>
        </ProtectedRoute>
    );
}
