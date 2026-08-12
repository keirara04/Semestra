"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ApiError, apiFetch, getCsrfCookie } from "@/lib/api";
import type { User } from "@/lib/types";

interface RegisterInput {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  timezone?: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  register: (input: RegisterInput) => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cancellation-guarded fetch-on-mount — setState only fires if this
    // effect hasn't been cleaned up (e.g. AuthProvider unmounted mid-request).
    let ignore = false;

    apiFetch<User>("/api/user")
      .then((current) => {
        if (!ignore) {
          setUser(current);
        }
      })
      .catch((error) => {
        if (ignore) return;
        if (error instanceof ApiError && error.status === 401) {
          setUser(null);
        } else {
          throw error;
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    await getCsrfCookie();
    const created = await apiFetch<User>("/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setUser(created);
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    await getCsrfCookie();
    const authenticated = await apiFetch<User>("/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setUser(authenticated);
  }, []);

  const logout = useCallback(async () => {
    await apiFetch("/logout", { method: "POST" });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
