"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { addLeadRemark } from "@/services/lead.api";
import RemarkHistoryModal from "@/components/RemarkHistoryModal";

interface LeadRemarkCellProps {
    lead: { _id: string; name: string; remarks?: string };
    // Called with the saved text so the table can show it as the latest remark
    onAdded: (remarks: string) => void;
}

// Remarks are add-only: the latest one is shown (click it for the full
// history with times), and the box below adds a new one.
export default function LeadRemarkCell({ lead, onAdded }: LeadRemarkCellProps) {
    const [showHistory, setShowHistory] = useState(false);
    const [saving, setSaving] = useState(false);

    const save = async (input: HTMLInputElement) => {
        const text = input.value.trim();
        if (!text || saving) return;
        setSaving(true);
        const tid = toast.loading("Adding remark...");
        try {
            await addLeadRemark(lead._id, text);
            input.value = "";
            onAdded(text);
            toast.success("Remark added", { id: tid });
        } catch (err: any) {
            toast.error(err?.message || "Failed to add remark", { id: tid });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-w-[160px]">
            {lead.remarks && (
                <button
                    type="button"
                    onClick={() => setShowHistory(true)}
                    title="See all remarks with their time"
                    className="block text-left text-sm text-slate-700 line-clamp-2 hover:text-blue-600 mb-1"
                >
                    {lead.remarks}
                </button>
            )}
            <input
                disabled={saving}
                onBlur={(e) => save(e.target)}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                className="bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-400 outline-none text-sm w-full disabled:opacity-50"
                placeholder={lead.remarks ? "Add another remark..." : "Add note..."}
            />
            {lead.remarks && (
                <button type="button" onClick={() => setShowHistory(true)} className="text-[10px] font-bold text-blue-600 hover:underline mt-1">
                    View all remarks
                </button>
            )}
            {showHistory && (
                <RemarkHistoryModal leadId={lead._id} leadName={lead.name} onClose={() => setShowHistory(false)} />
            )}
        </div>
    );
}
