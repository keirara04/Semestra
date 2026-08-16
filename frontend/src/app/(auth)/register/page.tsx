"use client";

import { useState, type SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { AppleIcon, EyeIcon, GoogleIcon } from "@/components/auth/icons";

const STEPS = [
  { gate: "01", label: "Identity" },
  { gate: "02", label: "Security" },
  { gate: "03", label: "Review" },
] as const;

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function goNext() {
    if (step === 0) {
      if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError("Enter your name and a valid email to continue.");
        return;
      }
    }
    if (step === 1) {
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (password !== passwordConfirmation) {
        setError("Passwords don't match.");
        return;
      }
    }
    setError(null);
    setStep((value) => Math.min(value + 1, STEPS.length - 1));
  }

  function goBack() {
    setError(null);
    setStep((value) => Math.max(value - 1, 0));
  }

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
    <div className="fn-board-page-in">
      <p className="fn-board-eyebrow">Create your semester</p>
      <p className="fn-board-tagline mt-1">Set up in a couple of minutes.</p>
      <div className="fn-board-divider mt-3" />

      <div className="fn-board-steps mt-6">
        {STEPS.map((item, index) => (
          <div
            key={item.gate}
            className="fn-board-step"
            data-state={index < step ? "complete" : index === step ? "current" : "upcoming"}
          >
            <div className="fn-board-step-track">
              <div className="fn-board-step-fill" />
            </div>
            <span className="fn-board-step-label">
              {item.gate} &middot; {item.label}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-5">
        {step === 0 && (
          <div key="step-0" className="fn-board-page-in flex flex-col gap-5">
            <div className="flex flex-col gap-3">
              <button type="button" className="fn-board-oauth-btn">
                <GoogleIcon className="h-5 w-5" />
                Continue with Google
              </button>
              <button type="button" className="fn-board-oauth-btn">
                <AppleIcon className="h-5 w-5" />
                Continue with Apple
              </button>
            </div>

            <div className="fn-board-caption flex items-center gap-4 tracking-wider uppercase">
              <span className="h-px flex-1 bg-[var(--board-hairline)]" />
              Or use email
              <span className="h-px flex-1 bg-[var(--board-hairline)]" />
            </div>

            <label className="flex flex-col gap-2">
              <span className="fn-board-label">Name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                className="fn-board-input"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="fn-board-label">Email address</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="fn-board-input"
              />
            </label>
          </div>
        )}

        {step === 1 && (
          <div key="step-1" className="fn-board-page-in flex flex-col gap-5">
            <label className="flex flex-col gap-2">
              <span className="fn-board-label">Create password</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
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

            <label className="flex flex-col gap-2">
              <span className="fn-board-label">Confirm password</span>
              <input
                type={showPassword ? "text" : "password"}
                value={passwordConfirmation}
                onChange={(event) => setPasswordConfirmation(event.target.value)}
                autoComplete="new-password"
                className="fn-board-input"
              />
            </label>
          </div>
        )}

        {step === 2 && (
          <div key="step-2" className="fn-board-page-in flex flex-col gap-4">
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between border-b border-[var(--board-hairline)] pb-2">
                <span className="fn-board-label">Name</span>
                <span className="text-[var(--board-chalk)]">{name}</span>
              </div>
              <div className="flex items-center justify-between border-b border-[var(--board-hairline)] pb-2">
                <span className="fn-board-label">Email</span>
                <span className="text-[var(--board-chalk)]">{email}</span>
              </div>
            </div>
            <p className="text-sm text-[var(--board-steel)]">
              Ready to create your account? You can still{" "}
              <button type="button" onClick={() => setStep(0)} className="fn-board-link">
                edit your details
              </button>
              .
            </p>
          </div>
        )}

        {error && (
          <p key={error} role="alert" className="fn-board-error-in text-sm text-[var(--board-signal)]">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          {step > 0 && (
            <button type="button" onClick={goBack} className="fn-board-oauth-btn flex-1">
              Back
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button key="continue" type="button" onClick={goNext} className="fn-board-btn-primary flex-1">
              Continue
            </button>
          ) : (
            <button
              key="submit"
              type="submit"
              disabled={submitting}
              className="fn-board-btn-primary fn-board-btn-label flex-1"
            >
              <span key={submitting ? "loading" : "idle"}>
                {submitting ? "Creating account…" : "Create account"}
              </span>
            </button>
          )}
        </div>
      </form>

      <p className="mt-6 text-sm text-[var(--board-steel)]">
        Already have an account?{" "}
        <Link href="/login" className="fn-board-link">
          Sign in
        </Link>
      </p>
    </div>
  );
}
