// Les tirages des jeux de mémoire. Tout part d'une graine : la même graine redonne la même partie.
// Ni horloge ni hasard ici : le serveur et le navigateur affichent la même chose.
// `melangeGraine` (lib/commun/jeux.ts) ne donne pas tous les ordres sur les petites listes ; les jeux de mémoire
// tirent aussi des chiffres, des cases et des opérations : ils ont leur propre suite de nombres, mieux répartie.

/** L'écart entre les graines de deux manches d'une même partie. */
const ECART = 104729;

/** Une suite de tirages qui ne dépend que de sa graine. */
export interface Alea {
  /** un nombre de 0 (compris) à 1 (non compris) */
  suivant: () => number;
  /** un entier de `min` à `max`, bornes comprises */
  entier: (min: number, max: number) => number;
  /** un élément de la liste, qui ne doit pas être vide */
  parmi: <T>(liste: readonly T[]) => T;
  /** la liste dans un ordre mélangé ; la liste reçue n'est pas modifiée */
  melange: <T>(liste: readonly T[]) => T[];
  /** `n` éléments de la liste, tous à des places différentes, dans un ordre mélangé */
  tire: <T>(liste: readonly T[], n: number) => T[];
}

/** Brouille une graine : deux graines voisines donnent deux suites sans rapport. */
function brouille(graine: number): number {
  let x = (Math.trunc(graine) ^ 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

/** Les tirages d'une graine. Chaque appel de `alea` avec la même graine redonne la même suite. */
export function alea(graine: number): Alea {
  let etat = brouille(graine);
  const suivant = () => {
    etat = (etat + 0x6d2b79f5) >>> 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const entier = (min: number, max: number) => min + Math.floor(suivant() * (max - min + 1));
  const melange = <T>(liste: readonly T[]): T[] => {
    const a = liste.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = entier(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  return {
    suivant,
    entier,
    parmi: <T>(liste: readonly T[]): T => liste[entier(0, liste.length - 1)],
    melange,
    tire: <T>(liste: readonly T[], n: number): T[] => melange(liste).slice(0, Math.max(0, n)),
  };
}

/** La graine du tirage d'une manche : chaque manche d'une partie a la sienne. */
export const graineManche = (graine: number, rang: number): number => (Math.trunc(graine) + ECART * (rang + 1)) >>> 0;

/** Les entiers de `de` à `a`, bornes comprises : les tailles jouées par un jeu, de la plus petite à la plus grande. */
export const plage = (de: number, a: number): number[] => Array.from({ length: Math.max(0, a - de + 1) }, (_, i) => de + i);

/** Vrai si les deux listes ont les mêmes éléments, dans le même ordre. */
export const memeSuite = <T>(a: readonly T[], b: readonly T[]): boolean => a.length === b.length && a.every((x, i) => x === b[i]);
