"use client";

// Les pièces communes aux paillasses d'optique (le banc d'optique, la diffraction) : un cavalier qui glisse le long
// d'un rail gradué, et la loupe posée sur son repère. L'élève glisse le cavalier à la main, puis finit au millimètre
// en glissant le doigt dans la loupe ; il y lit lui-même la graduation en face du repère.

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Loupe, graduations, useGlisse } from "../kit";
import "./optiqueRail.css";

const mm = (v: number) => Math.round(v * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
/** Le pas d'une touche du clavier, en centimètres : les flèches font un millimètre, « page précédente » et « page suivante » un centimètre. */
function pasDuClavier(e: KeyboardEvent<SVGGElement>): number {
  switch (e.key) {
    case "ArrowRight": case "ArrowUp": return 0.1;
    case "ArrowLeft": case "ArrowDown": return -0.1;
    case "PageUp": return 1;
    case "PageDown": return -1;
    default: return 0;
  }
}

export interface PropsCavalier {
  /** la graduation en face du repère du cavalier, en centimètres */
  valeur: number;
  /** la place de la graduation 0 dans le dessin, et la longueur d'un centimètre */
  origine: number;
  parCm: number;
  /** le haut et la hauteur de la zone de toucher, dans le dessin */
  y: number;
  h: number;
  /** ce que porte le cavalier : « Support de la lentille » */
  nom: string;
  /** vrai si la loupe est posée sur ce cavalier */
  choisi: boolean;
  /** demande une nouvelle position, en centimètres ; c'est la paillasse qui la borne */
  deplace: (x: number) => void;
  /** le cavalier vient d'être touché : la loupe se pose sur lui */
  choisit: () => void;
  /** le doigt se pose sur le cavalier (vrai), puis se lève (faux) : le guide ne change pas de consigne pendant le geste */
  tenu?: (tenu: boolean) => void;
  /** son dessin, autour de son repère : (0, 0) est la graduation, sur l'axe du rail */
  children: ReactNode;
}

/**
 * Un cavalier : une pièce qui glisse le long du rail. On pose le doigt dessus et on glisse. Au clavier : les flèches
 * pour un millimètre, « page précédente » et « page suivante » pour un centimètre. Un lecteur d'écran n'entend que la
 * position au centimètre près : la lecture au millimètre se fait à la loupe.
 */
export function Cavalier({ valeur, origine, parCm, y, h, nom, choisi, deplace, choisit, tenu, children }: PropsCavalier) {
  const prise = useRef(0);
  const x = r2(origine + valeur * parCm);
  const reglages = useGlisse({
    depart: (p) => { prise.current = p.x - x; choisit(); tenu?.(true); },
    bouge: (p) => deplace(mm((p.x - prise.current - origine) / parCm)),
    fin: () => tenu?.(false),
  });
  const clavier = (e: KeyboardEvent<SVGGElement>) => {
    const pas = pasDuClavier(e);
    if (!pas) return;
    e.preventDefault();
    deplace(mm(valeur + pas));
  };
  return (
    <g className={`pl-optique-cavalier${choisi ? " est-choisi" : ""}`} transform={`translate(${x} 0)`} role="slider" tabIndex={0} aria-label={nom} aria-orientation="horizontal"
      aria-valuemin={0} aria-valuemax={300} aria-valuenow={Math.round(valeur)} aria-valuetext={`vers ${Math.round(valeur)} cm sur le rail`} onKeyDown={clavier} onFocus={choisit} {...reglages}>
      <rect x={-22} y={y} width={44} height={h} fill="transparent" />
      {children}
    </g>
  );
}

export interface PropsLoupeRail {
  /** le centre et le rayon de la loupe dans le dessin */
  x: number;
  y: number;
  r: number;
  /** la graduation en face du repère, en centimètres */
  valeur: number;
  /** les bornes de la graduation du rail */
  de: number;
  a: number;
  /** ce que la loupe montre : « Loupe sur le repère de l'écran » */
  nom: string;
  /** demande une nouvelle position, en centimètres : glisser le doigt dans la loupe déplace la pièce au millimètre */
  deplace: (x: number) => void;
  /** le doigt se pose dans la loupe (vrai), puis se lève (faux) */
  tenu?: (tenu: boolean) => void;
  /** la largeur d'un millimètre dans la loupe */
  parMm?: number;
}

/**
 * La loupe posée sur le repère d'une pièce du rail : les millimètres, les centimètres chiffrés, et le repère.
 * Glisser le doigt dans la loupe déplace la pièce avec la finesse de la loupe : le repère suit le doigt, la graduation
 * ne bouge pas. Hors de ce geste, la loupe reste centrée sur le repère.
 */
export function LoupeRail({ x, y, r, valeur, de, a, nom, deplace, tenu, parMm = 4.6 }: PropsLoupeRail) {
  /** pendant un réglage fin : la graduation qui était au centre de la loupe quand le doigt s'est posé */
  const [ancre, setAncre] = useState<number | null>(null);
  const prise = useRef({ x: 0, valeur: 0 });
  const parCm = parMm * 10;
  // le repère ne sort jamais de la loupe : au bord, la graduation défile
  const marge = (r - 16) / parCm;
  const centre = ancre === null ? valeur : Math.max(valeur - marge, Math.min(valeur + marge, ancre));
  const X = (v: number) => r2(x + (v - centre) * parCm);
  const visibles = r / parCm + 0.1;
  const traits = graduations(Math.max(de, Math.ceil((centre - visibles) * 10) / 10), Math.min(a, Math.floor((centre + visibles) * 10) / 10), 0.1);
  const reglages = useGlisse({
    depart: (p) => { prise.current = { x: p.x, valeur }; setAncre(centre); tenu?.(true); },
    bouge: (p) => deplace(mm(prise.current.valeur + (p.x - prise.current.x) / parCm)),
    fin: () => { setAncre(null); tenu?.(false); },
  });
  const clavier = (e: KeyboardEvent<SVGGElement>) => {
    const pas = pasDuClavier(e);
    if (!pas) return;
    e.preventDefault();
    deplace(mm(valeur + pas));
  };
  const haut = y - 6; // le bord gradué du rail, dans la loupe
  return (
    <g className="pl-optique-loupe" role="slider" tabIndex={0} aria-label={`${nom} : réglage fin`} aria-orientation="horizontal" aria-valuemin={de} aria-valuemax={a}
      aria-valuenow={Math.round(valeur)} aria-valuetext={`vers ${Math.round(valeur)} cm sur le rail`} onKeyDown={clavier} {...reglages}>
      <Loupe x={x} y={y} r={r} nom={nom}>
        <rect x={x - r} y={haut} width={2 * r} height={r + 6} className="pl-optique-rail" />
        <g className="pl-echelle">
          {traits.map((v) => {
            const rang = Math.round(v * 10);
            const hauteur = rang % 10 === 0 ? 20 : rang % 5 === 0 ? 14 : 9;
            return (
              <g key={rang}>
                <line x1={X(v)} x2={X(v)} y1={haut} y2={haut + hauteur} strokeWidth={rang % 10 === 0 ? 1.4 : 0.9} />
                {rang % 10 === 0 && <text x={X(v)} y={haut + 31} textAnchor="middle" className="pl-loupe-chiffre">{rang / 10}</text>}
              </g>
            );
          })}
        </g>
        {/* le repère de la pièce : une pointe qui descend sur la graduation */}
        <path className="pl-optique-repere" d={`M ${X(valeur)} ${haut + 22} V ${haut - 4} M ${r2(X(valeur) - 7)} ${haut - 18} L ${X(valeur)} ${haut - 3} L ${r2(X(valeur) + 7)} ${haut - 18} Z`} />
      </Loupe>
      <circle cx={x} cy={y} r={r} fill="transparent" />
    </g>
  );
}
