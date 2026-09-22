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

interface PaginatedApiResponse<T> extends ApiResponse<T> {
  totalCount: number;
  page: number;
  totalPages: number;
}

export interface PaginatedLeadsResult {
  data: Lead[];
  totalCount: number;
  page: number;
  totalPages: number;
}

const EMPTY_PAGE: PaginatedLeadsResult = {
  data: [],
  totalCount: 0,
  page: 1,
  totalPages: 1,
};

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

// Paginated variant for lists/tables that need page controls + accurate
// totals (admin/leads and csr/leads/list pages). Routes match the current
// backend layout: /lead/admin/all and /lead/by-date.
export const getAllLeadsPaginated = async (
  page = 1,
  limit = 20,
): Promise<PaginatedLeadsResult> => {
  try {
    const res = await http.get<PaginatedApiResponse<any[]>>(
      "/lead/admin/all",
      { params: { page, limit } },
    );
    return {
      data: normalizeLeads(res.data.data || []),
      totalCount: res.data.totalCount ?? 0,
      page: res.data.page ?? page,
      totalPages: res.data.totalPages ?? 1,
    };
  } catch (err: any) {
    console.error("Fetch All Leads Error:", err.message);
    return EMPTY_PAGE;
  }
};

// Leads scoped to a day/week/month window, paginated at the DB level.
// CSRs always get their own leads; admins get everything, or a single
// CSR's leads when `csrId` is passed.
export const getLeadsByDateFiltered = async (
  filter: "day" | "week" | "month",
  opts?: { page?: number; limit?: number; csrId?: string },
): Promise<PaginatedLeadsResult> => {
  try {
    const res = await http.get<PaginatedApiResponse<any[]>>(
      "/lead/by-date",
      {
        params: {
          filter,
          page: opts?.page,
          limit: opts?.limit,
          csrId: opts?.csrId || undefined,
        },
      },
    );
    return {
      data: normalizeLeads(res.data.data || []),
      totalCount: res.data.totalCount ?? 0,
      page: res.data.page ?? opts?.page ?? 1,
      totalPages: res.data.totalPages ?? 1,
    };
  } catch (err: any) {
    console.error("Fetch Leads By Date Error:", err.message);
    return EMPTY_PAGE;
  }
};

/**
 * UPDATED: Admin ke liye '/admin/all' use karega jo backend routes mein defined hai.
 */
export const getLeadsByRole = async (role: string, filter?: string, userId?: string): Promise<Lead[]> => {
  try {
    // Admin ke liye endpoint '/lead/admin/all' banta hai (backend route list ke mutabiq)
    const url = role === "admin" ? "/lead/admin/all" : (role === "csr" && userId ? `/lead/csr/${userId}` : "/lead");

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

/**
 * FIXED: Route updated to match backend: router.delete("/admin/delete-all")
 */
export const deleteAllLeads = async (): Promise<void> => {
  try {
    await http.delete("/lead/admin/delete-all");
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
 * Bulk Insert Function (As per your requirement)
 */
export const bulkInsertLeads = async (file: File, userId: string): Promise<any> => {
  try {
    if (!userId) throw new Error("User ID is required for bulk upload");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("csrId", userId);
    formData.append("assignedTo", userId);

    const res = await http.post("/lead/bulk/upload-excel", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      },
    });

    return res.data;
  } catch (err: any) {
    console.error("API Bulk Upload Error Detail:", err.response?.data);
    throw new Error(err.response?.data?.message || "Excel upload failed on server");
  }
};