// La paillasse « ccm » (décision 0012) : une chromatographie sur couche mince. En construction.
import type { ReglesPaillasse } from "../types";

export type ReglagesCcm = Record<string, never>;
export interface EtatCcm { gestes: number }

export const regles: ReglesPaillasse<ReglagesCcm, EtatCcm> = {
  depart: () => ({ gestes: 0 }),
  geste: (_r, etat) => ({ gestes: etat.gestes + 1 }),
  bilan: () => ({ score: 0, fautes: [], mesures: {}, lignes: [] }),
};
