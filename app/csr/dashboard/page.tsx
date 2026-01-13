// app/csr/dashboard/page.tsx
import ProtectedRoute from "@/components/ProtectedRoute";

export default function CsrDashboard() {
    return (
        <ProtectedRoute>
            <h1>CSR Dashboard</h1>
        </ProtectedRoute>
    );
}
