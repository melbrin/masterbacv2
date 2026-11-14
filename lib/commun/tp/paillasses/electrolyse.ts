// La paillasse « electrolyse » (décision 0012) : une cuve à électrolyse, un générateur, une balance. En construction.
import type { ReglesPaillasse } from "../types";

export type ReglagesElectrolyse = Record<string, never>;
export interface EtatElectrolyse { gestes: number }

export const regles: ReglesPaillasse<ReglagesElectrolyse, EtatElectrolyse> = {
  depart: () => ({ gestes: 0 }),
  geste: (_r, etat) => ({ gestes: etat.gestes + 1 }),
  bilan: () => ({ score: 0, fautes: [], mesures: {}, lignes: [] }),
};
