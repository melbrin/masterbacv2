"use client";

// La paillasse « microcontroleur » (décision 0012). L'élève y câble un capteur capacitif sur une carte à microcontrôleur :
// il prend le bon conducteur ohmique dans la boîte et le pique sur la plaque d'essai, tire les fils entre les broches, les
// rangées et les lames du capteur, fait monter ou descendre l'eau de la cuve en maintenant l'appui, lance une mesure,
// lit la durée sur le moniteur série et le niveau à la loupe, et note les deux dans son carnet avec le pavé de chiffres.
// Chaque geste passe par les règles (lib/commun/tp/paillasses/microcontroleur.ts) ; la liste des gestes part au serveur.
// Le guide (lib/commun/tp/paillasses/microcontroleur-guide.ts) dit le prochain geste ; ici, la main le montre à sa place.

import { useState } from "react";
import { nombre } from "@/lib/commun/format";
import { nomComposant } from "@/lib/commun/tp/paillasses/circuit-guide";
import { BROCHES, CARNET_MAX, FILS_MAX, HAUTEUR, LAMES, LIGNES_MAX, RANGEES, composant, placeDe, regles, type EtatMicrocontroleur, type ReglagesMicrocontroleur } from "@/lib/commun/tp/paillasses/microcontroleur";
import { NOMS, pose, prochain, type PasDuGuide } from "@/lib/commun/tp/paillasses/microcontroleur-guide";
import type { GesteBrut, PropsPaillasse } from "@/lib/commun/tp/types";
import { Afficheur, Cible, Echelle, Etabli, Filet, LoupeNiveau, Main, Manipulation, Objet, Poussoir, Releve, Scene, Touche, son, useGuide, useVersement, type Borne, type Indication, type Point, type Vue } from "../kit";
import { FilsCircuit, placesDuFil } from "./circuitFils";
import { DessinComposant, majuscule } from "./circuitPieces";
import "./circuit.css";

// ---------- la place de chaque chose dans le dessin (360 de large) ----------
const VUE: Vue = { x: 0, y: -6, l: 360, h: 560 };
const MONITEUR = { x: 8, y: 0, l: 344, h: 58 };
const CARTE = { x: 8, y: 68, l: 344, h: 62 };
const BROCHE = 148;                                 // la hauteur des broches, sous la carte
const RANGEE = 222;                                 // la hauteur des bornes de la plaque d'essai
const LAME = 236;                                   // celle des bornes du capteur, au-dessus de la cuve
const PLAQUE = { x: 8, y: 204, l: 156, h: 154 };
const TROUS = [248, 276, 302, 326];                 // les trous de chaque rangée
const POSES = [{ x: 58, y: 276 }, { x: 114, y: 326 }];  // le milieu de chaque emplacement
const CUVE = { gauche: 190, droite: 262, bord: 252, fond: 396 };
const PAR_CM = (CUVE.fond - CUVE.bord) / HAUTEUR;
const LOUPE = { x: 312, y: 294, r: 38 };
const BOITE = { x: 8, y: 366, l: 156, h: 76 };
const CARNET = { x: 8, y: 452, l: 344, h: 96 };
const PLACES: Record<string, { x: number; y: number }> = {
  [BROCHES.v5]: { x: 40, y: BROCHE }, [BROCHES.d2]: { x: 92, y: BROCHE }, [BROCHES.a0]: { x: 144, y: BROCHE }, [BROCHES.a1]: { x: 196, y: BROCHE }, [BROCHES.gnd]: { x: 248, y: BROCHE },
  [RANGEES[0]]: { x: 30, y: RANGEE }, [RANGEES[1]]: { x: 86, y: RANGEE }, [RANGEES[2]]: { x: 142, y: RANGEE },
  [LAMES[0]]: { x: 200, y: LAME }, [LAMES[1]]: { x: 244, y: LAME },
};
/** Les commandes : le dessin et la main du guide lisent les mêmes places. */
const POUSSOIRS = { verser: { x: 288, y: 358 }, vider: { x: 332, y: 358 } };
const BOUTON_MESURER = { x: 306, y: CARTE.y + 30 };
const AFFICHEUR = { x: MONITEUR.x + 182, y: MONITEUR.y + 20, l: 154, h: 30 };
const ECRITS: Record<string, string> = { [BROCHES.v5]: "5 V", [BROCHES.d2]: "D2", [BROCHES.a0]: "A0", [BROCHES.a1]: "A1", [BROCHES.gnd]: "GND" };
const TEINTES: Record<string, Borne["teinte"]> = { [BROCHES.v5]: "rouge", [BROCHES.gnd]: "noire" };
const BORNES: Borne[] = Object.entries(PLACES).map(([id, p]) => ({ id, x: p.x, y: p.y, nom: NOMS[id], teinte: TEINTES[id] }));
/** Pendant la lecture du niveau, le regard se rapproche de la cuve et de sa loupe ; pendant celle de la durée, du moniteur. */
const VUE_CUVE: Vue = { x: 168, y: 226, l: 192, h: 184 };
const VUE_MONITEUR: Vue = { x: 0, y: -8, l: 360, h: 206 };
const EAU = "rgba(96, 164, 236, 0.5)";

