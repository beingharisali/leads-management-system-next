import http from "./http";

/* ===================== TYPES & INTERFACES ===================== */

export interface Lead {
    _id: string;
    name: string;
    phone: string;
    course: string;
    status?: string;
    source?: string;
    assignedTo?: { _id: string; name: string } | null;
    createdAt?: string;
}

export interface LeadPayload {
    name: string;
    phone: string;
    course: string;
    source?: string;
    assignedTo?: string; // CSR ID
    status?: string;
}

export interface UpdateLeadPayload extends Partial<LeadPayload> { }

// Common API Response Wrapper
interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    count?: number;
}

/* ===================== CORE LEAD FUNCTIONS ===================== */

/**
 * Get leads based on role. 
 * If role is 'csr', it fetches leads assigned to that CSR.
 */
export const getLeadsByRole = async (role: string, csrId?: string): Promise<Lead[]> => {
    try {
        const url = role === "csr"
            ? (csrId ? `/lead/csr/${csrId}` : `/lead/csr`)
            : "/lead/get-all-leads";

        const res = await http.get<ApiResponse<Lead[]>>(url);
        return res.data.data || [];
    } catch (err: any) {
        const msg = err.response?.data?.message || "Error fetching leads";
        console.error(msg);
        return [];
    }
};

/**
 * Create a single lead
 */
export const createLead = async (data: LeadPayload): Promise<Lead> => {
    try {
        const res = await http.post<ApiResponse<Lead>>("/lead/create-leads", data);
        return res.data.data;
    } catch (err: any) {
        throw new Error(err.response?.data?.message || "Failed to create lead");
    }
};

/**
 * Update existing lead information
 */
export const updateLead = async (id: string, data: UpdateLeadPayload): Promise<Lead> => {
    try {
        const res = await http.patch<ApiResponse<Lead>>(`/lead/update-leads/${id}`, data);
        return res.data.data;
    } catch (err: any) {
        throw new Error(err.response?.data?.message || "Failed to update lead");
    }
};

/**
 * Delete a lead
 */
export const deleteLead = async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
        const res = await http.delete<ApiResponse<null>>(`/lead/delete-leads/${id}`);
        return { success: res.data.success, message: res.data.message };
    } catch (err: any) {
        throw new Error(err.response?.data?.message || "Failed to delete lead");
    }
};

/**
 * Convert a lead to a sale (CSR/Admin action)
 */
export const convertLeadToSale = async (id: string, amount: number): Promise<Lead> => {
    try {
        const res = await http.post<ApiResponse<Lead>>(`/lead/convert-to-sale/${id}`, { amount });
        return res.data.data;
    } catch (err: any) {
        throw new Error(err.response?.data?.message || "Failed to convert lead to sale");
    }
};

/* ===================== EXCEL OPERATIONS ===================== */

/**
 * CSR Excel Upload: Uploads leads and automatically assigns them to the CSR
 */
export const uploadExcelLeads = async (file: File, csrId: string): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("assignedTo", csrId); // Backend might expect 'assignedTo' or 'csrId'

    try {
        const res = await http.post<ApiResponse<any>>("/lead/upload-excel", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return res.data;
    } catch (err: any) {
        throw new Error(err.response?.data?.message || "Excel upload failed");
    }
};

/**
 * Admin Bulk Insert: Uploads leads to the general pool (or as assigned in Excel)
 */
export const bulkInsertLeads = async (file: File): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
        const res = await http.post<ApiResponse<any>>("/lead/bulk-insert-excel", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return res.data;
    } catch (err: any) {
        throw new Error(err.response?.data?.message || "Bulk insert failed");
    }
};