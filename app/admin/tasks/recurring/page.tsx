"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiEdit3, FiInbox, FiPause, FiPlay, FiPlus, FiRepeat, FiTrash2, FiX } from "react-icons/fi";
import {
    createRecurringTask, deleteRecurringTask, Frequency, getRecurringTasks, getTaskMeta, getTeam,
    RecurringInput, RecurringTask, TaskPriority, TeamMember, updateRecurringTask, Workflow,
} from "@/services/task.api";
import { dayKeyOf, todayKey, WEEKDAYS, workflowLabel } from "@/utils/taskFormat";
import Loading from "@/components/Loading";
import { CategoryBadge } from "@/components/tasks/TaskBadges";

const inputClass = "w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-slate-700";
const labelClass = "text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1 block";

const ordinal = (n: number) => {
    if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
    return `${n}${{ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th"}`;
};

const scheduleText = (t: RecurringTask) => {
    const time = `by ${t.dueTime}`;
    if (t.frequency === "daily") return `Every day${t.skipSundays ? " except Sunday" : ""} ${time}`;
    if (t.frequency === "weekly") return `Every ${WEEKDAYS[t.weekday ?? 1]} ${time}`;
    return `Monthly on the ${ordinal(t.dayOfMonth ?? 1)} ${time}`;
};

// Daily / weekly / monthly responsibilities. The server creates the day's
// task automatically from each active one.
export default function RecurringTasksPage() {
    const [items, setItems] = useState<RecurringTask[] | null>(null);
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [editing, setEditing] = useState<RecurringTask | "new" | null>(null);

    const load = useCallback(
        () => getRecurringTasks().then(setItems).catch((err: Error) => { toast.error(err.message); }),
        []
    );

    useEffect(() => {
        load();
        getTaskMeta().then((m) => setWorkflows(m.workflows)).catch(() => { });
        getTeam().then(setTeam).catch(() => { });
    }, [load]);

    const toggleActive = async (t: RecurringTask) => {
        try {
            await updateRecurringTask(t._id, { active: !t.active });
            toast.success(t.active ? "Paused" : "Resumed");
            load();
        } catch (err) {
            toast.error((err as Error).message);
        }
    };

    const remove = async (t: RecurringTask) => {
        if (!window.confirm(`Remove "${t.title}"? No new tasks will be created from it. Tasks it already created are kept.`)) return;
        try {
            await deleteRecurringTask(t._id);
            toast.success("Repeating task removed");
            load();
        } catch (err) {
            toast.error((err as Error).message);
        }
    };

    if (!items) return <Loading />;

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900">Repeating Tasks</h2>
                    <p className="text-sm text-slate-400 font-medium">A task is created automatically on every day each one falls on.</p>
                </div>
                <button onClick={() => setEditing("new")} className="px-5 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-100"><FiPlus /> New Repeating Task</button>
            </div>

            {items.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <FiInbox className="mx-auto text-slate-300 mb-3" size={32} />
                    <p className="text-slate-400 font-bold text-sm">No repeating tasks yet. Add daily reports, weekly checks or monthly duties here.</p>
                </div>
            ) : (
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
                                    <IconButton title="Edit" onClick={() => setEditing(t)}><FiEdit3 /></IconButton>
                                    <IconButton title="Remove" danger onClick={() => remove(t)}><FiTrash2 /></IconButton>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editing && (
                <RecurringForm
                    template={editing === "new" ? undefined : editing}
                    workflows={workflows}
                    team={team}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); load(); }}
                />
            )}
        </div>
    );
}

function IconButton({ children, onClick, title, danger }: { children: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
    return (
        <button onClick={onClick} title={title} className={`p-2.5 rounded-xl ${danger ? "text-rose-400 hover:bg-rose-50" : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"}`}>
            {children}
        </button>
    );
}

function RecurringForm({ template, workflows, team, onClose, onSaved }: {
    template?: RecurringTask;
    workflows: Workflow[];
    team: TeamMember[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const [title, setTitle] = useState(template?.title || "");
    const [description, setDescription] = useState(template?.description || "");
    const [category, setCategory] = useState(template?.category || "general");
    const [priority, setPriority] = useState<TaskPriority>(template?.priority || "normal");
    const [assignedTo, setAssignedTo] = useState(template?.assignedTo?._id || "");
    const [frequency, setFrequency] = useState<Frequency>(template?.frequency || "daily");
    const [weekday, setWeekday] = useState(template?.weekday ?? 1);
    const [dayOfMonth, setDayOfMonth] = useState(template?.dayOfMonth ?? 1);
    const [skipSundays, setSkipSundays] = useState(template?.skipSundays ?? true);
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

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!assignedTo) return toast.error("Choose who it's for.");
        const payload: RecurringInput = {
            title,
            description,
            category,
            priority,
            assignedTo,
            frequency,
            weekday: frequency === "weekly" ? weekday : undefined,
            dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
            skipSundays: frequency === "daily" ? skipSundays : false,
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
                    {frequency === "daily" && (
                        <label className="flex items-center gap-2 mt-6 text-sm font-bold text-slate-600">
                            <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={skipSundays} onChange={(e) => setSkipSundays(e.target.checked)} /> Skip Sundays
                        </label>
                    )}
                    <div>
                        <label className={labelClass}>Deadline time</label>
                        <input type="time" required className={inputClass} value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
                    </div>
                </div>

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
