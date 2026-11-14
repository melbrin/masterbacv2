"use client";

// La paillasse Titrage : une burette, une prise d'essai, un indicateur coloré ou un pH-mètre. L'élève fait les gestes
// dans l'ordre qu'il veut ; la paillasse répond comme le vrai matériel (lib/commun/tp/titrage.ts). La suite de ses gestes
// part au serveur, qui la rejoue pour juger la manipulation.

import { useState } from "react";
import Icone from "@/components/appli/Icone";
import { Becher, Ecran } from "@/components/simulations/scenes/verrerie";
import { nombre } from "@/lib/commun/format";
import { AJOUTS, CAPACITE, DECALAGE, TITRAGE_INITIAL, geste, pHActuel, volumeLu, type EtatTitrage, type GesteTitrage, type ReglagesTitrage } from "@/lib/commun/tp/titrage";
import { INCOLORE, TEINTES_INDICATEUR, couleurIndicateur } from "./couleurs";

// Le dessin est compact : sur un téléphone, la paillasse reste en haut de l'écran pendant que l'élève fait ses gestes dessous.
const B = { x: 70, l: 14, haut: 16, bas: 118 }; // la burette, graduée de 0 mL (en haut) à 25 mL (en bas)
const AXE = B.x + B.l / 2;
const PAR_ML = (B.bas - B.haut) / CAPACITE;
const COL = 160; // le bas du col de l'erlenmeyer
const FOND = 208;
const G = { x0: 190, x1: 350, y0: 158, y1: 66 }; // la courbe du pH-mètre
const r = (x: number) => Math.round(x * 100) / 100;
const ml = (x: number) => `${nombre(x, 2)} mL`;

/** Pourquoi un geste ne change rien : ce que le matériel refuse. */
function refus(etat: EtatTitrage, g: GesteTitrage): string {
  if (g.g === "rincer") return "La burette est déjà remplie : le rinçage se fait avant.";
  if (g.g === "remplir") return "La burette est déjà remplie.";
  if (g.g === "zero") return etat.remplie ? "Le zéro se règle avant de verser." : "Remplis d'abord la burette.";
  if (g.g === "verser") return !etat.remplie ? "La burette est vide : remplis-la d'abord." : !etat.prise ? "Il n'y a rien à titrer : prélève d'abord la prise d'essai." : "La burette est vide : elle a donné ses 25 mL.";
  if (g.g === "noter") return "Entre un volume entre 0 et 25 mL.";
  return "";
}
/** Ce que la paillasse dit après un geste réussi. */
function echo(r_: ReglagesTitrage, etat: EtatTitrage, g: GesteTitrage): string {
  switch (g.g) {
    case "rincer": return "La burette est rincée avec la soude.";
    case "remplir": return "La burette est remplie, un peu au-dessus du zéro.";
    case "zero": return "Le bas du ménisque est sur la graduation zéro.";
    case "prise": return `Les ${nombre(r_.Va, 1)} mL de prise d'essai sont dans le récipient.`;
    case "indicateur": return `Quelques gouttes de ${TEINTES_INDICATEUR[r_.indicateur].nom} sont ajoutées.`;
    case "sonde": return "La sonde du pH-mètre plonge dans la solution.";
    case "agiter": return "L'agitation est lancée.";
    case "verser": return `Tu as versé ${g.v === 0.05 ? "une goutte" : ml(g.v)}. Lecture de la burette : ${ml(volumeLu(etat))}.`;
    case "noter": return `Volume noté pour l'équivalence : ${ml(etat.note ?? 0)}.`;
    case "recommencer": return "Nouveau titrage : la burette et le récipient sont vides.";
  }
}

