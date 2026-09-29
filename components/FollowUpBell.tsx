"use client";

import { useState } from "react";
import { FiBell } from "react-icons/fi";

export interface DueFollowUp {
    _id: string;
    name: string;
    phone: string;
    course?: string;
    followUpDate?: string;
    isOverdue: boolean;
}

// Bell + dropdown of Interested leads whose follow-up is due today or
// overdue. Shared by the CSR dashboard and the admin's view of a CSR.
export default function FollowUpBell({
    dueFollowUps,
    onSelect,
}: {
    dueFollowUps: DueFollowUp[];
    onSelect: (lead: DueFollowUp) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(o => !o)}
                title="Follow-up reminders"
                className="relative p-3 bg-white text-slate-700 rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all"
            >
                <FiBell size={20} />
                {dueFollowUps.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 flex items-center justify-center bg-rose-500 text-white text-[10px] font-black rounded-full">
                        {dueFollowUps.length}
                    </span>
                )}
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100">
                            <p className="text-sm font-black text-slate-800">Follow-ups due</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Interested leads scheduled for today</p>
                        </div>
                        <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                            {dueFollowUps.length === 0 ? (
                                <p className="px-4 py-8 text-center text-xs text-slate-400">No follow-ups due today.</p>
                            ) : dueFollowUps.map(l => (
                                <button
                                    key={l._id}
                                    onClick={() => { onSelect(l); setIsOpen(false); }}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-bold text-sm text-slate-800 truncate">{l.name}</span>
                                        <span className={`shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${l.isOverdue ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'}`}>
                                            {l.isOverdue ? `Overdue · ${new Date(l.followUpDate!).toLocaleDateString('en-GB')}` : 'Today'}
                                        </span>
                                    </div>
                                    <div className="text-xs text-blue-600 font-semibold">{l.phone}</div>
                                    {l.course && <div className="text-[10px] text-slate-400 truncate">{l.course}</div>}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
