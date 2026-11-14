// La paillasse « solutions » (décision 0012) : préparer une solution : peser, prélever, compléter au trait de jauge. En construction.
import type { ReglesPaillasse } from "../types";

export type ReglagesSolutions = Record<string, never>;
export interface EtatSolutions { gestes: number }

export const regles: ReglesPaillasse<ReglagesSolutions, EtatSolutions> = {
  depart: () => ({ gestes: 0 }),
  geste: (_r, etat) => ({ gestes: etat.gestes + 1 }),
  bilan: () => ({ score: 0, fautes: [], mesures: {}, lignes: [] }),
};
