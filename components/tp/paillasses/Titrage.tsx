"use client";

// La paillasse Titrage (décision 0012). L'élève y fait les gestes du laboratoire, à la main : il prend le flacon pour
// rincer et remplir la burette, tourne le robinet (goutte à goutte, puis au filet), aspire à la pipette jusqu'au trait
// de jauge, ajoute l'indicateur, lance l'agitation, et lit le volume à la loupe. Rien n'écrit la mesure à sa place.
// Chaque geste passe par les règles (lib/commun/tp/paillasses/titrage.ts) ; la liste des gestes part au serveur.
// Le guide (lib/commun/tp/paillasses/titrage-guide.ts) dit le prochain geste ; ici, la main le montre à sa place dans le dessin.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { nombre } from "@/lib/commun/format";
import { AU_DESSUS, CAPACITE, GOUTTE, agite, dansErlenmeyer, droitesAutour, equivalenceReelle, conductivite, lecture, pHActuel, pHVu, regles, sondeTrempe, type EtatTitrage, type ReglagesTitrage } from "@/lib/commun/tp/paillasses/titrage";
import { AU_FILET, debitFilet, entreGouttes, pose, prochain, type CibleTitrage, type ObjetTitrage, type PasDuGuide, type PosesTitrage, type PoussoirTitrage } from "@/lib/commun/tp/paillasses/titrage-guide";
import type { GesteBrut, PropsPaillasse } from "@/lib/commun/tp/types";
import { INCOLORE, TEINTES_INDICATEUR, couleurIndicateur } from "../couleurs";
import { Afficheur, Becher, Burette, Cible, CompteGouttes, Erlenmeyer, Etabli, Filet, Flacon, Goutte, LoupeNiveau, Main, Manipulation, Molette, Objet, PipetteJaugee, Pissette, Poussoir, Releve, Scene, son, useGlisse, useGuide, useVersement, type Indication, type Point, type Vue } from "../kit";

// ---------- la place de chaque chose dans le dessin (360 de large) ----------
const VUE: Vue = { x: 0, y: -46, l: 360, h: 580 };
const BX = 108;                      // l'axe de la burette
const BURETTE = { y: 30, h: 300 };   // la burette, de son haut à son robinet
const ROBINET = 346;
const POINTE = 368;
const PLAQUE = 484;                  // le dessus de l'agitateur
const LOUPE = { x: 274, y: 58, r: 58 };
/** Pendant la lecture, le regard se rapproche de la loupe. */
const VUE_LOUPE: Vue = { x: LOUPE.x - 92, y: LOUPE.y - 80, l: 184, h: 150 };
const REPOS = {
  soude: { x: 226, y: 226 }, pipette: { x: 340, y: 212 }, pissette: { x: 220, y: 320 }, compte: { x: 254, y: 322 },
  erlenmeyer: { x: 296, y: 434 }, poubelle: { x: 227, y: 418 }, barreau: { x: 227, y: 466 },
};
const BECHER = { x: 262, y: 216, l: 50, h: 46 };  // le bécher de solution à titrer : il ne bouge pas
const VASE = { l: 78, h: 84 };                    // le récipient du titrage

interface Partie { etat: EtatTitrage; gestes: GesteBrut[] }
const CUMULS: Record<string, number> = { remplir: 30, aspirer: 30, vider: 30, eau: 120, couler: 30 };
/** Ajoute un geste à la liste. Les morceaux d'un même versement continu se regroupent : la liste reste courte, et rejouée elle donne le même état. */
function ajoute(gestes: GesteBrut[], g: GesteBrut): GesteBrut[] {
  const dernier = gestes[gestes.length - 1];
  const a = dernier?.v, b = g.v;
  const continu = dernier !== undefined && dernier.g === g.g && typeof a === "number" && typeof b === "number" && CUMULS[g.g] !== undefined
    && (g.g !== "couler" || (g.filet === true && dernier.filet === true)) && a + b <= CUMULS[g.g];
  return continu ? [...gestes.slice(0, -1), { ...dernier, v: Math.round((a + b) * 100) / 100 }] : [...gestes, g];
}

const ml = (x: number) => `${nombre(x, 2)} mL`;
/** Le niveau du liquide dans le récipient du titrage, de 0 à 1, pour un volume en millilitres. */
const niveauPour = (volume: number) => (volume <= 0 ? 0 : Math.min(0.95, 0.14 + volume / 105));
/** Les graduations du bécher du titrage, en millilitres : elles servent à doser l'eau distillée. */
const GRADUATIONS = [10, 20, 30, 40, 50, 60, 70, 80];
/** Le nom de chaque objet, et le pronom qui va avec. */
const OBJETS: Record<string, [string, string]> = {
  soude: ["le flacon", "le"], poubelle: ["le bécher poubelle", "le"], erlenmeyer: ["le récipient du titrage", "le"], pipette: ["la pipette", "la"],
  pissette: ["la pissette", "la"], compte: ["le flacon d'indicateur", "le"], barreau: ["le barreau aimanté", "le"], sonde: ["la sonde", "la"],
};

// ---------- la courbe des relevés ----------

/** La grandeur relevée par l'appareil : son nom sur l'axe, le bas et le haut de l'axe, l'écart entre deux graduations. `droites` : la courbe se lit avec deux droites. */
interface Grandeur { nom: string; bas: number; haut: number; pas: number; droites?: boolean }
const AXE_PH: Grandeur = { nom: "pH", bas: 0, haut: 14, pas: 2 };
/** L'axe d'une conductivité, en µS/cm : resserré sur les valeurs relevées, pour que la cassure se voie bien. */
function axeConductivite(releves: { y: number }[]): Grandeur {
  const valeurs = releves.length ? releves.map((p) => p.y) : [0, 100];
  const min = Math.min(...valeurs), max = Math.max(...valeurs);
  const etendue = Math.max(20, max - min);
  const pas = [5, 10, 20, 50, 100, 200, 500, 1000].find((x) => (etendue * 1.2) / x <= 7) ?? 2000;
  return { nom: "σ (µS/cm)", bas: Math.max(0, Math.floor((min - etendue * 0.1) / pas) * pas), haut: Math.ceil((max + etendue * 0.1) / pas) * pas, pas, droites: true };
}

