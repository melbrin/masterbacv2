import { nombre } from "@/lib/commun/format";
import { APPROCHE, DEMI_CIBLE, avancee, dureeChute, positionColis } from "@/lib/commun/simulations/largage";
import { r, teinte, type PropsScene } from "./types";

const LARGEUR = 360;
const SOL = 26; // la bande du sol, sous la scène, en unités du dessin

// Le largage : le drone arrive par la gauche, lâche le colis au point choisi, et le colis suit sa parabole jusqu'au sol.
// L'origine du dessin est au centre de la cible ; l'échelle est la même à l'horizontale et à la verticale.
export default function SceneLargage({ p, t, phase, issue, inconnues }: PropsScene) {
  const chute = dureeChute(p.H);
  const tau = phase === "pret" ? -APPROCHE : t - APPROCHE; // le temps compté depuis le largage
  const portee = avancee(p);
  // le monde montré : du point où le drone entre en scène jusqu'après la cible et le point de chute
  const gauche = -(p.d + p.v * APPROCHE) - 6;
  const droite = Math.max(12, portee - p.d + 8);
  const haut = p.H * 1.18 + 4;
  const e = Math.min(LARGEUR / (droite - gauche), 250 / haut);
  const marge = (LARGEUR - (droite - gauche) * e) / 2;
  const X = (x: number) => r(marge + (x - gauche) * e);
  const Y = (y: number) => r((haut - y) * e);
  const hauteurDessin = r(haut * e + SOL);
  const drone = { x: -p.d + p.v * Math.max(-APPROCHE, tau), y: p.H };
  const lache = tau >= 0;
  const colis = lache ? { x: -p.d + positionColis(p, tau).x, y: positionColis(p, tau).y } : { x: drone.x, y: p.H - 0.9 };
  const auSol = lache && tau >= chute;
  const trace = lache ? Array.from({ length: Math.floor(Math.min(tau, chute) / 0.15) + 1 }, (_, i) => positionColis(p, i * 0.15)) : [];
  const pas = droite - gauche > 70 ? 20 : 10;
  const graduations = Array.from({ length: Math.floor((droite - gauche) / pas) + 2 }, (_, i) => Math.ceil(gauche / pas) * pas + i * pas).filter((x) => x <= droite);
  const resultat = auSol ? issue : null; // le résultat ne se montre que quand le colis touche le sol
  return (
    <svg viewBox={`0 0 ${LARGEUR} ${hauteurDessin}`} role="img" aria-label="Un drone vole à l'horizontale et lâche un colis au-dessus d'une cible posée au sol.">
      {/* l'altitude du drone */}
      <line x1={0} x2={LARGEUR} y1={Y(p.H)} y2={Y(p.H)} stroke="var(--filet)" strokeDasharray="3 5" />
      <path d={`M 9 ${Y(p.H) + 4} V ${Y(0) - 4} M 6 ${Y(p.H) + 9} l 3 -5 l 3 5 M 6 ${Y(0) - 9} l 3 5 l 3 -5`} fill="none" stroke="var(--discret)" strokeWidth={1} />
      <text x={15} y={r((Y(p.H) + Y(0)) / 2) + 4}><tspan fontStyle="italic">H</tspan> = {inconnues.includes("H") ? "?" : `${nombre(p.H, 1)} m`}</text>
      {/* le sol, ses graduations, la cible et son drapeau */}
      <rect x={0} y={Y(0)} width={LARGEUR} height={SOL} fill="var(--carte-2)" />
      <line x1={0} x2={LARGEUR} y1={Y(0)} y2={Y(0)} stroke="var(--encre)" strokeWidth={1.5} />
      {graduations.map((x) => (
        <g key={x}><line x1={X(x)} x2={X(x)} y1={Y(0)} y2={Y(0) + 4} stroke="var(--encre)" /><text x={X(x)} y={Y(0) + 16} textAnchor="middle">{x === 0 ? "cible" : `${Math.abs(x)} m`}</text></g>
      ))}
      <rect x={X(-DEMI_CIBLE) - 1} y={Y(0) - 4} width={r(2 * DEMI_CIBLE * e) + 2} height={5} rx={2} fill={teinte(resultat, "var(--sable)")} />
      <path d={`M ${X(0)} ${Y(0) - 4} V ${Y(0) - 22} l 11 4.5 l -11 4.5`} fill={teinte(resultat, "var(--sable)")} stroke={teinte(resultat, "var(--sable)")} strokeWidth={1.2} strokeLinejoin="round" />
      {/* le point de largage, une fois la distance choisie */}
      {!inconnues.includes("d") && (
        <g>
          <line x1={X(-p.d)} x2={X(-p.d)} y1={Y(p.H) + 6} y2={Y(0)} stroke="var(--cuivre)" strokeDasharray="2 4" opacity={0.75} />
          <text x={X(-p.d) + 5} y={Y(0) - 6} className="labo-fort">largage</text>
        </g>
      )}
      {/* la trace du colis */}
      {trace.map((q, i) => <circle key={i} cx={X(-p.d + q.x)} cy={Y(q.y)} r={1.7} fill="var(--cuivre)" opacity={0.8} />)}
      {/* le colis */}
      <rect x={X(colis.x) - 4.5} y={Y(colis.y) - 4.5} width={9} height={9} rx={1.5} fill="var(--sable)" stroke="var(--encre)" strokeWidth={0.8} />
      {/* le drone */}
      <g transform={`translate(${X(drone.x)} ${Y(drone.y)})`} stroke="var(--encre)" strokeLinecap="round">
        <rect x={-9} y={-5} width={18} height={7} rx={3.5} fill="var(--bleu)" strokeWidth={1} />
        <path d="M -9 -4 L -17 -8 M 9 -4 L 17 -8" strokeWidth={1.4} fill="none" />
        <line className="labo-helice" x1={-24} x2={-10} y1={-8.5} y2={-8.5} strokeWidth={1.8} />
        <line className="labo-helice" x1={10} x2={24} y1={-8.5} y2={-8.5} strokeWidth={1.8} />
      </g>
      {/* l'arrivée au sol */}
      {phase === "pret" && <circle className="labo-appel" cx={X(0)} cy={Y(0) - 3} r={9} fill="none" stroke="var(--sable)" strokeWidth={1.5} />}
      {auSol && <circle className="labo-impact" cx={X(colis.x)} cy={Y(0) - 2} r={8} fill="none" stroke={teinte(resultat)} strokeWidth={2} />}
    </svg>
  );
}
