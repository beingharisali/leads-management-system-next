"use client";

import { useEffect } from "react";
import { getUserRole } from "@/utils/decodeToken";
import { sendHeartbeat } from "@/services/activity.api";

const HEARTBEAT_MS = 30 * 1000;

// Invisible: tracks how long a CSR has their portal open on screen. While
// the window is visible it pings the server every 30s; minimising,
// switching away or closing it sends a final ping and stops the clock, and
// coming back resumes it. Renders nothing - the CSR never sees a timer.
export default function ActivityTracker() {
    useEffect(() => {
        let cancelled = false;
        let interval: ReturnType<typeof setInterval> | undefined;

        const isVisible = () => document.visibilityState === "visible";

        const onVisibilityChange = () => {
            // hidden: credit the time since the last ping and stop the clock;
            // visible: start a fresh segment so the time away is not counted
            sendHeartbeat(isVisible() ? "resume" : "leave");
        };
        const onPageHide = () => sendHeartbeat("leave");

        getUserRole().then(role => {
            if (cancelled || role !== "csr") return;

            if (isVisible()) sendHeartbeat("resume");
            interval = setInterval(() => { if (isVisible()) sendHeartbeat("tick"); }, HEARTBEAT_MS);
            document.addEventListener("visibilitychange", onVisibilityChange);
            window.addEventListener("pagehide", onPageHide);
        });

        return () => {
            cancelled = true;
            if (interval) clearInterval(interval);
            document.removeEventListener("visibilitychange", onVisibilityChange);
            window.removeEventListener("pagehide", onPageHide);
        };
    }, []);

    return null;
}
