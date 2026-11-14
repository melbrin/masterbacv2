"use client";

// La paillasse « reflux » (décision 0012) : la synthèse d'un ester, de la blouse à la balance. Trois postes, que l'élève
// parcourt avec son ballon : la préparation (s'équiper, prélever à la pipette jaugée, mesurer à l'éprouvette lue à la
// loupe, ajouter la pierre ponce et le catalyseur), le montage (glisser chaque pièce à sa place, brancher les tuyaux,
// ouvrir l'eau, régler le thermostat, laisser passer le temps), la séparation (ampoule à décanter, robinet, balance).
// Rien n'écrit la mesure à sa place. Chaque geste passe par les règles (lib/commun/tp/paillasses/reflux.ts) ; la liste
// des gestes part au serveur.

import { useCallback, useEffect, useRef, useState } from "react";
import { nombre, nombreRelatif, p2 } from "@/lib/commun/format";
import { EPROUVETTE, HAUT, PROTECTIONS, affichage, ballonOuvert, circulation, dansBallon, decante, phases, regime, regles, type EtatReflux, type Protection, type ReglagesReflux } from "@/lib/commun/tp/paillasses/reflux";
import { AU_FILET, GOUTTE, debitFilet, entreGouttes, pose, prochain, type CibleReflux, type MoletteReflux, type ObjetReflux, type PasReflux, type Poste, type PoussoirReflux } from "@/lib/commun/tp/paillasses/reflux-guide";
import type { GesteBrut, PropsPaillasse } from "@/lib/commun/tp/types";
import { Afficheur, Becher, Cible, CompteGouttes, EAU, Eprouvette, Etabli, Filet, Fils, Flacon, Goutte, LoupeNiveau, Main, Manipulation, Molette, Objet, PipetteJaugee, Poussoir, Releve, Scene, Touche, son, useGuide, useVersement, type Borne, type Indication, type Point, type Vue } from "../kit";
import { AQUEUSE, Ampoule, Ballon, ChauffeBallon, MELANGE, ORGANIQUE, Pince, Refrigerant, Silhouette, SupportElevateur, Valet, Vetement } from "./refluxDessins";
import "./reflux.css";

// ---------- la place de chaque chose dans le dessin (360 de large) ----------
const VUE: Vue = { x: 0, y: -40, l: 360, h: 560 };
/** Pendant qu'il note sa masse, l'élève garde la balance sous les yeux. */
const VUE_BALANCE: Vue = { x: 176, y: 336, l: 184, h: 184 };
const SOL = 500;                                   // le dessus de la paillasse
const POSTES: Record<Poste, { nom: string; scene: string; arrivee: string }> = {
  1: { nom: "Poste 1 : la préparation", scene: "Le poste de préparation : les protections, les flacons, la pipette jaugée, l'éprouvette et le ballon sur son valet", arrivee: "Te voici à la préparation : équipe-toi, puis remplis le ballon." },
  2: { nom: "Poste 2 : le montage", scene: "Le poste du montage : la potence, le support élévateur, le chauffe-ballon, les pinces, le réfrigérant, le robinet d'eau et l'évier", arrivee: "Te voici au montage : glisse chaque pièce à sa place, de bas en haut." },
  3: { nom: "Poste 3 : la séparation", scene: "Le poste de séparation : l'ampoule à décanter sur son support, deux béchers et la balance", arrivee: "Te voici à la séparation : l'ampoule à décanter contient déjà l'eau salée." },
};
/** Le valet du ballon : à droite du poste de préparation, à gauche des deux autres. */
const VALET: Record<Poste, { x: number; y: number }> = { 1: { x: 326, y: 464 }, 2: { x: 44, y: 464 }, 3: { x: 44, y: 464 } };
// le poste de préparation
const TOI = { x: 44, y: 22 };
const PATERES: Record<Protection, { x: number; y: number }> = { blouse: { x: 120, y: 18 }, lunettes: { x: 170, y: 18 }, gants: { x: 220, y: 18 } };
const NOMS_PROTECTION: Record<Protection, string> = { blouse: "Blouse", lunettes: "Lunettes de protection", gants: "Gants" };
const LOUPE = { x: 300, y: 152, r: 44 };
const REPOS = { acide: { x: 40, y: 222 }, sulfurique: { x: 104, y: 236 }, ponce: { x: 170, y: 240 }, pipette: { x: 226, y: 230 } };
const BECHER = { x: 20, y: 450, l: 50, h: 50 };     // le bécher d'alcool, posé sur la paillasse
const TUBE = { x: 160, y: 450 };                    // l'éprouvette graduée
const COL = { x: VALET[1].x, y: VALET[1].y - 60 };  // le col du ballon posé sur son valet
// le poste du montage
const TIGE = 110;                                   // la tige de la potence
const AXE = 180;                                    // l'axe du montage
const Y_BALLON = 402;                               // le centre du ballon tenu dans le montage
const JOINT = Y_BALLON - 62;                        // le haut du col, où s'emboîte le réfrigérant
const NOIX = { ballon: 352, refrigerant: 250 };     // la hauteur des deux pinces sur la tige
const RANGES = { pinces: [{ x: 270, y: 92 }, { x: 270, y: 132 }], refrigerant: { x: 330, y: 172 }, chauffe: { x: 276, y: 300 }, support: { x: 276, y: 376 } };
const BORNES_EAU: Borne[] = [{ id: "robinet", x: 278, y: 34, nom: "le robinet d'eau" }, { id: "evier", x: 292, y: 462, nom: "l'évier" }];
const TUBULURES: Borne[] = [{ id: "bas", x: AXE + 24, y: JOINT - 32, nom: "la tubulure du bas du réfrigérant" }, { id: "haut", x: AXE + 24, y: JOINT - 148, nom: "la tubulure du haut du réfrigérant" }];
// le poste de séparation
const AMPOULE = { x: 166, y: 410 };                 // le robinet de l'ampoule à décanter
const SOUS = { x: AMPOULE.x, y: 475 };              // la place d'un bécher sous l'ampoule
const BALANCE = { x: 306, y: 420 };                 // le plateau de la balance
const RANGE_BECHER = { x: 306, y: 300 }, RANGE_POUBELLE = { x: 232, y: 475 }, RANGE_BOUCHON = { x: 256, y: 96 };

