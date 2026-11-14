"use client";

// La paillasse « doppler » (décision 0012). Un mobile motorisé porte un émetteur sonore et passe devant un micro.
// L'élève fait tout à la main : il tourne la molette du moteur, glisse les deux fourches optiques le long du rail,
// lance l'enregistreur puis le mobile, arrête l'enregistreur quand le mobile est arrivé, ramène le mobile au départ.
// Il lit la règle à la loupe, le chronomètre sur son afficheur, et les deux pics du spectre avec un repère, en zoomant.
// Chaque geste passe par les règles (lib/commun/tp/paillasses/doppler.ts) ; les gestes qui dépendent du temps portent
// l'instant où ils sont faits. La liste des gestes part au serveur.
// Le guide (lib/commun/tp/paillasses/doppler-guide.ts) dit le prochain geste ; ici, la main le montre à sa place dans le dessin.

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { nombre } from "@/lib/commun/format";
import { frequenceRecue } from "@/lib/commun/simulations/doppler";
import { CRANS, FOURCHES, MEMOIRE, RAIL, chronometre, dernierPassage, dureeDuTrajet, instantDuPassage, mobile, mobileA, pics, regles, roule, spectre, vitesseAu, type EtatDoppler, type ReglagesDoppler } from "@/lib/commun/tp/paillasses/doppler";
import { BANDE, FENETRES, LIGNES_DU_CARNET, debutDeFenetre, prochain, zoomer, type LigneDoppler, type PasDuGuide, type VueDoppler } from "@/lib/commun/tp/paillasses/doppler-guide";
import type { GesteBrut, PropsPaillasse } from "@/lib/commun/tp/types";
import { Afficheur, Cible, Etabli, Loupe, Main, Manipulation, Molette, Objet, Poussoir, Scene, Touche, son, sonsEnMarche, useGlisse, useGuide, type Indication, type Point, type Vue } from "../kit";
import { Analyseur, MOLETTE_ZOOM, VUE_LECTURE, placeSurEcran } from "./doppler-spectre";
import { Carnet, type LigneCarnet } from "./ultrasons-carnet";
import "./doppler.css";

// ---------- la place de chaque chose dans le dessin (360 de large) ----------
const VUE: Vue = { x: 0, y: -6, l: 360, h: 530 };
const PAR_CM = 0.8;                                  // la largeur d'un centimètre du rail
const r1 = (n: number) => Math.round(n * 10) / 10;
const X = (cm: number) => 20 + cm * PAR_CM;
const RAIL_Y = 290;                                  // le dessus du rail
const MICRO = X(RAIL.micro * 100);
/** Les commandes du banc, et ce qui se prend sur le rail : le dessin et la main du guide lisent les mêmes places. La main qui tourne la molette déborde d'elle : la molette reste à distance du bord. */
const MOTEUR: Point = { x: 58, y: 46 };
const LANCER: Point = { x: 146, y: 46 };
const ENREGISTREUR: Point = { x: 62, y: 123 };
const DEPART: Point = { x: X(0), y: RAIL_Y - 12 };
const ARRIVEE: Point = { x: X(RAIL.longueur * 100), y: RAIL_Y - 14 };
/** Là où le doigt prend une fourche : sur son arche, au-dessus du rail. */
const priseDeFourche = (cm: number): Point => ({ x: r1(X(cm)), y: RAIL_Y - 16 });
const LOUPE = { x: 286, y: 446, r: 66, parCm: 4.6 };
/** Pendant une lecture, le regard se rapproche de la loupe, ou du chronomètre. */
const VUE_LOUPE: Vue = { x: LOUPE.x - 112, y: LOUPE.y - 72, l: 224, h: 144 };
const VUE_CHRONO: Vue = { x: 174, y: -4, l: 186, h: 92 };

