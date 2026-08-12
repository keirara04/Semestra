"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AppleIcon, EyeIcon, GoogleIcon } from "@/components/auth/icons";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <p className="fn-eyebrow">Create your semester</p>
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
          <span className="fn-label">Name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            autoComplete="name"
            className="fn-input"
          />
        </label>

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
          <span className="fn-label">Create password</span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="new-password"
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

        <label className="flex flex-col gap-2">
          <span className="fn-label">Confirm password</span>
          <input
            type={showPassword ? "text" : "password"}
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            required
            autoComplete="new-password"
            className="fn-input"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-[var(--fn-oxide)]">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting} className="fn-btn-primary">
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-[var(--fn-muted)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--fn-cobalt)] underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  );
}
