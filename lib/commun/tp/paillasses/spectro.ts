// La paillasse Spectro (décision 0012) : un spectrophotomètre, une cuve, des solutions. L'élève fait les gestes du
// laboratoire : régler la longueur d'onde à la molette en cherchant le maximum d'absorbance, remplir la cuve, la glisser
// dans le porte-cuve dans le bon sens, fermer le capot, faire le blanc, lire l'absorbance sur l'afficheur.
// Deux usages. L'étalonnage : mesurer une gamme de solutions étalons, tracer la droite, mesurer l'échantillon et lire sa
// concentration sur la droite. Le suivi cinétique : mélanger deux solutions, lancer le chronomètre, relever l'absorbance
// à intervalles, puis lire le temps de demi-réaction sur la courbe.
// Chaque geste a ses conséquences : sans blanc, tout est décalé ; une cuve non rincée garde un peu de la solution
// d'avant ; capot ouvert, la lumière de la salle atteint le détecteur ; cuve tournée d'un quart de tour, le faisceau
// traverse les faces dépolies ; loin du maximum d'absorption, l'appareil ne voit presque rien.
// Fonctions pures : le navigateur s'en sert pour faire vivre la paillasse, le serveur pour rejouer la manipulation.
// Les longueurs d'onde sont en nanomètres, les durées en secondes, les concentrations dans l'unité de la situation.
import { nombre } from "@/lib/commun/format";
import { partRestante } from "@/lib/commun/simulations/cinetique";
import { nombreDe, scoreDesFautes, texteDe, type BilanPaillasse, type Faute, type GesteBrut, type ReglesPaillasse } from "../types";

export interface ReglagesSpectro {
  /** ce que l'élève fait : une droite d'étalonnage, ou le suivi d'une transformation au cours du temps */
  mode: "etalonnage" | "cinetique";
  /** l'espèce colorée : la longueur d'onde de son maximum d'absorption, et la demi-largeur de sa bande */
  lambdaMax: number;
  largeur: number;
  /** l'absorbance, au maximum d'absorption, d'une solution de concentration 1 */
  k: number;
  /** l'unité des concentrations, telle qu'elle s'écrit, et le nombre de décimales avec lequel on les lit : « mg/L », 1 */
  unite: string;
  decimales: number;
  /** la couleur de la solution la plus concentrée de la paillasse : rouge, vert, bleu */
  couleur: [number, number, number];
  /** l'espèce colorée, dans une phrase : « le colorant » */
  espece: string;
  // ----- l'étalonnage -----
  /** les concentrations des solutions étalons S1, S2, etc. */
  gamme: number[];
  /** la concentration de l'échantillon : c'est ce que le dosage cherche */
  Cx: number;
  /** l'échantillon existe aussi dilué, prêt sur la paillasse : le facteur de cette dilution */
  dilution: number;
  /** l'échantillon, dans une phrase et sur son étiquette : « la boisson », « boisson » */
  nom: string;
  etiquette: string;
  // ----- le suivi cinétique -----
  /** la concentration de l'espèce colorée quand la transformation est finie, et le temps de demi-réaction */
  Cfin: number;
  demi: number;
  /** le temps de la paillasse qui passe en une seconde quand l'élève accélère le temps */
  cadence: number;
}

/** L'état du blanc au moment d'une mesure : pas fait, mal fait (et pourquoi), fait à une autre longueur d'onde, ou bon. */
export type EtatDuBlanc = "aucun" | "cuve" | "solution" | "capot" | "sens" | "ailleurs" | "bon";

/** Une absorbance relevée : ce que l'élève retient, ce que l'appareil affichait, et dans quel état était la paillasse. */
export interface Mesure {
  /** la solution versée dans la cuve, par son nom dans les gestes */
  s: string;
  /** la date lue au chronomètre, et l'heure de la paillasse */
  date: number;
  heure: number;
  lu: number;
  affiche: number;
  lambda: number;
  capot: boolean;
  lisse: boolean;
  blanc: EtatDuBlanc;
  /** l'écart relatif entre la concentration dans la cuve et celle de la solution : ce qui restait de la solution d'avant */
  pollution: number;
  /** vrai si la cuve avait été rincée avec cette solution avant d'être remplie */
  rincee: boolean;
}

