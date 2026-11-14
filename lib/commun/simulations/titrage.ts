// Le titrage (fiche 10). Réaction a A + b B → … : à l'équivalence, n_A / a = n_B,E / b,
// donc V_E = (b / a) × C_A × V_A / C_B. A est l'espèce titrée, dans l'erlenmeyer ; B est l'espèce titrante, dans la burette.
// L'élève choisit le volume à verser, ou la concentration de la solution titrante pour un volume versé fixé par l'énoncé.
// Ici les volumes sont en millilitres, les concentrations en mol/L, les quantités de matière en millimoles.
import { nombre } from "@/lib/commun/format";
import type { Regles, Valeurs } from "./types";

/** Le volume versé à l'équivalence, en mL. */
export const volumeEquivalent = (p: Valeurs): number => ((p.b / p.a) * p.CA * p.VA) / p.CB;
/** Le volume versé en tout : celui que l'élève choisit, ou celui que l'énoncé fixe. */
export const volumeVerse = (p: Valeurs): number => (Number.isFinite(p.Vfixe) ? p.Vfixe : p.V);
/** Le volume déjà versé à l'instant t, en mL : dans la simulation, la burette coule d'un millilitre par seconde. */
export const verse = (p: Valeurs, t: number): number => Math.max(0, Math.min(t, volumeVerse(p)));
/** La quantité de l'espèce titrée qui n'a pas encore réagi, en mmol. */
export const restant = (p: Valeurs, t: number): number => Math.max(0, p.CA * p.VA - (p.a / p.b) * p.CB * verse(p, t));

const ml = (x: number) => `${nombre(x, 1)} mL`;
const duree = (p: Valeurs): number => volumeVerse(p) + 2;

export const reglesTitrage: Regles = {
  issue(p) {
    const VE = volumeEquivalent(p);
    const V = volumeVerse(p);
    if (Number.isFinite(p.Vfixe)) {
      if (Math.abs(VE - V) <= p.tol) return { reussi: true, message: `La solution change de couleur à ${ml(VE)} : la concentration est la bonne.` };
      return { reussi: false, message: VE > V ? `À ${ml(V)}, la solution n'a pas encore changé de couleur : la solution titrante est trop diluée.` : `La solution change de couleur dès ${ml(VE)} au lieu de ${ml(V)} : la solution titrante est trop concentrée.` };
    }
    if (Math.abs(V - VE) <= p.tol) return { reussi: true, message: `La solution change de couleur à la dernière goutte, à ${ml(V)} : c'est le volume équivalent.` };
    return { reussi: false, message: V < VE ? `La solution n'a pas changé de couleur : il manque ${ml(VE - V)} pour atteindre l'équivalence.` : `La solution a changé de couleur dès ${ml(VE)} : tu as dépassé l'équivalence de ${ml(V - VE)}.` };
  },
  duree,
  cadence: (p) => duree(p) / 6,
  // le débit de la burette est choisi pour l'écran : l'allure de l'animation ne veut rien dire
  secondes: () => null,
  mesures(p, t) {
    const V = verse(p, t);
    return [{ nom: "V versé", valeur: ml(V) }, { nom: "n versé", valeur: `${nombre(p.CB * V, 2)} mmol` }, { nom: "n restant", valeur: `${nombre(restant(p, t), 2)} mmol` }];
  },
};
