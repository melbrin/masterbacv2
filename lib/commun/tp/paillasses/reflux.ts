// La paillasse « reflux » (décision 0012) : un montage de chauffage à reflux. En construction.
import type { ReglesPaillasse } from "../types";

export type ReglagesReflux = Record<string, never>;
export interface EtatReflux { gestes: number }

export const regles: ReglesPaillasse<ReglagesReflux, EtatReflux> = {
  depart: () => ({ gestes: 0 }),
  geste: (_r, etat) => ({ gestes: etat.gestes + 1 }),
  bilan: () => ({ score: 0, fautes: [], mesures: {}, lignes: [] }),
};
