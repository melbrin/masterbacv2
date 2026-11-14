// L'effet Doppler (fiche 6). Un émetteur qui s'approche à la vitesse v : f_R = f_E × c / (c − v), avec c la célérité du son.
import { nombre } from "@/lib/commun/format";
import type { Regles, Valeurs } from "./types";

/** La durée montrée, en secondes : le son met environ un tiers de seconde à parcourir la scène. */
export const DUREE_SCENE = 0.6;
/** L'intervalle entre deux fronts d'onde dessinés, en secondes. Les fronts réels sont bien plus serrés. */
export const PAS_FRONT = 0.05;
/** L'abscisse de l'auditeur, en mètres. */
export const AUDITEUR = 100;
/** L'abscisse où l'émetteur arrive à la fin de la scène, en mètres : il reste devant l'auditeur. */
const ARRIVEE = 40;

/** La vitesse de l'émetteur en m/s, qu'elle soit saisie en m/s ou en km/h. */
export const vitesse = (p: Valeurs): number => (Number.isFinite(p.vkmh) ? p.vkmh / 3.6 : p.v);
/** La fréquence reçue par l'auditeur, en hertz. */
export const frequenceRecue = (p: Valeurs): number => (p.fE * p.c) / (p.c - vitesse(p));
/** L'abscisse de l'émetteur à l'instant t, en mètres. */
export const positionEmetteur = (p: Valeurs, t: number): number => ARRIVEE - vitesse(p) * (DUREE_SCENE - t);
/** L'instant où le premier front d'onde, émis à t = 0, arrive à l'auditeur. */
export const arriveeDuSon = (p: Valeurs): number => (AUDITEUR - positionEmetteur(p, 0)) / p.c;

const hz = (x: number) => `${nombre(x, 1)} Hz`;

export const reglesDoppler: Regles = {
  issue(p) {
    const fR = frequenceRecue(p);
    if (Math.abs(fR - p.cible) <= p.tol) return { reussi: true, message: `On entend ${hz(fR)} : c'est la fréquence voulue.` };
    return { reussi: false, message: `On entend ${hz(fR)} au lieu de ${hz(p.cible)} : le son est trop ${fR < p.cible ? "grave" : "aigu"}.` };
  },
  duree: () => DUREE_SCENE,
  // au ralenti dix fois : six secondes à l'écran pour six dixièmes de seconde
  cadence: () => 0.1,
  mesures(p, t) {
    const entendu = t >= arriveeDuSon(p);
    return [
      { nom: "t", valeur: `${nombre(t * 1000, 0)} ms` }, { nom: "v", valeur: `${nombre(vitesse(p), 1)} m/s` },
      { nom: "f émise", valeur: hz(p.fE) }, { nom: "f reçue", valeur: entendu ? hz(frequenceRecue(p)) : "…" },
    ];
  },
};
