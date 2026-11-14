"use client";

// Les fils des paillasses « circuit » et « microcontroleur ». Le geste est celui de la pièce Fils du kit
// (components/tp/kit/fils.tsx) : on tire un fil d'une borne à une autre, ou on touche une borne puis une autre ; on
// touche un fil pour le retirer. Cette pièce reprend son dessin et ses classes, et contourne trois défauts relevés à
// l'essai, en attendant que le kit soit corrigé :
//   - la croix qui retire un fil se dessinait sous les bornes : quand elle tombait dans la zone de toucher d'une borne
//     voisine, le doigt ne pouvait plus l'atteindre (un fil sur sept, sur ces deux paillasses) ;
//   - un fil qui enjambait une borne passait dessus, comme s'il y était branché ;
//   - la couleur d'un fil dépendait de son rang : en retirer un changeait la couleur des suivants.

import { useState } from "react";
import { son, useGlisse, vibre, type Borne, type Point } from "../kit";

const COULEURS = ["var(--brique)", "var(--bleu)", "var(--vert)", "var(--sable)", "var(--cuivre)", "var(--encre)"];
const r1 = (n: number) => Math.round(n * 10) / 10;
/** Un point d'un fil : il part de a, pend vers c, arrive en b. */
const surLeFil = (a: Point, c: Point, b: Point, t: number): Point => ({
  x: (1 - t) ** 2 * a.x + 2 * t * (1 - t) * c.x + t ** 2 * b.x,
  y: (1 - t) ** 2 * a.y + 2 * t * (1 - t) * c.y + t ** 2 * b.y,
});
const trace = (a: Point, c: Point, b: Point): string => `M ${r1(a.x)} ${r1(a.y)} Q ${r1(c.x)} ${r1(c.y)} ${r1(b.x)} ${r1(b.y)}`;
/** La flèche d'un fil souple : d'autant plus grande qu'il est long. */
const flecheDe = (a: Point, b: Point): number => Math.min(34, 8 + Math.hypot(b.x - a.x, b.y - a.y) * 0.16);
/** Les façons de laisser pendre un fil, par ordre de préférence : vers le bas, vers le haut, plus bas, de côté. */
const ECARTS: readonly Point[] = [{ x: 0, y: 1 }, { x: 0, y: -1 }, { x: 0, y: 2 }, { x: 0, y: -2 }, { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 3 }];
const ESSAIS = [0.12, 0.22, 0.32, 0.42, 0.5, 0.58, 0.68, 0.78, 0.88];

/**
 * Le tracé d'un fil entre deux bornes : il pend un peu, et il s'écarte des autres bornes pour ne pas avoir l'air d'y
 * être branché. `milieu` : le point du fil où se dessine la croix qui le retire.
 */
function parcours(a: Borne, b: Borne, bornes: readonly Borne[]): { d: string; milieu: Point; prise: Point } {
  const fleche = flecheDe(a, b);
  const autres = bornes.filter((x) => x.id !== a.id && x.id !== b.id);
  let choisi: { c: Point; marge: number } | null = null;
  for (const ecart of ECARTS) {
    const c = { x: (a.x + b.x) / 2 + ecart.x * fleche, y: (a.y + b.y) / 2 + ecart.y * fleche };
    const marge = Math.min(Infinity, ...autres.flatMap((o) => ESSAIS.map((t) => { const p = surLeFil(a, c, b, t); return Math.hypot(p.x - o.x, p.y - o.y); })));
    if (!choisi || marge > choisi.marge) choisi = { c, marge };
    // assez loin de toute borne : inutile de chercher une autre façon
    if (marge >= 17) { choisi = { c, marge }; break; }
  }
  const c = choisi?.c ?? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + fleche };
  // là où le doigt touche le fil sans toucher une borne : le point du fil le plus loin de toutes, poussé encore un peu
  let prise = surLeFil(a, c, b, 0.5), libre = -1;
  for (const t of ESSAIS) {
    const p = surLeFil(a, c, b, t);
    const proche = bornes.reduce((m, o) => (Math.hypot(p.x - o.x, p.y - o.y) < Math.hypot(p.x - m.x, p.y - m.y) ? o : m), bornes[0]);
    const d = Math.hypot(p.x - proche.x, p.y - proche.y);
    if (d > libre) { libre = d; prise = d < 28 && d > 0 ? { x: p.x + ((p.x - proche.x) / d) * 6, y: p.y + ((p.y - proche.y) / d) * 6 } : p; }
  }
  return { d: trace(a, c, b), milieu: surLeFil(a, c, b, 0.5), prise };
}
/** Pour le guide : où toucher un fil pour le choisir, et où se dessine la croix qui le retire. */
export function placesDuFil(a: string, b: string, bornes: readonly Borne[]): { prise: Point; croix: Point } | null {
  const pa = bornes.find((x) => x.id === a), pb = bornes.find((x) => x.id === b);
  if (!pa || !pb) return null;
  const { prise, milieu } = parcours(pa, pb, bornes);
  return { prise: { x: r1(prise.x), y: r1(prise.y) }, croix: { x: r1(milieu.x), y: r1(milieu.y) } };
}
/**
 * La couleur de chaque fil. Elle tient à ses deux bornes, pas à son rang : retirer un fil ne recolore pas les autres.
 * Deux fils branchés sur une même borne ne portent pas la même : le second prend la couleur libre suivante.
 */
