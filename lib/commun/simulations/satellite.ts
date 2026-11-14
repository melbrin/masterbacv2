// Le satellite (fiche 3). Sur une orbite circulaire de rayon R = R_T + h autour de la Terre :
// v = √(G × M_T / R) et T = 2π × √(R³ / (G × M_T)).
// mode 0 : donner la bonne vitesse au satellite ; mode 1 : trouver la durée d'un tour ; mode 2 : trouver l'altitude géostationnaire.
// Ici les distances sont en kilomètres, les vitesses en km/s, les durées en secondes.
import { nombre, nombreRelatif } from "@/lib/commun/format";
import type { Regles, Valeurs } from "./types";

/** Le rayon de la Terre, en km. */
export const RAYON_TERRE = 6371;
/** Le jour sidéral : la durée d'un tour de la Terre sur elle-même, en secondes. */
export const JOUR_SIDERAL = 86164;
/** G × M_T, en km³·s⁻², avec G = 6,67 × 10⁻¹¹ N·m²·kg⁻² et M_T = 5,97 × 10²⁴ kg. */
const MU = (6.67e-11 * 5.97e24) / 1e9;
/** Sous cette altitude, en km, l'atmosphère freine le satellite : il retombe. */
export const ATMOSPHERE = 120;
/** Le pas du calcul de l'orbite, en secondes. */
const PAS = 10;

/** La vitesse sur une orbite circulaire à l'altitude h, en km/s. */
export const vitesseCirculaire = (h: number): number => Math.sqrt(MU / (RAYON_TERRE + h));
/** La durée d'un tour sur une orbite circulaire à l'altitude h, en secondes. */
export const periode = (h: number): number => 2 * Math.PI * Math.sqrt((RAYON_TERRE + h) ** 3 / MU);
/** L'avance du satellite sur la station au bout d'un temps t, en degrés : positive s'il tourne plus vite que la Terre. */
export const avance = (p: Valeurs, t: number): number => 360 * (t / periode(p.h) - t / JOUR_SIDERAL);

/**
 * L'orbite d'un satellite lâché à l'horizontale, à l'altitude h, avec la vitesse v : r(θ) = r0 × (1 + k) / (1 + k × cos θ),
 * où k = (v / v_circulaire)² − 1. Avec k = 0 c'est un cercle. `autre` est le rayon à l'opposé du départ.
 */
function conique(p: Valeurs): { r0: number; k: number; autre: number } {
  const r0 = RAYON_TERRE + p.h;
  const k = (p.v / vitesseCirculaire(p.h)) ** 2 - 1;
  return { r0, k, autre: k >= 1 ? Number.POSITIVE_INFINITY : (r0 * (1 + k)) / (1 - k) };
}
/** L'altitude du satellite à l'opposé de son point de départ, en km : plus basse s'il est trop lent, plus haute s'il est trop rapide. */
export const altitudeOpposee = (p: Valeurs): number => conique(p).autre - RAYON_TERRE;

export interface Marche {
  /** l'instant atteint, en secondes : avant t si le satellite est rentré dans l'atmosphère */
  t: number;
  /** l'angle parcouru depuis le départ, en radians, et la distance au centre de la Terre, en km */
  angle: number;
  r: number;
  /** vrai si le satellite est rentré dans l'atmosphère */
  tombe: boolean;
  /** un point par minute, pour dessiner la trace */
  trace: { angle: number; r: number }[];
}

/** La marche du satellite du mode 0 jusqu'à l'instant t, calculée pas à pas : l'aire balayée par seconde reste constante. */
export function marche(p: Valeurs, t: number): Marche {
  const { r0, k } = conique(p);
  const moment = r0 * p.v;
  const rayon = (a: number) => (r0 * (1 + k)) / (1 + k * Math.cos(a));
  const vitesseAngulaire = (a: number) => moment / rayon(a) ** 2;
  const trace = [{ angle: 0, r: r0 }];
  let angle = 0, temps = 0, pas = 0;
  while (temps < t) {
    const dt = Math.min(PAS, t - temps);
    // méthode du point milieu
    angle += vitesseAngulaire(angle + (vitesseAngulaire(angle) * dt) / 2) * dt;
    temps += dt;
    pas += 1;
    const r = rayon(angle);
    if (pas % 6 === 0 && trace.length < 600) trace.push({ angle, r });
    if (r <= RAYON_TERRE + ATMOSPHERE) return { t: temps, angle, r, tombe: true, trace: [...trace, { angle, r }] };
  }
  return { t: temps, angle, r: rayon(angle), tombe: false, trace: [...trace, { angle, r: rayon(angle) }] };
}

