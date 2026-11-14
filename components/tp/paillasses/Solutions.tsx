"use client";

// La paillasse Solutions (décision 0012). L'élève y prépare une solution par dilution, à la main : il prend sa verrerie
// sur l'étagère (avec ses pièges), verse un peu de solution mère dans le bécher, aspire à la pipette jusqu'au trait de
// jauge, vide dans la fiole, ajoute l'eau à la pissette (au jet, puis goutte à goutte en regardant la loupe), bouche et
// retourne. Rien ne lui dit s'il est au trait : il le lit à la loupe.
// Chaque geste passe par les règles (lib/commun/tp/paillasses/solutions.ts) ; la liste des gestes part au serveur.
// Le guide (lib/commun/tp/paillasses/solutions-guide.ts) dit le prochain geste ; ici, la main le montre à sa place dans le dessin.

import { useCallback, useId, useRef, useState } from "react";
import { AU_DESSUS, BECHER, COL, GOUTTE, JUSTESSE_BECHER, concentrationEcrite, couches, lectureOutil, nomDe, pieces, plein, regles, total, verrerie, type EtatSolutions, type ReglagesSolutions, type Verrerie } from "@/lib/commun/tp/paillasses/solutions";
import { debitAspire, debitJet, nomPiece, pose, prochain, type CibleSolutions, type PasDuGuide, type PosesSolutions, type PoussoirSolutions } from "@/lib/commun/tp/paillasses/solutions-guide";
import type { GesteBrut, PropsPaillasse } from "@/lib/commun/tp/types";
import { Becher, Cible, EAU, Eprouvette, Etabli, Filet, Flacon, Goutte, Loupe, LoupeNiveau, Main, Manipulation, Objet, PipetteJaugee, Pissette, Poussoir, Scene, couleurSolution, son, useGuide, useVersement, type Indication, type Point, type Vue } from "../kit";
import "./solutions.css";

// ---------- la place de chaque chose dans le dessin (360 de large) ----------
const VUE: Vue = { x: 0, y: -44, l: 360, h: 566 };
const PLANCHE = 84;                               // le dessus de l'étagère
const TABLE = 488;                                // le dessus de la paillasse
const AXE = 182;                                  // l'axe du récipient de la solution fille
const LOUPE = { x: 294, y: 198, r: 54 };
const POT = { x: 88, y: 250, l: 54, h: 50 };      // le bécher de prélèvement : il ne bouge pas
const TABLETTE = POT.y + POT.h;                   // la tablette qui porte le flacon de solution mère et ce bécher
const REPOS = { flacon: { x: 40, y: 262 }, pissette: { x: 330, y: TABLE - 26 }, bouchon: { x: 286, y: TABLE - 6 } };
const FLACON_PENCHE = { x: 66, y: 226 };          // le flacon au-dessus du bécher, et l'endroit d'où coule la solution
const BEC = { x: 102, y: 240 };

const r2 = (n: number) => Math.round(n * 100) / 100;
/** Le nom de chaque groupe de l'étagère, et le pronom de chaque pièce : « un anneau vert montre où la poser ». */
const GROUPES: Record<Verrerie["genre"], { groupe: string; pronom: string }> = {
  pipette: { groupe: "pipettes jaugées", pronom: "la" }, eprouvette: { groupe: "éprouvette", pronom: "la" },
  fiole: { groupe: "fioles jaugées", pronom: "la" }, becher: { groupe: "bécher", pronom: "le" },
};
const nomLong = (p: Verrerie) => { const nom = nomPiece(p); return `${nom[0].toUpperCase()}${nom.slice(1)}`; };
/** Ce que l'élève tient, dans une phrase, avec son pronom. */
const OBJETS: Record<string, [string, string]> = { flacon: ["le flacon de solution mère", "le"], pissette: ["la pissette", "la"], bouchon: ["le bouchon", "le"] };

/** L'échelle du dessin d'une fiole jaugée : une fiole de 100 mL est plus grande qu'une fiole de 50 mL. */
const echelle = (p: Verrerie) => 0.54 + p.capacite * 0.0036;
/** La hauteur et la largeur du dessin d'une pièce. */
const hauteur = (p: Verrerie): number => (p.genre === "pipette" ? 84 + p.capacite * 1.2 : p.genre === "eprouvette" ? 78 : p.genre === "fiole" ? 108 * echelle(p) : 56);
const largeur = (p: Verrerie): number => (p.genre === "fiole" ? 64 * echelle(p) + 5 : p.genre === "becher" ? 60 : 44);

