import http from "./http";

/* ===================== TYPES & INTERFACES ===================== */
export type LeadStatus =
  | "New"
  | "Not Pick"
  | "Not Interested"
  | "Interested"
  | "Paid"
  | "Sale"
  | "active"
  | "inactive"
  | "Follow-up"
  | "Rejected"
  | "Busy"
  | "Wrong Number"
  | "Contacted";

export interface Lead {
  _id: string;
  name: string;
  phone: string;
  course: string;
  status: LeadStatus;
  remarks?: string;
  followUpDate?: string;
  assignedTo?: { _id: string; name: string; email: string } | string | null;
  createdAt: string;
  saleAmount?: number;
  source?: string;
  city?: string;
}

export interface LeadPayload {
  name: string;
  phone: string;
  course: string;
  source?: string;
  city?: string;
  assignedTo?: string;
  status?: string;
  remarks?: string;
  followUpDate?: string;
  saleAmount?: number;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  leads?: T;
  count?: number;
}

/* ===================== HELPER: NORMALIZE STATUS ===================== */
const normalizeLeads = (leads: any[]): Lead[] => {
  if (!Array.isArray(leads)) return [];
  return leads.map((l) => {
    const rawStatus = l.status?.toLowerCase() || "new";
    let finalStatus: LeadStatus;

    if (rawStatus === "active" || rawStatus === "inactive") {
      finalStatus = rawStatus as LeadStatus;
    } else {
      finalStatus = (rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)) as LeadStatus;
    }

    return { ...l, status: finalStatus };
  });
};

/* ===================== CORE LEAD FUNCTIONS ===================== */

export const getLeads = async (params: {
  search?: string;
  filter?: string;
  start?: string;
  end?: string
}): Promise<Lead[]> => {
  try {
    const res = await http.get<ApiResponse<any[]>>("/lead", { params });
    if (res.data && res.data.success) {
      return normalizeLeads(res.data.data);
    }
    return [];
  } catch (err: any) {
    console.error("Fetch Leads Error:", err.message);
    return [];
  }
};

export const getLeadsByRole = async (role: string, filter?: string, userId?: string): Promise<Lead[]> => {
  try {
    const url = role === "csr" && userId ? `/lead/csr/${userId}` : "/lead";
    const res = await http.get<ApiResponse<any[]>>(url, {
      params: { filter }
    });

    if (res.data && res.data.success) {
      const rawLeads = res.data.data || res.data.leads || [];
      return normalizeLeads(rawLeads);
    }
    return [];
  } catch (err: any) {
    console.error("Fetch Role Leads Error:", err.message);
    return [];
  }
};

export const createLead = async (data: LeadPayload): Promise<Lead> => {
  try {
    const payload = {
      ...data,
      status: data.status?.toLowerCase() || "new"
    };
    const res = await http.post<ApiResponse<Lead>>("/lead/create", payload);
    return res.data.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || "Failed to create lead");
  }
};

export const updateLead = async (id: string, data: Partial<LeadPayload>): Promise<Lead> => {
  try {
    const res = await http.patch<ApiResponse<Lead>>(`/lead/${id}`, data);
    return res.data.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || "Failed to update lead");
  }
};

export const deleteLead = async (id: string): Promise<void> => {
  try {
    await http.delete(`/lead/${id}`);
  } catch (err: any) {
    throw new Error(err.response?.data?.message || "Failed to delete lead");
  }
};

/* ===================== SPECIAL ACTIONS ===================== */

export const deleteAllLeads = async (): Promise<void> => {
  try {
    await http.delete("/lead/delete/all");
  } catch (err: any) {
    throw new Error(err.response?.data?.message || "Failed to delete all leads");
  }
};

export const convertLeadToSale = async (id: string, saleAmount: number): Promise<Lead> => {
  try {
    const res = await http.post<ApiResponse<Lead>>(`/lead/convert-to-sale/${id}`, { amount: saleAmount });
    return res.data.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || "Conversion failed");
  }
};

/**
 * FIXED: Bulk Insert Function
 * Dono keys (csrId aur assignedTo) bhej raha hoon taake backend kisi bhi field ko pick kar sake.
 */
export const bulkInsertLeads = async (file: File, userId: string): Promise<any> => {
  try {
    if (!userId) throw new Error("User ID is required for bulk upload");

    const formData = new FormData();
    formData.append("file", file); // Standard key for multer
    formData.append("csrId", userId); // Key requested by your backend error
    formData.append("assignedTo", userId); // Fallback key

    const res = await http.post("/lead/bulk/upload-excel", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      },
    });

    return res.data;
  } catch (err: any) {
    // Console mein exact error check karne ke liye
    console.error("API Bulk Upload Error Detail:", err.response?.data);
    throw new Error(err.response?.data?.message || "Excel upload failed on server");
  }
};