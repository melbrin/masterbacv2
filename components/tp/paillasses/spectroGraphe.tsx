"use client";

// La paillasse Spectro : ses deux graphiques. Pour l'étalonnage, les points de la gamme, une règle que l'élève pose
// dessus en la faisant pivoter autour de l'origine, et un repère pour lire la concentration de l'échantillon. Pour le
// suivi cinétique, la courbe des relevés, un trait que l'élève pose sur le palier (la valeur finale), le trait de la
// moitié de cette valeur, que le graphique trace comme on le fait en cours, et un repère pour lire le temps.
// Rien n'est lu à la place de l'élève : c'est lui qui pose la règle, le trait du palier et les repères.

import { useState, type KeyboardEvent } from "react";
import { nombre } from "@/lib/commun/format";
import { nomSolution, type Mesure, type ReglagesSpectro } from "@/lib/commun/tp/paillasses/spectro";
import { Main, Scene, useGlisse, type Indication, type Vue } from "../kit";

const VUE: Vue = { x: 0, y: 0, l: 360, h: 470 };
const CADRE = { x: 46, y: 26, l: 286, h: 336 };
const BAS = CADRE.y + CADRE.h;
const borne = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const r2 = (n: number) => Math.round(n * 100) / 100;
/** Un écart rond entre deux graduations : 1, 2 ou 5 fois une puissance de dix, pour cinq à huit traits. */
function pasRond(max: number): number {
  const brut = max / 6;
  const puissance = 10 ** Math.floor(Math.log10(brut));
  const m = brut / puissance;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * puissance;
}
const traits = (max: number, pas: number): number[] => Array.from({ length: Math.floor(max / pas + 1e-9) + 1 }, (_, i) => Number((i * pas).toFixed(6)));

/** La grille d'un graphique, ses graduations et le nom de ses axes. */
function Grille({ xMax, xPas, yMax, yPas, xNom, yNom, xDecimales }: { xMax: number; xPas: number; yMax: number; yPas: number; xNom: string; yNom: string; xDecimales: number }) {
  return (
    <>
      {traits(yMax, yPas).map((v) => {
        const y = r2(BAS - (v / yMax) * CADRE.h);
        return <g key={v}><line className="pl-spectro-grille" x1={CADRE.x} x2={CADRE.x + CADRE.l} y1={y} y2={y} /><text x={CADRE.x - 6} y={y + 3} textAnchor="end">{nombre(v, 1)}</text></g>;
      })}
      {traits(xMax, xPas).map((v) => {
        const x = r2(CADRE.x + (v / xMax) * CADRE.l);
        return <g key={v}><line className="pl-spectro-grille" x1={x} x2={x} y1={CADRE.y} y2={BAS} /><text x={x} y={BAS + 13} textAnchor="middle">{nombre(v, xDecimales)}</text></g>;
      })}
      <path className="pl-spectro-axe" d={`M ${CADRE.x} ${CADRE.y - 6} V ${BAS} H ${CADRE.x + CADRE.l + 6}`} />
      <text x={CADRE.x - 30} y={CADRE.y - 8} className="pl-fort">{yNom}</text>
      {/* au milieu de l'axe : la poignée du bord droit, et la main du guide qui la montre, ne le cachent pas */}
      <text x={CADRE.x + CADRE.l / 2} y={BAS + 30} textAnchor="middle" className="pl-fort">{xNom}</text>
    </>
  );
}

// ---------- la droite d'étalonnage ----------

interface PropsEtalonnage {
  r: ReglagesSpectro;
  mesures: Mesure[];
  /** la pente de la règle ; null tant que l'élève ne l'a pas posée */
  pente: number | null;
  regle: (pente: number) => void;
  /** la concentration où se trouve le repère */
  repere: number;
  place: (C: number) => void;
  /** ce que le guide dit en ce moment ; la main montre alors la poignée de la règle, ou celle du repère */
  guide: Indication | null;
}

/** Le graphique de l'étalonnage : l'absorbance des solutions étalons en fonction de leur concentration. */
export function GrapheEtalonnage(props: PropsEtalonnage) {
  return (
    <Scene vue={VUE} nom="Le graphique de l'absorbance en fonction de la concentration : les points de la gamme, la règle et le repère">
      <TraceEtalonnage {...props} />
    </Scene>
  );
}

