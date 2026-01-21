"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import http from "@/services/http";
import { motion } from "framer-motion";
import { Toaster, toast } from "react-hot-toast";
import { FiUser, FiMail, FiLock, FiUserPlus, FiArrowLeft } from "react-icons/fi";

export default function SignupPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // First Admin Setup Route
            const res = await http.post("/setup/first-admin", { name, email, password });
            const { user } = res.data;

            toast.success(`Admin ${user.name} created! Redirecting...`, {
                duration: 3000,
                icon: '🚀',
            });

            setTimeout(() => router.push("/login"), 2000);
        } catch (err: any) {
            toast.error(err.response?.data?.msg || "Signup failed. Try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 font-sans relative overflow-hidden">
            <Toaster position="top-center" />

            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-100 rounded-full blur-[120px] opacity-50" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-100 rounded-full blur-[120px] opacity-50" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-lg"
            >
                {/* Back to Login Button */}
                <button
                    onClick={() => router.push("/login")}
                    className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold mb-6 transition-colors group"
                >
                    <FiArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Back to Login
                </button>

                <div className="bg-white/80 backdrop-blur-2xl p-10 rounded-[3rem] shadow-2xl shadow-indigo-100 border border-white">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 mb-4">
                            <FiUserPlus className="text-white text-3xl" />
                        </div>
                        <h1 className="text-4xl font-black text-slate-800 tracking-tight">
                            Admin <span className="text-indigo-600">Signup</span>
                        </h1>
                        <p className="text-slate-500 font-medium mt-2">Initialize the primary administrator account</p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-6">
                        {/* Name Field */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">Full Name</label>
                            <div className="relative">
                                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    className="w-full bg-slate-50 border-2 border-slate-50 p-4 pl-12 rounded-2xl outline-none focus:border-indigo-600 focus:bg-white transition-all font-semibold"
                                />
                            </div>
                        </div>

                        {/* Email Field */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">Email Address</label>
                            <div className="relative">
                                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="email"
                                    placeholder="admin@system.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full bg-slate-50 border-2 border-slate-50 p-4 pl-12 rounded-2xl outline-none focus:border-indigo-600 focus:bg-white transition-all font-semibold"
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">Password</label>
                            <div className="relative">
                                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full bg-slate-50 border-2 border-slate-50 p-4 pl-12 rounded-2xl outline-none focus:border-indigo-600 focus:bg-white transition-all font-semibold"
                                />
                            </div>
                        </div>

                        {/* Signup Button */}
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            type="submit"
                            disabled={loading}
                            className="w-full bg-slate-900 hover:bg-black text-white p-5 rounded-2xl font-black shadow-xl transition-all disabled:opacity-70 flex items-center justify-center gap-3"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                "Create Admin Account"
                            )}
                        </motion.button>
                    </form>

                    <p className="text-center mt-8 text-slate-400 text-sm font-medium">
                        This action will create a permanent root administrator.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}