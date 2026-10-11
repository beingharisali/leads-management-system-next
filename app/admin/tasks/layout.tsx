import AdminTasksShell from "@/components/tasks/AdminTasksShell";

export default function AdminTasksLayout({ children }: { children: React.ReactNode }) {
    return <AdminTasksShell>{children}</AdminTasksShell>;
}
