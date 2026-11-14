"use client";

// Une balance de laboratoire, pour les paillasses qui pèsent (Calorimètre, Électrolyse) : un plateau, un afficheur et
// une touche « Tare ». Elle n'est pas dans le kit. L'afficheur est un écran : il montre ses chiffres, comme le vrai.

import { nombreRelatif } from "@/lib/commun/format";
import { Afficheur, Touche, type Point } from "../kit";
import "./calorimetre-balance.css";

/** La taille du boîtier, et la hauteur du plateau au-dessus de lui. Au milligramme, l'écran a un chiffre de plus : le boîtier s'élargit. */
export const BALANCE = { l: 116, h: 48, plateau: 12 };
export const largeurBalance = (decimales: number): number => BALANCE.l + (decimales >= 3 ? 16 : 0);
/** Le centre de la touche « Tare » d'une balance posée en (x, y) : le dessin et la main du guide lisent la même place. */
export const placeDeLaTare = (x: number, y: number, decimales = 1): Point => ({ x: x + largeurBalance(decimales) - 23, y: y + 24 });

/**
 * Une balance. `x`, `y` : le coin en haut à gauche de son boîtier ; le dessus du plateau est 12 unités plus haut.
 * `affiche` : la masse à l'écran, en grammes, écrite avec `decimales` chiffres après la virgule. `tare` remet l'écran à zéro.
 */
export function Balance({ x, y, affiche, decimales = 1, tare }: { x: number; y: number; affiche: number; decimales?: number; tare: () => void }) {
  const l = largeurBalance(decimales);
  return (
    <g>
      <rect className="pl-balance-pied" x={x + l / 2 - 5} y={y - BALANCE.plateau + 4} width={10} height={BALANCE.plateau - 4} />
      <rect className="pl-balance-plateau" x={x + 12} y={y - BALANCE.plateau} width={l - 24} height={5} rx={2} />
      <rect className="pl-balance-boitier" x={x} y={y} width={l} height={BALANCE.h} rx={6} />
      <Afficheur x={x + 3} y={y + 9} l={l - 49} h={30} valeur={nombreRelatif(affiche, decimales)} unite="g" nom="Balance" />
      <Touche {...placeDeLaTare(x, y, decimales)} l={44} h={44} nom="Tare : remettre la balance à zéro" texte="Tare" appuie={tare} />
    </g>
  );
}
