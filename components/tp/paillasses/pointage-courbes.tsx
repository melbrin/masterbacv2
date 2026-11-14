"use client";

// Les courbes de la paillasse « pointage » : ce que le logiciel trace avec les pointés de l'élève. La vitesse verticale,
// avec une droite dont l'élève règle les deux bouts ; les énergies, avec un repère à glisser d'un point à l'autre.
// Le logiciel affiche l'équation de la droite et les valeurs au repère : c'est à l'élève de les lire et de les garder.

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { nombre, nombreRelatif } from "@/lib/commun/format";
import { date, type Grandeur, type Point, type ReglagesPointage } from "@/lib/commun/tp/paillasses/pointage";
import { Touche, useGlisse } from "../kit";

export type Onglet = "vitesse" | "energies";
/** La droite que l'élève règle : sa valeur à la première image, et à la dernière. */
export interface Droite { va: number; vb: number }

const CADRE = { x: 52, y: 76, l: 294, h: 312 };
/** Les deux onglets : le dessin et la main du guide lisent les mêmes places. */
export const ONGLETS: Record<Onglet, Point> = { vitesse: { x: 94, y: 22 }, energies: { x: 266, y: 22 } };
const r1 = (n: number) => Math.round(n * 10) / 10;
/** Un pas rond pour graduer un axe : 1, 2 ou 5 fois une puissance de dix. */
function pasRond(brut: number): number {
  const dizaine = 10 ** Math.floor(Math.log10(brut));
  const reste = brut / dizaine;
  return (reste <= 1 ? 1 : reste <= 2 ? 2 : reste <= 5 ? 5 : 10) * dizaine;
}
const gradue = (bas: number, haut: number, pas: number): number[] => Array.from({ length: Math.round((haut - bas) / pas) + 1 }, (_, i) => Number((bas + i * pas).toFixed(6)));

/** L'axe vertical d'une courbe : ses bornes, et le pas de ses graduations. */
export interface Axe { bas: number; haut: number; pas: number }
/** L'axe de la vitesse verticale, calculé avec les points à tracer. */
export function axeVitesse(points: readonly Grandeur[]): Axe {
  const vitesses = points.map((p) => p.vy);
  const marge = Math.max(0.6, 0.12 * (Math.max(...vitesses) - Math.min(...vitesses)));
  const pas = pasRond((Math.max(1, ...vitesses) - Math.min(-1, ...vitesses) + 2 * marge) / 8);
  return { bas: Math.floor((Math.min(-1, ...vitesses) - marge) / pas) * pas, haut: Math.ceil((Math.max(1, ...vitesses) + marge) / pas) * pas, pas };
}
/** L'axe des énergies, calculé avec les points à tracer. */
export function axeEnergies(points: readonly Grandeur[]): Axe {
  const toutes = points.flatMap((p) => [p.Ec, p.Epp, p.Em]);
  const pas = pasRond((Math.max(1, ...toutes) - Math.min(0, ...toutes)) / 5);
  return { bas: Math.floor(Math.min(0, ...toutes) / pas) * pas, haut: Math.ceil((Math.max(1, ...toutes) * 1.04) / pas) * pas, pas };
}
/** La place, dans le dessin, du point d'une courbe : la date `t` sur un film de durée `duree`, la valeur `v` sur l'axe. */
export const placeCourbe = (axe: Axe, duree: number, t: number, v: number): Point => ({ x: r1(CADRE.x + (t / duree) * CADRE.l), y: r1(CADRE.y + ((axe.haut - v) / (axe.haut - axe.bas)) * CADRE.h) });

// Une grandeur et son indice : « v » et « y », « E » et « m ».
function Indice({ lettre, indice }: { lettre: string; indice: string }) {
  return <><tspan fontStyle="italic">{lettre}</tspan><tspan dy={2.5} fontSize={7.5}>{indice}</tspan><tspan dy={-2.5}> </tspan></>;
}

