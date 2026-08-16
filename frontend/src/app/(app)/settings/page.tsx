"use client";

import { Suspense, useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Bot, CalendarDays, Clock, GraduationCap, KeyRound, TriangleAlert, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ApiError, apiFetch, API_URL } from "@/lib/api";
import { qk } from "@/lib/query-keys";
import type { DeepWorkWindow, User } from "@/lib/types";

// Each preference group reads as its own ledger card (border + faint
// canvas fill, same language courses/deliverable rows already use) with
// a small line icon next to its eyebrow — replaces the old flat
// border-t-divided list, which gave every section (Planning, Academic,
// AI, danger-zone delete) equal visual weight regardless of how
// different they actually are.
function SettingsSection({
  icon: Icon,
  title,
  danger,
  children,
}: {
  icon: typeof Clock;
  title: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={
        danger
          ? "flex flex-col gap-4 rounded-lg border border-[var(--fn-oxide)]/30 bg-[var(--fn-oxide)]/[0.04] p-5"
          : "flex flex-col gap-4 rounded-lg border border-[var(--fn-rule)] bg-[var(--fn-canvas)]/40 p-5"
      }
    >
      <p className="fn-eyebrow flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5" strokeWidth={2} />
        {title}
      </p>
      {children}
    </section>
  );
}

interface PromoSlide {
  src: string;
  label: string;
  href: string;
}

// Sourced from src/components/promobanner/ (pre-made asset pack, see its
// README) — only the ones with a real, built, reachable destination in
// this app made the cut. Dropped: exam-readiness and workload-forecast
// (no standalone page — both live inside /semester already, so either
// would just duplicate the semester-map slide's link) and course-balance
// (its natural destination, /insights, is a literal "not built yet"
// stub — linking there would be a dead promise).
const PROMO_SLIDES: PromoSlide[] = [
  { src: "/promobanner/semester-map.svg", label: "Open the semester map", href: "/semester" },
  { src: "/promobanner/deadline-radar.svg", label: "See deadlines across courses", href: "/courses" },
  { src: "/promobanner/focus-windows.svg", label: "Start a focus session", href: "/focus" },
  { src: "/promobanner/weekly-review.svg", label: "Open your weekly review", href: "/review" },
  { src: "/promobanner/notestra-activity.svg", label: "Open Notestra", href: "/notestra" },
];

const PROMO_INTERVAL_MS = 6000;

