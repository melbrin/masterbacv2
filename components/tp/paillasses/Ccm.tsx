"use client";

// La paillasse « ccm » (décision 0012) : une chromatographie sur couche mince. L'élève y fait les gestes du laboratoire,
// à la main : il verse l'éluant en lisant sa hauteur à la loupe, ferme la cuve, pose le crayon sur la plaque pour tracer
// la ligne de dépôt, trempe un capillaire dans chaque flacon et touche la plaque, la glisse dans la cuve, laisse monter
// le front, la ressort, marque le front, allume la lampe UV et mesure ses distances avec la règle à curseur.
// Rien n'écrit la mesure à sa place. Chaque geste passe par les règles (lib/commun/tp/paillasses/ccm.ts) ; la liste des
// gestes part au serveur.

import { useCallback, useRef, useState } from "react";
import { nombre } from "@/lib/commun/format";
import { DEPOT_FIN, ELUANT_MAX, HAUTEUR, SOLUTIONS, depotSur, frontActuel, frontVisible, hauteurDepots, regles, taches, type Distance, type EtatCcm, type ReglagesCcm, type Solution } from "@/lib/commun/tp/paillasses/ccm";
import { pose, prochain, type CibleCcm, type ObjetCcm, type PasCcm, type PosesCcm, type PoussoirCcm } from "@/lib/commun/tp/paillasses/ccm-guide";
import type { GesteBrut, PropsPaillasse } from "@/lib/commun/tp/types";
import { Cible, EAU, Echelle, Etabli, Filet, Flacon, Interrupteur, LoupeNiveau, Main, Manipulation, Objet, Poussoir, Releve, Scene, Touche, son, useGlisse, useGuide, useVersement, type Indication, type Point, type Vue } from "../kit";
import "./ccm.css";

// ---------- la place de chaque chose dans le dessin (360 de large) ----------
const VUE: Vue = { x: 0, y: -40, l: 360, h: 500 };
/** Pour tracer, déposer et mesurer, le regard se rapproche de la plaque. */
const VUE_PRES: Vue = { x: 134, y: 42, l: 226, h: 398 };
/** Pendant qu'il note une distance, l'élève garde sous les yeux la plaque, la règle et la loupe. */
const VUE_SAISIE: Vue = { x: 134, y: 88, l: 226, h: 240 };
const CM = 30;                                   // la longueur d'un centimètre dans le dessin
const PLAQUE = { l: 90, h: HAUTEUR * CM };       // la plaque : 3 cm sur 7 cm
const FEUILLE = { x: 213, y: 213 };              // le centre de la plaque posée sur la feuille, sous la lampe
const BAS = FEUILLE.y + PLAQUE.h / 2;            // le bas de la plaque posée sur la feuille
const CUVE = { x: 71, y: 211, l: 110, h: 230 };  // la cuve : son centre, sa largeur, sa hauteur
const FOND = CUVE.y + CUVE.h / 2 - 6;            // le fond de la cuve, où repose la plaque
const COLONNES: Record<Solution, number> = { a: -30, p: 0, r: 30 }; // les trois repères, depuis l'axe de la plaque
const FIOLES: Record<Solution, number> = { a: 172, p: 218, r: 264 };
const FIOLE = { y: 370, l: 30, h: 46 };
const REPOS = { eluant: { x: 36, y: 16 }, crayon: { x: 190, y: 14 }, stylo: { x: 236, y: 14 }, couvercle: { x: 71, y: 352 }, pot: { x: 322, y: 378 } };
const REGLE = { x: 166, l: 28, cm: 7, min: -0.5, max: 2 };   // la règle : son bord contre la plaque, sa largeur, sa longueur, la course de son zéro
const BIDON = { x: 40, y: 398 };
const LOUPE = { x: 316, y: 156, r: 42 };
const CARNET: { quoi: Distance; nom: string; long: string; y: number }[] = [
  { quoi: "front", nom: "front", long: "le front de l'éluant", y: 231 },
  { quoi: "a", nom: "tache A", long: "la tache du dépôt A", y: 259 },
  { quoi: "r", nom: "tache R", long: "la tache du dépôt R", y: 287 },
];
const GESTE = { x: 316, y: 324 };                // le bouton du geste en cours : tracer, déposer
const ATTENDRE = { x: 100, y: 396 };             // le bouton qui laisse passer le temps
const LAMPE = { x: 306, y: 76 };                 // l'interrupteur de la lampe UV
const POIGNEE = 268;                             // là où le doigt prend le curseur de la règle
const SANS_POSE: PosesCcm = { verse: false, outil: null, capillaire: null, pres: false };
const ELUANT_COULEUR = "rgba(232, 214, 150, 0.34)";
const NOMS: Record<Solution, string> = { a: "réactif", p: "produit", r: "référence" };
/** Ce que l'élève tient, dans une phrase : son nom, et le pronom qui le reprend. */
const TENUS: Record<string, [string, string]> = { eluant: ["le flacon d'éluant", "le"], couvercle: ["le couvercle", "le"], plaque: ["la plaque", "la"], cuve: ["la cuve", "la"], crayon: ["le crayon", "le"], stylo: ["le stylo", "le"], capillaire: ["un capillaire neuf", "le"] };

