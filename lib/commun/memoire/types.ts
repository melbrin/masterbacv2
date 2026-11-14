// La section Mémoire (décision 0013) : des jeux pour s'entraîner à retenir, sans lien avec un chapitre.
// Chaque jeu tourne dans le navigateur, dans le cadre commun des jeux (components/jeux/CadreJeu.tsx) :
// il reçoit une graine pour ses tirages, rend un score de 0 à 100 et une phrase de bilan.
import type { FinDePartie } from "@/lib/commun/jeux";

export type FamilleMemoire = "suites" | "espace" | "images" | "mots" | "methodes";

/** Les familles de jeux, dans l'ordre où la page les montre. */
export const FAMILLES_MEMOIRE: { id: FamilleMemoire; titre: string; sous: string }[] = [
  { id: "suites", titre: "Retenir une suite", sous: "Des chiffres, des couleurs, des calculs : garder en tête, dans l'ordre." },
  { id: "espace", titre: "Retenir des places", sous: "Des cases, des chemins, des objets : se souvenir de l'endroit." },
  { id: "images", titre: "Retenir ce qu'on a vu", sous: "Regarder vite, puis retrouver ce qui a changé ou disparu." },
  { id: "mots", titre: "Retenir des mots", sous: "Des listes, des prénoms, une histoire : les mots et leurs liens." },
  { id: "methodes", titre: "Apprendre une méthode", sous: "Des techniques pour retenir plus : les paquets, le palais de mémoire." },
];

export interface JeuMemoire {
  /** de 2 à 20 lettres minuscules, sans accent */
  id: string;
  nom: string;
  famille: FamilleMemoire;
  /** une phrase, pour la carte du jeu */
  resume: string;
  /** le nom d'une icône de components/appli/Icone.tsx */
  icone: string;
}

/** Ce que la page donne à chaque jeu de mémoire. */
export interface PropsMemoire {
  /** la graine des tirages : rien n'est tiré au hasard pendant l'affichage */
  graine: number;
  /** enregistre la partie finie et rend le record */
  fin: FinDePartie;
  /** l'adresse de la page des jeux de mémoire */
  retour: string;
}
