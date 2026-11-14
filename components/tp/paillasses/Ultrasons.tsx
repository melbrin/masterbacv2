"use client";

// La paillasse « ultrasons » (décision 0012). L'élève y fait les gestes du laboratoire, à la main : il tire les câbles
// entre le banc et l'oscilloscope, tourne les molettes de sensibilité et de base de temps jusqu'à voir trois ou quatre
// périodes, place les curseurs de l'écran, fait glisser le récepteur mobile en regardant les deux courbes se décaler,
// et lit le rail à la loupe. Rien n'écrit la période ni la position à sa place : il les note dans son carnet.
// Chaque geste passe par les règles (lib/commun/tp/paillasses/ultrasons.ts) ; la liste des gestes part au serveur.
// Le guide (lib/commun/tp/paillasses/ultrasons-guide.ts) dit le prochain geste ; ici, la main le montre à sa place dans le dessin.

import { useCallback, useId, useRef, useState, type KeyboardEvent } from "react";
import { nombre } from "@/lib/commun/format";
import { BASES, CABLES, CALIBRES, DEMI_HAUTEUR, LARGEUR, RAIL, ecran, emet, hauteurs, periode, regles, type EtatUltrasons, type Prise, type ReglagesUltrasons } from "@/lib/commun/tp/paillasses/ultrasons";
import { LIGNES_DU_CARNET, prochain, type LigneUltrasons, type PasDuGuide } from "@/lib/commun/tp/paillasses/ultrasons-guide";
import type { GesteBrut, PropsPaillasse } from "@/lib/commun/tp/types";
import { Etabli, Fils, Loupe, Main, Molette, Scene, son, useGlisse, useGuide, type Borne, type Indication, type Point, type Vue } from "../kit";
import { Carnet, type LigneCarnet } from "./ultrasons-carnet";
import "./ultrasons.css";

// ---------- la place de chaque chose dans le dessin (360 de large) ----------
const VUE: Vue = { x: 0, y: -6, l: 360, h: 666 };
const DIV = 32;                                  // le côté d'une division de l'écran
const GRILLE = { x: 20, y: 14, l: LARGEUR * DIV, h: 2 * DEMI_HAUTEUR * DIV };
const MILIEU = GRILLE.y + GRILLE.h / 2;
const COMMANDES = 347;                           // la rangée des molettes et des prises de l'oscilloscope
/** Les molettes de l'oscilloscope : le dessin et la main du guide lisent les mêmes places. La main qui tourne une molette déborde d'elle : la dernière reste à distance du bord. */
const MOLETTES = { voie1: { x: 88, y: COMMANDES }, voie2: { x: 196, y: COMMANDES }, base: { x: 304, y: COMMANDES } } as const;
/** L'angle du repère d'une molette à `crans` positions, au rang donné : les mêmes angles que `Molette`. */
const angleDuRang = (rang: number, crans: number) => -135 + (rang / (crans - 1)) * 270;
const AXE = 492;                                 // la hauteur de l'émetteur et des récepteurs
const RAIL_Y = 524;                              // le dessus du rail
const PAR_MM = 2.1;                              // la largeur d'un millimètre du rail
const X = (mm: number) => 78 + mm * PAR_MM;
const EMETTEUR = 12;
const LOUPE = { x: 292, y: 606, r: 50, parMm: 6.2 };
/** La molette de réglage fin : le récepteur avance de 0,02 mm par unité de doigt. */
const FIN = { x: 20, y: 594, l: 150, h: 36, parUnite: 0.02 };
/** Pendant une lecture, le regard se rapproche de l'écran et de ses réglages, ou de la loupe. */
const VUE_ECRAN: Vue = { x: 4, y: -4, l: 352, h: 326 };
const VUE_RAIL: Vue = { x: LOUPE.x - 94, y: LOUPE.y - 54, l: 188, h: 110 };
const TEINTES = ["var(--sable)", "var(--bleu)"];
const r1 = (n: number) => Math.round(n * 10) / 10;

interface Partie { etat: EtatUltrasons; gestes: GesteBrut[] }
const CURSEURS: { ici: [number, number]; poses: [number, number] } = { ici: [2, 7], poses: [2, 7] };
/** Ajoute un geste à la liste. Un déplacement ou un réglage qui en suit un autre le remplace : la liste reste courte, et rejouée elle donne le même état. */
function ajoute(gestes: GesteBrut[], g: GesteBrut): GesteBrut[] {
  const dernier = gestes[gestes.length - 1];
  const suite = dernier !== undefined && dernier.g === g.g && (g.g === "glisser" || g.g === "base" || (g.g === "calibre" && dernier.voie === g.voie));
  return suite ? [...gestes.slice(0, -1), g] : [...gestes, g];
}

