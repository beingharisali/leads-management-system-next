import http from "./http"; // Axios instance

export interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "csr";
}

export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * First Admin Signup
 * No token required for initial setup
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
 * Authenticates user and returns credentials
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
 * Requires valid Admin Token in Headers
 */
export const createCSR = async (data: { name: string; email: string; password: string }): Promise<AuthResponse> => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  if (!token) {
    throw new Error("Authentication token missing. Please login as Admin.");
  }

  try {
    const res = await http.post("/auth/register", data, {
      headers: {
        // Space after 'Bearer' is crucial
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
    });
    return res.data;
  } catch (err: any) {
    // 401 Error usually comes from here
    const errorMsg =
      err.response?.data?.msg ||
      err.response?.data?.message ||
      "Unauthorized: Only admins can create CSR accounts";

    throw new Error(errorMsg);
  }
};