export interface EtatSpectro {
  // ----- l'appareil -----
  lambda: number;
  /** vrai si le capot du porte-cuve est fermé */
  capot: boolean;
  /** le zéro de l'appareil : l'absorbance brute au moment du blanc, sa longueur d'onde, et ce qui n'allait pas (vide si tout allait bien) */
  blanc: { A: number; lambda: number; defaut: Exclude<EtatDuBlanc, "aucun" | "ailleurs" | "bon"> | "" } | null;
  // ----- la cuve -----
  /** vrai si la cuve est dans le porte-cuve */
  enPlace: boolean;
  /** la solution versée dans la cuve ; null si elle est vide */
  contenu: string | null;
  /** la part de cette solution dans la cuve, et la concentration qu'y ajoute ce qui restait sur les parois */
  part: number;
  reste: number;
  /** vrai dès que la cuve a servi : ses parois gardent un peu de la dernière solution, à la concentration `residu` */
  humide: boolean;
  residu: number;
  /** la solution que la cuve contenait quand elle a été vidée pour la dernière fois ; null si elle n'a pas servi */
  videe: string | null;
  /** vrai si la cuve a été rincée avec la solution qu'elle contient : remplie une première fois avec elle, puis vidée */
  rincee: boolean;
  /** vrai si le faisceau traverse les faces lisses de la cuve */
  lisse: boolean;
  // ----- les mesures -----
  mesures: Mesure[];
  /** la pente de la droite d'étalonnage tracée par l'élève ; null tant qu'elle ne l'est pas */
  pente: number | null;
  /** ce que l'élève lit sur son graphique : la concentration de l'échantillon, ou le temps de demi-réaction */
  lue: number | null;
  // ----- le temps -----
  /** l'heure de la paillasse */
  t: number;
  /** l'heure du mélange des deux solutions, et celle où le chronomètre a été lancé */
  melange: number | null;
  chrono: number | null;
  /** le nombre de séries de mesures recommencées */
  essais: number;
}

/** La molette de longueur d'onde : sa course et son pas. */
export const LAMBDA = { min: 400, max: 700, pas: 5 };
/** La part de la solution d'avant qui reste dans une cuve vidée sans être rincée. */
export const RESTE = 0.08;
/** Ce qu'une cuve vide ajoute à l'absorbance : l'air, dedans, renvoie plus de lumière que l'eau. */
const CUVE_VIDE = 0.04;
/** La lumière parasite qui atteint le détecteur, rapportée à celle de la lampe : capot fermé, capot ouvert. */
const PARASITE = { ferme: 0.002, ouvert: 0.15 };
/** Au-delà de cette absorbance, l'eau du blanc n'est plus de l'eau pure : il y reste de l'espèce colorée. */
const BLANC_POLLUE = 0.01;
/** Le nombre de relevés qu'un suivi peut garder : assez pour qu'un élève qui relève très souvent aille jusqu'au palier. */
export const RELEVES_MAX = 400;
/** Le retard du chronomètre sur le mélange, en secondes, à partir duquel les dates sont faussées : un peu, puis beaucoup. */
export const retardTolere = (r: ReglagesSpectro): { leger: number; grave: number } => ({ leger: Math.max(5, 0.05 * r.demi), grave: Math.max(15, 0.15 * r.demi) });
/** Le nombre de relevés qu'il faut pendant que l'absorbance monte le plus vite : avant une fois et demie le temps de demi-réaction. */
export const RELEVES_DEBUT = 3;
/** L'écart toléré, rapporté au temps de demi-réaction, entre le temps lu et celui que donne la courbe : c'est une lecture sur un graphique. */
export const LECTURE_TEMPS = { leger: 0.1, grave: 0.25 };
/** L'écart toléré entre la concentration lue et celle que donne la droite de l'élève : 3 % de la valeur, et au moins 1,5 % de l'étendue de la gamme. */
export const lectureToleree = (r: ReglagesSpectro, surDroite: number): number => Math.max(0.03 * surDroite, 0.015 * Math.max(...r.gamme));

// un zéro ne porte jamais de signe : l'afficheur n'écrit pas « −0,000 »
const millieme = (x: number) => Math.round(x * 1000) / 1000 || 0;
const centieme = (x: number) => Math.round(x * 100) / 100;
const A = (x: number) => nombre(x, 3);

const DEPART: EtatSpectro = {
  lambda: LAMBDA.min, capot: true, blanc: null,
  enPlace: false, contenu: null, part: 1, reste: 0, humide: false, residu: 0, videe: null, rincee: false, lisse: false,
  mesures: [], pente: null, lue: null, t: 0, melange: null, chrono: null, essais: 0,
};

