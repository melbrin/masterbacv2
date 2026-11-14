"use client";

// L'analyseur de spectre de la paillasse « doppler » : le spectre du son enregistré, de 0 à 8 000 Hz. Une molette
// resserre la fenêtre autour du repère ; le repère se glisse sur un pic, et l'analyseur affiche sa fréquence.
// Vus de loin, les pics de l'approche, de l'arrêt et de l'éloignement ne font qu'un trait : il faut zoomer pour les séparer.

import type { KeyboardEvent } from "react";
import { nombre } from "@/lib/commun/format";
import { frequenceDuRang, type ReglagesDoppler } from "@/lib/commun/tp/paillasses/doppler";
import { FENETRES, debutDeFenetre, pasDuRepere, repereDans } from "@/lib/commun/tp/paillasses/doppler-guide";
import { Molette, useGlisse, type Point, type Vue } from "../kit";

// La fenêtre, le pas du repère et le zoom se calculent dans lib/commun/tp/paillasses/doppler-guide.ts : le guide et ses tests s'en servent aussi.
const ECRAN = { x: 30, y: 30, l: 320, h: 300 };
/** La molette du zoom : le dessin et la main du guide lisent la même place. */
export const MOLETTE_ZOOM: Point = { x: ECRAN.x + 30, y: ECRAN.y + ECRAN.h + 118 };
/** Pendant la lecture d'une fréquence, le regard se rapproche du bas de l'écran et de ce qu'il affiche. */
export const VUE_LECTURE: Vue = { x: 10, y: 160, l: 350, h: 244 };
const r1 = (n: number) => Math.round(n * 10) / 10;
/** Une fréquence écrite sans décimales inutiles : « 8 000 », « 2 974,5 », « 0,25 ». */
const court = (f: number) => f.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
/** Là où toucher l'écran pour poser le repère sur une fréquence : au pied du pic, pour laisser voir son sommet. */
export function placeSurEcran(zoom: number, centre: number, f: number): Point {
  const debut = debutDeFenetre(zoom, centre);
  return { x: r1(ECRAN.x + (Math.max(0, Math.min(FENETRES[zoom], f - debut)) / FENETRES[zoom]) * ECRAN.l), y: ECRAN.y + ECRAN.h - 34 };
}
/** Un pas rond pour graduer l'axe des fréquences. */
function pasRond(brut: number): number {
  const dizaine = 10 ** Math.floor(Math.log10(brut));
  const reste = brut / dizaine;
  return (reste <= 1 ? 1 : reste <= 2 ? 2 : reste <= 5 ? 5 : 10) * dizaine;
}
/** Le bruit de fond de l'analyseur à une fréquence : toujours le même pour la même fréquence. */
const bruit = (f: number): number => { const x = Math.sin(f * 12.9898) * 43758.5453; return 0.008 + 0.014 * (x - Math.floor(x)); };

// Le repère : il se pose là où le doigt touche l'écran, et le suit ; au clavier, les flèches (un pas) et les touches Page (dix pas).
// `tient` : dit quand le doigt se pose sur l'écran, puis quand il le quitte.
function Repere({ x, f, pas, de, a, versFrequence, place, tient }: { x: number; f: number; pas: number; de: number; a: number; versFrequence: (x: number) => number; place: (f: number) => void; tient: (tenu: boolean) => void }) {
  const glisse = useGlisse({ depart: (p) => { place(versFrequence(p.x)); tient(true); }, bouge: (p) => place(versFrequence(p.x)), fin: () => tient(false) });
  const clavier = (e: KeyboardEvent<SVGGElement>) => {
    const saut = e.key === "ArrowRight" || e.key === "ArrowUp" ? pas : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -pas : e.key === "PageUp" ? 10 * pas : e.key === "PageDown" ? -10 * pas : 0;
    if (saut) { e.preventDefault(); place(Math.max(de, Math.min(a, f + saut))); }
  };
  return (
    <g className="pl-doppler-repere" role="slider" tabIndex={0} aria-label="Repère du spectre" aria-valuemin={de} aria-valuemax={a} aria-valuenow={f} aria-valuetext={`${nombre(f, 2)} hertz`} onKeyDown={clavier} {...glisse}>
      <rect x={ECRAN.x} y={ECRAN.y - 14} width={ECRAN.l} height={ECRAN.h + 14} fill="transparent" />
      <line x1={x} x2={x} y1={ECRAN.y} y2={ECRAN.y + ECRAN.h} />
      <path d={`M ${r1(x - 8)} ${ECRAN.y - 14} h 16 v 9 l -8 6 l -8 -6 Z`} />
    </g>
  );
}

/**
 * L'analyseur, à dessiner dans une scène de 360 unités de large. `spectre` : l'amplitude autour de la fréquence de
 * l'émetteur (lib/commun/tp/paillasses/doppler.ts), vide sans enregistrement. `zoom` : le rang de la fenêtre ;
 * `centre` : la fréquence autour de laquelle elle se resserre ; `repere` : la fréquence du repère.
 */
