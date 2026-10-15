"use client";

import { FormEvent, ReactNode, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FiPlus, FiTrash2, FiX } from "react-icons/fi";
import { createOwnTask, createTask, TaskDetail, TaskPriority, TeamMember, updateTask, Workflow } from "@/services/task.api";
import { splitDueAt, toDueAtIso, todayKey, tomorrowKey } from "@/utils/taskFormat";

interface Props {
    workflows: Workflow[];
    team: TeamMember[];
    // Editing an existing task; omitted when creating
    task?: TaskDetail;
    // Pre-selected assignee when creating (e.g. from a workload row)
    defaultAssignee?: string;
    // Shown under the title (the one-time / repeating switch on All Tasks)
    header?: ReactNode;
    // A team member adding a task for themselves: no assignee picker or
    // approval switch (the server assigns it to them and always requires approval)
    forSelf?: boolean;
    onClose: () => void;
    onSaved: () => void;
}

const inputClass = "w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-slate-700";
const labelClass = "text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1 block";

// Admin form to assign a new task (to one or several people) or edit one.
export default function TaskFormModal({ workflows, team, task, defaultAssignee, header, forSelf = false, onClose, onSaved }: Props) {
    const editing = Boolean(task);
    const initialDue = task ? splitDueAt(task.dueAt) : null;

    const [title, setTitle] = useState(task?.title || "");
    const [description, setDescription] = useState(task?.description || "");
    const [category, setCategory] = useState(task?.category || "general");
    const [priority, setPriority] = useState<TaskPriority>(task?.priority || "normal");
    const [assignees, setAssignees] = useState<string[]>(
        task ? [task.assignedTo._id] : defaultAssignee ? [defaultAssignee] : []
    );
    const [day, setDay] = useState(task?.scheduledFor || todayKey());
    const [dueDay, setDueDay] = useState(initialDue?.day || todayKey());
    // 6 PM by default; late in the day, end of day so today's deadline isn't already past
    const [dueTime, setDueTime] = useState(initialDue?.time || (new Date().getHours() >= 17 ? "23:59" : "18:00"));
    const [requiresApproval, setRequiresApproval] = useState(task?.requiresApproval ?? true);
    const [checklist, setChecklist] = useState<{ _id?: string; text: string }[]>(
        task ? task.checklist.map((i) => ({ _id: i._id, text: i.text })) : []
    );
    const [saving, setSaving] = useState(false);

    // Only active people can be given new work (the current assignee stays listed)
    const assignable = useMemo(
        () => team.filter((m) => m.status === "active" || assignees.includes(m._id)),
        [team, assignees]
    );

    const changeCategory = (key: string) => {
        setCategory(key);
        // New tasks start from the workflow's checklist template
        if (!editing) {
            const template = workflows.find((w) => w.key === key)?.checklist || [];
            setChecklist(template.map((text) => ({ text })));
        }
    };

    const pickDay = (key: string) => {
        setDay(key);
        // Keep the deadline on or after the task day
        if (dueDay < key) setDueDay(key);
    };

    const toggleAssignee = (id: string) => {
        if (editing) return setAssignees([id]);
        setAssignees((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!forSelf && assignees.length === 0) return toast.error("Choose who the task is for.");
        if (dueDay < day) return toast.error("The deadline can't be before the task day.");

        const payload = {
            title,
            description,
            category,
            priority,
            scheduledFor: day,
            dueAt: toDueAtIso(dueDay, dueTime),
            requiresApproval,
            checklist: checklist.filter((i) => i.text.trim()),
        };

        setSaving(true);
        try {
            if (forSelf) {
                // requiresApproval is ignored here: the server always requires it
                await createOwnTask(payload);
                toast.success("Task added");
            } else if (task) {
                await updateTask(task._id, { ...payload, assignedTo: assignees[0] });
                toast.success("Task updated");
            } else {
                const created = await createTask({ ...payload, assignedTo: assignees });
                toast.success(created.length > 1 ? `${created.length} tasks assigned` : "Task assigned");
            }
            onSaved();
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
                    <h2 className="text-xl font-black text-slate-800">{editing ? "Edit Task" : forSelf ? "Add a Task for Myself" : "Assign New Task"}</h2>
                    <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400"><FiX size={20} /></button>
                </div>
                {header}

                <div>
                    <label className={labelClass}>Title *</label>
                    <input required maxLength={150} className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Upload today's class recordings" />
                </div>

                <div>
                    <label className={labelClass}>Details</label>
                    <textarea rows={3} maxLength={4000} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What exactly needs to be done?" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Workflow</label>
                        <select className={inputClass} value={category} onChange={(e) => changeCategory(e.target.value)}>
                            {workflows.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
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

                {!forSelf && (
                    <div>
                        <label className={labelClass}>{editing ? "Assigned to *" : "Assign to * (pick one or more)"}</label>
                        <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100 max-h-40 overflow-y-auto">
                            {assignable.length === 0 && <p className="text-xs text-slate-400 font-bold">No active team members. Add staff from the Team page.</p>}
                            {assignable.map((m) => {
                                const selected = assignees.includes(m._id);
                                return (
                                    <button
                                        type="button"
                                        key={m._id}
                                        onClick={() => toggleAssignee(m._id)}
                                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${selected ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"}`}
                                    >
                                        {m.name} <span className={`uppercase text-[9px] ${selected ? "text-indigo-200" : "text-slate-400"}`}>{m.role}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div>
                    <label className={labelClass}>Task day *</label>
                    <div className="flex flex-wrap items-center gap-2">
                        {[{ k: todayKey(), l: "Today" }, { k: tomorrowKey(), l: "Tomorrow" }].map(({ k, l }) => (
                            <button
                                type="button"
                                key={l}
                                onClick={() => pickDay(k)}
                                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase ${day === k ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500 border border-slate-100"}`}
                            >
                                {l}
                            </button>
                        ))}
                        <input type="date" required className={`${inputClass} !w-auto`} value={day} onChange={(e) => e.target.value && pickDay(e.target.value)} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Deadline date *</label>
                        <input type="date" required min={day} className={inputClass} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
                    </div>
                    <div>
                        <label className={labelClass}>Deadline time *</label>
                        <input type="time" required className={inputClass} value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between">
                        <label className={labelClass}>Checklist steps</label>
                        <button type="button" onClick={() => setChecklist((c) => [...c, { text: "" }])} className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-1">
                            <FiPlus /> Add step
                        </button>
                    </div>
                    <div className="space-y-2">
                        {checklist.length === 0 && <p className="text-xs text-slate-400 font-semibold ml-1">No steps. The task is done in one go.</p>}
                        {checklist.map((item, i) => (
                            <div key={item._id || `new-${i}`} className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-300 w-5 text-right">{i + 1}.</span>
                                <input
                                    className={inputClass}
                                    maxLength={200}
                                    value={item.text}
                                    onChange={(e) => setChecklist((c) => c.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
                                />
                                <button type="button" onClick={() => setChecklist((c) => c.filter((_, j) => j !== i))} className="p-3 text-slate-300 hover:text-rose-500">
                                    <FiTrash2 />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {forSelf ? (
                    <p className="text-xs text-slate-400 font-semibold ml-1">This task is assigned to you. When you submit it, the admin will approve it.</p>
                ) : (
                    <label className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
                        <input type="checkbox" className="mt-1 h-4 w-4 accent-indigo-600" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} />
                        <span>
                            <span className="block text-sm font-bold text-slate-700">I approve completion</span>
                            <span className="block text-xs text-slate-400">When ticked, the team member&apos;s proof waits for your approval. Otherwise submitting completes the task.</span>
                        </span>
                    </label>
                )}

                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onClose} className="px-6 py-3.5 rounded-2xl font-bold text-sm text-slate-500 hover:bg-slate-50">Cancel</button>
                    <button type="submit" disabled={saving} className="px-6 py-3.5 rounded-2xl font-bold text-sm bg-indigo-600 text-white shadow-lg shadow-indigo-100 disabled:opacity-60">
                        {saving ? "Saving..." : editing ? "Save Changes" : forSelf ? "Add Task" : "Assign Task"}
                    </button>
                </div>
            </form>
        </div>
    );
}
