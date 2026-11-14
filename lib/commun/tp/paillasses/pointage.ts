// La paillasse « pointage » (décision 0012) : le pointage d'une vidéo, image par image. Une balle lâchée ou lancée est
// filmée devant un étalon. L'élève fait les gestes du logiciel de pointage : il étalonne l'image (deux repères sur les
// bouts de l'étalon, sa longueur), pose l'origine du repère sur le sol, pointe le centre de la balle sur chaque image,
// puis exploite ses courbes : une droite à ajuster sur la vitesse verticale, l'énergie mécanique au début et à la fin.
// Ce sont ses pointés qui comptent, avec leur imprécision : un étalonnage faux change toutes les distances, une origine
// mal posée décale l'énergie potentielle, des pointés bâclés ou des images sautées abîment les courbes.
// Fonctions pures : le navigateur s'en sert pour faire vivre la paillasse, le serveur pour rejouer la manipulation.
// Dans l'image, les positions sont en unités du dessin ; ailleurs en mètres, en secondes, en m/s et en millijoules.
import { nombre, nombreRelatif } from "@/lib/commun/format";
import { nombreDe, scoreDesFautes, texteDe, type BilanPaillasse, type Faute, type GesteBrut, type ReglesPaillasse } from "../types";

export interface ReglagesPointage {
  /** ce qui est filmé, dans une phrase : « la balle de golf » */
  balle: string;
  /** le rayon de la balle, en mètres, et sa couleur dans le film */
  rayon: number;
  couleur: string;
  /** la masse de la balle, en grammes */
  masse: number;
  /** la balle sur la première image : sa position en mètres (depuis le pied de l'étalon, au sol), sa vitesse en m/s */
  x0: number;
  y0: number;
  vx: number;
  vy: number;
  /** la vitesse limite de chute de la balle dans l'air, en m/s ; 0 quand les frottements ne comptent pas */
  limite: number;
  /** le nombre d'images du film */
  images: number;
  /** la durée entre deux images, en secondes */
  dt: number;
  /** la longueur de l'étalon, en mètres */
  etalon: number;
}

export interface Point { x: number; y: number }

/**
 * La caméra : l'image fait `l` sur `h` unités ; un mètre y fait `parMetre` unités. Le sol est à la hauteur `sol` de
 * l'image, et l'étalon est debout sur le sol, à l'abscisse `etalon`.
 */
export const CAMERA = { l: 360, h: 480, parMetre: 205, sol: 446, etalon: 40 };
/** L'intensité de la pesanteur, en m/s². */
export const G = 9.81;
/** Les repères de l'échelle et l'origine, là où le logiciel les pose à l'ouverture : nulle part d'utile. */
const DEPART_A: Point = { x: 232, y: 206 }, DEPART_B: Point = { x: 304, y: 262 }, DEPART_ORIGINE: Point = { x: 300, y: 380 };
/** Il faut au moins cinq images pointées pour tracer une vitesse et y ajuster une droite. */
export const POINTES_MIN = 5;

const dixieme = (x: number) => Math.round(x * 10) / 10;
const centieme = (x: number) => Math.round(x * 100) / 100;
const m2 = (x: number) => `${nombre(x, 2)} m`;
const cmDe = (metres: number) => `${nombre(metres * 100, 1)} cm`;
const mJ = (x: number) => `${nombre(x, 1)} mJ`;
const pente2 = (x: number) => `${nombreRelatif(x, 2)} m/s²`;

// ---------- ce que la caméra a filmé ----------

/** Le point de l'image où se trouve un point du mur, donné en mètres depuis le pied de l'étalon. */
export const dansImage = (x: number, y: number): Point => ({ x: CAMERA.etalon + x * CAMERA.parMetre, y: CAMERA.sol - y * CAMERA.parMetre });
/** Les deux bouts de l'étalon dans l'image : son pied, sur le sol, et son sommet. */
export const boutsEtalon = (r: ReglagesPointage): [Point, Point] => [dansImage(0, 0), dansImage(0, r.etalon)];
/** La date de chaque image, en secondes. */
export const date = (r: ReglagesPointage, image: number): number => image * r.dt;

