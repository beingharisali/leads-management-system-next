"use client";
import { Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
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
                backgroundColor: "rgba(13, 148, 136, 0.7)",
            },
            {
                label: "Total Sales",
                data: sales,
                backgroundColor: "rgba(16, 118, 110, 0.7)",
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { position: "top" as const },
            title: { display: true, text: "CSR Performance Stats" },
        },
    };

    return <Bar data={data} options={options} />;
}
