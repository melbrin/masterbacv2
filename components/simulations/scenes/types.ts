import type { Issue, Valeurs } from "@/lib/commun/simulations";

/** Ce qu'une scène reçoit pour se dessiner. Une scène est une fonction pure : les mêmes entrées donnent le même dessin. */
export interface PropsScene {
  /** toutes les grandeurs ; une valeur que l'élève n'a pas encore saisie porte une valeur d'attente */
  p: Valeurs;
  /** l'instant de la simulation, en secondes */
  t: number;
  /** « pret » : avant le lancement ; « marche » : pendant le mouvement ; « fini » : le mouvement est terminé */
  phase: "pret" | "marche" | "fini";
  /** l'issue de l'essai lancé. La scène ne la montre qu'au moment où elle se joue : au sol, au seuil, à l'arrivée du son. */
  issue: Issue | null;
  /** les valeurs que l'élève n'a pas encore saisies : la scène écrit « ? » à leur place */
  inconnues: readonly string[];
}

/** Arrondit une coordonnée du dessin : le serveur et le navigateur écrivent alors exactement le même nombre. */
export const r = (x: number): number => Math.round(x * 100) / 100;

/** La couleur du résultat : verte si l'essai réussit, brique s'il échoue, neutre tant que rien n'est joué. */
export const teinte = (issue: Issue | null, neutre = "var(--encre)"): string => (issue ? (issue.reussi ? "var(--vert)" : "var(--brique)") : neutre);
