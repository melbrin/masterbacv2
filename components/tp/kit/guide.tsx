"use client";

// Le kit des paillasses : le guide. Quand il est en marche, une main dessinée montre le prochain geste dans la scène
// (glisser un objet jusqu'à sa place, garder le doigt appuyé, toucher, tourner), et une phrase le dit en bas de l'écran.
// L'élève le met en marche ou le coupe d'un bouton de l'établi ; son choix est gardé sur l'appareil.
//
// Chaque paillasse calcule elle-même le prochain geste, à partir de son état : une `Indication`. Elle la donne à
// l'établi (`<Etabli indication={...}>`) et à la main (`<Main indication={...} />`, en dernier dans la scène).
// Une manipulation faite avec le guide est une manipulation aidée : la liste des gestes part alors au serveur avec une
// marque, et le professeur en tient compte (lib/serveur/tp.ts). C'est l'établi et `SuiviDuGuide` qui s'en chargent.

import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { avecMarqueDuGuide, type GesteBrut } from "@/lib/commun/tp/types";
import { useVueDeScene, type Point, type Vue } from "./scene";

// ---------- le choix de l'élève : guide en marche ou coupé ----------

const CLE = "mb-guide";
const ecouteurs = new Set<() => void>();
let choix: boolean | null = null;

/** Le guide est en marche tant que l'élève ne l'a pas coupé : la première fois, il montre comment la paillasse se manie. */
function lis(): boolean {
  if (choix === null) {
    try { choix = window.localStorage.getItem(CLE) !== "non"; } catch { choix = true; }
  }
  return choix;
}
function regle(enMarche: boolean): void {
  choix = enMarche;
  try { window.localStorage.setItem(CLE, enMarche ? "oui" : "non"); } catch { /* le choix ne sera pas gardé : sans gravité */ }
  ecouteurs.forEach((previens) => previens());
}
const abonne = (previens: () => void) => { ecouteurs.add(previens); return () => { ecouteurs.delete(previens); }; };

/**
 * Le guide : `actif` dit s'il est en marche, `regle` le met en marche ou le coupe (le choix est gardé sur l'appareil).
 * Une paillasse s'en sert pour savoir si elle doit calculer son indication.
 */
export function useGuide(): { actif: boolean; regle: (enMarche: boolean) => void } {
  const actif = useSyncExternalStore(abonne, lis, () => true);
  return { actif, regle };
}

// ---------- ce que le guide montre ----------

/** Le geste que la main montre. Les points sont dans les unités du dessin. */
export type GesteGuide =
  /** prendre un objet et le poser : la main part de `de` et va jusqu'à `vers` */
  | { geste: "glisser"; de: Point; vers: Point }
  /** garder le doigt appuyé : sur un poussoir, par exemple */
  | { geste: "maintenir"; ou: Point }
  /** toucher une fois */
  | { geste: "toucher"; ou: Point }
  /**
   * tourner une molette ou un robinet autour de `ou`, de l'angle `de` à l'angle `a` : en degrés, 0 vers le haut, puis
   * dans le sens des aiguilles d'une montre (les mêmes angles que `Molette`). `r` : le rayon du geste, 30 par défaut.
   */
  | { geste: "tourner"; ou: Point; de: number; a: number; r?: number }
  /** regarder un endroit sans y toucher : une loupe, un afficheur, une couleur */
  | { geste: "montrer"; ou: Point };

/** Ce que le guide dit à un moment de la manipulation. */
export interface Indication {
  /** le nom de ce moment : il ne change que lorsque le geste à faire change (« rincer-verser », « zero-fermer ») */
  cle: string;
  /** ce qu'il faut faire, en une phrase simple qui tutoie l'élève : « Glisse le bécher poubelle sous la burette. » */
  texte: string;
  /** le geste que la main montre dans la scène ; absent quand le geste se fait ailleurs (un bouton du bas) ou qu'il faut attendre */
  main?: GesteGuide;
  /** vrai quand il ne reste qu'à appeler le professeur : « J'ai fini » se met en avant */
  appel?: boolean;
  /** le rang, dans le protocole, de l'étape en cours (0 pour la première) : l'établi la met en avant */
  etape?: number;
}

// ---------- la main ----------

