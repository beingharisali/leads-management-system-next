"use client";

import { useState } from "react";
import http from "@/services/http";

export default function AdminSignupPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"csr" | "admin">("csr");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const token = localStorage.getItem("token"); // Admin JWT token
            if (!token) {
                setError("Unauthorized. Login as Admin first.");
                setLoading(false);
                return;
            }

            const res = await http.post(
                "/auth/register",
                { name, email, password, role },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setSuccess(`User ${res.data.user.name} (${res.data.user.role}) created successfully!`);

            // Reset form
            setName("");
            setEmail("");
            setPassword("");
            setRole("csr");
        } catch (err: any) {
            if (err.response?.data?.msg) setError(err.response.data.msg);
            else setError(err.message || "Failed to create user.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow w-96">
                <h1 className="text-2xl font-bold mb-4 text-center">Create New User</h1>

                {error && <p className="text-red-500 text-sm mb-3 text-center">{error}</p>}
                {success && <p className="text-green-500 text-sm mb-3 text-center">{success}</p>}

                <input
                    type="text"
                    placeholder="Name"
                    className="w-full border p-2 mb-3 rounded"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />

                <input
                    type="email"
                    placeholder="Email"
                    className="w-full border p-2 mb-3 rounded"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <input
                    type="password"
                    placeholder="Password"
                    className="w-full border p-2 mb-3 rounded"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "csr" | "admin")}
                    className="w-full border p-2 mb-4 rounded"
                >
                    <option value="csr">CSR</option>
                    <option value="admin">Admin</option>
                </select>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 disabled:opacity-60"
                >
                    {loading ? "Creating..." : "Create User"}
                </button>
            </form>
        </div>
    );
}
