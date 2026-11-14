// La paillasse « pointage » (décision 0012) : le pointage d'une vidéo image par image. En construction.
import type { ReglesPaillasse } from "../types";

export type ReglagesPointage = Record<string, never>;
export interface EtatPointage { gestes: number }

export const regles: ReglesPaillasse<ReglagesPointage, EtatPointage> = {
  depart: () => ({ gestes: 0 }),
  geste: (_r, etat) => ({ gestes: etat.gestes + 1 }),
  bilan: () => ({ score: 0, fautes: [], mesures: {}, lignes: [] }),
};
