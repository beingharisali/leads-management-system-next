"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { FiAlertOctagon, FiAlertTriangle, FiCheckCircle, FiClock, FiInbox, FiLayers, FiPlus, FiRefreshCw, FiSend } from "react-icons/fi";
import { getTaskDashboard, getTaskMeta, getTeam, TaskDashboard, TaskSummary, TeamMember, Workflow } from "@/services/task.api";
import Loading from "@/components/Loading";
import TaskCard from "@/components/tasks/TaskCard";
import TaskFormModal from "@/components/tasks/TaskFormModal";

const REFRESH_MS = 60 * 1000;

// Management dashboard: overdue work, blocked work, approvals waiting, each
// person's workload and progress per institute workflow.
export default function AdminTasksDashboard() {
    const [data, setData] = useState<TaskDashboard | null>(null);
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [creatingFor, setCreatingFor] = useState<string | null>(null); // "" = no preselected person

    const load = useCallback(
        () => getTaskDashboard().then(setData).catch((err: Error) => { toast.error(err.message); }),
        []
    );

    useEffect(() => {
        load();
        getTaskMeta().then((m) => setWorkflows(m.workflows)).catch(() => { });
        getTeam().then(setTeam).catch(() => { });
        const interval = setInterval(() => { if (document.visibilityState === "visible") load(); }, REFRESH_MS);
        return () => clearInterval(interval);
    }, [load]);

    if (!data) return <Loading />;
    const { summary } = data;

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-2xl font-black text-slate-900">Management Dashboard</h2>
                    <p className="text-sm text-slate-400 font-medium">{summary.open} open tasks across the team</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={load} title="Refresh" className="p-3.5 bg-white rounded-2xl border border-slate-100 text-slate-500 hover:bg-slate-50"><FiRefreshCw /></button>
                    <button onClick={() => setCreatingFor("")} className="px-5 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-100"><FiPlus /> Assign Task</button>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <Stat label="Overdue" value={summary.overdue} icon={<FiAlertTriangle />} tone="rose" href="/admin/tasks/list?overdue=1" />
                <Stat label="Blocked" value={summary.blocked} icon={<FiAlertOctagon />} tone="amber" href="/admin/tasks/list?status=blocked" />
                <Stat label="Pending Approval" value={summary.pendingApprovals} icon={<FiSend />} tone="purple" href="/admin/tasks/list?status=submitted" />
                <Stat label="Due Today" value={summary.dueToday} icon={<FiClock />} tone="blue" />
                <Stat label="Open Tasks" value={summary.open} icon={<FiLayers />} tone="slate" href="/admin/tasks/list" />
                <Stat label="Done This Week" value={summary.completedThisWeek} icon={<FiCheckCircle />} tone="emerald" href="/admin/tasks/list?scope=history" />
            </div>

            {/* Attention lists */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <TaskColumn title="Overdue" tone="text-rose-600" tasks={data.overdueTasks} workflows={workflows} empty="Nothing overdue 🎉" />
                <TaskColumn title="Pending Approval" tone="text-purple-600" tasks={data.pendingApprovals} workflows={workflows} empty="No submissions waiting" />
                <TaskColumn title="Blocked" tone="text-amber-600" tasks={data.blockedTasks} workflows={workflows} empty="No one is blocked" />
            </div>

            {/* Workload */}
            <div className="bg-white rounded-[2rem] border border-slate-100 p-6 overflow-x-auto">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">Workload per person</p>
                {data.workload.length === 0 ? (
                    <p className="text-sm text-slate-400 font-bold py-6 text-center">No team members yet. <Link href="/admin/tasks/team" className="text-indigo-600">Add staff</Link></p>
                ) : (
                    <table className="w-full text-sm min-w-[760px]">
                        <thead>
                            <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400 text-left">
                                <th className="pb-3">Team member</th>
                                <th className="pb-3 text-center">Open</th>
                                <th className="pb-3 text-center">Due today</th>
                                <th className="pb-3 text-center">Overdue</th>
                                <th className="pb-3 text-center">Blocked</th>
                                <th className="pb-3 text-center">Awaiting approval</th>
                                <th className="pb-3 text-center">Done (7 days)</th>
                                <th className="pb-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.workload.map((w) => (
                                <tr key={w._id} className={`border-t border-slate-50 ${w.status === "inactive" ? "opacity-50" : ""}`}>
                                    <td className="py-3">
                                        <Link href={`/admin/tasks/list?assignedTo=${w._id}`} className="font-bold text-slate-800 hover:text-indigo-600">{w.name}</Link>
                                        <span className="ml-2 text-[9px] font-black uppercase text-slate-400">{w.role}{w.status === "inactive" ? " · inactive" : ""}</span>
                                    </td>
                                    <Cell value={w.open} />
                                    <Cell value={w.dueToday} />
                                    <Cell value={w.overdue} danger />
                                    <Cell value={w.blocked} warn />
                                    <Cell value={w.awaitingApproval} />
                                    <td className="py-3 text-center font-bold text-emerald-600">
                                        {w.completedThisWeek}
                                        {w.completedLateThisWeek > 0 && <span className="text-[10px] text-rose-500 font-black ml-1">({w.completedLateThisWeek} late)</span>}
                                    </td>
                                    <td className="py-3 text-right">
                                        {w.status === "active" && (
                                            <button onClick={() => setCreatingFor(w._id)} className="px-3 py-2 rounded-xl bg-slate-50 text-slate-600 text-[10px] font-black uppercase hover:bg-indigo-50 hover:text-indigo-600">+ Task</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Institute workflows */}
            <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4">Institute workflows</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {data.workflows.map((w) => {
                        const pct = w.checklistTotal ? Math.round((w.checklistDone / w.checklistTotal) * 100) : null;
                        return (
                            <Link key={w.key} href={`/admin/tasks/list?category=${w.key}`} className="bg-white rounded-3xl border border-slate-100 p-5 hover:shadow-lg hover:shadow-slate-100 transition-all">
                                <p className="font-black text-slate-800">{w.label}</p>
                                <div className="flex gap-4 mt-3 text-xs font-bold">
                                    <span className="text-slate-600">{w.open} open</span>
                                    {w.overdue > 0 && <span className="text-rose-600">{w.overdue} overdue</span>}
                                    {w.blocked > 0 && <span className="text-amber-600">{w.blocked} blocked</span>}
                                </div>
                                {pct !== null && (
                                    <div className="mt-3">
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} /></div>
                                        <p className="text-[10px] text-slate-400 font-bold mt-1">{pct}% of open checklist steps done</p>
                                    </div>
                                )}
                                <p className="text-[10px] text-emerald-600 font-black uppercase mt-3">{w.completedLast30Days} completed in 30 days</p>
                            </Link>
                        );
                    })}
                </div>
            </div>

            {creatingFor !== null && (
                <TaskFormModal
                    workflows={workflows}
                    team={team}
                    defaultAssignee={creatingFor || undefined}
                    onClose={() => setCreatingFor(null)}
                    onSaved={() => { setCreatingFor(null); load(); }}
                />
            )}
        </div>
    );
}

