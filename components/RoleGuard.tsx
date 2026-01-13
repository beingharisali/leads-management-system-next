"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserRole } from "@/utils/decodeToken";

interface RoleGuardProps {
    allowedRole: "admin" | "csr";
    children: React.ReactNode;
}

export default function RoleGuard({ allowedRole, children }: RoleGuardProps) {
    const router = useRouter();
    const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

    useEffect(() => {
        const role = getUserRole();

        if (!role || role !== allowedRole) {
            router.replace("/login"); // redirect if no role or wrong role
            setIsAllowed(false);
        } else {
            setIsAllowed(true); // allowed
        }
    }, [router, allowedRole]);

    // wait until role check is complete to avoid flicker
    if (isAllowed === null) return null;

    return <>{children}</>;
}
