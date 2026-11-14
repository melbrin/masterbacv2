"use client";

// Les pièces dessinées des paillasses « circuit » et « microcontroleur » : les composants de la boîte, le boîtier d'un
// appareil, et le graphe où la carte d'acquisition trace sa courbe. Tout se dessine au trait, dans la charte de l'établi.

import type { ReactNode } from "react";
import { nombre, nombreRelatif } from "@/lib/commun/format";
import { POINTS, finDe, ohms, pasDe, tensionMesuree, type Acquisition, type Composant } from "@/lib/commun/tp/paillasses/circuit";

const r2 = (n: number) => Math.round(n * 100) / 100;

// ---------- les composants ----------

export const majuscule = (texte: string): string => texte.charAt(0).toUpperCase() + texte.slice(1);

/**
 * Un composant, dessiné autour de (0, 0) : ses deux pattes sortent à 28 unités de part et d'autre. Un conducteur ohmique
 * porte sa valeur, que l'élève lit ; le condensateur a perdu son étiquette ; l'interrupteur montre s'il est fermé.
 */
export function DessinComposant({ c, ferme = false }: { c: Composant; ferme?: boolean }) {
  if (c.genre === "resistance") {
    return (
      <g>
        <path className="pl-circuit-patte" d="M -28 0 H -18 M 18 0 H 28" />
        <rect className="pl-circuit-corps" x={-18} y={-7} width={36} height={14} rx={4} />
        <path className="pl-circuit-anneaux" d="M -9 -6.3 V 6.3 M -2 -6.3 V 6.3 M 5 -6.3 V 6.3" />
        <text className="pl-circuit-valeur" y={21} textAnchor="middle">{ohms(c.valeur)}</text>
      </g>
    );
  }
  if (c.genre === "condensateur") {
    return (
      <g>
        <path className="pl-circuit-patte" d="M -28 0 H -5 M 5 0 H 28" />
        <path className="pl-circuit-armature" d="M -5 -10 V 10 M 5 -10 V 10" />
        <text y={21} textAnchor="middle">condensateur</text>
      </g>
    );
  }
  return (
    <g>
      <path className="pl-circuit-patte" d="M -28 0 H -14 M 14 0 H 28" />
      <line className="pl-circuit-levier" x1={-14} y1={0} x2={ferme ? 14 : 10} y2={ferme ? 0 : -13} />
      <circle cx={-14} r={3} fill="var(--encre)" />
      <circle cx={14} r={3} fill="var(--encre)" />
      <text y={21} textAnchor="middle">interrupteur</text>
    </g>
  );
}

/** Le boîtier d'un appareil : un cadre, son nom, et les tiges qui portent ses bornes au-dessus de lui. */
export function Boitier({ x, y, l, h, nom, tiges, hauteur, children }: { x: number; y: number; l: number; h: number; nom: string; tiges: { x: number; texte: string }[]; hauteur: number; children?: ReactNode }) {
  return (
    <g>
      <rect className="pl-circuit-boitier" x={x} y={y} width={l} height={h} rx={8} />
      {tiges.map((t) => (
        <g key={t.x}>
          <path className="pl-circuit-tige" d={`M ${t.x} ${y} V ${hauteur + 6}`} />
          <text x={t.x} y={y + 14} textAnchor="middle" className="pl-fort">{t.texte}</text>
        </g>
      ))}
      <text x={x + 10} y={y + h - 8}>{nom}</text>
      {children}
    </g>
  );
}

// ---------- le graphe de la carte ----------

export interface Cadre { x: number; y: number; l: number; h: number }

/** Les points d'une acquisition, un par pas d'échantillonnage, jusqu'à l'instant donné. */
export function pointsDe(acq: Acquisition, jusque: number): { t: number; u: number }[] {
  const pas = pasDe(acq);
  const dernier = Math.floor(Math.min(jusque, finDe(acq)) / pas + 1e-9);
  return Array.from({ length: Math.max(0, dernier) + 1 }, (_, k) => ({ t: k * pas, u: tensionMesuree(acq, k * pas) }));
}

