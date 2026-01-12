import http from "./http";
import { User } from "../types/user";

export async function login(
  email: string,
  password: string,
  role?: string
): Promise<{ user: User; token: string }> {
  const res = await http.post("/auth/login", { email, password, role });
  return res.data;
}

export async function getProfile(): Promise<{ user: User } | null> {
  try {
    const res = await http.get("/auth/profile");
    return res.data;
  } catch {
    return null;
  }
}

export async function logoutApi(): Promise<void> {
  localStorage.removeItem("token");
}
