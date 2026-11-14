// La famille « Retenir une suite » : des chiffres, des touches de couleur, des calculs, des nombres à trier.
// Chaque fonction tire le contenu d'une manche à partir de sa graine, ou vérifie une réponse.
import { TOUCHES } from "./formes";
import { alea, plage } from "./tirage";

// ---------- Suite de chiffres, À l'envers ----------

/** Les longueurs jouées : de 3 à 12 chiffres dans l'ordre, de 2 à 10 à l'envers. */
export const NIVEAUX_CHIFFRES = plage(3, 12);
export const NIVEAUX_ENVERS = plage(2, 10);

/** Une suite de chiffres de 0 à 9. Jamais deux fois le même chiffre de suite, ni trois chiffres qui se suivent (4, 5, 6). */
export function suiteChiffres(graine: number, longueur: number): number[] {
  const a = alea(graine);
  const suite: number[] = [];
  while (suite.length < longueur) {
    const chiffre = a.entier(0, 9);
    const n = suite.length;
    if (n >= 1 && chiffre === suite[n - 1]) continue;
    if (n >= 2 && Math.abs(chiffre - suite[n - 1]) === 1 && chiffre - suite[n - 1] === suite[n - 1] - suite[n - 2]) continue;
    suite.push(chiffre);
  }
  return suite;
}

/** La même suite, du dernier élément au premier. */
export const aLEnvers = <T>(suite: readonly T[]): T[] => suite.slice().reverse();

// ---------- Suite de couleurs ----------

/** Les longueurs jouées : la suite commence à 3 touches et gagne une touche à chaque tour, jusqu'à 12. */
export const NIVEAUX_COULEURS = plage(3, 12);

/**
 * La suite de touches d'une partie, à sa plus grande longueur : chaque tour en rejoue le début, une touche plus loin.
 * Une touche est un rang dans `TOUCHES`. Jamais trois fois la même touche de suite.
 */
export function suiteTouches(graine: number, longueur: number): number[] {
  const a = alea(graine);
  const suite: number[] = [];
  while (suite.length < longueur) {
    const touche = a.entier(0, TOUCHES.length - 1);
    const n = suite.length;
    if (n >= 2 && touche === suite[n - 1] && touche === suite[n - 2]) continue;
    suite.push(touche);
  }
  return suite;
}

// ---------- Calcul en chaîne ----------

/** Le nombre d'opérations à chaque niveau. */
export const NIVEAUX_CALCUL = plage(2, 8);

/** Tous les totaux d'une chaîne restent entre ces deux bornes. */
export const CALCUL_MIN = 0;
export const CALCUL_MAX = 99;

export type Signe = "+" | "−" | "×";
export interface Operation {
  signe: Signe;
  valeur: number;
  /** le total une fois l'opération faite */
  total: number;
}
export interface Chaine { depart: number; operations: Operation[]; resultat: number }

export const calcule = (total: number, signe: Signe, valeur: number): number =>
  signe === "+" ? total + valeur : signe === "−" ? total - valeur : total * valeur;

/** « + 3 », « × 2 », « − 4 » : une opération telle qu'elle s'affiche. */
export const ditOperation = (o: { signe: Signe; valeur: number }): string => `${o.signe}\u00a0${o.valeur}`;

/**
 * Une chaîne de calcul : un nombre de départ, puis des opérations à faire de tête, l'une après l'autre.
 * On ajoute ou on retire de 2 à 9, on multiplie par 2 ou par 3. Jamais deux multiplications de suite,
 * jamais trois fois le même signe, et une opération ne défait pas la précédente (+ 3 puis − 3).
 */
export function chaineCalcul(graine: number, longueur: number): Chaine {
  const a = alea(graine);
  const depart = a.entier(2, 12);
  const operations: Operation[] = [];
  let total = depart;
  for (let i = 0; i < longueur; i++) {
    const avant = operations[i - 1];
    const memeSigneDeuxFois = i >= 2 && operations[i - 2].signe === avant.signe ? avant.signe : null;
    const possibles: { signe: Signe; valeur: number }[] = [];
    for (let valeur = 2; valeur <= 9; valeur++) {
      if (total + valeur <= CALCUL_MAX) possibles.push({ signe: "+", valeur });
      if (total - valeur >= CALCUL_MIN) possibles.push({ signe: "−", valeur });
    }
    if (total >= 2 && avant?.signe !== "×") for (const valeur of [2, 3]) if (total * valeur <= CALCUL_MAX) possibles.push({ signe: "×", valeur });
    const permises = possibles.filter((p) => p.signe !== memeSigneDeuxFois
      && !(avant && avant.valeur === p.valeur && ((avant.signe === "+" && p.signe === "−") || (avant.signe === "−" && p.signe === "+"))));
    // le signe d'abord, à chances égales, puis la valeur : sinon l'addition et la soustraction écraseraient la multiplication
    const choix = permises.length > 0 ? permises : possibles;
    const signe = a.parmi([...new Set(choix.map((p) => p.signe))]);
    const { valeur } = a.parmi(choix.filter((p) => p.signe === signe));
    total = calcule(total, signe, valeur);
    operations.push({ signe, valeur, total });
  }
  return { depart, operations, resultat: total };
}

// ---------- Du plus petit au plus grand ----------

/** Le nombre de nombres à trier à chaque niveau. */
export const NIVEAUX_TRI = plage(3, 8);

/** Des nombres de 10 à 99, tous différents, dans l'ordre où ils s'affichent. */
export const nombresATrier = (graine: number, nombre: number): number[] => alea(graine).tire(plage(10, 99), nombre);

/** Les mêmes nombres, du plus petit au plus grand. */
export const tries = (nombres: readonly number[]): number[] => nombres.slice().sort((x, y) => x - y);

// ---------- Un tour en arrière ----------

/** Un niveau de « Un tour en arrière » : comparer chaque symbole à celui d'il y a `recul` tours, sur `longueur` symboles. */
export interface NiveauRetour { recul: number; longueur: number }
export const NIVEAUX_RETOUR: NiveauRetour[] = [
  { recul: 1, longueur: 8 }, { recul: 1, longueur: 12 },
  { recul: 2, longueur: 10 }, { recul: 2, longueur: 14 },
  { recul: 3, longueur: 12 }, { recul: 3, longueur: 16 },
];
/** Le nombre de fautes permises dans un défilé : à la suivante, la manche est perdue. */
export const FAUTES_RETOUR = 1;

/**
 * Le défilé d'une manche : des rangs de symboles (de 0 à `symboles` − 1). À peu près une fois sur trois,
 * le symbole est le même que celui d'il y a `recul` tours.
 */
export function defileRetour(graine: number, niveau: NiveauRetour, symboles: number): number[] {
  const a = alea(graine);
  const suite: number[] = [];
  for (let i = 0; i < niveau.longueur; i++) {
    const ancien = i >= niveau.recul ? suite[i - niveau.recul] : null;
    if (ancien !== null && a.suivant() < 0.36) { suite.push(ancien); continue; }
    let symbole = a.entier(0, symboles - 1);
    while (symbole === ancien) symbole = a.entier(0, symboles - 1);
    suite.push(symbole);
  }
  return suite;
}

/** Vrai si le symbole du rang `i` est le même que celui d'il y a `recul` tours. */
export const estRetour = (suite: readonly number[], i: number, recul: number): boolean => i >= recul && suite[i] === suite[i - recul];
