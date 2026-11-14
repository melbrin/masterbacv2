// La famille « Retenir des mots » : une liste à reconnaître, des paires de mots, des mots à remettre dans l'ordre.
// Les listes : des noms communs courants et concrets, rangés par thème, et des prénoms variés. Rien de sensible.
import { alea, plage } from "./tirage";

/** Les mots, par thème. Un mot tient en dix lettres au plus, pour rester lisible sur un bouton étroit. */
export const THEMES_MOTS: { theme: string; mots: string[] }[] = [
  { theme: "animaux", mots: ["chat", "chien", "cheval", "lapin", "tortue", "renard", "hibou", "dauphin", "girafe", "mouton", "canard", "abeille", "souris", "baleine"] },
  { theme: "maison", mots: ["table", "chaise", "lampe", "tapis", "miroir", "armoire", "tiroir", "coussin", "rideau", "escalier", "fenêtre", "canapé", "étagère", "horloge"] },
  { theme: "nature", mots: ["rivière", "montagne", "forêt", "nuage", "étoile", "plage", "colline", "rocher", "prairie", "volcan", "désert", "cascade", "océan", "orage"] },
  { theme: "nourriture", mots: ["pomme", "fromage", "carotte", "citron", "gâteau", "tomate", "banane", "biscuit", "noisette", "salade", "confiture", "cerise", "farine", "miel"] },
  { theme: "objets", mots: ["stylo", "cahier", "marteau", "bougie", "valise", "parapluie", "lunettes", "montre", "bouton", "ficelle", "brosse", "échelle", "panier", "cadenas"] },
  { theme: "transports", mots: ["vélo", "bateau", "avion", "train", "camion", "métro", "fusée", "voiture", "tracteur", "barque", "radeau", "moto"] },
  { theme: "vêtements", mots: ["manteau", "chapeau", "écharpe", "chaussure", "gant", "bonnet", "ceinture", "chemise", "veste", "botte", "cravate", "pyjama", "robe", "jupe"] },
  { theme: "lieux", mots: ["école", "marché", "jardin", "piscine", "musée", "gare", "pont", "château", "phare", "moulin", "ferme", "stade", "village", "cinéma"] },
  { theme: "loisirs", mots: ["guitare", "tambour", "piano", "violon", "flûte", "trompette", "ballon", "raquette", "puzzle", "toupie", "domino", "pinceau", "manège", "balançoire"] },
  { theme: "métiers", mots: ["boulanger", "pilote", "facteur", "jardinier", "pompier", "peintre", "docteur", "cuisinier", "pêcheur", "berger", "plombier", "libraire", "dentiste", "maçon"] },
  { theme: "cuisine", mots: ["assiette", "fourchette", "cuillère", "casserole", "bouteille", "verre", "tasse", "bol", "poêle", "théière", "plateau", "nappe"] },
];

/** Tous les mots, dans l'ordre des thèmes. */
export const MOTS: string[] = THEMES_MOTS.flatMap((t) => t.mots);

const THEME_DU_MOT = new Map(THEMES_MOTS.flatMap((t) => t.mots.map((mot) => [mot, t.theme] as const)));
export const themeDuMot = (mot: string): string => THEME_DU_MOT.get(mot) ?? "";

/** Des prénoms variés, pour les histoires et pour le jeu des prénoms. */
export const PRENOMS: string[] = [
  "Léa", "Hugo", "Inès", "Malik", "Chloé", "Yanis", "Jade", "Noah", "Lina", "Tom", "Sarah", "Lucas",
  "Aya", "Enzo", "Manon", "Adam", "Zoé", "Nathan", "Camille", "Rayan", "Emma", "Louis", "Nour", "Jules",
  "Clara", "Sacha", "Maya", "Théo", "Lola", "Ibrahim", "Anna", "Paul", "Fatou", "Gabriel", "Alice", "Mehdi",
  "Rose", "Samuel", "Mila", "Victor", "Eva", "Ismaël", "Jeanne", "Kenza", "Arthur", "Salomé", "Oscar", "Amina",
];

// ---------- Liste de mots ----------

/** Le nombre de mots de la liste à chaque niveau. */
export const NIVEAUX_MOTS = plage(6, 12);

export interface ListeMots {
  /** les mots à retenir, dans l'ordre où ils s'affichent */
  liste: string[];
  /** deux fois plus de mots, dans un ordre mélangé : ceux de la liste et autant d'autres */
  proposes: string[];
}

export function listeMots(graine: number, nombre: number): ListeMots {
  const a = alea(graine);
  const tires = a.tire(MOTS, 2 * nombre);
  return { liste: tires.slice(0, nombre), proposes: a.melange(tires) };
}

export interface CorrectionMots {
  /** les mots de la liste qui n'ont pas été cochés */
  oublies: string[];
  /** les mots cochés qui n'étaient pas dans la liste */
  enTrop: string[];
  juste: boolean;
}

/** La liste est reconnue quand tous ses mots sont cochés, et eux seuls. */
export function corrigeMots(liste: readonly string[], coches: readonly string[]): CorrectionMots {
  const oublies = liste.filter((mot) => !coches.includes(mot));
  const enTrop = coches.filter((mot) => !liste.includes(mot));
  return { oublies, enTrop, juste: oublies.length === 0 && enTrop.length === 0 };
}

// ---------- Mots associés ----------

/** Le nombre de paires à chaque niveau. */
export const NIVEAUX_ASSOCIES = plage(4, 8);

