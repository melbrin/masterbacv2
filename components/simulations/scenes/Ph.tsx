import { nombre } from "@/lib/commun/format";
import { pHAffiche } from "@/lib/commun/simulations/ph";
import { r, teinte, type PropsScene } from "./types";
import { Becher, EAU, Ecran } from "./verrerie";

// Le pH : un bécher dont la couleur suit le pH (comme avec un indicateur universel), une sonde, un pH-mètre,
// et l'échelle des pH avec la valeur voulue.
const ECHELLE = { x: 196, y: 150, l: 150, h: 14 };
const COULEURS: [number, number[]][] = [[0, [226, 62, 62]], [3, [240, 122, 52]], [5, [240, 200, 62]], [7, [92, 180, 92]], [9, [62, 132, 222]], [11, [112, 82, 202]], [14, [150, 62, 172]]];

/** La couleur d'une solution à ce pH, avec un indicateur universel : rouge quand elle est acide, verte quand elle est neutre, violette quand elle est basique. */
function couleurPH(x: number, opacite = 0.9): string {
  const v = Math.max(0, Math.min(14, x));
  const i = Math.max(1, COULEURS.findIndex(([seuil]) => seuil >= v));
  const [a, ca] = COULEURS[i - 1], [b, cb] = COULEURS[i];
  const k = (v - a) / (b - a);
  return `rgba(${ca.map((c, n) => Math.round(c + (cb[n] - c) * k)).join(", ")}, ${opacite})`;
}
const surEchelle = (x: number) => r(ECHELLE.x + (Math.max(0, Math.min(14, x)) / 14) * ECHELLE.l);

export default function ScenePh({ p, t, phase, issue }: PropsScene) {
  const mesure = phase !== "pret";
  const x = mesure ? pHAffiche(p, t) : 7;
  const stable = phase === "fini";
  // la sonde descend dans le bécher au lancement
  const sonde = r(mesure ? Math.min(1, t / 0.6) * 46 : 0);
  return (
    <svg viewBox="0 0 360 226" role="img" aria-label="Un bécher, une sonde reliée à un pH-mètre, et l'échelle des pH de 0 à 14 avec la valeur voulue.">
      <Becher x={38} y={92} l={112} h={106} niveau={0.72} couleur={mesure ? couleurPH(x) : EAU} />
      {/* la sonde et son fil */}
      <path d={`M 94 ${34 + sonde} V 20 Q 94 10 110 10 H 320 Q 332 10 332 22 V 46`} fill="none" stroke="var(--discret)" strokeWidth={1.6} />
      <rect x={89} y={34 + sonde} width={10} height={86} rx={4} fill="var(--carte-2)" stroke="var(--encre)" strokeWidth={1.3} />
      <circle cx={94} cy={r(116 + sonde)} r={3.2} fill="var(--bleu)" />
      <text x={94} y={214} textAnchor="middle">{mesure ? "solution préparée" : "eau de rinçage"}</text>
      {/* le pH-mètre */}
      <Ecran x={196} y={46} l={150} nom="pH-mètre" valeur={mesure ? `pH ${nombre(x, 2)}` : "pH …"} couleur={teinte(stable ? issue : null)} />
      {/* l'échelle des pH */}
      {Array.from({ length: 28 }, (_, i) => <rect key={i} x={r(ECHELLE.x + (i / 28) * ECHELLE.l)} y={ECHELLE.y} width={r(ECHELLE.l / 28 + 0.5)} height={ECHELLE.h} fill={couleurPH((i + 0.5) / 2, 1)} />)}
      <rect x={ECHELLE.x} y={ECHELLE.y} width={ECHELLE.l} height={ECHELLE.h} fill="none" stroke="var(--discret)" />
      {[0, 7, 14].map((v) => <text key={v} x={surEchelle(v)} y={ECHELLE.y + 28} textAnchor="middle">{v}</text>)}
      <text x={ECHELLE.x} y={ECHELLE.y + 42}>acide</text>
      <text x={ECHELLE.x + ECHELLE.l} y={ECHELLE.y + 42} textAnchor="end">basique</text>
      {/* la valeur voulue, au-dessus ; la valeur mesurée, en dessous */}
      <path className={phase === "pret" ? "labo-appel-doux" : undefined} d={`M ${surEchelle(p.cible)} ${ECHELLE.y - 2} l -6 -9 h 12 z`} fill="var(--cuivre)" />
      <text x={surEchelle(p.cible)} y={ECHELLE.y - 15} textAnchor="middle" className="labo-fort">voulu : {nombre(p.cible, 1)}</text>
      {mesure && <path d={`M ${surEchelle(x)} ${ECHELLE.y + ECHELLE.h + 2} l -5 8 h 10 z`} fill={teinte(stable ? issue : null)} />}
      {stable && <circle className="labo-impact" cx={surEchelle(x)} cy={ECHELLE.y + ECHELLE.h / 2} r={11} fill="none" stroke={teinte(issue)} strokeWidth={2} />}
    </svg>
  );
}