const r2 = (n: number) => Math.round(n * 100) / 100;
const borne = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const vingtieme = (v: number) => Math.round(v * 20) / 20;

interface Partie { etat: EtatCcm; gestes: GesteBrut[] }
const CUMULS: Record<string, number> = { eluant: ELUANT_MAX, attendre: 60, deposer: 20 };
/** Ajoute un geste à la liste. Les morceaux d'un même geste continu se regroupent : rejouée, la liste donne le même état. */
function ajoute(gestes: GesteBrut[], g: GesteBrut): GesteBrut[] {
  const dernier = gestes[gestes.length - 1];
  const a = dernier?.v, b = g.v;
  const continu = dernier !== undefined && dernier.g === g.g && typeof a === "number" && typeof b === "number" && CUMULS[g.g] !== undefined
    && dernier.de === g.de && dernier.ou === g.ou && a + b <= CUMULS[g.g];
  return continu ? [...gestes.slice(0, -1), { ...dernier, v: r2(a + b) }] : [...gestes, g];
}

// ---------- les dessins ----------

// La plaque, dessinée autour de son centre : la ligne de dépôt et ses repères, la zone mouillée par l'éluant,
// le trait du front, et les taches quand la lampe UV l'éclaire.
function DessinPlaque({ r, etat, eclairee }: { r: ReglagesCcm; etat: EtatCcm; eclairee: boolean }) {
  const Y = (h: number) => r2(PLAQUE.h / 2 - h * CM);
  const gauche = -PLAQUE.l / 2;
  const depart = hauteurDepots(etat);
  const front = frontActuel(etat);
  const migre = etat.bain !== null;
  const ligne = etat.ligne;
  const visibles = taches(r, etat);
  /** la part du parcours que fait l'encre d'un trait au stylo */
  const bavure = (i: number) => (ligne === null ? 0 : (front - ligne) * (0.78 + 0.05 * (i % 2)));
  return (
    <g>
      <rect className={`pl-ccm-plaque${eclairee ? " est-eclairee" : ""}`} x={gauche} y={-PLAQUE.h / 2} width={PLAQUE.l} height={PLAQUE.h} rx={2} />
      {frontVisible(etat) && (
        <>
          <rect className="pl-ccm-mouille" x={gauche} y={Y(front)} width={PLAQUE.l} height={r2(PLAQUE.h / 2 - Y(front))} />
          <path className="pl-ccm-front" d={`M ${gauche} ${Y(front)} q ${PLAQUE.l / 4} -2.4 ${PLAQUE.l / 2} 0 t ${PLAQUE.l / 2} 0`} />
        </>
      )}
      {/* l'encre d'un trait au stylo part avec l'éluant */}
      {etat.encre && ligne !== null && migre && front > ligne && [-34, -12, 9, 31].map((x, i) => (
        <rect key={x} className="pl-ccm-bavure" x={x - 4} y={Y(ligne + bavure(i))} width={8} height={r2(bavure(i) * CM)} rx={4} />
      ))}
      {ligne !== null && (
        <>
          <line className={etat.encre ? "pl-ccm-encre" : "pl-ccm-crayon"} x1={gauche + 4} x2={-gauche - 4} y1={Y(ligne)} y2={Y(ligne)} />
          {SOLUTIONS.map((s) => (
            <g key={s}>
              <line className="pl-ccm-crayon" x1={COLONNES[s]} x2={COLONNES[s]} y1={Y(ligne) - 2.5} y2={Y(ligne) + 2.5} />
              <text className="pl-ccm-lettre" x={COLONNES[s]} y={Y(ligne) + 10} textAnchor="middle">{s.toUpperCase()}</text>
            </g>
          ))}
        </>
      )}
      {etat.marque !== null && <line className="pl-ccm-crayon" x1={gauche + 4} x2={-gauche - 4} y1={Y(etat.marque)} y2={Y(etat.marque)} />}
      {/* avant la migration, chaque dépôt laisse une marque humide : elle grossit tant que le capillaire touche la plaque */}
      {!migre && !eclairee && SOLUTIONS.map((s) => depotSur(etat, s) > 0 && <circle key={s} className="pl-ccm-depot" cx={COLONNES[s]} cy={Y(depart)} r={r2(depotSur(etat, s) * 1.5)} />)}
      {/* sous la lampe UV, les espèces paraissent en taches sombres ; un dépôt trop gros laisse une traînée */}
      {eclairee && SOLUTIONS.map((s) => visibles[s].map((t) => {
        const rayon = r2(Math.min(14, t.taille * 1.5 * (migre ? 1.2 : 1)));
        return (
          <g key={`${s}-${t.espece}`} opacity={t.pale ? 0.72 : 1}>
            {migre && t.taille > DEPOT_FIN && <ellipse className="pl-ccm-traine" cx={COLONNES[s]} cy={r2(Y(t.h) + rayon * 1.1)} rx={r2(rayon * 0.8)} ry={r2(rayon * 1.9)} />}
            <ellipse className="pl-ccm-tache" cx={COLONNES[s]} cy={Y(t.h)} rx={rayon} ry={r2(rayon * (migre ? 0.86 : 1))} />
          </g>
        );
      }))}
    </g>
  );
}

