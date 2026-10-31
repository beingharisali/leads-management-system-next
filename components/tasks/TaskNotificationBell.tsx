"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FiBell, FiCheck } from "react-icons/fi";
import { AppNotification, getNotifications, markAllNotificationsRead, markNotificationRead } from "@/services/task.api";
import { formatDateTime } from "@/utils/taskFormat";

const POLL_MS = 30 * 1000;

const TYPE_ICONS: Record<AppNotification["type"], string> = {
    task_assigned: "📋",
    task_overdue: "⏰",
    task_submitted: "📨",
    task_approved: "✅",
    task_rejected: "↩️",
    task_blocked: "🚧",
    task_cancelled: "✖️",
    task_self_created: "📝",
    complaint_filed: "📣",
    complaint_replied: "💬",
};

// A new complaint goes to the admin's complaints page; a reply to the
// complainant's own list in their portal.
const complaintPath = (n: AppNotification) => {
    if (n.type === "complaint_filed") return `/admin/complaints?open=${n.complaint}`;
    return localStorage.getItem("role") === "csr" ? "/csr/complaints" : "/staff/complaints";
};

// Task notifications (overdue deadlines, submissions, approvals...). Polls
// while the tab is on screen and pops a toast for anything new.
// `taskBasePath`: where task pages live for this portal, e.g. "/admin/tasks".
export default function TaskNotificationBell({ taskBasePath }: { taskBasePath: string }) {
    const router = useRouter();
    const [items, setItems] = useState<AppNotification[]>([]);
    const [unread, setUnread] = useState(0);
    const [open, setOpen] = useState(false);
    const seenRef = useRef<Set<string> | null>(null);
    const boxRef = useRef<HTMLDivElement>(null);

    const load = useCallback(
        () =>
            getNotifications()
                .then((data) => {
                    setItems(data.items);
                    setUnread(data.unread);

                    // Announce unread notifications that arrived since the last poll
                    const seen = seenRef.current;
                    const fresh = seen ? data.items.filter((n) => !n.read && !seen.has(n._id)) : [];
                    seenRef.current = new Set(data.items.map((n) => n._id));
                    fresh.slice(0, 3).forEach((n) =>
                        toast(n.message, { icon: TYPE_ICONS[n.type], duration: 8000, position: "top-center" })
                    );
                })
                .catch(() => { /* keep the last known list */ }),
        []
    );

    useEffect(() => {
        const isVisible = () => document.visibilityState === "visible";
        const onVisibility = () => { if (isVisible()) load(); };
        load();
        const interval = setInterval(() => { if (isVisible()) load(); }, POLL_MS);
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [load]);

    // Close when clicking outside
    useEffect(() => {
        if (!open) return;
        const onClick = (e: MouseEvent) => {
            if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [open]);

    const openNotification = async (n: AppNotification) => {
        setOpen(false);
        if (!n.read) {
            setItems((prev) => prev.map((i) => (i._id === n._id ? { ...i, read: true } : i)));
            setUnread((u) => Math.max(0, u - 1));
            markNotificationRead(n._id).catch(() => { });
        }
        if (n.task) router.push(`${taskBasePath}/${n.task}`);
        else if (n.complaint) router.push(complaintPath(n));
    };

    const readAll = async () => {
        setItems((prev) => prev.map((i) => ({ ...i, read: true })));
        setUnread(0);
        markAllNotificationsRead().catch(() => { });
    };

    return (
        <div className="relative" ref={boxRef}>
            <button
                onClick={() => setOpen((o) => !o)}
                title="Task notifications"
                className="relative p-3.5 bg-white text-slate-600 rounded-2xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all"
            >
                <FiBell size={20} />
                {unread > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                        {unread > 99 ? "99+" : unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-[340px] max-h-[460px] overflow-hidden bg-white rounded-3xl shadow-2xl border border-slate-100 z-[200] flex flex-col">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                        <p className="font-black text-slate-800 text-sm">Task Notifications</p>
                        {unread > 0 && (
                            <button onClick={readAll} className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-1">
                                <FiCheck /> Mark all read
                            </button>
                        )}
                    </div>
                    <div className="overflow-y-auto">
                        {items.length === 0 ? (
                            <p className="text-center text-slate-400 text-xs font-bold py-10">No notifications yet</p>
                        ) : (
                            items.map((n) => (
                                <button
                                    key={n._id}
                                    onClick={() => openNotification(n)}
                                    className={`w-full text-left px-5 py-3 border-b border-slate-50 hover:bg-slate-50 flex gap-3 ${n.read ? "opacity-60" : ""}`}
                                >
                                    <span className="text-lg leading-none mt-0.5">{TYPE_ICONS[n.type]}</span>
                                    <span className="flex-1 min-w-0">
                                        <span className={`block text-xs text-slate-700 ${n.read ? "" : "font-bold"}`}>{n.message}</span>
                                        <span className="block text-[10px] text-slate-400 mt-1">{formatDateTime(n.createdAt)}</span>
                                    </span>
                                    {!n.read && <span className="h-2 w-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
