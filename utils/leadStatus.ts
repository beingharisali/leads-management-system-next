// Mirrors server/models/leads.js CLOSED_STATUSES / FOLLOW_UP_STATUSES.

// Statuses that close a lead out: it drops off the agent's working
// dashboard and shows up on the Closed Leads page instead.
export const CLOSED_STATUSES = ["paid", "sale", "not interested", "converted", "wrong number"];

// The only statuses an agent may pin a specific follow-up date on. Not
// Pick/Busy are always rolled to the next day by the server instead.
export const FOLLOW_UP_STATUSES = ["interested"];

// Every status an agent/admin can pick, in dropdown order. Mirrors the
// enum in server/models/leads.js.
export const LEAD_STATUS_OPTIONS = ["urgent", "new", "not pick", "interested", "paid", "not interested", "busy", "wrong number"];

// Urgent leads are pinned to the top of every list and trigger a
// "call now" alert in the CSR's portal.
export const URGENT_STATUS = "urgent";

export const isUrgentStatus = (status?: string) =>
    (status || "").toLowerCase().trim() === URGENT_STATUS;

// Stable sort: urgent leads first, everything else keeps its order.
export const pinUrgentFirst = <T extends { status?: string }>(leads: T[]): T[] =>
    [...leads].sort((a, b) => Number(isUrgentStatus(b.status)) - Number(isUrgentStatus(a.status)));

// Status dropdown / badge colours shared by every lead table
export const statusBadgeClass = (status?: string) => {
    const s = (status || "").toLowerCase().trim();
    if (s === URGENT_STATUS) return "bg-rose-600 text-white ring-rose-600";
    if (s === "paid" || s === "sale") return "bg-green-100 text-green-700";
    if (s === "not interested" || s === "wrong number") return "bg-red-100 text-red-700";
    return "bg-slate-100 text-slate-600";
};

export const isClosedStatus = (status?: string) =>
    CLOSED_STATUSES.includes((status || "").toLowerCase().trim());

export const canSetFollowUp = (status?: string) =>
    FOLLOW_UP_STATUSES.includes((status || "").toLowerCase().trim());

// "YYYY-MM-DD" in the viewer's local timezone. Follow-up dates are stored
// as midnight timestamps, so toISOString() (UTC) can land on the previous
// day for timezones ahead of UTC - always compare/display via this helper.
export const localDateKey = (date: string | Date) => {
    const d = new Date(date);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
};

// Whole calendar days since the lead entered the system (local timezone),
// so a lead created late yesterday is "1 day" old this morning.
export const leadAgeDays = (createdAt: string | Date) => {
    const start = new Date(createdAt);
    start.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((today.getTime() - start.getTime()) / 86_400_000));
};

export const leadAgeLabel = (days: number) =>
    days === 0 ? "Today" : days === 1 ? "1 day old" : `${days} days old`;

// Green while fresh, amber after a week, red after two - an old lead that
// is still open is likely going cold.
export const leadAgeClass = (days: number) =>
    days >= 14 ? "bg-red-100 text-red-700" :
    days >= 7 ? "bg-amber-100 text-amber-700" :
    "bg-green-100 text-green-700";