/** L'instant de la photo (mode 1), en secondes. */
export const instantPhoto = (p: Valeurs): number => p.T * 60;

const km = (x: number) => `${nombre(x, 0)} km`;
/** Une durée en heures et minutes : « 23 h 56 min ». */
function heures(secondes: number): string {
  const minutes = Math.round(secondes / 60);
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;
}
function duree(p: Valeurs): number {
  if (p.mode === 1) return 1.08 * instantPhoto(p);
  if (p.mode === 2) return JOUR_SIDERAL;
  // un tour d'orbite circulaire et un peu plus ; moins si le satellite retombe avant
  const tour = 1.08 * periode(p.h);
  const m = marche(p, tour);
  return m.tombe ? m.t + 0.06 * tour : tour;
}

export const reglesSatellite: Regles = {
  issue(p) {
    if (p.mode === 1) {
      const tours = instantPhoto(p) / periode(p.h);
      const quand = `Après ${nombre(p.T, 1)} min`;
      if (Math.abs(instantPhoto(p) - periode(p.h)) <= p.tol * 60) return { reussi: true, message: `${quand}, le satellite a fait un tour complet : la photo est prise au bon endroit.` };
      return { reussi: false, message: tours < 1 ? `${quand}, le satellite n'a fait que ${nombre(tours, 2)} tour : c'est trop tôt.` : `${quand}, le satellite a déjà fait ${nombre(tours, 2)} tour : c'est trop tard.` };
    }
    if (p.mode === 2) {
      const tour = heures(periode(p.h));
      if (Math.abs(avance(p, JOUR_SIDERAL)) <= p.tol) return { reussi: true, message: `Le satellite fait un tour en ${tour}, comme la Terre : il reste au-dessus de la station.` };
      return { reussi: false, message: periode(p.h) < JOUR_SIDERAL ? `Trop bas : le satellite fait un tour en ${tour}. Il tourne plus vite que la Terre et dépasse la station.` : `Trop haut : le satellite fait un tour en ${tour}. Il tourne moins vite que la Terre et prend du retard sur la station.` };
    }
    const vc = vitesseCirculaire(p.h);
    if (Math.abs(p.v - vc) <= p.tol) return { reussi: true, message: `Le satellite reste à ${km(p.h)} d'altitude : son orbite est circulaire.` };
    const autre = altitudeOpposee(p);
    if (p.v < vc) return { reussi: false, message: autre < ATMOSPHERE ? "Trop lent : le satellite descend jusqu'à l'atmosphère, qui le freine. Il retombe sur la Terre." : `Trop lent : l'orbite n'est plus circulaire. Le satellite descend jusqu'à ${km(autre)} d'altitude.` };
    return { reussi: false, message: Number.isFinite(autre) ? `Trop rapide : l'orbite n'est plus circulaire. Le satellite monte jusqu'à ${km(autre)} d'altitude.` : "Trop rapide : le satellite s'échappe et ne revient pas." };
  },
  duree,
  // chaque essai dure environ sept secondes à l'écran
  cadence: (p) => duree(p) / 7,
  mesures(p, t) {
    if (p.mode === 1) return [{ nom: "t", valeur: `${nombre(t / 60, 1)} min` }, { nom: "tours", valeur: nombre(t / periode(p.h), 2) }, { nom: "h", valeur: km(p.h) }];
    if (p.mode === 2) return [{ nom: "t", valeur: `${nombre(t / 3600, 1)} h` }, { nom: "avance", valeur: `${nombreRelatif(avance(p, t), 1)}°` }, { nom: "h", valeur: km(p.h) }];
    const m = marche(p, t);
    // la vitesse se déduit de la conservation de l'énergie mécanique
    const v = Math.sqrt(Math.max(0, p.v ** 2 + 2 * MU * (1 / m.r - 1 / (RAYON_TERRE + p.h))));
    return [{ nom: "t", valeur: `${nombre(m.t / 60, 1)} min` }, { nom: "h", valeur: km(m.r - RAYON_TERRE) }, { nom: "v", valeur: `${nombre(v, 2)} km/s` }];
  },
};
