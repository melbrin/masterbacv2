import { useId } from "react";
import { nombre } from "@/lib/commun/format";
import { PREPARATION, concentrationEcrite, concentrationPreparee } from "@/lib/commun/simulations/dilution";
import { r, teinte, type PropsScene } from "./types";
import { Becher, EAU, Fiole, Tube, couleurSolution } from "./verrerie";

// Préparer une solution : on prélève (ou on pèse), on verse dans la fiole jaugée, on complète à l'eau jusqu'au trait,
// puis on compare la couleur obtenue à celle de la solution voulue.
const FIOLE = { x: 196, y: 92 };
/** Avance d'une étape entre deux instants : 0 avant, 1 après. */
const part = (t: number, debut: number, fin: number) => Math.max(0, Math.min(1, (t - debut) / (fin - debut)));

export default function SceneDilution({ p, t, phase, issue, inconnues }: PropsScene) {
  const id = `fiole-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const ts = phase === "pret" ? 0 : t;
  const solide = p.mode === 2;
  const obtenue = concentrationPreparee(p);
  // l'intensité de la couleur : la solution voulue est à mi-teinte, pour voir une solution trop pâle ou trop foncée
  const intensite = (c: number) => c / (2 * p.cible);
  const pris = part(ts, 0, PREPARATION.preleve); // la pipette se remplit, ou le solide se pose sur la balance
  const verse = part(ts, PREPARATION.preleve, PREPARATION.verse);
  const complete = part(ts, PREPARATION.verse, PREPARATION.complete);
  const compare = phase !== "pret" && ts >= PREPARATION.complete;
  // dans la fiole : d'abord un fond de solution concentrée (ou le solide), puis l'eau qui dilue jusqu'au trait
  const niveauFiole = verse * 0.14 + complete * 0.86;
  const dansFiole = verse === 0 ? EAU : couleurSolution(p.teinte, intensite(obtenue) / Math.max(0.2, niveauFiole) * 0.6 + intensite(obtenue) * 0.4 * complete);
  const pipette = { x: r(64 + verse * (FIOLE.x - 64)), y: r(52 - 14 * Math.sin(Math.PI * verse)) };
  const resultat = compare ? issue : null;
  const quantite = solide ? (inconnues.includes("m") ? "?" : `${nombre(p.m * pris, 2)} g`) : (inconnues.includes("V") ? "?" : `${nombre(p.V, 1)} mL`);
  return (
    <svg viewBox="0 0 360 250" role="img" aria-label="Une solution mère ou un solide, une fiole jaugée, et deux tubes pour comparer la couleur de la solution préparée à celle de la solution voulue.">
      {solide ? (
        <g>
          {/* la balance, et le solide qu'on y pose */}
          <rect x={28} y={170} width={76} height={34} rx={6} fill="var(--carte-2)" stroke="var(--discret)" />
          <rect x={22} y={162} width={88} height={8} rx={3} fill="var(--discret)" />
          <text x={66} y={192} textAnchor="middle" className="labo-fort" style={{ fontSize: 14 }}>{quantite}</text>
          {verse < 1 && <path d={`M ${46 + verse * 12} 162 l ${r(20 * (0.3 + 0.7 * pris))} ${r(-16 * (0.3 + 0.7 * pris))} l ${r(20 * (0.3 + 0.7 * pris))} ${r(16 * (0.3 + 0.7 * pris))} Z`} fill={couleurSolution(p.teinte, 1)} opacity={r(1 - verse)} />}
          <text x={66} y={222} textAnchor="middle">solide à peser</text>
        </g>
      ) : (
        <g>
          {/* la solution mère, et la pipette qui prélève */}
          <Becher x={30} y={130} l={68} h={80} niveau={0.7} couleur={couleurSolution(p.teinte, 1)} />
          <text x={64} y={228} textAnchor="middle">solution mère</text>
          <g transform={`translate(${pipette.x} ${pipette.y})`}>
            <rect x={-3} y={r(70 - 62 * pris * (1 - verse))} width={6} height={r(62 * pris * (1 - verse))} fill={couleurSolution(p.teinte, 1)} />
            <path d="M -3 0 V 70 L -1 86 H 1 L 3 70 V 0" fill="none" stroke="var(--encre)" strokeWidth={1.3} strokeLinejoin="round" />
            <text x={10} y={30} className="labo-fort">{quantite}</text>
          </g>
        </g>
      )}
      {/* la fiole jaugée */}
      <Fiole x={FIOLE.x} y={FIOLE.y} niveau={niveauFiole} couleur={dansFiole} id={id} />
      <text x={FIOLE.x} y={218} textAnchor="middle" className="labo-fort">{inconnues.includes("Vfille") ? "? mL" : `${nombre(p.Vfille, 1)} mL`}</text>
      <text x={FIOLE.x} y={232} textAnchor="middle">fiole jaugée</text>
      {complete > 0 && complete < 1 && <path d={`M ${FIOLE.x} 40 V ${FIOLE.y + 6}`} stroke={EAU} strokeWidth={3} strokeLinecap="round" />}
      {complete > 0 && complete < 1 && <text x={FIOLE.x + 10} y={52}>eau</text>}
      {/* la comparaison des couleurs */}
      <Tube x={280} y={104} h={78} couleur={couleurSolution(p.teinte, intensite(p.cible))} />
      <Tube x={332} y={104} h={78} couleur={compare ? couleurSolution(p.teinte, intensite(obtenue)) : "transparent"} contour={teinte(resultat)} />
      <text x={280} y={198} textAnchor="middle">voulue</text>
      <text x={332} y={198} textAnchor="middle" className={compare ? "labo-fort" : undefined}>la tienne</text>
      <text x={306} y={214} textAnchor="middle">voulue : {concentrationEcrite(p, p.cible)}</text>
      {compare && <circle className="labo-impact" cx={332} cy={143} r={22} fill="none" stroke={teinte(resultat)} strokeWidth={2} />}
      {phase === "pret" && <circle className="labo-appel" cx={280} cy={143} r={22} fill="none" stroke="var(--cuivre)" strokeWidth={1.5} />}
    </svg>
  );
}
