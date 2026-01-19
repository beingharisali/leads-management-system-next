"use client";

interface Lead {
    _id: string;
    name: string;
    phone: string;
    course: string;
    status?: string;
    assignedTo?: { _id: string; name: string } | null;
}

interface Props {
    leads: Lead[];
    selectedCSR: string | null;
    onConvertToSale: (id: string) => void;
    onDeleteLead: (id: string) => void;
}

export default function CSRLeadsPanel({
    leads,
    selectedCSR,
    onConvertToSale,
    onDeleteLead,
}: Props) {

    const filteredLeads = selectedCSR
        ? leads.filter(
            lead => lead.assignedTo?._id === selectedCSR
        )
        : leads;

    return (
        <div className="bg-white rounded shadow p-4">
            <h3 className="text-lg font-semibold mb-4">
                {selectedCSR ? "CSR Leads" : "All Leads"}
            </h3>

            {filteredLeads.length === 0 ? (
                <p className="text-gray-500">No leads found</p>
            ) : (
                <table className="w-full border">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-2 border">Name</th>
                            <th className="p-2 border">Phone</th>
                            <th className="p-2 border">Course</th>
                            <th className="p-2 border">CSR</th>
                            <th className="p-2 border">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLeads.map(lead => (
                            <tr key={lead._id} className="text-center">
                                <td className="border p-2">{lead.name}</td>
                                <td className="border p-2">{lead.phone}</td>
                                <td className="border p-2">{lead.course}</td>
                                <td className="border p-2">
                                    {lead.assignedTo?.name || "—"}
                                </td>
                                <td className="border p-2 space-x-2">
                                    <button
                                        onClick={() => onConvertToSale(lead._id)}
                                        className="bg-green-600 text-white px-2 py-1 rounded"
                                    >
                                        Convert
                                    </button>
                                    <button
                                        onClick={() => onDeleteLead(lead._id)}
                                        className="bg-red-600 text-white px-2 py-1 rounded"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