function TraceEtalonnage({ r, mesures, pente, regle, repere, place, guide }: PropsEtalonnage) {
  /** la pente pendant que l'élève fait glisser la règle : elle n'entre dans ses gestes que lorsqu'il la lâche */
  const [enCours, setEnCours] = useState<number | null>(null);
  const cMax = Math.max(...r.gamme) * 1.1;
  const aMax = Math.ceil(r.k * cMax * 1.2 * 5) / 5;
  const X = (C: number) => r2(CADRE.x + (borne(C, 0, cMax) / cMax) * CADRE.l);
  const Y = (a: number) => r2(BAS - (borne(a, 0, aMax) / aMax) * CADRE.h);
  const k = enCours ?? pente ?? 0;
  const bout = borne(k * cMax, 0, aMax);
  const penteDe = (y: number) => Math.round((borne(((BAS - y) / CADRE.h) * aMax, 0, aMax) / cMax) * 1e5) / 1e5;
  const precision = 10 ** r.decimales;
  const concentrationDe = (x: number) => Math.round(borne(((x - CADRE.x) / CADRE.l) * cMax, 0, cMax) * precision) / precision;
  const poignee = useGlisse({ depart: (p) => setEnCours(penteDe(p.y)), bouge: (p) => setEnCours(penteDe(p.y)), fin: (p) => { setEnCours(null); regle(penteDe(p.y)); } });
  const zone = useGlisse({ depart: (p) => place(concentrationDe(p.x)), bouge: (p) => place(concentrationDe(p.x)) });
  const etalons = mesures.filter((m) => /^s[1-9]$/.test(m.s));
  const echantillon = [...mesures].reverse().find((m) => m.s === "x" || m.s === "xd");
  const C = borne(repere, 0, cMax);
  const clavierRegle = (e: KeyboardEvent<SVGGElement>) => {
    const saut = e.key === "ArrowUp" || e.key === "ArrowRight" ? 0.005 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -0.005 : e.key === "PageUp" ? 0.05 : e.key === "PageDown" ? -0.05 : 0;
    if (saut) { e.preventDefault(); regle(Math.round((borne(bout + saut, 0, aMax) / cMax) * 1e5) / 1e5); }
  };
  const clavierRepere = (e: KeyboardEvent<SVGGElement>) => {
    const saut = e.key === "ArrowRight" ? 1 / precision : e.key === "ArrowLeft" ? -1 / precision : e.key === "PageUp" ? 1 : e.key === "PageDown" ? -1 : 0;
    if (saut) { e.preventDefault(); place(Math.round(borne(C + saut, 0, cMax) * precision) / precision); }
  };
  return (
    <>
      <Grille xMax={cMax} xPas={r.gamme[0] ?? pasRond(cMax)} yMax={aMax} yPas={0.2} xNom={`C (${r.unite})`} yNom="A" xDecimales={0} />
      {/* l'absorbance notée pour l'échantillon : un trait en travers du graphique */}
      {echantillon && (
        <g>
          <line className="pl-spectro-echantillon" x1={CADRE.x} x2={CADRE.x + CADRE.l} y1={Y(echantillon.lu)} y2={Y(echantillon.lu)} />
          <text x={CADRE.x + 6} y={Y(echantillon.lu) - 5} style={{ fill: "var(--vert)" }}>{nomSolution(r, echantillon.s)}</text>
        </g>
      )}
      {etalons.map((m) => {
        const c = r.gamme[Number(m.s[1]) - 1];
        return <g key={m.s}><circle className="pl-spectro-point" cx={X(c)} cy={Y(m.lu)} r={3.4} /><text x={X(c) - 6} y={Y(m.lu) - 7} textAnchor="end">{m.s.toUpperCase()}</text></g>;
      })}
      {/* le repère : on le glisse de gauche à droite sur le graphique */}
      <g role="slider" tabIndex={0} aria-label="Repère de concentration" aria-valuemin={0} aria-valuemax={r2(cMax)} aria-valuenow={C} aria-valuetext={`${nombre(C, r.decimales)} ${r.unite}`} onKeyDown={clavierRepere} {...zone}>
        <rect x={CADRE.x} y={CADRE.y} width={CADRE.l} height={CADRE.h} fill="transparent" />
        <line className="pl-spectro-repere" x1={X(C)} x2={X(C)} y1={CADRE.y} y2={BAS} />
        <rect className="pl-spectro-curseur" x={X(C) - 9} y={CADRE.y - 14} width={18} height={14} rx={4} />
      </g>
      {/* la règle : elle part de l'origine ; sa poignée, au bord droit, la fait pivoter */}
      <line className="pl-spectro-regle" x1={X(0)} y1={Y(0)} x2={X(cMax)} y2={Y(bout)} pointerEvents="none" />
      {k > 0 && <circle cx={X(C)} cy={Y(Math.min(aMax, k * C))} r={4.5} fill="none" stroke="var(--sable)" strokeWidth={1.6} pointerEvents="none" />}
      <g role="slider" tabIndex={0} aria-label="Règle : sa hauteur au bord droit du graphique" aria-valuemin={0} aria-valuemax={aMax} aria-valuenow={r2(bout)} aria-valuetext={`absorbance ${nombre(bout, 3)} pour ${nombre(cMax, 0)} ${r.unite}`} onKeyDown={clavierRegle} {...poignee}>
        <circle cx={X(cMax)} cy={Y(bout)} r={22} fill="transparent" />
        <circle className="pl-spectro-poignee-regle" cx={X(cMax)} cy={Y(bout)} r={8} />
      </g>
      <text x={180} y={BAS + 54} textAnchor="middle" className="pl-spectro-lecture">Repère : C = {nombre(C, r.decimales)} {r.unite}</text>
      <text x={180} y={BAS + 74} textAnchor="middle">{echantillon ? `Absorbance notée pour ${nomSolution(r, echantillon.s)} : ${nombre(echantillon.lu, 3)}` : "L'échantillon n'est pas encore mesuré."}</text>
      <text x={180} y={BAS + 90} textAnchor="middle">{pente === null && enCours === null ? "La règle est couchée sur l'axe : fais glisser sa poignée, à droite." : ""}</text>
      {/* la main du guide montre la poignée à prendre : à l'élève de trouver où la poser */}
      <Main indication={guide && { ...guide, main: { geste: "montrer", ou: guide.cle === "regle" ? { x: X(cMax) - 4, y: Y(bout) + 11 } : { x: X(C) + 3, y: CADRE.y + 4 } } }} />
    </>
  );
}

