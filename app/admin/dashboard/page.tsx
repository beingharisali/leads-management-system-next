// app/admin/dashboard/page.tsx
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";


export default function AdminDashboard() {
    return (
        <ProtectedRoute>
            <RoleGuard allowedRole="admin">

                <h1>Admin Dashboard</h1>
            </RoleGuard>

        </ProtectedRoute>
    );
}
