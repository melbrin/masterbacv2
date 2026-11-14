// Le guide de la paillasse Pile : ce qu'un professeur, debout à côté de l'élève, lui dirait de faire maintenant.
// Il se calcule à partir de l'état de la manipulation et de ce que la vue retient en plus : la saisie ouverte.
// Ici aussi, poser un objet : ce que ce geste donne aux règles, et la phrase qui dit ce qui s'est passé.
// Fonctions pures : la vue s'en sert pour placer la main et écrire la phrase ; les tests suivent le guide jusqu'au bout
// et vérifient que la manipulation obtenue est sans faute (tests/unitaires/tp/pile-guide.test.ts).
import type { GesteBrut } from "../types";
import { POSITIONS, clePile, demiPileDe, regles, tensionDe, type DemiPile, type EtatPile, type ReglagesPile } from "./pile";

/** Ce que la vue retient en plus de l'état des règles : la saisie d'une mesure, d'abord la tension lue, puis la lame jugée positive. */
export interface VuePile { saisie: "tension" | "borne" | null }

// ---------- les noms ----------

/** « le zinc » devient « zinc », « l'argent » devient « argent ». */
export const nu = (metal: string): string => metal.replace(/^(le |l')/, "");
/** « lame de zinc », « lame d'argent » */
export const lameDe = (d: DemiPile): string => `lame ${/^[aeiouyéè]/i.test(nu(d.metal)) ? "d'" : "de "}${nu(d.metal)}`;
/** Le nom d'une borne dans une phrase : « la borne COM », « la lame de zinc ». */
export const nomBorne = (r: ReglagesPile, id: string): string => {
  if (id === "com") return "la borne COM";
  if (id === "v") return "la borne V";
  if (id === "a") return "la borne mA";
  const d = demiPileDe(r, id);
  return d ? `la ${lameDe(d)}` : "cette borne";
};

// ---------- les fils : où toucher pour en retirer un ----------

/** Une borne du dessin : son nom dans les règles, et sa place. */
export interface PlaceDeBorne { id: string; x: number; y: number }
interface Place { x: number; y: number }

/** La flèche d'un fil entre deux bornes : il pend d'autant plus qu'il est long. C'est le calcul du kit (components/tp/kit/fils.tsx). */
const fleche = (a: Place, b: Place): number => Math.min(34, 8 + Math.hypot(b.x - a.x, b.y - a.y) * 0.16);
/** Le point d'un fil, de 0 (sa première borne) à 1 (la seconde) : le fil est une courbe, qui pend en son milieu. */
export function pointDuFil(a: Place, b: Place, t: number): Place {
  const c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + fleche(a, b) };
  return { x: (1 - t) ** 2 * a.x + 2 * t * (1 - t) * c.x + t ** 2 * b.x, y: (1 - t) ** 2 * a.y + 2 * t * (1 - t) * c.y + t ** 2 * b.y };
}
/** La zone de toucher d'une borne fait 22 unités de rayon ; une croix posée à moins de 24 unités d'une borne ne se touche plus. */
const ZONE = 24;
/** La distance d'un point à la borne la plus proche, sans compter celles qu'on écarte. */
const marge = (bornes: readonly PlaceDeBorne[], p: Place, sauf: readonly string[] = []): number =>
  Math.min(Infinity, ...bornes.filter((b) => !sauf.includes(b.id)).map((b) => Math.hypot(p.x - b.x, p.y - b.y)));

/**
 * Où toucher pour retirer le fil tendu entre deux bornes. Le kit dessine sa croix au milieu du fil. Si ce milieu tombe
 * sous la zone de toucher d'une autre borne, la croix ne se touche plus : `secours` est vrai, et le point rendu est le
 * point du fil le plus loin de toute borne, où la vue pose une croix de secours. `libre` : la distance de ce point à la
 * borne la plus proche. Null si l'une des bornes n'est pas dans le dessin.
 */
export function croixDuFil(bornes: readonly PlaceDeBorne[], a: string, b: string): { ou: Place; secours: boolean; libre: number } | null {
  const pa = bornes.find((x) => x.id === a), pb = bornes.find((x) => x.id === b);
  if (!pa || !pb) return null;
  const milieu = pointDuFil(pa, pb, 0.5);
  if (marge(bornes, milieu, [a, b]) >= ZONE) return { ou: milieu, secours: false, libre: marge(bornes, milieu) };
  let meilleur = milieu, libre = -1;
  for (let i = 3; i <= 17; i++) {
    const p = pointDuFil(pa, pb, i / 20);
    const d = marge(bornes, p);
    if (d > libre) { libre = d; meilleur = p; }
  }
  return { ou: meilleur, secours: true, libre };
}

// ---------- poser un objet ----------

/** Ce que donne un objet posé : les gestes pour les règles, ce qui vient de se passer, et si le fusible vient de sauter. */
export interface Pose { gestes: GesteBrut[]; message: string; claque: boolean }

const CLAQUE = "Un claquement : le fusible du multimètre vient de sauter. L'ampèremètre était branché aux deux lames de la pile.";
/** Essaie un geste : s'il change la paillasse, il part aux règles ; si le fusible saute, c'est cela qui se remarque. */
export function essaie(r: ReglagesPile, etat: EtatPile, g: GesteBrut, fait: string, refus: string): Pose {
  const suite = regles.geste(r, etat, g);
  if (suite === etat) return { gestes: [], message: refus, claque: false };
  const claque = etat.fusible && !suite.fusible;
  return { gestes: [g], message: claque ? CLAQUE : fait, claque };
}

/**
 * Poser un objet sur une cible. Les objets sont « pont » et « lame-<métal> » ; les cibles, « becher-<métal> »,
 * « plateau-<métal> », « pont-<i>-<j> » (les rangs des deux béchers) et « pont-repos ». Un geste impossible ne donne rien
 * aux règles : la phrase dit pourquoi.
 */
export function pose(r: ReglagesPile, etat: EtatPile, objet: string, cible: string): Pose {
  const rien: Pose = { gestes: [], message: "", claque: false };
  if (objet === "pont") {
    if (cible === "pont-repos") return essaie(r, etat, { g: "pont", a: "repos" }, "Le pont salin est rangé.", "Le pont salin est déjà à son crochet.");
    const [, i, j] = cible.split("-");
    const a = r.demiPiles[Number(i)], b = r.demiPiles[Number(j)];
    return a && b ? essaie(r, etat, { g: "pont", a: a.id, b: b.id }, `Le pont salin relie le ${a.solution} et le ${b.solution}.`, "Le pont salin est déjà là.") : rien;
  }
  const l = demiPileDe(r, objet.replace(/^lame-/, ""));
  if (!objet.startsWith("lame-") || !l) return rien;
  if (cible.startsWith("plateau")) return essaie(r, etat, { g: "lame", l: l.id, dans: "plateau" }, `La ${lameDe(l)} est reposée sur le plateau.`, `La ${lameDe(l)} est déjà sur le plateau.`);
  const b = demiPileDe(r, cible.replace(/^becher-/, ""));
  if (!b) return rien;
  const depot = l.id !== b.id && l.potentiel < b.potentiel;
  return essaie(r, etat, { g: "lame", l: l.id, dans: b.id }, `La ${lameDe(l)} trempe dans le ${b.solution}.${depot ? " Un dépôt se forme sur la lame." : ""}`,
    etat.lames[l.id] === b.id ? `La ${lameDe(l)} est déjà dans ce bécher.` : "Il y a déjà une lame dans ce bécher : retire-la d'abord.");
}

// ---------- le prochain geste ----------

/** Un pas du guide : la phrase, et le geste à montrer. `etape` : le rang de l'étape du protocole en cours. */
export type PasDuGuide = { cle: string; texte: string; etape: number } & (
  /** prendre un objet et le poser, par leurs noms dans la vue */
  | { geste: "glisser"; objet: string; cible: string }
  /** tourner le sélecteur du multimètre jusqu'à la position `vers` */
  | { geste: "tourner"; vers: number }
  /** tirer un fil d'une borne à une autre */
  | { geste: "fil"; de: string; vers: string }
  /** retirer un fil : le toucher, puis toucher la croix qui apparaît en son milieu */
  | { geste: "retirer"; a: string; b: string }
  /** regarder l'afficheur du multimètre */
  | { geste: "montrer"; quoi: "afficheur" }
  /** une touche sous la scène */
  | { geste: "bouton"; bouton: "noter" | "recommencer" | "fini" }
);

/** La position du sélecteur qui convient à une pile : le plus petit calibre du voltmètre en courant continu qui dépasse sa tension. */
export function calibrePour(r: ReglagesPile, a: string, b: string): number {
  const tension = Math.abs(tensionDe(r, a, b));
  let meilleur = POSITIONS.findIndex((p) => p.genre === "continu");
  POSITIONS.forEach((p, i) => { if (p.genre === "continu" && tension < p.calibre - p.calibre / 2000 && p.calibre < POSITIONS[meilleur].calibre) meilleur = i; });
  return meilleur;
}

/**
 * Ce qu'il faut faire maintenant. La fonction rend toujours un pas : le premier geste qui manque, dans l'ordre du
 * protocole. Elle ne lit que ce qu'un professeur verrait par-dessus l'épaule de l'élève. Une pile mesurée sur un montage
 * fautif (sans pont salin, sur le mauvais calibre) est à refaire : le guide y ramène.
 */
export function prochain(r: ReglagesPile, etat: EtatPile, v: VuePile): PasDuGuide {
  const glisser = (cle: string, etape: number, texte: string, objet: string, cible: string): PasDuGuide => ({ cle, etape, texte, geste: "glisser", objet, cible });
  const rang = (id: string) => r.demiPiles.findIndex((d) => d.id === id);
  /** La pile en cours : la première du sujet qui n'a pas encore sa mesure, prise sur un montage sans défaut. */
  const enCours = r.piles.findIndex(([a, b]) => {
    const n = etat.notes[clePile(a, b)];
    return !(n !== undefined && n.propres && n.pont && !n.court && n.affiche !== null && n.position === calibrePour(r, a, b));
  });
  // le rang des étapes dans le protocole : la première pile en occupe cinq, les suivantes tiennent dans la dernière
  const E = enCours === 0 ? { lames: 0, pont: 1, selecteur: 2, fils: 3, lire: 4 } : { lames: 5, pont: 5, selecteur: 5, fils: 5, lire: 5 };
  const fini: PasDuGuide = { cle: "fini", etape: 5, texte: "Tout est fait. Touche « J'ai fini » pour appeler le professeur.", geste: "bouton", bouton: "fini" };

  // ----- lire : la saisie est ouverte -----
  if (v.saisie === "tension") return { cle: "lire-tension", etape: E.lire, texte: "Lis la tension sur l'afficheur. Écris-la sans son signe, puis touche « Noter ».", geste: "montrer", quoi: "afficheur" };
  if (v.saisie === "borne") {
    return { cle: "borne", etape: E.lire, geste: "montrer", quoi: "afficheur",
      texte: "Regarde le signe affiché. Pas de signe moins : la borne positive est la lame de la borne V. Un signe moins : c'est la lame de la borne COM. Touche son nom." };
  }
  // ----- le fusible a sauté : la faute est faite, on reprend tout -----
  if (!etat.fusible) return { cle: "recommencer", etape: E.fils, texte: "Le fusible du multimètre a sauté : la borne mA ne se branche jamais sur une pile. Touche « Tout recommencer ».", geste: "bouton", bouton: "recommencer" };
  if (enCours < 0) return fini;
  const [a, b] = r.piles[enCours];
  const A = demiPileDe(r, a), B = demiPileDe(r, b);
  if (!A || !B) return fini;
  // ----- un fil sur la borne mA : il part avant tout le reste, pour que rien ne fasse sauter le fusible -----
  const dangereux = etat.fils.find((f) => f.includes("a"));
  if (dangereux) return { cle: `retirer-${dangereux[0]}-${dangereux[1]}`, etape: E.lames, texte: "Un fil est branché sur la borne mA : l'ampèremètre ne se branche jamais sur une pile. Touche ce fil, puis touche la croix qui apparaît : il se retire.", geste: "retirer", a: dangereux[0], b: dangereux[1] };

  // ----- chaque lame dans la solution de son métal -----
  const egaree = r.demiPiles.find((d) => etat.lames[d.id] !== undefined && etat.lames[d.id] !== d.id);
  if (egaree) return glisser(`reposer-${egaree.id}`, E.lames, `La ${lameDe(egaree)} n'est pas dans la solution de son métal. Repose-la sur le plateau.`, `lame-${egaree.id}`, `plateau-${egaree.id}`);
  const seche = r.demiPiles.find((d) => etat.lames[d.id] === undefined);
  if (seche) return glisser(`lame-${seche.id}`, E.lames, `Plonge la ${lameDe(seche)} dans le bécher de ${seche.solution}.`, `lame-${seche.id}`, `becher-${seche.id}`);

  // ----- le pont salin entre les deux béchers de la pile -----
  if (!etat.pont || clePile(etat.pont[0], etat.pont[1]) !== clePile(a, b)) {
    const [i, j] = [rang(a), rang(b)].sort((x, y) => x - y);
    return glisser(`pont-${clePile(a, b)}`, E.pont, `${etat.pont ? "Déplace" : "Pose"} le pont salin entre le bécher de ${A.solution} et celui de ${B.solution}.`, "pont", `pont-${i}-${j}`);
  }
  // ----- le sélecteur du multimètre -----
  const calibre = calibrePour(r, a, b);
  if (etat.selecteur !== calibre) return { cle: "selecteur", etape: E.selecteur, texte: `Tourne le sélecteur du multimètre sur le voltmètre en courant continu, calibre ${POSITIONS[calibre].nom}.`, geste: "tourner", vers: calibre };

  // ----- les fils : la borne COM sur une lame de la pile, la borne V sur l'autre, et rien d'autre -----
  const lames = [a, b];
  const versLame = (f: [string, string], borne: string): string | null => (f[0] === borne && lames.includes(f[1]) ? f[1] : f[1] === borne && lames.includes(f[0]) ? f[0] : null);
  const filCom = etat.fils.find((f) => versLame(f, "com") !== null);
  const lameCom = filCom ? versLame(filCom, "com") : null;
  const filV = etat.fils.find((f) => { const l = versLame(f, "v"); return l !== null && l !== lameCom; });
  const lameV = filV ? versLame(filV, "v") : null;
  const enTrop = etat.fils.find((f) => f !== filCom && f !== filV);
  if (enTrop) return { cle: `retirer-${enTrop[0]}-${enTrop[1]}`, etape: E.fils, texte: `Le fil entre ${nomBorne(r, enTrop[0])} et ${nomBorne(r, enTrop[1])} ne sert pas à cette pile. Touche-le, puis touche la croix qui apparaît : il se retire.`, geste: "retirer", a: enTrop[0], b: enTrop[1] };
  if (!lameCom) {
    const vers = lameV === a ? b : a;
    return { cle: `fil-com-${vers}`, etape: E.fils, texte: `Tire un fil de la borne COM jusqu'à ${nomBorne(r, vers)} : pose le doigt sur la borne, et glisse jusqu'en haut de la lame.`, geste: "fil", de: "com", vers };
  }
  if (!lameV) {
    const vers = lameCom === a ? b : a;
    return { cle: `fil-v-${vers}`, etape: E.fils, texte: `Tire un fil de la borne V jusqu'à ${nomBorne(r, vers)}.`, geste: "fil", de: "v", vers };
  }
  // ----- lire et noter -----
  return { cle: `noter-${clePile(a, b)}`, etape: E.lire, texte: "La pile est montée, le voltmètre est branché. Touche « Noter la tension ».", geste: "bouton", bouton: "noter" };
}