const NOMS: Record<Prise, string> = { gen: "la sortie GÉN", y1: "la voie 1", y2: "la voie 2", em: "l'émetteur", r1: "le récepteur fixe", r2: "le récepteur mobile" };
const texteBase = (rang: number) => (BASES[rang] >= 1000 ? `${nombre(BASES[rang] / 1000, 0)} ms` : `${nombre(BASES[rang], 0)} µs`);
const texteCalibre = (rang: number) => (CALIBRES[rang] >= 1 ? `${nombre(CALIBRES[rang], 0)} V` : `${nombre(CALIBRES[rang] * 1000, 0)} mV`);
/** Un nombre noté par l'élève, tel qu'il l'a écrit : deux décimales au plus. */
const ecrit = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

// ---------- le carnet de mesures ----------
type Quoi = LigneUltrasons;
const LIGNES: LigneCarnet<Quoi>[] = [
  { quoi: "periode", court: LIGNES_DU_CARNET.periode, nom: "Période du signal, lue sur l'écran", unite: "µs", exemple: "24,8", refus: "Une période s'écrit en microsecondes, avec un nombre plus grand que zéro." },
  { quoi: "depart", court: LIGNES_DU_CARNET.depart, nom: "Position de départ du récepteur mobile, lue sur le rail", unite: "cm", exemple: "2,35", refus: "Le rail est gradué de 0 à 13 cm : écris ta position en centimètres." },
  { quoi: "arrivee", court: LIGNES_DU_CARNET.arrivee, nom: "Position d'arrivée du récepteur mobile, lue sur le rail", unite: "cm", exemple: "9,80", refus: "Le rail est gradué de 0 à 13 cm : écris ta position en centimètres." },
  { quoi: "nombre", court: LIGNES_DU_CARNET.nombre, nom: "Nombre de longueurs d'onde entre tes deux positions", unite: "λ", exemple: "3", refus: "Le nombre de longueurs d'onde est un nombre entier, de 1 à 40." },
];
/** Ce que le carnet porte déjà pour une ligne ; null si rien n'est noté. */
function dejaNote(etat: EtatUltrasons, quoi: Quoi): string | null {
  if (quoi === "periode") return etat.periode ? `${ecrit(etat.periode.note)} µs` : null;
  if (quoi === "nombre") return etat.nombre === null ? null : String(etat.nombre);
  const position = quoi === "depart" ? etat.depart : etat.arrivee;
  return position ? `${nombre(position.note, 2)} cm` : null;
}

// ---------- l'écran de l'oscilloscope ----------

/** Le tracé d'une sinusoïde sur l'écran ; null quand les périodes sont trop serrées pour se dessiner une à une. */
function sinusoide(retard: number, hauteur: number, periodes: number): string | null {
  if (periodes > 40) return null;
  const n = Math.round(Math.min(800, Math.max(240, periodes * 32)));
  let d = "";
  for (let i = 0; i <= n; i++) {
    const y = MILIEU - hauteur * Math.sin(2 * Math.PI * ((i / n) * periodes - retard));
    d += `${i ? "L" : "M"}${r1(GRILLE.x + (i / n) * GRILLE.l)} ${r1(Math.max(GRILLE.y - 30, Math.min(GRILLE.y + GRILLE.h + 30, y)))}`;
  }
  return d;
}

/** La languette d'un curseur de l'écran : celle de A est en haut, celle de B en bas. Là où le doigt la prend. */
const languette = (lequel: 0 | 1, div: number): Point => ({ x: r1(GRILLE.x + div * DIV), y: lequel === 0 ? GRILLE.y + 5 : GRILLE.y + GRILLE.h - 5 });

