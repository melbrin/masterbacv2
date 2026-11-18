// Ce que l'élève a fait dans « S'entraîner », mis en chiffres pour le parcours, les progrès et l'accueil (décision 0015).
// Rien n'est gardé à part : tout se recompte à partir de ce que le serveur a lu, donc les chiffres sont toujours à jour.
// Aucune lecture de base ni d'horloge ici : l'instant présent arrive en argument.
import { ajouteJours, jourDeParis, jourDeSemaine } from "@/lib/commun/dates";
import { COMPETENCES, type Bilan, type Competence, type Niveau } from "@/lib/commun/tp/types";

/** Un défi du labo que la section propose à ce compte. Le rang, à partir de 1, est sa place dans sa simulation. */
export interface DefiOffert { id: string; simulation: string; rang: number; fiche: number; niveau: number }
/** Un TP que la section propose à ce compte. */
export interface TpOffert { id: string; fiche: number }
/** Un exercice du hub Python que la section propose à ce compte (décision 0016). */
export interface PythonOffert { id: string; fiche: number }
/** Ce que « S'entraîner » propose à ce compte, dans l'ordre de ses pages : seulement ce qu'il a le droit de voir. */
export interface Offre { defis: DefiOffert[]; tp: TpOffert[]; python: PythonOffert[] }

/** Ce que l'élève a fait. Les instants sont en millisecondes. */
export interface Faits {
  /** les défis réussis, avec leurs étoiles */
  defis: { id: string; etoiles: number; quand: number }[];
  /** les essais de TP terminés, avec leur bilan par compétence */
  tp: { tp: string; bilan: Bilan; quand: number }[];
  /** les TP laissés en route : l'essai à reprendre */
  reprises: { tp: string; essai: string }[];
  /** l'instant de chaque partie d'un jeu de mémoire */
  memoire: number[];
  /** l'instant de chaque partie d'un jeu de révision */
  jeux: number[];
  /** les exercices du hub Python réussis, à l'instant de leur première réussite */
  python: { id: string; quand: number }[];
}

const JOUR_MS = 86_400_000;
const POINTS: Record<Niveau, number> = { A: 3, B: 2, C: 1, D: 0 };
const jourDe = (instant: number): string => jourDeParis(new Date(instant));

/** La valeur d'un bilan de TP, pour garder le meilleur : la somme de ses niveaux (A vaut 3, D vaut 0). */
export const valeurDuBilan = (b: Bilan): number => Object.values(b).reduce((s, n) => s + (POINTS[n] ?? 0), 0);

/** Le meilleur bilan de chaque TP terminé ; à valeur égale, le premier de la liste. */
export function meilleursBilans(essais: readonly { tp: string; bilan: Bilan }[]): Map<string, Bilan> {
  const meilleurs = new Map<string, Bilan>();
  for (const e of essais) {
    const avant = meilleurs.get(e.tp);
    if (!avant || valeurDuBilan(e.bilan) > valeurDuBilan(avant)) meilleurs.set(e.tp, e.bilan);
  }
  return meilleurs;
}

/** Le niveau qui résume plusieurs niveaux : leur moyenne, ramenée au niveau le plus proche ; à mi-chemin, celui du dessous. */
export function niveauHabituel(niveaux: readonly Niveau[]): Niveau | null {
  if (!niveaux.length) return null;
  const moyenne = niveaux.reduce((s, n) => s + POINTS[n], 0) / niveaux.length;
  return moyenne > 2.5 ? "A" : moyenne > 1.5 ? "B" : moyenne > 0.5 ? "C" : "D";
}

export interface LigneDeGrille {
  id: Competence;
  nom: string;
  quoi: string;
  /** le niveau habituel de l'élève dans cette compétence ; null tant qu'aucun TP terminé ne la note */
  niveau: Niveau | null;
  /** le nombre de TP terminés qui la notent */
  sur: number;
}

/** La grille de l'élève, comme celle de l'épreuve : pour chaque compétence, son niveau habituel sur ses TP terminés. */
export function grilleEce(meilleurs: ReadonlyMap<string, Bilan>): LigneDeGrille[] {
  return COMPETENCES.map((c) => {
    const niveaux = [...meilleurs.values()].flatMap((b) => (b[c.id] ? [b[c.id] as Niveau] : []));
    return { id: c.id, nom: c.nom, quoi: c.quoi, niveau: niveauHabituel(niveaux), sur: niveaux.length };
  });
}

/** Où l'élève en est sur chaque défi et chaque TP offerts, dans l'ordre de l'offre : c'est ce que le parcours reçoit. */
export function etatDeLOffre(offre: Offre, faits: Faits): { defis: (DefiOffert & { etoiles: number | null })[]; tp: (TpOffert & { fini: boolean; reprise: string | null })[] } {
  const etoiles = new Map(faits.defis.map((d) => [d.id, d.etoiles]));
  const finis = new Set(faits.tp.map((t) => t.tp));
  const reprises = new Map(faits.reprises.map((r) => [r.tp, r.essai]));
  return {
    defis: offre.defis.map((d) => ({ ...d, etoiles: etoiles.get(d.id) ?? null })),
    tp: offre.tp.map((t) => ({ ...t, fini: finis.has(t.id), reprise: reprises.get(t.id) ?? null })),
  };
}

