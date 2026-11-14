"use client";

// La paillasse Archimède (décision 0012). L'élève y fait les gestes du laboratoire, à la main : il accroche un cylindre au
// dynamomètre, glisse une éprouvette dessous, fait descendre la potence le long de sa tige, et lit le poids et le volume
// dans les deux loupes. Le niveau monte et le ressort se détend à mesure que le cylindre s'enfonce. Rien n'écrit la
// mesure à sa place. Chaque geste passe par les règles (lib/commun/tp/paillasses/archimede.ts) ; la liste des gestes
// part au serveur.
// Le guide (lib/commun/tp/paillasses/archimede-guide.ts) dit le prochain geste ; ici, la main le montre à sa place dans le dessin.

import { useCallback, useRef, useState, type KeyboardEvent } from "react";
import { nombre } from "@/lib/commun/format";
import { CALIBRE, CAPACITE, COURSE, HAUT_CROCHET, RAIDEUR, SECTION_EPROUVETTE, degage, liquideDe, regles, situation, solideDe, toutImmerge, type EtatArchimede, type Liquide, type ReglagesArchimede, type Situation, type Solide } from "@/lib/commun/tp/paillasses/archimede";
import { pose, prochain, type PasDuGuide } from "@/lib/commun/tp/paillasses/archimede-guide";
import type { GesteBrut, PropsPaillasse } from "@/lib/commun/tp/types";
import { INCOLORE } from "../couleurs";
import { Cible, Echelle, Eprouvette, Etabli, Loupe, LoupeNiveau, Main, Manipulation, Objet, Releve, Scene, son, useGlisse, useGuide, type Indication, type Point, type Vue } from "../kit";
import { LoupeGraduee } from "./archimede-loupe";
import "./archimede.css";

// ---------- la place de chaque chose dans le dessin (360 de large) ----------
const VUE: Vue = { x: 0, y: -40, l: 360, h: 566 };
const ECH = 10;                        // un centimètre du laboratoire vaut dix unités du dessin
const SOCLE = 500;                     // le dessus du socle de la potence
const BANC = 506;                      // le dessus de la paillasse
const FOND = SOCLE - 8;                // le fond intérieur de l'éprouvette posée sous le dynamomètre
const AXE = 100;                       // l'axe du dynamomètre
const TIGE = 40;                       // la tige de la potence
const EPROUVETTE = { l: 36, h: 18 + (CAPACITE / SECTION_EPROUVETTE) * ECH };
const FIL = 104;                       // le fil entre la tige du dynamomètre et l'anneau du solide
const PAR_NEWTON = ECH / RAIDEUR;      // l'allongement du ressort pour un newton
const LARGEUR = 28;                    // la largeur d'un cylindre
const LOUPE_D = { x: 186, y: 34, r: 50 };
const LOUPE_E = { x: 300, y: 34, r: 50 };
/** Pendant une lecture, le regard se rapproche de la loupe : elle et son titre, rien d'autre. */
const zoom = (loupe: { x: number; y: number }): Vue => ({ x: loupe.x - 62, y: loupe.y - 70, l: 124, h: 126 });
const ETAGERE = { y: 296, x: [246, 290, 334] };
const REPOS = [190, 250];              // les places des éprouvettes sur la paillasse
const PAPIER = { x: 322, y: BANC - 22 };
const SOUS: Point = { x: AXE, y: SOCLE - EPROUVETTE.h / 2 };  // le centre de l'éprouvette posée sous le dynamomètre
const TEINTES_SOLIDE = ["#C5CCD8", "#8DBCC8", "#DCCFB6"];
const TEINTE_INCONNU = "rgba(150, 226, 204, 0.26)";

const r2 = (n: number) => Math.round(n * 100) / 100;
const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/** « 0,41 N », ou « 0,405 N » quand l'élève a noté un troisième chiffre. */
const newtons = (x: number) => `${nombre(x, Math.round(x * 1000) % 10 === 0 ? 2 : 3)} N`;
const ml = (x: number) => `${nombre(x, 1)} mL`;
/** La hauteur du bras de la potence : le dynamomètre mesure 70 unités, du bras au bout de sa tige quand rien n'y pend. */
const bras = (descente: number) => FOND - HAUT_CROCHET * ECH - FIL - 70 + descente * ECH;