// Le cadre d'une courbe : son quadrillage, ses graduations, le nom de ses axes. Le temps est en abscisse.
function Axes({ duree, bas, haut, pas, nom }: { duree: number; bas: number; haut: number; pas: number; nom: ReactNode }) {
  const X = (t: number) => r1(CADRE.x + (t / duree) * CADRE.l), Y = (v: number) => r1(CADRE.y + ((haut - v) / (haut - bas)) * CADRE.h);
  const decimales = pas >= 1 ? 0 : pas >= 0.1 ? 1 : 2;
  return (
    <g className="pl-pointage-axes" aria-hidden="true">
      <rect x={CADRE.x} y={CADRE.y} width={CADRE.l} height={CADRE.h} />
      {gradue(bas, haut, pas).map((v) => (
        <g key={v}><line className={v === 0 ? "pl-pointage-zero" : undefined} x1={CADRE.x} x2={CADRE.x + CADRE.l} y1={Y(v)} y2={Y(v)} /><text x={CADRE.x - 10} y={Y(v) + 3} textAnchor="end">{nombreRelatif(v, decimales)}</text></g>
      ))}
      {gradue(0, Math.floor(duree * 10 + 1e-9) / 10, 0.1).map((t) => (
        <g key={t}><line x1={X(t)} x2={X(t)} y1={CADRE.y} y2={CADRE.y + CADRE.h} /><text x={X(t)} y={CADRE.y + CADRE.h + 12} textAnchor="middle">{nombre(t, 1)}</text></g>
      ))}
      <text x={CADRE.x - 44} y={CADRE.y - 20} className="pl-fort">{nom}</text>
      <text x={CADRE.x + CADRE.l} y={CADRE.y + CADRE.h + 25} textAnchor="end" className="pl-fort"><tspan fontStyle="italic">t</tspan> (s)</text>
    </g>
  );
}

// ---------- la vitesse verticale, et la droite à ajuster ----------

// Un bout de la droite : il se glisse de haut en bas ; au clavier, les flèches (un vingtième de m/s) et les touches Page.
// `tient` : dit quand le doigt prend le bout, puis quand il le lâche.
function Bout({ nom, x, y, v, bas, haut, lit, change, tient }: { nom: string; x: number; y: number; v: number; bas: number; haut: number; lit: (y: number) => number; change: (v: number) => void; tient: (tenu: boolean) => void }) {
  const prise = useRef(0);
  const glisse = useGlisse({ depart: (p) => { prise.current = p.y - y; tient(true); }, bouge: (p) => change(lit(p.y - prise.current)), fin: () => tient(false) });
  const clavier = (e: KeyboardEvent<SVGGElement>) => {
    const pas = e.key === "ArrowUp" || e.key === "ArrowRight" ? 0.05 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -0.05 : e.key === "PageUp" ? 0.5 : e.key === "PageDown" ? -0.5 : 0;
    if (pas) { e.preventDefault(); change(Math.round(Math.max(bas, Math.min(haut, v + pas)) * 20) / 20); }
  };
  return (
    <g className="pl-pointage-bout" role="slider" tabIndex={0} aria-orientation="vertical" aria-label={nom} aria-valuemin={bas} aria-valuemax={haut} aria-valuenow={v}
      aria-valuetext={`${nombreRelatif(v, 2)} m/s`} onKeyDown={clavier} {...glisse}>
      <circle cx={x} cy={y} r={22} fill="transparent" />
      <circle cx={x} cy={y} r={6.5} />
    </g>
  );
}

