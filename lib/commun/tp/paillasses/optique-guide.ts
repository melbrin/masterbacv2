// Le guide de la paillasse « optique » : ce qu'un professeur, debout à côté de l'élève, lui dirait de faire maintenant.
// Il se calcule à partir de l'état du banc et de ce que la vue retient en plus : la lecture en cours, la place de la
// règle sur l'écran, le doigt posé dans la loupe. Ici aussi, ce que la vue fait de ses propres gestes : poser une
// lentille, noter des positions.
// Le guide dit le geste, jamais la mesure : il amène l'écran près de l'image, puis montre dans quel sens finir à la
// loupe ; c'est l'élève qui voit l'image devenir nette. Quand elle l'est, le guide lui dit de lever le doigt.
// Fonctions pures : la vue s'en sert pour placer la main et écrire la phrase ; les tests suivent le guide jusqu'au bout
// et vérifient que la manipulation obtenue est sans faute (tests/unitaires/tp/optique-guide.test.ts).
import { nombre } from "@/lib/commun/format";
import type { GesteBrut } from "../types";
import {
  ECART, FLOU, MEME_PLACE, NET, distanceImage, distanceObjet, imageSurEcran, lentilleDe, memeMontage, vergence,
  type ButOptique, type EtatOptique, type Montage, type ReglagesOptique, type ReleveOptique, type TailleOptique,
} from "./optique";

/** Une pièce qui glisse sur le rail : l'objet, le premier ou le second support de lentille, l'écran. */
export type PieceOptique = "objet" | "a" | "b" | "ecran";
export type BoutonOptique = "positions" | "taille" | "fini";

/** Ce que la vue retient en plus de l'état des règles. */
export interface VueOptique {
  /** la lecture en cours : la position d'une pièce, la taille de l'image, ou rien */
  saisie: PieceOptique | "taille" | null;
  /** la règle : la place de son zéro sur l'écran, en centimètres depuis le centre de l'écran (x vers la droite, y vers le haut) */
  regle: { x: number; y: number };
  /**
   * vrai pendant que le doigt glisse dans la loupe : dès que l'image est nette, le guide lui dit de se lever. La vue
   * garde cette consigne jusqu'à ce que le doigt se lève : le temps de réagir, il a glissé un peu plus loin, vers le
   * milieu de la zone de netteté.
   */
  loupe?: boolean;
}

/** Un pas du guide : la phrase, et le geste à montrer. `etape` : le rang de l'étape du protocole en cours. */
export type PasOptique = { cle: string; texte: string; etape: number } & (
  /** basculer un interrupteur */
  | { geste: "interrupteur"; lequel: "lampe" | "salle" }
  /** glisser une lentille de la boîte jusqu'à un support */
  | { geste: "poser"; lentille: string; sur: "a" | "b" }
  /** toucher la case vide d'une lentille, dans la boîte, pour la ranger */
  | { geste: "ranger"; lentille: string }
  /** glisser une pièce le long du rail jusqu'à la graduation `vers` ; `loupe` : elle en est tout près, le geste se finit dans la loupe */
  | { geste: "glisser"; piece: PieceOptique; vers: number; loupe: boolean }
  /** finir dans la loupe : y glisser doucement dans un sens (1 : vers le bout du rail), sans dire jusqu'où ; l'élève regarde l'image */
  | { geste: "chercher"; piece: PieceOptique; sens: 1 | -1 }
  /** lever le doigt : l'image est nette */
  | { geste: "lacher" }
  /** glisser la règle : son zéro en (x, y), en centimètres depuis le centre de l'écran */
  | { geste: "regle"; x: number; y: number }
  /** regarder la loupe ou la règle, pour y lire une graduation */
  | { geste: "montrer"; quoi: "loupe" | "regle" }
  /** une touche sous la scène */
  | { geste: "bouton"; bouton: BoutonOptique }
  /** rien à montrer dans la scène : la phrase dit quoi toucher (« Annuler », dans la saisie) */
  | { geste: "dire" }
);

type ButFocale = Extract<ButOptique, { genre: "focale" }>;
type ButLunette = Extract<ButOptique, { genre: "lunette" }>;

/** Une lecture est juste à un millimètre près : ce que le professeur accepte sans faute. */
const LU = 0.1001;
/** Une pièce est « à peu près » à sa place à un centimètre près ; à moins de `FIN` de sa place, elle s'ajuste dans la loupe. */
const ENVIRON = 1;
const FIN = 1.5;
/** À moins de `PRES` de l'image nette, la recherche se finit dans la loupe ; de plus loin, la main amène d'abord la pièce à `APPROCHE` de l'image. */
const PRES = 3;
const APPROCHE = 1.5;
const mm = (x: number) => Math.round(x * 10) / 10;

