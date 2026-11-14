// La spectrophotométrie (fiche 10). Loi de Beer-Lambert : A = k × C, pour une solution diluée.
// mode 0 : choisir la concentration de la solution ; mode 1 : choisir la concentration d'une solution mère, diluée F fois
// avant la mesure ; mode 2 : choisir le volume de solution mère à prélever pour une fiole jaugée.
// Les concentrations sont en mmol/L, k en L/mmol, les volumes en millilitres.
import { nombre } from "@/lib/commun/format";
import type { Regles, Valeurs } from "./types";

/** Les instants de la mesure, en secondes : la lampe s'allume, puis l'affichage se stabilise. */
export const MESURE_SPECTRO = { lampe: 1, stable: 3.5, fin: 5 };

/** La concentration de la solution dans la cuve, en mmol/L. */
export function concentrationCuve(p: Valeurs): number {
  if (p.mode === 1) return p.Cmere / p.F;
  if (p.mode === 2) return (p.Cmere * p.V) / p.Vfille;
  return p.C;
}
/** L'absorbance de la solution dans la cuve. */
export const absorbance = (p: Valeurs): number => p.k * concentrationCuve(p);
/** L'absorbance affichée à l'instant t : zéro tant que la lampe est éteinte, puis l'affichage monte et se stabilise. */
export function absorbanceAffichee(p: Valeurs, t: number): number {
  const k = Math.max(0, Math.min(1, (t - MESURE_SPECTRO.lampe) / (MESURE_SPECTRO.stable - MESURE_SPECTRO.lampe)));
  return absorbance(p) * (1 - (1 - k) ** 3);
}

export const reglesBeer: Regles = {
  issue(p) {
    const A = absorbance(p);
    if (Math.abs(A - p.cible) <= p.tol) return { reussi: true, message: `Le spectrophotomètre affiche A = ${nombre(A, 2)} : c'est l'absorbance voulue.` };
    return { reussi: false, message: `Le spectrophotomètre affiche A = ${nombre(A, 2)} au lieu de ${nombre(p.cible, 2)} : la solution est trop ${A > p.cible ? "concentrée" : "diluée"}.` };
  },
  duree: () => MESURE_SPECTRO.fin,
  cadence: () => 1,
  secondes: () => null,
  mesures(p, t) {
    return [{ nom: "C cuve", valeur: `${nombre(concentrationCuve(p), 2)} mmol/L` }, { nom: "A", valeur: nombre(absorbanceAffichee(p, t), 2) }, { nom: "A visée", valeur: nombre(p.cible, 2) }];
  },
};
