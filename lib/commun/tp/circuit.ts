// La paillasse Circuits (décision 0012) : un générateur, des dipôles, une voie de mesure, et des fils à poser entre les bornes.
// Le montage attendu est un circuit en série : générateur, interrupteur (s'il y en a un), résistance, condensateur.
// Fonctions pures : le navigateur s'en sert pour dessiner et tracer la courbe, le serveur pour rejouer la manipulation.
// Les tensions sont en volts, les résistances en ohms, les capacités en farads, les durées en secondes.
import type { Faute } from "./types";

export interface Dipole {
  id: string;
  genre: "resistance" | "condensateur" | "interrupteur";
  bornes: [string, string];
}

export interface ReglagesCircuit {
  /** le générateur, ou la sortie du microcontrôleur : sa borne +, sa borne −, sa tension */
  generateur: { plus: string; moins: string; E: number };
  dipoles: Dipole[];
  /** la voie de mesure et sa masse ; sans masse propre (microcontrôleur), la mesure se fait par rapport à la borne − */
  mesure: { voie: string; masse: string | null };
  R: number;
  /** la capacité du condensateur ; pour un capteur de niveau, sa capacité à vide */
  C: number;
  /** pour un capteur de niveau : ce que chaque centimètre d'eau ajoute à la capacité ; 0 sinon */
  parCm: number;
  /** les niveaux d'eau que l'élève peut choisir, en cm ; vide s'il n'y a pas de capteur */
  niveaux: number[];
  /** vrai si l'élève lit le temps caractéristique sur la courbe ; faux si l'appareil l'affiche */
  lecture: boolean;
  /** la durée d'une acquisition */
  duree: number;
}

/** Ce que la voie mesure dans un circuit en série bien fermé. */
export type Mesure = "uC" | "uC-inverse" | "uR" | "uR-inverse" | "generateur" | "rien" | "absente";
export type Montage =
  /** les deux bornes du générateur sont reliées par des fils */
  | { etat: "court-circuit" }
  /** une borne n'est reliée à rien, ou la boucle n'est pas fermée */
  | { etat: "ouvert" }
  /** plus de deux bornes sur un même nœud : ce n'est plus un circuit en série */
  | { etat: "derivation" }
  /** un circuit en série ; la tension mesurée vaut dR × u_R + dC × u_C */
  | { etat: "serie"; mesure: Mesure; dR: number; dC: number };

export interface EtatCircuit {
  /** les fils posés : chacun relie deux bornes */
  fils: [string, string][];
  /** le niveau d'eau du capteur, en cm */
  niveau: number;
  /** les acquisitions faites : le montage à ce moment-là, le niveau d'eau, et le temps caractéristique affiché s'il y en a un */
  acquisitions: { montage: Montage; niveau: number; tau: number | null }[];
  /** le temps caractéristique que l'élève a lu sur la courbe */
  lu: number | null;
}

export type GesteCircuit =
  | { g: "relier"; a: string; b: string }
  | { g: "retirer"; a: string; b: string }
  | { g: "acquerir" }
  | { g: "niveau"; h: number }
  | { g: "lire"; tau: number };

export const CIRCUIT_INITIAL: EtatCircuit = { fils: [], niveau: 0, acquisitions: [], lu: null };
/** Le nombre de fils qu'on peut poser : assez pour tous les montages, pas plus. */
export const FILS_MAX = 12;

/** Toutes les bornes de la paillasse. */
export function bornes(r: ReglagesCircuit): string[] {
  return [r.generateur.plus, r.generateur.moins, ...r.dipoles.flatMap((d) => d.bornes), r.mesure.voie, ...(r.mesure.masse ? [r.mesure.masse] : [])];
}
const memeFil = (f: [string, string], a: string, b: string) => (f[0] === a && f[1] === b) || (f[0] === b && f[1] === a);

/** La capacité pour un niveau d'eau donné, et le temps caractéristique τ = R × C. */
export const capacite = (r: ReglagesCircuit, niveau: number): number => r.C + r.parCm * niveau;
export const tauVrai = (r: ReglagesCircuit, niveau = 0): number => r.R * capacite(r, niveau);