interface Partie { etat: EtatMicrocontroleur; gestes: GesteBrut[] }
/** La ligne sous la scène : ce qui vient de se passer ; et le geste que ça permet, qui ne s'ajoute que guide coupé. */
interface Message { fait: string; conseil?: string }
/** Ajoute un geste à la liste. Les morceaux d'un même versement se regroupent : rejouée, la liste donne le même état. */
function ajoute(gestes: GesteBrut[], g: GesteBrut): GesteBrut[] {
  const dernier = gestes[gestes.length - 1];
  const a = dernier?.v, b = g.v;
  const continu = dernier !== undefined && dernier.g === g.g && (g.g === "verser" || g.g === "vider") && typeof a === "number" && typeof b === "number" && a + b <= HAUTEUR;
  return continu ? [...gestes.slice(0, -1), { ...dernier, v: Math.round((a + b) * 100) / 100 }] : [...gestes, g];
}
const ecritDuree = (duree: number | null) => (duree === null ? "délai dépassé" : `${nombre(duree, 0)} µs`);
/** Un niveau comme l'élève l'a noté : au millimètre, ou au demi-millimètre s'il a lu entre deux graduations. */
const ecritNiveau = (h: number) => `${nombre(h, Number.isInteger(Math.round(h * 1000) / 100) ? 1 : 2)} cm`;

