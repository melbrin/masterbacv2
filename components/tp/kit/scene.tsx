"use client";

// Le kit des paillasses (décision 0012) : la scène. Une scène est un dessin SVG dans lequel l'élève agit avec le doigt
// ou la souris. Elle donne à ses enfants de quoi convertir un point de l'écran en point du dessin, et elle sait se
// rapprocher d'un endroit (la vue change en douceur, comme quand on se penche sur un appareil).

import { createContext, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";

export interface Point { x: number; y: number }
/** La partie du dessin montrée : son coin en haut à gauche, sa largeur, sa hauteur. */
export interface Vue { x: number; y: number; l: number; h: number }

const Dessin = createContext<{ svg: RefObject<SVGSVGElement | null>; vue: Vue } | null>(null);

/** Le point du dessin qui se trouve sous un point de l'écran. */
export function pointDuDessin(svg: SVGSVGElement | null, clientX: number, clientY: number): Point {
  const m = svg?.getScreenCTM();
  if (!m) return { x: 0, y: 0 };
  const i = m.inverse();
  return { x: i.a * clientX + i.c * clientY + i.e, y: i.b * clientX + i.d * clientY + i.f };
}

/** Pour un élément de la scène : de quoi convertir la position du doigt en point du dessin. */
export function useDessin(): (clientX: number, clientY: number) => Point {
  const dessin = useContext(Dessin);
  return (clientX, clientY) => pointDuDessin(dessin?.svg.current ?? null, clientX, clientY);
}

/** Pour un élément de la scène : la partie du dessin que la scène montre (sa vue demandée, pas celle qui glisse). Null hors d'une scène. */
export function useVueDeScene(): Vue | null {
  return useContext(Dessin)?.vue ?? null;
}

const DUREE = 360;
const adoucit = (t: number) => 1 - (1 - t) ** 3;

/** La vue qui glisse vers la vue demandée. Avec « moins d'animations », elle y saute. */
function useVueAnimee(cible: Vue): Vue {
  const [vue, setVue] = useState(cible);
  const actuelle = useRef(cible);
  const { x, y, l, h } = cible;
  useEffect(() => {
    const de = actuelle.current;
    const duree = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : DUREE;
    const debut = performance.now();
    let image = 0;
    const avance = (maintenant: number) => {
      const t = duree === 0 ? 1 : Math.min(1, (maintenant - debut) / duree);
      const k = adoucit(t);
      const v = { x: de.x + (x - de.x) * k, y: de.y + (y - de.y) * k, l: de.l + (l - de.l) * k, h: de.h + (h - de.h) * k };
      actuelle.current = v;
      setVue(v);
      if (t < 1) image = requestAnimationFrame(avance);
    };
    if (de.x !== x || de.y !== y || de.l !== l || de.h !== h) image = requestAnimationFrame(avance);
    return () => cancelAnimationFrame(image);
  }, [x, y, l, h]);
  return vue;
}

const arrondi = (n: number) => Math.round(n * 100) / 100;

/**
 * La scène d'une paillasse. `vue` dit quelle partie du dessin est montrée : la changer rapproche ou éloigne le regard.
 * `nom` décrit la scène pour un lecteur d'écran. Les objets que l'élève déplace se dessinent en dernier : ils passent devant le reste.
 */
export function Scene({ vue, nom, children, className }: { vue: Vue; nom: string; children: ReactNode; className?: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const decoupe = useId();
  const v = useVueAnimee(vue);
  const { x, y, l, h } = vue;
  const dessin = useMemo(() => ({ svg, vue: { x, y, l, h } }), [x, y, l, h]);
  return (
    <Dessin.Provider value={dessin}>
      <svg ref={svg} className={`pl-scene${className ? ` ${className}` : ""}`} viewBox={`${arrondi(v.x)} ${arrondi(v.y)} ${arrondi(v.l)} ${arrondi(v.h)}`}
        preserveAspectRatio="xMidYMid meet" role="group" aria-label={nom}>
        {/* la scène ne montre que sa vue : quand le regard se rapproche, ce qui l'entoure ne déborde pas dans les marges */}
        <defs><clipPath id={decoupe}><rect x={arrondi(v.x)} y={arrondi(v.y)} width={arrondi(v.l)} height={arrondi(v.h)} /></clipPath></defs>
        <g clipPath={`url(#${decoupe})`}>{children}</g>
      </svg>
    </Dessin.Provider>
  );
}