const r2 = (n: number) => Math.round(n * 100) / 100;
/** Une main, l'index tendu : le bout de l'index est en (0, 0), la paume descend. */
const FORME = "M -3 3 A 3 3 0 0 1 3 3 V 12.2 C 4.4 10.9 7.3 11.1 7.9 12.9 C 9.3 11.8 12 12.2 12.4 14 C 13.8 13.3 16.2 13.9 16.2 16 V 21.5 C 16.2 27.6 12.6 31.5 6.8 31.5 H 4.2 C 1.2 31.5 -0.9 30.2 -2.7 27.8 L -9 19.6 C -10.6 17.4 -7.8 14.9 -5.8 16.7 L -3 19.4 Z";
const PLIS = "M 3 12.2 V 17.6 M 7.9 12.9 V 17.6 M 12.4 14 V 18";

/** La main en petit, pour un bouton. */
export function IconeMain() {
  return (
    <svg viewBox="-13 -2.5 32 37" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={FORME} />
    </svg>
  );
}

/** `miroir` : la paume part vers la gauche ; `renverse` : la main vient d'en haut. */
function Dessin({ miroir = false, renverse = false, droit = false }: { miroir?: boolean; renverse?: boolean; droit?: boolean }) {
  return (
    <g transform={`scale(${miroir ? -1 : 1} ${renverse ? -1 : 1})${droit ? "" : " rotate(-12)"}`}>
      <path className="pl-main-ombre" d={FORME} transform="translate(1.6 2.4)" />
      <path className="pl-main-forme" d={FORME} />
      <path className="pl-main-pli" d={PLIS} />
    </g>
  );
}

/** Près du bord droit, la paume part vers la gauche ; près du bas, la main vient d'en haut : elle reste dans la scène. */
function sens(vue: Vue | null, ...points: Point[]): { miroir: boolean; renverse: boolean } {
  if (!vue) return { miroir: false, renverse: false };
  return { miroir: points.some((p) => p.x > vue.x + vue.l - 28), renverse: points.some((p) => p.y > vue.y + vue.h - 42) };
}

const rad = (deg: number) => (deg * Math.PI) / 180;
/** Le point à l'angle donné (0 vers le haut, sens des aiguilles d'une montre) sur un cercle centré en (0, 0). */
const surCercle = (deg: number, rayon: number): Point => ({ x: r2(rayon * Math.sin(rad(deg))), y: r2(-rayon * Math.cos(rad(deg))) });
/** Une pointe de flèche en `p`, dans la direction (ux, uy). */
const pointe = (p: Point, ux: number, uy: number): string =>
  `M ${r2(p.x - ux * 7 - uy * 4.5)} ${r2(p.y - uy * 7 + ux * 4.5)} L ${r2(p.x)} ${r2(p.y)} L ${r2(p.x - ux * 7 + uy * 4.5)} ${r2(p.y - uy * 7 - ux * 4.5)}`;

/**
 * La main du guide : elle montre dans la scène le geste de l'indication. Elle se place en dernier dans la scène, et ne
 * reçoit aucun toucher. Sans indication, ou si le geste ne se fait pas dans la scène, elle ne dessine rien.
 * Avec « moins d'animations », la main ne bouge pas : une flèche dit où va le geste.
 */
