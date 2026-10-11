import MemberTasksShell from "@/components/tasks/MemberTasksShell";

// Staff accounts only have the task portal.
export default function StaffLayout({ children }: { children: React.ReactNode }) {
    return (
        <MemberTasksShell role="staff" taskBasePath="/staff/tasks">
            {children}
        </MemberTasksShell>
    );
}
