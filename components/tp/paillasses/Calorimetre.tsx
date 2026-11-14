"use client";

// La paillasse Calorimètre (décision 0012). L'élève y fait les gestes du laboratoire, à la main : il porte le vase sur la
// balance, fait la tare, verse l'eau froide en maintenant l'appui, plonge le thermomètre et le regarde descendre, saisit
// le bloc brûlant avec la pince et le porte dans le calorimètre, ferme, agite, et lit la température finale à la loupe.
// Le temps du laboratoire passe tout seul, dix fois plus vite que le vrai, sauf quand un geste presse (le bloc à l'air,
// le calorimètre encore ouvert) : il passe alors au rythme réel. Le thermomètre a du retard, le bloc refroidit à l'air,
// un calorimètre ouvert perd sa chaleur. Rien n'écrit la mesure à sa place.
// Chaque geste passe par les règles (lib/commun/tp/paillasses/calorimetre.ts) ; la liste des gestes part au serveur.
// Le guide (lib/commun/tp/paillasses/calorimetre-guide.ts) dit le prochain geste ; ici, la main le montre à sa place dans le dessin.

import { useCallback, useEffect, useRef, useState } from "react";
import { nombre } from "@/lib/commun/format";
import { CONTENANCE, affichage, maintenant, regles, type EtatCalorimetre, type ReglagesCalorimetre } from "@/lib/commun/tp/paillasses/calorimetre";
import { ajoute, debitEau, pose, prochain, vitesse, type CibleCalorimetre, type ObjetCalorimetre, type PasDuGuide, type PoussoirCalorimetre } from "@/lib/commun/tp/paillasses/calorimetre-guide";
import type { GesteBrut, PropsPaillasse } from "@/lib/commun/tp/types";
import { Becher, Cible, EAU, Echelle, Etabli, Filet, Main, Manipulation, Objet, Poussoir, Releve, Scene, son, useGuide, useVersement, type Indication, type Point, type Vue } from "../kit";
import { LoupeGraduee } from "./archimede-loupe";
import { BALANCE, Balance, placeDeLaTare } from "./calorimetre-balance";
import "./calorimetre.css";

// ---------- la place de chaque chose dans le dessin (360 de large) ----------
const VUE: Vue = { x: 0, y: -40, l: 360, h: 566 };
const BANC = 506;
const ETAGERE = 300;
const LOUPE = { x: 300, y: 36, r: 50 };
const PESEE = { x: 8, y: BANC - BALANCE.h };
/** Pendant une lecture, le regard se rapproche : de la loupe du thermomètre et de son titre, ou de la balance et du vase. */
const VUE_LOUPE: Vue = { x: LOUPE.x - 62, y: LOUPE.y - 70, l: 124, h: 126 };
const VUE_BALANCE: Vue = { x: PESEE.x - 12, y: BANC - 132, l: 140, h: 138 };
const VASE = { l: 60, h: 64 };
/** Le centre du vase : sur le plateau de la balance, ou dans le calorimètre. */
const PLACES = { balance: { x: PESEE.x + BALANCE.l / 2, y: PESEE.y - BALANCE.plateau - VASE.h / 2 }, calorimetre: { x: 190, y: 448 } };
const BAIN = { x: 272, y: 420, l: 70, h: 70 };
const REPOS = { eau: { x: 44, y: ETAGERE - 24 }, couvercle: { x: 152, y: ETAGERE - 6 }, thermometre: { x: 236, y: ETAGERE - 75 }, pince: { x: 322, y: ETAGERE - 32 } };
/** Le thermomètre plongé dans le vase du calorimètre ; le couvercle posé ; le bloc tenu par la pince au-dessus du bain. */
const PLONGE = { x: 172, y: 386 };
const FERME = { x: PLACES.calorimetre.x, y: 399 };
const TENU = { x: BAIN.x + BAIN.l / 2, y: 372 };
const AGITER = { x: 248, y: 350 };
/** Plongé, le thermomètre se prend par le haut : plus bas, le doigt saisirait le couvercle. */
const PRISE_HAUTE = { x: 0, y: -45 };
const COLONNE = "#EE8272";