/**
 * Les thèmes trop proches pour former une paire « sans rapport » : un animal et un lieu (cheval, ferme),
 * un transport et un lieu (train, gare)... Les métiers touchent à tout : ils ne servent pas à ce jeu.
 */
const THEMES_PROCHES: [string, string][] = [
  ["animaux", "nature"], ["animaux", "lieux"], ["animaux", "nourriture"],
  ["maison", "objets"], ["maison", "cuisine"], ["maison", "lieux"],
  ["nature", "transports"], ["nature", "lieux"],
  ["nourriture", "cuisine"], ["nourriture", "lieux"], ["nourriture", "objets"],
  ["objets", "vêtements"], ["objets", "cuisine"], ["objets", "loisirs"],
  ["transports", "lieux"], ["loisirs", "lieux"],
];
const THEMES_ECARTES = ["métiers"];

/** Vrai si deux mots peuvent former une paire sans rapport : deux thèmes différents, et pas deux thèmes proches. */
export function sansRapport(un: string, deux: string): boolean {
  const a = themeDuMot(un);
  const b = themeDuMot(deux);
  if (!a || !b || a === b || THEMES_ECARTES.includes(a) || THEMES_ECARTES.includes(b)) return false;
  return !THEMES_PROCHES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

export interface QuestionAssocie {
  premier: string;
  second: string;
  /** quatre seconds mots vus dans la manche, dont le bon */
  choix: string[];
}
export interface Associes {
  /** les paires, dans l'ordre où elles s'affichent */
  paires: [string, string][];
  /** une question par paire, dans un autre ordre */
  questions: QuestionAssocie[];
}

export function motsAssocies(graine: number, nombre: number): Associes {
  const a = alea(graine);
  const reserve = a.melange(MOTS.filter((mot) => !THEMES_ECARTES.includes(themeDuMot(mot))));
  const paires: [string, string][] = [];
  const pris = new Set<string>();
  for (const premier of reserve) {
    if (paires.length === nombre) break;
    if (pris.has(premier)) continue;
    const second = reserve.find((mot) => !pris.has(mot) && mot !== premier && sansRapport(premier, mot));
    if (!second) continue;
    pris.add(premier).add(second);
    paires.push([premier, second]);
  }
  const seconds = paires.map(([, second]) => second);
  const questions = a.melange(paires).map(([premier, second]) => ({
    premier,
    second,
    choix: a.melange([second, ...a.tire(seconds.filter((mot) => mot !== second), 3)]),
  }));
  return { paires, questions };
}

// ---------- Les mots dans l'ordre ----------

/** Le nombre de mots à remettre dans l'ordre à chaque niveau. */
export const NIVEAUX_FILE = plage(3, 8);

export interface FileMots {
  /** les mots, dans l'ordre où ils s'affichent */
  ordre: string[];
  /** les mêmes mots, dans un autre ordre, pour les boutons du rappel */
  melanges: string[];
}

export function fileMots(graine: number, nombre: number): FileMots {
  const a = alea(graine);
  const ordre = a.tire(MOTS, nombre);
  const melanges = a.melange(ordre);
  // un mélange qui redonne le même ordre est décalé d'un cran : les boutons ne donnent jamais la réponse
  return { ordre, melanges: melanges.every((mot, i) => mot === ordre[i]) ? [...melanges.slice(1), melanges[0]] : melanges };
}

// ---------- Les prénoms ----------

/** Le nombre de personnages à chaque niveau. */
export const NIVEAUX_PRENOMS = plage(3, 8);

/** Les coiffures et les accessoires des personnages : le dessin de chacun est dans components/memoire/. */
export const COIFFURES = ["cheveux courts", "cheveux longs", "cheveux bouclés", "chignon", "frange", "couettes", "crête", "bonnet"] as const;
export const ACCESSOIRES = ["sans accessoire", "lunettes", "nœud papillon", "écharpe", "boucles d'oreilles", "moustache"] as const;

/** Un personnage dessiné : sa coiffure et son accessoire le distinguent des autres, sans compter sur la couleur. */
export interface Personnage { prenom: string; coiffure: number; accessoire: number; teinte: number }

export interface QuestionPrenom {
  /** le rang du personnage montré */
  personnage: number;
  /** quatre prénoms, dont le bon */
  choix: string[];
}
export interface Prenoms { personnages: Personnage[]; questions: QuestionPrenom[] }

/** « cheveux bouclés, lunettes » : ce que lit un lecteur d'écran sur un personnage. */
export const ditPersonnage = (p: { coiffure: number; accessoire: number }): string =>
  p.accessoire === 0 ? COIFFURES[p.coiffure] : `${COIFFURES[p.coiffure]}, ${ACCESSOIRES[p.accessoire]}`;

export function personnagesPrenoms(graine: number, nombre: number): Prenoms {
  const a = alea(graine);
  // chaque coiffure sert une fois : deux personnages d'une même manche ne se ressemblent jamais
  const coiffures = a.tire(plage(0, COIFFURES.length - 1), nombre);
  const prenoms = a.tire(PRENOMS, Math.max(nombre, 4));
  const personnages = coiffures.map((coiffure, i) => ({
    prenom: prenoms[i], coiffure, accessoire: a.entier(0, ACCESSOIRES.length - 1), teinte: a.entier(0, 3),
  }));
  const questions = a.melange(plage(0, nombre - 1)).map((personnage) => {
    const bon = personnages[personnage].prenom;
    return { personnage, choix: a.melange([bon, ...a.tire(prenoms.filter((p) => p !== bon), 3)]) };
  });
  return { personnages, questions };
}