const TONES: Record<string, string> = {
    rose: "text-rose-600 bg-rose-50",
    amber: "text-amber-600 bg-amber-50",
    purple: "text-purple-600 bg-purple-50",
    blue: "text-blue-600 bg-blue-50",
    slate: "text-slate-600 bg-slate-100",
    emerald: "text-emerald-600 bg-emerald-50",
};

function Stat({ label, value, icon, tone, href }: { label: string; value: number; icon: React.ReactNode; tone: string; href?: string }) {
    const body = (
        <div className="bg-white rounded-3xl border border-slate-100 p-5 h-full hover:shadow-lg hover:shadow-slate-100 transition-all">
            <span className={`inline-flex p-2.5 rounded-xl ${TONES[tone]}`}>{icon}</span>
            <p className="text-3xl font-black text-slate-900 mt-3">{value}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        </div>
    );
    return href ? <Link href={href}>{body}</Link> : body;
}

function Cell({ value, danger, warn }: { value: number; danger?: boolean; warn?: boolean }) {
    const color = value > 0 && danger ? "text-rose-600" : value > 0 && warn ? "text-amber-600" : value > 0 ? "text-slate-800" : "text-slate-300";
    return <td className={`py-3 text-center font-black ${color}`}>{value}</td>;
}

function TaskColumn({ title, tone, tasks, workflows, empty }: { title: string; tone: string; tasks: TaskSummary[]; workflows: Workflow[]; empty: string }) {
    return (
        <div className="bg-slate-50/60 rounded-[2rem] border border-slate-100 p-4">
            <p className={`text-[11px] font-black uppercase tracking-widest mb-3 px-1 ${tone}`}>{title} · {tasks.length}</p>
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {tasks.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs font-bold"><FiInbox className="mx-auto mb-2" size={22} />{empty}</div>
                ) : (
                    tasks.map((t) => <TaskCard key={t._id} task={t} href={`/admin/tasks/${t._id}`} workflows={workflows} showAssignee />)
                )}
            </div>
        </div>
    );
}