/** La règle : huit centimètres, gradués en millimètres. Une image plus grande ne s'y mesure pas. */
export const LONGUEUR_DE_LA_REGLE = 8;
const TAILLE_MAX = LONGUEUR_DE_LA_REGLE - 0.2;

// ---------- ce que la vue fait de ses propres gestes ----------

/** Les pièces dont l'élève lit la position pour un relevé, dans l'ordre où il les lit. */
export const lectures = (r: ReglagesOptique): PieceOptique[] => (r.but.genre === "lunette" ? ["a", "b"] : ["objet", "a", "ecran"]);

/** Le geste d'un relevé, avec ce que l'élève a lu pour chaque pièce. */
export function releve(notes: Partial<Record<PieceOptique, number>>): GesteBrut {
  const g: GesteBrut = { g: "releve" };
  if (notes.objet !== undefined) g.o = notes.objet;
  if (notes.a !== undefined) g.a = notes.a;
  if (notes.b !== undefined) g.b = notes.b;
  if (notes.ecran !== undefined) g.e = notes.ecran;
  return g;
}

/** Ce que donne une lentille posée : les gestes pour les règles, le support qui la reçoit, ce qui vient de se passer, et le geste qu'elle permet. */
export interface Pose { gestes: GesteBrut[]; piece: "a" | "b" | null; message: string; conseil?: string }

/**
 * Poser une lentille de la boîte sur un support (« support-a », « support-b »). `message` dit ce qui vient de se
 * passer ; `conseil`, le geste que la lentille posée permet : la vue ne l'ajoute que si le guide est coupé.
 * Une lentille ou un support inconnus ne changent rien.
 */
export function pose(r: ReglagesOptique, objet: string, cible: string): Pose {
  const l = lentilleDe(r, objet);
  const sur = cible === "support-a" ? "a" : cible === "support-b" ? "b" : null;
  if (!l || !sur) return { gestes: [], piece: null, message: "" };
  const support = r.but.genre === "lunette" ? (sur === "b" ? "le second support" : "le premier support") : "le support";
  return { gestes: [{ g: "poser", lentille: l.id, sur }], piece: sur, message: `La lentille de ${vergence(l.etiquette)} est sur ${support}.`, conseil: "Glisse-le le long du rail." };
}

/**
 * Où poser la règle pour mesurer une image de cette taille : son zéro au ras du bas de l'image, son bord gradué contre
 * elle, à droite. En centimètres depuis le centre de l'écran.
 */
export const placeDeLaRegle = (taille: number): { x: number; y: number } => ({ x: Math.round((0.31 * Math.abs(taille) + 0.05) * 100) / 100, y: -Math.abs(taille) / 2 });
/** Vrai si la règle est posée contre l'image : son zéro à moins d'un millimètre du bas de l'image. */
export function regleEnPlace(regle: { x: number; y: number }, taille: number): boolean {
  const place = placeDeLaRegle(taille);
  return Math.abs(regle.y - place.y) <= 0.08 && regle.x >= place.x - 0.12 && regle.x <= place.x + 0.6;
}

// ---------- ce qu'un professeur voit par-dessus l'épaule de l'élève ----------

/** Une mesure de distance focale sans défaut : la bonne lentille, la lampe allumée, une image nette, trois lectures justes. */
function bonneMesure(r: ReglagesOptique, but: ButFocale, x: ReleveOptique): boolean {
  const support = x.banc.supports[0];
  return support?.lentille === but.lentille && x.banc.lampe && imageSurEcran(r, x.banc).flou <= NET
    && x.o !== null && x.a !== null && x.e !== null && Math.abs(x.o - x.banc.objet) <= LU && Math.abs(x.a - support.x) <= LU && Math.abs(x.e - x.banc.ecran) <= LU;
}
/** Vrai si seule une lecture cloche dans ce relevé : l'image, elle, était nette. */
const malLu = (r: ReglagesOptique, x: ReleveOptique): boolean => x.banc.lampe && imageSurEcran(r, x.banc).flou <= NET;
/** Une taille d'image bien mesurée : une image éclairée, nette, et une lecture de la règle à un millimètre et demi près. */
function bonneTaille(r: ReglagesOptique, t: TailleOptique, tolerance: number): boolean {
  const image = imageSurEcran(r, t.banc);
  return image.eclaire && image.flou <= FLOU && Math.abs(t.v - Math.abs(image.taille)) <= tolerance;
}
const dernier = <T>(liste: readonly T[], garde: (x: T) => boolean): T | null => [...liste].reverse().find(garde) ?? null;

