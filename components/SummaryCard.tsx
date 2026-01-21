"use client";

import React from "react";
import {
    FiArrowUpRight,
    FiArrowDownRight,
    FiActivity,
    FiDollarSign,
    FiUsers,
    FiCheckCircle,
    FiTrendingUp
} from "react-icons/fi";

interface SummaryCardProps {
    title: string;
    value: string | number;
    trend?: string;
    color?: "purple" | "green" | "blue" | "rose" | "orange";
}

export default function SummaryCard({
    title,
    value,
    trend,
    color = "purple"
}: SummaryCardProps) {

    // Color variants mapping for background, text, and decorative elements
    const themes = {
        purple: {
            bg: "bg-white",
            border: "border-purple-100",
            iconBg: "bg-purple-50",
            text: "text-purple-600",
            bar: "bg-purple-500",
            icon: <FiUsers />
        },
        green: {
            bg: "bg-white",
            border: "border-emerald-100",
            iconBg: "bg-emerald-50",
            text: "text-emerald-600",
            bar: "bg-emerald-500",
            icon: <FiCheckCircle />
        },
        blue: {
            bg: "bg-white",
            border: "border-blue-100",
            iconBg: "bg-blue-50",
            text: "text-blue-600",
            bar: "bg-blue-500",
            icon: <FiDollarSign />
        },
        rose: {
            bg: "bg-white",
            border: "border-rose-100",
            iconBg: "bg-rose-50",
            text: "text-rose-600",
            bar: "bg-rose-500",
            icon: <FiActivity />
        },
        orange: {
            bg: "bg-white",
            border: "border-orange-100",
            iconBg: "bg-orange-50",
            text: "text-orange-600",
            bar: "bg-orange-500",
            icon: <FiTrendingUp />
        }
    };

    const theme = themes[color] || themes.purple;

    // Trend logic
    const isNegative = trend?.includes("-");
    const isNeutral = trend?.toLowerCase().includes("live") || trend?.toLowerCase().includes("awaiting");

    return (
        <div className={`group relative overflow-hidden ${theme.bg} p-6 rounded-[2.5rem] border ${theme.border} shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300`}>

            {/* Background Decorative Blur */}
            <div className={`absolute -right-4 -top-4 w-24 h-24 ${theme.iconBg} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity`} />

            <div className="flex justify-between items-start relative z-10">
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        {title}
                    </p>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
                        {value}
                    </h3>
                </div>

                {/* Dynamic Trend Badge */}
                {trend && (
                    <div className={`flex items-center gap-1 px-3 py-1.5 rounded-2xl text-[10px] font-black border transition-all ${isNeutral
                            ? "bg-slate-50 text-slate-500 border-slate-100"
                            : isNegative
                                ? "bg-rose-50 text-rose-600 border-rose-100"
                                : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        }`}>
                        {!isNeutral && (
                            <span className="text-xs">
                                {isNegative ? <FiArrowDownRight /> : <FiArrowUpRight />}
                            </span>
                        )}
                        {trend}
                    </div>
                )}
            </div>

            {/* Bottom Section: Progress Bar & Icon */}
            <div className="mt-8 flex items-center gap-4 relative z-10">
                <div className="flex-1 h-2 bg-slate-100/50 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${theme.bar} opacity-60 group-hover:opacity-100 group-hover:scale-x-105 origin-left`}
                        style={{ width: isNegative ? "35%" : "70%" }}
                    ></div>
                </div>

                {/* Theme-based Icon Container */}
                <div className={`${theme.iconBg} ${theme.text} p-2.5 rounded-2xl shadow-sm group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                    <div className="text-lg">
                        {theme.icon}
                    </div>
                </div>
            </div>
        </div>
    );
}