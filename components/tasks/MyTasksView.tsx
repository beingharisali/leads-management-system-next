"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FiAlertTriangle, FiArchive, FiCalendar, FiInbox, FiPlus, FiRefreshCw, FiSend, FiSun } from "react-icons/fi";
import { getTaskMeta, getTasks, TaskSummary, Workflow } from "@/services/task.api";
import { groupMyTasks } from "@/utils/taskFormat";
import Loading from "@/components/Loading";
import TaskCard from "./TaskCard";
import TaskFormModal from "./TaskFormModal";

type Tab = "today" | "overdue" | "upcoming" | "submitted" | "history";

const HISTORY_PAGE_SIZE = 25;
const REFRESH_MS = 60 * 1000;

// A team member's own work: what's due today (incl. unfinished work carried
// over), overdue, upcoming days, waiting for approval, and finished history.
// `basePath`: this portal's task pages, e.g. "/staff/tasks".
export default function MyTasksView({ basePath }: { basePath: string }) {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [open, setOpen] = useState<TaskSummary[]>([]);
    const [history, setHistory] = useState<TaskSummary[]>([]);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyPages, setHistoryPages] = useState(1);
    const [tab, setTab] = useState<Tab>("today");
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);

    const loadOpen = useCallback(async () => {
        try {
            const res = await getTasks({ scope: "open" });
            setOpen(res.data);
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadHistory = useCallback(async (page: number) => {
        try {
            const res = await getTasks({ scope: "history", page, limit: HISTORY_PAGE_SIZE });
            setHistory((prev) => (page === 1 ? res.data : [...prev, ...res.data]));
            setHistoryPage(page);
            setHistoryPages(res.pagination.pages);
        } catch (err) {
            toast.error((err as Error).message);
        }
    }, []);

    useEffect(() => {
        getTaskMeta().then((m) => setWorkflows(m.workflows)).catch(() => { });
        loadOpen();
        const interval = setInterval(loadOpen, REFRESH_MS);
        return () => clearInterval(interval);
    }, [loadOpen]);

    useEffect(() => {
        if (tab === "history" && history.length === 0) loadHistory(1);
    }, [tab, history.length, loadHistory]);

    const groups = useMemo(() => groupMyTasks(open), [open]);

    const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number; tone: string }[] = [
        { key: "today", label: "Today", icon: <FiSun />, count: groups.today.length, tone: "bg-blue-600" },
        { key: "overdue", label: "Overdue", icon: <FiAlertTriangle />, count: groups.overdue.length, tone: "bg-rose-500" },
        { key: "upcoming", label: "Upcoming", icon: <FiCalendar />, count: groups.upcoming.length, tone: "bg-slate-800" },
        { key: "submitted", label: "Awaiting Approval", icon: <FiSend />, count: groups.submitted.length, tone: "bg-purple-600" },
        { key: "history", label: "History", icon: <FiArchive />, tone: "bg-emerald-600" },
    ];

    const visible = tab === "history" ? history : groups[tab];

    const emptyText: Record<Tab, string> = {
        today: "Nothing due today. Nice work!",
        overdue: "No overdue tasks.",
        upcoming: "No tasks scheduled for upcoming days.",
        submitted: "Nothing waiting for approval.",
        history: "No completed tasks yet.",
    };

    if (loading) return <Loading />;

    return (
        <div>
            {groups.overdue.length > 0 && tab !== "overdue" && (
                <button
                    onClick={() => setTab("overdue")}
                    className="w-full mb-5 flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-5 py-4 text-sm font-bold text-left"
                >
                    <FiAlertTriangle className="shrink-0" />
                    You have {groups.overdue.length} overdue task{groups.overdue.length > 1 ? "s" : ""}. Please finish {groups.overdue.length > 1 ? "them" : "it"} first.
                </button>
            )}

            <div className="flex flex-wrap items-center gap-2 mb-6">
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wide flex items-center gap-2 transition-all ${tab === t.key ? `${t.tone} text-white shadow-lg` : "bg-white text-slate-500 border border-slate-100 hover:bg-slate-50"}`}
                    >
                        {t.icon} {t.label}
                        {t.count !== undefined && (
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] ${tab === t.key ? "bg-white/20" : "bg-slate-100"}`}>{t.count}</span>
                        )}
                    </button>
                ))}
                <button
                    onClick={() => setAdding(true)}
                    className="ml-auto px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wide flex items-center gap-2 bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                >
                    <FiPlus /> New Task
                </button>
                <button
                    onClick={() => { loadOpen(); if (tab === "history") loadHistory(1); }}
                    title="Refresh"
                    className="p-3 bg-white rounded-2xl border border-slate-100 text-slate-500 hover:bg-slate-50"
                >
                    <FiRefreshCw />
                </button>
            </div>

            {visible.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <FiInbox className="mx-auto text-slate-300 mb-3" size={32} />
                    <p className="text-slate-400 font-bold text-sm">{emptyText[tab]}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {visible.map((t) => (
                        <TaskCard key={t._id} task={t} href={`${basePath}/${t._id}`} workflows={workflows} />
                    ))}
                </div>
            )}

            {tab === "history" && historyPage < historyPages && (
                <button
                    onClick={() => loadHistory(historyPage + 1)}
                    className="mt-5 w-full py-3 bg-white border border-slate-100 rounded-2xl text-xs font-black uppercase text-slate-500 hover:bg-slate-50"
                >
                    Load more
                </button>
            )}

            {adding && (
                <TaskFormModal
                    workflows={workflows}
                    team={[]}
                    forSelf
                    onClose={() => setAdding(false)}
                    onSaved={() => { setAdding(false); loadOpen(); }}
                />
            )}
        </div>
    );
}
