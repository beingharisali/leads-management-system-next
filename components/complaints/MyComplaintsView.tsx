"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiImage, FiMessageSquare, FiPlus, FiSend, FiTrash2, FiUser, FiX } from "react-icons/fi";
import {
    CATEGORY_LABELS,
    ComplaintCategory,
    ComplaintMember,
    ComplaintMeta,
    createComplaint,
    deleteMyComplaint,
    getComplaintMembers,
    getComplaintMeta,
    getMyComplaints,
    MyComplaint,
} from "@/services/complaint.api";
import { formatDateTime } from "@/utils/taskFormat";
import Loading from "@/components/Loading";

const inputClass = "w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-slate-700";
const labelClass = "block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1";
const roleLabel = (role: string) => (role === "csr" ? "CSR" : role === "staff" ? "Staff" : "");

// A team member's complaints to the admin: send a new one (optionally naming
// another team member) and see the admin's reply. A complaint can be deleted
// until the admin replies. The person named is never shown it.
export default function MyComplaintsView() {
    const [items, setItems] = useState<MyComplaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    const load = useCallback(
        () =>
            getMyComplaints()
                .then(setItems)
                .catch((err: Error) => { toast.error(err.message); })
                .finally(() => setLoading(false)),
        []
    );

    useEffect(() => { load(); }, [load]);

    const remove = async (c: MyComplaint) => {
        if (!window.confirm(`Delete your complaint "${c.subject}"? This can't be undone.`)) return;
        try {
            await deleteMyComplaint(c._id);
            setItems((prev) => prev.filter((i) => i._id !== c._id));
            toast.success("Complaint deleted");
        } catch (err) {
            toast.error((err as Error).message);
            load();
        }
    };

    if (loading) return <Loading />;

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-black text-slate-800">My Complaints</h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        Only the admin sees your complaints. The person you name is never shown it.
                    </p>
                </div>
                <button
                    onClick={() => setCreating(true)}
                    className="px-5 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700"
                >
                    <FiPlus /> New Complaint
                </button>
            </div>

            {items.length === 0 ? (
                <div className="bg-white p-12 rounded-[2rem] border border-slate-100 text-center">
                    <FiMessageSquare className="mx-auto text-3xl text-slate-300" />
                    <p className="text-slate-400 font-bold text-sm mt-3">You haven&apos;t sent any complaints</p>
                </div>
            ) : (
                items.map((c) => (
                    <div key={c._id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-indigo-50 text-indigo-600">
                                        {CATEGORY_LABELS[c.category] || c.category}
                                    </span>
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${c.replied ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-700"}`}>
                                        {c.replied ? "Replied" : "Waiting for reply"}
                                    </span>
                                </div>
                                <h3 className="text-base font-black text-slate-800 mt-2 break-words">{c.subject}</h3>
                                <p className="text-[11px] text-slate-400 font-bold mt-1">
                                    Sent {formatDateTime(c.createdAt)}
                                    {c.againstName && <> · About <span className="text-slate-600">{c.againstName}</span> ({roleLabel(c.againstRole)})</>}
                                </p>
                            </div>
                            {!c.replied && (
                                <button
                                    onClick={() => remove(c)}
                                    title="Delete complaint"
                                    className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                                >
                                    <FiTrash2 />
                                </button>
                            )}
                        </div>

                        <p className="text-sm text-slate-600 whitespace-pre-wrap break-words">{c.description}</p>
                        <PhotoStrip photos={c.photos} />

                        {c.replied && (
                            <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4">
                                <p className="text-[10px] font-black uppercase text-emerald-600">
                                    Admin&apos;s reply{c.repliedAt ? ` · ${formatDateTime(c.repliedAt)}` : ""}
                                </p>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap break-words mt-1.5">{c.reply}</p>
                            </div>
                        )}
                    </div>
                ))
            )}

            {creating && (
                <ComplaintFormModal
                    onClose={() => setCreating(false)}
                    onCreated={(c) => {
                        setItems((prev) => [c, ...prev]);
                        setCreating(false);
                    }}
                />
            )}
        </div>
    );
}

export function PhotoStrip({ photos }: { photos: { _id: string; name: string; url: string }[] }) {
    if (!photos?.length) return null;
    return (
        <div className="flex flex-wrap gap-3">
            {photos.map((p) => (
                <a key={p._id} href={p.url} target="_blank" rel="noopener noreferrer" title={p.name} className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.name} className="h-24 w-24 object-cover rounded-2xl border border-slate-100 hover:opacity-90" />
                </a>
            ))}
        </div>
    );
}

function ComplaintFormModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: MyComplaint) => void }) {
    const [meta, setMeta] = useState<ComplaintMeta | null>(null);
    const [members, setMembers] = useState<ComplaintMember[]>([]);
    const [subject, setSubject] = useState("");
    const [category, setCategory] = useState<ComplaintCategory | "">("");
    const [description, setDescription] = useState("");
    const [against, setAgainst] = useState("");
    const [photos, setPhotos] = useState<File[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getComplaintMeta().then(setMeta).catch((err: Error) => { toast.error(err.message); });
        getComplaintMembers().then(setMembers).catch((err: Error) => { toast.error(err.message); });
    }, []);

    const maxPhotos = meta?.maxPhotos || 3;

    const addPhotos = (list: FileList | null) => {
        const picked = Array.from(list || []);
        const next = [...photos, ...picked];
        if (next.length > maxPhotos) toast.error(`You can attach up to ${maxPhotos} photos.`);
        setPhotos(next.slice(0, maxPhotos));
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim()) return toast.error("Please add a subject.");
        if (!category) return toast.error("Please choose a category.");
        if (!description.trim()) return toast.error("Please describe the complaint.");

        setSaving(true);
        try {
            const created = await createComplaint({ subject: subject.trim(), category, description: description.trim(), against: against || undefined, photos });
            toast.success("Complaint sent to the admin");
            onCreated(created);
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={onClose}>
            <form
                onSubmit={submit}
                onMouseDown={(e) => e.stopPropagation()}
                className="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-[2rem] shadow-2xl p-7 space-y-5"
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-slate-800">New Complaint</h2>
                    <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700"><FiX size={20} /></button>
                </div>

                <div>
                    <label className={labelClass}>Subject</label>
                    <input className={inputClass} value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} placeholder="Short title" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Category</label>
                        <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as ComplaintCategory)}>
                            <option value="">Choose a category</option>
                            {(meta?.categories || []).map((c) => (
                                <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}><FiUser className="inline -mt-0.5" /> Complaining about (optional)</label>
                        <select className={inputClass} value={against} onChange={(e) => setAgainst(e.target.value)}>
                            <option value="">No one in particular</option>
                            {members.map((m) => (
                                <option key={m._id} value={m._id}>
                                    {m.name} ({roleLabel(m.role)}){m.status === "inactive" ? " - deactivated" : ""}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Description</label>
                    <textarea className={`${inputClass} min-h-[140px]`} value={description} maxLength={5000} onChange={(e) => setDescription(e.target.value)} placeholder="What happened?" />
                </div>

                <div>
                    <label className={labelClass}>Photos (optional, up to {maxPhotos})</label>
                    <div className="flex flex-wrap items-center gap-2">
                        {photos.map((f, i) => (
                            <span key={`${f.name}-${i}`} className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-600 flex items-center gap-2 max-w-[220px]">
                                <FiImage className="shrink-0" /> <span className="truncate">{f.name}</span>
                                <button type="button" onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-500"><FiX /></button>
                            </span>
                        ))}
                        {photos.length < maxPhotos && (
                            <label className="px-4 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-xs font-bold cursor-pointer hover:bg-indigo-100 flex items-center gap-2">
                                <FiPlus /> Add photo
                                <input type="file" hidden multiple accept=".jpg,.jpeg,.png,.webp" onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />
                            </label>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onClose} className="px-5 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm">Cancel</button>
                    <button type="submit" disabled={saving} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm flex items-center gap-2 disabled:opacity-60">
                        <FiSend /> {saving ? "Sending..." : "Send to Admin"}
                    </button>
                </div>
            </form>
        </div>
    );
}
