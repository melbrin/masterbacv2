"use client";

// Le kit des paillasses : la verrerie et ce qui coule. Chaque pièce se dessine au trait, avec son liquide.
// Les pièces sont centrées sur `x` ; `y` est leur haut. Le bécher, la fiole jaugée et le tube viennent des scènes du labo.

import { useId, type CSSProperties, type ReactNode } from "react";
import { Echelle } from "./mesure";

export { Becher, EAU, Fiole, Tube, couleurSolution } from "@/components/simulations/scenes/verrerie";

const r2 = (n: number) => Math.round(n * 100) / 100;
const entre = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// ---------- la burette ----------

/** Où sont les graduations d'une burette dessinée : la place du zéro, et la hauteur d'un millilitre. */
export function repereBurette(y: number, h: number, capacite = 25): { zero: number; parMl: number; bas: number } {
  const zero = y + 22;
  const bas = y + h - 6;
  return { zero, parMl: (bas - zero) / capacite, bas };
}

/**
 * Une burette graduée, centrée sur `x`, de `y` à `y + h`. `lecture` : la graduation où se trouve le niveau du liquide
 * (0 en haut ; négative si le liquide dépasse le zéro) ; null si la burette est vide. Le robinet et la pointe se
 * dessinent par la paillasse, sous la burette.
 */
export function Burette({ x, y, h, lecture, couleur, capacite = 25 }: { x: number; y: number; h: number; lecture: number | null; couleur: string; capacite?: number }) {
  const { zero, parMl, bas } = repereBurette(y, h, capacite);
  const niveau = lecture === null ? null : entre(zero + lecture * parMl, y + 3, bas);
  return (
    <g>
      {niveau !== null && <rect x={x - 5} y={r2(niveau)} width={10} height={r2(y + h - niveau)} fill={couleur} />}
      <path className="pl-verre" d={`M ${x - 9} ${y} L ${x - 6} ${y + 5} V ${y + h} M ${x + 9} ${y} L ${x + 6} ${y + 5} V ${y + h}`} />
      <Echelle x={x - 6} y={zero} longueur={bas - zero} de={0} a={capacite} pas={1} majeur={5} cote={-1} trait={2.6} />
      {niveau !== null && <path className="pl-menisque" d={`M ${x - 5} ${r2(niveau - 1)} Q ${x} ${r2(niveau + 1.6)} ${x + 5} ${r2(niveau - 1)}`} />}
    </g>
  );
}

// ---------- les récipients ----------

/**
 * Un erlenmeyer, centré sur `x` : un col étroit, un corps conique de largeur `l` à la base, de hauteur `h`.
 * `niveau` : de 0 (vide) à 1 (plein jusqu'au bas du col). `children` se dessine dans le liquide (un barreau aimanté).
 */
export function Erlenmeyer({ x, y, l, h, niveau, couleur, children }: { x: number; y: number; l: number; h: number; niveau: number; couleur: string; children?: ReactNode }) {
  const id = useId();
  const col = l * 0.17;
  const epaule = y + h * 0.3;
  const contour = `M ${r2(x - col)} ${y} V ${r2(epaule)} L ${r2(x - l / 2)} ${r2(y + h - 5)} Q ${r2(x - l / 2)} ${y + h} ${r2(x - l / 2 + 6)} ${y + h} H ${r2(x + l / 2 - 6)} Q ${r2(x + l / 2)} ${y + h} ${r2(x + l / 2)} ${r2(y + h - 5)} L ${r2(x + col)} ${r2(epaule)} V ${y}`;
  const surface = r2(y + h - entre(niveau, 0, 1) * (h * 0.7));
  return (
    <g>
      <defs><clipPath id={id}><path d={`${contour} Z`} /></clipPath></defs>
      <rect clipPath={`url(#${id})`} x={r2(x - l / 2 - 1)} y={surface} width={l + 2} height={r2(y + h - surface + 1)} fill={couleur} />
      {children}
      <path className="pl-verre" d={contour} />
      <path className="pl-verre" d={`M ${r2(x - col - 3)} ${y} H ${r2(x - col)} M ${r2(x + col)} ${y} H ${r2(x + col + 3)}`} />
    </g>
  );
}

