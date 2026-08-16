// Single source of truth for query keys. Every useQuery/useMutation in the
// app imports from here rather than inlining ["courses"] locally — the
// whole point of the cache is that five components asking for the same
// resource share one entry, which only works if they all spell the key
// identically. Grouped by resource, each with a `.list()`/`.detail(id)`
// root so `invalidateQueries({ queryKey: qk.courses.all })` sweeps every
// variant (list, detail, nested) in one call after a mutation.

export const qk = {
  user: ["user"] as const,

  semesters: {
    all: ["semesters"] as const,
  },

  notifications: {
    all: ["notifications"] as const,
  },

  today: {
    all: ["today"] as const,
  },

  weeklyReview: {
    latest: ["weekly-review", "latest"] as const,
  },

  calendarCapacity: (from: string, to: string) => ["calendar-capacity", from, to] as const,

  calendarBlocks: {
    all: ["calendar-blocks"] as const,
  },

  calendarOccurrences: (from: string, to: string) => ["calendar-occurrences", from, to] as const,

  googleCalendarStatus: ["google-calendar-status"] as const,

  courses: {
    all: ["courses"] as const,
    detail: (id: number | string) => ["courses", String(id)] as const,
    grades: (id: number | string) => ["courses", String(id), "grades"] as const,
  },

  classSessions: {
    all: ["class-sessions"] as const,
  },

  assessments: {
    all: ["assessments"] as const,
    detail: (id: number | string) => ["assessments", String(id)] as const,
    readiness: (id: number | string) => ["assessments", String(id), "readiness"] as const,
  },

  gradeItems: {
    all: ["grade-items"] as const,
  },

  tasks: {
    all: ["tasks"] as const,
  },

  materials: {
    all: ["materials"] as const,
    detail: (id: number | string) => ["materials", String(id)] as const,
    viewUrl: (id: number | string) => ["materials", String(id), "view-url"] as const,
    annotations: (id: number | string) => ["materials", String(id), "annotations"] as const,
    notes: (id: number | string) => ["materials", String(id), "notes"] as const,
    state: (id: number | string) => ["materials", String(id), "state"] as const,
  },

  topics: {
    all: ["topics"] as const,
  },

  academicCalendarExceptions: {
    all: ["academic-calendar-exceptions"] as const,
  },

  aiUsage: ["ai-usage"] as const,
} as const;