interface Mobile { x: number; y: number; vx: number; vy: number }
/** L'accélération de la balle : son poids, et le frottement de l'air, proportionnel au carré de la vitesse. */
function derive(r: ReglagesPointage, m: Mobile): Mobile {
  const k = r.limite > 0 ? G / r.limite ** 2 : 0;
  const v = Math.hypot(m.vx, m.vy);
  return { x: m.vx, y: m.vy, vx: -k * v * m.vx, vy: -G - k * v * m.vy };
}
const avance = (m: Mobile, d: Mobile, h: number): Mobile => ({ x: m.x + d.x * h, y: m.y + d.y * h, vx: m.vx + d.vx * h, vy: m.vy + d.vy * h });

/**
 * Le vrai mouvement de la balle : sa position (en mètres) et sa vitesse (en m/s) sur chaque image. Le mouvement est
 * calculé pas à pas (méthode de Runge-Kutta d'ordre 4, quarante pas entre deux images) : sans frottement, c'est la parabole exacte.
 */
export function trajectoire(r: ReglagesPointage): (Mobile & { t: number })[] {
  const pas = r.dt / 40;
  let m: Mobile = { x: r.x0, y: r.y0, vx: r.vx, vy: r.vy };
  const images = [{ ...m, t: 0 }];
  for (let i = 1; i < r.images; i++) {
    for (let k = 0; k < 40; k++) {
      const k1 = derive(r, m), k2 = derive(r, avance(m, k1, pas / 2)), k3 = derive(r, avance(m, k2, pas / 2)), k4 = derive(r, avance(m, k3, pas));
      m = { x: m.x + (pas / 6) * (k1.x + 2 * k2.x + 2 * k3.x + k4.x), y: m.y + (pas / 6) * (k1.y + 2 * k2.y + 2 * k3.y + k4.y), vx: m.vx + (pas / 6) * (k1.vx + 2 * k2.vx + 2 * k3.vx + k4.vx), vy: m.vy + (pas / 6) * (k1.vy + 2 * k2.vy + 2 * k3.vy + k4.vy) };
    }
    images.push({ ...m, t: date(r, i) });
  }
  return images;
}
/** Le centre de la balle dans chaque image. */
export const centres = (r: ReglagesPointage): Point[] => trajectoire(r).map((m) => dansImage(m.x, m.y));

// ---------- l'état de la paillasse ----------

export interface EtatPointage {
  /** les deux repères de l'échelle, dans l'image */
  a: Point;
  b: Point;
  /** la longueur que l'élève donne à l'étalon, en mètres ; null tant qu'il ne l'a pas dite */
  longueur: number | null;
  /** l'origine du repère, dans l'image, et si l'élève l'a posée lui-même */
  origine: Point;
  posee: boolean;
  /** le pointé de chaque image, dans l'image ; null pour une image non pointée */
  pointes: (Point | null)[];
  /** la droite gardée sur la vitesse verticale, et la pente de la droite qui passait alors au mieux par les points */
  droite: { pente: number; ordonnee: number; juste: number } | null;
  /** l'énergie mécanique relevée au début et à la fin, en millijoules, avec ce que la courbe donnait alors à cet endroit */
  debut: { note: number; calcul: number } | null;
  fin: { note: number; calcul: number } | null;
}

// ---------- les calculs du logiciel de pointage, avec les pointés de l'élève ----------

/** L'échelle de l'élève, en mètres par unité de l'image ; null tant qu'il n'a pas dit la longueur de l'étalon. */
export function echelle(etat: EtatPointage): number | null {
  const ecart = Math.hypot(etat.b.x - etat.a.x, etat.b.y - etat.a.y);
  return etat.longueur !== null && ecart >= 1 ? etat.longueur / ecart : null;
}

/** Une image pointée, dans le repère de l'élève : sa date, sa position en mètres. */
export interface Position { image: number; t: number; x: number; y: number }
/** Les positions de la balle selon l'élève : ses pointés, convertis avec son échelle et son origine. Vide sans échelle. */
export function positions(r: ReglagesPointage, etat: EtatPointage): Position[] {
  const k = echelle(etat);
  if (k === null) return [];
  return etat.pointes.flatMap((p, image) => (p ? [{ image, t: date(r, image), x: (p.x - etat.origine.x) * k, y: (etat.origine.y - p.y) * k }] : []));
}

