import type { TaskStatus, TaskPriority, TaskSummary } from "@/services/task.api";

export const STATUS_LABELS: Record<TaskStatus, string> = {
    todo: "To Do",
    in_progress: "In Progress",
    blocked: "Blocked",
    submitted: "Awaiting Approval",
    completed: "Completed",
    cancelled: "Cancelled",
};

export const STATUS_CLASSES: Record<TaskStatus, string> = {
    todo: "bg-slate-100 text-slate-600",
    in_progress: "bg-blue-50 text-blue-600",
    blocked: "bg-amber-50 text-amber-700",
    submitted: "bg-purple-50 text-purple-600",
    completed: "bg-emerald-50 text-emerald-600",
    cancelled: "bg-slate-100 text-slate-400 line-through",
};

export const PRIORITY_CLASSES: Record<TaskPriority, string> = {
    low: "bg-slate-50 text-slate-400",
    normal: "bg-sky-50 text-sky-600",
    high: "bg-rose-50 text-rose-600",
};

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const pad = (n: number) => String(n).padStart(2, "0");

// "YYYY-MM-DD" of a date in the browser's time zone
export const dayKeyOf = (date: Date = new Date()) =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const todayKey = () => dayKeyOf(new Date());
export const tomorrowKey = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return dayKeyOf(d);
};

// Deadline from a day key + "HH:mm" in the browser's time zone, as ISO
export const toDueAtIso = (day: string, time: string) => {
    const [y, m, d] = day.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm).toISOString();
};

// ISO deadline -> { day, time } for editing
export const splitDueAt = (iso: string) => {
    const d = new Date(iso);
    return { day: dayKeyOf(d), time: `${pad(d.getHours())}:${pad(d.getMinutes())}` };
};

export const formatDayKey = (key: string) => {
    if (key === todayKey()) return "Today";
    if (key === tomorrowKey()) return "Tomorrow";
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
};

export const formatDateTime = (iso?: string) =>
    iso
        ? new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit", hour12: true })
        : "-";

// "in 3h", "2d overdue" ...
export const deadlineLabel = (iso: string) => {
    const diff = new Date(iso).getTime() - Date.now();
    const abs = Math.abs(diff);
    const mins = Math.round(abs / 60000);
    const span = mins < 60 ? `${mins}m` : mins < 48 * 60 ? `${Math.round(mins / 60)}h` : `${Math.round(mins / 1440)}d`;
    return diff >= 0 ? `due in ${span}` : `${span} overdue`;
};

export const workflowLabel = (key: string, workflows: { key: string; label: string }[]) =>
    workflows.find((w) => w.key === key)?.label || key;

// Open tasks grouped the way a team member works through them
export const groupMyTasks = (tasks: TaskSummary[]) => {
    const today = todayKey();
    return {
        overdue: tasks.filter((t) => t.isOverdue),
        today: tasks.filter((t) => !t.isOverdue && t.status !== "submitted" && t.scheduledFor <= today),
        upcoming: tasks.filter((t) => !t.isOverdue && t.status !== "submitted" && t.scheduledFor > today),
        submitted: tasks.filter((t) => t.status === "submitted"),
    };
};

export const formatBytes = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
