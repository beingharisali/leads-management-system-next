"use client";

import { useEffect, useState } from "react";
import { getMe, Permission } from "@/services/auth.api";

export type { Permission };

// What each permission opens, for the admin's access checkboxes
export const PERMISSION_INFO: { key: Permission; label: string; hint: string; staffOnly?: boolean }[] = [
    { key: "team_lead", label: "Team Lead", hint: "Assigns tasks to other team members and approves the tasks they assigned" },
    { key: "leads", label: "Leads Console", hint: "All leads, stats, importing and CSR dashboards", staffOnly: true },
    { key: "tasks", label: "Team Tasks (admin)", hint: "Every task, repeating tasks and all approvals", staffOnly: true },
    { key: "accounts", label: "Manage Accounts", hint: "Create CSR / staff accounts, activate / deactivate, change CSR numbers", staffOnly: true },
    { key: "complaints", label: "Complaints (admin)", hint: "Read, reply to and delete team members' complaints - never the ones about themselves", staffOnly: true },
];

export const permissionLabel = (key: Permission) => PERMISSION_INFO.find((p) => p.key === key)?.label || key;

const storedUser = (): { role?: string; permissions?: Permission[] } => {
    try {
        return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
        return {};
    }
};

export interface Access {
    ready: boolean;
    role: string | null;
    isAdmin: boolean;
    permissions: Permission[];
    // The admin has every section; others need the permission
    can: (permission: Permission) => boolean;
}

// The logged-in account's role and permissions. Starts from what login
// saved, then refreshes from the server so changes by the admin apply
// without logging out again.
export function useAccess(): Access {
    const [state, setState] = useState<{ ready: boolean; role: string | null; permissions: Permission[] }>({
        ready: false,
        role: null,
        permissions: [],
    });

    useEffect(() => {
        const saved = storedUser();
        const role = localStorage.getItem("role") || saved.role || null;
        setState({ ready: role === "admin", role, permissions: saved.permissions || [] });
        if (!role || role === "admin" || !localStorage.getItem("token")) {
            setState((s) => ({ ...s, ready: true }));
            return;
        }

        let cancelled = false;
        getMe()
            .then((res) => {
                if (cancelled) return;
                const permissions = (res.user?.permissions || []) as Permission[];
                localStorage.setItem("user", JSON.stringify({ ...saved, ...res.user, permissions }));
                setState({ ready: true, role, permissions });
            })
            .catch(() => {
                if (!cancelled) setState((s) => ({ ...s, ready: true }));
            });
        return () => { cancelled = true; };
    }, []);

    const isAdmin = state.role === "admin";
    return {
        ...state,
        isAdmin,
        can: (permission) => isAdmin || state.permissions.includes(permission),
    };
}
