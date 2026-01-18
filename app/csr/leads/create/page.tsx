"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";
import { createLead } from "@/services/lead.api";

export default function CreateLeadPage() {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [course, setCourse] = useState("");
    const [source, setSource] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState<"success" | "error">("success");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            await createLead({ name, phone, course, source });
            setMessage("✅ Lead created successfully");
            setMessageType("success");

            // Reset form
            setName("");
            setPhone("");
            setCourse("");
            setSource("");
        } catch (err: any) {
            console.error(err);
            setMessage(err?.message || "❌ Failed to create lead");
            setMessageType("error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <ProtectedRoute>
            <RoleGuard allowedRole="csr">
                <div className="max-w-xl mx-auto mt-10 bg-white p-6 shadow rounded">
                    <h1 className="text-2xl font-bold mb-4">Create New Lead</h1>

                    {message && (
                        <p className={`mb-3 text-sm ${messageType === "success" ? "text-green-600" : "text-red-600"}`}>
                            {message}
                        </p>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3">
                        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full border p-2 rounded" required />
                        <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border p-2 rounded" required />
                        <input placeholder="Course" value={course} onChange={(e) => setCourse(e.target.value)} className="w-full border p-2 rounded" required />
                        <input placeholder="Source (optional)" value={source} onChange={(e) => setSource(e.target.value)} className="w-full border p-2 rounded" />

                        <button type="submit" disabled={loading} className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 transition-colors">
                            {loading ? "Saving..." : "Create Lead"}
                        </button>
                    </form>
                </div>
            </RoleGuard>
        </ProtectedRoute>
    );
}
