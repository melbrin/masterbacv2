import { nombre } from "@/lib/commun/format";
import { instantChoisi, temperature } from "@/lib/commun/simulations/temperature";
import { r, teinte, type PropsScene } from "./types";

// Le thé : un récipient dont la couleur suit la température, un thermomètre avec la température visée,
// et la courbe θ(t). En chauffe, le socle de la bouilloire rougit tant qu'il est allumé.
const TH = { x: 164, haut: 44, bas: 190 }; // le tube du thermomètre, de 100 °C (haut) à 0 °C (bas)
const G = { x0: 226, x1: 348, y0: 196, y1: 50 }; // le cadre du graphique

// La couleur du liquide : bleue à 20 °C, ambrée à 60 °C, rouge à 100 °C.
const FROID = [76, 141, 240], TIEDE = [240, 178, 74], CHAUD = [238, 90, 58];
function couleur(theta: number): string {
  const k = Math.max(0, Math.min(1, (theta - 20) / 80)) * 2;
  const [a, b, part] = k < 1 ? [FROID, TIEDE, k] : [TIEDE, CHAUD, k - 1];
  return `rgb(${a.map((x, i) => Math.round(x + (b[i] - x) * part)).join(" ")})`;
}

export default function SceneTemperature({ p, t, phase, issue, inconnues }: PropsScene) {
  const chauffe = p.mode === 0;
  const connu = !inconnues.includes(chauffe ? "chauffe" : "date");
  const choisi = instantChoisi(p);
  const fin = 1.15 * choisi + 1;
  const ts = phase === "pret" ? 0 : Math.min(t, fin);
  const theta = temperature(p, ts);
  const enChauffe = chauffe && phase === "marche" && ts < p.chauffe;
  const passe = phase !== "pret" && ts >= choisi;
  const yTh = (x: number) => r(TH.bas - (Math.max(0, Math.min(100, x)) / 100) * (TH.bas - TH.haut));
  const X = (x: number) => r(G.x0 + (Math.min(x, fin) / fin) * (G.x1 - G.x0));
  const Y = (y: number) => r(G.y0 - (Math.max(0, Math.min(100, y)) / 100) * (G.y0 - G.y1));
  const courbe = Array.from({ length: 61 }, (_, i) => (i / 60) * ts).map((x, i) => `${i ? "L" : "M"}${X(x)},${Y(temperature(p, x))}`).join(" ");
  const vapeur = Math.max(0, Math.min(1, (theta - 45) / 40));
  return (
    <svg viewBox="0 0 360 232" role="img" aria-label={chauffe ? "Une bouilloire chauffe de l'eau. Un thermomètre et une courbe montrent sa température." : "Une tasse de thé refroidit. Un thermomètre et une courbe montrent sa température."}>
      {/* la vapeur */}
      <g className="labo-vapeur" fill="none" stroke="var(--discret)" strokeWidth={2} strokeLinecap="round" opacity={r(vapeur)}>
        <path d="M 62 82 q -8 -10 0 -20 q 8 -10 0 -20" /><path d="M 86 86 q -8 -10 0 -20 q 8 -10 0 -20" /><path d="M 110 82 q -8 -10 0 -20 q 8 -10 0 -20" />
      </g>
      {/* le récipient : une bouilloire avec son bec en chauffe, une tasse avec son anse ensuite */}
      {chauffe ? <path d="M 40 112 L 22 100 L 22 108 L 40 128" fill="var(--carte)" stroke="var(--encre)" strokeWidth={2} strokeLinejoin="round" />
        : <path d="M 132 118 q 26 0 26 24 q 0 24 -26 24" fill="none" stroke="var(--encre)" strokeWidth={5} />}
      <path d="M 40 96 H 132 V 176 q 0 14 -14 14 H 54 q -14 0 -14 -14 Z" fill="var(--carte)" stroke="var(--encre)" strokeWidth={2} />
      <path d="M 46 108 H 126 V 174 q 0 10 -10 10 H 56 q -10 0 -10 -10 Z" fill={couleur(theta)} />
      <text x={86} y={153} textAnchor="middle" className="labo-grand">{nombre(theta, 1)} °C</text>
      {/* le socle de la bouilloire, ou la table */}
      {chauffe ? <rect className={enChauffe ? "labo-chauffe" : undefined} x={30} y={194} width={112} height={12} rx={5} fill={enChauffe ? "var(--brique)" : "var(--discret)"} />
        : <line x1={20} x2={150} y1={194} y2={194} stroke="var(--discret)" strokeWidth={2} />}
      <text x={86} y={223} textAnchor="middle">{chauffe ? (enChauffe ? `en chauffe : ${nombre(p.P, 0)} W` : phase === "pret" ? `bouilloire de ${nombre(p.P, 0)} W` : "chauffe arrêtée") : `pièce à ${nombre(p.thetaTh, 0)} °C`}</text>
      {/* le thermomètre et la température visée */}
      <rect x={TH.x} y={TH.haut - 6} width={12} height={TH.bas - TH.haut + 12} rx={6} fill="var(--carte-2)" stroke="var(--discret)" />
      <rect x={TH.x + 3} y={yTh(theta)} width={6} height={r(TH.bas - yTh(theta) + 4)} rx={3} fill={couleur(theta)} />
      <circle cx={TH.x + 6} cy={TH.bas + 12} r={9} fill={couleur(theta)} stroke="var(--discret)" />
      {[0, 20, 40, 60, 80, 100].map((x) => <g key={x}><line x1={TH.x + 12} x2={TH.x + 17} y1={yTh(x)} y2={yTh(x)} stroke="var(--discret)" /><text x={TH.x + 20} y={yTh(x) + 4}>{x}</text></g>)}
      <path className={phase === "pret" ? "labo-appel-doux" : undefined} d={`M ${TH.x - 3} ${yTh(p.cible)} l -9 -5 v 10 z`} fill="var(--cuivre)" />
      {/* la courbe θ(t) */}
      <line x1={G.x0} x2={G.x1} y1={Y(p.cible)} y2={Y(p.cible)} stroke="var(--cuivre)" strokeDasharray="4 4" />
      <text x={G.x0 + 6} y={Y(p.cible) + (chauffe ? -5 : 13)}>visée : {nombre(p.cible, 0)} °C</text>
      {connu && (
        <g>
          <line x1={X(choisi)} x2={X(choisi)} y1={G.y1} y2={G.y0} stroke="var(--discret)" strokeDasharray="2 4" />
          <text x={X(choisi)} y={G.y0 + 14} textAnchor="middle">{chauffe ? `${nombre(p.chauffe, 0)} s` : `${nombre(p.date, 1)} min`}</text>
        </g>
      )}
      <path d={`M ${G.x0} ${G.y1 - 4} V ${G.y0} H ${G.x1 + 4}`} fill="none" stroke="var(--encre)" strokeWidth={1.2} />
      <text x={G.x0 + 6} y={G.y1 - 12}><tspan fontStyle="italic">θ</tspan> (°C)</text>
      <path d={courbe} fill="none" stroke="var(--cuivre)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      {passe && <circle className="labo-impact" cx={X(choisi)} cy={Y(temperature(p, choisi))} r={5} fill={teinte(issue)} />}
    </svg>
  );
}