interface Place { nom: string; piece: Verrerie; x: number; l: number }
/** Les places de l'étagère, de gauche à droite : chaque pièce y a la sienne, et y revient. */
function etagere(r: ReglagesSolutions): Place[] {
  const toutes = pieces(r);
  const debut = (360 - toutes.reduce((somme, p) => somme + largeur(p), 0)) / 2;
  return toutes.map((piece, i) => ({ nom: nomDe(piece), piece, l: largeur(piece), x: debut + toutes.slice(0, i).reduce((somme, p) => somme + largeur(p), 0) + largeur(piece) / 2 }));
}

interface Partie { etat: EtatSolutions; gestes: GesteBrut[] }
const CUMULS = ["verser", "aspirer", "vider", "eau"];
/** Ajoute un geste à la liste. Les morceaux d'un même versement se regroupent : la liste reste courte, et rejouée elle donne le même état. */
function ajoute(gestes: GesteBrut[], g: GesteBrut): GesteBrut[] {
  const dernier = gestes[gestes.length - 1];
  const a = dernier?.v, b = g.v;
  const continu = dernier !== undefined && dernier.g === g.g && typeof a === "number" && typeof b === "number" && CUMULS.includes(g.g) && dernier.jet === g.jet && a + b <= 300;
  return continu ? [...gestes.slice(0, -1), { ...dernier, v: Math.round((a + b) * 100) / 100 }] : [...gestes, g];
}

// ---------- les dessins ----------

/** Le liquide d'un récipient, en deux couches quand la solution n'est pas la même en haut et en bas. La découpe suit le contour. */
function Contenu({ contour, surface, limite, fond, bas, haut }: { contour: string; surface: number; limite: number; fond: number; bas: string; haut: string }) {
  const id = useId();
  const part = fond > surface ? Math.max(0, Math.min(1, (limite - surface) / (fond - surface))) : 0;
  const uni = bas === haut || part <= 0.01;
  return (
    <>
      <defs>
        <clipPath id={`${id}c`}><path d={`${contour} Z`} /></clipPath>
        {!uni && (
          <linearGradient id={`${id}d`} gradientUnits="userSpaceOnUse" x1={0} x2={0} y1={r2(surface)} y2={r2(fond)}>
            <stop offset={0} stopColor={haut} /><stop offset={r2(Math.max(0, part - 0.08))} stopColor={haut} />
            <stop offset={r2(Math.min(1, part + 0.08))} stopColor={bas} /><stop offset={1} stopColor={bas} />
          </linearGradient>
        )}
      </defs>
      <rect clipPath={`url(#${id}c)`} x={-44} y={r2(surface)} width={88} height={r2(Math.max(0, fond - surface + 2))} fill={uni ? bas : `url(#${id}d)`} />
    </>
  );
}

/** Où est la surface du liquide dans une fiole dessinée à l'échelle `s` autour de son centre : le corps se remplit, puis le col. */
const niveauFiole = (s: number, capacite: number, volume: number): number => {
  const part = volume / capacite;
  return part <= COL ? 54 * s - (part / COL) * 58 * s : -4 * s - (Math.min(1 + AU_DESSUS, part) - COL) / (1 - COL) * 32 * s;
};
/** Où est la surface du liquide dans le bécher gradué, dessiné autour de son centre. */
const niveauBecher = (capacite: number, volume: number): number => 28 - (Math.min(volume, capacite * 1.25) / (capacite * 1.25)) * 52;

interface Liquide { volume: number; limite: number; bas: string; haut: string }

/** Une fiole jaugée, dessinée autour de son centre : un long col, un corps renflé, le trait de jauge, son bouchon. */
function FioleJaugee({ piece, liquide, bouche }: { piece: Verrerie; liquide: Liquide | null; bouche: boolean }) {
  const s = echelle(piece);
  const y = -54 * s;
  const p = (dx: number, dy: number) => `${r2(dx * s)} ${r2(y + dy * s)}`;
  const contour = `M ${p(-6, 0)} V ${r2(y + 50 * s)} C ${p(-6, 62)} ${p(-32, 70)} ${p(-32, 92)} Q ${p(-32, 108)} ${p(-16, 108)} H ${r2(16 * s)} Q ${p(32, 108)} ${p(32, 92)} C ${p(32, 70)} ${p(6, 62)} ${p(6, 50)} V ${r2(y)}`;
  return (
    <g>
      {liquide && liquide.volume > 0 && <Contenu contour={contour} surface={niveauFiole(s, piece.capacite, liquide.volume)} limite={niveauFiole(s, piece.capacite, liquide.limite)} fond={54 * s} bas={liquide.bas} haut={liquide.haut} />}
      <path className="pl-verre" d={contour} />
      <line className="pl-repere" x1={r2(-9 * s)} x2={r2(9 * s)} y1={r2(y + 18 * s)} y2={r2(y + 18 * s)} />
      {bouche && <path className="pl-solutions-bouchon" d={`M ${r2(-8 * s)} ${r2(y - 7)} H ${r2(8 * s)} L ${r2(5.4 * s)} ${r2(y + 6)} H ${r2(-5.4 * s)} Z`} />}
    </g>
  );
}

