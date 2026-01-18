"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import { uploadExcelLeads, getMyLeads } from "@/services/lead.api";

export default function UploadLeadsPage() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState<"success" | "error">("success");

    const handleUpload = async () => {
        if (!file) {
            setMessageType("error");
            return setMessage("❌ Please select a file");
        }

        setLoading(true);
        setMessage("");

        try {
            await uploadExcelLeads(file);
            setMessageType("success");
            setMessage("✅ Excel uploaded successfully");

            // Refresh CSR leads if needed
            await getMyLeads(); // optionally update state if passing to dashboard
        } catch (err: any) {
            console.error(err);
            setMessageType("error");
            setMessage(err?.message || "❌ Failed to upload Excel");
        } finally {
            setLoading(false);
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
                </div>
            </RoleGuard>
        </ProtectedRoute>
    );
}
