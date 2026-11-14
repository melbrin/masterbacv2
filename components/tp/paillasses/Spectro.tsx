"use client";

// La paillasse Spectro (décision 0012). L'élève y manipule un spectrophotomètre, à la main : il tourne la molette de
// longueur d'onde en cherchant la plus grande absorbance, verse une solution dans la cuve, la tourne dans le bon sens,
// la glisse dans le porte-cuve, ferme le capot, fait le blanc, lit l'afficheur et note ce qu'il lit. Pour un dosage, il
// pose ensuite une règle sur ses points et lit la concentration de l'échantillon avec un repère ; pour un suivi, il
// mélange, lance le chronomètre, relève, puis lit le temps de demi-réaction sur sa courbe.
// Chaque geste passe par les règles (lib/commun/tp/paillasses/spectro.ts) ; la liste des gestes part au serveur.
// Le guide (lib/commun/tp/paillasses/spectro-guide.ts) dit le prochain geste ; ici, la main le montre à sa place dans le dessin.

import { useCallback, useEffect, useState } from "react";
import { nombre, nombreRelatif } from "@/lib/commun/format";
import { LAMBDA, RELEVES_MAX, affichage, concentrationDe, dansCuve, dateChrono, forme, nomSolution, regles, type EtatSpectro, type ReglagesSpectro } from "@/lib/commun/tp/paillasses/spectro";
import { pose, prochain, type CibleSpectro, type PasDuGuide, type ToucheSpectro } from "@/lib/commun/tp/paillasses/spectro-guide";
import type { GesteBrut, PropsPaillasse } from "@/lib/commun/tp/types";
import { Afficheur, Becher, Cible, EAU, Etabli, Main, Manipulation, Molette, Objet, Poussoir, Releve, Scene, Touche, Tube, son, useGuide, vibre, type Indication, type Point, type Vue } from "../kit";
import { GrapheCinetique, GrapheEtalonnage } from "./spectroGraphe";
import "./spectro.css";

// ---------- la place de chaque chose dans le dessin (360 de large) ----------
const VUE: Vue = { x: 0, y: -44, l: 360, h: 566 };
/** Pendant la saisie, le regard se rapproche de l'afficheur. */
const VUE_ECRAN: Vue = { x: 4, y: -42, l: 206, h: 152 };
const ECRAN = { x: 22, y: -14, l: 128, h: 38 };     // l'afficheur de l'absorbance
const ONDE = { x: 22, y: 52, l: 76, h: 30 };        // l'afficheur de la longueur d'onde
const MOLETTE = { x: 138, y: 68 };
const LOGEMENT = { x: 204, y: -22, l: 136, h: 104 }; // le logement de la cuve, vu de dessus
const FENTE = { x: 272, y: 30 };                    // le porte-cuve
const PORTOIR = 290;                                // le dessus du portoir des solutions
const TABLE = 474;                                  // le dessus de la paillasse
const CUVE = { x: 150, y: TABLE - 24 };             // la cuve au repos
const POUBELLE = { x: 23, l: 46, h: 44 };
const BECHER = { x: 192 };                          // le bécher du mélange, pour un suivi
const TUBE_B = 86;                                  // le tube de la seconde solution, pour un suivi

const r2 = (n: number) => Math.round(n * 100) / 100;
/** L'angle de la molette pour une longueur d'onde : les mêmes angles que `Molette`. */
const angleDe = (lambda: number) => r2(-135 + ((lambda - LAMBDA.min) / (LAMBDA.max - LAMBDA.min)) * 270);
/** Ce qui vient de se passer, et le geste qui suit : le conseil ne se montre que guide coupé, puisque le guide le dit déjà. */
interface Message { fait: string; conseil?: string }

interface Solution { s: string; x: number; nom: string; sous: string; dit: string }
/** Les solutions du portoir, de gauche à droite : l'eau distillée, la gamme, l'échantillon et l'échantillon dilué. */
function portoir(r: ReglagesSpectro): Solution[] {
  const eau = { s: "eau", nom: "eau", sous: "distillée", dit: "Tube d'eau distillée" };
  if (r.mode === "cinetique") return [{ ...eau, x: 26 }];
  const toutes = [
    eau,
    ...r.gamme.map((C, i) => ({ s: `s${i + 1}`, nom: `S${i + 1}`, sous: `${nombre(C, Number.isInteger(C) ? 0 : 1)} ${r.unite}`, dit: `Tube de solution étalon S${i + 1}` })),
    { s: "x", nom: r.etiquette, sous: "", dit: `Tube de ${r.etiquette}` },
    { s: "xd", nom: r.etiquette, sous: `diluée ${r.dilution} fois`, dit: `Tube de ${r.etiquette} diluée ${r.dilution} fois` },
  ];
  const debut = (360 - 44 * toutes.length) / 2 + 22;
  return toutes.map((f, i) => ({ ...f, x: debut + 44 * i }));
}

