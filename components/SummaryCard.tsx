interface SummaryCardProps {
    title: string;
    value: string | number;
    color?: string; // Tailwind background color class
}

export default function SummaryCard({ title, value, color = "bg-gray-500" }: SummaryCardProps) {
    return (
        <div className={`${color} text-white rounded-xl p-4 shadow-md flex flex-col justify-between`}>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
    );
}
