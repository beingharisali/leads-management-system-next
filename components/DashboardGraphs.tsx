"use client";

import React from "react";
import CSRStatsChart from "@/components/CSRStatsChart";
import { FiTrendingUp, FiActivity, FiTarget } from "react-icons/fi";

export type FilterType = "day" | "week" | "month" | "custom";

export interface StatsObj {
    day: number;
    week: number;
    month: number;
    custom?: number;
}

interface DashboardGraphsProps {
    leadsStats?: StatsObj;
    salesStats?: StatsObj;
    filter: FilterType;
    setFilter?: (f: FilterType) => void;
}

export default function DashboardGraphs({
    leadsStats = { day: 0, week: 0, month: 0, custom: 0 },
    salesStats = { day: 0, week: 0, month: 0, custom: 0 },
    filter,
    setFilter,
}: DashboardGraphsProps) {

    const getStatValue = (stats: StatsObj, currentFilter: FilterType): number => {
        if (currentFilter === "custom") return stats.custom || 0;
        return stats[currentFilter as keyof Omit<StatsObj, 'custom'>] || 0;
    };

    const calculateTrend = (current: number) => {
        if (!current || current === 0) return "0%";
        return `+${((current / (current + 10)) * 100).toFixed(1)}%`;
    };

    return (
        /* Change 1: Added 'relative z-10 mb-10' to prevent overlapping and give space below */
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10 mb-10">
            {/* --- HEADER & CONTROLS --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-2">
                <div>
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <FiActivity className="text-indigo-600" />
                        Performance Analytics
                    </h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">
                        {filter === "custom" ? "Viewing Custom Range" : `${filter}ly Conversion Metrics`}
                    </p>
                </div>

                {setFilter && (
                    <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                        {(["day", "week", "month"] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${filter === f
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105"
                                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* --- CHARTS GRID --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* LEADS CARD */}
                <div className="group relative">
                    {/* Change 2: Changed -inset-1 to inset-0 to keep glow inside its boundaries */}
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
                    <div className="relative bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all duration-500">
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                                    <FiTrendingUp size={22} />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inbound Leads</h4>
                                    <p className="text-3xl font-black text-slate-800 mt-1">
                                        {getStatValue(leadsStats, filter).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
                                {calculateTrend(getStatValue(leadsStats, filter))}
                            </span>
                        </div>

                        <div className="h-[200px] w-full transform transition-transform group-hover:scale-[1.01]">
                            <CSRStatsChart
                                title=""
                                day={leadsStats.day}
                                week={leadsStats.week}
                                month={leadsStats.month}
                            />
                        </div>
                    </div>
                </div>

                {/* SALES CARD */}
                <div className="group relative">
                    {/* Change 3: Changed -inset-1 to inset-0 */}
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
                    <div className="relative bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all duration-500">
                        <div className="flex justify-between items-start mb-8">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                                    <FiTarget size={22} />
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Closed Sales</h4>
                                    <p className="text-3xl font-black text-slate-800 mt-1">
                                        {getStatValue(salesStats, filter).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-full">
                                <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                                <span className="text-[8px] font-black text-white uppercase tracking-tighter">Live Monitor</span>
                            </div>
                        </div>

                        <div className="h-[200px] w-full transform transition-transform group-hover:scale-[1.01]">
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