export function Main({ indication }: { indication: Indication | null | undefined }) {
  const vue = useVueDeScene();
  const g = indication?.main;
  if (!indication || !g) return null;
  const commun = { className: "pl-main", "aria-hidden": true, "data-guide": indication.cle, "data-geste": g.geste } as const;

  if (g.geste === "glisser") {
    const dx = r2(g.vers.x - g.de.x), dy = r2(g.vers.y - g.de.y);
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d;
    // la flèche s'arrête au bord de l'anneau d'arrivée
    const bout = { x: g.vers.x - ux * Math.min(13, d / 2), y: g.vers.y - uy * Math.min(13, d / 2) };
    return (
      <g {...commun} data-x={g.de.x} data-y={g.de.y} data-vers-x={g.vers.x} data-vers-y={g.vers.y}>
        <path className="pl-main-trajet" d={`M ${r2(g.de.x)} ${r2(g.de.y)} L ${r2(bout.x)} ${r2(bout.y)}`} />
        <path className="pl-main-pointe" d={pointe(bout, ux, uy)} />
        <circle className="pl-main-arrivee" cx={g.vers.x} cy={g.vers.y} r={11} />
        <g transform={`translate(${r2(g.de.x)} ${r2(g.de.y)})`}>
          <g key={`${indication.cle} ${dx} ${dy}`} className="pl-main-glisse" style={{ "--pl-dx": `${dx}px`, "--pl-dy": `${dy}px` } as CSSProperties}>
            <Dessin {...sens(vue, g.de, g.vers)} />
          </g>
        </g>
      </g>
    );
  }

  if (g.geste === "tourner" && g.de !== g.a) {
    const rayon = g.r ?? 30;
    const depart = surCercle(g.de, rayon), arrivee = surCercle(g.a, rayon);
    const horaire = g.a > g.de ? 1 : -1;
    return (
      <g {...commun} data-x={g.ou.x} data-y={g.ou.y} data-de={g.de} data-a={g.a} data-r={rayon}>
        <g transform={`translate(${r2(g.ou.x)} ${r2(g.ou.y)})`}>
          <path className="pl-main-trajet" d={`M ${depart.x} ${depart.y} A ${rayon} ${rayon} 0 ${Math.abs(g.a - g.de) > 180 ? 1 : 0} ${horaire === 1 ? 1 : 0} ${arrivee.x} ${arrivee.y}`} />
          <path className="pl-main-pointe" d={pointe(arrivee, Math.cos(rad(g.a)) * horaire, Math.sin(rad(g.a)) * horaire)} />
          <g key={`${indication.cle} ${g.de} ${g.a}`} className="pl-main-tourne" style={{ "--pl-de": `${g.de}deg`, "--pl-a": `${g.a}deg` } as CSSProperties}>
            {/* le bout de l'index sur la poignée, la paume vers l'extérieur */}
            <g transform={`translate(0 ${-(rayon - 6)})`}><Dessin renverse droit /></g>
          </g>
        </g>
      </g>
    );
  }

  const ou = g.ou;
  const o = sens(vue, ou);
  if (g.geste === "montrer") {
    return (
      <g {...commun} data-x={ou.x} data-y={ou.y}>
        <g transform={`translate(${r2(ou.x)} ${r2(ou.y)})`}><g key={indication.cle} className="pl-main-montre"><Dessin {...o} /></g></g>
      </g>
    );
  }
  // un appui : le bout de l'index un peu sous le centre, pour laisser lire le mot du poussoir
  const decale = { x: o.miroir ? -6 : 6, y: o.renverse ? -8 : 8 };
  return (
    <g {...commun} data-x={ou.x} data-y={ou.y}>
      <g transform={`translate(${r2(ou.x)} ${r2(ou.y)})`}>
        <circle className="pl-main-onde" r={15} />
        {g.geste === "maintenir" && <circle className="pl-main-onde pl-main-onde-2" r={15} />}
        <g transform={`translate(${decale.x} ${decale.y})`}>
          <g key={indication.cle} className={g.geste === "maintenir" ? "pl-main-appui" : "pl-main-tape"}><Dessin {...o} /></g>
        </g>
      </g>
    </g>
  );
}

// ---------- la marque du guide ----------

interface Temoin {
  /** le guide vient de servir : la manipulation partira avec sa marque */
  marque: () => void;
  /** la paillasse est remise comme au début : la marque s'efface */
  efface: () => void;
}
const TemoinDuGuide = createContext<Temoin | null>(null);
/** Pour l'établi : de quoi dire que le guide a servi. Null si rien n'entoure la paillasse. */
export const useTemoinDuGuide = (): Temoin | null => useContext(TemoinDuGuide);

/**
 * Entoure la vue d'une paillasse, là où elle reçoit `fini` : le cadre d'un TP, un banc d'essai. Si le guide a servi
 * pendant la manipulation, la liste des gestes part au serveur avec sa marque. Aucune paillasse n'a à s'en occuper.
 */
export function SuiviDuGuide({ fini, children }: { fini: (gestes: GesteBrut[]) => void; children: (fini: (gestes: GesteBrut[]) => void) => ReactNode }) {
  const [servi, setServi] = useState(false);
  const temoin = useMemo<Temoin>(() => ({ marque: () => setServi(true), efface: () => setServi(false) }), []);
  const envoie = useCallback((gestes: GesteBrut[]) => fini(servi ? avecMarqueDuGuide(gestes) : gestes), [fini, servi]);
  return <TemoinDuGuide.Provider value={temoin}>{children(envoie)}</TemoinDuGuide.Provider>;
}