// ---------- ce que l'appareil mesure ----------

/** La part de l'absorbance du maximum qu'on retrouve à une longueur d'onde : la bande d'absorption a une forme en cloche. */
export const forme = (r: ReglagesSpectro, lambda: number): number => Math.exp(-(((lambda - r.lambdaMax) / r.largeur) ** 2));
/** Ce que la cuve et le solvant absorbent à eux seuls : c'est ce que le blanc retranche. */
export const fond = (lambda: number): number => 0.05 + (0.05 * (LAMBDA.max - lambda)) / (LAMBDA.max - LAMBDA.min);
/** L'absorbance que voit le détecteur : la lumière parasite l'empêche de monter aussi haut que l'absorbance vraie. */
const vue = (vraie: number, parasite: number): number => -Math.log10((10 ** -vraie + parasite) / (1 + parasite));

/** La concentration en espèce colorée d'une solution de la paillasse à l'heure donnée ; null si la paillasse ne l'a pas. */
export function concentrationDe(r: ReglagesSpectro, s: string, heure: number, melange: number | null): number | null {
  if (s === "eau") return 0;
  if (r.mode === "cinetique") {
    // les deux solutions du mélange sont incolores ; l'espèce colorée se forme une fois qu'elles sont mélangées
    if (s === "a" || s === "b") return 0;
    // une cinétique d'ordre 1 : la part du réactif qui reste diminue de moitié à chaque temps de demi-réaction
    return s === "m" && melange !== null ? r.Cfin * (1 - partRestante({ k: Math.LN2 / r.demi }, heure - melange)) : null;
  }
  if (s === "x") return r.Cx;
  if (s === "xd") return r.Cx / r.dilution;
  const rang = /^s[1-9]$/.test(s) ? Number(s[1]) - 1 : -1;
  return rang >= 0 && rang < r.gamme.length ? r.gamme[rang] : null;
}
/** Le nom d'une solution dans une phrase : « S3 », « la boisson diluée 2 fois ». */
export const nomSolution = (r: ReglagesSpectro, s: string): string =>
  (s === "eau" ? "l'eau distillée" : s === "x" ? r.nom : s === "xd" ? `${r.nom} diluée ${r.dilution} fois` : s === "m" ? "le mélange" : s === "a" || s === "b" ? "la solution incolore" : s.toUpperCase());
/** La concentration en espèce colorée de ce que la cuve contient, avec ce qui restait de la solution d'avant. */
export const dansCuve = (r: ReglagesSpectro, etat: EtatSpectro): number =>
  (etat.contenu === null ? 0 : etat.part * (concentrationDe(r, etat.contenu, etat.t, etat.melange) ?? 0) + etat.reste);

/** L'absorbance brute : ce que le détecteur reçoit, avant le zéro du blanc. */
export function absorbanceBrute(r: ReglagesSpectro, etat: EtatSpectro): number {
  let vraie = 0;
  if (etat.enPlace) {
    vraie = fond(etat.lambda) + (etat.contenu === null ? CUVE_VIDE : r.k * dansCuve(r, etat) * forme(r, etat.lambda));
    // les faces dépolies diffusent la lumière : très peu arrive au détecteur
    if (!etat.lisse) vraie = 1.3 * vraie + 0.85;
  }
  return vue(vraie, etat.capot ? PARASITE.ferme : PARASITE.ouvert);
}
/** L'absorbance que l'appareil affiche : la mesure brute moins le zéro du blanc, au millième. */
export const affichage = (r: ReglagesSpectro, etat: EtatSpectro): number => millieme(absorbanceBrute(r, etat) - (etat.blanc?.A ?? 0));
/** L'absorbance qu'une mesure sans défaut affiche pour une concentration : au maximum d'absorption, blanc fait, capot fermé. */
export const absorbanceJuste = (r: ReglagesSpectro, C: number): number =>
  millieme(vue(fond(r.lambdaMax) + r.k * C, PARASITE.ferme) - vue(fond(r.lambdaMax), PARASITE.ferme));
/** Ce que le chronomètre affiche : zéro tant qu'il n'est pas lancé. */
export const dateChrono = (etat: EtatSpectro): number => (etat.chrono === null ? 0 : centieme(etat.t - etat.chrono));
/** L'état du blanc pour une mesure faite maintenant. */
const etatDuBlanc = (etat: EtatSpectro): EtatDuBlanc => (etat.blanc === null ? "aucun" : etat.blanc.defaut !== "" ? etat.blanc.defaut : etat.blanc.lambda !== etat.lambda ? "ailleurs" : "bon");

