// La paillasse « ultrasons » (décision 0012) : un émetteur d'ultrasons, deux récepteurs sur un rail gradué, un oscilloscope
// à deux voies. L'élève fait les gestes du laboratoire : il tire les câbles, règle la base de temps et la sensibilité de
// chaque voie, mesure la période sur l'écran, puis fait glisser le second récepteur en comptant les retours en phase et
// lit ses positions sur le rail.
// Chaque geste a ses conséquences : sans câble, un trait plat ; une sensibilité mal choisie, un signal écrasé ou qui sort
// de l'écran ; une base de temps mal choisie, une période illisible ; un arrêt hors phase ou un retour en phase oublié,
// une longueur d'onde fausse.
// Fonctions pures : le navigateur s'en sert pour faire vivre la paillasse, le serveur pour rejouer la manipulation.
// Les durées sont en microsecondes, les positions sur le rail en millimètres, les tensions en volts.
import { nombre } from "@/lib/commun/format";
import { nombreDe, scoreDesFautes, texteDe, type BilanPaillasse, type Faute, type GesteBrut, type ReglesPaillasse } from "../types";

export interface ReglagesUltrasons {
  /** la fréquence de l'émetteur, en hertz : c'est elle que la période donne */
  f: number;
  /** la température de la salle, en degrés Celsius : elle fixe la célérité des ultrasons */
  theta: number;
  /** la graduation du rail où se tient le récepteur fixe, en millimètres (avant le zéro : elle est négative) */
  fixe: number;
}

/** Les prises : sur l'oscilloscope, la sortie GÉN et l'entrée de chaque voie ; sur le banc, l'émetteur et les deux récepteurs. */
export const PRISES = ["gen", "y1", "y2", "em", "r1", "r2"] as const;
export type Prise = (typeof PRISES)[number];
/** Le nombre de câbles disponibles : trois suffisent, le quatrième est de rechange. */
export const CABLES = 4;
/** Les bases de temps de l'oscilloscope, en microsecondes par division. */
export const BASES = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
/** Les sensibilités d'une voie, en volts par division. */
export const CALIBRES = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5];
/** L'écran fait dix divisions de large et huit de haut : un signal de plus de quatre divisions d'amplitude en sort. */
export const LARGEUR = 10;
export const DEMI_HAUTEUR = 4;
/** Le rail : gradué de 0 à 130 mm ; le récepteur mobile y glisse entre ces deux graduations. */
export const RAIL = { de: 0, a: 130, min: 14, max: 126 };
/** L'amplitude du signal d'un récepteur placé à 15 mm, en volts ; elle baisse quand le récepteur s'éloigne de l'émetteur. */
const AMPLITUDE = 0.12;
/** La distance entre l'émetteur et le zéro du rail, en millimètres. */
const RECUL = 150;
/** Le signal de la sortie GÉN : son amplitude en volts, et son avance sur le récepteur fixe, en fraction de période. */
const TENSION_GEN = 2.5;
const RETARD_GEN = 0.37;

const dixieme = (x: number) => Math.round(x * 10) / 10;
const fraction = (x: number) => x - Math.floor(x);
const mm = (x: number) => `${nombre(x, 1)} mm`;
const cm = (x: number) => `${nombre(x, 2)} cm`;
const us = (x: number) => `${nombre(x, 1)} µs`;
const entier = (g: GesteBrut, cle: string, max: number): number | null => {
  const v = nombreDe(g, cle);
  return v !== null && Number.isInteger(v) && v >= 0 && v <= max ? v : null;
};
const estPrise = (t: string | null): t is Prise => t !== null && (PRISES as readonly string[]).includes(t);

/** La célérité du son dans l'air à la température de la salle, en m/s. */
export const celerite = (r: ReglagesUltrasons): number => 331.5 + 0.607 * r.theta;
/** La période du signal, en microsecondes. */
export const periode = (r: ReglagesUltrasons): number => 1e6 / r.f;
/** La longueur d'onde des ultrasons dans la salle, en millimètres. */
export const longueurOnde = (r: ReglagesUltrasons): number => (celerite(r) / r.f) * 1000;
/** La première graduation que le récepteur mobile peut atteindre où les deux récepteurs sont en phase, en millimètres. */
export function premiereCoincidence(r: ReglagesUltrasons): number {
  const lambda = longueurOnde(r);
  return r.fixe + Math.ceil((RAIL.min - r.fixe) / lambda) * lambda;
}

// ---------- ce qui arrive à l'oscilloscope ----------

