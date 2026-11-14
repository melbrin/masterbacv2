"use client";

// La paillasse « pointage » (décision 0012) : un logiciel de pointage, et un film à exploiter. L'élève y fait tout à la
// main : il glisse les deux repères de l'échelle sur les bouts de l'étalon et dit sa longueur, glisse l'origine sur le
// sol, puis pointe le centre de la balle sur chaque image, du doigt, en regardant la loupe. Ce sont ses pointés que le
// logiciel garde : les vitesses, les énergies et les courbes se calculent avec eux. Sur les courbes, il règle une
// droite sur la vitesse verticale et lit l'énergie mécanique au repère.
// Chaque geste passe par les règles (lib/commun/tp/paillasses/pointage.ts) ; la liste des gestes part au serveur.
// Le guide (lib/commun/tp/paillasses/pointage-guide.ts) dit le prochain geste ; ici, la main le montre à sa place dans le dessin.

import { useCallback, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { nombre } from "@/lib/commun/format";
import { CAMERA, boutsEtalon, dansImage, date, grandeurs, regles, trajectoire, type EtatPointage, type Point, type ReglagesPointage } from "@/lib/commun/tp/paillasses/pointage";
import { LIGNES_DU_CARNET, prochain, type LignePointage, type OutilPointage, type PasDuGuide, type PoigneePointage } from "@/lib/commun/tp/paillasses/pointage-guide";
import type { GesteBrut, PropsPaillasse } from "@/lib/commun/tp/types";
import { Etabli, Loupe, Main, Scene, Touche, son, useGlisse, useGuide, vibre, type Indication, type Vue } from "../kit";
import { Courbes, ONGLETS, axeEnergies, axeVitesse, placeCourbe, type Droite, type Onglet } from "./pointage-courbes";
import { Carnet, type LigneCarnet } from "./ultrasons-carnet";
import "./pointage.css";

// ---------- la place de chaque chose dans le dessin (360 de large) : l'image du film en haut, les commandes dessous ----------
const VUE: Vue = { x: 0, y: -6, l: 360, h: 598 };
const IMAGES = 507;      // la rangée des images : précédente, suivante
const OUTILS = 562;      // la rangée des outils
/** Les flèches des images et les touches des outils : le dessin et la main du guide lisent les mêmes places. */
const FLECHES = { precedente: { x: 28, y: IMAGES }, suivante: { x: 332, y: IMAGES } };
const TOUCHES: Record<OutilPointage, Point> = { echelle: { x: 62, y: OUTILS }, origine: { x: 180, y: OUTILS }, pointage: { x: 298, y: OUTILS } };
const LOUPE = { r: 54, grossit: 3 };
/** Pendant la lecture d'une énergie, le regard se rapproche des valeurs affichées sous les courbes. */
const VUE_LECTURE: Vue = { x: 22, y: 300, l: 338, h: 206 };
const r1 = (n: number) => Math.round(n * 10) / 10;
/** Un point ramené dans l'image, au dixième d'unité. */
const dansCadre = (p: Point): Point => ({ x: r1(Math.max(0, Math.min(CAMERA.l, p.x))), y: r1(Math.max(0, Math.min(CAMERA.h, p.y))) });
/** Au clavier : les flèches déplacent d'une unité ; Page haut et Page bas de dix unités en hauteur, Début et Fin de dix unités en largeur. */
function deplacement(touche: string): Point | null {
  const pas: Record<string, Point> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, PageUp: { x: 0, y: -10 }, PageDown: { x: 0, y: 10 }, Home: { x: -10, y: 0 }, End: { x: 10, y: 0 } };
  return Object.hasOwn(pas, touche) ? pas[touche] : null;
}

type Outil = OutilPointage;
/** Ce qui vient de se passer quand un outil est pris ; le conseil pour la suite ne s'ajoute que sans le guide, qui le dit déjà. */
const PRIS: Record<Outil, string> = { echelle: "Outil Échelle.", origine: "Outil Origine.", pointage: "Outil Pointage." };
const CONSEILS: Record<Outil, string> = {
  echelle: "Glisse les repères A et B sur l'image, puis dis la longueur qui les sépare.",
  origine: "Glisse l'origine O du repère sur l'image.",
  pointage: "Touche le centre de la balle, en regardant la loupe. L'image suivante vient ensuite.",
};

