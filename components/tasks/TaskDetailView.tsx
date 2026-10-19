"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
    FiArrowLeft, FiCalendar, FiCheck, FiCheckCircle, FiClock, FiEdit3, FiFile, FiPaperclip,
    FiPlay, FiRepeat, FiSend, FiSlash, FiUser, FiX, FiXCircle, FiUnlock,
} from "react-icons/fi";
import {
    cancelTask, getTask, getTaskMeta, getTeam, reviewTask, submitTask, TaskDetail, TeamMember,
    toggleChecklistItem, updateTaskProgress, Workflow,
} from "@/services/task.api";
import { deadlineLabel, formatBytes, formatDateTime, formatDayKey, workflowLabel } from "@/utils/taskFormat";
import Loading from "@/components/Loading";
import { CategoryBadge, PriorityBadge, StatusBadge } from "./TaskBadges";
import TaskFormModal from "./TaskFormModal";

const MAX_FILES = 5;
const MAX_FILE_MB = 10;
const ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.pptx,.txt,.csv";

const HISTORY_LABELS: Record<string, string> = {
    created: "Task created",
    updated: "Task edited",
    started: "Work started",
    blocked: "Marked blocked",
    unblocked: "Unblocked",
    submitted: "Submitted for approval",
    completed: "Completed",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
    overdue: "Deadline missed",
};

const DECISION_STYLES: Record<string, string> = {
    pending: "bg-purple-50 text-purple-600",
    approved: "bg-emerald-50 text-emerald-600",
    rejected: "bg-rose-50 text-rose-600",
    auto: "bg-emerald-50 text-emerald-600",
};
const DECISION_LABELS: Record<string, string> = {
    pending: "Waiting for review",
    approved: "Approved",
    rejected: "Rejected",
    auto: "Completed (no approval needed)",
};

