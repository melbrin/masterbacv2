import { nombre } from "@/lib/commun/format";
import { SYNTHESE, pese, quantiteEngagee, resultatEcrit } from "@/lib/commun/simulations/synthese";
import { r, teinte, type PropsScene } from "./types";
import { Ecran } from "./verrerie";

// La synthèse : un ballon chauffé sous son réfrigérant, puis le produit sec posé sur la balance.
const BALLON = { x: 92, y: 150, rayon: 38 };
/** Des bulles qui montent dans le ballon : leur place dépend seulement de l'instant. */
const BULLES = Array.from({ length: 7 }, (_, i) => ({ dx: ((i * 37) % 44) - 22, retard: (i * 0.29) % 1, taille: 2 + (i % 3) }));

export default function SceneSynthese({ p, t, phase, issue, inconnues }: PropsScene) {
  const ts = phase === "pret" ? 0 : t;
  const chauffe = phase === "marche" && ts < SYNTHESE.reaction;
  const avancement = Math.max(0, Math.min(1, ts / SYNTHESE.reaction));
  const pesee = phase !== "pret" && ts >= SYNTHESE.reaction;
  const stable = phase !== "pret" && ts >= SYNTHESE.pesee;
  const masse = pese(p, ts);
  // le tas de cristaux grossit pendant la pesée
  const tas = pesee ? Math.max(0.15, Math.min(1.3, masse / p.cible)) : 0;
  const engage = inconnues.length ? "?" : p.mode === 1 ? `${nombre(p.m, 2)} g` : `${nombre(quantiteEngagee(p), 3)} mol`;
  return (
    <svg viewBox="0 0 360 240" role="img" aria-label="À gauche, un ballon chauffé surmonté d'un réfrigérant. À droite, une balance sur laquelle on pèse le produit obtenu.">
      {/* le réfrigérant et le ballon */}
      <rect x={BALLON.x - 9} y={20} width={18} height={84} rx={4} fill="var(--carte-2)" stroke="var(--encre)" strokeWidth={1.4} />
      <path d={`M ${BALLON.x - 9} 40 h -12 M ${BALLON.x + 9} 84 h 12`} stroke="var(--bleu)" strokeWidth={3} strokeLinecap="round" />
      <text x={BALLON.x + 26} y={44}>eau froide</text>
      <circle cx={BALLON.x} cy={BALLON.y} r={BALLON.rayon} fill={`rgba(232, 222, 196, ${r(0.18 + 0.5 * avancement)})`} stroke="var(--encre)" strokeWidth={1.6} />
      <rect x={BALLON.x - 7} y={102} width={14} height={14} fill="var(--carte)" stroke="var(--encre)" strokeWidth={1.4} />
      {chauffe && BULLES.map((b, i) => {
        const k = (ts * 0.9 + b.retard) % 1;
        return <circle key={i} cx={BALLON.x + b.dx * (1 - 0.4 * k)} cy={r(BALLON.y + 26 - 56 * k)} r={b.taille} fill="none" stroke="var(--encre)" strokeWidth={1} opacity={r(1 - k)} />;
      })}
      {/* le chauffe-ballon */}
      <path d={`M ${BALLON.x - 46} ${BALLON.y + 30} Q ${BALLON.x} ${BALLON.y + 62} ${BALLON.x + 46} ${BALLON.y + 30} V ${BALLON.y + 52} H ${BALLON.x - 46} Z`} className={chauffe ? "labo-chauffe" : undefined} fill={chauffe ? "var(--brique)" : "var(--discret)"} />
      <text x={BALLON.x} y={222} textAnchor="middle">{chauffe ? `réaction : ${nombre(100 * avancement, 0)} %` : pesee ? "réaction terminée" : `réactif engagé : ${engage}`}</text>
      {p.mode === 2 && <text x={BALLON.x} y={236} textAnchor="middle">deux étapes : {nombre(100 * p.rendement, 0)} %, puis {nombre(100 * p.rendement2, 0)} %</text>}
      {p.mode === 1 && <text x={BALLON.x} y={236} textAnchor="middle">rendement : {nombre(100 * p.rendement, 0)} %</text>}
      {/* la filtration, puis la balance */}
      <path d="M 158 150 H 206 m -8 -6 l 8 6 l -8 6" fill="none" stroke={pesee ? "var(--encre)" : "var(--discret)"} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <text x={182} y={138} textAnchor="middle">filtrer, sécher</text>
      {tas > 0 && <path d={`M ${r(282 - 30 * tas)} 158 Q ${r(282 - 12 * tas)} ${r(158 - 34 * tas)} 282 ${r(158 - 40 * tas)} Q ${r(282 + 14 * tas)} ${r(158 - 30 * tas)} ${r(282 + 30 * tas)} 158 Z`} fill="#F3ECE6" stroke="var(--discret)" strokeWidth={1} />}
      <rect x={232} y={158} width={100} height={8} rx={3} fill="var(--discret)" />
      <rect x={240} y={166} width={84} height={12} fill="var(--carte-2)" stroke="var(--discret)" />
      <Ecran x={236} y={196} l={92} nom={p.mode === 2 ? "produit obtenu" : "balance"} valeur={pesee ? resultatEcrit(p, masse) : "…"} couleur={teinte(stable ? issue : null)} />
      <text className={phase === "pret" ? "labo-appel-doux" : undefined} x={282} y={110} textAnchor="middle" style={{ fill: "var(--cuivre)", fontWeight: 700 }}>voulu : {resultatEcrit(p, p.cible)}</text>
      {stable && <circle className="labo-onde" cx={282} cy={140} r={36} fill="none" stroke={teinte(issue)} strokeWidth={2.5} />}
    </svg>
  );
}
