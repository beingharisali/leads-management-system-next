"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import toast, { Toaster } from "react-hot-toast";
import {
    FiArrowLeft, FiCopy, FiExternalLink, FiFileText, FiChevronLeft, FiChevronRight, FiRefreshCw,
    FiCheckCircle, FiX, FiUpload,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import {
    getMyAdmissionCode, getMyAdmissions, markAdmissionPaid, markAdmissionsSeen, admissionFormUrl, Admission,
} from "@/services/admission.api";
import { getErrorMessage } from "@/services/http";

const PAGE_SIZE = 20;

const SYNC_BADGE: Record<string, { label: string; className: string }> = {
    synced: { label: "Sent to LMS", className: "bg-emerald-100 text-emerald-700" },
    pending: { label: "Sending", className: "bg-amber-100 text-amber-700" },
    failed: { label: "Retrying", className: "bg-rose-100 text-rose-700" },
};

// CSR's own public admission link (to copy / share) and the forms people
// have submitted through it.
export default function CsrAdmissionPage() {
    const [link, setLink] = useState("");
    const [admissions, setAdmissions] = useState<Admission[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [payingFor, setPayingFor] = useState<Admission | null>(null);

    // Opening this page clears the "new admission" alert
    useEffect(() => { markAdmissionsSeen().catch(() => { }); }, []);

    useEffect(() => {
        getMyAdmissionCode()
            .then(code => setLink(admissionFormUrl(code)))
            .catch(err => toast.error(getErrorMessage(err, "Could not load your form link")));
    }, []);

    const fetchAdmissions = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getMyAdmissions(page, PAGE_SIZE);
            setAdmissions(res.data);
            setTotal(res.total);
            setTotalPages(res.totalPages);
        } catch (err) {
            toast.error(getErrorMessage(err, "Could not load submissions"));
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { fetchAdmissions(); }, [fetchAdmissions]);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(link);
            toast.success("Link copied");
        } catch {
            toast.error("Could not copy. Select the link and copy it manually.");
        }
    };

    const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`Fill in the Ideoversity admission form here: ${link}`)}`;

    return (
        <ProtectedRoute role="csr">
            <Toaster position="top-right" />
            <div className="min-h-screen bg-[#F4F7FE] p-4 lg:p-10">
                <div className="max-w-[1200px] mx-auto space-y-8">
                    <div>
                        <Link href="/csr/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 mb-4">
                            <FiArrowLeft /> Back to Dashboard
                        </Link>
                        <h1 className="text-3xl font-black text-slate-900">Admission Form</h1>
                        <p className="text-slate-500 text-sm font-medium">
                            Share your link. Every form filled through it is sent to the Ideoversity admin and added to your leads.
                        </p>
                    </div>

                    {/* Share link */}
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Your form link</p>
                        <div className="flex flex-col md:flex-row gap-3">
                            <input
                                readOnly
                                value={link || "Loading..."}
                                onFocus={e => e.target.select()}
                                className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 outline-none"
                            />
                            <button onClick={copyLink} disabled={!link} className="px-5 py-3 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 transition-all">
                                <FiCopy /> Copy
                            </button>
                            <a href={link ? whatsappHref : undefined} target="_blank" rel="noopener noreferrer" className="px-5 py-3 bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all">
                                <FaWhatsapp /> WhatsApp
                            </a>
                            <a href={link || undefined} target="_blank" rel="noopener noreferrer" className="px-5 py-3 bg-white text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 transition-all">
                                <FiExternalLink /> Open
                            </a>
                        </div>
                    </div>

                    {/* Submissions */}
                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-slate-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl"><FiFileText size={18} /></div>
                                <div>
                                    <h2 className="text-lg font-black text-slate-800">My Submissions</h2>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{total} total</p>
                                </div>
                            </div>
                            <button onClick={fetchAdmissions} className="p-3 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100" title="Refresh">
                                <FiRefreshCw className={loading ? "animate-spin" : ""} />
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400 text-left">
                                        <th className="px-6 py-3">Submitted</th>
                                        <th className="px-6 py-3">Name</th>
                                        <th className="px-6 py-3">Phone</th>
                                        <th className="px-6 py-3">Course</th>
                                        <th className="px-6 py-3">Photos</th>
                                        <th className="px-6 py-3">Receipt</th>
                                        <th className="px-6 py-3">Payment</th>
                                        <th className="px-6 py-3">LMS</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {loading && admissions.length === 0 ? (
                                        <tr><td colSpan={8} className="text-center py-10 text-slate-400 font-bold">Loading...</td></tr>
                                    ) : admissions.length === 0 ? (
                                        <tr><td colSpan={8} className="text-center py-10 text-slate-400 font-bold">No forms submitted through your link yet.</td></tr>
                                    ) : admissions.map(a => {
                                        const badge = SYNC_BADGE[a.sync?.status] || SYNC_BADGE.pending;
                                        return (
                                            <tr key={a._id} className="hover:bg-slate-50/60">
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-500 font-medium">
                                                    {new Date(a.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" })}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-800">{a.fullName}</td>
                                                <td className="px-6 py-4 text-slate-600">{a.phone}</td>
                                                <td className="px-6 py-4 text-slate-600">{a.course}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {a.idCardUrl || a.selfieUrl ? (
                                                        <div className="flex gap-3 text-xs font-bold">
                                                            {a.idCardUrl && <a href={a.idCardUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ID card</a>}
                                                            {a.selfieUrl && <a href={a.selfieUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Selfie</a>}
                                                        </div>
                                                    ) : "—"}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500">{a.receiptId || "—"}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {a.payment?.status === "paid" ? (
                                                        <div className="flex flex-col gap-1">
                                                            <span className="w-fit px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-100 text-emerald-700">
                                                                Paid{a.payment.amount != null ? ` · PKR ${a.payment.amount.toLocaleString("en-PK")}` : ""}
                                                            </span>
                                                            {a.payment.screenshotUrl && (
                                                                <a href={a.payment.screenshotUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-600 hover:underline">Screenshot</a>
                                                            )}
                                                        </div>
                                                    ) : a.receiptId ? (
                                                        <div className="flex flex-col gap-1.5">
                                                            <span className="w-fit px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-amber-100 text-amber-700">Pending</span>
                                                            <button onClick={() => setPayingFor(a)} className="w-fit px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-black hover:bg-emerald-700 transition-all">
                                                                Mark as paid
                                                            </button>
                                                        </div>
                                                    ) : "—"}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${badge.className}`}>{badge.label}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100">
                                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-xl bg-slate-50 text-slate-600 disabled:opacity-40"><FiChevronLeft /></button>
                                <span className="text-xs font-bold text-slate-500">Page {page} of {totalPages}</span>
                                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-xl bg-slate-50 text-slate-600 disabled:opacity-40"><FiChevronRight /></button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {payingFor && (
                <MarkPaidModal
                    admission={payingFor}
                    onClose={() => setPayingFor(null)}
                    onPaid={updated => {
                        setAdmissions(list => list.map(a => (a._id === updated._id ? updated : a)));
                        setPayingFor(null);
                    }}
                />
            )}
        </ProtectedRoute>
    );
}

