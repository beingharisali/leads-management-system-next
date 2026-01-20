"use client";

import { useEffect, useState } from "react";
import { getAdminStats } from "@/services/dashboard.api";
import { createCSR } from "@/services/auth.api";
import CSRSidebar from "@/components/CsrSidebar";
import CSRLeadsPanel from "@/components/CsrLeadPanel";
import DashboardGraphs from "@/components/DashboardGraphs";
import * as XLSX from "xlsx";

import {
    getLeadsByRole,
    bulkInsertLeads,
} from "@/services/lead.api";

import SummaryCard from "@/components/SummaryCard";
import Loading from "@/components/Loading";
import ErrorMessage from "@/components/ErrorMessage";
import toast, { Toaster } from "react-hot-toast";

/* ================= LOGOUT ================= */
const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
    localStorage.removeItem("role");
    window.location.href = "/login";
};

/* ================= COMPONENT ================= */
export default function AdminDashboardPage() {
    const [data, setData] = useState<any>(null);
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState<"day" | "week" | "month">("day");
    const [uploading, setUploading] = useState(false);

    const [showCSRModal, setShowCSRModal] = useState(false);
    const [csrName, setCsrName] = useState("");
    const [csrEmail, setCsrEmail] = useState("");
    const [csrPassword, setCsrPassword] = useState("");
    const [csrLoading, setCsrLoading] = useState(false);

    const [selectedCSR, setSelectedCSR] = useState<string | null>(null);

    /* ================= EXCEL PREVIEW STATE ================= */
    const [showExcelPreview, setShowExcelPreview] = useState(false);
    const [previewLeads, setPreviewLeads] = useState<any[]>([]);
    const [validLeads, setValidLeads] = useState<any[]>([]);

    /* ================= FETCH DASHBOARD DATA ================= */
    const fetchStats = async () => {
        setLoading(true);
        try {
            const [statsRes, leadsRes] = await Promise.all([
                getAdminStats(filter),
                getLeadsByRole("admin"),
            ]);
            const activeLeads = leadsRes.filter((l: any) => l.status !== "sale");
            setData(statsRes);
            setLeads(activeLeads);
        } catch (err: any) {
            console.error(err);
            setError("Failed to load dashboard");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [filter]);

    const csrOptions = data?.csrPerformance || [];

    /* ================= CREATE CSR ================= */
    const handleCreateCSR = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!csrName || !csrEmail || !csrPassword) return toast.error("All fields are required");

        setCsrLoading(true);
        try {
            await createCSR({ name: csrName, email: csrEmail, password: csrPassword });
            toast.success("CSR created successfully");
            setCsrName(""); setCsrEmail(""); setCsrPassword(""); setShowCSRModal(false);
            fetchStats();
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.msg || "Failed to create CSR");
        } finally {
            setCsrLoading(false);
        }
    };

    /* ================= EXCEL UPLOAD & PREVIEW ================= */
    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        setUploading(true);

        try {
            const file = e.target.files[0];
            const dataBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(dataBuffer);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

            if (!rawJson.length) {
                toast.error("Excel sheet is empty");
                return;
            }

            const headers = Object.keys(rawJson[0]);

            const mappedLeads = rawJson.map((row, index) => {
                const lead = {
                    name: row[headers.find(h => h.toLowerCase().includes("name")) || headers[0]] || "",
                    phone: row[headers.find(h => h.toLowerCase().includes("phone") || h.toLowerCase().includes("contact")) || headers[1]] || "",
                    course: row[headers.find(h => h.toLowerCase().includes("course") || h.toLowerCase().includes("program")) || headers[2]] || "",
                    status: row[headers.find(h => h.toLowerCase().includes("status")) || "Status"] || "new",
                    rowIndex: index + 2,
                };
                return lead;
            });

            setPreviewLeads(mappedLeads);
            setValidLeads(mappedLeads.filter(l => l.name && l.phone && l.course));
            setShowExcelPreview(true);

        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message || "Excel upload failed");
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    /* ================= UPLOAD CONFIRMED LEADS ================= */
    const confirmExcelUpload = async () => {
        if (!validLeads.length) {
            toast.error("No valid leads to upload");
            return;
        }
        setUploading(true);
        try {
            // Convert validLeads array to Excel file
            const worksheet = XLSX.utils.json_to_sheet(validLeads.map(l => ({
                name: l.name,
                phone: l.phone,
                course: l.course,
                status: l.status || "new",
                assignedTo: selectedCSR || "", // CSR ID
            })));

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Leads");

            const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
            const file = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

            await bulkInsertLeads(new File([file], "leads.xlsx"));

            toast.success(`${validLeads.length} leads uploaded successfully!`);
            fetchStats();
        } catch (err: any) {
            console.error(err);
            toast.error(err?.response?.data?.message || "Upload failed");
        } finally {
            setUploading(false);
            setShowExcelPreview(false);
            setPreviewLeads([]);
            setValidLeads([]);
        }
    };

    if (loading) return <Loading />;
    if (error) return <ErrorMessage message={error} />;

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <Toaster position="top-right" reverseOrder={false} />

            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setShowCSRModal(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-medium shadow transition"
                    >
                        + Create CSR
                    </button>

                    <label className="inline-block bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-lg cursor-pointer shadow transition">
                        {uploading ? "Uploading..." : "Upload Excel"}
                        <input type="file" hidden onChange={handleExcelUpload} />
                    </label>

                    <button
                        onClick={handleLogout}
                        className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-medium shadow transition"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* CREATE CSR MODAL */}
            {showCSRModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-2xl w-96 shadow-2xl border border-gray-200">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800">Create CSR</h2>
                        <form onSubmit={handleCreateCSR} className="space-y-3">
                            <input
                                value={csrName}
                                onChange={e => setCsrName(e.target.value)}
                                placeholder="Name"
                                required
                                className="border p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                            />
                            <input
                                value={csrEmail}
                                onChange={e => setCsrEmail(e.target.value)}
                                placeholder="Email"
                                type="email"
                                required
                                className="border p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                            />
                            <input
                                value={csrPassword}
                                onChange={e => setCsrPassword(e.target.value)}
                                placeholder="Password"
                                type="password"
                                required
                                minLength={6}
                                maxLength={20}
                                className="border p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                            />
                            {csrPassword.length > 0 && (csrPassword.length < 6 || csrPassword.length > 20) && (
                                <p className="text-red-500 text-sm mt-1">Password must be 6-20 characters</p>
                            )}
                            <div className="flex justify-end gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCSRModal(false)}
                                    className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={csrLoading || csrPassword.length < 6 || csrPassword.length > 20}
                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
                                >
                                    {csrLoading ? "Creating..." : "Create"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* EXCEL PREVIEW MODAL */}
            {showExcelPreview && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 overflow-auto p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-6">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800">Excel Preview</h2>
                        <div className="overflow-auto max-h-96">
                            <table className="w-full border border-gray-300">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="border p-2">Row</th>
                                        <th className="border p-2">Name</th>
                                        <th className="border p-2">Phone</th>
                                        <th className="border p-2">Course</th>
                                        <th className="border p-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewLeads.map((lead, idx) => {
                                        const invalid = !lead.name || !lead.phone || !lead.course;
                                        return (
                                            <tr key={idx} className={invalid ? "bg-red-100" : ""}>
                                                <td className="border p-2">{lead.rowIndex}</td>
                                                <td className="border p-2">{lead.name || <span className="text-red-500">Missing</span>}</td>
                                                <td className="border p-2">{lead.phone || <span className="text-red-500">Missing</span>}</td>
                                                <td className="border p-2">{lead.course || <span className="text-red-500">Missing</span>}</td>
                                                <td className="border p-2">{lead.status}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => setShowExcelPreview(false)}
                                className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmExcelUpload}
                                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
                                disabled={uploading || !validLeads.length}
                            >
                                {uploading ? "Uploading..." : `Upload ${validLeads.length} Leads`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SIDEBAR + LEADS PANEL */}
            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 md:col-span-3">
                    <CSRSidebar csrs={csrOptions} selectedCSR={selectedCSR} onSelect={setSelectedCSR} />
                </div>
                <div className="col-span-12 md:col-span-9">
                    <CSRLeadsPanel
                        leads={leads}
                        selectedCSR={selectedCSR}
                        onConvertToSale={() => { }}
                        onDeleteLead={() => { }}
                    />
                </div>
            </div>

            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <SummaryCard title="Total Leads" value={data?.totalLeads || 0} />
                <SummaryCard title="Total Sales" value={data?.totalSales || 0} />
                <SummaryCard title="Total CSRs" value={data?.totalCSRs || 0} />
                <SummaryCard title="Conversion Rate" value={data?.conversionRate || "0%"} />
            </div>

            {/* GRAPHS + FILTER */}
            {data && (
                <DashboardGraphs
                    leadsStats={data.leadsStats}
                    salesStats={data.salesStats}
                    filter={filter}
                    setFilter={setFilter as (f: "day" | "week" | "month") => void}
                />
            )}
        </div>
    );
}
