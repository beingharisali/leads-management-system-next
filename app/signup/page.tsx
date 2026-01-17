"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import http from "@/services/http";

export default function SignupPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            // Backend route for first admin signup
            const res = await http.post("/setup/first-admin", { name, email, password });
            const { user } = res.data;

            setSuccess(`Admin ${user.name} registered successfully! Redirecting to login...`);
            setName("");
            setEmail("");
            setPassword("");

            setTimeout(() => router.push("/login"), 1500);
        } catch (err: any) {
            setError(err.response?.data?.msg || err.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-red-400 px-4">
            <form
                onSubmit={handleSignup}
                className="bg-white/90 backdrop-blur-md p-10 rounded-3xl shadow-2xl max-w-md w-full flex flex-col gap-5"
            >
                <h1 className="text-3xl font-extrabold text-center text-gray-900 mb-2">Admin Signup</h1>

                {error && <p className="text-red-600 text-center font-medium animate-pulse">{error}</p>}
                {success && <p className="text-green-600 text-center font-medium animate-pulse">{success}</p>}

                <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="border border-gray-300 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                />

                <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border border-gray-300 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border border-gray-300 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                />

                <button
                    type="submit"
                    disabled={loading}
                    className={`py-3 rounded-xl font-semibold text-white transition-all duration-300 
                        ${loading
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-purple-600 hover:bg-purple-700 active:scale-95"
                        }`}
                >
                    {loading ? (
                        <div className="flex items-center justify-center gap-2">
                            <span className="loader ease-linear rounded-full border-2 border-t-2 border-white w-5 h-5 animate-spin"></span>
                            Signing Up...
                        </div>
                    ) : (
                        "Signup"
                    )}
                </button>

                <p className="text-sm text-gray-600 text-center mt-3">
                    Already have an account?{" "}
                    <span
                        className="text-purple-600 font-semibold cursor-pointer hover:underline"
                        onClick={() => router.push("/login")}
                    >
                        Login
                    </span>
                </p>
            </form>

            {/* Loader CSS */}
            <style jsx>{`
                .loader {
                    border-top-color: transparent;
                }
            `}</style>
        </div>
    );
}