/** Un signal sinusoïdal à la fréquence de l'émetteur : son amplitude en volts, son retard en fraction de période. */
export interface Signal { amplitude: number; retard: number }
/** Le relevé d'une position du récepteur mobile : ce que l'élève a noté, et ce que la paillasse montrait à ce moment. */
export interface Position {
  /** la graduation notée par l'élève, en centimètres */
  note: number;
  /** la graduation où se trouvait le repère du récepteur, en millimètres */
  x: number;
  /** l'écart de phase entre les deux voies, en fraction de période ; null si l'écran ne montrait pas les deux signaux à comparer */
  ecart: number | null;
}

export interface EtatUltrasons {
  /** les câbles posés, chacun par ses deux prises */
  fils: [Prise, Prise][];
  /** le rang de la base de temps dans BASES */
  base: number;
  /** le rang de la sensibilité de chaque voie dans CALIBRES */
  calibres: [number, number];
  /** la graduation du rail en face du repère du récepteur mobile, en millimètres */
  x: number;
  /** la période notée, en microsecondes, avec ce que l'écran montrait : le nombre de périodes, et la hauteur du signal de chaque voie en divisions */
  periode: { note: number; periodes: number; hauteurs: [number, number] } | null;
  /** les deux positions du récepteur mobile entre lesquelles l'élève compte les longueurs d'onde */
  depart: Position | null;
  arrivee: Position | null;
  /** le nombre de longueurs d'onde que l'élève dit avoir comptées */
  nombre: number | null;
}

// au départ : aucun câble, et un oscilloscope mal réglé, comme on le trouve en arrivant
const DEPART: EtatUltrasons = { fils: [], base: 9, calibres: [8, 8], x: 30, periode: null, depart: null, arrivee: null, nombre: null };

/** Les prises reliées à une prise, de proche en proche, par les câbles posés. */
function reliees(fils: readonly (readonly [Prise, Prise])[], depart: Prise): Set<Prise> {
  const vues = new Set<Prise>([depart]);
  const file: Prise[] = [depart];
  while (file.length) {
    const ici = file.pop()!;
    for (const [a, b] of fils) {
      const autre = a === ici ? b : b === ici ? a : null;
      if (autre && !vues.has(autre)) { vues.add(autre); file.push(autre); }
    }
  }
  return vues;
}

/** Vrai si l'émetteur est alimenté : un câble le relie à la sortie GÉN. */
export const emet = (etat: EtatUltrasons): boolean => reliees(etat.fils, "em").has("gen");
/** L'amplitude du signal d'un récepteur placé à la graduation x, en volts : elle baisse avec la distance à l'émetteur. */
export const amplitudeRecue = (x: number): number => (AMPLITUDE * (RECUL + 15)) / (RECUL + x);

/** Ce qui est branché sur une voie : la sortie GÉN, le récepteur fixe, le récepteur mobile, les deux récepteurs à la fois, ou rien d'utile. */
export type Source = "gen" | "fixe" | "mobile" | "melange" | "rien";
export function source(etat: EtatUltrasons, voie: 1 | 2): Source {
  const reseau = reliees(etat.fils, voie === 1 ? "y1" : "y2");
  if (reseau.has("gen")) return "gen";
  if (!emet(etat)) return "rien";
  return reseau.has("r1") ? (reseau.has("r2") ? "melange" : "fixe") : reseau.has("r2") ? "mobile" : "rien";
}

/** Le signal qui arrive sur une voie ; null si rien n'y arrive. Le retard se compte par rapport au récepteur fixe. */
export function signalVoie(r: ReglagesUltrasons, etat: EtatUltrasons, voie: 1 | 2): Signal | null {
  const quoi = source(etat, voie);
  const fixe: Signal = { amplitude: amplitudeRecue(r.fixe), retard: 0 };
  const mobile: Signal = { amplitude: amplitudeRecue(etat.x), retard: fraction((etat.x - r.fixe) / longueurOnde(r)) };
  switch (quoi) {
    case "rien": return null;
    case "gen": return { amplitude: TENSION_GEN, retard: 1 - RETARD_GEN };
    case "fixe": return fixe;
    case "mobile": return mobile;
    case "melange": {
      // deux récepteurs sur la même voie : leurs signaux s'ajoutent
      const angle = 2 * Math.PI * mobile.retard;
      const re = fixe.amplitude + mobile.amplitude * Math.cos(angle), im = mobile.amplitude * Math.sin(angle);
      return { amplitude: Math.hypot(re, im), retard: fraction(Math.atan2(im, re) / (2 * Math.PI)) };
    }
  }
}

