import Link from "next/link";
import { FiCalendar, FiCheckSquare, FiClock, FiRepeat, FiUser } from "react-icons/fi";
import type { TaskSummary, Workflow } from "@/services/task.api";
import { deadlineLabel, formatDateTime, formatDayKey, workflowLabel } from "@/utils/taskFormat";
import { CategoryBadge, PriorityBadge, StatusBadge } from "./TaskBadges";

// One task row in any list. `href` is the task's detail page.
export default function TaskCard({
    task,
    href,
    workflows,
    showAssignee = false,
}: {
    task: TaskSummary;
    href: string;
    workflows: Workflow[];
    showAssignee?: boolean;
}) {
    const closed = task.status === "completed" || task.status === "cancelled";

    return (
        <Link
            href={href}
            className={`block bg-white rounded-3xl border p-5 hover:shadow-lg hover:shadow-slate-100 transition-all ${task.isOverdue ? "border-rose-200" : "border-slate-100"}`}
        >
            <div className="flex flex-wrap items-center gap-2 mb-2">
                <StatusBadge status={task.status} overdue={task.isOverdue} />
                <CategoryBadge label={workflowLabel(task.category, workflows)} />
                <PriorityBadge priority={task.priority} />
                {task.selfAssigned && (
                    <span className="text-[10px] font-black uppercase text-indigo-400 flex items-center gap-1"><FiUser /> Self-added</span>
                )}
                {task.recurring && (
                    <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1"><FiRepeat /> Repeating</span>
                )}
            </div>

            <p className="font-black text-slate-800 text-base">{task.title}</p>

            {task.status === "blocked" && task.blockedReason && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mt-2">🚧 {task.blockedReason}</p>
            )}

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-3 text-[11px] font-bold text-slate-400">
                {showAssignee && (
                    <span className="flex items-center gap-1.5 text-slate-600">
                        <FiUser /> {task.assignedTo?.name}
                        <span className="uppercase text-[9px] text-slate-400">({task.assignedTo?.role})</span>
                    </span>
                )}
                <span className="flex items-center gap-1.5"><FiCalendar /> {formatDayKey(task.scheduledFor)}</span>
                <span className={`flex items-center gap-1.5 ${task.isOverdue ? "text-rose-600" : ""}`}>
                    <FiClock /> {formatDateTime(task.dueAt)}
                    {!closed && task.status !== "submitted" && <span>· {deadlineLabel(task.dueAt)}</span>}
                </span>
                {task.checklistTotal > 0 && (
                    <span className="flex items-center gap-1.5"><FiCheckSquare /> {task.checklistDone}/{task.checklistTotal} steps</span>
                )}
                {closed && task.missedDeadline && <span className="text-rose-500">Deadline was missed</span>}
                {task.status === "completed" && task.completedAt && <span className="text-emerald-600">Completed {formatDateTime(task.completedAt)}</span>}
            </div>
        </Link>
    );
}