interface Partie { etat: EtatDoppler; gestes: GesteBrut[] }
/** Ajoute un geste à la liste. Une fourche ou la molette déplacée de nouveau remplace le déplacement d'avant : la liste reste courte, et rejouée elle donne le même état. */
function ajoute(gestes: GesteBrut[], g: GesteBrut): GesteBrut[] {
  const dernier = gestes[gestes.length - 1];
  const suite = dernier !== undefined && dernier.g === g.g && (g.g === "cran" || (g.g === "fourche" && dernier.n === g.n));
  return suite ? [...gestes.slice(0, -1), g] : [...gestes, g];
}

// ---------- le carnet ----------
type Quoi = LigneDoppler;
const SANS_SPECTRE = "Il n'y a pas encore d'enregistrement : pas de spectre, donc pas de fréquence à noter.";
const HORS_REGLE = "La règle du rail va de 0 à 400 cm : écris la position en centimètres.";
const LIGNES: LigneCarnet<Quoi>[] = [
  { quoi: "x1", court: LIGNES_DU_CARNET.x1, nom: "Position de la première fourche, lue sur la règle", unite: "cm", exemple: "62,5", refus: HORS_REGLE },
  { quoi: "x2", court: LIGNES_DU_CARNET.x2, nom: "Position de la seconde fourche, lue sur la règle", unite: "cm", exemple: "187,5", refus: HORS_REGLE },
  { quoi: "duree", court: LIGNES_DU_CARNET.duree, nom: "Durée affichée par le chronomètre", unite: "s", exemple: "1,234", refus: "Une durée s'écrit en secondes, avec un nombre plus grand que zéro." },
  { quoi: "approche", court: LIGNES_DU_CARNET.approche, nom: "Fréquence du pic de l'approche, lue au repère", unite: "Hz", exemple: "2512,25", refus: SANS_SPECTRE },
  { quoi: "eloignement", court: LIGNES_DU_CARNET.eloignement, nom: "Fréquence du pic de l'éloignement, lue au repère", unite: "Hz", exemple: "2488,5", refus: SANS_SPECTRE },
];
function dejaNote(etat: EtatDoppler, quoi: Quoi): string | null {
  if (quoi === "x1" || quoi === "x2") { const position = etat[quoi]; return position === null ? null : `${nombre(position, 1)} cm`; }
  if (quoi === "duree") return etat.duree ? `${nombre(etat.duree.note, 3)} s` : null;
  const f = etat[quoi];
  return f ? `${nombre(f.note, 2)} Hz` : null;
}

// ---------- le son du passage ----------

/** Fait entendre l'émetteur pendant le passage : de plus en plus fort, puis de plus en plus faible, un peu plus aigu à l'approche qu'à l'éloignement. */
function faisEntendre(contexte: AudioContext, r: ReglagesDoppler, v: number) {
  const duree = dureeDuTrajet(v), n = 64;
  const frequences = new Float32Array(n), volumes = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const m = mobile(v, (i / (n - 1)) * duree * 0.999);
    const versMicro = RAIL.micro - m.x, distance = Math.hypot(versMicro, 0.25);
    frequences[i] = frequenceRecue({ fE: r.fE, c: r.c, v: (m.u * versMicro) / distance });
    volumes[i] = 0.035 * Math.min(1, 0.3 / distance);
  }
  const oscillateur = contexte.createOscillator(), volume = contexte.createGain();
  oscillateur.type = "sine";
  oscillateur.frequency.setValueCurveAtTime(frequences, contexte.currentTime, duree);
  volume.gain.setValueCurveAtTime(volumes, contexte.currentTime, duree);
  oscillateur.connect(volume).connect(contexte.destination);
  oscillateur.start();
  oscillateur.stop(contexte.currentTime + duree + 0.02);
}

// ---------- le banc ----------