/**
 * Ce que montre l'écran : le signal de chaque voie, calé sur le déclenchement. L'oscilloscope se déclenche sur la voie 1
 * si elle reçoit un signal, sinon sur la voie 2 : ce signal part de zéro, en montant, au bord gauche de l'écran.
 */
export function ecran(r: ReglagesUltrasons, etat: EtatUltrasons): [Signal | null, Signal | null] {
  const s1 = signalVoie(r, etat, 1), s2 = signalVoie(r, etat, 2);
  const origine = (s1 ?? s2)?.retard ?? 0;
  const cale = (s: Signal | null): Signal | null => (s ? { amplitude: s.amplitude, retard: fraction(s.retard - origine) } : null);
  return [cale(s1), cale(s2)];
}
/** La hauteur du signal de chaque voie à l'écran, en divisions de part et d'autre du milieu ; 0 sans signal. */
export function hauteurs(r: ReglagesUltrasons, etat: EtatUltrasons): [number, number] {
  const [s1, s2] = ecran(r, etat);
  return [s1 ? s1.amplitude / CALIBRES[etat.calibres[0]] : 0, s2 ? s2.amplitude / CALIBRES[etat.calibres[1]] : 0];
}
/** Le nombre de périodes que montre l'écran avec la base de temps choisie. */
export const periodesVues = (r: ReglagesUltrasons, etat: EtatUltrasons): number => (LARGEUR * BASES[etat.base]) / periode(r);
/** Vrai si l'écran montre de quoi comparer : le récepteur mobile sur une voie, le récepteur fixe ou la sortie GÉN sur l'autre. */
export function comparable(etat: EtatUltrasons): boolean {
  const a = source(etat, 1), b = source(etat, 2);
  const repere = (s: Source) => s === "fixe" || s === "gen";
  return emet(etat) && ((a === "mobile" && repere(b)) || (b === "mobile" && repere(a)));
}
/** L'écart de phase entre les deux voies, en fraction de période, de −0,5 à 0,5 : 0 quand elles sont en phase. null s'il manque un signal. */
export function dephasage(r: ReglagesUltrasons, etat: EtatUltrasons): number | null {
  const [a, b] = ecran(r, etat);
  if (!a || !b) return null;
  const e = fraction(b.retard - a.retard);
  return e > 0.5 ? e - 1 : e;
}

/**
 * Le décalage du récepteur mobile par rapport à la position en phase la plus proche, en fraction de longueur d'onde, de
 * −0,5 à 0,5 : positif quand il est un peu plus loin de l'émetteur que cette position. null si l'écran ne montre pas les deux signaux à comparer.
 */
export function decalageDuMobile(r: ReglagesUltrasons, etat: EtatUltrasons): number | null {
  const d = comparable(etat) ? dephasage(r, etat) : null;
  if (d === null) return null;
  // le déphasage se compte de la voie 1 vers la voie 2 : il change de signe si le récepteur mobile est sur la voie 1
  return source(etat, 2) === "mobile" ? d : d === 0.5 ? 0.5 : -d;
}

// ---------- les gestes ----------

/** Applique un geste. Un geste inconnu, mal formé ou impossible ne change rien. */
function geste(r: ReglagesUltrasons, etat: EtatUltrasons, g: GesteBrut): EtatUltrasons {
  switch (g.g) {
    // poser un câble entre deux prises
    case "relier": {
      const a = texteDe(g, "a"), b = texteDe(g, "b");
      if (!estPrise(a) || !estPrise(b) || a === b || etat.fils.length >= CABLES) return etat;
      if (etat.fils.some(([u, v]) => (u === a && v === b) || (u === b && v === a))) return etat;
      return { ...etat, fils: [...etat.fils, [a, b]] };
    }
    case "retirer": {
      const a = texteDe(g, "a"), b = texteDe(g, "b");
      const reste = etat.fils.filter(([u, v]) => !((u === a && v === b) || (u === b && v === a)));
      return reste.length === etat.fils.length ? etat : { ...etat, fils: reste };
    }
    // les molettes de l'oscilloscope : la base de temps, la sensibilité d'une voie
    case "base": {
      const v = entier(g, "v", BASES.length - 1);
      return v === null || v === etat.base ? etat : { ...etat, base: v };
    }
    case "calibre": {
      const v = entier(g, "v", CALIBRES.length - 1);
      const voie = nombreDe(g, "voie");
      if (v === null || (voie !== 1 && voie !== 2) || etat.calibres[voie - 1] === v) return etat;
      return { ...etat, calibres: voie === 1 ? [v, etat.calibres[1]] : [etat.calibres[0], v] };
    }
    // le récepteur mobile glisse le long du rail : `x` est la graduation en face de son repère
    case "glisser": {
      const x = nombreDe(g, "x");
      if (x === null || x < RAIL.min || x > RAIL.max || dixieme(x) === etat.x) return etat;
      return { ...etat, x: dixieme(x) };
    }
    // ce que l'élève écrit dans son carnet : la paillasse retient aussi ce qu'elle montrait à ce moment
    case "noter": {
      const v = nombreDe(g, "v");
      if (v === null) return etat;
      switch (texteDe(g, "quoi")) {
        case "periode":
          return v > 0 && v <= 100000 ? { ...etat, periode: { note: Math.round(v * 100) / 100, periodes: periodesVues(r, etat), hauteurs: hauteurs(r, etat) } } : etat;
        case "depart":
        case "arrivee": {
          if (v < RAIL.de / 10 || v > RAIL.a / 10) return etat;
          const position: Position = { note: Math.round(v * 1000) / 1000, x: etat.x, ecart: comparable(etat) ? dephasage(r, etat) : null };
          return g.quoi === "depart" ? { ...etat, depart: position } : { ...etat, arrivee: position };
        }
        case "nombre": return Number.isInteger(v) && v >= 1 && v <= 40 ? { ...etat, nombre: v } : etat;
        default: return etat;
      }
    }
    default: return etat;
  }
}

