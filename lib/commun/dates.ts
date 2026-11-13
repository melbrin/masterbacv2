// Jours civils à l'heure de Paris. Un jour s'écrit AAAA-MM-JJ.
// Aucune fonction ne lit l'horloge : l'instant est toujours passé en argument.

const FORMAT_PARIS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Le jour civil à Paris pour un instant donné. */
export function jourDeParis(instant: Date): string {
  return FORMAT_PARIS.format(instant);
}

function versUTC(jour: string): number {
  const [a, m, j] = jour.split("-").map(Number);
  return Date.UTC(a, m - 1, j);
}

/** Nombre entier de jours civils de a à b (b - a), sans effet du changement d'heure. */
export function ecartEnJours(a: string, b: string): number {
  return Math.round((versUTC(b) - versUTC(a)) / 86_400_000);
}

/** Le jour situé n jours après (ou avant, si n est négatif). */
export function ajouteJours(jour: string, n: number): string {
  const d = new Date(versUTC(jour));
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Jour de la semaine : 0 pour dimanche, 6 pour samedi. */
export function jourDeSemaine(jour: string): number {
  return new Date(versUTC(jour)).getUTCDay();
}

/** Premier jour des épreuves de spécialité du bac 2027. */
export const JOUR_DU_BAC = "2027-06-16";

/** Jours restants avant le bac, jamais négatif. */
export function joursAvantLeBac(instant: Date): number {
  return Math.max(0, ecartEnJours(jourDeParis(instant), JOUR_DU_BAC));
}
