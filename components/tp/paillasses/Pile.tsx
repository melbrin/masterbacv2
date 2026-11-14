"use client";

// La paillasse Pile (décision 0012). L'élève y fait les gestes du laboratoire, à la main : il plonge chaque lame dans une
// solution, pose le pont salin entre deux béchers, tourne le sélecteur du multimètre, tire un fil de chaque borne jusqu'à
// une lame, et lit la tension et son signe sur l'afficheur. Il note la tension, puis la lame qu'il juge positive.
// Chaque geste passe par les règles (lib/commun/tp/paillasses/pile.ts) ; la liste des gestes part au serveur.
// Le guide (lib/commun/tp/paillasses/pile-guide.ts) dit le prochain geste ; ici, la main le montre à sa place dans le dessin.

import { useCallback, useState } from "react";
import { nombre } from "@/lib/commun/format";
import { POSITIONS, affichage, clePile, demiPileDe, mesure, regles, type DemiPile, type EtatPile, type ReglagesPile } from "@/lib/commun/tp/paillasses/pile";
import { croixDuFil, essaie, lameDe, nomBorne, nu, pose, prochain, type PasDuGuide, type Pose } from "@/lib/commun/tp/paillasses/pile-guide";
import type { GesteBrut, PropsPaillasse } from "@/lib/commun/tp/types";
import { Afficheur, Becher, Cible, EAU, Etabli, Fils, Main, Manipulation, Molette, Objet, Releve, Scene, couleurSolution, son, useGuide, type Borne, type Indication, type Point, type Vue } from "../kit";
import { CroixDeSecours } from "./pile-fils";
import "./pile.css";

// ---------- la place de chaque chose dans le dessin (360 de large) ----------
const VUE: Vue = { x: 0, y: -44, l: 360, h: 566 };
/** Pendant la lecture, le regard se rapproche de l'afficheur du multimètre. */
const VUE_AFFICHEUR: Vue = { x: 12, y: -52, l: 184, h: 150 };
const MULTIMETRE = { x: 8, y: -38, l: 192, h: 196 };
const SELECTEUR = { x: 104, y: 80 };
const PRISES = { com: { x: 48, y: 138 }, v: { x: 104, y: 138 }, a: { x: 160, y: 138 } };
const BANC = 500;
const BECHER = { l: 76, h: 84, y: 356 };
/** Les axes des trois béchers, et le plateau où reposent les lames. */
const AXES = [62, 180, 298];
const PLATEAU = 482;
const LAME = { l: 12, h: 96 };
const PONT = { x: 300, y: 104 };
/** Le centre d'une lame plongée dans un bécher. */
const TREMPE = BECHER.y + BECHER.h - 8 - LAME.h / 2;
const TEINTES_SOLUTION = [EAU, couleurSolution(0, 0.5), "rgba(170, 218, 170, 0.32)", "rgba(96, 196, 134, 0.5)"];
const TEINTES_LAME: Record<string, string> = { Zn: "#B4BDCB", Cu: "#D48E5E", Fe: "#8C95A3", Ag: "#E8EBF0", Ni: "#A8B2A6", Sn: "#C7CBD2" };

const r2 = (n: number) => Math.round(n * 100) / 100;
const volts = (x: number) => `${nombre(x, Math.round(x * 1000) % 10 === 0 ? 2 : 3)} V`;
const REGLAGES = ["à l'arrêt", "voltmètre en courant continu, calibre 200 V", "voltmètre en courant continu, calibre 20 V", "voltmètre en courant continu, calibre 2 V", "voltmètre en courant continu, calibre 200 mV", "voltmètre en courant alternatif", "ampèremètre, calibre mA"];

interface Partie { etat: EtatPile; gestes: GesteBrut[] }