interface Partie { etat: EtatPointage; gestes: GesteBrut[] }
/** Ajoute un geste à la liste. Un repère, l'origine ou un pointé déplacé de nouveau remplace le déplacement d'avant : la liste reste courte, et rejouée elle donne le même état. */
function ajoute(gestes: GesteBrut[], g: GesteBrut): GesteBrut[] {
  const dernier = gestes[gestes.length - 1];
  const suite = dernier !== undefined && dernier.g === g.g && ((g.g === "etalon" && dernier.bout === g.bout) || g.g === "origine" || (g.g === "pointer" && dernier.i === g.i));
  return suite ? [...gestes.slice(0, -1), g] : [...gestes, g];
}

// ---------- le carnet ----------
type Quoi = LignePointage;
const SANS_COURBE = "Il n'y a pas encore de courbe des énergies : étalonne l'image, puis pointe au moins cinq images.";
const LIGNES: LigneCarnet<Quoi>[] = [
  { quoi: "longueur", court: LIGNES_DU_CARNET.longueur, nom: "Longueur de l'étalon, d'un repère à l'autre", unite: "m", exemple: "1,20", refus: "La longueur de l'étalon s'écrit en mètres, avec un nombre plus grand que zéro." },
  { quoi: "debut", court: LIGNES_DU_CARNET.debut, nom: "Énergie mécanique au premier point, lue au repère", unite: "mJ", exemple: "512,4", refus: SANS_COURBE },
  { quoi: "fin", court: LIGNES_DU_CARNET.fin, nom: "Énergie mécanique au dernier point, lue au repère", unite: "mJ", exemple: "498,7", refus: SANS_COURBE },
];
function dejaNote(etat: EtatPointage, quoi: Quoi): string | null {
  if (quoi === "longueur") return etat.longueur === null ? null : `${nombre(etat.longueur, 2)} m`;
  const releve = quoi === "debut" ? etat.debut : etat.fin;
  return releve ? `${nombre(releve.note, 1)} mJ` : null;
}

// ---------- le film ----------

// Le décor filmé : le mur de briques, le sol, l'étalon debout contre le mur, une bande tous les dix centimètres.
function Decor({ r, briques }: { r: ReglagesPointage; briques: string }) {
  const [pied, sommet] = boutsEtalon(r);
  const bandes = Math.round(r.etalon * 10);
  const hauteur = (pied.y - sommet.y) / bandes;
  return (
    <g aria-hidden="true">
      <rect className="pl-pointage-mur" x={0} y={0} width={CAMERA.l} height={CAMERA.sol} />
      <rect x={0} y={0} width={CAMERA.l} height={CAMERA.sol} fill={`url(#${briques})`} />
      <rect className="pl-pointage-plinthe" x={0} y={CAMERA.sol - 9} width={CAMERA.l} height={9} />
      <rect className="pl-pointage-sol" x={0} y={CAMERA.sol} width={CAMERA.l} height={CAMERA.h - CAMERA.sol} />
      {Array.from({ length: bandes }, (_, i) => <rect key={i} x={pied.x - 3.5} y={r1(sommet.y + i * hauteur)} width={7} height={r1(hauteur)} fill={i % 2 ? "var(--cuivre)" : "#F3ECE6"} />)}
      <path d={`M ${pied.x - 8} ${pied.y} h 16 M ${sommet.x - 8} ${r1(sommet.y)} h 16`} stroke="#F3ECE6" strokeWidth={1.4} />
      <text x={pied.x - 9} y={r1((pied.y + sommet.y) / 2 + 3)} textAnchor="end">étalon</text>
    </g>
  );
}

