import ActivityTracker from "@/components/ActivityTracker";

// Every CSR page tracks portal time (visible to admins only).
export default function CsrLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <ActivityTracker />
            {children}
        </>
    );
}
