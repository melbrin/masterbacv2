// Le largage (fiche 1) : un drone vole à l'horizontale et lâche un colis. C'est un tir horizontal :
// x = v × t et y = −½ × g × t² + H. Le colis touche le sol à t = √(2H/g), après avoir avancé de v × t.
import { nombre, nombreRelatif } from "@/lib/commun/format";
import { PESANTEUR } from "@/lib/commun/physique";
import type { Regles, Valeurs } from "./types";

/** La demi-largeur de la cible, en mètres : le colis doit tomber à moins d'un mètre de son centre. */
export const DEMI_CIBLE = 1;
/** Le drone vole une seconde avant de lâcher le colis : le temps de le voir arriver. */
export const APPROCHE = 1;

/** La durée de la chute du colis, en secondes : √(2H/g). */
export const dureeChute = (H: number): number => Math.sqrt((2 * H) / PESANTEUR);
/** La distance que le colis parcourt à l'horizontale pendant sa chute, en mètres. */
export const avancee = (p: Valeurs): number => p.v * dureeChute(p.H);
/** La position du colis t secondes après le largage : l'origine est au sol, sous le point de largage. */
export function positionColis(p: Valeurs, t: number): { x: number; y: number } {
  const ts = Math.max(0, Math.min(t, dureeChute(p.H)));
  return { x: p.v * ts, y: p.H - 0.5 * PESANTEUR * ts * ts };
}

const m = (x: number) => `${nombre(x, 1)} m`;

export const reglesLargage: Regles = {
  issue(p) {
    const ecart = avancee(p) - p.d;
    if (Math.abs(ecart) <= DEMI_CIBLE) return { reussi: true, message: "Le colis tombe sur la cible !" };
    return { reussi: false, message: ecart < 0 ? `Le colis tombe ${m(-ecart)} avant la cible.` : `Le colis tombe ${m(ecart)} après la cible.` };
  },
  duree: (p) => APPROCHE + dureeChute(p.H) + 0.6,
  cadence: () => 1,
  mesures(p, t) {
    const ts = Math.max(0, Math.min(t - APPROCHE, dureeChute(p.H)));
    const pos = positionColis(p, ts);
    return [{ nom: "t", valeur: `${nombre(ts, 2)} s` }, { nom: "x", valeur: m(pos.x) }, { nom: "y", valeur: m(Math.max(0, pos.y)) }, { nom: "v_y", valeur: `${nombreRelatif(-PESANTEUR * ts, 1)} m/s` }];
  },
};
