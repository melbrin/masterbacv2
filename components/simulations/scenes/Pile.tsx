import { nombre } from "@/lib/commun/format";
import { arret, autonomie, depot, dureeElectrolyse } from "@/lib/commun/simulations/pile";
import { r, teinte, type PropsScene } from "./types";
import { Becher, EAU, Ecran, couleurSolution } from "./verrerie";

// La pile et l'électrolyse. La pile : deux béchers, une électrode de zinc et une de cuivre, un pont salin, une lampe ;
// les électrons vont du zinc au cuivre par le fil. L'électrolyse : un générateur force le dépôt de cuivre sur une clé.
const FIL = 46; // la hauteur du fil, en unités du dessin

/** Des électrons qui avancent sur un fil horizontal, de x0 vers x1. */
function Electrons({ x0, x1, y, t }: { x0: number; x1: number; y: number; t: number }) {
  return <g fill="var(--bleu)">{Array.from({ length: 7 }, (_, i) => <circle key={i} cx={r(x0 + (((i / 7 + t) % 1) + 1) % 1 * (x1 - x0))} cy={y} r={2.6} />)}</g>;
}

function PileDaniell({ p, t, phase, issue, inconnues }: PropsScene) {
  const fin = autonomie(p);
  const ts = phase === "pret" ? 0 : Math.min(t, fin);
  const debite = phase !== "pret" && t < fin;
  const vide = phase !== "pret" && t >= fin;
  const reste = Math.max(0, 1 - ts / fin);
  // en mode 1, le zinc se consomme : l'électrode s'amincit
  const zinc = p.mode === 1 ? 4 + 14 * reste : 18;
  const resultat = vide || phase === "fini" ? issue : null;
  return (
    <svg viewBox="0 0 360 246" role="img" aria-label="Une pile : une électrode de zinc et une électrode de cuivre plongent dans deux béchers reliés par un pont salin. Un fil et une lampe les relient.">
      {/* le fil, la lampe, les électrons */}
      <path d={`M 80 96 V ${FIL} H 280 V 96`} fill="none" stroke="var(--discret)" strokeWidth={1.6} />
      {debite && <Electrons x0={86} x1={274} y={FIL} t={(t / fin) * 9} />}
      {debite && <circle className="labo-halo" cx={180} cy={FIL} r={24} fill="var(--sable)" opacity={0.35} />}
      <circle cx={180} cy={FIL} r={12} fill={debite ? "var(--sable)" : "var(--carte)"} stroke="var(--encre)" strokeWidth={1.4} />
      <path d={`M 172 ${FIL - 8} l 16 16 M 172 ${FIL + 8} l 16 -16`} stroke={debite ? "var(--carte)" : "var(--encre)"} strokeWidth={1.2} opacity={debite ? 0.5 : 1} />
      <text x={180} y={FIL - 20} textAnchor="middle">{debite ? "électrons : du zinc vers le cuivre" : vide ? "la pile est vide" : "lampe éteinte"}</text>
      {/* le pont salin */}
      <path d="M 122 150 V 112 Q 122 100 134 100 H 226 Q 238 100 238 112 V 150" fill="none" stroke="var(--sable)" strokeWidth={7} strokeLinecap="round" opacity={0.55} />
      <text x={180} y={90} textAnchor="middle">pont salin</text>
      {/* les deux béchers et leurs électrodes */}
      <Becher x={40} y={124} l={100} h={86} niveau={0.72} couleur={EAU}>
        <rect x={r(80 - zinc / 2)} y={96} width={r(zinc)} height={104} rx={2} fill="#9AA7B8" stroke="var(--encre)" strokeWidth={1} />
      </Becher>
      <Becher x={220} y={124} l={100} h={86} niveau={0.72} couleur={couleurSolution(0, 0.6)}>
        <rect x={271} y={96} width={18} height={104} rx={2} fill="var(--cuivre)" stroke="var(--encre)" strokeWidth={1} />
      </Becher>
      <text x={90} y={228} textAnchor="middle" className="labo-fort">zinc, borne −</text>
      <text x={270} y={228} textAnchor="middle" className="labo-fort">cuivre, borne +</text>
      <text x={180} y={242} textAnchor="middle" style={{ fill: teinte(resultat, "var(--discret)") }}>
        {p.mode === 0 ? `courant : ${inconnues.includes("I") ? "?" : `${nombre(p.I, 2)} A`}, capacité restante : ${nombre(100 * reste, 0)} %` : `zinc restant : ${inconnues.includes("m") ? "?" : `${nombre(p.m * reste, 2)} g`}`}
      </text>
    </svg>
  );
}