interface Partie { etat: EtatArchimede; gestes: GesteBrut[] }
/** Ajoute un geste à la liste. Deux déplacements de la potence dans le même sens se regroupent : rejoués, ils valent leur somme. */
function ajoute(gestes: GesteBrut[], g: GesteBrut): GesteBrut[] {
  const dernier = gestes[gestes.length - 1];
  const a = dernier?.v, b = g.v;
  const continu = dernier !== undefined && g.g === "potence" && dernier.g === "potence" && typeof a === "number" && typeof b === "number" && a * b > 0 && Math.abs(a + b) <= COURSE;
  return continu ? [...gestes.slice(0, -1), { g: "potence", v: Math.round((a + b) * 100) / 100 }] : [...gestes, g];
}

/** Ce qui se voit sous le dynamomètre, en une phrase : jamais une valeur à lire. */
function raconte(r: ReglagesArchimede, etat: EtatArchimede, sit: Situation): string {
  const s = solideDe(r, etat.accroche), l = liquideDe(r, etat.dessous);
  if (!s) return l ? "Le crochet du dynamomètre est libre, au-dessus de l'éprouvette." : "Le crochet du dynamomètre est libre.";
  if (!l) return sit.fond ? `Le ${s.nom} repose sur le socle de la potence.` : `Le ${s.nom} pend au bout du dynamomètre.`;
  if (sit.fond) return `Le ${s.nom} touche le fond de l'éprouvette.`;
  if (toutImmerge(sit)) return `Le ${s.nom} est entièrement sous la surface.`;
  if (sit.immerge > 0) return `Le ${s.nom} est en partie dans ${l.nom}.`;
  return etat.humide[s.id] ? `Le ${s.nom} est sorti du liquide : il est encore mouillé.` : `Le ${s.nom} pend au-dessus de ${l.nom}.`;
}

/** Les relevés de l'élève, tels qu'il les a notés. */
function carnet(r: ReglagesArchimede, etat: EtatArchimede): string[] {
  const n = etat.notes;
  const lignes: string[] = n.air ? [`Dans l'air : ${newtons(n.air.v)}`] : [];
  for (const l of r.liquides) {
    const avant = n[`${l.id}:avant`], apres = n[`${l.id}:apres`], p = n[`${l.id}:poids`];
    if (avant && apres) lignes.push(`${majuscule(l.etiquette)} : ${ml(avant.v)}, puis ${ml(apres.v)} avec le solide`);
    else if (avant) lignes.push(`${majuscule(l.etiquette)} : ${ml(avant.v)}`);
    else if (apres) lignes.push(`${majuscule(l.etiquette)}, avec le solide : ${ml(apres.v)}`);
    if (p) lignes.push(`Dans ${l.nom} : ${newtons(p.v)}`);
  }
  return lignes;
}

// ---------- les pièces ----------

// Le dynamomètre : un tube gradué, un ressort, un index qui descend avec la force, une tige et son crochet.
function Dynamometre({ y, force }: { y: number; force: number }) {
  const zero = y + 16;
  const index = r2(zero + Math.min(force, CALIBRE * 1.04) * PAR_NEWTON);
  const haut = y + 10;
  const pas = (index - 2 - haut) / 18;
  const ressort = `M ${AXE} ${haut} ${Array.from({ length: 18 }, (_, i) => `L ${AXE + (i % 2 ? 4 : -4)} ${r2(haut + (i + 0.5) * pas)}`).join(" ")} L ${AXE} ${r2(index - 2)}`;
  return (
    <g aria-hidden="true">
      <circle cx={AXE} cy={y + 4} r={4} className="pl-verre" />
      <rect className="pl-archimede-tube" x={AXE - 8} y={y + 8} width={16} height={54} rx={3} />
      <path className="pl-archimede-ressort" d={ressort} />
      <Echelle x={AXE - 8} y={zero} longueur={PAR_NEWTON * CALIBRE} de={0} a={CALIBRE} pas={0.1} majeur={0.5} cote={-1} trait={2.2} ecrit={(v) => nombre(v, 1)} />
      <line className="pl-repere" x1={AXE - 8} x2={AXE + 8} y1={index} y2={index} strokeWidth={2.2} />
      <path className="pl-verre" d={`M ${AXE} ${index} V ${r2(index + 51)} a 3 3 0 1 0 3 3`} />
    </g>
  );
}

