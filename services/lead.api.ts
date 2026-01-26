import http from "./http";

/* ===================== TYPES & INTERFACES ===================== */
export type LeadStatus = "New" | "Not Pick" | "Not Interested" | "Interested" | "Paid" | "Sale" | "active" | "inactive";

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

/* ===================== HELPER: NORMALIZE STATUS (FIXED) ===================== */
const normalizeLeads = (leads: any[]): Lead[] => {
  if (!Array.isArray(leads)) return [];
  return leads.map((l) => {
    // Agar status 'active' ya 'inactive' hai toh capitalize nahi karna (taake dashboard na tootay)
    const rawStatus = l.status?.toLowerCase() || "new";
    let finalStatus: LeadStatus;

    if (rawStatus === "active" || rawStatus === "inactive") {
      finalStatus = rawStatus as LeadStatus;
    } else {
      // Baaki leads ke liye purana capitalization logic barkarar rakha hai
      finalStatus = (rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)) as LeadStatus;
    }

    return {
      ...l,
      status: finalStatus
    };
  });
};

/* ===================== CORE LEAD FUNCTIONS ===================== */

/**
 * FETCH LEADS
 */
export const getLeadsByRole = async (role: string, userId?: string): Promise<Lead[]> => {
  try {
    const url = role === "csr" && userId ? `/lead/csr/${userId}` : "/lead";
    const res = await http.get<ApiResponse<any[]>>(url);

    if (res.data && res.data.success) {
      const rawLeads = res.data.data || res.data.leads || [];
      return normalizeLeads(rawLeads);
    }

    return [];
  } catch (err: any) {
    console.error("Fetch Leads Error:", err.message);
    return [];
  }
};

/**
 * CREATE LEAD
 */
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

/**
 * UPDATE LEAD
 */
export const updateLead = async (id: string, data: Partial<LeadPayload>): Promise<Lead> => {
  try {
    const res = await http.patch<ApiResponse<Lead>>(`/lead/${id}`, data);
    return res.data.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || "Failed to update lead");
  }
};

/**
 * DELETE SINGLE LEAD
 */
export const deleteLead = async (id: string): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await http.delete<ApiResponse<null>>(`/lead/${id}`);
    return { success: res.data.success, message: res.data.message };
  } catch (err: any) {
    throw new Error(err.response?.data?.message || "Failed to delete lead");
  }
};

/* ===================== SPECIAL ACTIONS ===================== */

export const deleteAllLeads = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await http.delete<ApiResponse<null>>("/lead/admin/delete-all");
    return { success: res.data.success, message: res.data.message };
  } catch (err: any) {
    throw new Error(err.response?.data?.message || "Wipe failed");
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

export const bulkInsertLeads = async (file: File, csrId: string): Promise<any> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("csrId", csrId);

  try {
    const res = await http.post("/lead/bulk/upload-excel", formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.message || "Excel upload failed");
  }
};