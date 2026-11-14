// Le guide de la paillasse du microcontrôleur : ce qu'un professeur, debout à côté de l'élève, lui dirait de faire
// maintenant. Il se calcule à partir de l'état de la manipulation et de ce que la vue retient en plus : la saisie
// ouverte, le fil que l'élève vient de toucher. Ici aussi, ce que la vue fait d'un geste : piquer un conducteur ohmique.
// Le guide lit le montage tel qu'il est : un fil est à sa place s'il relie deux bornes que le montage du protocole
// réunit, quelle que soit la rangée choisie. Il ne dit jamais la valeur à lire : il dit où la lire, et quand lâcher.
// Fonctions pures : la vue s'en sert pour placer la main et écrire la phrase ; les tests suivent le guide jusqu'au bout
// et vérifient que la manipulation obtenue est sans faute (tests/unitaires/tp/microcontroleur-guide.test.ts).
import type { GesteBrut } from "../types";
import { ohms } from "./circuit";
import { BROCHES, HAUTEUR, LAMES, RANGEES, composant, niveauBienLu, placeDe, rangeesDe, type Affichage, type EtatMicrocontroleur, type ReglagesMicrocontroleur } from "./microcontroleur";

/** Ce que la vue retient en plus de l'état des règles. */
export interface VueMicrocontroleur {
  /** la saisie ouverte dans le carnet : le niveau, puis la durée ; sinon null */
  saisie: "niveau" | "duree" | null;
  /** le fil que l'élève vient de toucher, par ses deux bornes (« a:b ») : sa croix est affichée ; sinon null */
  filChoisi: string | null;
}

export type BoutonMicrocontroleur = "noter" | "effacer" | "fini";
/** Un pas du guide : la phrase, et le geste à montrer. `etape` : le rang de l'étape du protocole en cours. */
export type PasDuGuide = { cle: string; texte: string; etape: number } & (
  /** prendre un conducteur ohmique et le piquer : sur la plaque d'essai (« place0 »), ou dans sa case (« boite ») */
  | { geste: "glisser"; objet: string; cible: string }
  /** tirer un fil d'une borne à une autre */
  | { geste: "relier"; de: string; vers: string }
  /** toucher un fil posé, puis la croix qui le retire */
  | { geste: "toucher"; quoi: "fil" | "croix"; a: string; b: string }
  /** toucher le bouton de la carte */
  | { geste: "toucher"; quoi: "mesurer" }
  /** garder le doigt sur « Verser » ou sur « Vider » */
  | { geste: "maintenir"; poussoir: "verser" | "vider" }
  /** la loupe de la cuve, ou le moniteur */
  | { geste: "montrer"; quoi: "loupe" | "moniteur" }
  /** une touche sous la scène */
  | { geste: "bouton"; bouton: BoutonMicrocontroleur }
);

/** Piquer un conducteur ohmique sur une cible : le geste que ça donne aux règles. */
export const pose = (objet: string, cible: string): GesteBrut => (cible.startsWith("place") ? { g: "poser", quoi: objet, ou: Number(cible.slice(5)) } : { g: "ranger", quoi: objet });

/** Le nom d'une borne dans une phrase. */
export const NOMS: Record<string, string> = {
  [BROCHES.v5]: "la broche 5 V", [BROCHES.d2]: "la broche D2", [BROCHES.a0]: "la broche A0", [BROCHES.a1]: "la broche A1", [BROCHES.gnd]: "la broche GND",
  [RANGEES[0]]: "la rangée 1 de la plaque d'essai", [RANGEES[1]]: "la rangée 2 de la plaque d'essai", [RANGEES[2]]: "la rangée 3 de la plaque d'essai",
  [LAMES[0]]: "la lame gauche du capteur", [LAMES[1]]: "la lame droite du capteur",
};

/** En dessous de ce niveau, la cuve est vide. */
const VIDE = 0.05;
/** L'écart entre deux niveaux relevés, et le niveau à ne pas dépasser en versant : la cuve déborde à 12 cm. */
const ECART = 2.8;
const PLEIN = HAUTEUR - 0.6;

/** Les groupes de bornes qu'une liste de fils réunit : chaque borne y trouve le nom de son groupe. */
function groupes(fils: readonly (readonly [string, string])[]): (borne: string) => string {
  const parent = new Map<string, string>();
  const groupe = (borne: string): string => {
    if (!parent.has(borne)) parent.set(borne, borne);
    let x = borne;
    while (parent.get(x) !== x) x = parent.get(x)!;
    return x;
  };
  for (const [a, b] of fils) parent.set(groupe(a), groupe(b));
  return groupe;
}

