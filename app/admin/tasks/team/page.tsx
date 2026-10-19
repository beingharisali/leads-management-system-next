"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { FiKey, FiPower, FiTrash2, FiUserPlus, FiX } from "react-icons/fi";
import {
    Account, createCSR, deleteAccount, DeleteCheck, getAccounts, getDeleteCheck, Permission, updateAccess, updateCSRStatus,
} from "@/services/auth.api";
import { PERMISSION_INFO, permissionLabel, useAccess } from "@/utils/access";
import Loading from "@/components/Loading";

const inputClass = "w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold text-slate-700";

const permissionsFor = (role: Account["role"]) => PERMISSION_INFO.filter((p) => role === "staff" || !p.staffOnly);

// Staff accounts (task-only team members) next to the CSRs. CSRs are still
// created from the leads console; staff are created here. The admin also
// sets Team Lead / feature access and can delete accounts here.
export default function TeamPage() {
    const access = useAccess();
    const [team, setTeam] = useState<Account[] | null>(null);
    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [formPermissions, setFormPermissions] = useState<Permission[]>([]);
    const [saving, setSaving] = useState(false);
    const [editingAccess, setEditingAccess] = useState<Account | null>(null);
    const [deleting, setDeleting] = useState<Account | null>(null);

    const load = useCallback(async () => {
        try {
            setTeam(await getAccounts());
        } catch (err) {
            toast.error((err as Error).message);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const addStaff = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await createCSR({ ...form, role: "staff", permissions: access.isAdmin ? formPermissions : [] });
            toast.success(`Staff account created for ${form.name}. Share the email and password with them.`);
            setForm({ name: "", email: "", password: "" });
            setFormPermissions([]);
            load();
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const toggle = async (m: Account) => {
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
    const actions = {
        onToggle: toggle,
        onAccess: access.isAdmin ? setEditingAccess : undefined,
        onDelete: access.isAdmin ? setDeleting : undefined,
        linkTasks: access.can("tasks"),
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <form onSubmit={addStaff} className="bg-white rounded-[2rem] border border-slate-100 p-6 space-y-4 h-fit">
                <p className="text-lg font-black text-slate-800 flex items-center gap-2"><FiUserPlus /> Add Staff Member</p>
                <p className="text-xs text-slate-400">Staff log in at the same login page and only see their own tasks (no leads), plus any access you give them below.</p>
                <input required minLength={3} maxLength={50} placeholder="Full name" className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <input required type="email" placeholder="Email" className={inputClass} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <input required minLength={6} type="text" placeholder="Password (min 6 characters)" className={inputClass} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                {access.isAdmin && (
                    <PermissionPicker role="staff" value={formPermissions} onChange={setFormPermissions} />
                )}
                <button disabled={saving} className="w-full py-3.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm disabled:opacity-60">
                    {saving ? "Creating..." : "Create Staff Account"}
                </button>
            </form>

            <div className="lg:col-span-2 space-y-6">
                <MemberList title={`Staff (${staff.length})`} members={staff} empty="No staff accounts yet." {...actions} />
                <MemberList
                    title={`CSRs (${csrs.length})`}
                    members={csrs}
                    empty="No CSRs yet."
                    note={<>CSRs can also be given tasks and made Team Leads. Create them from the <Link href="/admin/dashboard" className="text-indigo-600">leads console</Link>.</>}
                    {...actions}
                />
            </div>

            {editingAccess && (
                <AccessModal
                    member={editingAccess}
                    onClose={() => setEditingAccess(null)}
                    onSaved={() => { setEditingAccess(null); load(); }}
                />
            )}
            {deleting && (
                <DeleteModal
                    member={deleting}
                    csrs={csrs}
                    onClose={() => setDeleting(null)}
                    onDeleted={() => { setDeleting(null); load(); }}
                />
            )}
        </div>
    );
}

function PermissionPicker({ role, value, onChange }: { role: Account["role"]; value: Permission[]; onChange: (p: Permission[]) => void }) {
    const toggle = (key: Permission) => onChange(value.includes(key) ? value.filter((p) => p !== key) : [...value, key]);
    return (
        <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Access</p>
            {permissionsFor(role).map((p) => (
                <label key={p.key} className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer ${value.includes(p.key) ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-100"}`}>
                    <input type="checkbox" className="mt-0.5 accent-indigo-600" checked={value.includes(p.key)} onChange={() => toggle(p.key)} />
                    <span>
                        <span className="block text-sm font-bold text-slate-700">{p.label}</span>
                        <span className="block text-[11px] text-slate-400">{p.hint}</span>
                    </span>
                </label>
            ))}
        </div>
    );
}

function MemberList({ title, members, empty, note, onToggle, onAccess, onDelete, linkTasks }: {
    title: string;
    members: Account[];
    empty: string;
    note?: React.ReactNode;
    onToggle: (m: Account) => void;
    // Admin only
    onAccess?: (m: Account) => void;
    onDelete?: (m: Account) => void;
    linkTasks: boolean;
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
                            <div key={m._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                                <div className="min-w-0">
                                    {linkTasks ? (
                                        <Link href={`/admin/tasks/list?assignedTo=${m._id}`} className="font-bold text-slate-800 hover:text-indigo-600">{m.name}</Link>
                                    ) : (
                                        <p className="font-bold text-slate-800">{m.name}</p>
                                    )}
                                    <p className="text-xs text-slate-400">{m.email}</p>
                                    {m.permissions.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1.5">
                                            {m.permissions.map((p) => (
                                                <span key={p} className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${p === "team_lead" ? "bg-amber-50 text-amber-700" : "bg-indigo-50 text-indigo-600"}`}>
                                                    {permissionLabel(p)}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-black uppercase mr-1 ${active ? "text-emerald-600" : "text-rose-500"}`}>{active ? "Active" : "Inactive"}</span>
                                    {onAccess && (
                                        <button onClick={() => onAccess(m)} title="Team Lead / access" className="p-2.5 rounded-xl border bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-600 hover:text-white">
                                            <FiKey size={14} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onToggle(m)}
                                        title={active ? "Deactivate" : "Activate"}
                                        className={`p-2.5 rounded-xl border ${active ? "bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-500 hover:text-white" : "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white"}`}
                                    >
                                        <FiPower size={14} />
                                    </button>
                                    {onDelete && (
                                        <button onClick={() => onDelete(m)} title="Delete account" className="p-2.5 rounded-xl border bg-white text-slate-400 border-slate-200 hover:bg-rose-600 hover:text-white hover:border-rose-600">
                                            <FiTrash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function ModalFrame({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
            <div className="bg-white p-7 rounded-[2rem] w-full max-w-md relative shadow-2xl max-h-[90vh] overflow-y-auto">
                <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-rose-500"><FiX size={22} /></button>
                <h2 className="text-xl font-black text-slate-800 mb-5 pr-8">{title}</h2>
                {children}
            </div>
        </div>
    );
}

function AccessModal({ member, onClose, onSaved }: { member: Account; onClose: () => void; onSaved: () => void }) {
    const [value, setValue] = useState<Permission[]>(member.permissions);
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            await updateAccess(member._id, value);
            toast.success(`Access updated for ${member.name}`);
            onSaved();
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <ModalFrame title={`Access · ${member.name}`} onClose={onClose}>
            <PermissionPicker role={member.role} value={value} onChange={setValue} />
            {member.role === "csr" && <p className="text-[11px] text-slate-400 mt-3">CSRs can be made Team Leads. Other admin sections are for staff accounts.</p>}
            <p className="text-[11px] text-slate-400 mt-3">Changes apply straight away; they don&apos;t need to log in again.</p>
            <button disabled={saving} onClick={save} className="w-full mt-5 py-3.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm disabled:opacity-60">
                {saving ? "Saving..." : "Save Access"}
            </button>
        </ModalFrame>
    );
}

function DeleteModal({ member, csrs, onClose, onDeleted }: { member: Account; csrs: Account[]; onClose: () => void; onDeleted: () => void }) {
    const [check, setCheck] = useState<DeleteCheck | null>(null);
    const [moveTo, setMoveTo] = useState("");
    const [confirmText, setConfirmText] = useState("");
    const [busy, setBusy] = useState(false);
    const otherCsrs = csrs.filter((c) => c._id !== member._id && c.status === "active");

    useEffect(() => {
        getDeleteCheck(member._id).then(setCheck).catch((err) => toast.error((err as Error).message));
    }, [member._id]);

    const remove = async () => {
        setBusy(true);
        try {
            const res = await deleteAccount(member._id, moveTo || undefined);
            toast.success(
                res.movedTo
                    ? `${member.name}'s account was deleted. ${res.leadsMoved} lead(s) moved to ${res.movedTo.name}.`
                    : `${member.name}'s account was deleted.`
            );
            onDeleted();
        } catch (err) {
            toast.error((err as Error).message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <ModalFrame title={`Delete ${member.name}?`} onClose={onClose}>
            {!check ? (
                <Loading />
            ) : (
                <div className="space-y-4 text-sm text-slate-600">
                    <p>This permanently removes <span className="font-bold">{member.name}</span>&apos;s login account. It can&apos;t be undone.</p>
                    <ul className="space-y-1.5 text-xs bg-slate-50 border border-slate-100 rounded-2xl p-4">
                        {member.role === "csr" && <li>• <b>{check.leads}</b> lead(s) and <b>{check.admissions}</b> admission(s) belong to them</li>}
                        <li>• <b>{check.openTasks}</b> open task(s) will be cancelled</li>
                        <li>• <b>{check.repeatingTasks}</b> repeating task(s) will be stopped</li>
                        <li>• Sales, task history and records are kept (shown without a name)</li>
                    </ul>

                    {member.role === "csr" && check.leads + check.admissions > 0 && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1">Move their leads & admissions to</p>
                            <select className={inputClass} value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                                <option value="">Don&apos;t move (keep them unassigned)</option>
                                {otherCsrs.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 mb-1">Type DELETE to confirm</p>
                        <input className={inputClass} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
                    </div>

                    <button
                        disabled={busy || confirmText.trim().toUpperCase() !== "DELETE"}
                        onClick={remove}
                        className="w-full py-3.5 rounded-2xl bg-rose-600 text-white font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                        <FiTrash2 /> {busy ? "Deleting..." : "Delete Account"}
                    </button>
                </div>
            )}
        </ModalFrame>
    );
}
