import http from "./http"; // Axios instance

export interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "csr";
  status?: "active" | "inactive"; // Status field add kiya
}

export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * Utility to get token from localStorage
 */
const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  };
};

/**
 * First Admin Signup
 */
export const firstAdminSignup = async (data: { name: string; email: string; password: string }): Promise<AuthResponse> => {
  try {
    const res = await http.post("/auth/first-admin-signup", data);
    return res.data;
  } catch (err: any) {
    const errorMsg = err.response?.data?.msg || err.response?.data?.message || "Admin signup failed";
    throw new Error(errorMsg);
  }
};

/**
 * Login
 */
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const res = await http.post("/auth/login", { email, password });
    return res.data;
  } catch (err: any) {
    const errorMsg = err.response?.data?.msg || err.response?.data?.message || "Login failed";
    throw new Error(errorMsg);
  }
};

/**
 * Create CSR (Admin Protected)
 */
export const createCSR = async (data: { name: string; email: string; password: string }): Promise<AuthResponse> => {
  try {
    const res = await http.post("/auth/register", data, getAuthHeaders());
    return res.data;
  } catch (err: any) {
    const errorMsg = err.response?.data?.msg || err.response?.data?.message || "Unauthorized: Only admins can create CSR accounts";
    throw new Error(errorMsg);
  }
};

/**
 * Update CSR Status (Active/Inactive)
 * Admin can toggle CSR access
 */
export const updateCSRStatus = async (csrId: string, status: string): Promise<any> => {
  try {
    // Backend endpoint: /auth/update-status/:id
    const res = await http.patch(`/auth/update-status/${csrId}`, { status }, getAuthHeaders());
    return res.data;
  } catch (err: any) {
    const errorMsg = err.response?.data?.message || "Failed to update CSR status";
    throw new Error(errorMsg);
  }
};