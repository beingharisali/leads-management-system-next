"use client";

import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import FilterButtons from "@/components/buttons/FilterButtons";
import Pagination from "@/components/buttons/Pagination";
import { getLeadsByRole, Lead } from "@/services/lead.api";
import { getUserId } from "@/utils/decodeToken";
import { monthKeyOf, monthOptionsFrom, textOptionsFrom } from "@/utils/leadFilterOptions";

// Lazy load LeadList to optimize bundle size
const LeadList = lazy(() => import("@/components/LeadList"));

type FilterType = "day" | "week" | "month";
const PAGE_SIZE = 20;

const STATUS_OPTIONS = ["new", "not pick", "interested", "paid", "not interested", "busy", "wrong number"];

export default function LeadsListPage() {
    const [allLeads, setAllLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState<FilterType>("day");
    const [page, setPage] = useState(1);

    // Column header filters (checkbox multi-select, empty = no filter)
    const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
    const [selectedCities, setSelectedCities] = useState<string[]>([]);
    const [selectedSources, setSelectedSources] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);

    // Fetches this CSR's full lead list once; every filter below (due-date
    // window + the column filters) runs client-side against it, same as
    // the CSR Dashboard.
    const fetchLeads = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const userId = await getUserId();
            if (!userId) throw new Error("User session not found");
            const res = await getLeadsByRole("csr", undefined, userId);
            setAllLeads(Array.isArray(res) ? res : []);
        } catch (err: any) {
            console.error("Failed to fetch leads:", err);
            setError(err.response?.data?.message || err.message || "Failed to load leads");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    // Changing any filter should always jump back to page 1
    useEffect(() => {
        setPage(1);
    }, [filter, selectedMonths, selectedCities, selectedSources, selectedStatuses]);

    const handleFilterChange = (f: FilterType) => setFilter(f);

    const monthOptions = useMemo(() => monthOptionsFrom(allLeads.map(l => l.createdAt)), [allLeads]);
    const cityOptions = useMemo(() => textOptionsFrom(allLeads.map(l => l.city)), [allLeads]);
    const sourceOptions = useMemo(() => textOptionsFrom(allLeads.map(l => l.source)), [allLeads]);

    // Due-date window (day/week/month), inclusive of anything overdue - same
    // semantics as the CSR Dashboard's Today/Week/Month buttons, plus the
    // column filters on top.
    const filteredLeads = useMemo(() => {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const windowEnd = new Date(startOfDay);
        if (filter === "week") windowEnd.setDate(windowEnd.getDate() + 7);
        else if (filter === "month") windowEnd.setMonth(windowEnd.getMonth() + 1);
        windowEnd.setHours(23, 59, 59, 999);

        return allLeads.filter(l => {
            const dueDate = l.followUpDate ? new Date(l.followUpDate) : null;
            const matchesDue = !!dueDate && dueDate <= windowEnd;

            const matchesMonth =
                selectedMonths.length === 0 ||
                selectedMonths.includes(monthKeyOf(l.createdAt) || "");

            const matchesCity =
                selectedCities.length === 0 ||
                selectedCities.includes((l.city || "").trim().toLowerCase());

            const matchesSource =
                selectedSources.length === 0 ||
                selectedSources.includes((l.source || "").trim().toLowerCase());

            const matchesStatus =
                selectedStatuses.length === 0 ||
                selectedStatuses.includes((l.status || "").toLowerCase());

            return matchesDue && matchesMonth && matchesCity && matchesSource && matchesStatus;
        });
    }, [allLeads, filter, selectedMonths, selectedCities, selectedSources, selectedStatuses]);

    const totalPages = Math.max(Math.ceil(filteredLeads.length / PAGE_SIZE), 1);
    const paginatedLeads = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filteredLeads.slice(start, start + PAGE_SIZE);
    }, [filteredLeads, page]);

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
                    {!loading && !error && filteredLeads.length > 0 && (
                        <>
                            <Suspense fallback={<p className="text-gray-600 mt-4">Loading table...</p>}>
                                <LeadList
                                    leads={paginatedLeads}
                                    refreshLeads={fetchLeads}
                                    role="csr"
                                    monthOptions={monthOptions}
                                    cityOptions={cityOptions}
                                    sourceOptions={sourceOptions}
                                    statusOptions={STATUS_OPTIONS}
                                    selectedMonths={selectedMonths}
                                    selectedCities={selectedCities}
                                    selectedSources={selectedSources}
                                    selectedStatuses={selectedStatuses}
                                    onMonthsChange={setSelectedMonths}
                                    onCitiesChange={setSelectedCities}
                                    onSourcesChange={setSelectedSources}
                                    onStatusesChange={setSelectedStatuses}
                                />
                            </Suspense>
                            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                        </>
                    )}

                    {/* No leads */}
                    {!loading && !error && filteredLeads.length === 0 && (
                        <p className="text-gray-600 mt-4">No leads found for this filter.</p>
                    )}
                </div>
            </RoleGuard>
        </ProtectedRoute>
    );
}
