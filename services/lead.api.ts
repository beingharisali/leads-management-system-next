import http from "./http";

/* ===================== TYPES & INTERFACES ===================== */
export type LeadStatus = "New" | "Not Pick" | "Not Interested" | "Interested" | "Paid" | "Sale";

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
  leads?: T; // Handling inconsistency
  count?: number;
}

/* ===================== HELPER: NORMALIZE STATUS ===================== */
const normalizeLeads = (leads: any[]): Lead[] => {
  if (!Array.isArray(leads)) return []; // Safety check
  return leads.map((l) => ({
    ...l,
    status: l.status
      ? (l.status.charAt(0).toUpperCase() + l.status.slice(1).toLowerCase()) as LeadStatus
      : "New"
  }));
};

/* ===================== CORE LEAD FUNCTIONS ===================== */

/**
 * FETCH LEADS (FIXED LOGIC)
 */
export const getLeadsByRole = async (role: string, userId?: string): Promise<Lead[]> => {
  try {
    // Check karein ke Admin ke liye backend endpoint '/lead' hi hai ya '/lead/all'?
    // Aksar admin ke liye '/lead' saari leads lata hai.
    const url = role === "csr" && userId ? `/lead/csr/${userId}` : "/lead";

    const res = await http.get<ApiResponse<any[]>>(url);

    console.log(`API Response (${role}):`, res.data);

    if (res.data && res.data.success) {
      // Backend agar 'data' bhej raha hai ya 'leads', dono ko handle kiya
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