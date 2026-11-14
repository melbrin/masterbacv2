// La paillasse « doppler » (décision 0012) : un mobile motorisé porte un émetteur sonore de fréquence connue et passe
// devant un micro, le long d'un rail gradué. L'élève fait les gestes du laboratoire : il règle le cran du moteur, place
// les deux fourches optiques du chronomètre, lance l'enregistrement puis le mobile, arrête l'enregistrement, lit sur le
// spectre les fréquences reçues à l'approche et à l'éloignement, puis lit la règle et le chronomètre.
// Chaque geste a ses conséquences : un enregistrement lancé trop tard ou arrêté trop tôt perd un pic ; un mauvais cran
// donne une autre vitesse ; une fourche placée là où le mobile accélère encore fausse la mesure directe.
// Fonctions pures : le navigateur s'en sert pour faire vivre la paillasse, le serveur pour rejouer la manipulation.
// Les gestes qui dépendent du temps portent l'instant où ils ont été faits (`t`, en secondes) : rien ici ne lit d'horloge.
// Les positions sur le rail sont en centimètres pour l'élève, en mètres dans les calculs ; les fréquences en hertz.
import { nombre } from "@/lib/commun/format";
import { frequenceRecue } from "@/lib/commun/simulations/doppler";
import { nombreDe, scoreDesFautes, texteDe, type BilanPaillasse, type Faute, type GesteBrut, type ReglesPaillasse } from "../types";

export interface ReglagesDoppler {
  /** la fréquence de l'émetteur porté par le mobile, en hertz */
  fE: number;
  /** la célérité du son dans la salle, en m/s */
  c: number;
  /** le cran du moteur que le sujet demande, de 1 à 5 */
  cran: number;
  /** la vitesse du mobile à ce cran, en m/s : c'est elle que l'on cherche */
  v: number;
}

/** Le rail, en mètres : sa longueur, la place du micro, la distance du micro à l'axe du rail, la distance sur laquelle le mobile prend son élan. */
export const RAIL = { longueur: 4, micro: 2, ecart: 0.05, elan: 0.4 };
export const CRANS = { min: 1, max: 5 };
/** Les fourches optiques : leur course sur le rail et leur pas, en centimètres. */
export const FOURCHES = { min: 10, max: 390, pas: 0.5 };
/** Le spectre se calcule autour de la fréquence de l'émetteur : `demi` hertz de chaque côté, par pas de `pas` hertz ; un pic fait `finesse` hertz de large. */
export const SPECTRE = { demi: 200, pas: 0.25, finesse: 1 };
/** L'enregistreur garde trente secondes de son au plus. */
export const MEMOIRE = 30;
/** Le pas de temps du calcul du spectre, en secondes. */
const ECHANTILLON = 0.002;
/** La hauteur en dessous de laquelle une bosse du spectre n'est pas un pic : le mobile n'a pas été enregistré assez longtemps de ce côté. */
const SEUIL = 0.01;
/** Au-delà de cette graduation, en centimètres, le mobile roule à vitesse constante ; les fourches gagnent à être écartées d'au moins un mètre. */
const FIN_ELAN = 45;
const ECART_MIN = 100;

const centieme = (x: number) => Math.round(x * 100) / 100;
const millieme = (x: number) => Math.round(x * 1000) / 1000;
const hz = (x: number) => `${nombre(x, 2)} Hz`;
const cm = (x: number) => `${nombre(x, 1)} cm`;
const sec = (x: number) => `${nombre(x, 3)} s`;

// ---------- le mouvement du mobile ----------