/** La mesure de ce qui est dans la cuve, telle que l'élève la retient. */
function mesure(r: ReglagesSpectro, etat: EtatSpectro, s: string, lu: number): Mesure {
  const nominale = concentrationDe(r, s, etat.t, etat.melange) ?? 0;
  return {
    s, date: dateChrono(etat), heure: etat.t, lu, affiche: affichage(r, etat), lambda: etat.lambda, capot: etat.capot, lisse: etat.lisse, blanc: etatDuBlanc(etat),
    pollution: nominale > 0 ? (dansCuve(r, etat) - nominale) / nominale : 0, rincee: etat.rincee,
  };
}

// ---------- les gestes ----------

/** Applique un geste. Un geste inconnu, mal formé ou impossible ne change rien. */
function geste(r: ReglagesSpectro, etat: EtatSpectro, g: GesteBrut): EtatSpectro {
  const v = nombreDe(g, "v");
  switch (g.g) {
    // la molette de longueur d'onde
    case "lambda": {
      if (v === null || v < LAMBDA.min || v > LAMBDA.max) return etat;
      const lambda = Math.round(v / LAMBDA.pas) * LAMBDA.pas;
      return lambda === etat.lambda ? etat : { ...etat, lambda };
    }
    case "capot": return typeof g.ferme === "boolean" && g.ferme !== etat.capot ? { ...etat, capot: g.ferme } : etat;
    // tourner la cuve d'un quart de tour, quand elle est sur la paillasse
    case "tourner": return etat.enPlace ? etat : { ...etat, lisse: !etat.lisse };
    // remplir la cuve avec une solution : ce qui restait sur ses parois s'y mélange
    case "remplir": {
      const s = texteDe(g, "s");
      if (etat.enPlace || etat.contenu !== null || s === null || concentrationDe(r, s, etat.t, etat.melange) === null) return etat;
      return { ...etat, contenu: s, part: etat.humide ? 1 - RESTE : 1, reste: etat.humide ? RESTE * etat.residu : 0, rincee: etat.videe === s };
    }
    // vider la cuve dans le bécher poubelle : ses parois gardent un peu de ce qu'elle contenait
    case "vider": return etat.enPlace || etat.contenu === null ? etat : { ...etat, contenu: null, part: 1, reste: 0, humide: true, residu: dansCuve(r, etat), videe: etat.contenu, rincee: false };
    // glisser la cuve dans le porte-cuve, ou l'en sortir : le capot doit être ouvert
    case "placer": return typeof g.dans === "boolean" && g.dans !== etat.enPlace && !etat.capot ? { ...etat, enPlace: g.dans } : etat;
    // la touche du blanc : l'appareil prend pour zéro ce qu'il mesure à cet instant
    case "blanc": {
      const defaut = !etat.enPlace || etat.contenu === null ? "cuve" : etat.contenu !== "eau" || r.k * dansCuve(r, etat) * forme(r, etat.lambda) > BLANC_POLLUE ? "solution" : !etat.capot ? "capot" : !etat.lisse ? "sens" : "";
      return { ...etat, blanc: { A: absorbanceBrute(r, etat), lambda: etat.lambda, defaut } };
    }
    // étalonnage : noter l'absorbance lue sur l'afficheur pour la solution qui est dans l'appareil
    case "noter": {
      if (r.mode !== "etalonnage" || v === null || v < -1 || v > 4 || !etat.enPlace || etat.contenu === null) return etat;
      const s = etat.contenu;
      return { ...etat, mesures: [...etat.mesures.filter((m) => m.s !== s), mesure(r, etat, s, millieme(v))] };
    }
    // étalonnage : la pente de la règle posée sur les points
    case "droite": return r.mode === "etalonnage" && v !== null && v >= 0 && v <= 100 ? { ...etat, pente: Math.round(v * 1e5) / 1e5 } : etat;
    // ce que l'élève lit sur son graphique avec le repère : une concentration, ou un temps de demi-réaction
    case "lire": return v !== null && v >= 0 && v <= 100000 ? { ...etat, lue: millieme(v) } : etat;
    // suivi cinétique : verser la seconde solution dans la première
    case "melanger": return r.mode === "cinetique" && etat.melange === null ? { ...etat, melange: etat.t } : etat;
    // le chronomètre ne se lance qu'une fois par mélange : y toucher de nouveau ne décale pas les dates déjà relevées
    case "chrono": return r.mode === "cinetique" && etat.chrono === null ? { ...etat, chrono: etat.t } : etat;
    // le temps qui passe
    case "attendre": return v !== null && v > 0 && v <= 3600 && etat.t + v <= 100000 ? { ...etat, t: centieme(etat.t + v) } : etat;
    // suivi cinétique : la touche qui relève l'absorbance affichée, avec la date du chronomètre
    case "relever": {
      if (r.mode !== "cinetique" || !etat.enPlace || etat.contenu === null || etat.chrono === null || etat.mesures.length >= RELEVES_MAX) return etat;
      return { ...etat, mesures: [...etat.mesures, mesure(r, etat, etat.contenu, affichage(r, etat))] };
    }
    // une nouvelle série : les mesures s'effacent, l'appareil reste comme il est ; l'ancien mélange est jeté, un nouveau
    // est prêt. La cuve qui contenait l'ancien mélange revient sur la paillasse, vidée et rincée à l'eau distillée.
    case "recommencer":
      return etat.mesures.length === 0 && etat.pente === null && etat.lue === null && etat.melange === null ? etat
        : { ...etat, mesures: [], pente: null, lue: null, melange: null, chrono: null, essais: etat.essais + 1, ...(etat.contenu === "m" ? { enPlace: false, contenu: null, part: 1, reste: 0, humide: true, residu: 0, videe: "eau", rincee: false } : {}) };
    default: return etat;
  }
}

