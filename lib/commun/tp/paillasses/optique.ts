// La paillasse « optique » (décision 0012) : un banc d'optique. Un rail gradué, une source et son objet lumineux (une
// lettre), une boîte de lentilles, des supports qui glissent sur le rail, un écran. L'élève choisit sa lentille, la pose
// sur un support, cherche l'image nette en déplaçant l'écran, lit la position de chaque support sur le rail et mesure
// l'image à la règle. Chaque geste a ses conséquences : une lentille divergente ne forme aucune image sur l'écran, un
// écran mal placé donne une image floue, et la distance focale calculée s'en ressent.
// Deux montages : une lettre lumineuse et un écran (mesurer une distance focale) ; un objet très éloigné et un œil
// fictif, c'est-à-dire une lentille et un écran dans son plan focal (construire une lunette afocale).
// Fonctions pures : le navigateur s'en sert pour faire vivre la paillasse, le serveur pour rejouer la manipulation.
// Les longueurs sont en centimètres, les angles en radians, les vergences en dioptries.
import { nombre } from "@/lib/commun/format";
import { nombreDe, scoreDesFautes, texteDe, type BilanPaillasse, type Faute, type GesteBrut, type ReglesPaillasse } from "../types";

export interface LentilleOptique {
  /** un nom court : « c8 » */
  id: string;
  /** la vergence écrite sur la monture : +8, −8 */
  etiquette: number;
  /** la distance focale réelle ; négative pour une lentille divergente */
  f: number;
}

/** La source : une lettre lumineuse posée sur le rail, ou un collimateur fixe qui donne un objet très éloigné. */
export type SourceOptique =
  /** `x` : la position de départ de la lettre ; `taille` : sa hauteur */
  | { genre: "lettre"; x: number; taille: number }
  /** `x` : le bout du collimateur, que les supports ne dépassent pas ; `angle` : l'angle sous lequel l'objet est vu */
  | { genre: "lointain"; x: number; angle: number };

/** Ce qui reçoit l'image : un écran qui glisse sur le rail, ou un œil fictif fixe (une lentille, et un écran dans son plan focal). */
export type RecepteurOptique = { genre: "ecran"; x: number } | { genre: "oeil"; x: number; f: number };

/** Ce que le TP demande à l'élève. */
export type ButOptique =
  /**
   * mesurer la distance focale de la lentille `lentille`, sur `mesures` positions ; `distances` : les distances de l'objet
   * à la lentille que le protocole propose, une par mesure ; `taille` : mesurer aussi une image à la règle
   */
  | { genre: "focale"; lentille: string; mesures: number; distances: number[]; taille: boolean }
  /** construire une lunette afocale avec ces deux lentilles, et mesurer l'image avec et sans elle */
  | { genre: "lunette"; objectif: string; oculaire: string };

export interface ReglagesOptique {
  /** la longueur du rail gradué */
  rail: number;
  source: SourceOptique;
  /** les lentilles de la boîte */
  boite: LentilleOptique[];
  /** les supports de lentille, vides au départ : la position de chacun, de la source vers l'écran (deux au plus) */
  supports: number[];
  recepteur: RecepteurOptique;
  but: ButOptique;
}

/** Le banc à un instant : ce qui est allumé, et où est chaque chose. */
export interface Montage {
  /** la lampe de la source */
  lampe: boolean;
  /** la lumière de la salle */
  salle: boolean;
  /** la position de l'objet lumineux sur le rail */
  objet: number;
  /** les supports de lentille : leur position, et la lentille qu'ils portent (null : le support est vide) */
  supports: { x: number; lentille: string | null }[];
  /** la position de l'écran */
  ecran: number;
}
/** Un relevé de positions : ce que l'élève a lu sur le rail (objet, premier et second support, écran), et le banc à ce moment. */
export interface ReleveOptique { o: number | null; a: number | null; b: number | null; e: number | null; banc: Montage }
/** Une taille d'image mesurée à la règle, et le banc à ce moment. */
export interface TailleOptique { v: number; banc: Montage }

export interface EtatOptique extends Montage {
  releves: ReleveOptique[];
  tailles: TailleOptique[];
}

