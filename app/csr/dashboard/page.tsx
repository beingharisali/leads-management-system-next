"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
    getLeadsByRole,
    deleteLead,
    convertLeadToSale,
    createLead,
    updateLead,
    LeadPayload,
} from "@/services/lead.api";
import { getCSRStats } from "@/services/dashboard.api";
import SummaryCard from "@/components/SummaryCard";
import CSRStatsChart from "@/components/CSRStatsChart";
import Loading from "@/components/Loading";
import ErrorMessage from "@/components/ErrorMessage";
import { getUserRole, getUserId, logout, getToken } from "@/utils/decodeToken";
import toast, { Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";

type Filter = "day" | "week" | "month";

interface Stats {
    totalLeads: number;
    totalSales: number;
    conversionRate: string;
    leadsStats: { day: number; week: number; month: number };
    salesStats: { day: number; week: number; month: number };
}

interface Lead {
    _id: string;
    name: string;
    course: string;
    phone: string;
    status?: string;
    assignedTo?: { _id: string; name: string } | null;
}

interface ExcelLead {
    name: string;
    course: string;
    phone: string;
    isValid: boolean;
}

export default function CSRDashboard() {
    const router = useRouter();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [stats, setStats] = useState<Stats>({
        totalLeads: 0,
        totalSales: 0,
        conversionRate: "0%",
        leadsStats: { day: 0, week: 0, month: 0 },
        salesStats: { day: 0, week: 0, month: 0 },
    });
    const [filter, setFilter] = useState<Filter>("day");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [uploading, setUploading] = useState(false);
    const [csrId, setCsrId] = useState<string | null>(null);

    const [excelLeads, setExcelLeads] = useState<ExcelLead[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [leadForm, setLeadForm] = useState({ name: "", course: "", phone: "" });

    // ================= FETCH DATA =================
    const fetchData = async () => {
        try {
            setLoading(true);
            setError("");
            const role = await getUserRole();
            const userId = await getUserId();
            if (!role || !userId) throw new Error("User not authenticated");
            setCsrId(userId);

            const [leadsRes, statsRes] = await Promise.all([
                getLeadsByRole(role, userId),
                getCSRStats(filter),
            ]);

            setLeads(leadsRes || []);
            setStats({
                totalLeads: statsRes?.totalLeads ?? 0,
                totalSales: statsRes?.totalSales ?? 0,
                conversionRate: statsRes?.conversionRate ?? "0%",
                leadsStats: statsRes?.leadsStats ?? { day: 0, week: 0, month: 0 },
                salesStats: statsRes?.salesStats ?? { day: 0, week: 0, month: 0 },
            });
        } catch (err: any) {
            setError(err.message || "Failed to load dashboard");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filter]);

    // ================= DELETE / CONVERT =================
    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this lead?")) return;
        try {
            await deleteLead(id);
            toast.success("Lead deleted successfully");
            fetchData();
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message || "Delete failed");
        }
    };

    const handleConvertToSale = async (id: string) => {
        const amountStr = prompt("Enter sale amount:");
        const amount = amountStr ? Number(amountStr) : 0;
        if (!amount || amount <= 0) return toast.error("Invalid sale amount");

        try {
            await convertLeadToSale(id, amount);
            toast.success("Lead converted to sale");
            fetchData();
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message || "Convert to sale failed");
        }
    };

    // ================= EXCEL UPLOAD =================
    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;

        try {
            const data = await e.target.files[0].arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData: any[] = XLSX.utils.sheet_to_json(sheet);

            // Parse Excel safely
            const parsed: ExcelLead[] = jsonData.map((row) => {
                const name = (row.Name || row.name || "").toString().trim();
                const course = (row.Course || row.course || "").toString().trim();
                const phone = (row.Phone || row.phone || "").toString().trim();

                return {
                    name,
                    course,
                    phone,
                    isValid: !!name && !!course && !!phone,
                };
            });

            const validLeads = parsed.filter((l) => l.isValid);
            console.log("Valid Leads:", validLeads);
            setExcelLeads(validLeads);

            if (!validLeads.length) toast.error("No valid leads found in Excel");
            else toast.success(`${validLeads.length} leads ready to upload`);
        } catch (err: any) {
            console.error(err);
            toast.error("Failed to read Excel file");
        }
    };

    const handleExcelSubmit = async () => {
        if (!csrId || !excelLeads.length) return toast.error("No leads to upload");
        console.log("CSR ID:", csrId)
        try {
            setUploading(true);

            const token = getToken();
            if (!token) throw new Error("Token not found");

            // Backend expects JSON with csrId & leads array
            const res = await fetch("http://localhost:5000/api/v1/lead/upload-excel-array", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    csrId,
                    leads: excelLeads.map((l) => ({
                        name: l.name,
                        course: l.course,
                        phone: l.phone,
                    })),
                }),
            });

            if (!res.ok) {
                const errData = await res.text();
                throw new Error(`Upload failed: ${res.status} ${errData}`);
            }

            toast.success("Excel uploaded successfully");
            setExcelLeads([]);
            fetchData();
        } catch (err: any) {
            console.error(err);
            toast.error(err?.message || "Excel upload failed");
        } finally {
            setUploading(false);
        }
    };

    // ================= LEAD FORM =================
    const openCreateModal = () => {
        setEditingLead(null);
        setLeadForm({ name: "", course: "", phone: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (lead: Lead) => {
        setEditingLead(lead);
        setLeadForm({ name: lead.name, course: lead.course, phone: lead.phone });
        setIsModalOpen(true);
    };

    const handleLeadFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLeadForm({ ...leadForm, [e.target.name]: e.target.value });
    };

    const handleLeadFormSubmit = async () => {
        if (!csrId) return toast.error("CSR ID not found");
        if (!leadForm.name || !leadForm.course || !leadForm.phone)
            return toast.error("Please fill all fields");

        try {
            const payload: LeadPayload = {
                name: leadForm.name,
                course: leadForm.course,
                phone: leadForm.phone,
                assignedTo: csrId,
                status: editingLead?.status || "new",
            };

            if (editingLead) await updateLead(editingLead._id, payload);
            else await createLead(payload);

            toast.success(editingLead ? "Lead updated successfully" : "Lead created successfully");
            setIsModalOpen(false);
            fetchData();
        } catch (err: any) {
            console.error(err);
            toast.error(err?.message || "Failed to save lead");
        }
    };

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <ProtectedRoute role="csr">
            <Toaster position="top-right" reverseOrder={false} />
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">CSR Dashboard</h1>
                        <p className="text-gray-500 mt-1">CSR ID: {csrId}</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                    >
                        Logout
                    </button>
                </div>

                {/* Filters & Create / Upload */}
                <div className="flex justify-between items-center mt-4">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as Filter)}
                        className="border p-2 rounded"
                    >
                        <option value="day">Day</option>
                        <option value="week">Week</option>
                        <option value="month">Month</option>
                    </select>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                        >
                            + Create Lead
                        </button>

                        <div className="flex gap-2">
                            <label className="bg-blue-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-700 transition">
                                {uploading ? "Uploading..." : "Upload Excel"}
                                <input type="file" hidden onChange={handleExcelUpload} />
                            </label>

                            {excelLeads.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleExcelSubmit}
                                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                                >
                                    Submit Excel
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <SummaryCard title="Total Leads" value={stats.totalLeads} />
                    <SummaryCard title="Total Sales" value={stats.totalSales} />
                    <SummaryCard title="Conversion Rate" value={stats.conversionRate} />
                </div>

                {/* Leads Table */}
                <div className="mt-6 overflow-x-auto">
                    <table className="min-w-full border">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="p-2 border">Name</th>
                                <th className="p-2 border">Course</th>
                                <th className="p-2 border">Phone</th>
                                <th className="p-2 border">Status</th>
                                <th className="p-2 border">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leads.map((lead) => (
                                <tr key={lead._id} className="text-center">
                                    <td className="p-2 border">{lead.name}</td>
                                    <td className="p-2 border">{lead.course}</td>
                                    <td className="p-2 border">{lead.phone}</td>
                                    <td className="p-2 border">{lead.status}</td>
                                    <td className="p-2 border flex justify-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openEditModal(lead)}
                                            className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 transition"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(lead._id)}
                                            className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition"
                                        >
                                            Delete
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleConvertToSale(lead._id)}
                                            className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition"
                                        >
                                            Convert
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* CSR Stats Chart */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CSRStatsChart
                        title="Leads"
                        day={stats.leadsStats.day}
                        week={stats.leadsStats.week}
                        month={stats.leadsStats.month}
                    />
                    <CSRStatsChart
                        title="Sales"
                        day={stats.salesStats.day}
                        week={stats.salesStats.week}
                        month={stats.salesStats.month}
                    />
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg w-96">
                            <h2 className="text-xl font-bold mb-4">
                                {editingLead ? "Edit Lead" : "Create Lead"}
                            </h2>
                            <input
                                type="text"
                                name="name"
                                value={leadForm.name}
                                onChange={handleLeadFormChange}
                                placeholder="Name"
                                className="w-full mb-3 p-2 border rounded"
                            />
                            <input
                                type="text"
                                name="course"
                                value={leadForm.course}
                                onChange={handleLeadFormChange}
                                placeholder="Course"
                                className="w-full mb-3 p-2 border rounded"
                            />
                            <input
                                type="text"
                                name="phone"
                                value={leadForm.phone}
                                onChange={handleLeadFormChange}
                                placeholder="Phone"
                                className="w-full mb-3 p-2 border rounded"
                            />
                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleLeadFormSubmit}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                                >
                                    {editingLead ? "Update" : "Create"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}
