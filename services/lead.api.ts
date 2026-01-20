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

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    count?: number;
}

/* ===================== CORE LEAD FUNCTIONS ===================== */

export const getLeadsByRole = async (role: string, csrId?: string): Promise<Lead[]> => {
    try {
        const url = role === "csr"
            ? (csrId ? `/lead/csr/${csrId}` : `/lead/csr`)
            : "/lead/get-all-leads";

        const res = await http.get<ApiResponse<Lead[]>>(url);
        return res.data.data || [];
    } catch (err: any) {
        console.error(err.response?.data?.message || "Error fetching leads");
        return [];
    }
};

export const createLead = async (data: LeadPayload): Promise<Lead> => {
    try {
        const res = await http.post<ApiResponse<Lead>>("/lead/create-leads", data);
        return res.data.data;
    } catch (err: any) {
        throw new Error(err.response?.data?.message || "Failed to create lead");
    }
};

// Common update function
export const updateLead = async (id: string, data: UpdateLeadPayload): Promise<Lead> => {
    try {
        const res = await http.patch<ApiResponse<Lead>>(`/lead/update-leads/${id}`, data);
        return res.data.data;
    } catch (err: any) {
        throw new Error(err.response?.data?.message || "Failed to update lead");
    }
};

// ADDED: This will fix your "red error" in the panel
export const updateLeadStatus = async (id: string, status: string): Promise<Lead> => {
    try {
        const res = await http.patch<ApiResponse<Lead>>(`/lead/update-leads/${id}`, { status });
        return res.data.data;
    } catch (err: any) {
        throw new Error(err.response?.data?.message || "Failed to update status");
    }
};

export const deleteLead = async (id: string): Promise<{ success: boolean; message: string }> => {
    try {
        const res = await http.delete<ApiResponse<null>>(`/lead/delete-leads/${id}`);
        return { success: res.data.success, message: res.data.message };
    } catch (err: any) {
        throw new Error(err.response?.data?.message || "Failed to delete lead");
    }
};

export const convertLeadToSale = async (id: string, amount: number = 0): Promise<Lead> => {
    try {
        const res = await http.post<ApiResponse<Lead>>(`/lead/convert-to-sale/${id}`, { amount });
        return res.data.data;
    } catch (err: any) {
        throw new Error(err.response?.data?.message || "Failed to convert lead to sale");
    }
};

/* ===================== EXCEL OPERATIONS ===================== */

export const uploadExcelLeads = async (file: File, csrId: string): Promise<ApiResponse<any>> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("assignedTo", csrId);

    try {
        const res = await http.post<ApiResponse<any>>("/lead/upload-excel", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return res.data;
    } catch (err: any) {
        throw new Error(err.response?.data?.message || "Excel upload failed");
    }
};

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