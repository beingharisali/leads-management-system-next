import type { TaskPriority, TaskStatus } from "@/services/task.api";
import { PRIORITY_CLASSES, STATUS_CLASSES, STATUS_LABELS } from "@/utils/taskFormat";

export function StatusBadge({ status, overdue }: { status: TaskStatus; overdue?: boolean }) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${STATUS_CLASSES[status]}`}>
                {STATUS_LABELS[status]}
            </span>
            {overdue && (
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide bg-rose-500 text-white">
                    Overdue
                </span>
            )}
        </span>
    );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
    if (priority === "normal") return null;
    return (
        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${PRIORITY_CLASSES[priority]}`}>
            {priority} priority
        </span>
    );
}

export function CategoryBadge({ label }: { label: string }) {
    return (
        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide bg-indigo-50 text-indigo-600">
            {label}
        </span>
    );
}
