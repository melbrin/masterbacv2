"use client";

// Le kit des paillasses : les commandes d'un appareil. Une molette que l'on tourne du doigt, un interrupteur, une touche.
// Chacune se manœuvre aussi au clavier et dit sa valeur à un lecteur d'écran.

import type { KeyboardEvent, ReactNode } from "react";
import { useGlisse, useMaintien, type Maintien } from "./gestes";
import type { Point } from "./scene";
import { son, vibre } from "./son";

const borne = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
/** L'angle d'un point autour d'un centre, en degrés : 0 vers le haut, puis dans le sens des aiguilles d'une montre, de −180 à 180. */
export const angleAutour = (p: Point, centre: Point): number => (Math.atan2(p.x - centre.x, centre.y - p.y) * 180) / Math.PI;

export interface PropsMolette {
  /** le centre de la molette dans le dessin */
  x: number;
  y: number;
  /** le rayon de la zone de toucher : au moins 22 */
  r?: number;
  valeur: number;
  min: number;
  max: number;
  /** le pas : la valeur s'arrête sur ses multiples */
  pas: number;
  change: (valeur: number) => void;
  /** ce que règle la molette : « Robinet de la burette » */
  nom: string;
  /** la valeur dite à un lecteur d'écran : « ouvert à moitié » */
  texte?: string;
  /** les angles de la valeur la plus basse et de la plus haute, en degrés (0 vers le haut, sens des aiguilles d'une montre) */
  de?: number;
  a?: number;
  actif?: boolean;
  /** le dessin de la molette, tourné selon l'angle ; sans lui, un bouton rond avec un repère */
  dessin?: (angle: number) => ReactNode;
  /** des touches du clavier en plus des flèches : « G » pour une goutte, par exemple */
  touches?: (e: KeyboardEvent<SVGGElement>) => void;
}

/**
 * Une molette : l'élève pose le doigt dessus et tourne. Sert aux boutons d'un appareil (base de temps, tension,
 * vitesse d'agitation) et aux robinets. Au clavier : les flèches, Début et Fin.
 */
export function Molette({ x, y, r = 24, valeur, min, max, pas, change, nom, texte, de = -135, a = 135, actif = true, dessin, touches }: PropsMolette) {
  const arrondit = (v: number) => borne(Math.round(v / pas) * pas, min, max);
  const regle = (v: number) => {
    const suite = arrondit(v);
    if (Math.abs(suite - valeur) < pas / 2) return;
    son("clic");
    vibre(4);
    change(Number(suite.toFixed(6)));
  };
  const angle = de + ((valeur - min) / (max - min)) * (a - de);
  const reglages = useGlisse({
    bouge: (p) => {
      // l'angle du doigt, ramené dans la course de la molette ; au-delà d'une butée, la molette reste en butée
      let deg = angleAutour(p, { x, y });
      const milieu = (de + a) / 2;
      while (deg < milieu - 180) deg += 360;
      while (deg > milieu + 180) deg -= 360;
      regle(min + ((borne(deg, Math.min(de, a), Math.max(de, a)) - de) / (a - de)) * (max - min));
    },
  }, actif);
  const clavier = (e: KeyboardEvent<SVGGElement>) => {
    if (!actif) return;
    touches?.(e);
    const saut = e.key === "ArrowRight" || e.key === "ArrowUp" ? pas : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -pas : e.key === "PageUp" ? 5 * pas : e.key === "PageDown" ? -5 * pas : 0;
    if (saut) { e.preventDefault(); regle(valeur + saut); }
    if (e.key === "Home") { e.preventDefault(); regle(min); }
    if (e.key === "End") { e.preventDefault(); regle(max); }
  };
  return (
    <g className="pl-molette" role="slider" tabIndex={actif ? 0 : -1} aria-label={nom} aria-valuemin={min} aria-valuemax={max} aria-valuenow={valeur}
      aria-valuetext={texte} aria-disabled={!actif} onKeyDown={clavier} {...reglages}>
      <circle cx={x} cy={y} r={r} fill="transparent" />
      {dessin ? dessin(angle) : (
        <g transform={`translate(${x} ${y})`}>
          <circle r={r - 6} fill="var(--carte-2)" stroke="var(--encre)" strokeWidth={1.5} />
          <line y1={-(r - 9)} y2={-(r - 16)} stroke="var(--cuivre)" strokeWidth={2.4} strokeLinecap="round" transform={`rotate(${angle})`} />
        </g>
      )}
    </g>
  );
}

