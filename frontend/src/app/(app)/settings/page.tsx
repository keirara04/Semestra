// Preferences — see "Settings" in mdfile/DESIGN.md. Profile fields
// (timezone, max study hours, deep-work windows, quiet hours, grade
// scale) already exist on the user record from Phase 0; this screen to
// edit them isn't built yet.
export default function SettingsPage() {
  return (
    <main className="fn-sheet mx-auto min-h-dvh max-w-2xl px-6 py-10">
      <p className="fn-eyebrow">Settings</p>
      <p className="mt-3 text-sm text-[var(--fn-muted)]">
        Not built yet — profile fields exist on your account but there&apos;s no edit screen.
      </p>
    </main>
  );
}
