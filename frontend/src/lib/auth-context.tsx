"use client";

import { createContext, useCallback, useContext, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiFetch, getCsrfCookie, onUnauthorized } from "@/lib/api";
import { qk } from "@/lib/query-keys";
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
  const queryClient = useQueryClient();

  // The "who's logged in" query — a 401 means logged out, not an error
  // worth surfacing, so it resolves to null rather than throwing (a 401
  // here used to have to be special-cased in every consumer's catch block;
  // React Query just caches the "no user" result like any other value).
  // staleTime: Infinity — this only changes via an explicit mutation
  // (login/logout/register/profile update), each of which writes the
  // result straight into this same cache entry with setQueryData, so
  // there's never a reason to silently refetch it in the background.
  const userQuery = useQuery({
    queryKey: qk.user,
    queryFn: async () => {
      try {
        return await apiFetch<User>("/api/user", {}, UserSchema);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
    staleTime: Infinity,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
      return failureCount < 2;
    },
  });

  const user = userQuery.data ?? null;
  // isPending (not isLoading) so a background refetch after a 401-driven
  // reset never flashes the "loading" gate RequireAuth checks — only the
  // very first, uncached fetch should count as loading.
  const loading = userQuery.isPending;

  // A session that expires mid-use (cookie timeout, logout in another
  // tab) surfaces as a 401 on whatever request happens to run next, not
  // necessarily the /api/user query above — this catches that case
  // wherever it occurs and clears the cached user so RequireAuth's
  // existing redirect-to-/login effect fires, instead of the page sitting
  // on stale data throwing uncaught 401s forever.
  useEffect(() => {
    return onUnauthorized(() => queryClient.setQueryData(qk.user, null));
  }, [queryClient]);

  const register = useCallback(
    async (input: RegisterInput) => {
      await getCsrfCookie();
      const created = await apiFetch<User>(
        "/register",
        { method: "POST", body: JSON.stringify(input) },
        UserSchema,
      );
      queryClient.setQueryData(qk.user, created);
    },
    [queryClient],
  );

  const login = useCallback(
    async (input: LoginInput) => {
      await getCsrfCookie();
      const authenticated = await apiFetch<User>(
        "/login",
        { method: "POST", body: JSON.stringify(input) },
        UserSchema,
      );
      queryClient.setQueryData(qk.user, authenticated);
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await apiFetch("/logout", { method: "POST" });
    queryClient.setQueryData(qk.user, null);
    // Everything else cached (courses, semesters, tasks...) belonged to
    // this session — drop it so the next login never shows a flash of the
    // previous account's data before its own queries land.
    queryClient.clear();
  }, [queryClient]);

  const updateProfile = useCallback(
    async (input: Partial<User>) => {
      const updated = await apiFetch<User>(
        "/api/user",
        { method: "PATCH", body: JSON.stringify(input) },
        UserSchema,
      );
      queryClient.setQueryData(qk.user, updated);
    },
    [queryClient],
  );

  const deleteAccount = useCallback(
    async (password: string) => {
      await apiFetch("/api/user", {
        method: "DELETE",
        body: JSON.stringify({ password }),
      });
      queryClient.setQueryData(qk.user, null);
      queryClient.clear();
    },
    [queryClient],
  );

  const setAiConsent = useCallback(
    async (enabled: boolean) => {
      const result = await apiFetch<{ ai_syllabus_extraction_consent_at: string | null }>("/api/ai/consent", {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      });
      queryClient.setQueryData(qk.user, (current: User | null | undefined) =>
        current ? { ...current, ...result } : current,
      );
    },
    [queryClient],
  );

  // Writes pending_email only — email itself doesn't change until the
  // link mailed to the new address is clicked, so this never logs the
  // current session out or changes what /api/user returns for `email`.
  const updateEmail = useCallback(
    async (email: string, currentPassword: string) => {
      const updated = await apiFetch<User>(
        "/api/user/email",
        { method: "PATCH", body: JSON.stringify({ email, current_password: currentPassword }) },
        UserSchema,
      );
      queryClient.setQueryData(qk.user, updated);
    },
    [queryClient],
  );

  const cancelPendingEmail = useCallback(async () => {
    const updated = await apiFetch<User>("/api/user/email", { method: "DELETE" }, UserSchema);
    queryClient.setQueryData(qk.user, updated);
  }, [queryClient]);

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
      queryClient.setQueryData(qk.user, updated);
    },
    [queryClient],
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
