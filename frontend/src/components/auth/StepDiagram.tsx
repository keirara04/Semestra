// Miniature versions of the semester-map glyphs from public/semestra-pipeline.svg:
// rectangle = workload bar, diamond = milestone, hatch = at-risk/blocked
// time. Reusing the product's own visual vocabulary here, not decoration:
// this is a preview of what Semestra actually looks like once populated.
//
// Each shape draws itself in on mount (stroke traces the outline, then the
// fill settles), a small, single moment of motion, not a loop. Respects
// prefers-reduced-motion via the .fn-diagram rule in globals.css.

const COBALT = "#2857A0";
const VIEWBOX = "60 0 540 126";

const GRID = (
  <>
    <g strokeWidth="1.5" opacity=".32" strokeDasharray="3 5">
      <path d="M112 12V108M220 12V108M328 12V108M436 12V108M544 12V108" />
    </g>
    <g strokeWidth="1.75" opacity=".78">
      <path d="M84 27H580M84 54H580M84 81H580" />
    </g>
  </>
);

function delayStyle(index: number, base: number) {
  return { "--fn-delay": `${base + index * 140}ms` } as React.CSSProperties;
}

export function CoursesDiagram({ baseDelay = 0 }: { baseDelay?: number }) {
  return (
    <svg viewBox={VIEWBOX} fill="none" stroke={COBALT} strokeLinecap="square" className="fn-diagram h-16 w-full max-w-[220px]">
      {GRID}
      <g strokeWidth="3" fill="#F8F7F3" className="fn-draw">
        <rect pathLength={1} style={delayStyle(0, baseDelay)} x="157" y="39" width="92" height="24" rx="1" />
        <rect pathLength={1} style={delayStyle(1, baseDelay)} x="329" y="65" width="91" height="24" rx="1" />
        <rect pathLength={1} style={delayStyle(2, baseDelay)} x="465" y="91" width="88" height="24" rx="1" />
      </g>
    </svg>
  );
}

export function AssessmentsDiagram({ baseDelay = 0 }: { baseDelay?: number }) {
  return (
    <svg viewBox={VIEWBOX} fill="none" stroke={COBALT} strokeLinecap="square" className="fn-diagram h-16 w-full max-w-[220px]">
      {GRID}
      <g strokeWidth="3" fill="#F8F7F3" className="fn-draw">
        <path pathLength={1} style={delayStyle(0, baseDelay)} d="M181 54l10-10 10 10-10 10-10-10Z" />
        <path pathLength={1} style={delayStyle(1, baseDelay)} d="M382 80l10-10 10 10-10 10-10-10Z" />
        <path pathLength={1} style={delayStyle(2, baseDelay)} d="M516 106l10-10 10 10-10 10-10-10Z" />
      </g>
    </svg>
  );
}

export function AvailableTimeDiagram({ baseDelay = 0 }: { baseDelay?: number }) {
  return (
    <svg viewBox={VIEWBOX} fill="none" stroke={COBALT} strokeLinecap="square" className="fn-diagram h-16 w-full max-w-[220px]">
      <defs>
        <pattern id="fn-availability-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke={COBALT} strokeWidth="2" />
        </pattern>
      </defs>
      {GRID}
      <g strokeWidth="3" fill="url(#fn-availability-hatch)" className="fn-draw">
        <rect pathLength={1} style={delayStyle(0, baseDelay)} x="167" y="39" width="92" height="24" rx="1" />
        <rect pathLength={1} style={delayStyle(1, baseDelay)} x="413" y="65" width="89" height="24" rx="1" />
      </g>
    </svg>
  );
}
