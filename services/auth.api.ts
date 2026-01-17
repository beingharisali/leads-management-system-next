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
  return (await http.post("/auth/first-admin-signup", data)).data;
};

// ===== LOGIN =====
export const login = async (email: string, password: string): Promise<AuthResponse> => {
  return (await http.post("/auth/login", { email, password })).data;
};

// ===== CREATE CSR (Admin only) =====
export const createCSR = async (data: { name: string; email: string; password: string }): Promise<AuthResponse> => {
  const token = localStorage.getItem("token"); // Admin token
  if (!token) throw new Error("Admin not authenticated");

  return (
    await http.post("/auth/register", data, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).data;
};