// ---------- la courbe d'un suivi ----------

interface PropsCinetique {
  mesures: Mesure[];
  /** l'absorbance où l'élève a posé le trait de la valeur finale ; null tant qu'il ne l'a pas posé */
  palier: number | null;
  regle: (A: number) => void;
  /** la date où se trouve le repère du temps */
  repere: number;
  place: (t: number) => void;
  /** ce que le guide dit en ce moment ; la main montre alors la poignée du trait, ou celle du repère */
  guide: Indication | null;
}

/** La courbe d'un suivi cinétique : l'absorbance relevée en fonction de la date du chronomètre. */
export function GrapheCinetique(props: PropsCinetique) {
  return (
    <Scene vue={VUE} nom="La courbe de l'absorbance en fonction du temps : les relevés, le trait de la valeur finale, sa moitié et le repère du temps">
      <TraceCinetique {...props} />
    </Scene>
  );
}

function TraceCinetique({ mesures, palier, regle, repere, place, guide }: PropsCinetique) {
  const points = [...mesures].sort((a, b) => a.date - b.date);
  const fin = Math.max(300, ...points.map((m) => m.date * 1.06));
  const tPas = pasRond(fin);
  const tMax = Math.ceil(fin / tPas) * tPas;
  const aMax = Math.max(0.4, Math.ceil(Math.max(0, ...points.map((m) => m.lu)) * 1.15 * 5) / 5);
  const X = (t: number) => r2(CADRE.x + (borne(t, 0, tMax) / tMax) * CADRE.l);
  const Y = (a: number) => r2(BAS - (borne(a, 0, aMax) / aMax) * CADRE.h);
  const dateDe = (x: number) => Math.round(borne(((x - CADRE.x) / CADRE.l) * tMax, 0, tMax));
  const absorbanceDe = (y: number) => Math.round(borne(((BAS - y) / CADRE.h) * aMax, 0, aMax) * 200) / 200;
  const zone = useGlisse({ depart: (p) => place(dateDe(p.x)), bouge: (p) => place(dateDe(p.x)) });
  const poignee = useGlisse({ depart: (p) => regle(absorbanceDe(p.y)), bouge: (p) => regle(absorbanceDe(p.y)) });
  const t = borne(repere, 0, tMax), A = borne(palier ?? 0, 0, aMax);
  const pose = palier !== null && A > 0;
  const clavierRepere = (e: KeyboardEvent<SVGGElement>) => {
    const saut = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : e.key === "PageUp" ? 10 : e.key === "PageDown" ? -10 : 0;
    if (saut) { e.preventDefault(); place(borne(t + saut, 0, tMax)); }
  };
  const clavierPalier = (e: KeyboardEvent<SVGGElement>) => {
    const saut = e.key === "ArrowUp" || e.key === "ArrowRight" ? 0.005 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -0.005 : e.key === "PageUp" ? 0.05 : e.key === "PageDown" ? -0.05 : 0;
    if (saut) { e.preventDefault(); regle(Math.round(borne(A + saut, 0, aMax) * 200) / 200); }
  };
  return (
    <>
      <Grille xMax={tMax} xPas={tPas} yMax={aMax} yPas={aMax > 1.2 ? 0.2 : 0.1} xNom="t (s)" yNom="A" xDecimales={0} />
      {points.length > 1 && <polyline className="pl-spectro-courbe" points={points.map((m) => `${X(m.date)},${Y(m.lu)}`).join(" ")} />}
      {points.map((m, i) => <circle key={i} className="pl-spectro-point" cx={X(m.date)} cy={Y(m.lu)} r={2.6} />)}
      {/* la moitié de la valeur finale : le graphique la trace dès que le trait du palier est posé */}
      {pose && (
        <g aria-hidden="true">
          <line className="pl-spectro-echantillon" x1={CADRE.x} x2={CADRE.x + CADRE.l} y1={Y(A / 2)} y2={Y(A / 2)} />
          <text x={CADRE.x + CADRE.l - 6} y={Y(A / 2) - 5} textAnchor="end" style={{ fill: "var(--vert)" }}>moitié de la valeur finale</text>
        </g>
      )}
      {/* le repère du temps : on le glisse de gauche à droite sur le graphique */}
      <g role="slider" tabIndex={0} aria-label="Repère du temps" aria-valuemin={0} aria-valuemax={tMax} aria-valuenow={t} aria-valuetext={`${nombre(t, 0)} secondes`} onKeyDown={clavierRepere} {...zone}>
        <rect x={CADRE.x} y={CADRE.y} width={CADRE.l} height={CADRE.h} fill="transparent" />
        <line className="pl-spectro-repere" x1={X(t)} x2={X(t)} y1={CADRE.y} y2={BAS} />
        <rect className="pl-spectro-curseur" x={X(t) - 9} y={CADRE.y - 14} width={18} height={14} rx={4} />
      </g>
      {pose && <circle cx={X(t)} cy={Y(A / 2)} r={4.5} fill="none" stroke="var(--sable)" strokeWidth={1.6} pointerEvents="none" />}
      {/* le trait de la valeur finale : sa poignée, au bord droit, le monte et le descend */}
      <line className="pl-spectro-regle" x1={CADRE.x} x2={CADRE.x + CADRE.l} y1={Y(A)} y2={Y(A)} pointerEvents="none" />
      <g role="slider" tabIndex={0} aria-label="Trait de la valeur finale" aria-valuemin={0} aria-valuemax={aMax} aria-valuenow={A} aria-valuetext={`absorbance ${nombre(A, 3)}`} onKeyDown={clavierPalier} {...poignee}>
        <circle cx={CADRE.x + CADRE.l} cy={Y(A)} r={22} fill="transparent" />
        <circle className="pl-spectro-poignee-regle" cx={CADRE.x + CADRE.l} cy={Y(A)} r={8} />
      </g>
      <text x={180} y={BAS + 54} textAnchor="middle" className="pl-spectro-lecture">Repère : t = {nombre(t, 0)} s</text>
      <text x={180} y={BAS + 74} textAnchor="middle">{pose ? `Valeur finale : A = ${nombre(A, 3)} ; sa moitié : ${nombre(A / 2, 3)}` : "Le trait de la valeur finale est couché sur l'axe : fais glisser sa poignée, à droite."}</text>
      <text x={180} y={BAS + 90} textAnchor="middle">{points.length === 0 ? "Aucun relevé pour le moment." : `${points.length} relevé${points.length > 1 ? "s" : ""} sur la courbe.`}</text>
      {/* la main du guide montre la poignée à prendre : à l'élève de trouver où la poser */}
      <Main indication={guide && { ...guide, main: { geste: "montrer", ou: guide.cle === "courbe-palier" ? { x: CADRE.x + CADRE.l - 4, y: Y(A) + 11 } : { x: X(t) + 3, y: CADRE.y + 4 } } }} />
    </>
  );
}