/** L'écart le plus petit entre les repères de deux supports voisins : leurs pieds se touchent. */
export const ECART = 3;
/** La première graduation où l'objet lumineux peut se placer : la lampe est derrière lui. */
export const DEBUT = 5;
/** Le rayon de la partie utile d'une lentille : il règle la taille de la tache de flou. */
export const OUVERTURE = 2;
/** Le rayon de la tache de flou en dessous duquel l'image est nette ; au-delà de `FLOU`, elle est franchement floue. */
export const NET = 0.03;
export const FLOU = 0.1;
/** Les noms des supports de lentille dans les gestes, de la source vers l'écran. */
export const SUPPORTS = ["a", "b"] as const;
const RELEVES_MAX = 12;

const mm = (x: number) => Math.round(x * 10) / 10;
const cm = (x: number) => `${nombre(x, 1)} cm`;
/** La vergence comme elle est écrite sur une monture : « +8 δ », « −8 δ ». */
export const vergence = (c: number): string => `${c < 0 ? "−" : "+"}${nombre(Math.abs(c), Number.isInteger(c) ? 0 : 1)} δ`;
/** Une lentille de la boîte, par son nom. */
export const lentilleDe = (r: ReglagesOptique, id: string | null): LentilleOptique | null => (id === null ? null : r.boite.find((l) => l.id === id) ?? null);
/** Ce que le banc porte, sans les notes de l'élève. */
const montage = (e: Montage): Montage => ({ lampe: e.lampe, salle: e.salle, objet: e.objet, supports: e.supports, ecran: e.ecran });

// ---------- la lumière ----------

/** Les lentilles que la lumière traverse, de la source vers l'écran, et la position de l'écran. */
function trajet(r: ReglagesOptique, banc: Montage): { lentilles: { x: number; f: number }[]; ecran: number } {
  const lentilles = banc.supports.flatMap((s) => { const l = lentilleDe(r, s.lentille); return l ? [{ x: s.x, f: l.f }] : []; });
  if (r.recepteur.genre === "oeil") return { lentilles: [...lentilles, { x: r.recepteur.x, f: r.recepteur.f }], ecran: r.recepteur.x + r.recepteur.f };
  return { lentilles, ecran: banc.ecran };
}

export interface ImageEcran {
  /** vrai si de la lumière arrive sur l'écran */
  eclaire: boolean;
  /** la taille de ce qui se dessine sur l'écran ; négative si l'image est renversée par rapport à l'objet ; 0 sans lentille */
  taille: number;
  /** le rayon de la tache que donne un point de l'objet : 0 pour une image parfaitement nette */
  flou: number;
}

/**
 * Ce que l'écran reçoit. Chaque rayon (sa hauteur, sa pente) est suivi de lentille en lentille : un trajet libre
 * ajoute à la hauteur la pente fois la distance, une lentille de distance focale f retire à la pente la hauteur sur f.
 * Le rayon qui passe par le centre de la première lentille donne la taille ; celui qui passe par son bord donne le flou.
 */
export function imageSurEcran(r: ReglagesOptique, banc: Montage): ImageEcran {
  if (!banc.lampe) return { eclaire: false, taille: 0, flou: 0 };
  const { lentilles, ecran } = trajet(r, banc);
  if (lentilles.length === 0) return { eclaire: true, taille: 0, flou: Infinity };
  // de la première lentille à l'écran : hauteur à l'écran = A × hauteur à l'entrée + B × pente à l'entrée
  let A = 1, B = 0, C = 0, D = 1;
  lentilles.forEach((l, i) => {
    C -= A / l.f;
    D -= B / l.f;
    const d = (i + 1 < lentilles.length ? lentilles[i + 1].x : ecran) - l.x;
    A += d * C;
    B += d * D;
  });
  // un objet très éloigné : les rayons venus de son sommet arrivent parallèles, en descendant
  if (r.source.genre === "lointain") return { eclaire: true, taille: -B * r.source.angle, flou: Math.abs(A) * OUVERTURE };
  const d = lentilles[0].x - banc.objet;
  return { eclaire: true, taille: (-B * r.source.taille) / d, flou: (Math.abs(A * d + B) * OUVERTURE) / d };
}

