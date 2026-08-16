import type { ReactNode } from "react";
import { DM_Sans, IBM_Plex_Mono } from "next/font/google";
import SplitFlapText from "@/components/SplitFlapText";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
});

// Semestra's four real surfaces, read as legs on a departures board.
// No fabricated per-user counts ("3 DUE") — this is a marketing panel
// shown before sign-in, so status words stay generic, not pretend-live.
const legs = [
  { gate: "01", name: "Courses", status: "ORGANIZED" },
  { gate: "02", name: "Deadlines", status: "TRACKED" },
  { gate: "03", name: "Study time", status: "PLANNED" },
  { gate: "04", name: "Weekly review", status: "READY" },
];

const ROW_BASE_DELAY = 500;
const ROW_STAGGER = 90;

// Route group (auth)/ has no URL segment of its own, so it uses plain ReactNode
// children, same reasoning as (app)/layout.tsx.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${dmSans.variable} ${ibmPlexMono.variable} fn-board`}>
      <div className="grid min-h-dvh w-full grid-cols-1 lg:grid-cols-[56fr_44fr]">
        {/* Left panel: the board itself. Wordmark resolves, then the
            gate list clacks in below it — one signature, not a widget
            bolted onto an unrelated background. */}
        <div className="fn-board-fascia relative hidden flex-col lg:flex">
          <div className="fn-board-rivets" />
          <span className="fn-board-regmark" style={{ top: "1.75rem", left: "1.75rem" }} />
          <span className="fn-board-regmark" style={{ top: "1.75rem", right: "1.75rem" }} />
          <span className="fn-board-regmark" style={{ bottom: "1.75rem", left: "1.75rem" }} />
          <span className="fn-board-regmark" style={{ bottom: "1.75rem", right: "1.75rem" }} />

          <div className="flex flex-1 flex-col justify-center px-12 py-12 xl:px-20">
            <p className="fn-board-eyebrow fn-board-eyebrow-accent">Semestra &middot; Student Copilot</p>

            <div className="mt-3">
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
                tileRadius={8}
                gap={5}
                fontSize={48}
                loop={true}
                loopFrom={1}
                padTo={8}
              />
            </div>
            <p className="fn-board-tagline mt-2">Not another planner. Your actual semester. In your hands.</p>

            <div className="mt-14">
              <div className="fn-board-divider mb-6" />
              <div>
                {legs.map((leg, index) => (
                  <div
                    key={leg.gate}
                    className="fn-board-row"
                    style={{ "--row-delay": `${ROW_BASE_DELAY + index * ROW_STAGGER}ms` } as React.CSSProperties}
                  >
                    <span className="fn-board-gate">{leg.gate}</span>
                    <span className="fn-board-leg">{leg.name}</span>
                    <span className="fn-board-status">{leg.status}</span>
                  </div>
                ))}
              </div>
              <div className="fn-board-caption mt-8 flex items-baseline justify-between">
                <span>Plan early. Miss nothing.</span>
                <span className="text-[var(--board-steel-dim)]">SMST &middot; REG</span>
              </div>
            </div>
          </div>
          <div className="fn-board-rivets" />
        </div>

        {/* Right panel: the actual form, per-page */}
        <div className="fn-board-panel flex flex-col justify-center px-6 py-14 sm:px-12 lg:px-16 xl:px-20">
          <div className="mx-auto w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
