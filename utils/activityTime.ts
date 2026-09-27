import type { CsrActivity } from "@/services/activity.api";

export const formatDuration = (totalSeconds: number) => {
    const s = Math.max(0, Math.floor(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

// The server has credited time up to the CSR's last ping. While they're
// still on screen, add the time since that ping - measured from the
// server's clock, so a page reload shows the same value, not a jump.
// `fetchedAt`/`now` are client timestamps (ms) of the fetch and this render.
export const liveTodaySeconds = (activity: CsrActivity, fetchedAt: number, now: number) => {
    const sinceLastPing = activity.isOnline && activity.lastSeenAt
        ? (new Date(activity.serverTime).getTime() - new Date(activity.lastSeenAt).getTime()) / 1000 + (now - fetchedAt) / 1000
        : 0;
    const liveExtra = Math.min(Math.max(sinceLastPing, 0), activity.onlineWindowSeconds);
    return activity.today.activeSeconds + liveExtra;
};
