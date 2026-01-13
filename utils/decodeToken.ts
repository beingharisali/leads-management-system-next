"use client";

import * as jwtDecode from "jwt-decode";

interface DecodedToken {
    role: "admin" | "csr";
    [key: string]: any; // extra fields if any
}

export function getUserRole(): "admin" | "csr" | null {
    if (typeof window === "undefined") return null;

    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
        // TypeScript-safe decode
        const decoded: DecodedToken = (jwtDecode as any)(token);
        return decoded.role ?? null;
    } catch (err) {
        console.error("JWT decode error:", err);
        return null;
    }
}