// La balle sur une image : un peu allongée dans le sens de sa course, comme sur une vraie vidéo.
function Balle({ r, mobile }: { r: ReglagesPointage; mobile: { x: number; y: number; vx: number; vy: number } }) {
  const c = dansImage(mobile.x, mobile.y);
  const rayon = Math.max(4, r.rayon * CAMERA.parMetre);
  const bouge = Math.min(4, Math.hypot(mobile.vx, mobile.vy) * 0.45);
  const angle = (Math.atan2(-mobile.vy, mobile.vx) * 180) / Math.PI;
  return <ellipse className="pl-pointage-balle" cx={r1(c.x)} cy={r1(c.y)} rx={r1(rayon + bouge / 2)} ry={r1(rayon)} fill={r.couleur} transform={`rotate(${r1(angle)} ${r1(c.x)} ${r1(c.y)})`} />;
}

// Les pointés de l'élève : une petite croix par image pointée, plus grande pour l'image en cours.
function Pointes({ etat, image }: { etat: EtatPointage; image: number }) {
  return (
    <g aria-hidden="true">
      {etat.pointes.map((p, i) => p && (
        <path key={i} className={`pl-pointage-croix${i === image ? " est-ici" : ""}`} d={i === image ? `M ${p.x - 6} ${p.y} h 12 M ${p.x} ${p.y - 6} v 12` : `M ${p.x - 3} ${p.y} h 6 M ${p.x} ${p.y - 3} v 6`} />
      ))}
    </g>
  );
}

// Ce que l'élève a posé sur l'image pour mesurer : les deux repères de l'échelle, l'origine et ses axes.
function Marques({ etat, outil }: { etat: EtatPointage; outil: Outil }) {
  const { a, b, origine: o } = etat;
  const milieu = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  return (
    <g aria-hidden="true">
      <g className={`pl-pointage-echelle${outil === "echelle" ? "" : " pl-pointage-repos"}`}>
        <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        <circle cx={a.x} cy={a.y} r={5} /><path d={`M ${a.x - 9} ${a.y} h 18 M ${a.x} ${a.y - 9} v 18`} />
        <circle cx={b.x} cy={b.y} r={5} /><path d={`M ${b.x - 9} ${b.y} h 18 M ${b.x} ${b.y - 9} v 18`} />
        <text x={a.x + 11} y={a.y - 6}>A</text>
        <text x={b.x + 11} y={b.y - 6}>B</text>
        <text x={r1(milieu.x + 10)} y={r1(milieu.y + 4)}>{etat.longueur === null ? "longueur ?" : `${nombre(etat.longueur, 2)} m`}</text>
      </g>
      <g className={`pl-pointage-origine${outil === "origine" ? "" : " pl-pointage-repos"}`}>
        <path d={`M ${o.x} ${o.y} h 30 m -6 -4 l 6 4 l -6 4 M ${o.x} ${o.y} v -30 m -4 6 l 4 -6 l 4 6`} />
        <circle cx={o.x} cy={o.y} r={2.2} fill="var(--vert)" />
        <text x={o.x - 11} y={o.y + 12}>O</text>
        <text x={o.x + 33} y={o.y + 4}>x</text>
        <text x={o.x - 3} y={o.y - 34}>y</text>
      </g>
    </g>
  );
}

// Une poignée : le repère A, le repère B ou l'origine, que l'élève glisse sur l'image. Au clavier, les flèches.
// `tient` : dit quand le doigt prend la poignée, puis quand il la lâche.
function Poignee({ p, nom, bouge, vise, tient }: { p: Point; nom: string; bouge: (p: Point) => void; vise: (p: Point | null) => void; tient: (tenu: boolean) => void }) {
  const prise = useRef({ x: 0, y: 0 });
  const glisse = useGlisse({
    depart: (q) => { prise.current = { x: q.x - p.x, y: q.y - p.y }; vise(p); tient(true); },
    bouge: (q) => bouge(dansCadre({ x: q.x - prise.current.x, y: q.y - prise.current.y })),
    fin: () => { vise(null); tient(false); },
  });
  const clavier = (e: KeyboardEvent<SVGGElement>) => {
    const d = deplacement(e.key);
    if (d) { e.preventDefault(); bouge(dansCadre({ x: p.x + d.x, y: p.y + d.y })); }
  };
  return (
    <g className="pl-pointage-poignee" role="button" tabIndex={0} aria-label={nom} onKeyDown={clavier} onBlur={() => vise(null)} {...glisse}>
      <circle cx={p.x} cy={p.y} r={22} fill="transparent" />
      <circle cx={p.x} cy={p.y} r={14} />
    </g>
  );
}

