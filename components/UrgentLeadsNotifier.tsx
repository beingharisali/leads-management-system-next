"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FiAlertTriangle, FiPhoneCall, FiX } from "react-icons/fi";
import { getUserRole } from "@/utils/decodeToken";
import { UrgentLead } from "@/services/lead.api";
import { UrgentLeadsContext, useUrgentLeadsPolling } from "@/hooks/useUrgentLeads";

// Ids already announced this browser session, so a page reload doesn't
// fire the same desktop notification again (the in-page banner still shows).
const SEEN_KEY = "urgentLeadsAnnounced";

const readSeen = (): Set<string> => {
    try { return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]")); }
    catch { return new Set(); }
};
const writeSeen = (ids: Set<string>) => {
    try { sessionStorage.setItem(SEEN_KEY, JSON.stringify([...ids])); } catch { /* ignore */ }
};

const showDesktopNotification = (leads: UrgentLead[]) => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    try {
        const n = new Notification(
            leads.length === 1 ? "🚨 Urgent lead - call now" : `🚨 ${leads.length} urgent leads - call now`,
            {
                body: leads.slice(0, 3).map(l => `${l.name} · ${l.phone}`).join("\n"),
                tag: "urgent-leads",
                requireInteraction: true,
            }
        );
        n.onclick = () => { window.focus(); window.location.href = "/csr/dashboard"; };
    } catch { /* some browsers only allow notifications from a service worker */ }
};

// Wraps every CSR page: polls the CSR's urgent leads, shares them with the
// pages (UrgentLeadsContext), and alerts the CSR - desktop notification,
// an on-screen alert card and a count in the tab title - whenever a lead
// becomes Urgent.
export default function UrgentLeadsNotifier({ children }: { children: React.ReactNode }) {
    const [isCsr, setIsCsr] = useState(false);
    useEffect(() => { getUserRole().then(role => setIsCsr(role === "csr")); }, []);

    const state = useUrgentLeadsPolling(undefined, isCsr);
    const [fresh, setFresh] = useState<UrgentLead[]>([]);
    const seenRef = useRef<Set<string> | null>(null);

    // Ask once for desktop notification permission
    useEffect(() => {
        if (!isCsr || typeof Notification === "undefined") return;
        if (Notification.permission === "default") Notification.requestPermission().catch(() => {});
    }, [isCsr]);

    // Announce urgent leads we haven't announced yet
    useEffect(() => {
        if (!state.loaded) return;
        if (!seenRef.current) seenRef.current = readSeen();
        const seen = seenRef.current;

        const current = new Set(state.urgentLeads.map(l => l._id));
        const newOnes = state.urgentLeads.filter(l => !seen.has(l._id));

        // Forget leads that are no longer urgent, so re-marking one alerts again
        const nextSeen = new Set([...seen].filter(id => current.has(id)));
        newOnes.forEach(l => nextSeen.add(l._id));
        seenRef.current = nextSeen;
        writeSeen(nextSeen);

        setFresh(prev => [...prev.filter(l => current.has(l._id)), ...newOnes]);
        if (newOnes.length) showDesktopNotification(newOnes);
    }, [state.signature, state.loaded, state.urgentLeads]);

    // "(2) 🚨 ..." in the tab title while urgent leads are waiting
    useEffect(() => {
        if (!isCsr) return;
        const base = document.title.replace(/^\(\d+\) 🚨 /, "");
        const count = state.urgentLeads.length;
        document.title = count ? `(${count}) 🚨 ${base}` : base;
    }, [isCsr, state.urgentLeads.length]);

    return (
        <UrgentLeadsContext.Provider value={state}>
            {children}

            {fresh.length > 0 && (
                <div className="fixed bottom-5 right-5 z-[1000] w-[22rem] max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl shadow-2xl border-2 border-rose-500 overflow-hidden animate-[pulse_1s_ease-in-out_2]">
                    <div className="bg-rose-600 text-white px-4 py-3 flex items-center gap-2">
                        <FiAlertTriangle size={18} />
                        <p className="font-black text-sm flex-1">
                            {fresh.length === 1 ? "New urgent lead" : `${fresh.length} new urgent leads`} - call now!
                        </p>
                        <button onClick={() => setFresh([])} title="Dismiss" className="p-1 rounded-lg hover:bg-white/20">
                            <FiX size={16} />
                        </button>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                        {fresh.map(l => (
                            <a key={l._id} href={`tel:${l.phone}`} className="flex items-center gap-3 px-4 py-3 hover:bg-rose-50">
                                <FiPhoneCall className="text-rose-600 shrink-0" />
                                <div className="min-w-0">
                                    <p className="font-bold text-sm text-slate-800 truncate">{l.name}</p>
                                    <p className="text-xs font-semibold text-blue-600">{l.phone}{l.course ? ` · ${l.course}` : ""}</p>
                                </div>
                            </a>
                        ))}
                    </div>
                    <Link
                        href="/csr/dashboard"
                        onClick={() => setFresh([])}
                        className="block text-center text-xs font-black uppercase tracking-wider text-rose-600 bg-rose-50 py-2.5 hover:bg-rose-100"
                    >
                        Open dashboard
                    </Link>
                </div>
            )}
        </UrgentLeadsContext.Provider>
    );
}
