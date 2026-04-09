"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { UserRole } from "./types";

interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  refreshUser: () => Promise<AuthUser | null>;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{
    success: boolean;
    error?: string;
    requiresVerification?: boolean;
    email?: string;
    resendAfterSeconds?: number;
  }>;
  logout: () => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department: string;
  phone?: string;
  student_id?: string;
  faculty_id?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        return data.user as AuthUser;
      } else {
        setUser(null);
        return null;
      }
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.error || "Login failed" };
    } catch {
      return { success: false, error: "Network error" };
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok) {
        if (result.user) {
          setUser(result.user);
          return { success: true };
        }

        return {
          success: true,
          requiresVerification: !!result.requiresVerification,
          email: result.email,
          resendAfterSeconds: result.resendAfterSeconds,
        };
      }
      return { success: false, error: result.error || "Registration failed" };
    } catch {
      return { success: false, error: "Network error" };
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, refreshUser: fetchUser, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
