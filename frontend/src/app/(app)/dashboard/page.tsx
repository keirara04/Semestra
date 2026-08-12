"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

// Placeholder only — the real Today dashboard is Phase 5. This exists to
// prove the auth flow (register/login/protected-route/logout) end to end.
export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold">Welcome, {user?.name}</h1>
      <p className="text-sm text-gray-600">{user?.email}</p>
      <button
        type="button"
        onClick={handleLogout}
        className="w-fit rounded border px-3 py-2"
      >
        Log out
      </button>
    </main>
  );
}
