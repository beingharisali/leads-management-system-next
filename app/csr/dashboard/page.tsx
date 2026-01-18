"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
    getLeadsByRole,
    deleteLead,
    convertLeadToSale,
    uploadExcelLeads,
    createLead,
    updateLead,
    LeadPayload,
} from "@/services/lead.api";
import { getCSRStats, getAdminStats } from "@/services/dashboard.api";
import SummaryCard from "@/components/SummaryCard";
import CSRStatsChart from "@/components/CSRStatsChart";
import Loading from "@/components/Loading";
import ErrorMessage from "@/components/ErrorMessage";
import { getUserRole, getUserId, logout } from "@/utils/decodeToken";
import toast, { Toaster } from "react-hot-toast";

// ================= TYPES =================
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

// ================= DASHBOARD COMPONENT =================
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
    const [role, setRole] = useState<"csr" | "admin" | null>(null);

    // ================= Lead Modal States =================
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [leadForm, setLeadForm] = useState({ name: "", course: "", phone: "" });

    // ================= FETCH DATA =================
    const fetchData = async () => {
        try {
            setLoading(true);
            setError("");

            const userRole = await getUserRole();
            const userId = await getUserId();
            if (!userRole || !userId) throw new Error("User not authenticated");

            setRole(userRole);
            setCsrId(userId);

            if (userRole === "csr") {
                const [leadsRes, statsRes] = await Promise.all([
                    getLeadsByRole(userRole, userId),
                    getCSRStats(filter),
                ]);
                setLeads(leadsRes || []);
                setStats(statsRes || stats);
            } else if (userRole === "admin") {
                const statsRes = await getAdminStats(filter);
                setStats(statsRes || stats);
                // Optional: fetch all CSR leads if needed
                const leadsRes = await getLeadsByRole("admin", "");
                setLeads(leadsRes || []);
            }
        } catch (err: any) {
            setError(err.message || "Failed to load dashboard");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filter]);

    // ================= ACTIONS =================
    const handleDelete = async (id: string) => {
        if (role !== "csr") return;
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
        if (role !== "csr") return; // Only CSR can convert
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

    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!role || role !== "csr") return; // Only CSR can upload leads
        if (!e.target.files?.length) return;
        try {
            setUploading(true);
            await uploadExcelLeads(e.target.files[0]);
            toast.success("Excel uploaded successfully");
            fetchData();
        } catch (err: any) {
            console.error(err);
            toast.error("Excel upload failed");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    // ================= Lead Modal =================
    const openCreateModal = () => {
        setEditingLead(null);
        setLeadForm({ name: "", course: "", phone: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (lead: Lead) => {
        if (role !== "csr") return; // Admin cannot edit
        setEditingLead(lead);
        setLeadForm({ name: lead.name, course: lead.course, phone: lead.phone });
        setIsModalOpen(true);
    };

    const handleLeadFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLeadForm({ ...leadForm, [e.target.name]: e.target.value });
    };

    const handleLeadFormSubmit = async () => {
        if (!csrId || role !== "csr") return toast.error("CSR ID not found or unauthorized");

        try {
            if (!leadForm.name || !leadForm.course || !leadForm.phone)
                return toast.error("Please fill all fields");

            const payload: LeadPayload = {
                name: leadForm.name,
                course: leadForm.course,
                phone: leadForm.phone,
                assignedTo: csrId,
            };

            if (editingLead) {
                await updateLead(editingLead._id, payload);
                toast.success("Lead updated successfully");
            } else {
                await createLead(payload);
                toast.success("Lead created successfully");
            }

            setIsModalOpen(false);
            fetchData();
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message || "Failed to save lead");
        }
    };

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <ProtectedRoute role={role || "csr"}>
            <Toaster position="top-right" reverseOrder={false} />
            <div className="p-6 space-y-6">

                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">
                            {role === "csr" ? "CSR Dashboard" : "Admin Dashboard"}
                        </h1>
                        {csrId && <p className="text-gray-500 mt-1">ID: {csrId}</p>}
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                    >
                        Logout
                    </button>
                </div>

                {/* Filters */}
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
                    {role === "csr" && (
                        <button
                            onClick={openCreateModal}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                        >
                            + Create Lead
                        </button>
                    )}
                </div>

                {/* Summary Cards */}
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <SummaryCard title="Total Leads" value={stats.totalLeads} />
                    <SummaryCard title="Total Sales" value={stats.totalSales} />
                    <SummaryCard title="Conversion Rate" value={stats.conversionRate} />
                </div>

                {/* Charts */}
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                    <CSRStatsChart title="Leads Analytics" {...stats.leadsStats} />
                    <CSRStatsChart title="Sales Analytics" {...stats.salesStats} />
                </div>

                {/* Leads Table */}
                <div className="bg-white shadow rounded p-4 mt-6">
                    <h2 className="font-semibold mb-3">
                        {role === "csr" ? "My Leads" : "All CSR Leads"}
                    </h2>
                    {leads.length ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm table-auto">
                                <thead>
                                    <tr className="border-b">
                                        <th className="p-2 text-left">Name</th>
                                        <th className="p-2 text-left">Course</th>
                                        <th className="p-2 text-left">Phone</th>
                                        <th className="p-2 text-left">Status</th>
                                        {role === "csr" && <th className="p-2 text-left">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {leads.map((l) => (
                                        <tr key={l._id} className="border-b hover:bg-gray-50 transition">
                                            <td className="p-2">{l.name}</td>
                                            <td className="p-2">{l.course}</td>
                                            <td className="p-2">{l.phone}</td>
                                            <td className="p-2">{l.status || "Pending"}</td>
                                            {role === "csr" && (
                                                <td className="p-2 space-x-2">
                                                    <button
                                                        onClick={() => openEditModal(l)}
                                                        className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 transition"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleConvertToSale(l._id)}
                                                        className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 transition"
                                                    >
                                                        Convert
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(l._id)}
                                                        className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-gray-500">No leads found</p>
                    )}
                </div>

                {/* Excel Upload */}
                {role === "csr" && (
                    <div className="mt-4">
                        <label className="inline-block bg-blue-600 text-white px-4 py-2 rounded cursor-pointer hover:bg-blue-700 transition">
                            {uploading ? "Uploading..." : "Upload Excel"}
                            <input type="file" hidden onChange={handleExcelUpload} />
                        </label>
                    </div>
                )}

                {/* Lead Modal */}
                {isModalOpen && role === "csr" && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                        <div className="bg-white p-6 rounded shadow-lg w-96">
                            <h2 className="text-lg font-bold mb-4">
                                {editingLead ? "Edit Lead" : "Create Lead"}
                            </h2>
                            <input
                                type="text"
                                name="name"
                                placeholder="Name"
                                value={leadForm.name}
                                onChange={handleLeadFormChange}
                                className="border p-2 w-full mb-2 rounded"
                            />
                            <input
                                type="text"
                                name="course"
                                placeholder="Course"
                                value={leadForm.course}
                                onChange={handleLeadFormChange}
                                className="border p-2 w-full mb-2 rounded"
                            />
                            <input
                                type="text"
                                name="phone"
                                placeholder="Phone"
                                value={leadForm.phone}
                                onChange={handleLeadFormChange}
                                className="border p-2 w-full mb-2 rounded"
                            />

                            <div className="flex justify-end space-x-2 mt-4">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-3 py-1 rounded border hover:bg-gray-100 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleLeadFormSubmit}
                                    className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
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
