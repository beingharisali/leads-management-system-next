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
} from "@/services/lead.api";
import { getCSRStats } from "@/services/dashboard.api";
import SummaryCard from "@/components/SummaryCard";
import CSRStatsChart from "@/components/CSRStatsChart";
import Loading from "@/components/Loading";
import ErrorMessage from "@/components/ErrorMessage";
import { getUserRole, getUserId, logout, getToken } from "@/utils/decodeToken";
import toast, { Toaster } from "react-hot-toast";
import * as XLSX from "xlsx";
import { FiUpload, FiPlus, FiLogOut, FiEdit2, FiTrash2, FiCheckCircle, FiPhone, FiBookOpen, FiUser } from "react-icons/fi";

type Filter = "day" | "week" | "month";

// Interface ko exact schema ke mutabiq rakha hai
interface Lead {
    _id: string;
    name: string;
    course: string;
    phone: string;
    status?: "new" | "contacted" | "converted";
    createdBy?: string;
    saleAmount?: number;
}

export default function CSRDashboard() {
    const router = useRouter();

    const [leads, setLeads] = useState<Lead[]>([]);
    const [stats, setStats] = useState({
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

    const [excelLeads, setExcelLeads] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLead, setEditingLead] = useState<Lead | null>(null);
    const [leadForm, setLeadForm] = useState({ name: "", course: "", phone: "" });

    const fetchData = async () => {
        try {
            setLoading(true);
            const role = await getUserRole();
            const userId = await getUserId();
            if (!role || !userId) throw new Error("Authentication failed");

            setCsrId(userId);

            const [leadsRes, statsRes] = await Promise.all([
                getLeadsByRole(role, userId),
                getCSRStats(filter),
            ]);

            // RED LINE FIX: 'as Lead[]' use kiya hai taake TS ko pata chale ye array hi hai
            setLeads((leadsRes as Lead[]) || []);

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

    // ================= EXCEL HANDLING =================
    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const reader = new FileReader();

        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const rows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

                const activeId = csrId || await getUserId();

                const parsed = rows.map((row) => {
                    const name = (row.Name || row.name || row.Customer || "").toString().trim();
                    const phone = (row.Phone || row.phone || row.Mobile || "").toString().trim().replace(/\s/g, "");
                    const course = (row.Course || row.course || "Not Specified").toString().trim();

                    return {
                        name,
                        phone,
                        course,
                        status: "new",
                        source: "excel",
                        createdBy: activeId,
                        assignedTo: activeId,
                        saleAmount: 0
                    };
                }).filter(l => l.name.length >= 3 && l.phone.length >= 11);

                if (parsed.length === 0) {
                    toast.error("No valid leads. Name 3+ & Phone 11+ required.");
                } else {
                    setExcelLeads(parsed);
                    toast.success(`${parsed.length} leads loaded.`);
                }
            } catch (err) {
                toast.error("Excel format error.");
            } finally {
                setUploading(false);
                e.target.value = "";
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleExcelSubmit = async () => {
        if (!excelLeads.length || uploading) return;
        try {
            setUploading(true);
            const activeId = csrId || await getUserId();
            const res = await fetch("http://localhost:5000/api/v1/lead/upload-excel-array", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify({ csrId: activeId, leads: excelLeads }),
            });
            if (!res.ok) throw new Error("Upload failed");
            toast.success("Import Successful!");
            setExcelLeads([]);
            fetchData();
        } catch (err: any) {
            toast.error(err.message || "Server Error");
        } finally {
            setUploading(false);
        }
    };

    // ================= CRUD ACTIONS =================
    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        try {
            await deleteLead(id);
            toast.success("Lead removed");
            fetchData();
        } catch (err) { toast.error("Delete failed"); }
    };

    const handleConvertToSale = async (id: string) => {
        const amount = prompt("Enter Sale Amount:");
        if (!amount || isNaN(Number(amount))) return toast.error("Valid amount required");
        try {
            await convertLeadToSale(id, Number(amount));
            toast.success("Lead Converted! 🚀");
            fetchData();
        } catch (err) { toast.error("Conversion failed"); }
    };

    const handleLeadFormSubmit = async () => {
        if (leadForm.name.length < 3) return toast.error("Name min 3 characters");
        if (leadForm.phone.length < 11) return toast.error("Phone min 11 digits");
        try {
            const activeId = csrId || await getUserId();
            const payload = { ...leadForm, assignedTo: activeId, createdBy: activeId, source: "manual" };
            editingLead ? await updateLead(editingLead._id, payload as any) : await createLead(payload as any);
            toast.success("Saved");
            setIsModalOpen(false);
            fetchData();
        } catch (err) { toast.error("Save failed"); }
    };

    const handleLogout = () => { logout(); router.push("/login"); };

    if (loading) return <Loading />;

    return (
        <ProtectedRoute role="csr">
            <Toaster position="top-right" />
            <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8">
                {/* Header */}
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-slate-800">CSR Dashboard</h1>
                        <p className="text-slate-500 font-medium">Manage leads and tracking</p>
                    </div>
                    <button onClick={handleLogout} className="flex items-center gap-2 bg-white border border-slate-200 px-6 py-2.5 rounded-2xl hover:text-red-600 transition-all font-bold shadow-sm">
                        <FiLogOut /> Logout
                    </button>
                </div>

                {/* Stats */}
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <SummaryCard title="Assigned Leads" value={stats.totalLeads} />
                    <SummaryCard title="Total Sales" value={stats.totalSales} />
                    <SummaryCard title="Conversion Rate" value={stats.conversionRate} />
                </div>

                {/* Action Bar */}
                <div className="max-w-7xl mx-auto bg-white p-5 rounded-[2rem] shadow-sm border flex flex-wrap justify-between items-center gap-4 mb-10">
                    <div className="flex bg-slate-100 p-1 rounded-2xl">
                        {["day", "week", "month"].map((f) => (
                            <button key={f} onClick={() => setFilter(f as Filter)} className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${filter === f ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}>
                                {f.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => { setEditingLead(null); setLeadForm({ name: "", course: "", phone: "" }); setIsModalOpen(true); }} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-slate-200">
                            <FiPlus /> New Lead
                        </button>
                        <label className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl cursor-pointer font-bold shadow-lg shadow-blue-100">
                            <FiUpload /> {uploading ? "Wait..." : "Import Excel"}
                            <input type="file" hidden onChange={handleExcelUpload} accept=".xlsx, .xls" />
                        </label>
                        {excelLeads.length > 0 && (
                            <button onClick={handleExcelSubmit} className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold animate-pulse shadow-lg">
                                <FiCheckCircle /> Confirm {excelLeads.length}
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="max-w-7xl mx-auto bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden mb-10">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50/50 border-b">
                                <tr className="text-slate-400 uppercase text-[11px] font-black tracking-widest">
                                    <th className="px-8 py-5">Name</th>
                                    <th className="px-8 py-5">Course</th>
                                    <th className="px-8 py-5">Phone</th>
                                    <th className="px-8 py-5">Status</th>
                                    <th className="px-8 py-5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {leads.map((lead) => (
                                    <tr key={lead._id} className="group hover:bg-slate-50/50">
                                        <td className="px-8 py-5 font-bold text-slate-700">{lead.name}</td>
                                        <td className="px-8 py-5 text-slate-500">{lead.course}</td>
                                        <td className="px-8 py-5 font-mono text-sm">{lead.phone}</td>
                                        <td className="px-8 py-5">
                                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase ${lead.status === 'converted' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                                {lead.status || 'new'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingLead(lead); setLeadForm({ name: lead.name, course: lead.course, phone: lead.phone }); setIsModalOpen(true); }} className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg"><FiEdit2 /></button>
                                                <button onClick={() => handleConvertToSale(lead._id)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg"><FiCheckCircle /></button>
                                                <button onClick={() => handleDelete(lead._id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><FiTrash2 /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Charts */}
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
                        <CSRStatsChart title="Leads Overview" day={stats.leadsStats.day} week={stats.leadsStats.week} month={stats.leadsStats.month} />
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
                        <CSRStatsChart title="Sales Overview" day={stats.salesStats.day} week={stats.salesStats.week} month={stats.salesStats.month} />
                    </div>
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex justify-center items-center z-50 p-6">
                        <div className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl">
                            <h2 className="text-3xl font-black mb-8">{editingLead ? "Update Lead" : "New Prospect"}</h2>
                            <div className="space-y-6">
                                <div className="relative">
                                    <FiUser className="absolute left-4 top-4 text-slate-400" />
                                    <input value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} className="w-full bg-slate-50 pl-12 pr-4 py-4 rounded-2xl outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500 transition-all" placeholder="Full Name" />
                                </div>
                                <div className="relative">
                                    <FiBookOpen className="absolute left-4 top-4 text-slate-400" />
                                    <input value={leadForm.course} onChange={(e) => setLeadForm({ ...leadForm, course: e.target.value })} className="w-full bg-slate-50 pl-12 pr-4 py-4 rounded-2xl outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500 transition-all" placeholder="Course Name" />
                                </div>
                                <div className="relative">
                                    <FiPhone className="absolute left-4 top-4 text-slate-400" />
                                    <input value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} className="w-full bg-slate-50 pl-12 pr-4 py-4 rounded-2xl outline-none font-bold focus:bg-white border-2 border-transparent focus:border-blue-500 transition-all" placeholder="Phone (11 digits)" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-4 mt-10">
                                <button onClick={() => setIsModalOpen(false)} className="px-8 py-4 text-slate-400 font-bold">Cancel</button>
                                <button onClick={handleLeadFormSubmit} className="px-10 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl">Save</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}