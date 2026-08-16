"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AppleIcon, EyeIcon, GoogleIcon } from "@/components/auth/icons";
import SplitFlapText from "@/components/SplitFlapText";

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
      <div className="mb-10 flex flex-col items-center text-center lg:hidden">
        <SplitFlapText
          words={["        ", "SEMESTRA", "PLAN", "FOCUS", "TRACK"]}
          flipDuration={0.12}
          stagger={0.05}
          cycleDelay={10000}
          initialDelay={300}
          charset="alpha"
          flipsPerChar={6}
          tileColor="#0d0f12"
          textColor="#F2EFE6"
          tileRadius={6}
          gap={3}
          fontSize={28}
          loop={true}
          loopFrom={1}
          padTo={8}
        />
        <p className="fn-board-tagline mt-2">Your semester, on schedule.</p>
        <div className="fn-board-divider mx-auto mt-4" />
      </div>

      <p className="fn-board-eyebrow">Welcome back</p>
      <p className="fn-board-tagline mt-1">Continue your semester.</p>
      <div className="fn-board-divider mt-3" />

      <div className="mt-5 flex flex-col gap-3">
        <button type="button" className="fn-board-oauth-btn">
          <GoogleIcon className="h-5 w-5" />
          Continue with Google
        </button>
        <button type="button" className="fn-board-oauth-btn">
          <AppleIcon className="h-5 w-5" />
          Continue with Apple
        </button>
      </div>

      <div className="fn-board-caption my-7 flex items-center gap-4 tracking-wider uppercase">
        <span className="h-px flex-1 bg-[var(--board-hairline)]" />
        Or use email
        <span className="h-px flex-1 bg-[var(--board-hairline)]" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="fn-board-label">Email address</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            className="fn-board-input"
          />
        </label>

        <label className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="fn-board-label">Password</span>
            <Link href="/forgot-password" className="fn-board-link fn-board-label">
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
              className="fn-board-input pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="fn-board-icon-btn absolute top-1/2 right-3 -translate-y-1/2"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              <EyeIcon open={showPassword} className="h-5 w-5" />
            </button>
          </div>
        </label>

        {error && (
          <p role="alert" className="text-sm text-[var(--board-signal)]">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className="fn-board-btn-primary">
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-[var(--board-steel)]">
        New to Semestra?{" "}
        <Link href="/register" className="fn-board-link">
          Create an account
        </Link>
      </p>
    </div>
  );
}
