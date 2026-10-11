import MemberTasksShell from "@/components/tasks/MemberTasksShell";

// The CSR's tasks, inside the CSR portal (activity tracking and lead alerts
// from app/csr/layout.tsx keep running here too).
export default function CsrTasksLayout({ children }: { children: React.ReactNode }) {
    return (
        <MemberTasksShell role="csr" taskBasePath="/csr/tasks" backLink={{ href: "/csr/dashboard", label: "Leads Dashboard" }}>
            {children}
        </MemberTasksShell>
    );
}
