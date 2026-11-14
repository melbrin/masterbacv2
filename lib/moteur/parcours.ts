// Test de calibrage et parcours (décision 0009). Le test mesure un point de départ ; le parcours dit, à chaque
// instant, où l'élève en est et quelle est la prochaine chose à faire. Tout se recalcule à partir de son état :
// rien n'est gardé à part, donc le suivi est toujours à jour. Mêmes règles que le reste du moteur : aucune
// lecture de base, d'horloge ou de hasard.
import { ecartEnJours, jourDeSemaine } from "@/lib/commun/dates";
import { NIVEAUX } from "./reglages";
import { carnetDuJour, chapitresVus, cleQuiz, jourCourant, niveauFiche, prochainDS, seancesPrevues, seancesSemaine, statut, tentatives } from "./moteur";
import { melange } from "./tirages";
import type { Contexte, Jour, QuizSommaire, Reglages, SommaireIndexe } from "./types";

const JOUR_MS = 86_400_000;

// ---- le test de calibrage ----

/**
 * Les questions d'un test de calibrage sur les chapitres donnés. On passe d'un chapitre à l'autre : d'abord une
 * question d'objectif 10 par chapitre, puis une d'objectif 14, puis une d'objectif 18, jusqu'au nombre de questions
 * permis. Quand un chapitre n'a pas de question du niveau voulu, il en donne une du niveau le plus proche.
 * Les questions jamais faites passent avant les ratées, puis les réussies : un nouveau test ne répète pas le précédent.
 */
export function questionsCalibrage(ctx: Contexte, fiches: number[], graine: number): string[] {
  const { etat, reglages } = ctx;
  const prises = new Set<string>();
  const out: string[] = [];
  const rang = (q: QuizSommaire) => { const s = statut(etat, cleQuiz(q.id)); return !tentatives(etat, cleQuiz(q.id)).length ? 0 : s === "ko" ? 1 : 2; };
  const numeros = [...new Set(fiches)].sort((a, b) => a - b).filter((n) => (ctx.sommaire.quizParFiche.get(n) ?? []).length > 0);
  NIVEAUX.forEach((L, tour) => {
    for (const num of numeros) {
      if (out.length >= reglages.questionsCalibrage) return;
      const libres = melange(ctx.sommaire.quizParFiche.get(num) ?? [], graine + num * 31 + tour).filter((q) => !prises.has(q.id));
      // tri stable : le niveau voulu d'abord, puis le plus proche ; à niveau égal, jamais faite, ratée, réussie
      const choix = libres.slice().sort((a, b) => Math.abs(a.niveau - L) - Math.abs(b.niveau - L) || rang(a) - rang(b))[0];
      if (choix) { prises.add(choix.id); out.push(choix.id); }
    }
  });
  return out;
}

export interface BilanCalibrage {
  total: number;
  bonnes: number;
  niveaux: { niveau: number; total: number; bonnes: number }[];
  chapitres: { fiche: number; total: number; bonnes: number }[];
  /** l'objectif à viser d'abord : le premier où la réussite n'atteint pas le seuil */
  depart: number;
}

/** Le bilan d'un test de calibrage : réussite par objectif et par chapitre, et le point de départ conseillé. */
export function bilanCalibrage(sommaire: SommaireIndexe, reponses: { id: string; juste: boolean }[], reglages: Reglages): BilanCalibrage {
  const parId = new Map(sommaire.quiz.map((q) => [q.id, q]));
  const niveaux = NIVEAUX.map((niveau) => ({ niveau: niveau as number, total: 0, bonnes: 0 }));
  const chapitres = new Map<number, { fiche: number; total: number; bonnes: number }>();
  let total = 0, bonnes = 0;
  for (const r of reponses) {
    const q = parId.get(r.id);
    if (!q) continue;
    total += 1;
    bonnes += r.juste ? 1 : 0;
    const n = niveaux.find((x) => x.niveau === q.niveau);
    if (n) { n.total += 1; n.bonnes += r.juste ? 1 : 0; }
    const c = chapitres.get(q.fiche) ?? { fiche: q.fiche, total: 0, bonnes: 0 };
    c.total += 1;
    c.bonnes += r.juste ? 1 : 0;
    chapitres.set(q.fiche, c);
  }
  // un objectif sans question dans le test n'est pas acquis : on y reste
  const tenu = (L: number) => { const n = niveaux.find((x) => x.niveau === L); return !!n && n.total > 0 && n.bonnes / n.total >= reglages.tauxReussite; };
  const depart = !tenu(10) ? 10 : !tenu(14) ? 14 : 18;
  return { total, bonnes, niveaux, chapitres: [...chapitres.values()].sort((a, b) => a.fiche - b.fiche), depart };
}