/** Ce que l'élève tient, dans une phrase : son nom, et le pronom qui le reprend. */
const TENUS: Record<string, [string, string]> = {
  blouse: ["la blouse", "la"], lunettes: ["les lunettes", "les"], gants: ["les gants", "les"], acide: ["le flacon d'acide éthanoïque", "le"], eprouvette: ["l'éprouvette", "la"],
  sulfurique: ["le flacon d'acide sulfurique", "le"], ponce: ["le pot de pierre ponce", "le"], pipette: ["la pipette jaugée", "la"], support: ["le support élévateur", "le"], chauffe: ["le chauffe-ballon", "le"],
  refrigerant: ["le réfrigérant", "le"], ballon: ["le ballon", "le"], bouchon: ["le bouchon", "le"], poubelle: ["le bécher poubelle", "le"], becher: ["le bécher du produit", "le"],
};

interface Partie { etat: EtatReflux; gestes: GesteBrut[] }
const CUMULS: Record<string, number> = { aspirer: 30, vider: 30, mesurer: 30, attendre: 120, couler: 120 };
/** Ajoute un geste à la liste. Les morceaux d'un même geste continu se regroupent : rejouée, la liste donne le même état. */
function ajoute(gestes: GesteBrut[], g: GesteBrut): GesteBrut[] {
  const dernier = gestes[gestes.length - 1];
  const a = dernier?.v, b = g.v;
  const continu = dernier !== undefined && dernier.g === g.g && typeof a === "number" && typeof b === "number" && CUMULS[g.g] !== undefined && a + b <= CUMULS[g.g];
  return continu ? [...gestes.slice(0, -1), { ...dernier, v: Math.round((a + b) * 100) / 100 }] : [...gestes, g];
}

const r2 = (n: number) => Math.round(n * 100) / 100;
/** Les molettes : leur centre, l'angle de leur repère pour une valeur, le rayon du geste que montre la main du guide. */
const MOLETTES: Record<MoletteReflux, { ou: Point; angle: (v: number) => number; r: number }> = {
  thermostat: { ou: { x: 48, y: 152 }, angle: (v) => -135 + v * 45, r: 30 },
  eau: { ou: { x: 322, y: 2 }, angle: (v) => -135 + v * 90, r: 28 },
  support: { ou: { x: 236, y: 476 }, angle: (v) => -135 + v * 90, r: 28 },
  robinet: { ou: AMPOULE, angle: (v) => 90 + v * 90, r: 32 },
};