/* ================= MARK AS PAID ================= */

// The CSR uploads the screenshot the student sent on WhatsApp. Saving records
// the Sale, moves the lead to Closed Leads as Paid and updates the admin's view.
function MarkPaidModal({ admission, onClose, onPaid }: {
    admission: Admission;
    onClose: () => void;
    onPaid: (updated: Admission) => void;
}) {
    const [amount, setAmount] = useState("");
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    const previewUrl = useMemo(() => (screenshot ? URL.createObjectURL(screenshot) : ""), [screenshot]);
    useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

    const amountValue = Number(amount);
    const valid = Number.isFinite(amountValue) && amountValue > 0 && !!screenshot;

    const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file && (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024)) {
            toast.error("Choose a JPG, PNG or WebP screenshot below 5 MB.");
            e.target.value = "";
            return;
        }
        setScreenshot(file);
    };

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!valid || saving || !screenshot) return;
        setSaving(true);
        try {
            const updated = await markAdmissionPaid(admission._id, amountValue, screenshot);
            toast.success(`${admission.fullName} marked as paid and moved to your closed leads`);
            onPaid(updated);
        } catch (err) {
            toast.error(getErrorMessage(err, "Could not record the payment"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={() => !saving && onClose()}>
            <form onSubmit={save} className="bg-white rounded-[2rem] shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between p-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-lg font-black text-slate-800">Mark as paid</h2>
                        <p className="text-xs font-bold text-slate-400 mt-0.5">{admission.fullName} · {admission.course}</p>
                    </div>
                    <button type="button" onClick={onClose} disabled={saving} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><FiX size={18} /></button>
                </div>

                <div className="p-6 space-y-5">
                    <label className="block">
                        <span className="block text-xs font-bold text-slate-600 mb-1.5">Amount received (PKR) <span className="text-rose-500">*</span></span>
                        <input
                            type="number"
                            min={1}
                            step="any"
                            inputMode="numeric"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            required
                            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                            placeholder="e.g. 5000"
                        />
                    </label>

                    <div>
                        <span className="block text-xs font-bold text-slate-600 mb-1.5">Payment screenshot <span className="text-rose-500">*</span></span>
                        <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-slate-200 text-sm font-bold text-slate-500 cursor-pointer hover:border-emerald-400 hover:text-emerald-700 transition-all">
                            <FiUpload /> {screenshot ? "Choose a different screenshot" : "Upload the screenshot from WhatsApp"}
                            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pickFile} className="hidden" />
                        </label>
                        {previewUrl && (
                            // eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file
                            <img src={previewUrl} alt="Payment screenshot preview" className="mt-3 w-full max-h-64 object-contain rounded-2xl border border-slate-200 bg-slate-50" />
                        )}
                    </div>

                    <p className="text-xs text-slate-500 font-medium">
                        Saving records the sale, moves this student to your <b>Closed Leads</b> as Paid and shows the payment to the admin.
                    </p>
                </div>

                <div className="flex justify-end gap-2 p-6 pt-0">
                    <button type="button" onClick={onClose} disabled={saving} className="px-5 py-3 bg-white text-slate-600 rounded-2xl font-bold text-sm border border-slate-200 hover:bg-slate-50">Cancel</button>
                    <button type="submit" disabled={!valid || saving} className="px-5 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        <FiCheckCircle /> {saving ? "Saving..." : "Confirm payment"}
                    </button>
                </div>
            </form>
        </div>
    );
}