/** La distance entre une lentille et l'image nette d'un objet placé à la distance `d` devant elle ; null si aucune image ne se forme sur un écran. */
export const distanceImage = (f: number, d: number): number | null => (f > 0 && d > f ? 1 / (1 / f - 1 / d) : null);

// ---------- les gestes ----------

/** La distance de l'objet à la première lentille d'un montage. */
export const distanceObjet = (banc: Montage): number => (banc.supports[0]?.x ?? banc.objet) - banc.objet;
/** Deux mesures sont faites à la même place si la distance de l'objet à la lentille y diffère de moins de deux centimètres. */
export const MEME_PLACE = 2;
/** Le rang de la mesure déjà notée à la place où se trouve la lentille ; −1 s'il n'y en a pas. */
export const rangDeLaMesure = (releves: readonly ReleveOptique[], banc: Montage): number => releves.findIndex((x) => Math.abs(distanceObjet(x.banc) - distanceObjet(banc)) < MEME_PLACE);

/** Entre quelles graduations une pièce du banc peut glisser : elle bute sur ses voisines et sur les bouts du rail. Null si elle est fixe. */
export function course(r: ReglagesOptique, etat: Montage, quoi: string): [number, number] | null {
  const n = etat.supports.length;
  const debut = r.source.genre === "lettre" ? etat.objet : r.source.x;
  const fin = r.recepteur.genre === "ecran" ? etat.ecran : r.recepteur.x;
  if (quoi === "objet") return r.source.genre === "lettre" ? [DEBUT, (n > 0 ? etat.supports[0].x : fin) - ECART] : null;
  if (quoi === "ecran") return r.recepteur.genre === "ecran" ? [(n > 0 ? etat.supports[n - 1].x : debut) + ECART, r.rail] : null;
  const i = SUPPORTS.findIndex((s) => s === quoi);
  if (i < 0 || i >= n) return null;
  return [(i === 0 ? debut : etat.supports[i - 1].x) + ECART, (i === n - 1 ? fin : etat.supports[i + 1].x) - ECART];
}

/** La position d'une pièce du banc : l'objet, un support, l'écran. */
export function position(etat: Montage, quoi: string): number | null {
  if (quoi === "objet") return etat.objet;
  if (quoi === "ecran") return etat.ecran;
  const i = SUPPORTS.findIndex((s) => s === quoi);
  return i >= 0 && i < etat.supports.length ? etat.supports[i].x : null;
}

function depart(r: ReglagesOptique): EtatOptique {
  return {
    lampe: false, salle: true, objet: r.source.x, supports: r.supports.slice(0, SUPPORTS.length).map((x) => ({ x, lentille: null })),
    ecran: r.recepteur.genre === "ecran" ? r.recepteur.x : r.recepteur.x + r.recepteur.f, releves: [], tailles: [],
  };
}

/** Une lecture notée : un nombre entre 0 et 300, ou rien. Renvoie `undefined` si la valeur donnée n'est pas lisible. */
function lecture(g: GesteBrut, cle: string): number | null | undefined {
  if (g[cle] === undefined) return null;
  const v = nombreDe(g, cle);
  return v !== null && v >= 0 && v <= 300 ? mm(v) : undefined;
}