/** Ce que le logiciel calcule en un point : la vitesse (en m/s) et les énergies (en millijoules). */
export interface Grandeur extends Position { vx: number; vy: number; Ec: number; Epp: number; Em: number }
/**
 * Les vitesses et les énergies, calculées comme le fait un logiciel de pointage : la vitesse en un point se prend entre
 * le point d'avant et le point d'après. Le premier et le dernier point pointés n'ont donc pas de vitesse.
 */
export function grandeursDe(masse: number, points: readonly Position[]): Grandeur[] {
  return points.slice(1, -1).map((p, j) => {
    const avant = points[j], apres = points[j + 2];
    const vx = (apres.x - avant.x) / (apres.t - avant.t), vy = (apres.y - avant.y) / (apres.t - avant.t);
    const Ec = 0.5 * masse * (vx * vx + vy * vy), Epp = masse * G * p.y;
    return { ...p, vx, vy, Ec, Epp, Em: Ec + Epp };
  });
}
export const grandeurs = (r: ReglagesPointage, etat: EtatPointage): Grandeur[] => grandeursDe(r.masse, positions(r, etat));

/** La droite qui passe au mieux par des points (moindres carrés) : sa pente et son ordonnée à l'origine ; null avec moins de deux dates. */
export function moindresCarres(points: readonly { t: number; v: number }[]): { pente: number; ordonnee: number } | null {
  const n = points.length;
  const tm = points.reduce((s, p) => s + p.t, 0) / n, vm = points.reduce((s, p) => s + p.v, 0) / n;
  const variance = points.reduce((s, p) => s + (p.t - tm) ** 2, 0);
  if (n < 2 || variance < 1e-12) return null;
  const pente = points.reduce((s, p) => s + (p.t - tm) * (p.v - vm), 0) / variance;
  return { pente, ordonnee: vm - pente * tm };
}
/** La droite des moindres carrés de la vitesse verticale de l'élève. */
export const droiteJuste = (r: ReglagesPointage, etat: EtatPointage) => moindresCarres(grandeurs(r, etat).map((p) => ({ t: p.t, v: p.vy })));

/** Ce que donne un pointage sans défaut : la pente de la vitesse verticale, l'énergie mécanique au début et à la fin. */
export function reference(r: ReglagesPointage): { pente: number; Em0: number; Em1: number } {
  const tout = grandeursDe(r.masse, trajectoire(r).map((m, image) => ({ image, t: m.t, x: m.x, y: m.y })));
  const droite = moindresCarres(tout.map((p) => ({ t: p.t, v: p.vy })));
  return { pente: centieme(droite?.pente ?? -G), Em0: dixieme(tout[0]?.Em ?? 0), Em1: dixieme(tout[tout.length - 1]?.Em ?? 0) };
}

// ---------- les gestes ----------

const meme = (p: Point | null, q: Point): boolean => p !== null && p.x === q.x && p.y === q.y;

const depart = (r: ReglagesPointage): EtatPointage => ({
  a: DEPART_A, b: DEPART_B, longueur: null, origine: DEPART_ORIGINE, posee: false,
  pointes: Array.from({ length: r.images }, () => null), droite: null, debut: null, fin: null,
});

/** Le point d'un geste, s'il est dans l'image ; null sinon. */
function pointDe(g: GesteBrut): Point | null {
  const x = nombreDe(g, "x"), y = nombreDe(g, "y");
  return x !== null && y !== null && x >= 0 && x <= CAMERA.l && y >= 0 && y <= CAMERA.h ? { x: dixieme(x), y: dixieme(y) } : null;
}

