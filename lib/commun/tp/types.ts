// Les TP virtuels (décision 0012) : un TP suit le fil d'un sujet d'ECE. Préparer, manipuler, exploiter.
// Ici, ce que le navigateur reçoit et renvoie, et ce qu'une paillasse doit fournir. Les situations complètes, avec leurs
// réponses, restent sur le serveur (lib/serveur/contenu/tp/) : le serveur vérifie chaque étape, comme le professeur à un appel.

/** Les compétences notées à l'épreuve : s'approprier, analyser et raisonner, réaliser, valider. */
export type Competence = "APP" | "ANA" | "REA" | "VAL";
export const COMPETENCES: { id: Competence; nom: string; quoi: string }[] = [
  { id: "APP", nom: "S'approprier", quoi: "comprendre la situation et ses documents" },
  { id: "ANA", nom: "Analyser", quoi: "choisir le matériel et construire le protocole" },
  { id: "REA", nom: "Réaliser", quoi: "manipuler et mesurer avec soin" },
  { id: "VAL", nom: "Valider", quoi: "exploiter ses mesures et conclure" },
];
/** Le niveau d'une compétence, comme sur la grille de l'épreuve : A, sans aide ; D, non réussi. */
export type Niveau = "A" | "B" | "C" | "D";

/** Le niveau qui correspond à la moyenne des scores (de 0 à 1) des étapes d'une compétence. */
export const niveauPour = (moyenne: number): Niveau => (moyenne >= 0.9 ? "A" : moyenne >= 0.6 ? "B" : moyenne >= 0.3 ? "C" : "D");

// ---------- les gestes ----------

/**
 * Un geste de manipulation, tel que le navigateur l'envoie : son nom dans `g`, et quelques valeurs simples.
 * Le serveur n'accepte que cette forme (lib/serveur/commandes/tp.ts) ; chaque paillasse y lit ce qu'elle connaît.
 */
export type GesteBrut = { g: string } & { [cle: string]: string | number | boolean };

/** La valeur d'un geste si c'est un nombre fini, sinon null. */
export const nombreDe = (g: GesteBrut, cle: string): number | null => {
  const v = g[cle];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};
/** La valeur d'un geste si c'est un texte, sinon null. */
export const texteDe = (g: GesteBrut, cle: string): string | null => {
  const v = g[cle];
  return typeof v === "string" ? v : null;
};

// ---------- les étapes ----------

/** La paillasse d'une étape de manipulation : son genre, et les réglages qu'elle dessine. */
export interface Paillasse { genre: string; reglages: unknown }

export interface DocumentTp { titre: string; lignes: string[] }

/** Une étape telle que le navigateur la reçoit : sans la réponse. */
export type EtapePublique =
  | { genre: "lecture"; titre: string; paragraphes: string[]; documents: DocumentTp[] }
  | { genre: "materiel"; competence: Competence; consigne: string; objets: { id: string; nom: string }[] }
  | { genre: "ordre"; competence: Competence; consigne: string; etapes: string[] }
  | { genre: "choix"; competence: Competence; question: string; options: string[] }
  /** `protocole` : les gestes à faire, donnés par le professeur après l'appel ; l'élève peut les relire sur la paillasse */
  | { genre: "paillasse"; competence: Competence; consigne: string; protocole: string[]; paillasse: Paillasse }
  | { genre: "valeur"; competence: Competence; question: string; unite: string; aide: string };

/** Ce que l'élève envoie pour valider une étape. */
export type ReponseEtape =
  | { g: "lecture" }
  | { g: "materiel"; choisis: string[] }
  /** les étapes dans l'ordre choisi, chacune par sa place dans la liste reçue */
  | { g: "ordre"; ordre: number[] }
  | { g: "choix"; choix: number }
  | { g: "paillasse"; gestes: GesteBrut[] }
  | { g: "valeur"; valeur: number };

/** Une faute de manipulation : ce qui s'est passé, et si elle compte beaucoup. */
export interface Faute { code: string; grave: boolean; texte: string }

/** Ce que le serveur répond après une étape : le score de 0 à 1, et la correction à montrer. */
export interface RetourEtape {
  score: number;
  correction:
    | { genre: "lecture" }
    | { genre: "materiel"; utiles: string[]; pourquoi: Record<string, string> }
    | { genre: "ordre"; etapes: string[] }
    | { genre: "choix"; bonne: number; explication: string }
    | { genre: "paillasse"; fautes: Faute[]; mesures: string[] }
    | { genre: "valeur"; attendu: string; detail: string };
}

/** Le bilan d'un TP terminé : le niveau de chaque compétence travaillée. */
export type Bilan = Partial<Record<Competence, Niveau>>;

// ---------- ce qu'une paillasse fournit ----------

/** Ce que vaut une manipulation, dit par les règles de la paillasse. */
export interface BilanPaillasse {
  /** de 0 à 1 */
  score: number;
  fautes: Faute[];
  /** les mesures de l'élève, reprises par les étapes d'exploitation */
  mesures: Record<string, number>;
  /** ce que le professeur dit de ces mesures, en phrases : « Ton volume à l'équivalence : V_E = 9,80 mL. » */
  lignes: string[];
}

/**
 * Les règles d'une paillasse : des fonctions pures, sans horloge ni hasard. Le navigateur s'en sert pour faire vivre
 * la paillasse ; le serveur rejoue avec elles les gestes de l'élève pour juger la manipulation.
 * `R` : les réglages de la situation. `E` : l'état de la paillasse.
 */
export interface ReglesPaillasse<R, E> {
  /** l'état de la paillasse avant le premier geste */
  depart(r: R): E;
  /** l'état après un geste ; un geste inconnu, mal formé ou impossible ne change rien */
  geste(r: R, etat: E, g: GesteBrut): E;
  /** ce que vaut la manipulation dans cet état */
  bilan(r: R, etat: E): BilanPaillasse;
}

/** Rejoue une suite de gestes depuis le début : c'est ainsi que le serveur retrouve la manipulation de l'élève. */
export const rejoue = <R, E>(regles: ReglesPaillasse<R, E>, r: R, gestes: readonly GesteBrut[]): E =>
  gestes.reduce((etat, g) => regles.geste(r, etat, g), regles.depart(r));

/** Le score d'une manipulation : une faute légère retire un quart, une faute importante la moitié. */
export const scoreDesFautes = (fautes: readonly Faute[]): number => Math.max(0, 1 - fautes.reduce((s, f) => s + (f.grave ? 0.5 : 0.25), 0));

/** Ce que le cadre d'un TP donne à la vue d'une paillasse. */
export interface PropsPaillasse<R> {
  reglages: R;
  /** les gestes à faire, donnés par le professeur : la paillasse les garde à portée de main */
  protocole: string[];
  /** vrai pendant que le serveur regarde la manipulation */
  attente: boolean;
  /** l'élève appelle le professeur : la suite de ses gestes part au serveur */
  fini: (gestes: GesteBrut[]) => void;
}
