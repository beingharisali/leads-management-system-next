"use client";

import { useEffect, useState } from "react";
import { FiClock } from "react-icons/fi";
import { getMyActivity, CsrActivity } from "@/services/activity.api";
import { formatDuration, liveTodaySeconds } from "@/utils/activityTime";

const REFRESH_MS = 30 * 1000;
// Give ActivityTracker's "resume" ping a moment to land first, so the
// server already sees this CSR as online when we fetch.
const AFTER_RESUME_MS = 1500;

const formatTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "-";

// CSR's own view of today's portal time - the same number the admin sees.
// Counts only while the portal is on screen; resets each day.
export default function MyActivityTimer() {
    const [activity, setActivity] = useState<CsrActivity | null>(null);
    const [fetchedAt, setFetchedAt] = useState(() => Date.now());
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        let cancelled = false;
        let pending: ReturnType<typeof setTimeout> | undefined;

        const load = () =>
            getMyActivity()
                .then(data => {
                    if (cancelled) return;
                    setActivity(data);
                    setFetchedAt(Date.now());
                })
                .catch(() => { /* keep showing the last known value */ });

        const loadSoon = () => {
            clearTimeout(pending);
            pending = setTimeout(load, AFTER_RESUME_MS);
        };
        const onVisibilityChange = () => { if (document.visibilityState === "visible") loadSoon(); };

        loadSoon();
        const refresh = setInterval(() => { if (document.visibilityState === "visible") load(); }, REFRESH_MS);
        const tick = setInterval(() => setNow(Date.now()), 1000);
        document.addEventListener("visibilitychange", onVisibilityChange);
        return () => {
            cancelled = true;
            clearTimeout(pending);
            clearInterval(refresh);
            clearInterval(tick);
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, []);

    if (!activity) return null;

    return (
        <div className="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-2.5 w-fit">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600"><FiClock size={16} /></div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">My time today</p>
                <p className="text-lg font-black text-slate-900 tabular-nums leading-tight">
                    {formatDuration(liveTodaySeconds(activity, fetchedAt, now))}
                </p>
            </div>
            <div className="pl-3 ml-1 border-l border-slate-100 text-[10px] font-bold text-slate-500 leading-relaxed">
                <div>Logged in <span className="text-slate-700">{formatTime(activity.today.lastLoginAt)}</span></div>
                <div>First active <span className="text-slate-700">{formatTime(activity.today.firstSeenAt)}</span></div>
            </div>
        </div>
    );
}