interface Partie { etat: EtatSpectro; gestes: GesteBrut[] }
/** Ajoute un geste à la liste. Un réglage refait remplace le précédent, deux attentes à la suite valent leur somme : rejouée, la liste donne le même état. */
function ajoute(gestes: GesteBrut[], g: GesteBrut): GesteBrut[] {
  const dernier = gestes[gestes.length - 1];
  if (dernier !== undefined && dernier.g === g.g) {
    if (g.g === "lambda" || g.g === "droite" || g.g === "lire") return [...gestes.slice(0, -1), g];
    if (g.g === "attendre" && typeof dernier.v === "number" && typeof g.v === "number" && dernier.v + g.v <= 3600) return [...gestes.slice(0, -1), { g: "attendre", v: Math.round((dernier.v + g.v) * 100) / 100 }];
  }
  return [...gestes, g];
}

// ---------- les dessins ----------

/** La cuve vue de face. Ses deux faces de côté sont celles que le faisceau traverse : lisses au trait fin, dépolies en trait épais et rayé. */
function CuveDeFace({ couleur, pleine, lisse }: { couleur: string; pleine: boolean; lisse: boolean }) {
  return (
    <g>
      {pleine && <rect className="pl-spectro-verse" x={-8} y={-12} width={16} height={33} fill={couleur} />}
      <path className={lisse ? "pl-spectro-lisse" : "pl-spectro-depoli"} d="M -9 -22 V 21 M 9 -22 V 21" />
      <path className="pl-spectro-lisse" d="M -9 21 Q -9 22 -8 22 H 8 Q 9 22 9 21" />
      {/* quand les faces lisses sont sur le côté, c'est une face dépolie qui regarde l'élève : elle voile la solution */}
      {lisse && [-13, -5, 3, 11].map((y) => <line key={y} className="pl-spectro-voile" x1={-6} x2={6} y1={y + 4} y2={y - 2} />)}
    </g>
  );
}

/** La cuve vue de dessus, comme on la voit en la glissant dans l'appareil : le faisceau la traverse de gauche à droite. */
function CuveDeDessus({ couleur, pleine, lisse }: { couleur: string; pleine: boolean; lisse: boolean }) {
  return (
    <g>
      <rect x={-11} y={-11} width={22} height={22} fill={pleine ? couleur : "transparent"} />
      <path className={lisse ? "pl-spectro-lisse" : "pl-spectro-depoli"} d="M -11 -11 V 11 M 11 -11 V 11" />
      <path className={lisse ? "pl-spectro-depoli" : "pl-spectro-lisse"} d="M -11 -11 H 11 M -11 11 H 11" />
    </g>
  );
}

/** Le capot du porte-cuve : fermé, il couvre le logement ; ouvert, il est rabattu dessous. On le touche pour le basculer. */
function Capot({ ferme, cuve, bascule }: { ferme: boolean; cuve: boolean; bascule: () => void }) {
  const agit = () => { son("clic"); vibre(6); bascule(); };
  const { x, y, l, h } = LOGEMENT;
  return (
    <g className="pl-spectro-capot" role="switch" tabIndex={0} aria-checked={ferme} aria-label="Capot du porte-cuve"
      onClick={agit} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); agit(); } }}>
      {ferme ? (
        <>
          <rect className="pl-spectro-couvercle" x={x - 2} y={y - 2} width={l + 4} height={h + 4} rx={7} />
          <line className="pl-spectro-poignee" x1={x + l / 2 - 20} x2={x + l / 2 + 20} y1={y + h - 14} y2={y + h - 14} />
          <text x={x + l / 2} y={y + h / 2 - 4} textAnchor="middle" className="pl-fort">capot fermé</text>
          <text x={x + l / 2} y={y + h / 2 + 10} textAnchor="middle">{cuve ? "la cuve est dessous" : "le porte-cuve est vide"}</text>
        </>
      ) : (
        <>
          <rect x={x + 8} y={y + h + 2} width={l - 16} height={44} fill="transparent" />
          <rect className="pl-spectro-couvercle" x={x + 8} y={y + h + 6} width={l - 16} height={24} rx={6} />
          <text x={x + l / 2} y={y + h + 22} textAnchor="middle" className="pl-fort">capot ouvert</text>
        </>
      )}
    </g>
  );
}

