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
        <div className="bg-white rounded shadow p-4 space-y-3">
            <h3 className="text-lg font-semibold mb-2">CSRs</h3>

            <button
                onClick={() => onSelect(null)}
                className={`w-full text-left p-2 rounded ${selectedCSR === null ? "bg-blue-600 text-white" : "hover:bg-gray-100"
                    }`}
            >
                All CSRs
            </button>

            {csrs.map(csr => (
                <div
                    key={csr.csrId}
                    onClick={() => onSelect(csr.csrId)}
                    className={`cursor-pointer p-3 rounded border space-y-1 ${selectedCSR === csr.csrId
                            ? "bg-blue-600 text-white"
                            : "hover:bg-gray-100"
                        }`}
                >
                    <p className="font-medium">{csr.name}</p>
                    <p className="text-sm">
                        Leads: {csr.totalLeads}
                    </p>
                    <p className="text-sm">
                        Sales: {csr.totalSales}
                    </p>
                </div>
            ))}
        </div>
    );
}