// Un curseur vertical de l'écran : sa languette se glisse du doigt ; au clavier, les flèches et les touches Page.
// `place(div, pose)` : `pose` est vrai quand le curseur est lâché à cette place (au clavier, à chaque pas).
function Curseur({ lettre, div, haut, place, lache }: { lettre: string; div: number; haut: boolean; place: (div: number, pose: boolean) => void; lache: () => void }) {
  const prise = useRef(0);
  const x = GRILLE.x + div * DIV;
  const borne = (d: number) => Math.round(Math.max(0, Math.min(LARGEUR, d)) * 50) / 50;
  const glisse = useGlisse({ depart: (p) => { prise.current = p.x - x; }, bouge: (p) => place(borne((p.x - prise.current - GRILLE.x) / DIV), false), fin: lache });
  const y = haut ? GRILLE.y : GRILLE.y + GRILLE.h;
  const sens = haut ? 1 : -1;
  const clavier = (e: KeyboardEvent<SVGGElement>) => {
    const pas = e.key === "ArrowRight" ? 0.02 : e.key === "ArrowLeft" ? -0.02 : e.key === "PageUp" ? 0.5 : e.key === "PageDown" ? -0.5 : 0;
    if (pas) { e.preventDefault(); place(borne(div + pas), true); }
  };
  return (
    <g className="pl-ultrasons-curseur" role="slider" tabIndex={0} aria-label={`Curseur ${lettre} de l'écran`} aria-valuemin={0} aria-valuemax={LARGEUR} aria-valuenow={div}
      aria-valuetext={`${nombre(div, 2)} divisions`} onKeyDown={clavier} {...glisse}>
      <rect x={x - 22} y={haut ? y - 8 : y - 36} width={44} height={44} fill="transparent" />
      <line x1={x} x2={x} y1={GRILLE.y} y2={GRILLE.y + GRILLE.h} />
      <path d={`M ${r1(x - 8)} ${y - 6 * sens} h 16 v ${12 * sens} l -8 ${7 * sens} l -8 ${-7 * sens} Z`} />
      <text x={x} y={y + (haut ? 5.5 : 3.5)} textAnchor="middle">{lettre}</text>
    </g>
  );
}

// L'écran : le quadrillage, la trace de chaque voie, les deux curseurs et leur écart en divisions.
function Ecran({ r, etat, curseurs, place, lache }: { r: ReglagesUltrasons; etat: EtatUltrasons; curseurs: [number, number]; place: (lequel: 0 | 1, div: number, pose: boolean) => void; lache: () => void }) {
  const cadre = useId();
  const signaux = ecran(r, etat);
  const periodes = (LARGEUR * BASES[etat.base]) / periode(r);
  const dit = signaux.map((s, i) => `voie ${i + 1}, ${s ? "un signal" : "un trait plat"}`).join(" ; ");
  return (
    <g>
      <defs><clipPath id={cadre}><rect x={GRILLE.x} y={GRILLE.y} width={GRILLE.l} height={GRILLE.h} /></clipPath></defs>
      <rect className="pl-ultrasons-ecran" x={GRILLE.x - 6} y={GRILLE.y - 6} width={GRILLE.l + 12} height={GRILLE.h + 30} rx={8} />
      <g className="pl-ultrasons-grille" aria-hidden="true">
        {Array.from({ length: LARGEUR + 1 }, (_, i) => <line key={`v${i}`} className={i === LARGEUR / 2 ? "pl-ultrasons-axe" : undefined} x1={GRILLE.x + i * DIV} x2={GRILLE.x + i * DIV} y1={GRILLE.y} y2={GRILLE.y + GRILLE.h} />)}
        {Array.from({ length: 2 * DEMI_HAUTEUR + 1 }, (_, i) => <line key={`h${i}`} className={i === DEMI_HAUTEUR ? "pl-ultrasons-axe" : undefined} x1={GRILLE.x} x2={GRILLE.x + GRILLE.l} y1={GRILLE.y + i * DIV} y2={GRILLE.y + i * DIV} />)}
        {/* les petites graduations des deux axes du milieu : un cinquième de division */}
        {Array.from({ length: LARGEUR * 5 + 1 }, (_, i) => <line key={`a${i}`} className="pl-ultrasons-axe" x1={r1(GRILLE.x + (i * DIV) / 5)} x2={r1(GRILLE.x + (i * DIV) / 5)} y1={MILIEU - 2.5} y2={MILIEU + 2.5} />)}
        {Array.from({ length: 2 * DEMI_HAUTEUR * 5 + 1 }, (_, i) => <line key={`b${i}`} className="pl-ultrasons-axe" x1={GRILLE.x + GRILLE.l / 2 - 2.5} x2={GRILLE.x + GRILLE.l / 2 + 2.5} y1={r1(GRILLE.y + (i * DIV) / 5)} y2={r1(GRILLE.y + (i * DIV) / 5)} />)}
      </g>
      <g clipPath={`url(#${cadre})`} role="img" aria-label={`Écran de l'oscilloscope : ${dit}.`}>
        {signaux.map((s, i) => {
          if (!s) return <line key={i} className="pl-ultrasons-trace" x1={GRILLE.x} x2={GRILLE.x + GRILLE.l} y1={MILIEU} y2={MILIEU} stroke={TEINTES[i]} />;
          const hauteur = (s.amplitude / CALIBRES[etat.calibres[i]]) * DIV;
          const d = sinusoide(s.retard, hauteur, periodes);
          // des périodes trop serrées : l'écran montre une bande pleine
          return d ? <path key={i} className="pl-ultrasons-trace" d={d} stroke={TEINTES[i]} />
            : <rect key={i} className="pl-ultrasons-bande" x={GRILLE.x} y={r1(MILIEU - Math.max(0.85, hauteur))} width={GRILLE.l} height={r1(2 * Math.max(0.85, hauteur))} fill={TEINTES[i]} />;
        })}
      </g>
      <Curseur lettre="A" div={curseurs[0]} haut place={(d, pose) => place(0, d, pose)} lache={lache} />
      <Curseur lettre="B" div={curseurs[1]} haut={false} place={(d, pose) => place(1, d, pose)} lache={lache} />
      <g aria-hidden="true">
        <line x1={GRILLE.x + 2} x2={GRILLE.x + 14} y1={GRILLE.y + GRILLE.h + 13} y2={GRILLE.y + GRILLE.h + 13} stroke={TEINTES[0]} strokeWidth={2.4} strokeLinecap="round" />
        <text x={GRILLE.x + 18} y={GRILLE.y + GRILLE.h + 16.5}>voie 1</text>
        <line x1={GRILLE.x + 54} x2={GRILLE.x + 66} y1={GRILLE.y + GRILLE.h + 13} y2={GRILLE.y + GRILLE.h + 13} stroke={TEINTES[1]} strokeWidth={2.4} strokeLinecap="round" />
        <text x={GRILLE.x + 70} y={GRILLE.y + GRILLE.h + 16.5}>voie 2</text>
      </g>
      <text className="pl-ultrasons-lecture" x={GRILLE.x + GRILLE.l - 2} y={GRILLE.y + GRILLE.h + 17} textAnchor="end">écart des curseurs : {nombre(Math.abs(curseurs[1] - curseurs[0]), 2)} div</text>
    </g>
  );
}

