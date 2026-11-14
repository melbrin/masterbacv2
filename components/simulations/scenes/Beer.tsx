import { nombre } from "@/lib/commun/format";
import { MESURE_SPECTRO, absorbance, absorbanceAffichee, concentrationCuve } from "@/lib/commun/simulations/beer";
import { r, teinte, type PropsScene } from "./types";
import { Ecran, couleurSolution } from "./verrerie";

// Le spectrophotomètre : la lampe, le faisceau qui traverse la cuve et en sort affaibli, le détecteur et son écran.
// En dessous, la droite d'étalonnage A = k × C, avec l'absorbance voulue et le point de la solution mesurée.
const G = { x0: 60, x1: 338, y0: 204, y1: 112 }; // le cadre du graphique
const FAISCEAU = 44; // la hauteur du faisceau, en unités du dessin

export default function SceneBeer({ p, t, phase, issue, inconnues }: PropsScene) {
  const allumee = phase !== "pret" && t >= MESURE_SPECTRO.lampe;
  const stable = phase !== "pret" && t >= MESURE_SPECTRO.stable;
  const connue = inconnues.length === 0;
  const C = concentrationCuve(p);
  const A = absorbance(p);
  // l'échelle du graphique : jusqu'à deux fois la concentration qui donne l'absorbance voulue
  const cMax = (2 * p.cible) / p.k;
  const aMax = 2 * p.cible;
  const X = (c: number) => r(G.x0 + (Math.min(c, cMax) / cMax) * (G.x1 - G.x0));
  const Y = (a: number) => r(G.y0 - (Math.min(a, aMax) / aMax) * (G.y0 - G.y1));
  const resultat = stable ? issue : null;
  return (
    <svg viewBox="0 0 360 226" role="img" aria-label="Un spectrophotomètre : une lampe, une cuve de solution colorée traversée par un faisceau, un détecteur. En dessous, la droite d'étalonnage de l'absorbance en fonction de la concentration.">
      {/* le faisceau : entier avant la cuve, affaibli après, d'autant plus que l'absorbance est grande */}
      {allumee && <rect x={52} y={FAISCEAU - 5} width={92} height={10} fill="var(--sable)" opacity={0.9} />}
      {allumee && <rect x={166} y={FAISCEAU - 5} width={76} height={10} fill="var(--sable)" opacity={r(Math.max(0.06, 0.9 * 10 ** -A))} />}
      {/* la lampe */}
      <circle cx={38} cy={FAISCEAU} r={13} fill={allumee ? "var(--sable)" : "var(--carte-2)"} stroke="var(--encre)" strokeWidth={1.4} />
      {allumee && <circle className="labo-halo" cx={38} cy={FAISCEAU} r={22} fill="var(--sable)" opacity={0.3} />}
      <text x={38} y={FAISCEAU + 30} textAnchor="middle">lampe</text>
      {/* la cuve */}
      <rect x={145} y={FAISCEAU - 22} width={20} height={40} fill={connue ? couleurSolution(2, C / cMax) : "rgba(190, 215, 240, 0.2)"} />
      <path d={`M 144 ${FAISCEAU - 26} V ${FAISCEAU + 19} H 166 V ${FAISCEAU - 26}`} fill="none" stroke="var(--encre)" strokeWidth={1.5} strokeLinejoin="round" />
      <text x={155} y={FAISCEAU + 34} textAnchor="middle">cuve : {connue ? `${nombre(C, 2)} mmol/L` : "?"}</text>
      {/* le détecteur et son écran */}
      <rect x={242} y={FAISCEAU - 14} width={14} height={28} rx={3} fill="var(--carte-2)" stroke="var(--encre)" strokeWidth={1.4} />
      <Ecran x={268} y={FAISCEAU - 15} l={80} nom="absorbance" valeur={allumee ? `A = ${nombre(absorbanceAffichee(p, t), 2)}` : "A = …"} couleur={teinte(resultat)} />
      {/* la droite d'étalonnage */}
      <path d={`M ${G.x0} ${G.y1 - 6} V ${G.y0} H ${G.x1 + 4}`} fill="none" stroke="var(--encre)" strokeWidth={1.2} />
      <text x={G.x0 - 8} y={G.y1 - 2} textAnchor="end" fontStyle="italic">A</text>
      <text x={G.x1} y={G.y0 + 14} textAnchor="end"><tspan fontStyle="italic">C</tspan> (mmol/L)</text>
      <text x={G.x0 - 6} y={G.y0 + 4} textAnchor="end">0</text>
      <line x1={X(0)} y1={Y(0)} x2={X(cMax)} y2={Y(aMax)} stroke="var(--discret)" strokeWidth={1.4} />
      <text x={X(cMax) - 4} y={Y(aMax) + 14} textAnchor="end">droite d&apos;étalonnage</text>
      <line className={phase === "pret" ? "labo-appel-doux" : undefined} x1={G.x0} x2={G.x1} y1={Y(p.cible)} y2={Y(p.cible)} stroke="var(--cuivre)" strokeDasharray="4 4" />
      <text x={G.x0 + 6} y={Y(p.cible) - 5}>voulue : <tspan fontStyle="italic">A</tspan> = {nombre(p.cible, 2)}</text>
      {stable && (
        <g>
          <path d={`M ${X(C)} ${G.y0} V ${Y(A)} H ${G.x0}`} fill="none" stroke={teinte(resultat)} strokeDasharray="3 3" />
          <circle className="labo-impact" cx={X(C)} cy={Y(A)} r={5} fill={teinte(resultat)} />
          <text x={X(C)} y={G.y0 + 14} textAnchor="middle" className="labo-fort">{nombre(C, 2)}</text>
        </g>
      )}
    </svg>
  );
}
