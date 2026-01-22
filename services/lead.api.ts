import http from "./http";

/* ===================== TYPES & INTERFACES ===================== */
export interface Lead {
  _id: string;
  name: string;
  phone: string;
  course: string;
  status?: "new" | "contacted" | "interested" | "converted" | "rejected";
  source?: string;
  assignedTo?: { _id: string; name: string; email: string } | null;
  createdAt?: string;
  saleAmount?: number;
}

export interface LeadPayload {
  name: string;
  phone: string;
  course: string;
  source?: string;
  assignedTo?: string;
  status?: string;
}

export interface UpdateLeadPayload extends Partial<LeadPayload> {}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  count?: number;
}

/* ===================== CORE LEAD FUNCTIONS ===================== */

export const getLeadsByRole = async (
  role: string,
  csrId?: string,
): Promise<Lead[]> => {
  try {
    const url =
      role === "csr"
        ? csrId
          ? `/lead/csr/${csrId}`
          : `/lead/csr`
        : "/lead/get-all-leads";
    const res = await http.get<ApiResponse<Lead[]>>(url);
    return res.data.data || [];
  } catch (err: any) {
    console.error("Fetch Leads Error:", err.message);
    return [];
  }
};

export const createLead = async (data: LeadPayload): Promise<Lead> => {
  try {
    const res = await http.post<ApiResponse<Lead>>("/lead/create-leads", data);
    return res.data.data;
  } catch (err: any) {
    throw new Error(err.message || "Failed to create lead");
  }
};

export const updateLead = async (
  id: string,
  data: UpdateLeadPayload,
): Promise<Lead> => {
  try {
    const res = await http.patch<ApiResponse<Lead>>(
      `/lead/update-leads/${id}`,
      data,
    );
    return res.data.data;
  } catch (err: any) {
    throw new Error(err.message || "Failed to update lead");
  }
};

export const deleteLead = async (
  id: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await http.delete<ApiResponse<null>>(
      `/lead/delete-leads/${id}`,
    );
    return { success: res.data.success, message: res.data.message };
  } catch (err: any) {
    throw new Error(err.message || "Failed to delete lead");
  }
};

export const convertLeadToSale = async (
  id: string,
  amount: number = 0,
): Promise<Lead> => {
  try {
    const res = await http.post<ApiResponse<Lead>>(
      `/lead/convert-to-sale/${id}`,
      { amount },
    );
    return res.data.data;
  } catch (err: any) {
    throw new Error(err.message || "Failed to convert lead to sale");
  }
};

/* ===================== EXCEL OPERATIONS ===================== */

export const uploadExcelLeads = async (
  file: File,
  csrId: string,
): Promise<any> => {
  if (!file) throw new Error("Please select an Excel file.");

  // Safety Check: Backend ko ID chahiye, name nahi.
  if (!csrId || csrId.includes(" ")) {
    throw new Error(
      "Invalid Selection: System is capturing Name instead of ID. Please refresh and try again.",
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("csrId", csrId);

  try {
    // Axios automatically sets multipart/form-data when sending FormData
    const res = await http.post("/lead/bulk-insert-excel", formData);
    return res.data;
  } catch (err: any) {
    const errMsg =
      err.response?.data?.message || err.message || "Upload failed";
    console.error("Bulk Insert Error Detail:", errMsg);
    throw new Error(errMsg);
  }
};
