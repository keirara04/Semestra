"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError, apiFetch } from "@/lib/api";
import type { DeepWorkWindow, User } from "@/lib/types";

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

  const [aiBudget, setAiBudget] = useState<{ remaining: number; limit: number } | null>(null);
  const [aiSaving, setAiSaving] = useState(false);

  useEffect(() => {
    if (user.ai_syllabus_extraction_consent_at) {
      apiFetch<{ remaining: number; limit: number }>("/api/ai/usage").then(setAiBudget);
    }
  }, [user.ai_syllabus_extraction_consent_at]);

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
    <main className="bg-[var(--fn-paper)] min-h-dvh w-full px-8 py-10 md:px-12">
      <p className="fn-eyebrow">Settings</p>
      <h1 className="mt-1 text-2xl font-semibold">Preferences</h1>

      <form onSubmit={handleSave} className="mt-8 flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <p className="fn-eyebrow">Planning</p>
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
        </section>

        <section className="flex flex-col gap-4 border-t border-[var(--fn-rule)] pt-6">
          <p className="fn-eyebrow">Academic</p>
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
        </section>

        <section className="flex flex-col gap-4 border-t border-[var(--fn-rule)] pt-6">
          <p className="fn-eyebrow">Notifications</p>
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
        </section>

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

      <section className="mt-10 flex flex-col gap-3 border-t border-[var(--fn-rule)] pt-6">
        <p className="fn-eyebrow">AI</p>
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
      </section>

      <section className="mt-10 flex flex-col gap-3 border-t border-[var(--fn-rule)] pt-6">
        <p className="fn-eyebrow">Data</p>

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
      </section>
    </main>
  );
}
