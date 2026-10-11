"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { FiInbox, FiPlus, FiSearch } from "react-icons/fi";
import { getTaskMeta, getTasks, getTeam, TaskSummary, TeamMember, Workflow } from "@/services/task.api";
import { STATUS_LABELS } from "@/utils/taskFormat";
import Loading from "@/components/Loading";
import TaskCard from "@/components/tasks/TaskCard";
import TaskFormModal from "@/components/tasks/TaskFormModal";

const PAGE_SIZE = 25;
const selectClass = "p-3 bg-white border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 outline-none";

// Every task, filterable by person, workflow, status, open/history. Filters
// live in the URL so dashboard links (e.g. "Overdue") open pre-filtered.
function TaskListPage() {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();

    const scope = (params.get("scope") as "open" | "history" | "all") || "open";
    const assignedTo = params.get("assignedTo") || "";
    const category = params.get("category") || "";
    const status = params.get("status") || "";
    const overdue = params.get("overdue") === "1";
    const q = params.get("q") || "";

    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [tasks, setTasks] = useState<TaskSummary[]>([]);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState(q);
    const [creating, setCreating] = useState(false);

    const setFilter = (key: string, value: string) => {
        const next = new URLSearchParams(params.toString());
        if (value) next.set(key, value); else next.delete(key);
        // Choosing a status or scope clears the conflicting quick filter
        if (key === "status" || key === "scope") next.delete("overdue");
        if (key === "scope") next.delete("status");
        router.replace(`${pathname}?${next.toString()}`);
    };

    const load = useCallback(async (pageToLoad: number) => {
        setLoading(true);
        try {
            const res = await getTasks({ scope, assignedTo, category, status, overdue, q, page: pageToLoad, limit: PAGE_SIZE });
            setTasks((prev) => (pageToLoad === 1 ? res.data : [...prev, ...res.data]));
            setPage(pageToLoad);
            setPages(res.pagination.pages);
            setTotal(res.pagination.total);
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [scope, assignedTo, category, status, overdue, q]);

    useEffect(() => { load(1); }, [load]);
    useEffect(() => {
        getTaskMeta().then((m) => setWorkflows(m.workflows)).catch(() => { });
        getTeam().then(setTeam).catch(() => { });
    }, []);

    // Debounced search box -> URL
    useEffect(() => {
        if (search === q) return;
        const t = setTimeout(() => setFilter("q", search.trim()), 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const statusOptions = scope === "history" ? ["completed", "cancelled"] : scope === "open" ? ["todo", "in_progress", "blocked", "submitted"] : Object.keys(STATUS_LABELS);

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div>
                    <h2 className="text-2xl font-black text-slate-900">All Tasks</h2>
                    <p className="text-sm text-slate-400 font-medium">{total} task{total === 1 ? "" : "s"}{overdue ? " overdue" : ""}</p>
                </div>
                <button onClick={() => setCreating(true)} className="px-5 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-indigo-100"><FiPlus /> Assign Task</button>
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-6 bg-white p-3 rounded-[1.5rem] border border-slate-100">
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                    {(["open", "history", "all"] as const).map((s) => (
                        <button key={s} onClick={() => setFilter("scope", s === "open" ? "" : s)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase ${scope === s ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"}`}>
                            {s === "open" ? "Open" : s === "history" ? "History" : "All"}
                        </button>
                    ))}
                </div>
                <select className={selectClass} value={assignedTo} onChange={(e) => setFilter("assignedTo", e.target.value)}>
                    <option value="">Everyone</option>
                    {team.map((m) => <option key={m._id} value={m._id}>{m.name} ({m.role})</option>)}
                </select>
                <select className={selectClass} value={category} onChange={(e) => setFilter("category", e.target.value)}>
                    <option value="">All workflows</option>
                    {workflows.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
                </select>
                <select className={selectClass} value={status} onChange={(e) => setFilter("status", e.target.value)}>
                    <option value="">Any status</option>
                    {statusOptions.map((s) => <option key={s} value={s}>{STATUS_LABELS[s as keyof typeof STATUS_LABELS]}</option>)}
                </select>
                <button
                    onClick={() => setFilter("overdue", overdue ? "" : "1")}
                    className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase ${overdue ? "bg-rose-500 text-white" : "bg-rose-50 text-rose-600"}`}
                >
                    Overdue only
                </button>
                <div className="relative flex-1 min-w-[180px]">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search titles..." className="w-full pl-10 pr-3 py-3 bg-slate-50 rounded-2xl text-xs font-bold outline-none" />
                </div>
            </div>

            {loading && page === 1 ? (
                <Loading />
            ) : tasks.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <FiInbox className="mx-auto text-slate-300 mb-3" size={32} />
                    <p className="text-slate-400 font-bold text-sm">No tasks match these filters.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {tasks.map((t) => <TaskCard key={t._id} task={t} href={`/admin/tasks/${t._id}`} workflows={workflows} showAssignee />)}
                </div>
            )}

            {page < pages && (
                <button disabled={loading} onClick={() => load(page + 1)} className="mt-5 w-full py-3 bg-white border border-slate-100 rounded-2xl text-xs font-black uppercase text-slate-500 hover:bg-slate-50">
                    {loading ? "Loading..." : "Load more"}
                </button>
            )}

            {creating && (
                <TaskFormModal
                    workflows={workflows}
                    team={team}
                    defaultAssignee={assignedTo || undefined}
                    onClose={() => setCreating(false)}
                    onSaved={() => { setCreating(false); load(1); }}
                />
            )}
        </div>
    );
}

export default function AdminTaskListPage() {
    return (
        <Suspense fallback={<Loading />}>
            <TaskListPage />
        </Suspense>
    );
}