/** Le bécher gradué, dessiné autour de son centre : ses graduations sont larges, et peu justes. */
function BecherGradue({ piece, liquide }: { piece: Verrerie; liquide: Liquide | null }) {
  const contour = "M -27 -28 V 22 Q -27 28 -21 28 H 21 Q 27 28 27 22 V -28";
  const graduation = (v: number) => r2(niveauBecher(piece.capacite, v * JUSTESSE_BECHER));
  return (
    <g>
      {liquide && liquide.volume > 0 && <Contenu contour={contour} surface={niveauBecher(piece.capacite, liquide.volume)} limite={niveauBecher(piece.capacite, liquide.limite)} fond={28} bas={liquide.bas} haut={liquide.haut} />}
      <path className="pl-verre" d={`M -30 -28 H -27 ${contour.slice(9)} H 30`} />
      {[0.25, 0.5, 0.75, 1].map((k) => <line key={k} className="pl-solutions-graduation" x1={-27} x2={k === 1 ? -13 : -19} y1={graduation(piece.capacite * k)} y2={graduation(piece.capacite * k)} />)}
      <text x={-10} y={graduation(piece.capacite) + 3} style={{ fontSize: 7 }}>{piece.capacite}</text>
    </g>
  );
}

/**
 * La loupe posée sur le trait de jauge d'une pipette ou d'une fiole : le trait reste au milieu, le liquide monte vers lui.
 * `manque` : le volume qui manque pour que le bas du ménisque arrive sur le trait (négatif au-dessus du trait).
 * `parMl` : la hauteur d'un millilitre dans la loupe.
 */
function LoupeTrait({ manque, parMl, couleur, liquide, nom }: { manque: number; parMl: number; couleur: string; liquide: boolean; nom: string }) {
  const { x, y, r } = LOUPE;
  const demi = r2(r * 0.42);
  const menisque = `M ${x - demi} ${y - 5} Q ${x} ${y + 5} ${x + demi} ${y - 5}`;
  return (
    <Loupe x={x} y={y} r={r} nom={nom}>
      {liquide && (
        <g className="pl-solutions-niveau" transform={`translate(0 ${r2(manque * parMl)})`}>
          <path d={`${menisque} V ${y + 600} H ${x - demi} Z`} fill={couleur} />
          <path className="pl-menisque" d={menisque} />
        </g>
      )}
      <line className="pl-verre" x1={x - demi} x2={x - demi} y1={y - r} y2={y + r} />
      <line className="pl-verre" x1={x + demi} x2={x + demi} y1={y - r} y2={y + r} />
      <line className="pl-repere" x1={x - demi - 4} x2={x + demi + 4} y1={y} y2={y} />
    </Loupe>
  );
}

/** Une pièce de verrerie, dessinée autour de son centre. `contenu` : ce qu'on lit dans un outil de prélèvement. */
function Piece({ piece, contenu = 0, couleur = EAU, poire = false, liquide = null, bouche = false }: { piece: Verrerie; contenu?: number; couleur?: string; poire?: boolean; liquide?: Liquide | null; bouche?: boolean }) {
  const h = hauteur(piece);
  if (piece.genre === "pipette") {
    return (
      <g>
        {poire && <ellipse className="pl-solutions-poire" cx={0} cy={r2(-h / 2 - 7)} rx={6.5} ry={9} />}
        <PipetteJaugee x={0} y={-h / 2} h={h} remplissage={contenu / piece.capacite} couleur={couleur} />
      </g>
    );
  }
  if (piece.genre === "eprouvette") return <Eprouvette x={0} y={-h / 2} l={20} h={h} volume={contenu} capacite={piece.capacite} couleur={couleur} pas={1} majeur={5} />;
  if (piece.genre === "fiole") return <FioleJaugee piece={piece} liquide={liquide} bouche={bouche} />;
  return <BecherGradue piece={piece} liquide={liquide} />;
}

// ---------- la paillasse ----------

