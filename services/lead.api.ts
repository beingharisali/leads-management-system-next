import http from "./http";

/* ===================== TYPES ===================== */

export interface LeadPayload {
    name: string;
    phone: string;
    course: string;
    source?: string;
    assignedTo?: string;
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

// Get leads by role
export const getLeadsByRole = async (
    role: string,
    csrId?: string
): Promise<Lead[]> => {
    let url = "/lead"; // Admin: all leads

    // CSR logged-in (without id) or admin fetching CSR leads
    if (role === "csr") {
        url = csrId ? `/lead/csr/${csrId}` : `/lead/csr`;
    }

    try {
        const res = await http.get<{ success: boolean; message: string; data: Lead[]; count: number }>(url);
        return res.data.data || [];
    } catch (err) {
        console.error("Error fetching leads:", err);
        return []; // Fail-safe: return empty array
    }
};

// Create a new lead
export const createLead = async (data: LeadPayload): Promise<Lead> => {
    const res = await http.post<Lead>("/lead/create-leads", data);
    return res.data;
};

// Update lead
export const updateLead = async (id: string, data: UpdateLeadPayload): Promise<Lead> => {
    const res = await http.patch<Lead>(`/lead/update-leads/${id}`, data);
    return res.data;
};

// Delete lead
export const deleteLead = async (id: string): Promise<{ message: string }> => {
    const res = await http.delete<{ message: string }>(`/lead/delete-leads/${id}`);
    return res.data;
};

// Convert lead to sale
export const convertLeadToSale = async (id: string, amount: number): Promise<Lead> => {
    const res = await http.post<Lead>(`/lead/convert-to-sale/${id}`, { amount });
    return res.data;
};

/* ===================== EXCEL UPLOAD ===================== */

// Upload Excel
export const uploadExcelLeads = async (file: File): Promise<{ message: string }> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await http.post<{ message: string }>("/lead/upload-excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
};
