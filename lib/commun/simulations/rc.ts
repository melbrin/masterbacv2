// Le circuit RC (fiche 8). Charge sous E : u_C = E(1 − e^(−t/τ)) ; décharge depuis U_0 : u_C = U_0 e^(−t/τ) ; τ = RC.
// Un seuil U_s est atteint à t_s = τ ln(E/(E − U_s)) en charge, à t_s = τ ln(U_0/U_s) en décharge.
// Ici R est en kilo-ohm et C en microfarad : leur produit est en millisecondes.
import { nombre, nombreRelatif } from "@/lib/commun/format";
import type { Regles, Valeurs } from "./types";

/** La constante de temps τ = RC, en secondes. */
export const tau = (p: Valeurs): number => (p.R * p.C) / 1000;
/** La tension aux bornes du condensateur à l'instant t, en volts. `E` est la tension du générateur, ou la tension de départ en décharge. */
export const tension = (p: Valeurs, t: number): number => (p.decharge ? p.E * Math.exp(-t / tau(p)) : p.E * (1 - Math.exp(-t / tau(p))));
/** L'intensité à l'instant t, en milliampères. Elle est négative pendant la décharge : le courant circule dans l'autre sens. */
export const intensite = (p: Valeurs, t: number): number => (p.decharge ? -1 : 1) * (p.E / p.R) * Math.exp(-t / tau(p));
/** L'instant où la tension atteint le seuil, en secondes. */
export const instantSeuil = (p: Valeurs): number => tau(p) * Math.log(p.decharge ? p.E / p.seuil : p.E / (p.E - p.seuil));

const duree = (p: Valeurs): number => Math.min(3 * p.tCible, Math.max(1.5 * p.tCible, 1.15 * instantSeuil(p)));
const s = (x: number, decimales: number) => `${nombre(x, decimales)} s`;
/** Le nombre de décimales à écrire pour une grandeur dont la plus grande valeur est `echelle` : trois chiffres utiles. */
const chiffres = (echelle: number): number => (echelle >= 100 ? 0 : echelle >= 10 ? 1 : 2);
/** Une tension avec son unité : « 3,16 V », « 100 V ». L'échelle est la plus grande tension du circuit. */
export const volts = (x: number, echelle = x): string => `${nombre(x, chiffres(echelle))} V`;
/** Le nombre de décimales utile pour écrire une date autour de la date visée. */
const precision = (p: Valeurs) => (p.tCible < 1 ? 3 : p.tCible < 5 ? 2 : 1);

export const reglesRc: Regles = {
  issue(p) {
    const ts = instantSeuil(p);
    const d = precision(p);
    const passage = `La tension ${p.decharge ? "tombe à" : "atteint"} ${volts(p.seuil, p.E)} à ${s(ts, d)}`;
    if (Math.abs(ts - p.tCible) <= p.tol) return { reussi: true, message: `${passage} : la lampe s'${p.decharge ? "éteint" : "allume"} à la bonne date.` };
    return { reussi: false, message: `${passage}. Il fallait ${s(p.tCible, d)} : c'est trop ${ts < p.tCible ? "tôt" : "tard"}.` };
  },
  duree,
  // chaque essai dure environ cinq secondes à l'écran, que le circuit soit lent ou rapide
  cadence: (p) => duree(p) / 5,
  mesures(p, t) {
    const d = precision(p);
    return [{ nom: "t", valeur: s(t, d) }, { nom: "u_C", valeur: volts(tension(p, t), p.E) }, { nom: "i", valeur: `${nombreRelatif(intensite(p, t), chiffres(p.E / p.R))} mA` }, { nom: "τ", valeur: s(tau(p), d) }];
  },
};
