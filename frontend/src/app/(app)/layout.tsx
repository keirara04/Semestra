import type { ReactNode } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";

// Route group (app)/ has no URL segment of its own, so there's no single
// concrete path to type this layout against — plain ReactNode children,
// unlike the root layout's LayoutProps<"/">.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AppShell>{children}</AppShell>
    </RequireAuth>
  );
}