// ---------- le bilan ----------

type Signale = (code: string, grave: boolean, texte: string) => void;

/** Les fautes qui tiennent à l'appareil, communes aux deux usages : le blanc, la longueur d'onde, le capot, le sens de la cuve. */
function fautesAppareil(r: ReglagesSpectro, mesures: Mesure[], faute: Signale, attendue: (m: Mesure) => number, importante: (m: Mesure) => boolean): void {
  const blanc = (etat: EtatDuBlanc) => mesures.find((m) => m.blanc === etat);
  const mal = (["cuve", "solution", "capot", "sens"] as const).map(blanc).find((m) => m !== undefined);
  const ailleurs = blanc("ailleurs");
  if (blanc("aucun")) faute("blanc", true, `Tu as mesuré sans avoir fait le blanc : la cuve et l'eau absorbent un peu de lumière, et l'appareil affiche environ ${nombre(fond(r.lambdaMax), 2)} de trop. Avant toute mesure, place une cuve d'eau distillée et appuie sur « Blanc ».`);
  else if (mal?.blanc === "cuve") faute("blanc", true, "Tu as fait le blanc sans cuve d'eau distillée dans l'appareil : le zéro ne tient pas compte de ce que la cuve et l'eau absorbent.");
  else if (mal?.blanc === "solution") faute("blanc", true, `Ton blanc n'était pas de l'eau distillée pure : il y avait ${r.espece.replace(/^le /, "du ").replace(/^la /, "de la ").replace(/^l'/, "de l'")} dans la cuve. Les absorbances mesurées ensuite sont trop petites. Rince la cuve à l'eau distillée avant de faire le blanc.`);
  else if (mal?.blanc === "capot") faute("blanc", true, "Tu as fait le blanc capot ouvert : la lumière de la salle a faussé le zéro de l'appareil.");
  else if (mal?.blanc === "sens") faute("blanc", true, "Tu as fait le blanc avec la cuve tournée d'un quart de tour : le faisceau traversait ses faces dépolies, et le zéro est faux.");
  else if (ailleurs) faute("blanc", false, `Tu as changé la longueur d'onde après le blanc : le zéro ne vaut que pour la longueur d'onde où il a été fait. Il fallait refaire le blanc à ${ailleurs.lambda} nm.`);

  const lambdas = [...new Set(mesures.map((m) => m.lambda))].sort((a, b) => a - b);
  if (lambdas.length > 1) faute("longueur", true, `Tu as changé de longueur d'onde entre tes mesures (${lambdas[0]} nm, puis ${lambdas[lambdas.length - 1]} nm) : elles ne se comparent plus entre elles.`);
  else if (lambdas.length === 1 && Math.abs(lambdas[0] - r.lambdaMax) > 10) {
    const part = forme(r, lambdas[0]);
    faute("longueur", part < 0.5, `Tu as mesuré à ${lambdas[0]} nm : ${r.espece} absorbe le plus à ${r.lambdaMax} nm. À ${lambdas[0]} nm, l'absorbance ne vaut que ${nombre(100 * part, 0)} % de sa valeur au maximum : la mesure est peu sensible. Tourne la molette jusqu'à la plus grande absorbance.`);
  }

  const ouverts = mesures.filter((m) => !m.capot);
  if (ouverts.length > 0) {
    const m = ouverts.find(importante) ?? ouverts[0];
    faute("capot", ouverts.length > 1 || importante(m), `Tu as relevé l'absorbance de ${nomSolution(r, m.s)} capot ouvert : la lumière de la salle atteint le détecteur. L'appareil affichait ${A(m.affiche)} ; capot fermé, il aurait affiché ${A(attendue(m))} environ.`);
  }
  const tournees = mesures.filter((m) => !m.lisse);
  if (tournees.length > 0) {
    const m = tournees.find(importante) ?? tournees[0];
    faute("sens", tournees.length > 1 || importante(m), `Pour ${nomSolution(r, m.s)}, la cuve était tournée d'un quart de tour : le faisceau traversait ses faces dépolies, qui diffusent la lumière. L'appareil affichait ${A(m.affiche)} au lieu de ${A(attendue(m))} environ.`);
  }
}

