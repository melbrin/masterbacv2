import { useId } from "react";
import { nombre } from "@/lib/commun/format";
import { AUDITEUR, PAS_FRONT, arriveeDuSon, frequenceRecue, positionEmetteur, vitesse } from "@/lib/commun/simulations/doppler";
import { r, teinte, type PropsScene } from "./types";

// L'effet Doppler : le véhicule avance vers l'auditeur et émet des fronts d'onde. Devant lui ils se resserrent,
// derrière ils s'écartent. La scène est au ralenti dix fois ; un front est dessiné tous les cinq centièmes de seconde,
// bien moins souvent que les vrais : le dessin montre l'effet, pas la longueur d'onde.
const MONDE = { gauche: -130, droite: 120 }; // en mètres
const ECHELLE = 360 / (MONDE.droite - MONDE.gauche);
const ROUTE = 166;
const SOURCE = 142; // la hauteur du point d'émission, en unités du dessin
const X = (x: number) => r((x - MONDE.gauche) * ECHELLE);

export default function SceneDoppler({ p, t, phase, issue, inconnues }: PropsScene) {
  const ciel = `ciel-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const ts = phase === "pret" ? 0 : t;
  const x = positionEmetteur(p, ts);
  const fronts = phase === "pret" ? [] : Array.from({ length: Math.floor(ts / PAS_FRONT + 1e-9) + 1 }, (_, k) => k * PAS_FRONT)
    .map((emis) => ({ cx: X(positionEmetteur(p, emis)), rayon: r(p.c * (ts - emis) * ECHELLE), arrive: emis + (AUDITEUR - positionEmetteur(p, emis)) / p.c }));
  const entendu = phase !== "pret" && ts >= arriveeDuSon(p);
  // l'âge du dernier front arrivé à l'auditeur : il fait battre un anneau autour de lui
  const dernier = Math.max(-1, ...fronts.filter((f) => f.arrive <= ts).map((f) => f.arrive));
  const age = dernier < 0 ? 1 : ts - dernier;
  const couleur = teinte(entendu ? issue : null);
  const vConnue = !inconnues.includes("v") && !inconnues.includes("vkmh");
  return (
    <svg viewBox="0 0 360 212" role="img" aria-label="Un véhicule avance vers un auditeur en émettant un son. Les fronts d'onde sont plus serrés devant le véhicule que derrière.">
      <defs><clipPath id={ciel}><rect x={0} y={0} width={360} height={ROUTE} /></clipPath></defs>
      {/* les fronts d'onde */}
      <g clipPath={`url(#${ciel})`} fill="none" stroke="var(--bleu)" strokeWidth={1.6}>
        {fronts.map((f, i) => <circle key={i} cx={f.cx} cy={SOURCE} r={Math.max(0.5, f.rayon)} opacity={r(Math.max(0.2, 1 - f.rayon / 330))} />)}
      </g>
      {/* la route */}
      <rect x={0} y={ROUTE} width={360} height={46} fill="var(--carte-2)" />
      <line x1={0} x2={360} y1={ROUTE} y2={ROUTE} stroke="var(--encre)" strokeWidth={1.5} />
      <line x1={0} x2={360} y1={ROUTE + 20} y2={ROUTE + 20} stroke="var(--discret)" strokeDasharray="14 12" />
      {/* l'auditeur */}
      {phase === "pret" && <circle className="labo-appel" cx={X(AUDITEUR)} cy={SOURCE - 6} r={13} fill="none" stroke="var(--cuivre)" strokeWidth={1.5} />}
      {entendu && <circle cx={X(AUDITEUR)} cy={SOURCE - 6} r={r(6 + Math.min(1, age / 0.035) * 14)} fill="none" stroke={couleur} strokeWidth={2} opacity={r(Math.max(0, 1 - age / 0.035))} />}
      <g stroke={couleur} strokeWidth={2.2} strokeLinecap="round" fill="none">
        <circle cx={X(AUDITEUR)} cy={SOURCE - 6} r={5.5} fill="var(--carte)" />
        <path d={`M ${X(AUDITEUR)} ${SOURCE} V ${ROUTE - 9} M ${X(AUDITEUR)} ${ROUTE - 9} l -5 9 M ${X(AUDITEUR)} ${ROUTE - 9} l 5 9 M ${X(AUDITEUR) - 6} ${SOURCE + 6} h 12`} />
      </g>
      <text x={X(AUDITEUR) - 4} y={SOURCE - 44} textAnchor="middle">reçue</text>
      <text x={X(AUDITEUR) - 4} y={SOURCE - 30} textAnchor="middle" className="labo-fort" style={entendu && issue ? { fill: couleur } : undefined}>{!entendu ? "…" : inconnues.length ? "?" : `${nombre(frequenceRecue(p), 1)} Hz`}</text>
      {/* le véhicule */}
      <g transform={`translate(${X(x)} ${SOURCE})`}>
        <path d="M -22 14 H 20 q 4 0 4 -4 V 4 q 0 -4 -5 -5 L 10 -3 L 4 -11 H -12 q -4 0 -6 4 L -22 2 Z" fill="var(--cuivre)" stroke="var(--encre)" strokeWidth={1.2} strokeLinejoin="round" />
        <path d="M -9 -8 H 2 L 7 -2 H -12 Z" fill="var(--carte)" />
        <circle cx={-12} cy={17} r={5.5} fill="var(--encre)" /><circle cx={12} cy={17} r={5.5} fill="var(--encre)" />
        <text x={0} y={-30} textAnchor="middle">émise</text>
        <text x={0} y={-16} textAnchor="middle" className="labo-fort">{inconnues.includes("fE") ? "?" : `${nombre(p.fE, 1)} Hz`}</text>
      </g>
      <text x={8} y={ROUTE + 38}><tspan fontStyle="italic">v</tspan> = {vConnue ? `${nombre(vitesse(p), 1)} m/s` : "?"}. Un front d&apos;onde est dessiné toutes les {nombre(PAS_FRONT * 1000, 0)} ms.</text>
    </svg>
  );
}
