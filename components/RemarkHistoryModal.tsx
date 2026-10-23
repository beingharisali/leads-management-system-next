"use client";

import { useEffect, useState } from "react";
import { FiMessageSquare, FiX } from "react-icons/fi";
import { getLeadRemarkHistory, RemarkEntry } from "@/services/lead.api";

interface RemarkHistoryModalProps {
    leadId: string;
    leadName: string;
    onClose: () => void;
}

const roleLabel = (role: string | null) =>
    role === "csr" ? "CSR" : role === "admin" ? "Admin" : role ? role.charAt(0).toUpperCase() + role.slice(1) : "";

const formatWhen = (at: string) =>
    new Date(at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });

// Every remark added on a lead, newest first, with who added it and when.
export default function RemarkHistoryModal({ leadId, leadName, onClose }: RemarkHistoryModalProps) {
    const [history, setHistory] = useState<RemarkEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;
        getLeadRemarkHistory(leadId)
            .then(h => { if (!cancelled) setHistory([...h].reverse()); })
            .catch(err => { if (!cancelled) setError(err.message || "Failed to load remarks"); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [leadId]);

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-[2rem] shadow-xl w-full max-w-lg p-6 max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2"><FiMessageSquare /> Remarks</h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">{leadName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 rounded-full"><FiX size={18} /></button>
                </div>

                <div className="overflow-y-auto -mx-2 px-2">
                    {loading && <p className="text-sm text-slate-400 py-6 text-center">Loading remarks...</p>}
                    {error && <p className="text-sm text-rose-600 py-6 text-center">{error}</p>}
                    {!loading && !error && history.length === 0 && (
                        <p className="text-sm text-slate-400 py-6 text-center">No remarks yet.</p>
                    )}
                    {!loading && !error && history.length > 0 && (
                        <ul className="space-y-3">
                            {history.map((r, i) => (
                                <li key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{r.text}</p>
                                    <p className="text-[11px] text-slate-400 font-semibold mt-1.5">
                                        {r.legacy
                                            ? "Earlier remark · time not recorded"
                                            : [
                                                r.byName ? `${r.byName}${r.byRole ? ` (${roleLabel(r.byRole)})` : ""}` : "System",
                                                r.at ? formatWhen(r.at) : null,
                                            ].filter(Boolean).join(" · ")}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
