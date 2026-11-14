import type { ReactNode } from "react";
import { PANIER } from "@/lib/commun/physique";

// Le terrain de basket vu de côté, à l'échelle : le sol, le panier, le joueur, le ballon.
// Ces pièces du dessin sont des fonctions pures. Elles servent à la simulation libre (Basket.tsx)
// et aux défis du labo (scenes/Basket.tsx), dans le navigateur comme sur le serveur.

export const ESPACE = String.fromCharCode(160); // espace insécable (U+00A0), entre un nombre et son unité
/** Trois décimales suffisent au dessin, et le serveur et le navigateur écrivent ainsi les mêmes nombres. */
export const r = (x: number): number => Math.round(x * 1000) / 1000;

const ECHELLE = 40; // unités du dessin pour un mètre
const X_MIN = -1.1; // bord gauche de la scène, en mètres
const X_MAX = 7.4; // bord droit
const SOUS_SOL = 0.45; // bande sous le sol, pour les graduations
export const HAUT_SAUT = 4.3; // hauteur visible dans « Le saut », en mètres
export const HAUT_TIR = 7.8; // hauteur visible dans « Le tir » : le sommet le plus haut que les curseurs permettent est à 7,36 m
export const RAYON_BALLON = 0.12; // un ballon de 0,24 m de diamètre
const RAYON_CERCLE = 0.225; // un cercle de 0,45 m de diamètre
const FACE_PANNEAU = PANIER.x + RAYON_CERCLE + 0.15; // le cercle est à 0,15 m du panneau
export const MAINS = { x: 0.3, y: 2.2 }; // le centre du ballon dans les mains du joueur de 1,90 m, par rapport à ses pieds
export const COTE = 0.45; // abscisse de la cote qui mesure la hauteur du saut, juste devant le joueur
export const FLECHE = 0.15; // longueur de la flèche de la vitesse initiale, en mètres pour 1 m/s
export const ARC = 0.45; // rayon de l'arc qui montre l'angle de tir
export const PAS_TRACE = 0.1; // la trace du ballon porte un point toutes les 0,1 s

/** Du mètre à l'unité du dessin, pour les textes. Le dessin lui-même se fait en mètres, dans le repère de `enMetres`. */
export const X = (x: number): number => r((x - X_MIN) * ECHELLE);
export const Y = (y: number, haut: number): number => r((haut - y) * ECHELLE);
/** Le repère de la simulation : origine au sol à la verticale du point de départ, (Ox) vers le panier, (Oy) vers le haut, en mètres. */
const enMetres = (haut: number): string => `translate(${X(0)} ${Y(0, haut)}) scale(${ECHELLE} ${-ECHELLE})`;

/** Le support et le panneau (1,05 m de haut, le bas à 2,90 m du sol), dessinés derrière le joueur et le ballon. */
function Support() {
  return (
    <g fill="none" stroke="var(--discret)" strokeLinecap="round" strokeLinejoin="round">
      <path d={`M 6.6 0.05 V 3.15 L ${r(FACE_PANNEAU + 0.05)} 3.6 M 6.6 2.45 L ${r(FACE_PANNEAU + 0.05)} 3.1`} strokeWidth={0.09} />
      <rect x={r(FACE_PANNEAU)} y={2.9} width={0.05} height={1.05} fill="var(--encre)" stroke="none" />
    </g>
  );
}

/** Le cercle, à 3,05 m du sol, et son filet, dessinés devant le ballon. */
function Cercle() {
  const gauche = PANIER.x - RAYON_CERCLE;
  const droite = PANIER.x + RAYON_CERCLE;
  const bas = PANIER.y - 0.42;
  const fil = (x: number, pince: number) => `M ${r(x)} ${PANIER.y} L ${r(x + pince)} ${r(bas)}`;
  const maille = (y: number, retrait: number) => `M ${r(gauche + retrait)} ${r(y)} H ${r(droite - retrait)}`;
  return (
    <g fill="none" strokeLinecap="round">
      <path stroke="var(--discret)" strokeWidth={0.015}
        d={[fil(gauche, 0.09), fil(gauche + 0.15, 0.04), fil(droite - 0.15, -0.04), fil(droite, -0.09), maille(PANIER.y - 0.14, 0.03), maille(PANIER.y - 0.28, 0.06), maille(bas, 0.09)].join(" ")} />
      <path d={`M ${r(gauche)} ${PANIER.y} H ${r(FACE_PANNEAU)}`} stroke="var(--brique)" strokeWidth={0.05} />
    </g>
  );
}

