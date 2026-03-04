export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function getDaysUntilBAC(): number {
  const bacDate = new Date("2026-06-16");
  const now = new Date();
  return Math.max(0, Math.ceil((bacDate.getTime() - now.getTime()) / 86400000));
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
