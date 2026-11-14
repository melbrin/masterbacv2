"use client";

// La paillasse « diffraction » (décision 0012) : un laser, un porte-diapositive, un écran sur un rail gradué. L'élève
// fixe le laser sur son support avant de l'allumer, glisse une diapositive de la boîte dans le support, place l'écran
// le long du rail, puis mesure la figure avec deux curseurs qu'il glisse sur la graduation de l'écran. En haut, ce
// qu'il voit sur l'écran : la figure, avec la vraie loi d'intensité. Rien n'écrit la mesure à sa place.
// Chaque geste passe par les règles (lib/commun/tp/paillasses/diffraction.ts) ; la liste des gestes part au serveur.
// Le guide (lib/commun/tp/paillasses/diffraction-guide.ts) dit le prochain geste ; ici, la main le montre à sa place dans le dessin.

import { useCallback, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { nombre } from "@/lib/commun/format";
import { CENTRE, ECRAN_MIN, LARGEUR, diapositive, figureVisible, intensite, regles, tacheCentrale, type Diapositive, type EtatDiffraction, type ReglagesDiffraction } from "@/lib/commun/tp/paillasses/diffraction";
import { mesure, pose, prochain, type PasDiffraction } from "@/lib/commun/tp/paillasses/diffraction-guide";
import type { GesteBrut, PropsPaillasse } from "@/lib/commun/tp/types";
import { Cible, Echelle, Etabli, Main, Manipulation, Objet, Poussoir, Releve, Scene, son, useGlisse, useGuide, type Indication, type Point, type Vue } from "../kit";
import { Cavalier, LoupeRail } from "./optiqueRail";
import "./diffraction.css";

// ---------- la place de chaque chose dans le dessin (360 de large) ----------
const VUE: Vue = { x: 0, y: -46, l: 360, h: 566 };
/** L'écran vu de face : sa graduation va de 0 à 120 mm, à 2,8 unités par millimètre. */
const FACE = { x: 4, y: -26, l: 352, h: 118 };
const ECHELLE = { x: 12, y: 58, parMm: 2.8 };
/** La figure : une bande horizontale, à la hauteur du faisceau. */
const BANDE = { y: 21, h: 21 };
const AXE = 262;
const RAIL = { x: 86, y: 318, l: 260 };
const LOUPE = { x: 300, y: 164, r: 44 };
/** Pendant la lecture de la distance, le regard se rapproche de la loupe : son nom au-dessus, rien d'autre autour. */
const VUE_LOUPE: Vue = { x: LOUPE.x - 62, y: LOUPE.y - 70, l: 124, h: 116 };
/** Le laser : fixé sur son support au bout du banc, ou posé sur la table. */
const SUPPORT = { x: 40, y: AXE };
const TABLE = { x: 74, y: 426 };
const BOITE = { x: 146, y: 374, l: 206, h: 128 };
/** La hauteur de l'onglet de chaque curseur : le premier se prend par le haut de l'écran, le second par le bas. */
const ONGLET: Record<1 | 2, number> = { 1: FACE.y + 8.5, 2: FACE.y + FACE.h + 8.5 };
/** De près, pendant une mesure, le curseur suit le doigt cinq fois plus doucement : c'est le réglage fin. */
const FINESSE = 0.2;

interface Partie { etat: EtatDiffraction; gestes: GesteBrut[] }
/** Ce que l'élève est en train de noter : l'écart entre ses curseurs (puis le nombre d'interfranges), ou la distance de l'écran. */
type Saisie = { genre: "mesure"; vue: Vue; ecart: number | null } | { genre: "distance" };
/**
 * Ce que le doigt tient : l'écran sur le rail, la loupe, ou un curseur. `fige` : la consigne du guide au moment où le
 * doigt s'est posé, gardée telle quelle jusqu'à ce qu'il se lève.
 */
interface Tenue { quoi: "ecran" | "loupe" | 1 | 2; fige: { pas: PasDiffraction; indication: Indication } | null }

const r2 = (n: number) => Math.round(n * 100) / 100;
const borne = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const Maj = (texte: string) => texte.charAt(0).toUpperCase() + texte.slice(1);
const X = (mm: number) => r2(ECHELLE.x + mm * ECHELLE.parMm);
/** Ajoute un geste à la liste. Deux déplacements à la suite de l'écran, ou du même curseur, n'en font qu'un : seul le dernier compte. */
function ajoute(gestes: GesteBrut[], g: GesteBrut): GesteBrut[] {
  const dernier = gestes[gestes.length - 1];
  const meme = dernier !== undefined && dernier.g === g.g && (g.g === "ecran" || (g.g === "curseur" && dernier.k === g.k));
  return meme ? [...gestes.slice(0, -1), g] : [...gestes, g];
}
/** La couleur du faisceau : violet, bleu, vert, jaune ou rouge. Deux rouges voisins ont la même : l'œil ne les distingue pas. */
function couleurLaser(lambda: number): string {
  if (lambda < 450) return "#9A62FF";
  if (lambda < 495) return "#3D8BFF";
  if (lambda < 570) return "#35E36A";
  return lambda < 605 ? "#FFC83D" : "#FF3526";
}

// ---------- les dessins ----------

/** Une diapositive vue de face, centrée : sa monture, sa fenêtre, et ce qui y est gravé. */
function Monture({ d }: { d: Diapositive }) {
  return (
    <>
      <rect className="pl-diffraction-monture" x={-18} y={-15} width={36} height={30} rx={3} />
      <rect className={`pl-diffraction-fenetre${d.genre === "fil" ? " est-claire" : ""}`} x={-10} y={-9} width={20} height={18} rx={1.5} />
      {d.genre === "young"
        ? <path className="pl-diffraction-trait" d="M -2.2 -6 V 6 M 2.2 -6 V 6" />
        : <path className={`pl-diffraction-trait${d.genre === "fil" ? " est-sombre" : ""}`} d="M 0 -6.5 V 6.5" />}
    </>
  );
}

/** Le laser, centré : son boîtier, son nez, d'où sort le faisceau vers la droite. */
function Laser() {
  return (
    <>
      <rect className="pl-diffraction-laser" x={-31} y={-9} width={56} height={18} rx={4} />
      <rect className="pl-diffraction-nez" x={25} y={-4} width={6} height={8} rx={1} />
      <text className="pl-diffraction-marque" x={-3} y={2.5} textAnchor="middle">LASER</text>
    </>
  );
}

// La figure sur l'écran : une bande dont l'éclat suit l'intensité lumineuse, point par point.
function Figure({ lambda, d, distance }: { lambda: number; d: Diapositive | null; distance: number }) {
  const id = useId();
  const couleur = couleurLaser(lambda);
  // un point tous les quarts d'unité : assez fin pour les franges les plus serrées, même quand le regard se rapproche
  const pas = 0.25;
  // les points ne se recalculent que si la figure change : glisser un curseur ne les refait pas
  const points = useMemo(() => {
    if (!d) return [];
    const n = Math.round((LARGEUR * ECHELLE.parMm) / pas);
    return Array.from({ length: n + 1 }, (_, k) => {
      const mm = (k * pas) / ECHELLE.parMm - CENTRE;
      // l'œil sature au centre et devine encore les taches faibles : l'éclat dessiné monte plus vite que l'intensité
      const eclat = Math.min(1, (3 * intensite(lambda, d, distance, mm)) ** 0.55);
      return <stop key={k} offset={k / n} stopColor={couleur} stopOpacity={r2(eclat)} />;
    });
  }, [lambda, d, distance, couleur]);
  if (!d) {
    return (
      <g className="pl-diffraction-point">
        <circle cx={X(CENTRE)} cy={BANDE.y} r={7} fill={couleur} opacity={0.25} />
        <circle cx={X(CENTRE)} cy={BANDE.y} r={2.6} fill={couleur} />
      </g>
    );
  }
  return (
    <g className="pl-diffraction-point">
      <defs>
        <linearGradient id={`${id}i`} gradientUnits="userSpaceOnUse" x1={X(0)} x2={X(LARGEUR)} y1={0} y2={0}>
          {points}
        </linearGradient>
        <linearGradient id={`${id}v`} x1={0} x2={0} y1={0} y2={1}>
          <stop offset={0} stopColor="#fff" stopOpacity={0} /><stop offset={0.3} stopColor="#fff" stopOpacity={1} />
          <stop offset={0.7} stopColor="#fff" stopOpacity={1} /><stop offset={1} stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <mask id={`${id}m`} maskUnits="userSpaceOnUse" x={X(0)} y={BANDE.y - BANDE.h} width={LARGEUR * ECHELLE.parMm} height={2 * BANDE.h}>
          <rect x={X(0)} y={BANDE.y - BANDE.h} width={LARGEUR * ECHELLE.parMm} height={2 * BANDE.h} fill={`url(#${id}v)`} />
        </mask>
      </defs>
      <rect x={X(0)} y={BANDE.y - BANDE.h} width={LARGEUR * ECHELLE.parMm} height={2 * BANDE.h} fill={`url(#${id}i)`} mask={`url(#${id}m)`} />
      {/* derrière un fil, le faisceau qui n'a pas été dévié reste au centre */}
      {d.genre === "fil" && <circle cx={X(CENTRE)} cy={BANDE.y} r={2.2} fill="#FFF" opacity={0.7} />}
    </g>
  );
}

// Un curseur de l'écran : un trait fin que l'élève glisse sur la graduation, par son onglet. Au clavier : les flèches
// pour un dixième de millimètre, « page précédente » et « page suivante » pour un millimètre. `finesse` : ce dont le
// curseur avance quand le doigt avance d'une unité (1 : il suit le doigt ; moins : réglage fin).
function Curseur({ rang, valeur, deplace, tenu, finesse = 1 }: { rang: 1 | 2; valeur: number; deplace: (mm: number) => void; tenu: (tenu: boolean) => void; finesse?: number }) {
  const prise = useRef({ x: 0, valeur: 0 });
  const x = X(valeur);
  const reglages = useGlisse({
    depart: (p) => { prise.current = { x: p.x, valeur }; tenu(true); },
    bouge: (p) => deplace(prise.current.valeur + ((p.x - prise.current.x) * finesse) / ECHELLE.parMm),
    fin: () => tenu(false),
  });
  const clavier = (e: KeyboardEvent<SVGGElement>) => {
    const pas = e.key === "ArrowRight" || e.key === "ArrowUp" ? 0.1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -0.1 : e.key === "PageUp" ? 1 : e.key === "PageDown" ? -1 : 0;
    if (!pas) return;
    e.preventDefault();
    deplace(Math.round((valeur + pas) * 20) / 20);
  };
  // le premier curseur se prend par le haut de l'écran, le second par le bas : leurs onglets ne se gênent jamais
  const haut = rang === 1;
  return (
    <g className="pl-diffraction-curseur" role="slider" tabIndex={0} aria-label={`Curseur ${rang} de l'écran`} aria-orientation="horizontal" aria-valuemin={0} aria-valuemax={LARGEUR}
      aria-valuenow={Math.round(valeur)} aria-valuetext={`vers ${Math.round(valeur)} mm sur la graduation`} onKeyDown={clavier} {...reglages}>
      <rect x={x - 22} y={haut ? -46 : FACE.y + FACE.h - 20} width={44} height={44} fill="transparent" />
      <line x1={x} x2={x} y1={haut ? FACE.y + 14 : BANDE.y - BANDE.h + 4} y2={haut ? ECHELLE.y + 9 : FACE.y + FACE.h + 3} />
      <rect className="pl-diffraction-onglet" x={x - 7} y={ONGLET[rang] - 6.5} width={14} height={13} rx={3} />
      <text x={x} y={ONGLET[rang] + 3.5} textAnchor="middle">{rang}</text>
    </g>
  );
}

// ---------- la paillasse ----------

export default function Diffraction({ reglages: r, protocole, attente, fini }: PropsPaillasse<ReglagesDiffraction>) {
  const young = r.but.genre === "young";
  const guide = useGuide();
  const [partie, setPartie] = useState<Partie>(() => ({ etat: regles.depart(r), gestes: [] }));
  const [message, setMessage] = useState("Ta paillasse est prête. Le protocole est en haut de l'écran.");
  const [saisie, setSaisie] = useState<Saisie | null>(null);
  const [tenue, setTenue] = useState<Tenue | null>(null);
  const { etat, gestes } = partie;

  const agit = useCallback((g: GesteBrut) => setPartie((p) => {
    const suite = regles.geste(r, p.etat, g);
    return suite === p.etat ? p : { etat: suite, gestes: ajoute(p.gestes, g) };
  }), [r]);
  /** Le message du bas : ce qui vient de se passer. Le conseil pour la suite ne s'ajoute que si le guide est coupé : sinon c'est lui qui le dit. */
  const dit = (fait: string, conseil?: string) => setMessage(conseil && !guide.actif ? `${fait} ${conseil}` : fait);

  const parCm = RAIL.l / r.rail;
  const XR = (cm: number) => r2(RAIL.x + cm * parCm);
  const enPlace = diapositive(r, etat.diapo);
  const visible = figureVisible(etat);
  const couleur = couleurLaser(r.lambda);
  const danger = etat.allume && !etat.fixe;

  // ----- où se trouve chaque chose : le dessin et la main du guide lisent les mêmes places -----
  const laser = etat.fixe ? SUPPORT : TABLE;
  /** le bouton du laser, à côté de lui */
  const bouton: Point = etat.fixe ? { x: SUPPORT.x, y: AXE - 44 } : { x: TABLE.x, y: TABLE.y + 50 };
  const porte: Point = { x: RAIL.x, y: AXE };
  /** la case de chaque diapositive, dans la boîte : le centre de sa monture */
  const cases = new Map<string, Point>(r.boite.map((d, i) => [d.id, { x: r2(BOITE.x + (BOITE.l * ((i % 3) + 0.5)) / 3), y: BOITE.y + 24 + 62 * Math.floor(i / 3) }]));
  /** l'onglet d'un curseur : là où on le prend */
  const onglet = (k: 1 | 2): Point => ({ x: X(etat.curseurs[k - 1]), y: ONGLET[k] });

  // ----- le guide : le prochain geste, et où la main le montre -----
  const lecture = saisie?.genre === "distance" ? "distance" : saisie?.genre === "mesure" ? (saisie.ecart === null ? "ecart" : "nombre") : null;
  /** le curseur que le doigt tient, de près : le guide lui dit quand se lever */
  const curseurTenu = lecture === "ecart" && (tenue?.quoi === 1 || tenue?.quoi === 2) ? tenue.quoi : null;
  const calcule: PasDiffraction | null = guide.actif ? prochain(r, etat, { saisie: lecture, tenu: curseurTenu }) : null;
  const laMain = (p: PasDiffraction): Indication["main"] => {
    switch (p.geste) {
      case "laser": return { geste: "toucher", ou: bouton };
      case "fixer": return { geste: "glisser", de: TABLE, vers: SUPPORT };
      case "diapo": { const de = cases.get(p.id); return de && { geste: "glisser", de, vers: porte }; }
      case "ecran": return { geste: "glisser", de: { x: XR(etat.ecran), y: AXE }, vers: { x: XR(p.vers), y: AXE } };
      case "curseur": return { geste: "glisser", de: onglet(p.k), vers: { x: X(p.vers), y: ONGLET[p.k] } };
      // de près, la main montre le sens, pas le milieu de la zone sombre : c'est l'élève qui regarde la figure
      case "ajuster": return { geste: "glisser", de: onglet(p.k), vers: { x: r2(onglet(p.k).x + p.sens * 12), y: ONGLET[p.k] } };
      // une lecture, une touche du bas, un doigt à lever : rien ne doit cacher ce que l'élève regarde
      default: return undefined;
    }
  };
  const indicationDe = (p: PasDiffraction): Indication => ({ cle: p.cle, texte: p.texte, etape: p.etape, main: laMain(p), appel: p.geste === "bouton" && p.bouton === "fini" });
  const pas: PasDiffraction | null = !guide.actif ? null : tenue?.fige ? tenue.fige.pas : calcule;
  const indication: Indication | null = !guide.actif ? null : tenue?.fige ? tenue.fige.indication : calcule && indicationDe(calcule);
  /** la touche du bas que le guide met en avant */
  const vise = (touche: string) => (pas?.geste === "bouton" && pas.bouton === touche ? " pl-vise" : "");
  /**
   * Le doigt se pose sur l'écran, dans la loupe ou sur un curseur, puis se lève. Pendant un geste, la consigne ne
   * change pas d'avis à chaque millimètre : elle reste celle du moment où le doigt s'est posé. Seul l'ajustement d'un
   * curseur, de près, se suit en direct : le guide y dit quand lever le doigt.
   */
  const tient = (quoi: Tenue["quoi"]) => (tenu: boolean) => {
    if (!tenu) { setTenue(null); return; }
    const enDirect = pas?.geste === "ajuster" && pas.k === quoi;
    setTenue({ quoi, fige: pas && indication && !enDirect ? { pas, indication } : null });
  };
  /** la main du curseur du haut vient par-dessus : elle ne cache pas la figure qu'il faut regarder */
  const parDessus = pas !== null && (pas.geste === "curseur" || pas.geste === "ajuster") && pas.k === 1;

  // ----- le laser -----
  const bascule = () => {
    agit({ g: "laser", on: !etat.allume });
    setMessage(etat.allume ? "Le laser est éteint." : etat.fixe
      ? `Le laser est allumé : son faisceau ${enPlace ? "traverse la diapositive et " : ""}frappe l'écran.`
      : "Attention : le laser est allumé hors de son support. Son faisceau part dans la salle.");
    if (!etat.allume && !etat.fixe) son("faux");
  };

  // ----- prendre et poser : le laser, une diapositive -----
  const poser = (objet: string, cible: string) => {
    const suite = pose(r, etat, objet, cible);
    suite.gestes.forEach(agit);
    if (suite.message) dit(suite.message, suite.conseil);
    if (suite.alerte) son("faux");
  };
  const range = (d: Diapositive) => {
    agit({ g: "diapo", id: "aucune" });
    setMessage(`De retour dans la boîte : ${d.nom}.`);
    son("pose");
  };
  // l'élève vient de prendre le laser ou une diapositive, ou de lâcher l'objet à côté de sa place : le message dit où il va
  const prise = (objet: string) => {
    const d = diapositive(r, objet);
    if (objet === "laser") setMessage(etat.fixe ? "Tu tiens le laser. Tu peux le reposer sur la table." : "Tu tiens le laser. Sa place est sur son support, au bout du banc, face à l'écran.");
    else if (d) setMessage(`Tu tiens ${d.nom}. Sa place est dans le porte-diapositive, devant le laser.`);
  };
  const rate = (objet: string) => {
    const d = diapositive(r, objet);
    if (objet === "laser") setMessage(etat.fixe ? "Le laser reste sur son support." : "Le laser retourne sur la table : lâche-le sur son support, au bout du banc.");
    else if (d) setMessage(`De retour dans la boîte : ${d.nom}. Lâche la diapositive sur le porte-diapositive, devant le laser.`);
  };

  // ----- l'écran sur le rail, les curseurs sur l'écran -----
  const glisseEcran = (x: number) => {
    agit({ g: "ecran", x });
    if (x > r.rail + 0.05) setMessage("L'écran est au bout du rail.");
    else if (x < ECRAN_MIN - 0.05) setMessage("L'écran ne s'approche pas plus de la diapositive.");
    else dit("Tu déplaces l'écran.", "Regarde la figure, en haut.");
  };
  const glisseCurseur = (k: 1 | 2, x: number) => {
    agit({ g: "curseur", k, x });
    setMessage(`Tu déplaces le curseur ${k} sur l'écran.`);
    // de près, le guide vient de dire de lever le doigt : il le dit jusqu'à ce que le doigt se lève
    if (guide.actif && tenue?.quoi === k && !tenue.fige && lecture === "ecart") {
      const suite = prochain(r, regles.geste(r, etat, { g: "curseur", k, x }), { saisie: lecture, tenu: k });
      if (suite.geste === "lacher") setTenue({ ...tenue, fige: { pas: suite, indication: indicationDe(suite) } });
    }
  };

  // ----- noter ce qu'on lit -----
  const noterMesure = () => {
    // le regard se rapproche des deux curseurs
    const [gauche, droite] = [Math.min(...etat.curseurs), Math.max(...etat.curseurs)];
    const largeur = borne(X(droite) - X(gauche) + 60, 130, 300);
    const vue: Vue = { x: borne((X(gauche) + X(droite)) / 2 - largeur / 2, 0, 360 - largeur), y: -46, l: largeur, h: 164 };
    setSaisie({ genre: "mesure", vue, ecart: null });
    dit("Tu notes une mesure : le regard se rapproche des curseurs. De près, ils suivent ton doigt tout doucement.", "Lis la graduation en face de chaque curseur, puis fais la différence.");
  };
  const noteEcart = (v: number) => {
    if (saisie?.genre !== "mesure") return;
    if (young && saisie.ecart === null) { setSaisie({ ...saisie, ecart: v }); dit(`Écart lu : ${nombre(v, 1)} mm.`, "Compte les interfranges entre tes deux curseurs."); son("clic"); return; }
    if (young && (!Number.isInteger(v) || v < 1 || v > 60)) { setMessage("Le nombre d'interfranges est un nombre entier : compte les intervalles entre tes deux curseurs."); return; }
    const ecart = saisie.ecart ?? v;
    agit(young ? mesure(ecart, v) : mesure(ecart));
    setSaisie(null);
    setMessage(`Mesure notée${enPlace ? ` pour ${enPlace.nom}` : ""} : ${nombre(ecart, 1)} mm entre les curseurs${young ? `, pour ${nombre(v, 0)} interfrange${v > 1 ? "s" : ""}` : ""}.`);
    son("bip");
  };
  const noterDistance = () => {
    setSaisie({ genre: "distance" });
    dit("Tu notes la distance : le regard se rapproche de la loupe.", "Lis la graduation en face du repère de l'écran, au millimètre.");
  };
  const noteDistance = (v: number) => {
    agit({ g: "distance", v });
    setSaisie(null);
    setMessage(`Distance notée : D = ${nombre(v, 1)} cm.`);
    son("bip");
  };
  const abandonne = () => { setSaisie(null); setMessage("Lecture abandonnée : rien n'est noté."); };

  const toutRecommencer = () => {
    setPartie({ etat: regles.depart(r), gestes: [] });
    setSaisie(null);
    setTenue(null);
    setMessage("La paillasse est remise comme au début.");
  };

  // ----- ce qui dépend de l'état -----
  const mesurees = new Set(etat.mesures.map((m) => m.diapo));
  const voulues = r.but.genre === "etalonnage" ? [...r.but.fentes, r.but.inconnue] : [];
  const derniereMesure = etat.mesures[etat.mesures.length - 1];
  // l'éventail de lumière après la diapositive, vu de côté : d'autant plus ouvert que la figure est large
  const ouverture = enPlace ? borne(tacheCentrale(r.lambda, enPlace.a, etat.ecran) * 0.55, 4, 30) : 1;
  const vuDeFace = !visible ? "rien" : !enPlace ? "le point du laser" : enPlace.genre === "young" ? "des franges brillantes et sombres, régulières" : "une tache centrale large, entourée de taches plus petites";
  /** de près, pendant une mesure, les curseurs se règlent finement */
  const finesse = saisie?.genre === "mesure" ? FINESSE : 1;

  const outils = saisie?.genre === "mesure" ? (
    saisie.ecart === null
      ? <Releve key="ecart" nom="Distance entre les deux curseurs, lue sur l'écran" unite="mm" exemple="32,5" annule={abandonne} valide={noteEcart} />
      : <Releve key="nombre" nom="Nombre d'interfranges entre les deux curseurs" unite="interfranges" exemple="8" annule={abandonne} valide={noteEcart} />
  ) : saisie?.genre === "distance" ? (
    <Releve nom="Distance de la diapositive à l'écran, lue sur le rail" unite="cm" exemple="148,5" annule={abandonne} valide={noteDistance} />
  ) : (
    <>
      <button type="button" className={`btn btn-ligne${vise("mesure")}`} onClick={noterMesure}>Noter la mesure</button>
      <button type="button" className={`btn btn-ligne${vise("distance")}`} onClick={noterDistance}>Noter la distance</button>
    </>
  );

  return (
    <Etabli titre={young ? "Interférences" : "Diffraction"} protocole={protocole} message={message} attente={attente} fini={() => fini(gestes)} recommence={toutRecommencer} outils={outils} saisie={saisie !== null} indication={indication}>
      <Scene vue={saisie?.genre === "mesure" ? saisie.vue : saisie?.genre === "distance" ? VUE_LOUPE : VUE} nom="La paillasse : un laser, un porte-diapositive, un écran sur un rail gradué, et la boîte de diapositives">
        {/* ce que l'élève voit sur l'écran : la figure, la graduation, les deux curseurs */}
        {saisie?.genre !== "mesure" && <text x={FACE.x + 4} y={FACE.y - 8} className="pl-fort">Ce que tu vois sur l&apos;écran</text>}
        <rect className="pl-diffraction-face" x={FACE.x} y={FACE.y} width={FACE.l} height={FACE.h} rx={5} />
        <g role="img" aria-label={`L'écran, vu de face : ${vuDeFace}.`}>
          {visible && <Figure lambda={r.lambda} d={enPlace} distance={etat.ecran} />}
        </g>
        <Echelle x={ECHELLE.x} y={ECHELLE.y} longueur={LARGEUR * ECHELLE.parMm} de={0} a={LARGEUR} pas={1} majeur={10} debout={false} trait={3.2} />
        <text x={FACE.x + FACE.l - 5} y={FACE.y + FACE.h - 5} textAnchor="end">mm</text>
        <Curseur rang={1} valeur={etat.curseurs[0]} deplace={(x) => glisseCurseur(1, x)} tenu={tient(1)} finesse={finesse} />
        <Curseur rang={2} valeur={etat.curseurs[1]} deplace={(x) => glisseCurseur(2, x)} tenu={tient(2)} finesse={finesse} />
        {/* avec le guide, pendant la lecture ou le comptage : un chevron montre chaque curseur, sous la graduation */}
        {pas?.geste === "montrer" && pas.quoi !== "loupe" && etat.curseurs.map((c, k) => <path key={k} className="pl-main-pointe" d={`M ${r2(X(c) - 5)} ${ECHELLE.y + 27} l 5 -5 l 5 5`} aria-hidden="true" />)}

        {/* la loupe, posée sur le repère de l'écran */}
        {saisie?.genre === "distance" ? <text x={LOUPE.x} y={LOUPE.y - LOUPE.r - 8} textAnchor="middle" className="pl-fort">Loupe : l&apos;écran</text> : (
          <>
            <text x={LOUPE.x - LOUPE.r - 8} y={LOUPE.y - 6} textAnchor="end" className="pl-fort">Loupe : l&apos;écran</text>
            <text x={LOUPE.x - LOUPE.r - 8} y={LOUPE.y + 8} textAnchor="end">glisse dedans :</text>
            <text x={LOUPE.x - LOUPE.r - 8} y={LOUPE.y + 19} textAnchor="end">réglage fin</text>
          </>
        )}
        <LoupeRail x={LOUPE.x} y={LOUPE.y} r={LOUPE.r} valeur={etat.ecran} de={0} a={r.rail} nom="Loupe sur le repère de l'écran" deplace={glisseEcran} tenu={tient("loupe")} parMm={4} />
        {/* avec le guide, pendant la lecture de la distance : un chevron montre le repère, sous la graduation */}
        {pas?.geste === "montrer" && pas.quoi === "loupe" && <path className="pl-main-pointe" d={`M ${LOUPE.x - 5} ${LOUPE.y + 38} l 5 -5 l 5 5`} aria-hidden="true" />}

        <Manipulation pose={poser} prise={prise} rate={rate}>
          {/* le banc : le rail gradué à partir de la diapositive, et le support du laser à son bout */}
          <line className="pl-diffraction-table" x1={0} x2={360} y1={RAIL.y + 36} y2={RAIL.y + 36} />
          <rect className="pl-diffraction-banc" x={14} y={RAIL.y} width={RAIL.x + RAIL.l - 6} height={9} rx={2} />
          <Echelle x={RAIL.x} y={RAIL.y + 9} longueur={RAIL.l} de={0} a={r.rail} pas={5} majeur={20} debout={false} trait={2.2} />
          <text x={RAIL.x + RAIL.l + 8} y={RAIL.y + 32} textAnchor="end">cm</text>
          <path className="pl-diffraction-tige" d={`M ${SUPPORT.x} ${AXE + 11} V ${RAIL.y}`} />
          <rect className="pl-diffraction-pied" x={SUPPORT.x - 10} y={RAIL.y - 7} width={20} height={18} rx={3} />
          {!etat.fixe && <rect className="pl-diffraction-berceau" x={SUPPORT.x - 31} y={AXE - 9} width={62} height={18} rx={4} />}
          {!etat.fixe && <text x={SUPPORT.x} y={AXE - 16} textAnchor="middle">support du laser</text>}

          {/* le porte-diapositive, au zéro du rail, et la diapositive vue par la tranche */}
          <path className="pl-diffraction-tige" d={`M ${porte.x} ${AXE + 20} V ${RAIL.y}`} />
          <rect className="pl-diffraction-pied" x={porte.x - 10} y={RAIL.y - 7} width={20} height={18} rx={3} />
          <path className="pl-verre" d={`M ${porte.x - 5} ${AXE - 20} V ${AXE + 20} H ${porte.x + 5} V ${AXE - 20}`} />
          {enPlace && <rect className="pl-diffraction-tranche" x={porte.x - 1.8} y={AXE - 17} width={3.6} height={34} rx={1} />}
          {(enPlace?.etiquette ?? ["support", "vide"]).map((ligne, k) => <text key={ligne + k} x={porte.x + 4} y={AXE - 37 + 10 * k} textAnchor="middle">{ligne}</text>)}

          {/* le faisceau : du laser à la diapositive, puis l'éventail de lumière jusqu'à l'écran */}
          {visible && (
            <g>
              <line className="pl-diffraction-faisceau" x1={SUPPORT.x + 31} x2={enPlace ? porte.x : XR(etat.ecran)} y1={AXE} y2={AXE} stroke={couleur} strokeWidth={1.5} />
              {enPlace && <path className="pl-diffraction-eventail" d={`M ${porte.x} ${AXE} L ${XR(etat.ecran)} ${r2(AXE - ouverture)} V ${r2(AXE + ouverture)} Z`} fill={couleur} opacity={0.2} />}
              {enPlace && <line className="pl-diffraction-faisceau" x1={porte.x} x2={XR(etat.ecran)} y1={AXE} y2={AXE} stroke={couleur} strokeWidth={0.8} opacity={0.6} />}
            </g>
          )}
          {/* allumé hors de son support, le laser envoie son faisceau dans la salle */}
          {danger && (
            <g>
              <line className="pl-diffraction-faisceau" x1={TABLE.x + 31} x2={372} y1={TABLE.y} y2={TABLE.y - 96} stroke={couleur} strokeWidth={1.8} />
              <text className="pl-diffraction-alerte" x={TABLE.x - 34} y={TABLE.y - 22}>faisceau dans la salle</text>
            </g>
          )}

          {/* l'écran, sur son cavalier */}
          <Cavalier valeur={etat.ecran} origine={RAIL.x} parCm={parCm} y={AXE - 52} h={RAIL.y + 18 - (AXE - 52)} nom="Écran, sur le rail" choisi deplace={glisseEcran} choisit={() => {}} tenu={tient("ecran")}>
            <line className="pl-diffraction-tige" x1={0} x2={0} y1={AXE + 36} y2={RAIL.y - 6} />
            <rect className="pl-diffraction-pied" x={-10} y={RAIL.y - 7} width={20} height={18} rx={3} />
            <path className="pl-diffraction-index" d={`M 0 ${RAIL.y + 2} V ${RAIL.y + 16}`} />
            <rect className="pl-diffraction-plaque" x={-2.5} y={AXE - 36} width={5} height={72} rx={1} />
            <text x={0} y={AXE - 42} textAnchor="middle">écran</text>
          </Cavalier>

          {/* où poser ce qu'on tient */}
          <Cible id="support" nom="le support du laser, face à l'écran" x={SUPPORT.x} y={SUPPORT.y} r={24} accepte={etat.fixe ? [] : ["laser"]} />
          <Cible id="table" nom="la table" x={TABLE.x} y={TABLE.y} r={26} accepte={etat.fixe ? ["laser"] : []} />
          <Cible id="porte" nom="le porte-diapositive" x={porte.x} y={porte.y} r={22} accepte={r.boite.filter((d) => d.id !== etat.diapo).map((d) => d.id)} />

          {/* la boîte de diapositives : une diapositive en place laisse sa case vide ; la toucher la range */}
          <text x={BOITE.x + 4} y={BOITE.y - 6}>Boîte de diapositives</text>
          <rect className="pl-diffraction-boite" x={BOITE.x} y={BOITE.y} width={BOITE.l} height={BOITE.h} rx={10} />
          {r.boite.map((d) => {
            const { x, y } = cases.get(d.id) ?? { x: 0, y: 0 };
            const lignes = d.etiquette.map((ligne, k) => <text key={ligne + k} x={0} y={27 + 9.5 * k} textAnchor="middle">{ligne}</text>);
            return etat.diapo === d.id ? (
              <g key={d.id} className="pl-diffraction-ranger" transform={`translate(${x} ${y})`} role="button" tabIndex={0} aria-label={`Ranger ${d.nom} dans la boîte`} onClick={() => range(d)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); range(d); } }}>
                <rect x={-24} y={-20} width={48} height={60} fill="transparent" />
                <rect className="pl-diffraction-case" x={-18} y={-15} width={36} height={30} rx={3} />
                {lignes}
              </g>
            ) : (
              // la zone de toucher couvre la monture et son étiquette : elle est centrée un peu plus bas que la monture
              <Objet key={d.id} id={d.id} nom={Maj(d.nom)} x={x} y={y + 10} l={48} h={58}>
                <g transform="translate(0 -10)">
                  <Monture d={d} />
                  {mesurees.has(d.id) && <path className="pl-diffraction-coche" d="M 20.5 -9 l 3.2 3.4 l 5.6 -7.4" />}
                  {lignes}
                </g>
              </Objet>
            );
          })}

          {/* le laser : sur son support, ou sur la table ; son bouton est à côté de lui */}
          {!etat.fixe && <text x={TABLE.x} y={BOITE.y - 6} textAnchor="middle">Sur la table</text>}
          <Objet id="laser" nom={etat.fixe ? "Laser, fixé sur son support" : "Laser, posé sur la table"} x={laser.x} y={laser.y} l={72} h={44}>
            <Laser />
          </Objet>
          <Poussoir x={bouton.x} y={bouton.y} nom={etat.allume ? "Éteindre le laser" : "Allumer le laser"} texte={etat.allume ? "Éteindre" : "Allumer"} appuie={bascule} />
        </Manipulation>

        {/* ce que l'élève a déjà noté */}
        <text x={8} y={VUE.y + VUE.h - 6} className="pl-fort">
          {young ? (derniereMesure ? `Mesure notée : ${nombre(derniereMesure.v, 1)} mm` : "") : `Mesures notées : ${voulues.filter((id) => mesurees.has(id)).length} sur ${voulues.length}`}
        </text>
        {etat.distance && <text x={352} y={VUE.y + VUE.h - 6} textAnchor="end" className="pl-fort">D notée : {nombre(etat.distance.v, 1)} cm</text>}

        {/* la main du guide, par-dessus tout le reste ; retournée autour de l'onglet du curseur du haut, elle vient d'en haut */}
        <g transform={parDessus ? `matrix(1 0 0 -1 0 ${2 * ONGLET[1]})` : undefined}><Main indication={indication} /></g>
      </Scene>
    </Etabli>
  );
}
