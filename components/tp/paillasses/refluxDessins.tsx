"use client";

// La paillasse « reflux » : ses dessins. Le ballon et son mélange, le chauffe-ballon, le support élévateur, les pinces,
// le réfrigérant à boules, l'ampoule à décanter, la silhouette de l'élève et ses protections. Chaque pièce se dessine
// au trait, autour d'un point d'attache dit dans son commentaire. Les animations ne sont que décor (reflux.css).

import { useId } from "react";
import type { Circulation, Protection, Regime } from "@/lib/commun/tp/paillasses/reflux";

const r2 = (n: number) => Math.round(n * 100) / 100;

/** La couleur du mélange réactionnel, de la phase organique, de la phase aqueuse, et d'un mélange trouble. */
export const MELANGE = "rgba(232, 208, 130, 0.42)";
export const ORGANIQUE = "rgba(236, 196, 96, 0.62)";
export const AQUEUSE = "rgba(132, 186, 240, 0.34)";
const TROUBLE = "rgba(205, 205, 180, 0.5)";

/**
 * Le ballon, autour du centre de sa sphère (rayon 30) ; son col monte jusqu'à −62. `volume` : ce qu'il contient, en mL.
 * `ponce` : des grains au fond. `regime` : à l'ébullition, des bulles montent dans le liquide.
 */
export function Ballon({ volume, ponce, regime }: { volume: number; ponce: boolean; regime: Regime }) {
  const id = useId();
  const haut = volume <= 0 ? 0 : 60 * Math.min(1, volume / 100) ** 0.7;
  const bout = regime === "reflux" || regime === "fort";
  return (
    <g>
      <defs><clipPath id={id}><circle r={29} /></clipPath></defs>
      {volume > 0 && <rect clipPath={`url(#${id})`} x={-30} y={r2(30 - haut)} width={60} height={r2(haut)} fill={MELANGE} />}
      {volume > 0 && <path className="pl-menisque" d={`M ${r2(-Math.sqrt(Math.max(0, 841 - (30 - haut) ** 2)))} ${r2(30 - haut)} H ${r2(Math.sqrt(Math.max(0, 841 - (30 - haut) ** 2)))}`} />}
      {ponce && [-7, 1, 8].map((x) => <circle key={x} className="pl-reflux-grain" cx={x} cy={25 - Math.abs(x) / 4} r={1.8} />)}
      {bout && [-12, -3, 6, 14].map((x, i) => (
        <circle key={x} className={`pl-reflux-bulle${regime === "fort" ? " est-forte" : ""}`} cx={x} cy={22} r={regime === "fort" ? 3 : 2} style={{ animationDelay: `${i * 0.19}s` }} />
      ))}
      <path className="pl-verre" d="M -7 -62 V -29.2 A 30 30 0 1 0 7 -29.2 V -62 M -10 -62 H -7 M 7 -62 H 10" />
    </g>
  );
}

/** Le valet de liège qui tient le ballon debout sur la paillasse, autour du centre de la sphère du ballon. */
export function Valet() {
  return <path className="pl-reflux-liege" d="M -24 26 Q 0 40 24 26 L 28 36 H -28 Z" />;
}

/** Le chauffe-ballon, autour du centre de la sphère du ballon qu'il entoure : un bol, un socle, un voyant. */
export function ChauffeBallon({ marche }: { marche: boolean }) {
  return (
    <g>
      <path className="pl-reflux-appareil" d="M -40 -2 H 40 L 34 44 H -34 Z" />
      <path className={`pl-reflux-bol${marche ? " est-chaud" : ""}`} d="M -32 -2 A 32 32 0 0 0 32 -2 Z" />
      <circle className={`pl-reflux-voyant${marche ? " est-allume" : ""}`} cx={27} cy={36} r={2.6} />
    </g>
  );
}

/** Le support élévateur, autour du milieu de son pied posé sur la paillasse. Son plateau monte avec `hauteur` (de 0 à 3). */
export function SupportElevateur({ hauteur }: { hauteur: number }) {
  const plateau = -(15 + 13 * hauteur);
  return (
    <g>
      <path className="pl-reflux-ciseau" d={`M -28 -6 L 28 ${plateau + 5} M 28 -6 L -28 ${plateau + 5}`} />
      <rect className="pl-reflux-appareil" x={-36} y={-6} width={72} height={6} rx={2} />
      <rect className="pl-reflux-appareil" x={-36} y={plateau} width={72} height={5} rx={2} />
    </g>
  );
}