const r2 = (n: number) => Math.round(n * 100) / 100;
const grammes = (x: number) => `${nombre(x, 1)} g`;
const degres = (x: number) => `${nombre(x, Math.round(x * 100) % 10 === 0 ? 1 : 2)} °C`;
/** « 3 min 20 s » */
const heure = (s: number) => `${Math.floor(s / 60)} min ${String(Math.floor(s % 60)).padStart(2, "0")} s`;
/** Le nom de chaque objet dans une phrase, et le pronom qui va avec. */
const OBJETS: Record<string, [string, string]> = {
  vase: ["le vase du calorimètre", "le"], eau: ["le bécher d'eau froide", "le"], couvercle: ["le couvercle", "le"], thermometre: ["le thermomètre", "le"],
  pince: ["la pince", "la"], bloc: ["le bloc, dans la pince", "le"],
};

/** La paillasse : l'état inscrit, la liste des gestes, et le temps écoulé depuis le dernier geste, pas encore inscrit. */
interface Partie { etat: EtatCalorimetre; gestes: GesteBrut[]; attente: number }
/** Applique un geste ; s'il ne change rien, il ne s'inscrit pas. */
function applique(r: ReglagesCalorimetre, p: Partie, g: GesteBrut): Partie {
  const suite = regles.geste(r, p.etat, g);
  return suite === p.etat ? p : { ...p, etat: suite, gestes: ajoute(p.gestes, g) };
}
/** Inscrit le temps écoulé : à faire avant tout autre geste, pour que le serveur rejoue les choses à la même heure. */
const inscrit = (r: ReglagesCalorimetre, p: Partie): Partie => (p.attente > 0 ? { ...applique(r, p, { g: "attendre", v: p.attente }), attente: 0 } : p);

// ---------- les pièces ----------

// L'horloge du laboratoire. Montée avec la scène, elle fait passer le temps tant que la paillasse est ouverte ; elle
// s'arrête pendant qu'on verse et pendant qu'on écrit une lecture. `allure` : combien de fois plus vite que le vrai.
function Horloge({ t, arret, allure, pourquoi, passe }: { t: number; arret: boolean; allure: number; pourquoi: string; passe: (secondes: number) => void }) {
  const dernier = useRef(passe);
  useEffect(() => { dernier.current = passe; });
  useEffect(() => {
    if (arret) return;
    let image = 0;
    let avant = performance.now();
    let reserve = 0;
    const tourne = (maintenant: number) => {
      reserve += Math.min(0.1, (maintenant - avant) / 1000) * allure;
      avant = maintenant;
      // vingt pas par seconde suffisent : le niveau du thermomètre bouge sans saccade
      if (reserve >= Math.min(0.5, allure / 4)) { const pas = Math.floor(reserve * 100) / 100; reserve -= pas; dernier.current(pas); }
      image = requestAnimationFrame(tourne);
    };
    image = requestAnimationFrame(tourne);
    return () => cancelAnimationFrame(image);
  }, [arret, allure]);
  return (
    <g role="timer" aria-label={`Temps du laboratoire : ${heure(t)}, ${pourquoi}`}>
      <text x={12} y={-22} className="pl-fort">Temps du laboratoire</text>
      <text x={12} y={-6} className="pl-calorimetre-heure">{heure(t)}</text>
      <text x={12} y={7}>{pourquoi}</text>
    </g>
  );
}

// Le thermomètre, dessiné autour de son milieu : un tube, un réservoir, une colonne rouge qui suit la température.
// `chiffres` : faux quand il est plongé dans le calorimètre, où ses chiffres se mêleraient au reste ; la loupe les donne.
function Thermometre({ lue, chiffres }: { lue: number; chiffres: boolean }) {
  const haut = 62 - Math.max(0, Math.min(52, lue)) * 2.4;
  return (
    <g>
      <rect x={-2} y={r2(haut)} width={4} height={r2(66 - haut)} className="pl-calorimetre-colonne" />
      <circle cy={70} r={4.6} className="pl-calorimetre-colonne" />
      <path className="pl-verre" d="M -3.2 66 V -72 a 3.2 3.2 0 0 1 6.4 0 V 66 a 5.6 5.6 0 1 1 -6.4 0" />
      <Echelle x={3.2} y={62} longueur={-120} de={0} a={50} pas={5} majeur={10} cote={1} trait={1.8} ecrit={(v) => (chiffres ? nombre(v, 0) : "")} />
    </g>
  );
}