// ---- le parcours ----

export interface ChapitreParcours {
  fiche: number;
  /** l'objectif atteint sur ce chapitre : 0, 10, 14 ou 18 */
  atteint: number;
  /** le prochain objectif à atteindre, sans dépasser la note visée ; null quand elle est atteinte */
  prochain: number | null;
  faits: number;
  total: number;
  taux: number;
  testDispo: boolean;
  /** le chapitre est au programme du prochain devoir */
  dansDs: boolean;
}

export type EtapeParcours =
  | { type: "calibrage"; raison: "jamais" | "ancien" }
  | { type: "chapitres" }
  | { type: "ds"; id: string; seance: string; titre: string; jours: number }
  | { type: "seance" }
  | { type: "carnet"; nombre: number }
  | { type: "passage"; fiche: number; niveau: number }
  | { type: "objectif"; fiche: number; niveau: number; faits: number; total: number; taux: number };

export type Alerte =
  | { type: "pause"; jours: number }
  | { type: "rythme"; reste: number; joursRestants: number }
  | { type: "fragile"; fiche: number; niveau: number; taux: number }
  | { type: "bravo"; fiche: number; niveau: number }
  | { type: "but" };

export interface Parcours {
  vise: number;
  /** les paliers jusqu'à la note visée : combien de chapitres vus en classe ont atteint chaque objectif */
  paliers: { niveau: number; atteints: number; total: number }[];
  /** le palier en cours : le premier que tous les chapitres vus n'ont pas atteint ; null quand tout est atteint */
  palier: number | null;
  chapitres: ChapitreParcours[];
  /** les étapes dans l'ordre : la première est la prochaine chose à faire */
  etapes: EtapeParcours[];
  alertes: Alerte[];
}

/** Ce que le moteur ne peut pas lire dans l'état : la date du dernier calibrage, et la séance de DS qui attend. */
export interface Suivi {
  /** l'instant du dernier test de calibrage terminé, en millisecondes ; null s'il n'y en a jamais eu */
  dernierCalibrage: number | null;
  /** la première séance qui reste à faire dans le plan du prochain devoir */
  seanceDs: { id: string; seance: string; titre: string; date: Jour } | null;
}