function Vitesse({ r, points, droite, regle, gardee, tient }: { r: ReglagesPointage; points: Grandeur[]; droite: Droite; regle: (d: Droite) => void; gardee: number | null; tient: (cote: "gauche" | "droit" | null) => void }) {
  const duree = date(r, r.images - 1);
  const axe = axeVitesse(points);
  const { bas, haut, pas } = axe;
  const X = (t: number) => placeCourbe(axe, duree, t, 0).x, Y = (v: number) => placeCourbe(axe, duree, 0, v).y;
  const lit = (y: number) => Math.round(Math.max(bas, Math.min(haut, haut - ((y - CADRE.y) / CADRE.h) * (haut - bas))) * 20) / 20;
  const pente = (droite.vb - droite.va) / duree;
  const bas2 = CADRE.y + CADRE.h;
  return (
    <>
      <Axes duree={duree} bas={bas} haut={haut} pas={pas} nom={<><Indice lettre="v" indice="y" />(m/s)</>} />
      <g role="img" aria-label={`La vitesse verticale de la balle : ${points.length} points.`}>
        {points.map((p) => <circle key={p.image} cx={X(p.t)} cy={Y(p.vy)} r={3} fill="var(--encre)" />)}
      </g>
      <line className="pl-pointage-droite" x1={X(0)} y1={Y(droite.va)} x2={X(duree)} y2={Y(droite.vb)} />
      <Bout nom="Bout gauche de la droite" x={X(0)} y={Y(droite.va)} v={droite.va} bas={bas} haut={haut} lit={lit} change={(va) => regle({ ...droite, va })} tient={(tenu) => tient(tenu ? "gauche" : null)} />
      <Bout nom="Bout droit de la droite" x={X(duree)} y={Y(droite.vb)} v={droite.vb} bas={bas} haut={haut} lit={lit} change={(vb) => regle({ ...droite, vb })} tient={(tenu) => tient(tenu ? "droit" : null)} />
      <text x={CADRE.x} y={bas2 + 46} className="pl-pointage-lecture">Ta droite : <Indice lettre="v" indice="y" />= {nombreRelatif(pente, 2)} × <tspan fontStyle="italic">t</tspan> {droite.va < 0 ? "−" : "+"} {nombre(Math.abs(droite.va), 2)}</text>
      <text x={CADRE.x} y={bas2 + 61}>La vitesse est en m/s, le temps en secondes.</text>
      <text x={CADRE.x} y={bas2 + 82} className="pl-fort">{gardee === null ? "Aucune droite gardée pour le moment." : `Droite gardée : pente de ${nombreRelatif(gardee, 2)} m/s².`}</text>
    </>
  );
}

// ---------- les énergies, et le repère ----------

const SERIES: { cle: "Ec" | "Epp" | "Em"; indice: string; nom: string; couleur: string }[] = [
  { cle: "Ec", indice: "c", nom: "énergie cinétique", couleur: "var(--bleu)" },
  { cle: "Epp", indice: "pp", nom: "énergie potentielle de pesanteur", couleur: "var(--vert)" },
  { cle: "Em", indice: "m", nom: "énergie mécanique", couleur: "var(--sable)" },
];

// Le repère des énergies : il se glisse d'un point à l'autre ; au clavier, les flèches.
function Repere({ x, rang, points, versRang, place }: { x: number; rang: number; points: Grandeur[]; versRang: (x: number) => number; place: (rang: number) => void }) {
  const glisse = useGlisse({ depart: (p) => place(versRang(p.x)), bouge: (p) => place(versRang(p.x)) });
  const clavier = (e: KeyboardEvent<SVGGElement>) => {
    const suite = e.key === "ArrowRight" || e.key === "ArrowUp" ? rang + 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? rang - 1 : e.key === "Home" ? 0 : e.key === "End" ? points.length - 1 : null;
    if (suite !== null) { e.preventDefault(); place(Math.max(0, Math.min(points.length - 1, suite))); }
  };
  return (
    <g className="pl-pointage-repere" role="slider" tabIndex={0} aria-label="Repère sur les courbes des énergies" aria-valuemin={1} aria-valuemax={points.length} aria-valuenow={rang + 1}
      aria-valuetext={`point ${rang + 1} sur ${points.length}`} onKeyDown={clavier} {...glisse}>
      <rect x={CADRE.x} y={CADRE.y - 16} width={CADRE.l} height={CADRE.h + 16} fill="transparent" />
      <line x1={x} x2={x} y1={CADRE.y} y2={CADRE.y + CADRE.h} />
      <path d={`M ${r1(x - 8)} ${CADRE.y - 15} h 16 v 9 l -8 6 l -8 -6 Z`} />
    </g>
  );
}

