// Le guide de la paillasse « diffraction » : ce qu'un professeur, debout à côté de l'élève, lui dirait de faire maintenant.
// Il se calcule à partir de l'état de la paillasse et de ce que la vue retient en plus : la lecture en cours, le curseur
// que le doigt tient. Ici aussi, ce que la vue fait de ses propres gestes : poser le laser ou une diapositive.
// Le guide dit le geste, jamais la mesure : il montre la zone sombre où poser un curseur, puis, de près, le sens où
// l'ajuster ; c'est l'élève qui voit le curseur arriver au milieu de la zone sombre, qui lit la graduation et qui compte
// les interfranges. Le laser se coupe avant de déplacer quoi que ce soit.
// Fonctions pures : la vue s'en sert pour placer la main et écrire la phrase ; les tests suivent le guide jusqu'au bout
// et vérifient que la manipulation obtenue est sans faute (tests/unitaires/tp/diffraction-guide.test.ts).
import { nombre } from "@/lib/commun/format";
import type { GesteBrut } from "../types";
import {
  CENTRE, PRECIS, diapositive, figureVisible, interfrange, tacheCentrale,
  type ButDiffraction, type Diapositive, type EtatDiffraction, type MesureDiffraction, type ReglagesDiffraction,
} from "./diffraction";

export type BoutonDiffraction = "mesure" | "distance" | "fini";

/** Ce que la vue retient en plus de l'état des règles. */
export interface VueDiffraction {
  /** la lecture en cours : l'écart entre les deux curseurs, le nombre d'interfranges, la distance de l'écran ; ou rien */
  saisie: "ecart" | "nombre" | "distance" | null;
  /**
   * le curseur que le doigt tient, de près, pendant la lecture de l'écart : dès qu'il est au milieu de sa zone sombre,
   * le guide dit au doigt de se lever. La vue garde cette consigne jusqu'à ce que le doigt se lève.
   */
  tenu?: 1 | 2 | null;
}

/** Un pas du guide : la phrase, et le geste à montrer. `etape` : le rang de l'étape du protocole en cours. */
export type PasDiffraction = { cle: string; texte: string; etape: number } & (
  /** toucher le bouton du laser, pour l'allumer ou l'éteindre */
  | { geste: "laser"; on: boolean }
  /** glisser le laser de la table jusqu'à son support */
  | { geste: "fixer" }
  /** glisser une diapositive de la boîte jusqu'au porte-diapositive */
  | { geste: "diapo"; id: string }
  /** glisser l'écran le long du rail, jusqu'à la graduation `vers` */
  | { geste: "ecran"; vers: number }
  /** glisser le curseur `k` jusqu'à la zone sombre qui entoure la graduation `vers` de l'écran */
  | { geste: "curseur"; k: 1 | 2; vers: number }
  /** de près, glisser doucement le curseur `k` dans un sens (1 : vers la droite), sans dire jusqu'où : l'élève regarde la zone sombre */
  | { geste: "ajuster"; k: 1 | 2; sens: 1 | -1 }
  /** lever le doigt : le curseur est au milieu de sa zone sombre */
  | { geste: "lacher" }
  /** regarder : la loupe du rail, les deux curseurs sur la graduation de l'écran, les franges entre eux */
  | { geste: "montrer"; quoi: "loupe" | "curseurs" | "franges" }
  /** une touche sous la scène */
  | { geste: "bouton"; bouton: BoutonDiffraction }
  /** rien à montrer dans la scène : la phrase dit quoi toucher (« Annuler », dans la saisie) */
  | { geste: "dire" }
);

type ButEtalonnage = Extract<ButDiffraction, { genre: "etalonnage" }>;
type ButYoung = Extract<ButDiffraction, { genre: "young" }>;

/** Une lecture est juste à un millimètre près sur le rail : ce que le professeur accepte sans faute. */
const LU = 0.1001;
/** L'écran est « à » la distance du protocole s'il n'en est pas à plus de trois centimètres en deçà ; plus loin convient aussi. */
const PRES_DE = 3;
/** En vue d'ensemble, un curseur est posé près de sa zone sombre à un millimètre et demi près ; il s'ajuste ensuite de près. */
const GROS = 1.5;

// ---------- ce que la vue fait de ses propres gestes ----------

/** Ce que donne un objet posé : les gestes pour les règles, ce qui vient de se passer, le conseil pour la suite, et s'il faut alerter. */
export interface Pose { gestes: GesteBrut[]; message: string; conseil?: string; alerte?: boolean }