// La couche de pointage : toucher l'image vise, lever le doigt pointe. Au clavier, les flèches déplacent le viseur, Entrée pointe.
function Viser({ nom, clavier, vise, deplace, pointe }: { nom: string; clavier: Point; vise: (p: Point | null) => void; deplace: (p: Point) => void; pointe: (p: Point) => void }) {
  const glisse = useGlisse({ depart: (p) => vise(dansCadre(p)), bouge: (p) => vise(dansCadre(p)), fin: (p) => pointe(dansCadre(p)) });
  const touches = (e: KeyboardEvent<SVGRectElement>) => {
    const d = deplacement(e.key);
    if (d) { e.preventDefault(); deplace(dansCadre({ x: clavier.x + d.x, y: clavier.y + d.y })); }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pointe(clavier); }
  };
  return <rect className="pl-pointage-viser" x={0} y={0} width={CAMERA.l} height={CAMERA.h} fill="transparent" role="button" tabIndex={0} aria-label={nom} onKeyDown={touches} onBlur={() => vise(null)} {...glisse} />;
}

// Une flèche de la rangée des images : image précédente, image suivante.
function Fleche({ ou, sens, nom, actif, appuie }: { ou: Point; sens: 1 | -1; nom: string; actif: boolean; appuie: () => void }) {
  const agit = () => { if (!actif) return; son("clic"); vibre(6); appuie(); };
  const { x, y } = ou;
  return (
    <g className="pl-touche pl-pointage-fleche" role="button" tabIndex={actif ? 0 : -1} aria-label={nom} aria-disabled={!actif} onClick={agit}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); agit(); } }}>
      <rect className="pl-touche-fond" x={x - 24} y={y - 22} width={48} height={44} rx={8} />
      <path d={`M ${x - 4 * sens} ${y - 8} L ${x + 5 * sens} ${y} L ${x - 4 * sens} ${y + 8}`} />
    </g>
  );
}

// ---------- la paillasse ----------

