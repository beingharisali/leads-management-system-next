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
        <div className="bg-white rounded-xl shadow-md p-4 flex flex-col h-full">
            <h3 className="text-xl font-semibold mb-4 border-b pb-2">
                {selectedCSR ? "CSR Leads" : "All Leads"}
            </h3>

            {filteredLeads.length === 0 ? (
                <p className="text-gray-500 mt-6 text-center">No leads found</p>
            ) : (
                <div className="overflow-auto max-h-[600px]">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Name</th>
                                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Phone</th>
                                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">Course</th>
                                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">CSR</th>
                                <th className="px-4 py-2 text-center text-sm font-semibold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredLeads.map((lead, idx) => (
                                <tr
                                    key={lead._id}
                                    className={`transition hover:bg-gray-50 ${idx % 2 === 0 ? "bg-gray-50" : "bg-white"}`}
                                >
                                    <td className="px-4 py-2 text-gray-800">{lead.name}</td>
                                    <td className="px-4 py-2 text-gray-800">{lead.phone}</td>
                                    <td className="px-4 py-2 text-gray-800">{lead.course}</td>
                                    <td className="px-4 py-2 text-gray-800">{lead.assignedTo?.name || "—"}</td>
                                    <td className="px-4 py-2 flex justify-center gap-2">
                                        <button
                                            onClick={() => onConvertToSale(lead._id)}
                                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg transition font-medium"
                                        >
                                            Convert
                                        </button>
                                        <button
                                            onClick={() => onDeleteLead(lead._id)}
                                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg transition font-medium"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
