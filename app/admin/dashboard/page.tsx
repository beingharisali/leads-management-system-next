// app/admin/dashboard/page.tsx
import ProtectedRoute from "@/components/ProtectedRoute";

export default function AdminDashboard() {
    return (
        <ProtectedRoute>
            <h1>Admin Dashboard</h1>
        </ProtectedRoute>
    );
}
