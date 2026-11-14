// La température (fiche 5). Chauffer de l'eau : ΔU = m × c × Δθ et Φ = Q/Δt, donc Δt = m × c × Δθ / P.
// Laisser refroidir au contact de l'air : θ(t) = (θ_0 − θ_th) × e^(−t/τ) + θ_th, avec τ = m × c / (h × S).
import { nombre } from "@/lib/commun/format";
import type { Regles, Valeurs } from "./types";

/** Le temps caractéristique du refroidissement, en secondes : donné par l'énoncé, ou égal à m × c / (h × S). */
export const tauThermique = (p: Valeurs): number => (Number.isFinite(p.tau) ? p.tau : (p.m * p.c) / (p.h * p.S));
/** L'instant où l'élève arrête de chauffer (mode 0) ou boit son thé (mode 1), en secondes. Le temps d'attente se saisit en minutes. */
export const instantChoisi = (p: Valeurs): number => (p.mode === 0 ? p.chauffe : p.date * 60);
/** La température à l'instant t, en degrés Celsius. En chauffe, l'eau ne dépasse pas 100 °C : elle bout. */
export function temperature(p: Valeurs, t: number): number {
  if (p.mode === 0) return Math.min(100, p.theta0 + (p.P * Math.max(0, Math.min(t, p.chauffe))) / (p.m * p.c));
  return (p.theta0 - p.thetaTh) * Math.exp(-Math.max(0, t) / tauThermique(p)) + p.thetaTh;
}

const duree = (p: Valeurs): number => 1.15 * instantChoisi(p) + 1;
const degres = (x: number) => `${nombre(x, 1)} °C`;

// mode 0 : chauffer l'eau pendant `chauffe` secondes ; mode 1 : la laisser refroidir pendant `date` minutes
export const reglesTemperature: Regles = {
  issue(p) {
    const theta = temperature(p, instantChoisi(p));
    const ecart = theta - p.cible;
    if (p.mode === 0) {
      if (Math.abs(ecart) <= p.tol) return { reussi: true, message: `L'eau est à ${degres(theta)} : elle est prête pour le thé.` };
      if (theta >= 100) return { reussi: false, message: `L'eau bout. Il fallait ${degres(p.cible)} : tu as chauffé trop longtemps.` };
      return { reussi: false, message: ecart < 0 ? `L'eau n'est qu'à ${degres(theta)}. Il faut ${degres(p.cible)} : chauffe plus longtemps.` : `L'eau est à ${degres(theta)}. Il fallait ${degres(p.cible)} : tu as chauffé trop longtemps.` };
    }
    const quand = `Après ${nombre(p.date, 1)} min`;
    if (Math.abs(ecart) <= p.tol) return { reussi: true, message: `${quand}, le thé est à ${degres(theta)} : il est bon à boire.` };
    return { reussi: false, message: ecart > 0 ? `${quand}, le thé est encore à ${degres(theta)}. Il faut ${degres(p.cible)} : c'est trop tôt.` : `${quand}, le thé n'est plus qu'à ${degres(theta)}. Il fallait ${degres(p.cible)} : c'est trop tard.` };
  },
  duree,
  cadence: (p) => duree(p) / 5,
  mesures(p, t) {
    const temps = p.mode === 0 ? `${nombre(Math.min(t, p.chauffe), 0)} s` : `${nombre(t / 60, 1)} min`;
    return [{ nom: "t", valeur: temps }, { nom: "θ", valeur: degres(temperature(p, t)) }, { nom: "θ visée", valeur: degres(p.cible) }];
  },
};