/** Une pince et sa noix, depuis la tige de la potence (à gauche) jusqu'à ce qu'elle serre, `long` plus loin. */
export function Pince({ long }: { long: number }) {
  return (
    <g>
      <rect className="pl-reflux-noix" x={-7} y={-7} width={14} height={14} rx={3} />
      <path className="pl-reflux-pince" d={`M 7 0 H ${long - 16} M ${long - 16} 0 Q ${long - 12} -11 ${long + 2} -10 M ${long - 16} 0 Q ${long - 12} 11 ${long + 2} 10`} />
    </g>
  );
}

/**
 * Le réfrigérant à boules, debout, depuis son rodage du bas (0, 0) jusqu'à son haut ouvert (−176). Ses deux tubulures
 * sont à droite : en bas (24, −32), en haut (24, −148). `eau` : comment l'eau y circule. `vapeurs` : ce qu'on y voit
 * quand le mélange bout : elles se condensent et retombent, ou elles montent jusqu'en haut et s'échappent.
 */
export function Refrigerant({ eau, vapeurs }: { eau: Circulation; vapeurs: "aucune" | "condensees" | "echappees" }) {
  const boules = [-38, -62, -86, -110, -134];
  return (
    <g>
      {/* le manchon, et l'eau qu'il contient */}
      {eau === "bonne" && <rect className="pl-reflux-eau" x={-13} y={-160} width={26} height={140} rx={6} />}
      {eau === "inverse" && <rect className="pl-reflux-eau" x={-13} y={-62} width={26} height={42} rx={6} />}
      {eau === "inverse" && <path className="pl-reflux-ruisseau" d="M 12 -148 Q 4 -120 10 -92 T 9 -62" />}
      <rect className="pl-verre" x={-13} y={-160} width={26} height={140} rx={6} />
      <path className="pl-verre" d="M 13 -32 H 24 M 13 -148 H 24" strokeWidth={3} />
      {/* le tube intérieur et ses boules */}
      <path className="pl-verre" d={`M -4 0 V -27 ${boules.map((y) => `M -4 ${y + 11} Q -11 ${y} -4 ${y - 11}`).join(" ")} M -4 -145 V -176 M 4 0 V -27 ${boules.map((y) => `M 4 ${y + 11} Q 11 ${y} 4 ${y - 11}`).join(" ")} M 4 -145 V -176`} />
      {vapeurs !== "aucune" && [0, 1, 2].map((i) => <circle key={i} className={`pl-reflux-vapeur${vapeurs === "echappees" ? " est-haute" : ""}`} cx={(i - 1) * 2} cy={-8} r={2.2} style={{ animationDelay: `${i * 0.5}s` }} />)}
      {vapeurs === "condensees" && [0, 1].map((i) => <circle key={i} className="pl-reflux-retombe" cx={i ? 3 : -3} cy={-66} r={1.6} style={{ animationDelay: `${0.3 + i * 0.7}s` }} />)}
      {vapeurs === "echappees" && [-6, 0, 6].map((x, i) => <circle key={x} className="pl-reflux-fuite" cx={x} cy={-182} r={4} style={{ animationDelay: `${i * 0.4}s` }} />)}
    </g>
  );
}

/** La silhouette de l'élève, autour du milieu de ses épaules : ce qu'il porte s'y dessine. */
export function Silhouette({ porte }: { porte: Record<Protection, boolean> }) {
  return (
    <g>
      <path className={`pl-reflux-corps${porte.blouse ? " est-vetu" : ""}`} d="M -24 46 V 10 Q -24 -6 0 -6 Q 24 -6 24 10 V 46 Z" />
      {porte.blouse && <path className="pl-reflux-couture" d="M 0 -6 V 46 M -9 -4 L 0 10 L 9 -4 M 4 20 h 0.1 M 4 32 h 0.1" />}
      <circle className="pl-reflux-tete" cy={-22} r={13} />
      {porte.lunettes && <path className="pl-reflux-lunettes" d="M -11 -26 h 9 v 7 h -9 Z M 2 -26 h 9 v 7 h -9 Z M -2 -23 h 4 M -11 -23 h -2 M 11 -23 h 2" />}
      <circle className={`pl-reflux-main${porte.gants ? " est-gantee" : ""}`} cx={-24} cy={48} r={6} />
      <circle className={`pl-reflux-main${porte.gants ? " est-gantee" : ""}`} cx={24} cy={48} r={6} />
    </g>
  );
}

