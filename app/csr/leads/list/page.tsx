"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import FilterButtons from "@/components/buttons/FilterButtons";
import Pagination from "@/components/buttons/Pagination";
import { getLeadsByDateFiltered, Lead } from "@/services/lead.api";

// Lazy load LeadList to optimize bundle size
const LeadList = lazy(() => import("@/components/LeadList"));

type FilterType = "day" | "week" | "month";
const PAGE_SIZE = 20;

export default function LeadsListPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState<FilterType>("day");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Fetch leads based on selected filter (server-side filtered & paginated,
    // so we never pull the CSR's whole lead history just to show one page).
    const fetchLeads = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await getLeadsByDateFiltered(filter, { page, limit: PAGE_SIZE });
            setLeads(res.data);
            setTotalPages(res.totalPages);
        } catch (err: any) {
            console.error("Failed to fetch leads:", err);
            setError(err.response?.data?.message || err.message || "Failed to load leads");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter, page]);

    // Changing the filter should always jump back to page 1
    const handleFilterChange = (f: FilterType) => {
        setFilter(f);
        setPage(1);
    };

    return (
        <ProtectedRoute>
            <RoleGuard allowedRole="csr">
                <div className="min-h-screen p-6 bg-gray-100">
                    <h1 className="text-3xl font-bold mb-6">My Leads</h1>

                    {/* Filter Buttons */}
                    <FilterButtons
                        options={["day", "week", "month"]}
                        selected={filter}
                        onChange={handleFilterChange}
                        labels={{ day: "Today", week: "This Week", month: "This Month" }}
                    />

                    {/* Loading & Error */}
                    {loading && <p className="text-gray-600 mt-4">Loading leads...</p>}
                    {error && <p className="text-red-500 mt-4">{error}</p>}

                    {/* Lead List */}
                    {!loading && !error && leads.length > 0 && (
                        <>
                            <Suspense fallback={<p className="text-gray-600 mt-4">Loading table...</p>}>
                                <LeadList leads={leads} refreshLeads={fetchLeads} role="csr" />
                            </Suspense>
                            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                        </>
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
