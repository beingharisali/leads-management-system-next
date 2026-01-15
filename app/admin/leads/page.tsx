"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import LeadList, { Lead } from "@/components/LeadList";
import axios from "@/services/axios";
import FilterButtons from "@/components/buttons/FilterButtons";

type FilterType = "day" | "week" | "month";

export default function AdminLeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState<FilterType>("day");

    const fetchLeads = async () => {
        setLoading(true);
        setError("");
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get(`/api/v1/admin/all-leads?filter=${filter}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setLeads(res.data.data || []); // ensure .data exists
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || "Failed to load leads");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, [filter]);

    return (
        <ProtectedRoute>
            <RoleGuard allowedRole="admin">
                <div className="min-h-screen p-6 bg-gray-100">
                    <h1 className="text-3xl font-bold mb-6">All Leads</h1>

                    {/* Filter Buttons */}
                    <FilterButtons
                        options={["day", "week", "month"]}
                        selected={filter}
                        onChange={(f: FilterType) => setFilter(f)}
                        labels={{ day: "Today", week: "This Week", month: "This Month" }}
                    />

                    {/* Loading / Error */}
                    {loading && <p className="text-gray-600 mt-4">Loading leads...</p>}
                    {error && <p className="text-red-500 mt-4">{error}</p>}

                    {/* Lead List Component */}
                    {!loading && !error && leads.length > 0 && (
                        <LeadList leads={leads} refreshLeads={fetchLeads} role="admin" />
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