export function Analyseur({ r, spectre, zoom, centre, repere, place, zoome, tient }: {
  r: ReglagesDoppler; spectre: readonly number[]; zoom: number; centre: number; repere: number; place: (f: number) => void; zoome: (zoom: number) => void; tient: (tenu: boolean) => void;
}) {
  const largeur = FENETRES[zoom], pas = pasDuRepere(zoom);
  const debut = debutDeFenetre(zoom, centre), fin = debut + largeur;
  const X = (f: number) => r1(ECRAN.x + ((f - debut) / largeur) * ECRAN.l);
  const versFrequence = (x: number) => repereDans(zoom, centre, debut + ((x - ECRAN.x) / ECRAN.l) * largeur);
  // une colonne par unité de l'écran : le bruit de fond, et le plus haut du spectre dans cette colonne
  const sommet = Math.max(1e-9, ...spectre);
  const colonnes = Array.from({ length: ECRAN.l + 1 }, (_, k) => bruit(Math.round((debut + (k / ECRAN.l) * largeur) * 4) / 4));
  spectre.forEach((amplitude, rang) => {
    const k = Math.round(((frequenceDuRang(r, rang) - debut) / largeur) * ECRAN.l);
    if (k >= 0 && k <= ECRAN.l) colonnes[k] = Math.max(colonnes[k], amplitude / sommet);
  });
  const bas = ECRAN.y + ECRAN.h - 4;
  const points = colonnes.map((c, k) => `${ECRAN.x + k},${r1(bas - c * (ECRAN.h - 26))}`).join(" ");
  const graduation = pasRond(largeur / 5);
  const traits = Array.from({ length: Math.floor(fin / graduation) - Math.ceil(debut / graduation) + 1 }, (_, i) => (Math.ceil(debut / graduation) + i) * graduation);
  const ici = Math.max(debut, Math.min(fin, repere));
  return (
    <>
      <rect className="pl-doppler-ecran" x={ECRAN.x - 6} y={ECRAN.y - 18} width={ECRAN.l + 12} height={ECRAN.h + 24} rx={8} />
      <g className="pl-doppler-grille" aria-hidden="true">
        {traits.map((f) => <line key={f} x1={X(f)} x2={X(f)} y1={ECRAN.y} y2={ECRAN.y + ECRAN.h} />)}
        {[0.25, 0.5, 0.75].map((k) => <line key={k} x1={ECRAN.x} x2={ECRAN.x + ECRAN.l} y1={r1(bas - k * (ECRAN.h - 26))} y2={r1(bas - k * (ECRAN.h - 26))} />)}
      </g>
      <g aria-hidden="true">
        {traits.map((f) => <text key={f} x={X(f)} y={ECRAN.y + ECRAN.h + 18} textAnchor={X(f) < ECRAN.x + 12 ? "start" : X(f) > ECRAN.x + ECRAN.l - 12 ? "end" : "middle"}>{nombre(f, 0)}</text>)}
        <text x={ECRAN.x + ECRAN.l} y={ECRAN.y + ECRAN.h + 31} textAnchor="end" className="pl-fort">fréquence (Hz)</text>
        <text x={ECRAN.x - 4} y={ECRAN.y - 22} className="pl-fort">amplitude</text>
      </g>
      <g role="img" aria-label={spectre.length ? "Le spectre du son enregistré : des pics autour de la fréquence de l'émetteur." : "Le spectre est vide : aucun son n'est enregistré."}>
        <path className="pl-doppler-aire" d={`M ${ECRAN.x} ${bas} L ${points.replaceAll(" ", " L ")} L ${ECRAN.x + ECRAN.l} ${bas} Z`} />
        <polyline className="pl-doppler-courbe" points={points} data-debut={debut} data-largeur={largeur} />
      </g>
      {spectre.length === 0 && <text x={ECRAN.x + ECRAN.l / 2} y={ECRAN.y + 110} textAnchor="middle" className="pl-fort" style={{ fontSize: 12 }}>Aucun son enregistré : le spectre est vide.</text>}
      <Repere x={X(ici)} f={ici} pas={pas} de={debut} a={fin} versFrequence={versFrequence} place={place} tient={tient} />
      <text x={ECRAN.x} y={ECRAN.y + ECRAN.h + 52} className="pl-doppler-lecture">repère : {nombre(ici, 2)} Hz</text>
      <text x={ECRAN.x} y={ECRAN.y + ECRAN.h + 67}>fenêtre affichée : de {court(debut)} Hz à {court(fin)} Hz</text>
      <Molette x={MOLETTE_ZOOM.x} y={MOLETTE_ZOOM.y} r={26} valeur={zoom} min={0} max={FENETRES.length - 1} pas={1} change={zoome} nom="Zoom de l'analyseur" texte={`fenêtre de ${nombre(largeur, 0)} hertz`} />
      <text x={ECRAN.x + 30} y={ECRAN.y + ECRAN.h + 86} textAnchor="middle" className="pl-fort">zoom</text>
      <text x={ECRAN.x + 68} y={ECRAN.y + ECRAN.h + 112} className="pl-fort">fenêtre de {nombre(largeur, 0)} Hz</text>
      <text x={ECRAN.x + 68} y={ECRAN.y + ECRAN.h + 126}>La molette resserre la fenêtre autour du repère.</text>
      <text x={ECRAN.x + 68} y={ECRAN.y + ECRAN.h + 139}>Le repère avance de {court(pas)} Hz à chaque pas.</text>
    </>
  );
}
