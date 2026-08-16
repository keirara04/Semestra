export interface DeepWorkWindow {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

export interface QuietHours {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

export interface User {
  id: number;
  name: string;
  email: string;
  pending_email: string | null;
  email_verified_at: string | null;
  timezone: string;
  max_study_hours_per_day: number;
  deep_work_windows: DeepWorkWindow[] | null;
  quiet_hours: QuietHours | null;
  grade_scale: string;
  ai_syllabus_extraction_consent_at: string | null;
}

export interface Semester {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
}

export interface AcademicCalendarException {
  id: number;
  semester_id: number;
  label: string;
  start_date: string; // "Y-m-d"
  end_date: string; // "Y-m-d", inclusive
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

export type ClassSessionType = "lecture" | "tutorial" | "lab" | "exam";

export interface ClassSession {
  id: number;
  course_id: number;
  type: ClassSessionType;
  day_of_week: number; // 0 = Sunday .. 6 = Saturday
  start_time: string; // "HH:MM:SS"
  end_time: string;
  location: string | null;
  description: string | null;
  remind_minutes_before: number | null;
  remind_recurring: boolean;
}

export interface ParsedTimetableSubject {
  title: string;
  professor: string | null;
  day_of_week: number; // 0 = Sunday .. 6 = Saturday
  start_time: string; // "HH:MM"
  end_time: string;
  location: string | null;
}

export type TimetableImportStatus = "pending" | "confirmed" | "discarded";

export interface TimetableImport {
  id: number;
  semester_id: number;
  source_url: string;
  status: TimetableImportStatus;
  payload: ParsedTimetableSubject[];
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
  type: "lecture" | "commitment" | "study" | "external";
  status: "suggested" | "accepted" | "moved" | "skipped" | "done";
  title: string | null;
  location: string | null;
  description: string | null;
  remind_at: string | null;
  start_at: string;
  end_at: string;
  recurrence_group_id: number | null;
  recurrence_day_of_week: number | null;
  recurrence_until: string | null;
  source: "google" | null;
  external_id: string | null;
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

export type MaterialType = "slide" | "pdf" | "reading" | "recording" | "link";

export interface Material {
  id: number;
  course_id: number;
  type: MaterialType;
  title: string;
  disk: string;
  path: string | null;
  url: string | null;
  week: number | null;
  mime_type: string | null;
  size_bytes: number | null;
  file_url: string | null;
}

export type NoteType = "general" | "exam" | "concept" | "question" | "formula";

export interface MaterialNote {
  id: number;
  material_id: number;
  page_number: number | null;
  title: string | null;
  content: string;
  note_type: NoteType;
}

export interface UserMaterialState {
  material_id: number;
  last_opened_at: string | null;
  last_page: number | null;
  zoom: string | number | null;
}

export type AnnotationType = "drawing" | "highlight" | "text";

export interface AnnotationData {
  points?: [number, number][];
  stroke_width?: number;
  color?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  opacity?: number;
  text?: string;
  font_size?: number;
}

export interface Annotation {
  id: string;
  material_id: number;
  page_number: number;
  type: AnnotationType;
  data: AnnotationData;
  updated_at?: string;
}

import type { Confidence } from "@/components/Confidence";

export interface Topic {
  id: number;
  course_id: number;
  title: string;
  confidence: Confidence;
  review_stage: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  missed_decay_applied_at: string | null;
  assessments?: Assessment[];
  materials?: Material[];
}

export interface ExamReadiness {
  readiness_percent: number | null;
  target_minutes_remaining: number;
  suggested_pace_minutes_per_day: number | null;
  days_remaining: number;
  topics: { id: number; title: string; confidence: Confidence }[];
}

export type WeekRisk = "comfortable" | "busy" | "at_risk" | "critical";

export interface WeeklyReview {
  id: number;
  week_start_date: string;
  planned_minutes: number;
  completed_minutes: number;
  cause_breakdown: Record<string, number> | null;
  next_week_risk: WeekRisk;
}

export type CandidateConfidence = "low" | "medium" | "high";

export interface AssessmentCandidate {
  title: string;
  type: AssessmentType;
  due_date: string | null;
  source_fragment: string;
  confidence: CandidateConfidence;
}

export interface TaskCandidate {
  title: string;
  estimated_minutes: number | null;
  source_fragment: string;
  confidence: CandidateConfidence;
}

export type SyllabusDraftStatus = "pending" | "confirmed" | "discarded";

export interface SyllabusDraft {
  id: number;
  course_id: number;
  material_id: number | null;
  status: SyllabusDraftStatus;
  candidates: {
    assessments: AssessmentCandidate[];
    tasks: TaskCandidate[];
  };
  model: string | null;
  applied_at: string | null;
}