/**
 * Poser le laser (sur son « support », ou sur la « table ») ou une diapositive (dans le « porte »-diapositive).
 * `message` dit ce qui vient de se passer ; `conseil`, où regarder ensuite : la vue ne l'ajoute que si le guide est
 * coupé. Un objet ou une place inconnus ne changent rien.
 */
export function pose(r: ReglagesDiffraction, etat: EtatDiffraction, objet: string, cible: string): Pose {
  if (objet === "laser") {
    if (cible !== "support" && cible !== "table") return { gestes: [], message: "" };
    const fixe = cible === "support";
    if (fixe === etat.fixe) return { gestes: [], message: "" };
    return {
      gestes: [{ g: "fixer", on: fixe }], alerte: !fixe && etat.allume,
      message: fixe ? `Le laser est fixé sur son support, face à l'écran.${etat.allume ? " Son faisceau frappe l'écran." : ""}`
        : etat.allume ? "Attention : tu as repris le laser allumé. Son faisceau part dans la salle." : "Le laser est reposé sur la table.",
    };
  }
  const d = diapositive(r, objet);
  if (!d || cible !== "porte") return { gestes: [], message: "" };
  return { gestes: [{ g: "diapo", id: d.id }], message: `Dans le support : ${d.nom}.`, conseil: figureVisible(etat) ? "Regarde l'écran, en haut." : undefined };
}

/** Le geste d'une mesure : l'écart lu entre les curseurs, et le nombre d'interfranges compté s'il y en a. */
export const mesure = (ecart: number, n?: number): GesteBrut => (n === undefined ? { g: "mesure", v: ecart } : { g: "mesure", v: ecart, n });

// ---------- où poser les curseurs ----------

/** Les deux zones sombres à pointer, sur la graduation de l'écran, et la précision qu'il faut à chaque curseur. */
export interface Pointage {
  gauche: number;
  droite: number;
  /** le nombre d'interfranges entre les deux ; 1 pour une tache centrale */
  n: number;
  /** l'écart toléré entre un curseur et le milieu de sa zone sombre, une fois ajusté de près */
  tolerance: number;
}

/**
 * Où poser les deux curseurs pour la diapositive `d`, l'écran à la distance `D`. Pour une fente ou un fil : les deux
 * extinctions qui bordent la tache centrale. Pour deux fentes : deux franges sombres éloignées, là où la figure est
 * encore bien lumineuse (à moins de sept dixièmes de la première extinction des fentes).
 */
export function pointage(r: ReglagesDiffraction, d: Diapositive, D: number): Pointage {
  const tache = tacheCentrale(r.lambda, d.a, D);
  if (d.genre !== "young") {
    // le professeur accepte 0,8 mm d'écart sur la largeur, ou 4 % : chaque curseur en prend moins de la moitié, et pas
    // plus de trois dixièmes de millimètre, pour que l'étalonnage soit bon
    return { gauche: CENTRE - tache / 2, droite: CENTRE + tache / 2, n: 1, tolerance: Math.min(0.3, 0.4 * Math.max(0.8, 0.04 * tache)) };
  }
  const i = interfrange(r.lambda, d.b, D);
  const demi = Math.max(2, Math.floor(Math.min(0.7 * (tache / 2), CENTRE - 5) / i - 0.5)) + 0.5;
  // l'interfrange doit être juste à 2 % près, lecture comprise : chaque curseur n'en prend qu'un sixième
  return { gauche: CENTRE - demi * i, droite: CENTRE + demi * i, n: 2 * demi, tolerance: 0.17 * PRECIS * 2 * demi * i };
}

// ---------- ce qu'un professeur voit par-dessus l'épaule de l'élève ----------

const ecartDes = (m: MesureDiffraction): number => Math.abs(m.curseurs[1] - m.curseurs[0]);
const derniere = (etat: EtatDiffraction, garde: (m: MesureDiffraction) => boolean): MesureDiffraction | null => [...etat.mesures].reverse().find(garde) ?? null;

