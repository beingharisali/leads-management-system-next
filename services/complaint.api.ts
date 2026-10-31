import http, { getErrorMessage } from "./http";

/* ===================== TYPES ===================== */

export type ComplaintCategory = "behaviour" | "work" | "attendance" | "harassment" | "other";

export const CATEGORY_LABELS: Record<ComplaintCategory, string> = {
  behaviour: "Behaviour",
  work: "Work",
  attendance: "Attendance",
  harassment: "Harassment",
  other: "Other",
};

export interface ComplaintMeta {
  categories: ComplaintCategory[];
  maxPhotos: number;
}

export interface ComplaintMember {
  _id: string;
  name: string;
  role: "csr" | "staff";
  status: "active" | "inactive";
}

export interface ComplaintPhoto {
  _id: string;
  name: string;
  url: string;
}

// What the complainant sees about their own complaint
export interface MyComplaint {
  _id: string;
  subject: string;
  category: ComplaintCategory;
  description: string;
  againstName: string;
  againstRole: "csr" | "staff" | "";
  photos: ComplaintPhoto[];
  reply: string;
  repliedAt?: string;
  replied: boolean;
  createdAt: string;
}

// The admin side's view, incl. who filed it and the private note
export interface Complaint extends MyComplaint {
  filedBy: string;
  filedByName: string;
  filedByRole: "csr" | "staff";
  against?: string;
  repliedByName: string;
  adminNote: string;
}

export interface ComplaintInput {
  subject: string;
  category: ComplaintCategory;
  description: string;
  against?: string;
  photos: File[];
}

export interface ComplaintFilters {
  q?: string;
  category?: string;
  replied?: "yes" | "no" | "";
  against?: string;
  page?: number;
  limit?: number;
}

/* ===================== HELPERS ===================== */

const wrap = async <T,>(fn: () => Promise<T>, fallback: string): Promise<T> => {
  try {
    return await fn();
  } catch (err) {
    throw new Error(getErrorMessage(err, fallback));
  }
};

/* ===================== TEAM MEMBER ===================== */

export const getComplaintMeta = () =>
  wrap(async () => (await http.get("/complaints/meta")).data.data as ComplaintMeta, "Failed to load the complaint form");

export const getComplaintMembers = () =>
  wrap(async () => (await http.get("/complaints/members")).data.data as ComplaintMember[], "Failed to load team members");

export const getMyComplaints = () =>
  wrap(async () => (await http.get("/complaints/mine")).data.data as MyComplaint[], "Failed to load your complaints");

export const createComplaint = (input: ComplaintInput) =>
  wrap(async () => {
    const form = new FormData();
    form.append("subject", input.subject);
    form.append("category", input.category);
    form.append("description", input.description);
    if (input.against) form.append("against", input.against);
    input.photos.forEach((f) => form.append("photos", f));
    // Uploads can take longer than the default 15s timeout
    return (await http.post("/complaints", form, { timeout: 120000 })).data.data as MyComplaint;
  }, "Failed to send the complaint");

export const deleteMyComplaint = (id: string) =>
  wrap(async () => (await http.delete(`/complaints/mine/${id}`)).data, "Failed to delete the complaint");

/* ===================== ADMIN SIDE ===================== */

export const getComplaints = (filters: ComplaintFilters = {}) =>
  wrap(async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v !== undefined));
    const res = (await http.get("/complaints", { params })).data;
    return res as { data: Complaint[]; pagination: { page: number; limit: number; total: number; pages: number } };
  }, "Failed to load complaints");

export const getComplaint = (id: string) =>
  wrap(async () => (await http.get(`/complaints/${id}`)).data.data as Complaint, "Failed to load the complaint");

export const replyToComplaint = (id: string, reply: string) =>
  wrap(async () => (await http.patch(`/complaints/${id}/reply`, { reply })).data.data as Complaint, "Failed to save the reply");

export const updateComplaintNote = (id: string, note: string) =>
  wrap(async () => (await http.patch(`/complaints/${id}/note`, { note })).data.data as Complaint, "Failed to save the note");

export const deleteComplaint = (id: string) =>
  wrap(async () => (await http.delete(`/complaints/${id}`)).data, "Failed to delete the complaint");