/** La vitesse de croisière du mobile à un cran du moteur, en m/s : un quart de plus ou de moins par cran. */
export const vitesseAu = (r: ReglagesDoppler, cran: number): number => r.v * (1 + 0.25 * (cran - r.cran));
/** Le mobile `s` secondes après son lancement : sa position sur le rail (en mètres) et sa vitesse. Il prend son élan, roule à vitesse constante, puis s'arrête au bout. */
export function mobile(v: number, s: number): { x: number; u: number } {
  if (s <= 0) return { x: 0, u: 0 };
  const elan = (2 * RAIL.elan) / v;
  if (s < elan) return { x: (v * s * s) / (2 * elan), u: (v * s) / elan };
  if (s < dureeDuTrajet(v)) return { x: RAIL.elan + v * (s - elan), u: v };
  return { x: RAIL.longueur, u: 0 };
}
/** La durée du trajet, du départ au bout du rail, en secondes. */
export const dureeDuTrajet = (v: number): number => (RAIL.longueur + RAIL.elan) / v;
/** L'instant, compté depuis le lancement, où le mobile passe devant une graduation du rail (en mètres). */
export const instantDuPassage = (v: number, x: number): number => (x <= RAIL.elan ? (2 * Math.sqrt(x * RAIL.elan)) / v : (x + RAIL.elan) / v);
/** Ce que le chronomètre affiche après un passage : la durée entre les deux fourches (données en centimètres), en secondes, au millième. */
export const chronometre = (v: number, fourches: readonly [number, number]): number => millieme(Math.abs(instantDuPassage(v, fourches[1] / 100) - instantDuPassage(v, fourches[0] / 100)));

// ---------- l'état de la paillasse ----------

/** Un passage du mobile : l'instant du lancement, le cran et la vitesse de croisière, la place des fourches à ce moment. */
export interface Passage { t: number; cran: number; v: number; fourches: [number, number] }
/**
 * Une fréquence lue sur le spectre : ce que l'élève a noté, et ce que montrait alors son enregistrement. `pic` : le
 * sommet du pic (null s'il n'y avait pas de pic de ce côté) ; `entier` : vrai si tout le passage était enregistré ;
 * `cran` : le cran du passage enregistré (null sans passage).
 */
export interface Frequence { note: number; pic: number | null; entier: boolean; cran: number | null }
/** La durée lue sur le chronomètre : ce que l'élève a noté, et le passage que le chronomètre venait de mesurer (null si le mobile n'avait pas roulé). */
export interface Duree { note: number; passage: Passage | null }

export interface EtatDoppler {
  /** le cran du moteur, de 1 à 5 */
  cran: number;
  /** la place des deux fourches optiques sur le rail, en centimètres */
  fourches: [number, number];
  /** vrai si le mobile est au départ du rail ; faux après un passage, tant qu'il n'a pas été ramené */
  auDepart: boolean;
  /** le dernier instant connu, en secondes : un geste daté d'avant est refusé */
  horloge: number;
  /** les derniers passages du mobile */
  passages: Passage[];
  /** l'instant où l'enregistrement en cours a commencé ; null quand l'enregistreur est arrêté */
  debut: number | null;
  /** le dernier enregistrement terminé */
  bande: { debut: number; fin: number } | null;
  approche: Frequence | null;
  eloignement: Frequence | null;
  /** les positions notées de la première et de la seconde fourche, en centimètres : elles se jugent sur la place des fourches au passage chronométré */
  x1: number | null;
  x2: number | null;
  /** la durée notée, en secondes */
  duree: Duree | null;
}

// au départ : le moteur au cran le plus bas, les fourches trop près du départ et trop serrées, comme on les trouve en arrivant
const DEPART: EtatDoppler = { cran: 1, fourches: [20, 70], auDepart: true, horloge: 0, passages: [], debut: null, bande: null, approche: null, eloignement: null, x1: null, x2: null, duree: null };

/** Le dernier passage du mobile, ou null. */
export const dernierPassage = (etat: EtatDoppler): Passage | null => etat.passages[etat.passages.length - 1] ?? null;
/** Vrai si le mobile roule encore à cet instant. */
export function roule(etat: EtatDoppler, t: number): boolean {
  const p = dernierPassage(etat);
  return p !== null && t >= p.t && t < p.t + dureeDuTrajet(p.v);
}
/** Le mobile à un instant de l'horloge : sa position sur le rail (en mètres) et sa vitesse. */
export function mobileA(etat: EtatDoppler, t: number): { x: number; u: number } {
  const p = [...etat.passages].reverse().find((q) => q.t <= t);
  if (!p) return { x: 0, u: 0 };
  const m = mobile(p.v, t - p.t);
  // arrivé au bout, le mobile y reste tant qu'il n'a pas été ramené
  return m.u === 0 && p === dernierPassage(etat) && etat.auDepart ? { x: 0, u: 0 } : m;
}
/** Les passages du mobile qu'un enregistrement contient, en tout ou en partie. */
export const passagesEnregistres = (etat: EtatDoppler): Passage[] =>
  (etat.bande ? etat.passages.filter((p) => p.t < etat.bande!.fin && p.t + dureeDuTrajet(p.v) > etat.bande!.debut) : []);