// La potence : on pose le doigt sur sa noix et on la fait glisser le long de la tige. Au clavier : les flèches.
function Potence({ descente, deplace }: { descente: number; deplace: (cible: number) => void }) {
  const y = bras(descente);
  const prise = useRef(0);
  const glisse = useGlisse({
    depart: (p) => { prise.current = p.y - y; },
    bouge: (p) => deplace((p.y - prise.current - bras(0)) / ECH),
  });
  const clavier = (e: KeyboardEvent<SVGGElement>) => {
    const cible = e.key === "ArrowDown" ? descente + 0.2 : e.key === "ArrowUp" ? descente - 0.2 : e.key === "PageDown" ? descente + 2 : e.key === "PageUp" ? descente - 2 : e.key === "Home" ? COURSE : e.key === "End" ? 0 : null;
    if (cible !== null) { e.preventDefault(); deplace(cible); }
  };
  const hauteur = r2(COURSE - descente);
  return (
    <g className="pl-archimede-potence" role="slider" tabIndex={0} aria-orientation="vertical" aria-label="Potence : hauteur du dynamomètre" aria-valuemin={0} aria-valuemax={COURSE} aria-valuenow={hauteur}
      aria-valuetext={`${nombre(hauteur, 1)} cm au-dessus de sa position basse`} onKeyDown={clavier} {...glisse}>
      <rect x={TIGE - 28} y={y - 24} width={78} height={48} fill="transparent" />
      <path d={`M ${TIGE + 10} ${y} H ${AXE + 6}`} stroke="var(--encre)" strokeWidth={3} strokeLinecap="round" />
      <rect className="pl-archimede-noix" x={TIGE - 10} y={y - 9} width={20} height={18} rx={4} />
      <circle cx={TIGE - 17} cy={y} r={5.5} fill="var(--cuivre)" />
      <path className="pl-archimede-chevron" d={`M ${TIGE - 5} ${y - 14} l 5 -5 l 5 5 M ${TIGE - 5} ${y + 14} l 5 5 l 5 -5`} />
      <text x={TIGE + 14} y={y - 6}>potence</text>
    </g>
  );
}

// Un cylindre à crochet, dessiné autour de son centre. `sous` : la hauteur de sa partie immergée, teintée par le liquide.
function Cylindre({ s, teinte, mouille, sous = 0, liquide = INCOLORE }: { s: Solide; teinte: string; mouille: boolean; sous?: number; liquide?: string }) {
  const h = s.hauteur * ECH;
  return (
    <g>
      <circle cy={-h / 2 - 4} r={3.5} className="pl-verre" />
      <rect className="pl-archimede-solide" x={-LARGEUR / 2} y={-h / 2} width={LARGEUR} height={h} rx={3} fill={teinte} />
      <text y={4} textAnchor="middle" className="pl-archimede-lettre">{s.id.toUpperCase()}</text>
      {sous > 0 && <rect x={-LARGEUR / 2} y={r2(h / 2 - sous)} width={LARGEUR} height={r2(sous)} rx={2} fill={liquide} pointerEvents="none" />}
      {mouille && sous <= 0 && (
        <g aria-hidden="true">
          <circle className="pl-archimede-goutte" cx={-8} cy={h / 2 + 1} r={2} />
          <circle className="pl-archimede-goutte" cx={7} cy={h / 2 - 16} r={1.6} />
          <circle className="pl-archimede-goutte pl-archimede-tombe" cx={3} cy={h / 2 + 2} r={2.2} />
        </g>
      )}
    </g>
  );
}

// ---------- la paillasse ----------

