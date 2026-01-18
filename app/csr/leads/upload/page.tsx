"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import { uploadExcelLeads, getLeadsByRole, Lead } from "@/services/lead.api"; // ✅ Lead type import
import { getUserRole, getUserId } from "@/utils/decodeToken";

export default function UploadLeadsPage() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState<"success" | "error">("success");
    const [leads, setLeads] = useState<Lead[]>([]); // ✅ typed array
    const [role, setRole] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserData = async () => {
            const fetchedRole = await getUserRole();
            const fetchedUserId = await getUserId();
            setRole(fetchedRole);
            setUserId(fetchedUserId);
        };
        fetchUserData();
    }, []);

    const handleUpload = async () => {
        if (!file) {
            setMessageType("error");
            setMessage("❌ Please select a file");
            return;
        }

        if (!role) {
            setMessageType("error");
            setMessage("❌ User role not found");
            return;
        }

        if (!userId) {
            setMessageType("error");
            setMessage("❌ User ID not found");
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            // Upload Excel
            await uploadExcelLeads(file);
            setMessageType("success");
            setMessage("✅ Excel uploaded successfully");

            // Refresh CSR leads (TypeScript-safe)
            if (role === "csr") {
                const refreshedLeads: Lead[] = await getLeadsByRole(role, userId || undefined);
                setLeads(refreshedLeads ?? []);
            }
        } catch (err: any) {
            console.error(err);
            setMessageType("error");
            setMessage(err?.message || "❌ Failed to upload Excel");
        } finally {
            setLoading(false);
            setFile(null); // reset file input
        }
    };

    return (
        <ProtectedRoute role="csr">
            <RoleGuard allowedRole="csr">
                <div className="max-w-xl mx-auto mt-10 bg-white p-6 shadow rounded space-y-4">
                    <h1 className="text-2xl font-bold">Upload Excel Leads</h1>

                    {message && (
                        <p className={`text-sm ${messageType === "success" ? "text-green-600" : "text-red-600"}`}>
                            {message}
                        </p>
                    )}

                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => e.target.files && setFile(e.target.files[0])}
                        className="border p-2 rounded w-full"
                    />

                    <button
                        onClick={handleUpload}
                        disabled={loading}
                        className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors"
                    >
                        {loading ? "Uploading..." : "Upload"}
                    </button>

                    {/* Display refreshed leads */}
                    {leads.length > 0 && (
                        <div className="mt-6">
                            <h2 className="font-semibold mb-2">Refreshed Leads:</h2>
                            <ul className="list-disc pl-5">
                                {leads.map((lead) => (
                                    <li key={lead._id}>
                                        {lead.name} - {lead.course} - {lead.phone}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </RoleGuard>
        </ProtectedRoute>
    );
}
