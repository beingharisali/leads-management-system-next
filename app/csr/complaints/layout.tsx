import MemberTasksShell from "@/components/tasks/MemberTasksShell";

// The CSR's complaints to the admin, in the same frame as their My Tasks.
export default function CsrComplaintsLayout({ children }: { children: React.ReactNode }) {
    return (
        <MemberTasksShell role="csr" taskBasePath="/csr/tasks" backLink={{ href: "/csr/dashboard", label: "Leads Dashboard" }}>
            {children}
        </MemberTasksShell>
    );
}
