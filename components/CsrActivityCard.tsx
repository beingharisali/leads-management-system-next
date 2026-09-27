"use client";

import { useEffect, useState } from "react";
import { FiClock, FiLogIn, FiSun, FiChevronLeft, FiChevronRight, FiCalendar } from "react-icons/fi";
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

// "YYYY-MM" / "YYYY-MM-DD" in local time - matches the server's day keys
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const dayKeyOf = (d: Date) => `${monthKey(d)}-${String(d.getDate()).padStart(2, "0")}`;

const shiftMonth = (key: string, delta: number) => {
    const [y, m] = key.split("-").map(Number);
    return monthKey(new Date(y, m - 1 + delta, 1));
};

// CSRs work all 7 days, so the calendar shows every weekday
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Heavier shade = more time on the portal that day
const dayShade = (seconds: number) =>
    seconds <= 0 ? "bg-slate-50 text-slate-300" :
    seconds < 2 * 3600 ? "bg-indigo-50 text-indigo-700" :
    seconds < 5 * 3600 ? "bg-indigo-100 text-indigo-800" :
    "bg-indigo-200 text-indigo-900";

// Admin-only: how long this CSR has had their portal open on screen today,
// plus a calendar of every day of the selected month. Today's timer ticks
// live only while the CSR's window is on screen and freezes the moment
// they minimise/close it. Re-syncs with the server every 10s.
export default function CsrActivityCard({ csrId }: { csrId: string }) {
    const [activity, setActivity] = useState<CsrActivity | null>(null);
    const [fetchedAt, setFetchedAt] = useState(() => Date.now());
    const [now, setNow] = useState(() => Date.now());
    const currentMonth = monthKey(new Date());
    const [month, setMonth] = useState(currentMonth);

    useEffect(() => {
        let cancelled = false;
        const load = () =>
            getCsrActivity(csrId, month)
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
    }, [csrId, month]);

    if (!activity) return null;

    // The server has credited time up to the CSR's last ping. While they're
    // still on screen, add the time since that ping - measured from the
    // server's clock, so a page reload shows the same value, not a jump.
    const sinceLastPing = activity.isOnline && activity.lastSeenAt
        ? (new Date(activity.serverTime).getTime() - new Date(activity.lastSeenAt).getTime()) / 1000 + (now - fetchedAt) / 1000
        : 0;
    const liveExtra = Math.min(Math.max(sinceLastPing, 0), activity.onlineWindowSeconds);
    const todaySeconds = activity.today.activeSeconds + liveExtra;

    // Month calendar: Monday-first grid; today's cell uses the live value
    const todayKey = activity.today.day;
    const secondsByDay: Record<string, number> = Object.fromEntries(
        activity.history.map(d => [d.day, d.day === todayKey ? todaySeconds : d.activeSeconds])
    );
    const [year, monthNum] = month.split("-").map(Number);
    const firstDay = new Date(year, monthNum - 1, 1);
    const leadingBlanks = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const monthDays = Array.from({ length: daysInMonth }, (_, i) => dayKeyOf(new Date(year, monthNum - 1, i + 1)));

    const workedDays = Object.values(secondsByDay).filter(s => s > 0);
    const monthTotal = workedDays.reduce((sum, s) => sum + s, 0);
    const monthAverage = workedDays.length ? monthTotal / workedDays.length : 0;

    return (
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-5">
            <div className="flex flex-col lg:flex-row lg:items-center gap-5">
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

                <div className="lg:ml-auto flex flex-wrap gap-6 text-xs lg:border-l lg:border-slate-100 lg:pl-6">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Month total</p>
                        <p className="font-bold text-slate-700">{formatShort(monthTotal)}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Days active</p>
                        <p className="font-bold text-slate-700">{workedDays.length} / {activity.history.length}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Avg / active day</p>
                        <p className="font-bold text-slate-700">{formatShort(monthAverage)}</p>
                    </div>
                </div>
            </div>

            {/* Whole-month calendar */}
            <div className="border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between mb-3">
                    <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <FiCalendar size={11} /> Monthly portal time
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setMonth(m => shiftMonth(m, -1))}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                            title="Previous month"
                        >
                            <FiChevronLeft size={14} />
                        </button>
                        <span className="text-xs font-bold text-slate-700 w-28 text-center">
                            {firstDay.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                        </span>
                        <button
                            onClick={() => setMonth(m => shiftMonth(m, 1))}
                            disabled={month >= currentMonth}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30 disabled:hover:bg-transparent"
                            title="Next month"
                        >
                            <FiChevronRight size={14} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                    {WEEKDAYS.map(w => (
                        <div key={w} className="text-center text-[10px] font-black uppercase tracking-wider text-slate-400 pb-1">{w}</div>
                    ))}
                    {Array.from({ length: leadingBlanks }, (_, i) => <div key={`blank-${i}`} />)}
                    {monthDays.map(day => {
                        const isFuture = day > todayKey;
                        const seconds = secondsByDay[day] || 0;
                        return (
                            <div
                                key={day}
                                className={`rounded-lg px-2 py-1.5 text-center ${isFuture ? "border border-dashed border-slate-100 text-slate-300" : dayShade(seconds)} ${day === todayKey ? "ring-2 ring-indigo-500" : ""}`}
                            >
                                <div className="text-[10px] font-bold opacity-70">{Number(day.slice(-2))}</div>
                                <div className="text-[11px] font-black tabular-nums">{isFuture ? "" : seconds > 0 ? formatShort(seconds) : "-"}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
