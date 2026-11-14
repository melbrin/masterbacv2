// La famille « Retenir des places » : des cases, un chemin, des objets posés sur une grille, des paires de cartes.
import { ID_PICTOS } from "./pictos";
import { alea, plage } from "./tirage";

/** « ligne 2, colonne 3 » : le nom d'une case, pour qui ne voit pas la grille. */
export const nomCase = (rang: number, colonnes: number): string => `ligne ${Math.floor(rang / colonnes) + 1}, colonne ${(rang % colonnes) + 1}`;

// ---------- Cases allumées ----------

/** Le nombre de cases allumées à chaque niveau. */
export const NIVEAUX_CASES = plage(3, 12);

/** Le côté de la grille : 4 cases jusqu'à 6 cases allumées, 5 ensuite. */
export const coteCases = (nombre: number): number => (nombre <= 6 ? 4 : 5);

export interface CasesAllumees { cote: number; cases: number[] }

/** Les cases qui s'allument ensemble, rangées de la première à la dernière de la grille. */
export function casesAllumees(graine: number, nombre: number): CasesAllumees {
  const cote = coteCases(nombre);
  return { cote, cases: alea(graine).tire(plage(0, cote * cote - 1), nombre).sort((x, y) => x - y) };
}

// ---------- Le chemin ----------

/** Le nombre de cases du chemin à chaque niveau. */
export const NIVEAUX_CHEMIN = plage(3, 10);
export const COTE_CHEMIN = 4;

/** Les cases du chemin, dans l'ordre où elles s'allument. Le chemin ne passe jamais deux fois par la même case. */
export const cheminCases = (graine: number, longueur: number): number[] => alea(graine).tire(plage(0, COTE_CHEMIN * COTE_CHEMIN - 1), longueur);

// ---------- Chacun sa place ----------

/** Le nombre d'objets posés à chaque niveau. */
export const NIVEAUX_PLACES = plage(3, 8);
export const COTE_PLACES = 4;

export interface Places {
  /** chaque objet et sa case */
  objets: { picto: string; place: number }[];
  /** les objets dans l'ordre où ils sont demandés */
  demandes: string[];
}

export function placesPictos(graine: number, nombre: number): Places {
  const a = alea(graine);
  const pictos = a.tire(ID_PICTOS, nombre);
  const places = a.tire(plage(0, COTE_PLACES * COTE_PLACES - 1), nombre);
  return { objets: pictos.map((picto, i) => ({ picto, place: places[i] })), demandes: a.melange(pictos) };
}

// ---------- Paires de symboles ----------

/** Le nombre de cartes de chaque planche. */
export const NIVEAUX_SYMBOLES = [12, 16, 20];

/**
 * Le nombre de paires ratées permises sur une planche, c'est-à-dire de coups où une carte déjà vue n'a pas été
 * retrouvée : au-delà, la planche est perdue.
 */
export const ratesPermis = (cartes: number): number => cartes / 2;

/** Les cartes d'une planche : chaque pictogramme deux fois, dans un ordre mélangé. */
export function cartesSymboles(graine: number, cartes: number): string[] {
  const a = alea(graine);
  const pictos = a.tire(ID_PICTOS, cartes / 2);
  return a.melange([...pictos, ...pictos]);
}
