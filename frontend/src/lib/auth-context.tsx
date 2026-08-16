"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ApiError, apiFetch, getCsrfCookie, onUnauthorized } from "@/lib/api";
import { UserSchema, type User } from "@/lib/types";

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
  updateProfile: (input: Partial<User>) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  setAiConsent: (enabled: boolean) => Promise<void>;
  updateEmail: (email: string, currentPassword: string) => Promise<void>;
  cancelPendingEmail: () => Promise<void>;
  updatePassword: (currentPassword: string, password: string, passwordConfirmation: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cancellation-guarded fetch-on-mount: setState only fires if this
    // effect hasn't been cleaned up (e.g. AuthProvider unmounted mid-request).
    let ignore = false;

    apiFetch<User>("/api/user", {}, UserSchema)
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

  // A session that expires mid-use (cookie timeout, logout in another
  // tab) surfaces as a 401 on whatever request happens to run next, not
  // necessarily the initial /api/user check above — this catches that
  // case wherever it occurs and clears `user` so RequireAuth's existing
  // redirect-to-/login effect fires, instead of the page sitting on
  // stale data throwing uncaught 401s forever.
  useEffect(() => {
    return onUnauthorized(() => setUser(null));
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    await getCsrfCookie();
    const created = await apiFetch<User>(
      "/register",
      { method: "POST", body: JSON.stringify(input) },
      UserSchema,
    );
    setUser(created);
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    await getCsrfCookie();
    const authenticated = await apiFetch<User>(
      "/login",
      { method: "POST", body: JSON.stringify(input) },
      UserSchema,
    );
    setUser(authenticated);
  }, []);

  const logout = useCallback(async () => {
    await apiFetch("/logout", { method: "POST" });
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (input: Partial<User>) => {
    const updated = await apiFetch<User>(
      "/api/user",
      { method: "PATCH", body: JSON.stringify(input) },
      UserSchema,
    );
    setUser(updated);
  }, []);

  const deleteAccount = useCallback(async (password: string) => {
    await apiFetch("/api/user", {
      method: "DELETE",
      body: JSON.stringify({ password }),
    });
    setUser(null);
  }, []);

  const setAiConsent = useCallback(async (enabled: boolean) => {
    const result = await apiFetch<{ ai_syllabus_extraction_consent_at: string | null }>("/api/ai/consent", {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    });
    setUser((current) => (current ? { ...current, ...result } : current));
  }, []);

  // Writes pending_email only — email itself doesn't change until the
  // link mailed to the new address is clicked, so this never logs the
  // current session out or changes what /api/user returns for `email`.
  const updateEmail = useCallback(async (email: string, currentPassword: string) => {
    const updated = await apiFetch<User>(
      "/api/user/email",
      { method: "PATCH", body: JSON.stringify({ email, current_password: currentPassword }) },
      UserSchema,
    );
    setUser(updated);
  }, []);

  const cancelPendingEmail = useCallback(async () => {
    const updated = await apiFetch<User>("/api/user/email", { method: "DELETE" }, UserSchema);
    setUser(updated);
  }, []);

  const updatePassword = useCallback(
    async (currentPassword: string, password: string, passwordConfirmation: string) => {
      const updated = await apiFetch<User>(
        "/api/user/password",
        {
          method: "PATCH",
          body: JSON.stringify({
            current_password: currentPassword,
            password,
            password_confirmation: passwordConfirmation,
          }),
        },
        UserSchema,
      );
      setUser(updated);
    },
    [],
  );

  const resendVerificationEmail = useCallback(async () => {
    await apiFetch("/api/email/verification/resend", { method: "POST" });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        register,
        login,
        logout,
        updateProfile,
        deleteAccount,
        setAiConsent,
        updateEmail,
        cancelPendingEmail,
        updatePassword,
        resendVerificationEmail,
      }}
    >
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
