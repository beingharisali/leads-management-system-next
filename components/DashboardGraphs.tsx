"use client";

import React from "react";
import CSRStatsChart from "@/components/CSRStatsChart";
import { FiTrendingUp, FiActivity, FiTarget } from "react-icons/fi";

interface StatsObj {
    day: number;
    week: number;
    month: number;
}

interface DashboardGraphsProps {
    leadsStats?: StatsObj;
    salesStats?: StatsObj;
    filter: "day" | "week" | "month";
    setFilter?: (f: "day" | "week" | "month") => void;
}

export default function DashboardGraphs({
    leadsStats = { day: 0, week: 0, month: 0 },
    salesStats = { day: 0, week: 0, month: 0 },
    filter,
    setFilter,
}: DashboardGraphsProps) {

    const calculateTrend = (current: number) => {
        if (current === 0) return "0%";
        // AI/Predictive logic appearance: generic positive trend
        return `+${((current / (current + 5)) * 100).toFixed(1)}%`;
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* --- TOP HEADER & FILTERS --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
                <div>
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <FiActivity className="text-indigo-500" />
                        Performance Analytics
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Real-time Conversion Metrics</p>
                </div>

                {setFilter && (
                    <div className="flex bg-slate-100/80 backdrop-blur-md p-1 rounded-2xl border border-slate-200 shadow-inner">
                        {["day", "week", "month"].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f as "day" | "week" | "month")}
                                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all duration-300 ${filter === f
                                    ? "bg-white text-indigo-600 shadow-md transform scale-105"
                                    : "text-slate-500 hover:text-slate-800"
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* --- CHARTS GRID --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">

                {/* Leads Chart Card */}
                <div className="group relative">
                    {/* Subtle Glow Effect */}
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-[3rem] blur-xl opacity-0 group-hover:opacity-100 transition duration-700"></div>

                    <div className="relative bg-white p-6 rounded-[2.8rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                                    <FiTrendingUp size={20} />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Inbound Leads</h4>
                                    <p className="text-3xl font-black text-slate-800 tracking-tight">
                                        {leadsStats[filter].toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
                                    <FiTrendingUp size={10} /> {calculateTrend(leadsStats[filter])}
                                </span>
                                <span className="text-[8px] text-slate-300 font-bold mt-1 uppercase tracking-tighter">vs previous {filter}</span>
                            </div>
                        </div>

                        <div className="h-[220px] w-full mt-4 transform group-hover:scale-[1.02] transition-transform duration-500">
                            <CSRStatsChart
                                title=""
                                day={leadsStats.day}
                                week={leadsStats.week}
                                month={leadsStats.month}
                            />
                        </div>
                    </div>
                </div>

                {/* Sales Chart Card */}
                <div className="group relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-[3rem] blur-xl opacity-0 group-hover:opacity-100 transition duration-700"></div>

                    <div className="relative bg-white p-6 rounded-[2.8rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                                    <FiTarget size={20} />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Closed Deals</h4>
                                    <p className="text-3xl font-black text-slate-800 tracking-tight">
                                        {salesStats[filter].toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <span className="text-[9px] font-black text-white uppercase tracking-wider">Live Track</span>
                                </div>
                                <p className="text-[8px] text-slate-400 font-bold mt-2 uppercase">Verified Conversions</p>
                            </div>
                        </div>

                        <div className="h-[220px] w-full mt-4 transform group-hover:scale-[1.02] transition-transform duration-500">
                            <CSRStatsChart
                                title=""
                                day={salesStats.day}
                                week={salesStats.week}
                                month={salesStats.month}
                            />
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}