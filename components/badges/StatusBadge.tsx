"use client";

interface StatusBadgeProps {
    status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
    let bgColor = "";
    let textColor = "";

    switch (status.toLowerCase()) {
        case "converted":
            bgColor = "bg-green-100";
            textColor = "text-green-700";
            break;
        case "new":
            bgColor = "bg-blue-100";
            textColor = "text-blue-700";
            break;
        case "pending":
            bgColor = "bg-yellow-100";
            textColor = "text-yellow-700";
            break;
        default:
            bgColor = "bg-gray-100";
            textColor = "text-gray-700";
    }

    return (
        <span className={`px-2 py-1 rounded text-sm font-medium ${bgColor} ${textColor}`}>
            {status}
        </span>
    );
}
