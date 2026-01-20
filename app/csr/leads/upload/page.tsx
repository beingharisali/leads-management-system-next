"use client";

import { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import { uploadExcelLeads, getLeadsByRole, Lead } from "@/services/lead.api";
import { getUserRole, getUserId } from "@/utils/decodeToken";
import toast, { Toaster } from "react-hot-toast";

export default function UploadLeadsPage() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState<"success" | "error">("success");
    const [leads, setLeads] = useState<Lead[]>([]);
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

        if (!role || !userId) {
            setMessageType("error");
            setMessage("❌ Authentication failed. Please log in again.");
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            // ✅ FIX: Passed both 'file' and 'userId' to satisfy the 2-argument requirement
            await uploadExcelLeads(file, userId);

            setMessageType("success");
            setMessage("✅ Excel uploaded successfully");
            toast.success("Leads imported!");

            // Refresh Leads list
            if (role === "csr") {
                const refreshedLeads = await getLeadsByRole(role, userId);
                setLeads((refreshedLeads as Lead[]) ?? []);
            }
        } catch (err: any) {
            console.error(err);
            setMessageType("error");
            setMessage(err?.response?.data?.message || err?.message || "❌ Failed to upload Excel");
            toast.error("Upload failed");
        } finally {
            setLoading(false);
            setFile(null);
            // Reset file input value manually if needed
            const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
            if (fileInput) fileInput.value = "";
        }
    };

    return (
        <ProtectedRoute role="csr">
            <RoleGuard allowedRole="csr">
                <Toaster position="top-right" />
                <div className="max-w-xl mx-auto mt-10 bg-white p-8 shadow-xl rounded-[2rem] space-y-6 border border-slate-100">
                    <div>
                        <h1 className="text-3xl font-black text-slate-800">Upload Leads</h1>
                        <p className="text-slate-500">Select an Excel file (.xlsx) to import leads</p>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-xl text-sm font-bold ${messageType === "success" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                            {message}
                        </div>
                    )}

                    <div className="space-y-4">
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={(e) => e.target.files && setFile(e.target.files[0])}
                            className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-3 file:px-6
                                file:rounded-xl file:border-0
                                file:text-sm file:font-bold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100 transition-all cursor-pointer border-2 border-dashed border-slate-200 p-4 rounded-2xl"
                        />

                        <button
                            onClick={handleUpload}
                            disabled={loading || !file}
                            className={`w-full py-4 px-4 rounded-2xl font-black transition-all shadow-lg ${loading || !file
                                    ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                    : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200"
                                }`}
                        >
                            {loading ? "Uploading Data..." : "Start Import"}
                        </button>
                    </div>

                    {/* Leads List Preview */}
                    {leads.length > 0 && (
                        <div className="mt-8 border-t pt-6">
                            <h2 className="font-black text-slate-700 mb-4 uppercase text-xs tracking-widest">Recently Added Leads</h2>
                            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                {leads.slice(0, 10).map((lead) => (
                                    <div key={lead._id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{lead.name}</p>
                                            <p className="text-xs text-slate-500">{lead.course}</p>
                                        </div>
                                        <p className="text-xs font-mono font-bold text-blue-600">{lead.phone}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </RoleGuard>
        </ProtectedRoute>
    );
}