/** L'échelle des tensions d'une courbe : de quoi la montrer en entier, zéro compris, avec des graduations rondes. */
export function echelleDe(acq: Acquisition | null): { bas: number; haut: number; pas: number } {
  if (!acq) return { bas: 0, haut: 6, pas: 1 };
  let min = 0, max = 0;
  for (let k = 0; k <= POINTS; k++) {
    const u = tensionMesuree(acq, (k * acq.duree) / POINTS);
    min = Math.min(min, u);
    max = Math.max(max, u);
  }
  // un peu de marge : le palier ne colle pas au bord de l'écran
  const marge = 1.04;
  const pas = [0.2, 0.5, 1, 2, 5].find((p) => ((max - min) * marge) / p <= 7) ?? 5;
  const bas = min < -0.05 ? -Math.ceil((-min * marge) / pas) * pas : 0;
  const haut = max > 0.05 ? Math.ceil((max * marge) / pas) * pas : 0;
  return { bas: r2(bas), haut: r2(haut > bas ? haut : bas + pas), pas };
}

/** De quoi placer un point de la courbe dans un cadre : l'instant en abscisse, la tension en ordonnée. */
export function reperage(cadre: Cadre, acq: Acquisition | null, duree: number) {
  const echelle = echelleDe(acq);
  return {
    ...echelle,
    X: (t: number) => r2(cadre.x + (t / duree) * cadre.l),
    Y: (u: number) => r2(cadre.y + cadre.h - ((u - echelle.bas) / (echelle.haut - echelle.bas)) * cadre.h),
  };
}

const graduations = (de: number, a: number, pas: number): number[] => Array.from({ length: Math.round((a - de) / pas) + 1 }, (_, i) => r2(de + i * pas));
const ecritTemps = (t: number) => nombre(t, Number.isInteger(r2(t)) ? 0 : Number.isInteger(r2(t * 10)) ? 1 : 2);
const ecritTension = (u: number, pas: number) => nombreRelatif(u, pas < 1 ? 1 : 0);

/**
 * Le graphe de la carte : sa grille, ses axes chiffrés, et la courbe tracée jusqu'à l'instant `jusque`.
 * `detail` chiffre toutes les graduations (la courbe ouverte en grand) ; sinon seulement quelques-unes (l'écran de la paillasse).
 */
export function Graphe({ cadre, acq, duree, jusque, detail, children }: { cadre: Cadre; acq: Acquisition | null; duree: number; jusque: number; detail: boolean; children?: ReactNode }) {
  const { bas, haut, pas, X, Y } = reperage(cadre, acq, duree);
  const tensions = graduations(bas, haut, pas);
  const instants = graduations(0, duree, duree / 10);
  const points = acq ? pointsDe(acq, jusque) : [];
  const dernier = points[points.length - 1];
  return (
    <g>
      <g className="pl-circuit-grille" aria-hidden="true">
        {tensions.map((u) => <line key={`u${u}`} className={u === 0 ? "pl-circuit-axe" : undefined} x1={cadre.x} x2={cadre.x + cadre.l} y1={Y(u)} y2={Y(u)} />)}
        {instants.map((t, i) => <line key={`t${t}`} className={i === 0 ? "pl-circuit-axe" : undefined} x1={X(t)} x2={X(t)} y1={cadre.y} y2={cadre.y + cadre.h} />)}
      </g>
      {tensions.map((u) => (detail || tensions.length <= 4 || Math.round(u / pas) % 2 === 0) && <text key={u} x={cadre.x - 5} y={Y(u) + 3} textAnchor="end">{ecritTension(u, pas)}</text>)}
      {instants.map((t, i) => (detail ? i % 2 === 0 : i % 5 === 0) && <text key={t} x={X(t)} y={cadre.y + cadre.h + 12} textAnchor={i === 0 ? "start" : i === 10 ? "end" : "middle"}>{ecritTemps(t)}</text>)}
      {points.length > 1 && <polyline className="pl-circuit-trace" points={points.map((p) => `${X(p.t)},${Y(p.u)}`).join(" ")} />}
      {dernier && jusque < duree && acq?.arret === null && <circle className="pl-circuit-pointe" cx={X(dernier.t)} cy={Y(dernier.u)} r={2.6} />}
      {children}
    </g>
  );
}