/**
 * Le joueur, de profil, tourné vers le panier : tête ronde, tronc, bras levés, jambes. C'est un dessin original, en mètres.
 * À la taille 1 il mesure 1,90 m et tient le ballon à 2,20 m. Ses mains restent à la verticale de l'origine.
 */
export function Joueur({ pieds = 0, taille = 1 }: { pieds?: number; taille?: number }) {
  return (
    <g transform={`translate(${r(-MAINS.x * taille)} ${r(pieds)}) scale(${r(taille)})`} fill="none" stroke="var(--encre)" strokeLinecap="round" strokeLinejoin="round">
      <path d="M -0.03 0.98 L -0.1 0.5 L -0.16 0.06 M 0.03 0.98 L 0.11 0.5 L 0.07 0.06" strokeWidth={0.085} />
      <path d="M -0.16 0.045 H -0.01 M 0.07 0.045 H 0.23" strokeWidth={0.09} />
      <path d="M -0.02 1.46 L 0.13 1.7 L 0.23 2.05 M 0.02 1.46 L 0.2 1.73 L 0.27 2.08" strokeWidth={0.07} />
      <rect x={-0.15} y={0.8} width={0.3} height={0.24} rx={0.05} fill="var(--encre)" stroke="none" />
      <rect x={-0.14} y={0.98} width={0.28} height={0.54} rx={0.07} fill="var(--bleu)" stroke="none" />
      <path d="M 0.01 1.5 L 0.02 1.66" strokeWidth={0.07} />
      <circle cx={0.03} cy={1.775} r={0.125} fill="var(--carte)" strokeWidth={0.03} />
    </g>
  );
}

/** Le ballon : la position donnée est celle de son centre, en mètres. */
export function Ballon({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${r(x)} ${r(y)})`} stroke="var(--encre)" strokeWidth={0.015}>
      <circle r={RAYON_BALLON} fill="var(--cuivre)" />
      <path d={`M ${-RAYON_BALLON} 0 H ${RAYON_BALLON} M 0 ${-RAYON_BALLON} Q 0.07 0 0 ${RAYON_BALLON}`} fill="none" />
    </g>
  );
}

/**
 * Le terrain : le sol, un repère tous les mètres, le panier à sa place. `children` se dessine en mètres, entre le support
 * et le cercle ; `textes` se place par-dessus, en unités du dessin (fonctions X et Y).
 */
export function Terrain({ haut, description, children, textes }: { haut: number; description: string; children: ReactNode; textes?: ReactNode }) {
  const largeur = r((X_MAX - X_MIN) * ECHELLE);
  const sol = Y(0, haut);
  const hauteurs = Array.from({ length: Math.floor(haut) }, (_, i) => i + 1);
  const distances = Array.from({ length: Math.floor(X_MAX) + 1 }, (_, i) => i);
  return (
    <svg viewBox={`0 0 ${largeur} ${r((haut + SOUS_SOL) * ECHELLE)}`} role="img" aria-label={description}>
      {hauteurs.map((m) => (
        <g key={m}>
          <line x1={0} x2={largeur} y1={Y(m, haut)} y2={Y(m, haut)} stroke="var(--filet)" strokeDasharray="2 4" />
          <text className="simu-repere" x={4} y={Y(m, haut) - 3}>{m}{ESPACE}m</text>
        </g>
      ))}
      <rect x={0} y={sol} width={largeur} height={r(SOUS_SOL * ECHELLE)} fill="var(--carte-2)" />
      <line x1={0} x2={largeur} y1={sol} y2={sol} stroke="var(--encre)" strokeWidth={1.5} />
      {distances.map((m) => (
        <g key={m}>
          <line x1={X(m)} x2={X(m)} y1={sol} y2={sol + 4} stroke="var(--encre)" />
          <text className="simu-repere" x={X(m)} y={sol + 14} textAnchor="middle">{m}{m === distances.length - 1 ? `${ESPACE}m` : ""}</text>
        </g>
      ))}
      <g transform={enMetres(haut)}>
        <Support />
        {children}
        <Cercle />
      </g>
      {textes}
    </svg>
  );
}
