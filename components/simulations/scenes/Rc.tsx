import { nombre } from "@/lib/commun/format";
import { instantSeuil, tau, tension, volts } from "@/lib/commun/simulations/rc";
import { r, teinte, type PropsScene } from "./types";

// Le circuit RC : en haut le circuit (interrupteur, résistance, condensateur, lampe témoin), avec des points
// qui montrent le courant ; en bas la tension u_C(t), le seuil, et la date visée.
const G = { x0: 48, x1: 344, y0: 292, y1: 180 }; // le cadre du graphique
const BOUCLE = { gauche: 40, droite: 296, haut: 36, bas: 122 };

/** Un point de la boucle du circuit, pour une position entre 0 et 1 comptée dans le sens des aiguilles d'une montre. */
function surLaBoucle(s: number): { x: number; y: number } {
  const { gauche, droite, haut, bas } = BOUCLE;
  const l = droite - gauche, h = bas - haut;
  const d = (((s % 1) + 1) % 1) * 2 * (l + h);
  if (d < l) return { x: gauche + d, y: haut };
  if (d < l + h) return { x: droite, y: haut + (d - l) };
  if (d < 2 * l + h) return { x: droite - (d - l - h), y: bas };
  return { x: gauche, y: bas - (d - 2 * l - h) };
}

/** « u » suivi de « C » en indice, dans un texte du dessin. */
const Uc = () => <><tspan fontStyle="italic">u</tspan><tspan dy={3} fontSize={8}>C</tspan><tspan dy={-3} /></>;

