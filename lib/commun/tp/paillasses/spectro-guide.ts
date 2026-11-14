// Le guide de la paillasse Spectro : ce qu'un professeur, debout à côté de l'élève, lui dirait de faire maintenant.
// Il se calcule à partir de l'état de la manipulation et de ce que la vue retient en plus : la saisie ouverte, le
// graphique ouvert, le temps accéléré, le trait de la valeur finale. Ici aussi, poser un objet : ce que ce geste donne aux règles.
// Fonctions pures : la vue s'en sert pour placer la main et écrire la phrase ; les tests suivent le guide jusqu'au bout
// et vérifient que la manipulation obtenue est sans faute (tests/unitaires/tp/spectro-guide.test.ts).
import type { GesteBrut } from "../types";
import { LECTURE_TEMPS, RELEVES_DEBUT, RESTE, concentrationDe, dansCuve, forme, lectureToleree, nomSolution, retardTolere, type EtatSpectro, type Mesure, type ReglagesSpectro } from "./spectro";

export type CibleSpectro = "cuve" | "poubelle" | "porte" | "repos" | "becher";
export type ToucheSpectro = "tourner" | "capot" | "blanc" | "relever" | "lancer" | "temps";
export type BoutonSpectro = "noter" | "graphe" | "retour" | "recommencer" | "fini";
/** Ce que le guide montre sans qu'on y touche : l'afficheur ; sur le graphique, la poignée de la règle, le repère, le trait de la valeur finale, le repère du temps. */
export type RegardSpectro = "afficheur" | "regle" | "repere" | "palier" | "temps";
/** Ce que la vue retient en plus de l'état des règles. */
export interface VueSpectro {
  /** la saisie d'une absorbance est ouverte */
  saisie: boolean;
  /** le graphique, ou la courbe, est ouvert */
  graphe: boolean;
  /** le temps de la paillasse est accéléré */
  rapide: boolean;
  /** sur la courbe d'un suivi : l'absorbance où l'élève a posé le trait de la valeur finale ; null s'il ne l'a pas posé */
  palier: number | null;
}

// ---------- poser un objet ----------

/** Le tube, ou le bécher, d'où vient une solution : son nom d'objet dans la scène. */
export const objetDe = (s: string): string => (s === "m" || s === "a" ? "becher" : s);

/**
 * Poser un objet sur une cible : les gestes que ça donne aux règles, et ce qui vient de se passer, en une phrase.
 * `conseil` : le geste qui suit ; la vue ne l'ajoute que guide coupé, puisque le guide le dit déjà. Un objet inconnu ne change rien.
 */
export function pose(r: ReglagesSpectro, etat: EtatSpectro, objet: string, cible: string): { gestes: GesteBrut[]; message: string; conseil?: string } {
  const rien = { gestes: [], message: "" };
  if (objet === "cuve") {
    if (cible === "poubelle") return { gestes: [{ g: "vider" }], message: "La cuve est vidée dans le bécher poubelle." };
    if (cible === "porte") return { gestes: [{ g: "placer", dans: true }], message: "La cuve est dans le porte-cuve.", conseil: "Ferme le capot avant de lire l'afficheur." };
    if (cible === "repos") return { gestes: [{ g: "placer", dans: false }], message: "La cuve est sortie de l'appareil." };
    return rien;
  }
  if (objet === "b") return cible === "becher" ? { gestes: [{ g: "melanger" }], message: "Les deux solutions sont mélangées : la transformation commence.", conseil: "Lance le chronomètre tout de suite." } : rien;
  if (cible !== "cuve") return rien;
  const s = objet === "becher" ? (etat.melange === null ? "a" : "m") : objet;
  if (concentrationDe(r, s, etat.t, etat.melange) === null) return rien;
  return { gestes: [{ g: "remplir", s }], message: `Tu remplis la cuve : ${s === "a" ? "la solution d'iodure de potassium, seule" : nomSolution(r, s)}.` };
}

// ---------- le prochain geste ----------

