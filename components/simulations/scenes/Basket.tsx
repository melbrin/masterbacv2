import { ARC, Ballon, COTE, HAUT_SAUT, Joueur, MAINS, PAS_TRACE, RAYON_BALLON, Terrain, X, Y } from "@/components/simulations/terrain";
import { nombre } from "@/lib/commun/format";
import { dureeSaut, finDuVol, hauteurMaxSaut, hauteurSaut, instantSommetSaut, PANIER, PESANTEUR, positionTir, sommetTir } from "@/lib/commun/physique";
import { r, teinte, type PropsScene } from "./types";

// Le basketteur dans un défi : le terrain de la simulation libre, avec le ballon de la passe à attraper (le saut)
// ou la flèche de la vitesse, puis la trace du tir (le tir).

/** La hauteur visible pendant un tir, en mètres : dans les défis, le sommet le plus haut possible est à 5,77 m. */
const HAUT_TIR = 6;

function Saut({ p, t, phase, issue, inconnues }: PropsScene) {
  const connu = !inconnues.includes("v0");
  const enVol = phase !== "pret";
  const ts = enVol ? Math.min(t, dureeSaut(p.v0)) : 0;
  const y = Math.max(0, hauteurSaut(p.v0, ts));
  const detente = hauteurMaxSaut(p.v0);
  const passe = MAINS.y + p.cible; // la hauteur où passe le ballon
  const sommetPasse = enVol && ts >= instantSommetSaut(p.v0);
  // au sommet d'un saut réussi, le joueur attrape le ballon et redescend avec lui
  const attrape = sommetPasse && !!issue?.reussi;
  return (
    <Terrain haut={HAUT_SAUT} description="Le joueur est debout, bras levés. Un ballon passe au-dessus de ses mains. Il doit sauter pour l'attraper."
      textes={
        <>
          <text className="simu-cote" x={X(1.05)} y={Y(passe, HAUT_SAUT) + 4}>+ {nombre(p.cible, 2)} m</text>
          {sommetPasse && connu && <text className="labo-fort" x={X(COTE) + 8} y={Math.min(Y(detente / 2, HAUT_SAUT) + 4, Y(0, HAUT_SAUT) - 3)}>{nombre(detente, 2)} m</text>}
        </>
      }>
      <line x1={-0.95} x2={0.95} y1={r(passe)} y2={r(passe)} stroke="var(--cuivre)" strokeWidth={0.02} strokeDasharray="0.08 0.08" />
      {/* la cote de la hauteur atteinte, marquée quand le sommet est passé */}
      {sommetPasse && connu && (
        <path d={`M ${COTE} 0.02 V ${r(detente)} M ${r(COTE - 0.07)} 0.02 h 0.14 M ${r(COTE - 0.07)} ${r(detente)} h 0.14`}
          fill="none" stroke={teinte(issue)} strokeWidth={0.03} strokeLinecap="round" />
      )}
      <Joueur pieds={y} />
      {!enVol && <circle className="labo-appel" cx={0} cy={r(passe)} r={0.26} fill="none" stroke="var(--cuivre)" strokeWidth={0.03} />}
      {sommetPasse && <circle className="labo-impact" cx={0} cy={r(passe)} r={0.3} fill="none" stroke={teinte(issue)} strokeWidth={0.04} />}
      <Ballon x={0} y={attrape ? MAINS.y + y : passe} />
    </Terrain>
  );
}

