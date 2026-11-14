// Le rendement d'une synthèse (fiche 13) : η = n_obtenue / n_max, où n_max se calcule avec le réactif limitant.
// Sur plusieurs étapes, les rendements se multiplient.
// mode 0 : réaction totale, choisir la quantité de réactif limitant (en mol) pour une masse de produit ;
// mode 1 : choisir la masse de réactif limitant pour une masse de produit, avec un rendement ;
// mode 2 : deux étapes, choisir la quantité de réactif de départ (en mol) pour une quantité de produit final.
import { nombre } from "@/lib/commun/format";
import type { Regles, Valeurs } from "./types";

/** Les instants de la synthèse, en secondes : la réaction, puis la pesée du produit. */
export const SYNTHESE = { reaction: 3.5, pesee: 5.5, fin: 6.5 };

/** La quantité de réactif limitant engagée, en moles. */
export const quantiteEngagee = (p: Valeurs): number => (p.mode === 1 ? p.m / p.Mr : p.n);
/** Ce que la synthèse donne : une masse en grammes, ou une quantité de matière en moles quand l'énoncé compte en moles (mode 2). */
export function obtenu(p: Valeurs): number {
  if (p.mode === 0) return p.n * p.M;
  if (p.mode === 1) return (p.m / p.Mr) * p.rendement * p.Mp;
  return p.n * p.rendement * p.rendement2;
}
/** Ce que la balance affiche à l'instant t : rien pendant la réaction, puis la valeur monte jusqu'au résultat. */
export function pese(p: Valeurs, t: number): number {
  const k = Math.max(0, Math.min(1, (t - SYNTHESE.reaction) / (SYNTHESE.pesee - SYNTHESE.reaction)));
  return obtenu(p) * (1 - (1 - k) ** 2);
}
/** Le résultat avec son unité : « 9,00 g », « 0,024 mol ». */
export const resultatEcrit = (p: Valeurs, x: number): string => (p.mode === 2 ? `${nombre(x, 3)} mol` : `${nombre(x, 2)} g`);

export const reglesSynthese: Regles = {
  issue(p) {
    const x = obtenu(p);
    if (Math.abs(x - p.cible) <= p.tol * p.cible) return { reussi: true, message: `On récupère ${resultatEcrit(p, x)} de produit : c'est ce qu'il fallait.` };
    return { reussi: false, message: `On récupère ${resultatEcrit(p, x)} de produit au lieu de ${resultatEcrit(p, p.cible)} : il ${x < p.cible ? "manque du réactif" : "y a trop de réactif"}.` };
  },
  duree: () => SYNTHESE.fin,
  cadence: () => 1,
  secondes: () => null,
  mesures(p, t) {
    const produit = { nom: "obtenu", valeur: t >= SYNTHESE.reaction ? resultatEcrit(p, pese(p, t)) : "…" };
    const n = { nom: "n engagé", valeur: `${nombre(1000 * quantiteEngagee(p), 1)} mmol` };
    if (p.mode === 2) return [n, { nom: "rendement", valeur: `${nombre(100 * p.rendement * p.rendement2, 0)} %` }, produit];
    return [n, { nom: "rendement", valeur: `${nombre(100 * (p.mode === 1 ? p.rendement : 1), 0)} %` }, produit];
  },
};
