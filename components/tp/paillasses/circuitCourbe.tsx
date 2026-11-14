"use client";

// La courbe d'une acquisition, ouverte en grand : l'élève y glisse un repère qui lit l'instant et la tension d'un point,
// comme le réticule d'un logiciel d'acquisition. Deux flèches le déplacent d'un point à la fois : au doigt, un point de la
// courbe est plus fin que le geste. Il peut faire tracer la tangente à l'origine et l'asymptote.
// Rien ne lui dit où placer le repère : c'est à lui de trouver les 63 % de la tension finale.

import { nombre, nombreRelatif } from "@/lib/commun/format";
import { finDe, pasDe, tensionMesuree, type Acquisition } from "@/lib/commun/tp/paillasses/circuit";
import { Main, Scene, Touche, useGlisse, type Indication } from "../kit";
import { Graphe, reperage, type Cadre } from "./circuitPieces";

const CADRE: Cadre = { x: 44, y: 44, l: 300, h: 380 };
/** Sous le graphe : ce que lit le repère, entre ses deux flèches ; puis la touche de la tangente. */
const LECTURE = CADRE.y + CADRE.h + 58;
const FLECHES = { avant: 30, apres: 330 };
const millieme = (x: number) => Math.round(x * 1000) / 1000;

/** Un instant écrit avec les décimales que le pas d'échantillonnage demande : « 3,3 s », « 1,55 s ». */
export function ecritInstant(t: number, pas: number): string {
  const decimales = Number.isInteger(millieme(pas * 10)) ? 1 : Number.isInteger(millieme(pas * 100)) ? 2 : 3;
  return `${nombre(t, decimales)} s`;
}

export interface PropsCourbe {
  acq: Acquisition;
  /** l'instant jusqu'où la courbe est tracée */
  jusque: number;
  /** la place du repère, en secondes : toujours sur un point de la courbe */
  repere: number;
  place: (t: number) => void;
  /** vrai si la tangente à l'origine et l'asymptote sont tracées */
  tangente: boolean;
  basculeTangente: () => void;
  /** ce que le guide dit en ce moment : sa main montre alors le repère */
  guide?: Indication | null;
}

/** La courbe en grand, avec son repère. */
export function Courbe(props: PropsCourbe) {
  return (
    <Scene vue={{ x: 0, y: 0, l: 360, h: 560 }} className="pl-circuit-scene" nom="La courbe de la tension mesurée par la carte, au cours du temps">
      <TraceCourbe {...props} />
    </Scene>
  );
}

function TraceCourbe({ acq, jusque, repere, place, tangente, basculeTangente, guide }: PropsCourbe) {
  const pas = pasDe(acq);
  const fin = Math.floor(Math.min(jusque, finDe(acq)) / pas + 1e-9) * pas;
  const { bas, haut, X, Y } = reperage(CADRE, acq, acq.duree);
  /** Le point de la courbe le plus proche d'un instant. */
  const cran = (t: number) => millieme(Math.round(Math.max(0, Math.min(fin, t)) / pas) * pas);
  const vers = (x: number) => place(cran(((x - CADRE.x) / CADRE.l) * acq.duree));
  const glisse = useGlisse({ depart: (p) => vers(p.x), bouge: (p) => vers(p.x) });
  const ici = cran(repere);
  const u = tensionMesuree(acq, ici);
  // la tangente à l'origine passe par les deux premiers points ; l'asymptote est à la hauteur du dernier
  const depart = tensionMesuree(acq, 0);
  const pente = (tensionMesuree(acq, pas) - depart) / pas;
  const palier = tensionMesuree(acq, fin);
  /** La tangente s'arrête au bord du cadre. */
  const bout = Math.abs(pente) < 1e-9 ? acq.duree : Math.min(acq.duree, ((pente > 0 ? haut : bas) - depart) / pente);
  return (
    <>
      <text x={CADRE.x - 34} y={CADRE.y - 28} className="pl-fort">u (V)</text>
      <text x={CADRE.x + CADRE.l} y={CADRE.y + CADRE.h + 28} textAnchor="end" className="pl-fort">t (s)</text>
      <rect className="pl-circuit-ecran" x={CADRE.x} y={CADRE.y} width={CADRE.l} height={CADRE.h} />
      <Graphe cadre={CADRE} acq={acq} duree={acq.duree} jusque={jusque} detail>
        {tangente && (
          <g aria-hidden="true">
            <line className="pl-circuit-construction" x1={CADRE.x} x2={CADRE.x + CADRE.l} y1={Y(palier)} y2={Y(palier)} />
            <line className="pl-circuit-tangente" x1={X(0)} y1={Y(depart)} x2={X(bout)} y2={Y(depart + pente * bout)} />
          </g>
        )}
      </Graphe>
      <g className="pl-circuit-repere" role="slider" tabIndex={0} aria-label="Repère sur la courbe" aria-valuemin={0} aria-valuemax={fin} aria-valuenow={ici}
        aria-valuetext={`t = ${ecritInstant(ici, pas)}, u = ${nombreRelatif(u, 2)} V`} {...glisse}
        onKeyDown={(e) => {
          const saut = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : e.key === "PageUp" ? 10 : e.key === "PageDown" ? -10 : 0;
          if (saut) { e.preventDefault(); place(cran(ici + saut * pas)); }
          if (e.key === "Home") { e.preventDefault(); place(0); }
          if (e.key === "End") { e.preventDefault(); place(cran(fin)); }
        }}>
        <rect x={CADRE.x - 12} y={CADRE.y - 22} width={CADRE.l + 24} height={CADRE.h + 22} fill="transparent" />
        <line x1={X(ici)} x2={X(ici)} y1={CADRE.y} y2={CADRE.y + CADRE.h} />
        <rect className="pl-circuit-poignee" x={X(ici) - 10} y={CADRE.y - 16} width={20} height={16} rx={4} />
        <circle cx={X(ici)} cy={Y(u)} r={4} />
      </g>
      <text x={180} y={LECTURE + 4} textAnchor="middle" className="pl-circuit-lecture">t = {ecritInstant(ici, pas)} ; u = {nombreRelatif(u, 2)} V</text>
      <Touche x={FLECHES.avant} y={LECTURE} l={44} h={44} nom="Reculer le repère d'un point" texte="←" appuie={() => place(cran(ici - pas))} actif={ici > 0} />
      <Touche x={FLECHES.apres} y={LECTURE} l={44} h={44} nom="Avancer le repère d'un point" texte="→" appuie={() => place(cran(ici + pas))} actif={ici < fin} />
      <Touche x={180} y={LECTURE + 50} l={190} h={44} nom="Tracer la tangente à l'origine et l'asymptote" texte="Tangente à l'origine" appuie={basculeTangente} enfonce={tangente} />
      <Main indication={guide && { ...guide, main: { geste: "montrer", ou: { x: X(ici) + 3, y: CADRE.y + 4 } } }} />
    </>
  );
}
