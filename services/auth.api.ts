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

// ===== FIRST ADMIN SIGNUP =====
export const firstAdminSignup = async (data: { name: string; email: string; password: string }): Promise<AuthResponse> => {
  try {
    const res = await http.post("/auth/first-admin-signup", data);
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.msg || "Admin signup failed");
  }
};

// ===== LOGIN =====
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const res = await http.post("/auth/login", { email, password });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.msg || "Login failed");
  }
};

// ===== CREATE CSR (Admin only) =====
export const createCSR = async (data: { name: string; email: string; password: string }): Promise<AuthResponse> => {
  const token = localStorage.getItem("token"); // Admin token
  if (!token) throw new Error("Admin not authenticated");

  try {
    const res = await http.post("/auth/register", data, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  } catch (err: any) {
    throw new Error(err.response?.data?.msg || "CSR creation failed");
  }
};