// Le mobile : un chariot, et son émetteur sonore sur le dessus. Dessiné autour de (0, 0), posé sur le rail.
function Mobile() {
  return (
    <g className="pl-doppler-mobile">
      <rect x={-13} y={-16} width={26} height={11} rx={3} />
      <rect className="pl-doppler-emetteur" x={-4} y={-22} width={8} height={6} rx={1.5} />
      <circle cx={-8} cy={-3.5} r={3.2} /><circle cx={8} cy={-3.5} r={3.2} />
      <path className="pl-doppler-onde" d="M -5 -26 q 5 -5 10 0" />
      <path className="pl-doppler-onde" d="M -8 -30 q 8 -8 16 0" />
    </g>
  );
}

// Une fourche optique : elle enjambe le rail et se glisse le long de lui. Au clavier, les flèches (un demi-centimètre) et les touches Page (dix centimètres).
// `tient` : dit quand le doigt prend la fourche, puis quand il la lâche.
function Fourche({ n, cm, choisie, bouge, choisis, tient }: { n: 1 | 2; cm: number; choisie: boolean; bouge: (cm: number) => void; choisis: () => void; tient: (tenu: boolean) => void }) {
  const prise = useRef(0);
  const ici = r1(X(cm));
  const glisse = useGlisse({ depart: (p) => { prise.current = p.x - ici; choisis(); tient(true); }, bouge: (p) => bouge((p.x - prise.current - X(0)) / PAR_CM), fin: () => tient(false) });
  const clavier = (e: KeyboardEvent<SVGGElement>) => {
    const pas = e.key === "ArrowRight" || e.key === "ArrowUp" ? FOURCHES.pas : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -FOURCHES.pas : e.key === "PageUp" ? 10 : e.key === "PageDown" ? -10 : 0;
    if (pas) { e.preventDefault(); bouge(cm + pas); }
  };
  return (
    <g className={`pl-doppler-fourche${choisie ? " est-choisie" : ""}`} role="slider" tabIndex={0} aria-label={`Fourche optique F${n}, sur le rail`} aria-valuemin={FOURCHES.min} aria-valuemax={FOURCHES.max}
      aria-valuenow={Math.round(cm / 10) * 10} aria-valuetext={`vers ${nombre(cm / 100, 1)} m`} onKeyDown={clavier} onFocus={choisis} {...glisse}>
      <rect x={ici - 22} y={RAIL_Y - 50} width={44} height={62} fill="transparent" />
      <path d={`M ${ici - 9} ${RAIL_Y - 2} V ${RAIL_Y - 30} H ${ici + 9} V ${RAIL_Y - 2}`} />
      <path className="pl-doppler-index" d={`M ${ici - 4} ${RAIL_Y + 6} h 8 l -4 6 Z`} />
      <text x={ici} y={RAIL_Y - 36} textAnchor="middle" className="pl-fort">F{n}</text>
    </g>
  );
}

// La loupe posée sur la règle du rail, sous le repère d'une fourche : un trait par centimètre, un chiffre tous les dix.
function LoupeRegle({ cm, n }: { cm: number; n: number }) {
  const { x: cx, y: cy, r, parCm } = LOUPE;
  const vus = Math.ceil(r / parCm) + 1;
  const traits = Array.from({ length: 4 * vus + 1 }, (_, i) => Math.round(cm) - vus + i / 2).filter((c) => c >= 0 && c <= RAIL.longueur * 100);
  const place = (c: number) => r1(cx + (c - cm) * parCm);
  return (
    <Loupe x={cx} y={cy} r={r} nom={`Loupe sur la règle du rail, sous le repère de la fourche F${n}`}>
      <rect x={cx - r} y={cy - 6} width={2 * r} height={r + 6} fill="var(--carte-2)" />
      <g className="pl-echelle">
        {traits.map((c) => {
          const entier = Number.isInteger(c);
          return (
            <g key={c}>
              <line x1={place(c)} x2={place(c)} y1={cy - 6} y2={cy - 6 + (!entier ? 5 : c % 10 === 0 ? 20 : c % 5 === 0 ? 14 : 9)} strokeWidth={entier && c % 10 === 0 ? 1.3 : entier ? 0.8 : 0.5} />
              {entier && c % 10 === 0 && <text x={place(c)} y={cy + 27} textAnchor="middle" className="pl-loupe-chiffre">{c}</text>}
            </g>
          );
        })}
      </g>
      <rect x={cx - 34} y={cy - r} width={68} height={r - 18} fill="var(--carte)" stroke="var(--bleu)" strokeWidth={1.4} />
      <text x={cx} y={cy - r + 28} textAnchor="middle" className="pl-fort">F{n}</text>
      <path d={`M ${cx - 7} ${cy - 18} h 14 l -7 10 Z`} fill="var(--cuivre)" />
      <line className="pl-repere" x1={cx} x2={cx} y1={cy - 10} y2={cy + 10} />
    </Loupe>
  );
}