export default function Archimede({ reglages: r, protocole, attente, fini }: PropsPaillasse<ReglagesArchimede>) {
  const [partie, setPartie] = useState<Partie>(() => ({ etat: regles.depart(r), gestes: [] }));
  /** ce qui vient de se passer ; null après un déplacement de la potence : le message décrit alors ce qui se voit */
  const [parle, setParle] = useState<string | null>("Prends un objet en le glissant, ou touche-le puis touche l'endroit où le poser. La potence se glisse le long de sa tige.");
  const [saisie, setSaisie] = useState<"poids" | "volume" | null>(null);
  const guide = useGuide();
  const { etat, gestes } = partie;
  const sit = situation(r, etat);
  const pendu = solideDe(r, etat.accroche);
  const dessous = liquideDe(r, etat.dessous);

  const agit = useCallback((g: GesteBrut) => setPartie((p) => {
    const suite = regles.geste(r, p.etat, g);
    return suite === p.etat ? p : { etat: suite, gestes: ajoute(p.gestes, g) };
  }), [r]);
  /** Amène la potence à la descente voulue, par pas d'un demi-millimètre. */
  const deplace = (cible: number) => {
    const voulu = Math.max(0, Math.min(COURSE, cible));
    const apres = situation(r, regles.geste(r, etat, { g: "potence", v: Math.round((voulu - etat.descente) * 20) / 20 }));
    if (sit.immerge === 0 && apres.immerge > 0) son("goutte");
    setParle(null);
    setPartie((p) => {
      const g: GesteBrut = { g: "potence", v: Math.round((voulu - p.etat.descente) * 20) / 20 };
      const suite = regles.geste(r, p.etat, g);
      return suite === p.etat ? p : { etat: suite, gestes: ajoute(p.gestes, g) };
    });
  };

  // ----- prendre et poser -----
  const poser = (objet: string, cible: string) => {
    const suite = pose(r, etat, objet, cible);
    suite.gestes.forEach(agit);
    if (suite.message) setParle(suite.message);
  };
  /** le nom d'un objet dans une phrase, et le pronom qui va avec */
  const nomDe = (objet: string): [string, string] => {
    const [genre, id] = objet.split("-");
    if (genre === "sol") return [`le ${solideDe(r, id)?.nom ?? "cylindre"}`, "le"];
    if (genre === "ep") return [`l'éprouvette marquée « ${liquideDe(r, id)?.etiquette ?? ""} »`, "la"];
    return ["le papier absorbant", "le"];
  };
  const prise = (objet: string, ou: string[]) => {
    const [quoi, pronom] = nomDe(objet);
    setParle(ou.length > 0 ? `Tu tiens ${quoi}. Un anneau vert montre où ${pronom} poser.`
      : objet === "papier" ? "Tu tiens le papier absorbant, mais aucun cylindre n'est mouillé : il n'y a rien à essuyer."
      : `Tu tiens ${quoi}, mais sa place est prise pour l'instant.`);
  };
  const rate = (objet: string) => {
    setParle(objet === "papier" && !Object.keys(etat.humide).length ? "Aucun cylindre n'est mouillé : il n'y a rien à essuyer."
      : `Rien ne se pose à cet endroit. Reprends ${nomDe(objet)[0]} : un anneau vert montre où ${nomDe(objet)[1]} poser.`);
  };

  // ----- noter une lecture -----
  const ouvre = (quoi: "poids" | "volume") => {
    if (quoi === "poids" && !pendu) { setParle("Aucun solide n'est accroché au dynamomètre : il n'y a rien à peser."); return; }
    if (quoi === "volume" && !dessous) { setParle("Aucune éprouvette n'est sous le dynamomètre : pose-en une pour lire son niveau."); return; }
    setSaisie(quoi);
  };
  const dans = sit.immerge > 0 && dessous ? `dans ${dessous.nom}` : "dans l'air";
  const toutRecommencer = () => {
    setPartie({ etat: regles.depart(r), gestes: [] });
    setSaisie(null);
    setParle("La paillasse est remise comme au début.");
  };

  // ----- les positions qui dépendent de l'état -----
  const yBras = bras(etat.descente);
  /** le bout de la tige du dynamomètre, et le haut de ce qui y pend */
  const bout = r2(yBras + 70 + sit.force * PAR_NEWTON);
  const hautPendu = r2(FOND - (sit.bas + (pendu?.hauteur ?? 0)) * ECH);
  const yCrochet = r2(FOND - (HAUT_CROCHET - etat.descente) * ECH);
  /** un fil détendu, quand le solide repose, pend de côté */
  const mou = Math.max(0, FIL - (hautPendu - bout));
  const surface = sit.volume === null ? FOND : r2(FOND - (sit.volume / SECTION_EPROUVETTE) * ECH);
  const couleur = (id: string) => (id === r.reference ? INCOLORE : TEINTE_INCONNU);
  const teinte = (s: Solide) => TEINTES_SOLIDE[r.solides.indexOf(s) % TEINTES_SOLIDE.length];
  const releves = carnet(r, etat);
  /** où se trouve chaque objet, chaque cible : le dessin et la main du guide lisent les mêmes places */
  const surEtagere = (s: Solide): Point => ({ x: ETAGERE.x[r.solides.indexOf(s)] ?? ETAGERE.x[0], y: ETAGERE.y - (s.hauteur * ECH) / 2 });
  const auRepos = (l: Liquide): Point => ({ x: REPOS[r.liquides.indexOf(l)] ?? REPOS[REPOS.length - 1], y: BANC - EPROUVETTE.h / 2 });
  const auBout: Point = { x: AXE, y: hautPendu + ((pendu?.hauteur ?? 0) * ECH) / 2 };
  const objets: Record<string, Point> = {
    papier: PAPIER,
    ...Object.fromEntries(r.solides.map((s) => [`sol-${s.id}`, s.id === etat.accroche ? auBout : surEtagere(s)])),
    ...Object.fromEntries(r.liquides.map((l) => [`ep-${l.id}`, l.id === etat.dessous ? SOUS : auRepos(l)])),
  };
  const cibles: Record<string, Point> = {
    crochet: { x: AXE, y: yCrochet + 36 }, dessous: SOUS, pendu: auBout,
    ...Object.fromEntries(r.solides.map((s) => [`etagere-${s.id}`, surEtagere(s)])),
    ...Object.fromEntries(r.liquides.map((l) => [`repos-${l.id}`, auRepos(l)])),
  };

  // ----- le guide : le prochain geste, et où la main le montre -----
  const pas: PasDuGuide | null = guide.actif ? prochain(r, etat, { saisie }) : null;
  const laMain = (p: PasDuGuide): Indication["main"] => {
    switch (p.geste) {
      case "glisser": return objets[p.objet] && cibles[p.cible] ? { geste: "glisser", de: objets[p.objet], vers: cibles[p.cible] } : undefined;
      // la potence se prend par sa noix, et se glisse le long de la tige
      case "potence": return { geste: "glisser", de: { x: TIGE, y: yBras }, vers: { x: TIGE, y: bras(p.vers) } };
      // pendant la saisie, la loupe prend toute la vue : rien ne doit la cacher. Un chevron y montre le repère.
      default: return undefined;
    }
  };
  const indication: Indication | null = pas && { cle: pas.cle, texte: pas.texte, etape: pas.etape, main: laMain(pas), appel: pas.geste === "bouton" && pas.bouton === "fini" };
  /** la touche du bas que le guide met en avant */
  const vise = (bouton: string) => (pas?.geste === "bouton" && pas.bouton === bouton ? " pl-vise" : "");

  const outils = saisie === "poids" ? (
    <Releve nom={`Poids lu sur le dynamomètre, solide ${dans}`} unite="N" exemple="0,48" annule={() => setSaisie(null)}
      valide={(v) => { agit({ g: "noter", quoi: "poids", v }); setSaisie(null); setParle(`Poids noté, solide ${dans} : ${newtons(v)}.`); son("bip"); }} />
  ) : saisie === "volume" ? (
    <Releve nom={`Volume lu sur l'éprouvette, ${sit.immerge > 0 ? "avec le solide" : "sans le solide"}`} unite="mL" exemple="61,5" annule={() => setSaisie(null)}
      valide={(v) => { agit({ g: "noter", quoi: "volume", v }); setSaisie(null); setParle(`Volume noté, ${sit.immerge > 0 ? "avec le solide" : "sans le solide"} : ${ml(v)}.`); son("bip"); }} />
  ) : (
    <>
      <button type="button" className={`btn btn-ligne${vise("poids")}`} onClick={() => ouvre("poids")}>Noter le poids</button>
      <button type="button" className={`btn btn-ligne${vise("volume")}`} onClick={() => ouvre("volume")}>Noter le volume</button>
    </>
  );

  return (
    <Etabli titre="Poussée d'Archimède" protocole={protocole} message={parle ?? raconte(r, etat, sit)} attente={attente} fini={() => fini(gestes)} recommence={toutRecommencer} outils={outils} saisie={saisie !== null} indication={indication}>
      <Scene vue={saisie === "poids" ? zoom(LOUPE_D) : saisie === "volume" ? zoom(LOUPE_E) : VUE} nom="La paillasse de la poussée d'Archimède : une potence et son dynamomètre, des cylindres à accrocher, des éprouvettes de liquide">
        <Manipulation pose={poser} prise={prise} rate={rate}>
          {/* la paillasse, la potence : son socle, sa tige, son bras qui glisse, le dynamomètre et son fil */}
          <line className="pl-archimede-banc" x1={0} x2={360} y1={BANC} y2={BANC} />
          <rect className="pl-archimede-socle" x={14} y={SOCLE} width={138} height={BANC - SOCLE} rx={2} />
          <path className="pl-verre" d={`M ${TIGE} ${SOCLE} V -26`} strokeWidth={3} />
          <Potence descente={etat.descente} deplace={deplace} />
          <Dynamometre y={yBras} force={sit.force} />
          <path className="pl-archimede-fil" d={mou > 1 ? `M ${AXE} ${bout + 3} Q ${r2(AXE + Math.min(34, 8 + mou * 0.6))} ${r2((bout + hautPendu) / 2)} ${AXE} ${hautPendu - (pendu ? 7 : 0)}` : `M ${AXE} ${bout + 3} V ${hautPendu - (pendu ? 7 : 0)}`} />
          {!pendu && <path className="pl-verre" d={`M ${AXE} ${yCrochet} a 3 3 0 1 0 3 3`} />}

          {/* les deux loupes : l'index du dynamomètre, le niveau dans l'éprouvette posée dessous */}
          <text x={LOUPE_D.x} y={LOUPE_D.y - LOUPE_D.r - 7} textAnchor="middle" className="pl-fort">Dynamomètre, en N</text>
          <LoupeGraduee x={LOUPE_D.x} y={LOUPE_D.y} r={LOUPE_D.r} valeur={sit.force} pas={0.01} chiffre={5} parUnite={500} de={0} a={CALIBRE} decimales={2} nom="Loupe sur le dynamomètre, près de l'index" />
          <text x={LOUPE_E.x} y={LOUPE_E.y - LOUPE_E.r - 7} textAnchor="middle" className="pl-fort">Éprouvette, en mL</text>
          {dessous && sit.volume !== null
            ? <LoupeNiveau x={LOUPE_E.x} y={LOUPE_E.y} r={LOUPE_E.r} valeur={sit.volume} pas={1} majeur={5} parUnite={10} monte de={0} a={CAPACITE} couleur={couleur(dessous.id)} nom="Loupe sur l'éprouvette, près du niveau du liquide" />
            : (
              <Loupe x={LOUPE_E.x} y={LOUPE_E.y} r={LOUPE_E.r} nom="Loupe de l'éprouvette : aucune éprouvette sous le dynamomètre">
                <text x={LOUPE_E.x} y={LOUPE_E.y - 2} textAnchor="middle" className="pl-archimede-vide">pas d&apos;éprouvette</text>
                <text x={LOUPE_E.x} y={LOUPE_E.y + 10} textAnchor="middle" className="pl-archimede-vide">sous le dynamomètre</text>
              </Loupe>
            )}
          {/* avec le guide, pendant la lecture : un chevron montre l'index du dynamomètre, ou le bas du ménisque */}
          {saisie && pas && <path className="pl-main-pointe" d={saisie === "poids" ? `M ${LOUPE_D.x - 47} ${LOUPE_D.y - 5} l 9 5 l -9 5` : `M ${LOUPE_E.x - 40} ${LOUPE_E.y - 5} l 9 5 l -9 5`} aria-hidden="true" />}

          {/* les relevés de l'élève */}
          {releves.length > 0 && <text x={150} y={108} className="pl-fort">Mes relevés</text>}
          {releves.map((ligne, i) => <text key={ligne} x={150} y={124 + i * 14} className="pl-archimede-carnet">{ligne}</text>)}

          {/* l'étagère des cylindres */}
          <path className="pl-verre" d={`M 224 ${ETAGERE.y} H 356 M 232 ${ETAGERE.y} v 7 M 348 ${ETAGERE.y} v 7`} />

          {/* les cibles : où poser ce qu'on tient */}
          <Cible id="crochet" nom="le crochet du dynamomètre" {...cibles.crochet} r={24} accepte={r.solides.filter((s) => s.id !== etat.accroche).map((s) => `sol-${s.id}`)} />
          <Cible id="dessous" nom="le socle, sous le dynamomètre" {...cibles.dessous} r={34} accepte={r.liquides.filter((l) => l.id !== etat.dessous).map((l) => `ep-${l.id}`)} />
          {r.liquides.map((l) => <Cible key={l.id} id={`repos-${l.id}`} nom="sa place sur la paillasse" {...cibles[`repos-${l.id}`]} r={30} accepte={l.id === etat.dessous ? [`ep-${l.id}`] : []} />)}
          {r.solides.map((s) => (
            <Cible key={s.id} id={`etagere-${s.id}`} nom={s.id === etat.accroche ? "sa place sur l'étagère" : `le ${s.nom}, pour l'essuyer`} {...cibles[`etagere-${s.id}`]} r={22}
              accepte={s.id === etat.accroche ? [`sol-${s.id}`] : etat.humide[s.id] ? ["papier"] : []} />
          ))}
          {/* le papier ne se porte que sur un cylindre mouillé */}
          {pendu && <Cible id="pendu" nom={`le ${pendu.nom}, pour l'essuyer`} {...cibles.pendu} r={24} accepte={etat.humide[pendu.id] ? ["papier"] : []} />}

          {/* les éprouvettes : sur la paillasse, ou sous le dynamomètre */}
          {r.liquides.map((l) => {
            const ici = l.id === etat.dessous;
            return (
              <Objet key={l.id} id={`ep-${l.id}`} nom={`Éprouvette marquée « ${l.etiquette} »`} {...objets[`ep-${l.id}`]} l={EPROUVETTE.l + 12} h={EPROUVETTE.h}>
                <Eprouvette x={0} y={-EPROUVETTE.h / 2} l={EPROUVETTE.l} h={EPROUVETTE.h} volume={ici && sit.volume !== null ? sit.volume : l.volume} capacite={CAPACITE} couleur={couleur(l.id)} pas={2} majeur={10} />
                <text y={EPROUVETTE.h / 2 + (ici ? 18 : 12)} textAnchor="middle">{l.etiquette}</text>
              </Objet>
            );
          })}

          {/* les cylindres : sur l'étagère, ou au bout du fil */}
          {r.solides.map((s) => s.id !== etat.accroche && (
            <Objet key={s.id} id={`sol-${s.id}`} nom={majuscule(s.nom)} {...objets[`sol-${s.id}`]} l={44} h={s.hauteur * ECH + 12}>
              <Cylindre s={s} teinte={teinte(s)} mouille={etat.humide[s.id] !== undefined} />
            </Objet>
          ))}
          {/* dans l'éprouvette, le cylindre ne se prend pas : le doigt saisit l'éprouvette, à travers lui */}
          {pendu && (
            <g className="pl-archimede-pendu" style={{ pointerEvents: dessous && !degage(r, etat) ? "none" : undefined }}>
              <Objet id={`sol-${pendu.id}`} nom={majuscule(pendu.nom)} {...objets[`sol-${pendu.id}`]} l={44} h={pendu.hauteur * ECH + 12}>
                <Cylindre s={pendu} teinte={teinte(pendu)} mouille={etat.humide[pendu.id] !== undefined} sous={dessous ? Math.max(0, Math.min(pendu.hauteur * ECH, hautPendu + pendu.hauteur * ECH - surface)) : 0} liquide={dessous ? couleur(dessous.id) : INCOLORE} />
              </Objet>
            </g>
          )}

          {/* le papier absorbant */}
          <Objet id="papier" nom="Papier absorbant" {...objets.papier} l={44} h={44}>
            <rect className="pl-archimede-papier" x={-13} y={-10} width={26} height={32} rx={3} />
            <ellipse className="pl-archimede-papier" cy={-10} rx={13} ry={4.5} />
            <ellipse cy={-10} rx={4} ry={1.6} fill="var(--carte-2)" />
            <text y={38} textAnchor="middle">papier</text>
          </Objet>
        </Manipulation>
        {/* la main du guide, par-dessus tout le reste */}
        <Main indication={indication} />
      </Scene>
    </Etabli>
  );
}