export default function Solutions({ reglages: r, protocole, attente, fini }: PropsPaillasse<ReglagesSolutions>) {
  const [partie, setPartie] = useState<Partie>(() => ({ etat: regles.depart(r), gestes: [] }));
  const [message, setMessage] = useState("Prends un objet en le glissant, ou touche-le puis touche l'endroit où le poser.");
  /** ce qui est tenu au-dessus d'un récipient : le flacon au-dessus du bécher, la pissette au-dessus de la solution fille */
  const [poses, setPoses] = useState<PosesSolutions>({ flacon: false, pissette: false });
  const [jet, setJet] = useState<"flacon" | "outil" | "pissette" | null>(null);
  const [chute, setChute] = useState(0);
  /** le dernier mouvement donné au récipient : il se rejoue à chaque geste, jamais tout seul */
  const [mouvement, setMouvement] = useState<{ genre: "retourne" | "agite"; n: number } | null>(null);
  const guide = useGuide();
  const versement = useVersement();
  const { etat, gestes } = partie;

  // un geste qui ne change rien n'entre pas dans la liste : rejouée par le serveur, elle donne le même état
  const agit = useCallback((g: GesteBrut) => setPartie((p) => {
    const suite = regles.geste(r, p.etat, g);
    return suite === p.etat ? p : { etat: suite, gestes: ajoute(p.gestes, g) };
  }), [r]);
  /** le temps écoulé depuis la dernière goutte, pendant un appui sur « Goutte » */
  const depuisGoutte = useRef(0);

  // ----- ce que l'état donne à voir -----
  const places = etagere(r);
  const outil = verrerie(r, etat.outil);
  const recipient = verrerie(r, etat.recipient);
  const mere = couleurSolution(r.teinte, 1);
  // une solution cinq ou dix fois diluée reste nettement colorée : la teinte ne suit pas la concentration en ligne droite
  const teinte = (c: number) => (c <= 0 ? EAU : couleurSolution(r.teinte, (c / r.Cmere) ** 0.6));
  const volume = total(etat);
  const c = couches(r, etat);
  const liquide: Liquide = { volume, limite: c.limite, bas: teinte(c.bas), haut: teinte(c.haut) };
  const haut = recipient ? TABLE - hauteur(recipient) : TABLE;
  const surface = !recipient ? TABLE : TABLE - hauteur(recipient) / 2 + (recipient.genre === "fiole" ? niveauFiole(echelle(recipient), recipient.capacite, volume) : niveauBecher(recipient.capacite, volume));
  const niveauPot = Math.min(1, etat.becher / BECHER) * 0.88;
  /** où se tient la pissette au-dessus du récipient : plus haut au-dessus d'un bécher, qui est large */
  const pissetteIci = { x: AXE + 24, y: haut - (recipient?.genre === "becher" ? 32 : 20) };
  const eprouvette = outil?.genre === "eprouvette";
  /** où se dessine l'outil sorti de l'étagère : son centre */
  const outilIci = !outil ? null
    : etat.ou === "recipient" ? (eprouvette ? { x: AXE + 35, y: haut - 24 } : { x: AXE, y: haut + 8 - hauteur(outil) / 2 })
    : etat.ou === "flacon" ? { x: REPOS.flacon.x, y: TABLETTE - 8 - hauteur(outil) / 2 }
    : eprouvette ? { x: POT.x + POT.l + 20, y: TABLETTE - hauteur(outil) / 2 } : { x: POT.x + POT.l - 14, y: TABLETTE - 6 - hauteur(outil) / 2 };
  const loupeSurOutil = outil !== null && !poses.pissette && (etat.ou !== "recipient" || etat.dansOutil > 0 || !recipient);
  const titreLoupe = loupeSurOutil ? (eprouvette ? "Loupe : l'éprouvette" : "Loupe : le trait de la pipette") : recipient ? (recipient.genre === "fiole" ? "Loupe : le trait de la fiole" : "Loupe : le bécher") : "Loupe";
  /** où se trouve chaque objet, chaque cible, chaque poussoir : le dessin et la main du guide lisent les mêmes places */
  const objets: Record<string, Point> = {
    ...Object.fromEntries(places.map((p) => [p.nom, p.nom === etat.recipient ? { x: AXE, y: TABLE - hauteur(p.piece) / 2 } : p.nom === etat.outil && outilIci ? outilIci : { x: r2(p.x), y: PLANCHE - hauteur(p.piece) / 2 }])),
    flacon: poses.flacon ? FLACON_PENCHE : REPOS.flacon,
    pissette: poses.pissette && recipient ? pissetteIci : REPOS.pissette,
    bouchon: etat.bouche ? { x: AXE, y: haut } : { x: REPOS.bouchon.x, y: REPOS.bouchon.y - 12 },
  };
  const cibles: Record<CibleSolutions, Point> = {
    plan: { x: AXE, y: TABLE - 46 }, becher: { x: POT.x + POT.l / 2, y: POT.y + 12 }, flacon: { x: REPOS.flacon.x, y: REPOS.flacon.y - 30 }, recipient: { x: AXE, y: haut + 4 },
    etagere: { x: r2(places.find((p) => p.nom === etat.outil)?.x ?? 0), y: PLANCHE - 44 },
    "rangement-flacon": REPOS.flacon, "rangement-pissette": REPOS.pissette, "rangement-bouchon": { x: REPOS.bouchon.x, y: REPOS.bouchon.y - 12 },
  };
  const xPoussoir = outilIci ? outilIci.x + 44 : 0;
  const poussoirs: Record<PoussoirSolutions, Point> = {
    verser: { x: 30, y: 166 }, aspirer: { x: xPoussoir, y: etat.ou === "flacon" ? 178 : 206 }, redescendre: { x: xPoussoir, y: etat.ou === "flacon" ? 228 : 256 },
    vider: { x: AXE - 52, y: haut - 36 }, jet: { x: AXE + 86, y: haut - 46 }, goutte: { x: AXE + 86, y: haut + 4 }, agiter: { x: 108, y: TABLE - 48 }, retourner: { x: 46, y: TABLE - 48 },
  };

  // ----- prendre et poser -----
  const poser = (objet: string, cible: string) => {
    const suite = pose(r, etat, poses, objet, cible);
    suite.gestes.forEach(agit);
    setPoses(suite.poses);
    // avec le guide, c'est lui qui dit le geste suivant : le message s'en tient à ce qui vient de se passer
    if (suite.message) setMessage(suite.conseil && !guide.actif ? `${suite.message} ${suite.conseil}` : suite.message);
    if (objet === "pissette") setChute(0);
    if (verrerie(r, objet)?.genre === "fiole" || verrerie(r, objet)?.genre === "becher") setMouvement(null);
  };
  /** L'élève prend un objet : la paillasse dit ce qu'il tient, et pourquoi rien ne peut le recevoir si c'est le cas. */
  const prise = (objet: string, ou: string[]) => {
    const piece = verrerie(r, objet);
    const [quoi, pronom] = piece ? [`la ${nomPiece(piece)}`.replace("la bécher", "le bécher").replace("la éprouvette", "l'éprouvette"), GROUPES[piece.genre].pronom] : OBJETS[objet] ?? ["cet objet", "le"];
    setMessage(ou.length > 0 ? `Tu tiens ${quoi}. Un anneau vert montre où ${pronom} poser.`
      : objet === "bouchon" ? (recipient?.genre === "becher" ? "Tu tiens le bouchon, mais un bécher ne se bouche pas : il va sur une fiole jaugée." : "Tu tiens le bouchon : il va sur une fiole jaugée, et il n'y en a pas encore sur la paillasse.")
      : objet === "pissette" ? "Tu tiens la pissette, mais elle n'a rien à remplir : pose d'abord une fiole jaugée sur la paillasse."
      : `Tu tiens ${quoi}, mais sa place est prise pour l'instant.`);
  };
  const rate = () => setMessage("Rien ne se pose à cet endroit. Reprends l'objet : un anneau vert montre où il va.");

  const agite = () => {
    agit({ g: "agiter" });
    setMouvement((m) => ({ genre: "agite", n: (m?.n ?? 0) + 1 }));
    setMessage(recipient?.genre === "becher" ? "Tu remues le bécher : la solution se mélange." : "Tu agites la fiole : ce qui est dans son corps se mélange.");
  };
  const retourne = () => {
    agit({ g: "retourner" });
    setMouvement((m) => ({ genre: "retourne", n: (m?.n ?? 0) + 1 }));
    setMessage(etat.bouche ? `Fiole retournée ${etat.retournements + 1} fois.` : `${recipient?.genre === "becher" ? "Le bécher" : "La fiole"} n'avait pas de bouchon : la solution se répand sur la paillasse.`);
    son(etat.bouche ? "pose" : "faux");
  };
  const recommence = () => {
    agit({ g: "recommencer" });
    setPoses((p) => ({ ...p, pissette: false }));
    setMouvement(null);
    setMessage(recipient ? "Nouvelle solution : le récipient est vidé, puis rincé à l'eau distillée." : "Pose d'abord une fiole jaugée sur la paillasse.");
  };
  const toutRecommencer = () => {
    setPartie({ etat: regles.depart(r), gestes: [] });
    setPoses({ flacon: false, pissette: false });
    setMouvement(null);
    setMessage("La paillasse est remise comme au début.");
  };
  /** Une goutte d'eau distillée tombe de la pissette. */
  const goutte = () => { agit({ g: "eau", v: GOUTTE }); setChute((n) => n + 1); son("goutte"); };

  // ----- le guide : le prochain geste, et où la main le montre -----
  const pas: PasDuGuide | null = guide.actif ? prochain(r, etat, poses) : null;
  const laMain = (p: PasDuGuide): Indication["main"] => (p.geste === "glisser" ? { geste: "glisser", de: objets[p.objet], vers: cibles[p.cible] } : p.geste === "bouton" ? undefined : { geste: p.geste, ou: poussoirs[p.poussoir] });
  const indication: Indication | null = pas && { cle: pas.cle, texte: pas.texte, etape: pas.etape, main: laMain(pas), appel: pas.geste === "bouton" && pas.bouton === "fini" };
  const outils = <button type="button" className={`btn btn-ligne${pas?.geste === "bouton" && pas.bouton === "recommencer" ? " pl-vise" : ""}`} onClick={recommence}>Recommencer la solution</button>;

  return (
    <Etabli titre="Dilution" protocole={protocole} message={message} attente={attente} fini={() => fini(gestes)} recommence={toutRecommencer} outils={outils} indication={indication}>
      <Scene vue={VUE} nom="La paillasse de la dilution : une étagère de verrerie, le flacon de solution mère, un bécher, une pissette d'eau distillée et un bouchon">
        <Manipulation pose={poser} prise={prise} rate={rate}>
          {/* l'étagère : sa planche, et le nom de ce qu'elle porte */}
          <rect className="pl-solutions-planche" x={6} y={PLANCHE} width={348} height={5} rx={2} />
          {places.map((p) => <text key={p.nom} x={r2(p.x)} y={PLANCHE + 17} textAnchor="middle">{p.piece.capacite} mL</text>)}
          {(["pipette", "eprouvette", "fiole", "becher"] as const).map((genre) => {
            const groupe = places.filter((p) => p.piece.genre === genre);
            return groupe.length > 0 && <text key={genre} x={r2(groupe.reduce((s, p) => s + p.x, 0) / groupe.length)} y={PLANCHE + 28} textAnchor="middle">{GROUPES[genre].groupe}</text>;
          })}
          {places.filter((p) => p.nom === etat.outil || p.nom === etat.recipient).map((p) => <rect key={p.nom} className="pl-solutions-place" x={r2(p.x - p.l / 2 + 6)} y={r2(PLANCHE - hauteur(p.piece) - 4)} width={p.l - 12} height={r2(hauteur(p.piece) + 2)} rx={6} />)}

          {/* la paillasse, la tablette et le bécher de prélèvement, les noms */}
          <line className="pl-solutions-table" x1={6} x2={354} y1={TABLE} y2={TABLE} />
          <rect className="pl-solutions-planche" x={6} y={TABLETTE} width={182} height={5} rx={2} />
          <Becher x={POT.x} y={POT.y} l={POT.l} h={POT.h} niveau={niveauPot} couleur={mere} />
          <text x={POT.x + POT.l / 2} y={TABLETTE + 17} textAnchor="middle">bécher</text>
          <text x={REPOS.flacon.x} y={TABLETTE + 17} textAnchor="middle">solution mère</text>
          {etat.becher >= BECHER && <text x={POT.x + POT.l / 2} y={POT.y - 6} textAnchor="middle" className="pl-fort" style={{ fill: "var(--brique)" }}>plein à ras bord</text>}
          {recipient && <text x={AXE} y={TABLE + 15} textAnchor="middle">{nomPiece(recipient)}</text>}
          <text x={REPOS.bouchon.x} y={TABLE + 15} textAnchor="middle">bouchon</text>
          <text x={REPOS.pissette.x} y={TABLE + 15} textAnchor="middle">pissette</text>
          {etat.perdue && <ellipse className="pl-solutions-flaque" cx={AXE + 34} cy={TABLE + 3} rx={62} ry={5} fill={couleurSolution(r.teinte, 0.55)} />}

          {/* la loupe : l'outil de prélèvement, ou le niveau dans le récipient */}
          {loupeSurOutil && outil ? (eprouvette
            ? <LoupeNiveau x={LOUPE.x} y={LOUPE.y} r={LOUPE.r} valeur={lectureOutil(r, etat)} pas={0.5} majeur={5} parUnite={16} monte de={0} a={outil.capacite} couleur={mere} liquide={etat.dansOutil > 0} nom="Loupe sur l'éprouvette, près du niveau du liquide" />
            : <LoupeTrait manque={outil.capacite - etat.dansOutil} parMl={110} couleur={mere} liquide={etat.dansOutil > 0} nom="Loupe sur le trait de jauge de la pipette" />)
            : recipient ? (recipient.genre === "fiole"
              ? <LoupeTrait manque={recipient.capacite - volume} parMl={40} couleur={liquide.haut} liquide={volume > 0} nom="Loupe sur le trait de jauge de la fiole" />
              : <LoupeNiveau x={LOUPE.x} y={LOUPE.y} r={LOUPE.r} valeur={volume / JUSTESSE_BECHER} pas={5} majeur={25} parUnite={1.6} monte de={0} a={recipient.capacite} couleur={liquide.haut} liquide={volume > 0} nom="Loupe sur le bécher gradué, près du niveau du liquide" />)
              : <Loupe x={LOUPE.x} y={LOUPE.y} r={LOUPE.r} nom="Loupe : rien à regarder pour le moment"><g /></Loupe>}
          <text x={LOUPE.x} y={LOUPE.y - LOUPE.r - 8} textAnchor="middle" className="pl-fort">{titreLoupe}</text>

          {/* le flacon de solution mère : au repos, ou penché au-dessus du bécher. Il se dessine avant la verrerie : une pipette plongée dedans se reprend par-dessus. */}
          <Objet id="flacon" nom={`Flacon de solution mère, ${r.nom}`} {...objets.flacon} l={54} h={78}>
            <g transform={poses.flacon ? "rotate(110)" : undefined}><Flacon x={0} y={-38} l={52} h={76} couleur={mere} etiquette={r.nom} sous={concentrationEcrite(r, r.Cmere)} /></g>
          </Objet>

          {/* la verrerie de l'étagère : chaque pièce est à sa place, ou là où l'élève l'a posée */}
          {places.map((p) => {
            const enMain = p.nom === etat.outil && outilIci !== null;
            const h = hauteur(p.piece);
            if (p.nom === etat.recipient) {
              return (
                <Objet key={p.nom} id={p.nom} nom={`${nomLong(p.piece)}, sur la paillasse`} {...objets[p.nom]} l={p.l} h={h + 6} actif={false}>
                  <g key={mouvement?.n ?? 0} className={mouvement ? `pl-solutions-${mouvement.genre}` : undefined}>
                    <Piece piece={p.piece} liquide={liquide} bouche={etat.bouche} />
                  </g>
                </Objet>
              );
            }
            return (
              <Objet key={p.nom} id={p.nom} nom={nomLong(p.piece)} {...objets[p.nom]} l={p.l} h={h + (p.piece.genre === "pipette" ? 18 : 6)}>
                <g transform={enMain && eprouvette && etat.ou === "recipient" ? "rotate(-115)" : undefined}>
                  <Piece piece={p.piece} contenu={enMain ? lectureOutil(r, etat) : 0} couleur={mere} poire={enMain} />
                </g>
              </Objet>
            );
          })}
          {poses.flacon && jet === "flacon" && <Filet x={BEC.x} y1={BEC.y} y2={POT.y + POT.h * (1 - niveauPot) - 1} couleur={mere} coule largeur={2.4} />}

          {/* la pissette d'eau distillée et le bouchon de la fiole */}
          <Objet id="pissette" nom="Pissette d'eau distillée" {...objets.pissette} l={44} h={56}>
            <Pissette x={0} y={-26} l={30} h={52} />
          </Objet>
          {poses.pissette && recipient && jet === "pissette" && <Filet x={AXE + 1} y1={pissetteIci.y - 19} y2={Math.max(pissetteIci.y - 10, surface)} couleur="rgba(200, 220, 240, 0.8)" coule />}
          {poses.pissette && recipient && !etat.bouche && chute > 0 && <Goutte x={AXE + 1} y1={pissetteIci.y - 18} y2={Math.max(pissetteIci.y - 10, surface)} couleur="rgba(200, 220, 240, 0.95)" cle={chute} />}
          <Objet id="bouchon" nom={etat.bouche ? "Bouchon, sur la fiole" : "Bouchon de la fiole"} {...objets.bouchon} l={44} h={44}>
            {!etat.bouche && <path className="pl-solutions-bouchon" d="M -8 5 H 8 L 5.4 18 H -5.4 Z" />}
          </Objet>
          {outil && outilIci && etat.ou === "recipient" && jet === "outil" && <Filet x={eprouvette ? AXE + 1 : AXE} y1={haut + (eprouvette ? -6 : 9)} y2={Math.max(haut + 12, surface)} couleur={mere} coule />}

          {/* les gestes : un bouton rond à côté de chaque outil */}
          {poses.flacon && (
            <Poussoir {...poussoirs.verser} nom="Verser la solution mère dans le bécher" texte="Verser"
              maintien={versement({ debit: 6, pas: 5, verse: (v) => agit({ g: "verser", v }), debut: () => setJet("flacon"), fin: () => { setJet(null); setMessage("Il y a de la solution mère dans le bécher."); } })} />
          )}
          {outil && outilIci && etat.ou !== "recipient" && (
            <>
              <Poussoir {...poussoirs.aspirer} r={eprouvette ? 24 : 22} nom={eprouvette ? "Remplir l'éprouvette" : "Aspirer dans la pipette"} texte={eprouvette ? "Remplir" : "Aspirer"}
                maintien={versement({ debit: debitAspire(outil, etat.dansOutil), pas: eprouvette ? 1 : 0.5, verse: (v) => agit({ g: "aspirer", v }) })} />
              <Poussoir {...poussoirs.redescendre} r={eprouvette ? 24 : 22} nom={eprouvette ? "Reverser un peu de l'éprouvette" : "Laisser redescendre le liquide de la pipette"} texte={eprouvette ? "Reverser" : "Vider"}
                maintien={versement({ debit: eprouvette ? 1.5 : 0.4, pas: eprouvette ? 0.5 : 0.05, verse: (v) => agit({ g: "vider", v }) })} />
            </>
          )}
          {outil && outilIci && etat.ou === "recipient" && recipient && (
            <Poussoir {...poussoirs.vider} nom="Vider dans le récipient" texte="Vider"
              maintien={versement({ debit: outil.capacite * 0.3, pas: 5, verse: (v) => agit({ g: "vider", v }), debut: () => setJet("outil"), fin: () => setJet(null) })} />
          )}
          {poses.pissette && recipient && (
            <>
              <Poussoir {...poussoirs.jet} nom="Ajouter de l'eau distillée au jet" texte="Jet"
                maintien={versement({ debit: debitJet(recipient, volume), pas: 1, verse: (v) => agit({ g: "eau", v, jet: true }), debut: () => { setJet("pissette"); if (etat.bouche) setMessage("La fiole est bouchée : l'eau coule sur le bouchon et tombe sur la paillasse."); }, fin: () => setJet(null) })} />
              <Poussoir {...poussoirs.goutte} nom="Ajouter de l'eau distillée goutte à goutte" texte="Goutte"
                maintien={{
                  // une goutte tout de suite, puis une tous les cinquièmes de seconde tant que l'appui dure
                  debut: () => { depuisGoutte.current = 0; goutte(); },
                  tic: (dt) => { depuisGoutte.current += dt; if (depuisGoutte.current >= 0.2) { depuisGoutte.current = 0; goutte(); } },
                  pas: goutte,
                }} />
            </>
          )}
          {recipient && volume > 0 && <Poussoir {...poussoirs.retourner} r={28} nom="Retourner le récipient" texte="Retourner" appuie={retourne} />}
          {recipient && volume > 0 && !etat.bouche && <Poussoir {...poussoirs.agiter} r={24} nom="Agiter le récipient" texte="Agiter" appuie={agite} />}

          {/* les cibles : où poser ce qu'on tient. Elles se dessinent en dernier : on les touche même au-dessus d'un objet. */}
          <Cible id="plan" nom="la paillasse" {...cibles.plan} r={34} accepte={places.filter((p) => (p.piece.genre === "fiole" || p.piece.genre === "becher") && p.nom !== etat.recipient).map((p) => p.nom)} />
          <Cible id="becher" nom="le bécher de prélèvement" {...cibles.becher} r={26}
            accepte={[...places.filter((p) => (p.piece.genre === "pipette" || p.piece.genre === "eprouvette") && !(p.nom === etat.outil && etat.ou === "becher")).map((p) => p.nom), ...(poses.flacon ? [] : ["flacon"])]} />
          {!poses.flacon && <Cible id="flacon" nom="le flacon de solution mère" {...cibles.flacon} r={22} accepte={places.filter((p) => p.piece.genre === "pipette" && !(p.nom === etat.outil && etat.ou === "flacon")).map((p) => p.nom)} />}
          {recipient && (
            <Cible id="recipient" nom={recipient.genre === "fiole" ? "le haut de la fiole" : "le bécher gradué"} {...cibles.recipient} r={26}
              accepte={[...places.filter((p) => (p.piece.genre === "pipette" || p.piece.genre === "eprouvette") && !(p.nom === etat.outil && etat.ou === "recipient")).map((p) => p.nom), ...(poses.pissette ? [] : ["pissette"]), ...(recipient.genre === "fiole" && !etat.bouche ? ["bouchon"] : [])]} />
          )}
          {etat.outil && <Cible id={`etagere-${etat.outil}`} nom="sa place sur l'étagère" {...cibles.etagere} r={22} accepte={[etat.outil]} />}
          <Cible id="rangement-flacon" nom="sa place sur la tablette" {...cibles["rangement-flacon"]} r={26} accepte={poses.flacon ? ["flacon"] : []} />
          <Cible id="rangement-pissette" nom="sa place sur la paillasse" {...cibles["rangement-pissette"]} r={24} accepte={poses.pissette ? ["pissette"] : []} />
          <Cible id="rangement-bouchon" nom="sa place sur la paillasse" {...cibles["rangement-bouchon"]} r={22} accepte={etat.bouche ? ["bouchon"] : []} />
        </Manipulation>
        <text x={8} y={VUE.y + VUE.h - 6}>{etat.essais > 0 ? `solution n° ${etat.essais + 1}` : ""}</text>
        {outil && etat.dansOutil >= plein(outil) && outil.genre === "pipette" && outilIci && <text x={Math.max(40, outilIci.x)} y={outilIci.y - hauteur(outil) / 2 - 26} textAnchor="middle" className="pl-fort" style={{ fill: "var(--brique)" }}>dans la poire</text>}
        {/* la main du guide, par-dessus tout le reste */}
        <Main indication={indication} />
      </Scene>
    </Etabli>
  );
}
