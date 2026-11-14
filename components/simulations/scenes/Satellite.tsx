import { useId } from "react";
import { nombre } from "@/lib/commun/format";
import { JOUR_SIDERAL, RAYON_TERRE, avance, instantPhoto, marche, periode } from "@/lib/commun/simulations/satellite";
import { r, teinte, type PropsScene } from "./types";

// Le satellite : la Terre vue de dessus le pôle Nord, à l'échelle, et le satellite sur son orbite.
// Tout tourne dans le même sens : la Terre sur elle-même, le satellite autour d'elle.
const C = { x: 180, y: 148 };
const DEMI = 134; // le rayon de la vue, en unités du dessin
const VUE_BASSE = 8400; // en km : la vue des orbites basses, où la Terre remplit l'écran
const ETOILES = Array.from({ length: 30 }, (_, i) => ({ x: (i * 97 + 31) % 360, y: (i * 53 + 17) % 296, o: 0.2 + ((i * 7) % 5) / 10 }));
const DEGRES = 180 / Math.PI;

/** Un point du dessin, à la distance d (en km) du centre de la Terre, après un angle a compté depuis le haut dans le sens du mouvement. */
const point = (d: number, a: number, e: number) => ({ x: r(C.x - d * e * Math.sin(a)), y: r(C.y - d * e * Math.cos(a)) });
/** Un arc de cercle de rayon d, de l'angle a à l'angle b, en petits segments. */
function arc(d: number, a: number, b: number, e: number): string {
  const n = Math.max(2, Math.ceil(Math.abs(b - a) / 0.05) + 1);
  return Array.from({ length: n }, (_, i) => point(d, a + ((b - a) * i) / (n - 1), e)).map((q) => `${q.x},${q.y}`).join(" ");
}

function Ciel() {
  return <g fill="var(--encre)">{ETOILES.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={0.8} opacity={s.o} />)}</g>;
}

/** La Terre, qui a tourné de l'angle donné : un disque bleu, des continents dessinés à grands traits, un halo pour l'atmosphère. */
function Terre({ e, tour }: { e: number; tour: number }) {
  const id = `terre-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const R = RAYON_TERRE * e;
  const tache = (x: number, y: number, rx: number, ry: number) => <ellipse cx={r(C.x + x * R)} cy={r(C.y + y * R)} rx={r(rx * R)} ry={r(ry * R)} />;
  return (
    <g>
      <defs><clipPath id={id}><circle cx={C.x} cy={C.y} r={r(R)} /></clipPath></defs>
      <circle cx={C.x} cy={C.y} r={r(R + 2.5)} fill="none" stroke="var(--bleu)" strokeWidth={2.5} opacity={0.35} />
      <circle cx={C.x} cy={C.y} r={r(R)} fill="#2C6CB0" />
      <g clipPath={`url(#${id})`}>
        <g transform={`rotate(${r(-tour * DEGRES)} ${C.x} ${C.y})`} fill="#5AA27C">
          {tache(-0.35, -0.25, 0.36, 0.22)}{tache(0.38, 0.3, 0.28, 0.2)}{tache(0.2, -0.6, 0.2, 0.12)}{tache(-0.25, 0.62, 0.2, 0.1)}
        </g>
      </g>
    </g>
  );
}

