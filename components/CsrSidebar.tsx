"use client";

interface CSR {
    csrId: string;
    name: string;
    totalLeads: number;
    totalSales: number;
    conversionRate: string;
}

interface Props {
    csrs: CSR[];
    selectedCSR: string | null;
    onSelect: (csrId: string | null) => void;
}

export default function CSRSidebar({ csrs, selectedCSR, onSelect }: Props) {
    return (
        <div className="bg-white rounded-xl shadow-md p-4 flex flex-col h-full w-full max-w-xs">
            <h3 className="text-xl font-semibold mb-4 border-b pb-2">CSRs</h3>

            <button
                onClick={() => onSelect(null)}
                className={`w-full text-left px-4 py-2 mb-2 rounded-lg font-medium transition ${selectedCSR === null
                    ? "bg-blue-600 text-white shadow"
                    : "hover:bg-gray-100"
                    }`}
            >
                All CSRs
            </button>

            {/* Scrollable area */}
            <div className="flex-1 overflow-auto space-y-2 pr-1">
                {csrs.map(csr => (
                    <div
                        key={csr.csrId}
                        onClick={() => onSelect(csr.csrId)}
                        className={`cursor-pointer p-3 rounded-lg border border-gray-200 flex flex-col justify-between transition hover:shadow-md ${selectedCSR === csr.csrId
                            ? "bg-blue-600 text-white border-blue-500 shadow"
                            : "bg-white"
                            }`}
                    >
                        <p className="font-semibold text-md">{csr.name}</p>
                        <div className="flex justify-between text-sm mt-1 overflow-x-auto">
                            <span className="mr-4">Leads: {csr.totalLeads}</span>
                            <span className="mr-4">Sales: {csr.totalSales}</span>
                            <span className="mr-4">Conversion: {csr.conversionRate}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

