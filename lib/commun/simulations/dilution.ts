// Préparer une solution (fiche 9). Dilution : C_mère × V_mère = C_fille × V_fille. Dissolution : n = m / M = C × V.
// mode 0 : choisir le volume de solution mère à prélever ; mode 1 : choisir le volume de la fiole jaugée ;
// mode 2 : choisir la masse de solide à dissoudre.
// Les volumes sont en millilitres, les concentrations en mol/L, les masses en grammes.
import { nombre } from "@/lib/commun/format";
import type { Regles, Valeurs } from "./types";

/** Les instants de la préparation, en secondes : prélever, verser dans la fiole, compléter à l'eau, comparer. */
export const PREPARATION = { preleve: 2, verse: 3.5, complete: 5.5, fin: 7 };

/** La concentration de la solution préparée, en mol/L. */
export const concentrationPreparee = (p: Valeurs): number => (p.mode === 2 ? p.m / p.M / (p.Vfille / 1000) : (p.Cmere * p.V) / p.Vfille);
/** Une concentration avec son unité : en mmol/L quand l'énoncé compte en millimoles, en mol/L sinon. */
export const concentrationEcrite = (p: Valeurs, c: number): string => (p.milli ? `${nombre(c * 1000, 2)} mmol/L` : `${nombre(c, 3)} mol/L`);

export const reglesDilution: Regles = {
  issue(p) {
    const c = concentrationPreparee(p);
    if (Math.abs(c - p.cible) <= p.tol * p.cible) return { reussi: true, message: `Ta solution est à ${concentrationEcrite(p, c)} : c'est la concentration voulue.` };
    return { reussi: false, message: `Ta solution est à ${concentrationEcrite(p, c)} au lieu de ${concentrationEcrite(p, p.cible)} : elle est trop ${c > p.cible ? "concentrée" : "diluée"}.` };
  },
  duree: () => PREPARATION.fin,
  cadence: () => 1,
  // la préparation est montrée en quelques secondes : l'allure de l'animation ne veut rien dire
  secondes: () => null,
  mesures(p, t) {
    const obtenue = { nom: "C obtenue", valeur: t >= PREPARATION.complete ? concentrationEcrite(p, concentrationPreparee(p)) : "…" };
    if (p.mode === 2) return [{ nom: "m", valeur: `${nombre(p.m, 2)} g` }, { nom: "n", valeur: `${nombre((1000 * p.m) / p.M, 2)} mmol` }, obtenue];
    return [{ nom: "V prélevé", valeur: `${nombre(p.V, 1)} mL` }, { nom: "V fiole", valeur: `${nombre(p.Vfille, 1)} mL` }, obtenue];
  },
};
