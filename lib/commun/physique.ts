// La physique de la simulation du basketteur (fiche 1 : chute libre et mouvement d'un projectile).
// Modèle : chute libre. Seul le poids agit, on néglige les frottements de l'air.
// Repère : origine au sol, à la verticale du point de départ ; axe (Ox) horizontal vers le panier ; axe (Oy) vertical vers le haut.
// Unités : mètre, seconde, mètre par seconde ; les angles se donnent en degrés.
// Fonctions pures : ni horloge, ni hasard.

/** Intensité de la pesanteur, en m·s⁻². */
export const PESANTEUR = 9.81;
const g = PESANTEUR; // noté g dans les formules, comme dans le cours
/** Le centre du cercle : à 4,60 m du point de départ (distance arrondie de la ligne des lancers francs) et à 3,05 m du sol. */
export const PANIER = { x: 4.6, y: 3.05 } as const;
/** Le tir est réussi si le centre du ballon passe à moins de 0,15 m du centre du cercle. */
export const TOLERANCE_PANIER = 0.15;

// ---------- le saut : mouvement vertical ----------
// Le joueur quitte le sol à t = 0 avec la vitesse verticale v0. y est la hauteur de son centre de masse au-dessus de sa position debout.

/** y(t) = v0·t − ½·g·t², du décollage (t = 0) au retour au sol. */
export const hauteurSaut = (v0: number, t: number): number => v0 * t - 0.5 * g * t * t;
/** v_y(t) = v0 − g·t. */
export const vitesseSaut = (v0: number, t: number): number => v0 - g * t;
/** L'instant du sommet, où la vitesse s'annule : v0/g. */
export const instantSommetSaut = (v0: number): number => v0 / g;
/** La hauteur maximale du saut : v0²/(2g). */
export const hauteurMaxSaut = (v0: number): number => (v0 * v0) / (2 * g);
/** La durée du saut, du décollage au retour au sol : 2·v0/g. */
export const dureeSaut = (v0: number): number => (2 * v0) / g;

// ---------- le tir : mouvement d'un projectile ----------

/** Un tir : le ballon est lâché à la hauteur H (hauteur ≥ 0), avec la vitesse v0, sous l'angle α avec l'horizontale. */
export interface Tir {
  /** vitesse du ballon au lâcher, en m/s */
  v0: number;
  /** angle du tir avec l'horizontale, en degrés */
  angle: number;
  /** hauteur de lâcher, en m */
  hauteur: number;
}
export interface Position { x: number; y: number }
export interface Vitesse { vx: number; vy: number }
/** Le résultat d'un tir. L'écart et la hauteur du sommet sont en mètres ; l'écart est toujours positif. */
export type VerdictTir =
  | { resultat: "reussi" }
  | { resultat: "court"; ecart: number }
  | { resultat: "long"; ecart: number }
  | { resultat: "trop-bas"; sommet: number };

/** Les coordonnées de la vitesse au lâcher : v0·cos(α) et v0·sin(α). */
function vitesseInitiale({ v0, angle }: Tir): Vitesse {
  const alpha = (angle * Math.PI) / 180;
  return { vx: v0 * Math.cos(alpha), vy: v0 * Math.sin(alpha) };
}

/** x(t) = v0·cos(α)·t et y(t) = −½·g·t² + v0·sin(α)·t + H. */
export function positionTir(tir: Tir, t: number): Position {
  const { vx, vy } = vitesseInitiale(tir);
  return { x: vx * t, y: -0.5 * g * t * t + vy * t + tir.hauteur };
}

/** v_x = v0·cos(α), qui ne change pas, et v_y(t) = −g·t + v0·sin(α). */
export function vitesseTir(tir: Tir, t: number): Vitesse {
  const { vx, vy } = vitesseInitiale(tir);
  return { vx, vy: -g * t + vy };
}

/** Le sommet de la trajectoire, atteint à t = v0·sin(α)/g. Pour un tir horizontal ou vers le bas, c'est le point de lâcher. */
export function sommetTir(tir: Tir): Position & { t: number } {
  const t = Math.max(0, vitesseInitiale(tir).vy / g);
  return { t, ...positionTir(tir, t) };
}

/**
 * L'instant et l'abscisse du centre du ballon quand il repasse à la hauteur du cercle (3,05 m) en descendant.
 * Vaut null si le ballon ne monte pas jusque-là.
 */
export function passageAuPanier(tir: Tir): { t: number; x: number } | null {
  const { vx, vy } = vitesseInitiale(tir);
  // y(t) = 3,05 s'écrit ½·g·t² − v0·sin(α)·t + (3,05 − H) = 0 : la plus grande racine est le passage en descendant
  const delta = vy * vy - 2 * g * (PANIER.y - tir.hauteur);
  if (delta < 0) return null;
  const t = (vy + Math.sqrt(delta)) / g;
  return t < 0 ? null : { t, x: vx * t };
}

const dansLeCercle = (x: number): boolean => Math.abs(x - PANIER.x) < TOLERANCE_PANIER;

/**
 * Le tir est réussi si le centre du ballon repasse à 3,05 m à moins de 0,15 m du centre du cercle.
 * Sinon il est trop court ou trop long, de l'écart donné. Si le sommet est sous 3,05 m, le ballon ne monte pas assez haut.
 */
export function verdictTir(tir: Tir): VerdictTir {
  const passage = passageAuPanier(tir);
  if (!passage) return { resultat: "trop-bas", sommet: sommetTir(tir).y };
  if (dansLeCercle(passage.x)) return { resultat: "reussi" };
  return passage.x < PANIER.x ? { resultat: "court", ecart: PANIER.x - passage.x } : { resultat: "long", ecart: passage.x - PANIER.x };
}

/** L'instant où le ballon touche le sol (y = 0) : la racine positive de −½·g·t² + v0·sin(α)·t + H = 0. */
export function instantSol(tir: Tir): number {
  const { vy } = vitesseInitiale(tir);
  return (vy + Math.sqrt(vy * vy + 2 * g * tir.hauteur)) / g;
}

/** L'instant où le vol s'arrête : au passage dans le cercle si le tir est réussi, sinon quand le ballon touche le sol. */
export function finDuVol(tir: Tir): number {
  const passage = passageAuPanier(tir);
  return passage && dansLeCercle(passage.x) ? passage.t : instantSol(tir);
}