/** Un pas du guide : la phrase, et le geste à montrer. `etape` : le rang de l'étape du protocole en cours. */
export type PasDuGuide = { cle: string; texte: string; etape: number } & (
  /** `objet` : un tube par le nom de sa solution, la cuve, le tube « b » ou le bécher d'un suivi */
  | { geste: "glisser"; objet: string; cible: CibleSpectro }
  /** une touche de l'appareil, le capot, le poussoir qui tourne la cuve */
  | { geste: "toucher"; touche: ToucheSpectro }
  /** tourner la molette jusqu'à la longueur d'onde `vers` */
  | { geste: "tourner"; vers: number }
  | { geste: "montrer"; quoi: RegardSpectro }
  /** une touche sous la scène */
  | { geste: "bouton"; bouton: BoutonSpectro }
);

/** Sans rinçage, une cuve n'est propre que si ce qu'elle contient est à moins de 0,5 % de la solution versée ; de l'eau, quand elle n'absorbe presque rien. */
const PROPRE = 0.005;
// après la solution la plus concentrée, un seul rinçage à l'eau laisse une trace qui décalerait le zéro : le guide en fait faire deux
const EAU_PURE = 0.002;
/** Le guide fait reprendre une lecture avant qu'elle ne compte comme une faute : à cette part de l'écart toléré par le professeur. */
const MARGE = 0.8;
/** Un suivi va jusqu'au palier : le guide fait relever jusqu'à ce nombre de temps de demi-réaction. */
const PALIER = 6.2;

/** La pente de la droite qui passe par l'origine et au plus près des points de la gamme ; null avec moins de deux points. */
export function penteAjustee(r: ReglagesSpectro, mesures: readonly Mesure[]): number | null {
  const points = mesures.filter((m) => /^s[1-9]$/.test(m.s)).map((m) => ({ C: r.gamme[Number(m.s[1]) - 1], A: m.lu }));
  const carres = points.reduce((s, p) => s + p.C * p.C, 0);
  return points.length >= 2 && carres > 0 ? points.reduce((s, p) => s + p.C * p.A, 0) / carres : null;
}
/** Vrai si l'appareil était prêt pour cette mesure : blanc fait, capot fermé, cuve dans le bon sens, au maximum d'absorption. */
const saine = (r: ReglagesSpectro, m: Mesure): boolean => m.blanc === "bon" && m.capot && m.lisse && m.lambda === r.lambdaMax;
/** Vrai si une mesure de dosage est sans défaut : l'appareil prêt, la cuve rincée, l'afficheur bien recopié. */
const bonne = (r: ReglagesSpectro, m: Mesure): boolean => saine(r, m) && (m.rincee || Math.abs(m.pollution) <= 0.03) && Math.abs(m.lu - m.affiche) <= 0.004;

/**
 * Ce qu'il faut faire maintenant. La fonction rend toujours un pas : le premier geste qui manque, dans l'ordre du
 * protocole. Elle ne lit que ce qu'un professeur verrait par-dessus l'épaule de l'élève.
 */