/** Une protection, pendue à sa patère : la blouse, les lunettes, les gants. */
export function Vetement({ quoi }: { quoi: Protection }) {
  if (quoi === "blouse") return <path className="pl-reflux-habit" d="M -11 -15 L -4 -18 L 0 -12 L 4 -18 L 11 -15 L 17 -3 L 11 0 V 18 H -11 V 0 L -17 -3 Z M 0 -12 V 18" />;
  if (quoi === "lunettes") return <path className="pl-reflux-habit" d="M -16 -6 h 13 v 11 h -13 Z M 3 -6 h 13 v 11 h -13 Z M -3 -1 h 6 M -16 -2 l -3 -3 M 16 -2 l 3 -3" />;
  return <path className="pl-reflux-habit est-gant" d="M -8 16 V -2 Q -8 -8 -4 -8 V -14 Q -2 -17 0 -14 V -9 Q 2 -18 5 -14 V -8 Q 8 -14 9 -9 V 6 Q 13 0 15 4 Q 12 10 8 16 Z" />;
}

/** La hauteur du liquide dans l'ampoule, au-dessus de son robinet, pour un volume en mL : elle s'étrangle vers le bas. */
export const hauteurAmpoule = (volume: number): number => (volume <= 0 ? 0 : r2(6 + 184 * Math.min(1, volume / 120) ** 0.55));

/**
 * L'ampoule à décanter, autour de son robinet (0, 0) : la poire monte jusqu'à −222. `aqueux` et `organique` : ce qu'il
 * reste de chaque phase, en mL ; la phase aqueuse est en bas. `trouble` : les deux phases ne sont pas encore séparées.
 * `secouee` : l'ampoule vient d'être agitée ; la paillasse lui donne une clé qui change à chaque agitation.
 */
export function Ampoule({ aqueux, organique, trouble, bouchon, secouee }: { aqueux: number; organique: number; trouble: boolean; bouchon: boolean; secouee: boolean }) {
  const id = useId();
  const corps = "M -4 0 V -30 C -10 -70 -44 -100 -44 -150 C -44 -190 -8 -196 -8 -206 V -222 H 8 V -206 C 8 -196 44 -190 44 -150 C 44 -100 10 -70 4 -30 V 0 Z";
  const limite = hauteurAmpoule(aqueux);
  const surface = hauteurAmpoule(aqueux + organique);
  return (
    <g className={secouee ? "pl-reflux-secoue" : undefined}>
      <defs><clipPath id={id}><path d={corps} /></clipPath></defs>
      {trouble
        ? surface > 0 && <rect clipPath={`url(#${id})`} x={-46} y={-surface} width={92} height={surface} fill={TROUBLE} />
        : (
          <>
            {surface > limite && <rect clipPath={`url(#${id})`} x={-46} y={-surface} width={92} height={r2(surface - limite)} fill={ORGANIQUE} />}
            {limite > 0 && <rect clipPath={`url(#${id})`} x={-46} y={-limite} width={92} height={limite} fill={AQUEUSE} />}
            {limite > 0 && surface > limite && <line clipPath={`url(#${id})`} className="pl-reflux-limite" x1={-46} x2={46} y1={-limite} y2={-limite} />}
          </>
        )}
      <path className="pl-verre" d="M -4 -8 V -30 C -10 -70 -44 -100 -44 -150 C -44 -190 -8 -196 -8 -206 V -222 M 8 -222 V -206 C 8 -196 44 -190 44 -150 C 44 -100 10 -70 4 -30 V -8 M -3 8 L -1.5 30 M 3 8 L 1.5 30 M -11 -222 H -8 M 8 -222 H 11" />
      {bouchon && <path className="pl-reflux-bouchon" d="M -10 -234 H 10 L 7 -216 H -7 Z" />}
    </g>
  );
}
