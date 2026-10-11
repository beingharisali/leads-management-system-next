"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { FiPower, FiUserPlus } from "react-icons/fi";
import { createCSR, updateCSRStatus } from "@/services/auth.api";
import { getTeam, TeamMember } from "@/services/task.api";
import Loading from "@/components/Loading";

const inputClass = "w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-slate-700";

// Staff accounts (task-only team members) next to the CSRs. CSRs are still
// created from the leads console; staff are created here.
export default function TeamPage() {
    const [team, setTeam] = useState<TeamMember[] | null>(null);
    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try {
            setTeam(await getTeam());
        } catch (err) {
            toast.error((err as Error).message);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const addStaff = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await createCSR({ ...form, role: "staff" });
            toast.success(`Staff account created for ${form.name}. Share the email and password with them.`);
            setForm({ name: "", email: "", password: "" });
            load();
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const toggle = async (m: TeamMember) => {
        const next = m.status === "active" ? "inactive" : "active";
        if (next === "inactive" && !window.confirm(`Deactivate ${m.name}? They won't be able to log in, and repeating tasks for them are skipped.`)) return;
        try {
            await updateCSRStatus(m._id, next);
            toast.success(`${m.name} is now ${next}`);
            load();
        } catch (err) {
            toast.error((err as Error).message);
        }
    };

    if (!team) return <Loading />;
    const staff = team.filter((m) => m.role === "staff");
    const csrs = team.filter((m) => m.role === "csr");

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form onSubmit={addStaff} className="bg-white rounded-[2rem] border border-slate-100 p-6 space-y-4 h-fit">
                <p className="text-lg font-black text-slate-800 flex items-center gap-2"><FiUserPlus /> Add Staff Member</p>
                <p className="text-xs text-slate-400">Staff log in at the same login page and only see their own tasks (no leads).</p>
                <input required minLength={3} maxLength={50} placeholder="Full name" className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input required type="email" placeholder="Email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <input required minLength={6} type="text" placeholder="Password (min 6 characters)" className={inputClass} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <button disabled={saving} className="w-full py-3.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm disabled:opacity-60">
                    {saving ? "Creating..." : "Create Staff Account"}
                </button>
            </form>

            <div className="lg:col-span-2 space-y-6">
                <MemberList title={`Staff (${staff.length})`} members={staff} onToggle={toggle} empty="No staff accounts yet." />
                <MemberList
                    title={`CSRs (${csrs.length})`}
                    members={csrs}
                    onToggle={toggle}
                    empty="No CSRs yet."
                    note={<>CSRs can also be given tasks. Create them from the <Link href="/admin/dashboard" className="text-indigo-600">leads console</Link>.</>}
                />
            </div>
        </div>
    );
}

function MemberList({ title, members, onToggle, empty, note }: {
    title: string;
    members: TeamMember[];
    onToggle: (m: TeamMember) => void;
    empty: string;
    note?: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 p-6">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">{title}</p>
            {note && <p className="text-xs text-slate-400 mb-3">{note}</p>}
            {members.length === 0 ? (
                <p className="text-sm text-slate-400 font-bold py-6 text-center">{empty}</p>
            ) : (
                <div className="divide-y divide-slate-50">
                    {members.map((m) => {
                        const active = m.status === "active";
                        return (
                            <div key={m._id} className="flex items-center justify-between py-3">
                                <div>
                                    <Link href={`/admin/tasks/list?assignedTo=${m._id}`} className="font-bold text-slate-800 hover:text-indigo-600">{m.name}</Link>
                                    <p className="text-xs text-slate-400">{m.email}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-[10px] font-black uppercase ${active ? "text-emerald-600" : "text-rose-500"}`}>{active ? "Active" : "Inactive"}</span>
                                    <button
                                        onClick={() => onToggle(m)}
                                        title={active ? "Deactivate" : "Activate"}
                                        className={`p-2.5 rounded-xl border ${active ? "bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-500 hover:text-white" : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white"}`}
                                    >
                                        <FiPower size={14} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
