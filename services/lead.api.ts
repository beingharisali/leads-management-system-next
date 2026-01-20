import http from "./http";

/* ===================== TYPES ===================== */

export interface LeadPayload {
    name: string;
    phone: string;
    course: string;
    source?: string;
    assignedTo?: string; // CSR ID
    createdBy?: string;
    status?: string; // optional status
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

export interface ExcelLead {
    name: string;
    phone: string;
    course: string;
}

/* ===================== CSR / ADMIN ===================== */

// Get leads by role (CSR or Admin)
export const getLeadsByRole = async (role: string, csrId?: string): Promise<Lead[]> => {
    try {
        const url =
            role === "csr"
                ? csrId
                    ? `/lead/csr/${csrId}`
                    : `/lead/csr`
                : "/lead/get-all-leads";
        const res = await http.get<{ success: boolean; message: string; data: Lead[]; count: number }>(url);
        return res.data.data || [];
    } catch (err: any) {
        console.error("Error fetching leads:", err.response?.data?.message || err.message);
        return [];
    }
};

// Create a new lead
export const createLead = async (data: LeadPayload): Promise<Lead> => {
    try {
        const res = await http.post<{ success: boolean; message: string; data: Lead }>("/lead/create-leads", data);
        return res.data.data;
    } catch (err: any) {
        throw new Error(err.response?.data?.message || "Failed to create lead");
    }
};

// Update lead
export const updateLead = async (id: string, data: UpdateLeadPayload): Promise<Lead> => {
    try {
        const res = await http.patch<{ success: boolean; message: string; data: Lead }>(`/lead/update-leads/${id}`, data);
        return res.data.data;
    } catch (err: any) {
        throw new Error(err.response?.data?.message || "Failed to update lead");
    }
};

// Delete lead
export const deleteLead = async (id: string): Promise<{ message: string }> => {
    try {
        const res = await http.delete<{ success: boolean; message: string }>(`/lead/delete-leads/${id}`);
        return res.data;
    } catch (err: any) {
        throw new Error(err.response?.data?.message || "Failed to delete lead");
    }
};

// Convert lead to sale
export const convertLeadToSale = async (id: string, amount: number): Promise<Lead> => {
    try {
        const res = await http.post<{ success: boolean; message: string; data: Lead }>(
            `/lead/convert-to-sale/${id}`,
            { amount }
        );
        return res.data.data;
    } catch (err: any) {
        throw new Error(err.response?.data?.message || "Failed to convert lead to sale");
    }
};

/* ===================== EXCEL UPLOAD (CSR) ===================== */

/**
 * Upload Excel leads for CSR
 * Backend expects payload:
 * {
 *   leads: [{name, phone, course}],
 *   assignedTo: "csrId"
 * }
 */
export const uploadExcelLeads = async (leads: ExcelLead[], csrId: string): Promise<{ message: string }> => {
    try {
        // Filter out invalid leads (optional)
        const validLeads = leads.filter(l => l.name && l.phone && l.course);

        if (!validLeads.length) throw new Error("No valid leads to upload");

        const payload = {
            leads: validLeads,
            assignedTo: csrId,
        };

        const res = await http.post<{ success: boolean; message: string }>("/lead/upload-excel-array", payload);
        return res.data;
    } catch (err: any) {
        console.error("Excel upload error:", err);
        throw new Error(err.response?.data?.message || err.message || "Excel upload failed");
    }
};

/* ===================== BULK INSERT (ADMIN) ===================== */

// Bulk insert (Admin) – still using file
export const bulkInsertLeads = async (file: File): Promise<{ message: string }> => {
    try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await http.post<{ success: boolean; message: string }>("/lead/bulk-insert-excel", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return res.data;
    } catch (err: any) {
        throw new Error(err.response?.data?.message || "Bulk insert failed");
    }
};