/** Une tache centrale bien mesurée : la figure sur l'écran, les curseurs sur les deux extinctions, une lecture juste. */
function tacheJuste(r: ReglagesDiffraction, d: Diapositive, m: MesureDiffraction | null): m is MesureDiffraction {
  if (!m || !m.figure) return false;
  const tache = tacheCentrale(r.lambda, d.a, m.ecran);
  return Math.abs(ecartDes(m) - tache) <= Math.max(0.8, 0.04 * tache) && Math.abs(m.v - ecartDes(m)) <= 0.6;
}
/** Un interfrange bien mesuré : des franges sur l'écran, quatre interfranges au moins, bien comptés, et une valeur juste à 2 % près. */
function interfrangeJuste(r: ReglagesDiffraction, m: MesureDiffraction | null): m is MesureDiffraction {
  const d = diapositive(r, m?.diapo ?? null);
  if (!m || !d || d.genre !== "young" || !m.figure) return false;
  const i = interfrange(r.lambda, d.b, m.ecran);
  const compte = Math.round(ecartDes(m) / i);
  return compte >= 4 && m.n === compte && Math.abs(m.v / m.n - i) / i <= PRECIS;
}
/** Vrai si la distance notée est bien celle de l'écran quand il était à la position `ecran`. */
const distanceJuste = (etat: EtatDiffraction, ecran: number): boolean => etat.distance !== null && Math.abs(etat.distance.v - ecran) <= LU;

// ---------- le prochain geste ----------

const bouton = (cle: string, etape: number, texte: string, quel: BoutonDiffraction): PasDiffraction => ({ cle, etape, texte, geste: "bouton", bouton: quel });
const eteindre = (cle: string, etape: number, texte: string): PasDiffraction => ({ cle, etape, texte, geste: "laser", on: false });
const dire = (cle: string, etape: number, texte: string): PasDiffraction => ({ cle, etape, texte, geste: "dire" });
const FINI = "Tout est noté, le laser est éteint. Touche « J'ai fini » pour appeler le professeur.";

/** Le laser sur son support, l'écran à sa place, la distance notée : ce qui se fait avant la première figure. Null quand c'est fait. */
function installation(r: ReglagesDiffraction, etat: EtatDiffraction, E: { fixer: number; ecran: number }): PasDiffraction | null {
  if (!etat.fixe) {
    if (etat.allume) return eteindre("eteindre", E.fixer, "Éteins tout de suite le laser : touche son bouton. Il ne s'allume que fixé sur son support, face à l'écran.");
    return { cle: "fixer", etape: E.fixer, texte: "Prends le laser sur la table et fixe-le sur son support, au bout du banc, face à l'écran. Ne l'allume pas encore.", geste: "fixer" };
  }
  const voulue = r.but.distance;
  if (etat.ecran < voulue - PRES_DE) {
    if (etat.allume) return eteindre("eteindre", E.ecran, "Éteins le laser avant de déplacer l'écran : touche son bouton.");
    return { cle: "ecran", etape: E.ecran, texte: `Éloigne l'écran de la diapositive : glisse-le le long du rail, son repère vers la graduation ${nombre(voulue, 0)}.`, geste: "ecran", vers: voulue };
  }
  if (!distanceJuste(etat, etat.ecran)) {
    const pourquoi = !etat.distance ? "L'écran est en place : n'y touche plus."
      : etat.distance.ecran !== etat.ecran ? "L'écran a bougé depuis que tu as noté la distance : elle se relit."
      : "La distance que tu as notée ne tombe pas en face du repère de l'écran : elle se relit.";
    return bouton("distance", E.ecran, `${pourquoi} Touche « Noter la distance ».`, "distance");
  }
  return null;
}

/**
 * La mesure d'une figure : la diapositive dans le support, le laser allumé, les deux curseurs près de leur zone
 * sombre, puis la touche « Noter la mesure ». `cle` distingue les mesures ; `refaire` dit pourquoi une mesure déjà
 * notée se refait.
 */
