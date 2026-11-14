"use client";

// La paillasse Circuits (décision 0012). L'élève y monte le circuit de ses mains : il prend les composants dans la boîte
// et les pose sur la plaque, tourne la molette du générateur en lisant son afficheur, tire les fils d'une borne à l'autre,
// décharge le condensateur avec un fil, règle la durée, lance l'acquisition et ferme l'interrupteur. La courbe se trace
// alors en temps réel sur l'écran de la carte ; il l'ouvre en grand pour y placer son repère.
// Chaque geste passe par les règles (lib/commun/tp/paillasses/circuit.ts) ; la liste des gestes part au serveur.
// Le guide (lib/commun/tp/paillasses/circuit-guide.ts) dit le prochain geste ; ici, la main le montre à sa place dans le dessin.

import { useEffect, useRef, useState } from "react";
import { nombre } from "@/lib/commun/format";
import {
  CARTE, CRAN, DUREES, E_MAX, FILS_MAX, GENERATEUR, bornesDe, composant, finDe, pasDe, placeDe, regime, regles, tensionActuelle,
  type EtatCircuit, type ReglagesCircuit,
} from "@/lib/commun/tp/paillasses/circuit";
import { entreBornes, nomBorne as nomDeBorne, nomComposant, pose, prochain, toucheDeLaCarte, type PasDuGuide } from "@/lib/commun/tp/paillasses/circuit-guide";
import type { GesteBrut, PropsPaillasse } from "@/lib/commun/tp/types";
import { Afficheur, Cible, Etabli, Main, Manipulation, Molette, Objet, Poussoir, Scene, Touche, son, useGuide, type Borne, type Indication, type Point, type Vue } from "../kit";
import { Courbe, ecritInstant } from "./circuitCourbe";
import { FilsCircuit, placesDuFil } from "./circuitFils";
import { Boitier, DessinComposant, Graphe, majuscule, type Cadre } from "./circuitPieces";
import "./circuit.css";

// ---------- la place de chaque chose dans le dessin (360 de large) ----------
const VUE: Vue = { x: 0, y: -6, l: 360, h: 600 };
const ECRAN = { x: 8, y: 0, l: 344, h: 142 };
const GRAPHE: Cadre = { x: 38, y: 20, l: 304, h: 88 };
const AVANCE = { x: 176, l: 166 };                 // la barre d'avancement de l'enregistrement, en bas de l'écran
const BASCULE = 169;                               // le bouton de l'interrupteur, entre l'écran et la plaque
const PLAQUE = { x: 8, y: 196, l: 344, h: 114 };
const SUPPORTS = [68, 180, 292];                   // le milieu de chaque emplacement
const POSE = 232;                                  // la hauteur des composants posés
const RANGEE = 290;                                // la hauteur des bornes de la plaque
const APPAREILS = 348;                             // la hauteur des bornes du générateur et de la carte
const BOITIER = { y: 364, h: 128 };
const BOITE = { x: 8, y: 498, l: 344, h: 90 };
const PLACES: Record<string, { x: number; y: number }> = {
  [GENERATEUR.plus]: { x: 46, y: APPAREILS }, [GENERATEUR.moins]: { x: 114, y: APPAREILS },
  [CARTE.voie]: { x: 246, y: APPAREILS }, [CARTE.masse]: { x: 314, y: APPAREILS },
  ...Object.fromEntries(SUPPORTS.flatMap((x, i) => [[bornesDe(i)[0], { x: x - 34, y: RANGEE }], [bornesDe(i)[1], { x: x + 34, y: RANGEE }]])),
};
const TEINTES: Record<string, Borne["teinte"]> = { [GENERATEUR.plus]: "rouge", [GENERATEUR.moins]: "noire", [CARTE.voie]: "rouge", [CARTE.masse]: "noire" };
/** Les commandes des appareils : le dessin et la main du guide lisent les mêmes places. */
const MOLETTES = { tension: { x: 136, y: BOITIER.y + 56 }, duree: { x: 318, y: BOITIER.y + 42 } };
const TOUCHE_CARTE = { x: 270, y: BOITIER.y + 88 };
/** L'angle d'une molette pour une valeur : les mêmes angles que `Molette`, de −135° à 135°. */
const angleDe = (valeur: number, max: number) => -135 + (valeur / max) * 270;

