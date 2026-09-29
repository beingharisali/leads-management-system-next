"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { getUrgentLeads, UrgentLead } from "@/services/lead.api";

// Short, so a lead marked Urgent reaches the CSR within ~half a minute
const POLL_MS = 30 * 1000;

export interface UrgentLeadsState {
    urgentLeads: UrgentLead[];
    // Changes whenever the set of urgent leads changes - pages watch it to
    // re-fetch their full lead list so the table re-pins right away.
    signature: string;
    loaded: boolean;
}

const EMPTY: UrgentLeadsState = { urgentLeads: [], signature: "", loaded: false };

/**
 * Polls the server for urgent leads. CSRs get their own (csrId ignored);
 * an admin passes the agent's csrId. Pass enabled=false to skip polling.
 */
export function useUrgentLeadsPolling(csrId?: string, enabled = true): UrgentLeadsState {
    const [state, setState] = useState<UrgentLeadsState>(EMPTY);
    const signatureRef = useRef<string | null>(null); // null = nothing loaded yet

    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        signatureRef.current = null;

        const load = () =>
            getUrgentLeads(csrId)
                .then(leads => {
                    if (cancelled) return;
                    const signature = leads.map(l => l._id).sort().join(",");
                    // Only re-render when something actually changed
                    if (signature === signatureRef.current) return;
                    signatureRef.current = signature;
                    setState({ urgentLeads: leads, signature, loaded: true });
                })
                .catch(() => { /* keep the last known list; next poll retries */ });

        load();
        const interval = setInterval(load, POLL_MS);
        return () => { cancelled = true; clearInterval(interval); };
    }, [csrId, enabled]);

    return state;
}

// The CSR portal polls once (in the CSR layout) and shares the result with
// every page through this context.
export const UrgentLeadsContext = createContext<UrgentLeadsState>(EMPTY);
export const useUrgentLeads = () => useContext(UrgentLeadsContext);

/**
 * Calls `onChange` whenever the set of urgent leads changes after the first
 * load (e.g. an admin just marked one Urgent), so the page can refresh.
 */
export function useOnUrgentChange(signature: string, loaded: boolean, onChange: () => void) {
    const firstRef = useRef<string | null>(null);
    useEffect(() => {
        if (!loaded) return;
        if (firstRef.current === null) { firstRef.current = signature; return; }
        if (firstRef.current !== signature) {
            firstRef.current = signature;
            onChange();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signature, loaded]);
}
