// La famille « Retenir ce qu'on a vu » : un objet qui manque, une forme qui change, un code vu une seconde,
// un intrus, des formes et leurs couleurs.
import { FORMES, FORMES_COLOREES, TEINTES, type FormeColoree } from "./formes";
import { ID_PICTOS } from "./pictos";
import { alea, plage } from "./tirage";

// ---------- L'objet manquant ----------

/** Le nombre d'objets montrés à chaque niveau. */
export const NIVEAUX_MANQUANT = plage(5, 10);

export interface Manquant {
  /** les objets à regarder, dans l'ordre où ils sont posés */
  montres: string[];
  /** les mêmes, mélangés, un en moins */
  restants: string[];
  manquant: string;
  /** quatre réponses : l'objet qui manque et trois objets qui n'ont pas été montrés */
  choix: string[];
}

export function objetManquant(graine: number, nombre: number): Manquant {
  const a = alea(graine);
  const tires = a.tire(ID_PICTOS, nombre + 3);
  const montres = tires.slice(0, nombre);
  const manquant = a.parmi(montres);
  return { montres, restants: a.melange(montres.filter((p) => p !== manquant)), manquant, choix: a.melange([manquant, ...tires.slice(nombre)]) };
}

// ---------- Qu'est-ce qui a changé ? ----------

/** Un niveau : le nombre de formes, les colonnes de la grille, et un changement discret ou non. */
export interface NiveauChange {
  formes: number;
  colonnes: number;
  /** discret : la forme change de dessin ou de teinte, pas des deux */
  discret: boolean;
}

export const NIVEAUX_CHANGE: NiveauChange[] = [
  { formes: 4, colonnes: 2, discret: false },
  { formes: 6, colonnes: 3, discret: false },
  { formes: 9, colonnes: 3, discret: false },
  { formes: 9, colonnes: 3, discret: true },
  { formes: 12, colonnes: 4, discret: false },
  { formes: 12, colonnes: 4, discret: true },
  { formes: 16, colonnes: 4, discret: false },
  { formes: 16, colonnes: 4, discret: true },
];

export interface Planche {
  colonnes: number;
  avant: FormeColoree[];
  apres: FormeColoree[];
  /** le rang de la seule forme qui a changé */
  change: number;
}

const memeForme = (a: FormeColoree, b: FormeColoree) => a.forme === b.forme && a.teinte === b.teinte;

/** Une planche de formes toutes différentes, et la même planche où une seule forme a changé. */
export function plancheChange(graine: number, niveau: NiveauChange): Planche {
  const a = alea(graine);
  const avant = a.tire(FORMES_COLOREES, niveau.formes);
  const change = a.entier(0, avant.length - 1);
  const ancienne = avant[change];
  const differences = (f: FormeColoree) => Number(f.forme !== ancienne.forme) + Number(f.teinte !== ancienne.teinte);
  const voulues = niveau.discret ? 1 : 2;
  // de préférence une forme absente de la planche, pour que la nouvelle ne fasse pas doublon
  const libres = FORMES_COLOREES.filter((f) => !avant.some((g) => memeForme(f, g)));
  const candidates = [libres.filter((f) => differences(f) === voulues), FORMES_COLOREES.filter((f) => differences(f) === voulues)].find((liste) => liste.length > 0)
    ?? FORMES_COLOREES.filter((f) => differences(f) > 0);
  const apres = avant.slice();
  apres[change] = a.parmi(candidates);
  return { colonnes: niveau.colonnes, avant, apres, change };
}

// ---------- Flash ----------

/** Le nombre de signes du code à chaque niveau. */
export const NIVEAUX_FLASH = plage(4, 8);

/**
 * Les signes d'un code : des lettres et des chiffres qui ne se confondent pas. Ni O ni 0, ni I ni 1 ;
 * pas de S, de B, de G ni de Z, trop proches du 5, du 8, du 6 et du 2.
 */
export const LETTRES_FLASH = [..."ACDEFHKLMNPRTVXY"];
export const CHIFFRES_FLASH = [..."23456789"];
export const SIGNES_FLASH = [...LETTRES_FLASH, ...CHIFFRES_FLASH];

/** Un code de lettres et de chiffres, avec au moins une lettre et un chiffre, sans deux fois le même signe de suite. */
export function codeFlash(graine: number, longueur: number): string[] {
  const a = alea(graine);
  const code: string[] = [];
  while (code.length < longueur) {
    const signe = a.suivant() < 0.55 ? a.parmi(LETTRES_FLASH) : a.parmi(CHIFFRES_FLASH);
    if (signe !== code[code.length - 1]) code.push(signe);
  }
  const estChiffre = (s: string) => CHIFFRES_FLASH.includes(s);
  // un code tout en lettres ou tout en chiffres : un signe de l'autre sorte prend la place d'un des signes
  if (code.every(estChiffre) || !code.some(estChiffre)) {
    const reserve = (code.every(estChiffre) ? LETTRES_FLASH : CHIFFRES_FLASH).filter((s) => !code.includes(s));
    code[a.entier(0, code.length - 1)] = a.parmi(reserve);
  }
  return code;
}

// ---------- L'intrus ----------

/** Le nombre d'objets de la planche à chaque niveau. */
export const NIVEAUX_INTRUS = plage(5, 12);

export interface Intrus {
  /** la planche à mémoriser */
  avant: string[];
  /** la planche suivante : les mêmes objets mélangés, sauf un, remplacé par l'intrus */
  apres: string[];
  intrus: string;
  /** l'objet que l'intrus a remplacé */
  parti: string;
}

export function plancheIntrus(graine: number, nombre: number): Intrus {
  const a = alea(graine);
  const tires = a.tire(ID_PICTOS, nombre + 1);
  const avant = tires.slice(0, nombre);
  const intrus = tires[nombre];
  const parti = a.parmi(avant);
  return { avant, apres: a.melange(avant.map((p) => (p === parti ? intrus : p))), intrus, parti };
}

// ---------- Formes et couleurs ----------

/** Le nombre de formes montrées à chaque niveau. */
export const NIVEAUX_DUOS = plage(3, 8);
/** Le nombre de formes dont la couleur est demandée à chaque manche. */
export const QUESTIONS_DUOS = 3;

export interface Duos {
  /** des formes toutes différentes, chacune d'une teinte */
  formes: FormeColoree[];
  /** les rangs des formes dont la couleur est demandée, dans l'ordre des questions */
  demandes: number[];
}

export function formesDuos(graine: number, nombre: number): Duos {
  const a = alea(graine);
  const dessins = a.tire(FORMES, nombre);
  // les teintes tournent dans un ordre mélangé : toutes servent avant qu'une ne revienne
  const teintes: string[] = [];
  while (teintes.length < nombre) teintes.push(...a.melange(TEINTES).map((t) => t.id));
  const formes = dessins.map((f, i) => ({ forme: f.id, teinte: teintes[i] }));
  return { formes, demandes: a.tire(plage(0, nombre - 1), QUESTIONS_DUOS) };
}