/** Applique un geste. Un geste inconnu, mal formé ou impossible ne change rien. */
function geste(r: ReglagesPointage, etat: EtatPointage, g: GesteBrut): EtatPointage {
  switch (g.g) {
    // glisser un repère de l'échelle sur l'image
    case "etalon": {
      const p = pointDe(g), bout = texteDe(g, "bout");
      if (!p || (bout !== "a" && bout !== "b") || meme(bout === "a" ? etat.a : etat.b, p)) return etat;
      return bout === "a" ? { ...etat, a: p } : { ...etat, b: p };
    }
    // dire la longueur de l'étalon, en mètres
    case "longueur": {
      const v = nombreDe(g, "v");
      return v !== null && v > 0 && v <= 100 ? { ...etat, longueur: Math.round(v * 1000) / 1000 } : etat;
    }
    // poser l'origine du repère
    case "origine": {
      const p = pointDe(g);
      return p && !(etat.posee && meme(etat.origine, p)) ? { ...etat, origine: p, posee: true } : etat;
    }
    // pointer la balle sur une image : un nouveau pointé remplace l'ancien
    case "pointer": {
      const p = pointDe(g), image = nombreDe(g, "i");
      if (!p || image === null || !Number.isInteger(image) || image < 0 || image >= r.images || meme(etat.pointes[image], p)) return etat;
      return { ...etat, pointes: etat.pointes.map((ancien, i) => (i === image ? p : ancien)) };
    }
    // garder la droite ajustée sur la vitesse verticale : `va` et `vb` sont ses valeurs à la première et à la dernière image
    case "droite": {
      const va = nombreDe(g, "va"), vb = nombreDe(g, "vb");
      const juste = droiteJuste(r, etat);
      if (va === null || vb === null || Math.abs(va) > 50 || Math.abs(vb) > 50 || !juste) return etat;
      return { ...etat, droite: { pente: centieme((vb - va) / date(r, r.images - 1)), ordonnee: centieme(va), juste: juste.pente } };
    }
    // relever l'énergie mécanique au début ou à la fin : la paillasse retient aussi ce que la courbe donnait à cet endroit
    case "noter": {
      const v = nombreDe(g, "v"), quoi = texteDe(g, "quoi");
      const tout = grandeurs(r, etat);
      if (v === null || v < 0 || v > 1e6 || tout.length < 2 || (quoi !== "debut" && quoi !== "fin")) return etat;
      const releve = { note: dixieme(v), calcul: (quoi === "debut" ? tout[0] : tout[tout.length - 1]).Em };
      return quoi === "debut" ? { ...etat, debut: releve } : { ...etat, fin: releve };
    }
    default: return etat;
  }
}

// ---------- le bilan ----------

