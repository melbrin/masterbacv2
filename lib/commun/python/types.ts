// Le hub Python (décision 0016) : des exercices de programmation au niveau du bac de physique-chimie, faits dans le
// navigateur avec un vrai Python (Pyodide, servi par l'application). Ce fichier ne contient que des types et des
// constantes : il est lu par les pages, par le serveur et par le script qui vérifie les exercices dans Node.

/** La version de Pyodide servie par l'application (public/pyodide/<version>/, préparé par scripts/pyodide.mjs). */
export const VERSION_PYODIDE = "314.0.7";
export const BASE_PYODIDE = `/pyodide/${VERSION_PYODIDE}/`;

export const THEMES_PYTHON = [
  { id: "bases", nom: "Les bases du langage" },
  { id: "mecanique", nom: "Mécanique" },
  { id: "energie", nom: "Énergie et transferts thermiques" },
  { id: "electricite", nom: "Circuit RC" },
  { id: "ondes", nom: "Ondes et signaux" },
  { id: "chimie", nom: "Chimie" },
  { id: "mesure", nom: "Mesures et incertitudes" },
] as const;
export type ThemePython = (typeof THEMES_PYTHON)[number]["id"];

/** Ce qu'on demande : écrire une fonction ou un programme, compléter un programme du bac, corriger une erreur. */
export type GenreExercice = "ecrire" | "completer" | "corriger";
export const NOMS_GENRES: Record<GenreExercice, string> = { ecrire: "Écrire", completer: "Compléter", corriger: "Corriger une erreur" };

/** Une vérification : du Python exécuté après le programme de l'élève, dans le même espace de noms. Un « assert » faux
 * donne son message à l'élève : il dit ce qui ne va pas, sans donner la réponse. */
export interface TestPython {
  nom: string;
  code: string;
}

export interface ExercicePython {
  /** de 3 à 40 caractères : lettres minuscules sans accent, chiffres et tirets */
  id: string;
  titre: string;
  theme: ThemePython;
  /** la fiche de physique-chimie où la notion est travaillée */
  fiche: number;
  niveau: 10 | 14 | 18;
  minutes: number;
  genre: GenreExercice;
  /** paragraphes ; un mot entre accents graves s'affiche comme du code */
  enonce: string[];
  /** le programme de départ, tel que l'élève le trouve dans l'éditeur */
  depart: string;
  tests: TestPython[];
  /** du plus vague au plus précis ; aucun ne donne la réponse */
  indices: string[];
  /** un programme juste, montré quand l'élève a réussi ou le demande */
  solution: string;
  /** ce qu'il faut retenir, montré après la réussite */
  explication: string[];
  /** un exercice écrit par Claude Code reste un brouillon tant que Yane ne l'a pas validé */
  etat: "brouillon" | "valide";
}

/** Le résultat d'une exécution, tel que le banc (public/python/banc.mjs) le rend. */
export interface ErreurPython { type: string; message: string; ligne: number | null; texte: string | null; explication: string }
export interface ResultatTest { nom: string; ok: boolean; message: string }
/** Une valeur vide (null) vient d'une valeur infinie ou « nan » : elle laisse un trou dans le tracé. */
export interface Courbe { x: (number | null)[]; y: (number | null)[]; couleur: string | null; trait: string; marqueur: string; nom: string | null }
export interface Fleches { x: (number | null)[]; y: (number | null)[]; u: (number | null)[]; v: (number | null)[]; echelle: number | null; couleur: string | null; nom: string | null }
export interface Barre { x0: number; x1: number; h: number; couleur: string | null }
export interface FigurePython {
  courbes: Courbe[];
  fleches: Fleches[];
  barres: Barre[];
  textes: { x: number; y: number; texte: string }[];
  lignes: { sens: "h" | "v"; valeur: number; couleur: string | null; trait: string }[];
  titre: string | null;
  xlabel: string | null;
  ylabel: string | null;
  grille: boolean;
  legende: boolean;
  xlim: [number, number] | null;
  ylim: [number, number] | null;
  egal: boolean;
  /** le programme a appelé plt.show() : sans cet appel, un vrai Python n'afficherait pas la figure */
  montree: boolean;
}
export interface ResultatPython { ok: boolean; erreur: ErreurPython | null; figures: FigurePython[]; tests: ResultatTest[] }

/** La solution s'ouvre après ce nombre de vérifications, ou après la réussite : le serveur le contrôle (décision 0016). */
export const SOLUTION_APRES = 2;

/** Vrai si toutes les vérifications passent. */
export const reussi = (r: ResultatPython): boolean => r.ok && r.tests.length > 0 && r.tests.every((t) => t.ok);