// Le crayon à papier ou le stylo, debout, la pointe en bas.
function Crayon({ stylo = false }: { stylo?: boolean }) {
  return (
    <g>
      <rect className={stylo ? "pl-ccm-plume" : "pl-ccm-bois"} x={-4} y={-31} width={8} height={50} rx={1.5} />
      <path className="pl-ccm-mine" d="M -4 19 L 0 31 L 4 19 Z" />
      {stylo && <rect x={-5} y={-31} width={10} height={15} rx={2} fill="var(--carte-2)" stroke="var(--bleu)" strokeWidth={1} />}
    </g>
  );
}

// Le curseur de la règle : un trait fin en travers de la règle et de la plaque, que l'élève glisse à la hauteur qu'il
// vise. Avec le crayon en main, c'est là que le trait se tracera. `large` : de près, toute la plaque sert à le placer.
function Viseur({ h, change, outil, large }: { h: number; change: (h: number) => void; outil: "crayon" | "stylo" | null; large: boolean }) {
  const prise = useRef(0);
  const y = r2(BAS - h * CM);
  const vers = (p: Point) => change(borne(vingtieme((BAS - (p.y - prise.current)) / CM), 0, HAUTEUR));
  const glisse = useGlisse({
    // le doigt posé près du trait l'entraîne ; posé ailleurs sur la plaque, il l'appelle
    depart: (p) => { const pres = Math.abs(p.y - y) <= 24; prise.current = pres ? p.y - y : 0; if (!pres) vers(p); },
    bouge: vers,
  });
  return (
    <g className="pl-ccm-viseur" role="slider" tabIndex={0} aria-label={outil ? `Pointe du ${outil} : sa hauteur sur la plaque` : "Curseur de la règle : sa hauteur sur la plaque"}
      aria-valuemin={0} aria-valuemax={HAUTEUR} aria-valuenow={h} aria-valuetext={`à ${nombre(h, 2)} cm du bas de la plaque`} {...glisse}
      onKeyDown={(e) => {
        const pas = e.key === "ArrowUp" || e.key === "ArrowRight" ? 0.05 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -0.05 : e.key === "PageUp" ? 0.5 : e.key === "PageDown" ? -0.5 : 0;
        if (pas) { e.preventDefault(); change(borne(vingtieme(h + pas), 0, HAUTEUR)); }
      }}>
      {large && <rect x={FEUILLE.x - PLAQUE.l / 2} y={BAS - PLAQUE.h} width={PLAQUE.l} height={PLAQUE.h} fill="transparent" />}
      <rect x={248} y={y - 22} width={44} height={44} fill="transparent" />
      <line className="pl-ccm-viseur-trait" x1={REGLE.x - REGLE.l - 2} x2={262} y1={y} y2={y} />
      {outil
        ? <g transform={`translate(262 ${y}) rotate(90) scale(0.5)`}><Crayon stylo={outil === "stylo"} /></g>
        : <path className="pl-ccm-viseur-poignee" d={`M 259 ${y} l 8 -6 h 7 v 12 h -7 Z`} />}
    </g>
  );
}

// La règle, le long de la feuille : l'élève la glisse pour placer son zéro.
function Regle({ zero, change }: { zero: number; change: (zero: number) => void }) {
  const prise = useRef(0);
  const y0 = r2(BAS - zero * CM);
  const vers = (p: Point) => change(borne(vingtieme((BAS - (p.y - prise.current)) / CM), REGLE.min, REGLE.max));
  const glisse = useGlisse({ depart: (p) => { prise.current = p.y - y0; }, bouge: vers });
  return (
    <g className="pl-ccm-regle" role="slider" tabIndex={0} aria-label="Règle : la hauteur de son zéro" aria-valuemin={REGLE.min} aria-valuemax={REGLE.max} aria-valuenow={zero}
      aria-valuetext={`zéro à ${nombre(zero, 2)} cm du bas de la plaque`} {...glisse}
      onKeyDown={(e) => {
        const pas = e.key === "ArrowUp" || e.key === "ArrowRight" ? 0.05 : e.key === "ArrowDown" || e.key === "ArrowLeft" ? -0.05 : e.key === "PageUp" ? 0.5 : e.key === "PageDown" ? -0.5 : 0;
        if (pas) { e.preventDefault(); change(borne(vingtieme(zero + pas), REGLE.min, REGLE.max)); }
      }}>
      <rect x={REGLE.x - REGLE.l - 12} y={r2(y0 - REGLE.cm * CM - 4)} width={REGLE.l + 14} height={r2(REGLE.cm * CM + 11)} fill="transparent" />
      <rect className="pl-ccm-regle-corps" x={REGLE.x - REGLE.l} y={r2(y0 - REGLE.cm * CM - 4)} width={REGLE.l} height={r2(REGLE.cm * CM + 11)} rx={3} />
      <Echelle x={REGLE.x} y={y0} longueur={-REGLE.cm * CM} de={0} a={REGLE.cm} pas={0.1} majeur={1} cote={-1} trait={3} />
    </g>
  );
}

