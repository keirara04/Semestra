import type { ReactNode } from "react";
import { Caveat, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import { AvailableTimeDiagram, AssessmentsDiagram, CoursesDiagram } from "@/components/auth/StepDiagram";
import { BookIcon } from "@/components/auth/icons";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
});

const steps = [
  {
    number: "1",
    title: "Courses",
    description: "Start with your courses. Build a plan that fits real life.",
    diagram: CoursesDiagram,
  },
  {
    number: "2",
    title: "Assessments",
    description: "See what's due and when. Never miss what matters.",
    diagram: AssessmentsDiagram,
  },
  {
    number: "3",
    title: "Available time",
    description: "Protect your time. Plan around your life.",
    diagram: AvailableTimeDiagram,
  },
];

// Route group (auth)/ has no URL segment of its own — plain ReactNode
// children, same reasoning as (app)/layout.tsx.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${dmSans.variable} ${ibmPlexMono.variable} ${caveat.variable} fn`}>
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 lg:grid-cols-2">
        {/* Left panel — brand + the product's own semester-map vocabulary as a preview */}
        <div className="fn-sheet fn-margin relative hidden flex-col justify-between px-12 py-14 lg:flex xl:pl-24">
          <div>
            <div className="flex items-center gap-3">
              <BookIcon className="h-8 w-8 text-[var(--fn-ink)]" />
              <span className="text-4xl font-bold tracking-tight">Semestra</span>
            </div>
            <div className="fn-divider-accent mt-4" />
            <p className="mt-6 text-xl text-[var(--fn-ink)]">Your semester, in one view.</p>

            <ol className="mt-10 flex flex-col">
              {steps.map((step, index) => {
                const Diagram = step.diagram;
                const isLast = index === steps.length - 1;
                return (
                  <li key={step.number} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="fn-step-number">{step.number}</span>
                      {!isLast && <span className="fn-step-connector" />}
                    </div>
                    <div className="grid flex-1 grid-cols-[1fr_auto] items-start gap-4 pb-8">
                      <div>
                        <p className="fn-mono text-sm font-semibold tracking-wide uppercase">
                          {step.title}
                        </p>
                        <p className="mt-1 text-[15px] text-[var(--fn-muted)]">{step.description}</p>
                      </div>
                      <Diagram />
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div>
            <div className="fn-divider-accent" />
            <p className="fn-hand mt-3 text-2xl text-[var(--fn-cobalt)]">Your plan stays yours.</p>
          </div>
        </div>

        {/* Right panel — the actual form, per-page */}
        <div className="fn-sheet flex flex-col justify-center px-6 py-14 sm:px-12 lg:px-16 xl:px-20">
          <div className="mx-auto w-full max-w-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
