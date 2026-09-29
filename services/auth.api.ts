import http, { getErrorMessage } from "./http";

/* ===================== TYPES & INTERFACES ===================== */
export interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "csr";
  status: "active" | "inactive";
  personalPhone?: string;
  officialPhone?: string;
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
    throw new Error(getErrorMessage(err, "Admin signup failed"));
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
    throw new Error(getErrorMessage(err, "Login failed"));
  }
};

// 3. Create CSR (Agent Registration)
export const createCSR = async (data: { name: string; email: string; password: string; role?: string; personalPhone?: string; officialPhone?: string }): Promise<AuthResponse> => {
  try {
    const payload = { ...data, role: data.role || "csr" };
    const res = await http.post("/auth/register", payload, getAuthHeaders());
    return res.data;
  } catch (err: any) {
    throw new Error(getErrorMessage(err, "Failed to create agent"));
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
    const errorMsg = getErrorMessage(err, "Failed to update agent status");
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
    throw new Error(getErrorMessage(err, "Session expired. Please log in again."));
  }
};

// 6. Get a single CSR's profile (admin only)
export const getAgent = async (csrId: string): Promise<User> => {
  try {
    const res = await http.get(`/auth/agent/${csrId}`, getAuthHeaders());
    return res.data.data;
  } catch (err: any) {
    throw new Error(getErrorMessage(err, "Failed to load agent"));
  }
};

// 7. Update a CSR's personal / allotted number (admin only)
export const updateAgentPhones = async (
  csrId: string,
  data: { personalPhone?: string; officialPhone?: string }
): Promise<User> => {
  try {
    const res = await http.patch(`/auth/agent/${csrId}/phones`, data, getAuthHeaders());
    return res.data.data;
  } catch (err: any) {
    throw new Error(getErrorMessage(err, "Failed to update number"));
  }
};