export function prochain(r: ReglagesSpectro, etat: EtatSpectro, v: VueSpectro): PasDuGuide {
  const glisser = (cle: string, etape: number, texte: string, objet: string, cible: CibleSpectro): PasDuGuide => ({ cle, etape, texte, geste: "glisser", objet, cible });
  const toucher = (cle: string, etape: number, texte: string, touche: ToucheSpectro): PasDuGuide => ({ cle, etape, texte, geste: "toucher", touche });
  const bouton = (cle: string, etape: number, texte: string, quel: BoutonSpectro): PasDuGuide => ({ cle, etape, texte, geste: "bouton", bouton: quel });
  const montrer = (cle: string, etape: number, texte: string, quoi: RegardSpectro): PasDuGuide => ({ cle, etape, texte, geste: "montrer", quoi });
  const absorbe = (C: number) => r.k * C * forme(r, etat.lambda);
  const nominale = (s: string) => concentrationDe(r, s, etat.t, etat.melange) ?? 0;
  /** Vrai si une concentration dans la cuve vaut bien celle de la solution `s`. Le mélange d'un suivi ne se rince pas : le temps presse. */
  const juste = (s: string, C: number) => (s === "m" || s === "a" ? true : nominale(s) > 0 ? Math.abs(C - nominale(s)) / nominale(s) <= PROPRE : absorbe(C) <= EAU_PURE);
  /** Vrai si la cuve contient la solution `s`, propre : rincée avec elle, ou versée dans une cuve qui ne gardait rien d'autre. */
  const propre = (s: string) => etat.contenu === s && ((etat.rincee && nominale(s) > 0) || juste(s, dansCuve(r, etat)));
  const leTube = (s: string) => (s === "eau" ? "le tube d'eau distillée" : s === "m" ? "le bécher du mélange" : s === "x" ? `le tube de ${r.etiquette}` : s === "xd" ? `le tube de ${r.etiquette} diluée` : `le tube ${s.toUpperCase()}`);
  const blancBon = etat.blanc !== null && etat.blanc.defaut === "" && etat.blanc.lambda === etat.lambda;

  /**
   * Faire arriver dans l'appareil, capot fermé, une cuve propre de la solution `s`, ses faces lisses sur le trajet du
   * faisceau. Rend le geste qui manque, ou null quand tout y est. Une cuve qui garde trop de la solution d'avant est
   * vidée, puis remplie de nouveau : c'est le rinçage. `sortie` : l'étape du protocole où la cuve d'avant sort de
   * l'appareil ; `pourquoi` : la raison de ce changement de solution, dite avec le premier geste.
   */
  const installe = (s: string, etape: number, sortie = etape, pourquoi = ""): PasDuGuide | null => {
    const dit = (texte: string) => (pourquoi ? `${pourquoi} ${texte}` : texte);
    /** Sortir la cuve de l'appareil : ouvrir le capot, puis la glisser sur la paillasse. */
    const sors = (rang: number): PasDuGuide =>
      (etat.capot ? toucher(`${s}-rouvrir`, rang, dit("Ouvre le capot : touche-le."), "capot") : glisser(`${s}-sortir`, rang, "Sors la cuve de l'appareil : glisse-la sur la paillasse.", "cuve", "repos"));
    if (!propre(s)) {
      const rincage = etat.contenu === s;
      if (etat.enPlace) return sors(rincage ? etape : sortie);
      if (etat.contenu !== null) return glisser(`${s}-vider`, rincage ? etape : sortie, rincage ? "C'était le rinçage. Vide la cuve dans le bécher poubelle." : "Vide la cuve dans le bécher poubelle.", "cuve", "poubelle");
      // la cuve vient d'être rincée avec cette solution, ou elle ne garde rien d'une autre : elle se remplit pour de bon
      const arincer = !(etat.videe === s && nominale(s) > 0) && !juste(s, etat.humide ? (1 - RESTE) * nominale(s) + RESTE * etat.residu : nominale(s));
      return glisser(arincer ? `${s}-rincer` : `${s}-remplir`, etape, arincer ? `Rince la cuve ${s === "eau" ? "à l'eau distillée" : "avec la solution"} : glisse ${leTube(s)} au-dessus d'elle.` : `Remplis la cuve : glisse ${leTube(s)} au-dessus d'elle.`, objetDe(s), "cuve");
    }
    if (!etat.lisse) return etat.enPlace ? sors(etape) : toucher(`${s}-tourner`, etape, "Regarde la vue de dessus : le faisceau doit traverser les faces lisses de la cuve. Touche « Tourner ».", "tourner");
    if (!etat.enPlace) return etat.capot ? toucher(`${s}-ouvrir`, etape, "Ouvre le capot : touche-le.", "capot") : glisser(`${s}-placer`, etape, "Glisse la cuve dans le porte-cuve.", "cuve", "porte");
    if (!etat.capot) return toucher(`${s}-fermer`, etape, "Ferme le capot : touche-le.", "capot");
    return null;
  };
  /** Le blanc : une cuve d'eau distillée propre dans l'appareil, puis la touche. */
  const faisLeBlanc = (etape: number, sortie = etape): PasDuGuide => installe("eau", etape, sortie) ?? toucher("blanc", etape, "Appuie sur « Blanc » : l'appareil se met à zéro sur l'eau distillée.", "blanc");
  const fini = (etape: number): PasDuGuide => ({ cle: "fini", etape, texte: "Tout est fait. Touche « J'ai fini » pour appeler le professeur.", geste: "bouton", bouton: "fini" });

  // ---------- le suivi cinétique ----------
  if (r.mode === "cinetique") {
    const E = { molette: 0, blanc: 1, melange: 2, cuve: 3, relever: 4, fin: 5, courbe: 6 };
    const releves = etat.mesures.filter((m) => m.s === "m");
    const dernier = releves[releves.length - 1];
    const melange = etat.melange;
    const retard = melange === null ? 0 : (etat.chrono ?? etat.t) - melange;
    // ce qui ne se rattrape qu'avec un nouveau mélange
    const debut = melange === null ? 0 : releves.filter((m) => m.heure - melange <= 1.5 * r.demi).length;
    const pourquoi = melange === null ? null
      : !blancBon || releves.some((m) => !saine(r, m)) ? "Le blanc, la longueur d'onde, le capot ou la cuve n'étaient pas prêts quand la transformation a commencé."
      : Math.abs(retard) > retardTolere(r).leger ? "Le chronomètre n'est pas parti en même temps que le mélange : toutes les dates seraient décalées."
      : etat.t - melange > 1.5 * r.demi && debut < RELEVES_DEBUT ? "Le début de la transformation est passé sans assez de relevés." : null;
    if (v.graphe) {
      // la courbe ne se lit qu'une fois le palier atteint
      if (melange === null || pourquoi || dernier === undefined || dernier.heure - melange < PALIER * r.demi) return bouton("retour", E.fin, "La courbe n'est pas prête : il reste à faire sur la paillasse. Touche « Revenir à la paillasse ».", "retour");
      // le palier : la valeur des derniers relevés
      if (v.palier === null || Math.abs(v.palier - dernier.lu) > 0.02 * dernier.lu) return montrer("courbe-palier", E.courbe, "Glisse le trait de la valeur finale sur le palier de la courbe : sa poignée est à droite.", "palier");
      return montrer("courbe-temps", E.courbe, "Le trait vert est à la moitié de la valeur finale. Glisse le repère du temps là où il coupe la courbe, puis touche « Noter ce temps ».", "temps");
    }
    if (melange === null) {
      if (etat.lambda !== r.lambdaMax) return { cle: "molette", etape: E.molette, texte: `Tourne la molette de longueur d'onde jusqu'à ${r.lambdaMax} nm.`, geste: "tourner", vers: r.lambdaMax };
      if (!blancBon) return faisLeBlanc(E.blanc);
      // le blanc est fait : la cuve sort, vide, prête à recevoir le mélange
      if (etat.enPlace) return etat.capot ? toucher("pret-rouvrir", E.blanc, "Le blanc est fait. Ouvre le capot : touche-le.", "capot") : glisser("pret-sortir", E.blanc, "Sors la cuve de l'appareil : glisse-la sur la paillasse.", "cuve", "repos");
      if (etat.contenu !== null) return glisser("pret-vider", E.blanc, "Vide la cuve dans le bécher poubelle.", "cuve", "poubelle");
      return glisser("melanger", E.melange, "Verse la solution de peroxodisulfate dans le bécher d'iodure de potassium : glisse le tube sur le bécher.", "b", "becher");
    }
    if (pourquoi) return bouton("refaire", E.melange, `${pourquoi} Touche « Nouveau mélange ».`, "recommencer");
    if (etat.chrono === null) return toucher("lancer", E.melange, "Lance le chronomètre, tout de suite.", "lancer");
    const manque = installe("m", E.cuve);
    if (manque) return manque;
    if (dernier === undefined) return toucher("relever", E.relever, "Touche « Relever » : c'est le premier point de la courbe.", "relever");
    const duree = dernier.heure - melange;
    if (duree < PALIER * r.demi) {
      if (!v.rapide) return toucher("accelerer", E.relever, `Accélère le temps : touche « Temps ×${r.cadence} ».`, "temps");
      return duree < 2 * r.demi
        ? toucher("suivre", E.relever, "Touche « Relever » régulièrement, toutes les deux secondes environ, tant que l'absorbance monte.", "relever")
        : toucher("suivre-fin", E.fin, "L'absorbance monte moins vite : un relevé toutes les cinq secondes suffit. Continue jusqu'à ce qu'elle ne change plus.", "relever");
    }
    if (etat.lue === null) return bouton("courbe", E.courbe, "L'absorbance ne change plus : c'est assez. Touche « Ouvrir la courbe ».", "graphe");
    if (Math.abs(etat.lue - (r.demi - retard)) / r.demi > MARGE * LECTURE_TEMPS.leger) return bouton("courbe", E.courbe, "Ta lecture est loin de ce que donne ta courbe. Touche « Ouvrir la courbe » et reprends-la.", "graphe");
    return fini(E.courbe);
  }

  // ---------- le dosage par étalonnage ----------
  const E = { placer: 0, molette: 1, blanc: 2, gamme: 3, boisson: 4, regle: 5, repere: 6 };
  const mesure = (s: string) => etat.mesures.find((m) => m.s === s);
  const haut = Math.max(0, ...etat.mesures.filter((m) => /^s[1-9]$/.test(m.s)).map((m) => m.lu));
  /** La prochaine solution à mesurer : la gamme dans l'ordre, l'échantillon, puis l'échantillon dilué s'il sort de la gamme. */
  const aMesurer = (): string | null => {
    const manquante = r.gamme.map((_, i) => `s${i + 1}`).find((s) => { const m = mesure(s); return !m || !bonne(r, m); });
    if (manquante) return manquante;
    const x = mesure("x"), xd = mesure("xd");
    if (!x || !bonne(r, x)) return "x";
    // c'est la dernière mesure d'échantillon qui compte : la solution diluée se note après l'autre
    return x.lu > 1.03 * haut && (!xd || !bonne(r, xd) || etat.mesures.indexOf(xd) < etat.mesures.indexOf(x)) ? "xd" : null;
  };
  const suivante = aMesurer();
  const etapeMesure = suivante === null || suivante === "x" || suivante === "xd" ? E.boisson : E.gamme;
  if (v.saisie) return montrer("lire", etapeMesure, "Lis l'absorbance sur l'afficheur. Écris-la avec les chiffres, puis touche « Noter ».", "afficheur");

  const ajustee = penteAjustee(r, etat.mesures);
  const echantillon = [...etat.mesures].reverse().find((m) => m.s === "x" || m.s === "xd");
  const droiteJuste = etat.pente !== null && ajustee !== null && Math.abs(etat.pente - ajustee) / ajustee <= 0.02;
  const surDroite = echantillon && etat.pente ? echantillon.lu / etat.pente : null;
  const lectureJuste = etat.lue !== null && surDroite !== null && Math.abs(etat.lue - surDroite) <= MARGE * lectureToleree(r, surDroite);
  if (v.graphe) {
    if (suivante) return bouton("retour", etapeMesure, "Il reste des absorbances à mesurer. Touche « Revenir à la paillasse ».", "retour");
    if (!droiteJuste) return montrer("regle", E.regle, "Fais pivoter la règle avec sa poignée, à droite : elle part de l'origine et doit passer au plus près de tous tes points.", "regle");
    return montrer("repere", E.repere, `Glisse le repère là où la règle coupe le trait vert, l'absorbance de ${r.nom}. Puis touche « Noter cette concentration ».`, "repere");
  }

  // la longueur d'onde : la solution la plus concentrée dans l'appareil, puis la molette
  if (etat.lambda !== r.lambdaMax) {
    return installe(`s${r.gamme.length}`, E.placer) ?? { cle: "molette", etape: E.molette, texte: "Tourne la molette de longueur d'onde en regardant l'absorbance : arrête-toi sur sa plus grande valeur.", geste: "tourner", vers: r.lambdaMax };
  }
  if (!blancBon) return faisLeBlanc(E.blanc, E.molette);
  if (suivante) {
    const horsGamme = suivante === "xd" && etat.contenu === "x" ? `L'absorbance de ${r.nom} dépasse celle de ta solution étalon la plus concentrée : elle sort de la gamme. Il faut mesurer ${r.nom} diluée.` : "";
    return installe(suivante, etapeMesure, etapeMesure, horsGamme) ?? bouton(`${suivante}-noter`, etapeMesure, "Lis l'absorbance sur l'afficheur, puis touche « Noter l'absorbance ».", "noter");
  }
  if (!droiteJuste) return bouton("graphe", E.regle, "Toutes les absorbances sont notées. Touche « Ouvrir le graphique ».", "graphe");
  if (!lectureJuste) return bouton("graphe", E.repere, etat.lue === null ? "Touche « Ouvrir le graphique »." : "Ta lecture est loin de ce que donne ta droite. Touche « Ouvrir le graphique » et reprends-la.", "graphe");
  return fini(E.repere);
}
