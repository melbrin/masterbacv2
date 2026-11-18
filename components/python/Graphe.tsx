"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ecrisNombre, graduations, type Intervalle } from "@/lib/commun/python/graduations";
import type { FigurePython } from "@/lib/commun/python/types";

// Une figure tracée par un programme du hub Python (décision 0016). Python n'y dessine rien : le petit matplotlib du
// banc (public/python/banc.mjs) décrit les tracés, et ce composant les dessine dans la charte, à la largeur réelle de
// l'écran pour que les graduations restent lisibles sur un téléphone.

const COULEURS: Record<string, string> = {
  bleu: "var(--bleu)", brique: "var(--brique)", vert: "var(--vert)", cuivre: "var(--cuivre)", ardoise: "var(--ardoise)",
  sable: "var(--sable)", encre: "var(--encre)", cyan: "var(--py-cyan)", magenta: "var(--py-magenta)", blanc: "var(--carte)",
};
// l'ordre des couleurs quand le programme n'en choisit pas, comme matplotlib
const CYCLE = ["bleu", "cuivre", "vert", "brique", "magenta", "ardoise", "cyan", "sable"];
const TRAITS: Record<string, string | undefined> = { "-": undefined, "--": "7 4", ":": "2 3", "-.": "7 3 2 3" };
const MAX_MARQUEURS = 2000;

const MARGE = { g: 62, d: 16, h: 30, b: 46 };

const fini = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);
const etendue = ([a, b]: Intervalle) => b - a;

/** Les bornes des deux axes : les données, avec une petite marge, sauf si le programme les a fixées. */
function bornes(f: FigurePython): { x: Intervalle; y: Intervalle; fleches: number[] } {
  const xs: number[] = [];
  const ys: number[] = [];
  const ajoute = (x: number | null, y: number | null) => {
    if (fini(x)) xs.push(x);
    if (fini(y)) ys.push(y);
  };
  for (const c of f.courbes) c.x.forEach((x, i) => ajoute(x, c.y[i]));
  for (const b of f.barres) { xs.push(b.x0, b.x1); ys.push(0, b.h); }
  for (const l of f.lignes) (l.sens === "h" ? ys : xs).push(l.valeur);
  for (const t of f.textes) ajoute(t.x, t.y);
  for (const fl of f.fleches) fl.x.forEach((x, i) => ajoute(x, fl.y[i]));
  const brut = (v: number[]): Intervalle => (v.length ? [Math.min(...v), Math.max(...v)] : [0, 1]);
  // une flèche sans échelle : la plus longue mesure environ un huitième du graphique
  const portee = Math.max(etendue(brut(xs)), etendue(brut(ys))) || 1;
  const echelles = f.fleches.map((fl) => {
    if (fini(fl.echelle)) return 1 / fl.echelle;
    const longueurs = fl.u.map((u, i) => (fini(u) && fini(fl.v[i]) ? Math.hypot(u, fl.v[i] as number) : 0));
    const max = Math.max(0, ...longueurs);
    return max > 0 ? (0.13 * portee) / max : 0;
  });
  f.fleches.forEach((fl, k) => fl.x.forEach((x, i) => {
    const y = fl.y[i]; const u = fl.u[i]; const v = fl.v[i];
    if (fini(x) && fini(y) && fini(u) && fini(v)) ajoute(x + u * echelles[k], y + v * echelles[k]);
  }));
  const avecMarge = (v: number[], fixe: [number, number] | null): Intervalle => {
    if (fixe) return fixe[0] === fixe[1] ? [fixe[0] - 1, fixe[1] + 1] : [Math.min(...fixe), Math.max(...fixe)];
    const [a, b] = brut(v);
    if (a === b) return [a - (Math.abs(a) || 1) * 0.5, b + (Math.abs(b) || 1) * 0.5];
    const m = (b - a) * 0.05;
    return [a - m, b + m];
  };
  return { x: avecMarge(xs, f.xlim), y: avecMarge(ys, f.ylim), fleches: echelles };
}

