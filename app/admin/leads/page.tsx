"use client";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import DataTable, { Column } from "@/components/tables/DataTable";
import Pagination from "@/components/buttons/Pagination";
import { getAllLeadsPaginated, Lead } from "@/services/lead.api";

const PAGE_SIZE = 20;

const columns: Column[] = [
    { key: "name", label: "Name" },
    { key: "course", label: "Course" },
    { key: "phone", label: "Phone" },
    {
        key: "assignedTo",
        label: "Assigned To",
        render: (row: Lead) => row.assignedTo?.name || "Unassigned",
    },
    { key: "status", label: "Status", align: "center" },
];

export default function AdminLeads() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        const fetchLeads = async () => {
            setLoading(true);
            try {
                const res = await getAllLeadsPaginated(page, PAGE_SIZE);
                setLeads(res.data);
                setTotalPages(res.totalPages);
                setTotalCount(res.totalCount);
            } finally {
                setLoading(false);
            }
        };
        fetchLeads();
    }, [page]);

    return (
        <ProtectedRoute role="admin">
            <div className="p-6">
                <h1 className="text-2xl font-bold mb-4">All Leads ({totalCount})</h1>
                {loading ? (
                    <p className="text-gray-600">Loading leads...</p>
                ) : (
                    <>
                        <DataTable columns={columns} data={leads} />
                        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
                    </>
                )}
            </div>
        </ProtectedRoute>
    );
}