/** Vrai si une ligne du moniteur est une vraie mesure, faite avec le conducteur ohmique du protocole. */
const bonneMesure = (r: ReglagesMicrocontroleur, ligne: Affichage | undefined): ligne is Affichage =>
  ligne !== undefined && ligne.nature === "charge" && ligne.duree !== null && Math.abs(ligne.R - r.demande.R) <= 0.02 * r.demande.R;

/** Les niveaux déjà relevés comme il faut dans le carnet, du plus bas au plus haut. */
export function niveauxReleves(r: ReglagesMicrocontroleur, etat: EtatMicrocontroleur): number[] {
  return etat.carnet.flatMap((n) => (bonneMesure(r, etat.lignes[n.mesure]) ? [etat.lignes[n.mesure].niveau] : [])).sort((a, b) => a - b).filter((h, i, tous) => i === 0 || h - tous[i - 1] > 0.3);
}

/**
 * Le niveau d'eau à atteindre pour le prochain relevé, comme une fourchette : la cuve vide d'abord, puis de plus en
 * plus haut ; s'il n'y a plus de place en haut, entre deux niveaux déjà relevés. Null quand le carnet est complet.
 */
export function prochainNiveau(r: ReglagesMicrocontroleur, etat: EtatMicrocontroleur): { bas: number; haut: number } | null {
  const faits = niveauxReleves(r, etat);
  if (faits.length === 0 || faits[0] > VIDE) return { bas: 0, haut: 0 };
  const etendue = faits[faits.length - 1] - faits[0];
  if (faits.length >= r.demande.releves && etendue >= 6) return null;
  const sommet = faits[faits.length - 1];
  if (sommet + ECART <= PLEIN) return { bas: Math.round((sommet + ECART) * 100) / 100, haut: PLEIN };
  // plus de place au-dessus : le tiers du milieu du plus grand intervalle entre deux niveaux relevés
  let large = 1.2, meilleur: { bas: number; haut: number } | null = null;
  for (let i = 1; i < faits.length; i++) {
    const intervalle = faits[i] - faits[i - 1];
    if (intervalle > large) { large = intervalle; meilleur = { bas: Math.round((faits[i - 1] + intervalle / 3) * 100) / 100, haut: Math.round((faits[i] - intervalle / 3) * 100) / 100 }; }
  }
  return meilleur;
}

/**
 * Ce qu'il faut faire maintenant. La fonction rend toujours un pas : le premier geste qui manque, dans l'ordre du
 * protocole. Elle ne lit que ce qu'un professeur verrait par-dessus l'épaule de l'élève.
 */