/** Lit le montage : les bornes reliées par des fils forment des nœuds ; on suit alors la boucle de la borne + à la borne −. */
export function analyse(r: ReglagesCircuit, fils: readonly [string, string][]): Montage {
  // les nœuds : chaque borne rejoint le groupe des bornes auxquelles un fil la relie
  const parent = new Map(bornes(r).map((b) => [b, b]));
  const noeud = (b: string): string => { let x = b; while (parent.get(x) !== x) x = parent.get(x)!; return x; };
  for (const [a, b] of fils) if (parent.has(a) && parent.has(b)) parent.set(noeud(a), noeud(b));
  const { plus, moins } = r.generateur;
  if (noeud(plus) === noeud(moins)) return { etat: "court-circuit" };
  // dans un circuit en série, chaque nœud porte exactement deux bornes de composants
  const compte = new Map<string, number>();
  for (const b of [plus, moins, ...r.dipoles.flatMap((d) => d.bornes)]) compte.set(noeud(b), (compte.get(noeud(b)) ?? 0) + 1);
  if ([...compte.values()].some((n) => n > 2)) return { etat: "derivation" };
  if ([...compte.values()].some((n) => n < 2)) return { etat: "ouvert" };
  // on suit la boucle depuis la borne + : à chaque nœud, on note les dipôles déjà traversés
  const traverses = new Map<string, { R: number; C: number }>([[noeud(plus), { R: 0, C: 0 }]]);
  const restants = [...r.dipoles];
  let ici = noeud(plus);
  let chute = { R: 0, C: 0 };
  while (restants.length) {
    const i = restants.findIndex((d) => noeud(d.bornes[0]) === ici || noeud(d.bornes[1]) === ici);
    if (i < 0) return { etat: "ouvert" };
    const [d] = restants.splice(i, 1);
    ici = noeud(d.bornes[0]) === ici ? noeud(d.bornes[1]) : noeud(d.bornes[0]);
    chute = { R: chute.R + (d.genre === "resistance" ? 1 : 0), C: chute.C + (d.genre === "condensateur" ? 1 : 0) };
    traverses.set(ici, chute);
  }
  if (ici !== noeud(moins)) return { etat: "ouvert" };
  // la mesure : la différence de potentiel entre le nœud de la voie et celui de la masse
  const voie = traverses.get(noeud(r.mesure.voie));
  const masse = traverses.get(noeud(r.mesure.masse ?? moins));
  if (!voie || !masse) return { etat: "serie", mesure: "absente", dR: 0, dC: 0 };
  const dR = masse.R - voie.R, dC = masse.C - voie.C;
  const mesure: Mesure = dR === 0 && dC === 1 ? "uC" : dR === 0 && dC === -1 ? "uC-inverse" : dR === 1 && dC === 0 ? "uR" : dR === -1 && dC === 0 ? "uR-inverse" : dR === 0 && dC === 0 ? "rien" : "generateur";
  return { etat: "serie", mesure, dR, dC };
}

/** La tension mesurée t secondes après la fermeture du circuit ; 0 si le montage ne permet aucune mesure. */
export function tension(r: ReglagesCircuit, montage: Montage, niveau: number, t: number): number {
  if (montage.etat !== "serie") return 0;
  const decroit = Math.exp(-Math.max(0, t) / tauVrai(r, niveau));
  const E = r.generateur.E;
  return montage.dR * E * decroit + montage.dC * E * (1 - decroit);
}

/** Applique un geste. Un geste impossible (un fil sur une borne qui n'existe pas, un treizième fil) ne change rien. */
export function gesteCircuit(r: ReglagesCircuit, etat: EtatCircuit, g: GesteCircuit): EtatCircuit {
  switch (g.g) {
    case "relier": {
      const connues = bornes(r);
      if (g.a === g.b || !connues.includes(g.a) || !connues.includes(g.b) || etat.fils.length >= FILS_MAX || etat.fils.some((f) => memeFil(f, g.a, g.b))) return etat;
      return { ...etat, fils: [...etat.fils, [g.a, g.b]] };
    }
    case "retirer": return { ...etat, fils: etat.fils.filter((f) => !memeFil(f, g.a, g.b)) };
    case "niveau": return r.niveaux.includes(g.h) ? { ...etat, niveau: g.h } : etat;
    case "acquerir": {
      if (etat.acquisitions.length >= 40) return etat;
      const montage = analyse(r, etat.fils);
      // l'appareil n'affiche un temps caractéristique que s'il mesure bien la tension du condensateur
      const tau = !r.lecture && montage.etat === "serie" && montage.mesure === "uC" ? tauVrai(r, etat.niveau) : null;
      return { ...etat, acquisitions: [...etat.acquisitions, { montage, niveau: etat.niveau, tau }], lu: null };
    }
    case "lire": return Number.isFinite(g.tau) && g.tau > 0 && g.tau < 1e4 ? { ...etat, lu: g.tau } : etat;
  }
}

