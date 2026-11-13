import type { Reglages } from "./types";

/** Les réglages du prototype validé le 13 novembre 2026 : ils servent aux cas de référence et ne changent pas. */
export const REGLAGES_PROTOTYPE: Reglages = Object.freeze({
  intervalles: [2, 7, 21],
  tauxReussite: 0.7,
  itemsPourNiveau: 3,
  joursPourSolide: 7,
  quizPourPassage: 3,
  questionsPassage: 5,
  questionsQuizDs: 10,
  objectifParDefaut: 14,
  joursDsProche: 7,
  minutesSeance: 25,
  revoirSansDoublon: false,
  seancesParSemaine: { 10: 3, 14: 4, 18: 5 },
});

/** Les réglages de l'application : le prototype, plus les évolutions décidées (docs/08-moteur.md, section 6). */
export const REGLAGES_ACTUELS: Reglages = Object.freeze({
  ...REGLAGES_PROTOTYPE,
  revoirSansDoublon: true,
});

export const NIVEAUX = [10, 14, 18] as const;

/** Premier jour des épreuves de spécialité. */
export const BAC = "2027-06-16";

export const PERIODES = [
  { id: "t1", nom: "Premier trimestre", debut: "2026-09-01", fin: "2026-12-18" },
  { id: "noel", nom: "Vacances de Noël", debut: "2026-12-19", fin: "2027-01-03" },
  { id: "hiver", nom: "Janvier à mars", debut: "2027-01-04", fin: "2027-03-31" },
  { id: "printemps", nom: "Vacances de printemps", debut: "2027-04-01", fin: "2027-04-30" },
  { id: "final", nom: "Mai et juin", debut: "2027-05-01", fin: "2027-06-17" },
] as const;
