"use client";

import { Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ChartData,
    ChartOptions,
    ScriptableContext
} from "chart.js";

// Register ChartJS modules
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface CSRStatsChartProps {
    title: string;
    day: number | number[];
    week: number | number[];
    month: number | number[];
}

export default function CSRStatsChart({
    title,
    day,
    week,
    month,
}: CSRStatsChartProps) {

    // Data handling logic
    const dayVal = Array.isArray(day) ? day[0] || 0 : day || 0;
    const weekVal = Array.isArray(week) ? week[0] || 0 : week || 0;
    const monthVal = Array.isArray(month) ? month[0] || 0 : month || 0;

    // Fixed Gradient logic with correct types
    const getGradient = (context: ScriptableContext<"bar">) => {
        const chart = context.chart;
        const { ctx, chartArea } = chart;
        if (!chartArea) return "rgba(99, 102, 241, 0.8)";

        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
        gradient.addColorStop(0, "rgba(99, 102, 241, 0.2)");
        gradient.addColorStop(1, "rgba(99, 102, 241, 1)");
        return gradient;
    };

    // Data object with strict typing
    const data: ChartData<"bar"> = {
        labels: ["DAY", "WEEK", "MONTH"],
        datasets: [
            {
                label: title || "Units",
                data: [dayVal, weekVal, monthVal],
                backgroundColor: getGradient,
                hoverBackgroundColor: "rgba(79, 70, 229, 1)",
                borderRadius: 12,
                borderSkipped: false,
                barThickness: 32,
            },
        ],
    };

    // Options object with fixed "weight" redlines
    const options: ChartOptions<"bar"> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: { display: false },
            tooltip: {
                backgroundColor: "#0f172a",
                padding: 12,
                titleFont: { size: 10, weight: "bold" as const, family: "Inter" },
                bodyFont: { size: 13, family: "Inter" },
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    label: (context) => {
                        const value = context.raw as number;
                        return `${value.toLocaleString()} Units`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: {
                    color: "#94a3b8",
                    // Fixed: added 'as const' to prevent redline
                    font: { size: 10, weight: 900 as const },
                }
            },
            y: {
                beginAtZero: true,
                border: { display: false, dash: [4, 4] },
                grid: {
                    color: "#f1f5f9",
                },
                ticks: {
                    color: "#cbd5e1",
                    font: { size: 10 },
                    maxTicksLimit: 5,
                }
            },
        },
    };

    const allZero = dayVal === 0 && weekVal === 0 && monthVal === 0;

    return (
        <div className="w-full h-full flex items-center justify-center min-h-[180px]">
            {allZero ? (
                <div className="flex flex-col items-center gap-2 animate-in fade-in duration-500">
                    <div className="w-12 h-1 bg-slate-100 rounded-full"></div>
                    <p className="text-slate-300 text-[10px] font-black uppercase tracking-widest">
                        No Data Available
                    </p>
                </div>
            ) : (
                <Bar data={data} options={options} />
            )}
        </div>
    );
}