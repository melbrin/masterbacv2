// La paillasse « archimede » (décision 0012) : un dynamomètre, une éprouvette, des solides. En construction.
import type { ReglesPaillasse } from "../types";

export type ReglagesArchimede = Record<string, never>;
export interface EtatArchimede { gestes: number }

export const regles: ReglesPaillasse<ReglagesArchimede, EtatArchimede> = {
  depart: () => ({ gestes: 0 }),
  geste: (_r, etat) => ({ gestes: etat.gestes + 1 }),
  bilan: () => ({ score: 0, fautes: [], mesures: {}, lignes: [] }),
};
