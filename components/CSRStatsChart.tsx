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
} from "chart.js";

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
    // Handle arrays vs single numbers
    const dayVal = Array.isArray(day) ? day[0] || 0 : day || 0;
    const weekVal = Array.isArray(week) ? week[0] || 0 : week || 0;
    const monthVal = Array.isArray(month) ? month[0] || 0 : month || 0;

    const data = {
        labels: ["Day", "Week", "Month"],
        datasets: [
            {
                label: title,
                data: [dayVal, weekVal, monthVal],
                backgroundColor: [
                    dayVal ? "rgba(13, 148, 136, 0.8)" : "rgba(200,200,200,0.3)",
                    weekVal ? "rgba(16, 118, 110, 0.8)" : "rgba(200,200,200,0.3)",
                    monthVal ? "rgba(15, 76, 92, 0.8)" : "rgba(200,200,200,0.3)",
                ],
                borderRadius: 6,
                barThickness: 40,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            title: {
                display: true,
                text: title,
                font: { size: 18, weight: "bold" as const },
            },
            tooltip: {
                enabled: true,
                callbacks: {
                    label: function (context: any) {
                        return `${context.dataset.label}: ${context.raw}`;
                    },
                },
            },
        },
        scales: {
            x: { grid: { display: false } },
            y: { beginAtZero: true, grid: { color: "#e5e7eb" } },
        },
    };

    // If all data is zero, show "No data available"
    const allZero = dayVal === 0 && weekVal === 0 && monthVal === 0;

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg h-96 flex items-center justify-center">
            {allZero ? (
                <p className="text-gray-400 text-lg font-semibold">
                    No data available
                </p>
            ) : (
                <Bar data={data} options={options} />
            )}
        </div>
    );
}
