"use client";

// La croix de secours des fils, pour les paillasses qui tirent des fils (Pile, Électrolyse). Le kit dessine au milieu
// d'un fil la croix qui le retire ; quand ce milieu tombe sous la zone de toucher d'une autre borne (un fil qui passe
// sous une borne voisine), cette croix ne se touche plus, et le fil reste. Un tel fil reçoit ici une petite croix
// toujours visible, posée plus loin sur le fil, là où rien ne la couvre : on la touche, le fil se retire.
// Le calcul des places est dans lib/commun/tp/paillasses/pile-guide.ts (`croixDuFil`) : la main du guide lit les mêmes.

import { croixDuFil } from "@/lib/commun/tp/paillasses/pile-guide";
import { son, type Borne } from "../kit";

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Les croix de secours des fils dont la croix du kit est couverte par une borne. À placer juste après `Fils`. */
export function CroixDeSecours({ bornes, fils, retire }: { bornes: readonly Borne[]; fils: readonly (readonly [string, string])[]; retire: (a: string, b: string) => void }) {
  return (
    <g>
      {fils.map(([a, b]) => {
        const croix = croixDuFil(bornes, a, b);
        const pa = bornes.find((x) => x.id === a), pb = bornes.find((x) => x.id === b);
        if (!croix || !croix.secours || !pa || !pb) return null;
        const x = r1(croix.ou.x), y = r1(croix.ou.y);
        const agit = () => { son("clic"); retire(a, b); };
        return (
          <g key={`${a}:${b}`} className="pl-fil-retirer" role="button" tabIndex={0} aria-label={`Retirer le fil entre ${pa.nom} et ${pb.nom}`}
            onClick={agit} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); agit(); } }}>
            {/* la zone de toucher s'arrête avant le cœur des bornes voisines */}
            <circle cx={x} cy={y} r={r1(Math.max(10, Math.min(22, croix.libre - 12)))} fill="transparent" />
            <circle cx={x} cy={y} r={8} />
            <path d={`M ${r1(x - 3)} ${r1(y - 3)} l 6 6 M ${r1(x + 3)} ${r1(y - 3)} l -6 6`} />
          </g>
        );
      })}
    </g>
  );
}