// Le pont salin : un tube en U retourné, plein d'un gel qui laisse passer les ions. Dessiné autour du milieu de son arche.
function PontSalin({ demi, jambes }: { demi: number; jambes: number }) {
  const d = `M ${-demi} ${jambes} V 8 Q ${-demi} 0 ${-demi + 8} 0 H ${demi - 8} Q ${demi} 0 ${demi} 8 V ${jambes}`;
  return (
    <g>
      <path className="pl-pile-pont-bord" d={d} />
      <path className="pl-pile-pont" d={d} />
    </g>
  );
}

// ---------- la paillasse ----------

export default function Pile({ reglages: r, protocole, attente, fini }: PropsPaillasse<ReglagesPile>) {
  const [partie, setPartie] = useState<Partie>(() => ({ etat: regles.depart(r), gestes: [] }));
  const [message, setMessage] = useState("Prends une lame ou le pont salin en les glissant, ou touche-les puis touche l'endroit où les poser. Un fil se tire d'une borne à une autre.");
  /** la saisie d'une mesure : d'abord la tension lue, puis la lame jugée positive */
  const [saisie, setSaisie] = useState<{ etape: "tension" } | { etape: "borne"; v: number } | null>(null);
  const guide = useGuide();
  const { etat, gestes } = partie;
  const m = mesure(r, etat);
  const ecran = affichage(r, etat);

  const agit = useCallback((g: GesteBrut) => setPartie((p) => {
    const suite = regles.geste(r, p.etat, g);
    return suite === p.etat ? p : { etat: suite, gestes: [...p.gestes, g] };
  }), [r]);
  /** Fait ce qu'un geste donne, et dit ce qui vient de se passer ; si le fusible vient de sauter, c'est cela qui se remarque. */
  const fait = (suite: Pose) => {
    suite.gestes.forEach(agit);
    if (suite.message) setMessage(suite.message);
    if (suite.claque) son("faux");
  };

  // ----- les noms et les places -----
  const rang = (id: string) => r.demiPiles.findIndex((d) => d.id === id);
  const axe = (id: string) => AXES[rang(id)] ?? AXES[0];
  const bornes: Borne[] = [
    { id: "com", ...PRISES.com, nom: "la borne COM du multimètre", teinte: "noire" },
    { id: "v", ...PRISES.v, nom: "la borne V du multimètre", teinte: "rouge" },
    { id: "a", ...PRISES.a, nom: "la borne mA du multimètre" },
    ...r.demiPiles.map((d): Borne => (etat.lames[d.id] !== undefined
      ? { id: d.id, x: axe(etat.lames[d.id]), y: TREMPE - LAME.h / 2 + 5, nom: `la ${lameDe(d)}` }
      : { id: d.id, x: axe(d.id) - LAME.h / 2 + 6, y: PLATEAU, nom: `la ${lameDe(d)}` })),
  ];
  const placeBorne = (id: string): Point => { const b = bornes.find((x) => x.id === id) ?? bornes[0]; return { x: b.x, y: b.y }; };
  const pont = etat.pont ? [rang(etat.pont[0]), rang(etat.pont[1])].sort((a, b) => a - b) : null;
  /** le pont posé : ses jambes plongent près du bord des deux béchers ; par-dessus le bécher du milieu, son arche est plus haute */
  const pontPose = pont ? { x: (AXES[pont[0]] + AXES[pont[1]]) / 2, demi: (AXES[pont[1]] - AXES[pont[0]]) / 2 - 22, y: pont[1] - pont[0] > 1 ? 306 : 334 } : null;
  /** où se trouve chaque objet, chaque cible : le dessin et la main du guide lisent les mêmes places */
  const objets: Record<string, Point> = {
    pont: pontPose ? { x: pontPose.x, y: pontPose.y + 8 } : { x: PONT.x, y: PONT.y + 8 },
    ...Object.fromEntries(r.demiPiles.map((d) => [`lame-${d.id}`, etat.lames[d.id] !== undefined ? { x: axe(etat.lames[d.id]), y: TREMPE } : { x: axe(d.id), y: PLATEAU }])),
  };
  const cibles: Record<string, Point> = {
    "pont-repos": { x: PONT.x, y: PONT.y + 8 },
    ...Object.fromEntries([[0, 1], [1, 2], [0, 2]].map(([i, j]) => [`pont-${i}-${j}`, { x: (AXES[i] + AXES[j]) / 2, y: j - i > 1 ? 306 : 340 }])),
    ...Object.fromEntries(r.demiPiles.flatMap((d, i) => [[`becher-${d.id}`, { x: AXES[i], y: TREMPE }], [`plateau-${d.id}`, { x: AXES[i], y: PLATEAU }]])),
  };

  // ----- prendre et poser, tourner, tirer un fil -----
  const poser = (objet: string, cible: string) => fait(pose(r, etat, objet, cible));
  const nomObjet = (objet: string): [string, string] => {
    const d = demiPileDe(r, objet.replace(/^lame-/, ""));
    return objet === "pont" || !d ? ["le pont salin", "le"] : [`la ${lameDe(d)}`, "la"];
  };
  const prise = (objet: string, ou: string[]) => {
    const [quoi, pronom] = nomObjet(objet);
    setMessage(ou.length > 1 ? `Tu tiens ${quoi}. Des anneaux verts montrent où ${pronom} poser.` : ou.length === 1 ? `Tu tiens ${quoi}. Un anneau vert montre où ${pronom} poser.` : `Tu tiens ${quoi}, mais aucune place n'est libre.`);
  };
  const rate = (objet: string, p: Point) => {
    const [quoi, pronom] = nomObjet(objet);
    const pris = objet !== "pont" && r.demiPiles.some((d, i) => Object.values(etat.lames).includes(d.id) && Math.hypot(p.x - AXES[i], p.y - TREMPE) < 52);
    setMessage(pris ? "Il y a déjà une lame dans ce bécher : retire-la d'abord." : `Rien ne se pose à cet endroit. Reprends ${quoi} : un anneau vert montre où ${pronom} poser.`);
  };
  const tourne = (v: number) => { agit({ g: "selecteur", v }); setMessage(`Sélecteur du multimètre : ${REGLAGES[v]}.`); };
  const relie = (a: string, b: string) => fait(essaie(r, etat, { g: "relier", a, b }, `Un fil relie ${nomBorne(r, a)} et ${nomBorne(r, b)}.`, "Il n'y a plus de fil sur la paillasse : retires-en un d'abord."));
  const retire = (a: string, b: string) => { agit({ g: "retirer", a, b }); setMessage("Le fil est retiré."); };

  // ----- noter une mesure -----
  const ouvre = () => {
    if (!m.couple) { setMessage("Le multimètre n'est pas branché sur deux lames plongées dans deux béchers : il n'y a pas de pile à mesurer."); return; }
    setSaisie({ etape: "tension" });
  };
  const note = (v: number, plus: DemiPile) => {
    agit({ g: "noter", v, plus: plus.id });
    setSaisie(null);
    setMessage(`Mesure notée : ${volts(v)}, borne positive : ${plus.metal}.`);
    son("bip");
  };
  const toutRecommencer = () => {
    setPartie({ etat: regles.depart(r), gestes: [] });
    setSaisie(null);
    setMessage("La paillasse est remise comme au début.");
  };
  const lamesMesurees = (m.couple ?? []).map((id) => demiPileDe(r, id)).filter((d): d is DemiPile => d !== null);

  // ----- le guide : le prochain geste, et où la main le montre -----
  const pas: PasDuGuide | null = guide.actif ? prochain(r, etat, { saisie: saisie?.etape ?? null }) : null;
  const laMain = (p: PasDuGuide): Indication["main"] => {
    switch (p.geste) {
      case "glisser": return objets[p.objet] && cibles[p.cible] ? { geste: "glisser", de: objets[p.objet], vers: cibles[p.cible] } : undefined;
      // les angles du sélecteur sont ceux de sa molette : 45 degrés par position
      case "tourner": return { geste: "tourner", ou: SELECTEUR, de: -135 + etat.selecteur * 45, a: -135 + p.vers * 45, r: 30 };
      case "fil": return { geste: "glisser", de: placeBorne(p.de), vers: placeBorne(p.vers) };
      // le fil se touche en son milieu, où apparaît la croix qui le retire ; ou sur sa croix de secours, si une borne couvre ce milieu
      case "retirer": { const croix = croixDuFil(bornes, p.a, p.b); return croix ? { geste: "toucher", ou: croix.ou } : undefined; }
      // pendant la lecture de la tension, l'afficheur prend toute la vue : rien ne doit le cacher
      case "montrer": return saisie?.etape === "tension" ? undefined : { geste: "montrer", ou: { x: 186, y: -2 } };
      default: return undefined;
    }
  };
  const indication: Indication | null = pas && { cle: pas.cle, texte: pas.texte, etape: pas.etape, main: laMain(pas), appel: pas.geste === "bouton" && pas.bouton === "fini" };
  /** la touche du bas que le guide met en avant */
  const vise = (bouton: string) => (pas?.geste === "bouton" && pas.bouton === bouton ? " pl-vise" : "");

  const outils = saisie?.etape === "tension" ? (
    <Releve nom="Tension lue sur l'afficheur, sans son signe" unite="V" exemple="1,083" annule={() => setSaisie(null)} valide={(v) => setSaisie({ etape: "borne", v })} />
  ) : saisie?.etape === "borne" ? (
    <div className="pl-releve" role="group" aria-label="La borne positive de la pile">
      <span className="pl-message">Tu as lu {volts(saisie.v)}. D&apos;après le signe affiché et tes branchements, quelle lame est la borne positive ?</span>
      <div className="pl-actions">
        {lamesMesurees.map((d) => <button key={d.id} type="button" className="btn btn-cuivre" onClick={() => note(saisie.v, d)}>{nu(d.metal).replace(/^./, (c) => c.toUpperCase())}</button>)}
        <button type="button" className="btn btn-ligne" onClick={() => setSaisie(null)}>Annuler</button>
      </div>
    </div>
  ) : pas?.geste === "bouton" && pas.bouton === "recommencer" ? (
    // le fusible a sauté : la faute ne se rattrape pas, le guide fait tout reprendre
    <button type="button" className="btn btn-ligne pl-vise" onClick={toutRecommencer}>Tout recommencer</button>
  ) : (
    <button type="button" className={`btn btn-ligne${vise("noter")}`} onClick={ouvre}>Noter la tension</button>
  );

  // ----- les relevés de l'élève, pile par pile -----
  const releves = Object.values(etat.notes).flatMap((n) => {
    // la pile porte le nom que le sujet lui donne, quand c'est une des piles demandées
    const [a, b] = (r.piles.find((p) => clePile(p[0], p[1]) === clePile(n.couple[0], n.couple[1])) ?? n.couple).map((id) => demiPileDe(r, id));
    return a && b ? [`Pile ${nu(a.metal)}-${nu(b.metal)} : ${volts(n.v)}`, `borne positive : ${demiPileDe(r, n.plus)?.metal ?? ""}`] : [];
  });
  const surface = BECHER.y + BECHER.h * 0.2;

  return (
    <Etabli titre="Pile et multimètre" protocole={protocole} message={message} attente={attente} fini={() => fini(gestes)} recommence={toutRecommencer} outils={outils} saisie={saisie !== null} indication={indication}>
      <Scene vue={saisie?.etape === "tension" ? VUE_AFFICHEUR : VUE} nom="La paillasse de la pile : un multimètre, trois béchers de solutions, trois lames de métal, un pont salin, des fils">
        <Manipulation pose={poser} prise={prise} rate={rate}>
          {/* le multimètre : son afficheur, son sélecteur, ses trois bornes */}
          <rect className="pl-pile-boitier" x={MULTIMETRE.x} y={MULTIMETRE.y} width={MULTIMETRE.l} height={MULTIMETRE.h} rx={12} />
          <Afficheur x={22} y={-30} l={164} h={30} valeur={ecran.texte} unite={ecran.unite} nom="Multimètre" eteint={ecran.eteint} />
          {/* les quatre calibres du voltmètre en courant continu, réunis par un arc autour du bouton */}
          <path className="pl-pile-secteur" d={`M ${r2(SELECTEUR.x - 30 * Math.sin((100 * Math.PI) / 180))} ${r2(SELECTEUR.y - 30 * Math.cos((100 * Math.PI) / 180))} A 30 30 0 0 1 ${r2(SELECTEUR.x + 30 * Math.sin((55 * Math.PI) / 180))} ${r2(SELECTEUR.y - 30 * Math.cos((55 * Math.PI) / 180))}`} />
          <text x={SELECTEUR.x} y={SELECTEUR.y - 62} textAnchor="middle" className="pl-pile-borne">V continu</text>
          {POSITIONS.map((p, i) => {
            const angle = ((-135 + i * 45) * Math.PI) / 180;
            return (
              <text key={p.nom} x={r2(SELECTEUR.x + 44 * Math.sin(angle))} y={r2(SELECTEUR.y - 44 * Math.cos(angle) + 3)} textAnchor={i === 3 ? "middle" : i < 3 ? "end" : "start"}
                className={`pl-pile-calibre${i === etat.selecteur ? " est-choisi" : ""}`}>{p.nom}</text>
            );
          })}
          <Molette x={SELECTEUR.x} y={SELECTEUR.y} r={34} valeur={etat.selecteur} min={0} max={POSITIONS.length - 1} pas={1} change={tourne} nom="Sélecteur du multimètre" texte={REGLAGES[etat.selecteur]}
            dessin={(angle) => (
              <g transform={`translate(${SELECTEUR.x} ${SELECTEUR.y})`}>
                <circle r={21} className="pl-pile-bouton" />
                <line y1={-7} y2={-19} className="pl-pile-index" transform={`rotate(${angle})`} />
              </g>
            )} />
          <text x={PRISES.com.x} y={PRISES.com.y - 12} textAnchor="middle" className="pl-pile-borne">COM</text>
          <text x={PRISES.v.x} y={PRISES.v.y - 12} textAnchor="middle" className="pl-pile-borne">V</text>
          <text x={PRISES.a.x} y={PRISES.a.y - 12} textAnchor="middle" className="pl-pile-borne">mA</text>
          {!etat.fusible && <text x={PRISES.a.x} y={PRISES.a.y + 17} textAnchor="middle" className="pl-pile-saute">fusible sauté</text>}

          {/* les relevés de l'élève */}
          {releves.length > 0 && <text x={212} y={-26} className="pl-fort">Mes relevés</text>}
          {releves.map((ligne, i) => <text key={`${i}-${ligne}`} x={i % 2 ? 220 : 212} y={-11 + i * 13 + Math.floor(i / 2) * 3} className="pl-pile-carnet">{ligne}</text>)}

          {/* la paillasse : les béchers de solutions, le plateau des lames */}
          <line className="pl-pile-banc" x1={0} x2={360} y1={BANC} y2={BANC} />
          <line className="pl-pile-banc" x1={0} x2={360} y1={BECHER.y + BECHER.h} y2={BECHER.y + BECHER.h} />
          {r.demiPiles.map((d, i) => (
            <g key={d.id}>
              <Becher x={AXES[i] - BECHER.l / 2} y={BECHER.y} l={BECHER.l} h={BECHER.h} niveau={0.8} couleur={TEINTES_SOLUTION[d.teinte] ?? EAU} />
              <text x={AXES[i]} y={BECHER.y + BECHER.h + 13} textAnchor="middle">{d.solution}</text>
              <rect className="pl-pile-plateau" x={AXES[i] - LAME.h / 2 - 4} y={PLATEAU - 11} width={LAME.h + 8} height={22} rx={5} />
            </g>
          ))}
          <path className="pl-verre" d={`M ${PONT.x - 6} ${PONT.y - 12} h 12`} />
          {!etat.pont && <text x={PONT.x} y={PONT.y + 50} textAnchor="middle">pont salin</text>}

          {/* les cibles : où poser ce qu'on tient */}
          {r.demiPiles.map((d, i) => (
            <Cible key={d.id} id={`becher-${d.id}`} nom={`le bécher de ${d.solution}`} {...cibles[`becher-${d.id}`]} r={30}
              accepte={Object.values(etat.lames).includes(d.id) ? [] : r.demiPiles.map((l) => `lame-${l.id}`)} />
          ))}
          {r.demiPiles.map((d) => <Cible key={d.id} id={`plateau-${d.id}`} nom="sa place sur le plateau" {...cibles[`plateau-${d.id}`]} r={24} accepte={etat.lames[d.id] !== undefined ? [`lame-${d.id}`] : []} />)}
          {[[0, 1], [1, 2], [0, 2]].map(([i, j]) => (
            <Cible key={`${i}-${j}`} id={`pont-${i}-${j}`} nom={`le dessus des béchers de ${r.demiPiles[i]?.solution} et de ${r.demiPiles[j]?.solution}`} {...cibles[`pont-${i}-${j}`]} r={22}
              accepte={pont && pont[0] === i && pont[1] === j ? [] : ["pont"]} />
          ))}
          <Cible id="pont-repos" nom="son crochet" {...cibles["pont-repos"]} r={26} accepte={etat.pont ? ["pont"] : []} />

          {/* le pont salin : à son crochet, ou entre deux béchers */}
          <Objet id="pont" nom="Pont salin" {...objets.pont} l={pontPose ? Math.max(60, pontPose.demi * 2) : 60} h={44}>
            <g transform="translate(0 -8)"><PontSalin demi={pontPose ? pontPose.demi : 22} jambes={pontPose ? surface + 22 - pontPose.y : 36} /></g>
          </Objet>

          {/* les lames : sur le plateau, ou dans un bécher */}
          {r.demiPiles.map((d) => {
            const becher = etat.lames[d.id];
            const hote = demiPileDe(r, becher);
            const teinte = TEINTES_LAME[d.symbole] ?? "#B4BDCB";
            return becher !== undefined ? (
              <Objet key={d.id} id={`lame-${d.id}`} nom={`${lameDe(d).replace(/^./, (c) => c.toUpperCase())}, dans le ${hote?.solution ?? "bécher"}`} {...objets[`lame-${d.id}`]} l={44} h={LAME.h + 4}>
                <rect className="pl-pile-lame" x={-LAME.l / 2} y={-LAME.h / 2} width={LAME.l} height={LAME.h} rx={1.5} fill={teinte} />
                {hote && hote.id !== d.id && d.potentiel < hote.potentiel && <rect className="pl-pile-depot" x={-LAME.l / 2} y={r2(surface - TREMPE)} width={LAME.l} height={r2(BECHER.y + BECHER.h - 8 - surface)} rx={1.5} />}
                <text x={3} y={-LAME.h / 2 + 30} textAnchor="middle" transform={`rotate(-90 0 ${-LAME.h / 2 + 30})`} className="pl-pile-symbole">{d.symbole}</text>
              </Objet>
            ) : (
              <Objet key={d.id} id={`lame-${d.id}`} nom={`${lameDe(d).replace(/^./, (c) => c.toUpperCase())}, sur le plateau`} {...objets[`lame-${d.id}`]} l={LAME.h} h={44}>
                <rect className="pl-pile-lame" x={-LAME.h / 2} y={-LAME.l / 2} width={LAME.h} height={LAME.l} rx={1.5} fill={teinte} />
                <text x={6} y={3} textAnchor="middle" className="pl-pile-symbole">{d.symbole}</text>
              </Objet>
            );
          })}

          {/* les fils : on en tire un d'une borne à une autre */}
          <Fils bornes={bornes} fils={etat.fils} relie={relie} retire={retire} />
          <CroixDeSecours bornes={bornes} fils={etat.fils} retire={retire} />
        </Manipulation>
        {/* la main du guide, par-dessus tout le reste */}
        <Main indication={indication} />
      </Scene>
    </Etabli>
  );
}