export default function Microcontroleur({ reglages: r, protocole, attente, fini }: PropsPaillasse<ReglagesMicrocontroleur>) {
  const [partie, setPartie] = useState<Partie>(() => ({ etat: regles.depart(r), gestes: [] }));
  const [message, setMessage] = useState<Message>({ fait: "Prends un conducteur ohmique dans la boîte en le glissant, ou touche-le puis touche l'endroit où le piquer." });
  const dis = (fait: string, conseil?: string) => setMessage({ fait, conseil });
  /** ce qui coule : l'eau qu'on verse, ou la vidange ouverte */
  const [jet, setJet] = useState<"verser" | "vider" | null>(null);
  /** la saisie en cours dans le carnet : le niveau, puis la durée */
  const [saisie, setSaisie] = useState<{ quoi: "niveau" } | { quoi: "duree"; h: number } | null>(null);
  /** le fil que l'élève vient de toucher : sa croix est affichée */
  const [filChoisi, setFilChoisi] = useState<string | null>(null);
  const guide = useGuide();
  const { etat, gestes } = partie;

  /** Applique un geste ; rend l'état qu'il donne, pour dire ce qui s'est passé. */
  const agit = (g: GesteBrut): EtatMicrocontroleur => {
    setPartie((p) => { const suite = regles.geste(r, p.etat, g); return suite === p.etat ? p : { etat: suite, gestes: ajoute(p.gestes, g) }; });
    return regles.geste(r, etat, g);
  };
  /** Ce que le geste a entraîné sur la carte : elle se coupe, ou elle repart. */
  const suites = (suite: EtatMicrocontroleur): string => {
    if (suite.securite && !etat.securite) { son("faux"); return " Le voyant de la carte s'éteint : elle s'est coupée, une de ses broches est en court-circuit."; }
    if (!suite.securite && etat.securite) return " Le voyant de la carte se rallume.";
    return "";
  };
  /** l'eau coule tant que l'appui dure, par petits morceaux ; un appui bref en verse un demi-millimètre */
  const versement = useVersement();
  /** ce qui avait déjà débordé quand l'élève a commencé à verser */
  const [dejaDeborde, setDejaDeborde] = useState(0);

  const poser = (objet: string, cible: string) => {
    const c = composant(r, objet);
    if (!c) return;
    const rang = Number(cible.slice(5));
    const suite = agit(pose(objet, cible));
    if (suite === etat) return;
    dis(`${majuscule(nomComposant(c))} est ${cible.startsWith("place") ? `piqué sur la plaque d'essai, entre les rangées ${rang + 1} et ${rang + 2}` : "revenu dans la boîte"}.${suites(suite)}`);
  };
  /** L'élève vient de prendre un conducteur ohmique : où peut-il le piquer ? */
  const prise = (objet: string, cibles: string[]) => {
    const c = composant(r, objet);
    if (!c) return;
    dis(cibles.length > 0 ? `Tu tiens ${nomComposant(c)}. Un anneau vert montre où le piquer.` : `Tu tiens ${nomComposant(c)}, mais la plaque d'essai est pleine : range d'abord un conducteur ohmique dans la boîte.`);
  };
  /** Un conducteur ohmique lâché là où rien ne l'accepte : il retourne à sa place. */
  const rate = (objet: string, p: Point) => {
    const pris = POSES.findIndex((q, i) => Math.hypot(p.x - q.x, p.y - q.y) < 40 && etat.plaque[i] !== null && etat.plaque[i] !== objet);
    dis(pris >= 0 ? "Cet emplacement de la plaque d'essai est déjà pris : range d'abord le conducteur ohmique qui s'y trouve." : "Rien ne se pique à cet endroit. Reprends le conducteur ohmique : un anneau vert montre où il va.");
  };
  const relie = (a: string, b: string) => {
    const suite = agit({ g: "relier", a, b });
    dis(suite === etat ? (etat.fils.length >= FILS_MAX ? "Il n'y a plus de fil. Touche un fil posé pour le retirer." : "Ces deux bornes sont déjà reliées.") : `Fil posé entre ${NOMS[a]} et ${NOMS[b]}.${suites(suite)}`);
  };
  const retire = (a: string, b: string) => {
    const suite = agit({ g: "retirer", a, b });
    if (suite !== etat) dis(`Fil retiré entre ${NOMS[a]} et ${NOMS[b]}.${suites(suite)}`);
  };
  const mesure = () => {
    const suite = agit({ g: "mesurer" });
    if (suite === etat) { dis(etat.securite ? "La carte ne répond pas : son voyant est éteint. Une de ses broches est en court-circuit." : `Le moniteur a gardé ses ${LIGNES_MAX} mesures et n'en prend plus : pour continuer, touche « Tout recommencer », dans le protocole.`); return; }
    if (suite.securite) { son("faux"); dis("Le voyant de la carte s'éteint au moment de la mesure : elle s'est coupée, la broche D2 est en court-circuit."); return; }
    son("bip");
    dis("La carte a fait une mesure.", "Lis la durée sur le moniteur.");
  };
  const toutRecommencer = () => {
    setPartie({ etat: regles.depart(r), gestes: [] });
    setJet(null);
    setSaisie(null);
    setFilChoisi(null);
    dis("La paillasse est remise comme au début.");
  };

  // ----- ce qui se dessine -----
  const surface = CUVE.fond - etat.niveau * PAR_CM;
  const libres = r.boite.map((c) => c.id);
  const caseDe = (rang: number) => BOITE.x + ((rang + 0.5) * BOITE.l) / r.boite.length;
  const derniere = etat.lignes[etat.lignes.length - 1];
  const anciennes = etat.lignes.slice(-3, -1);

  // ----- le guide : le prochain geste, et où la main le montre -----
  const prochainPas: PasDuGuide | null = guide.actif ? prochain(r, etat, { saisie: saisie?.quoi ?? null, filChoisi }) : null;
  const laMain = (p: PasDuGuide): Indication["main"] => {
    switch (p.geste) {
      case "glisser": {
        const place = placeDe(etat, p.objet), rang = r.boite.findIndex((c) => c.id === p.objet);
        const de = place >= 0 ? POSES[place] : { x: caseDe(rang), y: BOITE.y + 44 };
        return { geste: "glisser", de, vers: p.cible.startsWith("place") ? POSES[Number(p.cible.slice(5))] : { x: caseDe(rang), y: BOITE.y + 44 } };
      }
      case "relier": return { geste: "glisser", de: PLACES[p.de], vers: PLACES[p.vers] };
      case "toucher": {
        if (p.quoi === "mesurer") return { geste: "toucher", ou: BOUTON_MESURER };
        const fil = placesDuFil(p.a, p.b, BORNES);
        return fil ? { geste: "toucher", ou: p.quoi === "fil" ? fil.prise : fil.croix } : undefined;
      }
      case "maintenir": return { geste: "maintenir", ou: POUSSOIRS[p.poussoir] };
      // la main reste au bord de ce qu'elle montre : sous la loupe, sous l'afficheur, sans cacher ce qu'il faut lire
      case "montrer": return { geste: "montrer", ou: p.quoi === "loupe" ? { x: LOUPE.x - 8, y: LOUPE.y + LOUPE.r + 3 } : { x: AFFICHEUR.x + 30, y: AFFICHEUR.y + AFFICHEUR.h - 4 } };
      // une touche du bas se met en avant d'elle-même
      default: return undefined;
    }
  };
  const indication: Indication | null = prochainPas && { cle: prochainPas.cle, texte: prochainPas.texte, etape: prochainPas.etape, main: laMain(prochainPas), appel: prochainPas.geste === "bouton" && prochainPas.bouton === "fini" };
  /** la touche du bas que le guide met en avant */
  const vise = (bouton: string) => (prochainPas?.geste === "bouton" && prochainPas.bouton === bouton ? " pl-vise" : "");

  const outils = saisie?.quoi === "niveau" ? (
    <Releve key="niveau" nom="Niveau d'eau lu sur la graduation de la cuve" unite="cm" exemple="4,2" annule={() => setSaisie(null)}
      valide={(h) => { if (h > HAUTEUR) { dis(`La graduation de la cuve s'arrête à ${nombre(HAUTEUR, 0)} cm : relis le niveau dans la loupe.`); return; } setSaisie({ quoi: "duree", h }); }} />
  ) : saisie?.quoi === "duree" ? (
    <Releve key="duree" nom="Durée lue sur le moniteur" unite="µs" exemple="262" annule={() => setSaisie(null)}
      valide={(t) => {
        if (t > 1e6) { dis("Le moniteur n'affiche jamais une durée aussi longue : relis-la."); return; }
        const suite = agit({ g: "noter", h: saisie.h, t });
        setSaisie(null);
        if (suite === etat) { dis("Cette ligne n'a pas pu s'écrire dans le carnet : relis le niveau et la durée, puis note-les de nouveau."); return; }
        dis(`Noté dans le carnet : ${ecritNiveau(saisie.h)} ; ${nombre(t, 0)} µs.`);
        son("bip");
      }} />
  ) : (
    <>
      <button type="button" className={`btn btn-ligne${vise("effacer")}`} onClick={() => { const suite = agit({ g: "effacer" }); dis(suite === etat ? "Ton carnet est vide : il n'y a rien à effacer." : "La dernière ligne du carnet est effacée."); }}>Effacer une ligne</button>
      <button type="button" className={`btn btn-ligne${vise("noter")}`} onClick={() => {
        if (etat.carnet.length >= CARNET_MAX) { dis("Ton carnet est plein : efface une ligne pour en écrire une autre."); return; }
        setJet(null);
        setSaisie({ quoi: "niveau" });
        dis("Tu écris une ligne dans ton carnet.", "Note le niveau que tu lis sur la cuve, puis la durée que tu lis sur le moniteur.");
      }}>Noter la mesure</button>
    </>
  );

  return (
    <Etabli titre="Capteur" protocole={protocole} message={message.conseil && !guide.actif ? `${message.fait} ${message.conseil}` : message.fait} attente={attente} fini={() => fini(gestes)} recommence={toutRecommencer} outils={outils} saisie={saisie !== null} indication={indication}>
      <Scene vue={saisie?.quoi === "niveau" ? VUE_CUVE : saisie?.quoi === "duree" ? VUE_MONITEUR : VUE} className="pl-circuit-scene" nom="La paillasse : le moniteur série, la carte à microcontrôleur, la plaque d'essai, la cuve et son capteur, la boîte de conducteurs ohmiques, le carnet">
        {/* le moniteur série : ce que le programme écrit, mesure après mesure */}
        <rect className="pl-circuit-ecran" x={MONITEUR.x} y={MONITEUR.y} width={MONITEUR.l} height={MONITEUR.h} rx={8} />
        <text x={MONITEUR.x + 10} y={MONITEUR.y + 14}>moniteur série</text>
        {anciennes.map((l, i) => <text key={etat.lignes.length - anciennes.length + i} className="pl-circuit-moniteur-ancien" x={MONITEUR.x + 10} y={MONITEUR.y + 30 + i * 12}>mesure {etat.lignes.length - anciennes.length + i} : {ecritDuree(l.duree)}</text>)}
        {!derniere && <text className="pl-circuit-moniteur-ancien" x={MONITEUR.x + 10} y={MONITEUR.y + 36}>{etat.securite ? "plus de liaison avec la carte" : "prêt : appuie sur le bouton de la carte"}</text>}
        {derniere && <text className="pl-circuit-moniteur-ancien" x={MONITEUR.x + 186} y={MONITEUR.y + 14}>mesure {etat.lignes.length}</text>}
        <Afficheur x={AFFICHEUR.x} y={AFFICHEUR.y} l={AFFICHEUR.l} h={AFFICHEUR.h} nom="Moniteur série, dernière mesure" eteint={!derniere} valeur={derniere ? (derniere.duree === null ? "délai dépassé" : nombre(derniere.duree, 0)) : ""} unite={derniere && derniere.duree !== null ? "µs" : undefined} />

        {/* la carte : ses broches, son voyant, son bouton */}
        <rect className="pl-circuit-boitier" x={CARTE.x} y={CARTE.y} width={CARTE.l} height={CARTE.h} rx={8} />
        <path className="pl-circuit-tige" d={`M 30 ${MONITEUR.y + MONITEUR.h} V ${CARTE.y}`} />
        <circle className={`pl-circuit-voyant ${etat.securite ? "pl-circuit-voyant-rouge" : "pl-circuit-voyant-vert"}`} cx={22} cy={CARTE.y + 14} r={4} />
        <text x={31} y={CARTE.y + 17} className={etat.securite ? "pl-fort" : undefined} style={etat.securite ? { fill: "var(--brique)" } : undefined}>{etat.securite ? "carte coupée" : "carte à microcontrôleur"}</text>
        {/* la puce de la carte : ses pattes la distinguent d'un afficheur éteint */}
        <g aria-hidden="true">
          <path className="pl-circuit-tige" d={[136, 150, 164, 178, 192, 206].map((x) => `M ${x} ${CARTE.y + 19} v 3 M ${x} ${CARTE.y + 44} v 3`).join(" ")} />
          <rect className="pl-circuit-broche" x={126} y={CARTE.y + 22} width={90} height={22} rx={3} />
          <text x={171} y={CARTE.y + 36} textAnchor="middle">microcontrôleur</text>
        </g>
        {Object.values(BROCHES).map((id) => (
          <g key={id}>
            <path className="pl-circuit-tige" d={`M ${PLACES[id].x} ${CARTE.y + CARTE.h} V ${BROCHE - 6}`} />
            <text x={PLACES[id].x} y={CARTE.y + CARTE.h - 5} textAnchor="middle" className="pl-fort">{ECRITS[id]}</text>
          </g>
        ))}
        <Touche x={BOUTON_MESURER.x} y={BOUTON_MESURER.y} l={80} h={44} nom="Bouton de la carte : lancer une mesure" texte="Mesurer" appuie={mesure} />

        {/* la plaque d'essai : trois rangées de trous reliés, deux emplacements à cheval sur deux rangées */}
        <rect className="pl-circuit-plaque" x={PLAQUE.x} y={PLAQUE.y} width={PLAQUE.l} height={PLAQUE.h} rx={8} />
        {RANGEES.map((id, i) => (
          <g key={id}>
            <path className="pl-circuit-rangee" d={`M ${PLACES[id].x} ${RANGEE} V ${TROUS[TROUS.length - 1] + 8}`} />
            {TROUS.map((y) => <circle key={y} className="pl-circuit-trou" cx={PLACES[id].x} cy={y} r={1.8} />)}
            <text x={PLACES[id].x + 12} y={RANGEE + 3}>{i + 1}</text>
          </g>
        ))}
        {POSES.map((p, i) => etat.plaque[i] === null && <rect key={p.x} className="pl-circuit-vide" x={p.x - 20} y={p.y - 9} width={40} height={18} rx={5} />)}
        <text x={PLAQUE.x + 8} y={PLAQUE.y + PLAQUE.h - 7}>plaque d&apos;essai</text>

        {/* la cuve : sa graduation, l'eau, les deux lames du capteur, l'arrivée d'eau et la vidange */}
        <rect x={CUVE.gauche} y={Math.round(surface * 100) / 100} width={CUVE.droite - CUVE.gauche} height={Math.round((CUVE.fond - surface) * 100) / 100} className="pl-circuit-eau" />
        <path className="pl-verre" d={`M ${CUVE.gauche} ${CUVE.bord} V ${CUVE.fond} H ${CUVE.droite} V ${CUVE.bord}`} />
        <Echelle x={CUVE.gauche} y={CUVE.fond} longueur={CUVE.bord - CUVE.fond} de={0} a={HAUTEUR} pas={0.5} majeur={2} cote={-1} trait={3} />
        {LAMES.map((id) => <path key={id} className="pl-circuit-lame" d={`M ${PLACES[id].x} ${LAME + 8} V ${CUVE.fond - 5}`} />)}
        <text x={226} y={CUVE.fond + 12} textAnchor="middle">cuve et capteur</text>
        <path className="pl-verre" d={`M ${CUVE.droite + 10} ${CUVE.bord - 7} H ${CUVE.droite - 4} V ${CUVE.bord + 2} M ${CUVE.droite} ${CUVE.fond - 6} H ${CUVE.droite + 10} V ${CUVE.fond + 2}`} />
        <Filet x={CUVE.droite - 4} y1={CUVE.bord + 2} y2={surface} couleur={EAU} coule={jet === "verser"} largeur={2.4} />
        <Filet x={CUVE.droite + 10} y1={CUVE.fond + 2} y2={CUVE.fond + 16} couleur={EAU} coule={jet === "vider" && etat.niveau > 0} largeur={2.4} />
        {etat.deborde > 0 && jet === "verser" && etat.niveau >= HAUTEUR && <text x={226} y={CUVE.bord - 22} textAnchor="middle" className="pl-fort" style={{ fill: "var(--brique)" }}>la cuve déborde</text>}

        {/* la loupe : la surface de l'eau devant la graduation */}
        <LoupeNiveau x={LOUPE.x} y={LOUPE.y} r={LOUPE.r} valeur={etat.niveau} pas={0.1} majeur={1} parUnite={40} monte de={0} a={HAUTEUR} couleur={EAU} liquide={etat.niveau > 0} nom="Loupe sur la graduation de la cuve, près de la surface de l'eau" />
        <text x={352} y={LOUPE.y - LOUPE.r - 6} textAnchor="end" className="pl-fort">loupe, en cm</text>
        {!saisie && (
          <>
            <Poussoir x={POUSSOIRS.verser.x} y={POUSSOIRS.verser.y} nom="Verser de l'eau dans la cuve" texte="Verser"
              maintien={versement({
                // près du bord, l'eau arrive plus doucement : le temps de lâcher avant que la cuve déborde
                debit: etat.niveau < HAUTEUR - 1.6 ? 1.4 : 0.4, pas: 0.5, verse: (v) => { agit({ g: "verser", v }); },
                debut: () => { setDejaDeborde(etat.deborde); setJet("verser"); dis("Tu verses de l'eau dans la cuve."); },
                fin: () => { setJet(null); if (etat.deborde > dejaDeborde) dis("La cuve a débordé : de l'eau est passée par-dessus bord."); else dis("Tu as arrêté de verser.", "Lis le niveau à la loupe, sur la graduation de la cuve."); },
              })} />
            <Poussoir x={POUSSOIRS.vider.x} y={POUSSOIRS.vider.y} r={20} nom="Ouvrir la vidange de la cuve" texte="Vider"
              maintien={versement({
                debit: 1.8, pas: 0.5, verse: (v) => { agit({ g: "vider", v }); },
                debut: () => { setJet("vider"); dis(etat.niveau > 0 ? "La vidange est ouverte : l'eau s'en va." : "La vidange est ouverte, mais la cuve est déjà vide."); },
                fin: () => { setJet(null); if (etat.niveau > 0) dis("La vidange est fermée.", "Lis le niveau à la loupe, sur la graduation de la cuve."); else dis("La vidange est fermée : il ne reste plus d'eau dans la cuve."); },
              })} />
          </>
        )}

        {/* la boîte de conducteurs ohmiques */}
        <rect className="pl-circuit-boite" x={BOITE.x} y={BOITE.y} width={BOITE.l} height={BOITE.h} rx={8} />
        <text x={BOITE.x + 8} y={BOITE.y + 13}>boîte</text>
        {r.boite.map((c, i) => placeDe(etat, c.id) >= 0 && <rect key={c.id} className="pl-circuit-case" x={caseDe(i) - 24} y={BOITE.y + 20} width={48} height={48} rx={6} />)}

        {/* le carnet : ce que l'élève a noté, ligne après ligne */}
        <rect className="pl-circuit-plaque" x={CARNET.x} y={CARNET.y} width={CARNET.l} height={CARNET.h} rx={4} />
        <text x={CARNET.x + 10} y={CARNET.y + 14} className="pl-fort">carnet</text>
        {[0, 1].map((colonne) => (
          <g key={colonne}>
            <text x={CARNET.x + 96 + colonne * 172} y={CARNET.y + 14} textAnchor="end">niveau</text>
            <text x={CARNET.x + 162 + colonne * 172} y={CARNET.y + 14} textAnchor="end">durée</text>
          </g>
        ))}
        <line x1={CARNET.x + 8} x2={CARNET.x + CARNET.l - 8} y1={CARNET.y + 19} y2={CARNET.y + 19} stroke="var(--filet)" />
        {etat.carnet.length === 0 && <text x={CARNET.x + 10} y={CARNET.y + 34}>rien de noté</text>}
        {etat.carnet.map((n, i) => {
          const x = CARNET.x + Math.floor(i / 4) * 172, y = CARNET.y + 34 + (i % 4) * 14;
          return (
            <g key={i}>
              <text x={x + 10} y={y}>{i + 1}</text>
              <text x={x + 96} y={y} textAnchor="end" className="pl-fort">{ecritNiveau(n.h)}</text>
              <text x={x + 162} y={y} textAnchor="end" className="pl-fort">{nombre(n.t, 0)} µs</text>
            </g>
          );
        })}

        <Manipulation pose={poser} prise={prise} rate={rate}>
          {/* les cibles : un emplacement libre de la plaque d'essai, ou la case du conducteur ohmique dans la boîte */}
          {POSES.map((p, i) => <Cible key={p.x} id={`place${i}`} nom={`la plaque d'essai, entre les rangées ${i + 1} et ${i + 2}`} x={p.x} y={p.y} r={24} accepte={etat.plaque[i] === null ? libres : []} />)}
          {r.boite.map((c, i) => <Cible key={c.id} id={`boite-${c.id}`} nom="sa case, dans la boîte" x={caseDe(i)} y={BOITE.y + 44} r={22} accepte={placeDe(etat, c.id) >= 0 ? [c.id] : []} />)}

          {/* les bornes et les fils */}
          <FilsCircuit bornes={BORNES} fils={etat.fils} relie={relie} retire={retire} choisi={filChoisi} choisit={setFilChoisi} actif={!saisie} />

          {/* les conducteurs ohmiques : dans la boîte, ou piqués sur la plaque d'essai */}
          {r.boite.map((c, i) => {
            const place = placeDe(etat, c.id);
            return (
              <Objet key={c.id} id={c.id} actif={!saisie} nom={`${majuscule(nomComposant(c))}, ${place >= 0 ? `sur la plaque d'essai, entre les rangées ${place + 1} et ${place + 2}` : "dans la boîte"}`}
                x={place >= 0 ? POSES[place].x : caseDe(i)} y={place >= 0 ? POSES[place].y : BOITE.y + 44} l={50} h={48}>
                <g transform={place >= 0 ? undefined : "scale(0.9)"}><DessinComposant c={c} /></g>
              </Objet>
            );
          })}
        </Manipulation>
        <Main indication={indication} />
      </Scene>
    </Etabli>
  );
}