function Tir({ p, t, phase, issue, inconnues }: PropsScene) {
  const connu = !inconnues.includes("v0");
  const tir = { v0: p.v0, angle: p.angle, hauteur: p.hauteur };
  const enMain = phase === "pret";
  const fin = finDuVol(tir);
  const ts = enMain ? 0 : Math.min(t, fin);
  const vol = positionTir(tir, ts);
  const sommet = sommetTir(tir);
  const sommetPasse = !enMain && ts >= sommet.t;
  const marque = !enMain && !!issue?.reussi && t >= fin;
  // un tir réussi traverse le filet : le ballon tombe ensuite à la verticale, freiné par le filet
  const pos = marque ? { x: vol.x, y: PANIER.y - 0.25 * PESANTEUR * (t - fin) ** 2 } : vol;
  const trace = enMain ? [] : Array.from({ length: Math.floor(ts / PAS_TRACE) + 1 }, (_, i) => positionTir(tir, i * PAS_TRACE));
  const alpha = (p.angle * Math.PI) / 180;
  const pointe = 1.05; // longueur de la flèche de la vitesse, en mètres : elle montre la direction du tir
  const autour = (rayon: number, angle: number) => ({ x: rayon * Math.cos(angle), y: p.hauteur + rayon * Math.sin(angle) });
  const nomVitesse = autour(pointe + 0.2, alpha);
  const nomAngle = autour(ARC + 0.3, alpha / 2);
  return (
    <Terrain haut={HAUT_TIR} description="Le joueur lâche le ballon à gauche. Le centre du cercle est à 4,60 m de lui et à 3,05 m du sol."
      textes={enMain ? (
        <>
          <text className="simu-fleche" x={X(nomVitesse.x)} y={Y(nomVitesse.y, HAUT_TIR)}>
            <tspan fontStyle="italic">v</tspan><tspan dy={3} fontSize={8}>0</tspan><tspan dy={-3}> = {connu ? `${nombre(p.v0, 2)} m/s` : "?"}</tspan>
          </text>
          <text className="simu-fleche" x={X(nomAngle.x)} y={Y(nomAngle.y, HAUT_TIR) + 4}>{nombre(p.angle, 0)}°</text>
        </>
      ) : sommetPasse && (
        <text className="simu-cote" x={X(sommet.x)} y={Y(sommet.y, HAUT_TIR) - 7} textAnchor="middle">Sommet : {nombre(sommet.y, 2)} m</text>
      )}>
      <Joueur taille={p.hauteur / MAINS.y} />
      {enMain && <circle className="labo-appel" cx={PANIER.x} cy={PANIER.y} r={0.36} fill="none" stroke="var(--cuivre)" strokeWidth={0.03} />}
      {enMain ? (
        <g transform={`translate(0 ${r(p.hauteur)})`} fill="none" stroke="var(--bleu)" strokeLinecap="round">
          <path d="M 0 0 H 1" stroke="var(--discret)" strokeWidth={0.015} strokeDasharray="0.06 0.06" />
          <path d={`M ${ARC} 0 A ${ARC} ${ARC} 0 0 1 ${r(ARC * Math.cos(alpha))} ${r(ARC * Math.sin(alpha))}`} stroke="var(--discret)" strokeWidth={0.015} />
          <g transform={`rotate(${p.angle})`}>
            <path d={`M 0.16 0 H ${r(pointe - 0.1)}`} strokeWidth={0.04} />
            <path d={`M ${pointe} 0 l -0.15 0.065 v -0.13 z`} fill="var(--bleu)" stroke="none" />
          </g>
        </g>
      ) : (
        <>
          {trace.map((q, i) => <circle key={i} cx={r(q.x)} cy={r(q.y)} r={0.04} fill="var(--cuivre)" opacity={0.8} />)}
          {sommetPasse && <circle cx={r(sommet.x)} cy={r(sommet.y)} r={0.07} fill="var(--carte)" stroke="var(--encre)" strokeWidth={0.03} />}
          {marque && <circle className="labo-impact" cx={PANIER.x} cy={PANIER.y} r={0.42} fill="none" stroke="var(--vert)" strokeWidth={0.05} />}
        </>
      )}
      {/* le vol s'arrête quand le centre du ballon arrive à y = 0 ; le ballon dessiné, lui, reste posé sur le sol */}
      <Ballon x={pos.x} y={Math.max(pos.y, RAYON_BALLON)} />
    </Terrain>
  );
}

export default function SceneBasket(props: PropsScene) {
  return props.p.mode === 0 ? <Saut {...props} /> : <Tir {...props} />;
}
