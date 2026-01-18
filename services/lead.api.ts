import http from "./http";

/* ===================== TYPES ===================== */

export interface LeadPayload {
    name: string;
    phone: string;
    course: string;
    source?: string;
    assignedTo?: string; // for Admin assigning CSR
}

export interface UpdateLeadPayload {
    name?: string;
    phone?: string;
    course?: string;
    status?: string;
}

/* ===================== CSR / ADMIN ===================== */

// CSR: Get own leads
export const getMyLeads = async () => {
    const res = await http.get("/lead/csr");
    return res.data;
};

// Create a new lead (CSR or Admin)
export const createLead = async (data: LeadPayload) => {
    const res = await http.post("/lead/create-leads", data);
    return res.data;
};

// Update lead (CSR: only their leads, Admin: any lead)
export const updateLead = async (id: string, data: UpdateLeadPayload) => {
    const res = await http.patch(`/lead/update-leads/${id}`, data);
    return res.data;
};

// Delete lead
export const deleteLead = async (id: string) => {
    const res = await http.delete(`/lead/delete-leads/${id}`);
    return res.data;
};

// Convert lead to sale
export const convertLeadToSale = async (id: string, amount: number) => {
    const res = await http.post(`/lead/convert-to-sale/${id}`, { amount });
    return res.data;
};

/* ===================== EXCEL UPLOAD ===================== */

// Upload Excel (Admin only or CSR if allowed)
export const uploadExcelLeads = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await http.post("/lead/upload-excel", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return res.data;
};