// ---------- la paillasse ----------

export default function Spectro({ reglages: r, protocole, attente, fini }: PropsPaillasse<ReglagesSpectro>) {
  const [partie, setPartie] = useState<Partie>(() => ({ etat: regles.depart(r), gestes: [] }));
  const [message, setMessage] = useState<Message>({ fait: "Prends un objet en le glissant, ou touche-le puis touche l'endroit où le poser." });
  const [saisie, setSaisie] = useState(false);
  const [graphe, setGraphe] = useState(false);
  /** le repère du graphique : une concentration pour un dosage, une date pour un suivi */
  const [repere, setRepere] = useState(() => r2(Math.max(0, ...r.gamme) / 2));
  const [temps, setTemps] = useState(40);
  /** sur la courbe d'un suivi : là où l'élève a posé le trait de la valeur finale */
  const [palier, setPalier] = useState<number | null>(null);
  /** vrai quand l'élève accélère le temps de la paillasse */
  const [rapide, setRapide] = useState(false);
  const guide = useGuide();
  const { etat, gestes } = partie;
  const suivi = r.mode === "cinetique";
  const dis = (fait: string, conseil?: string) => setMessage({ fait, conseil });

  // un geste qui ne change rien n'entre pas dans la liste : rejouée par le serveur, elle donne le même état
  const agit = useCallback((g: GesteBrut) => setPartie((p) => {
    const suite = regles.geste(r, p.etat, g);
    return suite === p.etat ? p : { etat: suite, gestes: ajoute(p.gestes, g) };
  }), [r]);

  // ----- le temps de la paillasse : il passe dès que les solutions sont mélangées ou que le chronomètre tourne -----
  const tourne = suivi && (etat.melange !== null || etat.chrono !== null);
  useEffect(() => {
    if (!tourne) return;
    let image = 0;
    let avant = performance.now();
    let reserve = 0;
    const avance = (maintenant: number) => {
      // un écart trop long (onglet caché, page ralentie) ne fait pas sauter le temps
      reserve += Math.min(0.25, (maintenant - avant) / 1000) * (rapide ? r.cadence : 1);
      avant = maintenant;
      if (reserve >= 0.5) { const v = Math.floor(reserve * 100) / 100; reserve -= v; agit({ g: "attendre", v }); }
      image = requestAnimationFrame(avance);
    };
    image = requestAnimationFrame(avance);
    return () => cancelAnimationFrame(image);
  }, [tourne, rapide, r.cadence, agit]);

  // ----- ce que l'état donne à voir -----
  const solutions = portoir(r);
  // la solution la plus concentrée de la paillasse a la teinte la plus soutenue : une boisson plus foncée que toute la gamme se voit
  const sommet = suivi ? r.Cfin : Math.max(r.Cx, ...r.gamme);
  const [rouge, vert, bleu] = r.couleur;
  /** La couleur d'une solution : d'autant plus soutenue qu'elle est concentrée. */
  const teinte = (C: number) => (C <= 0 ? EAU : `rgba(${rouge}, ${vert}, ${bleu}, ${r2(0.1 + 0.84 * Math.min(1, C / sommet) ** 0.7)})`);
  const dansLaCuve = dansCuve(r, etat);
  const pleine = etat.contenu !== null;
  const lu = affichage(r, etat);
  const melange = concentrationDe(r, "m", etat.t, etat.melange);
  // ce que la solution laisse passer du faisceau, à la longueur d'onde réglée
  const transmis = etat.enPlace ? Math.max(0.08, 10 ** -(r.k * dansLaCuve * forme(r, etat.lambda) + (etat.lisse ? 0 : 1))) : 1;

  /** où se trouve chaque objet, chaque cible, chaque touche : le dessin et la main du guide lisent les mêmes places */
  const objets: Record<string, Point> = {
    ...Object.fromEntries(solutions.map((f) => [f.s, { x: f.x, y: PORTOIR - 37 }])),
    b: { x: TUBE_B, y: PORTOIR - 37 }, becher: { x: BECHER.x, y: PORTOIR - 28 }, cuve: etat.enPlace ? FENTE : CUVE,
  };
  const cibles: Record<CibleSpectro, Point> = {
    cuve: { x: CUVE.x, y: CUVE.y - 8 }, poubelle: { x: POUBELLE.x + POUBELLE.l / 2, y: TABLE - 30 }, porte: FENTE, repos: CUVE, becher: { x: BECHER.x, y: PORTOIR - 40 },
  };
  /** la main se pose sous le mot d'une touche, pour le laisser lire ; sur le capot, à côté de ce qui y est écrit */
  const touches: Record<ToucheSpectro, Point> = {
    tourner: { x: CUVE.x - 50, y: CUVE.y - 2 }, capot: { x: LOGEMENT.x + LOGEMENT.l - 28, y: etat.capot ? LOGEMENT.y + LOGEMENT.h - 16 : LOGEMENT.y + LOGEMENT.h + 18 },
    blanc: { x: 58, y: 136 }, relever: { x: 140, y: 136 }, lancer: { x: 262, y: 276 }, temps: { x: 320, y: 276 },
  };

  // ----- prendre et poser -----
  const poser = (objet: string, cible: string) => {
    const suite = pose(r, etat, objet, cible);
    suite.gestes.forEach(agit);
    if (suite.message) dis(suite.message, suite.conseil);
    if (suite.gestes.some((g) => g.g === "vider" || g.g === "remplir" || g.g === "melanger")) son("goutte");
  };
  /** Ce que l'élève tient, dans une phrase, avec son pronom. */
  const tenu = (objet: string): [string, string] => (objet === "cuve" ? ["la cuve", "la"] : objet === "becher" ? [etat.melange === null ? "le bécher d'iodure de potassium" : "le bécher du mélange", "le"]
    : objet === "b" ? ["le tube de peroxodisulfate", "le"] : objet === "eau" ? ["le tube d'eau distillée", "le"] : objet === "x" ? [`le tube de ${r.etiquette}`, "le"] : objet === "xd" ? [`le tube de ${r.etiquette} diluée`, "le"] : [`le tube ${objet.toUpperCase()}`, "le"]);
  /** L'élève prend un objet : la paillasse dit ce qu'il tient, et pourquoi rien ne peut le recevoir si c'est le cas. */
  const prise = (objet: string, ou: string[]) => {
    const [quoi, pronom] = tenu(objet);
    if (objet === "cuve") {
      const capotFerme = !etat.enPlace && etat.capot ? " Pour la glisser dans l'appareil, ouvre d'abord le capot." : "";
      dis(ou.length > 0 ? `Tu tiens la cuve. Un anneau vert montre où la poser.${capotFerme}` : `Tu tiens la cuve${pleine ? "" : ", vide"}.${capotFerme}`);
      return;
    }
    dis(ou.length > 0 ? `Tu tiens ${quoi}. Un anneau vert montre où ${pronom} poser.`
      : etat.enPlace ? `Tu tiens ${quoi}, mais la cuve est dans l'appareil : sors-la pour la remplir.`
      : pleine ? `Tu tiens ${quoi}, mais la cuve est déjà pleine : vide-la d'abord dans le bécher poubelle.`
      : `Tu tiens ${quoi}, mais rien ne peut le recevoir pour le moment.`);
  };
  const rate = (objet: string, p: Point) => {
    const presDuPorteCuve = Math.hypot(p.x - FENTE.x, p.y - FENTE.y) < 70;
    dis(objet === "cuve" && presDuPorteCuve && etat.capot ? "Le capot est fermé : ouvre-le pour glisser la cuve dans l'appareil."
      : objet !== "cuve" && presDuPorteCuve ? "Seule la cuve entre dans l'appareil : verse d'abord la solution dans la cuve."
      : "Rien ne se pose à cet endroit. Reprends l'objet : un anneau vert montre où il va.");
  };
  const tourneMolette = (v: number) => { agit({ g: "lambda", v }); dis(`Molette de longueur d'onde : ${v} nm.`); };
  const basculeCapot = () => {
    agit({ g: "capot", ferme: !etat.capot });
    dis(etat.capot ? "Le capot est ouvert." : "Le capot est fermé.");
  };
  const faitLeBlanc = () => { agit({ g: "blanc" }); son("bip"); dis("Blanc : l'appareil prend pour zéro ce qu'il mesure à cet instant."); };
  const lanceChrono = () => {
    if (etat.chrono !== null) { dis("Le chronomètre tourne déjà."); return; }
    agit({ g: "chrono" });
    dis("Chronomètre lancé.");
  };
  const releve = () => {
    if (!etat.enPlace || !pleine) { dis("Il n'y a pas de cuve pleine dans l'appareil : rien à relever."); return; }
    if (etat.chrono === null) { dis("Lance d'abord le chronomètre : un relevé a besoin de sa date."); return; }
    if (etat.mesures.length >= RELEVES_MAX) { dis(`Ton carnet est plein : ${RELEVES_MAX} relevés. Ouvre la courbe, ou fais un nouveau mélange.`); return; }
    agit({ g: "relever" });
    son("bip");
    dis(`Relevé n° ${etat.mesures.length + 1} : la date et l'absorbance sont gardées.`);
  };
  const ouvreSaisie = () => {
    if (!etat.enPlace || !pleine) { dis("Il n'y a pas de cuve pleine dans l'appareil : rien à noter."); return; }
    setSaisie(true);
  };
  const nouveauMelange = () => {
    agit({ g: "recommencer" });
    setRapide(false);
    setPalier(null);
    dis(etat.contenu === "m" ? "Nouveau mélange : la cuve est vidée, rincée et reposée sur la paillasse ; les relevés sont effacés." : "Nouveau mélange : les deux solutions sont prêtes, les relevés sont effacés.");
  };
  const toutRecommencer = () => {
    setPartie({ etat: regles.depart(r), gestes: [] });
    setSaisie(false);
    setGraphe(false);
    setRapide(false);
    setPalier(null);
    dis("La paillasse est remise comme au début.");
  };

  // ----- le guide : le prochain geste, et où la main le montre -----
  const pas: PasDuGuide | null = guide.actif ? prochain(r, etat, { saisie, graphe, rapide, palier }) : null;
  const laMain = (p: PasDuGuide): Indication["main"] => {
    switch (p.geste) {
      case "glisser": return { geste: "glisser", de: objets[p.objet], vers: cibles[p.cible] };
      case "toucher": return { geste: "toucher", ou: touches[p.touche] };
      // la main reste près de la molette : elle ne passe pas devant l'afficheur de l'absorbance
      case "tourner": return { geste: "tourner", ou: MOLETTE, de: angleDe(etat.lambda), a: angleDe(p.vers), r: 24 };
      // sur un graphique, la main se place dans son dessin ; pendant la saisie, un chevron montre l'afficheur
      default: return undefined;
    }
  };
  const indication: Indication | null = pas && { cle: pas.cle, texte: pas.texte, etape: pas.etape, main: laMain(pas), appel: pas.geste === "bouton" && pas.bouton === "fini" };
  /** la touche du bas que le guide met en avant */
  const vise = (bouton: string) => (pas?.geste === "bouton" && pas.bouton === bouton ? " pl-vise" : "");

  const outils = saisie ? (
    <Releve nom={`Absorbance lue sur l'afficheur, pour ${etat.contenu ? nomSolution(r, etat.contenu) : "la cuve"}`} unite="" exemple="0,412" signe annule={() => setSaisie(false)}
      valide={(v) => { agit({ g: "noter", v }); setSaisie(false); dis(`Absorbance notée pour ${etat.contenu ? nomSolution(r, etat.contenu) : "la cuve"} : ${nombreRelatif(v, 3)}.`); son("bip"); }} />
  ) : graphe ? (
    <>
      <button type="button" className={`btn btn-ligne${vise("retour")}`} onClick={() => setGraphe(false)}>Revenir à la paillasse</button>
      {suivi
        ? <button type="button" className="btn btn-cuivre" onClick={() => { agit({ g: "lire", v: temps }); setGraphe(false); dis(`Temps de demi-réaction noté : ${nombre(temps, 0)} s.`); son("bip"); }}>Noter ce temps</button>
        : <button type="button" className="btn btn-cuivre" onClick={() => { agit({ g: "lire", v: repere }); setGraphe(false); dis(`Concentration notée : ${nombre(repere, r.decimales)} ${r.unite}.`); son("bip"); }}>Noter cette concentration</button>}
    </>
  ) : suivi ? (
    <>
      <button type="button" className={`btn btn-ligne${vise("recommencer")}`} onClick={nouveauMelange}>Nouveau mélange</button>
      <button type="button" className={`btn btn-ligne${vise("graphe")}`} onClick={() => { setRapide(false); setGraphe(true); dis("La courbe de tes relevés est ouverte.", "Glisse le trait de la valeur finale sur le palier, puis le repère du temps là où la moitié coupe la courbe."); }}>Ouvrir la courbe</button>
    </>
  ) : (
    <>
      <button type="button" className={`btn btn-ligne${vise("noter")}`} onClick={ouvreSaisie}>Noter l&apos;absorbance</button>
      <button type="button" className={`btn btn-ligne${vise("graphe")}`} onClick={() => { setGraphe(true); dis("Le graphique de tes mesures est ouvert.", "Fais pivoter la règle avec sa poignée, puis glisse le repère là où elle coupe l'absorbance de l'échantillon."); }}>Ouvrir le graphique</button>
    </>
  );

  return (
    <Etabli titre={suivi ? "Cinétique" : "Dosage"} protocole={protocole} message={message.conseil && !guide.actif ? `${message.fait} ${message.conseil}` : message.fait} attente={attente} fini={() => fini(gestes)} recommence={toutRecommencer} outils={outils} saisie={saisie} indication={indication}>
      {graphe ? (suivi
        ? <GrapheCinetique mesures={etat.mesures} palier={palier} regle={setPalier} repere={temps} place={setTemps} guide={indication} />
        : <GrapheEtalonnage r={r} mesures={etat.mesures} pente={etat.pente} regle={(k) => agit({ g: "droite", v: k })} repere={repere} place={setRepere} guide={indication} />
      ) : (
        <Scene vue={saisie ? VUE_ECRAN : VUE} nom="La paillasse du spectrophotomètre : l'appareil, son porte-cuve, les solutions, la cuve et le bécher poubelle">
          <Manipulation pose={poser} prise={prise} rate={rate}>
            {/* le spectrophotomètre : ses deux afficheurs, sa molette, sa touche de blanc */}
            <rect className="pl-spectro-boitier" x={10} y={-36} width={340} height={196} rx={12} />
            <text x={ECRAN.x + 2} y={ECRAN.y - 6}>absorbance</text>
            <Afficheur x={ECRAN.x} y={ECRAN.y} l={ECRAN.l} h={ECRAN.h} nom="Absorbance" valeur={nombreRelatif(lu, 3)} />
            {/* avec le guide, pendant la saisie : un chevron montre l'afficheur à lire */}
            {saisie && pas && <path className="pl-main-pointe" d={`M ${ECRAN.x + ECRAN.l + 16} ${ECRAN.y + ECRAN.h / 2 - 6} l -9 6 l 9 6`} aria-hidden="true" />}
            <text x={ONDE.x + 2} y={ONDE.y - 6}>longueur d&apos;onde</text>
            <Afficheur x={ONDE.x} y={ONDE.y} l={ONDE.l} h={ONDE.h} nom="Longueur d'onde" valeur={String(etat.lambda)} unite="nm" />
            <Molette x={MOLETTE.x} y={MOLETTE.y} r={28} valeur={etat.lambda} min={LAMBDA.min} max={LAMBDA.max} pas={LAMBDA.pas} change={tourneMolette} nom="Molette de longueur d'onde" texte={`${etat.lambda} nanomètres`} />
            <Touche x={58} y={128} l={72} h={44} nom="Faire le blanc" texte="Blanc" appuie={faitLeBlanc} />
            {suivi && <Touche x={140} y={128} l={72} h={44} nom="Relever l'absorbance et la date" texte="Relever" appuie={releve} />}

            {/* le logement de la cuve, vu de dessus : la lampe, le faisceau, le porte-cuve, le détecteur */}
            <rect className="pl-spectro-logement" x={LOGEMENT.x} y={LOGEMENT.y} width={LOGEMENT.l} height={LOGEMENT.h} rx={6} />
            <line className="pl-spectro-faisceau" x1={226} x2={FENTE.x - 12} y1={FENTE.y} y2={FENTE.y} opacity={0.9} />
            <line className="pl-spectro-faisceau" x1={FENTE.x + 12} x2={320} y1={FENTE.y} y2={FENTE.y} opacity={r2(0.9 * transmis)} />
            {!etat.enPlace && <line className="pl-spectro-faisceau" x1={FENTE.x - 12} x2={FENTE.x + 12} y1={FENTE.y} y2={FENTE.y} opacity={0.9} />}
            <circle className="pl-spectro-lampe" cx={218} cy={FENTE.y} r={7} />
            <rect x={320} y={FENTE.y - 11} width={8} height={22} rx={2} fill="var(--carte)" stroke="var(--encre)" strokeWidth={1.2} />
            <rect className="pl-spectro-fente" x={FENTE.x - 15} y={FENTE.y - 15} width={30} height={30} rx={2} />
            <text x={218} y={FENTE.y + 26} textAnchor="middle">lampe</text>
            <text x={318} y={FENTE.y + 26} textAnchor="middle">détecteur</text>

            {/* le portoir des solutions, ou les deux solutions d'un suivi et son chronomètre */}
            <rect className="pl-spectro-portoir" x={6} y={PORTOIR} width={suivi ? 220 : 348} height={6} rx={2} />
            {solutions.map((f) => (
              <g key={f.s}>
                <text x={f.x} y={PORTOIR + 19} textAnchor="middle" className="pl-fort">{f.nom}</text>
                <text x={f.s === "xd" ? 356 : f.x} y={PORTOIR + 30} textAnchor={f.s === "xd" ? "end" : "middle"}>{f.sous}</text>
              </g>
            ))}
            {suivi && (
              <>
                <text x={TUBE_B} y={PORTOIR + 19} textAnchor="middle" className="pl-fort">peroxodisulfate</text>
                <text x={BECHER.x} y={PORTOIR + 19} textAnchor="middle" className="pl-fort">{etat.melange === null ? "iodure de potassium" : "mélange"}</text>
                <text x={238} y={200}>chronomètre</text>
                <Afficheur x={236} y={206} l={112} h={34} nom="Chronomètre" valeur={String(Math.floor(dateChrono(etat)))} unite="s" />
                <Touche x={262} y={268} l={50} h={44} nom="Lancer le chronomètre" texte="Lancer" appuie={lanceChrono} />
                <Touche x={320} y={268} l={56} h={44} nom="Accélérer le temps de la paillasse" texte={`Temps ×${r.cadence}`} enfonce={rapide}
                  appuie={() => { setRapide(!rapide); dis(rapide ? "Le temps de la paillasse reprend son cours." : `Le temps de la paillasse passe ${r.cadence} fois plus vite.`); }} />
              </>
            )}

            {/* la paillasse : le bécher poubelle, la cuve vue de dessus, ce que l'élève a noté */}
            <line className="pl-spectro-table" x1={6} x2={354} y1={TABLE} y2={TABLE} />
            <Becher x={POUBELLE.x} y={TABLE - POUBELLE.h} l={POUBELLE.l} h={POUBELLE.h} niveau={0.2} couleur={EAU} />
            <text x={POUBELLE.x + POUBELLE.l / 2} y={TABLE + 14} textAnchor="middle">poubelle</text>
            <text x={CUVE.x} y={TABLE + 14} textAnchor="middle">cuve</text>
            {!etat.enPlace && (
              <g transform={`translate(${CUVE.x + 58} ${CUVE.y})`} aria-hidden="true">
                <path d="M -26 0 H 22 M 17 -4 L 23 0 L 17 4" fill="none" stroke="var(--sable)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
                <CuveDeDessus couleur={teinte(dansLaCuve)} pleine={pleine} lisse={etat.lisse} />
                <text y={-18} textAnchor="middle">vue de dessus</text>
                <text y={TABLE + 14 - CUVE.y} textAnchor="middle">sens du faisceau</text>
              </g>
            )}
            {!etat.enPlace && (
              <g aria-hidden="true">
                <path className="pl-spectro-lisse" d="M 246 452 H 258" /><text x={262} y={455}>face lisse</text>
                <path className="pl-spectro-depoli" d="M 246 464 H 258" /><text x={262} y={467}>face dépolie</text>
              </g>
            )}
            <rect className="pl-spectro-carnet" x={244} y={332} width={108} height={suivi ? 100 : 108} rx={4} />
            <text x={250} y={346} className="pl-fort">{suivi ? `Relevés : ${etat.mesures.length}` : "Absorbances notées"}</text>
            {(suivi ? etat.mesures.slice(-6) : etat.mesures).slice(0, 8).map((m, i) => (
              <text key={i} x={250} y={360 + 11.5 * i} className="pl-spectro-carnet-ligne">{suivi ? `${nombre(m.date, 0)} s : ${nombre(m.lu, 3)}` : `${m.s === "x" ? r.etiquette : m.s === "xd" ? `${r.etiquette} dil.` : m.s === "eau" ? "eau" : m.s.toUpperCase()} : ${nombre(m.lu, 3)}`}</text>
            ))}

            {/* les solutions : chaque tube se glisse au-dessus de la cuve pour la remplir */}
            {solutions.map((f) => (
              <Objet key={f.s} id={f.s} nom={f.dit} {...objets[f.s]} l={44} h={78}>
                <Tube x={0} y={-35} h={72} couleur={teinte(concentrationDe(r, f.s, etat.t, etat.melange) ?? 0)} />
              </Objet>
            ))}
            {suivi && (
              <>
                <Objet id="b" nom="Tube de solution de peroxodisulfate" {...objets.b} l={44} h={78} actif={etat.melange === null}>
                  <Tube x={0} y={-35} h={72} couleur={etat.melange === null ? EAU : "transparent"} />
                </Objet>
                <Objet id="becher" nom={etat.melange === null ? "Bécher de solution d'iodure de potassium" : "Bécher du mélange"} {...objets.becher} l={64} h={60}>
                  <Becher x={-30} y={-28} l={60} h={56} niveau={etat.melange === null ? 0.36 : 0.7} couleur={teinte(melange ?? 0)} />
                </Objet>
              </>
            )}

            {/* la cuve : de face sur la paillasse, de dessus dans le porte-cuve ; capot fermé, on ne la voit plus */}
            <Objet id="cuve" nom={etat.enPlace ? "Cuve, dans le porte-cuve" : `Cuve${pleine ? " pleine" : " vide"}`} {...objets.cuve} l={44} h={etat.enPlace ? 44 : 56} actif={!(etat.enPlace && etat.capot)}>
              {etat.enPlace
                ? !etat.capot && <CuveDeDessus couleur={teinte(dansLaCuve)} pleine={pleine} lisse={etat.lisse} />
                : <CuveDeFace couleur={teinte(dansLaCuve)} pleine={pleine} lisse={etat.lisse} />}
            </Objet>
            {!etat.enPlace && <Poussoir {...touches.tourner} nom="Tourner la cuve d'un quart de tour" texte="Tourner" appuie={() => { agit({ g: "tourner" }); dis(etat.lisse ? "Tu tournes la cuve d'un quart de tour : ses faces dépolies sont maintenant sur le trajet du faisceau." : "Tu tournes la cuve d'un quart de tour : ses faces lisses sont maintenant sur le trajet du faisceau."); }} />}
            <Capot ferme={etat.capot} cuve={etat.enPlace} bascule={basculeCapot} />

            {/* les cibles : où poser ce qu'on tient. Elles se dessinent en dernier : on les touche même au-dessus d'un objet. */}
            <Cible id="cuve" nom="la cuve" {...cibles.cuve} r={26} accepte={!etat.enPlace && !pleine ? [...solutions.map((f) => f.s), ...(suivi ? ["becher"] : [])] : []} />
            <Cible id="poubelle" nom="le bécher poubelle" {...cibles.poubelle} r={26} accepte={!etat.enPlace && pleine ? ["cuve"] : []} />
            <Cible id="porte" nom="le porte-cuve" {...cibles.porte} r={24} accepte={!etat.enPlace && !etat.capot ? ["cuve"] : []} />
            <Cible id="repos" nom="la paillasse" {...cibles.repos} r={26} accepte={etat.enPlace && !etat.capot ? ["cuve"] : []} />
            {suivi && <Cible id="becher" nom="le bécher d'iodure de potassium" {...cibles.becher} r={28} accepte={etat.melange === null ? ["b"] : []} />}
          </Manipulation>
          <text x={8} y={VUE.y + VUE.h - 6}>{etat.essais > 0 ? `série n° ${etat.essais + 1}` : ""}</text>
          <text x={352} y={VUE.y + VUE.h - 6} textAnchor="end" className="pl-fort">{etat.lue === null ? "" : suivi ? `Temps noté : ${nombre(etat.lue, 0)} s` : `Concentration notée : ${nombre(etat.lue, r.decimales)} ${r.unite}`}</text>
          {/* la main du guide, par-dessus tout le reste */}
          <Main indication={indication} />
        </Scene>
      )}
    </Etabli>
  );
}
