"use client";

import { Suspense } from "react";
import Link from "next/link";
import { Toaster } from "react-hot-toast";
import { FiArrowLeft, FiLogOut, FiMessageSquare } from "react-icons/fi";
import ProtectedRoute from "@/components/ProtectedRoute";
import Loading from "@/components/Loading";
import TaskNotificationBell from "@/components/tasks/TaskNotificationBell";
import AdminComplaintsView from "@/components/complaints/AdminComplaintsView";
import { useAccess } from "@/utils/access";

// Team members' complaints: the admin, and staff given "complaints" access.
export default function AdminComplaintsPage() {
    const access = useAccess();
    const backLink = access.isAdmin || !access.ready || access.can("leads")
        ? { href: "/admin/dashboard", label: "Leads console" }
        : { href: "/staff/tasks", label: "My Tasks" };

    return (
        <ProtectedRoute role="admin" permission="complaints">
            <Toaster position="top-right" />
            <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
                <header className="max-w-[1200px] mx-auto bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                            <FiMessageSquare className="text-white text-xl" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-800">Team <span className="text-indigo-600">Complaints</span></h1>
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
                    <div className="flex items-center gap-2">
                        <TaskNotificationBell taskBasePath={!access.ready || access.can("tasks") ? "/admin/tasks" : "/staff/tasks"} />
                        <button
                            onClick={() => { localStorage.clear(); window.location.href = "/login"; }}
                            title="Log out"
                            className="p-3.5 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"
                        >
                            <FiLogOut size={18} />
                        </button>
                    </div>
                </header>

                <main className="max-w-[1200px] mx-auto">
                    <Suspense fallback={<Loading />}>
                        <AdminComplaintsView />
                    </Suspense>
                </main>
            </div>
        </ProtectedRoute>
    );
}
