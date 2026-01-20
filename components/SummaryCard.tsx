"use client";

import React from "react";

interface SummaryCardProps {
    title: string;
    value: string | number;
    trend?: string; // Optional trend prop (e.g., "+12%")
    color?: "purple" | "green" | "blue" | "rose" | "orange"; // Named colors for better control
}

export default function SummaryCard({
    title,
    value,
    trend,
    color = "purple"
}: SummaryCardProps) {

    // Color variants mapping for background, text and trend badges
    const themes = {
        purple: {
            bg: "bg-white",
            border: "border-purple-100",
            iconBg: "bg-purple-50",
            text: "text-purple-600",
            bar: "bg-purple-500"
        },
        green: {
            bg: "bg-white",
            border: "border-emerald-100",
            iconBg: "bg-emerald-50",
            text: "text-emerald-600",
            bar: "bg-emerald-500"
        },
        blue: {
            bg: "bg-white",
            border: "border-blue-100",
            iconBg: "bg-blue-50",
            text: "text-blue-600",
            bar: "bg-blue-500"
        },
        rose: {
            bg: "bg-white",
            border: "border-rose-100",
            iconBg: "bg-rose-50",
            text: "text-rose-600",
            bar: "bg-rose-500"
        },
        orange: {
            bg: "bg-white",
            border: "border-orange-100",
            iconBg: "bg-orange-50",
            text: "text-orange-600",
            bar: "bg-orange-500"
        }
    };

    const theme = themes[color];
    const isNegative = trend?.includes("-");

    return (
        <div className={`${theme.bg} p-6 rounded-[2rem] border ${theme.border} shadow-sm hover:shadow-md transition-all duration-300 group`}>
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">
                        {title}
                    </p>
                    <h3 className="text-3xl font-black text-gray-800 tracking-tight">
                        {value}
                    </h3>
                </div>

                {/* Trend Indicator */}
                {trend && (
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${isNegative
                            ? "bg-rose-50 text-rose-600 border-rose-100"
                            : "bg-emerald-50 text-emerald-600 border-emerald-100"
                        }`}>
                        <span>{isNegative ? "↓" : "↑"}</span>
                        {trend}
                    </div>
                )}
            </div>

            {/* Bottom Progress Bar Decorator */}
            <div className="mt-6 flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-gray-50 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ${theme.bar}`}
                        style={{ width: "65%" }}
                    ></div>
                </div>
                <div className={`${theme.iconBg} p-2 rounded-xl group-hover:scale-110 transition-transform`}>
                    <div className={`w-2 h-2 rounded-full ${theme.bar}`}></div>
                </div>
            </div>
        </div>
    );
}