// Les graduations des figures du hub Python (components/python/Graphe.tsx) : des valeurs rondes, écrites à la française.

export type Intervalle = [number, number];
const EXPOSANTS: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };

/** Des graduations rondes : 1, 2, 2,5 ou 5 fois une puissance de dix, environ n sur l'intervalle. */
export function graduations([a, b]: Intervalle, n: number): { valeurs: number[]; pas: number } {
  const brut = (b - a) / Math.max(1, n);
  const p = 10 ** Math.floor(Math.log10(brut));
  const r = brut / p;
  const pas = (r < 1.5 ? 1 : r < 2.25 ? 2 : r < 3.5 ? 2.5 : r < 7.5 ? 5 : 10) * p;
  const valeurs: number[] = [];
  for (let k = Math.ceil(a / pas - 1e-9); k * pas <= b + pas * 1e-9 && valeurs.length < 40; k += 1) valeurs.push(Math.abs(k * pas) < pas * 1e-9 ? 0 : k * pas);
  return { valeurs, pas };
}

/** Une graduation écrite à la française : virgule décimale, et puissance de dix pour les très grands et très petits nombres. */
export function ecrisNombre(v: number, pas: number): string {
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (abs >= 1e5 || abs < 1e-3) {
    const e = Math.floor(Math.log10(abs) + 1e-12);
    const m = v / 10 ** e;
    const mantisse = Math.abs(m - Math.round(m)) < 1e-9 ? String(Math.round(m)) : m.toFixed(2).replace(/0+$/, "");
    const puissance = String(e).split("").map((c) => EXPOSANTS[c] ?? c).join("");
    return `${mantisse === "1" ? "" : `${mantisse.replace(".", ",").replace("-", "−")}×`}10${puissance}`;
  }
  const ordre = Math.floor(Math.log10(pas) + 1e-9);
  const demi = String(Number((pas / 10 ** ordre).toPrecision(3))).includes(".");
  const decimales = Math.min(6, Math.max(0, -ordre + (demi ? 1 : 0)));
  const texte = v.toFixed(decimales);
  // une valeur qui s'arrondit à zéro s'écrit 0, jamais −0
  return Number(texte) === 0 ? "0" : texte.replace(".", ",").replace("-", "−");
}
