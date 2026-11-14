import type { ReactNode } from "react";
import { r } from "./types";

// La verrerie des scènes de chimie : bécher, fiole jaugée, tube, écran d'appareil. Des fonctions pures, dessinées au trait.

/** Les couleurs des solutions des défis : 0, le sulfate de cuivre (bleu) ; 1, le permanganate (violet) ; 2, une espèce orangée. */
const TEINTES = [[64, 150, 240], [168, 78, 205], [240, 150, 60]];
/** La couleur d'une solution : sa teinte, et une intensité de 0 (presque de l'eau) à 1 (très concentrée). */
export function couleurSolution(teinte: number, intensite: number): string {
  const [rouge, vert, bleu] = TEINTES[teinte] ?? TEINTES[0];
  return `rgba(${rouge}, ${vert}, ${bleu}, ${r(0.12 + 0.82 * Math.max(0, Math.min(1, intensite)))})`;
}
/** L'eau, ou une solution incolore. */
export const EAU = "rgba(190, 215, 240, 0.22)";

/** Un bécher : son liquide jusqu'au niveau donné (de 0 à 1), puis ses parois. `children` se dessine dans le liquide. */
export function Becher({ x, y, l, h, niveau, couleur, children }: { x: number; y: number; l: number; h: number; niveau: number; couleur: string; children?: ReactNode }) {
  const surface = r(y + h * (1 - Math.max(0, Math.min(1, niveau))));
  return (
    <g>
      <rect x={x + 1} y={surface} width={l - 2} height={r(y + h - surface - 1)} rx={3} fill={couleur} />
      {children}
      <path d={`M ${x - 3} ${y} H ${x} V ${y + h - 6} Q ${x} ${y + h} ${x + 6} ${y + h} H ${x + l - 6} Q ${x + l} ${y + h} ${x + l} ${y + h - 6} V ${y} H ${x + l + 3}`} fill="none" stroke="var(--encre)" strokeWidth={1.6} strokeLinejoin="round" />
    </g>
  );
}

/**
 * Une fiole jaugée, centrée sur x : un long col, un corps renflé, un trait de jauge sur le col.
 * Le liquide monte du fond (niveau 0) jusqu'au trait (niveau 1). `id` nomme la découpe du liquide : il doit être unique dans la page.
 */
export function Fiole({ x, y, niveau, couleur, id }: { x: number; y: number; niveau: number; couleur: string; id: string }) {
  const contour = `M ${x - 6} ${y} V ${y + 50} C ${x - 6} ${y + 62} ${x - 32} ${y + 70} ${x - 32} ${y + 92} Q ${x - 32} ${y + 108} ${x - 16} ${y + 108} H ${x + 16} Q ${x + 32} ${y + 108} ${x + 32} ${y + 92} C ${x + 32} ${y + 70} ${x + 6} ${y + 62} ${x + 6} ${y + 50} V ${y}`;
  const surface = r(y + 108 - Math.max(0, Math.min(1, niveau)) * 90);
  return (
    <g>
      <defs><clipPath id={id}><path d={`${contour} Z`} /></clipPath></defs>
      <rect clipPath={`url(#${id})`} x={x - 34} y={surface} width={68} height={r(y + 110 - surface)} fill={couleur} />
      <path d={contour} fill="none" stroke="var(--encre)" strokeWidth={1.6} strokeLinejoin="round" />
      <line x1={x - 9} x2={x + 9} y1={y + 18} y2={y + 18} stroke="var(--cuivre)" strokeWidth={1.4} />
    </g>
  );
}

/** Un tube à essai, centré sur x, plein du liquide donné. */
export function Tube({ x, y, h, couleur, contour = "var(--encre)" }: { x: number; y: number; h: number; couleur: string; contour?: string }) {
  return (
    <g>
      <path d={`M ${x - 7} ${y + 8} V ${y + h - 8} A 7 7 0 0 0 ${x + 7} ${y + h - 8} V ${y + 8} Z`} fill={couleur} />
      <path d={`M ${x - 10} ${y} H ${x - 8} V ${y + h - 8} A 8 8 0 0 0 ${x + 8} ${y + h - 8} V ${y} H ${x + 10}`} fill="none" stroke={contour} strokeWidth={1.5} strokeLinejoin="round" />
    </g>
  );
}

/** L'écran d'un appareil de mesure : un cadre sombre, un nom au-dessus, une valeur en grand. */
export function Ecran({ x, y, l, nom, valeur, couleur = "var(--encre)" }: { x: number; y: number; l: number; nom: string; valeur: string; couleur?: string }) {
  return (
    <g>
      <text x={x} y={y - 5}>{nom}</text>
      <rect x={x} y={y} width={l} height={30} rx={6} fill="var(--carte-2)" stroke="var(--discret)" />
      <text x={x + l / 2} y={y + 21} textAnchor="middle" className="labo-fort" style={{ fontSize: 17, fill: couleur }}>{valeur}</text>
    </g>
  );
}
