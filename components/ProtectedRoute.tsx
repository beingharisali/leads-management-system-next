"use client";
import { useEffect, ReactNode, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProtectedRoute({
    children,
    role,
}: {
    children: ReactNode;
    role?: string;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const userRole = localStorage.getItem("role");

        if (!token || (role && userRole !== role)) {
            router.push("/login");
        } else {
            setLoading(false); // user authorized
        }
    }, [router, role]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-lg font-medium">Checking authentication...</p>
            </div>
        );
    }

    return <>{children}</>;
}
