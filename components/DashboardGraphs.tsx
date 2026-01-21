"use client";

import React from "react";
import CSRStatsChart from "@/components/CSRStatsChart";

interface StatsObj {
    day: number;
    week: number;
    month: number;
}

interface DashboardGraphsProps {
    leadsStats?: StatsObj;
    salesStats?: StatsObj;
    filter: "day" | "week" | "month";
    // setFilter ko optional (?) kar diya taake AdminPage par error na aaye
    setFilter?: (f: "day" | "week" | "month") => void;
}

export default function DashboardGraphs({
    leadsStats = { day: 0, week: 0, month: 0 },
    salesStats = { day: 0, week: 0, month: 0 },
    filter,
    setFilter,
}: DashboardGraphsProps) {

    // Trend calculation logic
    const calculateTrend = (current: number) => {
        // Agar previous data nahi hai to hum generic high percentage dikhate hain ya static logic
        if (current === 0) return "0%";
        return `+${((current / (current + 5)) * 100).toFixed(1)}%`;
    };

    return (
        <div className="space-y-6">
            {/* --- FILTER BUTTONS (Sirf tab dikhayen agar setFilter pass kiya gaya ho) --- */}
            {setFilter && (
                <div className="flex bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200">
                    {["day", "week", "month"].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f as "day" | "week" | "month")}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${filter === f
                                ? "bg-white text-indigo-600 shadow-sm"
                                : "text-slate-400 hover:text-slate-600"
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            )}

            {/* --- CHARTS SECTION --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Leads Chart Card */}
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[2.5rem] opacity-5 group-hover:opacity-10 transition duration-500"></div>
                    <div className="relative bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start px-4 mb-2">
                            <div>
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Leads Acquisition</h4>
                                <p className="text-2xl font-black text-slate-800">{leadsStats[filter]}</p>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">
                                ↑ {calculateTrend(leadsStats[filter])}
                            </span>
                        </div>

                        <div className="h-[200px] w-full">
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
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[2.5rem] opacity-5 group-hover:opacity-10 transition duration-500"></div>
                    <div className="relative bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-start px-4 mb-2">
                            <div>
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Sales Conversion</h4>
                                <p className="text-2xl font-black text-slate-800">{salesStats[filter]}</p>
                            </div>
                            <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-lg">
                                Active
                            </span>
                        </div>

                        <div className="h-[200px] w-full">
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