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
    setFilter: (f: "day" | "week" | "month") => void;
}

export default function DashboardGraphs({
    leadsStats = { day: 0, week: 0, month: 0 }, // Default values taake undefined error na aaye
    salesStats = { day: 0, week: 0, month: 0 },
    filter,
    setFilter,
}: DashboardGraphsProps) {

    // Trend calculation logic (Simple percentage logic)
    const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return "+0%";
        const diff = ((current - previous) / previous) * 100;
        return `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`;
    };

    return (
        <div className="space-y-6">
            {/* --- FILTER BUTTONS --- */}
            <div className="flex justify-between items-center bg-gray-50 p-2 rounded-2xl w-fit border border-gray-100">
                {["day", "week", "month"].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f as "day" | "week" | "month")}
                        className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${filter === f
                                ? "bg-white text-purple-600 shadow-sm"
                                : "text-gray-400 hover:text-gray-600"
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* --- CHARTS SECTION --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Leads Chart Card */}
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-[2rem] opacity-10 group-hover:opacity-20 transition duration-500"></div>
                    <div className="relative bg-white p-2 rounded-[2rem]">
                        <CSRStatsChart
                            title="Leads Acquisition"
                            day={leadsStats.day}
                            week={leadsStats.week}
                            month={leadsStats.month}
                        />
                        <div className="px-6 pb-4">
                            <span className="text-[10px] font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">
                                ↑ {calculateTrend(leadsStats[filter], 10)} vs last period
                            </span>
                        </div>
                    </div>
                </div>

                {/* Sales Chart Card */}
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-[2rem] opacity-10 group-hover:opacity-20 transition duration-500"></div>
                    <div className="relative bg-white p-2 rounded-[2rem]">
                        <CSRStatsChart
                            title="Sales Conversion"
                            day={salesStats.day}
                            week={salesStats.week}
                            month={salesStats.month}
                        />
                        <div className="px-6 pb-4">
                            <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded-full">
                                ↑ {calculateTrend(salesStats[filter], 5)} active conversion
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}