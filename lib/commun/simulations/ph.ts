// Le pH (fiche 9) : pH = −log([H₃O⁺] / c°). Pour un couple acide-base : pH = pK_A + log([A⁻] / [AH]).
// mode 0 : choisir la concentration d'un acide fort, en mmol/L ; mode 1 : choisir le rapport [A⁻]/[AH] d'un mélange ;
// mode 2 : choisir le facteur de dilution d'un acide fort.
import { nombre, puissanceDeDix } from "@/lib/commun/format";
import type { Regles, Valeurs } from "./types";

/** La durée de la mesure, en secondes : le pH-mètre se stabilise en trois secondes. */
const MESURE = 3;

/** Le pH de la solution préparée. */
export function pH(p: Valeurs): number {
  if (p.mode === 1) return p.pKA + Math.log10(p.rapport);
  if (p.mode === 2) return p.pH0 + Math.log10(p.F);
  return -Math.log10(p.C / 1000);
}
/** Le pH affiché à l'instant t : la sonde sort de l'eau, à pH 7, puis l'affichage rejoint le pH de la solution. */
export function pHAffiche(p: Valeurs, t: number): number {
  const k = Math.max(0, Math.min(1, t / MESURE));
  return 7 + (pH(p) - 7) * (1 - (1 - k) ** 3);
}

export const reglesPh: Regles = {
  issue(p) {
    const x = pH(p);
    if (Math.abs(x - p.cible) <= p.tol) return { reussi: true, message: `Le pH-mètre affiche ${nombre(x, 2)} : c'est le pH voulu.` };
    return { reussi: false, message: `Le pH-mètre affiche ${nombre(x, 2)} au lieu de ${nombre(p.cible, 2)} : la solution ${x > p.cible ? "n'est pas assez acide" : "est trop acide"}.` };
  },
  duree: () => MESURE + 1.5,
  cadence: () => 1,
  secondes: () => null,
  mesures(p, t) {
    const x = pHAffiche(p, t);
    return [{ nom: "pH", valeur: nombre(x, 2) }, { nom: "[H₃O⁺] en mol/L", valeur: puissanceDeDix(10 ** -x) }, { nom: "pH visé", valeur: nombre(p.cible, 2) }];
  },
};
