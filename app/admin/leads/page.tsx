"use client";
import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getAdminStats } from "@/services/dashboard.api";

export default function AdminLeads() {
    const [leads, setLeads] = useState<any[]>([]);

    useEffect(() => {
        getAdminStats()
            .then((res) => setLeads(res.leads || []))
            .catch(console.log);
    }, []);

    return (
        <ProtectedRoute role="admin">
            <h1>All Leads</h1>
            <ul>
                {leads.map((lead) => (
                    <li key={lead._id}>
                        {lead.name} - {lead.course} - {lead.phone} - Assigned to {lead.assignedTo?.name || "Unassigned"}
                    </li>
                ))}
            </ul>
        </ProtectedRoute>
    );
}