/** Un flacon de réactif, centré sur `x` : un corps de largeur `l`, un col, un bouchon, une étiquette de deux lignes au plus. */
export function Flacon({ x, y, l, h, couleur, etiquette, sous }: { x: number; y: number; l: number; h: number; couleur: string; etiquette: string; sous?: string }) {
  const epaule = y + h * 0.26;
  return (
    <g>
      <path d={`M ${r2(x - l / 2 + 1)} ${r2(epaule + 6)} V ${r2(y + h - 2)} H ${r2(x + l / 2 - 1)} V ${r2(epaule + 6)} Z`} fill={couleur} />
      <path className="pl-verre" d={`M ${x - 5} ${y + 5} V ${r2(epaule - 4)} Q ${r2(x - l / 2)} ${r2(epaule)} ${r2(x - l / 2)} ${r2(epaule + 8)} V ${r2(y + h - 4)} Q ${r2(x - l / 2)} ${y + h} ${r2(x - l / 2 + 4)} ${y + h} H ${r2(x + l / 2 - 4)} Q ${r2(x + l / 2)} ${y + h} ${r2(x + l / 2)} ${r2(y + h - 4)} V ${r2(epaule + 8)} Q ${r2(x + l / 2)} ${r2(epaule)} ${x + 5} ${r2(epaule - 4)} V ${y + 5}`} />
      <rect x={x - 7} y={y} width={14} height={6} rx={2} fill="var(--cuivre)" />
      <rect className="pl-etiquette" x={r2(x - l / 2 + 3)} y={r2(y + h * 0.48)} width={l - 6} height={sous ? 22 : 13} rx={2} />
      <text className="pl-etiquette-texte" x={x} y={r2(y + h * 0.48 + 9.5)} textAnchor="middle">{etiquette}</text>
      {sous && <text className="pl-etiquette-texte" x={x} y={r2(y + h * 0.48 + 18.5)} textAnchor="middle">{sous}</text>}
    </g>
  );
}

/**
 * Une éprouvette graduée, centrée sur `x`, de capacité `capacite` (en mL). `volume` : ce qu'elle contient.
 * Ses graduations montent : 0 en bas.
 */
export function Eprouvette({ x, y, l, h, volume, capacite, couleur, pas = 1, majeur = 5 }: { x: number; y: number; l: number; h: number; volume: number; capacite: number; couleur: string; pas?: number; majeur?: number }) {
  const bas = y + h - 8;
  const haut = y + 10;
  const surface = r2(bas - (entre(volume, 0, capacite * 1.05) / capacite) * (bas - haut));
  return (
    <g>
      {volume > 0 && <rect x={r2(x - l / 2 + 1)} y={surface} width={l - 2} height={r2(bas - surface)} fill={couleur} />}
      <path className="pl-verre" d={`M ${r2(x - l / 2 - 3)} ${y} H ${r2(x - l / 2)} V ${bas} H ${r2(x + l / 2)} V ${y} H ${r2(x + l / 2 + 3)} M ${r2(x - l / 2 - 6)} ${y + h} H ${r2(x + l / 2 + 6)} M ${x} ${bas} V ${y + h}`} />
      <Echelle x={r2(x + l / 2)} y={bas} longueur={haut - bas} de={0} a={capacite} pas={pas} majeur={majeur} cote={-1} trait={2.4} />
    </g>
  );
}

/**
 * Une pipette jaugée, debout, centrée sur `x` : une tige, un renflement, une pointe, un trait de jauge sur la tige.
 * `remplissage` : 0 vide ; 1, le liquide est au trait de jauge ; jusqu'à 1,2 au-dessus du trait.
 */
export function PipetteJaugee({ x, y, h, remplissage, couleur }: { x: number; y: number; h: number; remplissage: number; couleur: string }) {
  const id = useId();
  const trait = y + h * 0.2;
  const contour = `M ${x - 2.2} ${y} V ${r2(y + h * 0.36)} Q ${x - 7} ${r2(y + h * 0.42)} ${x - 7} ${r2(y + h * 0.52)} Q ${x - 7} ${r2(y + h * 0.62)} ${x - 2.2} ${r2(y + h * 0.68)} V ${r2(y + h - 8)} L ${x - 0.8} ${y + h} H ${x + 0.8} L ${x + 2.2} ${r2(y + h - 8)} V ${r2(y + h * 0.68)} Q ${x + 7} ${r2(y + h * 0.62)} ${x + 7} ${r2(y + h * 0.52)} Q ${x + 7} ${r2(y + h * 0.42)} ${x + 2.2} ${r2(y + h * 0.36)} V ${y}`;
  // le liquide monte de la pointe jusqu'au trait pour un remplissage de 1
  const surface = r2(y + h - entre(remplissage, 0, 1.2) * (y + h - trait));
  return (
    <g>
      <defs><clipPath id={id}><path d={`${contour} Z`} /></clipPath></defs>
      {remplissage > 0 && <rect clipPath={`url(#${id})`} x={x - 8} y={surface} width={16} height={r2(y + h - surface)} fill={couleur} />}
      <path className="pl-verre" d={contour} />
      <line className="pl-repere" x1={x - 5} x2={x + 5} y1={r2(trait)} y2={r2(trait)} />
    </g>
  );
}

