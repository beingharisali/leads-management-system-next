"use client";
import { useState } from "react";
import ConvertLeadModal from "./ConvertLeadModel";
import axios from "@/services/axios";

export interface Lead {
    id: string;
    name: string;
    phone: string;
    course: string;
    source?: string;
    status: string;
    createdAt: string;
}

interface LeadListProps {
    leads: Lead[];
    refreshLeads: () => void;
    role: "csr" | "admin"; // new prop
}

export default function LeadList({ leads, refreshLeads, role }: LeadListProps) {
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this lead?")) return;
        try {
            const token = localStorage.getItem("token");
            await axios.delete(`/api/v1/lead/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            refreshLeads();
        } catch (err: any) {
            console.error(err);
            alert(err?.response?.data?.msg || "Failed to delete lead");
        }
    };

    if (!leads || leads.length === 0) {
        return <p className="text-gray-600">No leads found.</p>;
    }

    return (
        <div className="overflow-x-auto bg-white shadow rounded">
            <table className="min-w-full">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="p-3 border text-left">Name</th>
                        <th className="p-3 border text-left">Phone</th>
                        <th className="p-3 border text-left">Course</th>
                        <th className="p-3 border text-left">Source</th>
                        <th className="p-3 border text-center">Status</th>
                        <th className="p-3 border text-center">Created</th>
                        <th className="p-3 border text-center">Action</th>
                    </tr>
                </thead>

                <tbody>
                    {leads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-gray-50 text-center">
                            <td className="p-3 border text-left">{lead.name}</td>
                            <td className="p-3 border text-left">{lead.phone}</td>
                            <td className="p-3 border text-left">{lead.course}</td>
                            <td className="p-3 border text-left">{lead.source || "-"}</td>

                            <td className="p-3 border">
                                <span
                                    className={`px-2 py-1 rounded text-sm font-medium ${lead.status === "converted"
                                            ? "bg-green-100 text-green-700"
                                            : "bg-blue-100 text-blue-700"
                                        }`}
                                >
                                    {lead.status}
                                </span>
                            </td>

                            <td className="p-3 border">
                                {new Date(lead.createdAt).toLocaleDateString()}
                            </td>

                            <td className="p-3 border text-center flex justify-center gap-2">
                                {role === "admin" && (
                                    <>
                                        <button
                                            onClick={() => alert("Edit lead feature")}
                                            className="text-yellow-600 hover:underline font-medium"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(lead.id)}
                                            className="text-red-600 hover:underline font-medium"
                                        >
                                            Delete
                                        </button>
                                    </>
                                )}

                                {lead.status !== "converted" && (
                                    <button
                                        onClick={() => setSelectedLead(lead)}
                                        className="text-blue-600 hover:underline font-medium"
                                    >
                                        Convert to Sale
                                    </button>
                                )}

                                {lead.status === "converted" && role !== "admin" && (
                                    <span className="text-green-600 font-semibold">Converted</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {selectedLead && (
                <ConvertLeadModal
                    leadId={selectedLead.id}
                    onClose={() => setSelectedLead(null)}
                    onSuccess={() => {
                        refreshLeads();
                        setSelectedLead(null);
                    }}
                />
            )}
        </div>
    );
}