export const rejoueCircuit = (r: ReglagesCircuit, gestes: readonly GesteCircuit[]): EtatCircuit => gestes.reduce((etat, g) => gesteCircuit(r, etat, g), CIRCUIT_INITIAL);

/** Ce qui ne va pas dans un montage, dit simplement ; vide si le montage est le bon. */
export function defautDuMontage(montage: Montage): string | null {
  if (montage.etat === "court-circuit") return "Court-circuit : un fil relie directement les deux bornes du générateur.";
  if (montage.etat === "ouvert") return "Le circuit est ouvert : il manque un fil, ou un composant n'est relié que d'un côté.";
  if (montage.etat === "derivation") return "Ce n'est pas un circuit en série : trois bornes ou plus se rejoignent au même endroit.";
  switch (montage.mesure) {
    case "uC": return null;
    case "uC-inverse": return "La voie et la masse sont inversées : la tension mesurée est négative.";
    case "uR": case "uR-inverse": return "La voie mesure la tension aux bornes de la résistance, pas celle du condensateur.";
    case "generateur": return "La voie mesure la tension du générateur, pas celle du condensateur.";
    case "rien": return "Les deux bornes de mesure sont au même potentiel : la tension mesurée reste nulle.";
    case "absente": return "La voie de mesure n'est pas branchée sur le circuit.";
  }
}

/**
 * Le bilan de la manipulation. `mesures` porte ce que l'élève a obtenu : le temps caractéristique lu sur la courbe,
 * ou ceux que l'appareil a affichés pour chaque niveau d'eau.
 */
export function bilanCircuit(r: ReglagesCircuit, etat: EtatCircuit): { mesures: Record<string, number>; fautes: Faute[]; score: number } {
  const fautes: Faute[] = [];
  const mesures: Record<string, number> = {};
  const faute = (code: string, grave: boolean, texte: string) => fautes.push({ code, grave, texte });
  const derniere = etat.acquisitions[etat.acquisitions.length - 1];
  if (!derniere) {
    faute("acquisition", true, "Tu n'as pas lancé d'acquisition.");
  } else {
    const defaut = defautDuMontage(derniere.montage);
    if (defaut) faute("montage", !(derniere.montage.etat === "serie" && derniere.montage.mesure === "uC-inverse"), `À la dernière acquisition : ${defaut.charAt(0).toLowerCase()}${defaut.slice(1)}`);
  }
  if (r.lecture) {
    const tau = tauVrai(r);
    if (etat.lu === null) faute("lecture", true, "Tu n'as pas relevé le temps caractéristique sur la courbe.");
    else {
      mesures.tau = etat.lu;
      const ecart = Math.abs(etat.lu - tau) / tau;
      if (ecart > 0.15) faute("lecture", true, "Ta lecture du temps caractéristique est à plus de 15 % de la valeur exacte.");
      else if (ecart > 0.06) faute("lecture", false, "Ta lecture du temps caractéristique est à plus de 6 % de la valeur exacte : place le curseur à 63 % de la tension finale.");
    }
  } else {
    for (const a of etat.acquisitions) if (a.tau !== null) mesures[`tau${a.niveau}`] = a.tau;
    if (Object.keys(mesures).length < 3) faute("niveaux", false, "Il faut des mesures pour trois niveaux d'eau au moins.");
  }
  const score = Math.max(0, 1 - fautes.reduce((s, f) => s + (f.grave ? 0.5 : 0.25), 0));
  return { mesures, fautes, score };
}
