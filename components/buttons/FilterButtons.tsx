// /components/buttons/FilterButtons.tsx
"use client";

interface FilterButtonsProps<T extends string> {
    options: T[];
    selected: T;
    onChange: (value: T) => void;
    labels?: Record<T, string>;
}

export default function FilterButtons<T extends string>({
    options,
    selected,
    onChange,
    labels,
}: FilterButtonsProps<T>) {
    return (
        <div className="mb-4 flex gap-3 flex-wrap">
            {options.map((opt) => (
                <button
                    key={opt}
                    onClick={() => onChange(opt)}
                    className={`px-4 py-2 rounded font-medium transition-colors duration-200 ${selected === opt ? "bg-black text-white" : "bg-white border hover:bg-gray-200"
                        }`}
                >
                    {labels?.[opt] || opt}
                </button>
            ))}
        </div>
    );
}