// ---------- le spectre de l'enregistrement ----------

/**
 * Le spectre du dernier enregistrement, autour de la fréquence de l'émetteur : une amplitude tous les 0,25 Hz, de
 * fE − 200 Hz à fE + 200 Hz. À chaque instant enregistré, le micro reçoit la fréquence de l'effet Doppler pour la
 * vitesse du mobile vers lui (lib/commun/simulations/doppler.ts), d'autant plus fort que le mobile est près.
 * À l'arrêt, le mobile s'entend aussi : il donne un pic à la fréquence de l'émetteur. Vide sans enregistrement.
 */
export function spectre(r: ReglagesDoppler, etat: EtatDoppler): number[] {
  if (!etat.bande) return [];
  const n = Math.round((2 * SPECTRE.demi) / SPECTRE.pas) + 1;
  const brut = new Array<number>(n).fill(0);
  const passages = [...etat.passages].reverse();
  for (let t = etat.bande.debut; t < etat.bande.fin; t += ECHANTILLON) {
    const p = passages.find((q) => q.t <= t);
    const m = p ? mobile(p.v, t - p.t) : { x: 0, u: 0 };
    const versMicro = RAIL.micro - m.x, distance = Math.hypot(versMicro, RAIL.ecart);
    const f = frequenceRecue({ fE: r.fE, c: r.c, v: (m.u * versMicro) / distance });
    const rang = Math.round((f - r.fE + SPECTRE.demi) / SPECTRE.pas);
    if (rang >= 0 && rang < n) brut[rang] += ECHANTILLON / distance;
  }
  // chaque fréquence s'étale un peu : un enregistrement de quelques secondes ne sépare pas mieux que le hertz
  const rayon = Math.ceil((4 * SPECTRE.finesse) / SPECTRE.pas);
  const noyau = Array.from({ length: 2 * rayon + 1 }, (_, i) => Math.exp(-0.5 * (((i - rayon) * SPECTRE.pas) / SPECTRE.finesse) ** 2));
  const somme = noyau.reduce((a, b) => a + b, 0);
  return brut.map((_, i) => noyau.reduce((s, k, j) => s + k * (brut[i + j - rayon] ?? 0), 0) / somme);
}
/** La fréquence d'un rang du spectre. */
export const frequenceDuRang = (r: ReglagesDoppler, rang: number): number => r.fE - SPECTRE.demi + rang * SPECTRE.pas;
/**
 * Les sommets des deux pics du spectre : celui de l'approche, au-dessus de la fréquence de l'émetteur, et celui de
 * l'éloignement, en dessous. null quand l'enregistrement ne contient pas ce moment du passage.
 */
export function pics(r: ReglagesDoppler, s: readonly number[]): { approche: number | null; eloignement: number | null } {
  const sommet = (de: number, a: number): number | null => {
    let meilleur = -1;
    for (let i = 0; i < s.length; i++) {
      const f = frequenceDuRang(r, i);
      if (f >= de && f <= a && (meilleur < 0 || s[i] > s[meilleur])) meilleur = i;
    }
    return meilleur >= 0 && s[meilleur] >= SEUIL ? frequenceDuRang(r, meilleur) : null;
  };
  return { approche: sommet(r.fE + 3, r.fE + SPECTRE.demi), eloignement: sommet(r.fE - SPECTRE.demi, r.fE - 3) };
}

/** Vrai si l'enregistrement couvre tout le passage utile du mobile : du premier au troisième mètre du rail. */
export function enregistreEnEntier(etat: EtatDoppler): boolean {
  const p = passagesEnregistres(etat).pop();
  return etat.bande !== null && p !== undefined && etat.bande.debut <= p.t + instantDuPassage(p.v, 1) && etat.bande.fin >= p.t + instantDuPassage(p.v, 3);
}