/** Le satellite : son corps et ses deux panneaux, alignés sur sa trajectoire. */
function Engin({ x, y, a, couleur = "var(--encre)" }: { x: number; y: number; a: number; couleur?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r(-a * DEGRES)})`}>
      <rect x={-9} y={-1.6} width={18} height={3.2} fill="var(--bleu)" />
      <rect x={-3} y={-3.2} width={6} height={6.4} rx={1} fill={couleur} />
    </g>
  );
}

// mode 0 : le satellite part du haut avec la vitesse choisie ; son orbite est un cercle seulement si la vitesse est la bonne
function MiseEnOrbite({ p, t, phase, issue, inconnues }: PropsScene) {
  const e = DEMI / VUE_BASSE;
  const r0 = RAYON_TERRE + p.h;
  const m = marche(p, phase === "pret" ? 0 : t);
  const ici = point(m.r, m.angle, e);
  const fin = m.tombe || phase === "fini";
  const etiquette = point(r0, -0.8, e);
  return (
    <svg viewBox="0 0 360 296" role="img" aria-label="La Terre vue de dessus. Un satellite part d'une orbite basse, tracée en pointillés. Sa trajectoire dépend de sa vitesse de départ.">
      <Ciel />
      <Terre e={e} tour={(2 * Math.PI * m.t) / JOUR_SIDERAL} />
      <circle cx={C.x} cy={C.y} r={r(r0 * e)} fill="none" stroke="var(--cuivre)" strokeWidth={1.2} strokeDasharray="3 4" />
      <text x={etiquette.x + 6} y={etiquette.y - 4}>orbite à {nombre(p.h, 0)} km</text>
      {phase !== "pret" && <polyline points={m.trace.map((q) => point(q.r, q.angle, e)).map((q) => `${q.x},${q.y}`).join(" ")} fill="none" stroke="var(--sable)" strokeWidth={1.6} strokeLinejoin="round" />}
      {phase === "pret" && (
        <g>
          <path d={`M ${C.x - 12} ${ici.y} H ${C.x - 44} m 6 -4 l -6 4 l 6 4`} fill="none" stroke="var(--bleu)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
          <text className="simu-fleche" x={C.x - 28} y={ici.y - 8} textAnchor="middle"><tspan fontStyle="italic">v</tspan> = {inconnues.includes("v") ? "?" : `${nombre(p.v, 2)} km/s`}</text>
        </g>
      )}
      <Engin x={ici.x} y={ici.y} a={m.angle} />
      {fin && <circle className="labo-impact" cx={ici.x} cy={ici.y} r={11} fill="none" stroke={teinte(issue)} strokeWidth={2} />}
    </svg>
  );
}

// mode 1 : le satellite tourne sur son orbite ; la photo se prend à la date choisie, au bon endroit si un tour est fini
function UnTour({ p, t, phase, issue }: PropsScene) {
  const e = DEMI / VUE_BASSE;
  const r0 = RAYON_TERRE + p.h;
  const ts = phase === "pret" ? 0 : t;
  const a = (2 * Math.PI * ts) / periode(p.h);
  const ici = point(r0, a, e);
  const prise = phase !== "pret" && ts >= instantPhoto(p);
  const anglePhoto = (2 * Math.PI * instantPhoto(p)) / periode(p.h);
  const photo = point(r0, anglePhoto, e);
  const nomPhoto = point(r0 + 22 / e, anglePhoto, e); // le mot « photo », à l'extérieur de l'orbite
  const haut = C.y - r0 * e;
  return (
    <svg viewBox="0 0 360 296" role="img" aria-label="La Terre vue de dessus. Un satellite tourne sur une orbite circulaire. Un repère marque son point de départ.">
      <Ciel />
      <Terre e={e} tour={(2 * Math.PI * ts) / JOUR_SIDERAL} />
      <circle cx={C.x} cy={C.y} r={r(r0 * e)} fill="none" stroke="var(--discret)" strokeWidth={1} opacity={0.7} />
      {phase !== "pret" && <polyline points={arc(r0, 0, a, e)} fill="none" stroke="var(--sable)" strokeWidth={2.2} strokeLinecap="round" />}
      {/* le point de départ : c'est là que la deuxième photo doit être prise */}
      <path d={`M ${C.x} ${r(haut - 5)} V ${r(haut - 15)}`} stroke="var(--cuivre)" strokeWidth={2} strokeLinecap="round" />
      <text x={C.x - 8} y={r(haut - 8)} textAnchor="end" className="labo-fort">départ</text>
      {phase === "pret" && <circle className="labo-appel" cx={C.x} cy={r(haut)} r={11} fill="none" stroke="var(--cuivre)" strokeWidth={1.5} />}
      <text x={8} y={288}>orbite à {nombre(p.h, 0)} km d&apos;altitude</text>
      <Engin x={ici.x} y={ici.y} a={a} />
      {prise && (
        <g>
          <circle className="labo-impact" cx={photo.x} cy={photo.y} r={12} fill="none" stroke={teinte(issue)} strokeWidth={2.5} />
          <text x={nomPhoto.x} y={nomPhoto.y + 4} textAnchor="middle" className="labo-fort" style={{ fill: teinte(issue) }}>photo</text>
        </g>
      )}
    </svg>
  );
}

// mode 2 : la Terre tourne avec sa station ; le satellite reste sur la verticale de la station seulement à la bonne altitude
function Geostationnaire({ p, t, phase, issue, inconnues }: PropsScene) {
  const orbite = RAYON_TERRE + p.h;
  const e = DEMI / (Math.max(orbite, RAYON_TERRE + 20000) * 1.08);
  const ts = phase === "pret" ? 0 : t;
  const terre = (2 * Math.PI * ts) / JOUR_SIDERAL;
  const a = (2 * Math.PI * ts) / periode(p.h);
  const station = point(RAYON_TERRE, terre, e);
  const verticale = point(orbite * 1.08, terre, e);
  const ici = point(orbite, a, e);
  const couleur = teinte(phase === "fini" ? issue : null);
  const ecart = Math.abs(avance(p, ts));
  return (
    <svg viewBox="0 0 360 296" role="img" aria-label="La Terre vue de dessus, avec une station sur l'équateur. Un satellite tourne loin de la Terre. La verticale de la station est tracée en pointillés.">
      <Ciel />
      <circle cx={C.x} cy={C.y} r={r(orbite * e)} fill="none" stroke="var(--discret)" strokeWidth={1} opacity={0.6} />
      <Terre e={e} tour={terre} />
      <line x1={station.x} y1={station.y} x2={verticale.x} y2={verticale.y} stroke="var(--cuivre)" strokeWidth={1.3} strokeDasharray="3 4" />
      <circle cx={station.x} cy={station.y} r={2.6} fill="var(--sable)" stroke="var(--carte-2)" strokeWidth={0.8} />
      {/* l'écart entre le satellite et la verticale de la station */}
      {ecart > 1 && <polyline points={arc(orbite, terre, a, e)} fill="none" stroke={phase === "fini" ? couleur : "var(--sable)"} strokeWidth={2.2} strokeLinecap="round" />}
      {phase === "pret" && <circle className="labo-appel" cx={ici.x} cy={ici.y} r={12} fill="none" stroke="var(--cuivre)" strokeWidth={1.5} />}
      <Engin x={ici.x} y={ici.y} a={a} couleur={couleur} />
      {phase === "fini" && <circle className="labo-impact" cx={ici.x} cy={ici.y} r={12} fill="none" stroke={couleur} strokeWidth={2} />}
      <text x={8} y={290}>En pointillés : la verticale de la station. Altitude : {inconnues.includes("h") ? "?" : `${nombre(p.h, 0)} km`}</text>
    </svg>
  );
}

export default function SceneSatellite(props: PropsScene) {
  return props.p.mode === 0 ? <MiseEnOrbite {...props} /> : props.p.mode === 1 ? <UnTour {...props} /> : <Geostationnaire {...props} />;
}