function figure(r: ReglagesDiffraction, etat: EtatDiffraction, d: Diapositive, cle: string, etape: number, refaire: string): PasDiffraction {
  if (etat.diapo !== d.id) {
    if (etat.allume) return eteindre("eteindre", etape, "Éteins le laser avant de changer de diapositive : touche son bouton.");
    const dans = etat.diapo === null ? "Glisse-la de la boîte jusqu'au porte-diapositive, devant le laser." : "Glisse-la de la boîte jusqu'au porte-diapositive : elle prend la place de l'autre.";
    return { cle: `${cle}-diapo`, etape, texte: `${refaire}Prends ${d.nom}. ${dans}`, geste: "diapo", id: d.id };
  }
  if (!etat.allume) return { cle: "allumer", etape, texte: `${refaire}Tout est en place. Allume le laser : touche son bouton.`, geste: "laser", on: true };
  const p = pointage(r, d, etat.ecran);
  // le curseur de gauche va à gauche : les deux curseurs ne se croisent pas
  const [g, dr]: [1 | 2, 1 | 2] = etat.curseurs[0] <= etat.curseurs[1] ? [1, 2] : [2, 1];
  const ou = d.genre === "young" ? "au milieu d'une frange sombre, loin" : "dans la zone sombre qui borde la tache centrale,";
  if (Math.abs(etat.curseurs[g - 1] - p.gauche) > GROS) return { cle: `${cle}-curseur-${g}`, etape, texte: `Prends le curseur ${g} par son onglet et glisse-le ${ou} à gauche du centre.`, geste: "curseur", k: g, vers: p.gauche };
  if (Math.abs(etat.curseurs[dr - 1] - p.droite) > GROS) return { cle: `${cle}-curseur-${dr}`, etape, texte: `Prends le curseur ${dr} par son onglet et glisse-le ${ou} à droite du centre.`, geste: "curseur", k: dr, vers: p.droite };
  return bouton(`${cle}-noter`, etape, `${refaire}Les deux curseurs sont près de leur ${d.genre === "young" ? "frange" : "zone"} sombre. Touche « Noter la mesure » : de près, tu finiras de les placer.`, "mesure");
}

/** Étalonner avec les fentes connues, puis mesurer la diapositive inconnue. */
function etalonnage(r: ReglagesDiffraction, but: ButEtalonnage, etat: EtatDiffraction): PasDiffraction {
  const voulues = [...but.fentes, but.inconnue].flatMap((id) => { const d = diapositive(r, id); return d ? [d] : []; });
  const dernieres = voulues.map((d) => ({ d, m: derniere(etat, (x) => x.diapo === d.id) }));
  const positions = dernieres.flatMap(({ m }) => (m ? [m.ecran] : []));
  // tout est mesuré, sans que l'écran ait bougé d'une mesure à l'autre, et la distance notée est la bonne : c'est acquis,
  // même si l'écran a été déplacé depuis
  const acquis = dernieres.every(({ d, m }) => tacheJuste(r, d, m)) && Math.max(...positions) - Math.min(...positions) <= 0.2
    && distanceJuste(etat, positions[positions.length - 1]);
  if (!acquis) {
    const pret = installation(r, etat, { fixer: 0, ecran: 1 });
    if (pret) return pret;
    // les mesures se font toutes là où l'écran se trouve : celles d'avant un déplacement se refont
    const rang = dernieres.findIndex(({ d, m }) => !(tacheJuste(r, d, m) && m.ecran === etat.ecran));
    if (rang >= 0) {
      const { d, m } = dernieres[rang];
      const etape = d.id === but.inconnue ? 4 : rang === 0 ? 2 : 3;
      const refaire = !m ? "" : m.ecran !== etat.ecran ? `L'écran a bougé depuis ta mesure pour ${d.nom} : elle est à refaire. ` : `Ta mesure pour ${d.nom} est à refaire. `;
      return figure(r, etat, d, d.id, etape, refaire);
    }
  }
  if (etat.allume) return eteindre("eteindre-fin", 5, "Toutes tes mesures sont notées. Éteins le laser : touche son bouton.");
  return bouton("fini", 5, FINI, "fini");
}

