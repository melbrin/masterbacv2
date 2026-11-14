// Les TP virtuels (décision 0012) : un TP suit le fil d'un sujet d'ECE. Préparer, manipuler, exploiter.
// Ici, ce que le navigateur reçoit et renvoie. Les situations complètes, avec leurs réponses, restent sur le serveur
// (lib/serveur/contenu/tp.ts) : le serveur vérifie chaque étape, comme le professeur à un appel.
import type { GesteCircuit, ReglagesCircuit } from "./circuit";
import type { GesteTitrage, ReglagesTitrage } from "./titrage";

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

/** La paillasse d'une étape de manipulation, avec ses réglages. */
export type Paillasse = { genre: "titrage"; reglages: ReglagesTitrage } | { genre: "circuit"; reglages: ReglagesCircuit };
export type Geste = GesteTitrage | GesteCircuit;

export interface DocumentTp { titre: string; lignes: string[] }

/** Une étape telle que le navigateur la reçoit : sans la réponse. */
export type EtapePublique =
  | { genre: "lecture"; titre: string; paragraphes: string[]; documents: DocumentTp[] }
  | { genre: "materiel"; competence: Competence; consigne: string; objets: { id: string; nom: string }[] }
  | { genre: "ordre"; competence: Competence; consigne: string; etapes: string[] }
  | { genre: "choix"; competence: Competence; question: string; options: string[] }
  | { genre: "paillasse"; competence: Competence; consigne: string; paillasse: Paillasse }
  | { genre: "valeur"; competence: Competence; question: string; unite: string; aide: string };

/** Ce que l'élève envoie pour valider une étape. */
export type ReponseEtape =
  | { g: "lecture" }
  | { g: "materiel"; choisis: string[] }
  /** les étapes dans l'ordre choisi, chacune par sa place dans la liste reçue */
  | { g: "ordre"; ordre: number[] }
  | { g: "choix"; choix: number }
  | { g: "paillasse"; gestes: Geste[] }
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