export default function PaillasseTitrage({ reglages, fini, attente }: { reglages: ReglagesTitrage; fini: (gestes: GesteTitrage[]) => void; attente: boolean }) {
  const [{ etat, gestes }, setManip] = useState<{ etat: EtatTitrage; gestes: GesteTitrage[] }>({ etat: TITRAGE_INITIAL, gestes: [] });
  const [message, setMessage] = useState("Commence par préparer la burette et la prise d'essai.");
  const [curseur, setCurseur] = useState(12.5);
  const [confirme, setConfirme] = useState(false);
  const indicateur = reglages.suivi === "indicateur";
  const teintes = TEINTES_INDICATEUR[reglages.indicateur];

  const fais = (g: GesteTitrage) => {
    const suite = geste(reglages, etat, g);
    setConfirme(false);
    if (suite === etat) { setMessage(refus(etat, g)); return; }
    setManip({ etat: suite, gestes: [...gestes, g] });
    setMessage(echo(reglages, suite, g));
  };
  const termine = () => {
    if (etat.note === null && !confirme) { setConfirme(true); setMessage("Tu n'as pas noté de volume pour l'équivalence. Touche encore le bouton pour finir quand même."); return; }
    fini(gestes);
  };

  const pH = pHActuel(reglages, etat);
  const solution = etat.prise ? (indicateur && etat.indicateur ? couleurIndicateur(reglages.indicateur, pH) : INCOLORE) : "transparent";
  // sans réglage du zéro, la soude part d'un peu plus haut que la graduation zéro
  const niveau = B.haut + (etat.verse - (etat.zero ? 0 : DECALAGE)) * PAR_ML;
  const surface = r(188 - (etat.verse / CAPACITE) * 10);
  // la paroi de l'erlenmeyer s'écarte du col jusqu'au fond
  const paroi = (y: number) => r(8 + ((y - COL) / (FOND - 4 - COL)) * 30);
  const X = (V: number) => r(G.x0 + (V / CAPACITE) * (G.x1 - G.x0));
  const Y = (x: number) => r(G.y0 - (x / 14) * (G.y0 - G.y1));
  const etapes: { g: GesteTitrage; nom: string; fait: boolean }[] = [
    { g: { g: "rincer" }, nom: "Rincer la burette", fait: etat.rincee },
    { g: { g: "remplir" }, nom: "Remplir la burette", fait: etat.remplie },
    { g: { g: "zero" }, nom: "Ajuster le zéro", fait: etat.zero },
    { g: { g: "prise" }, nom: `Prélever ${nombre(reglages.Va, 1)} mL`, fait: etat.prise },
    indicateur ? { g: { g: "indicateur" }, nom: "Ajouter l'indicateur", fait: etat.indicateur } : { g: { g: "sonde" }, nom: "Plonger la sonde", fait: etat.sonde },
    { g: { g: "agiter" }, nom: "Lancer l'agitation", fait: etat.agitation },
  ];

  return (
    <div className="tp-paillasse">
      <div className="labo-ecran">
        <div className="labo-scene">
          <svg viewBox="0 0 360 214" role="img" aria-label={`Une burette de soude au-dessus d'un récipient. ${etat.remplie ? `Lecture de la burette : ${ml(volumeLu(etat))}.` : "La burette est vide."} ${etat.prise ? "La prise d'essai est dans le récipient." : "Le récipient est vide."}`}>
            {/* la burette, sa soude et ses graduations */}
            {etat.remplie && <rect x={B.x} y={r(niveau)} width={B.l} height={r(B.bas - niveau + 8)} fill="rgba(200, 220, 240, 0.55)" />}
            <path d={`M ${B.x} ${B.haut - 8} V ${B.bas + 2} L ${AXE - 2} ${B.bas + 9} V ${B.bas + 22} M ${B.x + B.l} ${B.haut - 8} V ${B.bas + 2} L ${AXE + 2} ${B.bas + 9} V ${B.bas + 22}`} fill="none" stroke="var(--encre)" strokeWidth={1.4} strokeLinejoin="round" />
            <path d={`M ${AXE - 7} ${B.bas + 13} H ${AXE + 7}`} stroke="var(--encre)" strokeWidth={4} strokeLinecap="round" />
            {[0, 5, 10, 15, 20, 25].map((v) => <g key={v}><line x1={B.x - 5} x2={B.x} y1={r(B.haut + v * PAR_ML)} y2={r(B.haut + v * PAR_ML)} stroke="var(--discret)" /><text x={B.x - 8} y={r(B.haut + v * PAR_ML) + 3.5} textAnchor="end">{v}</text></g>)}
            {/* la goutte du dernier ajout */}
            {gestes.length > 0 && gestes[gestes.length - 1].g === "verser" && <circle key={gestes.length} className="tp-goutte" cx={AXE} cy={B.bas + 26} r={2.6} fill="rgba(200, 220, 240, 0.9)" stroke="var(--encre)" strokeWidth={0.4} />}
            {/* le récipient : un erlenmeyer avec un indicateur, un bécher avec la sonde du pH-mètre */}
            {indicateur ? (
              <g>
                {etat.prise && <path d={`M ${AXE - paroi(surface)} ${surface} L ${AXE - 38} ${FOND - 4} Q ${AXE - 41} ${FOND} ${AXE - 35} ${FOND} H ${AXE + 35} Q ${AXE + 41} ${FOND} ${AXE + 38} ${FOND - 4} L ${AXE + paroi(surface)} ${surface} Z`} fill={solution} />}
                <path d={`M ${AXE - 8} ${COL - 10} V ${COL} L ${AXE - 38} ${FOND - 4} Q ${AXE - 41} ${FOND} ${AXE - 35} ${FOND} H ${AXE + 35} Q ${AXE + 41} ${FOND} ${AXE + 38} ${FOND - 4} L ${AXE + 8} ${COL} V ${COL - 10}`} fill="none" stroke="var(--encre)" strokeWidth={1.6} strokeLinejoin="round" />
              </g>
            ) : (
              <Becher x={AXE - 40} y={152} l={80} h={56} niveau={etat.prise ? 0.5 + (etat.verse / CAPACITE) * 0.3 : 0} couleur={INCOLORE}>
                {etat.sonde && <g><rect x={AXE + 18} y={132} width={8} height={66} rx={3} fill="var(--carte-2)" stroke="var(--encre)" strokeWidth={1.2} /><circle cx={AXE + 22} cy={194} r={2.6} fill="var(--bleu)" /></g>}
              </Becher>
            )}
            {etat.agitation && etat.prise && <line className="labo-helice" x1={AXE - 12} x2={AXE + 12} y1={FOND - 5} y2={FOND - 5} stroke="var(--encre)" strokeWidth={3} strokeLinecap="round" />}

            {indicateur ? (
              <g>
                <text x={166} y={24}>Lecture de la burette</text>
                <text x={166} y={50} className="labo-fort" style={{ fontSize: 22 }}>{etat.remplie ? ml(volumeLu(etat)) : "vide"}</text>
                <text x={166} y={80}>Indicateur : {teintes.nom}</text>
                <circle cx={172} cy={96} r={6} fill={teintes.couleurs[0]} stroke="var(--discret)" /><text x={184} y={100}>avant l&apos;équivalence : {teintes.avant}</text>
                <circle cx={172} cy={115} r={6} fill={teintes.couleurs[1]} stroke="var(--discret)" /><text x={184} y={119}>après : {teintes.apres}</text>
                {etat.note !== null && <g><text x={166} y={152}>Volume noté pour l&apos;équivalence</text><text x={166} y={176} className="labo-fort" style={{ fontSize: 18, fill: "var(--cuivre)" }}>{ml(etat.note)}</text></g>}
              </g>
            ) : (
              <g>
                <Ecran x={190} y={16} l={104} nom="pH-mètre" valeur={etat.sonde && etat.prise ? `pH ${nombre(pH, 2)}` : "pH …"} />
                <text x={352} y={24} textAnchor="end">burette</text>
                <text x={352} y={40} textAnchor="end" className="labo-fort">{etat.remplie ? ml(volumeLu(etat)) : "vide"}</text>
                {/* la courbe : un point à chaque ajout */}
                <path d={`M ${G.x0} ${G.y1 - 4} V ${G.y0} H ${G.x1 + 4}`} fill="none" stroke="var(--encre)" strokeWidth={1.2} />
                {[7, 14].map((x) => <g key={x}><line x1={G.x0 - 3} x2={G.x0} y1={Y(x)} y2={Y(x)} stroke="var(--encre)" /><text x={G.x0 - 5} y={Y(x) + 3.5} textAnchor="end">{x}</text></g>)}
                {[5, 10, 15, 20, 25].map((V) => <g key={V}><line x1={X(V)} x2={X(V)} y1={G.y0} y2={G.y0 + 3} stroke="var(--encre)" /><text x={X(V)} y={G.y0 + 13} textAnchor="middle">{V}</text></g>)}
                <text x={G.x0 - 5} y={G.y1 - 8} textAnchor="end">pH</text>
                <text x={G.x1 + 4} y={G.y0 + 26} textAnchor="end">volume versé (mL)</text>
                {etat.releves.length > 1 && <polyline points={etat.releves.map((p) => `${X(p.V)},${Y(p.pH)}`).join(" ")} fill="none" stroke="var(--cuivre)" strokeWidth={1.4} />}
                {etat.releves.map((p) => <circle key={p.V} cx={X(p.V)} cy={Y(p.pH)} r={2} fill="var(--cuivre)" />)}
                {etat.releves.length > 2 && <g><line x1={X(curseur)} x2={X(curseur)} y1={G.y1} y2={G.y0} stroke="var(--bleu)" strokeDasharray="3 3" /><text x={X(curseur)} y={G.y1 - 5} textAnchor="middle" className="labo-fort">{nombre(curseur, 2)}</text></g>}
                {etat.note !== null && <text x={G.x0} y={206} style={{ fill: "var(--cuivre)", fontWeight: 700 }}>Volume noté pour l&apos;équivalence : {ml(etat.note)}</text>}
              </g>
            )}
          </svg>
        </div>
        <div className="labo-verdict" role="status"><p className="labo-attente">{message}</p></div>
      </div>

      <section className="carte tp-gestes" aria-label="Gestes de la manipulation">
        <h3>Préparer</h3>
        <ul className="tp-preparer">
          {etapes.map((e) => <li key={e.nom}><button type="button" aria-pressed={e.fait} onClick={() => fais(e.g)}><span className="tp-coche" aria-hidden="true">{e.fait && <Icone nom="ok" />}</span>{e.nom}</button></li>)}
        </ul>
        <h3>Verser la soude</h3>
        <div className="tp-verser" role="group" aria-label="Verser la soude">
          {AJOUTS.map((v) => <button key={v} type="button" onClick={() => fais({ g: "verser", v })}>{v === 0.05 ? "1 goutte" : `${nombre(v, v < 1 ? 1 : 0)} mL`}</button>)}
        </div>
        <h3>Relever l&apos;équivalence</h3>
        {!indicateur && (
          <div className="tp-curseur">
            <label htmlFor="tp-curseur">Place le repère sur le saut de pH : {ml(curseur)}</label>
            <input id="tp-curseur" type="range" min={0} max={CAPACITE} step={0.05} value={curseur} onChange={(e) => setCurseur(Number(e.target.value))} aria-valuetext={ml(curseur)} />
          </div>
        )}
        <div className="tp-relever">
          <button type="button" className="btn btn-ligne" onClick={() => fais(indicateur ? { g: "noter" } : { g: "noter", v: curseur })}>{indicateur ? "Noter le volume" : "Noter ce volume"}</button>
          <button type="button" className="btn btn-cuivre" disabled={attente} onClick={termine}>{confirme ? "Finir quand même" : "J'ai fini"}</button>
        </div>
        <button type="button" className="btn-texte tp-recommencer" onClick={() => fais({ g: "recommencer" })}>Recommencer le titrage</button>
      </section>
    </div>
  );
}
