// La paillasse « calorimetre » (décision 0012) : un calorimètre, un thermomètre, une balance. En construction.
import type { ReglesPaillasse } from "../types";

export type ReglagesCalorimetre = Record<string, never>;
export interface EtatCalorimetre { gestes: number }

export const regles: ReglesPaillasse<ReglagesCalorimetre, EtatCalorimetre> = {
  depart: () => ({ gestes: 0 }),
  geste: (_r, etat) => ({ gestes: etat.gestes + 1 }),
  bilan: () => ({ score: 0, fautes: [], mesures: {}, lignes: [] }),
};