// ---------- le banc ----------

/** Le milieu d'un câble posé entre deux prises, là où il se touche pour être retiré : le même calcul que `Fils`, qui le fait pendre. */
function milieuDuFil(a: Point, b: Point): Point {
  const fleche = Math.min(34, 8 + Math.hypot(b.x - a.x, b.y - a.y) * 0.16);
  return { x: r1((a.x + b.x) / 2), y: r1((a.y + b.y) / 2 + fleche / 2) };
}

/** Au clavier, les flèches déplacent le récepteur mobile d'un dixième de millimètre, les touches Page d'un millimètre. */
function auClavier(e: KeyboardEvent<SVGGElement>, x: number, bouge: (mm: number) => void) {
  const pas = e.key === "ArrowRight" || e.key === "ArrowUp" ? 0.1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -0.1 : e.key === "PageUp" ? 1 : e.key === "PageDown" ? -1 : 0;
  if (pas) { e.preventDefault(); bouge(x + pas); }
}

// Une capsule à ultrasons sur son pied : l'émetteur, ou un récepteur. `vers` : le côté de sa membrane.
function Capsule({ x, nom, vers, haut, bas }: { x: number; nom: string; vers: 1 | -1; haut: number; bas: number }) {
  return (
    <g>
      <path className="pl-verre" d={`M ${x} ${AXE - 12} V ${haut} M ${x} ${AXE + 12} V ${bas}`} />
      <rect className="pl-ultrasons-capsule" x={x - 10} y={AXE - 12} width={20} height={24} rx={5} />
      <path d={`M ${x + vers * 10} ${AXE - 8} v 16`} stroke="var(--cuivre)" strokeWidth={3} strokeLinecap="round" />
      <text x={x - vers} y={AXE + 3.5} textAnchor="middle" className="pl-fort">{nom}</text>
    </g>
  );
}

// Le récepteur mobile : son corps se glisse le long du rail.
function Mobile({ x, bouge }: { x: number; bouge: (mm: number) => void }) {
  const prise = useRef(0);
  const ici = r1(X(x));
  const glisse = useGlisse({ depart: (p) => { prise.current = p.x - ici; }, bouge: (p) => bouge((p.x - prise.current - X(0)) / PAR_MM) });
  return (
    <g className="pl-ultrasons-mobile" role="slider" tabIndex={0} aria-label="Récepteur mobile, sur le rail" aria-valuemin={RAIL.min} aria-valuemax={RAIL.max} aria-valuenow={Math.round(x)}
      aria-valuetext={`vers ${nombre(x / 10, 0)} cm`} onKeyDown={(e) => auClavier(e, x, bouge)} {...glisse}>
      <rect x={ici - 22} y={AXE - 14} width={44} height={50} fill="transparent" />
      <Capsule x={ici} nom="R2" vers={-1} haut={AXE - 30} bas={RAIL_Y - 12} />
      <rect x={ici - 15} y={RAIL_Y - 12} width={30} height={10} rx={3} fill="var(--carte)" stroke="var(--encre)" strokeWidth={1.2} />
      <path d={`M ${ici - 4} ${RAIL_Y - 2} h 8 l -4 6 Z`} fill="var(--cuivre)" />
    </g>
  );
}

