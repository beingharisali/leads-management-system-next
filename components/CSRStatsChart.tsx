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
    labels: string[];
    leads: number[];
    sales: number[];
}

export default function CSRStatsChart({ labels, leads, sales }: CSRStatsChartProps) {
    const data = {
        labels,
        datasets: [
            {
                label: "Total Leads",
                data: leads,
                backgroundColor: "rgba(13, 148, 136, 0.7)", // teal green
                borderRadius: 4,
                barThickness: 24,
            },
            {
                label: "Total Sales",
                data: sales,
                backgroundColor: "rgba(16, 118, 110, 0.7)", // darker teal
                borderRadius: 4,
                barThickness: 24,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false, // allows chart to fill container
        plugins: {
            legend: {
                position: "top" as const,
                labels: {
                    font: { size: 14 },
                    padding: 20,
                },
            },
            title: {
                display: true,
                text: "CSR Performance Stats",
                font: { size: 18, weight: "bold" as const },
            },
            tooltip: {
                enabled: true,
                mode: "index" as const,
                intersect: false,
            },
        },
        interaction: {
            mode: "nearest" as const,
            axis: "x" as const,
            intersect: false,
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { font: { size: 12 } },
            },
            y: {
                beginAtZero: true,
                grid: { color: "#e5e7eb" }, // light gray grid
                ticks: { font: { size: 12 } },
            },
        },
    };

    return (
        <div className="w-full h-96">
            <Bar data={data} options={options} />
        </div>
    );
}
