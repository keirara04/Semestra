export function formatMinutes(minutes: number | null | undefined): string {
  if (!minutes) return "0m";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return [hours ? `${hours}h` : null, mins ? `${mins}m` : null].filter(Boolean).join(" ");
}

export function daysUntil(dueAt: string): string {
  const days = Math.ceil((new Date(dueAt).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return "overdue";
  if (days === 0) return "due today";
  if (days === 1) return "due tomorrow";
  return `due in ${days}d`;
}
