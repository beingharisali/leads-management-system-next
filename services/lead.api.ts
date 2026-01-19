import http from "./http";

/* ===================== TYPES ===================== */

export interface LeadPayload {
    name: string;
    phone: string;
    course: string;
    source?: string;
    assignedTo?: string; // ✅ always string
}

export interface UpdateLeadPayload {
    name?: string;
    phone?: string;
    course?: string;
    status?: string;
    assignedTo?: string;
}

export interface Lead {
    _id: string;
    name: string;
    phone: string;
    course: string;
    status?: string;
    assignedTo?: { _id: string; name: string } | null;
}

/* ===================== CSR / ADMIN ===================== */

// Get leads by role (CSR or Admin)
export const getLeadsByRole = async (role: string, csrId?: string): Promise<Lead[]> => {
    let url = "/lead/get-all-leads"; // Admin: fetch all leads

    if (role === "csr") {
        // CSR fetching own leads
        url = csrId ? `/lead/csr/${csrId}` : `/lead/csr`;
    }

    try {
        const res = await http.get<{ success: boolean; message: string; data: Lead[]; count: number }>(url);
        return res.data.data || [];
    } catch (err) {
        console.error("Error fetching leads:", err);
        return [];
    }
};

// Create a new lead
export const createLead = async (data: LeadPayload): Promise<Lead> => {
    const res = await http.post<{ success: boolean; message: string; data: Lead }>("/lead/create-leads", data);
    return res.data.data;
};

// Update lead
export const updateLead = async (id: string, data: UpdateLeadPayload): Promise<Lead> => {
    const res = await http.patch<{ success: boolean; message: string; data: Lead }>(`/lead/update-leads/${id}`, data);
    return res.data.data;
};

// Delete lead
export const deleteLead = async (id: string): Promise<{ message: string }> => {
    const res = await http.delete<{ success: boolean; message: string }>(`/lead/delete-leads/${id}`);
    return res.data;
};

// Convert lead to sale
export const convertLeadToSale = async (id: string, amount: number): Promise<Lead> => {
    const res = await http.post<{ success: boolean; message: string; data: Lead }>(`/lead/convert-to-sale/${id}`, { amount });
    return res.data.data;
};

/* ===================== EXCEL UPLOAD ===================== */

// Upload Excel file for leads
export const uploadExcelLeads = async (file: File): Promise<{ message: string }> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await http.post<{ success: boolean; message: string }>("/lead/upload-excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
};

// ===================== BULK INSERT (ADMIN) =====================
export const bulkInsertLeads = async (file: File): Promise<{ message: string }> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await http.post<{ success: boolean; message: string }>("/lead/bulk-insert-excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
};