// ---------- la paillasse ----------

export default function Doppler({ reglages: r, protocole, attente, fini }: PropsPaillasse<ReglagesDoppler>) {
  const [partie, setPartie] = useState<Partie>(() => ({ etat: regles.depart(r), gestes: [] }));
  const [message, setMessage] = useState("Ta paillasse est prête. Le protocole est en haut de l'écran.");
  /** l'heure de la paillasse, en secondes : elle n'avance à l'écran que pendant un passage ou un enregistrement */
  const [temps, setTemps] = useState(0);
  const [ecran, setEcran] = useState<"banc" | "spectre">("banc");
  /** la fourche que montre la loupe */
  const [choisie, setChoisie] = useState<0 | 1>(0);
  const [zoom, setZoom] = useState(0);
  const [centre, setCentre] = useState(BANDE / 2);
  const [repere, setRepere] = useState(2000);
  const [carnet, setCarnet] = useState<"ferme" | "ouvert" | Quoi>("ferme");
  /** ce que l'élève tient sous son doigt : le guide ne change pas de consigne pendant qu'il le glisse */
  const [tenu, setTenu] = useState<VueDoppler["tenu"]>(null);
  const guide = useGuide();
  const { etat, gestes } = partie;
  const origine = useRef<number | null>(null);
  /** l'instant où le mobile en route arrivera, et celui où l'enregistrement en cours a commencé */
  const arrivee = useRef<number | null>(null);
  const enregistrement = useRef<number | null>(null);
  const audio = useRef<AudioContext | null>(null);

  /** L'heure de la paillasse : les secondes écoulées depuis le premier geste daté, au centième. Elle part de 1. */
  const heure = useCallback((): number => {
    origine.current ??= performance.now();
    return Math.round((performance.now() - origine.current) / 10) / 100 + 1;
  }, []);
  const agit = useCallback((g: GesteBrut) => setPartie((p) => {
    const suite = regles.geste(r, p.etat, g);
    return suite === p.etat ? p : { etat: suite, gestes: ajoute(p.gestes, g) };
  }), [r]);
  const arrete = useCallback((t: number, plein = false) => {
    agit({ g: "arreter", t });
    enregistrement.current = null;
    setTemps(t);
    setMessage(plein ? "La mémoire de l'enregistreur est pleine : il s'est arrêté. Le spectre de ce son est prêt." : "Enregistrement arrêté. Le spectre de ce son est prêt.");
  }, [agit]);

  // l'heure avance à l'écran tant que le mobile roule ou que l'enregistreur tourne
  const vivant = roule(etat, temps) || etat.debut !== null;
  useEffect(() => {
    if (!vivant) return;
    // avec « moins d'animations », le mobile avance par à-coups
    const calme = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let image = 0, dernier = -1;
    const tourne = () => {
      const t = heure();
      const arrive = arrivee.current !== null && t >= arrivee.current;
      if (arrive) { arrivee.current = null; setMessage("Le mobile est arrivé au bout du rail."); son("pose"); }
      if (enregistrement.current !== null && t - enregistrement.current >= MEMOIRE) arrete(t, true);
      else if (arrive || !calme || t - dernier >= 0.4) { dernier = t; setTemps(t); }
      image = requestAnimationFrame(tourne);
    };
    image = requestAnimationFrame(tourne);
    return () => cancelAnimationFrame(image);
  }, [vivant, heure, arrete]);
  // en quittant la paillasse, le son s'arrête
  useEffect(() => () => { void audio.current?.close(); }, []);

  // ----- le moteur, les fourches -----
  const regleCran = (v: number) => { agit({ g: "cran", v }); setMessage(`Moteur : cran ${v}.`); };
  const glisseFourche = (n: 1 | 2, cm: number) => {
    const x = Math.round(Math.max(FOURCHES.min, Math.min(FOURCHES.max, cm)) / FOURCHES.pas) * FOURCHES.pas;
    if (x !== etat.fourches[n - 1]) agit({ g: "fourche", n, x });
  };

  // ----- le mobile -----
  const enRoute = roule(etat, temps);
  const lance = () => {
    const t = heure();
    const g: GesteBrut = { g: "lancer", t };
    if (regles.geste(r, etat, g) === etat) { setMessage("Le mobile est au bout du rail : ramène-le au départ avant de le relancer."); return; }
    const v = vitesseAu(r, etat.cran);
    agit(g);
    setTemps(t);
    arrivee.current = t + dureeDuTrajet(v);
    setMessage(`Le mobile est parti, moteur au cran ${etat.cran}.`);
    if (sonsEnMarche()) {
      try {
        audio.current ??= new AudioContext();
        void audio.current.resume();
        faisEntendre(audio.current, r, v);
      } catch { /* pas de son sur cet appareil : la paillasse marche sans */ }
    }
  };
  const ramene = () => { agit({ g: "ramener", t: heure() }); setMessage("Le mobile est revenu au départ du rail."); };

  // ----- l'enregistreur -----
  const bascule = () => {
    const t = heure();
    if (etat.debut !== null) { arrete(t); return; }
    agit({ g: "enregistrer", t });
    enregistrement.current = t;
    setTemps(t);
    setMessage("L'enregistrement est lancé : le micro capte le son du rail.");
  };

  // ----- le spectre -----
  const sons = useMemo(() => spectre(r, etat), [r, etat]);
  const sommets = useMemo(() => pics(r, sons), [r, sons]);
  const zoome = (suite: number) => {
    // la fenêtre se resserre autour du repère, et le repère se cale sur le nouveau pas
    const resserre = zoomer(repere, suite);
    setZoom(resserre.zoom);
    setCentre(resserre.centre);
    setRepere(resserre.repere);
    setMessage(`Analyseur : fenêtre de ${nombre(FENETRES[suite], 0)} Hz.`);
  };

  // ----- le carnet -----
  /** la fourche que le mobile rencontre en premier */
  const premiere: 0 | 1 = etat.fourches[0] <= etat.fourches[1] ? 0 : 1;
  const note = (quoi: Quoi, v: number) => {
    const ligne = LIGNES.find((l) => l.quoi === quoi)!;
    const g: GesteBrut = { g: "noter", quoi, v };
    setCarnet("ferme");
    if (regles.geste(r, etat, g) === etat) { setMessage(ligne.refus); son("faux"); return; }
    agit(g);
    setMessage(`Noté dans ton carnet. ${ligne.court} : ${v.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} ${ligne.unite}.`);
    son("bip");
  };
  /** Ouvrir une ligne du carnet montre l'appareil à lire : le banc pour la règle et le chronomètre, l'analyseur pour les fréquences. */
  const ecris = (quoi: Quoi | null) => {
    setCarnet(quoi ?? "ouvert");
    if (quoi === "approche" || quoi === "eloignement") setEcran("spectre");
    else if (quoi !== null) { setEcran("banc"); if (quoi !== "duree") setChoisie(quoi === "x1" ? premiere : premiere === 0 ? 1 : 0); }
  };
  const toutRecommencer = () => {
    setPartie({ etat: regles.depart(r), gestes: [] });
    arrivee.current = null;
    enregistrement.current = null;
    setEcran("banc");
    setZoom(0);
    setCentre(BANDE / 2);
    setRepere(2000);
    setCarnet("ferme");
    setTenu(null);
    setMessage("La paillasse est remise comme au début.");
  };

  // ----- ce que montrent les appareils -----
  const passage = dernierPassage(etat);
  const position = mobileA(etat, temps).x * 100;
  let affiche = 0;
  if (passage) {
    const [a, b] = [instantDuPassage(passage.v, passage.fourches[0] / 100), instantDuPassage(passage.v, passage.fourches[1] / 100)].sort((u, v) => u - v);
    const ecoule = temps - passage.t;
    affiche = ecoule <= a ? 0 : ecoule < b ? ecoule - a : chronometre(passage.v, passage.fourches);
  }
  const bande = etat.debut !== null ? Math.max(0, temps - etat.debut) : etat.bande ? etat.bande.fin - etat.bande.debut : 0;

  // ----- le guide : le prochain geste, et où la main le montre -----
  /** le repère, là où l'analyseur le dessine : dans sa fenêtre */
  const repereVu = Math.max(debutDeFenetre(zoom, centre), Math.min(debutDeFenetre(zoom, centre) + FENETRES[zoom], repere));
  const pas: PasDuGuide | null = guide.actif ? prochain(r, etat, { t: temps, ecran, zoom, centre, repere: repereVu, carnet, tenu, sommets }) : null;
  const laMain = (p: PasDuGuide): Indication["main"] => {
    switch (p.geste) {
      // les mêmes angles que `Molette` : cinq crans pour le moteur, sept fenêtres pour le zoom
      case "tourner": return p.molette === "moteur"
        ? { geste: "tourner", ou: MOTEUR, de: -135 + (etat.cran - CRANS.min) * 67.5, a: -135 + (p.vers - CRANS.min) * 67.5, r: 32 }
        : { geste: "tourner", ou: MOLETTE_ZOOM, de: -135 + zoom * 45, a: -135 + p.vers * 45, r: 32 };
      case "fourche": return { geste: "glisser", de: priseDeFourche(etat.fourches[p.n - 1]), vers: priseDeFourche(p.vers) };
      case "ramener": return { geste: "glisser", de: ARRIVEE, vers: DEPART };
      case "toucher": return { geste: "toucher", ou: p.quoi === "lancer" ? LANCER : ENREGISTREUR };
      case "viser": return { geste: "toucher", ou: placeSurEcran(zoom, centre, p.f) };
      // une touche du bas, une ligne du carnet, une lecture, une attente : rien à montrer dans la scène
      default: return undefined;
    }
  };
  const indication: Indication | null = pas && { cle: pas.cle, texte: pas.texte, etape: pas.etape, main: laMain(pas), appel: pas.geste === "bouton" && pas.bouton === "fini" };
  /** la touche du bas que le guide met en avant */
  const enAvant = (bouton: string) => (pas?.geste === "bouton" && pas.bouton === bouton ? " pl-vise" : "");

  const saisie = carnet !== "ferme";
  const notees = LIGNES.filter((l) => dejaNote(etat, l.quoi) !== null).length;
  const outils = saisie ? (
    <Carnet lignes={LIGNES} ouvert={carnet === "ouvert" ? null : carnet} note={(quoi) => dejaNote(etat, quoi)} ecris={ecris} valide={note} ferme={() => setCarnet("ferme")}
      vise={pas?.geste === "ligne" ? pas.ligne : pas?.geste === "bouton" && pas.bouton === "fermer" ? "fermer" : null} />
  ) : (
    <>
      {ecran === "banc"
        ? <button type="button" className={`btn btn-ligne${enAvant("spectre")}`} onClick={() => { setEcran("spectre"); setMessage(etat.bande ? "Voici le spectre de ton dernier enregistrement." : "Il n'y a pas encore d'enregistrement : le spectre est vide."); }}>Spectre</button>
        : <button type="button" className={`btn btn-ligne${enAvant("banc")}`} onClick={() => { setEcran("banc"); setMessage("Retour au banc."); }}>Revenir au banc</button>}
      <button type="button" className={`btn btn-ligne${enAvant("carnet")}`} onClick={() => setCarnet("ouvert")}>Carnet ({notees} sur {LIGNES.length})</button>
    </>
  );
  const vue = carnet === "x1" || carnet === "x2" ? VUE_LOUPE : carnet === "duree" ? VUE_CHRONO : VUE;

  return (
    <Etabli titre="Doppler" protocole={protocole} message={message} attente={attente} fini={() => fini(gestes)} recommence={toutRecommencer} outils={outils} saisie={saisie} indication={indication}>
      {ecran === "spectre" ? (
        <Scene vue={carnet === "approche" || carnet === "eloignement" ? VUE_LECTURE : VUE} nom="L'analyseur de spectre : le spectre du son enregistré, un repère à glisser, une molette de zoom">
          <Analyseur r={r} spectre={sons} zoom={zoom} centre={centre} repere={repere} place={setRepere} zoome={zoome} tient={(t) => setTenu(t ? "repere" : null)} />
          {/* la main du guide, par-dessus tout le reste */}
          <Main indication={indication} />
        </Scene>
      ) : (
        <Scene vue={vue} nom="Le banc : un mobile motorisé sur un rail gradué, un micro et son enregistreur, deux fourches optiques et leur chronomètre">
          <Manipulation pose={ramene} prise={() => setMessage(guide.actif ? "Tu tiens le mobile." : "Tu tiens le mobile. Pose-le au départ du rail.")}>
            {/* le boîtier de commande : le moteur du mobile, le chronomètre des fourches */}
            <rect className="pl-doppler-boitier" x={4} y={0} width={352} height={84} rx={12} />
            <text x={MOTEUR.x} y={14} textAnchor="middle">moteur</text>
            <Molette x={MOTEUR.x} y={MOTEUR.y} r={26} valeur={etat.cran} min={CRANS.min} max={CRANS.max} pas={1} change={regleCran} nom="Cran du moteur" texte={`cran ${etat.cran}`} />
            <text x={MOTEUR.x + 34} y={42}>cran</text>
            <text x={MOTEUR.x + 34} y={60} className="pl-fort" style={{ fontSize: 16 }}>{etat.cran}</text>
            <Poussoir x={LANCER.x} y={LANCER.y} r={24} nom="Lancer le mobile" texte="Lancer" appuie={lance} actif={etat.auDepart} />
            <text x={262} y={14} textAnchor="middle">chronomètre des fourches</text>
            <Afficheur x={186} y={24} l={152} h={42} nom="Chronomètre" unite="s" valeur={nombre(affiche, 3)} />

            {/* l'enregistreur, relié au micro */}
            <rect className="pl-doppler-boitier" x={4} y={92} width={352} height={62} rx={12} />
            <Touche x={ENREGISTREUR.x} y={ENREGISTREUR.y} l={104} h={44} nom={etat.debut === null ? "Lancer l'enregistrement" : "Arrêter l'enregistrement"} texte={etat.debut === null ? "Enregistrer" : "Arrêter"} appuie={bascule} enfonce={etat.debut !== null} />
            <circle className={`pl-doppler-temoin${etat.debut !== null ? " est-allume" : ""}`} cx={130} cy={123} r={5.5} />
            <Afficheur x={146} y={107} l={84} h={32} nom="Durée de l'enregistrement" unite="s" valeur={nombre(bande, 1)} />
            <text x={240} y={119}>{etat.debut !== null ? "le micro enregistre" : etat.bande ? "une bande en mémoire" : "enregistreur vide"}</text>
            <text x={240} y={133}>{etat.debut !== null ? "" : etat.bande ? "son spectre est prêt" : "rien à analyser"}</text>
            <path className="pl-doppler-cable" d={`M ${MICRO} 154 V ${RAIL_Y - 44}`} />
            <ellipse className="pl-doppler-micro" cx={MICRO} cy={RAIL_Y - 37} rx={4.5} ry={8} />
            <text x={MICRO + 9} y={RAIL_Y - 52}>micro</text>

            {/* le rail et sa règle */}
            <rect className="pl-doppler-rail" x={12} y={RAIL_Y} width={336} height={5} rx={1.5} />
            <path d={`M 12 ${RAIL_Y} v -10 h 5 v 10 M 343 ${RAIL_Y} v -10 h 5 v 10`} fill="var(--discret)" />
            <rect className="pl-doppler-regle" x={14} y={RAIL_Y + 5} width={332} height={28} />
            <g className="pl-doppler-traits" aria-hidden="true">
              {Array.from({ length: RAIL.longueur * 10 + 1 }, (_, i) => i * 10).map((c) => <line key={c} x1={r1(X(c))} x2={r1(X(c))} y1={RAIL_Y + 5} y2={RAIL_Y + 5 + (c % 50 === 0 ? 9 : 5)} strokeWidth={c % 50 === 0 ? 1 : 0.6} />)}
              {Array.from({ length: RAIL.longueur * 2 + 1 }, (_, i) => i * 50).map((c) => <text key={c} x={r1(X(c))} y={RAIL_Y + 27} textAnchor="middle">{c}</text>)}
            </g>
            <text x={20} y={RAIL_Y + 46}>règle du rail, en centimètres</text>

            {/* la loupe sur la règle */}
            {/* pendant la lecture, le regard est sur la loupe : son mode d'emploi s'efface */}
            {carnet !== "x1" && carnet !== "x2" && (
              <>
                <text x={20} y={LOUPE.y - 6} className="pl-fort">Loupe : la règle, sous le repère de F{choisie + 1}</text>
                <text x={20} y={LOUPE.y + 8}>Touche une fourche pour la regarder.</text>
              </>
            )}
            <LoupeRegle cm={etat.fourches[choisie]} n={choisie + 1} />

            {/* le mobile : il roule, attend au départ, ou attend au bout du rail qu'on le ramène */}
            <Cible id="depart" nom="le départ du rail" x={DEPART.x} y={DEPART.y} r={22} accepte={!etat.auDepart && !enRoute ? ["mobile"] : []} />
            {etat.auDepart || enRoute
              ? <g transform={`translate(${r1(X(position))} ${RAIL_Y})`} role="img" aria-label={enRoute ? "Le mobile roule sur le rail." : "Le mobile est au départ du rail."}><Mobile /></g>
              : <Objet id="mobile" nom="Mobile, au bout du rail" x={ARRIVEE.x} y={ARRIVEE.y} l={44} h={44}><g transform="translate(0 14)"><Mobile /></g></Objet>}

            {/* les fourches optiques : ce qui se déplace se dessine en dernier */}
            <Fourche n={1} cm={etat.fourches[0]} choisie={choisie === 0} bouge={(cm) => glisseFourche(1, cm)} choisis={() => setChoisie(0)} tient={(t) => setTenu(t ? "f1" : null)} />
            <Fourche n={2} cm={etat.fourches[1]} choisie={choisie === 1} bouge={(cm) => glisseFourche(2, cm)} choisis={() => setChoisie(1)} tient={(t) => setTenu(t ? "f2" : null)} />
          </Manipulation>
          {/* la main du guide, par-dessus tout le reste */}
          <Main indication={indication} />
        </Scene>
      )}
    </Etabli>
  );
}
