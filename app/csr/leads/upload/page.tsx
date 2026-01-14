// app/csr/leads/upload/page.tsx
"use client";

import { useState } from "react";
import http from "@/services/http";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";

export default function UploadLeadsPage() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            setMessage("Please select an Excel file to upload.");
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await http.post("/lead/upload-excel", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            setMessage(res.data?.msg || "Excel uploaded successfully ✅");
            setFile(null);
            // optionally refresh leads list after upload
        } catch (err: any) {
            console.error(err);
            setMessage(err?.response?.data?.msg || "Failed to upload Excel");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProtectedRoute>
            <RoleGuard allowedRole="csr">
                <div className="max-w-lg mx-auto mt-10 bg-white p-6 shadow rounded">
                    <h1 className="text-2xl font-bold mb-4 text-center">Upload Leads via Excel</h1>

                    {message && <p className="mb-3 text-sm">{message}</p>}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            className="w-full border p-2 rounded"
                            required
                        />

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-black text-white py-2 rounded hover:bg-gray-800"
                        >
                            {loading ? "Uploading..." : "Upload Excel"}
                        </button>
                    </form>
                </div>
            </RoleGuard>
        </ProtectedRoute>
    );
}