// ---------- le prochain geste ----------

const interrupteur = (cle: string, etape: number, texte: string, lequel: "lampe" | "salle"): PasOptique => ({ cle, etape, texte, geste: "interrupteur", lequel });
const poser = (cle: string, etape: number, texte: string, lentille: string, sur: "a" | "b"): PasOptique => ({ cle, etape, texte, geste: "poser", lentille, sur });
const glisser = (cle: string, etape: number, texte: string, piece: PieceOptique, vers: number, loupe = false): PasOptique => ({ cle, etape, texte, geste: "glisser", piece, vers, loupe });
const chercher = (cle: string, etape: number, texte: string, piece: PieceOptique, sens: 1 | -1): PasOptique => ({ cle, etape, texte, geste: "chercher", piece, sens });
const bouton = (cle: string, etape: number, texte: string, quel: BoutonOptique): PasOptique => ({ cle, etape, texte, geste: "bouton", bouton: quel });
const montrer = (cle: string, etape: number, texte: string, quoi: "loupe" | "regle"): PasOptique => ({ cle, etape, texte, geste: "montrer", quoi });
const ranger = (cle: string, etape: number, texte: string, lentille: string): PasOptique => ({ cle, etape, texte, geste: "ranger", lentille });
/** L'image est nette et le doigt est encore dans la loupe : il se lève. */
const lacher = (cle: string, etape: number): PasOptique => ({ cle, etape, texte: "Les trois traits fins sont séparés : l'image est nette. Lève le doigt.", geste: "lacher" });
const FINIR = "L'image se précise. Finis dans la loupe : glisse doucement, jusqu'à ce que les trois traits fins du F se séparent.";

/** Éteindre la salle, allumer la lampe : ce qui se fait avant tout le reste. Null quand c'est fait. */
function eclairage(etat: EtatOptique): PasOptique | null {
  if (etat.salle) return interrupteur("salle", 0, "Éteins la lumière de la salle : touche son interrupteur. L'image se verra mieux.", "salle");
  if (!etat.lampe) return interrupteur("lampe", 0, "Allume la lampe de la source : touche son interrupteur.", "lampe");
  return null;
}

const NOMS: Record<PieceOptique, string> = { objet: "de l'objet", a: "de la lentille", b: "de la seconde lentille", ecran: "de l'écran" };

/** La touche « Noter la taille » : le regard se rapproche de l'écran, la règle se pose ensuite. `cle` distingue les mesures. */
const noterLaTaille = (cle: string, etape: number, quoi: string): PasOptique => bouton(`${cle}-noter`, etape, `${quoi} Touche « Noter la taille ».`, "taille");

