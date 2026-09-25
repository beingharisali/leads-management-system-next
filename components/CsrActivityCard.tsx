"use client";

import { useEffect, useState } from "react";
import { FiClock, FiLogIn, FiSun } from "react-icons/fi";
import { getCsrActivity, CsrActivity } from "@/services/activity.api";

// Short, so the admin sees "Offline" within seconds of the CSR leaving
const REFRESH_MS = 10 * 1000;

const formatDuration = (totalSeconds: number) => {
    const s = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const formatShort = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const formatTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "-";

// Admin-only: how long this CSR has had their portal open on screen today.
// Ticks live only while the CSR's window is on screen; freezes the moment
// they minimise/close it. Re-syncs with the server every 10s.
export default function CsrActivityCard({ csrId }: { csrId: string }) {
    const [activity, setActivity] = useState<CsrActivity | null>(null);
    const [fetchedAt, setFetchedAt] = useState(() => Date.now());
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        let cancelled = false;
        const load = () =>
            getCsrActivity(csrId, 7)
                .then(data => {
                    if (cancelled) return;
                    setActivity(data);
                    setFetchedAt(Date.now());
                })
                .catch(() => { /* keep showing the last known value */ });

        load();
        const refresh = setInterval(load, REFRESH_MS);
        const tick = setInterval(() => setNow(Date.now()), 1000);
        return () => { cancelled = true; clearInterval(refresh); clearInterval(tick); };
    }, [csrId]);

    if (!activity) return null;

    // The server has credited time up to the CSR's last ping. While they're
    // still on screen, add the time since that ping - measured from the
    // server's clock, so a page reload shows the same value, not a jump.
    const sinceLastPing = activity.isOnline && activity.lastSeenAt
        ? (new Date(activity.serverTime).getTime() - new Date(activity.lastSeenAt).getTime()) / 1000 + (now - fetchedAt) / 1000
        : 0;
    const liveExtra = Math.min(Math.max(sinceLastPing, 0), activity.onlineWindowSeconds);
    const todaySeconds = activity.today.activeSeconds + liveExtra;
    const pastDays = activity.history.slice(1);

    return (
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col lg:flex-row lg:items-center gap-5">
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600"><FiClock size={22} /></div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Portal time today</p>
                    <p className="text-2xl font-black text-slate-900 tabular-nums">{formatDuration(todaySeconds)}</p>
                </div>
                <span className={`ml-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full ${activity.isOnline ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                    <span className={`h-2 w-2 rounded-full ${activity.isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
                    {activity.isOnline
                        ? "Online"
                        : activity.lastSeenAt
                            ? `Offline · last seen ${new Date(activity.lastSeenAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" })}`
                            : "Never active"}
                </span>
            </div>

            <div className="flex flex-wrap gap-6 text-xs lg:border-l lg:border-slate-100 lg:pl-6">
                <div>
                    <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400"><FiLogIn size={10} /> Logged in</p>
                    <p className="font-bold text-slate-700">{formatTime(activity.today.lastLoginAt)}</p>
                </div>
                <div>
                    <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400"><FiSun size={10} /> First active</p>
                    <p className="font-bold text-slate-700">{formatTime(activity.today.firstSeenAt)}</p>
                </div>
            </div>

            <div className="lg:ml-auto">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Previous days</p>
                <div className="flex flex-wrap gap-1.5">
                    {pastDays.map(d => (
                        <span key={d.day} className="text-[10px] font-bold bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-slate-600">
                            {new Date(`${d.day}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit" })} · {formatShort(d.activeSeconds)}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}
