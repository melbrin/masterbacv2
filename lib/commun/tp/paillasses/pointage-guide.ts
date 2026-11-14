// Le guide de la paillasse « pointage » : ce qu'un professeur, debout à côté de l'élève, lui dirait de faire maintenant.
// Il se calcule à partir de l'état de la manipulation et de ce que la vue retient en plus : l'écran affiché, l'outil
// pris, l'image en cours, la droite en cours de réglage, le repère des énergies, le carnet, et la poignée que l'élève
// tient sous son doigt. Il dit le geste, jamais la mesure : où glisser un repère, où pointer, quel point lire, mais ni
// la longueur de l'étalon ni une énergie.
// Fonctions pures : la vue s'en sert pour placer la main et écrire la phrase ; les tests suivent le guide jusqu'au bout
// et vérifient que la manipulation obtenue est sans faute (tests/unitaires/tp/pointage-guide.test.ts).
import { CAMERA, boutsEtalon, centres, date, droiteJuste, grandeurs, type EtatPointage, type Point, type ReglagesPointage } from "./pointage";
import { insecable } from "./ultrasons-guide";

export type OutilPointage = "echelle" | "origine" | "pointage";
export type OngletPointage = "vitesse" | "energies";
/** Les lectures que l'élève écrit, et le nom de leur ligne. */
export type LignePointage = "longueur" | "debut" | "fin";
export const LIGNES_DU_CARNET: Record<LignePointage, string> = { longueur: "Longueur de l'étalon", debut: "Énergie mécanique au début", fin: "Énergie mécanique à la fin" };
/** Ce que l'élève glisse du doigt : les deux repères de l'échelle, l'origine, les deux bouts de la droite. */
export type PoigneePointage = "a" | "b" | "origine" | "gauche" | "droit";

/** Ce que la vue retient en plus de l'état des règles. */
export interface VuePointage {
  ecran: "film" | "courbes";
  outil: OutilPointage;
  /** l'image du film affichée */
  image: number;
  onglet: OngletPointage;
  /** la droite en cours de réglage sur la vitesse verticale : sa valeur à la première et à la dernière image, en m/s */
  droite: { va: number; vb: number };
  /** le rang du point où se trouve le repère des courbes des énergies */
  repere: number;
  /** le carnet : fermé, ouvert sur les lignes des énergies, ou une lecture en cours d'écriture */
  carnet: "ferme" | "ouvert" | LignePointage;
  /** la poignée que l'élève tient sous son doigt : tant qu'il la tient, la consigne reste sur elle */
  tenu: PoigneePointage | null;
}

/** Un pas du guide : la phrase, et le geste à montrer. `etape` : le rang de l'étape du protocole en cours. */
export type PasDuGuide = { cle: string; texte: string; etape: number } & (
  /** toucher la touche d'un outil du film */
  | { geste: "outil"; outil: OutilPointage }
  /** glisser un repère de l'échelle ou l'origine jusqu'à un point de l'image ; `pres` : il y est presque, il reste à l'ajuster à la loupe */
  | { geste: "repere"; quoi: "a" | "b" | "origine"; vers: Point; pres: boolean }
  /** toucher une flèche des images : la suivante (1) ou la précédente (−1) */
  | { geste: "image"; sens: 1 | -1 }
  /** toucher le centre de la balle sur l'image affichée */
  | { geste: "pointer"; image: number; ou: Point }
  /** toucher un onglet des courbes */
  | { geste: "onglet"; onglet: OngletPointage }
  /** glisser un bout de la droite jusqu'à la vitesse `vers`, en m/s */
  | { geste: "bout"; cote: "gauche" | "droit"; vers: number; pres: boolean }
  /** toucher un point des courbes des énergies pour y placer le repère */
  | { geste: "viser"; rang: number }
  /** une touche sous la scène */
  | { geste: "bouton"; bouton: "longueur" | "courbes" | "video" | "garder" | "noter" | "fermer" | "fini" }
  /** une ligne du carnet ouvert */
  | { geste: "ligne"; ligne: "debut" | "fin" }
  /** lire et écrire au pavé de chiffres */
  | { geste: "ecrire"; ligne: LignePointage }
  | { geste: "attendre" }
);

