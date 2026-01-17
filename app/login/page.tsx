"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import http from "@/services/http";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await http.post("/auth/login", { email, password });
            const { token, user } = res.data;

            // 🔹 Store full user object
            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));
            localStorage.setItem("userId", user._id);
            localStorage.setItem("role", user.role);

            if (user.role === "admin") router.push("/admin/dashboard");
            else router.push("/csr/dashboard");
        } catch (err: any) {
            setError(err.response?.data?.msg || "Invalid credentials");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleLogin}
            className="p-6 flex flex-col gap-3 max-w-sm mx-auto mt-20 border rounded shadow"
        >
            <h1 className="text-2xl font-bold text-center mb-4">Login</h1>
            <input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border p-3 rounded"
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="border p-3 rounded"
            />
            <button
                type="submit"
                disabled={loading}
                className="bg-purple-600 text-white py-2 rounded mt-2"
            >
                {loading ? "Logging in..." : "Login"}
            </button>
            {error && <p className="text-red-500 text-center mt-2">{error}</p>}
        </form>
    );
}