function couleursDe(fils: readonly { a: string; b: string; i: number; j: number }[]): string[] {
  const rangs: number[] = [];
  fils.forEach((f, k) => {
    const prises = new Set(fils.slice(0, k).flatMap((g, n) => (g.a === f.a || g.a === f.b || g.b === f.a || g.b === f.b ? [rangs[n]] : [])));
    let rang = (Math.min(f.i, f.j) * 5 + Math.max(f.i, f.j) * 3) % COULEURS.length;
    for (let essai = 0; essai < COULEURS.length && prises.has(rang); essai++) rang = (rang + 1) % COULEURS.length;
    rangs.push(rang);
  });
  return rangs.map((rang) => COULEURS[rang]);
}

// Une borne : on en tire un fil, ou on la touche.
function UneBorne({ b, choisie, proche, actif, depart, bouge, fin }: { b: Borne; choisie: boolean; proche: boolean; actif: boolean; depart: () => void; bouge: (p: Point) => void; fin: (p: Point, aBouge: boolean) => void }) {
  const reglages = useGlisse({ depart, bouge, fin }, actif);
  return (
    <g className={`pl-borne${choisie ? " pl-borne-choisie" : ""}${proche ? " pl-borne-proche" : ""}`} role="button" tabIndex={actif ? 0 : -1} aria-pressed={choisie}
      aria-label={`${b.nom}${choisie ? ", fil en main" : ""}`} onKeyDown={(e) => { if (actif && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); fin({ x: b.x, y: b.y }, false); } }} {...reglages}>
      <circle cx={b.x} cy={b.y} r={22} fill="transparent" />
      <circle className="pl-borne-anneau" cx={b.x} cy={b.y} r={9} />
      <circle cx={b.x} cy={b.y} r={5.5} fill={b.teinte === "rouge" ? "var(--brique)" : b.teinte === "noire" ? "#0A0F18" : "var(--cuivre)"} stroke="var(--encre)" strokeWidth={1.2} />
    </g>
  );
}

/**
 * Les bornes d'un montage et les fils posés entre elles. `fils` : les fils en place, chacun par ses deux bornes.
 * `relie` est appelé quand l'élève pose un fil, `retire` quand il en enlève un. La paillasse garde la liste des fils
 * dans son état : cette vue ne fait que la dessiner et recueillir les gestes. `choisi` et `choisit` : le fil que l'élève
 * vient de toucher (« a:b »), gardé par la paillasse pour que son guide sache où en est le geste.
 */
