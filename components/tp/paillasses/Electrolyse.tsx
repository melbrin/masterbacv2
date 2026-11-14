"use client";

// La paillasse Électrolyse (décision 0012). L'élève y fait les gestes du laboratoire, à la main : il porte la plaque sur
// la balance, plonge les deux plaques dans la cuve, tire les fils d'une borne à l'autre pour fermer la boucle, bascule
// l'interrupteur, tourne la molette du générateur en lisant l'ampèremètre, lance le chronomètre, laisse passer le temps
// en maintenant « Avance rapide », puis rince, sèche et pèse de nouveau la plaque. Le dépôt se voit grandir.
// Chaque geste passe par les règles (lib/commun/tp/paillasses/electrolyse.ts) ; la liste des gestes part au serveur.
// Le guide (lib/commun/tp/paillasses/electrolyse-guide.ts) dit le prochain geste ; ici, la main le montre à sa place dans le dessin.

import { useCallback, useEffect, useRef, useState } from "react";
import { nombre, nombreRelatif } from "@/lib/commun/format";
import { TENSION_MAX, amperemetre, balance, chronometre, electrodeDe, intensite, masseNue, montage, regles, type Electrode, type EtatElectrolyse, type ReglagesElectrolyse } from "@/lib/commun/tp/paillasses/electrolyse";
import { ajoute, effet, nomBorne, pose, prochain, vitesse, type PasDuGuide, type ToucheElectrolyse } from "@/lib/commun/tp/paillasses/electrolyse-guide";
import { croixDuFil } from "@/lib/commun/tp/paillasses/pile-guide";
import type { GesteBrut, PropsPaillasse } from "@/lib/commun/tp/types";
import { Afficheur, Becher, Cible, Etabli, Fils, Interrupteur, Main, Manipulation, Molette, Objet, Pissette, Poussoir, Releve, Scene, Touche, couleurSolution, son, useGuide, type Borne, type Indication, type Point, type Vue } from "../kit";
import { BALANCE, Balance, largeurBalance, placeDeLaTare } from "./calorimetre-balance";
import { CroixDeSecours } from "./pile-fils";
import "./electrolyse.css";

// ---------- la place de chaque chose dans le dessin (360 de large) ----------
const VUE: Vue = { x: 0, y: -58, l: 360, h: 580 };
/** Pendant une lecture, le regard se rapproche de l'appareil : la balance et sa plaque, l'ampèremètre, le chronomètre. */
const VUES: Record<string, Vue> = { masse: { x: -4, y: 396, l: 152, h: 128 }, intensite: { x: 226, y: -50, l: 138, h: 130 }, duree: { x: 226, y: 384, l: 138, h: 132 } };
const BANC = 506;
// la borne + du générateur est du côté de l'interrupteur : le premier fil du montage ne passe sous aucune autre borne
const PRISES: Record<string, { x: number; y: number }> = { "g-": { x: 30, y: 54 }, "g+": { x: 98, y: 54 }, k1: { x: 156, y: 54 }, k2: { x: 204, y: 54 }, a: { x: 262, y: 54 }, com: { x: 328, y: 54 } };
/** La molette du générateur, l'interrupteur. */
const MOLETTE = { x: 98, y: -8 };
const INTERRUPTEUR = { x: 180, y: 16 };
const CUVE = { x: 124, y: 196, l: 112, h: 96 };
const PLAQUE = { l: 14, h: 104 };
/** Le milieu de chaque plaque : dans la cuve, au support, à plat sur le plateau de la balance. */
const PLACES = { cuve: [{ x: 154, y: CUVE.y + CUVE.h - 8 - PLAQUE.h / 2 }, { x: 206, y: CUVE.y + CUVE.h - 8 - PLAQUE.h / 2 }], support: [{ x: 34, y: 222 }, { x: 78, y: 222 }] };
const PESEE = { x: 6, y: BANC - BALANCE.h };
const SUR_BALANCE = { x: PESEE.x + largeurBalance(3) / 2, y: PESEE.y - BALANCE.plateau - PLAQUE.l / 2 };
const OUTILS = { pissette: { x: 268, y: 262 }, seche: { x: 320, y: 266 } };
const CHRONO = { x: 236, y: 404, l: 118, h: BANC - 404 };
const AVANCE = { x: 180, y: 462 };
/** Les touches de la scène : l'interrupteur, le chronomètre, la tare de la balance. Le dessin et la main du guide lisent les mêmes places. */
const TOUCHES: Record<ToucheElectrolyse, Point> = { interrupteur: INTERRUPTEUR, chrono: { x: CHRONO.x + 34, y: CHRONO.y + 72 }, zero: { x: CHRONO.x + 92, y: CHRONO.y + 72 }, tare: placeDeLaTare(PESEE.x, PESEE.y, 3) };
const SOLUTION = couleurSolution(0, 0.5);

