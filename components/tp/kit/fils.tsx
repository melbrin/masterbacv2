"use client";

// Le kit des paillasses : les fils d'un montage électrique. L'élève tire un fil d'une borne à une autre avec le doigt,
// ou touche une borne puis une autre. Il touche un fil pour le retirer. Les bornes et les fils se manœuvrent au clavier.

import { useState } from "react";
import { useGlisse } from "./gestes";
import type { Point } from "./scene";
import { son, vibre } from "./son";

export interface Borne {
  /** de 1 à 12 caractères : lettres minuscules, chiffres, + ou − */
  id: string;
  x: number;
  y: number;
  /** le nom lu par un lecteur d'écran : « la borne + du générateur » */
  nom: string;
  /** la couleur de la borne : rouge pour un +, noire pour un − ou une masse */
  teinte?: "rouge" | "noire";
}

const COULEURS = ["var(--brique)", "var(--bleu)", "var(--vert)", "var(--sable)", "var(--cuivre)", "var(--encre)"];
const r2 = (n: number) => Math.round(n * 10) / 10;
/** Le tracé d'un fil souple entre deux points : il pend un peu, d'autant plus qu'il est long. */
const trace = (a: Point, b: Point): string => {
  const fleche = Math.min(34, 8 + Math.hypot(b.x - a.x, b.y - a.y) * 0.16);
  return `M ${r2(a.x)} ${r2(a.y)} Q ${r2((a.x + b.x) / 2)} ${r2((a.y + b.y) / 2 + fleche)} ${r2(b.x)} ${r2(b.y)}`;
};

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
 * dans son état : cette vue ne fait que la dessiner et recueillir les gestes.
 */
export function Fils({ bornes, fils, relie, retire, actif = true }: { bornes: readonly Borne[]; fils: readonly (readonly [string, string])[]; relie: (a: string, b: string) => void; retire: (a: string, b: string) => void; actif?: boolean }) {
  /** la borne d'où part le fil en cours ; `bout` est le doigt pendant qu'il tire le fil */
  const [depart, setDepart] = useState<string | null>(null);
  const [bout, setBout] = useState<Point | null>(null);
  const [choisi, setChoisi] = useState<string | null>(null);
  const place = (id: string) => bornes.find((b) => b.id === id);
  const prochaine = (p: Point, sauf: string) => bornes.filter((b) => b.id !== sauf).map((b) => ({ b, d: Math.hypot(p.x - b.x, p.y - b.y) })).filter((x) => x.d <= 26).sort((x, y) => x.d - y.d)[0]?.b ?? null;
  const pose = (a: string, b: string) => {
    setDepart(null);
    setBout(null);
    if (a === b || fils.some(([u, v]) => (u === a && v === b) || (u === b && v === a))) return;
    son("pose");
    vibre(8);
    relie(a, b);
  };
  const survolee = depart && bout ? prochaine(bout, depart)?.id ?? null : null;
  const origine = depart ? place(depart) : undefined;
  return (
    <g className="pl-fils">
      {fils.map(([a, b], i) => {
        const pa = place(a), pb = place(b);
        if (!pa || !pb) return null;
        const cle = `${a}:${b}`;
        const milieu = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 + Math.min(34, 8 + Math.hypot(pb.x - pa.x, pb.y - pa.y) * 0.16) / 2 };
        return (
          <g key={cle} className={`pl-fil${choisi === cle ? " pl-fil-choisi" : ""}`}>
            <path d={trace(pa, pb)} fill="none" stroke={COULEURS[i % COULEURS.length]} strokeWidth={3} strokeLinecap="round" />
            <path d={trace(pa, pb)} fill="none" stroke="transparent" strokeWidth={22} role="button" tabIndex={actif ? 0 : -1} aria-label={`Fil entre ${pa.nom} et ${pb.nom}`}
              onClick={() => { if (actif) setChoisi(choisi === cle ? null : cle); }} onKeyDown={(e) => { if (actif && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setChoisi(choisi === cle ? null : cle); } }} />
            {choisi === cle && (
              <g className="pl-fil-retirer" role="button" tabIndex={0} aria-label={`Retirer le fil entre ${pa.nom} et ${pb.nom}`}
                onClick={() => { setChoisi(null); son("clic"); retire(a, b); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setChoisi(null); retire(a, b); } }}>
                <circle cx={r2(milieu.x)} cy={r2(milieu.y)} r={22} fill="transparent" />
                <circle cx={r2(milieu.x)} cy={r2(milieu.y)} r={11} />
                <path d={`M ${r2(milieu.x - 4)} ${r2(milieu.y - 4)} l 8 8 M ${r2(milieu.x + 4)} ${r2(milieu.y - 4)} l -8 8`} />
              </g>
            )}
          </g>
        );
      })}
      {origine && bout && <path className="pl-fil-tire" d={trace(origine, bout)} fill="none" />}
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
    </g>
  );
}