/** Un repère est posé sur un bout de l'étalon à cette distance près, en unités de l'image. */
const SUR_LE_BOUT = 2;
/** L'échelle est juste à cette précision près. */
const ECHELLE = 0.0195;
/** L'origine est sur le sol à cette hauteur près, en unités de l'image. */
const SUR_LE_SOL = 2.5;
/** Un pointé est au centre de la balle à cette distance près, en unités de l'image. */
export const AU_CENTRE = 1.8;
/** Un bout de la droite est réglé à cette vitesse près, en m/s ; la pente gardée est juste à cette précision, en m/s². */
const SUR_LES_POINTS = 0.075;
const PENTE = 0.3;
/** En dessous de cette distance, en unités de l'image, une poignée est presque en place : il reste à l'ajuster à la loupe. */
const PRESQUE = 12;

const distance = (p: Point, q: Point) => Math.hypot(p.x - q.x, p.y - q.y);
const vingtieme = (v: number) => Math.round(v * 20) / 20;

/**
 * Le bout de l'étalon où va chaque repère : A au pied, B en haut. L'inverse convient aussi, si l'élève a commencé ainsi.
 */
export function boutsVises(r: ReglagesPointage, etat: EtatPointage): { a: Point; b: Point; inverse: boolean } {
  const [pied, sommet] = boutsEtalon(r);
  const inverse = distance(etat.a, sommet) <= PRESQUE || (distance(etat.b, pied) <= PRESQUE && distance(etat.a, pied) > PRESQUE);
  return inverse ? { a: sommet, b: pied, inverse } : { a: pied, b: sommet, inverse };
}
/** Vrai si les deux repères sont sur les deux bouts de l'étalon, assez bien pour une échelle sans faute. */
export function reperesJustes(r: ReglagesPointage, etat: EtatPointage): boolean {
  const vises = boutsVises(r, etat);
  const facteur = (r.etalon * CAMERA.parMetre) / Math.max(1, distance(etat.a, etat.b));
  return distance(etat.a, vises.a) <= SUR_LE_BOUT && distance(etat.b, vises.b) <= SUR_LE_BOUT && Math.abs(facteur - 1) <= ECHELLE;
}
/** Vrai si l'origine est posée sur le sol. */
export const origineJuste = (etat: EtatPointage): boolean => etat.posee && Math.abs(etat.origine.y - CAMERA.sol) <= SUR_LE_SOL;
/** La première image à pointer ou à reprendre : pas encore pointée, ou pointée à côté de la balle ; −1 si tout est bon. */
export function aPointer(r: ReglagesPointage, etat: EtatPointage): number {
  const vrais = centres(r);
  return etat.pointes.findIndex((p, i) => p === null || distance(p, vrais[i]) > AU_CENTRE);
}
/** La droite qui passe au mieux par les points de la vitesse verticale : ses valeurs à la première et à la dernière image, au vingtième de m/s. */
export function droiteVisee(r: ReglagesPointage, etat: EtatPointage): { va: number; vb: number } | null {
  const juste = droiteJuste(r, etat);
  return juste && { va: vingtieme(juste.ordonnee), vb: vingtieme(juste.ordonnee + juste.pente * date(r, r.images - 1)) };
}
/** Vrai si la droite gardée passe au milieu des points : ceux du moment où elle a été gardée, et ceux d'aujourd'hui. */
export function droiteGardeeJuste(r: ReglagesPointage, etat: EtatPointage): boolean {
  const juste = droiteJuste(r, etat);
  return etat.droite !== null && juste !== null && Math.abs(etat.droite.pente - etat.droite.juste) <= PENTE && Math.abs(etat.droite.pente - juste.pente) <= PENTE;
}
/** Vrai si l'énergie mécanique notée est bien celle de la courbe, au premier point (début) ou au dernier (fin). */
export function energieJuste(r: ReglagesPointage, etat: EtatPointage, quoi: "debut" | "fin"): boolean {
  const releve = quoi === "debut" ? etat.debut : etat.fin;
  const tout = grandeurs(r, etat);
  if (!releve || tout.length < 2) return false;
  const proche = (calcul: number) => Math.abs(releve.note - calcul) <= 0.12 || Math.abs(releve.note - calcul) / Math.max(1e-9, Math.abs(calcul)) <= 0.012;
  return proche(releve.calcul) && proche((quoi === "debut" ? tout[0] : tout[tout.length - 1]).Em);
}

