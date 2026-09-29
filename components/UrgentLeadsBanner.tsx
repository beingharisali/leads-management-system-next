"use client";

import { FiAlertTriangle } from "react-icons/fi";

interface UrgentLeadLike {
    _id: string;
    name: string;
    phone: string;
    course?: string;
}

// Red strip above the lead table listing every urgent lead. Clicking one
// jumps to it in the table (the page decides how, via onSelect).
export default function UrgentLeadsBanner({
    leads,
    onSelect,
    agentName,
}: {
    leads: UrgentLeadLike[];
    onSelect: (lead: UrgentLeadLike) => void;
    agentName?: string; // set on the admin's view of a CSR
}) {
    if (leads.length === 0) return null;

    const title = agentName
        ? `${agentName} has ${leads.length} urgent lead${leads.length > 1 ? "s" : ""}`
        : `You have ${leads.length} urgent lead${leads.length > 1 ? "s" : ""} - contact ${leads.length > 1 ? "them" : "it"} immediately`;

    return (
        <div className="mt-6 bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-3 shrink-0">
                <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white">
                    <FiAlertTriangle size={18} />
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-rose-400 animate-ping" />
                </span>
                <p className="font-black text-rose-700 text-sm">{title}</p>
            </div>
            <div className="flex flex-wrap gap-2 md:ml-2">
                {leads.map(l => (
                    <button
                        key={l._id}
                        onClick={() => onSelect(l)}
                        title="Show this lead in the table"
                        className="px-3 py-1.5 bg-white border border-rose-200 rounded-xl text-xs font-bold text-slate-700 hover:border-rose-400 hover:bg-rose-100 transition-colors"
                    >
                        {l.name} <span className="text-blue-600">· {l.phone}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
