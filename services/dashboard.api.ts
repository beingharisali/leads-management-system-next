import http from "./http"; // axios instance

// Type definition
type Filter = "day" | "week" | "month" | "custom" | string;

/**
 * Helper to parse filter strings into clean Axios params
 * Converts "custom&start=2024-01-01&end=2024-01-10" 
 * into { filter: "custom", start: "2024-01-01", end: "2024-01-10" }
 */
const buildParams = (filter?: Filter) => {
    let params: any = {};
    if (!filter) return params;

    if (typeof filter === "string" && filter.includes("&")) {
        const parts = filter.split("&");
        params.filter = parts[0]; // "custom"
        parts.slice(1).forEach((part) => {
            const [key, value] = part.split("=");
            if (key && value) params[key] = value;
        });
    } else {
        params.filter = filter;
    }
    return params;
};

/* ===================== CSR ===================== */

// CSR: Get their own leads
export const getCSRLeads = async () => {
    const res = await http.get("/lead/csr");
    return res.data.data;
};

// CSR: Get their own dashboard stats
export const getCSRStats = async (filter?: Filter) => {
    const res = await http.get("/dashboard/csr-stats", {
        params: buildParams(filter),
    });
    return res.data;
};

/* ===================== ADMIN ===================== */

// Admin dashboard stats
export const getAdminStats = async (filter?: Filter) => {
    const res = await http.get("/dashboard/admin-stats", {
        params: buildParams(filter),
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
        params: buildParams(filter),
    });
    return res.data;
};

/* ===================== LEADS ===================== */

export const getLeadsByRole = async (role: "admin" | "csr") => {
    const endpoint = role === "admin" ? "/lead/get-all-leads" : "/lead/csr";
    const res = await http.get(endpoint);
    return res.data.data;
};

export const createLead = async (payload: {
    name: string;
    phone: string;
    course: string;
    assignedTo?: string;
}) => {
    const res = await http.post("/lead/create-leads", payload);
    return res.data.data;
};

export const updateLead = async (id: string, payload: {
    name?: string;
    phone?: string;
    course?: string;
    assignedTo?: string;
}) => {
    const res = await http.patch(`/lead/update-leads/${id}`, payload);
    return res.data.data;
};

export const deleteLead = async (id: string) => {
    const res = await http.delete(`/lead/delete-leads/${id}`);
    return res.data;
};

export const convertLeadToSale = async (leadId: string, amount: number) => {
    const res = await http.post(`/lead/convert-to-sale/${leadId}`, { amount });
    return res.data.data;
};

export const uploadExcelLeads = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await http.post("/lead/upload-excel", formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
};