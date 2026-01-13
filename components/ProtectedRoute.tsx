"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ProtectedRoute({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        const token =
            typeof window !== "undefined" ? localStorage.getItem("token") : null;

        if (!token) {
            router.replace("/login");
        } else {
            setChecked(true);
        }
    }, [router]);

    // jab tak check complete na ho, kuch render na karo
    if (!checked) return null;

    return <>{children}</>;
}
