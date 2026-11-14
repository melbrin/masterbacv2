// La paillasse « optique » (décision 0012) : un banc d'optique : source, lentilles, écran. En construction.
import type { ReglesPaillasse } from "../types";

export type ReglagesOptique = Record<string, never>;
export interface EtatOptique { gestes: number }

export const regles: ReglesPaillasse<ReglagesOptique, EtatOptique> = {
  depart: () => ({ gestes: 0 }),
  geste: (_r, etat) => ({ gestes: etat.gestes + 1 }),
  bilan: () => ({ score: 0, fautes: [], mesures: {}, lignes: [] }),
};
