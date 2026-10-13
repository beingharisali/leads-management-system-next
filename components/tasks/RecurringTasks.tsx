"use client";

import { FormEvent, ReactNode, useState } from "react";
import toast from "react-hot-toast";
import { FiEdit3, FiInbox, FiPause, FiPlay, FiRepeat, FiTrash2, FiX } from "react-icons/fi";
import {
    createRecurringTask, deleteRecurringTask, Frequency, RecurringInput, RecurringTask, TaskPriority,
    TeamMember, updateRecurringTask, Workflow,
} from "@/services/task.api";
import { dayKeyOf, todayKey, WEEKDAYS, workflowLabel } from "@/utils/taskFormat";
import { CategoryBadge } from "@/components/tasks/TaskBadges";

const inputClass = "w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-slate-700";
const labelClass = "text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1 block";

const ordinal = (n: number) => {
    if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
    return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
};

// Weekdays a daily template skips; older templates only have skipSundays
export const skippedWeekdays = (t: Pick<RecurringTask, "skipWeekdays" | "skipSundays">) =>
    t.skipWeekdays && t.skipWeekdays.length > 0 ? t.skipWeekdays : t.skipSundays ? [0] : [];

export const scheduleText = (t: RecurringTask) => {
    const time = `by ${t.dueTime}`;
    if (t.frequency === "daily") {
        const skipped = skippedWeekdays(t);
        return `Every day${skipped.length ? ` except ${skipped.map((d) => WEEKDAYS[d]).join(", ")}` : ""} ${time}`;
    }
    if (t.frequency === "weekly") return `Every ${WEEKDAYS[t.weekday ?? 1]} ${time}`;
    return `Monthly on the ${ordinal(t.dayOfMonth ?? 1)} ${time}`;
};

