import http from "./http";

// -------------------- Types --------------------
export interface User {
  _id: string;         // backend se aata hai
  name: string;
  email: string;
  role: "admin" | "csr";
}

export interface AuthResponse {
  user: User;
  token: string;
}

// -------------------- Login API --------------------
export async function login(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const res = await http.post<AuthResponse>("/auth/login", { email, password });
    return res.data; // { user, token }
  } catch (err: any) {
    if (err.response?.data?.msg) throw new Error(err.response.data.msg);
    if (err instanceof Error) throw new Error(err.message);
    throw new Error("Login failed. Please try again.");
  }
}

// -------------------- Signup / Register API --------------------
export async function register(data: {
  name: string;
  email: string;
  password: string;
  role: "csr" | "admin";
}): Promise<AuthResponse> {
  try {
    const res = await http.post<AuthResponse>("/auth/register", data);
    return res.data; // { user, token }
  } catch (err: any) {
    if (err.response?.data?.msg) throw new Error(err.response.data.msg);
    if (err instanceof Error) throw new Error(err.message);
    throw new Error("Signup failed. Please try again.");
  }
}

// -------------------- Get currently logged-in user profile --------------------
export async function getProfile(): Promise<User | null> {
  try {
    const res = await http.get<{ user: User }>("/auth/profile");
    return res.data.user || null;
  } catch (err) {
    console.warn("Failed to fetch profile:", err);
    return null;
  }
}

// -------------------- Logout --------------------
export function logoutApi(): void {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("userId");
  localStorage.removeItem("role");
}