/** Un interrupteur à deux positions, que l'on touche pour le basculer. `x`, `y` : son centre. */
export function Interrupteur({ x, y, ferme, bascule, nom, actif = true }: { x: number; y: number; ferme: boolean; bascule: () => void; nom: string; actif?: boolean }) {
  const agit = () => { if (!actif) return; son("clic"); vibre(6); bascule(); };
  return (
    <g className="pl-touche" role="switch" tabIndex={actif ? 0 : -1} aria-checked={ferme} aria-label={nom} aria-disabled={!actif}
      onClick={agit} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); agit(); } }}>
      <rect x={x - 24} y={y - 22} width={48} height={44} fill="transparent" />
      <circle cx={x - 14} cy={y} r={3} fill="var(--encre)" />
      <circle cx={x + 14} cy={y} r={3} fill="var(--encre)" />
      <line x1={x - 14} y1={y} x2={ferme ? x + 14 : x + 10} y2={ferme ? y : y - 14} stroke="var(--encre)" strokeWidth={2.2} strokeLinecap="round" />
    </g>
  );
}

/**
 * Une touche d'appareil dessinée dans la scène : un bouton avec son libellé. `l`, `h` : sa taille, d'au moins 44 de côté
 * pour une scène de 360 de large. `enfonce` la montre active (une touche à bascule).
 */
export function Touche({ x, y, l, h, nom, texte, appuie, actif = true, enfonce }: { x: number; y: number; l: number; h: number; nom: string; texte: string; appuie: () => void; actif?: boolean; enfonce?: boolean }) {
  const agit = () => { if (!actif) return; son("clic"); vibre(6); appuie(); };
  return (
    <g className={`pl-touche${enfonce ? " pl-touche-active" : ""}`} role="button" tabIndex={actif ? 0 : -1} aria-label={nom} aria-pressed={enfonce} aria-disabled={!actif}
      onClick={agit} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); agit(); } }}>
      <rect className="pl-touche-fond" x={x - l / 2} y={y - h / 2} width={l} height={h} rx={8} />
      <text x={x} y={y + 4} textAnchor="middle" className="pl-touche-texte">{texte}</text>
    </g>
  );
}

const RIEN: Maintien = { tic: () => {} };

/**
 * Un bouton rond dessiné dans la scène, à côté d'un outil : le geste que l'outil permet. Avec `maintien`, il agit tant
 * que le doigt reste posé (verser, aspirer) ; avec `appuie`, à chaque toucher (une goutte). `texte` : un mot ou deux.
 */
export function Poussoir({ x, y, r = 22, nom, texte, maintien, appuie, actif = true }: { x: number; y: number; r?: number; nom: string; texte: string; maintien?: Maintien; appuie?: () => void; actif?: boolean }) {
  const tenu = useMaintien(maintien ?? RIEN, actif && maintien !== undefined);
  const touche = () => { if (!actif || !appuie) return; son("clic"); vibre(6); appuie(); };
  const mots = texte.split(" ");
  return (
    <g className="pl-poussoir" role="button" tabIndex={actif ? 0 : -1} aria-label={nom} aria-disabled={!actif}
      {...(maintien ? tenu : { onClick: touche, onKeyDown: (e: KeyboardEvent<SVGGElement>) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); touche(); } } })}>
      <circle cx={x} cy={y} r={r} className="pl-poussoir-fond" />
      {mots.map((mot, i) => <text key={i} x={x} y={y + 3 + (i - (mots.length - 1) / 2) * 9} textAnchor="middle" className="pl-touche-texte">{mot}</text>)}
    </g>
  );
}
