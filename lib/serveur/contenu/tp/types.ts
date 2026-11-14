import "server-only";
import type { Competence, DocumentTp, Paillasse } from "@/lib/commun/tp/types";

// Les TP virtuels (décision 0012) : des situations originales, écrites pour MasterBac, sur les familles de manipulations
// des ECE. Une situation est du contenu : elle reste sur le serveur, avec ses réponses. Le navigateur ne reçoit que
// l'énoncé de chaque étape, et la correction après avoir répondu (lib/serveur/tp.ts).
// Un TP écrit par Claude Code reste un brouillon tant que Yane ne l'a pas validé.

/** Les mesures de l'élève, tirées de sa manipulation rejouée par le serveur : le volume équivalent, un temps caractéristique. */
export type Mesures = Record<string, number>;
type Selon<T> = T | ((m: Mesures) => T);

export type EtapeTp =
  | { genre: "lecture"; titre: string; paragraphes: string[]; documents: DocumentTp[] }
  | { genre: "materiel"; competence: Competence; consigne: string; objets: { id: string; nom: string; utile: boolean; pourquoi: string }[] }
  /** les étapes, dans le bon ordre ; `autres` donne les ordres qui conviennent aussi, par les rangs des étapes */
  | { genre: "ordre"; competence: Competence; consigne: string; etapes: string[]; autres?: number[][] }
  | { genre: "choix"; competence: Competence; question: string; options: string[]; bonne: Selon<number>; explication: Selon<string> }
  /** la manipulation : `protocole` rappelle les gestes à faire, comme le professeur les donne après l'appel */
  | { genre: "paillasse"; competence: Competence; consigne: string; protocole: string[]; paillasse: Paillasse }
  /** une valeur à calculer à partir de ses propres mesures : l'écart toléré est relatif, ou absolu */
  | { genre: "valeur"; competence: Competence; question: string; unite: string; aide: string; attendu: (m: Mesures) => number; relatif?: number; absolu?: number; decimales: number; detail: (m: Mesures) => string };

export interface Tp {
  /** de 2 à 20 lettres minuscules, sans accent */
  id: string;
  titre: string;
  matiere: "chimie" | "physique";
  /** la famille de manipulation, en deux ou trois mots */
  famille: string;
  fiche: number;
  minutes: number;
  accroche: string;
  etat: "brouillon" | "valide";
  /** faux tant que le TP est en construction : il ne se montre nulle part */
  pret?: boolean;
  /**
   * Les étapes d'un essai. La graine de l'essai choisit les valeurs de la situation : refaire le TP donne une autre
   * inconnue. La même graine redonne toujours les mêmes étapes, et leur nombre ne dépend pas d'elle.
   */
  etapes: (graine: number) => EtapeTp[];
}

/** Choisit une valeur parmi plusieurs avec la graine de l'essai : toujours la même pour la même graine. */
export const variante = <T>(graine: number, choix: readonly T[]): T => choix[Math.abs(Math.trunc(graine)) % choix.length];
