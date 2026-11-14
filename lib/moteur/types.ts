// Types du moteur de préparation (docs/08-moteur.md). Le moteur ne connaît du contenu que le sommaire.

export type Niveau = 10 | 14 | 18;
export type Resultat = "ok" | "partiel" | "ko";
export type Genre = "q" | "ex";

/** Un jour civil à l'heure de Paris, au format AAAA-MM-JJ. */
export type Jour = string;

export interface ItemSommaire {
  k: Genre;
  n: number;
  niveau: number;
  type: string;
  /** mention « demandé » : texte non vide quand la question est tombée au BAC */
  demande?: string | boolean | null;
  duree?: number | null;
}

export interface NotionSommaire {
  id: string;
  refs: [Genre, number][];
}

export interface FicheSommaire {
  num: number;
  items: ItemSommaire[];
  liste_notions: NotionSommaire[];
}

export interface QuizSommaire {
  id: string;
  fiche: number;
  niveau: number;
}

export interface Sommaire {
  fiches: FicheSommaire[];
  quiz: QuizSommaire[];
}

export interface Tentative {
  /** instant de la tentative, en millisecondes */
  t: number;
  r: Resultat;
  /** score entre 0 et 1 */
  s: number;
}

export interface EntreeCarnet {
  due: Jour;
  step: number;
}

export type Tache =
  | { type: "essentiel"; fiche: number }
  | { type: "quiz"; ids: string[] }
  | { type: "pieges"; fiches: number[] }
  | { type: "questions"; refs: string[] }
  | { type: "exercice"; ref: string; minutes?: number | null }
  | { type: "carnet" }
  | { type: "ds-blanc"; minutes: number; refs: string[] };

export interface SeancePlan {
  id: string;
  date: Jour;
  titre: string;
  minutes: number;
  taches: Tache[];
  faite: boolean;
  /** les étapes de lecture que l'élève a cochées (décision 0007) ; absent d'un plan qui vient d'être construit */
  lues?: string[];
}

export type Format = "express" | "trois-jours" | "semaine";

export interface Devoir {
  id: string;
  date: Jour;
  /** durée du devoir en heures */
  duree: number;
  fiches: number[];
  objectif: number;
  format?: Format;
  note?: number | null;
}

export interface SeanceFaite {
  date: Jour;
  minutes: number;
}

export interface SeanceDuJour {
  date: Jour;
  revoir: string[];
  exercice: string | null;
  etape: number;
  faite: boolean;
  raison: "ds" | "classe" | "defaut";
  dsId: string | null;
}

/** L'état d'un élève, tel que la couche serveur le reconstruit depuis la base. L'ordre des clés fait partie des entrées. */
export interface Etat {
  profil: { objectif?: number | null };
  vuEnClasse: Record<string, boolean>;
  tentatives: Record<string, Tentative[]>;
  carnet: Record<string, EntreeCarnet>;
  passages: Record<string, Record<string, number>>;
  ds: Devoir[];
  seances: SeanceFaite[];
  seance: SeanceDuJour | null;
}

export interface Reglages {
  /** intervalles du carnet d'erreurs, en jours */
  intervalles: number[];
  /** taux de réussite demandé pour un niveau ou une notion acquise */
  tauxReussite: number;
  /** nombre d'items tentés demandé pour le critère d'un niveau */
  itemsPourNiveau: number;
  /** écart demandé entre la première et la dernière réussite pour l'état « solide », en jours */
  joursPourSolide: number;
  /** nombre de questions de quiz qu'un chapitre doit avoir pour proposer un test de passage */
  quizPourPassage: number;
  questionsPassage: number;
  questionsQuizDs: number;
  /** objectif pris quand le profil n'en a pas */
  objectifParDefaut: number;
  /** un DS à cette distance ou moins fixe les chapitres de la séance du jour */
  joursDsProche: number;
  minutesSeance: number;
  /** décision 0004 : une question du carnet n'est pas reprise par le complément de quiz de la partie « à revoir » */
  revoirSansDoublon: boolean;
  seancesParSemaine: Record<number, number>;
  /** décision 0008 : le plan d'un DS sur plusieurs chapitres donne plus de questions et les répartit entre les chapitres */
  planParChapitre: boolean;
  /** nombre de questions qu'une séance de questions d'un plan de DS ne dépasse pas */
  questionsMaxSeanceDs: number;
  /** décision 0009 : nombre de questions qu'un test de calibrage ne dépasse pas */
  questionsCalibrage: number;
  /** au bout de ce nombre de jours, le parcours propose de refaire le test de calibrage */
  joursCalibrageAncien: number;
  /** au bout de ce nombre de jours sans séance, le parcours signale une pause */
  joursDePause: number;
  /** réussite sous laquelle un objectif travaillé est signalé comme fragile */
  tauxFragile: number;
}

/** Tout ce dont une règle a besoin : rien n'est lu ailleurs. */
export interface Contexte {
  etat: Etat;
  sommaire: SommaireIndexe;
  /** l'instant présent, en millisecondes */
  maintenant: number;
  reglages: Reglages;
}

export interface SommaireIndexe extends Sommaire {
  parNum: Map<number, FicheSommaire>;
  quizParFiche: Map<number, QuizSommaire[]>;
}
