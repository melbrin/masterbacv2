// La paillasse « pile » (décision 0012) : deux demi-piles, un pont salin, un multimètre. En construction.
import type { ReglesPaillasse } from "../types";

export type ReglagesPile = Record<string, never>;
export interface EtatPile { gestes: number }

export const regles: ReglesPaillasse<ReglagesPile, EtatPile> = {
  depart: () => ({ gestes: 0 }),
  geste: (_r, etat) => ({ gestes: etat.gestes + 1 }),
  bilan: () => ({ score: 0, fautes: [], mesures: {}, lignes: [] }),
};
