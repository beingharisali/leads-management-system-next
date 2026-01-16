// ==================== All System Roles ====================
export type UserRole =
  | "admin"
  | "csr"
  | "instructor"
  | "staff"
  | "student"
  | "teacher";

// ==================== User Interface ====================
export interface User {
  _id?: string;         // Backend MongoDB ID (optional)
  id?: string;          // Frontend-consistent ID (optional)
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

// ==================== Auth Response Interface ====================
export interface AuthResponse {
  user: User;
  token: string;
}
