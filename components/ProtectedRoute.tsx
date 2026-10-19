"use client";

import { useEffect, ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import jwtDecode from "jwt-decode"
import { getMe, Permission } from "@/services/auth.api";
interface DecodedToken {
    role: string;
    exp: number;
}

export default function ProtectedRoute({
    children,
    role,
    permission,
}: {
    children: ReactNode;
    role?: string;
    // Admin pages: a staff member with any of these permissions may open them too
    permission?: Permission | Permission[];
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    // A string, so a new array each render does not re-run the check
    const permissionKey = permission ? [permission].flat().join(",") : "";

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
                const allowed = (permissionKey ? permissionKey.split(",") : []) as Permission[];
                if (role === "admin" && decoded.role === "staff" && allowed.length > 0) {
                    // Permissions can change at any time, so ask the server
                    getMe()
                        .then((res) => {
                            const mine = res.user?.permissions || [];
                            if (allowed.some((p) => mine.includes(p))) setLoading(false);
                            else router.replace("/staff/tasks");
                        })
                        .catch(() => router.replace("/login"));
                    return;
                }
                router.replace("/login");
                return;
            }

            setLoading(false); // ✅ authorized
        } catch (err) {
            localStorage.removeItem("token");
            router.replace("/login");
        }
    }, [router, role, permissionKey]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-lg font-medium">Checking authentication...</p>
            </div>
        );
    }

    return <>{children}</>;
}