export function FilsCircuit({ bornes, fils, relie, retire, choisi, choisit: setChoisi, actif = true }: {
  bornes: readonly Borne[]; fils: readonly (readonly [string, string])[]; relie: (a: string, b: string) => void; retire: (a: string, b: string) => void;
  choisi: string | null; choisit: (fil: string | null) => void; actif?: boolean;
}) {
  /** la borne d'où part le fil en cours ; `bout` est le doigt pendant qu'il tire le fil */
  const [depart, setDepart] = useState<string | null>(null);
  const [bout, setBout] = useState<Point | null>(null);
  const rang = (id: string) => bornes.findIndex((b) => b.id === id);
  const prochaine = (p: Point, sauf: string) => bornes.filter((b) => b.id !== sauf).map((b) => ({ b, d: Math.hypot(p.x - b.x, p.y - b.y) })).filter((x) => x.d <= 26).sort((x, y) => x.d - y.d)[0]?.b ?? null;
  const pose = (a: string, b: string) => {
    setDepart(null);
    setBout(null);
    if (a === b) return;
    // deux bornes déjà reliées : la paillasse le dira
    if (!fils.some(([u, v]) => (u === a && v === b) || (u === b && v === a))) { son("pose"); vibre(8); }
    relie(a, b);
  };
  const survolee = depart && bout ? prochaine(bout, depart)?.id ?? null : null;
  const origine = bornes.find((b) => b.id === depart);
  const connus = fils.flatMap(([a, b]) => { const i = rang(a), j = rang(b); return i < 0 || j < 0 ? [] : [{ a, b, i, j }]; });
  const couleurs = couleursDe(connus);
  const poses = connus.map((f, k) => ({ ...f, pa: bornes[f.i], pb: bornes[f.j], cle: `${f.a}:${f.b}`, couleur: couleurs[k], ...parcours(bornes[f.i], bornes[f.j], bornes) }));
  const aRetirer = poses.find((f) => f.cle === choisi);
  const enleve = () => {
    if (!aRetirer) return;
    setChoisi(null);
    son("clic");
    retire(aRetirer.a, aRetirer.b);
  };
  return (
    <g className="pl-fils">
      {poses.map((f) => (
        <g key={f.cle} className={`pl-fil${choisi === f.cle ? " pl-fil-choisi" : ""}`}>
          <path d={f.d} fill="none" stroke={f.couleur} strokeWidth={3} strokeLinecap="round" />
          <path d={f.d} fill="none" stroke="transparent" strokeWidth={22} role="button" tabIndex={actif ? 0 : -1} aria-pressed={choisi === f.cle} aria-label={`Fil entre ${f.pa.nom} et ${f.pb.nom}`}
            onClick={() => { if (actif) setChoisi(choisi === f.cle ? null : f.cle); }} onKeyDown={(e) => { if (actif && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setChoisi(choisi === f.cle ? null : f.cle); } }} />
        </g>
      ))}
      {origine && bout && <path className="pl-fil-tire" d={trace(origine, { x: (origine.x + bout.x) / 2, y: (origine.y + bout.y) / 2 + flecheDe(origine, bout) }, bout)} fill="none" />}
      {bornes.map((b) => (
        <UneBorne key={b.id} b={b} actif={actif} choisie={depart === b.id} proche={survolee === b.id}
          depart={() => { setChoisi(null); }}
          bouge={(p) => { setDepart(b.id); setBout(p); }}
          fin={(p, aBouge) => {
            if (aBouge) { const cible = prochaine(p, b.id); if (cible) pose(b.id, cible.id); else { setDepart(null); setBout(null); } return; }
            // un simple toucher : la première borne se choisit, la seconde reçoit le fil
            if (depart && depart !== b.id) pose(depart, b.id);
            else { setDepart(depart === b.id ? null : b.id); setBout(null); if (depart !== b.id) { son("clic"); vibre(6); } }
          }} />
      ))}
      {/* la croix qui retire le fil choisi : dessinée après les bornes, pour qu'aucune ne la couvre */}
      {aRetirer && actif && (
        <g className="pl-fil-retirer" role="button" tabIndex={0} aria-label={`Retirer le fil entre ${aRetirer.pa.nom} et ${aRetirer.pb.nom}`}
          onClick={enleve} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); enleve(); } if (e.key === "Escape") setChoisi(null); }}>
          <circle cx={r1(aRetirer.milieu.x)} cy={r1(aRetirer.milieu.y)} r={22} fill="transparent" />
          <circle cx={r1(aRetirer.milieu.x)} cy={r1(aRetirer.milieu.y)} r={11} />
          <path d={`M ${r1(aRetirer.milieu.x - 4)} ${r1(aRetirer.milieu.y - 4)} l 8 8 M ${r1(aRetirer.milieu.x + 4)} ${r1(aRetirer.milieu.y - 4)} l -8 8`} />
        </g>
      )}
    </g>
  );
}
