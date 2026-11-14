// Les règles communes des jeux de mémoire : des manches de plus en plus difficiles.
// Une manche se joue en trois temps : mémoriser, rappeler, lire le verdict. Une manche réussie fait monter d'un niveau ;
// une manche ratée se rejoue au même niveau, avec un autre tirage. La partie s'arrête à la deuxième erreur,
// ou quand le niveau le plus haut est réussi. Le score monte avec le plus haut niveau réussi.

/** Le nombre d'erreurs qui arrête la partie. */
export const ERREURS_MAX = 2;

export type PhaseManche = "memorise" | "rappel" | "verdict";

export interface EtatManches {
  phase: PhaseManche;
  /** le numéro de la manche jouée, à partir de 0 : il donne la graine de son tirage */
  rang: number;
  /** le niveau joué, à partir de 0 */
  niveau: number;
  erreurs: number;
  /** le nombre de niveaux réussis : le plus haut niveau réussi, compté à partir de 1 */
  reussis: number;
  /** le verdict de la manche en cours ; null tant que la réponse n'est pas donnée */
  juste: boolean | null;
}

/**
 * Ce qui fait avancer une partie. Chaque action porte le numéro de la manche qu'elle vise : un appui et un minuteur
 * peuvent tomber au même instant, et le second est alors ignoré.
 */
export type ActionManches =
  | { type: "rappel"; rang: number }
  | { type: "verdict"; rang: number; juste: boolean }
  | { type: "suite"; rang: number };

export const DEPART: EtatManches = { phase: "memorise", rang: 0, niveau: 0, erreurs: 0, reussis: 0, juste: null };

/** Vrai quand le verdict affiché est celui de la dernière manche : deux erreurs, ou le niveau le plus haut réussi. */
export const partieFinie = (etat: EtatManches, niveaux: number): boolean =>
  etat.phase === "verdict" && (etat.erreurs >= ERREURS_MAX || etat.reussis >= niveaux);

/** L'état d'après. Une action qui ne vise pas la manche en cours, ou qui arrive au mauvais moment, ne change rien. */
export function avance(etat: EtatManches, action: ActionManches): EtatManches {
  if (action.rang !== etat.rang) return etat;
  if (action.type === "rappel") return etat.phase === "memorise" ? { ...etat, phase: "rappel" } : etat;
  if (action.type === "verdict") {
    if (etat.phase !== "rappel") return etat;
    return action.juste
      ? { ...etat, phase: "verdict", juste: true, reussis: Math.max(etat.reussis, etat.niveau + 1) }
      : { ...etat, phase: "verdict", juste: false, erreurs: etat.erreurs + 1 };
  }
  if (etat.phase !== "verdict" || etat.erreurs >= ERREURS_MAX) return etat;
  return { ...etat, phase: "memorise", rang: etat.rang + 1, niveau: etat.juste ? etat.niveau + 1 : etat.niveau, juste: null };
}

/** Le score d'une partie, de 0 à 100 : la part des niveaux (ou des questions) réussis. */
export function scoreSur(reussis: number, total: number): number {
  if (!(total > 0) || !(reussis > 0)) return 0;
  return Math.max(0, Math.min(100, Math.round((100 * reussis) / total)));
}

/**
 * La phrase de bilan d'un jeu à niveaux. `tailles` donne la taille jouée à chaque niveau (3 chiffres, puis 4...) ;
 * `phrase` dit ce qui a été retenu à la plus grande taille réussie ; `rien` sert quand aucun niveau n'est réussi.
 */
export function bilanNiveaux(tailles: readonly number[], reussis: number, phrase: (taille: number) => string, rien: string): string {
  if (reussis <= 0 || tailles.length === 0) return rien;
  const dernier = Math.min(reussis, tailles.length);
  const dit = phrase(tailles[dernier - 1]);
  return dernier === tailles.length ? `${dit.replace(/\.$/, "")}\u00a0: c'est le niveau le plus haut.` : dit;
}