/** Mesurer une distance focale : trois mesures à trois places de la lentille, puis la taille d'une image. */
function focale(r: ReglagesOptique, but: ButFocale, etat: EtatOptique, v: VueOptique): PasOptique {
  const voulue = lentilleDe(r, but.lentille);
  const f = voulue?.f ?? 10;
  const image = imageSurEcran(r, etat);
  const retenus = etat.releves.slice(-but.mesures);
  // le rang des étapes dans le protocole : la première mesure tient en deux étapes, les suivantes en une
  const premiere = etat.releves.length === 0;
  const E = { lentille: 1, regler: premiere ? 2 : 4, noter: premiere ? 3 : 4, taille: 5 };

  const allumer = eclairage(etat);
  if (allumer) return allumer;
  if (voulue && etat.supports[0]?.lentille !== but.lentille) {
    return poser("lentille", E.lentille, etat.supports[0]?.lentille
      ? `Ce n'est pas la bonne lentille. Prends dans la boîte celle de ${vergence(voulue.etiquette)} et pose-la sur le support : elle prend sa place.`
      : `Prends dans la boîte la lentille de ${vergence(voulue.etiquette)} et pose-la sur le support.`, but.lentille, "a");
  }

  /** Vrai si, à cette distance de l'objet, la lentille forme sur le rail une image nette, que la règle peut mesurer. */
  const faisable = (d: number): boolean => {
    const image = distanceImage(f, d);
    return image !== null && d >= ECART && image >= ECART && etat.objet + d + image <= r.rail
      && (r.source.genre !== "lettre" || (r.source.taille * image) / d <= TAILLE_MAX);
  };
  /** Une place libre pour une mesure de plus : celles du protocole d'abord, puis entre elles, puis au-delà. */
  const placeLibre = (): number => {
    const [loin, pres] = [Math.max(...but.distances, 2 * f), Math.min(...but.distances, 2 * f)];
    const places = [...but.distances, ...but.distances.slice(1).map((d, i) => (d + but.distances[i]) / 2), ...[3, 6, 9, 12].flatMap((pas) => [loin + pas, pres - pas])];
    return places.find((d) => faisable(d) && etat.releves.every((x) => Math.abs(distanceObjet(x.banc) - d) >= MEME_PLACE + ENVIRON)) ?? 2 * f;
  };
  /** Une mesure à cette distance de l'objet : la lentille à sa place, l'écran jusqu'à la netteté, puis les positions. */
  const mesurer = (numero: number, cible: number, refaire: ReleveOptique | null, pourquoi: string): PasOptique => {
    const d = distanceObjet(etat);
    const ou = etat.objet + cible;
    if (Math.abs(d - cible) > ENVIRON) {
      // l'écran laisse passer la lentille
      if (etat.ecran < ou + ENVIRON + ECART) return glisser("ecran-degager", E.regler, "Éloigne l'écran : glisse-le vers le bout du rail, pour laisser la place à la lentille.", "ecran", r.rail);
      // de près, un petit déplacement se fait mal à la main : il se finit dans la loupe
      return glisser(`lentille-${numero}`, E.regler, `${pourquoi}${refaire ? "Remets" : "Glisse"} la lentille à ${nombre(cible, 0)} cm environ de l'objet : son repère vers la graduation ${nombre(ou, 0)}.`, "a", ou, Math.abs(d - cible) <= FIN);
    }
    if (image.flou > NET) {
      const nette = etat.supports[0].x + (distanceImage(f, d) ?? 0);
      const ecart = etat.ecran - nette;
      // de loin, la main amène l'écran près de l'image, du côté d'où il vient ; la netteté, elle, se cherche à l'œil
      if (Math.abs(ecart) > PRES) {
        return glisser(`nettete-${numero}-approcher`, E.regler, `${pourquoi}${ecart > 0 ? "Rapproche l'écran de la lentille" : "Éloigne l'écran de la lentille"} : glisse-le doucement, et regarde l'image se former, en haut.`, "ecran", mm(nette + Math.sign(ecart) * APPROCHE));
      }
      return chercher(`nettete-${numero}-finir`, E.regler, FINIR, "ecran", ecart > 0 ? -1 : 1);
    }
    if (v.loupe) return lacher(`nettete-${numero}-lacher`, E.regler);
    return bouton(`positions-${numero}`, E.noter, refaire && malLu(r, refaire) && pourquoi === ""
      ? "Une de tes lectures ne tombait pas en face du repère. Touche « Noter les positions », et relis à la loupe."
      : "L'image est nette. Touche « Noter les positions ».", "positions");
  };

  // ----- les mesures : les dernières doivent toutes être bonnes -----
  const aRefaire = retenus.find((x) => !bonneMesure(r, but, x) && faisable(distanceObjet(x.banc)));
  if (aRefaire) {
    const numero = etat.releves.indexOf(aRefaire) + 1;
    const ici = Math.abs(distanceObjet(etat) - distanceObjet(aRefaire.banc)) <= ENVIRON;
    return mesurer(numero, distanceObjet(aRefaire.banc), aRefaire, ici ? "" : `Ta mesure n° ${numero} est à refaire. `);
  }
  if (retenus.length < but.mesures || retenus.some((x) => !bonneMesure(r, but, x))) return mesurer(etat.releves.length + 1, placeLibre(), null, "");

  // ----- la taille de l'image, sur une des mesures -----
  if (but.taille) {
    const taille = etat.tailles[etat.tailles.length - 1];
    if (!taille || !bonneTaille(r, taille, 0.15) || !retenus.some((x) => memeMontage(x.banc, taille.banc))) {
      // la règle se pose sur l'image d'une mesure, si elle n'est pas plus grande que la règle
      const mesurables = retenus.filter((x) => Math.abs(imageSurEcran(r, { ...x.banc, lampe: true }).taille) <= TAILLE_MAX);
      if (mesurables.length === 0) return mesurer(etat.releves.length + 1, placeLibre(), null, "Tes images sont trop grandes pour la règle : fais une mesure de plus, la lentille plus loin de l'objet. ");
      // si la lentille n'est plus à la place d'une de ces mesures, la plus proche se refait
      if (!mesurables.some((x) => memeMontage(x.banc, etat))) {
        const proche = mesurables.reduce((m, x) => (Math.abs(distanceObjet(x.banc) - distanceObjet(etat)) < Math.abs(distanceObjet(m.banc) - distanceObjet(etat)) ? x : m), mesurables[0]);
        const pourquoi = retenus.some((x) => memeMontage(x.banc, etat)) ? "Cette image est trop grande pour la règle : reviens à une autre mesure. " : "La lentille a bougé depuis tes mesures : refais celle-ci avant de sortir la règle. ";
        return mesurer(etat.releves.indexOf(proche) + 1, distanceObjet(proche.banc), proche, pourquoi);
      }
      if (image.flou > NET || v.loupe) return mesurer(etat.releves.findIndex((x) => memeMontage(x.banc, etat)) + 1, distanceObjet(etat), null, "");
      return noterLaTaille("taille", E.taille, "Sans rien déplacer, mesure la taille de cette image.");
    }
  }
  return bouton("fini", E.taille, "Tout est noté. Touche « J'ai fini » pour appeler le professeur.", "fini");
}

