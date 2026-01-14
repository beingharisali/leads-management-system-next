// components/LeadList.tsx
"use client";
import { useState } from "react";
import ConvertLeadModal from "./ConvertLeadModel";

interface Lead {
    _id: string;
    name: string;
    email: string;
    status: string;
}

interface LeadListProps {
    leads: Lead[];
    refreshLeads: () => void;
}

export default function LeadList({ leads, refreshLeads }: LeadListProps) {
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

    return (
        <div>
            <h2>Lead List</h2>
            <table className="lead-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {leads.map((lead) => (
                        <tr key={lead._id}>
                            <td>{lead.name}</td>
                            <td>{lead.email}</td>
                            <td>{lead.status}</td>
                            <td>
                                {lead.status !== "converted" ? (
                                    <button onClick={() => setSelectedLead(lead)} className="convert-btn">Convert to Sale</button>
                                ) : (
                                    <span>Converted</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {selectedLead && (
                <ConvertLeadModal
                    leadId={selectedLead._id}
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
