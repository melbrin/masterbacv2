import { ecartEnJours } from "@/lib/commun/dates";
import { nombre } from "@/lib/commun/format";

// Les graphiques de l'écran des progrès, dessinés en SVG par l'application : aucune bibliothèque, aucune ressource tierce.
const court = (jour: string) => `${Number(jour.slice(8, 10))}/${jour.slice(5, 7)}`;

/** Les notes de DS dans le temps, et la note estimée d'aujourd'hui avec sa fourchette. */
export function CourbeNotes({ notes, estimee, aujourdhui }: {
  notes: { jour: string; note: number }[];
  estimee: { valeur: number; bas: number; haut: number } | null;
  aujourdhui: string;
}) {
  const pts = [...notes.map((n) => ({ x: n.jour, y: n.note, est: false })), ...(estimee ? [{ x: aujourdhui, y: estimee.valeur, est: true }] : [])];
  if (!pts.length) return null;
  const W = 360, H = 200, gauche = 30, droite = 14, bas = 30, haut = 18, ymin = 4, ymax = 20;
  const etendue = ecartEnJours(pts[0].x, pts[pts.length - 1].x) || 1;
  const X = (x: string) => (pts.length === 1 ? (gauche + W - droite) / 2 : gauche + 16 + (ecartEnJours(pts[0].x, x) / etendue) * (W - gauche - droite - 40));
  const Y = (y: number) => haut + (1 - (Math.min(ymax, Math.max(ymin, y)) - ymin) / (ymax - ymin)) * (H - haut - bas);
  const chemin = pts.map((p, i) => `${i ? "L" : "M"}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ");
  const ds = pts.filter((p) => !p.est);
  const fin = pts.find((p) => p.est);
  return (
    <svg className="graphe" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`Notes de DS : ${ds.map((p) => `${nombre(p.y, 1)} le ${court(p.x)}`).join(", ") || "aucune"}${fin ? `. Note estimée : ${nombre(fin.y, 1)}.` : ""}`}>
      {[10, 14, 18].map((v) => <g key={v}><line className="axe" x1={gauche} x2={W - droite} y1={Y(v)} y2={Y(v)} strokeDasharray="3 4" /><text className="lib" x={gauche - 8} y={Y(v) + 4} textAnchor="end">{v}</text></g>)}
      {pts.length > 1 && <path className="courbe" d={chemin} />}
      {fin && estimee && <line x1={X(fin.x)} x2={X(fin.x)} y1={Y(estimee.haut)} y2={Y(estimee.bas)} stroke="var(--cuivre)" strokeWidth="10" strokeLinecap="round" opacity=".35" />}
      {ds.map((p, i) => (
        <g key={p.x + i}><circle className="pt" cx={X(p.x)} cy={Y(p.y)} r="5" /><text className="val" x={X(p.x)} y={Y(p.y) - 11} textAnchor="middle">{nombre(p.y, 1)}</text>
          {(i === 0 || i === ds.length - 1) && <text className="lib" x={X(p.x)} y={H - 10} textAnchor={i === 0 && ds.length + (fin ? 1 : 0) > 1 ? "start" : "middle"}>DS du {court(p.x)}</text>}</g>
      ))}
      {fin && <g><circle className="pt-fin" cx={X(fin.x)} cy={Y(fin.y)} r="6" /><text className="val" x={X(fin.x) - 11} y={Y(fin.y) + 4} textAnchor="end">{nombre(fin.y, 1)}</text>
        <text className="lib" x={X(fin.x)} y={H - 10} textAnchor={pts.length > 1 ? "end" : "middle"}>estimée</text></g>}
    </svg>
  );
}

/** Le nombre de réponses par semaine, la semaine en cours à droite. */
export function BarresSemaines({ semaines }: { semaines: { lundi: string; questions: number; seances: number }[] }) {
  const W = 360, H = 170, gauche = 8, bas = 34, haut = 22;
  const max = Math.max(4, ...semaines.map((s) => s.questions));
  const pas = (W - 2 * gauche) / semaines.length;
  const largeur = Math.min(30, pas - 8);
  return (
    <svg className="graphe" viewBox={`0 0 ${W} ${H}`} role="img"
      aria-label={`Réponses par semaine : ${semaines.map((s) => `${s.questions} la semaine du ${court(s.lundi)}`).join(", ")}`}>
      <line className="axe" x1={gauche} x2={W - gauche} y1={H - bas} y2={H - bas} />
      {semaines.map((s, i) => {
        const h = ((H - bas - haut) * s.questions) / max;
        const x = gauche + i * pas + (pas - largeur) / 2;
        const derniere = i === semaines.length - 1;
        return (
          <g key={s.lundi}>
            <rect className={`barre-s ${derniere ? "courante" : ""}`} x={x} y={H - bas - Math.max(h, s.questions ? 3 : 0)} width={largeur} height={Math.max(h, s.questions ? 3 : 0)} rx="4" />
            {s.questions > 0 && <text className="val" x={x + largeur / 2} y={H - bas - h - 6} textAnchor="middle">{s.questions}</text>}
            <text className="lib" x={x + largeur / 2} y={H - bas + 14} textAnchor="middle">{court(s.lundi)}</text>
            <text className="lib" x={x + largeur / 2} y={H - bas + 27} textAnchor="middle">{s.seances ? `${s.seances} s.` : ""}</text>
          </g>
        );
      })}
    </svg>
  );
}
