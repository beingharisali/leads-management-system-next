// Mirrors server/models/leads.js CLOSED_STATUSES / FOLLOW_UP_STATUSES.

// Statuses that close a lead out: it drops off the agent's working
// dashboard and shows up on the Closed Leads page instead.
export const CLOSED_STATUSES = ["paid", "sale", "not interested", "converted", "wrong number"];

// The only statuses an agent may pin a specific follow-up date on. Not
// Pick/Busy are always rolled to the next day by the server instead.
export const FOLLOW_UP_STATUSES = ["interested"];

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
