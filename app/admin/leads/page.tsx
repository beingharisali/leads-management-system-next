"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import LeadList, { Lead } from "@/components/LeadList";
import axios from "@/services/axios";

export default function AdminLeadsPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchLeads = async () => {
        setLoading(true);
        setError("");
        try {
            const token = localStorage.getItem("token");
            const res = await axios.get("/api/v1/admin/all-leads", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setLeads(res.data.data || []);
        } catch (err: any) {
            console.error(err);
            setError("Failed to load leads");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeads();
    }, []);

    return (
        <ProtectedRoute>
            <RoleGuard allowedRole="admin">
                <div className="min-h-screen p-6 bg-gray-100">
                    <h1 className="text-3xl font-bold mb-6">All Leads</h1>

                    {loading && <p className="text-gray-600">Loading leads...</p>}
                    {error && <p className="text-red-500">{error}</p>}

                    {!loading && !error && (
                        <LeadList leads={leads} refreshLeads={fetchLeads} role="admin" />
                    )}
                </div>
            </RoleGuard>
        </ProtectedRoute>
    );
}
