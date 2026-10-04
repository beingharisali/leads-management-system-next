"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiFileText, FiX } from "react-icons/fi";
import { getUserRole } from "@/utils/decodeToken";
import { getUnseenAdmissions, markAdmissionsSeen, UnseenAdmission } from "@/services/admission.api";

const POLL_MS = 30 * 1000;
const ADMISSIONS_PATH = "/csr/admission";

// Ids already announced this browser session, so a reload doesn't fire the
// same desktop notification again (the on-screen card still shows).
const SEEN_KEY = "admissionsAnnounced";

const readAnnounced = (): Set<string> => {
    try { return new Set(JSON.parse(sessionStorage.getItem(SEEN_KEY) || "[]")); }
    catch { return new Set(); }
};
const writeAnnounced = (ids: Set<string>) => {
    try { sessionStorage.setItem(SEEN_KEY, JSON.stringify([...ids])); } catch { /* ignore */ }
};

const showDesktopNotification = (admissions: UnseenAdmission[]) => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    try {
        const n = new Notification(
            admissions.length === 1 ? "📝 New admission form" : `📝 ${admissions.length} new admission forms`,
            {
                body: admissions.slice(0, 3).map(a => `${a.fullName} · ${a.course}`).join("\n"),
                tag: "new-admissions",
            }
        );
        n.onclick = () => { window.focus(); window.location.href = ADMISSIONS_PATH; };
    } catch { /* some browsers only allow notifications from a service worker */ }
};

// Alerts the CSR, wherever they are in the portal, when a student fills the
// admission form they shared. Cleared once they open the Admission Form page
// (which marks them seen) or dismiss the card.
export default function AdmissionNotifier() {
    const pathname = usePathname();
    const [isCsr, setIsCsr] = useState(false);
    const [unseen, setUnseen] = useState<UnseenAdmission[]>([]);
    const announcedRef = useRef<Set<string> | null>(null);

    useEffect(() => { getUserRole().then(role => setIsCsr(role === "csr")); }, []);

    useEffect(() => {
        if (!isCsr) return;
        let cancelled = false;

        const load = () =>
            getUnseenAdmissions()
                .then(list => {
                    if (cancelled) return;
                    if (!announcedRef.current) announcedRef.current = readAnnounced();
                    const announced = announcedRef.current;
                    const newOnes = list.filter(a => !announced.has(a._id));
                    newOnes.forEach(a => announced.add(a._id));
                    writeAnnounced(announced);
                    if (newOnes.length) showDesktopNotification(newOnes);
                    setUnseen(list);
                })
                .catch(() => { /* keep the last list; next poll retries */ });

        load();
        const interval = setInterval(load, POLL_MS);
        return () => { cancelled = true; clearInterval(interval); };
    }, [isCsr]);

    const dismiss = () => {
        setUnseen([]);
        markAdmissionsSeen().catch(() => { /* shows again on the next poll */ });
    };

    // The Admission Form page lists them itself
    if (!isCsr || unseen.length === 0 || pathname === ADMISSIONS_PATH) return null;

    return (
        <div className="fixed bottom-5 left-5 z-[999] w-[22rem] max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl shadow-2xl border-2 border-emerald-500 overflow-hidden">
            <div className="bg-emerald-600 text-white px-4 py-3 flex items-center gap-2">
                <FiFileText size={18} />
                <p className="font-black text-sm flex-1">
                    {unseen.length === 1 ? "A student filled your admission form" : `${unseen.length} students filled your admission form`}
                </p>
                <button onClick={dismiss} title="Dismiss" className="p-1 rounded-lg hover:bg-white/20">
                    <FiX size={16} />
                </button>
            </div>
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {unseen.map(a => (
                    <div key={a._id} className="px-4 py-3">
                        <p className="font-bold text-sm text-slate-800 truncate">{a.fullName}</p>
                        <p className="text-xs font-semibold text-emerald-700 truncate">{a.phone} · {a.course}</p>
                        <p className="text-[10px] font-bold uppercase text-amber-600 mt-0.5">Payment pending</p>
                    </div>
                ))}
            </div>
            <Link
                href={ADMISSIONS_PATH}
                className="block text-center text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 py-2.5 hover:bg-emerald-100"
            >
                Open admission forms
            </Link>
        </div>
    );
}