/**
 * Ce qu'il faut faire maintenant. La fonction rend toujours un pas : le premier geste qui manque, dans l'ordre du
 * protocole. Elle ne lit que ce qu'un professeur verrait par-dessus l'épaule de l'élève.
 */
export function prochain(r: ReglagesPointage, etat: EtatPointage, v: VuePointage): PasDuGuide {
  const p = pasSuivant(r, etat, v);
  return { ...p, texte: insecable(p.texte) };
}

function pasSuivant(r: ReglagesPointage, etat: EtatPointage, v: VuePointage): PasDuGuide {
  const E = { echelle: 0, origine: 1, pointage: 2, droite: 3, energies: 4 };
  const LOUPE = "Regarde la loupe pendant que tu le glisses.";

  const video = (etape: number): PasDuGuide => ({ cle: "video", etape, texte: "Cette étape se fait sur la vidéo : touche « Revenir à la vidéo ».", geste: "bouton", bouton: "video" });
  const outil = (o: OutilPointage, nom: string, etape: number): PasDuGuide => ({ cle: `outil-${o}`, etape, texte: `Touche l'outil « ${nom} ».`, geste: "outil", outil: o });
  /** Glisser un repère de l'échelle sur un bout de l'étalon. */
  const repere = (quoi: "a" | "b", vers: Point, haut: boolean, etape: number, affiner: boolean): PasDuGuide => {
    const lettre = quoi === "a" ? "A" : "B";
    const ou = haut ? "le haut de l'étalon" : "le pied de l'étalon";
    const pres = v.tenu !== quoi && distance(etat[quoi], vers) <= PRESQUE;
    const texte = affiner && pres ? `Ton échelle est encore un peu fausse. Reprends le repère ${lettre} : à la loupe, son centre doit être juste sur ${ou}.`
      : pres ? `Presque. Reprends le repère ${lettre} : dans la loupe, son centre doit être juste sur ${ou}.`
        : `Glisse le repère ${lettre} juste sur ${ou}${haut ? "" : ", au niveau du sol"}. ${LOUPE}`;
    return { cle: `echelle-${quoi}`, etape, texte, geste: "repere", quoi, vers, pres };
  };

  /** Le premier geste qui manque. */
  const pas = (): PasDuGuide => {
    // ----- l'échelle : un repère sur chaque bout de l'étalon, puis sa longueur -----
    const vises = boutsVises(r, etat);
    const longueurJuste = etat.longueur !== null && Math.abs(etat.longueur - r.etalon) <= 0.005;
    if (!reperesJustes(r, etat) || !longueurJuste || v.tenu === "a" || v.tenu === "b") {
      if (v.ecran !== "film") return video(E.echelle);
      if (v.outil !== "echelle") return outil("echelle", "Échelle", E.echelle);
      const ecartA = distance(etat.a, vises.a), ecartB = distance(etat.b, vises.b);
      if (v.tenu === "a" || (v.tenu !== "b" && ecartA > SUR_LE_BOUT)) return repere("a", vises.a, vises.inverse, E.echelle, false);
      if (v.tenu === "b" || ecartB > SUR_LE_BOUT) return repere("b", vises.b, !vises.inverse, E.echelle, false);
      // les deux repères sont tout près des bouts, mais leur écart est encore faux : on reprend le moins bien posé
      if (!reperesJustes(r, etat)) return ecartA >= ecartB ? repere("a", vises.a, vises.inverse, E.echelle, true) : repere("b", vises.b, !vises.inverse, E.echelle, true);
      const reprise = etat.longueur === null ? "Les deux repères sont en place. " : "Ta longueur d'étalon est à corriger. ";
      if (v.carnet === "longueur") return { cle: "longueur-ecrire", etape: E.echelle, texte: "Écris la longueur de l'étalon, en mètres : elle est donnée à la première ligne du protocole.", geste: "ecrire", ligne: "longueur" };
      return { cle: "longueur-bouton", etape: E.echelle, texte: `${reprise}Touche « Longueur de l'étalon ».`, geste: "bouton", bouton: "longueur" };
    }

    // ----- l'origine du repère : sur le sol -----
    if (!origineJuste(etat) || v.tenu === "origine") {
      if (v.ecran !== "film") return video(E.origine);
      if (v.outil !== "origine") return outil("origine", "Origine", E.origine);
      const vers = boutsEtalon(r)[0];
      const pres = v.tenu !== "origine" && Math.abs(etat.origine.y - CAMERA.sol) <= PRESQUE;
      return {
        cle: "origine", etape: E.origine, geste: "repere", quoi: "origine", vers, pres,
        texte: pres ? "Presque. Reprends l'origine O : dans la loupe, son centre doit être juste au niveau du sol."
          : "Glisse l'origine O sur le sol, au pied de l'étalon. Regarde la loupe pendant que tu la glisses.",
      };
    }

    // ----- le pointage : chaque image, au centre de la balle -----
    const image = aPointer(r, etat);
    if (image >= 0) {
      const numero = image + 1;
      const reprise = etat.pointes[image] !== null;
      if (v.ecran !== "film") return video(E.pointage);
      if (v.outil !== "pointage") return outil("pointage", "Pointage", E.pointage);
      if (v.image !== image) {
        const sens = image > v.image ? 1 : -1;
        const pourquoi = reprise ? "son pointé est à côté de la balle" : "elle n'est pas pointée";
        return { cle: sens === 1 ? "image-avancer" : "image-reculer", etape: E.pointage, texte: `Touche la flèche de ${sens === 1 ? "droite" : "gauche"} pour ${sens === 1 ? "aller" : "revenir"} à l'image ${numero} : ${pourquoi}.`, geste: "image", sens };
      }
      return {
        cle: `pointer-${image}`, etape: E.pointage, geste: "pointer", image, ou: centres(r)[image],
        texte: reprise ? `Image ${numero} : ton pointé est à côté. Touche le centre de la balle, en visant à la loupe.`
          : `Image ${numero} : touche le centre de la balle. Garde le doigt posé pour viser à la loupe, puis relâche.`,
      };
    }

    // ----- la droite sur la vitesse verticale -----
    const visee = droiteVisee(r, etat);
    if (visee && (!droiteGardeeJuste(r, etat) || v.tenu === "gauche" || v.tenu === "droit")) {
      const reprise = etat.droite ? "Ta droite ne passe pas au milieu de tes points. " : "";
      if (v.ecran !== "courbes") return { cle: "courbes", etape: E.droite, texte: `${reprise || "Toutes les images sont pointées. "}Touche « Courbes ».`, geste: "bouton", bouton: "courbes" };
      if (v.onglet !== "vitesse") return { cle: "onglet-vitesse", etape: E.droite, texte: `${reprise}Touche l'onglet « Vitesse verticale ».`, geste: "onglet", onglet: "vitesse" };
      const bout = (cote: "gauche" | "droit", vers: number, ici: number): PasDuGuide => {
        const pres = v.tenu !== cote && Math.abs(ici - vers) <= 0.35;
        const points = cote === "gauche" ? "premiers" : "derniers";
        return {
          cle: `droite-${cote}`, etape: E.droite, geste: "bout", cote, vers, pres,
          texte: pres ? `Presque. Ajuste encore le bout ${cote} : la droite doit passer au milieu des ${points} points.`
            : `Glisse le bout ${cote} de la droite : elle doit passer au milieu des ${points} points.`,
        };
      };
      if (v.tenu === "gauche" || (v.tenu !== "droit" && Math.abs(v.droite.va - visee.va) > SUR_LES_POINTS)) return bout("gauche", visee.va, v.droite.va);
      if (v.tenu === "droit" || Math.abs(v.droite.vb - visee.vb) > SUR_LES_POINTS) return bout("droit", visee.vb, v.droite.vb);
      return { cle: "garder", etape: E.droite, texte: "Ta droite passe au milieu des points. Touche « Garder cette droite ».", geste: "bouton", bouton: "garder" };
    }

    // ----- l'énergie mécanique, lue au premier point puis au dernier -----
    const points = grandeurs(r, etat);
    for (const quoi of ["debut", "fin"] as const) {
      if (energieJuste(r, etat, quoi)) continue;
      const rang = quoi === "debut" ? 0 : points.length - 1;
      const lequel = quoi === "debut" ? "premier" : "dernier";
      const reprise = (quoi === "debut" ? etat.debut : etat.fin) ? `Ton énergie ${quoi === "debut" ? "du début" : "de la fin"} est à relire. ` : "";
      if (v.ecran !== "courbes") return { cle: "courbes", etape: E.energies, texte: `${reprise}Touche « Courbes ».`, geste: "bouton", bouton: "courbes" };
      if (v.carnet === quoi && v.repere === rang) return { cle: `${quoi}-ecrire`, etape: E.energies, texte: "Lis l'énergie mécanique au repère, sur la dernière ligne, et écris-la en millijoules.", geste: "ecrire", ligne: quoi };
      if (v.carnet === "ouvert" && v.repere === rang) return { cle: `${quoi}-ligne`, etape: E.energies, texte: `Touche la ligne « ${LIGNES_DU_CARNET[quoi]} ».`, geste: "ligne", ligne: quoi };
      if (v.onglet !== "energies") return { cle: "onglet-energies", etape: E.energies, texte: `${reprise}Touche l'onglet « Énergies ».`, geste: "onglet", onglet: "energies" };
      if (v.repere !== rang) return { cle: `repere-${quoi}`, etape: E.energies, texte: `${reprise}Touche le ${lequel} point des courbes pour y placer le repère.`, geste: "viser", rang };
      return { cle: `${quoi}-bouton`, etape: E.energies, texte: `Le repère est sur le ${lequel} point. Touche « Noter l'énergie ».`, geste: "bouton", bouton: "noter" };
    }
    return { cle: "fini", etape: E.energies, texte: "Tout est relevé. Touche « J'ai fini » pour appeler le professeur.", geste: "bouton", bouton: "fini" };
  };

  const p = pas();
  // le carnet ouvert sans rien à y écrire : on le referme avant de manipuler
  const auCarnet = p.geste === "ligne" || p.geste === "ecrire";
  if (v.carnet === "ouvert" && !auCarnet) return { cle: "carnet-fermer", etape: p.etape, texte: "Ferme le carnet : il reste un geste à faire avant d'écrire.", geste: "bouton", bouton: "fermer" };
  if (v.carnet !== "ferme" && v.carnet !== "ouvert" && !auCarnet) return { cle: "carnet-annuler", etape: p.etape, texte: "Il reste un geste à faire avant d'écrire : touche « Annuler ».", geste: "attendre" };
  return p;
}