/** Le bilan d'un dosage par étalonnage : la concentration lue sur la droite, et les fautes relevées par le professeur. */
function bilanEtalonnage(r: ReglagesSpectro, etat: EtatSpectro): BilanPaillasse {
  const fautes: Faute[] = [];
  const faute: Signale = (code, grave, texte) => fautes.push({ code, grave, texte });
  const C = (x: number) => `${nombre(x, r.decimales)} ${r.unite}`;
  const sommet = Math.max(...r.gamme);
  // sans défaut, on mesure l'échantillon tel quel s'il tient dans la gamme, dilué sinon
  const facteurJuste = r.Cx > sommet ? r.dilution : 1;
  const etalons = etat.mesures.filter((m) => /^s[1-9]$/.test(m.s));
  const echantillon = [...etat.mesures].reverse().find((m) => m.s === "x" || m.s === "xd");
  const F = echantillon ? (echantillon.s === "xd" ? r.dilution : 1) : facteurJuste;
  const exacte = r.Cx / F;
  const dilue = F > 1 ? `${r.nom} diluée ${r.dilution} fois` : r.nom;

  if (etat.mesures.length === 0) {
    faute("mesure", true, "Tu n'as noté aucune absorbance : le dosage n'est pas fait.");
    return { score: 0, fautes, mesures: { C: exacte, F }, lignes: [`Sans mesure, on continue avec les valeurs du professeur : pour ${dilue}, C = ${C(exacte)}${F > 1 ? `, avec un facteur de dilution F = ${F}` : ""}.`] };
  }
  const nominale = (m: Mesure) => concentrationDe(r, m.s, m.heure, null) ?? 0;
  fautesAppareil(r, etat.mesures, faute, (m) => absorbanceJuste(r, nominale(m)), (m) => m.s === "x" || m.s === "xd");

  // la cuve : rincée une fois avec la solution, elle n'est jamais reprochée, même s'il y reste une trace de la solution d'avant
  const polluees = etat.mesures.filter((m) => !m.rincee && Math.abs(m.pollution) > 0.03);
  if (polluees.length > 0) {
    const pire = polluees.reduce((a, b) => (Math.abs(b.pollution) > Math.abs(a.pollution) ? b : a));
    faute("rincage", polluees.length > 2, `Tu n'as pas rincé la cuve avec ${nomSolution(r, pire.s)} avant de la remplir : il y restait un peu de la solution d'avant, et la concentration dans la cuve est fausse de ${nombre(100 * Math.abs(pire.pollution), 0)} %${polluees.length > 1 ? ` (même défaut pour ${polluees.length - 1} autre${polluees.length > 2 ? "s" : ""} solution${polluees.length > 2 ? "s" : ""})` : ""}. Remplis la cuve une première fois, vide-la, puis remplis-la de nouveau.`);
  }
  // les lectures de l'afficheur
  const malLues = etat.mesures.filter((m) => Math.abs(m.lu - m.affiche) > 0.004);
  if (malLues.length > 0) {
    const pire = malLues.reduce((a, b) => (Math.abs(b.lu - b.affiche) > Math.abs(a.lu - a.affiche) ? b : a));
    faute("lecture", Math.abs(pire.lu - pire.affiche) > 0.03, `Pour ${nomSolution(r, pire.s)}, tu as noté ${A(pire.lu)} ; l'appareil affichait ${A(pire.affiche)}.`);
  }
  // la gamme et la droite
  if (etalons.length < 3) faute("gamme", true, `Tu n'as mesuré que ${etalons.length} solution${etalons.length > 1 ? "s" : ""} étalon${etalons.length > 1 ? "s" : ""} : il en faut au moins trois pour tracer une droite d'étalonnage.`);
  else if (etalons.length < r.gamme.length) faute("gamme", false, `Tu n'as mesuré que ${etalons.length} des ${r.gamme.length} solutions étalons : avec toute la gamme, la droite est mieux placée.`);
  const ajustee = etalons.length >= 2 ? etalons.reduce((s, m) => s + nominale(m) * m.lu, 0) / etalons.reduce((s, m) => s + nominale(m) ** 2, 0) : null;
  if (etat.pente === null) faute("droite", true, "Tu n'as pas tracé la droite d'étalonnage : sans elle, l'absorbance de l'échantillon ne donne pas sa concentration.");
  else if (ajustee !== null && ajustee > 0) {
    const ecart = (etat.pente - ajustee) / ajustee;
    if (Math.abs(ecart) > 0.025) faute("droite", Math.abs(ecart) > 0.07, `Ta droite passe trop ${ecart > 0 ? "haut" : "bas"} : pour ${C(sommet)}, elle donne A = ${A(etat.pente * sommet)}, alors que tes points donnent ${A(ajustee * sommet)}. Fais-la passer par l'origine et au plus près de tous tes points.`);
  }
  // l'échantillon
  if (!echantillon) faute("echantillon", true, `Tu n'as pas mesuré ${r.nom} : le dosage n'est pas fait.`);
  else {
    const haut = etalons.length > 0 ? Math.max(...etalons.map((m) => m.lu)) : absorbanceJuste(r, sommet);
    if (echantillon.lu > 1.03 * haut) faute("horsgamme", true, `L'absorbance de ${nomSolution(r, echantillon.s)}, ${A(echantillon.lu)}, dépasse celle de ta solution étalon la plus concentrée, ${A(haut)} : hors de la gamme, la droite ne vaut plus. Il fallait mesurer ${r.nom} diluée ${r.dilution} fois.`);
    if (etat.lue === null) faute("concentration", true, `Tu n'as pas lu la concentration de ${nomSolution(r, echantillon.s)} sur ta droite.`);
    else if (etat.pente !== null && etat.pente > 0) {
      const surDroite = echantillon.lu / etat.pente;
      // une lecture sur un graphique : elle se juge à quelques dixièmes près, pas au centième
      const ecart = Math.abs(etat.lue - surDroite) / lectureToleree(r, surDroite);
      if (ecart > 1) faute("concentration", ecart > 3, `Tu as lu ${C(etat.lue)} ; pour A = ${A(echantillon.lu)}, ta droite donne ${C(surDroite)}. Place le repère là où la droite coupe l'absorbance de l'échantillon.`);
    }
  }
  const lue = etat.lue !== null && echantillon ? etat.lue : exacte;
  const lignes = etat.lue !== null && echantillon
    ? [`Concentration lue sur ta droite pour ${dilue} : C = ${C(lue)}.`, F > 1 ? `Cette solution est diluée : facteur de dilution F = ${F}.` : `Tu as mesuré ${r.nom} sans la diluer : F = 1.`, `Valeur attendue pour une manipulation sans défaut : ${C(exacte)}.`]
    : [`Sans concentration lue, on continue avec la valeur du professeur : pour ${dilue}, C = ${C(exacte)}${F > 1 ? `, avec un facteur de dilution F = ${F}` : ""}.`];
  return { score: scoreDesFautes(fautes), fautes, mesures: { C: lue, F }, lignes };
}