/** Le bilan de la manipulation : la pente et les deux énergies retenues, et les fautes relevées par le professeur. */
function bilan(r: ReglagesPointage, etat: EtatPointage): BilanPaillasse {
  const prof = reference(r);
  const fautes: Faute[] = [];
  const faute = (code: string, grave: boolean, texte: string) => fautes.push({ code, grave, texte });
  const pointees = etat.pointes.filter((p) => p !== null).length;
  const rien = pointees === 0 && etat.longueur === null && !etat.posee && !etat.droite && !etat.debut && !etat.fin;

  if (rien) {
    faute("pointage", true, "Tu n'as rien fait sur la vidéo : ni étalonnage, ni pointage.");
  } else {
    // l'étalonnage : la longueur dite, et l'écart entre les deux repères
    const k = echelle(etat);
    if (etat.longueur === null) {
      faute("etalon", true, "Tu n'as pas dit la longueur de l'étalon : sans échelle, le logiciel ne peut rien calculer.");
    } else {
      const facteur = (k ?? 0) * CAMERA.parMetre;
      const couvert = Math.hypot(etat.b.x - etat.a.x, etat.b.y - etat.a.y) / CAMERA.parMetre;
      if (Math.abs(etat.longueur - r.etalon) > 0.005) faute("etalon", true, `Tu as donné ${m2(etat.longueur)} à un étalon de ${m2(r.etalon)} : toutes tes distances sont multipliées par ${nombre(etat.longueur / r.etalon, 2)}.`);
      else if (Math.abs(facteur - 1) > 0.02) faute("etalon", Math.abs(facteur - 1) > 0.06, `Tes deux repères couvrent ${m2(couvert)} du mur, et tu leur donnes ${m2(etat.longueur)} : ton échelle est fausse de ${nombre(Math.abs(facteur - 1) * 100, 0)} %. Pose chaque repère juste sur un bout de l'étalon.`);
    }
    // l'origine : sur le sol
    const hauteur = (CAMERA.sol - etat.origine.y) / CAMERA.parMetre;
    if (!etat.posee) faute("origine", true, "Tu n'as pas posé l'origine du repère sur le sol : tes altitudes, et donc l'énergie potentielle, partent d'un endroit quelconque.");
    else if (Math.abs(hauteur) > 0.025) faute("origine", Math.abs(hauteur) > 0.08, `Ton origine est à ${cmDe(Math.abs(hauteur))} ${hauteur > 0 ? "au-dessus" : "au-dessous"} du sol : toutes tes altitudes sont décalées d'autant, et l'énergie potentielle avec elles.`);
    // le pointage : assez d'images, sans en sauter, au centre de la balle
    if (pointees < POINTES_MIN) {
      faute("pointage", true, pointees === 0 ? "Tu n'as pointé aucune image." : `Tu n'as pointé que ${pointees} image${pointees > 1 ? "s" : ""} sur ${r.images} : il en faut au moins ${POINTES_MIN} pour tracer une vitesse.`);
    } else {
      const sautees = r.images - pointees;
      if (sautees > 0) faute("sautees", sautees > 2, `Tu as sauté ${sautees} image${sautees > 1 ? "s" : ""} sur ${r.images} : il manque des points sur tes courbes, et les vitesses voisines sont moins justes.`);
      const vrais = centres(r);
      const ecart = etat.pointes.reduce((s, p, i) => s + (p ? Math.hypot(p.x - vrais[i].x, p.y - vrais[i].y) : 0), 0) / pointees;
      if (ecart > 2) faute("pointes", ecart > 4.5, `Tes pointés sont en moyenne à ${cmDe(ecart / CAMERA.parMetre)} du centre de la balle : les vitesses et les énergies calculées avec eux partent dans tous les sens. Vise le centre, en regardant la loupe.`);
    }
    // la droite sur la vitesse verticale
    if (!etat.droite) faute("droite", true, "Tu n'as pas gardé de droite sur la courbe de la vitesse verticale.");
    else {
      const erreur = Math.abs(etat.droite.pente - etat.droite.juste);
      if (erreur > 0.35) faute("droite", erreur > 1, `Ta droite a une pente de ${pente2(etat.droite.pente)} ; celle qui passe au mieux par tes points a une pente de ${pente2(etat.droite.juste)}. Règle ses deux bouts pour qu'elle passe au milieu des points.`);
    }
    // l'énergie mécanique, lue au début et à la fin
    if (!etat.debut || !etat.fin) faute("energie", true, "Tu n'as pas relevé l'énergie mécanique au début et à la fin du mouvement.");
    else {
      const releves = [{ e: etat.debut, ou: "le début", point: "Au premier point" }, { e: etat.fin, ou: "la fin", point: "Au dernier point" }];
      const pire = releves.map((x) => ({ ...x, erreur: Math.abs(x.e.note - x.e.calcul) / Math.max(1e-9, Math.abs(x.e.calcul)) })).sort((u, v) => v.erreur - u.erreur)[0];
      if (pire.erreur > 0.015 && Math.abs(pire.e.note - pire.e.calcul) > 0.15) faute("lecture", pire.erreur > 0.05, `Tu as noté ${mJ(pire.e.note)} pour ${pire.ou}. ${pire.point}, ta courbe de l'énergie mécanique donnait ${mJ(pire.e.calcul)}. Place le repère sur ce point, et lis bien la ligne de l'énergie mécanique.`);
    }
  }

  // ce que l'élève retient ; ce qui manque est donné par le professeur
  const energies = etat.debut && etat.fin ? { Em0: etat.debut.note, Em1: etat.fin.note } : { Em0: prof.Em0, Em1: prof.Em1 };
  const mesures = { pente: etat.droite ? etat.droite.pente : prof.pente, ...energies };
  const lignes = [
    etat.droite ? `Ta droite sur la vitesse verticale : pente de ${pente2(etat.droite.pente)}.` : `Sans droite gardée, on continue avec celle du professeur : pente de ${pente2(prof.pente)}.`,
    etat.debut && etat.fin ? `Ton énergie mécanique : ${mJ(etat.debut.note)} au début, ${mJ(etat.fin.note)} à la fin.` : `Sans les deux relevés, on continue avec ceux du professeur : ${mJ(prof.Em0)} au début, ${mJ(prof.Em1)} à la fin.`,
    `Pour un pointage sans défaut : pente de ${pente2(prof.pente)} ; énergie mécanique de ${mJ(prof.Em0)}, puis ${mJ(prof.Em1)}.`,
  ];
  return { score: rien ? 0 : scoreDesFautes(fautes), fautes, mesures, lignes };
}

export const regles: ReglesPaillasse<ReglagesPointage, EtatPointage> = { depart, geste, bilan };
