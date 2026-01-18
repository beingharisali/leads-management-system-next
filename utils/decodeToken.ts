"use client";

interface DecodedToken {
    role: "admin" | "csr";
    userId?: string;
    name?: string;
    [key: string]: any;
}

/* ================= GET USER ROLE ================= */
export async function getUserRole(): Promise<"admin" | "csr" | null> {
    if (typeof window === "undefined") return null;

    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
        const jwtDecode = (await import("jwt-decode")).default;
        const decoded: DecodedToken = jwtDecode(token);
        return decoded.role ?? null;
    } catch (error) {
        console.error("JWT decode error (role):", error);
        return null;
    }
}

/* ================= GET USER ID ================= */
export async function getUserId(): Promise<string | null> {
    if (typeof window === "undefined") return null;

    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
        const jwtDecode = (await import("jwt-decode")).default;
        const decoded: DecodedToken = jwtDecode(token);
        return decoded.userId ?? null;
    } catch (error) {
        console.error("JWT decode error (userId):", error);
        return null;
    }
}

/* ================= LOGOUT ================= */
export function logout() {
    if (typeof window === "undefined") return;

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // hard redirect (safe for utils file)
    window.location.href = "/login";
}
