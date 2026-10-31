"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { FiInbox, FiLock, FiMessageSquare, FiSave, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import {
    CATEGORY_LABELS,
    Complaint,
    ComplaintCategory,
    deleteComplaint,
    getComplaint,
    getComplaints,
    replyToComplaint,
    updateComplaintNote,
} from "@/services/complaint.api";
import { formatDateTime } from "@/utils/taskFormat";
import Loading from "@/components/Loading";
import Pagination from "@/components/buttons/Pagination";
import { PhotoStrip } from "./MyComplaintsView";

const PAGE_SIZE = 25;
const selectClass = "p-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 outline-none";
const textareaClass = "w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-700 min-h-[110px]";
const roleLabel = (role: string) => (role === "csr" ? "CSR" : role === "staff" ? "Staff" : "");

// Every complaint team members sent. Staff with the "complaints" permission
// get the same page, minus complaints about (or filed by) themselves - the
// server leaves those out. `?open=<id>` opens one (used by notifications).
export default function AdminComplaintsView() {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();
    const openId = params.get("open") || "";

    const [items, setItems] = useState<Complaint[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [category, setCategory] = useState("");
    const [replied, setReplied] = useState<"" | "yes" | "no">("");
    const [search, setSearch] = useState("");
    const [q, setQ] = useState("");
    const [selected, setSelected] = useState<Complaint | null>(null);

    const load = useCallback(async (pageToLoad: number) => {
        setLoading(true);
        try {
            const res = await getComplaints({ q, category, replied, page: pageToLoad, limit: PAGE_SIZE });
            setItems(res.data);
            setPages(res.pagination.pages);
            setTotal(res.pagination.total);
            setPage(pageToLoad);
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [q, category, replied]);

    useEffect(() => { load(1); }, [load]);

    // Search after typing stops
    useEffect(() => {
        const t = setTimeout(() => setQ(search.trim()), 400);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        if (!openId) return;
        getComplaint(openId).then(setSelected).catch((err: Error) => { toast.error(err.message); });
    }, [openId]);

    const close = () => {
        setSelected(null);
        if (openId) router.replace(pathname);
    };

    const onChanged = (c: Complaint) => {
        setSelected(c);
        setItems((prev) => prev.map((i) => (i._id === c._id ? c : i)));
    };

    const onDeleted = (id: string) => {
        close();
        setItems((prev) => prev.filter((i) => i._id !== id));
        setTotal((t) => Math.max(0, t - 1));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px]">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search subject, description or names..."
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">All categories</option>
                    {(Object.keys(CATEGORY_LABELS) as ComplaintCategory[]).map((c) => (
                        <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
                    ))}
                </select>
                <select className={selectClass} value={replied} onChange={(e) => setReplied(e.target.value as "" | "yes" | "no")}>
                    <option value="">Replied or not</option>
                    <option value="no">Not replied yet</option>
                    <option value="yes">Replied</option>
                </select>
                <span className="text-xs font-bold text-slate-400">{total} complaint{total === 1 ? "" : "s"}</span>
            </div>

            {loading ? (
                <Loading />
            ) : items.length === 0 ? (
                <div className="bg-white p-12 rounded-[2rem] border border-slate-100 text-center">
                    <FiInbox className="mx-auto text-3xl text-slate-300" />
                    <p className="text-slate-400 font-bold text-sm mt-3">No complaints found</p>
                </div>
            ) : (
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 divide-y divide-slate-50 overflow-hidden">
                    {items.map((c) => (
                        <button key={c._id} onClick={() => setSelected(c)} className="w-full text-left p-5 hover:bg-slate-50 flex flex-wrap items-start gap-4">
                            <div className="flex-1 min-w-[220px]">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-indigo-50 text-indigo-600">{CATEGORY_LABELS[c.category] || c.category}</span>
                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${c.replied ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-700"}`}>
                                        {c.replied ? "Replied" : "Not replied"}
                                    </span>
                                    {c.adminNote && <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-100 text-slate-500 flex items-center gap-1"><FiLock /> Note</span>}
                                </div>
                                <p className="font-black text-slate-800 mt-2 break-words">{c.subject}</p>
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2 break-words">{c.description}</p>
                            </div>
                            <div className="text-right text-[11px] font-bold text-slate-400 space-y-1">
                                <p>From <span className="text-slate-700">{c.filedByName}</span> ({roleLabel(c.filedByRole)})</p>
                                {c.againstName && <p>About <span className="text-rose-600">{c.againstName}</span> ({roleLabel(c.againstRole)})</p>}
                                <p>{formatDateTime(c.createdAt)}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            <Pagination currentPage={page} totalPages={pages} onPageChange={(p) => load(p)} />

            {selected && <ComplaintDetail complaint={selected} onClose={close} onChanged={onChanged} onDeleted={onDeleted} />}
        </div>
    );
}

function ComplaintDetail({
    complaint: c,
    onClose,
    onChanged,
    onDeleted,
}: {
    complaint: Complaint;
    onClose: () => void;
    onChanged: (c: Complaint) => void;
    onDeleted: (id: string) => void;
}) {
    const [reply, setReply] = useState(c.reply || "");
    const [note, setNote] = useState(c.adminNote || "");
    const [busy, setBusy] = useState<"" | "reply" | "note" | "delete">("");

    useEffect(() => {
        setReply(c.reply || "");
        setNote(c.adminNote || "");
    }, [c._id, c.reply, c.adminNote]);

    const saveReply = async () => {
        if (!reply.trim()) return toast.error("Please write a reply.");
        setBusy("reply");
        try {
            onChanged(await replyToComplaint(c._id, reply.trim()));
            toast.success(c.replied ? "Reply updated" : "Reply sent");
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setBusy("");
        }
    };

    const saveNote = async () => {
        setBusy("note");
        try {
            onChanged(await updateComplaintNote(c._id, note.trim()));
            toast.success("Note saved");
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setBusy("");
        }
    };

    const remove = async () => {
        if (!window.confirm(`Delete the complaint "${c.subject}"? This can't be undone.`)) return;
        setBusy("delete");
        try {
            await deleteComplaint(c._id);
            toast.success("Complaint deleted");
            onDeleted(c._id);
        } catch (err) {
            toast.error((err as Error).message);
            setBusy("");
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={onClose}>
            <div onMouseDown={(e) => e.stopPropagation()} className="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-[2rem] shadow-2xl p-7 space-y-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-indigo-50 text-indigo-600">{CATEGORY_LABELS[c.category] || c.category}</span>
                        <h2 className="text-xl font-black text-slate-800 mt-2 break-words">{c.subject}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700"><FiX size={20} /></button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-slate-50 rounded-2xl p-3">
                        <p className="text-[10px] font-black uppercase text-slate-400">From</p>
                        <p className="font-bold text-slate-700 mt-1">{c.filedByName} <span className="text-slate-400">({roleLabel(c.filedByRole)})</span></p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-3">
                        <p className="text-[10px] font-black uppercase text-slate-400">About</p>
                        <p className="font-bold text-slate-700 mt-1">
                            {c.againstName ? <>{c.againstName} <span className="text-slate-400">({roleLabel(c.againstRole)})</span></> : "No one in particular"}
                        </p>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-3">
                        <p className="text-[10px] font-black uppercase text-slate-400">Sent</p>
                        <p className="font-bold text-slate-700 mt-1">{formatDateTime(c.createdAt)}</p>
                    </div>
                </div>

                <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{c.description}</p>
                <PhotoStrip photos={c.photos} />

                <div className="border-t border-slate-100 pt-5 space-y-2">
                    <label className="text-[10px] font-black uppercase text-emerald-600 flex items-center gap-1.5">
                        <FiMessageSquare /> Reply to {c.filedByName} (they will see this)
                    </label>
                    {c.replied && (
                        <p className="text-[11px] text-slate-400 font-bold">
                            Replied{c.repliedByName ? ` by ${c.repliedByName}` : ""}{c.repliedAt ? ` · ${formatDateTime(c.repliedAt)}` : ""}
                        </p>
                    )}
                    <textarea className={textareaClass} value={reply} maxLength={4000} onChange={(e) => setReply(e.target.value)} placeholder="Write your reply..." />
                    <div className="flex justify-end">
                        <button onClick={saveReply} disabled={busy !== "" || reply.trim() === (c.reply || "")} className="px-5 py-2.5 bg-emerald-600 text-white rounded-2xl font-bold text-xs flex items-center gap-2 disabled:opacity-50">
                            <FiSave /> {busy === "reply" ? "Saving..." : c.replied ? "Update Reply" : "Send Reply"}
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5">
                        <FiLock /> Private admin note (never shown to {c.filedByName})
                    </label>
                    <textarea className={textareaClass} value={note} maxLength={4000} onChange={(e) => setNote(e.target.value)} placeholder="Internal note..." />
                    <div className="flex justify-end">
                        <button onClick={saveNote} disabled={busy !== "" || note.trim() === (c.adminNote || "")} className="px-5 py-2.5 bg-slate-800 text-white rounded-2xl font-bold text-xs flex items-center gap-2 disabled:opacity-50">
                            <FiSave /> {busy === "note" ? "Saving..." : "Save Note"}
                        </button>
                    </div>
                </div>

                <div className="border-t border-slate-100 pt-5 flex justify-between items-center">
                    <button onClick={remove} disabled={busy !== ""} className="px-5 py-2.5 bg-rose-50 text-rose-600 rounded-2xl font-bold text-xs flex items-center gap-2 hover:bg-rose-500 hover:text-white disabled:opacity-50">
                        <FiTrash2 /> {busy === "delete" ? "Deleting..." : "Delete Complaint"}
                    </button>
                    <button onClick={onClose} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs">Close</button>
                </div>
            </div>
        </div>
    );
}
