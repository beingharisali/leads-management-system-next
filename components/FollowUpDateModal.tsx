"use client";

import { useState } from "react";
import { FiCalendar, FiX } from "react-icons/fi";
import { localDateKey } from "@/utils/leadStatus";

interface FollowUpDateModalProps {
    leadName: string;
    onCancel: () => void;
    // Local midnight of the picked day, as an ISO string
    onConfirm: (followUpDate: string) => void;
}

// Shown when a lead is switched to Follow Up: the status is only saved
// once a date is picked, so every Follow Up lead has its reminder day.
export default function FollowUpDateModal({ leadName, onCancel, onConfirm }: FollowUpDateModalProps) {
    const [date, setDate] = useState("");

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onCancel}>
            <div className="bg-white rounded-[2rem] shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2"><FiCalendar /> Follow-up date</h2>
                        <p className="text-sm text-slate-500 font-medium mt-1">When should you follow up with <span className="font-bold text-slate-700">{leadName}</span>?</p>
                    </div>
                    <button onClick={onCancel} className="p-2 text-slate-400 hover:text-rose-500 rounded-full"><FiX size={18} /></button>
                </div>

                <input
                    type="date"
                    autoFocus
                    min={localDateKey(new Date())}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-slate-400 mt-2">You&apos;ll get a reminder for this lead on that day.</p>

                <div className="flex justify-end gap-2 mt-6">
                    <button onClick={onCancel} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button>
                    <button
                        disabled={!date}
                        // Local midnight, so the reminder fires on the picked day in the CSR's timezone
                        onClick={() => onConfirm(new Date(`${date}T00:00:00`).toISOString())}
                        className="px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Set Follow Up
                    </button>
                </div>
            </div>
        </div>
    );
}
