// La pile et l'électrolyse (fiche 12) : Q = n(e⁻) × F = I × Δt.
// mode 0 : une pile de capacité donnée ; choisir l'intensité pour qu'elle tienne la durée voulue.
// mode 1 : une pile dont le zinc est consommé ; choisir la masse de zinc pour qu'elle tienne la durée voulue.
// mode 2 : une électrolyse ; choisir sa durée pour déposer la masse de métal voulue.
// Les durées de calcul sont en secondes, les masses en grammes, les charges en coulombs.
import { nombre } from "@/lib/commun/format";
import type { Regles, Valeurs } from "./types";

/** La charge d'une mole d'électrons, en C/mol. */
export const FARADAY = 96500;

/** Le temps pendant lequel la pile peut débiter son courant, en secondes (modes 0 et 1). */
export const autonomie = (p: Valeurs): number => (p.mode === 0 ? (p.Q * 3600) / p.I : ((p.m / p.M) * p.z * FARADAY) / p.I);
/** La durée de l'électrolyse choisie par l'élève, en secondes (mode 2). */
export const dureeElectrolyse = (p: Valeurs): number => p.dureeMin * 60;
/** La masse de métal déposée après t secondes d'électrolyse, en grammes (mode 2). */
export const depot = (p: Valeurs, t: number): number => (p.I * Math.max(0, Math.min(t, dureeElectrolyse(p))) * p.M) / (p.z * FARADAY);
/** L'instant où le courant s'arrête, en secondes : la pile est vide, ou l'électrolyse est finie. */
export const arret = (p: Valeurs): number => (p.mode === 2 ? dureeElectrolyse(p) : autonomie(p));
/** La charge qui a circulé à l'instant t, en coulombs. */
export const charge = (p: Valeurs, t: number): number => p.I * Math.max(0, Math.min(t, arret(p)));

const heures = (s: number) => `${nombre(s / 3600, 2)} h`;
const grammes = (m: number) => `${nombre(m, 2)} g`;
/** La durée montrée : jusqu'à l'arrêt du courant, sans dépasser deux fois et demie la durée voulue pour une pile. */
function duree(p: Valeurs): number {
  if (p.mode === 2) return 1.06 * dureeElectrolyse(p);
  return 1.08 * Math.min(autonomie(p), 2.5 * p.dureeVisee * 3600);
}

export const reglesPile: Regles = {
  issue(p) {
    if (p.mode === 2) {
      const m = depot(p, dureeElectrolyse(p));
      if (Math.abs(m - p.masseVisee) <= p.tol * p.masseVisee) return { reussi: true, message: `Le dépôt pèse ${grammes(m)} : c'est la masse voulue.` };
      return { reussi: false, message: m < p.masseVisee ? `Le dépôt ne pèse que ${grammes(m)} au lieu de ${grammes(p.masseVisee)} : l'électrolyse est trop courte.` : `Le dépôt pèse ${grammes(m)} au lieu de ${grammes(p.masseVisee)} : l'électrolyse est trop longue.` };
    }
    const a = autonomie(p);
    const voulue = p.dureeVisee * 3600;
    if (Math.abs(a - voulue) <= p.tol * voulue) return { reussi: true, message: `La pile débite pendant ${heures(a)} : c'est la durée voulue.` };
    if (p.mode === 0) return { reussi: false, message: a < voulue ? `La pile est vide au bout de ${heures(a)} au lieu de ${heures(voulue)} : le courant est trop fort.` : `La pile tiendrait ${heures(a)} : la lampe pourrait recevoir plus de courant.` };
    return { reussi: false, message: a < voulue ? `Le zinc est épuisé au bout de ${heures(a)} au lieu de ${heures(voulue)} : il en faut plus.` : `La pile pourrait débiter ${heures(a)} : il y a plus de zinc qu'il n'en faut.` };
  },
  duree,
  cadence: (p) => duree(p) / 6,
  mesures(p, t) {
    const Q = { nom: "Q", valeur: `${nombre(charge(p, t), 0)} C` };
    if (p.mode === 2) return [{ nom: "t", valeur: `${nombre(Math.min(t, dureeElectrolyse(p)) / 60, 1)} min` }, Q, { nom: "dépôt", valeur: grammes(depot(p, t)) }];
    const fait = Math.min(t, autonomie(p));
    const reste = p.mode === 0 ? { nom: "reste", valeur: `${nombre(100 * (1 - fait / autonomie(p)), 0)} %` } : { nom: "zinc", valeur: grammes(p.m * (1 - fait / autonomie(p))) };
    return [{ nom: "t", valeur: heures(fait) }, Q, reste];
  },
};