/** Construire une lunette afocale : l'image sans lunette, les deux lentilles, le réglage, les positions, l'image à travers elle. */
function lunette(r: ReglagesOptique, but: ButLunette, etat: EtatOptique, v: VueOptique): PasOptique {
  const objectif = lentilleDe(r, but.objectif);
  const oculaire = lentilleDe(r, but.oculaire);
  const image = imageSurEcran(r, etat);
  const E = { sans: 1, lentilles: 2, regler: 3, noter: 4, avec: 5 };
  const vide = (b: Montage) => b.supports.every((s) => s.lentille === null);
  const montee = (b: Montage) => b.supports[0]?.lentille === but.objectif && b.supports[1]?.lentille === but.oculaire;
  const sans = dernier(etat.tailles, (t) => vide(t.banc));
  const sansBonne = sans !== null && bonneTaille(r, sans, LU);
  const positions = dernier(etat.releves, (x) => x.a !== null && x.b !== null);
  const net = (b: Montage) => imageSurEcran(r, { ...b, lampe: true }).flou <= NET;
  const positionsBonnes = positions !== null && montee(positions.banc) && net(positions.banc)
    && Math.abs((positions.a ?? 0) - positions.banc.supports[0].x) <= LU && Math.abs((positions.b ?? 0) - positions.banc.supports[1].x) <= LU;
  const avec = dernier(etat.tailles, (t) => t.banc.supports.length >= 2 && t.banc.supports.every((s) => s.lentille !== null));
  const avecBonne = avec !== null && montee(avec.banc) && bonneTaille(r, avec, 0.15);

  const allumer = eclairage(etat);
  if (allumer) return allumer;

  // ----- l'image sans lunette : la référence -----
  if (!sansBonne) {
    const garni = etat.supports.find((s) => s.lentille !== null);
    const l = lentilleDe(r, garni?.lentille ?? null);
    if (l) return ranger(`sans-ranger-${l.id}`, E.sans, `La première mesure se fait sans lunette. Range la lentille de ${vergence(l.etiquette)} : touche sa case vide, dans la boîte.`, l.id);
    return noterLaTaille("sans", E.sans, "Mesure d'abord l'image sans lunette.");
  }
  if (positionsBonnes && avecBonne) return bouton("fini", E.avec, "Tout est noté. Touche « J'ai fini » pour appeler le professeur.", "fini");
  if (!objectif || !oculaire || etat.supports.length < 2) return bouton("fini", E.avec, "Touche « J'ai fini » pour appeler le professeur.", "fini");

  // ----- les deux lentilles : l'objectif du côté de l'objet, l'oculaire du côté de l'œil -----
  // une lentille ne se prend que dans la boîte : celle qui est sur le mauvais support y retourne d'abord
  const prise = (voulue: boolean) => (voulue ? "" : "Ce support ne porte pas la bonne lentille : celle que tu poses prend sa place. ");
  if (etat.supports[0].lentille !== but.objectif) {
    if (etat.supports[1].lentille === but.objectif) return ranger("objectif-ranger", E.lentilles, "L'objectif est sur le second support : sa place est sur le premier, du côté de l'objet lointain. Range-le d'abord : touche sa case vide, dans la boîte.", but.objectif);
    return poser("objectif", E.lentilles, `${prise(etat.supports[0].lentille === null)}Pose l'objectif, la lentille de ${vergence(objectif.etiquette)}, sur le premier support, du côté de l'objet lointain.`, but.objectif, "a");
  }
  if (etat.supports[1].lentille !== but.oculaire) return poser("oculaire", E.lentilles, `${prise(etat.supports[1].lentille === null)}Pose l'oculaire, la lentille de ${vergence(oculaire.etiquette)}, sur le second support, du côté de l'œil fictif.`, but.oculaire, "b");

  // ----- le réglage : l'oculaire glisse jusqu'à l'image nette -----
  const afocale = etat.supports[0].x + objectif.f + oculaire.f;
  const butee = (r.recepteur.genre === "oeil" ? r.recepteur.x : r.rail) - ECART;
  if (afocale > butee) return glisser("objectif-reculer", E.regler, "Recule l'objectif vers l'objet lointain : l'oculaire doit pouvoir se placer derrière lui.", "a", r.supports[0] ?? etat.supports[0].x);
  if (image.flou > NET) {
    const ecart = etat.supports[1].x - afocale;
    if (Math.abs(ecart) > PRES) {
      return glisser("reglage-approcher", E.regler, `${ecart > 0 ? "Rapproche l'oculaire de l'objectif" : "Éloigne l'oculaire de l'objectif"} : glisse-le doucement, et regarde l'image se former, en haut.`, "b", mm(afocale + Math.sign(ecart) * APPROCHE));
    }
    return chercher("reglage-finir", E.regler, FINIR, "b", ecart > 0 ? -1 : 1);
  }
  if (v.loupe) return lacher("reglage-lacher", E.regler);
  if (!positionsBonnes) {
    return bouton("positions", E.noter, positions && montee(positions.banc) && net(positions.banc)
      ? "Une de tes lectures ne tombait pas en face du repère. Touche « Noter les positions », et relis à la loupe."
      : "L'image est nette : ta lunette est afocale. Touche « Noter les positions ».", "positions");
  }
  // ----- l'image à travers la lunette -----
  return noterLaTaille("avec", E.avec, "Mesure maintenant l'image à travers la lunette.");
}