interface PropsCourbe { releves: { V: number; y: number }[]; repere: number; place: (V: number) => void; grandeur: Grandeur; guide: Indication | null }

// La courbe des relevés, avec un repère que l'élève glisse jusqu'à l'équivalence : le milieu du saut de pH, ou la
// rupture de pente de la conductivité. Pour la conductivité, la courbe trace les deux droites qui passent au mieux par
// les points voisins du repère, de chaque côté : l'élève cherche la place où elles se croisent sur le repère.
function Courbe(props: PropsCourbe) {
  return (
    <Scene vue={{ x: 0, y: 0, l: 360, h: 470 }} nom={`La courbe : ${props.grandeur.nom} en fonction du volume de solution titrante versé`}>
      <TraceCourbe {...props} />
    </Scene>
  );
}
function TraceCourbe({ releves, repere, place, grandeur, guide }: PropsCourbe) {
  const cadre = { x: 48, y: 34, l: 292, h: 366 };
  const decoupe = useId();
  const max = Math.max(20, Math.ceil((Math.max(0, ...releves.map((p) => p.V)) + 1) / 5) * 5);
  const X = (V: number) => cadre.x + (V / max) * cadre.l;
  const Y = (y: number) => cadre.y + cadre.h - ((Math.max(grandeur.bas, Math.min(y, grandeur.haut)) - grandeur.bas) / (grandeur.haut - grandeur.bas)) * cadre.h;
  /** la place d'une valeur sur l'axe, même hors du cadre : pour tracer une droite d'un bord à l'autre */
  const Ylibre = (y: number) => cadre.y + cadre.h - ((y - grandeur.bas) / (grandeur.haut - grandeur.bas)) * cadre.h;
  const points = [...releves].sort((a, b) => a.V - b.V);
  const ici = (x: number) => Math.round(Math.max(0, Math.min(max, ((x - cadre.x) / cadre.l) * max)) * 20) / 20;
  const glisse = useGlisse({ depart: (p) => place(ici(p.x)), bouge: (p) => place(ici(p.x)) });
  const droites = grandeur.droites ? droitesAutour(releves, repere) : null;
  const graduations = Array.from({ length: Math.round((grandeur.haut - grandeur.bas) / grandeur.pas) + 1 }, (_, i) => grandeur.bas + i * grandeur.pas);
  return (
    <>
      {graduations.map((y) => (
        <g key={y}><line x1={cadre.x} x2={cadre.x + cadre.l} y1={Y(y)} y2={Y(y)} stroke="var(--filet)" /><text x={cadre.x - 6} y={Y(y) + 3} textAnchor="end">{y}</text></g>
      ))}
      {Array.from({ length: max / 5 + 1 }, (_, i) => i * 5).map((V) => (
        <g key={V}><line x1={X(V)} x2={X(V)} y1={cadre.y} y2={cadre.y + cadre.h} stroke="var(--filet)" /><text x={X(V)} y={cadre.y + cadre.h + 13} textAnchor="middle">{V}</text></g>
      ))}
      <text x={4} y={cadre.y - 14} className="pl-fort">{grandeur.nom}</text>
      <text x={cadre.x + cadre.l} y={cadre.y + cadre.h + 28} textAnchor="end" className="pl-fort">volume versé (mL)</text>
      {points.length > 1 && <polyline points={points.map((p) => `${X(p.V).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ")} fill="none" stroke="var(--cuivre)" strokeWidth={1.4} />}
      {/* les deux droites, d'un bord à l'autre du cadre */}
      {droites && (
        <g aria-hidden="true">
          <defs><clipPath id={decoupe}><rect x={cadre.x} y={cadre.y} width={cadre.l} height={cadre.h} /></clipPath></defs>
          <g clipPath={`url(#${decoupe})`} className="pl-droites">
            {[droites.avant, droites.apres].map((d, i) => d && <line key={i} x1={X(0)} y1={Ylibre(d.b)} x2={X(max)} y2={Ylibre(d.a * max + d.b)} />)}
          </g>
        </g>
      )}
      {points.map((p) => <circle key={p.V} cx={X(p.V)} cy={Y(p.y)} r={2.6} fill="var(--encre)" />)}
      <g role="slider" tabIndex={0} aria-label="Repère sur la courbe" aria-valuemin={0} aria-valuemax={max} aria-valuenow={repere} aria-valuetext={ml(repere)} {...glisse}
        onKeyDown={(e) => { const pas = e.key === "ArrowRight" ? 0.05 : e.key === "ArrowLeft" ? -0.05 : e.key === "PageUp" ? 1 : e.key === "PageDown" ? -1 : 0; if (pas) { e.preventDefault(); place(Math.round(Math.max(0, Math.min(max, repere + pas)) * 20) / 20); } }}>
        <rect x={cadre.x} y={cadre.y} width={cadre.l} height={cadre.h} fill="transparent" />
        <line x1={X(repere)} x2={X(repere)} y1={cadre.y} y2={cadre.y + cadre.h} stroke="var(--sable)" strokeWidth={1.6} strokeDasharray="5 4" />
        <rect x={X(repere) - 9} y={cadre.y - 14} width={18} height={14} rx={4} fill="var(--sable)" />
      </g>
      <text x={180} y={448} textAnchor="middle" className="pl-fort" style={{ fontSize: 13 }}>Repère : V = {ml(repere)}</text>
      {droites && <text x={180} y={462} textAnchor="middle">Les deux droites passent par les points voisins du repère.</text>}
      {/* la main du guide montre la poignée du repère : à l'élève de trouver où le poser */}
      <Main indication={guide && { ...guide, main: { geste: "montrer", ou: { x: X(repere) + 3, y: cadre.y + 4 } } }} />
    </>
  );
}

// ---------- la paillasse ----------

export default function Titrage({ reglages: r, protocole, attente, fini }: PropsPaillasse<ReglagesTitrage>) {
  const [partie, setPartie] = useState<Partie>(() => ({ etat: regles.depart(r), gestes: [] }));
  const [message, setMessage] = useState("Prends un objet en le glissant, ou touche-le puis touche l'endroit où le poser.");
  const [ouverture, setOuverture] = useState(0);
  /** les outils posés : le flacon au-dessus de la burette, la pissette ou le compte-gouttes au-dessus du récipient */
  const [poses, setPoses] = useState<PosesTitrage>({ flacon: false, outil: null });
  const [chute, setChute] = useState(0);
  const [jet, setJet] = useState<"soude" | "pipette" | "pissette" | null>(null);
  const [saisie, setSaisie] = useState(false);
  const [courbe, setCourbe] = useState(false);
  const [repere, setRepere] = useState(10);
  const guide = useGuide();
  const versement = useVersement();
  const { etat, gestes } = partie;
  /** le suivi par un appareil à sonde (pH-mètre ou conductimètre) se fait dans un bécher, et finit par une courbe */
  const sonde = r.suivi !== "indicateur";
  const conducti = r.suivi === "conductimetre";
  const appareil = conducti ? "conductimètre" : "pH-mètre";
  const leVase = sonde ? "le bécher" : "l'erlenmeyer";
  const LeVase = sonde ? "Le bécher" : "L'erlenmeyer";

  const agit = useCallback((g: GesteBrut) => setPartie((p) => ({ etat: regles.geste(r, p.etat, g), gestes: ajoute(p.gestes, g) })), [r]);

  // ----- le robinet : tant qu'il est ouvert, la burette coule -----
  const vide = useRef(false);
  useEffect(() => { vide.current = etat.volume <= 0; });
  useEffect(() => {
    if (ouverture <= 0) return;
    let image = 0;
    let avant = performance.now();
    let attenteGoutte = entreGouttes(ouverture) * 0.6;
    let filet = 0;
    const tourne = (maintenant: number) => {
      const dt = Math.min(0.1, (maintenant - avant) / 1000);
      avant = maintenant;
      if (!vide.current) {
        if (ouverture <= AU_FILET) {
          attenteGoutte += dt;
          if (attenteGoutte >= entreGouttes(ouverture)) { attenteGoutte = 0; agit({ g: "couler", v: GOUTTE }); setChute((n) => n + 1); son("goutte"); }
        } else {
          filet += debitFilet(ouverture) * dt;
          if (filet >= 0.03) { const v = Math.floor(filet * 100) / 100; filet -= v; agit({ g: "couler", v, filet: true }); }
        }
      }
      image = requestAnimationFrame(tourne);
    };
    image = requestAnimationFrame(tourne);
    return () => cancelAnimationFrame(image);
  }, [ouverture, agit]);

  const tourneRobinet = (o: number) => {
    setOuverture(o);
    // le robinet se referme : l'ajout est fini, l'appareil garde le point relevé
    if (o === 0) { if (ouverture > 0) agit({ g: "pause" }); setMessage("Robinet fermé."); return; }
    if (etat.volume <= 0) { setMessage("Le robinet est ouvert, mais la burette est vide."); return; }
    const ou = etat.dessous === "rien" ? "sur la paillasse : rien n'est posé dessous" : etat.dessous === "poubelle" ? "dans le bécher poubelle" : `dans ${leVase}`;
    setMessage(`La solution titrante coule ${o <= AU_FILET ? "goutte à goutte" : "au filet"}, ${ou}.`);
  };

  // ----- les positions qui dépendent de l'état -----
  const sousBurette = etat.dessous === "erlenmeyer";
  const vaseX = sousBurette ? BX : REPOS.erlenmeyer.x;
  const vaseHaut = (sousBurette ? PLAQUE : 476) - VASE.h;
  const poubelleX = etat.dessous === "poubelle" ? BX : REPOS.poubelle.x;
  const poubelleHaut = (etat.dessous === "poubelle" ? PLAQUE : 440) - 44;
  const niveauVase = niveauPour(dansErlenmeyer(etat));
  const profondeur = niveauVase * VASE.h * 0.7;
  const surface = vaseHaut + VASE.h - profondeur;
  const pH = pHVu(r, etat);
  const couleurVase = !sonde && etat.gouttes > 0 ? couleurIndicateur(r.indicateur, pH) : INCOLORE;
  const avantEquivalence = etat.prise > 0 && etat.verse < equivalenceReelle(r, etat);
  const eclat = !sonde && etat.gouttes > 0 && sousBurette && avantEquivalence;
  const resteAvant = Math.max(0.05, equivalenceReelle(r, etat) - etat.verse);
  /** au filet, la tache de couleur s'étale d'autant plus que l'équivalence approche */
  const tache = Math.min(VASE.l * 0.36, 5 + 14 / (resteAvant + 0.35));
  const niveauBurette = etat.volume > 0 ? lecture(etat) : null;
  const loupePipette = etat.pipette === "becher" || (etat.dansPipette > 0 && etat.pipette !== "repos");
  const pipetteIci = etat.pipette === "becher" ? { x: BECHER.x + BECHER.l / 2, y: BECHER.y + BECHER.h - 8 - 124 } : etat.pipette === "erlenmeyer" ? { x: vaseX, y: vaseHaut + 6 - 124 } : { x: REPOS.pipette.x, y: REPOS.pipette.y - 62 };
  const outilsPossibles = !sousBurette;  // on prépare le récipient sur la paillasse, puis on le glisse sous la burette
  /** où se trouve chaque objet, chaque cible, chaque poussoir : le dessin et la main du guide lisent les mêmes places */
  const objets: Record<ObjetTitrage, Point> = {
    soude: poses.flacon ? { x: BX + 34, y: BURETTE.y - 34 } : REPOS.soude,
    poubelle: { x: poubelleX, y: poubelleHaut + 22 },
    erlenmeyer: { x: vaseX, y: vaseHaut + VASE.h / 2 },
    pipette: { x: pipetteIci.x, y: pipetteIci.y + 62 },
    pissette: poses.outil === "pissette" ? { x: vaseX + 40, y: vaseHaut + 4 } : REPOS.pissette,
    compte: poses.outil === "compte" ? { x: vaseX, y: vaseHaut - 26 } : REPOS.compte,
    barreau: REPOS.barreau,
    sonde: etat.sonde ? { x: vaseX + 22, y: vaseHaut - 6 } : REPOS.compte,
  };
  const cibles: Record<CibleTitrage, Point> = {
    burette: { x: BX, y: BURETTE.y - 8 }, dessous: { x: BX, y: PLAQUE - 40 }, becher: { x: BECHER.x + BECHER.l / 2, y: BECHER.y + 14 },
    vase: { x: vaseX, y: vaseHaut + 6 }, sonde: REPOS.compte,
    "rangement-soude": REPOS.soude, "rangement-pipette": REPOS.pipette, "rangement-pissette": REPOS.pissette, "rangement-compte": REPOS.compte,
    "rangement-erlenmeyer": REPOS.erlenmeyer, "rangement-poubelle": REPOS.poubelle,
  };
  const poussoirs: Record<PoussoirTitrage, Point> = {
    verser: { x: BX + 54, y: BURETTE.y + 20 }, aspirer: { x: pipetteIci.x + 40, y: pipetteIci.y + 34 }, redescendre: { x: pipetteIci.x + 40, y: pipetteIci.y + 84 },
    vider: { x: pipetteIci.x + 40, y: pipetteIci.y + 70 }, eau: { x: vaseX + 40, y: vaseHaut - 58 }, goutte: { x: vaseX + 40, y: vaseHaut - 26 },
  };

  // ----- prendre et poser -----
  const poser = (objet: string, cible: string) => {
    const suite = pose(r, etat, poses, objet, cible);
    suite.gestes.forEach(agit);
    setPoses(suite.poses);
    // avec le guide, c'est lui qui dit le geste suivant : le message s'en tient à ce qui vient de se passer
    if (suite.message) setMessage(suite.conseil && !guide.actif ? `${suite.message} ${suite.conseil}` : suite.message);
    if (objet === "pissette" && cible === "sonde") son("goutte");
  };
  const prise = (objet: string, ou: string[]) => {
    const [nom, pronom] = OBJETS[objet] ?? ["cet objet", "le"];
    const quoi = objet === "erlenmeyer" ? leVase : nom;
    setMessage(ou.length > 1 ? `Tu tiens ${quoi}. Les anneaux verts montrent où ${pronom} poser.` : ou.length === 1 ? `Tu tiens ${quoi}. Un anneau vert montre où ${pronom} poser.`
      : sousBurette && objet !== "poubelle" ? `Tu tiens ${quoi}. ${LeVase} est sous la burette : remets-le d'abord sur la paillasse pour le préparer.`
      : `Tu tiens ${quoi}, mais sa place est prise pour l'instant.`);
  };
  const rate = (objet: string, p: Point) => {
    const presDuVase = Math.hypot(p.x - cibles.vase.x, p.y - cibles.vase.y) < 70;
    const presDuDessous = Math.hypot(p.x - cibles.dessous.x, p.y - cibles.dessous.y) < 70;
    if (sousBurette && presDuVase && objet !== "erlenmeyer" && objet !== "poubelle" && objet !== "soude") setMessage(`${LeVase} est sous la burette : remets-le d'abord sur la paillasse pour le préparer.`);
    else if ((objet === "erlenmeyer" || objet === "poubelle") && presDuDessous && etat.dessous !== "rien") setMessage("La place sous la burette est déjà prise : libère-la d'abord.");
    else setMessage("Rien ne se pose à cet endroit. Reprends l'objet : un anneau vert montre où il va.");
  };

  const recommence = () => {
    agit({ g: "recommencer" });
    setOuverture(0);
    setPoses((p) => ({ ...p, outil: null }));
    setSaisie(false);
    setCourbe(false);
    setMessage(`Nouveau titrage : ${leVase} est lavé, la burette reste comme elle est.`);
  };
  const toutRecommencer = () => {
    setPartie({ etat: regles.depart(r), gestes: [] });
    setOuverture(0);
    setPoses({ flacon: false, outil: null });
    setSaisie(false);
    setCourbe(false);
    setMessage("La paillasse est remise comme au début.");
  };

  // ----- le guide : le prochain geste, et où la main le montre -----
  const pas: PasDuGuide | null = guide.actif ? prochain(r, etat, { ...poses, robinet: ouverture, saisie, courbe }) : null;
  const montre: Record<"loupe" | "couleur" | "appareil", Point> = {
    loupe: { x: LOUPE.x - 18, y: LOUPE.y + LOUPE.r + 3 },
    couleur: { x: vaseX + 33, y: Math.min(surface + 3, vaseHaut + VASE.h - 8) },
    appareil: { x: 240, y: PLAQUE },
  };
  const laMain = (p: PasDuGuide): Indication["main"] => {
    switch (p.geste) {
      case "glisser": return { geste: "glisser", de: objets[p.objet], vers: cibles[p.cible] };
      case "maintenir": case "toucher": return { geste: p.geste, ou: poussoirs[p.poussoir] };
      case "tourner": return p.molette === "robinet"
        ? { geste: "tourner", ou: { x: BX, y: ROBINET }, de: 90 + ouverture * 90, a: 90 + p.vers * 90, r: 32 }
        : { geste: "tourner", ou: { x: 188, y: PLAQUE + 12 }, de: -135 + etat.agitation * 54, a: -135 + p.vers * 54, r: 27 };
      // le repère de la courbe se montre dans le dessin de la courbe ; pendant la saisie, la loupe prend toute la vue : rien ne doit la cacher
      case "montrer": return p.quoi === "repere" || saisie ? undefined : { geste: "montrer", ou: montre[p.quoi] };
      default: return undefined;
    }
  };
  const indication: Indication | null = pas && { cle: pas.cle, texte: pas.texte, etape: pas.etape, main: laMain(pas), appel: pas.geste === "bouton" && pas.bouton === "fini" };
  /** la touche du bas que le guide met en avant */
  const vise = (bouton: string) => (pas?.geste === "bouton" && pas.bouton === bouton ? " pl-vise" : "");

  const outils = saisie ? (
    <Releve nom="Volume lu sur la burette, à l'équivalence" unite="mL" exemple="12,35" annule={() => setSaisie(false)}
      valide={(v) => { agit({ g: "noter", v }); setSaisie(false); setMessage(`Volume noté pour l'équivalence : ${ml(v)}.`); son("bip"); }} />
  ) : courbe ? (
    <>
      <button type="button" className="btn btn-ligne" onClick={() => setCourbe(false)}>Revenir à la paillasse</button>
      <button type="button" className="btn btn-cuivre" onClick={() => { agit({ g: "noter", v: repere }); setCourbe(false); setMessage(`Volume noté pour l'équivalence : ${ml(repere)}.`); son("bip"); }}>Noter ce volume</button>
    </>
  ) : (
    <>
      <button type="button" className={`btn btn-ligne${vise("recommencer")}`} onClick={recommence}>Recommencer le titrage</button>
      {sonde
        ? <button type="button" className={`btn btn-ligne${vise("courbe")}`} disabled={etat.releves.length < 2} onClick={() => { tourneRobinet(0); setRepere(Math.round((etat.verse / 2) * 20) / 20); setCourbe(true); }}>Ouvrir la courbe</button>
        : <button type="button" className={`btn btn-ligne${vise("noter")}`} onClick={() => { tourneRobinet(0); setSaisie(true); }}>Noter le volume</button>}
    </>
  );

  return (
    <Etabli titre={conducti ? "Conductimétrie" : sonde ? "pH-métrie" : "Titrage"} protocole={protocole} message={message} attente={attente} fini={() => fini(gestes)} recommence={toutRecommencer} outils={outils} saisie={saisie} indication={indication}>
      {courbe ? <Courbe releves={etat.releves} repere={repere} place={setRepere} grandeur={conducti ? axeConductivite(etat.releves) : AXE_PH} guide={indication} /> : (
        <Scene vue={saisie ? VUE_LOUPE : VUE} nom="La paillasse du titrage : une burette sur son support, un agitateur, les flacons et la verrerie">
          <Manipulation pose={poser} prise={prise} rate={rate}>
            {/* le support, la burette, son robinet et sa pointe */}
            <path className="pl-verre" d={`M 30 ${PLAQUE + 24} V 12 M 30 120 H ${BX - 8} M 30 240 H ${BX - 8}`} opacity={0.45} />
            <Burette x={BX} y={BURETTE.y} h={BURETTE.h} lecture={niveauBurette} couleur={INCOLORE} />
            <path className="pl-verre" d={`M ${BX - 6} ${BURETTE.y + BURETTE.h} L ${BX - 2.2} ${ROBINET - 8} V ${POINTE - 6} L ${BX - 1} ${POINTE} M ${BX + 6} ${BURETTE.y + BURETTE.h} L ${BX + 2.2} ${ROBINET - 8} V ${POINTE - 6} L ${BX + 1} ${POINTE}`} />
            <text x={BX - 16} y={ROBINET + 3} textAnchor="end">{ouverture === 0 ? "fermé" : ouverture <= AU_FILET ? "goutte à goutte" : "au filet"}</text>
            {/* le robinet : on pose le doigt dessus et on tourne ; au clavier, les flèches, « G » pour une goutte, « F » pour un millilitre au filet */}
            <Molette x={BX} y={ROBINET} r={26} valeur={ouverture} min={0} max={1} pas={0.05} de={90} a={180} change={tourneRobinet} nom="Robinet de la burette"
              texte={ouverture === 0 ? "fermé" : ouverture <= AU_FILET ? "ouvert, goutte à goutte" : "ouvert, au filet"}
              touches={(e) => {
                if (e.key === "g" || e.key === "G") { agit({ g: "couler", v: GOUTTE }); setChute((n) => n + 1); son("goutte"); }
                if (e.key === "f" || e.key === "F") { agit({ g: "couler", v: 1, filet: true }); agit({ g: "pause" }); }
              }}
              dessin={(angle) => (
                <g transform={`translate(${BX} ${ROBINET})`}>
                  <g transform={`rotate(${angle})`}><rect x={-3} y={-25} width={6} height={25} rx={3} fill="var(--cuivre)" /><circle cy={-25} r={5.5} fill="var(--cuivre)" /></g>
                  <circle r={6.5} fill="var(--carte-2)" stroke="var(--encre)" strokeWidth={1.4} />
                </g>
              )} />
            {ouverture > AU_FILET && etat.volume > 0 && <Filet x={BX} y1={POINTE} y2={etat.dessous === "erlenmeyer" ? surface : etat.dessous === "poubelle" ? PLAQUE - 8 : PLAQUE} couleur="rgba(200, 220, 240, 0.8)" coule />}
            {ouverture > 0 && ouverture <= AU_FILET && <Goutte x={BX} y1={POINTE + 2} y2={etat.dessous === "erlenmeyer" ? surface : PLAQUE - 6} couleur="rgba(200, 220, 240, 0.95)" cle={chute} />}

            {/* l'agitateur magnétique et sa molette */}
            <rect x={48} y={PLAQUE} width={162} height={24} rx={5} fill="var(--carte-2)" stroke="var(--encre)" strokeWidth={1.2} />
            <text x={56} y={PLAQUE + 15}>agitateur</text>
            <Molette x={188} y={PLAQUE + 12} r={24} valeur={etat.agitation} min={0} max={5} pas={1} nom="Vitesse de l'agitateur" texte={etat.agitation === 0 ? "arrêté" : `vitesse ${etat.agitation}`}
              change={(v) => { agit({ g: "agiter", v }); setMessage(v === 0 ? "Agitateur arrêté." : etat.barreau && sousBurette ? "L'agitateur tourne : le mélange est homogène." : "L'agitateur tourne, mais il n'entraîne rien : il faut le barreau aimanté dans le récipient, posé dessus."); }} />

            {/* la loupe : la burette, ou la pipette quand on prélève */}
            {loupePipette
              ? <LoupeNiveau x={LOUPE.x} y={LOUPE.y} r={LOUPE.r} valeur={etat.dansPipette} pas={100} majeur={100} parUnite={110} monte repere={r.Va} couleur={INCOLORE} liquide={etat.dansPipette > 0} nom="Loupe sur la pipette, près du trait de jauge" />
              : <LoupeNiveau x={LOUPE.x} y={LOUPE.y} r={LOUPE.r} valeur={niveauBurette ?? CAPACITE} pas={0.1} majeur={1} parUnite={50} de={0} a={CAPACITE} couleur={INCOLORE} liquide={niveauBurette !== null} nom="Loupe sur la burette, près du niveau du liquide" />}
            {/* tant que le zéro est dans la loupe, l'élève voit lui-même où est le niveau ; plus haut, la loupe ne montre que du liquide */}
            <text x={LOUPE.x} y={LOUPE.y - LOUPE.r - 7} textAnchor="middle" className="pl-fort">{loupePipette ? "Loupe : la pipette" : niveauBurette !== null && niveauBurette < -1.1 ? "Loupe : au-dessus du zéro" : "Loupe : la burette"}</text>
            {/* avec le guide, pendant la lecture : un chevron montre le bas du ménisque */}
            {saisie && pas && <path className="pl-main-pointe" d={`M ${LOUPE.x - 40} ${LOUPE.y - 5} l 9 5 l -9 5`} aria-hidden="true" />}

            {/* le bécher de solution à titrer : il reste à sa place */}
            <Becher x={BECHER.x} y={BECHER.y} l={BECHER.l} h={BECHER.h} niveau={0.7} couleur={INCOLORE} />
            {/* la pipette portée au-dessus du récipient passe devant ce nom : il s'efface le temps du geste */}
            {etat.pipette !== "erlenmeyer" && <text x={BECHER.x + BECHER.l / 2} y={BECHER.y + BECHER.h + 11} textAnchor="middle">{r.noms.titree}</text>}

            {/* le nom de ce qui ne porte pas d'étiquette */}
            {etat.pipette === "repos" && <text x={REPOS.pipette.x - 3} y={REPOS.pipette.y + 76} textAnchor="middle">pipette<tspan x={REPOS.pipette.x - 3} dy={9.5}>{nombre(r.Va, 1)} mL</tspan></text>}
            {!etat.barreau && <text x={REPOS.barreau.x} y={REPOS.barreau.y - 10} textAnchor="middle">barreau aimanté</text>}
            {!sonde && !sousBurette && <text x={REPOS.erlenmeyer.x} y={488} textAnchor="middle">erlenmeyer</text>}

            {/* le pH-mètre ou le conductimètre */}
            {sonde && <Afficheur x={226} y={PLAQUE - 2} l={128} h={28} nom={conducti ? "Conductimètre" : "pH-mètre"} unite={conducti ? "µS/cm" : "pH"} eteint={!etat.sonde}
              valeur={!sondeTrempe(r, etat) ? "air" : conducti ? nombre(conductivite(r, etat), 0) : nombre(pHActuel(r, etat), 2)} />}

            {/* les cibles : où poser ce qu'on tient */}
            <Cible id="burette" nom="le haut de la burette" {...cibles.burette} r={22} accepte={poses.flacon ? [] : ["soude"]} />
            <Cible id="dessous" nom="l'agitateur, sous la burette" {...cibles.dessous} r={34} accepte={etat.dessous === "rien" ? ["erlenmeyer", "poubelle"] : []} />
            <Cible id="becher" nom="le bécher de solution" {...cibles.becher} r={24} accepte={etat.pipette === "becher" ? [] : ["pipette"]} />
            <Cible id="vase" nom={sonde ? "le bécher du titrage" : "l'erlenmeyer"} {...cibles.vase} r={30}
              accepte={outilsPossibles ? [...(etat.pipette === "erlenmeyer" ? [] : ["pipette"]), ...(poses.outil === "pissette" ? [] : ["pissette"]), ...(poses.outil === "compte" || sonde ? [] : ["compte"]), ...(etat.barreau ? [] : ["barreau"]), ...(sonde && !etat.sonde ? ["sonde"] : [])] : (etat.barreau ? [] : ["barreau"])} />
            {sonde && !etat.sonde && <Cible id="sonde" nom={`la sonde du ${appareil}, pour la rincer`} {...cibles.sonde} r={22} accepte={["pissette"]} />}
            <Cible id="rangement-soude" nom="son rangement" {...cibles["rangement-soude"]} r={26} accepte={poses.flacon ? ["soude"] : []} />
            <Cible id="rangement-pipette" nom="son rangement" {...cibles["rangement-pipette"]} r={24} accepte={etat.pipette !== "repos" ? ["pipette"] : []} />
            <Cible id="rangement-pissette" nom="son rangement" {...cibles["rangement-pissette"]} r={22} accepte={poses.outil === "pissette" ? ["pissette"] : []} />
            <Cible id="rangement-compte" nom="son rangement" {...cibles["rangement-compte"]} r={22} accepte={poses.outil === "compte" ? ["compte"] : etat.sonde ? ["sonde"] : []} />
            <Cible id="rangement-erlenmeyer" nom="la paillasse" {...cibles["rangement-erlenmeyer"]} r={32} accepte={sousBurette ? ["erlenmeyer"] : []} />
            <Cible id="rangement-poubelle" nom="la paillasse" {...cibles["rangement-poubelle"]} r={26} accepte={etat.dessous === "poubelle" ? ["poubelle"] : []} />

            {/* le bécher poubelle */}
            <Objet id="poubelle" nom="Bécher poubelle" {...objets.poubelle} l={52} h={50}>
              <Becher x={-23} y={-22} l={46} h={44} niveau={0.18} couleur={INCOLORE} />
              <text y={6} textAnchor="middle">poubelle</text>
            </Objet>

            {/* le récipient du titrage, avec ce qu'il contient */}
            <Objet id="erlenmeyer" nom={sonde ? "Bécher du titrage" : "Erlenmeyer"} {...objets.erlenmeyer} l={VASE.l + 4} h={VASE.h + 4}>
              <g transform={`translate(${-vaseX} ${-(vaseHaut + VASE.h / 2)})`}>
                {sonde
                  ? <Becher x={vaseX - VASE.l / 2 + 6} y={vaseHaut + 8} l={VASE.l - 12} h={VASE.h - 8} niveau={niveauVase} couleur={couleurVase} />
                  : <Erlenmeyer x={vaseX} y={vaseHaut} l={VASE.l} h={VASE.h} niveau={niveauVase} couleur={couleurVase} />}
                {/* le bécher est gradué : de quoi doser l'eau distillée */}
                {sonde && GRADUATIONS.map((volume) => {
                  const y = Math.round((vaseHaut + 8 + (VASE.h - 8) * (1 - niveauPour(volume))) * 10) / 10;
                  const chiffre = volume % 20 === 0;
                  return (
                    <g key={volume} aria-hidden="true">
                      <line x1={vaseX - VASE.l / 2 + 6} x2={vaseX - VASE.l / 2 + (chiffre ? 15 : 11)} y1={y} y2={y} stroke="var(--discret)" strokeWidth={0.8} />
                      {chiffre && <text x={vaseX - VASE.l / 2 + 17} y={y + 2.4} style={{ fontSize: 6.5 }}>{volume}</text>}
                    </g>
                  );
                })}
                {eclat && (ouverture > AU_FILET
                  ? <ellipse cx={vaseX} cy={surface + 1 + Math.min(tache * 0.42, (profondeur - 2) / 2)} rx={tache} ry={Math.max(1.5, Math.min(tache * 0.42, (profondeur - 2) / 2))} fill={TEINTES_INDICATEUR[r.indicateur].couleurs[1]} opacity={0.75} />
                  : <ellipse key={chute} className="pl-eclat" cx={vaseX} cy={surface + 4} rx={8} ry={3.5} fill={TEINTES_INDICATEUR[r.indicateur].couleurs[1]} style={{ animationDuration: `${Math.min(2.6, 0.3 + 1.1 / resteAvant).toFixed(2)}s` }} />)}
                {etat.barreau && <rect className={agite(etat) ? "pl-barreau pl-barreau-tourne" : "pl-barreau"} x={vaseX - 9} y={vaseHaut + VASE.h - 9} width={18} height={5} rx={2.5} fill="#F3ECE6" />}
                {etat.sonde && <path d={`M ${vaseX + 22} ${vaseHaut - 12} V ${vaseHaut + VASE.h - 22}`} stroke="var(--sable)" strokeWidth={5} strokeLinecap="round" />}
              </g>
            </Objet>

            {/* le barreau aimanté, dans sa coupelle */}
            {!etat.barreau && (
              <Objet id="barreau" nom="Barreau aimanté" {...objets.barreau} l={48} h={26}>
                <path className="pl-verre" d="M -16 4 Q 0 12 16 4" />
                <rect x={-9} y={-3} width={18} height={5} rx={2.5} fill="#F3ECE6" />
              </Objet>
            )}

            {/* le flacon de solution titrante : sur l'étagère, ou penché au-dessus de la burette */}
            <Objet id="soude" nom={`Flacon de ${r.noms.titrante.toLowerCase()}`} {...objets.soude} l={50} h={76}>
              <g transform={poses.flacon ? "rotate(-112)" : undefined}><Flacon x={0} y={-36} l={52} h={72} couleur={INCOLORE} etiquette={r.noms.etiquette ?? r.noms.titrante} sous={`${nombre(r.Cb, r.Cb < 0.05 ? 4 : 3)} mol/L`} /></g>
            </Objet>
            {poses.flacon && (
              <>
                {jet === "soude" && <Filet x={BX} y1={BURETTE.y - 26} y2={BURETTE.y + 6} couleur="rgba(200, 220, 240, 0.8)" coule />}
                {/* le geste ralentit de lui-même quand le niveau approche du zéro, comme la main qui redresse le flacon */}
                <Poussoir {...poussoirs.verser} nom="Verser dans la burette" texte="Verser"
                  maintien={versement({
                    debit: etat.volume < 21 ? 5 : etat.volume < 24.6 ? 2 : 0.8, pas: 1, debut: () => setJet("soude"), fin: () => setJet(null),
                    verse: (v) => { agit({ g: "remplir", v }); if (etat.volume + v > CAPACITE + AU_DESSUS) setMessage("La burette est pleine à ras bord : ce que tu verses maintenant coule sur la paillasse."); },
                  })} />
              </>
            )}

            {/* la pipette jaugée et sa propipette */}
            <Objet id="pipette" nom="Pipette jaugée" {...objets.pipette} l={40} h={130}>
              <rect x={-4} y={-76} width={8} height={16} rx={3} fill="var(--brique)" />
              <PipetteJaugee x={0} y={-62} h={124} remplissage={etat.dansPipette / r.Va} couleur={INCOLORE} />
            </Objet>
            {etat.pipette === "becher" && (
              <>
                {/* on aspire vite, puis doucement près du trait de jauge */}
                <Poussoir {...poussoirs.aspirer} nom="Aspirer dans la pipette" texte="Aspirer"
                  maintien={versement({ debit: etat.dansPipette < r.Va - 1.5 ? 1.6 : 0.5, pas: 0.5, verse: (v) => agit({ g: "aspirer", v }) })} />
                <Poussoir {...poussoirs.redescendre} nom="Laisser redescendre le liquide de la pipette" texte="Vider"
                  maintien={versement({ debit: 0.4, pas: 0.05, verse: (v) => agit({ g: "vider", v }) })} />
              </>
            )}
            {etat.pipette === "erlenmeyer" && (
              <Poussoir {...poussoirs.vider} nom="Vider la pipette dans le récipient" texte="Vider"
                maintien={versement({ debit: 4, pas: 1, verse: (v) => agit({ g: "vider", v }), debut: () => setJet("pipette"), fin: () => setJet(null) })} />
            )}

            {/* la pissette d'eau distillée */}
            <Objet id="pissette" nom="Pissette d'eau distillée" {...objets.pissette} l={44} h={56}>
              <Pissette x={0} y={-26} l={30} h={52} />
            </Objet>
            {poses.outil === "pissette" && (
              <>
                {jet === "pissette" && <Filet x={vaseX + 14} y1={vaseHaut - 16} y2={surface} couleur="rgba(200, 220, 240, 0.8)" coule />}
                <Poussoir {...poussoirs.eau} nom="Ajouter de l'eau distillée" texte="Eau"
                  maintien={versement({ debit: 8, grain: 0.5, pas: 5, verse: (v) => agit({ g: "eau", v }), debut: () => setJet("pissette"), fin: () => setJet(null) })} />
              </>
            )}

            {/* l'indicateur coloré, ou la sonde de l'appareil */}
            {sonde ? !etat.sonde && (
              <Objet id="sonde" nom={`Sonde du ${appareil}`} {...objets.sonde} l={44} h={56}>
                <path d="M 0 -26 V 22" stroke="var(--sable)" strokeWidth={5} strokeLinecap="round" />
                <text y={-30} textAnchor="middle">{etat.sondeRincee ? "sonde rincée" : "sonde"}</text>
              </Objet>
            ) : (
              <Objet id="compte" nom={`Flacon compte-gouttes de ${TEINTES_INDICATEUR[r.indicateur].nom}`} {...objets.compte} l={44} h={52}>
                <CompteGouttes x={0} y={-22} l={26} h={44} couleur={TEINTES_INDICATEUR[r.indicateur].couleurs[1]} etiquette={r.indicateur === "bbt" ? "BBT" : "phénol."} />
              </Objet>
            )}
            {poses.outil === "compte" && (
              <Poussoir {...poussoirs.goutte} nom="Ajouter une goutte d'indicateur" texte="Goutte"
                appuie={() => { agit({ g: "goutte" }); setMessage(`${etat.gouttes + 1} goutte${etat.gouttes ? "s" : ""} de ${TEINTES_INDICATEUR[r.indicateur].nom}.`); son("goutte"); }} />
            )}
            {etat.sonde && (
              <Objet id="sonde" nom={`Sonde du ${appareil}, dans le bécher`} {...objets.sonde} l={44} h={44}><rect x={-6} y={-14} width={12} height={12} rx={3} fill="var(--sable)" /></Objet>
            )}
          </Manipulation>
          <text x={352} y={VUE.y + 16} textAnchor="end">{etat.essais > 0 ? `titrage n° ${etat.essais + 1}` : ""}</text>
          <text x={8} y={VUE.y + 16} className="pl-fort">{etat.note !== null ? `Volume noté : ${ml(etat.note)}` : ""}</text>
          {etat.volume >= CAPACITE + AU_DESSUS && <text x={BX + 16} y={BURETTE.y + 4} className="pl-fort" style={{ fill: "var(--brique)" }}>pleine à ras bord</text>}
          {/* la main du guide, par-dessus tout le reste */}
          <Main indication={indication} />
        </Scene>
      )}
    </Etabli>
  );
}
