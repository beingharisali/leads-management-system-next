import http from "./http";

/* ===================== TYPES ===================== */

export interface AdmissionCourse {
  id: string;
  name: string;
  category: string;
  url: string;
  outline: string[];
}

// Versioned admission terms (leads-management-system-node/config/admissionForm.js)
export interface AdmissionTerms {
  version: string;
  checkboxText: string;
  terms: string[];
  identityNotice: string;
  beforeStartRefundTerms: string;
  complaintContact: string;
  additionalTerms: string;
  schedule: string;
  totalFeePKR: number | null;
}

export interface PublicFormInfo {
  csrName: string;
  courses: AdmissionCourse[];
  outlineCheckedOn: string;
  terms: AdmissionTerms;
}

export interface AdmissionSubmission {
  fullName: string;
  phone: string;
  courseId: string;
  idCard: Blob;
  selfie: Blob;
  termsVersion: string;
  // Honeypot - hidden from people, left empty
  website: string;
}

// Exactly what the student agreed to, as saved on the server
export interface AdmissionSnapshot {
  version: string;
  checkboxText: string;
  terms: string[];
  identityNotice: string;
  admission: {
    courseId: string;
    course: string;
    courseUrl: string;
    outline: string;
    outlineCheckedOn: string;
    schedule: string;
    totalFeePKR: number | null;
    complaintContact: string;
    beforeStartRefundTerms: string;
    additionalTerms: string;
  };
}

export interface AdmissionReceipt {
  receiptId: string;
  reference: string;
  fullName: string;
  acceptedAt: string;
  termsHash: string;
  snapshot: AdmissionSnapshot;
}

// Returned after a successful submission
export interface SubmissionResult {
  receipt: AdmissionReceipt;
  // CSR who shared the link; whatsapp is their official number ("" if none)
  csr: { name: string; whatsapp: string };
}

export type AdmissionSyncStatus = "pending" | "synced" | "failed";

export type PaymentStatus = "pending" | "paid";

export interface Admission {
  _id: string;
  receiptId?: string;
  fullName: string;
  phone: string;
  course: string;
  idCardUrl: string;
  selfieUrl: string;
  consent?: { acceptedAt: string; termsVersion: string; termsHash: string };
  payment: {
    status: PaymentStatus;
    amount?: number | null;
    paidAt?: string | null;
    screenshotUrl: string;
  };
  createdAt: string;
  sync: { status: AdmissionSyncStatus; attempts: number; syncedAt: string | null };
}

export interface MyAdmissionsResponse {
  data: Admission[];
  page: number;
  total: number;
  totalPages: number;
}

/* ===================== PUBLIC ===================== */

export const getPublicForm = async (code: string): Promise<PublicFormInfo> => {
  const res = await http.get(`/admission/form/${encodeURIComponent(code)}`);
  return res.data.data;
};

// Resolves with the receipt (null only when the honeypot was filled)
export const submitPublicForm = async (code: string, values: AdmissionSubmission): Promise<SubmissionResult | null> => {
  const data = new FormData();
  data.set("fullName", values.fullName);
  data.set("phone", values.phone);
  data.set("courseId", values.courseId);
  data.set("termsVersion", values.termsVersion);
  data.set("accepted", "true");
  data.set("selfieMethod", "camera");
  data.set("website", values.website);
  data.set("idCard", values.idCard, "id-card.jpg");
  data.set("selfie", values.selfie, "selfie.jpg");

  // Photos on a slow mobile connection need longer than the default timeout
  const res = await http.post(`/admission/form/${encodeURIComponent(code)}`, data, { timeout: 120000 });
  return res.data.data?.receipt ? res.data.data : null;
};

/* ===================== CSR ===================== */

export const getMyAdmissionCode = async (): Promise<string> => {
  const res = await http.get("/admission/my-link");
  return res.data.data.code;
};

export const getMyAdmissions = async (page = 1, limit = 20): Promise<MyAdmissionsResponse> => {
  const res = await http.get("/admission/mine", { params: { page, limit } });
  return res.data;
};

// Admissions the CSR hasn't been alerted about yet
export interface UnseenAdmission {
  _id: string;
  fullName: string;
  phone: string;
  course: string;
  createdAt: string;
}

export const getUnseenAdmissions = async (): Promise<UnseenAdmission[]> => {
  const res = await http.get("/admission/notifications");
  return res.data.data;
};

export const markAdmissionsSeen = async (): Promise<void> => {
  await http.post("/admission/notifications/seen");
};

// CSR got the payment screenshot on WhatsApp: records the Sale and closes
// the lead as Paid.
export const markAdmissionPaid = async (id: string, amount: number, screenshot: File): Promise<Admission> => {
  const data = new FormData();
  data.set("amount", String(amount));
  data.set("screenshot", screenshot);
  const res = await http.post(`/admission/${encodeURIComponent(id)}/payment`, data, { timeout: 60000 });
  return res.data.data;
};

// "0300-1234567" -> "923001234567" for wa.me links
export const toWhatsAppNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0092")) return digits.slice(2);
  if (digits.startsWith("0")) return `92${digits.slice(1)}`;
  return digits;
};

// Public URL a CSR shares - served by this same frontend.
export const admissionFormUrl = (code: string) =>
  typeof window === "undefined" ? `/admission/${code}` : `${window.location.origin}/admission/${code}`;
