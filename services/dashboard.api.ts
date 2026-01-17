import http from "./http"; // axios instance

type Filter = "day" | "week" | "month";

/* ===================== CSR ===================== */

// CSR: Get their own leads
export const getCSRLeads = async () => {
    const res = await http.get("/lead/csr"); // ✅ backend route match
    return res.data;
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
        params: filter ? { filter } : {},
    });
    return res.data;
};

// Admin: Get leads of a specific CSR
export const getLeadsByCSR = async (csrId: string) => {
    const res = await http.get(`/lead/csr/${csrId}`);
    return res.data;
};

// Admin: Get CSR stats by CSR ID
export const getCSRStatsByAdmin = async (csrId: string, filter?: Filter) => {
    const res = await http.get(`/dashboard/csr-stats/${csrId}`, {
        params: filter ? { filter } : {},
    });
    return res.data;
};