/** Les mesures d'une manipulation sans défaut : les deux pics d'un passage au cran demandé, enregistré en entier ; les fourches à 100 et 300 cm. */
export function reference(r: ReglagesDoppler): { fa: number; fe: number; x1: number; x2: number; dt: number } {
  const passage: Passage = { t: 1, cran: r.cran, v: r.v, fourches: [100, 300] };
  const etat: EtatDoppler = { ...DEPART, passages: [passage], bande: { debut: 0, fin: 2 + dureeDuTrajet(r.v) } };
  const p = pics(r, spectre(r, etat));
  return { fa: p.approche ?? r.fE, fe: p.eloignement ?? r.fE, x1: 100, x2: 300, dt: chronometre(r.v, passage.fourches) };
}

// ---------- les gestes ----------

/** L'instant d'un geste daté, s'il vient après le dernier instant connu ; null sinon. */
function instant(etat: EtatDoppler, g: GesteBrut): number | null {
  const t = nombreDe(g, "t");
  return t !== null && t >= etat.horloge && t <= 1e6 ? centieme(t) : null;
}
/** Les deux fourches dans l'ordre où le mobile les rencontre. */
const dansLOrdre = (f: readonly [number, number]): [number, number] => (f[0] <= f[1] ? [f[0], f[1]] : [f[1], f[0]]);

/** Applique un geste. Un geste inconnu, mal formé ou impossible ne change rien. */
function geste(r: ReglagesDoppler, etat: EtatDoppler, g: GesteBrut): EtatDoppler {
  switch (g.g) {
    // la molette du moteur
    case "cran": {
      const v = nombreDe(g, "v");
      return v !== null && Number.isInteger(v) && v >= CRANS.min && v <= CRANS.max && v !== etat.cran ? { ...etat, cran: v } : etat;
    }
    // glisser une fourche optique le long du rail
    case "fourche": {
      const x = nombreDe(g, "x"), n = nombreDe(g, "n");
      if (x === null || x < FOURCHES.min || x > FOURCHES.max || (n !== 1 && n !== 2)) return etat;
      const place = Math.round(x / FOURCHES.pas) * FOURCHES.pas;
      if (etat.fourches[n - 1] === place) return etat;
      return { ...etat, fourches: n === 1 ? [place, etat.fourches[1]] : [etat.fourches[0], place] };
    }
    // lancer le mobile : il part du début du rail, au cran réglé
    case "lancer": {
      const t = instant(etat, g);
      if (t === null || !etat.auDepart) return etat;
      const passage: Passage = { t, cran: etat.cran, v: vitesseAu(r, etat.cran), fourches: [etat.fourches[0], etat.fourches[1]] };
      return { ...etat, horloge: t, auDepart: false, passages: [...etat.passages, passage].slice(-8) };
    }
    // ramener le mobile au départ, une fois arrivé au bout
    case "ramener": {
      const t = instant(etat, g);
      return t === null || etat.auDepart || roule(etat, t) ? etat : { ...etat, horloge: t, auDepart: true };
    }
    // l'enregistreur : le lancer, l'arrêter
    case "enregistrer": {
      const t = instant(etat, g);
      return t === null || etat.debut !== null ? etat : { ...etat, horloge: t, debut: t };
    }
    case "arreter": {
      const t = instant(etat, g);
      if (t === null || etat.debut === null || t <= etat.debut) return etat;
      return { ...etat, horloge: t, debut: null, bande: { debut: etat.debut, fin: Math.min(t, etat.debut + MEMOIRE) } };
    }
    // ce que l'élève écrit dans son carnet : la paillasse retient aussi ce que l'appareil montrait à ce moment
    case "noter": {
      const v = nombreDe(g, "v"), quoi = texteDe(g, "quoi");
      if (v === null || v < 0) return etat;
      if (quoi === "approche" || quoi === "eloignement") {
        if (!etat.bande || v <= 0 || v > 20000) return etat;
        const frequence: Frequence = { note: centieme(v), pic: pics(r, spectre(r, etat))[quoi], entier: enregistreEnEntier(etat), cran: passagesEnregistres(etat).pop()?.cran ?? null };
        return quoi === "approche" ? { ...etat, approche: frequence } : { ...etat, eloignement: frequence };
      }
      if (quoi === "x1" || quoi === "x2") {
        if (v > RAIL.longueur * 100) return etat;
        return quoi === "x1" ? { ...etat, x1: centieme(v) } : { ...etat, x2: centieme(v) };
      }
      if (quoi === "duree") return v > 0 && v <= 100 ? { ...etat, duree: { note: millieme(v), passage: dernierPassage(etat) } } : etat;
      return etat;
    }
    default: return etat;
  }
}

