// La paillasse « microcontroleur » (décision 0012) : un microcontrôleur, une plaque d'essai, un capteur. En construction.
import type { ReglesPaillasse } from "../types";

export type ReglagesMicrocontroleur = Record<string, never>;
export interface EtatMicrocontroleur { gestes: number }

export const regles: ReglesPaillasse<ReglagesMicrocontroleur, EtatMicrocontroleur> = {
  depart: () => ({ gestes: 0 }),
  geste: (_r, etat) => ({ gestes: etat.gestes + 1 }),
  bilan: () => ({ score: 0, fautes: [], mesures: {}, lignes: [] }),
};
