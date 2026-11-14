"use client";

// Le kit des paillasses : les gestes. Glisser un élément, maintenir un appui (verser, aspirer), prendre un objet et
// le poser sur une cible. Chaque geste a son équivalent au clavier et au toucher simple : on peut toucher un objet
// pour le prendre, puis toucher l'endroit où le poser.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { useDessin, type Point } from "./scene";
import { son, vibre } from "./son";

// ---------- glisser ----------

export interface Glisse {
  /** le doigt se pose */
  depart?: (p: Point) => void;
  /** le doigt bouge, appui maintenu : `p` est sa position dans le dessin */
  bouge: (p: Point) => void;
  /** le doigt se lève ; `aBouge` est faux pour un simple toucher */
  fin?: (p: Point, aBouge: boolean) => void;
}

/** Les réglages à poser sur un élément de la scène pour qu'il se glisse. Un déplacement de moins de 3 unités compte comme un toucher. */
export function useGlisse(g: Glisse, actif = true) {
  const versDessin = useDessin();
  const cours = useRef<{ id: number; depart: Point; aBouge: boolean } | null>(null);
  return {
    onPointerDown(e: PointerEvent<SVGElement>) {
      if (!actif || cours.current || (e.pointerType === "mouse" && e.button !== 0)) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const p = versDessin(e.clientX, e.clientY);
      cours.current = { id: e.pointerId, depart: p, aBouge: false };
      g.depart?.(p);
    },
    onPointerMove(e: PointerEvent<SVGElement>) {
      const c = cours.current;
      if (!c || c.id !== e.pointerId) return;
      const p = versDessin(e.clientX, e.clientY);
      if (!c.aBouge && Math.hypot(p.x - c.depart.x, p.y - c.depart.y) < 3) return;
      c.aBouge = true;
      g.bouge(p);
    },
    onPointerUp(e: PointerEvent<SVGElement>) {
      const c = cours.current;
      if (!c || c.id !== e.pointerId) return;
      cours.current = null;
      g.fin?.(versDessin(e.clientX, e.clientY), c.aBouge);
    },
    onPointerCancel(e: PointerEvent<SVGElement>) {
      const c = cours.current;
      if (!c || c.id !== e.pointerId) return;
      cours.current = null;
      g.fin?.(c.depart, c.aBouge);
    },
    style: { touchAction: "none" as const, cursor: actif ? "grab" : undefined },
  };
}

// ---------- maintenir ----------

export interface Maintien {
  /** appelé à chaque image tant que l'appui dure : `dt` est le temps écoulé depuis l'image d'avant, en secondes */
  tic: (dt: number) => void;
  debut?: () => void;
  fin?: () => void;
  /** au clavier, les flèches droite et haut font un pas fixe : le même geste, sans le temps */
  pas?: () => void;
}

/**
 * Les réglages à poser sur un élément pour qu'il réponde à un appui maintenu : verser tant que le doigt reste posé.
 * Au clavier : Espace ou Entrée maintenue ; les flèches droite et haut font un pas fixe.
 */
export function useMaintien(m: Maintien, actif = true) {
  const boucle = useRef<{ image: number; avant: number } | null>(null);
  const dernier = useRef(m);
  useEffect(() => { dernier.current = m; });
  const arrete = useCallback(() => {
    if (!boucle.current) return;
    cancelAnimationFrame(boucle.current.image);
    boucle.current = null;
    dernier.current.fin?.();
  }, []);
  const lance = useCallback(() => {
    if (boucle.current) return;
    dernier.current.debut?.();
    const tourne = (maintenant: number) => {
      const b = boucle.current;
      if (!b) return;
      // un écart trop long (onglet caché, page ralentie) ne verse pas d'un coup
      const dt = Math.min(0.1, (maintenant - b.avant) / 1000);
      b.avant = maintenant;
      dernier.current.tic(dt);
      b.image = requestAnimationFrame(tourne);
    };
    boucle.current = { image: requestAnimationFrame(tourne), avant: performance.now() };
  }, []);
  // si l'élément disparaît pendant l'appui, la boucle s'arrête
  useEffect(() => arrete, [arrete]);
  return {
    onPointerDown(e: PointerEvent<Element>) {
      if (!actif || (e.pointerType === "mouse" && e.button !== 0)) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      lance();
    },
    onPointerUp: arrete,
    onPointerCancel: arrete,
    onLostPointerCapture: arrete,
    onKeyDown(e: KeyboardEvent<Element>) {
      if (!actif) return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!e.repeat) lance(); }
      if ((e.key === "ArrowRight" || e.key === "ArrowUp") && dernier.current.pas) { e.preventDefault(); dernier.current.pas(); }
    },
    onKeyUp(e: KeyboardEvent<Element>) { if (e.key === " " || e.key === "Enter") arrete(); },
    onBlur: arrete,
    style: { touchAction: "none" as const, cursor: actif ? "pointer" : undefined },
  };
}

