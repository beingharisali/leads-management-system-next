import ActivityTracker from "@/components/ActivityTracker";

// Every CSR page tracks portal time (admins see the full history; the
// CSR sees today's timer on their dashboard).
export default function CsrLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <ActivityTracker />
            {children}
        </>
    );
}