interface Partie { etat: EtatCircuit; gestes: GesteBrut[] }
/** La ligne sous la scène : ce qui vient de se passer ; et le geste que ça permet, qui ne s'ajoute que guide coupé. */
interface Message { fait: string; conseil?: string }
const FIN: Message = { fait: "L'acquisition est terminée.", conseil: "Ouvre la courbe pour la lire." };

export default function Circuit({ reglages: r, protocole, attente, fini }: PropsPaillasse<ReglagesCircuit>) {
  const [partie, setPartie] = useState<Partie>(() => ({ etat: regles.depart(r), gestes: [] }));
  const [message, setMessage] = useState<Message>({ fait: "Prends un composant dans la boîte en le glissant, ou touche-le puis touche l'endroit où le poser." });
  const dis = (fait: string, conseil?: string) => setMessage({ fait, conseil });
  /** l'instant où en est l'enregistrement à l'écran, en secondes */
  const [instant, setInstant] = useState(0);
  const [courbe, setCourbe] = useState(false);
  const [repere, setRepere] = useState(0);
  const [tangente, setTangente] = useState(false);
  /** l'étincelle d'un condensateur chargé dont on relie les deux bornes : où elle claque, et son rang, pour la rejouer */
  const [etincelle, setEtincelle] = useState<{ x: number; y: number; rang: number } | null>(null);
  /** le fil que l'élève vient de toucher : sa croix est affichée */
  const [filChoisi, setFilChoisi] = useState<string | null>(null);
  const guide = useGuide();
  const { etat, gestes } = partie;
  const acq = etat.acquisition;
  /** vrai tant que la courbe se trace : un geste fait à ce moment-là porte son instant */
  const enregistre = etat.carte === "enregistre" && acq !== null;
  const vivant = enregistre && instant < acq.duree;
  const jusque = !acq ? 0 : enregistre ? instant : finDe(acq);

  // ----- l'horloge de l'enregistrement : elle avance en temps réel, et s'arrête au bout de la durée -----
  const horloge = useRef(0);
  const dureeEnCours = enregistre ? acq.duree : 0;
  useEffect(() => {
    if (dureeEnCours <= 0) return;
    let image = 0;
    let avant = performance.now();
    const tourne = (maintenant: number) => {
      // l'heure d'une image peut précéder celle où l'horloge est partie : le temps ne recule pas
      const dt = Math.max(0, Math.min(0.1, (maintenant - avant) / 1000));
      avant = maintenant;
      // au bout de la durée, l'horloge s'arrête ; un pas fait au clavier a pu l'y amener avant elle
      if (horloge.current >= dureeEnCours) return;
      horloge.current = Math.min(dureeEnCours, horloge.current + dt);
      setInstant(horloge.current);
      if (horloge.current >= dureeEnCours) { setMessage(FIN); son("bip"); return; }
      image = requestAnimationFrame(tourne);
    };
    image = requestAnimationFrame(tourne);
    return () => cancelAnimationFrame(image);
  }, [dureeEnCours, etat.lancees]);
  /** Au clavier, l'enregistrement s'avance d'un pas fixe : la courbe est la même, on ne fait que l'attendre moins longtemps. */
  const avance = (pas: number) => {
    horloge.current = Math.min(dureeEnCours, horloge.current + pas);
    setInstant(horloge.current);
    if (horloge.current >= dureeEnCours) setMessage(FIN);
  };

  // ----- les gestes -----
  /** Applique un geste et dit ce qu'il a changé. Pendant un enregistrement, le geste porte son instant. */
  const agit = (g: GesteBrut): EtatCircuit => {
    const complet = vivant ? { ...g, t: Math.round(instant * 1000) / 1000 } : g;
    const suite = regles.geste(r, etat, complet);
    if (suite === etat) return etat;
    setPartie({ etat: suite, gestes: [...gestes, complet] });
    if (suite.carte === "enregistre" && etat.carte !== "enregistre") { horloge.current = 0; setInstant(0); son("bip"); }
    if (suite.securite && !etat.securite) son("faux");
    return suite;
  };
  /** Ce que le geste a entraîné sur les appareils : le voyant du générateur, la carte qui se déclenche ou qui attend. */
  const suites = (suite: EtatCircuit): string => {
    if (suite.securite && !etat.securite) return " Le voyant rouge du générateur s'allume : il s'est mis en sécurité et ne fournit plus rien.";
    if (!suite.securite && etat.securite) return " Le voyant rouge s'éteint : le générateur repart.";
    if (suite.carte === "enregistre" && etat.carte === "prete") return " La carte se déclenche : la courbe se trace.";
    if (suite.carte === "prete") return " La carte attend toujours : la tension qu'elle mesure n'a pas bougé.";
    return "";
  };
  const nomBorne = (id: string): string => nomDeBorne(r, etat, id);

  const poser = (objet: string, cible: string) => {
    const c = composant(r, objet);
    if (!c) return;
    const suite = agit(pose(objet, cible));
    if (suite === etat) return;
    dis(`${majuscule(nomComposant(c))} est ${cible.startsWith("place") ? `sur la plaque${c.genre === "interrupteur" ? (suite.ferme ? ", fermé" : ", ouvert") : ""}` : "revenu dans la boîte"}.${suites(suite)}`);
  };
  /** L'élève vient de prendre un composant : où peut-il le poser ? */
  const prise = (objet: string, cibles: string[]) => {
    const c = composant(r, objet);
    if (!c) return;
    dis(cibles.length > 0 ? `Tu tiens ${nomComposant(c)}. Un anneau vert montre où le poser.` : `Tu tiens ${nomComposant(c)}, mais la plaque est pleine : range d'abord un composant dans la boîte.`);
  };
  /** Un composant lâché là où rien ne l'accepte : il retourne à sa place. */
  const rate = (objet: string, p: Point) => {
    const pris = SUPPORTS.findIndex((x, i) => Math.hypot(p.x - x, p.y - POSE) < 44 && etat.plaque[i] !== null && etat.plaque[i] !== objet);
    dis(pris >= 0 ? `L'emplacement ${pris + 1} est déjà pris : range d'abord le composant qui s'y trouve.` : "Rien ne se pose à cet endroit. Reprends le composant : un anneau vert montre où il va.");
  };
  const relie = (a: string, b: string) => {
    const avant = tensionActuelle(etat, vivant ? instant : null);
    const suite = agit({ g: "relier", a, b });
    // un condensateur chargé dont un fil relie les deux bornes se décharge d'un coup : une étincelle claque sur la borne
    const claque = suite !== etat && Math.abs(avant) > 0.3 && regime(r, suite).condensateur === "shunte";
    if (claque) { setEtincelle((e) => ({ ...PLACES[b], rang: (e?.rang ?? 0) + 1 })); son("clic"); }
    dis(suite === etat ? (etat.fils.length >= FILS_MAX ? "Il n'y a plus de fil. Touche un fil posé pour le retirer." : "Ces deux bornes sont déjà reliées.")
      : `Fil posé ${entreBornes(r, etat, a, b)}.${claque ? " Une étincelle claque : il vient de se décharger." : ""}${suites(suite)}`);
  };
  const retire = (a: string, b: string) => {
    const suite = agit({ g: "retirer", a, b });
    if (suite !== etat) dis(`Fil retiré ${entreBornes(r, etat, a, b)}.${suites(suite)}`);
  };
  const bascule = () => {
    const suite = agit({ g: "basculer" });
    if (suite !== etat) dis(`L'interrupteur est ${suite.ferme ? "fermé" : "ouvert"}.${suites(suite)}`);
  };
  const regleTension = (v: number) => {
    const suite = agit({ g: "tension", v });
    if (suite === etat) return;
    if (suite.securite && etat.securite) dis("Tu tournes la molette du générateur, mais son voyant rouge reste allumé : il est en sécurité et ne fournit plus rien.");
    else dis(`Tu tournes la molette du générateur.${suites(suite)}`, suites(suite) ? undefined : "Lis la tension sur son afficheur.");
  };
  const regleDuree = (rang: number) => {
    const suite = agit({ g: "duree", v: DUREES[rang] });
    if (suite !== etat) dis(vivant ? "Tu tournes la molette de la carte : la nouvelle durée vaudra pour la prochaine acquisition." : "Tu tournes la molette de la carte.", vivant ? undefined : "Lis la durée sur son afficheur.");
  };
  const lance = () => {
    if (toucheDeLaCarte(etat, vivant) === "lancer") {
      const suite = agit({ g: "lancer" });
      if (suite !== etat) { setCourbe(false); dis("La carte est prête : elle commencera à enregistrer dès que la tension qu'elle mesure bougera."); }
      return;
    }
    const suite = agit({ g: "arreter" });
    if (suite !== etat) dis(etat.carte === "prete" ? "La carte n'attend plus." : "Acquisition arrêtée.");
  };
  const toutRecommencer = () => {
    setPartie({ etat: regles.depart(r), gestes: [] });
    horloge.current = 0;
    setInstant(0);
    setCourbe(false);
    setRepere(0);
    setTangente(false);
    setEtincelle(null);
    setFilChoisi(null);
    dis("La paillasse est remise comme au début.");
  };
  /** L'appel au professeur. S'il arrive pendant que la courbe se trace, l'acquisition s'arrête là. */
  const appelle = () => fini(vivant ? [...gestes, { g: "arreter", t: Math.round(instant * 1000) / 1000 }] : gestes);

  // ----- ce qui se dessine -----
  const bornes: Borne[] = Object.entries(PLACES).map(([id, p]) => ({ id, x: p.x, y: p.y, nom: nomBorne(id), teinte: TEINTES[id] }));
  const caseDe = (rang: number) => BOITE.x + ((rang + 0.5) * BOITE.l) / r.boite.length;
  const interrupteur = r.boite.find((c) => c.genre === "interrupteur");
  const placeInterrupteur = interrupteur ? placeDe(etat, interrupteur.id) : -1;
  const libres = r.boite.map((c) => c.id);
  const attendPrete = etat.carte === "prete";
  const pas = acq ? pasDe(acq) : 1;
  /** où se trouve chaque composant : dans sa case, ou sur la plaque */
  const placeDuComposant = (id: string): Point => {
    const place = placeDe(etat, id);
    return place >= 0 ? { x: SUPPORTS[place], y: POSE } : { x: caseDe(r.boite.findIndex((c) => c.id === id)), y: BOITE.y + 51 };
  };

  // ----- le guide : le prochain geste, et où la main le montre -----
  const prochainPas: PasDuGuide | null = guide.actif ? prochain(r, etat, { courbe: courbe && acq !== null, filChoisi, trace: vivant }) : null;
  const laMain = (p: PasDuGuide): Indication["main"] => {
    switch (p.geste) {
      case "glisser": return { geste: "glisser", de: placeDuComposant(p.objet), vers: p.cible.startsWith("place") ? { x: SUPPORTS[Number(p.cible.slice(5))], y: POSE } : { x: caseDe(r.boite.findIndex((c) => c.id === p.objet)), y: BOITE.y + 51 } };
      case "relier": return { geste: "glisser", de: PLACES[p.de], vers: PLACES[p.vers] };
      case "toucher": {
        if (p.quoi === "fil" || p.quoi === "croix") {
          const fil = placesDuFil(p.a, p.b, bornes);
          return fil ? { geste: "toucher", ou: p.quoi === "fil" ? fil.prise : fil.croix } : undefined;
        }
        // la main se pose sur le bord de la touche : sa paume ne couvre ni le nom de la carte, ni celui de la plaque
        if (p.quoi === "carte") return { geste: "toucher", ou: { x: TOUCHE_CARTE.x + 50, y: TOUCHE_CARTE.y - 4 } };
        return placeInterrupteur >= 0 ? { geste: "toucher", ou: { x: SUPPORTS[placeInterrupteur] + 6, y: BASCULE - 10 } } : undefined;
      }
      case "tourner": return p.molette === "tension"
        ? { geste: "tourner", ou: MOLETTES.tension, de: angleDe(etat.E, E_MAX), a: angleDe(p.vers, E_MAX), r: 30 }
        : { geste: "tourner", ou: MOLETTES.duree, de: angleDe(DUREES.indexOf(etat.duree), DUREES.length - 1), a: angleDe(DUREES.indexOf(p.vers), DUREES.length - 1), r: 30 };
      // le repère se montre dans le dessin de la courbe ; une touche du bas se met en avant d'elle-même
      default: return undefined;
    }
  };
  const indication: Indication | null = prochainPas && { cle: prochainPas.cle, texte: prochainPas.texte, etape: prochainPas.etape, main: laMain(prochainPas), appel: prochainPas.geste === "bouton" && prochainPas.bouton === "fini" };
  /** la touche du bas que le guide met en avant */
  const vise = (bouton: string) => (prochainPas?.geste === "bouton" && prochainPas.bouton === bouton ? " pl-vise" : "");

  const outils = courbe && acq ? (
    <>
      <button type="button" className={`btn btn-ligne${vise("revenir")}`} onClick={() => setCourbe(false)}>Revenir à la paillasse</button>
      <button type="button" className="btn btn-cuivre" onClick={() => {
        if (repere <= 0) { dis("Le repère est encore au départ de la courbe : glisse-le d'abord jusqu'au point que tu veux lire."); return; }
        const suite = agit({ g: "noter", v: repere });
        if (suite !== etat) { setCourbe(false); dis(`Temps noté : ${ecritInstant(repere, pas)}.`); son("bip"); }
      }}>Noter ce temps</button>
    </>
  ) : (
    <button type="button" className={`btn btn-ligne${vise("courbe")}`} onClick={() => {
      if (!acq) { dis(attendPrete ? "Il n'y a pas encore de courbe : la carte attend que la tension bouge." : "Il n'y a pas encore de courbe.", attendPrete ? undefined : "Lance l'acquisition, puis ferme l'interrupteur."); return; }
      setRepere(etat.note ?? 0);
      setCourbe(true);
      dis("La courbe est ouverte en grand.", "Glisse le repère : il lit l'instant et la tension du point où il se trouve.");
    }}>Ouvrir la courbe</button>
  );

  return (
    <Etabli titre="Circuits" protocole={protocole} message={message.conseil && !guide.actif ? `${message.fait} ${message.conseil}` : message.fait} attente={attente} fini={appelle} recommence={toutRecommencer} outils={outils} indication={indication}>
      {courbe && acq ? <Courbe acq={acq} jusque={jusque} repere={repere} place={setRepere} tangente={tangente} basculeTangente={() => setTangente((x) => !x)} guide={prochainPas?.geste === "montrer" ? indication : null} /> : (
        <Scene vue={VUE} className="pl-circuit-scene" nom="La paillasse : l'écran de la carte d'acquisition, la plaque de montage, le générateur, la carte et la boîte de composants">
          {/* l'écran de la carte : la courbe s'y trace pendant l'enregistrement */}
          <g role="img" aria-label={!acq ? (attendPrete ? "Écran de la carte : elle attend que la tension bouge" : "Écran de la carte : aucune courbe") : vivant ? "Écran de la carte : la courbe se trace" : "Écran de la carte : une courbe est enregistrée"}>
            <rect className="pl-circuit-ecran" x={ECRAN.x} y={ECRAN.y} width={ECRAN.l} height={ECRAN.h} rx={8} />
            <Graphe cadre={GRAPHE} acq={acq} duree={acq?.duree ?? etat.duree} jusque={jusque} detail={false} />
            <text x={GRAPHE.x} y={GRAPHE.y - 7}>u (V)</text>
            <text x={GRAPHE.x + GRAPHE.l / 2 + 40} y={GRAPHE.y + GRAPHE.h + 12} textAnchor="middle">t (s)</text>
            <text className="pl-circuit-etat" x={GRAPHE.x + GRAPHE.l} y={GRAPHE.y - 7} textAnchor="end">
              {attendPrete ? "prête : elle attend que la tension bouge" : vivant ? "enregistre" : acq ? (acq.arret === null ? "courbe enregistrée" : "acquisition arrêtée") : "aucune courbe"}
            </text>
            <text x={ECRAN.x + 10} y={ECRAN.y + ECRAN.h - 6}>écran de la carte d&apos;acquisition</text>
          </g>
          {vivant && (
            <g className="pl-circuit-avance" role="slider" tabIndex={0} aria-label="Avancement de l'acquisition" aria-valuemin={0} aria-valuemax={acq.duree} aria-valuenow={Math.round(instant * 100) / 100}
              aria-valuetext={`${nombre(instant, 1)} s sur ${nombre(acq.duree, 0)} s`}
              onKeyDown={(e) => { if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); avance(acq.duree / 20); } if (e.key === "End") { e.preventDefault(); avance(acq.duree); } }}>
              <rect x={AVANCE.x} y={ECRAN.y + ECRAN.h - 10} width={AVANCE.l} height={3} rx={1.5} />
              <rect x={AVANCE.x} y={ECRAN.y + ECRAN.h - 10} width={Math.round((AVANCE.l * instant * 100) / acq.duree) / 100} height={3} rx={1.5} />
            </g>
          )}

          {/* la plaque de montage : trois supports, chacun avec ses deux bornes */}
          <rect className="pl-circuit-plaque" x={PLAQUE.x} y={PLAQUE.y} width={PLAQUE.l} height={PLAQUE.h} rx={8} />
          {SUPPORTS.map((x, i) => (
            <g key={x}>
              <path className="pl-circuit-piste" d={`M ${x - 34} ${RANGEE} V ${POSE} H ${x - 28} M ${x + 34} ${RANGEE} V ${POSE} H ${x + 28}`} />
              {etat.plaque[i] === null && <rect className="pl-circuit-vide" x={x - 26} y={POSE - 12} width={52} height={24} rx={5} />}
              <text x={x} y={RANGEE + 4} textAnchor="middle">{i + 1}</text>
            </g>
          ))}
          <text x={PLAQUE.x + 8} y={PLAQUE.y + 13}>plaque de montage</text>

          {/* le générateur : son afficheur, sa molette, son voyant de sécurité */}
          <Boitier x={8} y={BOITIER.y} l={164} h={BOITIER.h} nom="générateur" hauteur={APPAREILS} tiges={[{ x: PLACES[GENERATEUR.plus].x, texte: "+" }, { x: PLACES[GENERATEUR.moins].x, texte: "−" }]}>
            <Afficheur x={18} y={BOITIER.y + 24} l={82} h={30} nom="Afficheur du générateur" unite="V" valeur={nombre(etat.securite ? 0 : etat.E, 1)} />
            <circle className={`pl-circuit-voyant${etat.securite ? " pl-circuit-voyant-rouge" : ""}`} cx={24} cy={BOITIER.y + 70} r={4} />
            <text x={33} y={BOITIER.y + 73} className={etat.securite ? "pl-fort" : undefined} style={etat.securite ? { fill: "var(--brique)" } : undefined}>{etat.securite ? "en sécurité" : "sécurité"}</text>
          </Boitier>
          <Molette x={MOLETTES.tension.x} y={MOLETTES.tension.y} r={26} valeur={etat.E} min={0} max={E_MAX} pas={CRAN} change={regleTension} nom="Tension du générateur" texte={`${nombre(etat.E, 1)} volts`} />

          {/* la carte d'acquisition : la durée, le lancement */}
          <Boitier x={188} y={BOITIER.y} l={164} h={BOITIER.h} nom="carte d'acquisition" hauteur={APPAREILS} tiges={[{ x: PLACES[CARTE.voie].x, texte: "voie" }, { x: PLACES[CARTE.masse].x, texte: "masse" }]}>
            <circle className={`pl-circuit-voyant${attendPrete ? " pl-circuit-voyant-attente" : vivant ? " pl-circuit-voyant-vert" : ""}`} cx={280} cy={BOITIER.y + 10} r={3.5} />
            <Afficheur x={196} y={BOITIER.y + 24} l={54} h={30} nom="Durée de l'acquisition, sur la carte" unite="s" valeur={nombre(etat.duree, 0)} />
            <text x={196} y={BOITIER.y + 20}>durée</text>
          </Boitier>
          <Molette x={MOLETTES.duree.x} y={MOLETTES.duree.y} r={22} valeur={DUREES.indexOf(etat.duree)} min={0} max={DUREES.length - 1} pas={1} change={regleDuree} nom="Durée de l'acquisition" texte={`${nombre(etat.duree, 0)} secondes`} />
          <Touche x={TOUCHE_CARTE.x} y={TOUCHE_CARTE.y} l={150} h={44} nom={toucheDeLaCarte(etat, vivant) === "lancer" ? "Lancer l'acquisition" : "Arrêter l'acquisition"} texte={toucheDeLaCarte(etat, vivant) === "lancer" ? "Lancer l'acquisition" : "Arrêter"} appuie={lance} enfonce={attendPrete || vivant} />

          {/* la boîte de composants : chaque composant a sa case */}
          <rect className="pl-circuit-boite" x={BOITE.x} y={BOITE.y} width={BOITE.l} height={BOITE.h} rx={8} />
          <text x={BOITE.x + 8} y={BOITE.y + 13}>boîte de composants</text>
          {r.boite.map((c, i) => placeDe(etat, c.id) >= 0 && <rect key={c.id} className="pl-circuit-case" x={caseDe(i) - 28} y={BOITE.y + 26} width={56} height={50} rx={6} />)}

          <Manipulation pose={poser} prise={prise} rate={rate}>
            {/* les cibles : un emplacement libre de la plaque, ou la case du composant dans la boîte */}
            {SUPPORTS.map((x, i) => <Cible key={x} id={`place${i}`} nom={`l'emplacement ${i + 1} de la plaque`} x={x} y={POSE} r={26} accepte={etat.plaque[i] === null ? libres : []} />)}
            {r.boite.map((c, i) => <Cible key={c.id} id={`boite-${c.id}`} nom="sa case, dans la boîte" x={caseDe(i)} y={BOITE.y + 51} r={24} accepte={placeDe(etat, c.id) >= 0 ? [c.id] : []} />)}

            {/* les bornes et les fils */}
            <FilsCircuit bornes={bornes} fils={etat.fils} relie={relie} retire={retire} choisi={filChoisi} choisit={setFilChoisi} />

            {/* les composants : dans la boîte, ou sur la plaque */}
            {r.boite.map((c, i) => {
              const place = placeDe(etat, c.id);
              return (
                <Objet key={c.id} id={c.id} nom={`${majuscule(nomComposant(c))}, ${place >= 0 ? `sur l'emplacement ${place + 1} de la plaque` : "dans la boîte"}`} x={place >= 0 ? SUPPORTS[place] : caseDe(i)} y={place >= 0 ? POSE : BOITE.y + 51} l={60} h={52}>
                  <DessinComposant c={c} ferme={etat.ferme} />
                </Objet>
              );
            })}
          </Manipulation>
          {/* l'étincelle grandit autour de son centre : sa place se donne sur le groupe, pas sur la forme animée */}
          {etincelle && <g transform={`translate(${etincelle.x} ${etincelle.y})`} aria-hidden="true"><path key={etincelle.rang} className="pl-circuit-etincelle" d="M 0 -13 L 3 -3 L 13 0 L 3 3 L 0 13 L -3 3 L -13 0 L -3 -3 Z" /></g>}
          {/* le geste de l'interrupteur : un bouton à côté de lui, une fois posé sur la plaque */}
          {placeInterrupteur >= 0 && <Poussoir x={SUPPORTS[placeInterrupteur]} y={BASCULE} nom={etat.ferme ? "Ouvrir l'interrupteur" : "Fermer l'interrupteur"} texte={etat.ferme ? "Ouvrir" : "Fermer"} appuie={bascule} />}

          {/* le temps noté s'écrit du côté où le bouton de l'interrupteur n'est pas */}
          <text x={placeInterrupteur === 2 ? 8 : 352} y={BASCULE + 4} textAnchor={placeInterrupteur === 2 ? "start" : "end"} className="pl-fort">{etat.note !== null && acq ? `Temps noté : ${ecritInstant(etat.note, pas)}` : ""}</text>
          <Main indication={indication} />
        </Scene>
      )}
    </Etabli>
  );
}
