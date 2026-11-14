"use client";

// Le kit des paillasses : ce qui se lit. Une échelle graduée, une loupe posée sur un niveau de liquide ou sur un repère,
// l'afficheur d'un appareil. L'élève lit lui-même la valeur, comme sur le vrai matériel : rien ne l'écrit à sa place.

import { useId, type ReactNode } from "react";
import { nombre } from "@/lib/commun/format";

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Les valeurs des graduations entre deux bornes, au pas donné, sans erreur d'arrondi. */
export function graduations(de: number, a: number, pas: number): number[] {
  const n = Math.round((a - de) / pas);
  return Array.from({ length: Math.max(0, n + 1) }, (_, i) => Number((de + i * pas).toFixed(6)));
}

export interface PropsEchelle {
  /** où se trouve la valeur `de` dans le dessin */
  x: number;
  y: number;
  /** la longueur de l'échelle dans le dessin, de la valeur `de` à la valeur `a` */
  longueur: number;
  de: number;
  a: number;
  /** l'écart entre deux petites graduations */
  pas: number;
  /** l'écart entre deux graduations chiffrées */
  majeur: number;
  /** vrai pour une échelle qui descend (burette, règle debout) ; faux pour une échelle qui va vers la droite */
  debout?: boolean;
  /** de quel côté partent les traits : 1 vers la droite (ou le bas), −1 vers la gauche (ou le haut) */
  cote?: 1 | -1;
  /** la longueur d'un petit trait */
  trait?: number;
  /** ce qui s'écrit à côté d'une graduation chiffrée */
  ecrit?: (valeur: number) => string;
}

/**
 * Une échelle graduée : des petits traits, des traits moyens à mi-chemin, des grands traits chiffrés.
 * Elle sert aux burettes, aux éprouvettes, aux règles, aux bancs, aux thermomètres.
 */
export function Echelle({ x, y, longueur, de, a, pas, majeur, debout = true, cote = 1, trait = 4, ecrit = (v) => nombre(v, 0) }: PropsEchelle) {
  const parUnite = longueur / (a - de);
  return (
    <g className="pl-echelle" aria-hidden="true">
      {graduations(de, a, pas).map((v) => {
        const rang = Math.round((v - de) / pas);
        const parMajeur = Math.round(majeur / pas);
        const grand = rang % parMajeur === 0;
        const moyen = !grand && parMajeur % 2 === 0 && rang % (parMajeur / 2) === 0;
        const taille = (grand ? 2.2 : moyen ? 1.5 : 1) * trait * cote;
        const d = r2((v - de) * parUnite);
        return debout ? (
          <g key={v}>
            <line x1={x} x2={r2(x + taille)} y1={r2(y + d)} y2={r2(y + d)} strokeWidth={grand ? 1 : 0.6} />
            {grand && <text x={r2(x + taille + 3 * cote)} y={r2(y + d + 3)} textAnchor={cote === 1 ? "start" : "end"}>{ecrit(v)}</text>}
          </g>
        ) : (
          <g key={v}>
            <line x1={r2(x + d)} x2={r2(x + d)} y1={y} y2={r2(y + taille)} strokeWidth={grand ? 1 : 0.6} />
            {grand && <text x={r2(x + d)} y={r2(y + taille + (cote === 1 ? 9 : -3))} textAnchor="middle">{ecrit(v)}</text>}
          </g>
        );
      })}
    </g>
  );
}

/**
 * Une loupe ronde : ce qu'on y dessine est découpé par son bord. `x`, `y`, `r` : son centre et son rayon.
 * `children` se dessine dans le repère de la scène ; à l'auteur d'y agrandir ce qu'il veut montrer.
 */
export function Loupe({ x, y, r, nom, children }: { x: number; y: number; r: number; nom: string; children: ReactNode }) {
  const id = useId();
  return (
    <g className="pl-loupe" role="img" aria-label={nom}>
      <defs><clipPath id={id}><circle cx={x} cy={y} r={r} /></clipPath></defs>
      <circle className="pl-loupe-fond" cx={x} cy={y} r={r} />
      <g clipPath={`url(#${id})`}>{children}</g>
      <circle className="pl-loupe-bord" cx={x} cy={y} r={r} />
    </g>
  );
}

