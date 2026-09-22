import { FilterOption } from "@/components/filters/ColumnFilterDropdown";

// "2026-09" - used both as the filter key and to sort months chronologically.
export const monthKeyOf = (dateStr?: string): string | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

const monthLabel = (key: string): string => {
    const [year, month] = key.split("-");
    return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
};

// Distinct months (newest first) present in the leads' createdAt dates.
export const monthOptionsFrom = (dates: (string | undefined)[]): FilterOption[] => {
    const keys = new Set<string>();
    dates.forEach((d) => {
        const key = monthKeyOf(d);
        if (key) keys.add(key);
    });
    return Array.from(keys)
        .sort((a, b) => (a < b ? 1 : -1))
        .map((key) => ({ value: key, label: monthLabel(key) }));
};

// Distinct, case-insensitive text values (e.g. city/source), alphabetical.
export const textOptionsFrom = (values: (string | undefined)[]): FilterOption[] => {
    const map = new Map<string, string>();
    values.forEach((v) => {
        const trimmed = (v || "").trim();
        if (!trimmed) return;
        const key = trimmed.toLowerCase();
        if (!map.has(key)) map.set(key, trimmed);
    });
    return Array.from(map.entries())
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([value, label]) => ({ value, label }));
};