// La molette de réglage fin : le doigt y glisse, et le récepteur mobile avance cinquante fois moins vite que lui.
function ReglageFin({ x, bouge }: { x: number; bouge: (mm: number) => void }) {
  const depart = useRef({ doigt: 0, x: 0 });
  const glisse = useGlisse({ depart: (p) => { depart.current = { doigt: p.x, x }; }, bouge: (p) => bouge(depart.current.x + (p.x - depart.current.doigt) * FIN.parUnite) });
  // les crans défilent avec le doigt
  const decale = (x / FIN.parUnite) % 7.5;
  const crans = Array.from({ length: 20 }, (_, i) => ({ i, d: (i * 7.5 + decale) % FIN.l })).filter((c) => c.d > 5 && c.d < FIN.l - 5);
  return (
    <g className="pl-ultrasons-fin" role="slider" tabIndex={0} aria-label="Réglage fin du récepteur mobile" aria-valuemin={RAIL.min} aria-valuemax={RAIL.max} aria-valuenow={Math.round(x)}
      aria-valuetext={`vers ${nombre(x / 10, 0)} cm`} onKeyDown={(e) => auClavier(e, x, bouge)} {...glisse}>
      <rect x={FIN.x} y={FIN.y - 4} width={FIN.l} height={FIN.h + 8} fill="transparent" />
      <rect className="pl-ultrasons-molette" x={FIN.x} y={FIN.y} width={FIN.l} height={FIN.h} rx={8} />
      {crans.map((c) => <line key={c.i} x1={r1(FIN.x + c.d)} x2={r1(FIN.x + c.d)} y1={FIN.y + 6} y2={FIN.y + FIN.h - 6} />)}
    </g>
  );
}

// La loupe posée sur le rail, sous le repère du récepteur mobile : le rail y défile quand le récepteur glisse.
function LoupeRail({ x }: { x: number }) {
  const { x: cx, y: cy, r, parMm } = LOUPE;
  const vus = Math.ceil(r / parMm) + 1;
  const traits = Array.from({ length: 2 * vus + 1 }, (_, i) => Math.round(x) - vus + i).filter((m) => m >= RAIL.de && m <= RAIL.a);
  const place = (m: number) => r1(cx + (m - x) * parMm);
  return (
    <Loupe x={cx} y={cy} r={r} nom="Loupe sur le rail, sous le repère du récepteur mobile">
      <rect x={Math.max(cx - r, place(RAIL.de) - 14)} y={cy - 6} width={2 * r + 28} height={r + 6} fill="var(--carte-2)" />
      <g className="pl-echelle">
        {traits.map((m) => (
          <g key={m}>
            <line x1={place(m)} x2={place(m)} y1={cy - 6} y2={cy - 6 + (m % 10 === 0 ? 20 : m % 5 === 0 ? 14 : 9)} strokeWidth={m % 10 === 0 ? 1.3 : 0.8} />
            {m % 10 === 0 && <text x={place(m)} y={cy + 26} textAnchor="middle" className="pl-loupe-chiffre">{m / 10}</text>}
          </g>
        ))}
      </g>
      {/* le chariot du récepteur et son repère, en face d'une graduation */}
      <rect x={cx - 40} y={cy - r} width={80} height={r - 16} fill="var(--carte)" stroke="var(--encre)" strokeWidth={1.2} />
      <path d={`M ${cx - 7} ${cy - 16} h 14 l -7 10 Z`} fill="var(--cuivre)" />
      <line className="pl-repere" x1={cx} x2={cx} y1={cy - 8} y2={cy + 10} />
    </Loupe>
  );
}

// ---------- la paillasse ----------

