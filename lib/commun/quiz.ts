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

/** Compare sans tenir compte de la casse, des accents, des espaces ni des signes « · », « . », « * » et « × ». */
export const norme = (s: string): string => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\s·.*×]/g, "");

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
