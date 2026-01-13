// app/csr/dashboard/page.tsx
import ProtectedRoute from "@/components/ProtectedRoute";
import RoleGuard from "@/components/RoleGuard";


export default function CsrDashboard() {
    return (
        <ProtectedRoute>
            <RoleGuard allowedRole="csr">

                <h1>CSR Dashboard</h1>
            </RoleGuard>

        </ProtectedRoute>
    );
}
