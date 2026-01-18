"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";

interface RoleGuardProps {
    allowedRole: "admin" | "csr";
    children: ReactNode;
}

interface DecodedToken {
    role: string;
    exp: number;
}

export default function RoleGuard({ allowedRole, children }: RoleGuardProps) {
    const router = useRouter();
    const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

    useEffect(() => {
        const checkRole = async () => {
            const token = localStorage.getItem("token");

            if (!token) {
                router.replace("/login");
                setIsAllowed(false);
                return;
            }

            try {
                // ✅ Dynamic import of jwt-decode
                const jwtDecode = (await import("jwt-decode")).default;
                const decoded = jwtDecode<DecodedToken>(token);

                // token expired
                if (decoded.exp * 1000 < Date.now()) {
                    localStorage.removeItem("token");
                    router.replace("/login");
                    setIsAllowed(false);
                    return;
                }

                // role check
                if (decoded.role !== allowedRole) {
                    router.replace("/login");
                    setIsAllowed(false);
                    return;
                }

                setIsAllowed(true); // allowed
            } catch (err) {
                console.error(err);
                localStorage.removeItem("token");
                router.replace("/login");
                setIsAllowed(false);
            }
        };

        checkRole();
    }, [router, allowedRole]);

    // wait until role check completes
    if (isAllowed === null) return null;

    return <>{children}</>;
}
