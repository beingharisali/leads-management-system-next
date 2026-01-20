"use client";

import React from "react";
import CSRStatsChart from "@/components/CSRStatsChart";

interface DashboardGraphsProps {
    leadsStats: { day: number; week: number; month: number };
    salesStats: { day: number; week: number; month: number };
    filter: "day" | "week" | "month";
    setFilter: (f: "day" | "week" | "month") => void;
}

export default function DashboardGraphs({
    leadsStats,
    salesStats,
    filter,
    setFilter,
}: DashboardGraphsProps) {
    return (
        <div className="space-y-4">
            {/* FILTER BUTTONS */}
            <div className="flex justify-start items-center gap-2 mb-4">
                {["day", "week", "month"].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f as "day" | "week" | "month")}
                        className={`px-4 py-2 rounded transition ${filter === f
                                ? "bg-purple-600 text-white"
                                : "bg-gray-200 hover:bg-gray-300"
                            }`}
                    >
                        {f.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* CHARTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <CSRStatsChart
                    title="Leads"
                    day={leadsStats.day}
                    week={leadsStats.week}
                    month={leadsStats.month}
                />
                <CSRStatsChart
                    title="Sales"
                    day={salesStats.day}
                    week={salesStats.week}
                    month={salesStats.month}
                />
            </div>
        </div>
    );
}
