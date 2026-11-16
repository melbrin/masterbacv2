// Ce que l'application dit d'une panne. Vers le navigateur : un message en français et un numéro de suivi, jamais une
// trace ni le message d'origine (docs/03-securite.md). Le numéro est celui que Next.js écrit aussi dans le journal du
// serveur : il permet de retrouver la panne sans rien montrer d'elle à l'élève.

/** Le numéro de suivi d'une erreur venue du serveur, ou null si elle n'en porte pas. */
export function numeroDeSuivi(erreur: unknown): string | null {
  if (!(erreur instanceof Error)) return null;
  const numero = (erreur as { digest?: unknown }).digest;
  // un numéro court, fait de lettres et de chiffres : rien d'autre ne s'affiche
  return typeof numero === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(numero) ? numero : null;
}