// Cards for daily / weekly / monthly responsibilities, with pause, edit, remove.
export function RecurringTaskList({ items, workflows, onEdit, onChanged }: {
    items: RecurringTask[];
    workflows: Workflow[];
    onEdit: (t: RecurringTask) => void;
    onChanged: () => void;
}) {
    const toggleActive = async (t: RecurringTask) => {
        try {
            await updateRecurringTask(t._id, { active: !t.active });
            toast.success(t.active ? "Paused" : "Resumed");
            onChanged();
        } catch (err) {
            toast.error((err as Error).message);
        }
    };

    const remove = async (t: RecurringTask) => {
        if (!window.confirm(`Remove "${t.title}"? No new tasks will be created from it. Tasks it already created are kept.`)) return;
        try {
            await deleteRecurringTask(t._id);
            toast.success("Repeating task removed");
            onChanged();
        } catch (err) {
            toast.error((err as Error).message);
        }
    };

    if (items.length === 0) {
        return (
            <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <FiInbox className="mx-auto text-slate-300 mb-3" size={32} />
                <p className="text-slate-400 font-bold text-sm">No repeating tasks yet. Add daily reports, weekly checks or monthly duties with &quot;Assign Task&quot;.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {items.map((t) => (
                <div key={t._id} className={`bg-white rounded-3xl border border-slate-100 p-5 ${t.active ? "" : "opacity-60"}`}>
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <CategoryBadge label={workflowLabel(t.category, workflows)} />
                                {!t.active && <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-slate-100 text-slate-500">Paused</span>}
                            </div>
                            <p className="font-black text-slate-800">{t.title}</p>
                            <p className="text-xs text-indigo-600 font-bold mt-1 flex items-center gap-1.5"><FiRepeat /> {scheduleText(t)}</p>
                            <p className="text-xs text-slate-400 font-bold mt-1">
                                For {t.assignedTo?.name || "(removed user)"}
                                {t.assignedTo?.status === "inactive" && <span className="text-rose-500"> · account deactivated, skipped</span>}
                                {t.endDate && <> · until {new Date(t.endDate).toLocaleDateString("en-GB")}</>}
                            </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                            <IconButton title={t.active ? "Pause" : "Resume"} onClick={() => toggleActive(t)}>{t.active ? <FiPause /> : <FiPlay />}</IconButton>
                            <IconButton title="Edit" onClick={() => onEdit(t)}><FiEdit3 /></IconButton>
                            <IconButton title="Remove" danger onClick={() => remove(t)}><FiTrash2 /></IconButton>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function IconButton({ children, onClick, title, danger }: { children: ReactNode; onClick: () => void; title: string; danger?: boolean }) {
    return (
        <button onClick={onClick} title={title} className={`p-2.5 rounded-xl ${danger ? "text-rose-400 hover:bg-rose-50" : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"}`}>
            {children}
        </button>
    );
}

// Create / edit a repeating task. `header` is shown under the title (the
// one-time / repeating switch when creating from All Tasks).
export function RecurringForm({ template, workflows, team, defaultAssignee, header, onClose, onSaved }: {
    template?: RecurringTask;
    workflows: Workflow[];
    team: TeamMember[];
    defaultAssignee?: string;
    header?: ReactNode;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [title, setTitle] = useState(template?.title || "");
    const [description, setDescription] = useState(template?.description || "");
    const [category, setCategory] = useState(template?.category || "general");
    const [priority, setPriority] = useState<TaskPriority>(template?.priority || "normal");
    const [assignedTo, setAssignedTo] = useState(template?.assignedTo?._id || defaultAssignee || "");
    const [frequency, setFrequency] = useState<Frequency>(template?.frequency || "daily");
    const [weekday, setWeekday] = useState(template?.weekday ?? 1);
    const [dayOfMonth, setDayOfMonth] = useState(template?.dayOfMonth ?? 1);
    // New daily tasks start with Sunday off; the admin can change it
    const [skipDays, setSkipDays] = useState<number[]>(template ? skippedWeekdays(template) : [0]);
    const [dueTime, setDueTime] = useState(template?.dueTime || "18:00");
    const [startDate, setStartDate] = useState(template ? dayKeyOf(new Date(template.startDate)) : todayKey());
    const [endDate, setEndDate] = useState(template?.endDate ? dayKeyOf(new Date(template.endDate)) : "");
    const [requiresApproval, setRequiresApproval] = useState(template?.requiresApproval ?? true);
    const [checklistText, setChecklistText] = useState(
        (template?.checklist || workflows.find((w) => w.key === "general")?.checklist || []).join("\n")
    );
    const [saving, setSaving] = useState(false);

    const changeCategory = (key: string) => {
        setCategory(key);
        if (!template) setChecklistText((workflows.find((w) => w.key === key)?.checklist || []).join("\n"));
    };

    const toggleSkipDay = (d: number) =>
        setSkipDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!assignedTo) return toast.error("Choose who it's for.");
        if (frequency === "daily" && skipDays.length === 7) return toast.error("You can't skip every day of the week.");
        const daily = frequency === "daily";
        const payload: RecurringInput = {
            title,
            description,
            category,
            priority,
            assignedTo,
            frequency,
            weekday: frequency === "weekly" ? weekday : undefined,
            dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
            skipWeekdays: daily ? skipDays : [],
            dueTime,
            startDate,
            endDate: endDate || null,
            requiresApproval,
            checklist: checklistText.split("\n").map((s) => s.trim()).filter(Boolean),
        };

        setSaving(true);
        try {
            if (template) {
                await updateRecurringTask(template._id, payload);
                toast.success("Saved. Changes apply from the next occurrence.");
            } else {
                const res = await createRecurringTask(payload);
                toast.success(res.createdToday ? "Created. Today's task has been assigned." : "Created. The first task appears on its next day.");
            }
            onSaved();
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const assignable = team.filter((m) => m.status === "active" || m._id === assignedTo);

    return (
        <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onMouseDown={onClose}>
            <form onSubmit={submit} onMouseDown={(e) => e.stopPropagation()} className="bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-[2rem] shadow-2xl p-7 space-y-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black text-slate-800">{template ? "Edit Repeating Task" : "New Repeating Task"}</h2>
                    <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><FiX size={20} /></button>
                </div>
                {header}

                <div>
                    <label className={labelClass}>Title *</label>
                    <input required maxLength={150} className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Daily attendance report" />
                </div>
                <div>
                    <label className={labelClass}>Details</label>
                    <textarea rows={2} maxLength={4000} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className={labelClass}>Workflow</label>
                        <select className={inputClass} value={category} onChange={(e) => changeCategory(e.target.value)}>
                            {workflows.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Assign to *</label>
                        <select required className={inputClass} value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                            <option value="">Choose...</option>
                            {assignable.map((m) => <option key={m._id} value={m._id}>{m.name} ({m.role})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>Priority</label>
                        <select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                            <option value="low">Low</option>
                            <option value="normal">Normal</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className={labelClass}>Repeats</label>
                        <select className={inputClass} value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                    {frequency === "weekly" && (
                        <div>
                            <label className={labelClass}>On</label>
                            <select className={inputClass} value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
                                {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                            </select>
                        </div>
                    )}
                    {frequency === "monthly" && (
                        <div>
                            <label className={labelClass}>Day of month</label>
                            <input type="number" min={1} max={31} className={inputClass} value={dayOfMonth} onChange={(e) => setDayOfMonth(Number(e.target.value))} />
                        </div>
                    )}
                    <div>
                        <label className={labelClass}>Deadline time</label>
                        <input type="time" required className={inputClass} value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
                    </div>
                </div>

                {frequency === "daily" && (
                    <div>
                        <label className={labelClass}>Skip these days (no task on them)</label>
                        <div className="flex flex-wrap gap-2">
                            {WEEKDAYS.map((d, i) => {
                                const skipped = skipDays.includes(i);
                                return (
                                    <button
                                        type="button"
                                        key={d}
                                        onClick={() => toggleSkipDay(i)}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${skipped ? "bg-rose-500 text-white border-rose-500" : "bg-white text-slate-600 border-slate-200 hover:border-rose-300"}`}
                                    >
                                        {d.slice(0, 3)}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[11px] text-slate-400 font-semibold mt-1.5 ml-1">
                            {skipDays.length === 0 ? "Repeats every day of the week." : `No task on ${skipDays.map((d) => WEEKDAYS[d]).join(", ")}.`}
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Starts</label>
                        <input type="date" required className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClass}>Ends (optional)</label>
                        <input type="date" min={startDate} className={inputClass} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Checklist steps (one per line)</label>
                    <textarea rows={4} className={inputClass} value={checklistText} onChange={(e) => setChecklistText(e.target.value)} />
                </div>

                <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
                    <input type="checkbox" className="mt-1 h-4 w-4 accent-indigo-600" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} />
                    <span>
                        <span className="block text-sm font-bold text-slate-700">I approve completion</span>
                        <span className="block text-xs text-slate-400">Untick for routine work you don&apos;t need to approve every time. Proof is still recorded.</span>
                    </span>
                </label>

                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onClose} className="px-6 py-3.5 rounded-2xl font-bold text-sm text-slate-500 hover:bg-slate-50">Cancel</button>
                    <button type="submit" disabled={saving} className="px-6 py-3.5 rounded-2xl font-bold text-sm bg-indigo-600 text-white shadow-lg shadow-indigo-100 disabled:opacity-60">
                        {saving ? "Saving..." : template ? "Save Changes" : "Create"}
                    </button>
                </div>
            </form>
        </div>
    );
}
