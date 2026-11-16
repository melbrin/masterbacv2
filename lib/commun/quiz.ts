// Correction des cinq types de questions de quiz. Pur : la couche serveur lui passe la clé de correction,
// qui ne quitte jamais le serveur avant la réponse de l'élève.

export type TypeQuiz = "qcm" | "vrai_faux" | "trou" | "association" | "ordre";
export interface Correction { c?: number; reponse?: boolean | string; acceptees?: string[]; paires?: { left: string; right: string }[]; ordre?: string[] }
export type Reponse =
  | { type: "qcm"; choix: number }
  | { type: "vrai_faux"; valeur: boolean }
  | { type: "trou"; texte: string }
  | { type: "association"; droites: string[] }
  | { type: "ordre"; elements: string[] };

const HAUTS = "⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺";
const BAS = "₀₁₂₃₄₅₆₇₈₉";
const PLATS = "0123456789-+";

/**
 * Compare sans tenir compte de la casse, des accents, des espaces, des signes « · », « . », « * » et « × », ni de la
 * façon d'écrire un exposant ou un indice : « 10⁻¹⁴ », « 10^-14 » et « 10^(-14) » se valent, comme « f'₂ » et « f'2 ».
 */
export const norme = (s: string): string =>
  [...s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/−/g, "-")]
    .map((c) => (HAUTS.includes(c) ? PLATS[HAUTS.indexOf(c)] : BAS.includes(c) ? PLATS[BAS.indexOf(c)] : c)).join("")
    .replace(/[\s·.*×^()]/g, "");

/** Écrit en exposant les chiffres et les signes d'un texte : « -14 » devient « ⁻¹⁴ ». Le reste ne change pas. */
export const enExposant = (s: string): string => [...s.replace(/−/g, "-")].map((c) => (PLATS.includes(c) ? HAUTS[PLATS.indexOf(c)] : c)).join("");

/**
 * Ce que le champ d'une réponse à trou affiche quand l'élève tape un caractère à la fin : après « ^ », ou tant que
 * l'exposant est en cours, les chiffres et les signes montent en exposant, comme sur une copie. Tout autre caractère
 * termine l'exposant. Rend le nouveau texte et dit si l'exposant continue.
 */
export function saisieDeTrou(avant: string, apres: string, exposant: boolean): { texte: string; exposant: boolean } {
  // seule une frappe en fin de texte est transformée : une correction au milieu, un collage ou un effacement passent tels quels
  if (apres.length !== avant.length + 1 || !apres.startsWith(avant)) return { texte: apres.replace(/\^/g, ""), exposant: exposant && apres.length > 0 && apres.startsWith(avant) };
  const c = apres.slice(-1);
  if (c === "^") return { texte: avant, exposant: true };
  if (exposant && (PLATS.includes(c) || c === "−")) return { texte: avant + enExposant(c), exposant: true };
  return { texte: apres, exposant: false };
}

export interface Verdict { juste: boolean; bonneReponse: string }

export function corrige(type: TypeQuiz, choix: string[] | undefined, c: Correction, r: Reponse): Verdict {
  if (r.type !== type) return { juste: false, bonneReponse: "" };
  if (r.type === "qcm") {
    const bonne = choix?.[c.c ?? -1] ?? "";
    return { juste: choix?.[r.choix] !== undefined && r.choix === c.c, bonneReponse: bonne };
  }
  if (r.type === "vrai_faux") return { juste: r.valeur === c.reponse, bonneReponse: c.reponse ? "Vrai" : "Faux" };
  if (r.type === "trou") {
    const attendues = [String(c.reponse ?? ""), ...(c.acceptees ?? [])].filter(Boolean);
    const v = norme(r.texte);
    return { juste: v.length > 0 && attendues.some((a) => norme(a) === v), bonneReponse: String(c.reponse ?? "") };
  }
  if (r.type === "association") {
    const paires = c.paires ?? [];
    return {
      juste: paires.length > 0 && r.droites.length === paires.length && paires.every((p, i) => r.droites[i] === p.right),
      bonneReponse: paires.map((p) => `${p.left} avec ${p.right}`).join(" ; "),
    };
  }
  const ordre = c.ordre ?? [];
  return { juste: ordre.length > 0 && r.elements.length === ordre.length && ordre.every((e, i) => r.elements[i] === e), bonneReponse: ordre.join(", puis ") };
}