// ---------- la paillasse ----------

export default function Ccm({ reglages: r, protocole, attente, fini }: PropsPaillasse<ReglagesCcm>) {
  const [partie, setPartie] = useState<Partie>(() => ({ etat: regles.depart(r), gestes: [] }));
  const [message, setMessage] = useState("Prends un objet en le glissant, ou touche-le puis touche l'endroit où le poser.");
  /** ce qui est posé : le flacon d'éluant penché sur la cuve, le crayon ou le stylo sur la plaque, un capillaire au-dessus d'un repère ; et la vue rapprochée */
  const [poses, setPoses] = useState<PosesCcm>(SANS_POSE);
  const [jet, setJet] = useState(false);
  const [zero, setZero] = useState(0);
  const [viseur, setViseur] = useState(2.5);
  const [saisie, setSaisie] = useState<Distance | null>(null);
  const guide = useGuide();
  /** les poussoirs qui versent, déposent ou laissent passer le temps tant que l'appui dure */
  const versement = useVersement();
  const { etat, gestes } = partie;
  const { verse, outil, capillaire } = poses;

  const agit = useCallback((g: GesteBrut) => setPartie((p) => ({ etat: regles.geste(r, p.etat, g), gestes: ajoute(p.gestes, g) })), [r]);

  // ----- ce qui dépend de l'état -----
  const surFeuille = !etat.dansCuve;
  const migre = etat.bain !== null;
  const depart = hauteurDepots(etat);
  const yH = (h: number) => r2(BAS - h * CM);
  const yDepots = yH(depart);
  const proche = saisie === null && (poses.pres || outil !== null || capillaire !== null);
  const eclairee = etat.uv && surFeuille;
  const surface = r2(FOND - etat.eluant * CM);
  const enHaut = etat.dansCuve && frontActuel(etat) >= HAUTEUR;
  /** où se trouve chaque objet, chaque cible, chaque poussoir : le dessin et la main du guide lisent les mêmes places */
  const capillaireIci = (s: Solution): Point => (capillaire?.de === s ? { x: FEUILLE.x + COLONNES[capillaire.ou], y: yDepots - 24 } : { x: FIOLES[s] + 6, y: FIOLE.y - 14 });
  const objets: Record<ObjetCcm, Point> = {
    eluant: verse ? { x: CUVE.x - 33, y: 60 } : REPOS.eluant,
    couvercle: etat.couvercle ? { x: CUVE.x, y: CUVE.y - CUVE.h / 2 - 5 } : REPOS.couvercle,
    plaque: etat.dansCuve ? { x: CUVE.x, y: FOND - PLAQUE.h / 2 } : FEUILLE,
    cuve: CUVE, crayon: REPOS.crayon, stylo: REPOS.stylo, capillaire: REPOS.pot,
    "cap-a": capillaireIci("a"), "cap-p": capillaireIci("p"), "cap-r": capillaireIci("r"),
  };
  const cibles: Record<CibleCcm, Point> = {
    versoir: { x: CUVE.x, y: 62 }, "repos-eluant": REPOS.eluant, ouverture: { x: CUVE.x, y: CUVE.y - CUVE.h / 2 + 4 }, "repos-couvercle": REPOS.couvercle,
    cuve: CUVE, feuille: FEUILLE, bidon: BIDON, plaque: { x: FEUILLE.x, y: FEUILLE.y - 24 },
    "fiole-a": { x: FIOLES.a, y: FIOLE.y + 22 }, "fiole-p": { x: FIOLES.p, y: FIOLE.y + 22 }, "fiole-r": { x: FIOLES.r, y: FIOLE.y + 22 },
    "repere-a": { x: FEUILLE.x + COLONNES.a, y: yDepots }, "repere-p": { x: FEUILLE.x + COLONNES.p, y: yDepots }, "repere-r": { x: FEUILLE.x + COLONNES.r, y: yDepots },
  };
  const poussoirs: Record<PoussoirCcm, Point> = {
    verser: { x: CUVE.x + 42, y: 46 }, tracer: GESTE, deposer: GESTE, attendre: ATTENDRE, lampe: LAMPE,
    "carnet-front": { x: LOUPE.x, y: CARNET[0].y }, "carnet-a": { x: LOUPE.x, y: CARNET[1].y }, "carnet-r": { x: LOUPE.x, y: CARNET[2].y },
  };

  // ----- prendre et poser -----
  const prise = (objet: string, ou: string[]) => {
    const [nom, pronom] = TENUS[objet] ?? ["un capillaire", "le"];
    setMessage(ou.length > 0 ? `Tu tiens ${nom}. Un anneau vert montre où ${pronom} poser.` : `Tu tiens ${nom}, mais rien ne peut ${pronom} recevoir pour l'instant.`);
  };
  const rate = () => setMessage("Rien ne se pose à cet endroit. Reprends l'objet : un anneau vert montre où il va.");
  const poser = (objet: string, cible: string) => {
    const suite = pose(etat, poses, objet, cible);
    suite.gestes.forEach(agit);
    setPoses(suite.poses);
    // avec le guide, le message ne dit que ce qui vient de se passer : le guide dit déjà le geste suivant
    if (suite.message) setMessage(suite.conseil && !guide.actif ? `${suite.message} ${suite.conseil}` : suite.message);
  };

  const trace = () => {
    if (!outil) return;
    const g: GesteBrut = { g: "trait", h: viseur, outil };
    const change = regles.geste(r, etat, g) !== etat;
    agit(g);
    // le trait est fait : le crayon retourne dans son pot
    if (change) setPoses((p) => ({ ...p, outil: null }));
    setMessage(!change ? (viseur < 0.1 || viseur > HAUTEUR - 0.1 ? "Le trait serait au bord de la plaque : déplace la pointe." : "Les dépôts sont faits : la ligne de dépôt ne se retrace plus.")
      : etat.front !== null ? `Un trait au ${outil} marque le front de l'éluant.` : `La ligne de dépôt est tracée au ${outil}.`);
  };
  const lampe = () => {
    agit({ g: "uv", marche: !etat.uv });
    // les taches apparaissent : le regard se rapproche de la plaque, pour mesurer
    if (!etat.uv && surFeuille && etat.front !== null) setPoses((p) => ({ ...p, pres: true }));
    setMessage(etat.uv ? "La lampe UV est éteinte." : !surFeuille ? "La lampe UV est allumée : rien n'est posé dessous." : etat.front !== null ? `La lampe UV éclaire la plaque : les taches apparaissent.${guide.actif ? "" : " Mesure tes distances avec la règle et son curseur."}` : "La lampe UV éclaire la plaque.");
  };
  const nouvelle = () => {
    agit({ g: "nouvelle" });
    setPoses((p) => ({ ...p, outil: null, capillaire: null }));
    setSaisie(null);
    setMessage("Une plaque neuve est sur la feuille. La cuve reste comme elle est.");
  };
  const toutRecommencer = () => {
    setPartie({ etat: regles.depart(r), gestes: [] });
    setPoses(SANS_POSE);
    setSaisie(null);
    setZero(0);
    setViseur(2.5);
    setMessage("La paillasse est remise comme au début.");
  };

  // ----- le guide : le prochain geste, et où la main le montre -----
  const pas: PasCcm | null = guide.actif ? prochain(r, etat, { ...poses, viseur, zero, saisie }) : null;
  const laMain = (p: PasCcm): Indication["main"] => {
    switch (p.geste) {
      case "glisser": return { geste: "glisser", de: objets[p.objet], vers: cibles[p.cible] };
      case "maintenir": case "toucher": return { geste: p.geste, ou: poussoirs[p.poussoir] };
      // le curseur se prend par sa poignée, la règle par son corps
      case "curseur": return p.quoi === "viseur" ? { geste: "glisser", de: { x: POIGNEE, y: yH(viseur) }, vers: { x: POIGNEE, y: yH(p.vers) } }
        : { geste: "glisser", de: { x: REGLE.x - REGLE.l / 2, y: 200 }, vers: { x: REGLE.x - REGLE.l / 2, y: r2(200 - (p.vers - zero) * CM) } };
      case "montrer": return { geste: "montrer", ou: { x: LOUPE.x - 22, y: LOUPE.y + LOUPE.r - 14 } };
      default: return undefined;
    }
  };
  const indication: Indication | null = pas && { cle: pas.cle, texte: pas.texte, etape: pas.etape, main: laMain(pas), appel: pas.geste === "bouton" && pas.bouton === "fini" };
  /** la touche du bas que le guide met en avant */
  const vise = (bouton: string) => (pas?.geste === "bouton" && pas.bouton === bouton ? " pl-vise" : "");

  const outils = saisie ? (
    <Releve nom={`Distance parcourue par ${CARNET.find((c) => c.quoi === saisie)?.long}, depuis la ligne de dépôt`} unite="cm" exemple="4,85" annule={() => setSaisie(null)}
      valide={(v) => {
        setSaisie(null);
        if (v > HAUTEUR) { setMessage("Cette distance dépasse la hauteur de la plaque : relis la règle."); return; }
        agit({ g: "noter", quoi: saisie, v });
        setMessage(`Distance notée dans le carnet : ${nombre(v, 2)} cm.`);
        son("bip");
      }} />
  ) : outil ? (
    <button type="button" className={`btn btn-ligne${vise("reposer")}`} onClick={() => { setPoses((p) => ({ ...p, outil: null })); setMessage(`Le ${outil} est reposé.`); }}>Reposer le {outil}</button>
  ) : (
    <>
      <button type="button" className={`btn btn-ligne${vise("nouvelle")}`} onClick={nouvelle}>Nouvelle plaque</button>
      <button type="button" className={`btn btn-ligne${vise("voir")}`} onClick={() => setPoses((p) => (p.capillaire ? { ...p, capillaire: null, pres: false } : { ...p, pres: !p.pres }))}>{proche ? "Voir toute la paillasse" : "Voir la plaque de près"}</button>
    </>
  );

  return (
    <Etabli titre="CCM" protocole={protocole} message={enHaut ? "Le front de l'éluant a atteint le haut de la plaque." : message} attente={attente} fini={() => fini(gestes)} recommence={toutRecommencer} outils={outils} saisie={saisie !== null} indication={indication}>
      <Scene vue={saisie ? VUE_SAISIE : proche ? VUE_PRES : VUE} nom="La paillasse de chromatographie : une cuve et son couvercle, une plaque sous la lampe UV, une règle à curseur, trois flacons, des capillaires, un crayon et un stylo">
        <Manipulation pose={poser} prise={prise} rate={rate}>
          {/* la lampe UV sur sa potence, et la feuille où se pose la plaque */}
          <path className="pl-ccm-potence" d="M 266 330 V 92 H 176" />
          <rect className={`pl-ccm-tube${etat.uv ? " est-allume" : ""}`} x={172} y={86} width={84} height={12} rx={5} />
          <rect className="pl-ccm-feuille" x={160} y={102} width={104} height={224} rx={2} />
          {etat.uv && <path className="pl-ccm-halo" d="M 176 98 L 162 324 H 264 L 252 98 Z" />}
          <text x={LAMPE.x} y={LAMPE.y - 20} textAnchor="middle">lampe UV</text>
          <Interrupteur {...poussoirs.lampe} ferme={etat.uv} bascule={lampe} nom="Lampe UV" />

          {/* le bidon de récupération, les trois flacons et le pot de capillaires */}
          <path className="pl-ccm-bidon" d={`M ${BIDON.x - 18} ${BIDON.y - 14} h 22 l 10 8 v 28 h -32 Z M ${BIDON.x - 12} ${BIDON.y - 14} v -6 h 10 v 6`} />
          <text x={BIDON.x} y={BIDON.y + 34} textAnchor="middle">solvants usagés</text>
          {SOLUTIONS.map((s) => (
            <g key={s}>
              <Flacon x={FIOLES[s]} y={FIOLE.y} l={FIOLE.l} h={FIOLE.h} couleur={EAU} etiquette={s.toUpperCase()} />
              <text x={FIOLES[s]} y={FIOLE.y + FIOLE.h + 12} textAnchor="middle">{NOMS[s]}</text>
            </g>
          ))}
          <path className="pl-verre" d={`M ${REPOS.pot.x - 13} ${REPOS.pot.y + 6} v 28 q 0 4 4 4 h 18 q 4 0 4 -4 v -28`} />
          {[-8, -3, 7].map((dx) => <line key={dx} className="pl-ccm-capillaire" x1={REPOS.pot.x + dx} x2={r2(REPOS.pot.x + dx * 0.6)} y1={REPOS.pot.y - 18} y2={REPOS.pot.y + 33} />)}
          <text x={REPOS.pot.x} y={FIOLE.y + FIOLE.h + 12} textAnchor="middle">capillaires</text>
          <path className="pl-verre" d={`M ${REPOS.crayon.x - 22} 26 v 22 q 0 4 4 4 h 82 q 4 0 4 -4 v -22`} opacity={0.6} />
          <text x={REPOS.crayon.x} y={64} textAnchor="middle">crayon</text>
          <text x={REPOS.stylo.x} y={64} textAnchor="middle">stylo</text>

          {/* la cuve : vide ou pleine, elle se porte jusqu'au bidon quand rien ne l'en empêche */}
          {!etat.couvercle && surFeuille && !verse && etat.eluant > 0 ? (
            <Objet id="cuve" nom="Cuve à chromatographie" {...objets.cuve} l={CUVE.l} h={CUVE.h}>
              <rect className="pl-ccm-eluant" x={-CUVE.l / 2 + 2} y={r2(surface - CUVE.y)} width={CUVE.l - 4} height={r2(FOND - surface + 4)} />
              <path className="pl-verre" d={`M ${-CUVE.l / 2} ${-CUVE.h / 2} V ${CUVE.h / 2 - 10} q 0 10 10 10 H ${CUVE.l / 2 - 10} q 10 0 10 -10 V ${-CUVE.h / 2}`} />
            </Objet>
          ) : (
            <g transform={`translate(${CUVE.x} ${CUVE.y})`}>
              {surFeuille && etat.eluant > 0 && <rect className="pl-ccm-eluant" x={-CUVE.l / 2 + 2} y={r2(surface - CUVE.y)} width={CUVE.l - 4} height={r2(FOND - surface + 4)} />}
              <path className="pl-verre" d={`M ${-CUVE.l / 2} ${-CUVE.h / 2} V ${CUVE.h / 2 - 10} q 0 10 10 10 H ${CUVE.l / 2 - 10} q 10 0 10 -10 V ${-CUVE.h / 2}`} />
            </g>
          )}

          {/* la plaque : sur la feuille, ou debout dans la cuve */}
          <Objet id="plaque" nom={etat.dansCuve ? "Plaque, dans la cuve" : "Plaque de chromatographie"} {...objets.plaque} l={PLAQUE.l} h={PLAQUE.h}
            actif={!proche && saisie === null && !verse && (etat.dansCuve || !migre)}>
            <DessinPlaque r={r} etat={etat} eclairee={eclairee} />
          </Objet>
          {/* l'éluant passe devant le bas de la plaque qui trempe */}
          {etat.dansCuve && etat.eluant > 0 && <rect className="pl-ccm-eluant" x={CUVE.x - CUVE.l / 2 + 2} y={surface} width={CUVE.l - 4} height={r2(FOND - surface + 4)} />}

          {/* le couvercle : sur la cuve, ou sur la paillasse */}
          <Objet id="couvercle" nom={etat.couvercle ? "Couvercle, sur la cuve" : "Couvercle de la cuve"} {...objets.couvercle} l={124} h={44}>
            <rect x={-62} y={-4} width={124} height={8} rx={3} fill="var(--carte-2)" stroke="var(--encre)" strokeWidth={1.4} />
            <rect x={-9} y={-10} width={18} height={6} rx={2} fill="var(--cuivre)" />
          </Objet>

          {/* le flacon d'éluant : sur l'étagère, ou penché au-dessus de la cuve */}
          <Objet id="eluant" nom="Flacon d'éluant" {...objets.eluant} l={48} h={76}>
            <g transform={verse ? "rotate(112)" : undefined}><Flacon x={0} y={-36} l={44} h={72} couleur={ELUANT_COULEUR} etiquette="Éluant" /></g>
          </Objet>
          {verse && (
            <>
              {jet && <Filet x={CUVE.x} y1={76} y2={etat.eluant > 0 ? surface : FOND} couleur="rgba(232, 214, 150, 0.85)" coule />}
              {/* le versement ralentit près du demi-centimètre : l'élève ajuste à petits coups */}
              <Poussoir {...poussoirs.verser} nom="Verser l'éluant dans la cuve" texte="Verser"
                maintien={versement({ debit: etat.eluant < 0.35 ? 0.22 : 0.08, grain: 0.02, pas: 0.1, verse: (v) => agit({ g: "eluant", v }), debut: () => setJet(true), fin: () => setJet(false) })} />
              <LoupeNiveau x={LOUPE.x} y={LOUPE.y} r={LOUPE.r} valeur={etat.eluant} pas={0.1} majeur={1} parUnite={60} monte de={0} a={ELUANT_MAX} couleur={ELUANT_COULEUR} liquide={etat.eluant > 0}
                nom="Loupe sur le fond de la cuve : la hauteur d'éluant, en centimètres" />
              <text x={LOUPE.x} y={LOUPE.y - LOUPE.r - 15} textAnchor="middle" className="pl-fort">Loupe : la cuve</text>
              <text x={LOUPE.x} y={LOUPE.y - LOUPE.r - 5} textAnchor="middle">en centimètres</text>
            </>
          )}

          {/* le crayon et le stylo, dans leur pot tant qu'ils ne servent pas */}
          {outil !== "crayon" && <Objet id="crayon" nom="Crayon à papier" {...objets.crayon} l={44} h={72}><Crayon /></Objet>}
          {outil !== "stylo" && <Objet id="stylo" nom="Stylo à bille" {...objets.stylo} l={44} h={72}><Crayon stylo /></Objet>}

          {/* la règle et son curseur, le long de la feuille ; la loupe montre la graduation en face du curseur */}
          <Regle zero={zero} change={setZero} />
          {surFeuille && <Viseur h={viseur} change={setViseur} outil={outil} large={proche || saisie !== null} />}
          {surFeuille && !verse && (
            <>
              <LoupeNiveau x={LOUPE.x} y={LOUPE.y} r={LOUPE.r} valeur={r2(viseur - zero)} pas={0.1} majeur={1} parUnite={60} monte de={0} a={REGLE.cm} couleur="none" liquide={false} repere={r2(viseur - zero)}
                nom="Loupe sur la règle, à la hauteur du curseur" />
              <text x={LOUPE.x} y={LOUPE.y - LOUPE.r - 15} textAnchor="middle" className="pl-fort">Loupe : la règle</text>
              <text x={LOUPE.x} y={LOUPE.y - LOUPE.r - 5} textAnchor="middle">en centimètres</text>
            </>
          )}
          {surFeuille && etat.front !== null && (
            <>
              <text x={LOUPE.x} y={212} textAnchor="middle" className="pl-fort">Carnet, en cm</text>
              {CARNET.map((c) => {
                const note = etat.notes[c.quoi];
                return <Touche key={c.quoi} {...poussoirs[`carnet-${c.quoi}`]} l={84} h={26} nom={`Noter la distance parcourue par ${c.long}`} texte={`${c.nom} : ${note === null ? "…" : nombre(note, 2)}`} appuie={() => setSaisie(c.quoi)} />;
              })}
            </>
          )}
          {outil && surFeuille && <Poussoir {...poussoirs.tracer} nom={`Tracer un trait au ${outil}, à la hauteur de sa pointe`} texte="Tracer" appuie={trace} />}

          {/* les capillaires : un neuf dans le pot, puis un par flacon ; posé au-dessus d'un repère, il touche la plaque */}
          <Objet id="capillaire" nom="Capillaire neuf" {...objets.capillaire} l={40} h={56}>
            <line className="pl-ccm-capillaire" y1={-24} y2={24} />
          </Objet>
          {SOLUTIONS.map((s) => {
            if (etat.capillaires[s] === null) return null;
            const ici = capillaire?.de === s;
            return (
              <Objet key={s} id={`cap-${s}`} nom={`Capillaire du flacon ${s.toUpperCase()}${ici ? `, au-dessus du repère ${capillaire.ou.toUpperCase()}` : ""}`} {...objets[`cap-${s}`]} l={40} h={56}>
                <line className="pl-ccm-capillaire est-plein" y1={-24} y2={24} transform={ici ? undefined : "rotate(7)"} />
              </Objet>
            );
          })}
          {capillaire && surFeuille && (
            <Poussoir {...poussoirs.deposer} nom={`Toucher la plaque avec le capillaire, sur le repère ${capillaire.ou.toUpperCase()}`} texte="Déposer"
              maintien={versement({
                // le premier contact laisse déjà un dépôt d'un millimètre ; il grossit tant que le capillaire reste posé
                debit: 3, grain: 0.1, pas: 1.5, verse: (v) => agit({ g: "deposer", de: capillaire.de, ou: capillaire.ou, v }),
                debut: () => { agit({ g: "deposer", de: capillaire.de, ou: capillaire.ou, v: 1 }); son("goutte"); },
                fin: () => setMessage(migre ? "La plaque a déjà migré : on n'y dépose plus rien." : `Le capillaire a touché la plaque sur le repère ${capillaire.ou.toUpperCase()}.`),
              })} />
          )}

          {/* le temps passe en accéléré tant que l'appui dure */}
          {etat.dansCuve && (
            <Poussoir {...poussoirs.attendre} r={24} nom="Laisser passer le temps, en accéléré" texte="Attendre"
              maintien={versement({ debit: 1.5, pas: 1, verse: (v) => agit({ g: "attendre", v }), debut: () => setMessage("Le temps passe en accéléré : regarde le front de l'éluant.") })} />
          )}

          {/* les cibles : où poser ce qu'on tient */}
          <Cible id="versoir" nom="le dessus de la cuve, pour verser" {...cibles.versoir} r={24} accepte={verse ? [] : ["eluant"]} />
          <Cible id="repos-eluant" nom="son rangement" {...cibles["repos-eluant"]} r={26} accepte={verse ? ["eluant"] : []} />
          <Cible id="ouverture" nom="l'ouverture de la cuve" {...cibles.ouverture} r={26} accepte={etat.couvercle ? [] : ["couvercle"]} />
          <Cible id="repos-couvercle" nom="la paillasse" {...cibles["repos-couvercle"]} r={24} accepte={etat.couvercle ? ["couvercle"] : []} />
          <Cible id="cuve" nom="la cuve" {...cibles.cuve} r={44} accepte={surFeuille && !migre ? ["plaque"] : []} />
          <Cible id="feuille" nom="la feuille, sous la lampe" {...cibles.feuille} r={44} accepte={etat.dansCuve ? ["plaque"] : []} />
          <Cible id="bidon" nom="le bidon de récupération" {...cibles.bidon} r={28} accepte={["cuve"]} />
          <Cible id="plaque" nom="la plaque" {...cibles.plaque} r={40} accepte={surFeuille && !outil ? ["crayon", "stylo"] : []} />
          {SOLUTIONS.map((s) => {
            const porte = etat.capillaires[s];
            // un flacon reçoit un capillaire neuf s'il n'en a pas, ou si le sien a trempé ailleurs ; et son propre capillaire, de retour de la plaque
            const accepte = porte === null ? ["capillaire", ...SOLUTIONS.filter((x) => x !== s && etat.capillaires[x] !== null).map((x) => `cap-${x}`)] : [...(porte.length > 1 ? ["capillaire"] : []), ...(capillaire?.de === s ? [`cap-${s}`] : [])];
            return <Cible key={s} id={`fiole-${s}`} nom={`le flacon ${s.toUpperCase()}`} {...cibles[`fiole-${s}`]} r={18} accepte={accepte} />;
          })}
          {SOLUTIONS.map((s) => (
            <Cible key={s} id={`repere-${s}`} nom={`le repère ${s.toUpperCase()} de la plaque`} {...cibles[`repere-${s}`]} r={13}
              accepte={surFeuille ? SOLUTIONS.filter((x) => etat.capillaires[x] !== null && !(capillaire?.de === x && capillaire.ou === s)).map((x) => `cap-${x}`) : []} />
          ))}
        </Manipulation>
        <text x={352} y={VUE.y + 14} textAnchor="end">{etat.essais > 0 ? `plaque n° ${etat.essais + 1}` : ""}</text>
        {/* la main du guide, par-dessus tout le reste */}
        <Main indication={indication} />
      </Scene>
    </Etabli>
  );
}