// ---------- le bilan ----------

/** Le bilan de la manipulation : les deux fréquences, les deux positions et la durée retenues, et les fautes relevées par le professeur. */
function bilan(r: ReglagesDoppler, etat: EtatDoppler): BilanPaillasse {
  const prof = reference(r);
  const fautes: Faute[] = [];
  const faute = (code: string, grave: boolean, texte: string) => fautes.push({ code, grave, texte });
  const { approche, eloignement, x1, x2, duree, bande } = etat;
  const dernier = dernierPassage(etat);
  const rien = !dernier && !bande && !approche && !eloignement && x1 === null && x2 === null && !duree;

  if (rien) {
    faute("passage", true, "Tu n'as pas lancé le mobile : il n'y a rien à mesurer.");
  } else {
    // le cran du moteur, pour le passage dont l'élève a lu le spectre et pour celui qu'il a chronométré
    const chronometree = duree ? duree.passage : dernier;
    const crans = [approche?.cran, eloignement?.cran, chronometree?.cran].filter((c): c is number => c !== null && c !== undefined);
    const autre = crans.find((c) => c !== r.cran);
    if (autre !== undefined) faute("reglage", true, `Tu as lancé le mobile au cran ${autre} ; le sujet demandait le cran ${r.cran}. La vitesse que tu mesures n'est pas celle qu'on cherche.`);

    // les deux fréquences : un enregistrement qui contient l'approche et l'éloignement, puis une lecture au sommet des pics
    if (!approche || !eloignement) {
      const sommets = pics(r, spectre(r, etat));
      if (!bande) faute("enregistrement", true, "Tu n'as pas enregistré le son du mobile : sans enregistrement, pas de spectre.");
      else if (passagesEnregistres(etat).length === 0) faute("enregistrement", true, "Ton enregistrement ne contient aucun passage du mobile. Lance l'enregistrement, puis le mobile, et arrête l'enregistrement quand le mobile est arrivé.");
      else if (sommets.approche === null) faute("enregistrement", true, "Ton enregistrement ne contient pas l'approche du mobile : il a commencé trop tard. Lance l'enregistrement avant le mobile.");
      else if (sommets.eloignement === null) faute("enregistrement", true, "Ton enregistrement ne contient pas l'éloignement du mobile : il s'est arrêté trop tôt. Attends que le mobile soit au bout du rail.");
      else faute("spectre", true, "Tu n'as pas noté les deux fréquences lues sur le spectre : celle de l'approche et celle de l'éloignement.");
    } else {
      const lues = [{ f: approche, quand: "l'approche", pourquoi: "il avait commencé trop tard" }, { f: eloignement, quand: "l'éloignement", pourquoi: "il s'était arrêté trop tôt" }];
      const sansPic = lues.find((x) => x.f.pic === null);
      if (sansPic) faute("enregistrement", true, `Tu as noté ${hz(sansPic.f.note)} pour ${sansPic.quand}, mais ton enregistrement ne contenait pas ce moment du passage : ${sansPic.pourquoi}. Il n'y avait pas de pic à lire de ce côté.`);
      else {
        if (!approche.entier || !eloignement.entier) faute("enregistrement", false, "Ton enregistrement ne couvrait pas tout le passage du mobile : un des pics était à peine formé, et son sommet décalé. Enregistre du départ jusqu'à l'arrivée.");
        const pire = lues.map((x) => ({ ...x, erreur: Math.abs(x.f.note - (x.f.pic ?? 0)) })).sort((a, b) => b.erreur - a.erreur)[0];
        if (pire.erreur > 1) faute("spectre", pire.erreur > 3, `Tu as noté ${hz(pire.f.note)} pour ${pire.quand} ; sur ton spectre, le sommet de ce pic était à ${hz(pire.f.pic ?? 0)}. Zoome sur le pic, puis pose le repère sur son sommet.`);
      }
    }

    // la mesure directe : la place des fourches, la lecture de la règle, la lecture du chronomètre
    if (chronometree) {
      const [premiere, seconde] = dansLOrdre(chronometree.fourches);
      if (premiere < FIN_ELAN) faute("fourches", false, `Au passage chronométré, la première fourche était à ${cm(premiere)} du départ : le mobile y prenait encore son élan, et sa vitesse entre les fourches n'était pas constante. Place-la au-delà de 50 cm.`);
      else if (seconde - premiere < ECART_MIN) faute("fourches", false, `Au passage chronométré, tes deux fourches n'étaient écartées que de ${cm(seconde - premiere)} : la lecture de la règle pèse lourd. Écarte-les d'au moins un mètre.`);
    }
    if (x1 === null || x2 === null) faute("regle", true, "Tu n'as pas noté la position des deux fourches sur la règle.");
    else {
      // les positions notées se comparent à la place des fourches au passage chronométré ; sans passage, à leur place sur le rail
      const notees = dansLOrdre([x1, x2]), vraies = dansLOrdre(chronometree ? chronometree.fourches : etat.fourches);
      const pire = [0, 1].map((i) => ({ note: notees[i], vrai: vraies[i], erreur: Math.abs(notees[i] - vraies[i]) })).sort((a, b) => b.erreur - a.erreur)[0];
      if (pire.erreur > 0.6) faute("regle", pire.erreur > 2, `Tu as noté ${cm(pire.note)} pour une fourche ; ${chronometree ? "au passage chronométré" : "sur le rail"}, elle était en face de ${cm(pire.vrai)}. Lis la règle à la loupe, sous le repère de la fourche, et ne déplace plus les fourches après ta lecture.`);
    }
    if (!duree) faute("chrono", true, "Tu n'as pas noté la durée affichée par le chronomètre.");
    else if (!duree.passage) faute("chrono", true, "Tu as noté une durée sans avoir lancé le mobile : le chronomètre n'avait rien mesuré.");
    else {
      const affiche = chronometre(duree.passage.v, duree.passage.fourches);
      const erreur = Math.abs(duree.note - affiche);
      if (erreur > 0.0015) faute("chrono", erreur > 0.02, `Tu as noté ${sec(duree.note)} ; après ce passage, le chronomètre affichait ${sec(affiche)}.`);
    }
  }

  // ce que l'élève retient ; ce qui manque est donné par le professeur
  const frequences = approche && eloignement ? { fa: approche.note, fe: eloignement.note } : { fa: prof.fa, fe: prof.fe };
  const directe = x1 !== null && x2 !== null && duree ? { x1: Math.min(x1, x2), x2: Math.max(x1, x2), dt: duree.note } : { x1: prof.x1, x2: prof.x2, dt: prof.dt };
  const lignes = [
    approche && eloignement ? `Tes fréquences : ${hz(frequences.fa)} à l'approche, ${hz(frequences.fe)} à l'éloignement.` : `Sans les deux fréquences, on continue avec celles du professeur : ${hz(prof.fa)} à l'approche, ${hz(prof.fe)} à l'éloignement.`,
    x1 !== null && x2 !== null && duree ? `Ta mesure directe : les fourches à ${cm(directe.x1)} et ${cm(directe.x2)}, une durée de ${sec(directe.dt)}.` : `Sans la mesure directe complète, on continue avec celle du professeur : les fourches à ${cm(prof.x1)} et ${cm(prof.x2)}, une durée de ${sec(prof.dt)}.`,
    `Pour une manipulation sans défaut, au cran ${r.cran} : ${hz(prof.fa)} et ${hz(prof.fe)} ; ${nombre((prof.x2 - prof.x1) / 100, 2)} m parcourus en ${sec(prof.dt)}.`,
  ];
  return { score: rien ? 0 : scoreDesFautes(fautes), fautes, mesures: { ...frequences, ...directe }, lignes };
}

export const regles: ReglesPaillasse<ReglagesDoppler, EtatDoppler> = { depart: () => DEPART, geste, bilan };