/** Applique un geste. Un geste inconnu, mal formé ou impossible ne change rien. */
function geste(r: ReglagesOptique, etat: EtatOptique, g: GesteBrut): EtatOptique {
  switch (g.g) {
    case "lampe": return typeof g.on === "boolean" && g.on !== etat.lampe ? { ...etat, lampe: g.on } : etat;
    case "salle": return typeof g.on === "boolean" && g.on !== etat.salle ? { ...etat, salle: g.on } : etat;
    // glisser une pièce le long du rail : elle s'arrête au millimètre, et bute sur ses voisines
    case "glisser": {
      const quoi = texteDe(g, "quoi");
      const x = nombreDe(g, "x");
      const bornes = quoi === null ? null : course(r, etat, quoi);
      if (quoi === null || x === null || !bornes || bornes[0] > bornes[1]) return etat;
      const ou = mm(Math.max(bornes[0], Math.min(bornes[1], x)));
      if (ou === position(etat, quoi)) return etat;
      if (quoi === "objet") return { ...etat, objet: ou };
      if (quoi === "ecran") return { ...etat, ecran: ou };
      return { ...etat, supports: etat.supports.map((s, i) => (SUPPORTS[i] === quoi ? { ...s, x: ou } : s)) };
    }
    // poser une lentille de la boîte sur un support : celle qui s'y trouvait retourne dans la boîte
    case "poser": {
      const l = lentilleDe(r, texteDe(g, "lentille"));
      const i = SUPPORTS.findIndex((s) => s === g.sur);
      if (!l || i < 0 || i >= etat.supports.length || etat.supports[i].lentille === l.id) return etat;
      return { ...etat, supports: etat.supports.map((s, j) => (j === i ? { ...s, lentille: l.id } : s.lentille === l.id ? { ...s, lentille: null } : s)) };
    }
    case "ranger": {
      const id = texteDe(g, "lentille");
      return id !== null && etat.supports.some((s) => s.lentille === id) ? { ...etat, supports: etat.supports.map((s) => (s.lentille === id ? { ...s, lentille: null } : s)) } : etat;
    }
    // ce que l'élève lit sur le rail : l'objet, les supports, l'écran. Il faut au moins la lecture d'un support.
    case "releve": {
      const [o, a, b, e] = ["o", "a", "b", "e"].map((cle) => lecture(g, cle));
      if (o === undefined || a === undefined || b === undefined || e === undefined || (a === null && b === null)) return etat;
      const releve: ReleveOptique = { o, a, b, e, banc: montage(etat) };
      // une mesure de distance focale refaite à la même place remplace l'ancienne, à son rang
      const refaite = r.but.genre === "focale" ? rangDeLaMesure(etat.releves, etat) : -1;
      return { ...etat, releves: refaite >= 0 ? etat.releves.map((x, i) => (i === refaite ? releve : x)) : [...etat.releves, releve].slice(-RELEVES_MAX) };
    }
    // la taille de l'image, mesurée à la règle sur l'écran
    case "taille": {
      const v = nombreDe(g, "v");
      return v !== null && v > 0 && v <= 50 ? { ...etat, tailles: [...etat.tailles, { v: mm(v), banc: montage(etat) }].slice(-RELEVES_MAX) } : etat;
    }
    default: return etat;
  }
}

// ---------- le bilan : mesurer une distance focale ----------

type ButFocale = Extract<ButOptique, { genre: "focale" }>;
type ButLunette = Extract<ButOptique, { genre: "lunette" }>;
/** Les positions retenues pour une mesure : objet, lentille, écran. */
interface Positions { o: number; l: number; e: number }

/**
 * Les mesures d'une manipulation sans défaut, faites par le professeur : elles servent quand l'élève n'a pas les siennes.
 * Il place la lentille aux distances du protocole ; s'il en manque une, à une fois et demie, deux fois, deux fois et
 * demie sa distance focale de l'objet.
 */
export function mesuresDuProfesseur(r: ReglagesOptique, but: ButFocale): Positions[] {
  const f = lentilleDe(r, but.lentille)?.f ?? 10;
  return Array.from({ length: but.mesures }, (_, k) => {
    const d = but.distances[k] ?? Math.round(f * (1.5 + 0.5 * (but.mesures - 1 - k)));
    return { o: r.source.x, l: r.source.x + d, e: mm(r.source.x + d + (distanceImage(f, d) ?? d)) };
  });
}
/** Vrai si deux montages ont la même lentille, au même endroit, devant le même objet : l'image y a la même taille. */
export const memeMontage = (a: Montage, b: Montage): boolean =>
  a.supports[0]?.lentille === b.supports[0]?.lentille && Math.abs(a.objet - b.objet) <= 0.1001 && Math.abs((a.supports[0]?.x ?? 0) - (b.supports[0]?.x ?? 0)) <= 0.1001;