export default function Ultrasons({ reglages: r, protocole, attente, fini }: PropsPaillasse<ReglagesUltrasons>) {
  const [partie, setPartie] = useState<Partie>(() => ({ etat: regles.depart(r), gestes: [] }));
  const [message, setMessage] = useState("Ta paillasse est prête. Le protocole est en haut de l'écran.");
  /** les deux curseurs de l'écran : là où ils sont, et là où l'élève les a lâchés (ce que le guide regarde) */
  const [curseurs, setCurseurs] = useState<{ ici: [number, number]; poses: [number, number] }>(CURSEURS);
  const guide = useGuide();
  /** le carnet de mesures : fermé, ouvert sur ses lignes, ou en train d'écrire une lecture */
  const [carnet, setCarnet] = useState<"ferme" | "ouvert" | Quoi>("ferme");
  const { etat, gestes } = partie;

  const agit = useCallback((g: GesteBrut) => setPartie((p) => {
    const suite = regles.geste(r, p.etat, g);
    return suite === p.etat ? p : { etat: suite, gestes: ajoute(p.gestes, g) };
  }), [r]);

  // ----- les câbles -----
  const fixe = r1(X(r.fixe));
  const bornes: Borne[] = [
    { id: "gen", x: 30, y: COMMANDES, nom: "la sortie GÉN de l'oscilloscope", teinte: "rouge" },
    { id: "y1", x: 134, y: COMMANDES, nom: "l'entrée de la voie 1" },
    { id: "y2", x: 242, y: COMMANDES, nom: "l'entrée de la voie 2" },
    { id: "em", x: EMETTEUR, y: AXE - 34, nom: "l'émetteur", teinte: "rouge" },
    { id: "r1", x: fixe, y: RAIL_Y + 6, nom: "le récepteur fixe" },
    { id: "r2", x: r1(X(etat.x)), y: AXE - 36, nom: "le récepteur mobile" },
  ];
  const relie = (a: string, b: string) => {
    const g: GesteBrut = { g: "relier", a, b };
    const suite = regles.geste(r, etat, g);
    if (suite === etat) { setMessage(etat.fils.length >= CABLES ? "Il n'y a plus de câble. Touche un câble posé pour le retirer." : "Ces deux prises ne se relient pas."); return; }
    agit(g);
    const avant = hauteurs(r, etat), apres = hauteurs(r, suite);
    const arrive = ([1, 2] as const).filter((voie) => avant[voie - 1] === 0 && apres[voie - 1] > 0);
    setMessage(`Câble posé entre ${NOMS[a as Prise]} et ${NOMS[b as Prise]}.${emet(suite) && !emet(etat) ? " L'émetteur est alimenté : il émet." : ""}${arrive.length ? ` Un signal arrive sur la voie ${arrive.join(" et la voie ")}.` : ""}`);
  };
  const retire = (a: string, b: string) => { agit({ g: "retirer", a, b }); setMessage(`Câble retiré entre ${NOMS[a as Prise]} et ${NOMS[b as Prise]}.`); };

  // ----- les molettes de l'oscilloscope -----
  const regleBase = (v: number) => { agit({ g: "base", v }); setMessage(`Base de temps : ${texteBase(v)} par division.`); };
  const regleCalibre = (voie: 1 | 2, v: number) => {
    const g: GesteBrut = { g: "calibre", voie, v };
    const h = hauteurs(r, regles.geste(r, etat, g))[voie - 1];
    agit(g);
    setMessage(`Voie ${voie} : ${texteCalibre(v)} par division. ${h === 0 ? "Aucun signal n'arrive sur cette voie." : h > DEMI_HAUTEUR ? "Le signal sort de l'écran." : h < 0.3 ? "Le signal est presque un trait plat." : "Le signal tient dans l'écran."}`);
  };

  // ----- le récepteur mobile -----
  const glisseMobile = (mm: number) => {
    const x = Math.round(Math.max(RAIL.min, Math.min(RAIL.max, mm)) * 10) / 10;
    if (x === etat.x) return;
    agit({ g: "glisser", x });
    if (x === RAIL.min || x === RAIL.max) setMessage("Le récepteur mobile est au bout de sa course.");
  };

  // ----- le carnet -----
  const note = (quoi: Quoi, v: number) => {
    const ligne = LIGNES.find((l) => l.quoi === quoi)!;
    const g: GesteBrut = { g: "noter", quoi, v };
    setCarnet("ferme");
    if (regles.geste(r, etat, g) === etat) { setMessage(ligne.refus); son("faux"); return; }
    agit(g);
    setMessage(`Noté dans ton carnet. ${ligne.court} : ${ecrit(v)}${quoi === "nombre" ? "" : ` ${ligne.unite}`}.`);
    son("bip");
  };
  const toutRecommencer = () => {
    setPartie({ etat: regles.depart(r), gestes: [] });
    setCurseurs(CURSEURS);
    setCarnet("ferme");
    setMessage("La paillasse est remise comme au début.");
  };

  const placeCurseur = (lequel: 0 | 1, div: number, pose: boolean) => setCurseurs((c) => {
    const ici: [number, number] = lequel === 0 ? [div, c.ici[1]] : [c.ici[0], div];
    return { ici, poses: pose ? ici : c.poses };
  });

  // ----- le guide : le prochain geste, et où la main le montre -----
  const pas: PasDuGuide | null = guide.actif ? prochain(r, etat, { curseurs: curseurs.poses, carnet }) : null;
  const prise = (id: Prise): Point => { const b = bornes.find((borne) => borne.id === id)!; return { x: b.x, y: b.y }; };
  /** là où le doigt prend le récepteur mobile : sur son corps, sous la prise du câble */
  const corps: Point = { x: r1(X(etat.x)), y: AXE + 6 };
  const laMain = (p: PasDuGuide): Indication["main"] => {
    switch (p.geste) {
      case "cable": return { geste: "glisser", de: prise(p.de), vers: prise(p.vers) };
      case "decabler": return { geste: "toucher", ou: milieuDuFil(prise(p.a), prise(p.b)) };
      case "tourner": {
        const crans = p.molette === "base" ? BASES.length : CALIBRES.length;
        const rang = p.molette === "base" ? etat.base : etat.calibres[p.molette === "voie1" ? 0 : 1];
        return { geste: "tourner", ou: MOLETTES[p.molette], de: angleDuRang(rang, crans), a: angleDuRang(p.vers, crans), r: 30 };
      }
      case "curseur": {
        const de = languette(p.lequel, curseurs.ici[p.lequel]);
        return { geste: "glisser", de, vers: { x: r1(GRILLE.x + p.vers * DIV), y: de.y } };
      }
      // un geste lent, que le guide arrête : la main montre le sens, sur le récepteur ou sur la molette de réglage fin
      case "glisser": {
        const de = p.quoi === "mobile" ? corps : { x: FIN.x + FIN.l / 2 - p.sens * 24, y: FIN.y + FIN.h / 2 };
        return { geste: "glisser", de, vers: { x: Math.max(14, Math.min(346, de.x + p.sens * 48)), y: de.y } };
      }
      case "amener": return { geste: "glisser", de: corps, vers: { x: r1(X(p.vers)), y: corps.y } };
      // une touche du bas, une ligne du carnet, une lecture : rien à montrer dans la scène
      default: return undefined;
    }
  };
  const indication: Indication | null = pas && { cle: pas.cle, texte: pas.texte, etape: pas.etape, main: laMain(pas), appel: pas.geste === "bouton" && pas.bouton === "fini" };
  /** la touche du bas que le guide met en avant */
  const vise = (bouton: string) => (pas?.geste === "bouton" && pas.bouton === bouton ? " pl-vise" : "");

  const saisie = carnet !== "ferme";
  const notees = LIGNES.filter((l) => dejaNote(etat, l.quoi) !== null).length;
  const outils = saisie ? (
    <Carnet lignes={LIGNES} ouvert={carnet === "ouvert" ? null : carnet} note={(quoi) => dejaNote(etat, quoi)} ecris={(quoi) => setCarnet(quoi ?? "ouvert")} valide={note} ferme={() => setCarnet("ferme")}
      vise={pas?.geste === "ligne" ? pas.ligne : pas?.geste === "bouton" && pas.bouton === "fermer" ? "fermer" : null} />
  ) : (
    <button type="button" className={`btn btn-ligne${vise("carnet")}`} onClick={() => setCarnet("ouvert")}>Carnet de mesures ({notees} sur {LIGNES.length})</button>
  );
  const vue = carnet === "periode" ? VUE_ECRAN : carnet === "depart" || carnet === "arrivee" ? VUE_RAIL : VUE;

  return (
    <Etabli titre="Ultrasons" protocole={protocole} message={message} attente={attente} fini={() => fini(gestes)} recommence={toutRecommencer} outils={outils} saisie={saisie} indication={indication}>
      <Scene vue={vue} nom="La paillasse des ultrasons : un oscilloscope à deux voies, un émetteur, un récepteur fixe et un récepteur mobile sur un rail gradué">
        {/* l'oscilloscope : son écran, ses molettes, ses prises */}
        <rect className="pl-ultrasons-boitier" x={4} y={0} width={352} height={381} rx={14} />
        <Ecran r={r} etat={etat} curseurs={curseurs.ici} place={placeCurseur} lache={() => setCurseurs((c) => (c.poses === c.ici ? c : { ici: c.ici, poses: c.ici }))} />
        <text x={30} y={317} textAnchor="middle" className="pl-fort">GÉN</text>
        <text x={111} y={305} textAnchor="middle">voie 1</text>
        <text x={111} y={317} textAnchor="middle" className="pl-fort">{texteCalibre(etat.calibres[0])}/div</text>
        <text x={219} y={305} textAnchor="middle">voie 2</text>
        <text x={219} y={317} textAnchor="middle" className="pl-fort">{texteCalibre(etat.calibres[1])}/div</text>
        <text x={MOLETTES.base.x} y={305} textAnchor="middle">base de temps</text>
        <text x={MOLETTES.base.x} y={317} textAnchor="middle" className="pl-fort">{texteBase(etat.base)}/div</text>
        <Molette x={MOLETTES.voie1.x} y={MOLETTES.voie1.y} r={24} valeur={etat.calibres[0]} min={0} max={CALIBRES.length - 1} pas={1} change={(v) => regleCalibre(1, v)} nom="Sensibilité de la voie 1" texte={`${texteCalibre(etat.calibres[0])} par division`} />
        <Molette x={MOLETTES.voie2.x} y={MOLETTES.voie2.y} r={24} valeur={etat.calibres[1]} min={0} max={CALIBRES.length - 1} pas={1} change={(v) => regleCalibre(2, v)} nom="Sensibilité de la voie 2" texte={`${texteCalibre(etat.calibres[1])} par division`} />
        <Molette x={MOLETTES.base.x} y={MOLETTES.base.y} r={24} valeur={etat.base} min={0} max={BASES.length - 1} pas={1} change={regleBase} nom="Base de temps" texte={`${texteBase(etat.base)} par division`} />

        {/* le banc : le rail gradué, l'émetteur, le récepteur fixe */}
        <line x1={0} x2={360} y1={RAIL_Y + 25} y2={RAIL_Y + 25} stroke="var(--discret)" strokeWidth={1} opacity={0.6} />
        <rect className="pl-ultrasons-rail" x={r1(X(RAIL.de) - 5)} y={RAIL_Y} width={r1(X(RAIL.a) - X(RAIL.de) + 12)} height={24} rx={2} />
        <g className="pl-ultrasons-traits" aria-hidden="true">
          {Array.from({ length: RAIL.a - RAIL.de + 1 }, (_, m) => <line key={m} x1={r1(X(m))} x2={r1(X(m))} y1={RAIL_Y} y2={RAIL_Y + (m % 10 === 0 ? 8 : m % 5 === 0 ? 5.5 : 3.5)} strokeWidth={m % 10 === 0 ? 1 : 0.6} />)}
          {Array.from({ length: (RAIL.a - RAIL.de) / 10 + 1 }, (_, c) => <text key={c} x={r1(X(c * 10))} y={RAIL_Y + 19} textAnchor="middle">{c}</text>)}
        </g>
        <text x={r1(X(RAIL.de))} y={RAIL_Y + 38}>rail gradué en centimètres</text>
        <Capsule x={EMETTEUR} nom="E" vers={1} haut={AXE - 28} bas={RAIL_Y + 25} />
        {emet(etat) && (
          <g aria-hidden="true">
            <path className="pl-ultrasons-onde" d={`M ${EMETTEUR + 13} ${AXE - 5} q 2.5 5 0 10`} />
            <path className="pl-ultrasons-onde" d={`M ${EMETTEUR + 16.5} ${AXE - 7.5} q 3.5 7.5 0 15`} />
            <path className="pl-ultrasons-onde" d={`M ${EMETTEUR + 20} ${AXE - 10} q 4.5 10 0 20`} />
          </g>
        )}
        <Capsule x={fixe} nom="R1" vers={-1} haut={AXE - 12} bas={RAIL_Y + 25} />

        {/* le réglage fin et la loupe */}
        <text x={FIN.x} y={FIN.y - 8}>réglage fin de R2 : glisse le doigt</text>
        <ReglageFin x={etat.x} bouge={glisseMobile} />
        <text x={FIN.x} y={LOUPE.y + LOUPE.r - 4}>Loupe : le rail, sous le repère de R2</text>
        <LoupeRail x={etat.x} />

        {/* les câbles, puis le récepteur mobile : ce qui se déplace se dessine en dernier */}
        <Fils bornes={bornes} fils={etat.fils} relie={relie} retire={retire} />
        <Mobile x={etat.x} bouge={glisseMobile} />
        {/* la main du guide, par-dessus tout le reste */}
        <Main indication={indication} />
      </Scene>
    </Etabli>
  );
}