export default function Pointage({ reglages: r, protocole, attente, fini }: PropsPaillasse<ReglagesPointage>) {
  const [partie, setPartie] = useState<Partie>(() => ({ etat: regles.depart(r), gestes: [] }));
  const [message, setMessage] = useState("La vidéo est chargée dans le logiciel. Le protocole est en haut de l'écran.");
  const [ecran, setEcran] = useState<"film" | "courbes">("film");
  const [outil, setOutil] = useState<Outil>("echelle");
  const [image, setImage] = useState(0);
  /** l'endroit visé pendant un geste : la loupe le montre en grand */
  const [vise, setVise] = useState<Point | null>(null);
  /** le viseur du clavier */
  const [clavier, setClavier] = useState<Point>({ x: CAMERA.l / 2, y: CAMERA.h / 2 });
  const [onglet, setOnglet] = useState<Onglet>("vitesse");
  const [droite, setDroite] = useState<Droite>({ va: 0, vb: 0 });
  const [repere, setRepere] = useState(0);
  const [carnet, setCarnet] = useState<"ferme" | "ouvert" | Quoi>("ferme");
  /** la poignée que l'élève tient sous son doigt : le guide ne change pas de consigne pendant qu'il la glisse */
  const [tenu, setTenu] = useState<PoigneePointage | null>(null);
  const guide = useGuide();
  const cadre = useId();
  const briques = useId();
  const { etat, gestes } = partie;
  const film = useMemo(() => trajectoire(r), [r]);
  const points = useMemo(() => grandeurs(r, etat), [r, etat]);

  const agit = useCallback((g: GesteBrut) => setPartie((p) => {
    const suite = regles.geste(r, p.etat, g);
    return suite === p.etat ? p : { etat: suite, gestes: ajoute(p.gestes, g) };
  }), [r]);

  // ----- les outils du film -----
  const prends = (o: Outil) => { setOutil(o); setVise(null); setMessage(guide.actif ? PRIS[o] : `${PRIS[o]} ${CONSEILS[o]}`); };
  const va = (i: number) => { const suite = Math.max(0, Math.min(r.images - 1, i)); setImage(suite); setVise(null); setMessage(`Image ${suite + 1} sur ${r.images}.`); };
  const bougeRepere = (bout: "a" | "b", p: Point) => { agit({ g: "etalon", bout, x: p.x, y: p.y }); setVise(p); };
  const bougeOrigine = (p: Point) => { agit({ g: "origine", x: p.x, y: p.y }); setVise(p); };
  const pointe = (p: Point) => {
    agit({ g: "pointer", i: image, x: p.x, y: p.y });
    setVise(null);
    setClavier(p);
    son("pose");
    vibre(8);
    const derniere = image === r.images - 1;
    setMessage(`Image ${image + 1} pointée.${derniere ? " C'était la dernière image du film." : ""}`);
    if (!derniere) setImage(image + 1);
  };

  // ----- les courbes -----
  const garde = () => {
    const g: GesteBrut = { g: "droite", va: droite.va, vb: droite.vb };
    if (regles.geste(r, etat, g) === etat) { setMessage("Il n'y a pas encore de courbe : la droite ne peut pas être gardée."); son("faux"); return; }
    agit(g);
    setMessage("Droite gardée : le logiciel retient sa pente.");
    son("bip");
  };

  // ----- le carnet -----
  const note = (quoi: Quoi, v: number) => {
    const ligne = LIGNES.find((l) => l.quoi === quoi)!;
    const g: GesteBrut = quoi === "longueur" ? { g: "longueur", v } : { g: "noter", quoi, v };
    setCarnet("ferme");
    if (regles.geste(r, etat, g) === etat) { setMessage(ligne.refus); son("faux"); return; }
    agit(g);
    setMessage(`Noté. ${ligne.court} : ${v.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} ${ligne.unite}.`);
    son("bip");
  };
  const toutRecommencer = () => {
    setPartie({ etat: regles.depart(r), gestes: [] });
    setEcran("film");
    setOutil("echelle");
    setImage(0);
    setVise(null);
    setDroite({ va: 0, vb: 0 });
    setRepere(0);
    setCarnet("ferme");
    setTenu(null);
    setMessage("Le logiciel est remis comme au début : plus d'échelle, plus de pointés.");
  };

  // ----- le guide : le prochain geste, et où la main le montre -----
  /** le point des courbes où se trouve le repère des énergies */
  const rang = Math.max(0, Math.min(points.length - 1, repere));
  const pas: PasDuGuide | null = guide.actif ? prochain(r, etat, { ecran, outil, image, onglet, droite, repere: rang, carnet, tenu }) : null;
  const duree = date(r, r.images - 1);
  const laMain = (p: PasDuGuide): Indication["main"] => {
    switch (p.geste) {
      case "outil": return { geste: "toucher", ou: TOUCHES[p.outil] };
      // un repère presque en place s'ajuste à la loupe : la main ne vient pas le cacher
      case "repere": return p.pres ? undefined : { geste: "glisser", de: etat[p.quoi], vers: p.vers };
      case "image": return { geste: "toucher", ou: p.sens === 1 ? FLECHES.suivante : FLECHES.precedente };
      // pendant que l'élève vise, la main s'efface : il regarde la loupe
      case "pointer": return vise ? undefined : { geste: "toucher", ou: { x: r1(p.ou.x), y: r1(p.ou.y) } };
      case "onglet": return { geste: "toucher", ou: ONGLETS[p.onglet] };
      case "bout": {
        if (p.pres || points.length < 3) return undefined;
        const axe = axeVitesse(points), t = p.cote === "gauche" ? 0 : duree;
        return { geste: "glisser", de: placeCourbe(axe, duree, t, p.cote === "gauche" ? droite.va : droite.vb), vers: placeCourbe(axe, duree, t, p.vers) };
      }
      case "viser": {
        const ici = points[p.rang];
        return ici ? { geste: "toucher", ou: placeCourbe(axeEnergies(points), duree, ici.t, ici.Em) } : undefined;
      }
      // une touche du bas, une ligne du carnet, une lecture : rien à montrer dans la scène
      default: return undefined;
    }
  };
  const indication: Indication | null = pas && { cle: pas.cle, texte: pas.texte, etape: pas.etape, main: laMain(pas), appel: pas.geste === "bouton" && pas.bouton === "fini" };
  /** la touche du bas que le guide met en avant */
  const enAvant = (bouton: string) => (pas?.geste === "bouton" && pas.bouton === bouton ? " pl-vise" : "");

  const saisie = carnet !== "ferme";
  const outils = saisie ? (
    <Carnet lignes={carnet === "longueur" ? LIGNES : LIGNES.slice(1)} ouvert={carnet === "ouvert" ? null : carnet} note={(quoi) => dejaNote(etat, quoi)}
      ecris={(quoi) => setCarnet(quoi ?? (carnet === "longueur" ? "ferme" : "ouvert"))} valide={note} ferme={() => setCarnet("ferme")}
      vise={pas?.geste === "ligne" ? pas.ligne : pas?.geste === "bouton" && pas.bouton === "fermer" ? "fermer" : null} />
  ) : ecran === "film" ? (
    <>
      {outil === "echelle" && <button type="button" className={`btn btn-ligne${enAvant("longueur")}`} onClick={() => setCarnet("longueur")}>Longueur de l&apos;étalon</button>}
      <button type="button" className={`btn btn-ligne${enAvant("courbes")}`} onClick={() => { setEcran("courbes"); setVise(null); setMessage("Les courbes sont tracées avec tes pointés."); }}>Courbes</button>
    </>
  ) : (
    <>
      <button type="button" className={`btn btn-ligne${enAvant("video")}`} onClick={() => { setEcran("film"); setMessage("Retour à la vidéo."); }}>Revenir à la vidéo</button>
      {onglet === "vitesse"
        ? <button type="button" className={`btn btn-ligne${enAvant("garder")}`} onClick={garde}>Garder cette droite</button>
        : <button type="button" className={`btn btn-ligne${enAvant("noter")}`} onClick={() => setCarnet("ouvert")}>Noter l&apos;énergie</button>}
    </>
  );

  // la loupe se met du côté opposé à l'endroit visé
  const loupe = vise && { x: vise.x > 190 && vise.y < 150 ? LOUPE.r + 6 : CAMERA.l - LOUPE.r - 6, y: LOUPE.r + 6 };

  return (
    <Etabli titre="Pointage" protocole={protocole} message={message} attente={attente} fini={() => fini(gestes)} recommence={toutRecommencer} outils={outils} saisie={saisie} indication={indication}>
      {ecran === "courbes" ? (
        <Scene vue={carnet === "debut" || carnet === "fin" ? VUE_LECTURE : VUE} nom="Les courbes du logiciel de pointage, tracées avec tes pointés">
          <Courbes r={r} points={points} onglet={onglet} choisis={setOnglet} droite={droite} regle={setDroite} gardee={etat.droite ? etat.droite.pente : null} repere={repere} place={setRepere} tient={setTenu} />
          {/* la main du guide, par-dessus tout le reste */}
          <Main indication={indication} />
        </Scene>
      ) : (
        <Scene vue={VUE} nom="Le logiciel de pointage : l'image du film, les repères à glisser, les commandes des images et des outils">
          <defs>
            <clipPath id={cadre}><rect x={0} y={0} width={CAMERA.l} height={CAMERA.h} rx={4} /></clipPath>
            <pattern id={briques} patternUnits="userSpaceOnUse" width={46} height={24}><path className="pl-pointage-joints" d="M 0 0.4 H 46 M 0 12.4 H 46 M 0.4 0 V 12 M 23.4 12 V 24" /></pattern>
          </defs>
          <g className="pl-pointage-film" clipPath={`url(#${cadre})`} role="img" aria-label={`Image ${image + 1} du film : ${r.balle}, devant le mur et l'étalon.`}>
            <Decor r={r} briques={briques} />
            <Balle r={r} mobile={film[image]} />
            <Pointes etat={etat} image={image} />
            <Marques etat={etat} outil={outil} />
            {vise && outil === "pointage" && <path className="pl-pointage-viseur" d={`M ${vise.x - 16} ${vise.y} h 32 M ${vise.x} ${vise.y - 16} v 32`} />}
          </g>
          <rect className="pl-pointage-cadre" x={0} y={0} width={CAMERA.l} height={CAMERA.h} rx={4} />
          {outil === "echelle" && (
            <>
              <Poignee p={etat.a} nom="Repère A de l'échelle" bouge={(p) => bougeRepere("a", p)} vise={setVise} tient={(t) => setTenu(t ? "a" : null)} />
              <Poignee p={etat.b} nom="Repère B de l'échelle" bouge={(p) => bougeRepere("b", p)} vise={setVise} tient={(t) => setTenu(t ? "b" : null)} />
            </>
          )}
          {outil === "origine" && <Poignee p={etat.origine} nom="Origine du repère" bouge={bougeOrigine} vise={setVise} tient={(t) => setTenu(t ? "origine" : null)} />}
          {outil === "pointage" && (
            <Viser nom={`Image ${image + 1} du film : touche le centre de la balle pour la pointer`} clavier={clavier} vise={setVise}
              deplace={(p) => { setClavier(p); setVise(p); }} pointe={pointe} />
          )}
          {vise && loupe && (
            <Loupe x={loupe.x} y={loupe.y} r={LOUPE.r} nom="Loupe sur l'endroit visé">
              <g className="pl-pointage-film pl-pointage-grossi" transform={`translate(${loupe.x} ${loupe.y}) scale(${LOUPE.grossit}) translate(${-vise.x} ${-vise.y})`}>
                <Decor r={r} briques={briques} />
                <Balle r={r} mobile={film[image]} />
                {outil === "pointage" && <Pointes etat={etat} image={image} />}
              </g>
              <path className="pl-pointage-reticule" d={`M ${loupe.x - LOUPE.r} ${loupe.y} h ${LOUPE.r - 7} M ${loupe.x + 7} ${loupe.y} h ${LOUPE.r - 7} M ${loupe.x} ${loupe.y - LOUPE.r} v ${LOUPE.r - 7} M ${loupe.x} ${loupe.y + 7} v ${LOUPE.r - 7}`} />
            </Loupe>
          )}

          {/* les commandes : les images, puis les outils */}
          <Fleche ou={FLECHES.precedente} sens={-1} nom="Image précédente" actif={image > 0} appuie={() => va(image - 1)} />
          <text x={180} y={IMAGES - 2} textAnchor="middle" className="pl-pointage-lecture">image {image + 1} sur {r.images}</text>
          <text x={180} y={IMAGES + 13} textAnchor="middle"><tspan fontStyle="italic">t</tspan> = {nombre(date(r, image), 3)} s{etat.pointes[image] ? ", pointée" : ""}</text>
          <Fleche ou={FLECHES.suivante} sens={1} nom="Image suivante" actif={image < r.images - 1} appuie={() => va(image + 1)} />
          <Touche x={TOUCHES.echelle.x} y={TOUCHES.echelle.y} l={112} h={44} nom="Outil Échelle" texte="Échelle" appuie={() => prends("echelle")} enfonce={outil === "echelle"} />
          <Touche x={TOUCHES.origine.x} y={TOUCHES.origine.y} l={112} h={44} nom="Outil Origine" texte="Origine" appuie={() => prends("origine")} enfonce={outil === "origine"} />
          <Touche x={TOUCHES.pointage.x} y={TOUCHES.pointage.y} l={112} h={44} nom="Outil Pointage" texte="Pointage" appuie={() => prends("pointage")} enfonce={outil === "pointage"} />
          {/* la main du guide, par-dessus tout le reste */}
          <Main indication={indication} />
        </Scene>
      )}
    </Etabli>
  );
}
