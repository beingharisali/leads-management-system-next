import http from "./http"; // axios instance

// Type ko update kiya taake 'custom' aur dynamic strings bhi allow hon
type Filter = "day" | "week" | "month" | "custom" | string;

/* ===================== CSR ===================== */

// CSR: Get their own leads
export const getCSRLeads = async () => {
    const res = await http.get("/lead/csr");
    return res.data.data;
};

// CSR: Get their own dashboard stats
export const getCSRStats = async (filter?: Filter) => {
    const res = await http.get("/dashboard/csr-stats", {
        params: filter ? { filter } : {},
    });
    return res.data;
};

/* ===================== ADMIN ===================== */

// Admin dashboard stats
export const getAdminStats = async (filter?: Filter) => {
    const res = await http.get("/dashboard/admin-stats", {
        // Agar filter string hai toh axios usey query param mein sahi bhejega
        params: filter ? { filter } : {},
    });
    return res.data;
};

// Admin: Get leads of a specific CSR
export const getLeadsByCSR = async (csrId: string) => {
    const res = await http.get(`/lead/csr/${csrId}`);
    return res.data.data;
};

// Admin: Get CSR stats by CSR ID
export const getCSRStatsByAdmin = async (csrId: string, filter?: Filter) => {
    const res = await http.get(`/dashboard/csr-stats/${csrId}`, {
        params: filter ? { filter } : {},
    });
    return res.data;
};

/* ===================== LEADS ===================== */

// Admin & CSR: get leads by role
export const getLeadsByRole = async (role: "admin" | "csr") => {
    if (role === "admin") {
        const res = await http.get("/lead/get-all-leads");
        return res.data.data;
    } else {
        const res = await http.get("/lead/csr");
        return res.data.data;
    }
};

// Create lead
export const createLead = async (payload: {
    name: string;
    phone: string;
    course: string;
    assignedTo?: string;
}) => {
    const res = await http.post("/lead/create-leads", payload);
    return res.data.data;
};

// Update lead
export const updateLead = async (id: string, payload: {
    name?: string;
    phone?: string;
    course?: string;
    assignedTo?: string;
}) => {
    const res = await http.patch(`/lead/update-leads/${id}`, payload);
    return res.data.data;
};

// Delete lead
export const deleteLead = async (id: string) => {
    const res = await http.delete(`/lead/delete-leads/${id}`);
    return res.data;
};

// Convert lead to sale
export const convertLeadToSale = async (leadId: string, amount: number) => {
    const res = await http.post(`/lead/convert-to-sale/${leadId}`, { amount });
    return res.data.data;
};

// Upload Excel leads
export const uploadExcelLeads = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await http.post("/lead/upload-excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
};
