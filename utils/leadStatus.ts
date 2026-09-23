// Mirrors server/models/leads.js CLOSED_STATUSES / FOLLOW_UP_STATUSES.

// Statuses that close a lead out: it drops off the agent's working
// dashboard and shows up on the Closed Leads page instead.
export const CLOSED_STATUSES = ["paid", "sale", "not interested", "converted", "wrong number"];

// The only statuses an agent may pin a specific follow-up date on.
export const FOLLOW_UP_STATUSES = ["not pick", "interested", "busy"];

export const isClosedStatus = (status?: string) =>
    CLOSED_STATUSES.includes((status || "").toLowerCase().trim());

export const canSetFollowUp = (status?: string) =>
    FOLLOW_UP_STATUSES.includes((status || "").toLowerCase().trim());
