import http, { baseURL } from "./http";

export interface CsrActivity {
  serverTime: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  onlineWindowSeconds: number;
  today: {
    day: string;
    activeSeconds: number;
    firstSeenAt: string | null;
    lastLoginAt: string | null;
  };
  history: { day: string; activeSeconds: number }[];
}

// CSR portal heartbeat. Uses fetch with keepalive (not axios) so the last
// ping still goes out when the window is being closed.
// "resume": window just came on screen, "tick": still on screen,
// "leave": window minimised/closed - stops the clock right away.
export type HeartbeatKind = "resume" | "tick" | "leave";

export const sendHeartbeat = (kind: HeartbeatKind) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) return;
  fetch(`${baseURL}/activity/heartbeat`, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ kind }),
  }).catch(() => { /* a missed ping only costs one interval */ });
};

// Admin only
export const getCsrActivity = async (csrId: string, days = 7): Promise<CsrActivity> => {
  const res = await http.get(`/activity/csr/${csrId}`, { params: { days } });
  return res.data.data;
};

export interface CsrPresence {
  csrId: string;
  isOnline: boolean;
  lastSeenAt: string | null;
  todaySeconds: number;
}

// Admin only: online status + today's portal time for every CSR
export const getAllCsrPresence = async (): Promise<CsrPresence[]> => {
  const res = await http.get("/activity/presence");
  return res.data.data.presence;
};
