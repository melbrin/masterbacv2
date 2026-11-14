// La paillasse « diffraction » (décision 0012) : un laser, une fente ou un fil, un écran. En construction.
import type { ReglesPaillasse } from "../types";

export type ReglagesDiffraction = Record<string, never>;
export interface EtatDiffraction { gestes: number }

export const regles: ReglesPaillasse<ReglagesDiffraction, EtatDiffraction> = {
  depart: () => ({ gestes: 0 }),
  geste: (_r, etat) => ({ gestes: etat.gestes + 1 }),
  bilan: () => ({ score: 0, fautes: [], mesures: {}, lignes: [] }),
};
