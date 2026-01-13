import http from "./http";

export interface DashboardStats {
    totalLeads: number;
    totalSales: number;
    conversionRate: number; // percentage
    leadsOverTime: { date: string; leads: number; sales: number }[];
}

export async function getCsrDashboardStats(): Promise<DashboardStats> {
    const res = await http.get("/dashboard/csr");
    return res.data;
}