// Full-width strip anchoring the bottom of the page, auto-rotating
// through the real asset pack above. Each slide is a Link, not a
// decorative image with a fake-looking CTA baked into the artwork — the
// button drawn in the SVG only reads as real if clicking it actually
// goes somewhere.
function PromoBanner() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((current) => (current + 1) % PROMO_SLIDES.length), PROMO_INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused]);

  const slide = PROMO_SLIDES[index];

  return (
    <div
      className="mx-auto mt-8 w-full max-w-5xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-label="About Semestra"
    >
      <Link
        href={slide.href}
        className="block overflow-hidden rounded-xl border border-[var(--fn-rule)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--fn-cobalt)]"
      >
        {/* Each SVG is a self-contained 1600x360 designed slide (bg,
            headline, CTA pill, illustration) — plain img, not next/image,
            since it's vector and needs no optimisation. */}
        <img src={slide.src} alt={slide.label} width={1600} height={360} className="h-auto w-full" />
      </Link>
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {PROMO_SLIDES.map((item, i) => (
          <button
            key={item.href}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Show slide ${i + 1}: ${item.label}`}
            aria-current={i === index}
            className={`h-1.5 rounded-full transition-all duration-200 ${
              i === index ? "w-5 bg-[var(--fn-ink)]" : "w-1.5 bg-[var(--fn-rule)] hover:bg-[var(--fn-muted)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// Settings, see "Settings" in mdfile/DESIGN.md. Only fields that exist
// and are actually read by something are editable here: deep-work windows
// feed Placement's block-anchor time, max study hours/day and timezone
// feed the capacity engine, grade scale feeds GPA display. Quiet hours
// are stored but not yet enforced: there's no notification system to
// honor them yet (Automation release).
export default function SettingsPage() {
  const { user, updateProfile, deleteAccount, setAiConsent } = useAuth();

  if (!user) return null;

  return (
    <SettingsForm
      user={user}
      updateProfile={updateProfile}
      deleteAccount={deleteAccount}
      setAiConsent={setAiConsent}
    />
  );
}

function SettingsForm({
  user,
  updateProfile,
  deleteAccount,
  setAiConsent,
}: {
  user: User;
  updateProfile: (input: Partial<User>) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  setAiConsent: (enabled: boolean) => Promise<void>;
}) {
  const router = useRouter();

  const [name, setName] = useState(user.name);
  const [timezone, setTimezone] = useState(user.timezone);
  const [maxStudyHours, setMaxStudyHours] = useState(String(user.max_study_hours_per_day));
  const [gradeScale, setGradeScale] = useState(user.grade_scale);
  const [deepWorkWindows, setDeepWorkWindows] = useState<DeepWorkWindow[]>(
    user.deep_work_windows ?? [],
  );
  const [quietStart, setQuietStart] = useState(user.quiet_hours?.start ?? "");
  const [quietEnd, setQuietEnd] = useState(user.quiet_hours?.end ?? "");

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [deletePassword, setDeletePassword] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: aiBudget = null } = useQuery({
    queryKey: qk.aiUsage,
    queryFn: () => apiFetch<{ remaining: number; limit: number }>("/api/ai/usage"),
    enabled: !!user.ai_syllabus_extraction_consent_at,
  });
  const [aiSaving, setAiSaving] = useState(false);

  async function toggleAiConsent(enabled: boolean) {
    setAiSaving(true);
    try {
      await setAiConsent(enabled);
    } finally {
      setAiSaving(false);
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await updateProfile({
        name,
        timezone,
        max_study_hours_per_day: Number(maxStudyHours) || 1,
        grade_scale: gradeScale,
        deep_work_windows: deepWorkWindows.length > 0 ? deepWorkWindows : null,
        quiet_hours: quietStart && quietEnd ? { start: quietStart, end: quietEnd } : null,
      });
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  function addWindow() {
    setDeepWorkWindows((current) => [...current, { start: "14:00", end: "17:00" }]);
  }

  function updateWindow(index: number, field: "start" | "end", value: string) {
    setDeepWorkWindows((current) =>
      current.map((window, i) => (i === index ? { ...window, [field]: value } : window)),
    );
  }

  function removeWindow(index: number) {
    setDeepWorkWindows((current) => current.filter((_, i) => i !== index));
  }

  async function handleDelete(event: FormEvent) {
    event.preventDefault();
    setDeleteError(null);
    setDeleting(true);
    try {
      await deleteAccount(deletePassword);
      router.push("/login");
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="bg-[var(--fn-canvas)] min-h-dvh w-full px-4 py-10 sm:px-8 md:px-12">
      {/* Card reads as a floating panel (border + shadow + rounded,
          centered against a slightly recessed canvas background) rather
          than the previous full-bleed left-aligned page — "modal" in
          treatment, not an overlay dialog, since this is still its own
          route, not something opened on top of another page. */}
      <div className="mx-auto w-full max-w-5xl rounded-xl border border-[var(--fn-rule)] bg-[var(--fn-paper)] px-6 py-8 shadow-sm sm:px-10">
      <p className="fn-eyebrow">Settings</p>
      <h1 className="mt-1 text-2xl font-semibold">Preferences</h1>

      <form onSubmit={handleSave} className="mt-8 flex flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-x-10">
        <div className="flex flex-col gap-6">
        <SettingsSection icon={UserRound} title="Account">
          <label className="flex flex-col gap-1.5">
            <span className="fn-label">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="fn-input max-w-sm"
            />
          </label>
        </SettingsSection>

        <SettingsSection icon={Clock} title="Planning">
          <label className="flex flex-col gap-1.5">
            <span className="fn-label">Max study hours per day</span>
            <input
              type="number"
              min={1}
              max={24}
              step={1}
              list="max-study-hours-suggestions"
              value={maxStudyHours}
              onChange={(event) => setMaxStudyHours(event.target.value)}
              className="fn-input w-32"
            />
            <datalist id="max-study-hours-suggestions">
              <option value={2} />
              <option value={4} />
              <option value={6} />
              <option value={8} />
              <option value={10} />
              <option value={12} />
            </datalist>
          </label>

          <div className="flex flex-col gap-2">
            <span className="fn-label">Deep-work windows</span>
            <p className="text-xs text-[var(--fn-muted)]">
              Soft preference: Replan anchors the first suggested block of each day here.
            </p>
            {deepWorkWindows.map((window, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="time"
                  value={window.start}
                  onChange={(event) => updateWindow(index, "start", event.target.value)}
                  className="fn-input w-auto py-1.5"
                />
                <span className="text-sm text-[var(--fn-muted)]">to</span>
                <input
                  type="time"
                  value={window.end}
                  onChange={(event) => updateWindow(index, "end", event.target.value)}
                  className="fn-input w-auto py-1.5"
                />
                <button
                  type="button"
                  onClick={() => removeWindow(index)}
                  className="text-sm text-[var(--fn-oxide)] underline underline-offset-2"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addWindow}
              className="w-fit text-sm text-[var(--fn-cobalt)] underline underline-offset-2"
            >
              Add window
            </button>
          </div>
        </SettingsSection>
        </div>

        <div className="flex flex-col gap-6">
        <SettingsSection icon={GraduationCap} title="Academic">
          <label className="flex flex-col gap-1.5">
            <span className="fn-label">Timezone</span>
            <input
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className="fn-input"
              placeholder="America/New_York"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="fn-label">Grade scale</span>
            <input
              value={gradeScale}
              onChange={(event) => setGradeScale(event.target.value)}
              className="fn-input w-32"
              placeholder="4.0"
            />
          </label>
        </SettingsSection>

        <SettingsSection icon={Bell} title="Notifications">
          <div className="flex items-center gap-2">
            <label className="flex flex-col gap-1.5">
              <span className="fn-label">Quiet hours start</span>
              <input
                type="time"
                value={quietStart}
                onChange={(event) => setQuietStart(event.target.value)}
                className="fn-input w-auto py-1.5"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="fn-label">Quiet hours end</span>
              <input
                type="time"
                value={quietEnd}
                onChange={(event) => setQuietEnd(event.target.value)}
                className="fn-input w-auto py-1.5"
              />
            </label>
          </div>
          <p className="text-xs text-[var(--fn-muted)]">
            Reminder emails are delayed until quiet hours end.
          </p>
        </SettingsSection>
        </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-[var(--fn-oxide)]">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving} className="fn-btn-primary !w-fit px-4">
            {saving ? "Saving…" : "Save changes"}
          </button>
          {savedAt && !saving && (
            <span className="text-sm text-[var(--fn-muted)]">Saved.</span>
          )}
        </div>
      </form>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:gap-x-10">
      <div className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <SecuritySection user={user} />
      </Suspense>

      <SettingsSection icon={Bot} title="AI">
        <p className="text-xs text-[var(--fn-muted)]">
          Off by default. When enabled, a syllabus you paste or upload is sent to an AI provider
          to draft candidate assessments and tasks. Nothing is saved until you review and
          confirm each one.
        </p>
        <label className="flex w-fit items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!user.ai_syllabus_extraction_consent_at}
            disabled={aiSaving}
            onChange={(event) => toggleAiConsent(event.target.checked)}
          />
          Allow syllabus extraction
        </label>
        {user.ai_syllabus_extraction_consent_at && aiBudget && (
          <p className="fn-mono text-xs text-[var(--fn-muted)]">
            {aiBudget.remaining} of {aiBudget.limit} extractions left today.
          </p>
        )}
      </SettingsSection>
      </div>

      <div className="flex flex-col gap-6">
      <Suspense fallback={null}>
        <GoogleCalendarSection />
      </Suspense>

      <SettingsSection icon={TriangleAlert} title="Data" danger>
        {!confirmingDelete ? (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="w-fit rounded-md border border-[var(--fn-oxide)] px-4 py-2 text-sm text-[var(--fn-oxide)]"
          >
            Delete account
          </button>
        ) : (
          <form onSubmit={handleDelete} className="flex flex-col gap-3">
            <p className="text-sm text-[var(--fn-oxide)]">
              This permanently deletes your account and everything in it: courses, assessments,
              grades, study history. This can&apos;t be undone.
            </p>
            <label className="flex flex-col gap-1.5">
              <span className="fn-label">Confirm your password</span>
              <input
                type="password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                required
                className="fn-input max-w-xs"
              />
            </label>
            {deleteError && (
              <p role="alert" className="text-sm text-[var(--fn-oxide)]">
                {deleteError}
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={deleting}
                className="w-fit rounded-md bg-[var(--fn-oxide)] px-4 py-2 text-sm font-semibold text-white"
              >
                {deleting ? "Deleting…" : "Permanently delete account"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmingDelete(false);
                  setDeletePassword("");
                  setDeleteError(null);
                }}
                className="rounded-md border border-[var(--fn-rule)] px-4 py-2 text-sm hover:bg-[var(--fn-canvas)]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </SettingsSection>
      </div>
      </div>
      </div>

      <PromoBanner />
    </main>
  );
}

// Email and password live outside the main preferences <form> above —
// HTML forbids nested forms, and both need their own submit + a
// current-password field that shouldn't sit permanently on screen (same
// reveal-then-submit shape as the delete-account block). Email changes
// write pending_email only; the visible address never updates here until
// the link mailed to the new one is clicked, so the "pending" state below
// is what makes that legible rather than looking like nothing happened.
function SecuritySection({ user }: { user: User }) {
  const { updateEmail, cancelPendingEmail, updatePassword, resendVerificationEmail } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  // Same lazy-initializer + router.replace pattern GoogleCalendarSection
  // uses for its own callback param, so this survives exactly one render
  // before the URL is cleaned up.
  const [callbackResult] = useState(() => searchParams.get("email"));

  useEffect(() => {
    if (!callbackResult) return;
    router.replace("/settings");
  }, [callbackResult, router]);

  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  function fieldError(err: unknown, ...fields: string[]): string {
    if (err instanceof ApiError) {
      for (const field of fields) {
        const message = err.errors?.[field]?.[0];
        if (message) return message;
      }
      return err.message;
    }
    return "Something went wrong.";
  }

  async function handleChangeEmail(event: FormEvent) {
    event.preventDefault();
    setEmailError(null);
    setEmailSaving(true);
    try {
      await updateEmail(newEmail, emailPassword);
      setChangingEmail(false);
      setNewEmail("");
      setEmailPassword("");
    } catch (err) {
      setEmailError(fieldError(err, "email", "current_password"));
    } finally {
      setEmailSaving(false);
    }
  }

  async function handleCancelPendingEmail() {
    setCancelling(true);
    try {
      await cancelPendingEmail();
    } finally {
      setCancelling(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setResent(false);
    try {
      await resendVerificationEmail();
      setResent(true);
    } finally {
      setResending(false);
    }
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSaving(true);
    try {
      await updatePassword(currentPassword, newPassword, newPasswordConfirmation);
      setChangingPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirmation("");
      setPasswordSaved(true);
    } catch (err) {
      setPasswordError(fieldError(err, "current_password", "password"));
    } finally {
      setPasswordSaving(false);
    }
  }

  const isVerified = user.email_verified_at !== null;

  return (
    <SettingsSection icon={KeyRound} title="Security">
      {callbackResult === "verified" && (
        <p className="text-sm text-[var(--fn-sage)]">Email confirmed.</p>
      )}
      {callbackResult === "expired" && (
        <p className="text-sm text-[var(--fn-oxide)]">That link expired — request a new one below.</p>
      )}
      {callbackResult === "invalid" && (
        <p className="text-sm text-[var(--fn-oxide)]">That link isn&apos;t valid anymore.</p>
      )}
      {callbackResult === "taken" && (
        <p className="text-sm text-[var(--fn-oxide)]">
          That address was taken by another account before you confirmed.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="fn-label">Email</span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">{user.email}</span>
          {!isVerified && (
            <span className="fn-mono rounded px-1.5 py-0.5 text-[10px] tracking-wide text-[var(--fn-oxide)]">
              Unverified
            </span>
          )}
        </div>

        {user.pending_email ? (
          <div className="mt-1 flex flex-col gap-1.5 rounded-md border border-dashed border-[var(--fn-rule)] p-3">
            <p className="text-sm text-[var(--fn-muted)]">
              Waiting on confirmation at <span className="font-medium text-[var(--fn-ink)]">{user.pending_email}</span>.
              Your current address stays active until you confirm.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-sm text-[var(--fn-cobalt)] underline underline-offset-2"
              >
                {resending ? "Sending…" : resent ? "Sent." : "Resend"}
              </button>
              <button
                type="button"
                onClick={handleCancelPendingEmail}
                disabled={cancelling}
                className="text-sm text-[var(--fn-oxide)] underline underline-offset-2"
              >
                {cancelling ? "Cancelling…" : "Cancel"}
              </button>
            </div>
          </div>
        ) : !changingEmail ? (
          <div className="mt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setChangingEmail(true)}
              className="w-fit text-sm text-[var(--fn-cobalt)] underline underline-offset-2"
            >
              Change email
            </button>
            {!isVerified && (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-sm text-[var(--fn-muted)] underline underline-offset-2"
              >
                {resending ? "Sending…" : resent ? "Sent." : "Resend verification"}
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleChangeEmail} className="mt-1 flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="fn-label">New email</span>
              <input
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                required
                className="fn-input max-w-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="fn-label">Current password</span>
              <input
                type="password"
                value={emailPassword}
                onChange={(event) => setEmailPassword(event.target.value)}
                required
                className="fn-input max-w-sm"
              />
            </label>
            {emailError && (
              <p role="alert" className="text-sm text-[var(--fn-oxide)]">
                {emailError}
              </p>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={emailSaving} className="fn-btn-primary !w-fit px-4">
                {emailSaving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setChangingEmail(false);
                  setNewEmail("");
                  setEmailPassword("");
                  setEmailError(null);
                }}
                className="rounded-md border border-[var(--fn-rule)] px-4 py-2 text-sm hover:bg-[var(--fn-canvas)]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-[var(--fn-rule)] pt-4">
        <span className="fn-label">Password</span>
        {!changingPassword ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--fn-muted)]">••••••••</span>
            <button
              type="button"
              onClick={() => {
                setChangingPassword(true);
                setPasswordSaved(false);
              }}
              className="text-sm text-[var(--fn-cobalt)] underline underline-offset-2"
            >
              Change password
            </button>
            {passwordSaved && <span className="text-sm text-[var(--fn-sage)]">Password updated.</span>}
          </div>
        ) : (
          <form onSubmit={handleChangePassword} className="mt-1 flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="fn-label">Current password</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                className="fn-input max-w-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="fn-label">New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                className="fn-input max-w-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="fn-label">Confirm new password</span>
              <input
                type="password"
                value={newPasswordConfirmation}
                onChange={(event) => setNewPasswordConfirmation(event.target.value)}
                required
                className="fn-input max-w-sm"
              />
            </label>
            {passwordError && (
              <p role="alert" className="text-sm text-[var(--fn-oxide)]">
                {passwordError}
              </p>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={passwordSaving} className="fn-btn-primary !w-fit px-4">
                {passwordSaving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setChangingPassword(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setNewPasswordConfirmation("");
                  setPasswordError(null);
                }}
                className="rounded-md border border-[var(--fn-rule)] px-4 py-2 text-sm hover:bg-[var(--fn-canvas)]"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </SettingsSection>
  );
}

// Calendar roadmap Phase 5: connect/disconnect Google Calendar two-way
// sync. /connect is a plain link (full-page navigation into the OAuth
// flow), not an apiFetch — see GoogleCalendarConnectController's docblock
// on the backend for why. The ?google_calendar= query param is how the
// callback reports back after the browser round-trips through Google.
function GoogleCalendarSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Shared qk.googleCalendarStatus key — Calendar's own page reads the
  // same endpoint (just a narrower slice of the same response shape).
  const { data: status } = useQuery({
    queryKey: qk.googleCalendarStatus,
    queryFn: () => apiFetch<{ connected: boolean; lastSyncedAt: string | null }>("/api/google-calendar/status"),
  });
  const connected = status?.connected ?? null;
  const lastSyncedAt = status?.lastSyncedAt ?? null;
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  // Captured once from the URL at mount (lazy initializer, not an effect
  // setState) — the callback route only ever puts this param on the very
  // first render after the OAuth round-trip, and it needs to survive the
  // router.replace() below stripping it back out of the URL.
  const [callbackResult] = useState(() => searchParams.get("google_calendar"));

  useEffect(() => {
    if (!callbackResult) return;
    router.replace("/settings");
    if (callbackResult === "connected") {
      queryClient.invalidateQueries({ queryKey: qk.googleCalendarStatus });
    }
  }, [callbackResult, router, queryClient]);

  async function syncNow() {
    setSyncing(true);
    try {
      await apiFetch("/api/google-calendar/sync", { method: "POST" });
      queryClient.invalidateQueries({ queryKey: qk.googleCalendarStatus });
    } finally {
      setSyncing(false);
    }
  }

  async function disconnect() {
    if (!window.confirm("Disconnect Google Calendar? Events synced in from Google will be removed from this calendar.")) return;
    setDisconnecting(true);
    try {
      await apiFetch("/api/google-calendar/disconnect", { method: "DELETE" });
      queryClient.setQueryData(qk.googleCalendarStatus, { connected: false, lastSyncedAt: null });
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <SettingsSection icon={CalendarDays} title="Google Calendar">
      <p className="text-xs text-[var(--fn-muted)]">
        Two-way sync with one Google Calendar: events from Google show up here, and study/commitment
        blocks you accept here show up in Google.
      </p>

      {callbackResult === "denied" && (
        <p className="text-sm text-[var(--fn-oxide)]">Connection cancelled — nothing changed.</p>
      )}
      {callbackResult === "no_refresh_token" && (
        <p className="text-sm text-[var(--fn-oxide)]">
          Google didn&apos;t grant lasting access — try connecting again.
        </p>
      )}
      {callbackResult === "error" && (
        <p className="text-sm text-[var(--fn-oxide)]">Something went wrong connecting — try again.</p>
      )}
      {callbackResult === "connected" && <p className="text-sm text-[var(--fn-sage)]">Connected.</p>}

      {connected === null ? null : connected ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-[var(--fn-muted)]">
            {lastSyncedAt
              ? `Last synced ${new Date(lastSyncedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
              : "Not synced yet"}
          </span>
          <button
            type="button"
            onClick={syncNow}
            disabled={syncing}
            className="rounded-md border border-[var(--fn-rule)] px-4 py-2 text-sm hover:bg-[var(--fn-canvas)]"
          >
            {syncing ? "Syncing…" : "Sync now"}
          </button>
          <button
            type="button"
            onClick={disconnect}
            disabled={disconnecting}
            className="text-sm text-[var(--fn-oxide)] underline underline-offset-2"
          >
            {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        </div>
      ) : (
        <a href={`${API_URL}/api/google-calendar/connect`} className="fn-btn-primary !w-fit px-4">
          Connect Google Calendar
        </a>
      )}
    </SettingsSection>
  );
}
