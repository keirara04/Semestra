export interface DeepWorkWindow {
  start: string; // "H:i"
  end: string;
}

export interface QuietHours {
  start: string; // "H:i"
  end: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  timezone: string;
  max_study_hours_per_day: number;
  deep_work_windows: DeepWorkWindow[] | null;
  quiet_hours: QuietHours | null;
  grade_scale: string;
}

export interface Semester {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
}

export interface Course {
  id: number;
  semester_id: number;
  title: string;
  code: string | null;
  colour: string;
  instructor: string | null;
  credits: number | null;
  grade_target: string | null;
}

export interface ExamReadiness {
  readiness_percent: number | null;
  target_minutes_remaining: number;
  suggested_pace_minutes_per_day: number | null;
  days_remaining: number;
  topics: { id: number; title: string; confidence: Topic["confidence"] }[];
}

export interface Topic {
  id: number;
  course_id: number;
  title: string;
  confidence: "not_started" | "learning" | "comfortable" | "confident";
  last_reviewed_at: string | null;
  next_review_at: string | null;
  assessments?: { id: number; title: string }[];
  materials?: { id: number; title: string }[];
}

export type MaterialType = "slide" | "pdf" | "reading" | "recording" | "link";

export interface Material {
  id: number;
  course_id: number;
  type: MaterialType;
  title: string;
  disk: string | null;
  path: string | null;
  url: string | null;
  file_url: string | null;
  week: number | null;
  mime_type: string | null;
  size_bytes: number | null;
  assessments?: { id: number; title: string }[];
}

export type ClassSessionType = "lecture" | "tutorial" | "lab" | "exam";

export interface ClassSession {
  id: number;
  course_id: number;
  type: ClassSessionType;
  day_of_week: number; // 0 = Sunday .. 6 = Saturday
  start_time: string; // "HH:MM:SS"
  end_time: string;
  location: string | null;
}

export type AssessmentType =
  | "report"
  | "quiz"
  | "lab"
  | "project"
  | "participation"
  | "midterm"
  | "final"
  | "exam"
  | "other";

export type AssessmentStatus = "not_started" | "in_progress" | "blocked" | "done";

export interface Assessment {
  id: number;
  course_id: number;
  grade_item_id: number | null;
  type: AssessmentType;
  title: string;
  due_at: string;
  status: AssessmentStatus;
  submission_url: string | null;
  estimated_minutes: number | null;
  group_members: string[] | null;
  links: string[] | null;
  notes: string | null;
  remaining_minutes?: number;
  milestones?: Milestone[];
  tasks?: Task[];
}

export interface Milestone {
  id: number;
  assessment_id: number;
  title: string;
  estimate_minutes: number | null;
  done: boolean;
  order: number;
  tasks?: Task[];
}

export type TaskStatus = "open" | "done" | "skipped";

export interface CalendarBlock {
  id: number;
  task_id: number | null;
  type: "lecture" | "commitment" | "study";
  status: "suggested" | "accepted" | "moved" | "skipped" | "done";
  title: string | null;
  start_at: string;
  end_at: string;
}

export type StudySessionStatus = "running" | "paused" | "ended";
export type StudySessionOutcome =
  | "completed"
  | "partial"
  | "blocked"
  | "longer_than_estimated"
  | "easier_than_estimated";

export interface StudySession {
  id: number;
  calendar_block_id: number;
  planned_minutes: number;
  actual_minutes: number | null;
  status: StudySessionStatus;
  started_at: string;
  outcome: StudySessionOutcome | null;
  notes: string | null;
  blocker: string | null;
}

export interface TodayClass {
  id: number;
  course_id: number;
  course_title: string;
  course_colour: string;
  type: ClassSessionType;
  start_time: string;
  end_time: string;
  location: string | null;
}

export interface TodayAssessment {
  id: number;
  title: string;
  due_at: string;
  status: AssessmentStatus;
  course_title: string;
  course_colour: string;
}

export interface TodayTask {
  id: number;
  title: string;
  due_at: string | null;
  estimated_minutes: number | null;
  remaining_estimate_minutes: number | null;
  course_title: string;
  course_colour: string;
  score: number;
  reasons: string[];
}

export interface Today {
  date: string;
  name: string;
  classes_today: TodayClass[];
  assessments_due_soon: TodayAssessment[];
  tasks: TodayTask[];
  ranking_is_basic: boolean;
  calendar_blocks_today: CalendarBlock[];
  planned_minutes_today: number;
  capacity: DayCapacity;
}

export interface GradeItem {
  id: number;
  course_id: number;
  grade_category_id: number | null;
  name: string;
  weighting: number;
  max_score: number;
  achieved_score: number | null;
  pass_hurdle_percent: number | null;
}

export interface PassHurdle {
  item_name: string;
  required_percent: number;
  achieved_percent: number | null;
  passed: boolean;
}

export interface GradeReport {
  current_standing: number | null;
  completed_weight: number;
  total_weight: number;
  weights_normalized: boolean;
  ungraded_weight_percent: number;
  best_case: number | null;
  conservative: number | null;
  expected: number | null;
  needed_average: number | null;
  pass_hurdles: PassHurdle[];
}

export interface DayCapacity {
  date: string; // "Y-m-d"
  day_of_week: number;
  is_break: boolean;
  lecture_minutes: number;
  commitment_minutes: number;
  available_minutes: number;
  recommended_study_minutes: number;
}

export interface Task {
  id: number;
  course_id: number;
  assessment_id: number | null;
  milestone_id: number | null;
  title: string;
  estimated_minutes: number | null;
  remaining_estimate_minutes: number | null;
  status: TaskStatus;
  due_at: string | null;
}

export interface WeeklyReview {
  id: number;
  week_start_date: string;
  planned_minutes: number;
  completed_minutes: number;
  cause_breakdown: Record<string, number> | null;
  next_week_risk: "comfortable" | "busy" | "at_risk" | "critical";
  created_at: string;
}
