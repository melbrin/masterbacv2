// Tirages reproductibles, repris à l'identique de reference/prototype/site/js/util.js,
// dépassements d'entiers sur 32 bits compris.

/** Mélange une liste avec un générateur congruentiel. Une graine nulle vaut 1. */
export function melange<T>(liste: readonly T[], graine = 1): T[] {
  const a = liste.slice();
  let s = graine >>> 0 || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Empreinte FNV-1a sur 32 bits du jour suivi d'un texte. */
export function graineDuJour(jour: string, extra = ""): number {
  let h = 2166136261;
  for (const c of jour + extra) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
