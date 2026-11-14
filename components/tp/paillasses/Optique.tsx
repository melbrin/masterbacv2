"use client";

// La paillasse « optique » (décision 0012) : le banc d'optique. L'élève y travaille comme au laboratoire : il éteint la
// salle, allume la source, prend une lentille dans la boîte et la pose sur un support, glisse les supports le long du
// rail, va et vient jusqu'à l'image nette, lit chaque position à la loupe et mesure l'image à la règle. En haut, ce
// qu'il voit sur l'écran : l'image, son sens, sa taille, son flou. Rien n'écrit la mesure à sa place.
// Chaque geste passe par les règles (lib/commun/tp/paillasses/optique.ts) ; la liste des gestes part au serveur.
// Le guide (lib/commun/tp/paillasses/optique-guide.ts) dit le prochain geste ; ici, la main le montre à sa place dans le dessin.

import { useCallback, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { nombre } from "@/lib/commun/format";
import { FLOU, NET, SUPPORTS, course, imageSurEcran, lentilleDe, position, rangDeLaMesure, regles, vergence, type EtatOptique, type ImageEcran, type LentilleOptique, type ReglagesOptique } from "@/lib/commun/tp/paillasses/optique";
import { LONGUEUR_DE_LA_REGLE, REGLE_AU_REPOS, lectures, pose, prochain, releve, type PasOptique, type PieceOptique } from "@/lib/commun/tp/paillasses/optique-guide";
import type { GesteBrut, PropsPaillasse } from "@/lib/commun/tp/types";
import { Cible, Echelle, Etabli, Interrupteur, Main, Manipulation, Objet, Releve, Scene, son, useGlisse, useGuide, vibre, type Indication, type Point, type Vue } from "../kit";
import { Cavalier, LoupeRail } from "./optiqueRail";
import "./optique.css";

// ---------- la place de chaque chose dans le dessin (360 de large) ----------
const VUE: Vue = { x: 0, y: -46, l: 360, h: 566 };
/** L'écran vu de face : un carré de 9,5 cm de côté, à 20 unités par centimètre. */
const ECRAN = { x: 10, y: -26, l: 190, h: 190, parCm: 20 };
const CENTRE = { x: ECRAN.x + ECRAN.l / 2, y: ECRAN.y + ECRAN.h / 2 };
/** La loupe : son centre, son rayon, et la largeur d'un millimètre du rail vu à travers elle. */
const LOUPE = { x: 280, y: 46, r: 56, parMm: 4.6 };
/** Pendant une lecture, le regard se rapproche : de la loupe pour une position, de l'écran pour une taille. */
const VUE_LOUPE: Vue = { x: LOUPE.x - 72, y: LOUPE.y - 84, l: 144, h: 160 };
const VUE_ECRAN: Vue = { x: 0, y: -46, l: 212, h: 216 };
const RAIL = { x: 15, y: 318, l: 330 };
/** La hauteur de l'axe optique : le centre des lentilles, de l'objet et de l'écran. */
const AXE = 252;
const BOITE = { x: 12, y: 380, l: 336, h: 112 };
/** Les deux interrupteurs : leur nom s'écrit au-dessus, la main du guide vient par-dessous. */
const INTERRUPTEURS: Record<"lampe" | "salle", Point> = { lampe: { x: 244, y: 158 }, salle: { x: 316, y: 158 } };
/** Dans la loupe, la hauteur où le doigt glisse pour un réglage fin : sous les chiffres, qui restent lisibles. */
const DOIGT = LOUPE.y + 41;
/** La lettre F, haute d'une unité, centrée : un montant, deux barres, et trois traits fins qui ne se séparent que sur une image nette. */
const LETTRE = "M -0.31 -0.5 H 0.31 V -0.3 H -0.11 V -0.1 H 0.2 V 0.08 H -0.11 V 0.5 H -0.31 Z M 0.05 0.26 h 0.04 v 0.24 h -0.04 Z M 0.14 0.26 h 0.04 v 0.24 h -0.04 Z M 0.23 0.26 h 0.04 v 0.24 h -0.04 Z";

type Piece = PieceOptique;
interface Partie { etat: EtatOptique; gestes: GesteBrut[] }
/** Ce que l'élève est en train de noter : des positions, l'une après l'autre (`rang` : celle qu'il lit), ou la taille de l'image. */
type Saisie = { genre: "positions"; rang: number; notes: Partial<Record<Piece, number>> } | { genre: "taille" };
/**
 * Ce que le doigt tient : une pièce du rail, la loupe (`loupe`, posée sur `piece`), ou la règle. `fige` : la consigne du
 * guide au moment où le doigt s'est posé, gardée telle quelle jusqu'à ce qu'il se lève.
 */
interface Tenue { piece: Piece | null; loupe: boolean; fige: { pas: PasOptique; indication: Indication } | null }

const r2 = (n: number) => Math.round(n * 100) / 100;
/** La place, dans le dessin, d'un point de l'écran vu de face : il est donné en centimètres depuis le centre, y vers le haut. */
const surEcran = (p: { x: number; y: number }): Point => ({ x: r2(CENTRE.x + p.x * ECRAN.parCm), y: r2(CENTRE.y - p.y * ECRAN.parCm) });
const cm = (x: number) => `${nombre(x, 1)} cm`;
const borne = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
/** Ajoute un geste à la liste. Deux déplacements à la suite de la même pièce n'en font qu'un : rejouée, la liste donne le même banc. */
function ajoute(gestes: GesteBrut[], g: GesteBrut): GesteBrut[] {
  const dernier = gestes[gestes.length - 1];
  return g.g === "glisser" && dernier?.g === "glisser" && dernier.quoi === g.quoi ? [...gestes.slice(0, -1), g] : [...gestes, g];
}

// ---------- les dessins ----------

/** Le verre d'une lentille vu de profil : bombé pour une convergente, creusé pour une divergente. `h` : sa demi-hauteur. */
function Verre({ lentille, h }: { lentille: LentilleOptique; h: number }) {
  const force = Math.abs(lentille.etiquette);
  const ventre = borne(2 + force * 0.32, 3, 8);
  const creux = borne(2 + force * 0.4, 2.5, 6);
  const d = lentille.f > 0
    ? `M 0 ${-h} Q ${r2(ventre)} 0 0 ${h} Q ${r2(-ventre)} 0 0 ${-h} Z`
    : `M -4 ${-h} H 4 Q ${r2(4 - creux)} 0 4 ${h} H -4 Q ${r2(creux - 4)} 0 -4 ${-h} Z`;
  return <path className="pl-optique-verre" d={d} />;
}

/** Le pied d'un cavalier sur le rail, sa tige jusqu'à la hauteur `haut`, et son repère sur la graduation. */
function Pied({ haut }: { haut: number }) {
  return (
    <>
      <line className="pl-optique-tige" x1={0} x2={0} y1={haut} y2={RAIL.y - 6} />
      <rect className="pl-optique-pied" x={-10} y={RAIL.y - 7} width={20} height={18} rx={3} />
      <path className="pl-optique-index" d={`M 0 ${RAIL.y + 2} V ${RAIL.y + 16}`} />
    </>
  );
}

/** Une monture de lentille sur son cavalier, avec ou sans verre. */
function Monture({ lentille }: { lentille: LentilleOptique | null }) {
  return (
    <>
      <rect className={`pl-optique-monture${lentille ? "" : " est-vide"}`} x={-7} y={AXE - 26} width={14} height={52} rx={4} />
      {lentille && <g transform={`translate(0 ${AXE})`}><Verre lentille={lentille} h={22} /></g>}
    </>
  );
}

// La règle graduée : l'élève la glisse contre l'image, le zéro sur un bord de la lettre. `x`, `y` : la place de son zéro.
function Regle({ x, y, deplace, tenu }: { x: number; y: number; deplace: (x: number, y: number) => void; tenu: (tenu: boolean) => void }) {
  const prise = useRef({ x: 0, y: 0 });
  const reglages = useGlisse({
    depart: (p) => { prise.current = { x: p.x - x, y: p.y - y }; tenu(true); },
    bouge: (p) => deplace(p.x - prise.current.x, p.y - prise.current.y),
    fin: () => tenu(false),
  });
  const clavier = (e: KeyboardEvent<SVGGElement>) => {
    const [dx, dy] = e.key === "ArrowLeft" ? [-1, 0] : e.key === "ArrowRight" ? [1, 0] : e.key === "ArrowUp" ? [0, -1] : e.key === "ArrowDown" ? [0, 1] : e.key === "PageUp" ? [0, -10] : e.key === "PageDown" ? [0, 10] : [0, 0];
    if (!dx && !dy) return;
    e.preventDefault();
    deplace(x + dx, y + dy);
  };
  const long = LONGUEUR_DE_LA_REGLE * ECRAN.parCm;
  const parMm = ECRAN.parCm / 10;
  return (
    <g className="pl-optique-regle" transform={`translate(${r2(x)} ${r2(y)})`} role="slider" tabIndex={0} aria-label="Règle graduée, à glisser contre l'image" aria-orientation="vertical"
      aria-valuemin={0} aria-valuemax={ECRAN.h} aria-valuenow={Math.round(ECRAN.y + ECRAN.h - y)} aria-valuetext="posée sur l'écran" onKeyDown={clavier} {...reglages}>
      <rect x={-14} y={-long - 8} width={44} height={long + 16} fill="transparent" />
      <rect className="pl-optique-regle-corps" x={0} y={-long - 5} width={18} height={long + 9} rx={1.5} />
      {Array.from({ length: LONGUEUR_DE_LA_REGLE * 10 + 1 }, (_, k) => (
        <line key={k} x1={0} x2={k % 10 === 0 ? 8 : k % 5 === 0 ? 6 : 3.5} y1={-k * parMm} y2={-k * parMm} strokeWidth={k % 10 === 0 ? 0.8 : 0.5} />
      ))}
      {Array.from({ length: LONGUEUR_DE_LA_REGLE + 1 }, (_, c) => <text key={c} x={10} y={r2(-c * ECRAN.parCm + 2.4)}>{c}</text>)}
    </g>
  );
}

// L'écran vu de face : l'image que forme le banc, avec sa taille, son sens et son flou. `children` : ce qui est posé dessus.
function VueEcran({ image, salle, titre, children }: { image: ImageEcran; salle: boolean; titre: string; children: ReactNode }) {
  const id = useId();
  const sansForme = image.eclaire && (image.taille === 0 || !Number.isFinite(image.flou));
  const hauteur = Math.abs(image.taille) * ECRAN.parCm;
  // le flou dessiné grandit avec la tache de flou : à la limite de la netteté, les trois traits fins se confondent
  const sigma = Math.min(48, image.flou * ECRAN.parCm * 1.7);
  // une grande image est plus pâle ; dans une salle éclairée, elle se détache mal
  const eclat = borne(1.1 - 0.05 * Math.abs(image.taille), 0.72, 1) * (salle ? 0.32 : 1);
  const vu = !image.eclaire ? "rien, la lampe est éteinte" : sansForme ? "une lueur sans forme"
    : `une image ${image.taille < 0 ? "renversée" : "droite"}, ${image.flou <= NET ? "nette" : image.flou <= FLOU ? "un peu floue" : "floue"}`;
  return (
    <>
      <defs>
        <clipPath id={`${id}c`}><rect x={ECRAN.x} y={ECRAN.y} width={ECRAN.l} height={ECRAN.h} rx={5} /></clipPath>
        <filter id={`${id}f`} filterUnits="userSpaceOnUse" x={ECRAN.x - 70} y={ECRAN.y - 70} width={ECRAN.l + 140} height={ECRAN.h + 140}>
          <feGaussianBlur stdDeviation={sigma.toFixed(2)} />
        </filter>
        <filter id={`${id}g`} filterUnits="userSpaceOnUse" x={ECRAN.x - 70} y={ECRAN.y - 70} width={ECRAN.l + 140} height={ECRAN.h + 140}>
          <feGaussianBlur stdDeviation={16} />
        </filter>
      </defs>
      <text x={ECRAN.x} y={ECRAN.y - 8} className="pl-fort">{titre}</text>
      <g role="img" aria-label={`L'écran, vu de face : ${vu}.`} clipPath={`url(#${id}c)`}>
        <rect className={`pl-optique-face${salle ? " est-eclairee" : ""}`} x={ECRAN.x} y={ECRAN.y} width={ECRAN.l} height={ECRAN.h} />
        {/* sans image, la lumière s'étale quand même sur l'écran : une lueur, d'autant plus large que rien ne la rassemble */}
        {image.eclaire && (sansForme || image.flou > 0.6) && (
          <circle className="pl-optique-lueur" cx={CENTRE.x} cy={CENTRE.y} r={sansForme ? 150 : borne(image.flou * ECRAN.parCm, 34, 150)} filter={`url(#${id}g)`} opacity={salle ? 0.4 : 1} />
        )}
        {image.eclaire && !sansForme && (
          <g filter={sigma > 0.08 ? `url(#${id}f)` : undefined} opacity={r2(eclat)}>
            <path className="pl-optique-image" d={LETTRE} transform={`translate(${CENTRE.x} ${CENTRE.y}) scale(${r2(hauteur)})${image.taille < 0 ? " rotate(180)" : ""}`} />
          </g>
        )}
      </g>
      <g clipPath={`url(#${id}c)`}>{children}</g>
      <rect className="pl-optique-cadre" x={ECRAN.x} y={ECRAN.y} width={ECRAN.l} height={ECRAN.h} rx={5} />
    </>
  );
}

// ---------- la paillasse ----------

export default function Optique({ reglages: r, protocole, attente, fini }: PropsPaillasse<ReglagesOptique>) {
  const lunette = r.but.genre === "lunette";
  const guide = useGuide();
  const [partie, setPartie] = useState<Partie>(() => ({ etat: regles.depart(r), gestes: [] }));
  const [message, setMessage] = useState("Ta paillasse est prête. Le protocole est en haut de l'écran.");
  /** la pièce du banc sur laquelle la loupe est posée */
  const [actif, setActif] = useState<Piece>(r.recepteur.genre === "ecran" ? "ecran" : "b");
  const [saisie, setSaisie] = useState<Saisie | null>(null);
  /** la règle : la place de son zéro sur l'écran, en centimètres depuis le centre (y vers le haut) */
  const [regle, setRegle] = useState(REGLE_AU_REPOS);
  const [tenue, setTenue] = useState<Tenue | null>(null);
  const { etat, gestes } = partie;

  const agit = useCallback((g: GesteBrut) => setPartie((p) => {
    const suite = regles.geste(r, p.etat, g);
    return suite === p.etat ? p : { etat: suite, gestes: ajoute(p.gestes, g) };
  }), [r]);
  /** Le message du bas : ce qui vient de se passer. Le conseil pour la suite ne s'ajoute que si le guide est coupé : sinon c'est lui qui le dit. */
  const dit = (fait: string, conseil?: string) => setMessage(conseil && !guide.actif ? `${fait} ${conseil}` : fait);

  const parCm = RAIL.l / r.rail;
  const X = (v: number) => r2(RAIL.x + v * parCm);
  const nombreVoulu = r.but.genre === "focale" ? r.but.mesures : 1;
  const image = imageSurEcran(r, etat);
  const lentilles = etat.supports.map((s) => lentilleDe(r, s.lentille));
  /** les pièces dont l'élève lit la position pour un relevé, dans l'ordre */
  const aLire = lectures(r);
  const nomDe = (piece: Piece): string => {
    if (piece === "objet") return "l'objet";
    if (piece === "ecran") return "l'écran";
    const rang = piece === "a" ? 0 : 1;
    if (lunette) return rang === 0 ? "le premier support" : "le second support";
    return lentilles[rang] ? "la lentille" : "le support";
  };
  const Nom = (piece: Piece) => { const nom = nomDe(piece); return nom.charAt(0).toUpperCase() + nom.slice(1); };
  /** « de l'écran », « de la lentille », « du support » */
  const duNom = (piece: Piece) => { const nom = nomDe(piece); return nom.startsWith("le ") ? `du ${nom.slice(3)}` : `de ${nom}`; };

  // ----- où se trouve chaque chose : le dessin et la main du guide lisent les mêmes places -----
  /** la case de chaque lentille, dans la boîte */
  const cases = new Map<string, Point>(r.boite.map((l, i) => [l.id, { x: r2(BOITE.x + (BOITE.l * (i + 0.5)) / r.boite.length), y: BOITE.y + 60 }]));
  /** une pièce du rail, à la hauteur de l'axe optique : là où on la prend */
  const surLeRail = (piece: Piece): Point => ({ x: X(position(etat, piece) ?? 0), y: AXE });
  const regleIci = surEcran(regle);

  // ----- le guide : le prochain geste, et où la main le montre -----
  const lecture = saisie?.genre === "positions" ? aLire[saisie.rang] : saisie?.genre === "taille" ? "taille" : null;
  const calcule: PasOptique | null = guide.actif ? prochain(r, etat, { saisie: lecture, regle, loupe: tenue?.loupe === true }) : null;
  const laMain = (p: PasOptique): Indication["main"] => {
    switch (p.geste) {
      case "interrupteur": return { geste: "toucher", ou: INTERRUPTEURS[p.lequel] };
      case "poser": { const de = cases.get(p.lentille); return de && { geste: "glisser", de, vers: surLeRail(p.sur) }; }
      case "ranger": { const ou = cases.get(p.lentille); return ou && { geste: "toucher", ou }; }
      case "glisser": {
        if (!p.loupe) return { geste: "glisser", de: surLeRail(p.piece), vers: { x: X(p.vers), y: AXE } };
        // de près, le geste se fait dans la loupe : le doigt y glisse de la longueur qui amène le repère à sa place
        const demi = ((p.vers - (position(etat, p.piece) ?? p.vers)) * LOUPE.parMm * 10) / 2;
        return { geste: "glisser", de: { x: r2(LOUPE.x - demi), y: DOIGT }, vers: { x: r2(LOUPE.x + demi), y: DOIGT } };
      }
      // la main montre le sens, pas la place de l'image nette : c'est l'élève qui regarde l'image
      case "chercher": return { geste: "glisser", de: { x: LOUPE.x - p.sens * 22, y: DOIGT }, vers: { x: LOUPE.x + p.sens * 22, y: DOIGT } };
      case "regle": { const vers = surEcran(p); return { geste: "glisser", de: { x: regleIci.x + 9, y: regleIci.y - 10 }, vers: { x: vers.x + 9, y: vers.y - 10 } }; }
      // une lecture, une touche du bas, un doigt à lever : rien ne doit cacher ce que l'élève regarde
      default: return undefined;
    }
  };
  const indicationDe = (p: PasOptique): Indication => ({ cle: p.cle, texte: p.texte, etape: p.etape, main: laMain(p), appel: p.geste === "bouton" && p.bouton === "fini" });
  const pas: PasOptique | null = !guide.actif ? null : tenue?.fige ? tenue.fige.pas : calcule;
  const indication: Indication | null = !guide.actif ? null : tenue?.fige ? tenue.fige.indication : calcule && indicationDe(calcule);
  /** la touche du bas que le guide met en avant */
  const vise = (bouton: string) => (pas?.geste === "bouton" && pas.bouton === bouton ? " pl-vise" : "");
  /**
   * Le doigt se pose sur une pièce, dans la loupe ou sur la règle, puis se lève. Pendant un geste, la consigne ne change
   * pas d'avis à chaque millimètre : elle reste celle du moment où le doigt s'est posé. Seule la recherche de la netteté,
   * dans la loupe, se suit en direct : le guide y dit quand lever le doigt.
   */
  const tient = (piece: Piece | null, loupe: boolean) => (tenu: boolean) => {
    if (!tenu) { setTenue(null); return; }
    const enDirect = loupe && pas?.geste === "chercher";
    setTenue({ piece, loupe, fige: pas && indication && !enDirect ? { pas, indication } : null });
  };

  // ----- glisser une pièce le long du rail : elle bute sur ses voisines, et le doigt le sent -----
  const enButee = useRef(false);
  const glisse = (piece: Piece, x: number) => {
    const bornes = course(r, etat, piece);
    if (!bornes) return;
    const bute = x < bornes[0] - 0.05 || x > bornes[1] + 0.05;
    if (bute && !enButee.current) vibre(10);
    enButee.current = bute;
    agit({ g: "glisser", quoi: piece, x });
    // dans la loupe, le guide vient de dire de lever le doigt : il le dit jusqu'à ce que le doigt se lève
    if (guide.actif && tenue?.loupe && !tenue.fige) {
      const suite = prochain(r, regles.geste(r, etat, { g: "glisser", quoi: piece, x }), { saisie: lecture, regle, loupe: true });
      if (suite.geste === "lacher") setTenue({ ...tenue, fige: { pas: suite, indication: indicationDe(suite) } });
    }
    const auBout = (piece === "ecran" && x > bornes[1]) || (piece === "objet" && x < bornes[0]);
    if (bute) setMessage(`${Nom(piece)} est en butée : ${auBout ? "c'est le bout du rail" : "une autre pièce lui barre le passage"}.`);
    else dit(`Tu déplaces ${nomDe(piece)}.`, "Regarde l'écran, en haut.");
  };

  // ----- prendre une lentille et la poser -----
  const poser = (objet: string, cible: string) => {
    const suite = pose(r, objet, cible);
    suite.gestes.forEach(agit);
    if (suite.piece) setActif(suite.piece);
    if (suite.message) dit(suite.message, suite.conseil);
  };
  const range = (l: LentilleOptique) => {
    agit({ g: "ranger", lentille: l.id });
    setMessage(`La lentille de ${vergence(l.etiquette)} est rangée dans la boîte.`);
    son("pose");
  };
  // l'élève vient de prendre une lentille, ou de la lâcher à côté d'un support : le message dit où elle va
  const prise = (objet: string) => {
    const l = lentilleDe(r, objet);
    if (l) setMessage(`Tu tiens la lentille de ${vergence(l.etiquette)}. Sa place est sur ${lunette ? "un des deux supports" : "le support"}, sur le banc.`);
  };
  const rate = (objet: string) => {
    const l = lentilleDe(r, objet);
    if (l) setMessage(`La lentille de ${vergence(l.etiquette)} retourne dans la boîte : lâche-la sur ${lunette ? "un support" : "le support"} du banc.`);
  };

  // ----- noter ce qu'on lit -----
  const noterPositions = () => {
    setSaisie({ genre: "positions", rang: 0, notes: {} });
    dit("Tu notes les positions : le regard se rapproche de la loupe.", "Lis la graduation en face du repère, au millimètre.");
  };
  const notePosition = (v: number) => {
    if (saisie?.genre !== "positions") return;
    const notes = { ...saisie.notes, [aLire[saisie.rang]]: v };
    if (saisie.rang + 1 < aLire.length) { setSaisie({ ...saisie, rang: saisie.rang + 1, notes }); son("clic"); return; }
    agit(releve(notes));
    if (lunette) {
      setMessage(`Positions notées : première lentille ${cm(notes.a ?? 0)}, seconde lentille ${cm(notes.b ?? 0)}.`);
    } else {
      // une mesure refaite à la même place remplace l'ancienne, à son rang
      const refaite = rangDeLaMesure(etat.releves, etat);
      const rang = refaite >= 0 ? refaite + 1 : Math.min(etat.releves.length + 1, 12);
      setMessage(`Mesure n° ${rang} ${refaite >= 0 ? "notée de nouveau" : "notée"} : objet ${cm(notes.objet ?? 0)}, lentille ${cm(notes.a ?? 0)}, écran ${cm(notes.ecran ?? 0)}.${refaite < 0 && rang > nombreVoulu ? ` Le professeur regardera tes ${nombreVoulu} dernières mesures.` : ""}`);
    }
    setSaisie(null);
    son("bip");
  };
  const noterTaille = () => {
    setSaisie({ genre: "taille" });
    dit("Tu mesures l'image : le regard se rapproche de l'écran.", "Glisse la règle contre l'image : le zéro sur un bord de la lettre, et lis l'autre bord.");
  };
  const noteTaille = (v: number) => {
    agit({ g: "taille", v });
    setSaisie(null);
    // la règle ne reste pas devant l'image : l'élève en aura besoin pour juger de la netteté
    setRegle(REGLE_AU_REPOS);
    setMessage(`Taille de l'image notée : ${cm(v)}. La règle retourne au bord de l'écran.`);
    son("bip");
  };
  /** La règle glissée : elle reste sur l'écran. `x`, `y` : la place demandée pour son zéro, dans le dessin. */
  const deplaceRegle = (x: number, y: number) => {
    const ou = { x: borne(x, ECRAN.x + 2, ECRAN.x + ECRAN.l - 20), y: borne(y, ECRAN.y + 24, ECRAN.y + ECRAN.h - 4) };
    setRegle({ x: Math.round(((ou.x - CENTRE.x) / ECRAN.parCm) * 1000) / 1000, y: Math.round(((CENTRE.y - ou.y) / ECRAN.parCm) * 1000) / 1000 });
  };

  const toutRecommencer = () => {
    setPartie({ etat: regles.depart(r), gestes: [] });
    setSaisie(null);
    setRegle(REGLE_AU_REPOS);
    setTenue(null);
    setMessage("Le banc est remis comme au début.");
  };

  // ----- ce qui dépend de l'état -----
  // la loupe se pose sur la pièce dont on lit la position, sinon sur celle que le doigt tient, sinon sur celle que le
  // guide fait régler dans la loupe, sinon sur la dernière touchée
  const dansLaLoupe = pas && (pas.geste === "chercher" || (pas.geste === "glisser" && pas.loupe)) ? pas.piece : null;
  const lue: Piece = saisie?.genre === "positions" ? aLire[saisie.rang] : tenue?.piece ?? dansLaLoupe ?? actif;
  const montree: Piece = position(etat, lue) === null || course(r, etat, lue) === null ? (lunette ? "a" : "ecran") : lue;
  const valeurLoupe = position(etat, montree) ?? 0;
  const avecTaille = r.but.genre === "lunette" || r.but.taille;
  const derniereTaille = etat.tailles[etat.tailles.length - 1];
  // la lumière vue de côté, de la source à l'écran : une suite de points (abscisse, demi-hauteur). Elle s'élargit ou se
  // resserre d'une pièce à l'autre, sans montrer où les rayons se croisent : elle ne dit pas où l'image est nette.
  const garnis = etat.supports.filter((s) => s.lentille !== null);
  const tache = borne((Math.abs(image.taille) / 2 + (Number.isFinite(image.flou) ? image.flou : 3)) * 11, 3, 34);
  const faisceau: [number, number][] = r.source.genre === "lettre"
    ? [[X(etat.objet), 3], ...garnis.slice(0, 1).map((s): [number, number] => [X(s.x), 20]), [X(etat.ecran), garnis.length > 0 ? tache : 34]]
    : [[X(r.source.x), 12], ...garnis.map((s, i): [number, number] => [X(s.x), i === 0 ? 12 : 5]), [X(r.recepteur.x), garnis.length > 1 ? 5 : 12]];
  const contour = `M ${faisceau.map(([x, h]) => `${x} ${r2(AXE - h)}`).join(" L ")} L ${[...faisceau].reverse().map(([x, h]) => `${x} ${r2(AXE + h)}`).join(" L ")} Z`;

  const libelles: Record<Piece, string> = {
    objet: "Position de l'objet, lue sur le rail",
    a: lunette ? "Position de la première lentille, lue sur le rail" : "Position de la lentille, lue sur le rail",
    b: "Position de la seconde lentille, lue sur le rail",
    ecran: "Position de l'écran, lue sur le rail",
  };
  const outils = saisie?.genre === "positions" ? (
    <Releve key={saisie.rang} nom={libelles[aLire[saisie.rang]]} unite="cm" exemple="35,2" annule={() => { setSaisie(null); setMessage("Lecture abandonnée : rien n'est noté."); }} valide={notePosition} />
  ) : saisie?.genre === "taille" ? (
    <Releve nom="Taille de l'image, lue sur la règle" unite="cm" exemple="3,4" annule={() => { setSaisie(null); setMessage("Mesure abandonnée : rien n'est noté."); }} valide={noteTaille} />
  ) : (
    <>
      <button type="button" className={`btn btn-ligne${vise("positions")}`} onClick={noterPositions}>Noter les positions</button>
      {avecTaille && <button type="button" className={`btn btn-ligne${vise("taille")}`} onClick={noterTaille}>Noter la taille</button>}
    </>
  );
  /** pendant la lecture de la règle, avec le guide : la hauteur du haut de l'image, dans le dessin */
  const hautDeLImage = r2(CENTRE.y - (Math.abs(image.taille) * ECRAN.parCm) / 2);

  return (
    <Etabli titre="Banc d'optique" protocole={protocole} message={message} attente={attente} fini={() => fini(gestes)} recommence={toutRecommencer} outils={outils} saisie={saisie !== null} indication={indication}>
      <Scene vue={saisie?.genre === "positions" ? VUE_LOUPE : saisie?.genre === "taille" ? VUE_ECRAN : VUE}
        nom={lunette ? "Le banc d'optique : un objet lointain, deux supports de lentille, un œil fictif, et la boîte de lentilles" : "Le banc d'optique : une source, un support de lentille, un écran, et la boîte de lentilles"}>
        <rect className={`pl-optique-salle${etat.salle ? " est-allumee" : ""}`} x={-1200} y={-1200} width={2800} height={3000} />

        {/* ce que l'élève voit sur l'écran, et la règle qu'il y pose */}
        <VueEcran image={image} salle={etat.salle} titre={lunette ? "Sur l'écran de l'œil fictif" : "Ce que tu vois sur l'écran"}>
          {avecTaille && <Regle x={regleIci.x} y={regleIci.y} deplace={deplaceRegle} tenu={tient(null, false)} />}
        </VueEcran>
        {/* avec le guide, pendant la lecture de la règle : un chevron montre la graduation en face du haut de l'image */}
        {pas?.geste === "montrer" && pas.quoi === "regle" && <path className="pl-main-pointe" d={`M ${r2(regleIci.x + 28)} ${r2(hautDeLImage - 5)} l -6 5 l 6 5`} aria-hidden="true" />}

        {/* la loupe, posée sur le repère de la pièce qu'on déplace */}
        <text x={LOUPE.x} y={LOUPE.y - LOUPE.r - 8} textAnchor="middle" className="pl-fort">Loupe : {nomDe(montree)}</text>
        <LoupeRail x={LOUPE.x} y={LOUPE.y} r={LOUPE.r} parMm={LOUPE.parMm} valeur={valeurLoupe} de={0} a={r.rail} nom={`Loupe sur le repère ${duNom(montree)}`}
          deplace={(x) => glisse(montree, x)} tenu={(tenu) => { if (tenu) setActif(montree); tient(montree, true)(tenu); }} />
        <text x={LOUPE.x} y={LOUPE.y + LOUPE.r + 13} textAnchor="middle">glisse ici : réglage fin</text>
        {/* avec le guide, pendant une lecture : un chevron montre le repère, sous la graduation */}
        {pas?.geste === "montrer" && pas.quoi === "loupe" && <path className="pl-main-pointe" d={`M ${LOUPE.x - 6} ${LOUPE.y + 42} l 6 -6 l 6 6`} aria-hidden="true" />}

        {/* les deux interrupteurs */}
        <Interrupteur x={INTERRUPTEURS.lampe.x} y={INTERRUPTEURS.lampe.y} ferme={etat.lampe} nom="Lampe de la source" bascule={() => { agit({ g: "lampe", on: !etat.lampe }); setMessage(etat.lampe ? "La lampe de la source est éteinte." : "La lampe de la source est allumée."); }} />
        <text x={INTERRUPTEURS.lampe.x} y={INTERRUPTEURS.lampe.y - 22} textAnchor="middle">lampe {etat.lampe ? "allumée" : "éteinte"}</text>
        <Interrupteur x={INTERRUPTEURS.salle.x} y={INTERRUPTEURS.salle.y} ferme={etat.salle} nom="Lumière de la salle" bascule={() => { agit({ g: "salle", on: !etat.salle }); setMessage(etat.salle ? "La salle est dans le noir." : "La lumière de la salle est allumée."); }} />
        <text x={INTERRUPTEURS.salle.x} y={INTERRUPTEURS.salle.y - 22} textAnchor="middle">salle {etat.salle ? "éclairée" : "éteinte"}</text>

        <Manipulation pose={poser} prise={prise} rate={rate}>
          {/* le rail gradué, sur la table */}
          <line className="pl-optique-table" x1={0} x2={360} y1={RAIL.y + 36} y2={RAIL.y + 36} />
          <rect className="pl-optique-banc" x={RAIL.x - 8} y={RAIL.y} width={RAIL.l + 16} height={9} rx={2} />
          <Echelle x={RAIL.x} y={RAIL.y + 9} longueur={RAIL.l} de={0} a={r.rail} pas={1} majeur={10} debout={false} trait={2.2} />
          <text x={RAIL.x + RAIL.l + 8} y={RAIL.y + 32} textAnchor="end">cm</text>

          {/* la lumière, de la source à l'écran */}
          {etat.lampe && <path className="pl-optique-faisceau" d={contour} />}

          {/* la source : une lettre lumineuse qui glisse sur le rail, ou un collimateur fixe qui donne un objet très éloigné */}
          {r.source.genre === "lettre" ? (
            <Cavalier valeur={etat.objet} origine={RAIL.x} parCm={parCm} y={AXE - 50} h={RAIL.y + 18 - (AXE - 50)} nom="Objet lumineux, sur le rail" choisi={montree === "objet"} deplace={(x) => glisse("objet", x)} choisit={() => setActif("objet")} tenu={tient("objet", false)}>
              <Pied haut={AXE + 17} />
              <rect className="pl-optique-boitier" x={-34} y={AXE - 17} width={31} height={34} rx={6} />
              <path className="pl-verre" d={`M -27 ${AXE - 21} v 4 M -20 ${AXE - 21} v 4 M -13 ${AXE - 21} v 4`} />
              {etat.lampe && <circle className="pl-optique-halo" cx={0} cy={AXE} r={13} />}
              <rect className={`pl-optique-diapo${etat.lampe ? " est-allumee" : ""}`} x={-3} y={AXE - 13} width={4.5} height={26} rx={1} />
              <text className="pl-optique-nom" x={-14} y={AXE - 30} textAnchor="middle">objet</text>
            </Cavalier>
          ) : (
            <g>
              <path className="pl-optique-tige" d={`M ${X(2.5)} ${AXE + 13} V ${RAIL.y} M ${X(r.source.x - 1.5)} ${AXE + 13} V ${RAIL.y}`} />
              <rect className="pl-optique-boitier" x={X(0.5)} y={AXE - 13} width={r2((r.source.x - 0.5) * parCm)} height={26} rx={5} />
              {etat.lampe && <circle className="pl-optique-halo" cx={X(r.source.x)} cy={AXE} r={13} />}
              <path className="pl-optique-verre" d={`M ${X(r.source.x)} ${AXE - 12} Q ${r2(X(r.source.x) + 4)} ${AXE} ${X(r.source.x)} ${AXE + 12} Q ${r2(X(r.source.x) - 4)} ${AXE} ${X(r.source.x)} ${AXE - 12} Z`} />
              <text x={X(r.source.x / 2)} y={AXE - 30} textAnchor="middle">objet</text>
              <text x={X(r.source.x / 2)} y={AXE - 20} textAnchor="middle">lointain</text>
            </g>
          )}

          {/* les supports de lentille */}
          {etat.supports.map((s, i) => (
            <Cavalier key={SUPPORTS[i]} valeur={s.x} origine={RAIL.x} parCm={parCm} y={AXE - 50} h={RAIL.y + 18 - (AXE - 50)} choisi={montree === SUPPORTS[i]} deplace={(x) => glisse(SUPPORTS[i], x)} choisit={() => setActif(SUPPORTS[i])} tenu={tient(SUPPORTS[i], false)}
              nom={lentilles[i] ? `Support de la lentille de ${vergence(lentilles[i].etiquette)}, sur le rail` : lunette ? `${i === 0 ? "Premier" : "Second"} support, vide, sur le rail` : "Support de lentille, vide, sur le rail"}>
              <Pied haut={AXE + 26} />
              <Monture lentille={lentilles[i]} />
              <text className="pl-optique-nom" x={0} y={AXE - 32} textAnchor="middle">{lentilles[i] ? vergence(lentilles[i].etiquette) : "vide"}</text>
            </Cavalier>
          ))}

          {/* ce qui reçoit l'image : un écran qui glisse, ou un œil fictif fixe */}
          {r.recepteur.genre === "ecran" ? (
            <Cavalier valeur={etat.ecran} origine={RAIL.x} parCm={parCm} y={AXE - 50} h={RAIL.y + 18 - (AXE - 50)} nom="Écran, sur le rail" choisi={montree === "ecran"} deplace={(x) => glisse("ecran", x)} choisit={() => setActif("ecran")} tenu={tient("ecran", false)}>
              <Pied haut={AXE + 36} />
              <rect className="pl-optique-plaque" x={-2.5} y={AXE - 36} width={5} height={72} rx={1} />
              <text className="pl-optique-nom" x={0} y={AXE - 42} textAnchor="middle">écran</text>
            </Cavalier>
          ) : (
            <g>
              <path className="pl-optique-tige" d={`M ${X(r.recepteur.x + 1.5)} ${AXE + 15} V ${RAIL.y} M ${X(r.recepteur.x + r.recepteur.f - 1.5)} ${AXE + 15} V ${RAIL.y}`} />
              <path className="pl-optique-boitier" d={`M ${X(r.recepteur.x)} ${AXE - 15} H ${X(r.recepteur.x + r.recepteur.f)} V ${AXE + 15} H ${X(r.recepteur.x)} Z`} />
              <path className="pl-optique-verre" d={`M ${X(r.recepteur.x)} ${AXE - 14} Q ${r2(X(r.recepteur.x) + 5)} ${AXE} ${X(r.recepteur.x)} ${AXE + 14} Q ${r2(X(r.recepteur.x) - 5)} ${AXE} ${X(r.recepteur.x)} ${AXE - 14} Z`} />
              <rect className="pl-optique-plaque" x={r2(X(r.recepteur.x + r.recepteur.f) - 2)} y={AXE - 15} width={4} height={30} rx={1} />
              <text x={X(r.recepteur.x + r.recepteur.f / 2)} y={AXE - 30} textAnchor="middle">œil fictif</text>
            </g>
          )}

          {/* où poser la lentille qu'on tient */}
          {etat.supports.map((s, i) => (
            <Cible key={SUPPORTS[i]} id={`support-${SUPPORTS[i]}`} nom={lunette ? (i === 0 ? "le premier support" : "le second support") : "le support de lentille"} x={surLeRail(SUPPORTS[i]).x} y={AXE} r={24}
              accepte={r.boite.filter((l) => l.id !== s.lentille).map((l) => l.id)} />
          ))}

          {/* la boîte de lentilles : une lentille posée sur le banc laisse sa case vide ; la toucher range la lentille */}
          <rect className="pl-optique-boite" x={BOITE.x} y={BOITE.y} width={BOITE.l} height={BOITE.h} rx={10} />
          <text x={BOITE.x + 10} y={BOITE.y + 15}>Boîte de lentilles</text>
          {r.boite.map((l) => {
            const { x, y } = cases.get(l.id) ?? { x: 0, y: 0 };
            return etat.supports.some((s) => s.lentille === l.id) ? (
              <g key={l.id} className="pl-optique-ranger" role="button" tabIndex={0} aria-label={`Ranger la lentille de ${vergence(l.etiquette)} dans la boîte`} onClick={() => range(l)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); range(l); } }}>
                <rect x={x - 24} y={y - 33} width={48} height={80} fill="transparent" />
                <rect className="pl-optique-case" x={x - 9} y={y - 26} width={18} height={52} rx={4} />
                <text x={x} y={y + 40} textAnchor="middle">sur le banc</text>
              </g>
            ) : (
              // la zone de toucher couvre la lentille et son étiquette : elle est centrée un peu plus bas que le verre
              <Objet key={l.id} id={l.id} nom={`Lentille de ${vergence(l.etiquette)}`} x={x} y={y + 7} l={48} h={80}>
                <g transform="translate(0 -7)">
                  <rect className="pl-optique-monture" x={-7} y={-26} width={14} height={52} rx={4} />
                  <Verre lentille={l} h={22} />
                  <text x={0} y={40} textAnchor="middle" className="pl-fort">{vergence(l.etiquette)}</text>
                </g>
              </Objet>
            );
          })}
        </Manipulation>

        {/* ce que l'élève a déjà noté */}
        <text x={8} y={VUE.y + VUE.h - 6} className="pl-fort">
          {lunette ? (etat.releves.length > 0 ? "Positions notées" : "") : `Mesures notées : ${Math.min(etat.releves.length, nombreVoulu)} sur ${nombreVoulu}`}
        </text>
        {derniereTaille && <text x={352} y={VUE.y + VUE.h - 6} textAnchor="end" className="pl-fort">Taille notée : {cm(derniereTaille.v)}</text>}

        {/* la main du guide, par-dessus tout le reste */}
        <Main indication={indication} />
      </Scene>
    </Etabli>
  );
}