/** Le bilan d'un suivi cinétique : le temps de demi-réaction lu sur la courbe, et les fautes relevées par le professeur. */
function bilanCinetique(r: ReglagesSpectro, etat: EtatSpectro): BilanPaillasse {
  const fautes: Faute[] = [];
  const faute: Signale = (code, grave, texte) => fautes.push({ code, grave, texte });
  const s = (x: number) => `${nombre(x, 0)} s`;
  const releves = etat.mesures.filter((m) => m.s === "m");
  const melange = etat.melange;

  if (releves.length === 0 || melange === null) {
    faute("suivi", true, melange === null ? "Tu n'as pas mélangé les deux solutions : il ne s'est rien passé dans la cuve." : "Tu n'as relevé aucune absorbance du mélange : le suivi n'est pas fait.");
    return { score: 0, fautes, mesures: { tDemi: r.demi }, lignes: [`Sans suivi, on continue avec la valeur du professeur : t½ = ${s(r.demi)}.`] };
  }
  fautesAppareil(r, releves, faute, (m) => absorbanceJuste(r, concentrationDe(r, "m", m.heure, melange) ?? 0), () => false);

  // le chronomètre : en retard sur le mélange, toutes les dates sont trop petites
  const retard = releves[0].heure - melange - releves[0].date;
  const tolere = retardTolere(r);
  if (Math.abs(retard) > tolere.leger) faute("chrono", Math.abs(retard) > tolere.grave, `Tu as lancé le chronomètre ${s(Math.abs(retard))} ${retard > 0 ? "après" : "avant"} le mélange : toutes tes dates sont trop ${retard > 0 ? "petites" : "grandes"} d'autant. Lance-le à l'instant où tu mélanges.`);
  // les relevés : assez serrés au début, et jusqu'à ce que l'absorbance ne change plus
  const durees = releves.map((m) => m.heure - melange);
  const fin = Math.max(...durees);
  if (fin < 5 * r.demi) faute("fin", true, `Tu as arrêté tes relevés à ${s(fin - retard)} : l'absorbance montait encore. Il faut continuer jusqu'à ce qu'elle ne change plus, pour connaître sa valeur finale.`);
  const debut = durees.filter((d) => d <= 1.5 * r.demi).length;
  if (debut < RELEVES_DEBUT) faute("releves", debut < 2, `Tu n'as que ${debut} relevé${debut > 1 ? "s" : ""} pendant que l'absorbance montait le plus vite : le début de la courbe est mal connu. Relève l'absorbance plus souvent au début.`);
  // la lecture sur la courbe
  const surCourbe = r.demi - retard;
  // une courbe arrêtée trop tôt ne donne pas la valeur finale : la lecture ne peut pas y être jugée. Sur une courbe
  // faussée par l'appareil, seule une lecture très loin du compte se remarque.
  const arretee = fautes.some((f) => f.code === "fin");
  const faussee = fautes.some((f) => ["blanc", "longueur", "capot", "sens"].includes(f.code));
  if (etat.lue === null) faute("lecture", true, "Tu n'as pas lu le temps de demi-réaction sur ta courbe.");
  else if (!arretee) {
    const ecart = Math.abs(etat.lue - surCourbe) / r.demi;
    if (faussee && ecart > 0.3) faute("lecture", true, `Tu as lu t½ = ${s(etat.lue)} : c'est très loin de ce que donne une courbe juste, ${s(surCourbe)} environ.`);
    else if (!faussee && ecart > LECTURE_TEMPS.leger) faute("lecture", ecart > LECTURE_TEMPS.grave, `Tu as lu t½ = ${s(etat.lue)} ; sur ta courbe, l'absorbance atteint la moitié de sa valeur finale à ${s(surCourbe)}. Pose d'abord le trait de la valeur finale sur le palier, puis le repère du temps là où la moitié de cette valeur coupe la courbe.`);
  }
  const lignes = etat.lue === null
    ? [`Sans lecture sur la courbe, on continue avec la valeur du professeur : t½ = ${s(r.demi)}.`]
    : [`Temps de demi-réaction lu sur ta courbe : t½ = ${s(etat.lue)}.`, `Valeur attendue pour une manipulation sans défaut : ${s(r.demi)}.`];
  return { score: scoreDesFautes(fautes), fautes, mesures: { tDemi: etat.lue ?? r.demi }, lignes };
}

export const regles: ReglesPaillasse<ReglagesSpectro, EtatSpectro> = {
  // au départ, la molette est loin du maximum d'absorption : à l'élève de le chercher
  depart: (r) => ({ ...DEPART, lambda: r.lambdaMax < 550 ? 620 : 450 }),
  geste,
  bilan: (r, etat) => (r.mode === "cinetique" ? bilanCinetique(r, etat) : bilanEtalonnage(r, etat)),
};
