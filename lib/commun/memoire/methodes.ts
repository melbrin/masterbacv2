// La famille « Apprendre une méthode » : les paquets et le palais de mémoire.
import { ID_PICTOS } from "./pictos";
import { alea, plage } from "./tirage";

// ---------- Par paquets ----------

/** Le nombre de chiffres du nombre à chaque niveau. */
export const NIVEAUX_PAQUETS = plage(8, 14);

/**
 * Les tailles des paquets d'un nombre de `longueur` chiffres : des paquets de trois, et le reste en paquets de deux.
 * 8 chiffres : 3, 3, 2. 10 chiffres : 3, 3, 2, 2. 12 chiffres : 3, 3, 3, 3.
 */
export function taillesPaquets(longueur: number): number[] {
  if (longueur < 2) return longueur === 1 ? [1] : [];
  const deux = longueur % 3 === 0 ? 0 : longueur % 3 === 2 ? 1 : 2;
  const trois = (longueur - 2 * deux) / 3;
  return [...Array.from({ length: trois }, () => 3), ...Array.from({ length: deux }, () => 2)];
}

/** Les chiffres rangés en paquets : [4, 9, 2, 7, 1, 8, 3, 6] devient [[4, 9, 2], [7, 1, 8], [3, 6]]. */
export function enPaquets<T>(chiffres: readonly T[], tailles: readonly number[] = taillesPaquets(chiffres.length)): T[][] {
  const paquets: T[][] = [];
  let debut = 0;
  for (const taille of tailles) {
    paquets.push(chiffres.slice(debut, debut + taille));
    debut += taille;
  }
  return paquets;
}

/** Les chiffres d'un nombre long. Il ne commence pas par zéro, et le même chiffre ne revient jamais trois fois de suite. */
export function nombreLong(graine: number, longueur: number): number[] {
  const a = alea(graine);
  const chiffres: number[] = [];
  while (chiffres.length < longueur) {
    const chiffre = a.entier(chiffres.length === 0 ? 1 : 0, 9);
    const n = chiffres.length;
    if (n >= 2 && chiffre === chiffres[n - 1] && chiffre === chiffres[n - 2]) continue;
    chiffres.push(chiffre);
  }
  return chiffres;
}

// ---------- Le palais de mémoire ----------

/** Les pièces de la maison, de haut en bas : deux par étage. */
export const PIECES: { id: string; titre: string; dans: string }[] = [
  { id: "grenier", titre: "Grenier", dans: "dans le grenier" },
  { id: "bureau", titre: "Bureau", dans: "dans le bureau" },
  { id: "chambre", titre: "Chambre", dans: "dans la chambre" },
  { id: "bain", titre: "Salle de bain", dans: "dans la salle de bain" },
  { id: "salon", titre: "Salon", dans: "dans le salon" },
  { id: "cuisine", titre: "Cuisine", dans: "dans la cuisine" },
  { id: "entree", titre: "Entrée", dans: "dans l'entrée" },
  { id: "garage", titre: "Garage", dans: "dans le garage" },
];

/** La pièce d'un identifiant ; une erreur si elle n'existe pas. */
export function pieceDuPalais(id: string): (typeof PIECES)[number] {
  const p = PIECES.find((x) => x.id === id);
  if (!p) throw new Error(`Pièce inconnue : ${id}`);
  return p;
}

/** Le nombre d'objets rangés à chaque niveau. */
export const NIVEAUX_PALAIS = plage(3, 8);

export interface QuestionPalais {
  /** l'identifiant de la pièce demandée */
  piece: string;
  bonne: string;
  /** quatre objets, dont celui de la pièce */
  choix: string[];
}
export interface Palais {
  /** l'objet rangé dans chaque pièce occupée : identifiant de la pièce, puis pictogramme */
  rangement: { piece: string; picto: string }[];
  /** une question par pièce occupée, dans un ordre mélangé */
  questions: QuestionPalais[];
}

export function palais(graine: number, nombre: number): Palais {
  const a = alea(graine);
  const pieces = a.tire(PIECES, nombre).map((p) => p.id);
  const pictos = a.tire(ID_PICTOS, Math.max(nombre, 4));
  const rangement = pieces.map((piece, i) => ({ piece, picto: pictos[i] }));
  const questions = a.melange(rangement).map(({ piece, picto }) => ({
    piece,
    bonne: picto,
    // les mauvaises réponses sont les objets des autres pièces : il faut se souvenir du lieu, pas seulement de l'objet
    choix: a.melange([picto, ...a.tire(pictos.filter((p) => p !== picto), 3)]),
  }));
  return { rangement, questions };
}