export default function Reflux({ reglages: r, protocole, attente, fini }: PropsPaillasse<ReglagesReflux>) {
  const [partie, setPartie] = useState<Partie>(() => ({ etat: regles.depart(r), gestes: [] }));
  const [message, setMessage] = useState("Ta paillasse a trois postes : la préparation, le montage, la séparation. Prends un objet en le glissant, ou touche-le puis touche l'endroit où le poser.");
  const [poste, setPoste] = useState<Poste>(1);
  /** le flacon d'acide penché au-dessus de l'éprouvette ; le compte-gouttes au-dessus du ballon */
  const [verse, setVerse] = useState(false);
  const [compte, setCompte] = useState(false);
  const [jet, setJet] = useState<"acide" | "pipette" | null>(null);
  /** le robinet de l'ampoule à décanter, de 0 (fermé) à 1 */
  const [ouverture, setOuverture] = useState(0);
  const [chute, setChute] = useState(0);
  const [saisie, setSaisie] = useState(false);
  const guide = useGuide();
  const { etat, gestes } = partie;

  const agit = useCallback((g: GesteBrut) => setPartie((p) => ({ etat: regles.geste(r, p.etat, g), gestes: ajoute(p.gestes, g) })), [r]);
  /** Fait un geste, et dit s'il a changé quelque chose. */
  const tente = (g: GesteBrut): boolean => { const change = regles.geste(r, etat, g) !== etat; agit(g); return change; };
  /** les poussoirs qui versent, aspirent ou laissent passer le temps tant que l'appui dure */
  const versement = useVersement();

  // ----- ce qui dépend de l'état -----
  const ce = regime(etat);
  const eau = circulation(etat);
  /** à l'ébullition, le mélange se couvre de bulles ; sans pierre ponce, elles sont grosses et brutales */
  const bout = ce === "reflux" || ce === "fort";
  const surValet = etat.ballon === "valet";
  /** le chauffe-ballon monte et descend avec le support ; le ballon non tenu le suit */
  const yChauffe = SOL - 59 - 13 * etat.hauteur;
  const yBallon = etat.pieces.pinceb || !etat.pieces.chauffe ? Y_BALLON : yChauffe;
  const ballonIci = surValet ? VALET[poste] : { x: AXE, y: yBallon };
  const reste = phases(etat);
  const loupePipette = etat.pipette === "flacon" || etat.dansPipette > 0;
  const pipetteIci = etat.pipette === "flacon" ? { x: BECHER.x + BECHER.l / 2, y: SOL - 70 } : etat.pipette === "ballon" ? { x: COL.x, y: COL.y - 56 } : REPOS.pipette;
  const chrono = `${Math.floor(etat.temps)}:${p2(Math.floor((etat.temps % 1) * 60))}`;
  const rangees = 2 - (etat.pieces.pinceb ? 1 : 0) - (etat.pieces.pincer ? 1 : 0);
  const bornes = etat.pieces.refrigerant ? [...BORNES_EAU, ...TUBULURES] : BORNES_EAU;
  const dansBecher = etat.recolteOrg + etat.recolteAq;
  const poubelleRecu = Math.max(0, etat.ecoule - dansBecher - etat.flaque);
  const becherIci = etat.becher === "sous" ? SOUS : etat.becher === "balance" ? { x: BALANCE.x, y: BALANCE.y - 27 } : RANGE_BECHER;
  const recoit = etat.becher === "sous" ? "becher" : etat.poubelle ? "poubelle" : "rien";
  /** vrai si l'ampoule peut couler : elle contient le mélange, et l'air y entre par le haut */
  const coule = etat.ampoule && !etat.bouchon && reste.aqueux + reste.organique > 0;

  // ----- le robinet de l'ampoule : tant qu'il est ouvert, elle coule -----
  const bloque = useRef(true);
  useEffect(() => { bloque.current = !coule; });
  useEffect(() => {
    if (ouverture <= 0) return;
    let image = 0;
    let avant = performance.now();
    let attenteGoutte = entreGouttes(ouverture) * 0.6;
    let filet = 0;
    const tourne = (maintenant: number) => {
      const dt = Math.min(0.1, (maintenant - avant) / 1000);
      avant = maintenant;
      if (!bloque.current) {
        if (ouverture <= AU_FILET) {
          attenteGoutte += dt;
          if (attenteGoutte >= entreGouttes(ouverture)) { attenteGoutte = 0; agit({ g: "couler", v: GOUTTE }); setChute((n) => n + 1); son("goutte"); }
        } else {
          filet += debitFilet(ouverture) * dt;
          if (filet >= 0.05) { const v = Math.floor(filet * 100) / 100; filet -= v; agit({ g: "couler", v }); }
        }
      }
      image = requestAnimationFrame(tourne);
    };
    image = requestAnimationFrame(tourne);
    return () => cancelAnimationFrame(image);
  }, [ouverture, agit]);

  const va = (p: Poste) => { setPoste(p); setVerse(false); setCompte(false); setOuverture(0); setSaisie(false); setMessage(POSTES[p].arrivee); };

  /** où se trouve chaque objet, chaque cible, chaque poussoir : le dessin et la main du guide lisent les mêmes places */
  const objets: Record<ObjetReflux, Point> = {
    blouse: PATERES.blouse, lunettes: PATERES.lunettes, gants: PATERES.gants,
    acide: verse ? { x: TUBE.x + 34, y: TUBE.y - 82 } : REPOS.acide, eprouvette: TUBE, sulfurique: compte ? { x: COL.x, y: COL.y - 32 } : REPOS.sulfurique, ponce: REPOS.ponce, pipette: pipetteIci,
    support: etat.pieces.support ? { x: AXE, y: SOL - 18 } : RANGES.support, chauffe: etat.pieces.chauffe ? { x: AXE, y: yChauffe + 21 } : RANGES.chauffe,
    "pince-1": RANGES.pinces[0], "pince-2": RANGES.pinces[1], pinceb: { x: TIGE + 35, y: NOIX.ballon }, pincer: { x: TIGE + 35, y: NOIX.refrigerant },
    refrigerant: etat.pieces.refrigerant ? { x: AXE, y: JOINT - 88 } : RANGES.refrigerant, ballon: ballonIci,
    bouchon: etat.bouchon ? { x: AMPOULE.x, y: AMPOULE.y - 226 } : RANGE_BOUCHON, poubelle: etat.poubelle ? SOUS : RANGE_POUBELLE, becher: becherIci,
  };
  const cibles: Record<CibleReflux, Point> = {
    toi: { x: TOI.x, y: TOI.y + 8 }, tube: { x: TUBE.x, y: TUBE.y - 58 }, "flacon-acide": REPOS.acide, alcool: { x: BECHER.x + BECHER.l / 2, y: BECHER.y + 12 }, col: COL,
    "repos-pipette": REPOS.pipette, "repos-sulfurique": REPOS.sulfurique,
    socle: { x: AXE, y: SOL - 16 }, plateau: { x: AXE, y: SOL - 36 - 13 * etat.hauteur }, "noix-b": { x: TIGE + 35, y: NOIX.ballon }, "noix-r": { x: TIGE + 35, y: NOIX.refrigerant },
    "place-ballon": { x: AXE, y: Y_BALLON }, "col-ballon": { x: AXE, y: JOINT - 12 }, ratelier: { x: 270, y: 112 },
    "repos-refrigerant": RANGES.refrigerant, "repos-chauffe": RANGES.chauffe, "repos-support": RANGES.support, valet: VALET[2],
    entonnoir: { x: AMPOULE.x, y: AMPOULE.y - 234 }, "repos-bouchon": RANGE_BOUCHON, sous: SOUS, "repos-poubelle": RANGE_POUBELLE, balance: { x: BALANCE.x, y: BALANCE.y - 26 }, "repos-becher": RANGE_BECHER,
  };
  const poussoirs: Record<PoussoirReflux, Point> = {
    mesurer: { x: TUBE.x + 90, y: TUBE.y - 30 }, goutte: { x: COL.x - 46, y: COL.y - 32 }, aspirer: { x: pipetteIci.x + 52, y: pipetteIci.y - 34 }, redescendre: { x: pipetteIci.x + 52, y: pipetteIci.y + 18 },
    vider: { x: COL.x - 46, y: COL.y - 56 }, attendre: { x: 48, y: 50 }, agiter: { x: 256, y: 160 }, degazer: { x: 256, y: 216 }, tare: { x: BALANCE.x, y: BALANCE.y + 58 },
  };

  // ----- prendre et poser -----
  const prise = (objet: string, ou: string[]) => {
    const [nom, pronom] = TENUS[objet] ?? ["une pince", "la"];
    setMessage(ou.length > 0 ? `Tu tiens ${nom}. Un anneau vert montre où ${pronom} poser.` : `Tu tiens ${nom}, mais rien ne peut ${pronom} recevoir pour l'instant.`);
  };
  const rate = () => setMessage("Rien ne se pose à cet endroit. Reprends l'objet : un anneau vert montre où il va.");
  const poser = (objet: string, cible: string) => {
    const suite = pose(r, etat, { verse, compte }, objet, cible);
    suite.gestes.forEach(agit);
    setVerse(suite.poses.verse);
    setCompte(suite.poses.compte);
    // avec le guide, le message ne dit que ce qui vient de se passer : le guide dit déjà le geste suivant
    if (suite.message) setMessage(suite.conseil && !guide.actif ? `${suite.message} ${suite.conseil}` : suite.message);
  };

  const regleThermostat = (v: number) => {
    agit({ g: "thermostat", v });
    const suite = regime(regles.geste(r, etat, { g: "thermostat", v }));
    setMessage(v === 0 ? "Le chauffage est coupé." : suite === "arret" ? "Le chauffe-ballon chauffe, mais il n'entoure aucun ballon plein." : suite === "tiede" ? "Le mélange tiédit, sans bouillir." : suite === "reflux" ? "Le mélange bout doucement." : "Le mélange bout à gros bouillons.");
  };
  const regleSupport = (v: number) => {
    agit({ g: "monter", v });
    const suite = regles.geste(r, etat, { g: "monter", v });
    setMessage(suite.tombe && !etat.tombe ? "Le support descend, et le ballon suit le chauffe-ballon : rien ne le tenait." : v === HAUT ? "Le support est en haut : le chauffe-ballon entoure le ballon." : v < etat.hauteur ? "Le support descend : le chauffe-ballon s'écarte." : "Le support monte.");
  };
  const regleEau = (v: number) => {
    agit({ g: "eau", v });
    const suite = circulation(regles.geste(r, etat, { g: "eau", v }));
    setMessage(v === 0 ? "Le robinet d'eau est fermé." : suite === "bonne" ? "L'eau entre par le bas du réfrigérant et ressort par le haut, vers l'évier." : suite === "inverse" ? "L'eau entre par le haut du réfrigérant et ressort par le bas, vers l'évier."
      : suite === "fuite" ? "L'eau entre dans le réfrigérant et ressort sur la paillasse : il manque un tuyau vers l'évier." : "Le robinet d'eau est ouvert, mais l'eau ne passe pas par le réfrigérant.");
  };
  const tourneRobinet = (o: number) => {
    setOuverture(o);
    setMessage(o === 0 ? "Robinet fermé." : etat.bouchon ? "Le robinet est ouvert, mais rien ne coule : l'ampoule est bouchée, l'air ne peut pas entrer." : reste.aqueux + reste.organique <= 0 ? "Le robinet est ouvert, mais l'ampoule est vide."
      : `L'ampoule coule ${o <= AU_FILET ? "goutte à goutte" : "au filet"}, ${recoit === "becher" ? "dans le bécher du produit" : recoit === "poubelle" ? "dans le bécher poubelle" : "sur la paillasse : rien n'est posé dessous"}.`);
  };
  const toutRecommencer = () => {
    setPartie({ etat: regles.depart(r), gestes: [] });
    va(1);
    setMessage("La paillasse est remise comme au début.");
  };

  // ----- le guide : le prochain geste, et où la main le montre -----
  const pas: PasReflux | null = guide.actif ? prochain(r, etat, { poste, verse, compte, robinet: ouverture, saisie }) : null;
  const borne = (id: string): Point => bornes.find((b) => b.id === id) ?? { x: 0, y: 0 };
  const laMain = (p: PasReflux): Indication["main"] => {
    switch (p.geste) {
      case "glisser": return { geste: "glisser", de: objets[p.objet], vers: cibles[p.cible] };
      case "maintenir": case "toucher": return { geste: p.geste, ou: poussoirs[p.poussoir] };
      case "tourner": {
        const m = MOLETTES[p.molette];
        const ici = p.molette === "robinet" ? ouverture : p.molette === "thermostat" ? etat.thermostat : p.molette === "eau" ? etat.eau : etat.hauteur;
        return { geste: "tourner", ou: m.ou, de: m.angle(ici), a: m.angle(p.vers), r: m.r };
      }
      case "tirer": return { geste: "glisser", de: borne(p.de), vers: borne(p.vers) };
      // un tuyau se touche en son milieu, là où il pend ; sa croix rouge s'y dessine ensuite
      case "tuyau": { const a = borne(p.a), b = borne(p.b); return { geste: "toucher", ou: { x: r2((a.x + b.x) / 2), y: r2((a.y + b.y) / 2 + Math.min(34, 8 + Math.hypot(b.x - a.x, b.y - a.y) * 0.16) / 2) } }; }
      case "montrer": return { geste: "montrer", ou: p.quoi === "balance" ? { x: BALANCE.x - 30, y: BALANCE.y + 38 } : { x: AMPOULE.x + 26, y: AMPOULE.y - 34 } };
      default: return undefined;
    }
  };
  const indication: Indication | null = pas && { cle: pas.cle, texte: pas.texte, etape: pas.etape, main: laMain(pas), appel: pas.geste === "bouton" && pas.bouton === "fini" };
  /** la touche du bas que le guide met en avant */
  const vise = (bouton: string) => (pas?.geste === "bouton" && pas.bouton === bouton ? " pl-vise" : "");

  const outils = saisie ? (
    <Releve nom="Masse du produit, lue sur la balance" unite="g" exemple="10,52" annule={() => setSaisie(false)}
      valide={(v) => { setSaisie(false); if (v > 500) { setMessage("Cette masse dépasse la portée de la balance : relis l'afficheur."); return; } agit({ g: "noter", v }); setMessage(`Masse notée : ${nombre(v, 2)} g.`); son("bip"); }} />
  ) : poste === 1 ? (
    <button type="button" className={`btn btn-ligne${vise("poste-2")}`} onClick={() => va(2)}>Aller au montage</button>
  ) : poste === 2 ? (
    <>
      <button type="button" className={`btn btn-ligne${vise("poste-1")}`} onClick={() => va(1)}>Retour à la préparation</button>
      <button type="button" className={`btn btn-ligne${vise("poste-3")}`} onClick={() => va(3)}>Aller à la séparation</button>
    </>
  ) : (
    <>
      <button type="button" className={`btn btn-ligne${vise("poste-2")}`} onClick={() => va(2)}>Retour au montage</button>
      <button type="button" className={`btn btn-ligne${vise("noter")}`} onClick={() => { setOuverture(0); setSaisie(true); }}>Noter la masse</button>
    </>
  );

  // le chronomètre et le bouton du temps : aux postes où l'on attend
  const temps = (
    <>
      <Afficheur x={8} y={-30} l={80} h={26} nom="Chronomètre, en minutes et secondes" valeur={chrono} />
      <text x={48} y={8} textAnchor="middle">chronomètre</text>
      <Poussoir {...poussoirs.attendre} r={24} nom="Laisser passer le temps, en accéléré" texte="Attendre"
        maintien={versement({ debit: 3, pas: 1, verse: (v) => agit({ g: "attendre", v }), debut: () => setMessage("Le temps passe en accéléré : suis le chronomètre.") })} />
    </>
  );

  return (
    <Etabli titre="Synthèse" protocole={protocole} message={message} attente={attente} fini={() => fini(gestes)} recommence={toutRecommencer} outils={outils} saisie={saisie} indication={indication}>
      <Scene vue={saisie ? VUE_BALANCE : VUE} nom={POSTES[poste].scene}>
        <Manipulation pose={poser} prise={prise} rate={rate}>
          <g key={poste} className="pl-reflux-poste">
            <line className="pl-reflux-sol" x1={0} x2={360} y1={SOL} y2={SOL} />
            <text x={352} y={VUE.y + 14} textAnchor="end" className="pl-fort">{POSTES[poste].nom}</text>
            <g transform={`translate(${VALET[poste].x} ${VALET[poste].y})`}><Valet /></g>

            {poste === 1 && (
              <>
                {/* l'élève, et ses protections pendues aux patères */}
                <g transform={`translate(${TOI.x} ${TOI.y})`}><Silhouette porte={etat.porte} /></g>
                <text x={TOI.x} y={TOI.y + 68} textAnchor="middle">toi</text>
                <line className="pl-reflux-patere" x1={96} x2={244} y1={-10} y2={-10} />
                {PROTECTIONS.map((p) => (
                  <g key={p}>
                    <line className="pl-reflux-patere" x1={PATERES[p].x} x2={PATERES[p].x} y1={-10} y2={-2} />
                    <text x={PATERES[p].x} y={PATERES[p].y + 36} textAnchor="middle">{p}</text>
                  </g>
                ))}
                {/* la loupe : la pipette quand on prélève, sinon l'éprouvette */}
                {loupePipette
                  ? <LoupeNiveau x={LOUPE.x} y={LOUPE.y} r={LOUPE.r} valeur={etat.dansPipette} pas={100} majeur={100} parUnite={110} monte repere={r.Va} couleur={EAU} liquide={etat.dansPipette > 0} nom="Loupe sur la pipette, près du trait de jauge" />
                  : <LoupeNiveau x={LOUPE.x} y={LOUPE.y} r={LOUPE.r} valeur={etat.eprouvette} pas={1} majeur={5} parUnite={9} monte de={0} a={EPROUVETTE} couleur={EAU} liquide={etat.eprouvette > 0} nom="Loupe sur l'éprouvette, près du niveau du liquide, en millilitres" />}
                <text x={LOUPE.x} y={LOUPE.y - LOUPE.r - 7} textAnchor="middle" className="pl-fort">{loupePipette ? "Loupe : la pipette" : "Loupe : l'éprouvette"}</text>
                {/* le bécher d'alcool : il reste à sa place */}
                <Becher x={BECHER.x} y={BECHER.y} l={BECHER.l} h={BECHER.h} niveau={0.7} couleur={EAU} />
                <text x={BECHER.x + BECHER.l / 2} y={SOL + 12} textAnchor="middle">alcool benzylique</text>
                <path className="pl-reflux-etagere" d="M 8 259.5 H 200" />
                <text x={REPOS.sulfurique.x} y={REPOS.sulfurique.y + 36} textAnchor="middle">acide sulfurique</text>
                <text x={REPOS.ponce.x + 8} y={REPOS.ponce.y + 32} textAnchor="middle">pierre ponce</text>

                {PROTECTIONS.map((p) => !etat.porte[p] && <Objet key={p} id={p} nom={NOMS_PROTECTION[p]} x={PATERES[p].x} y={PATERES[p].y} l={46} h={48}><Vetement quoi={p} /></Objet>)}
                {/* l'éprouvette graduée, et le flacon d'acide : sur l'étagère, ou penché au-dessus d'elle */}
                <Objet id="eprouvette" nom="Éprouvette graduée de 25 mL" {...objets.eprouvette} l={44} h={104}>
                  <Eprouvette x={0} y={-50} l={24} h={100} volume={etat.eprouvette} capacite={EPROUVETTE} couleur={EAU} pas={1} majeur={5} />
                </Objet>
                <Objet id="acide" nom="Flacon d'acide éthanoïque" {...objets.acide} l={50} h={76}>
                  <g transform={verse ? "rotate(-112)" : undefined}><Flacon x={0} y={-36} l={46} h={72} couleur={EAU} etiquette="Acide" sous="éthanoïque" /></g>
                </Objet>
                {verse && (
                  <>
                    {jet === "acide" && <Filet x={TUBE.x} y1={TUBE.y - 66} y2={TUBE.y + 40} couleur="rgba(200, 220, 240, 0.8)" coule />}
                    <Poussoir {...poussoirs.mesurer} nom="Verser l'acide dans l'éprouvette" texte="Verser"
                      maintien={versement({ debit: etat.eprouvette < r.Vc - etat.acide - 3 ? 3.5 : 0.9, pas: 1, verse: (v) => agit({ g: "mesurer", v }), debut: () => setJet("acide"), fin: () => setJet(null) })} />
                  </>
                )}
                {/* le catalyseur et la pierre ponce */}
                <Objet id="sulfurique" nom="Flacon compte-gouttes d'acide sulfurique" {...objets.sulfurique} l={44} h={52}>
                  <CompteGouttes x={0} y={-22} l={26} h={44} couleur="rgba(240, 220, 160, 0.5)" etiquette="H₂SO₄" />
                </Objet>
                {compte && (
                  <Poussoir {...poussoirs.goutte} nom="Ajouter une goutte d'acide sulfurique" texte="Goutte"
                    appuie={() => { const change = tente({ g: "goutte" }); setChute((n) => n + 1); son("goutte"); setMessage(change ? `${etat.gouttes + 1} goutte${etat.gouttes ? "s" : ""} d'acide sulfurique dans le ballon.` : "La goutte tombe à côté : le ballon n'est plus sous le compte-gouttes, ou il a déjà chauffé."); }} />
                )}
                <Objet id="ponce" nom="Pot de pierre ponce" {...objets.ponce} l={44} h={44}>
                  <path className="pl-verre" d="M -12 -10 V 12 Q -12 16 -8 16 H 8 Q 12 16 12 12 V -10" />
                  {[[-6, 10], [0, 6], [6, 11], [-2, 12], [4, 3], [-7, 3]].map(([x, y]) => <circle key={`${x}-${y}`} className="pl-reflux-grain" cx={x} cy={y} r={2.2} />)}
                </Objet>
                {/* la pipette jaugée et sa propipette */}
                <Objet id="pipette" nom={`Pipette jaugée de ${nombre(r.Va, 1)} mL`} {...objets.pipette} l={40} h={130}>
                  <rect x={-4} y={-76} width={8} height={16} rx={3} fill="var(--brique)" />
                  <PipetteJaugee x={0} y={-62} h={124} remplissage={etat.dansPipette / r.Va} couleur={EAU} />
                </Objet>
                {etat.pipette === "flacon" && (
                  <>
                    <Poussoir {...poussoirs.aspirer} nom="Aspirer dans la pipette" texte="Aspirer"
                      maintien={versement({ debit: etat.dansPipette < r.Va - 1.5 ? 1.6 : 0.5, pas: 0.5, verse: (v) => agit({ g: "aspirer", v }) })} />
                    <Poussoir {...poussoirs.redescendre} nom="Laisser redescendre le liquide de la pipette" texte="Vider"
                      maintien={versement({ debit: 0.4, pas: 0.05, verse: (v) => agit({ g: "vider", v }) })} />
                  </>
                )}
                {etat.pipette === "ballon" && (
                  <>
                    {jet === "pipette" && etat.dansPipette > 0 && <Filet x={COL.x} y1={COL.y + 4} y2={COL.y + 60} couleur="rgba(200, 220, 240, 0.8)" coule />}
                    <Poussoir {...poussoirs.vider} nom="Vider la pipette dans le ballon" texte="Vider"
                      maintien={versement({ debit: 4, pas: 1, verse: (v) => agit({ g: "vider", v }), debut: () => setJet("pipette"), fin: () => setJet(null) })} />
                  </>
                )}
                {compte && <Goutte x={COL.x} y1={COL.y - 8} y2={COL.y + 50} couleur="rgba(240, 220, 160, 0.95)" cle={chute} />}
              </>
            )}

            {poste === 2 && (
              <>
                {temps}
                {/* le boîtier du thermostat : de 0 à 6 */}
                <rect className="pl-reflux-appareil" x={10} y={106} width={76} height={86} rx={8} />
                <text x={48} y={100} textAnchor="middle">thermostat</text>
                {[0, 1, 2, 3, 4, 5, 6].map((n) => {
                  const angle = ((-135 + n * 45) * Math.PI) / 180;
                  return <text key={n} x={r2(48 + 31 * Math.sin(angle))} y={r2(152 - 31 * Math.cos(angle) + 3)} textAnchor="middle" className={n === etat.thermostat ? "pl-fort" : undefined}>{n}</text>;
                })}
                <Molette x={48} y={152} r={24} valeur={etat.thermostat} min={0} max={6} pas={1} nom="Thermostat du chauffe-ballon" texte={etat.thermostat === 0 ? "arrêt" : `position ${etat.thermostat}`} change={regleThermostat} />
                {/* la potence, le râtelier des pinces, les étagères, le robinet d'eau et l'évier */}
                <path className="pl-reflux-potence" d={`M ${TIGE} ${SOL} V -24 M ${TIGE - 26} ${SOL} H ${TIGE + 30}`} />
                <path className="pl-reflux-potence" d="M 248 76 V 148" />
                <path className="pl-reflux-etagere" d="M 232 324 H 320 M 232 395 H 320 M 314 262 H 346" />
                <path className="pl-verre" d="M 336 -22 V 10 Q 336 20 326 20 H 296 Q 282 20 280 30" />
                <text x={322} y={36} textAnchor="middle">eau</text>
                <Molette x={322} y={2} r={22} valeur={etat.eau} min={0} max={3} pas={1} nom="Robinet d'eau" texte={etat.eau === 0 ? "fermé" : "ouvert"} change={regleEau} />
                <path className="pl-verre" d="M 268 470 v 18 q 0 8 8 8 h 32 q 8 0 8 -8 v -18" />
                <text x={292} y={SOL + 12} textAnchor="middle">évier</text>

                {/* les pièces : rangées à droite, ou à leur place dans le montage */}
                <Objet id="support" nom={etat.pieces.support ? "Support élévateur, en place" : "Support élévateur"} {...objets.support} l={76} h={44}>
                  <g transform="translate(0 18)"><SupportElevateur hauteur={etat.pieces.support ? etat.hauteur : 0} /></g>
                </Objet>
                {etat.pieces.support && <Molette x={236} y={476} r={22} valeur={etat.hauteur} min={0} max={HAUT} pas={1} nom="Molette du support élévateur" texte={etat.hauteur === HAUT ? "en haut" : etat.hauteur === 0 ? "en bas" : "à mi-hauteur"} change={regleSupport} />}
                <Objet id="chauffe" nom={etat.pieces.chauffe ? "Chauffe-ballon, sur le support" : "Chauffe-ballon"} {...objets.chauffe} l={84} h={48}>
                  <g transform="translate(0 -21)"><ChauffeBallon marche={etat.pieces.chauffe && etat.thermostat > 0} /></g>
                </Objet>
                {etat.pieces.pinceb && <Objet id="pinceb" nom="Pince du ballon, sur la potence" {...objets.pinceb} l={70} h={40}><g transform="translate(-35 0)"><Pince long={AXE - TIGE} /></g></Objet>}
                {etat.pieces.pincer && <Objet id="pincer" nom="Pince du réfrigérant, sur la potence" {...objets.pincer} l={70} h={40}><g transform="translate(-35 0)"><Pince long={AXE - TIGE} /></g></Objet>}
                {RANGES.pinces.slice(0, rangees).map((p, i) => (
                  <Objet key={i} id={`pince-${i + 1}`} nom="Pince" x={p.x} y={p.y} l={56} h={38}><g transform="translate(-22 0)"><Pince long={44} /></g></Objet>
                ))}
                <Objet id="refrigerant" nom={etat.pieces.refrigerant ? "Réfrigérant à boules, sur le ballon" : "Réfrigérant à boules"} {...objets.refrigerant} l={44} h={176}>
                  <g transform="translate(0 88)"><Refrigerant eau={etat.pieces.refrigerant ? eau : "aucune"} vapeurs={!etat.pieces.refrigerant || !bout ? "aucune" : eau === "bonne" && ce === "reflux" ? "condensees" : "echappees"} /></g>
                </Objet>
                {/* sans réfrigérant, les vapeurs sortent par le col du ballon */}
                {bout && !etat.pieces.refrigerant && [-6, 0, 6].map((x, i) => <circle key={x} className="pl-reflux-fuite" cx={AXE + x} cy={JOINT - 6} r={4} style={{ animationDelay: `${i * 0.4}s` }} />)}
                {/* les tuyaux d'eau : on tire un tuyau d'un bout à l'autre */}
                <Fils bornes={bornes} fils={etat.tuyaux}
                  relie={(a, b) => setMessage(tente({ g: "tuyau", a, b, pose: true }) ? `Un tuyau relie ${bornes.find((x) => x.id === a)?.nom} et ${bornes.find((x) => x.id === b)?.nom}.` : "Chaque bout ne reçoit qu'un tuyau : retire d'abord celui qui s'y trouve.")}
                  retire={(a, b) => { agit({ g: "tuyau", a, b, pose: false }); setMessage("Le tuyau est débranché."); }} />
              </>
            )}

            {poste === 3 && (
              <>
                {temps}
                {/* le support de l'ampoule, l'étagère du bécher, la balance */}
                <path className="pl-reflux-potence" d={`M 96 ${SOL} V 150 M 72 ${SOL} H 122 M 96 ${AMPOULE.y - 95} H 126`} />
                <ellipse className="pl-reflux-potence" cx={AMPOULE.x} cy={AMPOULE.y - 95} rx={41} ry={5} />
                <path className="pl-reflux-etagere" d="M 268 327 H 346" />
                <rect className="pl-reflux-appareil" x={260} y={BALANCE.y + 4} width={92} height={SOL - BALANCE.y - 4} rx={6} />
                <ellipse className="pl-reflux-plateau" cx={BALANCE.x} cy={BALANCE.y} rx={42} ry={5} />
                <Afficheur x={266} y={BALANCE.y + 10} l={80} h={26} nom="Balance" unite="g" valeur={nombreRelatif(affichage(r, etat), 2)} />
                <Touche {...poussoirs.tare} l={72} h={36} nom="Tare de la balance" texte="Tare" appuie={() => { agit({ g: "tarer" }); setMessage("La balance est remise à zéro."); }} />
                {/* l'ampoule à décanter : avant le mélange, elle ne contient que l'eau salée */}
                <g transform={`translate(${AMPOULE.x} ${AMPOULE.y})`}>
                  <Ampoule key={etat.agite} aqueux={etat.ampoule ? reste.aqueux : 30} organique={etat.ampoule ? reste.organique : 0} trouble={etat.ampoule && !decante(etat)} bouchon={false} secouee={etat.agite > 0} />
                </g>
                <text x={AMPOULE.x - 16} y={AMPOULE.y + 3} textAnchor="end">{ouverture === 0 ? "fermé" : ouverture <= AU_FILET ? "goutte à goutte" : "au filet"}</text>
                {/* le robinet de l'ampoule : on pose le doigt dessus et on tourne ; au clavier, les flèches, « G » pour une goutte, « F » pour cinq millilitres */}
                <Molette x={AMPOULE.x} y={AMPOULE.y} r={26} valeur={ouverture} min={0} max={1} pas={0.05} de={90} a={180} change={tourneRobinet} nom="Robinet de l'ampoule à décanter"
                  texte={ouverture === 0 ? "fermé" : ouverture <= AU_FILET ? "ouvert, goutte à goutte" : "ouvert, au filet"}
                  touches={(e) => {
                    if (e.key === "g" || e.key === "G") { agit({ g: "couler", v: GOUTTE }); setChute((n) => n + 1); son("goutte"); }
                    if (e.key === "f" || e.key === "F") agit({ g: "couler", v: 5 });
                  }}
                  dessin={(angle) => (
                    <g transform={`translate(${AMPOULE.x} ${AMPOULE.y})`}>
                      <g transform={`rotate(${angle})`}><rect x={-3} y={-25} width={6} height={25} rx={3} fill="var(--cuivre)" /><circle cy={-25} r={5.5} fill="var(--cuivre)" /></g>
                      <circle r={6.5} fill="var(--carte-2)" stroke="var(--encre)" strokeWidth={1.4} />
                    </g>
                  )} />
                {ouverture > AU_FILET && coule && <Filet x={AMPOULE.x} y1={AMPOULE.y + 30} y2={recoit === "rien" ? SOL : SOUS.y + 18} couleur="rgba(200, 220, 240, 0.8)" coule />}
                {ouverture > 0 && ouverture <= AU_FILET && coule && <Goutte x={AMPOULE.x} y1={AMPOULE.y + 32} y2={recoit === "rien" ? SOL - 4 : SOUS.y + 14} couleur="rgba(200, 220, 240, 0.95)" cle={chute} />}
                {etat.flaque > 0 && <ellipse cx={AMPOULE.x} cy={SOL - 2} rx={Math.min(40, 8 + etat.flaque)} ry={3} fill={AQUEUSE} />}
                {etat.ampoule && etat.ecoule === 0 && (
                  <>
                    <Poussoir {...poussoirs.agiter} nom="Agiter l'ampoule" texte="Agiter"
                      appuie={() => { const suite = regles.geste(r, etat, { g: "agiter" }); agit({ g: "agiter" }); setMessage(suite.sansBouchon && !etat.sansBouchon ? "Tu agites l'ampoule sans son bouchon : le mélange gicle." : suite.saute && !etat.saute ? "La pression fait sauter le bouchon : du mélange s'échappe." : "Tu agites l'ampoule : les deux phases se mélangent, et la pression monte."); }} />
                    {etat.bouchon && <Poussoir {...poussoirs.degazer} nom="Dégazer : retourner l'ampoule et ouvrir le robinet" texte="Dégazer" appuie={() => { agit({ g: "degazer" }); setMessage("Ampoule retournée, robinet ouvert un instant : la pression retombe."); }} />}
                  </>
                )}

                {/* le bouchon, le bécher poubelle, le bécher du produit */}
                <Objet id="bouchon" nom={etat.bouchon ? "Bouchon, sur l'ampoule" : "Bouchon de l'ampoule"} {...objets.bouchon} l={44} h={44}>
                  <path className="pl-reflux-bouchon" d="M -10 -8 H 10 L 7 10 H -7 Z" />
                </Objet>
                <Objet id="poubelle" nom="Bécher poubelle" {...objets.poubelle} l={52} h={52}>
                  <Becher x={-25} y={-25} l={50} h={50} niveau={Math.min(0.9, poubelleRecu / 90)} couleur={AQUEUSE} />
                  <text y={37} textAnchor="middle">poubelle</text>
                </Objet>
                <Objet id="becher" nom="Bécher du produit" {...objets.becher} l={52} h={52}>
                  {etat.recolteAq > 0 && <rect x={-24} y={r2(24 - Math.min(44, etat.recolteAq * 0.8))} width={48} height={r2(Math.min(44, etat.recolteAq * 0.8))} fill={AQUEUSE} />}
                  {etat.recolteOrg > 0 && <rect x={-24} y={r2(24 - Math.min(44, dansBecher * 0.8))} width={48} height={r2(Math.min(44, etat.recolteOrg * 0.8))} fill={ORGANIQUE} />}
                  <Becher x={-25} y={-25} l={50} h={50} niveau={0} couleur={MELANGE} />
                </Objet>
              </>
            )}

            {/* le ballon : sur son valet, ou dans le montage */}
            {(surValet || poste === 2) && (
              <Objet id="ballon" nom={surValet ? "Ballon, sur son valet" : "Ballon, dans le montage"} {...objets.ballon} l={64} h={96} actif={!(poste === 1 && (compte || etat.pipette === "ballon"))}>
                <g transform={etat.tombe && !surValet ? "rotate(22)" : undefined}><Ballon volume={dansBallon(etat)} ponce={etat.ponce > 0 && !etat.ampoule} regime={poste !== 2 ? "arret" : bout && etat.ponce === 0 ? "fort" : ce} /></g>
              </Objet>
            )}

            {/* les cibles : où poser ce qu'on tient */}
            {poste === 1 && (
              <>
                <Cible id="toi" nom="toi" {...cibles.toi} r={34} accepte={PROTECTIONS.filter((p) => !etat.porte[p])} />
                <Cible id="tube" nom="le dessus de l'éprouvette" {...cibles.tube} r={22} accepte={verse ? [] : ["acide"]} />
                <Cible id="flacon-acide" nom={verse ? "son rangement" : "le flacon d'acide éthanoïque"} {...cibles["flacon-acide"]} r={26} accepte={verse ? ["acide"] : ["eprouvette"]} />
                <Cible id="alcool" nom="le bécher d'alcool benzylique" {...cibles.alcool} r={24} accepte={etat.pipette === "flacon" ? [] : ["pipette"]} />
                <Cible id="col" nom="le col du ballon" {...cibles.col} r={26} accepte={ballonOuvert(etat) ? ["eprouvette", "ponce", ...(compte ? [] : ["sulfurique"]), ...(etat.pipette === "ballon" ? [] : ["pipette"])] : []} />
                <Cible id="repos-pipette" nom="son rangement" {...cibles["repos-pipette"]} r={24} accepte={etat.pipette === "repos" ? [] : ["pipette"]} />
                <Cible id="repos-sulfurique" nom="son rangement" {...cibles["repos-sulfurique"]} r={22} accepte={compte ? ["sulfurique"] : []} />
              </>
            )}
            {poste === 2 && (
              <>
                <Cible id="socle" nom="le pied de la potence" {...cibles.socle} r={28} accepte={etat.pieces.support ? [] : ["support"]} />
                <Cible id="plateau" nom="le plateau du support élévateur" {...cibles.plateau} r={26} accepte={etat.pieces.chauffe ? [] : ["chauffe"]} />
                <Cible id="noix-b" nom="la potence, à la hauteur du col du ballon" {...cibles["noix-b"]} r={20} accepte={etat.pieces.pinceb ? [] : ["pince-1", "pince-2"]} />
                <Cible id="noix-r" nom="la potence, à la hauteur du réfrigérant" {...cibles["noix-r"]} r={20} accepte={etat.pieces.pincer ? [] : ["pince-1", "pince-2"]} />
                <Cible id="place-ballon" nom="le montage, au-dessus du chauffe-ballon" {...cibles["place-ballon"]} r={30} accepte={surValet ? ["ballon"] : []} />
                <Cible id="col-ballon" nom="le col du ballon" {...cibles["col-ballon"]} r={24} accepte={etat.pieces.refrigerant ? [] : ["refrigerant"]} />
                <Cible id="ratelier" nom="le râtelier des pinces" {...cibles.ratelier} r={30} accepte={["pinceb", "pincer"]} />
                <Cible id="repos-refrigerant" nom="son rangement" {...cibles["repos-refrigerant"]} r={30} accepte={etat.pieces.refrigerant ? ["refrigerant"] : []} />
                <Cible id="repos-chauffe" nom="son étagère" {...cibles["repos-chauffe"]} r={28} accepte={etat.pieces.chauffe ? ["chauffe"] : []} />
                <Cible id="repos-support" nom="son étagère" {...cibles["repos-support"]} r={28} accepte={etat.pieces.support ? ["support"] : []} />
                <Cible id="valet" nom="le valet du ballon" {...cibles.valet} r={30} accepte={surValet ? [] : ["ballon"]} />
              </>
            )}
            {poste === 3 && (
              <>
                <Cible id="entonnoir" nom="le haut de l'ampoule à décanter" {...cibles.entonnoir} r={26} accepte={[...(surValet && !etat.ampoule ? ["ballon"] : []), ...(etat.bouchon ? [] : ["bouchon"])]} />
                <Cible id="repos-bouchon" nom="la paillasse" {...cibles["repos-bouchon"]} r={24} accepte={etat.bouchon ? ["bouchon"] : []} />
                <Cible id="sous" nom="le dessous de l'ampoule" {...cibles.sous} r={30} accepte={[...(etat.poubelle ? [] : ["poubelle"]), ...(etat.becher === "sous" ? [] : ["becher"])]} />
                <Cible id="repos-poubelle" nom="la paillasse" {...cibles["repos-poubelle"]} r={28} accepte={etat.poubelle ? ["poubelle"] : []} />
                <Cible id="balance" nom="le plateau de la balance" {...cibles.balance} r={30} accepte={etat.becher === "balance" ? [] : ["becher"]} />
                <Cible id="repos-becher" nom="l'étagère" {...cibles["repos-becher"]} r={28} accepte={etat.becher === "paillasse" ? [] : ["becher"]} />
              </>
            )}
          </g>
        </Manipulation>
        <text x={8} y={VUE.y + VUE.h - 6} className="pl-fort">{etat.note !== null ? `Masse notée : ${nombre(etat.note, 2)} g` : ""}</text>
        {/* la main du guide, par-dessus tout le reste */}
        <Main indication={indication} />
      </Scene>
    </Etabli>
  );
}
