"use client";

import { useState } from "react";
import http from "@/services/http";

export default function AddCSRPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            // Always create CSR
            const res = await http.post("/auth/register", {
                name,
                email,
                password,
                role: "csr", // fixed
            });

            setMessage(`CSR "${res.data.user.name}" created successfully!`);
            setName("");
            setEmail("");
            setPassword("");
        } catch (err: any) {
            setMessage(err.message || "Failed to create CSR");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <form
                onSubmit={handleSubmit}
                className="bg-white p-6 rounded-lg shadow w-96"
            >
                <h1 className="text-2xl font-bold mb-4 text-center">Add New CSR</h1>

                {message && (
                    <p className="text-center mb-3 text-sm text-green-600">{message}</p>
                )}

                <input
                    type="text"
                    placeholder="Full Name"
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
                    className="w-full border p-2 mb-4 rounded"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black text-white py-2 rounded hover:bg-gray-800 disabled:opacity-60"
                >
                    {loading ? "Creating..." : "Create CSR"}
                </button>
            </form>
        </div>
    );
}