function Electrolyse({ p, t, phase, issue, inconnues }: PropsScene) {
  const fin = arret(p);
  const ts = phase === "pret" ? 0 : Math.min(t, fin);
  const marche = phase !== "pret" && t < fin;
  const finie = phase !== "pret" && t >= fin;
  const m = depot(p, ts);
  // la clé prend la couleur du cuivre à mesure que le dépôt grossit
  const couverte = Math.min(1, m / p.masseVisee);
  return (
    <svg viewBox="0 0 360 246" role="img" aria-label="Une électrolyse : un générateur relie une clé et une plaque de cuivre plongées dans une solution bleue. Le cuivre se dépose sur la clé.">
      {/* le générateur, les fils, les électrons qui vont vers la clé */}
      <path d={`M 120 110 V ${FIL} H 168 M 192 ${FIL} H 240 V 110`} fill="none" stroke="var(--discret)" strokeWidth={1.6} />
      <path d={`M 168 ${FIL - 7} V ${FIL + 7} M 192 ${FIL - 14} V ${FIL + 14}`} stroke="var(--encre)" strokeWidth={2.2} strokeLinecap="round" />
      <text x={180} y={FIL - 22} textAnchor="middle">générateur : {nombre(p.I, 2)} A</text>
      <text x={160} y={FIL + 24} textAnchor="end">−</text><text x={200} y={FIL + 24}>+</text>
      {marche && <Electrons x0={166} x1={122} y={FIL} t={(t / fin) * 9} />}
      {/* la cuve, la clé (cathode) et la plaque de cuivre (anode) */}
      <Becher x={70} y={118} l={220} h={96} niveau={0.78} couleur={couleurSolution(0, 0.55)}>
        <g stroke="var(--encre)" strokeWidth={1}>
          <rect x={117} y={104} width={6} height={52} fill="#9AA7B8" />
          <path d="M 120 150 m -13 12 a 13 13 0 1 1 26 0 a 13 13 0 1 1 -26 0 M 117 174 V 198 H 127 V 192 H 123 V 186 H 127 V 180 H 123 V 174" fill="#9AA7B8" />
          <path d="M 120 150 m -13 12 a 13 13 0 1 1 26 0 a 13 13 0 1 1 -26 0 M 117 174 V 198 H 127 V 192 H 123 V 186 H 127 V 180 H 123 V 174" fill="var(--cuivre)" opacity={r(couverte)} />
          <rect x={231} y={104} width={18} height={96} rx={2} fill="var(--cuivre)" />
        </g>
      </Becher>
      <text x={120} y={232} textAnchor="middle" className="labo-fort">clé à cuivrer</text>
      <text x={240} y={232} textAnchor="middle" className="labo-fort">plaque de cuivre</text>
      <Ecran x={296} y={150} l={58} nom="dépôt" valeur={`${nombre(m, 2)} g`} couleur={teinte(finie ? issue : null)} />
      <text x={325} y={198} textAnchor="middle">{inconnues.includes("dureeMin") ? "durée : ?" : `${nombre(Math.min(ts, dureeElectrolyse(p)) / 60, 1)} min`}</text>
      {finie && <circle className="labo-impact" cx={120} cy={170} r={30} fill="none" stroke={teinte(issue)} strokeWidth={2} />}
    </svg>
  );
}

export default function ScenePile(props: PropsScene) {
  return props.p.mode === 2 ? <Electrolyse {...props} /> : <PileDaniell {...props} />;
}
