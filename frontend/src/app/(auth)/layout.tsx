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
  { gate: "01", name: "Courses", status: "ON TIME" },
  { gate: "02", name: "Assessments", status: "DUE SOON" },
  { gate: "03", name: "Available time", status: "TRACKED" },
  { gate: "04", name: "Weekly review", status: "READY" },
];

const ROW_BASE_DELAY = 500;
const ROW_STAGGER = 90;

// Route group (auth)/ has no URL segment of its own, so it uses plain ReactNode
// children, same reasoning as (app)/layout.tsx.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${dmSans.variable} ${ibmPlexMono.variable} fn-board`}>
      <div className="grid min-h-dvh w-full grid-cols-1 lg:grid-cols-2">
        {/* Left panel: the board itself. Wordmark resolves, then the
            gate list clacks in below it — one signature, not a widget
            bolted onto an unrelated background. */}
        <div className="fn-board-fascia relative hidden flex-col lg:flex">
          <div className="fn-board-rivets" />
          <div className="flex flex-1 flex-col justify-center px-12 py-12 xl:px-20">
            <SplitFlapText
              words={["        ", "SEMESTRA"]}
              flipDuration={0.12}
              stagger={0.05}
              cycleDelay={300}
              charset="alpha"
              flipsPerChar={6}
              tileColor="#0d0f12"
              textColor="#F2EFE6"
              tileRadius={8}
              gap={5}
              fontSize={48}
              loop={false}
              padTo={8}
            />
            <p className="fn-board-eyebrow mt-4">Your semester, on schedule</p>

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
              <p className="fn-board-caption mt-8">
                Board early. Nothing&rsquo;s worse than a missed deadline.
              </p>
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
