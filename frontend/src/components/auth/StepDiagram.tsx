// Miniature versions of the semester-map glyphs from mdfile/DESIGN.md —
// rectangle = workload bar, diamond = milestone, hatch = at-risk/blocked
// time. Reusing the product's own visual vocabulary here, not decoration:
// this is a preview of what Semestra actually looks like once populated.

const RULE = "#cdd0cf";
const COBALT = "#2857a0";
const OXIDE = "#ae4d40";

function Rule({ y }: { y: number }) {
  return <line x1="0" y1={y} x2="140" y2={y} stroke={RULE} strokeWidth="1" />;
}

export function CoursesDiagram() {
  return (
    <svg viewBox="0 0 140 44" fill="none" className="h-11 w-full max-w-[140px]">
      <Rule y={6} />
      <Rule y={22} />
      <Rule y={38} />
      <rect x="4" y="1" width="26" height="10" rx="2" fill="none" stroke={COBALT} strokeWidth="1.4" />
      <rect x="50" y="17" width="30" height="10" rx="2" fill="none" stroke={COBALT} strokeWidth="1.4" />
      <rect x="96" y="33" width="24" height="10" rx="2" fill="none" stroke={COBALT} strokeWidth="1.4" />
    </svg>
  );
}

export function AssessmentsDiagram() {
  return (
    <svg viewBox="0 0 140 44" fill="none" className="h-11 w-full max-w-[140px]">
      <Rule y={6} />
      <Rule y={22} />
      <Rule y={38} />
      <rect x="14" y="16" width="12" height="12" transform="rotate(45 20 22)" stroke={COBALT} strokeWidth="1.4" />
      <rect x="62" y="32" width="12" height="12" transform="rotate(45 68 38)" stroke={COBALT} strokeWidth="1.4" />
      <rect x="102" y="0" width="12" height="12" transform="rotate(45 108 6)" stroke={COBALT} strokeWidth="1.4" />
    </svg>
  );
}

export function AvailableTimeDiagram() {
  return (
    <svg viewBox="0 0 140 44" fill="none" className="h-11 w-full max-w-[140px]">
      <defs>
        <pattern id="fn-hatch" width="4" height="4" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="4" stroke={OXIDE} strokeWidth="1" />
        </pattern>
      </defs>
      <Rule y={6} />
      <Rule y={22} />
      <Rule y={38} />
      <rect x="4" y="1" width="30" height="10" rx="1" fill="url(#fn-hatch)" stroke={OXIDE} strokeWidth="1.2" />
      <rect x="70" y="33" width="34" height="10" rx="1" fill="url(#fn-hatch)" stroke={OXIDE} strokeWidth="1.2" />
    </svg>
  );
}