const r2 = (n: number) => Math.round(n * 100) / 100;
const grammes = (x: number) => `${nombre(x, 3)} g`;
const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** La paillasse : l'état inscrit, la liste des gestes, et le temps écoulé depuis le dernier geste, pas encore inscrit. */
interface Partie { etat: EtatElectrolyse; gestes: GesteBrut[]; attente: number }
/** Applique un geste ; s'il ne change rien, il ne s'inscrit pas. */
function applique(r: ReglagesElectrolyse, p: Partie, g: GesteBrut): Partie {
  const suite = regles.geste(r, p.etat, g);
  return suite === p.etat ? p : { ...p, etat: suite, gestes: ajoute(p.gestes, g) };
}
/** Inscrit le temps écoulé : à faire avant tout autre geste, pour que le serveur rejoue les choses à la même heure. */
const inscrit = (r: ReglagesElectrolyse, p: Partie): Partie => (p.attente > 0 ? { ...applique(r, p, { g: "attendre", v: p.attente }), attente: 0 } : p);

// ---------- les pièces ----------

// Le temps du laboratoire. Monté avec la scène, il passe tant que la paillasse est ouverte et que quelque chose en
// dépend : au rythme du vrai, ou bien plus vite pendant l'avance rapide. `allure` : 0 quand rien ne se passe.
function Temps({ allure, passe }: { allure: number; passe: (secondes: number) => void }) {
  const dernier = useRef(passe);
  useEffect(() => { dernier.current = passe; });
  useEffect(() => {
    if (allure <= 0) return;
    let image = 0;
    let avant = performance.now();
    let reserve = 0;
    const seuil = allure > 1 ? allure * 0.05 : 0.25;
    const tourne = (maintenant: number) => {
      reserve += Math.min(0.1, (maintenant - avant) / 1000) * allure;
      avant = maintenant;
      if (reserve >= seuil) { const pas = Math.floor(reserve * 100) / 100; reserve -= pas; dernier.current(pas); }
      image = requestAnimationFrame(tourne);
    };
    image = requestAnimationFrame(tourne);
    return () => cancelAnimationFrame(image);
  }, [allure]);
  return null;
}