export default function SceneRc({ p, t, phase, issue, inconnues }: PropsScene) {
  const enMarche = phase !== "pret";
  const u = enMarche ? tension(p, t) : p.decharge ? p.E : 0;
  const ts = instantSeuil(p);
  const fin = Math.min(3 * p.tCible, Math.max(1.5 * p.tCible, 1.15 * ts));
  const d = p.tCible < 1 ? 3 : p.tCible < 5 ? 2 : 1;
  const X = (x: number) => r(G.x0 + (Math.min(x, fin) / fin) * (G.x1 - G.x0));
  const Y = (y: number) => r(G.y0 - (y / (p.E * 1.08)) * (G.y0 - G.y1));
  const courbe = Array.from({ length: 61 }, (_, i) => (i / 60) * (enMarche ? Math.min(t, fin) : 0)).map((x, i) => `${i ? "L" : "M"}${X(x)},${Y(tension(p, x))}`).join(" ");
  const franchi = enMarche && t >= ts && ts <= fin;
  const allumee = enMarche && (p.decharge ? u > p.seuil : u >= p.seuil);
  // les points du courant : ils avancent comme la charge qui a traversé le circuit, vite au début, puis de moins en moins
  const avance = enMarche ? 1.6 * (1 - Math.exp(-t / tau(p))) * (p.decharge ? -1 : 1) : 0;
  const { gauche, droite, haut, bas } = BOUCLE;
  const milieu = (haut + bas) / 2;
  const lampe = { x: 232, y: bas };
  const couleur = teinte(franchi ? issue : null);
  return (
    <svg viewBox="0 0 360 312" role="img" aria-label={`Un circuit avec une résistance, un condensateur et une lampe témoin. Sous le circuit, la courbe de la tension aux bornes du condensateur, qui ${p.decharge ? "décroît" : "croît"} au cours du temps.`}>
      {/* les fils : le fil du haut s'interrompt à l'interrupteur, celui de droite au condensateur */}
      <path d={`M ${gauche} ${haut} H 72 M 102 ${haut} H ${droite} V ${milieu - 7} M ${droite} ${milieu + 7} V ${bas} H ${gauche} V ${haut}`} fill="none" stroke="var(--discret)" strokeWidth={1.6} />
      {/* le générateur, absent pendant la décharge */}
      {!p.decharge && <g><circle cx={gauche} cy={milieu} r={13} fill="var(--carte)" stroke="var(--encre)" strokeWidth={1.4} /><text x={gauche} y={milieu + 4} textAnchor="middle" className="labo-fort" fontStyle="italic">E</text></g>}
      {/* l'interrupteur : ouvert avant le lancement, fermé ensuite */}
      <circle cx={72} cy={haut} r={2.4} fill="var(--encre)" /><circle cx={102} cy={haut} r={2.4} fill="var(--encre)" />
      <line x1={72} y1={haut} x2={enMarche ? 102 : 99} y2={enMarche ? haut : haut - 14} stroke="var(--encre)" strokeWidth={1.8} strokeLinecap="round" />
      {/* la résistance */}
      <rect x={146} y={haut - 8} width={56} height={16} rx={2} fill="var(--carte)" stroke="var(--encre)" strokeWidth={1.4} />
      <text x={174} y={haut - 14} textAnchor="middle"><tspan fontStyle="italic">R</tspan> = {inconnues.includes("R") ? "?" : `${nombre(p.R, 2)} kΩ`}</text>
      {/* le condensateur et sa jauge de tension */}
      <line x1={droite - 15} x2={droite + 15} y1={milieu - 7} y2={milieu - 7} stroke="var(--encre)" strokeWidth={3} />
      <line x1={droite - 15} x2={droite + 15} y1={milieu + 7} y2={milieu + 7} stroke="var(--encre)" strokeWidth={3} />
      <text x={droite - 22} y={milieu + 4} textAnchor="end"><tspan fontStyle="italic">C</tspan> = {inconnues.includes("C") ? "?" : `${nombre(p.C, 0)} µF`}</text>
      <rect x={droite + 32} y={haut + 4} width={10} height={bas - haut - 8} rx={5} fill="var(--carte-2)" stroke="var(--discret)" />
      <rect x={droite + 32} y={r(bas - 4 - (u / p.E) * (bas - haut - 8))} width={10} height={r((u / p.E) * (bas - haut - 8))} rx={5} fill="var(--cuivre)" />
      <text x={droite + 37} y={haut - 6} textAnchor="middle"><Uc /></text>
      {/* la lampe témoin */}
      {allumee && <circle className="labo-halo" cx={lampe.x} cy={lampe.y} r={24} fill="var(--sable)" opacity={0.35} />}
      <circle cx={lampe.x} cy={lampe.y} r={11} fill={allumee ? "var(--sable)" : "var(--carte)"} stroke="var(--encre)" strokeWidth={1.4} />
      <path d={`M ${lampe.x - 7} ${lampe.y - 7} l 14 14 M ${lampe.x - 7} ${lampe.y + 7} l 14 -14`} stroke={allumee ? "var(--carte)" : "var(--encre)"} strokeWidth={1.2} opacity={allumee ? 0.5 : 1} />
      <text x={lampe.x} y={lampe.y + 27} textAnchor="middle" className={allumee ? "labo-fort" : undefined}>{allumee ? "allumée" : "éteinte"}</text>
      {/* le courant */}
      {enMarche && Array.from({ length: 10 }, (_, i) => surLaBoucle(i / 10 + avance)).map((q, i) => <circle key={i} cx={r(q.x)} cy={r(q.y)} r={2.6} fill="var(--bleu)" />)}

      {/* le graphique de u_C(t) */}
      <rect className={enMarche ? undefined : "labo-appel-doux"} x={X(Math.max(0, p.tCible - p.tol)) - 1.5} y={G.y1} width={r(X(p.tCible + p.tol) - X(Math.max(0, p.tCible - p.tol))) + 3} height={G.y0 - G.y1} fill="var(--cuivre)" opacity={0.3} />
      <text x={X(p.tCible)} y={G.y1 - 6} textAnchor="middle">date visée : {nombre(p.tCible, p.tCible < 1 ? 2 : 1)} s</text>
      <line x1={G.x0} x2={G.x1} y1={Y(p.seuil)} y2={Y(p.seuil)} stroke="var(--sable)" strokeDasharray="4 4" />
      <text x={G.x1} y={Y(p.seuil) + (p.decharge ? -5 : 13)} textAnchor="end">seuil : {volts(p.seuil, p.E)}</text>
      <path d={`M ${G.x0} ${G.y1 - 4} V ${G.y0} H ${G.x1 + 4}`} fill="none" stroke="var(--encre)" strokeWidth={1.2} />
      <text x={G.x0 - 6} y={Y(p.E) + 4} textAnchor="end">{nombre(p.E, 0)}</text>
      <text x={G.x0 - 6} y={G.y0 + 4} textAnchor="end">0</text>
      <text x={8} y={G.y1 - 6}><Uc /> (V)</text>
      <text x={G.x1} y={G.y0 + 14} textAnchor="end">{nombre(fin, d)} s</text>
      <path d={courbe} fill="none" stroke="var(--cuivre)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      {franchi && (
        <g>
          <line x1={X(ts)} x2={X(ts)} y1={Y(p.seuil)} y2={G.y0} stroke={couleur} strokeDasharray="3 3" />
          <circle className="labo-impact" cx={X(ts)} cy={Y(p.seuil)} r={5} fill={couleur} />
          {inconnues.length === 0 && <text x={X(ts) + (X(ts) > 250 ? -7 : 7)} y={G.y0 - 6} textAnchor={X(ts) > 250 ? "end" : "start"} className="labo-fort">{nombre(ts, d)} s</text>}
        </g>
      )}
    </svg>
  );
}