function Energies({ r, points, repere, place }: { r: ReglagesPointage; points: Grandeur[]; repere: number; place: (rang: number) => void }) {
  const duree = date(r, r.images - 1);
  const axe = axeEnergies(points);
  const { bas, haut, pas } = axe;
  const X = (t: number) => placeCourbe(axe, duree, t, 0).x, Y = (v: number) => placeCourbe(axe, duree, 0, v).y;
  const rang = Math.max(0, Math.min(points.length - 1, repere));
  const ici = points[rang];
  const versRang = (x: number) => points.reduce((meilleur, p, i) => (Math.abs(X(p.t) - x) < Math.abs(X(points[meilleur].t) - x) ? i : meilleur), 0);
  const bas2 = CADRE.y + CADRE.h;
  return (
    <>
      <Axes duree={duree} bas={bas} haut={haut} pas={pas} nom="énergies (mJ)" />
      <g role="img" aria-label={`Les énergies de la balle : ${points.length} points pour chacune des trois courbes.`}>
        {SERIES.map((s) => (
          <g key={s.cle}>
            <polyline className="pl-pointage-courbe" points={points.map((p) => `${X(p.t)},${Y(p[s.cle])}`).join(" ")} stroke={s.couleur} />
            {points.map((p) => <circle key={p.image} cx={X(p.t)} cy={Y(p[s.cle])} r={2.4} fill={s.couleur} />)}
          </g>
        ))}
      </g>
      <Repere x={X(ici.t)} rang={rang} points={points} versRang={versRang} place={place} />
      <text x={CADRE.x} y={bas2 + 44} className="pl-fort">Au repère : <tspan fontStyle="italic">t</tspan> = {nombre(ici.t, 3)} s (point {rang + 1} sur {points.length})</text>
      {SERIES.map((s, i) => (
        <g key={s.cle} role="img" aria-label={`${s.nom} au repère : ${nombre(ici[s.cle], 1)} millijoules`}>
          <line x1={CADRE.x} x2={CADRE.x + 16} y1={bas2 + 58 + i * 16} y2={bas2 + 58 + i * 16} stroke={s.couleur} strokeWidth={2.6} strokeLinecap="round" />
          <text x={CADRE.x + 22} y={bas2 + 61.5 + i * 16}><Indice lettre="E" indice={s.indice} />: {s.nom}</text>
          <text x={CADRE.x + CADRE.l} y={bas2 + 61.5 + i * 16} textAnchor="end" className="pl-pointage-lecture">{nombre(ici[s.cle], 1)} mJ</text>
        </g>
      ))}
    </>
  );
}

// ---------- les deux onglets ----------

/** Les courbes du logiciel, à dessiner dans une scène de 360 unités de large. `points` : ce que le logiciel a calculé avec les pointés. */
/** `tient` : dit quel bout de la droite l'élève tient sous son doigt, ou null quand il le lâche. */
export function Courbes({ r, points, onglet, choisis, droite, regle, gardee, repere, place, tient }: {
  r: ReglagesPointage; points: Grandeur[]; onglet: Onglet; choisis: (onglet: Onglet) => void;
  droite: Droite; regle: (d: Droite) => void; gardee: number | null; repere: number; place: (rang: number) => void; tient: (cote: "gauche" | "droit" | null) => void;
}) {
  return (
    <>
      <Touche x={ONGLETS.vitesse.x} y={ONGLETS.vitesse.y} l={164} h={40} nom="Courbe de la vitesse verticale" texte="Vitesse verticale" appuie={() => choisis("vitesse")} enfonce={onglet === "vitesse"} />
      <Touche x={ONGLETS.energies.x} y={ONGLETS.energies.y} l={164} h={40} nom="Courbes des énergies" texte="Énergies" appuie={() => choisis("energies")} enfonce={onglet === "energies"} />
      {points.length < 3 ? (
        <g>
          <text x={180} y={200} textAnchor="middle" className="pl-fort" style={{ fontSize: 13 }}>Pas encore de courbe.</text>
          <text x={180} y={224} textAnchor="middle" style={{ fontSize: 11 }}>Le logiciel a besoin de l&apos;échelle : les deux repères</text>
          <text x={180} y={240} textAnchor="middle" style={{ fontSize: 11 }}>et la longueur de l&apos;étalon.</text>
          <text x={180} y={262} textAnchor="middle" style={{ fontSize: 11 }}>Il lui faut aussi au moins cinq images pointées.</text>
        </g>
      ) : onglet === "vitesse" ? <Vitesse r={r} points={points} droite={droite} regle={regle} gardee={gardee} tient={tient} /> : <Energies r={r} points={points} repere={repere} place={place} />}
    </>
  );
}
