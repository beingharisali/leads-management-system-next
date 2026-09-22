import http from "./http";

/* ===================== TYPES & INTERFACES ===================== */
export interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "csr";
  status: "active" | "inactive";
}

export interface AuthResponse {
  user: User;
  token: string;
  success?: boolean;
  message?: string;
  msg?: string;
}

/* ===================== HELPER: AUTH HEADERS ===================== */
const getAuthHeaders = () => {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("token");
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  };
};

/* ===================== AUTH FUNCTIONS ===================== */

// 1. Admin Signup (First Time)
export const firstAdminSignup = async (data: { name: string; email: string; password: string }): Promise<AuthResponse> => {
  try {
    const res = await http.post("/auth/first-admin-signup", data);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.msg || err.response?.data?.message || "Admin signup failed");
  }
};

// 2. Login Logic
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const res = await http.post("/auth/login", { email: email.toLowerCase(), password });
    if (res.data.token) {
      localStorage.setItem("token", res.data.token);
    }
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.msg || err.response?.data?.message || "Login failed");
  }
};

// 3. Create CSR (Agent Registration)
export const createCSR = async (data: { name: string; email: string; password: string; role?: string }): Promise<AuthResponse> => {
  try {
    const payload = { ...data, role: data.role || "csr" };
    const res = await http.post("/auth/register", payload, getAuthHeaders());
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.msg || err.response?.data?.message || "Only admins can create agents");
  }
};

/**
 * 4. UPDATE CSR STATUS (FIXED VERSION)
 * Dashboard se targetStatus (active ya inactive) aa raha hai.
 * Hum usey mazeed toggle nahi karenge, seedha backend bhejenge.
 */
export const updateCSRStatus = async (csrId: string, targetStatus: string): Promise<AuthResponse> => {
  if (!csrId) throw new Error("Missing Agent ID.");

  try {
    // Dashboard se pehle hi 'inactive' ya 'active' decide hoke aa raha hai
    // Isliye hum yahan mazeed switch nahi karenge.
    const finalStatus = String(targetStatus).toLowerCase().trim();

    console.log(`[TERMINAL SYNC] Sending to Backend -> ID: ${csrId} | Status: ${finalStatus}`);

    const res = await http.patch(
      `/auth/update-status/${csrId}`,
      { status: finalStatus }, // Seedha target status bhejien
      getAuthHeaders()
    );

    console.log(`[SYNC SUCCESS] Backend updated to: ${res.data?.user?.status}`);
    return res.data;
  } catch (err: any) {
    const errorMsg = err.response?.data?.msg || err.response?.data?.message || "Status sync failed";
    console.error(`[SYNC ERROR] ${errorMsg}`);
    throw new Error(errorMsg);
  }
};

// 5. Get Current User Session
export const getMe = async (): Promise<AuthResponse> => {
  try {
    const res = await http.get("/auth/me", getAuthHeaders());
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.msg || "Session expired");
  }
};