function bilanFocale(r: ReglagesOptique, but: ButFocale, etat: EtatOptique): BilanPaillasse {
  const voulue = lentilleDe(r, but.lentille);
  const fautes: Faute[] = [];
  const faute = (code: string, grave: boolean, texte: string) => fautes.push({ code, grave, texte });
  const retenus = etat.releves.slice(-but.mesures);
  const n = retenus.length;
  const taille = but.taille ? etat.tailles[etat.tailles.length - 1] ?? null : null;
  /** le rang, parmi les mesures retenues, de celle où la règle a été posée ; −1 s'il n'y en a pas */
  const rangTaille = taille ? retenus.findIndex((x) => memeMontage(x.banc, taille.banc)) : -1;
  const objet = r.source.genre === "lettre" ? r.source.taille : 0;

  // ----- la lentille, la lampe -----
  const montees = retenus.map((x) => lentilleDe(r, x.banc.supports[0]?.lentille ?? null));
  const mauvaise = montees.findIndex((l) => l?.id !== but.lentille);
  if (mauvaise >= 0 && voulue) {
    const l = montees[mauvaise];
    faute("lentille", true, l === null
      ? `À ta mesure n° ${mauvaise + 1}, il n'y avait pas de lentille sur le support : sans lentille, aucune image ne se forme sur l'écran.`
      : l.f < 0
        ? `Pour ta mesure n° ${mauvaise + 1}, tu as pris la lentille de ${vergence(l.etiquette)} : elle est divergente, elle ne forme aucune image sur un écran. La lentille à étudier est celle de ${vergence(voulue.etiquette)}.`
        : `Pour ta mesure n° ${mauvaise + 1}, la lentille sur le banc était celle de ${vergence(l.etiquette)}. La lentille à étudier est celle de ${vergence(voulue.etiquette)}.`);
  }
  const eteinte = retenus.findIndex((x, i) => montees[i]?.id === but.lentille && !x.banc.lampe);
  if (eteinte >= 0) faute("lampe", true, `À ta mesure n° ${eteinte + 1}, la lampe de la source était éteinte : il n'y avait pas d'image sur l'écran.`);

  // ----- la netteté : on juge la mesure la plus floue -----
  let pire: { flou: number; texte: string } | null = null;
  for (const [i, x] of retenus.entries()) {
    if (!voulue || montees[i]?.id !== but.lentille || !x.banc.lampe) continue;
    const { flou } = imageSurEcran(r, x.banc);
    if (flou <= NET || (pire && pire.flou >= flou)) continue;
    const lentille = x.banc.supports[0].x;
    const d = lentille - x.banc.objet;
    const image = distanceImage(voulue.f, d);
    const texte = image === null
      ? `À ta mesure n° ${i + 1}, l'objet était à ${cm(d)} de la lentille : c'est trop près, l'image ne se forme plus sur un écran. Éloigne la lentille de l'objet.`
      : lentille + image > r.rail
        ? `À ta mesure n° ${i + 1}, l'image nette se formait à ${cm(image)} de la lentille, plus loin que le bout du rail. Éloigne la lentille de l'objet : l'image se rapproche.`
        : `À ta mesure n° ${i + 1}, l'image n'était pas nette : l'écran était ${cm(Math.abs(x.banc.ecran - lentille - image))} trop ${x.banc.ecran > lentille + image ? "loin" : "près"} de la lentille. Va et viens autour de la netteté, puis finis à la loupe.${x.banc.salle ? " Éteins aussi la lumière de la salle : l'image se voit mieux." : ""}`;
    pire = { flou, texte };
  }
  if (pire) faute("nettete", pire.flou > FLOU, pire.texte);

  // ----- les lectures sur le rail : on juge la plus fausse -----
  let lue: { ecart: number; texte: string } | null = null;
  for (const [i, x] of retenus.entries()) {
    const paires: [number | null, number, string][] = [[x.o, x.banc.objet, "l'objet"], [x.a, x.banc.supports[0]?.x ?? 0, "la lentille"], [x.e, x.banc.ecran, "l'écran"]];
    for (const [note, vrai, quoi] of paires) {
      if (note === null) continue;
      const ecart = Math.abs(note - vrai);
      if (ecart > 0.1001 && (!lue || ecart > lue.ecart)) lue = { ecart, texte: `À ta mesure n° ${i + 1}, tu as noté ${cm(note)} pour ${quoi} ; son repère était en face de ${cm(vrai)}. Lis la graduation en face du repère, à la loupe.` };
    }
  }
  if (lue) faute("lecture", lue.ecart > 0.5, lue.texte);

  // ----- des mesures en nombre suffisant : deux mesures à la même place n'en font qu'une -----
  if (n === 0) faute("mesures", true, "Tu n'as noté aucune mesure : la manipulation n'est pas faite.");
  else if (n < but.mesures) faute("mesures", 2 * n < but.mesures, `Tu as noté ${n} mesure${n > 1 ? "s" : ""} sur les ${but.mesures} demandées. Déplace la lentille à chaque mesure : une mesure refaite à la même place remplace l'ancienne.`);

  // ----- la taille de l'image -----
  if (but.taille && n > 0) {
    if (!taille) faute("taille", false, "Tu n'as pas mesuré la taille de l'image à la règle.");
    else {
      const image = imageSurEcran(r, taille.banc);
      const vraie = Math.abs(image.taille);
      const ecart = Math.abs(taille.v - vraie);
      if (!image.eclaire || !(image.flou <= FLOU)) faute("taille", false, "L'image n'était pas nette quand tu as mesuré sa taille : ses bords ne se lisent pas sur la règle.");
      else if (ecart > 0.15) faute("taille", ecart > 0.5, `Tu as noté ${cm(taille.v)} pour la taille de l'image ; elle mesurait ${cm(vraie)}. Pose le zéro de la règle sur un bord de la lettre, et lis la graduation en face de l'autre bord.`);
      else if (rangTaille < 0) faute("taille", false, "Tu as mesuré la taille de l'image après avoir déplacé la lentille ou l'objet : elle ne correspond à aucune de tes mesures.");
    }
  }

  // ----- ce que l'élève emporte : ses lectures, ou celles du professeur pour les mesures qui manquent -----
  const duProfesseur = mesuresDuProfesseur(r, but);
  const retenues: { p: Positions; eleve: boolean }[] = duProfesseur.map((p, k) => {
    const x = retenus[k];
    if (!x) return { p, eleve: false };
    // une lecture absente ou dans le désordre ne permet aucun calcul : on garde alors la vraie position
    const vraies = { o: x.banc.objet, l: x.banc.supports[0]?.x ?? x.banc.objet + ECART, e: x.banc.ecran };
    const notees = { o: x.o ?? vraies.o, l: x.a ?? vraies.l, e: x.e ?? vraies.e };
    return { p: notees.l - notees.o >= 0.5 && notees.e - notees.l >= 0.5 ? notees : vraies, eleve: true };
  });
  const mesures: Record<string, number> = {};
  const lignes: string[] = n === 0 ? ["Sans mesure notée, on continue avec celles du professeur."] : [];
  retenues.forEach(({ p, eleve }, k) => {
    mesures[`xo${k + 1}`] = p.o;
    mesures[`xl${k + 1}`] = p.l;
    mesures[`xe${k + 1}`] = p.e;
    lignes.push(`Mesure n° ${k + 1}${eleve ? "" : ", donnée par le professeur"} : objet à ${cm(p.o)}, lentille à ${cm(p.l)}, écran à ${cm(p.e)}.`);
  });
  if (but.taille) {
    // la taille va avec la mesure où la règle a été posée ; à défaut, avec la dernière
    const rang = rangTaille >= 0 ? rangTaille : retenues.length - 1;
    const avec = retenues[rang].p;
    mesures.xot = avec.o;
    mesures.xlt = avec.l;
    mesures.xet = avec.e;
    mesures.t = taille?.v ?? mm((objet * (avec.e - avec.l)) / (avec.l - avec.o));
    lignes.push(`Taille de l'image à la mesure n° ${rang + 1}${taille ? "" : ", donnée par le professeur"} : ${cm(mesures.t)}.`);
  }
  return { score: n === 0 ? 0 : scoreDesFautes(fautes), fautes, mesures, lignes };
}

