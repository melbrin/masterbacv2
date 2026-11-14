// La paillasse « doppler » (décision 0012) : une source sonore qui se déplace, un micro, un spectre. En construction.
import type { ReglesPaillasse } from "../types";

export type ReglagesDoppler = Record<string, never>;
export interface EtatDoppler { gestes: number }

export const regles: ReglesPaillasse<ReglagesDoppler, EtatDoppler> = {
  depart: () => ({ gestes: 0 }),
  geste: (_r, etat) => ({ gestes: etat.gestes + 1 }),
  bilan: () => ({ score: 0, fautes: [], mesures: {}, lignes: [] }),
};