// Une plaque de cuivre, dessinée debout autour de son milieu. `gain` : ce qu'elle a gagné ou perdu, en grammes ; le
// cuivre déposé épaissit sa moitié basse, le cuivre dissous l'amincit.
function Plaque({ e, gain, mouille, residu }: { e: Electrode; gain: number; mouille: boolean; residu: boolean }) {
  const bas = PLAQUE.h / 2;
  const depot = Math.min(5, Math.max(0, gain) / 0.08);
  const creux = Math.min(4.5, Math.max(0, -gain) / 0.08);
  return (
    <g>
      <rect className="pl-electrolyse-plaque" x={-PLAQUE.l / 2} y={-bas} width={PLAQUE.l} height={PLAQUE.h * 0.36} rx={1.5} />
      <rect className="pl-electrolyse-plaque" x={r2(-PLAQUE.l / 2 + creux)} y={r2(-bas + PLAQUE.h * 0.36 - 1)} width={r2(PLAQUE.l - 2 * creux)} height={r2(PLAQUE.h * 0.64 + 1)} rx={1.5} />
      {depot > 0.2 && <rect className="pl-electrolyse-depot" x={r2(-PLAQUE.l / 2 - depot)} y={r2(-bas + PLAQUE.h * 0.36)} width={r2(PLAQUE.l + 2 * depot)} height={r2(PLAQUE.h * 0.64)} rx={2} />}
      <text y={-bas + 28} textAnchor="middle" className="pl-electrolyse-numero">{e.nom.replace(/\D/g, "")}</text>
      {mouille && (
        <g aria-hidden="true">
          <circle className="pl-electrolyse-goutte" cx={-6} cy={bas + 2} r={2} />
          <circle className="pl-electrolyse-goutte" cx={5} cy={bas - 20} r={1.6} />
          <circle className="pl-electrolyse-goutte" cx={-4} cy={bas - 44} r={1.4} />
        </g>
      )}
      {residu && (
        <g aria-hidden="true">
          <circle className="pl-electrolyse-cristal" cx={-3} cy={bas - 12} r={1.4} />
          <circle className="pl-electrolyse-cristal" cx={4} cy={bas - 30} r={1.2} />
          <circle className="pl-electrolyse-cristal" cx={-2} cy={bas - 50} r={1.2} />
        </g>
      )}
    </g>
  );
}

// ---------- la paillasse ----------

