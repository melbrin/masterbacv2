"use client";

// Une loupe sur une échelle graduée dont le repère reste au centre : l'index d'un dynamomètre, le haut de la colonne
// d'un thermomètre. Elle complète la LoupeNiveau du kit, faite pour le ménisque d'un liquide et pour des chiffres
// courts : ici le tube est décalé vers la gauche, pour laisser aux chiffres la place de leurs décimales, et il y a
// toujours plusieurs chiffres en vue, pour que le sens de l'échelle se lise sans hésiter.
// Elle sert aux paillasses Archimède (dynamomètre) et Calorimètre (thermomètre).

import { nombre } from "@/lib/commun/format";
import { Loupe, graduations } from "../kit";

const r2 = (n: number) => Math.round(n * 100) / 100;

export interface PropsLoupeGraduee {
  x: number;
  y: number;
  r: number;
  /** la valeur en face du repère, au centre de la loupe */
  valeur: number;
  /** l'écart entre deux graduations */
  pas: number;
  /** le nombre de graduations entre deux chiffres : 5 écrit un chiffre toutes les cinq graduations */
  chiffre: number;
  /** la hauteur d'une unité de l'échelle dans la loupe */
  parUnite: number;
  /** vrai si l'échelle monte (thermomètre) ; faux si elle descend (dynamomètre) */
  monte?: boolean;
  /** les bornes de l'échelle : au-delà, l'appareil n'est pas gradué */
  de: number;
  a: number;
  /** le nombre de décimales des chiffres */
  decimales: number;
  /** la couleur de la colonne de liquide, sous le repère ; sans elle, un index en travers du tube */
  colonne?: string;
  /** ce que la loupe montre, pour un lecteur d'écran */
  nom: string;
}

/** Une loupe posée sur le repère d'un appareil gradué : l'échelle défile derrière lui. L'élève lit la graduation en face. */
export function LoupeGraduee({ x, y, r, valeur, pas, chiffre, parUnite, monte = false, de, a, decimales, colonne, nom }: PropsLoupeGraduee) {
  const sens = monte ? -1 : 1;
  const visibles = r / parUnite + pas;
  const gauche = x - 30, droite = x - 6;
  const premier = Math.max(de, Math.ceil((valeur - visibles) / pas) * pas);
  return (
    <Loupe x={x} y={y} r={r} nom={nom}>
      {colonne && <rect x={gauche} y={y} width={droite - gauche} height={r} fill={colonne} />}
      <line className="pl-verre" x1={gauche} x2={gauche} y1={y - r} y2={y + r} />
      <line className="pl-verre" x1={droite} x2={droite} y1={y - r} y2={y + r} />
      <g className="pl-echelle">
        {graduations(premier, Math.min(a, valeur + visibles), pas).map((v) => {
          const rang = Math.round(v / pas);
          const yy = r2(y + (v - valeur) * parUnite * sens);
          return (
            <g key={rang}>
              <line x1={gauche} x2={gauche + (rang % (2 * chiffre) === 0 ? 18 : rang % chiffre === 0 ? 13 : 8)} y1={yy} y2={yy} strokeWidth={rang % chiffre === 0 ? 1.3 : 0.8} />
              {rang % chiffre === 0 && <text x={droite + 5} y={yy + 3.5} className="pl-loupe-chiffre">{nombre(v, decimales)}</text>}
            </g>
          );
        })}
      </g>
      {colonne
        ? <line x1={gauche} x2={droite} y1={y} y2={y} stroke="var(--encre)" strokeWidth={1.2} />
        : <line className="pl-repere" x1={gauche - 4} x2={droite + 3} y1={y} y2={y} strokeWidth={2} />}
    </Loupe>
  );
}
