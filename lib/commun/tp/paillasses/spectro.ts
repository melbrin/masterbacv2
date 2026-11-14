// La paillasse « spectro » (décision 0012) : un spectrophotomètre, ses cuves, sa droite d'étalonnage. En construction.
import type { ReglesPaillasse } from "../types";

export type ReglagesSpectro = Record<string, never>;
export interface EtatSpectro { gestes: number }

export const regles: ReglesPaillasse<ReglagesSpectro, EtatSpectro> = {
  depart: () => ({ gestes: 0 }),
  geste: (_r, etat) => ({ gestes: etat.gestes + 1 }),
  bilan: () => ({ score: 0, fautes: [], mesures: {}, lignes: [] }),
};
