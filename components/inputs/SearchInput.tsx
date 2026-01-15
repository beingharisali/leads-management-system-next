"use client";

interface SearchInputProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
}

export default function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
    return (
        <input
            type="text"
            placeholder={placeholder || "Search..."}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mb-4 w-full max-w-md border p-2 rounded"
        />
    );
}