// ---------- le bilan : construire une lunette afocale ----------

function bilanLunette(r: ReglagesOptique, but: ButLunette, etat: EtatOptique): BilanPaillasse {
  const objectif = lentilleDe(r, but.objectif);
  const oculaire = lentilleDe(r, but.oculaire);
  const oeil = r.recepteur.genre === "oeil" ? r.recepteur.f : 0;
  const angle = r.source.genre === "lointain" ? r.source.angle : 0;
  const fautes: Faute[] = [];
  const faute = (code: string, grave: boolean, texte: string) => fautes.push({ code, grave, texte });
  const vide = (b: Montage) => b.supports.every((s) => s.lentille === null);
  const pleine = (b: Montage) => b.supports.length >= 2 && b.supports.every((s) => s.lentille !== null);
  const sans = [...etat.tailles].reverse().find((t) => vide(t.banc)) ?? null;
  const avec = [...etat.tailles].reverse().find((t) => pleine(t.banc)) ?? null;
  const releve = [...etat.releves].reverse().find((x) => x.a !== null && x.b !== null) ?? null;
  const fait = sans !== null || avec !== null || releve !== null;
  // le montage jugé : celui du relevé des positions, sinon celui de la mesure à travers la lunette
  const banc = releve?.banc ?? avec?.banc ?? null;

  if (!fait) faute("mesures", true, "Tu n'as rien noté : la manipulation n'est pas faite.");
  else {
    // ----- la référence, sans la lunette -----
    if (!sans) faute("reference", true, "Tu n'as pas mesuré la taille de l'image sans la lunette : il manque la référence pour calculer le grossissement.");
    else {
      const image = imageSurEcran(r, sans.banc);
      const ecart = Math.abs(sans.v - Math.abs(image.taille));
      if (!image.eclaire) faute("lampe", true, "La lampe de la source était éteinte quand tu as mesuré l'image sans la lunette : il n'y avait rien sur l'écran.");
      else if (ecart > 0.1001) faute("reference", ecart > 0.3, `Sans la lunette, tu as noté ${cm(sans.v)} pour la taille de l'image ; elle mesurait ${cm(Math.abs(image.taille))}. Pose le zéro de la règle sur un bord de la lettre, et lis la graduation en face de l'autre bord.`);
    }
    // ----- le choix des deux lentilles -----
    if (banc && objectif && oculaire) {
      const [premiere, seconde] = [lentilleDe(r, banc.supports[0]?.lentille ?? null), lentilleDe(r, banc.supports[1]?.lentille ?? null)];
      const divergente = [premiere, seconde].find((l) => l !== null && l.f < 0) ?? null;
      if (!premiere || !seconde) faute("lentilles", true, "Ta lunette n'avait pas ses deux lentilles : il faut un objectif et un oculaire.");
      else if (divergente) faute("lentilles", true, `Tu as monté la lentille de ${vergence(divergente.etiquette)} : elle est divergente. Une lunette astronomique est faite de deux lentilles convergentes.`);
      else if (premiere.id === but.oculaire && seconde.id === but.objectif) faute("lentilles", true, `Tu as monté la lunette à l'envers : la lentille de ${vergence(premiere.etiquette)} était du côté de l'objet. L'objectif est la lentille de plus grande distance focale, celle de ${vergence(objectif.etiquette)} ; à l'envers, la lunette rapetisse.`);
      else if (premiere.id !== but.objectif || seconde.id !== but.oculaire) faute("lentilles", true, `Tu as monté les lentilles de ${vergence(premiere.etiquette)} et de ${vergence(seconde.etiquette)}. Il fallait l'objectif de ${vergence(objectif.etiquette)} et l'oculaire de ${vergence(oculaire.etiquette)}.`);
      else {
        // ----- le réglage : la lunette est afocale quand l'image est nette sur l'écran de l'œil fictif -----
        const { flou } = imageSurEcran(r, { ...banc, lampe: true });
        const distance = banc.supports[1].x - banc.supports[0].x;
        if (flou > NET) faute("afocale", flou > FLOU, `Ta lunette n'était pas afocale : l'image n'était pas nette sur l'écran de l'œil fictif. Les deux lentilles étaient à ${cm(distance)} l'une de l'autre ; il fallait ${cm(objectif.f + oculaire.f)}, la somme des deux distances focales.${banc.salle ? " Éteins la lumière de la salle : l'image se voit mieux." : ""}`);
      }
    }
    // ----- les lectures sur le rail -----
    if (!releve) faute("releve", true, "Tu n'as pas noté la position des deux lentilles sur le rail.");
    else {
      const ecarts: [number, number, string][] = [[releve.a ?? 0, releve.banc.supports[0]?.x ?? 0, "l'objectif"], [releve.b ?? 0, releve.banc.supports[1]?.x ?? 0, "l'oculaire"]];
      const [note, vrai, quoi] = ecarts.sort((u, v) => Math.abs(v[0] - v[1]) - Math.abs(u[0] - u[1]))[0];
      if (Math.abs(note - vrai) > 0.1001) faute("lecture", Math.abs(note - vrai) > 0.5, `Tu as noté ${cm(note)} pour ${quoi} ; son repère était en face de ${cm(vrai)}. Lis la graduation en face du repère, à la loupe.`);
    }
    // ----- l'image à travers la lunette -----
    if (!avec) faute("image", true, "Tu n'as pas mesuré la taille de l'image à travers la lunette.");
    else {
      const image = imageSurEcran(r, avec.banc);
      const ecart = Math.abs(avec.v - Math.abs(image.taille));
      if (!image.eclaire) faute("lampe", true, "La lampe de la source était éteinte quand tu as mesuré l'image à travers la lunette : il n'y avait rien sur l'écran.");
      else if (!(image.flou <= FLOU)) faute("image", false, "L'image n'était pas nette quand tu as mesuré sa taille à travers la lunette : ses bords ne se lisent pas sur la règle.");
      else if (ecart > 0.15) faute("image", ecart > 0.5, `À travers la lunette, tu as noté ${cm(avec.v)} pour la taille de l'image ; elle mesurait ${cm(Math.abs(image.taille))}. Pose le zéro de la règle sur un bord de la lettre, et lis la graduation en face de l'autre bord.`);
    }
  }

  // ----- ce que l'élève emporte -----
  const f1 = objectif?.f ?? 30, f2 = oculaire?.f ?? 10;
  const x1 = r.supports[0] ?? 20;
  const positions = releve && releve.a !== null && releve.b !== null && releve.b - releve.a >= 0.5 ? { a: releve.a, b: releve.b } : null;
  const mesures = {
    x1: positions?.a ?? x1, x2: positions?.b ?? mm(x1 + f1 + f2),
    y0: sans?.v ?? mm(oeil * angle), y1: avec?.v ?? mm((oeil * angle * f1) / f2),
  };
  const lignes = [
    sans ? `Sans la lunette, l'image mesure ${cm(mesures.y0)}.` : `Sans la lunette, le professeur mesure une image de ${cm(mesures.y0)}.`,
    positions ? `Objectif à ${cm(mesures.x1)}, oculaire à ${cm(mesures.x2)}.` : `Positions données par le professeur : objectif à ${cm(mesures.x1)}, oculaire à ${cm(mesures.x2)}.`,
    avec ? `À travers la lunette, l'image mesure ${cm(mesures.y1)}.` : `À travers la lunette, le professeur mesure une image de ${cm(mesures.y1)}.`,
  ];
  return { score: fait ? scoreDesFautes(fautes) : 0, fautes, mesures, lignes };
}

/** Le bilan de la manipulation : les positions et les tailles retenues, et les fautes relevées par le professeur. */
const bilan = (r: ReglagesOptique, etat: EtatOptique): BilanPaillasse => (r.but.genre === "focale" ? bilanFocale(r, r.but, etat) : bilanLunette(r, r.but, etat));

export const regles: ReglesPaillasse<ReglagesOptique, EtatOptique> = { depart, geste, bilan };
