"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/services/auth.api";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { user, token } = await login(email, password);

            // save token
            localStorage.setItem("token", token);

            // redirect by role
            if (user.role === "admin") {
                router.replace("/admin/dashboard");
            } else {
                router.replace("/csr/dashboard");
            }
        } catch (err: any) {
            setError(err?.response?.data?.message || "Invalid email or password");
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
                <h1 className="text-2xl font-bold mb-4 text-center">
                    Leads Management Login
                </h1>

                {error && (
                    <p className="text-red-500 text-sm mb-3 text-center">{error}</p>
                )}

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
                    className="w-full bg-black text-white py-2 rounded hover:bg-gray-800"
                >
                    {loading ? "Logging in..." : "Login"}
                </button>
            </form>
        </div>
    );
}
