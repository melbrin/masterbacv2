import { nombre } from "@/lib/commun/format";
import { NOYAUX, desintegration, dureeEcrite, fraction, instantMesure } from "@/lib/commun/simulations/radio";
import { r, teinte, type PropsScene } from "./types";

// La décroissance radioactive : cent noyaux qui se désintègrent un à un, et la courbe de la part qui reste.
const GRILLE = { x: 18, y: 30, pas: 13.4, rayon: 4.7 };
const G = { x0: 190, x1: 348, y0: 196, y1: 46 }; // le cadre du graphique

export default function SceneRadio({ p, t, phase, issue, inconnues }: PropsScene) {
  const mesure = instantMesure(p);
  const fin = 1.12 * mesure;
  const ts = phase === "pret" ? 0 : Math.min(t, fin);
  const eclat = fin / 28; // la durée pendant laquelle une désintégration reste marquée
  const noyaux = Array.from({ length: NOYAUX }, (_, i) => {
    // la place de chaque noyau est fixée par son rang : toujours la même, sans hasard
    const place = (i * 37 + 11) % NOYAUX;
    return { x: r(GRILLE.x + (place % 10) * GRILLE.pas + GRILLE.pas / 2), y: r(GRILLE.y + Math.floor(place / 10) * GRILLE.pas + GRILLE.pas / 2), age: ts - desintegration(p, i) };
  });
  const restants = noyaux.filter((n) => n.age < 0).length;
  const X = (x: number) => r(G.x0 + (Math.min(x, fin) / fin) * (G.x1 - G.x0));
  const Y = (f: number) => r(G.y0 - f * (G.y0 - G.y1));
  const courbe = Array.from({ length: 61 }, (_, i) => (i / 60) * ts).map((x, i) => `${i ? "L" : "M"}${X(x)},${Y(fraction(p, x))}`).join(" ");
  const dateConnue = !inconnues.includes("date");
  const passe = phase !== "pret" && ts >= mesure;
  const quoi = p.activite ? "A" : "N";
  return (
    <svg viewBox="0 0 360 232" role="img" aria-label="Cent noyaux radioactifs rangés en carré : ils s'éteignent un à un. À côté, la courbe de la part des noyaux qui restent au cours du temps.">
      {/* les noyaux : allumés tant qu'ils ne se sont pas désintégrés */}
      {noyaux.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={GRILLE.rayon} fill={n.age < 0 ? "var(--cuivre)" : "var(--carte-2)"} stroke={n.age < 0 ? "none" : "var(--filet)"} />
          {n.age >= 0 && n.age < eclat && <circle cx={n.x} cy={n.y} r={r(GRILLE.rayon + (n.age / eclat) * 7)} fill="none" stroke="var(--sable)" strokeWidth={1.4} opacity={r(1 - n.age / eclat)} />}
        </g>
      ))}
      <text x={GRILLE.x + 67} y={186} textAnchor="middle" className="labo-fort">{restants} noyaux sur {NOYAUX}</text>
      <text x={GRILLE.x + 67} y={202} textAnchor="middle">demi-vie : {inconnues.includes("demiVie") ? "?" : dureeEcrite(p, p.demiVie)}</text>
      {/* la courbe de la part restante */}
      <line className={phase === "pret" ? "labo-appel-doux" : undefined} x1={G.x0} x2={G.x1} y1={Y(p.cible)} y2={Y(p.cible)} stroke="var(--cuivre)" strokeDasharray="4 4" />
      <text x={G.x0 + 6} y={Y(p.cible) - 5}>visé : {nombre(100 * p.cible, 0)} %</text>
      {dateConnue && (
        <g>
          <line x1={X(mesure)} x2={X(mesure)} y1={G.y1} y2={G.y0} stroke="var(--discret)" strokeDasharray="2 4" />
          <text x={X(mesure)} y={G.y0 + 14} textAnchor="middle">{dureeEcrite(p, mesure)}</text>
        </g>
      )}
      <path d={`M ${G.x0} ${G.y1 - 6} V ${G.y0} H ${G.x1 + 4}`} fill="none" stroke="var(--encre)" strokeWidth={1.2} />
      <text x={G.x0 + 6} y={G.y1 - 12}><tspan fontStyle="italic">{quoi}</tspan>/<tspan fontStyle="italic">{quoi}</tspan><tspan dy={3} fontSize={8}>0</tspan><tspan dy={-3}> (%)</tspan></text>
      {[1, 0.5].map((f) => <g key={f}><line x1={G.x0 - 3} x2={G.x0} y1={Y(f)} y2={Y(f)} stroke="var(--encre)" /><text x={G.x0 - 6} y={Y(f) + 4} textAnchor="end">{100 * f}</text></g>)}
      <path d={courbe} fill="none" stroke="var(--cuivre)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      {passe && <circle className="labo-impact" cx={X(mesure)} cy={Y(fraction(p, mesure))} r={5} fill={teinte(issue)} />}
    </svg>
  );
}