// ---------- le bilan ----------

/** Les mesures d'une manipulation sans défaut : la période, la première position en phase, puis dix longueurs d'onde plus loin. */
export function mesuresDuProfesseur(r: ReglagesUltrasons): { T: number; x0: number; x1: number; n: number } {
  const debut = premiereCoincidence(r);
  return { T: dixieme(periode(r)), x0: Math.round(debut * 10) / 100, x1: Math.round((debut + 10 * longueurOnde(r)) * 10) / 100, n: 10 };
}

/** Le bilan de la manipulation : la période, les deux positions et le nombre de longueurs d'onde retenus, et les fautes relevées par le professeur. */
function bilan(r: ReglagesUltrasons, etat: EtatUltrasons): BilanPaillasse {
  const T = periode(r), lambda = longueurOnde(r);
  const prof = mesuresDuProfesseur(r);
  const fautes: Faute[] = [];
  const faute = (code: string, grave: boolean, texte: string) => fautes.push({ code, grave, texte });
  const { periode: lue, depart, arrivee, nombre: compte } = etat;
  const rien = !lue && !depart && !arrivee && compte === null;

  if (rien) {
    faute("mesures", true, "Tu n'as noté aucune mesure : ni la période, ni les positions du récepteur mobile.");
  } else {
    // les branchements, au moment des relevés
    const sansSignal = lue !== null && lue.hauteurs[0] === 0 && lue.hauteurs[1] === 0;
    const sansComparaison = (depart !== null && depart.ecart === null) || (arrivee !== null && arrivee.ecart === null);
    if (sansSignal) faute("branchement", true, "Quand tu as noté la période, aucun signal n'arrivait à l'oscilloscope. Relie la sortie GÉN à l'émetteur, et chaque récepteur à une voie.");
    else if (sansComparaison) faute("branchement", true, "Quand tu as noté une position, l'écran ne montrait pas les deux signaux à comparer. Il faut l'émetteur relié à la sortie GÉN, le récepteur fixe sur une voie et le récepteur mobile sur l'autre.");

    // la période : le réglage de l'oscilloscope, puis la lecture
    if (!lue) {
      faute("periode", true, "Tu n'as pas noté la période du signal.");
    } else {
      if (!sansSignal) {
        const lisible = lue.hauteurs.some((h) => h >= 1 && h <= DEMI_HAUTEUR);
        const haut = Math.max(...lue.hauteurs);
        if (!lisible && haut < 1) faute("sensibilite", false, `Quand tu as mesuré la période, le signal ne montait qu'à ${nombre(haut, 1)} division du milieu de l'écran : presque un trait plat. Tourne la molette de la voie jusqu'à ce que le signal occupe plusieurs divisions.`);
        else if (!lisible) faute("sensibilite", false, `Quand tu as mesuré la période, le signal sortait de l'écran : il lui aurait fallu ${nombre(haut, 0)} divisions de chaque côté du milieu, et l'écran n'en a que ${DEMI_HAUTEUR}. Choisis une sensibilité avec plus de volts par division.`);
        if (lue.periodes < 1) faute("base", false, `Quand tu as mesuré la période, l'écran n'en montrait même pas une entière. Règle la base de temps pour voir trois ou quatre périodes.`);
        else if (lue.periodes > 8) faute("base", false, `Quand tu as mesuré la période, l'écran en montrait ${nombre(lue.periodes, 0)}, trop serrées pour être lues. Règle la base de temps pour voir trois ou quatre périodes.`);
      }
      const erreur = Math.abs(lue.note - T) / T;
      if (erreur > 0.06) faute("periode", true, `Tu as noté T = ${us(lue.note)} ; la période du signal vaut ${us(T)}. Compte les divisions d'une période entière, puis multiplie par la base de temps.`);
      else if (erreur > 0.025) faute("periode", false, `Tu as noté T = ${us(lue.note)} ; la période du signal vaut ${us(T)}. Mesure plusieurs périodes d'un coup, puis divise : la lecture est plus précise.`);
    }

    // la longueur d'onde : les deux positions, en phase et bien lues, et le nombre de longueurs d'onde entre elles
    if (!depart || !arrivee) {
      faute("positions", true, "Tu n'as pas noté les deux positions du récepteur mobile : sans elles, pas de longueur d'onde.");
    } else {
      const hors = Math.max(Math.abs(depart.ecart ?? 0), Math.abs(arrivee.ecart ?? 0));
      const pire = Math.abs(arrivee.ecart ?? 0) >= Math.abs(depart.ecart ?? 0) ? "d'arrivée" : "de départ";
      if (hors > 0.06) faute("phase", hors > 0.15, `Quand tu as noté ta position ${pire}, les deux signaux n'étaient pas en phase : le récepteur était à ${mm(hors * lambda)} du bon endroit. Règle finement, jusqu'à ce que les deux courbes passent par zéro ensemble.`);
      const lectures = [depart, arrivee].map((p) => ({ p, erreur: Math.abs(p.note * 10 - p.x) })).sort((a, b) => b.erreur - a.erreur)[0];
      if (lectures.erreur > 0.6) faute("lecture", lectures.erreur > 1.5, `Tu as noté ${cm(lectures.p.note)} ; le repère du récepteur était en face de ${cm(lectures.p.x / 10)}. Lis le rail à la loupe, au demi-millimètre près.`);
      const parcourues = Math.abs(arrivee.x - depart.x) / lambda;
      if (compte === null) faute("comptage", true, "Tu n'as pas noté le nombre de longueurs d'onde entre tes deux positions.");
      else if (compte !== Math.round(parcourues)) faute("comptage", true, `Tu as compté ${compte} longueur${compte > 1 ? "s" : ""} d'onde ; entre tes deux positions, il y en a ${nombre(parcourues, 1)}. Compte un retour en phase chaque fois que les sommets des deux courbes s'alignent de nouveau.`);
      else if (compte < 5) faute("peu", false, `Tu n'as mesuré ${compte > 1 ? `que ${compte} longueurs` : "qu'une longueur"} d'onde : l'erreur de lecture sur le rail pèse lourd. Sur dix longueurs d'onde, elle est divisée par dix.`);
    }
  }

  // ce que l'élève retient ; ce qui manque est donné par le professeur
  const positions = depart && arrivee ? { x0: depart.note, x1: arrivee.note, n: compte ?? Math.max(1, Math.round(Math.abs(arrivee.x - depart.x) / lambda)) } : { x0: prof.x0, x1: prof.x1, n: prof.n };
  const mesures = { T: lue ? lue.note : prof.T, ...positions };
  const lignes = [
    lue ? `Ta période : T = ${us(lue.note)}.` : `Sans période notée, on continue avec la valeur du professeur : T = ${us(prof.T)}.`,
    depart && arrivee
      ? `Tes positions du récepteur mobile : ${cm(positions.x0)} puis ${cm(positions.x1)}, pour ${positions.n} longueur${positions.n > 1 ? "s" : ""} d'onde${compte === null ? " (nombre donné par le professeur)" : ""}.`
      : `Sans les deux positions, on continue avec celles du professeur : ${cm(prof.x0)} puis ${cm(prof.x1)}, pour ${prof.n} longueurs d'onde.`,
    `Pour une manipulation sans défaut : T = ${us(T)}, et ${mm(10 * lambda)} pour dix longueurs d'onde.`,
  ];
  return { score: rien ? 0 : scoreDesFautes(fautes), fautes, mesures, lignes };
}

export const regles: ReglesPaillasse<ReglagesUltrasons, EtatUltrasons> = { depart: () => DEPART, geste, bilan };
