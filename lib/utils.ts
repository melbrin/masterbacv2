import { joursAvantLeBac } from "@/lib/commun/dates";

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function getDaysUntilBAC(maintenant: Date = new Date()): number {
  return joursAvantLeBac(maintenant);
}
