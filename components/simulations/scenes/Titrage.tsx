import { useId } from "react";
import { nombre } from "@/lib/commun/format";
import { verse, volumeEquivalent, volumeVerse } from "@/lib/commun/simulations/titrage";
import { r, teinte, type PropsScene } from "./types";

// Le titrage : la burette se vide goutte à goutte dans l'erlenmeyer, dont la solution change de couleur à l'équivalence.
const B = { x: 120, l: 16, haut: 14, bas: 148, capacite: 25 }; // la burette, graduée de 0 mL (en haut) à 25 mL (en bas)
const AXE = B.x + B.l / 2;
const PAR_ML = (B.bas - B.haut) / B.capacite;
const FOND = 252; // le fond de l'erlenmeyer
// les couleurs : [avant l'équivalence, après, dans la burette], chacune avec son opacité
const COULEURS = [
  { nom: "soude", avant: [214, 232, 246, 0.5], apres: [242, 110, 172, 0.92], burette: [200, 220, 240, 0.55], mots: ["incolore", "rose"] },
  { nom: "permanganate", avant: [214, 232, 205, 0.5], apres: [150, 80, 200, 0.92], burette: [142, 63, 192, 0.9], mots: ["presque incolore", "violet"] },
];
const rgba = (c: number[]) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${c[3]})`;
const melange = (a: number[], b: number[], k: number) => a.map((x, i) => (i < 3 ? Math.round(x + (b[i] - x) * k) : r(x + (b[i] - x) * k)));

export default function SceneTitrage({ p, t, phase, issue, inconnues }: PropsScene) {
  const id = `fiole-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const couleurs = COULEURS[p.couleur] ?? COULEURS[0];
  const total = volumeVerse(p);
  const V = phase === "pret" ? 0 : verse(p, t);
  const VE = volumeEquivalent(p);
  const coule = phase === "marche" && V < total;
  const finie = phase !== "pret" && V >= total;
  // la couleur change dans les deux derniers dixièmes de millilitre avant l'équivalence
  const vire = Math.max(0, Math.min(1, (V - VE + 0.2) / 0.2));
  const niveau = B.haut + Math.min(B.capacite, V) * PAR_ML;
  const surface = r(218 - (V / B.capacite) * 10);
  const arret = r(B.haut + Math.min(B.capacite, total) * PAR_ML);
  const arretConnu = !inconnues.includes("V");
  return (
    <svg viewBox="0 0 360 268" role="img" aria-label="Une burette graduée au-dessus d'un erlenmeyer. La solution de la burette tombe goutte à goutte dans l'erlenmeyer, dont la couleur change à l'équivalence.">
      <defs><clipPath id={id}><path d={`M 119 180 V 193 L 78 246 Q 75 ${FOND} 81 ${FOND} H 175 Q 181 ${FOND} 178 246 L 137 193 V 180 Z`} /></clipPath></defs>
      {/* la burette, sa solution et ses graduations */}
      <rect x={B.x} y={r(niveau)} width={B.l} height={r(B.bas - niveau + 8)} fill={rgba(couleurs.burette)} />
      <path d={`M ${B.x} ${B.haut - 8} V ${B.bas + 2} L ${AXE - 2} ${B.bas + 10} V ${B.bas + 26} M ${B.x + B.l} ${B.haut - 8} V ${B.bas + 2} L ${AXE + 2} ${B.bas + 10} V ${B.bas + 26}`} fill="none" stroke="var(--encre)" strokeWidth={1.4} strokeLinejoin="round" />
      <path d={`M ${AXE - 7} ${B.bas + 14} H ${AXE + 7}`} stroke={coule ? "var(--cuivre)" : "var(--encre)"} strokeWidth={4} strokeLinecap="round" />
      {[0, 5, 10, 15, 20, 25].map((v) => <g key={v}><line x1={B.x + B.l} x2={B.x + B.l + 5} y1={r(B.haut + v * PAR_ML)} y2={r(B.haut + v * PAR_ML)} stroke="var(--discret)" /><text x={B.x + B.l + 8} y={r(B.haut + v * PAR_ML) + 3.5}>{v}</text></g>)}
      {/* le repère du volume où la burette s'arrête */}
      {arretConnu && (
        <g className={phase === "pret" ? "labo-appel-doux" : undefined}>
          <path d={`M ${B.x - 3} ${arret} l -9 -5 v 10 z`} fill="var(--cuivre)" />
          <text x={B.x - 16} y={arret + 4} textAnchor="end" className="labo-fort">{nombre(total, 1)} mL</text>
        </g>
      )}
      {/* les gouttes */}
      {coule && [0, 0.5].map((d) => <circle key={d} cx={AXE} cy={r(B.bas + 30 + ((t * 2.2 + d) % 1) * (surface - B.bas - 30))} r={2.3} fill={rgba(couleurs.burette)} stroke="var(--encre)" strokeWidth={0.4} />)}
      {/* l'erlenmeyer et sa solution */}
      <g clipPath={`url(#${id})`}>
        <rect x={70} y={surface} width={116} height={FOND - surface + 2} fill={rgba(melange(couleurs.avant, couleurs.apres, vire))} />
        {coule && <line className="labo-helice" x1={116} x2={140} y1={FOND - 5} y2={FOND - 5} stroke="var(--encre)" strokeWidth={3} strokeLinecap="round" />}
      </g>
      <path d={`M 119 180 V 193 L 78 246 Q 75 ${FOND} 81 ${FOND} H 175 Q 181 ${FOND} 178 246 L 137 193 V 180`} fill="none" stroke={teinte(finie ? issue : null)} strokeWidth={finie && issue ? 2.2 : 1.6} strokeLinejoin="round" />
      {vire > 0 && phase !== "pret" && <circle className="labo-onde" cx={AXE} cy={232} r={26} fill="none" stroke={rgba(couleurs.apres)} strokeWidth={2.5} />}
      {/* ce qu'il y a dans la verrerie, et les deux couleurs à reconnaître */}
      <text x={204} y={28}>Dans la burette</text>
      <text x={204} y={43} className="labo-fort">{couleurs.nom} : {inconnues.includes("CB") ? "?" : `${nombre(p.CB, 3)} mol/L`}</text>
      <text x={204} y={66}>Dans l&apos;erlenmeyer</text>
      <text x={204} y={81} className="labo-fort">{nombre(p.VA, 1)} mL à {nombre(p.CA, 3)} mol/L</text>
      <text x={204} y={104}>Couleur de la solution</text>
      <circle cx={210} cy={119} r={6} fill={rgba(couleurs.avant)} stroke="var(--discret)" /><text x={222} y={123}>avant : {couleurs.mots[0]}</text>
      <circle cx={210} cy={138} r={6} fill={rgba(couleurs.apres)} stroke="var(--discret)" /><text x={222} y={142}>à l&apos;équivalence : {couleurs.mots[1]}</text>
      <text x={204} y={178}>Volume versé</text>
      <text x={204} y={202} className="labo-fort" style={{ fontSize: 20 }}>{nombre(V, 1)} mL</text>
    </svg>
  );
}
