import http from "./http";
import { User } from "../types/user";

export interface LoginResponse {
  user: User;
  token: string;
}

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await http.post("/auth/login", {
    email,
    password,
  });

  return res.data;
}

export async function getProfile(): Promise<User | null> {
  try {
    const res = await http.get("/auth/profile");
    return res.data.user;
  } catch {
    return null;
  }
}

export function logoutApi(): void {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}
