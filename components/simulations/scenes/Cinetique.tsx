import { nombre } from "@/lib/commun/format";
import { instantArret, partRestante, tempsEcrit } from "@/lib/commun/simulations/cinetique";
import { r, teinte, type PropsScene } from "./types";
import { Becher, couleurSolution } from "./verrerie";

// La cinétique : la solution se décolore à mesure que le réactif coloré disparaît, et la courbe de la part restante descend.
const G = { x0: 190, x1: 348, y0: 196, y1: 46 }; // le cadre du graphique

export default function SceneCinetique({ p, t, phase, issue, inconnues }: PropsScene) {
  const arret = instantArret(p);
  const fin = 1.15 * arret;
  const ts = phase === "pret" ? 0 : Math.min(t, fin);
  // la réaction s'arrête à l'instant choisi : la couleur ne change plus ensuite
  const reste = partRestante(p, Math.min(ts, arret));
  const X = (x: number) => r(G.x0 + (Math.min(x, fin) / fin) * (G.x1 - G.x0));
  const Y = (f: number) => r(G.y0 - f * (G.y0 - G.y1));
  const courbe = Array.from({ length: 61 }, (_, i) => (i / 60) * ts).map((x, i) => `${i ? "L" : "M"}${X(x)},${Y(partRestante(p, x))}`).join(" ");
  const dateConnue = !inconnues.includes("date");
  const arretee = phase !== "pret" && ts >= arret;
  return (
    <svg viewBox="0 0 360 232" role="img" aria-label="Un bécher dont la solution colorée se décolore au cours du temps. À côté, la courbe de la part du réactif qui reste.">
      <Becher x={36} y={58} l={116} h={112} niveau={0.74} couleur={couleurSolution(1, reste)}>
        {phase === "marche" && !arretee && <line className="labo-helice" x1={80} x2={108} y1={163} y2={163} stroke="var(--encre)" strokeWidth={3} strokeLinecap="round" />}
      </Becher>
      <text x={94} y={190} textAnchor="middle" className="labo-fort">{nombre(100 * reste, 0)} % du réactif</text>
      <text x={94} y={206} textAnchor="middle"><tspan fontStyle="italic">k</tspan> = {inconnues.includes("k") ? "?" : `${nombre(p.k, 3)} par ${p.unite ? "min" : "s"}`}</text>
      {arretee && <text x={94} y={46} textAnchor="middle" className="labo-fort" style={{ fill: teinte(issue) }}>réaction arrêtée</text>}
      {/* la courbe de la part restante */}
      <line className={phase === "pret" ? "labo-appel-doux" : undefined} x1={G.x0} x2={G.x1} y1={Y(p.cible)} y2={Y(p.cible)} stroke="var(--cuivre)" strokeDasharray="4 4" />
      <text x={G.x0 + 6} y={Y(p.cible) - 5}>visé : {nombre(100 * p.cible, 0)} %</text>
      {dateConnue && (
        <g>
          <line x1={X(arret)} x2={X(arret)} y1={G.y1} y2={G.y0} stroke="var(--discret)" strokeDasharray="2 4" />
          <text x={X(arret)} y={G.y0 + 14} textAnchor="middle">{tempsEcrit(p, arret)}</text>
        </g>
      )}
      <path d={`M ${G.x0} ${G.y1 - 6} V ${G.y0} H ${G.x1 + 4}`} fill="none" stroke="var(--encre)" strokeWidth={1.2} />
      <text x={G.x0 + 6} y={G.y1 - 12}>réactif restant (%)</text>
      {[1, 0.5].map((f) => <g key={f}><line x1={G.x0 - 3} x2={G.x0} y1={Y(f)} y2={Y(f)} stroke="var(--encre)" /><text x={G.x0 - 6} y={Y(f) + 4} textAnchor="end">{100 * f}</text></g>)}
      <path d={courbe} fill="none" stroke="var(--cuivre)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      {arretee && <circle className="labo-impact" cx={X(arret)} cy={Y(partRestante(p, arret))} r={5} fill={teinte(issue)} />}
    </svg>
  );
}
