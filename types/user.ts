// All system roles (global)
export type UserRole =
  | "admin"
  | "csr"
  | "instructor"
  | "staff"
  | "student"
  | "teacher";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}