export interface Compte { defis: number; reussis: number }
export interface EntrainementDuChapitre {
  fiche: number;
  /** les défis du labo du chapitre, tous objectifs confondus, puis par objectif */
  defis: number;
  reussis: number;
  etoiles: number;
  parNiveau: Map<number, Compte>;
  tp: number;
  tpFinis: number;
  /** les exercices du hub Python du chapitre, et ceux que l'élève a réussis */
  python: number;
  pythonReussis: number;
}

/** Ce que l'élève a fait, sur une période : depuis lundi, ou depuis le premier du mois. */
export interface Periode {
  /** le premier jour de la période */
  debut: string;
  defis: number;
  /** les TP terminés dans la période ; un TP refait ne compte qu'une fois */
  tp: number;
  /** les parties de mémoire et de jeux de révision */
  parties: number;
  /** les exercices du hub Python réussis pour la première fois dans la période */
  python: number;
}

export interface BilanEntrainement {
  labo: { defis: number; reussis: number; etoiles: number; etoilesMax: number; parNiveau: { niveau: number; defis: number; reussis: number }[] };
  tp: { tp: number; finis: number; meilleurs: Map<string, Bilan>; grille: LigneDeGrille[] };
  /** sur les sept derniers jours : les jours où l'élève a entraîné sa mémoire, et ses parties */
  memoire: { jours: number; parties: number };
  /** les parties de jeux de révision des sept derniers jours */
  jeux: { parties: number };
  python: { exercices: number; reussis: number };
  semaine: Periode;
  mois: Periode;
  /** les chapitres qui ont un défi, un TP ou un exercice Python offert */
  chapitres: Map<number, EntrainementDuChapitre>;
}

/**
 * Le bilan de l'entraînement à un instant donné. Ce que l'élève a fait sur un défi ou un TP que la section ne lui
 * propose plus (un brouillon retiré, par exemple) ne compte pas.
 */
export function bilanEntrainement(offre: Offre, faits: Faits, maintenant: number): BilanEntrainement {
  const defi = new Map(offre.defis.map((d) => [d.id, d]));
  const tp = new Map(offre.tp.map((t) => [t.id, t]));
  const reussis = faits.defis.filter((d) => defi.has(d.id));
  const termines = faits.tp.filter((t) => tp.has(t.tp));
  const exercices = new Set(offre.python.map((e) => e.id));
  const codes = faits.python.filter((e) => exercices.has(e.id));
  const reussiEnPython = new Set(codes.map((e) => e.id));
  const meilleurs = meilleursBilans(termines);
  const etoiles = new Map(reussis.map((d) => [d.id, d.etoiles]));

  const chapitres = new Map<number, EntrainementDuChapitre>();
  const chapitre = (fiche: number) => {
    let c = chapitres.get(fiche);
    if (!c) { c = { fiche, defis: 0, reussis: 0, etoiles: 0, parNiveau: new Map(), tp: 0, tpFinis: 0, python: 0, pythonReussis: 0 }; chapitres.set(fiche, c); }
    return c;
  };
  const niveaux = new Map<number, Compte>();
  const compte = (table: Map<number, Compte>, niveau: number) => {
    let n = table.get(niveau);
    if (!n) { n = { defis: 0, reussis: 0 }; table.set(niveau, n); }
    return n;
  };
  for (const d of offre.defis) {
    const gagne = etoiles.get(d.id);
    const c = chapitre(d.fiche);
    for (const n of [compte(niveaux, d.niveau), compte(c.parNiveau, d.niveau), c]) {
      n.defis += 1;
      if (gagne !== undefined) n.reussis += 1;
    }
    c.etoiles += gagne ?? 0;
  }
  for (const t of offre.tp) {
    const c = chapitre(t.fiche);
    c.tp += 1;
    if (meilleurs.has(t.id)) c.tpFinis += 1;
  }
  for (const e of offre.python) {
    const c = chapitre(e.fiche);
    c.python += 1;
    if (reussiEnPython.has(e.id)) c.pythonReussis += 1;
  }

  const auj = jourDe(maintenant);
  const depuis = (debut: string): Periode => ({
    debut,
    defis: reussis.filter((d) => jourDe(d.quand) >= debut).length,
    tp: new Set(termines.filter((t) => jourDe(t.quand) >= debut).map((t) => t.tp)).size,
    parties: [...faits.memoire, ...faits.jeux].filter((q) => jourDe(q) >= debut).length,
    python: new Set(codes.filter((e) => jourDe(e.quand) >= debut).map((e) => e.id)).size,
  });
  const recentes = (parties: number[]) => parties.filter((q) => q > maintenant - 7 * JOUR_MS && q <= maintenant);
  const memoire = recentes(faits.memoire);

  return {
    labo: {
      defis: offre.defis.length, reussis: reussis.length, etoiles: reussis.reduce((s, d) => s + d.etoiles, 0), etoilesMax: 3 * offre.defis.length,
      parNiveau: [...niveaux.entries()].sort((a, b) => a[0] - b[0]).map(([niveau, n]) => ({ niveau, ...n })),
    },
    tp: { tp: offre.tp.length, finis: meilleurs.size, meilleurs, grille: grilleEce(meilleurs) },
    memoire: { jours: new Set(memoire.map(jourDe)).size, parties: memoire.length },
    jeux: { parties: recentes(faits.jeux).length },
    python: { exercices: offre.python.length, reussis: reussiEnPython.size },
    semaine: depuis(ajouteJours(auj, -((jourDeSemaine(auj) + 6) % 7))),
    mois: depuis(`${auj.slice(0, 7)}-01`),
    chapitres,
  };
}