/** Une pissette d'eau distillée, centrée sur `x` : un flacon souple et son bec recourbé vers la gauche. */
export function Pissette({ x, y, l, h }: { x: number; y: number; l: number; h: number }) {
  return (
    <g>
      <rect x={r2(x - l / 2 + 1)} y={r2(y + h * 0.5)} width={l - 2} height={r2(h * 0.5 - 2)} fill="rgba(190, 215, 240, 0.22)" />
      <path className="pl-verre" d={`M ${x - 4} ${r2(y + h * 0.2)} Q ${r2(x - l / 2)} ${r2(y + h * 0.3)} ${r2(x - l / 2)} ${r2(y + h * 0.42)} V ${r2(y + h - 4)} Q ${r2(x - l / 2)} ${y + h} ${r2(x - l / 2 + 4)} ${y + h} H ${r2(x + l / 2 - 4)} Q ${r2(x + l / 2)} ${y + h} ${r2(x + l / 2)} ${r2(y + h - 4)} V ${r2(y + h * 0.42)} Q ${r2(x + l / 2)} ${r2(y + h * 0.3)} ${x + 4} ${r2(y + h * 0.2)} Z`} />
      <path className="pl-verre" d={`M ${x} ${r2(y + h * 0.2)} V ${y + 4} Q ${x} ${y} ${x - 5} ${y} L ${r2(x - l / 2 - 8)} ${y + 5}`} />
      <text className="pl-etiquette-texte pl-clair" x={x} y={r2(y + h * 0.72)} textAnchor="middle">eau</text>
    </g>
  );
}

/** Un flacon compte-gouttes, centré sur `x` : un petit flacon et sa pipette à poire. */
export function CompteGouttes({ x, y, l, h, couleur, etiquette }: { x: number; y: number; l: number; h: number; couleur: string; etiquette: string }) {
  return (
    <g>
      <rect x={r2(x - l / 2 + 1)} y={r2(y + h * 0.55)} width={l - 2} height={r2(h * 0.45 - 2)} fill={couleur} />
      <path className="pl-verre" d={`M ${x - 4} ${r2(y + h * 0.34)} Q ${r2(x - l / 2)} ${r2(y + h * 0.4)} ${r2(x - l / 2)} ${r2(y + h * 0.5)} V ${r2(y + h - 3)} Q ${r2(x - l / 2)} ${y + h} ${r2(x - l / 2 + 3)} ${y + h} H ${r2(x + l / 2 - 3)} Q ${r2(x + l / 2)} ${y + h} ${r2(x + l / 2)} ${r2(y + h - 3)} V ${r2(y + h * 0.5)} Q ${r2(x + l / 2)} ${r2(y + h * 0.4)} ${x + 4} ${r2(y + h * 0.34)} Z`} />
      <ellipse cx={x} cy={r2(y + h * 0.13)} rx={5} ry={r2(h * 0.13)} fill="var(--cuivre)" />
      <rect x={x - 3.5} y={r2(y + h * 0.24)} width={7} height={r2(h * 0.1)} fill="var(--discret)" />
      <text className="pl-etiquette-texte pl-clair" x={x} y={r2(y + h * 0.84)} textAnchor="middle">{etiquette}</text>
    </g>
  );
}

// ---------- ce qui coule ----------

/** Un filet de liquide qui coule, de `y1` à `y2`, tant que `coule` est vrai. */
export function Filet({ x, y1, y2, couleur, coule, largeur = 2 }: { x: number; y1: number; y2: number; couleur: string; coule: boolean; largeur?: number }) {
  if (!coule) return null;
  return <line className="pl-filet" x1={x} x2={x} y1={y1} y2={y2} stroke={couleur} strokeWidth={largeur} strokeLinecap="round" aria-hidden="true" />;
}

/**
 * Une goutte qui tombe de `y1` à `y2`. `cle` change à chaque goutte : la goutte repart d'en haut.
 * Avec « moins d'animations », la goutte ne se dessine pas : le niveau et le message disent ce qui s'est passé.
 */
export function Goutte({ x, y1, y2, couleur, cle }: { x: number; y1: number; y2: number; couleur: string; cle: number | string }) {
  return <circle key={cle} className="pl-goutte" cx={x} cy={y1} r={2.4} fill={couleur} style={{ "--pl-chute": `${r2(y2 - y1)}px` } as CSSProperties} aria-hidden="true" />;
}
