// Le registre des règles du labo. Les scènes dessinées sont dans components/simulations/scenes/,
// les simulations et leurs défis dans lib/serveur/contenu/defis.ts.
import { reglesBasket } from "./basket";
import { reglesDoppler } from "./doppler";
import { reglesLargage } from "./largage";
import { reglesRadio } from "./radio";
import { reglesRc } from "./rc";
import { reglesSatellite } from "./satellite";
import { reglesTemperature } from "./temperature";
import { reglesTitrage } from "./titrage";
import type { Defi, Regles, Valeurs } from "./types";

export * from "./types";

/** Les règles de chaque simulation, par identifiant. */
const REGLES: Record<string, Regles> = {
  basket: reglesBasket, largage: reglesLargage, satellite: reglesSatellite, temperature: reglesTemperature,
  doppler: reglesDoppler, rc: reglesRc, titrage: reglesTitrage, radio: reglesRadio,
};
export const ID_SIMULATIONS = Object.keys(REGLES);
export const regles = (id: string): Regles | null => (Object.hasOwn(REGLES, id) ? REGLES[id] : null);

/**
 * Lit les valeurs saisies pour un défi : chaque champ doit être un nombre dans ses bornes.
 * Renvoie les grandeurs complètes (celles de l'énoncé et celles de l'élève), ou le premier champ refusé.
 */
export function grandeurs(d: Pick<Defi, "fixes" | "champs">, saisies: Valeurs): { ok: true; p: Valeurs } | { ok: false; champ: string } {
  const p: Valeurs = { ...d.fixes };
  for (const c of d.champs) {
    const v = saisies[c.id];
    if (typeof v !== "number" || !Number.isFinite(v) || v < c.min || v > c.max) return { ok: false, champ: c.id };
    p[c.id] = v;
  }
  return { ok: true, p };
}

/** Le nombre de décimales d'un pas de saisie : 2 pour un pas de 0,01, 0 pour un pas de 1. */
export const decimalesDuPas = (pas: number): number => Math.max(0, Math.min(4, Math.round(-Math.log10(pas))));

/**
 * La clé d'une notion du tableau « À connaître par cœur » : son texte avant toute formule, sans casse ni apostrophe courbe.
 * Elle relie le rappel d'un défi (« Charge sous $E$ ») à la ligne de la fiche, dont le nom contient une formule déjà rendue.
 */
export const cleNotion = (texte: string): string =>
  texte.replace(/<[\s\S]*$/, "").replace(/\$[\s\S]*$/, "").replace(/[’']/g, "'").replace(/\s+/g, " ").trim().toLowerCase();