export function prochain(r: ReglagesMicrocontroleur, etat: EtatMicrocontroleur, v: VueMicrocontroleur): PasDuGuide {
  const E = { piquer: 0, d2: 1, a0: 2, gnd: 3, vide: 4, noter: 5, niveaux: 6, encore: 7 };
  const fini: PasDuGuide = { cle: "fini", etape: E.encore, texte: "Ton carnet est complet. Touche « J'ai fini » pour appeler le professeur.", geste: "bouton", bouton: "fini" };
  const resistance = r.boite.find((c) => c.valeur === r.demande.R);
  if (!resistance) return fini;
  const faits = niveauxReleves(r, etat);
  /** le rang du relevé en cours : la cuve vide, puis le premier niveau, puis les suivants */
  const rang = faits.length;
  const etapeMesure = rang === 0 ? E.vide : rang === 1 ? E.niveaux : E.encore;
  const etapeNote = rang === 0 ? E.noter : rang === 1 ? E.niveaux : E.encore;

  // ----- la saisie ouverte : lire, puis écrire -----
  // la cuve vide : le protocole donne lui-même ce niveau, il n'y a rien à lire
  if (v.saisie === "niveau") return { cle: "lire-niveau", etape: etapeNote, texte: etat.niveau <= VIDE ? "La cuve est vide : écris 0 avec les chiffres, puis touche « Noter »." : "Lis dans la loupe la graduation en face de la surface de l'eau, au creux du ménisque. Écris-la avec les chiffres, puis touche « Noter ».", geste: "montrer", quoi: "loupe" };
  if (v.saisie === "duree") return { cle: "lire-duree", etape: etapeNote, texte: "Lis la durée sur le moniteur. Écris-la avec les chiffres, puis touche « Noter ».", geste: "montrer", quoi: "moniteur" };

  // ----- le conducteur ohmique -----
  const intrus = etat.plaque.map((id) => composant(r, id)).find((c) => c !== undefined && c.id !== resistance.id);
  if (intrus) return { cle: `ranger-${intrus.id}`, etape: E.piquer, texte: `Le conducteur ohmique de ${ohms(intrus.valeur)} n'est pas celui du protocole. Remets-le dans sa case, dans la boîte.`, geste: "glisser", objet: intrus.id, cible: "boite" };
  const place = placeDe(etat, resistance.id);
  if (place < 0) return { cle: "piquer", etape: E.piquer, texte: `Prends le conducteur ohmique de ${ohms(resistance.valeur)} et pique-le sur la plaque d'essai, à cheval sur deux rangées. Sa valeur est écrite dessus.`, geste: "glisser", objet: resistance.id, cible: "place0" };

  // ----- les fils : D2 d'un côté du conducteur ohmique ; de l'autre, A0 et une lame ; l'autre lame à GND -----
  const [x, y] = rangeesDe(place);
  const montages = [[x, y], [y, x]].flatMap(([cote, commun]) => [[LAMES[0], LAMES[1]], [LAMES[1], LAMES[0]]].map(([lame, autre]): [string, string, number][] => [
    [BROCHES.d2, cote, E.d2], [BROCHES.a0, commun, E.a0], [lame, commun, E.a0], [autre, BROCHES.gnd, E.gnd],
  ]));
  // l'élève a pu choisir l'autre rangée, ou l'autre lame : le guide prend le montage qui garde le plus de ses fils
  const places = (liaisons: [string, string, number][]) => { const voulu = groupes(liaisons.map(([a, b]) => [a, b])); return etat.fils.filter(([a, b]) => voulu(a) === voulu(b)).length; };
  const liaisons = montages.reduce((meilleur, m) => (places(m) > places(meilleur) ? m : meilleur));
  const voulu = groupes(liaisons.map(([a, b]) => [a, b]));
  const enTrop = etat.fils.find(([a, b]) => voulu(a) !== voulu(b));
  if (enTrop) {
    const [a, b] = enTrop;
    if (v.filChoisi === `${a}:${b}`) return { cle: `croix-${a}-${b}`, etape: E.d2, texte: "Touche la croix : le fil s'en va.", geste: "toucher", quoi: "croix", a, b };
    return { cle: `retirer-${a}-${b}`, etape: E.d2, texte: `${etat.securite ? "La carte s'est coupée : une de ses broches est en court-circuit. " : ""}Le fil entre ${NOMS[a]} et ${NOMS[b]} n'est pas à sa place. Touche ce fil, puis la croix qui apparaît.`, geste: "toucher", quoi: "fil", a, b };
  }
  const relies = groupes(etat.fils);
  const manque = liaisons.find(([a, b]) => relies(a) !== relies(b));
  if (manque) return { cle: `relier-${manque[0]}-${manque[1]}`, etape: manque[2], texte: `Tire un fil de ${NOMS[manque[0]]} à ${NOMS[manque[1]]}.`, geste: "relier", de: manque[0], vers: manque[1] };

  // ----- une ligne du carnet qui ne va pas : elle s'efface, et se note de nouveau -----
  const fausse = etat.carnet.some((n) => {
    const ligne = etat.lignes[n.mesure];
    return !bonneMesure(r, ligne) || !niveauBienLu(n.h, ligne.niveau) || Math.abs(n.t - (ligne.duree ?? 0)) > 1;
  });
  if (fausse) return { cle: `effacer-${etat.carnet.length}`, etape: etapeNote, texte: "Une ligne de ton carnet ne correspond pas à ce que montraient la cuve et le moniteur. Touche « Effacer une ligne ».", geste: "bouton", bouton: "effacer" };

  // ----- les relevés : amener l'eau au niveau voulu, mesurer, noter -----
  const cible = prochainNiveau(r, etat);
  if (!cible) return fini;
  const numero = rang + 1;
  const vide = cible.haut <= VIDE;
  if (etat.niveau > cible.haut) return { cle: `vider-${numero}`, etape: etapeMesure, texte: vide ? "Garde le doigt sur « Vider » jusqu'à ce que la cuve soit vide." : "Garde le doigt sur « Vider ». Lâche dès que la consigne change.", geste: "maintenir", poussoir: "vider" };
  if (etat.niveau < cible.bas) return { cle: `verser-${numero}`, etape: etapeMesure, texte: "Garde le doigt sur « Verser ». Lâche dès que la consigne change.", geste: "maintenir", poussoir: "verser" };
  const derniere = etat.lignes[etat.lignes.length - 1];
  const aJour = bonneMesure(r, derniere) && Math.abs(derniere.niveau - etat.niveau) < 0.005;
  if (!aJour) return { cle: `mesurer-${numero}`, etape: etapeMesure, texte: vide ? "La cuve est vide. Touche le bouton « Mesurer » de la carte." : "Lâche : ce niveau convient. Touche le bouton « Mesurer » de la carte.", geste: "toucher", quoi: "mesurer" };
  return { cle: `noter-${numero}`, etape: etapeNote, texte: "La durée est affichée sur le moniteur. Touche « Noter la mesure ».", geste: "bouton", bouton: "noter" };
}
