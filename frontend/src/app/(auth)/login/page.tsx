"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AppleIcon, BookIcon, EyeIcon, GoogleIcon } from "@/components/auth/icons";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-10 text-center lg:hidden">
        <div className="flex items-center justify-center gap-2.5">
          <BookIcon className="h-7 w-7 text-[var(--fn-ink)]" />
          <span className="text-3xl font-bold tracking-tight">Semestra</span>
        </div>
        <p className="mt-2 text-sm text-[var(--fn-muted)]">Your semester, in one view.</p>
        <div className="fn-divider-accent mx-auto mt-4" />
      </div>

      <p className="fn-eyebrow">Welcome back</p>
      <div className="fn-divider-accent mt-2" />

      <div className="mt-8 flex flex-col gap-3">
        <button type="button" className="fn-oauth-btn">
          <GoogleIcon className="h-5 w-5" />
          Continue with Google
        </button>
        <button type="button" className="fn-oauth-btn">
          <AppleIcon className="h-5 w-5" />
          Continue with Apple
        </button>
      </div>

      <div className="fn-mono my-7 flex items-center gap-4 text-xs tracking-wider text-[var(--fn-muted)] uppercase">
        <span className="h-px flex-1 bg-[var(--fn-rule)]" />
        Or use email
        <span className="h-px flex-1 bg-[var(--fn-rule)]" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="fn-label">Email address</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            className="fn-input"
          />
        </label>

        <label className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="fn-label">Password</span>
            <Link
              href="/forgot-password"
              className="fn-mono text-[0.7rem] tracking-wide text-[var(--fn-cobalt)] underline underline-offset-2 uppercase"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              className="fn-input pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-[var(--fn-muted)]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <EyeIcon open={showPassword} className="h-5 w-5" />
            </button>
          </div>
        </label>

        {error && (
          <p role="alert" className="text-sm text-[var(--fn-oxide)]">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className="fn-btn-primary">
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-[var(--fn-muted)]">
        New to Semestra?{" "}
        <Link href="/register" className="text-[var(--fn-cobalt)] underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </div>
  );
}
