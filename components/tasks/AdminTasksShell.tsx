"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Toaster } from "react-hot-toast";
import { FiArrowLeft, FiCheckSquare, FiGrid, FiList, FiLogOut, FiUsers } from "react-icons/fi";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAccess, Permission } from "@/utils/access";
import TaskNotificationBell from "./TaskNotificationBell";

const TABS: { href: string; label: string; icon: typeof FiGrid; permission: Permission }[] = [
    { href: "/admin/tasks", label: "Dashboard", icon: FiGrid, permission: "tasks" },
    { href: "/admin/tasks/list", label: "All Tasks", icon: FiList, permission: "tasks" },
    { href: "/admin/tasks/team", label: "Team", icon: FiUsers, permission: "accounts" },
];

// Frame around every admin task page: navigation, notification bell, logout.
// Staff members given "tasks" / "accounts" access see just those tabs.
export default function AdminTasksShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const access = useAccess();
    const tabs = TABS.filter((t) => !access.ready || access.can(t.permission));
    const canTasks = !access.ready || access.can("tasks");

    // Account access only: the Team page is all there is
    const accountsOnly = access.ready && !access.can("tasks");
    useEffect(() => {
        if (accountsOnly && pathname !== "/admin/tasks/team") router.replace("/admin/tasks/team");
    }, [accountsOnly, pathname, router]);

    // A task's own page highlights "All Tasks"
    const activeHref = TABS.slice(1).find((t) => pathname.startsWith(t.href))?.href
        || (pathname === "/admin/tasks" ? "/admin/tasks" : "/admin/tasks/list");

    const backLink = access.isAdmin || !access.ready || access.can("leads")
        ? { href: "/admin/dashboard", label: "Leads console" }
        : { href: "/staff/tasks", label: "My Tasks" };

    return (
        <ProtectedRoute role="admin" permission={["tasks", "accounts"]}>
            <Toaster position="top-right" />
            <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
                <header className="max-w-[1500px] mx-auto bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                            <FiCheckSquare className="text-white text-xl" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-800">Team <span className="text-indigo-600">Tasks</span></h1>
                            <div className="flex items-center gap-3">
                                <Link href={backLink.href} className="text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 flex items-center gap-1">
                                    <FiArrowLeft /> {backLink.label}
                                </Link>
                                {!access.isAdmin && access.ready && backLink.href !== "/staff/tasks" && (
                                    <Link href="/staff/tasks" className="text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600">My Tasks</Link>
                                )}
                            </div>
                        </div>
                    </div>

                    <nav className="flex flex-wrap items-center gap-2">
                        {tabs.map(({ href, label, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                className={`px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wide flex items-center gap-2 transition-all ${activeHref === href ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-slate-50"}`}
                            >
                                <Icon /> {label}
                            </Link>
                        ))}
                        <TaskNotificationBell taskBasePath={canTasks ? "/admin/tasks" : "/staff/tasks"} />
                        <button
                            onClick={() => { localStorage.clear(); window.location.href = "/login"; }}
                            title="Log out"
                            className="p-3.5 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"
                        >
                            <FiLogOut size={18} />
                        </button>
                    </nav>
                </header>

                <main className="max-w-[1500px] mx-auto">{children}</main>
            </div>
        </ProtectedRoute>
    );
}
