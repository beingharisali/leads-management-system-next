"use client";

import { useState } from "react";
import http from "@/services/http";

export default function AddCSRPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState<"csr" | "admin">("csr");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!token) {
            setError("Unauthorized. Login as Admin first.");
            return;
        }

        try {
            const res = await http.post(
                "/auth/register",
                { name, email, password, role },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setSuccess(`User ${res.data.user.name} (${res.data.user.role}) created successfully!`);
            setName("");
            setEmail("");
            setPassword("");
            setRole("csr");
        } catch (err: any) {
            setError(err.response?.data?.msg || err.message || "Failed to create user.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <form onSubmit={handleCreate} className="bg-white p-6 rounded-lg shadow w-96">
                <h1 className="text-2xl font-bold mb-4 text-center">Add New CSR</h1>

                {error && <p className="text-red-500 mb-3 text-center">{error}</p>}
                {success && <p className="text-green-500 mb-3 text-center">{success}</p>}

                <input
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border p-2 mb-3 rounded"
                    required
                />

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border p-2 mb-3 rounded"
                    required
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border p-2 mb-3 rounded"
                    required
                />

                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as "csr" | "admin")}
                    className="w-full border p-2 mb-4 rounded"
                >
                    <option value="csr">CSR</option>
                </select>

                <button type="submit" className="w-full bg-black text-white py-2 rounded hover:bg-gray-800">
                    Create CSR
                </button>
            </form>
        </div>
    );
}
