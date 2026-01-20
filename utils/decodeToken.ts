"use client";

interface DecodedToken {
    role: "admin" | "csr";
    userId?: string;
    name?: string;
    [key: string]: any;
}

/* ================= GET TOKEN ================= */
export function getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("token");
}

/* ================= GET USER ROLE ================= */
export async function getUserRole(): Promise<"admin" | "csr" | null> {
    const token = getToken();
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
    const token = getToken();
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

    // hard redirect to login
    window.location.href = "/login";
}