/**
 * Ce qu'il faut faire maintenant. La fonction rend toujours un pas : le premier geste qui manque, dans l'ordre du
 * protocole. Elle ne lit que ce qu'un professeur verrait par-dessus l'épaule de l'élève.
 */
export function prochain(r: ReglagesOptique, etat: EtatOptique, v: VueOptique): PasOptique {
  // ce que le guide dirait sans lecture en cours : c'est lui qui dit si la lecture ouverte vient au bon moment
  const libre = r.but.genre === "focale" ? focale(r, r.but, etat, v) : lunette(r, r.but, etat, v);
  if (v.saisie === null) return libre;
  const attendue = libre.geste === "bouton" ? libre.bouton : null;
  if (v.saisie === "taille") {
    if (attendue !== "taille") return { cle: "taille-annuler", etape: libre.etape, texte: "Ce n'est pas encore le moment de mesurer l'image. Touche « Annuler », puis suis le guide.", geste: "dire" };
    // la règle contre l'image, puis la lecture de sa taille
    const cle = libre.cle.slice(0, -"-noter".length);
    const taille = imageSurEcran(r, etat).taille;
    if (!regleEnPlace(v.regle, taille)) {
      return { cle: `${cle}-regle`, etape: libre.etape, texte: "Glisse la règle contre l'image : son zéro au ras du bas de l'image, son bord gradué tout contre elle.", geste: "regle", ...placeDeLaRegle(taille) };
    }
    return montrer(`${cle}-lire`, libre.etape, "Lis sur la règle la graduation en face du haut de l'image. Écris-la avec les chiffres, puis touche « Noter ».", "regle");
  }
  if (attendue !== "positions") return { cle: "lire-annuler", etape: libre.etape, texte: "Ce n'est pas encore le moment de noter les positions. Touche « Annuler », puis suis le guide.", geste: "dire" };
  const nom = r.but.genre === "lunette" && v.saisie === "a" ? "de la première lentille" : NOMS[v.saisie];
  return montrer(`lire-${v.saisie}`, libre.etape, `Lis dans la loupe la graduation en face du repère ${nom}. Écris-la avec les chiffres, puis touche « Noter ».`, "loupe");
}

/** La place de repos de la règle, le long du bord droit de l'écran : son zéro en bas. */
export const REGLE_AU_REPOS = { x: mm(3.65), y: -4.25 };
