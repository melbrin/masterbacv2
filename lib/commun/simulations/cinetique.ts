// La cinétique d'ordre 1 (fiche 11) : [A](t) = [A]_0 × e^(−k × t), et t_1/2 = ln 2 / k.
// L'élève choisit la date où il arrête la réaction, ou la constante de vitesse pour une date fixée par l'énoncé.
// Le temps est compté dans l'unité du défi : secondes (unite 0) ou minutes (unite 1).
import { nombre } from "@/lib/commun/format";
import type { Regles, Valeurs } from "./types";

const UNITES = [{ nom: "s", secondes: 1 }, { nom: "min", secondes: 60 }];
const unite = (p: Valeurs) => UNITES[p.unite] ?? UNITES[0];

/** La part du réactif qui reste à l'instant t, entre 0 et 1. */
export const partRestante = (p: Valeurs, t: number): number => Math.exp(-p.k * Math.max(0, t));
/** L'instant où la réaction est arrêtée : celui que l'élève choisit, ou celui que l'énoncé fixe. */
export const instantArret = (p: Valeurs): number => (Number.isFinite(p.dateFixe) ? p.dateFixe : p.date);
/** Une durée dans l'unité du défi : « 30,1 s », « 46,1 min ». */
export const tempsEcrit = (p: Valeurs, t: number): string => `${nombre(t, 1)} ${unite(p).nom}`;

const pourcent = (x: number) => `${nombre(100 * x, 1)} %`;
const duree = (p: Valeurs): number => 1.15 * instantArret(p);

export const reglesCinetique: Regles = {
  issue(p) {
    const f = partRestante(p, instantArret(p));
    const quand = `${Number.isFinite(p.dateFixe) ? "En" : "Après"} ${tempsEcrit(p, instantArret(p))}`;
    if (Math.abs(f - p.cible) <= p.tol) return { reussi: true, message: `${quand}, il reste ${pourcent(f)} du réactif : c'est la valeur attendue.` };
    if (Number.isFinite(p.dateFixe)) return { reussi: false, message: `${quand}, il reste ${pourcent(f)} du réactif au lieu de ${pourcent(p.cible)} : la réaction est trop ${f > p.cible ? "lente" : "rapide"}.` };
    return { reussi: false, message: f > p.cible ? `${quand}, il reste encore ${pourcent(f)} du réactif. Il en faut ${pourcent(p.cible)} : c'est trop tôt.` : `${quand}, il ne reste que ${pourcent(f)} du réactif. Il en fallait ${pourcent(p.cible)} : c'est trop tard.` };
  },
  duree,
  cadence: (p) => duree(p) / 6,
  secondes: (p) => unite(p).secondes,
  mesures(p, t) {
    return [{ nom: "t", valeur: tempsEcrit(p, t) }, { nom: "reste", valeur: pourcent(partRestante(p, t)) }, { nom: "visé", valeur: pourcent(p.cible) }];
  },
};