/** Ce que verse un poussoir : son débit, son plus petit morceau, son pas au clavier. */
export interface Versement {
  /** ce qui coule par seconde tant que l'appui dure, dans l'unité de la paillasse (des millilitres, en général) */
  debit: number;
  /** le plus petit morceau versé : 0,05 par défaut. Un appui bref en verse un. */
  grain?: number;
  /** ce que verse un pas au clavier (flèche droite ou haut) */
  pas: number;
  /** appelé à chaque morceau, avec sa quantité, arrondie au centième */
  verse: (quantite: number) => void;
  debut?: () => void;
  fin?: () => void;
}

/**
 * De quoi faire un poussoir qui verse (`Poussoir maintien={versement({...})}`) : il verse en continu tant que l'appui
 * dure, par morceaux. Un appui bref verse quand même un grain : l'élève ajuste à petits coups, comme on tapote.
 */
export function useVersement(): (v: Versement) => Maintien {
  const cours = useRef({ reserve: 0, verse: false });
  return useCallback((v: Versement): Maintien => {
    const grain = v.grain ?? 0.05;
    return {
      debut: () => { cours.current = { reserve: 0, verse: false }; v.debut?.(); },
      tic: (dt) => {
        const c = cours.current;
        c.reserve += v.debit * dt;
        if (c.reserve < grain) return;
        const quantite = Math.floor(c.reserve * 100) / 100;
        c.reserve -= quantite;
        c.verse = true;
        v.verse(quantite);
      },
      fin: () => { if (!cours.current.verse) v.verse(grain); v.fin?.(); },
      pas: () => v.verse(v.pas),
    };
  }, []);
}

// ---------- prendre et poser ----------

interface ZoneCible { id: string; x: number; y: number; r: number; accepte: readonly string[] }
interface Etabli {
  /** l'objet pris en main par un toucher, ou en train d'être glissé */
  tenu: string | null;
  /** la cible sous l'objet glissé */
  survol: string | null;
  prend: (objet: string | null) => void;
  survole: (cible: string | null) => void;
  pose: (objet: string, cible: string) => void;
  /** l'objet glissé est lâché là où rien ne l'accepte */
  rate: (objet: string, p: Point) => void;
  inscrit: (zone: ZoneCible) => () => void;
  /** la cible la plus proche du point qui accepte l'objet, ou null */
  cibleSous: (objet: string, p: Point) => string | null;
}
const EtabliContexte = createContext<Etabli | null>(null);
function useEtabli(): Etabli {
  const e = useContext(EtabliContexte);
  if (!e) throw new Error("Objet et Cible se placent dans Manipulation.");
  return e;
}

export interface PropsManipulation {
  /** un objet est lâché sur une cible qui l'accepte, ou l'élève a touché l'objet puis la cible */
  pose: (objet: string, cible: string) => void;
  /** l'élève vient de prendre un objet ; `cibles` : les endroits qui l'acceptent. La paillasse peut dire où il va. */
  prise?: (objet: string, cibles: string[]) => void;
  /** un objet glissé est lâché, en `p`, là où rien ne l'accepte. La paillasse peut dire pourquoi. */
  rate?: (objet: string, p: Point) => void;
  children: ReactNode;
}

/**
 * Le cadre des objets à prendre et des cibles où les poser. `pose` est appelé quand un objet est lâché sur une cible
 * qui l'accepte, ou quand l'élève touche l'objet puis la cible. C'est la paillasse qui décide de ce que le geste change.
 */
export function Manipulation({ pose, prise, rate, children }: PropsManipulation) {
  const [tenu, setTenu] = useState<string | null>(null);
  const [survol, setSurvol] = useState<string | null>(null);
  const zones = useRef(new Map<string, ZoneCible>());
  const derniers = useRef({ pose, prise, rate });
  useEffect(() => { derniers.current = { pose, prise, rate }; });
  const etabli = useMemo<Etabli>(() => ({
    tenu, survol,
    prend: (objet) => {
      setTenu(objet);
      setSurvol(null);
      if (objet !== null && objet !== tenu) derniers.current.prise?.(objet, [...zones.current.values()].filter((z) => z.accepte.includes(objet)).map((z) => z.id));
    },
    survole: setSurvol,
    pose: (objet, cible) => { setTenu(null); setSurvol(null); son("pose"); vibre(8); derniers.current.pose(objet, cible); },
    rate: (objet, p) => { setTenu(null); setSurvol(null); derniers.current.rate?.(objet, p); },
    inscrit: (zone) => { zones.current.set(zone.id, zone); return () => { zones.current.delete(zone.id); }; },
    cibleSous: (objet, p) => {
      let meilleure: string | null = null;
      let distance = Infinity;
      for (const z of zones.current.values()) {
        const d = Math.hypot(p.x - z.x, p.y - z.y);
        if (z.accepte.includes(objet) && d <= z.r + 14 && d < distance) { meilleure = z.id; distance = d; }
      }
      return meilleure;
    },
  }), [tenu, survol]);
  return <EtabliContexte.Provider value={etabli}>{children}</EtabliContexte.Provider>;
}

