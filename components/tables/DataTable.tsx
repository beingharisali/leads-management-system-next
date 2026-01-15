"use client";

import React from "react";

export interface Column {
    key: string;
    label: string;
    align?: "left" | "center";
    render?: (row: any) => React.ReactNode;
}

interface DataTableProps {
    columns: Column[];
    data: any[];
}

const DataTable: React.FC<DataTableProps> = ({ columns, data }) => {
    if (!data || data.length === 0) {
        return <p className="text-gray-600">No data found.</p>;
    }

    return (
        <div className="overflow-x-auto bg-white shadow rounded">
            <table className="min-w-full">
                <thead className="bg-gray-100">
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={`p-3 border text-${col.align || "left"}`}
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>

                <tbody>
                    {data.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50 text-center">
                            {columns.map((col) => (
                                <td key={col.key} className={`p-3 border text-${col.align || "left"}`}>
                                    {col.render ? col.render(row) : row[col.key] ?? "-"}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default DataTable;