// La décroissance radioactive (fiche 11) : N(t) = N_0 × e^(−λt), avec t_1/2 = ln 2 / λ.
// Au bout de n demi-vies, il reste N_0 / 2ⁿ noyaux. L'activité suit la même loi : A = λ × N.
// L'élève choisit la date de la mesure, ou la demi-vie pour une date fixée par l'énoncé.
// Le temps est compté dans l'unité du défi : jours (unite 0), années (unite 1) ou heures (unite 2).
import { nombre } from "@/lib/commun/format";
import type { Regles, Valeurs } from "./types";

/** Le nombre de noyaux dessinés. */
export const NOYAUX = 100;
const UNITES = [{ nom: "j", secondes: 86400, decimales: 1 }, { nom: "ans", secondes: 365.25 * 86400, decimales: 0 }, { nom: "h", secondes: 3600, decimales: 1 }];
const unite = (p: Valeurs) => UNITES[p.unite] ?? UNITES[0];

/** La part des noyaux qui restent à l'instant t, entre 0 et 1. */
export const fraction = (p: Valeurs, t: number): number => Math.pow(2, -Math.max(0, t) / p.demiVie);
/** L'instant de la mesure : la date que l'élève choisit, ou celle que l'énoncé fixe. */
export const instantMesure = (p: Valeurs): number => (Number.isFinite(p.dateFixe) ? p.dateFixe : p.date);
/** L'instant où le noyau de rang i (de 0 à 99) se désintègre. Le dessin suit exactement la loi, sans hasard : à tout instant, il reste N_0 × e^(−λt) noyaux. */
export const desintegration = (p: Valeurs, i: number): number => (-Math.log((i + 0.5) / NOYAUX) / Math.LN2) * p.demiVie;
/** Une durée dans l'unité du défi : « 16,0 j », « 4 220 ans », « 24,0 h ». */
export const dureeEcrite = (p: Valeurs, t: number): string => `${nombre(t, unite(p).decimales)} ${unite(p).nom}`;

const pourcent = (x: number) => `${nombre(100 * x, 1)} %`;
const duree = (p: Valeurs): number => 1.12 * instantMesure(p);

export const reglesRadio: Regles = {
  issue(p) {
    const f = fraction(p, instantMesure(p));
    const quoi = p.activite ? "de l'activité" : "des noyaux";
    const quand = `${Number.isFinite(p.dateFixe) ? "En" : "Après"} ${dureeEcrite(p, instantMesure(p))}`;
    if (Math.abs(f - p.cible) <= p.tol) return { reussi: true, message: `${quand}, il reste ${pourcent(f)} ${quoi} : c'est la valeur attendue.` };
    if (Number.isFinite(p.dateFixe)) return { reussi: false, message: `${quand}, il reste ${pourcent(f)} ${quoi} au lieu de ${pourcent(p.cible)} : la demi-vie est trop ${f > p.cible ? "longue" : "courte"}.` };
    return { reussi: false, message: f > p.cible ? `${quand}, il reste encore ${pourcent(f)} ${quoi}. Il en faut ${pourcent(p.cible)} : c'est trop tôt.` : `${quand}, il ne reste que ${pourcent(f)} ${quoi}. Il en fallait ${pourcent(p.cible)} : c'est trop tard.` };
  },
  duree,
  cadence: (p) => duree(p) / 6,
  secondes: (p) => unite(p).secondes,
  mesures(p, t) {
    return [{ nom: "t", valeur: dureeEcrite(p, t) }, { nom: "reste", valeur: pourcent(fraction(p, t)) }, { nom: "visé", valeur: pourcent(p.cible) }];
  },
};