// Full task page. "admin": edit, cancel, approve / reject. "member": the
// assignee works through the checklist, reports blockers and submits proof.
export default function TaskDetailView({ taskId, mode, backHref }: { taskId: string; mode: "admin" | "member"; backHref: string }) {
    const [task, setTask] = useState<TaskDetail | null>(null);
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [editing, setEditing] = useState(false);

    // Inputs
    const [note, setNote] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [reviewNote, setReviewNote] = useState("");
    const fileRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        try {
            setTask(await getTask(taskId));
            setError("");
        } catch (err) {
            setError((err as Error).message);
        }
    }, [taskId]);

    useEffect(() => {
        load();
        getTaskMeta().then((m) => setWorkflows(m.workflows)).catch(() => { });
        if (mode === "admin") getTeam().then(setTeam).catch(() => { });
    }, [load, mode]);

    // A Team Lead looking at a task they assigned can edit it too
    const leadManages = mode === "member" && Boolean(task?.canManage);
    useEffect(() => {
        if (leadManages) getTeam().then(setTeam).catch(() => { });
    }, [leadManages]);

    const run = async (action: () => Promise<unknown>, success: string) => {
        setBusy(true);
        try {
            await action();
            toast.success(success);
            await load();
            return true;
        } catch (err) {
            toast.error((err as Error).message);
            return false;
        } finally {
            setBusy(false);
        }
    };

    if (error) {
        return (
            <div className="max-w-3xl mx-auto text-center py-20">
                <p className="text-rose-500 font-bold mb-4">{error}</p>
                <Link href={backHref} className="text-indigo-600 font-bold text-sm">← Back</Link>
            </div>
        );
    }
    if (!task) return <Loading />;

    // Member mode is either the assignee doing the work, or the Team Lead who assigned it
    const isMember = mode === "member" && !leadManages;
    const manages = mode === "admin" || leadManages;
    // Assigned by a Team Lead (not the admin, not added by the member themselves)
    const byLead = Boolean(task.createdBy?.role && task.createdBy.role !== "admin" && task.createdBy._id !== task.assignedTo?._id);
    const approver = byLead ? `${task.createdBy?.name} (Team Lead)` : "the admin";
    const actionable = ["todo", "in_progress", "blocked"].includes(task.status);
    const closed = task.status === "completed" || task.status === "cancelled";
    const pending = task.status === "submitted" ? task.submissions[task.submissions.length - 1] : null;
    const doneSteps = task.checklist.filter((i) => i.done).length;
    // Only the assignee (or the admin) ticks steps
    const canTick = actionable && !leadManages;

    const addFiles = (list: FileList | null) => {
        if (!list) return;
        const picked = Array.from(list);
        const tooBig = picked.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
        if (tooBig) toast.error(`"${tooBig.name}" is larger than ${MAX_FILE_MB} MB.`);
        const next = [...files, ...picked.filter((f) => f.size <= MAX_FILE_MB * 1024 * 1024)].slice(0, MAX_FILES);
        if (files.length + picked.length > MAX_FILES) toast.error(`You can attach up to ${MAX_FILES} files.`);
        setFiles(next);
        if (fileRef.current) fileRef.current.value = "";
    };

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!note.trim() && files.length === 0) return toast.error("Add an explanation or attach proof.");
        if (task.checklist.length > 0 && doneSteps < task.checklist.length &&
            !window.confirm(`Only ${doneSteps} of ${task.checklist.length} checklist steps are ticked. Submit anyway?`)) return;
        const ok = await run(() => submitTask(task._id, note.trim(), files), task.requiresApproval ? "Submitted for approval" : "Task completed");
        if (ok) { setNote(""); setFiles([]); }
    };

    const review = async (decision: "approve" | "reject") => {
        if (decision === "reject" && !reviewNote.trim()) return toast.error("Write why it's rejected so they know what to fix.");
        const ok = await run(() => reviewTask(task._id, decision, reviewNote.trim()), decision === "approve" ? "Approved" : "Sent back to the team member");
        if (ok) setReviewNote("");
    };

    const cancel = async () => {
        const reason = window.prompt("Cancel this task? It stays in history as cancelled.\n\nReason (optional):");
        if (reason === null) return;
        await run(() => cancelTask(task._id, reason), "Task cancelled");
    };

    return (
        <div className="max-w-5xl mx-auto">
            <Link href={backHref} className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold text-sm mb-5">
                <FiArrowLeft /> Back
            </Link>

            {/* Header */}
            <div className={`bg-white rounded-[2rem] border p-7 mb-5 ${task.isOverdue ? "border-rose-200" : "border-slate-100"}`}>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                    <StatusBadge status={task.status} overdue={task.isOverdue} />
                    <CategoryBadge label={workflowLabel(task.category, workflows)} />
                    <PriorityBadge priority={task.priority} />
                    {task.recurringTask && <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1"><FiRepeat /> Repeating</span>}
                    {task.missedDeadline && !task.isOverdue && <span className="text-[10px] font-black uppercase text-rose-500">Deadline was missed</span>}
                </div>

                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <h1 className="text-2xl font-black text-slate-900">{task.title}</h1>
                    {manages && !closed && (
                        <div className="flex gap-2 shrink-0">
                            <button onClick={() => setEditing(true)} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-black uppercase flex items-center gap-2 hover:bg-slate-200"><FiEdit3 /> Edit</button>
                            <button onClick={cancel} disabled={busy} className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-600 text-xs font-black uppercase flex items-center gap-2 hover:bg-rose-100"><FiSlash /> Cancel task</button>
                        </div>
                    )}
                </div>

                {task.description && <p className="text-sm text-slate-600 whitespace-pre-wrap mt-3">{task.description}</p>}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <Info icon={<FiUser />} label="Assigned to" value={`${task.assignedTo?.name} (${task.assignedTo?.role})`} />
                    <Info icon={<FiCalendar />} label="Task day" value={formatDayKey(task.scheduledFor)} />
                    <Info
                        icon={<FiClock />}
                        label="Deadline"
                        value={formatDateTime(task.dueAt)}
                        sub={!closed && task.status !== "submitted" ? deadlineLabel(task.dueAt) : undefined}
                        danger={task.isOverdue}
                    />
                    <Info icon={<FiCheckCircle />} label="Approval" value={task.requiresApproval ? (byLead ? `${task.createdBy?.name} approves` : "Admin approves") : "Not needed"} />
                </div>

                {task.status === "blocked" && task.blockedReason && (
                    <div className="mt-5 p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-800 text-sm">
                        <span className="font-black">🚧 Blocked:</span> {task.blockedReason}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 space-y-5">
                    {/* Checklist */}
                    {task.checklist.length > 0 && (
                        <Section title={`Checklist · ${doneSteps}/${task.checklist.length}`}>
                            <div className="h-2 bg-slate-100 rounded-full mb-4 overflow-hidden">
                                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(doneSteps / task.checklist.length) * 100}%` }} />
                            </div>
                            <div className="space-y-2">
                                {task.checklist.map((item) => (
                                    <button
                                        key={item._id}
                                        disabled={!canTick || busy}
                                        onClick={() => run(() => toggleChecklistItem(task._id, item._id, !item.done), item.done ? "Step unticked" : "Step done")}
                                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all ${item.done ? "bg-emerald-50/50 border-emerald-100" : "bg-white border-slate-100"} ${canTick ? "hover:border-emerald-300" : "cursor-default"}`}
                                    >
                                        <span className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${item.done ? "bg-emerald-500 text-white" : "border-2 border-slate-200"}`}>
                                            {item.done && <FiCheck size={14} />}
                                        </span>
                                        <span className={`text-sm font-semibold ${item.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{item.text}</span>
                                        {item.doneAt && <span className="ml-auto text-[10px] text-slate-400 shrink-0">{formatDateTime(item.doneAt)}</span>}
                                    </button>
                                ))}
                            </div>
                        </Section>
                    )}

                    {/* Member actions */}
                    {isMember && actionable && (
                        <Section title="Update progress">
                            <div className="flex flex-wrap gap-2 mb-5">
                                {task.status === "todo" && (
                                    <button disabled={busy} onClick={() => run(() => updateTaskProgress(task._id, "start"), "Work started")} className="px-5 py-3 rounded-2xl bg-blue-600 text-white text-xs font-black uppercase flex items-center gap-2"><FiPlay /> Start work</button>
                                )}
                                {/* Tasks can no longer be marked blocked; this only resumes ones blocked earlier */}
                                {task.status === "blocked" && (
                                    <button disabled={busy} onClick={() => run(() => updateTaskProgress(task._id, "unblock"), "Back in progress")} className="px-5 py-3 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-black uppercase flex items-center gap-2"><FiUnlock /> No longer blocked</button>
                                )}
                            </div>

                            <form onSubmit={submit} className="space-y-3">
                                <p className="text-sm font-black text-slate-700">Submit completion proof</p>
                                <textarea rows={4} maxLength={4000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explain what you did (links, counts, remarks)..." className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                                <input ref={fileRef} type="file" multiple accept={ACCEPT} hidden onChange={(e) => addFiles(e.target.files)} />
                                <div className="flex flex-wrap items-center gap-2">
                                    <button type="button" onClick={() => fileRef.current?.click()} disabled={files.length >= MAX_FILES} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-black uppercase flex items-center gap-2 disabled:opacity-50"><FiPaperclip /> Attach document / screenshot</button>
                                    <span className="text-[10px] text-slate-400 font-bold">Up to {MAX_FILES} files, {MAX_FILE_MB} MB each · images, PDF, Word, Excel</span>
                                </div>
                                {files.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {files.map((f, i) => (
                                            <span key={`${f.name}-${i}`} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold">
                                                <FiFile /> {f.name} <span className="text-indigo-400">{formatBytes(f.size)}</span>
                                                <button type="button" onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}><FiX /></button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <button disabled={busy} className="px-6 py-3.5 rounded-2xl bg-indigo-600 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-60">
                                    <FiSend /> {busy ? "Submitting..." : task.requiresApproval ? "Submit for approval" : "Mark as completed"}
                                </button>
                            </form>
                        </Section>
                    )}

                    {/* Admin review */}
                    {manages && pending && (
                        <Section title="Review submission" highlight>
                            <SubmissionCard submission={pending} />
                            <textarea rows={2} maxLength={2000} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Feedback (required when rejecting)" className="w-full mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-sm outline-none" />
                            <div className="flex gap-2 mt-3">
                                <button disabled={busy} onClick={() => review("approve")} className="px-5 py-3 rounded-2xl bg-emerald-600 text-white text-xs font-black uppercase flex items-center gap-2"><FiCheckCircle /> Approve</button>
                                <button disabled={busy} onClick={() => review("reject")} className="px-5 py-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 text-xs font-black uppercase flex items-center gap-2"><FiXCircle /> Reject</button>
                            </div>
                        </Section>
                    )}

                    {isMember && task.status === "submitted" && (
                        <div className="p-5 rounded-3xl bg-purple-50 border border-purple-100 text-purple-700 text-sm font-bold">
                            📨 Submitted. Waiting for {approver} to approve it.
                        </div>
                    )}

                    {/* Submissions record */}
                    {task.submissions.length > 0 && (
                        <Section title={`Submissions (${task.submissions.length})`}>
                            <div className="space-y-3">
                                {[...task.submissions].reverse().map((s) => <SubmissionCard key={s._id} submission={s} />)}
                            </div>
                        </Section>
                    )}
                </div>

                {/* History */}
                <Section title="History">
                    <ol className="relative border-l-2 border-slate-100 ml-2 space-y-4">
                        {[...task.history].reverse().map((h, i) => (
                            <li key={i} className="ml-4">
                                <span className={`absolute -left-[7px] mt-1 h-3 w-3 rounded-full ${h.action === "overdue" || h.action === "rejected" ? "bg-rose-400" : h.action === "approved" || h.action === "completed" ? "bg-emerald-400" : "bg-slate-300"}`} />
                                <p className="text-xs font-black text-slate-700">{HISTORY_LABELS[h.action] || h.action}</p>
                                <p className="text-[10px] text-slate-400">{formatDateTime(h.at)}{h.by?.name ? ` · ${h.by.name}` : ""}</p>
                                {h.note && <p className="text-xs text-slate-500 mt-1">{h.note}</p>}
                            </li>
                        ))}
                    </ol>
                </Section>
            </div>

            {editing && (
                <TaskFormModal
                    workflows={workflows}
                    team={team}
                    task={task}
                    onClose={() => setEditing(false)}
                    onSaved={() => { setEditing(false); load(); }}
                />
            )}
        </div>
    );
}

function Section({ title, children, highlight }: { title: string; children: React.ReactNode; highlight?: boolean }) {
    return (
        <div className={`bg-white rounded-[2rem] border p-6 ${highlight ? "border-purple-200 shadow-lg shadow-purple-50" : "border-slate-100"}`}>
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">{title}</p>
            {children}
        </div>
    );
}

function Info({ icon, label, value, sub, danger }: { icon: React.ReactNode; label: string; value: string; sub?: string; danger?: boolean }) {
    return (
        <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">{icon} {label}</p>
            <p className={`text-sm font-bold mt-1 ${danger ? "text-rose-600" : "text-slate-700"}`}>{value}</p>
            {sub && <p className={`text-[11px] font-bold ${danger ? "text-rose-500" : "text-slate-400"}`}>{sub}</p>}
        </div>
    );
}

function SubmissionCard({ submission: s }: { submission: TaskDetail["submissions"][number] }) {
    return (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${DECISION_STYLES[s.decision]}`}>{DECISION_LABELS[s.decision]}</span>
                {s.late && <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-rose-50 text-rose-600">Submitted late</span>}
                <span className="text-[10px] text-slate-400 font-bold ml-auto">{s.submittedBy?.name} · {formatDateTime(s.submittedAt)}</span>
            </div>
            {s.note && <p className="text-sm text-slate-700 whitespace-pre-wrap">{s.note}</p>}
            {s.files.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                    {s.files.map((f) =>
                        f.resourceType === "image" && f.url ? (
                            <a key={f._id} href={f.url} target="_blank" rel="noopener noreferrer" title={f.name} className="block h-20 w-20 rounded-xl overflow-hidden border border-slate-200 bg-white">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={f.url} alt={f.name} className="h-full w-full object-cover" />
                            </a>
                        ) : (
                            <a key={f._id} href={f.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50">
                                <FiFile /> {f.name} <span className="text-slate-400">{formatBytes(f.size)}</span>
                            </a>
                        )
                    )}
                </div>
            )}
            {s.reviewedAt && (
                <p className="text-xs text-slate-500 mt-3 border-t border-slate-200 pt-2">
                    <span className="font-black">{s.reviewedBy?.name || "Admin"}</span> · {formatDateTime(s.reviewedAt)}
                    {s.reviewNote && <>: {s.reviewNote}</>}
                </p>
            )}
        </div>
    );
}