export interface PropsLoupeNiveau {
  x: number;
  y: number;
  r: number;
  /** la valeur où se trouve le bas du ménisque, dans l'unité de l'échelle */
  valeur: number;
  pas: number;
  majeur: number;
  /** la hauteur d'une unité de l'échelle dans la loupe : 60 montre un peu plus d'une unité au-dessus et au-dessous */
  parUnite: number;
  /** vrai si l'échelle monte (éprouvette, thermomètre) ; faux si elle descend (burette) */
  monte?: boolean;
  couleur: string;
  /** faux s'il n'y a pas de liquide à cet endroit : la loupe montre l'échelle seule */
  liquide?: boolean;
  /** un trait de repère à cette valeur (le trait de jauge d'une fiole, d'une pipette) */
  repere?: number;
  /** les bornes de l'échelle : au-delà, le tube n'est pas gradué */
  de?: number;
  a?: number;
  /** ce que la loupe montre, pour un lecteur d'écran : « Burette, près du niveau du liquide » */
  nom: string;
  ecrit?: (valeur: number) => string;
}

/**
 * Une loupe posée sur le niveau d'un liquide dans un tube gradué. Le bas du ménisque est au centre de la loupe ;
 * l'échelle défile avec le niveau. L'élève lit la graduation en face du bas du ménisque.
 */
export function LoupeNiveau({ x, y, r, valeur, pas, majeur, parUnite, monte = false, couleur, liquide = true, repere, de = -Infinity, a = Infinity, nom, ecrit = (v) => nombre(v, 0) }: PropsLoupeNiveau) {
  const sens = monte ? -1 : 1;
  const visibles = r / parUnite + pas;
  const premier = Math.ceil((valeur - visibles) / pas) * pas;
  const parMajeur = Math.round(majeur / pas);
  const demi = r * 0.42; // la demi-largeur du tube dans la loupe
  return (
    <Loupe x={x} y={y} r={r} nom={nom}>
      {liquide && <path d={`M ${r2(x - demi)} ${r2(y - 5)} Q ${x} ${r2(y + 5)} ${r2(x + demi)} ${r2(y - 5)} V ${y + r} H ${r2(x - demi)} Z`} fill={couleur} />}
      <line x1={r2(x - demi)} x2={r2(x - demi)} y1={y - r} y2={y + r} className="pl-verre" />
      <line x1={r2(x + demi)} x2={r2(x + demi)} y1={y - r} y2={y + r} className="pl-verre" />
      <g className="pl-echelle">
        {graduations(premier, valeur + visibles, pas).filter((v) => v >= de - 1e-9 && v <= a + 1e-9).map((v) => {
          const rang = Math.round(v / pas);
          const grand = rang % parMajeur === 0;
          const moyen = !grand && parMajeur % 2 === 0 && rang % (parMajeur / 2) === 0;
          const yy = r2(y + (v - valeur) * parUnite * sens);
          const longueur = demi * (grand ? 1.15 : moyen ? 0.85 : 0.55);
          return (
            <g key={v}>
              <line x1={r2(x - demi)} x2={r2(x - demi + longueur)} y1={yy} y2={yy} strokeWidth={grand ? 1.3 : 0.8} />
              {grand && <text x={r2(x + demi + 4)} y={yy + 3.5} className="pl-loupe-chiffre">{ecrit(v)}</text>}
            </g>
          );
        })}
      </g>
      {repere !== undefined && <line x1={r2(x - demi - 3)} x2={r2(x + demi + 3)} y1={r2(y + (repere - valeur) * parUnite * sens)} y2={r2(y + (repere - valeur) * parUnite * sens)} className="pl-repere" />}
      {liquide && <path d={`M ${r2(x - demi)} ${r2(y - 5)} Q ${x} ${r2(y + 5)} ${r2(x + demi)} ${r2(y - 5)}`} className="pl-menisque" />}
    </Loupe>
  );
}

/**
 * L'afficheur d'un appareil : un écran sombre, une valeur en chiffres, une unité. `x`, `y` : son coin en haut à gauche.
 * `eteint` montre un écran sans valeur.
 */
export function Afficheur({ x, y, l, h = 30, valeur, unite, nom, eteint = false }: { x: number; y: number; l: number; h?: number; valeur: string; unite?: string; nom: string; eteint?: boolean }) {
  return (
    <g className="pl-afficheur" role="img" aria-label={eteint ? `${nom} : éteint` : `${nom} : ${valeur}${unite ? ` ${unite}` : ""}`}>
      <rect x={x} y={y} width={l} height={h} rx={5} />
      {!eteint && <text x={r2(x + l - (unite ? 8 + unite.length * 6 : 8))} y={r2(y + h / 2 + 6)} textAnchor="end" className="pl-afficheur-valeur">{valeur}</text>}
      {!eteint && unite && <text x={r2(x + l - 6)} y={r2(y + h / 2 + 6)} textAnchor="end" className="pl-afficheur-unite">{unite}</text>}
    </g>
  );
}
