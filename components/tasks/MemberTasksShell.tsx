"use client";

import { useState } from "react";
import Link from "next/link";
import { Toaster } from "react-hot-toast";
import { FiArrowLeft, FiCheckSquare, FiGrid, FiLogOut, FiTrendingUp, FiUsers } from "react-icons/fi";
import ProtectedRoute from "@/components/ProtectedRoute";
import { logout } from "@/utils/decodeToken";
import { useAccess } from "@/utils/access";
import TaskNotificationBell from "./TaskNotificationBell";

// Frame for a team member's task pages (staff portal, and the CSR's My Tasks).
export default function MemberTasksShell({
    role,
    taskBasePath,
    backLink,
    children,
}: {
    role: "staff" | "csr";
    taskBasePath: string;
    // CSRs get a way back to their leads dashboard
    backLink?: { href: string; label: string };
    children: React.ReactNode;
}) {
    // Only shown after ProtectedRoute's client-side check, so reading
    // localStorage here never causes a hydration mismatch.
    const [name] = useState(() => {
        if (typeof window === "undefined") return "";
        try {
            return JSON.parse(localStorage.getItem("user") || "{}").name || "";
        } catch {
            return ""; // name is cosmetic
        }
    });

    // Admin sections the admin gave this staff member
    const access = useAccess();
    const adminLinks = role !== "staff" ? [] : [
        { show: access.permissions.includes("leads"), href: "/admin/dashboard", label: "Leads Console", icon: <FiTrendingUp /> },
        { show: access.permissions.includes("tasks"), href: "/admin/tasks", label: "Team Tasks", icon: <FiGrid /> },
        { show: access.permissions.includes("accounts"), href: "/admin/tasks/team", label: "Accounts", icon: <FiUsers /> },
    ].filter((l) => l.show);

    return (
        <ProtectedRoute role={role}>
            <Toaster position="top-right" />
            <div className="min-h-screen bg-[#F4F7FE] p-4 lg:p-10">
                <header className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                            <FiCheckSquare className="text-white text-xl" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">My Tasks</h1>
                            <p className="text-slate-500 text-sm font-medium">{name ? `Signed in as ${name}` : "Your assigned work"}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {adminLinks.map((l) => (
                            <Link key={l.href} href={l.href} className="px-5 py-3 bg-white text-indigo-600 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-sm border border-indigo-100 hover:bg-indigo-50">
                                {l.icon} {l.label}
                            </Link>
                        ))}
                        {backLink && (
                            <Link href={backLink.href} className="px-5 py-3 bg-white text-slate-700 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-sm border border-slate-100 hover:bg-slate-50">
                                <FiArrowLeft /> {backLink.label}
                            </Link>
                        )}
                        <TaskNotificationBell taskBasePath={taskBasePath} />
                        <button onClick={logout} title="Log out" className="p-3.5 bg-white text-rose-500 rounded-2xl shadow-sm border border-slate-100">
                            <FiLogOut size={20} />
                        </button>
                    </div>
                </header>
                <main className="max-w-5xl mx-auto">{children}</main>
            </div>
        </ProtectedRoute>
    );
}
