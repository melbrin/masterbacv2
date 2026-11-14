// La paillasse « ultrasons » (décision 0012) : un émetteur, des récepteurs d'ultrasons, un oscilloscope. En construction.
import type { ReglesPaillasse } from "../types";

export type ReglagesUltrasons = Record<string, never>;
export interface EtatUltrasons { gestes: number }

export const regles: ReglesPaillasse<ReglagesUltrasons, EtatUltrasons> = {
  depart: () => ({ gestes: 0 }),
  geste: (_r, etat) => ({ gestes: etat.gestes + 1 }),
  bilan: () => ({ score: 0, fautes: [], mesures: {}, lignes: [] }),
};
