"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiPhoneCall, FiSmartphone, FiEdit2, FiCheck, FiX } from "react-icons/fi";
import { getAgent, updateAgentPhones } from "@/services/auth.api";

type PhoneField = "officialPhone" | "personalPhone";

const FIELDS: { key: PhoneField; label: string; icon: React.ReactNode; accent: string }[] = [
    { key: "officialPhone", label: "Official / Allotted number", icon: <FiPhoneCall size={18} />, accent: "bg-emerald-50 text-emerald-600" },
    { key: "personalPhone", label: "Personal number", icon: <FiSmartphone size={18} />, accent: "bg-slate-100 text-slate-500" },
];

// Admin-only: the CSR's allotted company number (and personal number),
// each editable in place so the admin can re-allot a number any time.
export default function AgentNumbersCard({ csrId }: { csrId: string }) {
    const [numbers, setNumbers] = useState<Record<PhoneField, string>>({ officialPhone: "", personalPhone: "" });
    const [loaded, setLoaded] = useState(false);
    const [editing, setEditing] = useState<PhoneField | null>(null);
    const [draft, setDraft] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getAgent(csrId)
            .then(agent => setNumbers({ officialPhone: agent.officialPhone || "", personalPhone: agent.personalPhone || "" }))
            .catch(() => toast.error("Failed to load agent's numbers"))
            .finally(() => setLoaded(true));
    }, [csrId]);

    const startEdit = (field: PhoneField) => {
        setEditing(field);
        setDraft(numbers[field]);
    };

    const save = async () => {
        if (!editing) return;
        const value = draft.trim();
        if (!value) return toast.error("Number cannot be empty");
        if (value === numbers[editing]) return setEditing(null);

        setSaving(true);
        const tid = toast.loading("Saving number...");
        try {
            const agent = await updateAgentPhones(csrId, { [editing]: value });
            setNumbers({ officialPhone: agent.officialPhone || "", personalPhone: agent.personalPhone || "" });
            setEditing(null);
            toast.success("Number updated", { id: tid });
        } catch (err: any) {
            toast.error(err.message || "Failed to update number", { id: tid });
        } finally {
            setSaving(false);
        }
    };

    if (!loaded) return null;

    return (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {FIELDS.map(({ key, label, icon, accent }) => (
                <div key={key} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
                    <div className={`p-3 rounded-2xl ${accent}`}>{icon}</div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
                        {editing === key ? (
                            <input
                                autoFocus
                                type="tel"
                                value={draft}
                                disabled={saving}
                                onChange={e => setDraft(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter") save();
                                    if (e.key === "Escape") setEditing(null);
                                }}
                                className="mt-1 w-full max-w-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-lg font-black text-slate-900 tabular-nums outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        ) : (
                            <p className={`text-xl font-black tabular-nums truncate ${numbers[key] ? "text-slate-900" : "text-slate-300"}`}>
                                {numbers[key] || "Not set"}
                            </p>
                        )}
                    </div>
                    {editing === key ? (
                        <div className="flex items-center gap-1.5">
                            <button onClick={save} disabled={saving} title="Save" className="p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                                <FiCheck size={16} />
                            </button>
                            <button onClick={() => setEditing(null)} disabled={saving} title="Cancel" className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200">
                                <FiX size={16} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => startEdit(key)}
                            disabled={editing !== null}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-40"
                        >
                            <FiEdit2 size={12} /> {key === "officialPhone" ? "Re-allot" : "Edit"}
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
