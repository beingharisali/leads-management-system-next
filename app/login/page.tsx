"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import http from "@/services/http";
import { motion } from "framer-motion";
import { Toaster, toast } from "react-hot-toast";
import { FiMail, FiLock, FiArrowRight, FiShield } from "react-icons/fi";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await http.post("/auth/login", { email, password });
            const { token, user } = res.data;

            // Store auth data
            localStorage.setItem("token", token);
            localStorage.setItem("user", JSON.stringify(user));
            localStorage.setItem("userId", user._id);
            localStorage.setItem("role", user.role);

            toast.success(`Welcome back, ${user.name}!`);

            // Redirect with full page refresh to ensure role sync
            setTimeout(() => {
                window.location.href = user.role === "admin" ? "/admin/dashboard" : "/csr/dashboard";
            }, 800);

        } catch (err: any) {
            toast.error(err.response?.data?.msg || "Invalid credentials");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 font-sans">
            <Toaster position="top-center" />

            {/* Background Decorative Circles */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-100 rounded-full blur-[120px] opacity-60" />
                <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-60" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative w-full max-w-md"
            >
                {/* Logo Section */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-2xl shadow-xl shadow-purple-200 mb-4">
                        <FiShield className="text-white text-3xl" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                        Welcome <span className="text-purple-600">Back</span>
                    </h1>
                    <p className="text-slate-500 font-medium mt-2">Log in to manage your leads</p>
                </div>

                {/* Form Card */}
                <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white">
                    <form onSubmit={handleLogin} className="space-y-5">

                        {/* Email Field */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">Email Address</label>
                            <div className="relative group">
                                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
                                <input
                                    type="email"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full bg-slate-50 border-2 border-slate-100 p-4 pl-12 rounded-2xl outline-none focus:border-purple-600 focus:bg-white transition-all font-semibold text-slate-700"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">Password</label>
                            <div className="relative group">
                                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-600 transition-colors" />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full bg-slate-50 border-2 border-slate-100 p-4 pl-12 rounded-2xl outline-none focus:border-purple-600 focus:bg-white transition-all font-semibold text-slate-700"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-2xl font-black shadow-lg shadow-purple-200 flex items-center justify-center gap-2 transition-all disabled:opacity-70 mt-4"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Sign In <FiArrowRight />
                                </>
                            )}
                        </motion.button>
                    </form>

                    {/* Footer Links */}
                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <p className="text-slate-500 text-sm font-medium">
                            Don’t have an account?{" "}
                            <button
                                onClick={() => router.push("/signup")}
                                className="text-purple-600 font-bold hover:underline underline-offset-4"
                            >
                                Create Account
                            </button>
                        </p>
                    </div>
                </div>

                <p className="text-center text-slate-400 text-xs mt-8 font-medium italic">
                    Secure Lead Management System v2.0
                </p>
            </motion.div>
        </div>
    );
}