export default function Electrolyse({ reglages: r, protocole, attente, fini }: PropsPaillasse<ReglagesElectrolyse>) {
  const [partie, setPartie] = useState<Partie>(() => ({ etat: regles.depart(r), gestes: [], attente: 0 }));
  const [message, setMessage] = useState("Prends une plaque en la glissant, ou touche-la puis touche l'endroit où la poser. Un fil se tire d'une borne à une autre.");
  const [rapide, setRapide] = useState(false);
  /** la saisie d'une mesure : d'abord le choix de l'appareil, puis la lecture */
  const [saisie, setSaisie] = useState<"choix" | "masse" | "intensite" | "duree" | null>(null);
  const guide = useGuide();
  /** la paillasse telle qu'elle est maintenant : l'état inscrit, vieilli du temps qui a passé depuis */
  const vu = partie.attente > 0 ? regles.geste(r, partie.etat, { g: "attendre", v: partie.attente }) : partie.etat;
  const circuit = montage(r, vu);
  const courant = intensite(r, vu);
  /** le temps ne compte que si le courant passe ou si le chronomètre tourne */
  const evolue = courant > 0 || vu.chrono.marche;

  const passe = useCallback((secondes: number) => setPartie((p) => {
    const suite = { ...p, attente: Math.round((p.attente + secondes) * 100) / 100 };
    // une longue attente s'inscrit d'elle-même, par tranches de dix minutes
    return suite.attente >= 600 ? inscrit(r, suite) : suite;
  }), [r]);
  const agit = useCallback((g: GesteBrut) => setPartie((p) => applique(r, inscrit(r, p), g)), [r]);
  /** Fait un geste s'il est possible sur la paillasse telle qu'elle est ; rend l'état qui en résulte, ou null. */
  const tente = (g: GesteBrut): EtatElectrolyse | null => {
    const suite = regles.geste(r, vu, g);
    if (suite === vu) return null;
    agit(g);
    return suite;
  };

  // ----- prendre et poser -----
  const poser = (objet: string, cible: string) => {
    const suite = pose(r, vu, objet, cible);
    suite.gestes.forEach(agit);
    if (suite.message) setMessage(suite.message);
  };
  const nomObjet = (objet: string): [string, string] => (objet === "pissette" ? ["la pissette d'eau distillée", "la"] : objet === "seche" ? ["le sèche-cheveux", "le"] : [`la ${electrodeDe(r, objet.replace(/^plaque-/, ""))?.nom ?? "plaque"}`, "la"]);
  const prise = (objet: string, ou: string[]) => {
    const [quoi, pronom] = nomObjet(objet);
    setMessage(ou.length > 1 ? `Tu tiens ${quoi}. Des anneaux verts montrent où ${pronom} poser.` : ou.length === 1 ? `Tu tiens ${quoi}. Un anneau vert montre où ${pronom} poser.`
      : objet === "pissette" || objet === "seche" ? `Tu tiens ${quoi}, mais aucune plaque n'est au support : c'est là qu'une plaque se rince et se sèche.`
      : `Tu tiens ${quoi}, mais aucune place n'est libre.`);
  };
  const rate = (objet: string) => {
    const [quoi, pronom] = nomObjet(objet);
    setMessage(objet === "pissette" || objet === "seche" ? `Une plaque se rince et se sèche au support. Reprends ${quoi} : un anneau vert montre où ${pronom} porter.`
      : `Rien ne se pose à cet endroit. Reprends ${quoi} : un anneau vert montre où ${pronom} poser.`);
  };
  const relie = (a: string, b: string) => {
    const suite = tente({ g: "relier", a, b });
    setMessage(suite ? `Un fil relie ${nomBorne(r, a)} et ${nomBorne(r, b)}.${effet(r, suite)}` : vu.fils.length >= 6 ? "Il n'y a plus de fil sur la paillasse : retires-en un d'abord." : "Un fil ne se pince que sur une plaque qui trempe dans la cuve.");
  };
  const retire = (a: string, b: string) => { agit({ g: "retirer", a, b }); setMessage("Le fil est retiré."); };
  const bascule = () => {
    const suite = tente({ g: "interrupteur", ferme: !vu.ferme });
    if (suite) setMessage(suite.ferme ? `Interrupteur fermé.${effet(r, suite) || " Mais la boucle n'est pas complète : aucun courant ne passe."}` : "Interrupteur ouvert : le courant ne passe plus.");
  };
  const regle = (v: number) => { agit({ g: "tension", v }); setMessage("Tu tournes la molette du générateur."); };
  const chrono = () => { agit({ g: "chrono", marche: !vu.chrono.marche }); setMessage(vu.chrono.marche ? "Chronomètre arrêté." : "Chronomètre lancé."); };

  // ----- noter une mesure -----
  const surBalance = r.electrodes.find((e) => vu.plaques[e.id]?.ou === "balance");
  const choisit = (quoi: "masse" | "intensite" | "duree") => {
    if (quoi === "masse" && !surBalance) { setSaisie(null); setMessage("Il n'y a pas de plaque sur la balance : pose-la d'abord sur le plateau."); return; }
    setSaisie(quoi);
  };
  const note = (quoi: "masse" | "intensite" | "duree", v: number, texte: string) => { agit({ g: "noter", quoi, v }); setSaisie(null); setMessage(texte); son("bip"); };
  const toutRecommencer = () => {
    setPartie({ etat: regles.depart(r), gestes: [], attente: 0 });
    setSaisie(null);
    setRapide(false);
    setMessage("La paillasse est remise comme au début.");
  };

  // ----- les places qui dépendent de l'état : le dessin et la main du guide lisent les mêmes -----
  const bornes: Borne[] = [
    { id: "g+", ...PRISES["g+"], nom: nomBorne(r, "g+"), teinte: "rouge" }, { id: "g-", ...PRISES["g-"], nom: nomBorne(r, "g-"), teinte: "noire" },
    { id: "k1", ...PRISES.k1, nom: "la borne gauche de l'interrupteur" }, { id: "k2", ...PRISES.k2, nom: "la borne droite de l'interrupteur" },
    { id: "a", ...PRISES.a, nom: nomBorne(r, "a"), teinte: "rouge" }, { id: "com", ...PRISES.com, nom: nomBorne(r, "com"), teinte: "noire" },
    // un fil ne se pince que sur une plaque qui trempe dans la cuve
    ...r.electrodes.flatMap((e, i): Borne[] => (vu.plaques[e.id]?.ou === "cuve" ? [{ id: e.id, x: PLACES.cuve[i].x, y: PLACES.cuve[i].y - PLAQUE.h / 2 + 5, nom: `la ${e.nom}` }] : [])),
  ];
  /** La place d'une borne ; celle d'une plaque hors de la cuve est le haut de sa place dans la cuve. */
  const placeBorne = (id: string): Point => {
    const b = bornes.find((x) => x.id === id);
    const i = r.electrodes.findIndex((e) => e.id === id);
    return b ? { x: b.x, y: b.y } : { x: PLACES.cuve[Math.max(0, i)].x, y: PLACES.cuve[Math.max(0, i)].y - PLAQUE.h / 2 + 5 };
  };
  const objets: Record<string, Point> = {
    pissette: OUTILS.pissette, seche: OUTILS.seche,
    ...Object.fromEntries(r.electrodes.map((e, i) => { const ou = vu.plaques[e.id]?.ou ?? "support"; return [`plaque-${e.id}`, ou === "balance" ? SUR_BALANCE : PLACES[ou][i]]; })),
  };
  const cibles: Record<string, Point> = {
    balance: { x: SUR_BALANCE.x, y: SUR_BALANCE.y - 8 },
    ...Object.fromEntries(r.electrodes.flatMap((e, i) => [[`cuve-${e.id}`, PLACES.cuve[i]], [`support-${e.id}`, PLACES.support[i]]])),
  };

  // ----- le guide : le prochain geste, et où la main le montre -----
  const pas: PasDuGuide | null = guide.actif ? prochain(r, vu, { saisie }) : null;
  const laMain = (p: PasDuGuide): Indication["main"] => {
    switch (p.geste) {
      case "glisser": return objets[p.objet] && cibles[p.cible] ? { geste: "glisser", de: objets[p.objet], vers: cibles[p.cible] } : undefined;
      case "fil": return { geste: "glisser", de: placeBorne(p.de), vers: placeBorne(p.vers) };
      // le fil se touche en son milieu, où apparaît la croix qui le retire ; ou sur sa croix de secours, si une borne couvre ce milieu
      case "retirer": { const croix = croixDuFil(bornes, p.a, p.b); return croix ? { geste: "toucher", ou: croix.ou } : undefined; }
      case "toucher": return { geste: "toucher", ou: TOUCHES[p.touche] };
      // les angles sont ceux de la molette : de −135 degrés à 135 degrés pour toute sa course
      case "tourner": return { geste: "tourner", ou: MOLETTE, de: -135 + (vu.tension / TENSION_MAX) * 270, a: -135 + (p.vers / TENSION_MAX) * 270, r: 26 };
      case "maintenir": return { geste: "maintenir", ou: AVANCE };
      // pendant une lecture, l'appareil prend toute la vue : rien ne doit le cacher
      default: return undefined;
    }
  };
  const indication: Indication | null = pas && { cle: pas.cle, texte: pas.texte, etape: pas.etape, main: laMain(pas), appel: pas.geste === "bouton" && pas.bouton === "fini" };
  /** la touche du bas que le guide met en avant */
  const vise = (bouton: string) => (pas?.geste === "bouton" && pas.bouton === bouton ? " pl-vise" : "");

  const outils = saisie === "choix" ? (
    <div className="pl-releve" role="group" aria-label="La mesure à noter">
      <span className="pl-message">Quelle lecture notes-tu ?</span>
      <div className="pl-actions">
        <button type="button" className={`btn btn-cuivre${vise("masse")}`} onClick={() => choisit("masse")}>La masse</button>
        <button type="button" className={`btn btn-cuivre${vise("intensite")}`} onClick={() => choisit("intensite")}>L&apos;intensité</button>
        <button type="button" className={`btn btn-cuivre${vise("duree")}`} onClick={() => choisit("duree")}>La durée</button>
      </div>
      <div className="pl-actions"><button type="button" className={`btn btn-ligne${vise("annuler")}`} onClick={() => setSaisie(null)}>Annuler</button></div>
    </div>
  ) : saisie === "masse" ? (
    <Releve nom={`Masse de la ${surBalance?.nom ?? "plaque"}, lue sur la balance`} unite="g" exemple="24,805" annule={() => setSaisie(null)} valide={(v) => note("masse", v, `Masse notée : ${grammes(v)}.`)} />
  ) : saisie === "intensite" ? (
    <Releve nom="Intensité lue sur l'ampèremètre, sans son signe" unite="A" exemple="0,75" annule={() => setSaisie(null)} valide={(v) => note("intensite", v, `Intensité notée : ${nombre(v, 2)} A.`)} />
  ) : saisie === "duree" ? (
    <Releve nom="Durée lue sur le chronomètre" unite="s" exemple="1180" annule={() => setSaisie(null)} valide={(v) => note("duree", v, `Durée notée : ${nombre(v, 0)} s.`)} />
  ) : pas?.geste === "bouton" && pas.bouton === "recommencer" ? (
    // la mesure ne peut plus se rattraper : le guide fait tout reprendre
    <button type="button" className="btn btn-ligne pl-vise" onClick={toutRecommencer}>Tout recommencer</button>
  ) : (
    <button type="button" className={`btn btn-ligne${vise("noter")}`} onClick={() => setSaisie("choix")}>Noter une mesure</button>
  );

  // ----- les relevés de l'élève -----
  const { avant, apres, intensite: notee, duree } = vu.notes;
  const releves = [avant && `Masse avant : ${grammes(avant.v)}`, notee && `Intensité : ${nombre(notee.v, 2)} A`, duree && `Durée : ${nombre(duree.v, 0)} s`, apres && `Masse après : ${grammes(apres.v)}`].filter((l): l is string => typeof l === "string");
  const ecran = amperemetre(r, vu);

  return (
    <Etabli titre="Électrolyse" protocole={protocole} message={message} attente={attente} fini={() => fini(inscrit(r, partie).gestes)} recommence={toutRecommencer} outils={outils} saisie={saisie !== null} indication={indication}>
      <Scene vue={saisie && saisie !== "choix" ? VUES[saisie] : VUE} nom="La paillasse de l'électrolyse : un générateur, un interrupteur, un ampèremètre, une cuve de sulfate de cuivre et deux plaques, une balance, un chronomètre">
        <Manipulation pose={poser} prise={prise} rate={rate}>
          <Temps allure={saisie !== null ? 0 : vitesse(r, vu, rapide)} passe={passe} />

          {/* le générateur : son afficheur, sa molette, ses deux bornes */}
          <rect className="pl-electrolyse-boitier" x={6} y={-38} width={118} height={108} rx={10} />
          <Afficheur x={12} y={-32} l={58} h={26} valeur={nombre(vu.tension, 1)} unite="V" nom="Générateur" />
          <text x={16} y={10} className="pl-electrolyse-nom">générateur</text>
          <Molette {...MOLETTE} r={24} valeur={vu.tension} min={0} max={TENSION_MAX} pas={0.1} change={regle} nom="Tension du générateur" texte={`${nombre(vu.tension, 1)} volts`} />
          <text x={PRISES["g+"].x} y={42} textAnchor="middle" className="pl-electrolyse-borne">+</text>
          <text x={PRISES["g-"].x} y={42} textAnchor="middle" className="pl-electrolyse-borne">−</text>

          {/* l'interrupteur */}
          <rect className="pl-electrolyse-boitier" x={136} y={-10} width={88} height={80} rx={10} />
          <text x={180} y={-16} textAnchor="middle" className="pl-electrolyse-nom">interrupteur</text>
          <path className="pl-verre" d={`M ${PRISES.k1.x} ${PRISES.k1.y} V 30 L 166 16 M ${PRISES.k2.x} ${PRISES.k2.y} V 30 L 194 16`} opacity={0.6} />
          <Interrupteur {...INTERRUPTEUR} ferme={vu.ferme} bascule={bascule} nom="Interrupteur" />

          {/* l'ampèremètre */}
          <rect className="pl-electrolyse-boitier" x={236} y={-38} width={118} height={108} rx={10} />
          <Afficheur x={242} y={-32} l={106} h={28} valeur={nombreRelatif(ecran, 2)} unite="A" nom="Ampèremètre" />
          <text x={295} y={12} textAnchor="middle" className="pl-electrolyse-nom">ampèremètre</text>
          <text x={PRISES.a.x} y={42} textAnchor="middle" className="pl-electrolyse-borne">A</text>
          <text x={PRISES.com.x} y={42} textAnchor="middle" className="pl-electrolyse-borne">COM</text>

          {/* les relevés de l'élève : sous le support, là où aucun fil ne passe */}
          {releves.length > 0 && <text x={8} y={328} className="pl-fort">Mes relevés</text>}
          {releves.map((ligne, i) => <text key={ligne} x={8} y={342 + i * 13} className="pl-electrolyse-carnet">{ligne}</text>)}

          {/* la paillasse : le support des plaques, la cuve, l'étagère des outils, la balance, le chronomètre */}
          <line className="pl-electrolyse-banc" x1={0} x2={360} y1={BANC} y2={BANC} />
          <path className="pl-verre" d="M 12 300 V 164 H 100 M 34 164 v 5 M 78 164 v 5" />
          <text x={56} y={292} textAnchor="middle" className="pl-electrolyse-nom">support</text>
          <Becher x={CUVE.x} y={CUVE.y} l={CUVE.l} h={CUVE.h} niveau={0.82} couleur={SOLUTION} />
          <text x={CUVE.x + CUVE.l / 2} y={CUVE.y + CUVE.h + 13} textAnchor="middle" className="pl-electrolyse-nom">sulfate de cuivre</text>
          <path className="pl-verre" d="M 250 290 H 354 M 258 290 v 7 M 346 290 v 7" />
          <Balance x={PESEE.x} y={PESEE.y} affiche={balance(r, vu)} decimales={3} tare={() => setMessage(tente({ g: "tare" }) ? "La balance est remise à zéro." : "La balance est déjà à zéro.")} />
          <rect className="pl-electrolyse-boitier" x={CHRONO.x} y={CHRONO.y} width={CHRONO.l} height={CHRONO.h} rx={10} />
          <text x={CHRONO.x + CHRONO.l / 2} y={CHRONO.y - 6} textAnchor="middle" className="pl-electrolyse-nom">chronomètre</text>
          <Afficheur x={CHRONO.x + 6} y={CHRONO.y + 6} l={CHRONO.l - 12} h={30} valeur={nombre(chronometre(vu), 0)} unite="s" nom="Chronomètre" />
          <Touche {...TOUCHES.chrono} l={56} h={44} nom={vu.chrono.marche ? "Arrêter le chronomètre" : "Lancer le chronomètre"} texte={vu.chrono.marche ? "Arrêt" : "Départ"} appuie={chrono} enfonce={vu.chrono.marche} />
          <Touche {...TOUCHES.zero} l={44} h={44} nom="Remettre le chronomètre à zéro" texte="Zéro" appuie={() => { agit({ g: "zero" }); setMessage("Chronomètre remis à zéro."); }} />
          {rapide && evolue && <text x={AVANCE.x} y={AVANCE.y - 36} textAnchor="middle" className="pl-electrolyse-rapide">le temps file</text>}

          {/* les cibles : où poser ce qu'on tient */}
          {r.electrodes.map((e) => <Cible key={e.id} id={`cuve-${e.id}`} nom="la cuve de sulfate de cuivre" {...cibles[`cuve-${e.id}`]} r={24} accepte={vu.plaques[e.id]?.ou === "cuve" ? [] : [`plaque-${e.id}`]} />)}
          {r.electrodes.map((e) => (
            <Cible key={e.id} id={`support-${e.id}`} nom={vu.plaques[e.id]?.ou === "support" ? `la ${e.nom}, au support` : "sa place au support"} {...cibles[`support-${e.id}`]} r={22}
              accepte={vu.plaques[e.id]?.ou === "support" ? ["pissette", "seche"] : [`plaque-${e.id}`]} />
          ))}
          <Cible id="balance" nom="le plateau de la balance" {...cibles.balance} r={30} accepte={surBalance ? [] : r.electrodes.map((e) => `plaque-${e.id}`)} />

          {/* les plaques : au support, dans la cuve, ou à plat sur la balance */}
          {r.electrodes.map((e) => {
            const p = vu.plaques[e.id];
            const ou = p?.ou ?? "support";
            const dessin = <Plaque e={e} gain={masseNue(r, vu, e.id) - e.masse} mouille={ou !== "cuve" && p?.mouille !== "sec"} residu={p?.residu === true} />;
            return (
              <Objet key={e.id} id={`plaque-${e.id}`} nom={`${majuscule(e.nom)}, ${ou === "cuve" ? "dans la cuve" : ou === "support" ? "au support" : "sur la balance"}`} {...objets[`plaque-${e.id}`]} l={ou === "balance" ? PLAQUE.h : 44} h={ou === "balance" ? 44 : PLAQUE.h + 4}>
                {ou === "balance" ? <g transform="rotate(-90)">{dessin}</g> : dessin}
              </Objet>
            );
          })}

          {/* la pissette d'eau distillée et le sèche-cheveux */}
          <Objet id="pissette" nom="Pissette d'eau distillée" {...objets.pissette} l={44} h={56}>
            <Pissette x={0} y={-26} l={30} h={52} />
            <text y={42} textAnchor="middle" className="pl-electrolyse-nom">pissette</text>
          </Objet>
          <Objet id="seche" nom="Sèche-cheveux" {...objets.seche} l={48} h={48}>
            <path className="pl-electrolyse-seche" d="M -20 -14 H 4 a 12 12 0 0 1 0 24 H -2 L 2 24 H -8 L -10 10 H -20 Z" />
            <path className="pl-verre" d="M -24 -10 v 16" />
            <text y={38} textAnchor="middle" className="pl-electrolyse-nom">sèche-cheveux</text>
          </Objet>

          {/* laisser passer le temps de l'électrolyse */}
          <Poussoir {...AVANCE} r={28} nom="Avance rapide : laisser passer le temps" texte="Avance rapide"
            maintien={{
              debut: () => { setRapide(true); setMessage(evolue ? "Le temps passe en avance rapide." : "Rien ne presse : aucun courant ne passe, et le chronomètre est arrêté."); },
              fin: () => setRapide(false), tic: () => {},
              pas: () => { if (evolue) agit({ g: "attendre", v: 60 }); else setMessage("Rien ne presse : aucun courant ne passe, et le chronomètre est arrêté."); },
            }} />

          {/* les fils : on en tire un d'une borne à une autre */}
          <Fils bornes={bornes} fils={vu.fils} relie={relie} retire={retire} />
          <CroixDeSecours bornes={bornes} fils={vu.fils} retire={retire} />
          {circuit.etat === "court-circuit" && <text x={65} y={26} textAnchor="middle" className="pl-electrolyse-defaut">en sécurité</text>}
        </Manipulation>
        {/* la main du guide, par-dessus tout le reste */}
        <Main indication={indication} />
      </Scene>
    </Etabli>
  );
}