// La pince : deux branches qui se rejoignent en haut. Elle tient le bloc quand on le lui donne.
function Pince({ bloc }: { bloc: boolean }) {
  return (
    <g>
      <path className="pl-calorimetre-pince" d={bloc ? "M -12 14 L -3 -34 Q 0 -40 3 -34 L 12 14" : "M -7 28 L -2 -26 Q 0 -32 2 -26 L 7 28"} />
      {bloc && <rect className="pl-calorimetre-bloc" x={-13} y={6} width={26} height={24} rx={2} />}
    </g>
  );
}

// ---------- la paillasse ----------

export default function Calorimetre({ reglages: r, protocole, attente, fini }: PropsPaillasse<ReglagesCalorimetre>) {
  const [partie, setPartie] = useState<Partie>(() => ({ etat: regles.depart(r), gestes: [], attente: 0 }));
  const [message, setMessage] = useState("Prends un objet en le glissant, ou touche-le puis touche l'endroit où le poser. Le temps du laboratoire passe tout seul.");
  /** le bécher d'eau froide est penché au-dessus du vase ; l'eau coule */
  const [verse, setVerse] = useState(false);
  const [jet, setJet] = useState(false);
  const [saisie, setSaisie] = useState<"masse" | "temperature" | null>(null);
  const guide = useGuide();
  const versement = useVersement();
  /** la paillasse telle qu'elle est maintenant : l'état inscrit, vieilli du temps qui a passé depuis */
  const vu = partie.attente > 0 ? regles.geste(r, partie.etat, { g: "attendre", v: partie.attente }) : partie.etat;
  const m = maintenant(r, vu);

  const passe = useCallback((secondes: number) => setPartie((p) => {
    const suite = { ...p, attente: Math.round((p.attente + secondes) * 100) / 100 };
    // une longue attente s'inscrit d'elle-même, par tranches de cinq minutes
    return suite.attente >= 300 ? inscrit(r, suite) : suite;
  }), [r]);
  const agit = useCallback((g: GesteBrut) => setPartie((p) => applique(r, inscrit(r, p), g)), [r]);
  /** Fait un geste s'il est possible sur la paillasse telle qu'elle est ; dit s'il l'était. */
  const tente = (g: GesteBrut): boolean => {
    const possible = regles.geste(r, vu, g) !== vu;
    if (possible) agit(g);
    return possible;
  };

  // ----- prendre et poser -----
  const poser = (objet: string, cible: string) => {
    const suite = pose(r, vu, verse, objet, cible);
    suite.gestes.forEach(agit);
    setVerse(suite.verse);
    // avec le guide, c'est lui qui dit le geste suivant : le message s'en tient à ce qui vient de se passer
    if (suite.message) setMessage(suite.conseil && !guide.actif ? `${suite.message} ${suite.conseil}` : suite.message);
    if (objet === "bloc" && cible === "au-fond" && suite.gestes.length > 0) son("goutte");
  };
  const prise = (objet: string, ou: string[]) => {
    const [quoi, pronom] = OBJETS[objet] ?? ["cet objet", "le"];
    setMessage(ou.length > 0 ? `Tu tiens ${quoi}. Un anneau vert montre où ${pronom} poser.`
      : objet === "pince" ? "Tu tiens la pince, mais le bloc n'est plus dans l'eau bouillante : elle n'a rien à saisir."
      : `Tu tiens ${quoi}, mais sa place est prise pour l'instant.`);
  };
  const rate = (objet: string) => {
    const [quoi, pronom] = OBJETS[objet] ?? ["cet objet", "le"];
    setMessage(`Rien ne se pose à cet endroit. Reprends ${quoi} : un anneau vert montre où ${pronom} poser.`);
  };

  /** Agite pendant dix secondes du laboratoire : le pas fixe du clavier. */
  const agiteUnPeu = () => setPartie((p) => applique(r, applique(r, applique(r, inscrit(r, p), { g: "agiter", on: true }), { g: "attendre", v: 10 }), { g: "agiter", on: false }));
  const toutRecommencer = () => {
    setPartie({ etat: regles.depart(r), gestes: [], attente: 0 });
    setVerse(false);
    setSaisie(null);
    setMessage("La paillasse est remise comme au début.");
  };

  // ----- les positions qui dépendent de l'état -----
  const vase = PLACES[vu.vase];
  const haut = vase.y - VASE.h / 2;
  const niveau = vu.eau <= 0 ? 0 : Math.min(0.95, (vu.eau / CONTENANCE) * 0.9 + (vu.bloc === "vase" ? 0.1 : 0));
  const surface = r2(haut + VASE.h * (1 - niveau));
  /** on verse par la droite sur la balance, par la gauche dans le calorimètre, où l'agitateur prend la droite */
  const cote = vu.vase === "balance" ? 1 : -1;
  const { masse, initiale, finale } = vu.notes;
  const releves = [masse && `Masse d'eau : ${grammes(masse.v)}`, initiale && `Eau froide : ${degres(initiale.v)}`, finale && `Température finale : ${degres(finale.v)}`].filter((l): l is string => typeof l === "string");
  const allure = vitesse(vu);
  const pourquoi = allure > 1 ? "il passe dix fois plus vite" : vu.bloc === "air" ? "au rythme réel : le bloc est à l'air" : "au rythme réel : calorimètre ouvert";
  /** où se trouve chaque objet, chaque cible, chaque poussoir : le dessin et la main du guide lisent les mêmes places */
  const objets: Record<ObjetCalorimetre, Point> = {
    vase, eau: verse ? { x: vase.x + cote * 40, y: haut - 22 } : REPOS.eau, couvercle: vu.couvercle ? FERME : REPOS.couvercle,
    thermometre: vu.thermometre ? PLONGE : REPOS.thermometre, pince: REPOS.pince, bloc: TENU,
  };
  const cibles: Record<CibleCalorimetre, Point> = {
    plateau: PLACES.balance, cavite: PLACES.calorimetre, "au-dessus": { x: vase.x, y: haut - 22 }, "dans-le-vase": PLONGE, "au-fond": { x: PLACES.calorimetre.x, y: PLACES.calorimetre.y - 20 },
    calorimetre: FERME, bain: { x: TENU.x, y: BAIN.y + 22 }, "repos-eau": REPOS.eau, "repos-couvercle": { x: REPOS.couvercle.x, y: REPOS.couvercle.y - 8 }, "repos-thermometre": REPOS.thermometre,
  };
  const poussoirs: Record<PoussoirCalorimetre, Point> = { verser: { x: vase.x + cote * 86, y: haut - 44 }, agiter: AGITER, tare: placeDeLaTare(PESEE.x, PESEE.y) };

  // ----- le guide : le prochain geste, et où la main le montre -----
  const pas: PasDuGuide | null = guide.actif ? prochain(r, vu, { verse, saisie }) : null;
  const montre: Record<"loupe" | "bain", Point> = { loupe: { x: LOUPE.x - 18, y: LOUPE.y + LOUPE.r + 3 }, bain: { x: BAIN.x + 8, y: BAIN.y - 6 } };
  const laMain = (p: PasDuGuide): Indication["main"] => {
    switch (p.geste) {
      case "glisser": {
        // le thermomètre plongé se prend par le haut : la main part de là, et s'arrête décalée d'autant
        const d = p.objet === "thermometre" && vu.thermometre ? PRISE_HAUTE : { x: 0, y: 0 };
        return { geste: "glisser", de: { x: objets[p.objet].x + d.x, y: objets[p.objet].y + d.y }, vers: { x: cibles[p.cible].x + d.x, y: cibles[p.cible].y + d.y } };
      }
      case "maintenir": case "toucher": return { geste: p.geste, ou: poussoirs[p.poussoir] };
      // pendant une saisie, l'appareil à lire prend toute la vue : rien ne doit le cacher
      case "montrer": return saisie || p.quoi === "balance" ? undefined : { geste: "montrer", ou: montre[p.quoi] };
      default: return undefined;
    }
  };
  const indication: Indication | null = pas && { cle: pas.cle, texte: pas.texte, etape: pas.etape, main: laMain(pas), appel: pas.geste === "bouton" && pas.bouton === "fini" };
  /** la touche du bas que le guide met en avant */
  const vise = (bouton: string) => (pas?.geste === "bouton" && pas.bouton === bouton ? " pl-vise" : "");

  const outils = saisie === "masse" ? (
    <Releve nom="Masse affichée par la balance" unite="g" exemple="148,6" annule={() => setSaisie(null)}
      valide={(v) => { agit({ g: "noter", quoi: "masse", v }); setSaisie(null); setMessage(`Masse notée : ${grammes(v)}.`); son("bip"); }} />
  ) : saisie === "temperature" ? (
    <Releve nom={`Température lue sur le thermomètre${vu.bloc === "vase" ? ", le bloc dans l'eau" : ""}`} unite="°C" exemple="17,35" annule={() => setSaisie(null)}
      valide={(v) => { agit({ g: "noter", quoi: "temperature", v }); setSaisie(null); setMessage(`Température notée : ${degres(v)}.`); son("bip"); }} />
  ) : pas?.geste === "bouton" && pas.bouton === "recommencer" ? (
    // la mesure ne peut plus se rattraper : le guide fait tout reprendre
    <button type="button" className="btn btn-ligne pl-vise" onClick={toutRecommencer}>Tout recommencer</button>
  ) : (
    <>
      <button type="button" className={`btn btn-ligne${vise("masse")}`} onClick={() => setSaisie("masse")}>Noter la masse</button>
      <button type="button" className={`btn btn-ligne${vise("temperature")}`} onClick={() => setSaisie("temperature")}>Noter la température</button>
    </>
  );

  return (
    <Etabli titre="Calorimétrie" protocole={protocole} message={message} attente={attente} fini={() => fini(inscrit(r, partie).gestes)} recommence={toutRecommencer} outils={outils} saisie={saisie !== null} indication={indication}>
      <Scene vue={saisie === "temperature" ? VUE_LOUPE : saisie === "masse" ? VUE_BALANCE : VUE} nom="La paillasse de calorimétrie : une balance, un calorimètre et son vase, un thermomètre, un bain d'eau bouillante où chauffe le bloc de métal">
        <Manipulation pose={poser} prise={prise} rate={rate}>
          <Horloge t={vu.t} arret={jet || saisie !== null} allure={allure} pourquoi={pourquoi} passe={passe} />
          {releves.length > 0 && <text x={12} y={30} className="pl-fort">Mes relevés</text>}
          {releves.map((ligne, i) => <text key={ligne} x={12} y={45 + i * 14} className="pl-calorimetre-carnet">{ligne}</text>)}

          {/* la loupe du thermomètre : le haut de la colonne */}
          <text x={LOUPE.x} y={LOUPE.y - LOUPE.r - 7} textAnchor="middle" className="pl-fort">Thermomètre, en °C</text>
          <LoupeGraduee x={LOUPE.x} y={LOUPE.y} r={LOUPE.r} valeur={m.lue} pas={0.1} chiffre={5} parUnite={50} monte de={0} a={50} decimales={1} colonne={COLONNE} nom="Loupe sur le thermomètre, près du haut de la colonne" />
          {/* avec le guide, pendant la lecture : un chevron montre le haut de la colonne */}
          {saisie === "temperature" && pas && <path className="pl-main-pointe" d={`M ${LOUPE.x - 47} ${LOUPE.y - 5} l 9 5 l -9 5`} aria-hidden="true" />}

          {/* la paillasse, l'étagère, la balance */}
          <line className="pl-calorimetre-banc" x1={0} x2={360} y1={BANC} y2={BANC} />
          <path className="pl-verre" d={`M 8 ${ETAGERE} H 352 M 20 ${ETAGERE} v 7 M 340 ${ETAGERE} v 7`} />
          <path className="pl-verre" d={`M ${REPOS.thermometre.x - 10} ${ETAGERE} v -16 h 20 v 16`} opacity={0.5} />
          <Balance x={PESEE.x} y={PESEE.y} affiche={affichage(r, vu)} tare={() => setMessage(tente({ g: "tare" }) ? "La balance est remise à zéro." : "La balance est déjà à zéro.")} />

          {/* le calorimètre : une enceinte isolée, où loge le vase */}
          <rect className="pl-calorimetre-corps" x={140} y={402} width={100} height={BANC - 402} rx={8} />
          <rect className="pl-calorimetre-cavite" x={156} y={410} width={68} height={76} rx={4} />
          <text x={190} y={499} textAnchor="middle">calorimètre</text>

          {/* le bain d'eau bouillante, sur sa plaque chauffante */}
          <rect className="pl-calorimetre-plaque" x={BAIN.x - 10} y={BAIN.y + BAIN.h} width={BAIN.l + 20} height={BANC - BAIN.y - BAIN.h} rx={3} />
          <line className="pl-calorimetre-chauffe" x1={BAIN.x + 6} x2={BAIN.x + BAIN.l - 6} y1={BAIN.y + BAIN.h + 2} y2={BAIN.y + BAIN.h + 2} />
          <Becher x={BAIN.x} y={BAIN.y} l={BAIN.l} h={BAIN.h} niveau={0.78} couleur={EAU}>
            {vu.bloc === "bain" && <rect className="pl-calorimetre-bloc" x={TENU.x - 13} y={BAIN.y + BAIN.h - 27} width={26} height={24} rx={2} />}
            <g aria-hidden="true">
              {[14, 30, 46, 58].map((dx) => <circle key={dx} className="pl-calorimetre-bulle" cx={BAIN.x + dx} cy={BAIN.y + BAIN.h - 8} r={dx % 4 === 2 ? 2.2 : 1.6} />)}
            </g>
          </Becher>
          <g aria-hidden="true">
            {[18, 35, 52].map((dx) => <path key={dx} className="pl-calorimetre-vapeur" d={`M ${BAIN.x + dx} ${BAIN.y - 4} q -4 -6 0 -12 q 4 -6 0 -12`} />)}
          </g>
          <text x={TENU.x} y={BANC + 12} textAnchor="middle">eau bouillante, 100 °C</text>

          {/* le nom de ce qui ne porte pas d'étiquette */}
          {!vu.thermometre && <text x={REPOS.thermometre.x} y={REPOS.thermometre.y - 82} textAnchor="middle">thermomètre</text>}
          {vu.bloc !== "air" && <text x={REPOS.pince.x} y={REPOS.pince.y - 40} textAnchor="middle">pince</text>}

          {/* les cibles : où poser ce qu'on tient */}
          <Cible id="plateau" nom="le plateau de la balance" {...cibles.plateau} r={34} accepte={vu.vase === "calorimetre" ? ["vase"] : []} />
          <Cible id="cavite" nom="le calorimètre" {...cibles.cavite} r={34} accepte={vu.vase === "balance" ? ["vase"] : []} />
          <Cible id="au-dessus" nom="le dessus du vase, pour y verser" {...cibles["au-dessus"]} r={30} accepte={verse ? [] : ["eau"]} />
          <Cible id="dans-le-vase" nom="le vase du calorimètre, pour y plonger le thermomètre" {...cibles["dans-le-vase"]} r={36} accepte={vu.thermometre ? [] : ["thermometre"]} />
          <Cible id="au-fond" nom="le vase du calorimètre, pour y plonger le bloc" {...cibles["au-fond"]} r={32} accepte={vu.bloc === "air" ? ["bloc"] : []} />
          <Cible id="calorimetre" nom="le dessus du calorimètre" {...cibles.calorimetre} r={30} accepte={vu.couvercle ? [] : ["couvercle"]} />
          <Cible id="bain" nom="le bain d'eau bouillante" {...cibles.bain} r={32} accepte={vu.bloc === "bain" ? ["pince"] : vu.bloc === "air" ? ["bloc"] : []} />
          <Cible id="repos-eau" nom="sa place sur l'étagère" {...cibles["repos-eau"]} r={26} accepte={verse ? ["eau"] : []} />
          <Cible id="repos-couvercle" nom="sa place sur l'étagère" {...cibles["repos-couvercle"]} r={28} accepte={vu.couvercle ? ["couvercle"] : []} />
          <Cible id="repos-thermometre" nom="son support" {...cibles["repos-thermometre"]} r={30} accepte={vu.thermometre ? ["thermometre"] : []} />

          {/* le vase : son eau, et le bloc quand il y est */}
          <Objet id="vase" nom="Vase du calorimètre" {...objets.vase} l={VASE.l + 4} h={VASE.h + 4}>
            <Becher x={-VASE.l / 2} y={-VASE.h / 2} l={VASE.l} h={VASE.h} niveau={niveau} couleur={EAU}>
              {vu.bloc === "vase" && <rect className="pl-calorimetre-bloc" x={-13} y={VASE.h / 2 - 27} width={26} height={24} rx={2} />}
            </Becher>
            {/* plongé, le thermomètre passe devant ce nom : il s'efface */}
            {!vu.thermometre && <text x={-6} y={-2} textAnchor="middle">vase</text>}
          </Objet>

          {/* l'agitateur du calorimètre : une tige et son anneau ; on le manœuvre en maintenant « Agiter » */}
          <g className={vu.agite ? "pl-calorimetre-remue" : undefined} aria-hidden="true">
            <path className="pl-calorimetre-tige" d="M 210 346 V 470 M 202 470 a 8 3 0 1 0 16 0 a 8 3 0 1 0 -16 0" />
            <circle cx={210} cy={343} r={4} fill="var(--cuivre)" />
          </g>
          <Poussoir {...poussoirs.agiter} nom="Agiter l'eau du calorimètre" texte="Agiter"
            maintien={{
              debut: () => { if (!tente({ g: "agiter", on: true })) setMessage(vu.vase !== "calorimetre" ? "L'agitateur est dans le calorimètre, et le vase n'y est pas." : "Il n'y a pas d'eau à agiter."); else setMessage("Tu agites : l'eau se mélange."); },
              fin: () => { if (vu.agite) setMessage("Tu lâches l'agitateur."); agit({ g: "agiter", on: false }); }, tic: () => {}, pas: agiteUnPeu,
            }} />

          {/* le thermomètre : sur son support, ou dans le vase. Il se dessine avant le couvercle, qu'il traverse. */}
          <Objet id="thermometre" nom="Thermomètre" {...objets.thermometre} l={44} h={150}>
            <Thermometre lue={m.lue} chiffres={!vu.thermometre} />
          </Objet>

          {/* le couvercle : sur l'étagère, ou sur le calorimètre */}
          <Objet id="couvercle" nom="Couvercle du calorimètre" {...objets.couvercle} l={108} h={44}>
            <rect className="pl-calorimetre-couvercle" x={-54} y={-5} width={108} height={10} rx={3} />
            <rect className="pl-calorimetre-couvercle" x={-9} y={-11} width={18} height={6} rx={2} />
            {!vu.couvercle && <text y={-15} textAnchor="middle">couvercle</text>}
          </Objet>

          {/* le bécher d'eau froide : sur l'étagère, ou penché au-dessus du vase */}
          <Objet id="eau" nom="Bécher d'eau froide" {...objets.eau} l={50} h={52}>
            <g transform={verse ? `rotate(${-105 * cote})` : undefined}><Becher x={-22} y={-24} l={44} h={48} niveau={0.82} couleur={EAU} /></g>
            {!verse && <text y={36} textAnchor="middle">eau froide</text>}
          </Objet>
          {verse && (
            <>
              <Filet x={vase.x + cote * 12} y1={haut - 16} y2={vu.eau > 0 ? surface : haut + VASE.h - 4} couleur="rgba(200, 220, 240, 0.8)" coule={jet} />
              {/* le geste ralentit de lui-même à l'approche de la masse demandée, comme la main qui redresse le bécher */}
              <Poussoir {...poussoirs.verser} nom="Verser l'eau froide dans le vase" texte="Verser"
                maintien={versement({
                  debit: debitEau(r, vu), grain: 0.5, pas: 10, debut: () => setJet(true), fin: () => setJet(false),
                  verse: (v) => { agit({ g: "verser", v }); if (vu.eau + v > CONTENANCE) setMessage("Le vase est plein : l'eau déborde sur la paillasse."); },
                })} />
            </>
          )}

          {/* la pince : sur l'étagère, ou au-dessus du bain, le bloc entre ses branches */}
          {vu.bloc === "air" ? (
            <Objet id="bloc" nom="Bloc chaud, dans la pince" {...objets.bloc} l={48} h={84}>
              <Pince bloc />
              <g aria-hidden="true">
                <path className="pl-calorimetre-vapeur" d="M -18 8 q -4 -6 0 -12" />
                <path className="pl-calorimetre-vapeur" d="M 18 8 q 4 -6 0 -12" />
              </g>
            </Objet>
          ) : (
            <Objet id="pince" nom="Pince" {...objets.pince} l={44} h={64}>
              <Pince bloc={false} />
            </Objet>
          )}
        </Manipulation>
        {/* la main du guide, par-dessus tout le reste */}
        <Main indication={indication} />
      </Scene>
    </Etabli>
  );
}
