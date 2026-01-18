"use client";

interface DecodedToken {
    role: "admin" | "csr";
    userId?: string; // agar user id chahiye
    [key: string]: any; // extra fields if any
}

// ✅ Get user role from token
export async function getUserRole(): Promise<"admin" | "csr" | null> {
    if (typeof window === "undefined") return null;

    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
        const jwtDecode = (await import("jwt-decode")).default;
        const decoded: DecodedToken = jwtDecode(token);
        return decoded.role ?? null;
    } catch (err) {
        console.error("JWT decode error:", err);
        return null;
    }
}

// ✅ Get user ID from token
export async function getUserId(): Promise<string | null> {
    if (typeof window === "undefined") return null;

    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
        const jwtDecode = (await import("jwt-decode")).default;
        const decoded: DecodedToken = jwtDecode(token);
        return decoded.userId ?? null;
    } catch (err) {
        console.error("JWT decode error:", err);
        return null;
    }
}
