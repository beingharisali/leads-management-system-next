import ActivityTracker from "@/components/ActivityTracker";
import UrgentLeadsNotifier from "@/components/UrgentLeadsNotifier";
import AdmissionNotifier from "@/components/AdmissionNotifier";

// Every CSR page tracks portal time (admins see the full history; the
// CSR sees today's timer on their dashboard) and watches for urgent leads
// and newly submitted admission forms, so the CSR is alerted wherever
// they are in the portal.
export default function CsrLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <ActivityTracker />
            <UrgentLeadsNotifier>{children}</UrgentLeadsNotifier>
            <AdmissionNotifier />
        </>
    );
}
