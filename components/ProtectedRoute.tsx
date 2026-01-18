"use client";

import { useEffect, ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import jwtDecode from "jwt-decode"
interface DecodedToken {
    role: string;
    exp: number;
}

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

        if (!token) {
            router.replace("/login");
            return;
        }

        try {
            const decoded = jwtDecode<DecodedToken>(token);

            // token expired
            if (decoded.exp * 1000 < Date.now()) {
                localStorage.removeItem("token");
                router.replace("/login");
                return;
            }

            // role mismatch
            if (role && decoded.role !== role) {
                router.replace("/login");
                return;
            }

            setLoading(false); // ✅ authorized
        } catch (err) {
            localStorage.removeItem("token");
            router.replace("/login");
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