/** Mesurer l'interfrange de deux fentes d'Young. */
function young(r: ReglagesDiffraction, but: ButYoung, etat: EtatDiffraction): PasDiffraction {
  const E = { fixer: 0, diapo: 1, ecran: 2, curseurs: 3, noter: 4, fin: 5 };
  const enPlace = diapositive(r, etat.diapo);
  // les fentes les plus serrées donnent les franges les plus larges : les plus faciles à pointer et à compter
  const fentes = enPlace?.genre === "young" ? enPlace : [...r.boite].filter((d) => d.genre === "young").sort((a, b) => a.b - b.b)[0] ?? null;
  const m = derniere(etat, (x) => diapositive(r, x.diapo)?.genre === "young");
  // la mesure est bonne, et la distance notée est celle de l'écran à ce moment : c'est acquis, même si l'écran a bougé depuis
  const acquis = interfrangeJuste(r, m) && distanceJuste(etat, m.ecran);
  if (!acquis && fentes) {
    if (!etat.fixe) return installation(r, etat, E) ?? bouton("fini", E.fin, FINI, "fini");
    // la mesure se fait là où l'écran se trouve : celle d'avant un déplacement se refait
    const ici = interfrangeJuste(r, m) && m.ecran === etat.ecran;
    // la diapositive d'abord, puis l'écran et la distance : le laser reste éteint jusque-là
    if (!ici && etat.diapo !== fentes.id) return figure(r, etat, fentes, "fentes", E.diapo, enPlace ? `Avec ${enPlace.nom}, pas de franges d'interférences : il faut deux fentes. ` : "");
    const pret = installation(r, etat, E);
    if (pret) return pret;
    if (!ici) {
      const refaire = !m ? "" : m.ecran !== etat.ecran ? "L'écran a bougé depuis ta mesure : elle est à refaire. " : "Ta mesure est à refaire. ";
      const pas = figure(r, etat, fentes, "fentes", E.curseurs, refaire);
      return pas.geste === "bouton" ? { ...pas, etape: E.noter } : pas;
    }
  }
  if (etat.allume) return eteindre("eteindre-fin", E.fin, "Ta mesure est notée. Éteins le laser : touche son bouton.");
  return bouton("fini", E.fin, FINI, "fini");
}

/**
 * Ce qu'il faut faire maintenant. La fonction rend toujours un pas : le premier geste qui manque, dans l'ordre du
 * protocole. Elle ne lit que ce qu'un professeur verrait par-dessus l'épaule de l'élève.
 */
export function prochain(r: ReglagesDiffraction, etat: EtatDiffraction, v: VueDiffraction): PasDiffraction {
  // ce que le guide dirait sans lecture en cours : c'est lui qui dit si la lecture ouverte vient au bon moment
  const libre = r.but.genre === "etalonnage" ? etalonnage(r, r.but, etat) : young(r, r.but, etat);
  if (v.saisie === null) return libre;
  const attendue = libre.geste === "bouton" ? libre.bouton : null;
  if (v.saisie === "distance") {
    if (attendue !== "distance") return dire("distance-annuler", libre.etape, "Ce n'est pas encore le moment de noter la distance. Touche « Annuler », puis suis le guide.");
    return { cle: "distance-lire", etape: libre.etape, texte: "Lis dans la loupe la graduation en face du repère de l'écran. Écris-la avec les chiffres, puis touche « Noter ».", geste: "montrer", quoi: "loupe" };
  }
  const d = diapositive(r, etat.diapo);
  if (attendue !== "mesure" || !d) return dire("mesure-annuler", libre.etape, "Ce n'est pas encore le moment de noter une mesure. Touche « Annuler », puis suis le guide.");
  const cle = libre.cle.slice(0, -"-noter".length);
  if (v.saisie === "nombre") {
    return { cle: `${cle}-compter`, etape: libre.etape, texte: "Compte les intervalles entre tes deux curseurs : d'une frange sombre à la suivante, cela fait un interfrange. Écris leur nombre, puis touche « Noter ».", geste: "montrer", quoi: "franges" };
  }
  // de près : chaque curseur s'ajuste au milieu de sa zone sombre, puis la distance entre les deux se lit
  const p = pointage(r, d, etat.ecran);
  const [g, dr]: [1 | 2, 1 | 2] = etat.curseurs[0] <= etat.curseurs[1] ? [1, 2] : [2, 1];
  const zone = d.genre === "young" ? "de sa frange sombre" : "de la zone sombre";
  for (const [k, cible] of [[g, p.gauche], [dr, p.droite]] as const) {
    const ecart = cible - etat.curseurs[k - 1];
    if (Math.abs(ecart) <= p.tolerance) {
      if (v.tenu === k) return { cle: `${cle}-lacher`, etape: libre.etape, texte: `Le curseur ${k} est au milieu ${zone}. Lève le doigt.`, geste: "lacher" };
      continue;
    }
    return { cle: `${cle}-ajuster-${k}`, etape: libre.etape, texte: `De près, le curseur suit ton doigt tout doucement. Ajuste le curseur ${k} : glisse-le jusqu'au milieu ${zone}.`, geste: "ajuster", k, sens: ecart > 0 ? 1 : -1 };
  }
  return { cle: `${cle}-lire`, etape: libre.etape, texte: "Lis la graduation en face de chaque curseur, au demi-millimètre près, et fais la différence. Écris-la avec les chiffres, puis touche « Noter ».", geste: "montrer", quoi: "curseurs" };
}
