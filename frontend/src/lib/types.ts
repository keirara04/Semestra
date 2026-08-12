export interface User {
  id: number;
  name: string;
  email: string;
  timezone: string;
  max_study_hours_per_day: number;
  deep_work_windows: unknown | null;
  quiet_hours: unknown | null;
  grade_scale: string;
}