function Figure({ f, largeur }: { f: FigurePython; largeur: number }) {
  const hauteur = Math.round(Math.min(420, Math.max(230, largeur * 0.64)));
  const zone = { x: MARGE.g, y: MARGE.h, l: largeur - MARGE.g - MARGE.d, h: hauteur - MARGE.h - MARGE.b };
  const b = bornes(f);
  let ix = b.x;
  let iy = b.y;
  if (f.egal) {
    // un repère orthonormé : la même longueur à l'écran pour une unité sur chaque axe
    const s = Math.min(zone.l / etendue(ix), zone.h / etendue(iy));
    const cx = (ix[0] + ix[1]) / 2; const cy = (iy[0] + iy[1]) / 2;
    ix = [cx - zone.l / s / 2, cx + zone.l / s / 2];
    iy = [cy - zone.h / s / 2, cy + zone.h / s / 2];
  }
  const px = (x: number) => zone.x + ((x - ix[0]) / etendue(ix)) * zone.l;
  const py = (y: number) => zone.y + zone.h - ((y - iy[0]) / etendue(iy)) * zone.h;
  const gx = graduations(ix, Math.max(3, Math.round(zone.l / 90)));
  const gy = graduations(iy, Math.max(3, Math.round(zone.h / 60)));
  const couleur = (c: string | null, rang: number) => COULEURS[c ?? ""] ?? COULEURS[CYCLE[rang % CYCLE.length]];
  const clip = `py-zone-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  let rang = 0;
  const courbes = f.courbes.map((c, k) => {
    const teinte = couleur(c.couleur, c.couleur ? 0 : rang++);
    let d = "";
    let leve = true;
    c.x.forEach((x, i) => {
      const y = c.y[i];
      if (!fini(x) || !fini(y)) { leve = true; return; }
      d += `${leve ? "M" : "L"}${px(x).toFixed(1)} ${py(y).toFixed(1)}`;
      leve = false;
    });
    const points = c.marqueur ? c.x.slice(0, MAX_MARQUEURS).flatMap((x, i) => (fini(x) && fini(c.y[i]) ? [[px(x), py(c.y[i] as number)] as const] : [])) : [];
    return (
      <g key={`c${k}`} stroke={teinte} fill={teinte}>
        {c.trait && d && <path d={d} fill="none" strokeWidth={1.8} strokeDasharray={TRAITS[c.trait]} strokeLinejoin="round" strokeLinecap="round" />}
        {points.map(([x, y], i) => (c.marqueur === "s" ? <rect key={i} x={x - 3} y={y - 3} width={6} height={6} />
          : c.marqueur === "+" ? <path key={i} d={`M${x - 4} ${y}H${x + 4}M${x} ${y - 4}V${y + 4}`} strokeWidth={1.6} />
          : c.marqueur === "x" ? <path key={i} d={`M${x - 3.5} ${y - 3.5}L${x + 3.5} ${y + 3.5}M${x - 3.5} ${y + 3.5}L${x + 3.5} ${y - 3.5}`} strokeWidth={1.6} />
          : c.marqueur === "^" ? <path key={i} d={`M${x} ${y - 4}L${x + 4} ${y + 3}L${x - 4} ${y + 3}Z`} stroke="none" />
          : <circle key={i} cx={x} cy={y} r={c.marqueur === "." ? 1.8 : 3.2} stroke="none" />))}
      </g>
    );
  });
  const fleches = f.fleches.map((fl, k) => {
    const teinte = couleur(fl.couleur, fl.couleur ? 0 : rang++);
    return (
      <g key={`f${k}`} stroke={teinte} fill={teinte}>
        {fl.x.map((x, i) => {
          const y = fl.y[i]; const u = fl.u[i]; const v = fl.v[i];
          if (!fini(x) || !fini(y) || !fini(u) || !fini(v)) return null;
          const x0 = px(x); const y0 = py(y);
          const x1 = px(x + u * b.fleches[k]); const y1 = py(y + v * b.fleches[k]);
          const l = Math.hypot(x1 - x0, y1 - y0);
          if (l < 0.5) return null;
          const t = Math.min(10, l * 0.4);
          const ux = (x1 - x0) / l; const uy = (y1 - y0) / l;
          const bx = x1 - ux * t; const by = y1 - uy * t;
          return (
            <g key={i}>
              <path d={`M${x0.toFixed(1)} ${y0.toFixed(1)}L${bx.toFixed(1)} ${by.toFixed(1)}`} strokeWidth={1.7} strokeLinecap="round" />
              <path d={`M${x1.toFixed(1)} ${y1.toFixed(1)}L${(bx - uy * t * 0.42).toFixed(1)} ${(by + ux * t * 0.42).toFixed(1)}L${(bx + uy * t * 0.42).toFixed(1)} ${(by - ux * t * 0.42).toFixed(1)}Z`} stroke="none" />
            </g>
          );
        })}
      </g>
    );
  });
  const legende = f.legende ? [
    ...f.courbes.map((c, k) => ({ nom: c.nom, cle: `c${k}`, trait: c.trait, marqueur: c.marqueur })),
    ...f.fleches.map((fl, k) => ({ nom: fl.nom, cle: `f${k}`, trait: "-", marqueur: "" })),
  ] : [];
  let rangLegende = 0;
  const entrees = legende.map((e, i) => {
    const source = i < f.courbes.length ? f.courbes[i].couleur : f.fleches[i - f.courbes.length].couleur;
    return { ...e, teinte: couleur(source, source ? 0 : rangLegende++) };
  }).filter((e) => e.nom);
  const largeurLegende = Math.min(zone.l - 12, 26 + 7.2 * Math.max(0, ...entrees.map((e) => (e.nom ?? "").length)));

  const titre = f.titre ?? "Graphique tracé par ton programme";
  const nb = (n: number, un: string, plusieurs: string) => (n ? `${n} ${n > 1 ? plusieurs : un}` : "");
  // pour un lecteur d'écran : le titre, ce qui est tracé, et l'étendue de chaque axe (ses graduations extrêmes)
  const etendueAxe = (g: { valeurs: number[]; pas: number }) => (g.valeurs.length ? `de ${ecrisNombre(g.valeurs[0], g.pas)} à ${ecrisNombre(g.valeurs[g.valeurs.length - 1], g.pas)}` : "");
  const traces = [nb(f.courbes.length, "courbe", "courbes"), nb(f.fleches.reduce((s, fl) => s + fl.x.length, 0), "flèche", "flèches"), nb(f.barres.length, "barre", "barres")].filter(Boolean).join(", ");
  const description = [
    titre,
    traces ? traces.charAt(0).toUpperCase() + traces.slice(1) : "",
    `Abscisse${f.xlabel ? ` : ${f.xlabel},` : ""} ${etendueAxe(gx)}`,
    `Ordonnée${f.ylabel ? ` : ${f.ylabel},` : ""} ${etendueAxe(gy)}`,
  ].filter(Boolean).join(". ");
  return (
    <svg className="py-figure" width={largeur} height={hauteur} viewBox={`0 0 ${largeur} ${hauteur}`} role="img" aria-label={description}>
      <defs><clipPath id={clip}><rect x={zone.x} y={zone.y} width={zone.l} height={zone.h} /></clipPath></defs>
      <rect x={zone.x} y={zone.y} width={zone.l} height={zone.h} className="py-figure-fond" />
      {f.grille && (
        <g className="py-figure-grille">
          {gx.valeurs.map((v) => <line key={`gx${v}`} x1={px(v)} x2={px(v)} y1={zone.y} y2={zone.y + zone.h} />)}
          {gy.valeurs.map((v) => <line key={`gy${v}`} x1={zone.x} x2={zone.x + zone.l} y1={py(v)} y2={py(v)} />)}
        </g>
      )}
      <g clipPath={`url(#${clip})`}>
        {iy[0] < 0 && iy[1] > 0 && <line className="py-figure-zero" x1={zone.x} x2={zone.x + zone.l} y1={py(0)} y2={py(0)} />}
        {f.barres.map((br, i) => {
          const x0 = px(Math.min(br.x0, br.x1)); const x1 = px(Math.max(br.x0, br.x1));
          const h0 = py(Math.max(0, br.h)); const h1 = py(Math.min(0, br.h));
          return <rect key={`b${i}`} x={x0} y={h0} width={Math.max(0.5, x1 - x0)} height={Math.max(0, h1 - h0)} fill={couleur(br.couleur, 0)} fillOpacity={0.78} stroke="var(--carte)" strokeWidth={0.8} />;
        })}
        {f.lignes.map((l, i) => (l.sens === "h"
          ? <line key={`l${i}`} x1={zone.x} x2={zone.x + zone.l} y1={py(l.valeur)} y2={py(l.valeur)} stroke={couleur(l.couleur, 6)} strokeWidth={1.4} strokeDasharray={TRAITS[l.trait]} />
          : <line key={`l${i}`} x1={px(l.valeur)} x2={px(l.valeur)} y1={zone.y} y2={zone.y + zone.h} stroke={couleur(l.couleur, 6)} strokeWidth={1.4} strokeDasharray={TRAITS[l.trait]} />))}
        {courbes}
        {fleches}
        {f.textes.map((t, i) => <text key={`t${i}`} x={px(t.x)} y={py(t.y)} className="py-figure-texte">{t.texte}</text>)}
      </g>
      <rect x={zone.x} y={zone.y} width={zone.l} height={zone.h} className="py-figure-cadre" />
      <g className="py-figure-graduations">
        {gx.valeurs.map((v) => (
          <g key={`tx${v}`}>
            <line x1={px(v)} x2={px(v)} y1={zone.y + zone.h} y2={zone.y + zone.h + 4} />
            <text x={px(v)} y={zone.y + zone.h + 17} textAnchor="middle">{ecrisNombre(v, gx.pas)}</text>
          </g>
        ))}
        {gy.valeurs.map((v) => (
          <g key={`ty${v}`}>
            <line x1={zone.x - 4} x2={zone.x} y1={py(v)} y2={py(v)} />
            <text x={zone.x - 7} y={py(v) + 4} textAnchor="end">{ecrisNombre(v, gy.pas)}</text>
          </g>
        ))}
      </g>
      {f.titre && <text className="py-figure-titre" x={zone.x + zone.l / 2} y={19} textAnchor="middle">{f.titre}</text>}
      {f.xlabel && <text className="py-figure-axe" x={zone.x + zone.l / 2} y={hauteur - 9} textAnchor="middle">{f.xlabel}</text>}
      {f.ylabel && <text className="py-figure-axe" transform={`translate(14 ${zone.y + zone.h / 2}) rotate(-90)`} textAnchor="middle">{f.ylabel}</text>}
      {entrees.length > 0 && (
        <g className="py-figure-legende" transform={`translate(${zone.x + zone.l - largeurLegende - 6} ${zone.y + 6})`}>
          <rect width={largeurLegende} height={10 + 17 * entrees.length} rx={4} />
          {entrees.map((e, i) => (
            <g key={e.cle} transform={`translate(8 ${14 + 17 * i})`}>
              {e.trait ? <line x1={0} x2={14} y1={0} y2={0} stroke={e.teinte} strokeWidth={2} strokeDasharray={TRAITS[e.trait]} /> : <circle cx={7} cy={0} r={3.2} fill={e.teinte} />}
              <text x={20} y={4}>{e.nom}</text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

/** Les figures d'une exécution, chacune à la largeur de la colonne. */
export default function Graphe({ figures }: { figures: readonly FigurePython[] }) {
  const boite = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState(0);
  useEffect(() => {
    const el = boite.current;
    if (!el) return;
    const mesure = () => setLargeur(Math.max(260, Math.floor(el.clientWidth)));
    mesure();
    const ro = new ResizeObserver(mesure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="py-figures" ref={boite}>
      {largeur > 0 && figures.map((f, i) => <Figure key={i} f={f} largeur={largeur} />)}
      {figures.some((f) => !f.montree) && <p className="py-note py-sans-show">Ton programme n&apos;appelle pas plt.show() : le hub montre quand même la figure, mais Python, au bac comme sur un ordinateur, ne l&apos;afficherait pas.</p>}
    </div>
  );
}