export function parcours(ctx: Contexte, suivi: Suivi): Parcours {
  const { etat, reglages } = ctx;
  const auj = jourCourant(ctx);
  const vise = etat.profil.objectif || reglages.objectifParDefaut;
  const vus = chapitresVus(ctx);
  const ds = prochainDS(ctx);
  const paliersVises = NIVEAUX.filter((L) => L <= vise);

  const chapitres: ChapitreParcours[] = vus.map((fiche) => {
    const nv = niveauFiche(ctx, fiche);
    const prochain = nv.prochain !== null && nv.prochain <= vise ? nv.prochain : null;
    const res = prochain ? nv.res[prochain] : null;
    return {
      fiche, atteint: nv.atteint, prochain, faits: res?.faits ?? 0, total: res?.total ?? 0, taux: res?.taux ?? 0,
      testDispo: nv.testDispo && prochain !== null, dansDs: !!ds && ds.fiches.includes(fiche),
    };
  });
  const paliers = paliersVises.map((niveau) => ({ niveau: niveau as number, atteints: chapitres.filter((c) => c.atteint >= niveau).length, total: chapitres.length }));
  const palier = chapitres.length ? paliers.find((p) => p.atteints < p.total)?.niveau ?? null : paliersVises[0];

  const etapes: EtapeParcours[] = [];
  if (suivi.dernierCalibrage === null) etapes.push({ type: "calibrage", raison: "jamais" });
  if (!vus.length) etapes.push({ type: "chapitres" });
  if (ds && suivi.seanceDs && suivi.seanceDs.id === ds.id && (suivi.seanceDs.date <= auj || ecartEnJours(auj, ds.date) <= reglages.joursDsProche)) {
    etapes.push({ type: "ds", id: ds.id, seance: suivi.seanceDs.seance, titre: suivi.seanceDs.titre, jours: ecartEnJours(auj, ds.date) });
  }
  if (!etat.seances.some((s) => s.date === auj)) etapes.push({ type: "seance" });
  const aRevoir = carnetDuJour(ctx).length;
  if (aRevoir) etapes.push({ type: "carnet", nombre: aRevoir });
  // les chapitres du prochain devoir d'abord, puis ceux où l'élève est le moins avancé
  const ordre = chapitres.filter((c) => c.prochain !== null)
    .sort((a, b) => Number(b.dansDs) - Number(a.dansDs) || a.atteint - b.atteint || a.taux - b.taux || a.fiche - b.fiche);
  for (const c of ordre) if (c.testDispo) etapes.push({ type: "passage", fiche: c.fiche, niveau: c.prochain as number });
  for (const c of ordre) if (!c.testDispo) etapes.push({ type: "objectif", fiche: c.fiche, niveau: c.prochain as number, faits: c.faits, total: c.total, taux: c.taux });
  if (suivi.dernierCalibrage !== null && ctx.maintenant - suivi.dernierCalibrage >= reglages.joursCalibrageAncien * JOUR_MS) etapes.push({ type: "calibrage", raison: "ancien" });

  const alertes: Alerte[] = [];
  const faites = [...new Set(etat.seances.map((s) => s.date))].sort();
  const derniere = faites[faites.length - 1];
  if (derniere && ecartEnJours(derniere, auj) >= reglages.joursDePause) alertes.push({ type: "pause", jours: ecartEnJours(derniere, auj) });
  // le rythme de la semaine : on prévient quand il faut une séance chaque jour qui reste, ou quand ce n'est plus possible.
  // Un élève qui n'a encore fait aucune séance n'est pas « en retard » : on ne le prévient pas.
  const reste = seancesPrevues(reglages, vise) - seancesSemaine(ctx);
  const joursRestants = 7 - ((jourDeSemaine(auj) + 6) % 7) - (faites.includes(auj) ? 1 : 0);
  if (faites.length > 0 && reste > 0 && reste >= joursRestants && !alertes.length) alertes.push({ type: "rythme", reste, joursRestants });
  // l'objectif le plus fragile : au moins trois questions travaillées, et une réussite sous le seuil
  let fragile: { fiche: number; niveau: number; taux: number } | null = null;
  for (const fiche of vus) {
    const { res } = niveauFiche(ctx, fiche);
    for (const L of paliersVises) {
      if (res[L].faits >= 3 && res[L].taux < reglages.tauxFragile && (!fragile || res[L].taux < fragile.taux)) fragile = { fiche, niveau: L, taux: res[L].taux };
    }
  }
  if (fragile) alertes.push({ type: "fragile", ...fragile });
  // un test de passage réussi dans la semaine
  const depuis = ctx.maintenant - 7 * JOUR_MS;
  for (const fiche of vus) {
    for (const [niveau, quand] of Object.entries(etat.passages[String(fiche)] ?? {})) {
      if (quand >= depuis && quand <= ctx.maintenant) alertes.push({ type: "bravo", fiche, niveau: Number(niveau) });
    }
  }
  if (chapitres.length > 0 && palier === null) alertes.push({ type: "but" });
  return { vise, paliers, palier, chapitres, etapes, alertes: alertes.slice(0, 3) };
}