/**
 * Un objet que l'élève prend. Il se glisse jusqu'à une cible, ou se touche pour être pris en main (puis on touche la cible).
 * `x`, `y` : où l'objet repose, au centre de son dessin ; `children` se dessine autour de (0, 0).
 * `l`, `h` : la taille de la zone de toucher, d'au moins 44 unités quand la scène fait 360 de large.
 */
export function Objet({ id, nom, x, y, l, h, actif = true, children }: { id: string; nom: string; x: number; y: number; l: number; h: number; actif?: boolean; children: ReactNode }) {
  const etabli = useEtabli();
  const [glisse, setGlisse] = useState<Point | null>(null);
  const prise = useRef<Point>({ x: 0, y: 0 });
  const reglages = useGlisse({
    depart: (p) => { prise.current = { x: p.x - x, y: p.y - y }; },
    bouge: (p) => {
      const ici = { x: p.x - prise.current.x, y: p.y - prise.current.y };
      setGlisse(ici);
      if (etabli.tenu !== id) etabli.prend(id);
      etabli.survole(etabli.cibleSous(id, ici));
    },
    fin: (p, aBouge) => {
      setGlisse(null);
      if (!aBouge) { etabli.prend(etabli.tenu === id ? null : id); if (etabli.tenu !== id) { son("clic"); vibre(6); } return; }
      const ici = { x: p.x - prise.current.x, y: p.y - prise.current.y };
      const cible = etabli.cibleSous(id, ici);
      if (cible) etabli.pose(id, cible); else etabli.rate(id, ici);
    },
  }, actif);
  const tenu = etabli.tenu === id;
  const ici = glisse ?? { x, y };
  return (
    <g className={`pl-objet${tenu ? " pl-tenu" : ""}${glisse ? " pl-glisse" : ""}`} transform={`translate(${ici.x} ${ici.y})`}
      role="button" tabIndex={actif ? 0 : -1} aria-pressed={tenu} aria-disabled={!actif} aria-label={`${nom}${tenu ? ", en main" : ""}`}
      onKeyDown={(e) => { if (actif && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); etabli.prend(tenu ? null : id); } if (e.key === "Escape") etabli.prend(null); }}
      {...reglages}>
      {tenu && <rect className="pl-halo" x={-l / 2 - 4} y={-h / 2 - 4} width={l + 8} height={h + 8} rx={10} />}
      <rect x={-l / 2} y={-h / 2} width={l} height={h} fill="transparent" />
      {children}
    </g>
  );
}

/**
 * Un endroit où poser un objet. La cible ne se montre que lorsqu'un objet qu'elle accepte est en main : un anneau,
 * que l'élève touche pour poser. `x`, `y`, `r` : son centre et son rayon dans le dessin. `nom` : « le haut de la burette ».
 */
export function Cible({ id, nom, x, y, r, accepte }: { id: string; nom: string; x: number; y: number; r: number; accepte: readonly string[] }) {
  const etabli = useEtabli();
  const { inscrit } = etabli;
  const cle = accepte.join();
  useEffect(() => inscrit({ id, x, y, r, accepte: cle.split(",") }), [inscrit, id, x, y, r, cle]);
  const tenu = etabli.tenu;
  if (!tenu || !accepte.includes(tenu)) return null;
  const pose = () => etabli.pose(tenu, id);
  return (
    <g className={`pl-cible${etabli.survol === id ? " pl-cible-ici" : ""}`} role="button" tabIndex={0} aria-label={`Poser sur ${nom}`}
      onClick={pose} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pose(); } }}>
      <circle cx={x} cy={y} r={Math.max(r, 22)} fill="transparent" />
      <circle className="pl-cible-anneau" cx={x} cy={y} r={r} />
      <circle className="pl-cible-onde" cx={x} cy={y} r={r} />
    </g>
  );
}
