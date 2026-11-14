// Suivi du travail : où en est la séance du jour, où en est une séance d'un plan de DS, séries de séances,
// chiffres de l'écran des progrès. Ces règles s'ajoutent au moteur du prototype (décisions 0006 et 0007) sans
// toucher aux siennes. Même contrat : aucune lecture de base, d'horloge ou de hasard, tout arrive par le contexte.
import { ajouteJours, jourDeParis } from "@/lib/commun/dates";
import { NIVEAUX } from "./reglages";
import { cleQuiz, etatsFiche, jourCourant, lundi, niveauFiche, seanceDuJour, seancesPrevues, tentatives } from "./moteur";
import type { Contexte, Etat, Jour, SeancePlan } from "./types";

const jourDe = (instant: number): Jour => jourDeParis(new Date(instant));

/** Vrai si la question a reçu une réponse ce jour-là. */
export const faitLe = (etat: Etat, k: string, jour: Jour): boolean => tentatives(etat, k).some((a) => jourDe(a.t) === jour);

/** Vrai si la question a reçu une réponse à cet instant ou après. */
export const faitApres = (etat: Etat, k: string, instant: number): boolean => tentatives(etat, k).some((a) => a.t >= instant);

// ---- la séance du jour, étape par étape ----
export interface AvancementSeance {
  /** questions de quiz de la partie « à revoir » qui restent à faire aujourd'hui (identifiants, sans préfixe) */
  quiz: string[];
  /** questions du carnet qui restent à revoir aujourd'hui */
  questions: string[];
  /** taille de la partie « à revoir », questions déjà faites comprises */
  totalRevoir: number;
  exercice: string | null;
  exerciceFait: boolean;
  /** 0 : à revoir ; 1 : l'exercice sur papier et sa correction ; 2 : la séance est finie */
  etape: 0 | 1 | 2;
}

/**
 * Où en est la séance du jour. Rien n'est gardé à part : l'avancement se lit dans les réponses du jour,
 * donc la séance reprend là où elle s'est arrêtée. Sans la partie « à revoir » (offre gratuite), elle commence à l'exercice.
 */
export function avancementSeance(ctx: Contexte, avecRevoir = true): AvancementSeance {
  const s = seanceDuJour(ctx);
  const auj = jourCourant(ctx);
  const revoir = avecRevoir ? s.revoir : [];
  const reste = revoir.filter((k) => !faitLe(ctx.etat, k, auj));
  const quiz = reste.filter((k) => k.startsWith("quiz:")).map((k) => k.slice(5));
  const questions = reste.filter((k) => !k.startsWith("quiz:"));
  const exerciceFait = !!s.exercice && faitLe(ctx.etat, s.exercice, auj);
  const etape = s.faite ? 2 : reste.length ? 0 : s.exercice && !exerciceFait ? 1 : 2;
  return { quiz, questions, totalRevoir: revoir.length, exercice: s.exercice, exerciceFait, etape };
}

// ---- une séance d'un plan de DS, étape par étape ----
export type EtapePlan =
  | { id: string; type: "essentiel"; fiche: number }
  | { id: string; type: "quiz"; ids: string[] }
  | { id: string; type: "item"; ref: string; blanc: boolean }
  | { id: string; type: "pieges"; fiches: number[] }
  | { id: string; type: "carnet" }
  | { id: string; type: "blanc"; minutes: number; refs: string[] };

/** Les étapes d'une séance, dans l'ordre du plan. Un DS blanc donne l'épreuve, puis la correction de chaque partie. */
export function etapesDeSeance(s: SeancePlan): EtapePlan[] {
  const out: EtapePlan[] = [];
  const vus = new Set<string>();
  const ajoute = (e: EtapePlan) => { if (!vus.has(e.id)) { vus.add(e.id); out.push(e); } };
  for (const t of s.taches) {
    if (t.type === "essentiel") ajoute({ id: `essentiel:${t.fiche}`, type: "essentiel", fiche: t.fiche });
    else if (t.type === "quiz") ajoute({ id: "quiz", type: "quiz", ids: t.ids });
    else if (t.type === "questions") for (const ref of t.refs) ajoute({ id: `item:${ref}`, type: "item", ref, blanc: false });
    else if (t.type === "exercice") ajoute({ id: `item:${t.ref}`, type: "item", ref: t.ref, blanc: false });
    else if (t.type === "pieges") ajoute({ id: "pieges", type: "pieges", fiches: t.fiches });
    else if (t.type === "carnet") ajoute({ id: "carnet", type: "carnet" });
    else {
      ajoute({ id: "blanc", type: "blanc", minutes: t.minutes, refs: t.refs });
      for (const ref of t.refs) ajoute({ id: `item:${ref}`, type: "item", ref, blanc: true });
    }
  }
  return out;
}

/** Vrai pour une étape que l'élève coche lui-même : une lecture, le carnet, l'épreuve du DS blanc. */
export const etapeACocher = (e: EtapePlan): boolean => e.type !== "item" && e.type !== "quiz";

/**
 * Une étape est faite quand l'élève s'est corrigé sur la question depuis la création du plan, quand il a répondu
 * à toutes les questions du test, ou, pour une lecture, quand il l'a cochée.
 */
export function etapeFaite(ctx: Contexte, depuis: number, s: SeancePlan, e: EtapePlan): boolean {
  if (e.type === "item") return faitApres(ctx.etat, e.ref, depuis);
  if (e.type === "quiz") return e.ids.length > 0 && e.ids.every((id) => faitApres(ctx.etat, cleQuiz(id), depuis));
  return (s.lues ?? []).includes(e.id);
}

/** Le rang (à partir de 0) de la première étape qui reste à faire, ou -1 si tout est fait. */
export function prochaineEtape(ctx: Contexte, depuis: number, s: SeancePlan): number {
  return etapesDeSeance(s).findIndex((e) => !etapeFaite(ctx, depuis, s, e));
}

/** Une séance d'un plan est faite si l'élève l'a cochée, ou si toutes ses étapes sont faites. */
export function seancePlanFaite(ctx: Contexte, depuis: number, s: SeancePlan): boolean {
  if (s.faite) return true;
  const etapes = etapesDeSeance(s);
  return etapes.length > 0 && etapes.every((e) => etapeFaite(ctx, depuis, s, e));
}

// ---- séries : la continuité du travail ----
export interface Series {
  /** séances du jour terminées depuis l'ouverture du compte */
  total: number;
  /** jours d'affilée avec une séance terminée, jusqu'à aujourd'hui, ou jusqu'à hier si celle du jour reste à faire */
  jours: number;
  /** la plus longue suite de jours d'affilée */
  record: number;
  /** semaines d'affilée où le nombre de séances prévu a été atteint ; la semaine en cours compte dès qu'elle l'atteint */
  semaines: number;
}

export function series(ctx: Contexte): Series {
  const jours = [...new Set(ctx.etat.seances.map((s) => s.date))].sort();
  const fait = new Set(jours);
  const auj = jourCourant(ctx);
  let suite = 0;
  for (let d = fait.has(auj) ? auj : ajouteJours(auj, -1); fait.has(d); d = ajouteJours(d, -1)) suite += 1;
  let record = 0, courant = 0, precedent: Jour | null = null;
  for (const d of jours) {
    courant = precedent !== null && ajouteJours(precedent, 1) === d ? courant + 1 : 1;
    if (courant > record) record = courant;
    precedent = d;
  }
  const prevues = seancesPrevues(ctx.reglages, ctx.etat.profil.objectif || ctx.reglages.objectifParDefaut);
  const dansSemaine = (l: Jour) => jours.filter((d) => d >= l && d <= ajouteJours(l, 6)).length;
  let semaines = 0;
  let l = lundi(auj);
  // la semaine en cours n'interrompt pas la série tant qu'elle n'est pas finie
  if (dansSemaine(l) >= prevues) semaines += 1;
  for (l = ajouteJours(l, -7); jours.length > 0 && l >= lundi(jours[0]) && dansSemaine(l) >= prevues; l = ajouteJours(l, -7)) semaines += 1;
  return { total: jours.length, jours: suite, record, semaines };
}

// ---- chiffres de l'écran des progrès ----
export interface SemaineDeTravail {
  lundi: Jour;
  /** réponses données dans la semaine : questions de cours, exercices et questions de quiz */
  questions: number;
  seances: number;
}

/** Le travail des n dernières semaines, de la plus ancienne à la semaine en cours. */
export function travailParSemaine(ctx: Contexte, n: number): SemaineDeTravail[] {
  const premier = ajouteJours(lundi(jourCourant(ctx)), -7 * (n - 1));
  const semaines: SemaineDeTravail[] = Array.from({ length: n }, (_, i) => ({ lundi: ajouteJours(premier, 7 * i), questions: 0, seances: 0 }));
  const range = (jour: Jour) => semaines.find((s) => jour >= s.lundi && jour <= ajouteJours(s.lundi, 6));
  for (const liste of Object.values(ctx.etat.tentatives)) for (const a of liste) { const s = range(jourDe(a.t)); if (s) s.questions += 1; }
  for (const d of new Set(ctx.etat.seances.map((x) => x.date))) { const s = range(d); if (s) s.seances += 1; }
  return semaines;
}

export interface ReussiteNiveau {
  niveau: number;
  /** questions du niveau déjà travaillées, sur les chapitres donnés */
  faits: number;
  total: number;
  /** réussite moyenne à la dernière réponse de chaque question travaillée, entre 0 et 1 */
  taux: number;
}

/** La réussite à chaque objectif, tous chapitres donnés confondus. */
export function reussiteParNiveau(ctx: Contexte, fiches: number[]): ReussiteNiveau[] {
  const parFiche = fiches.map((num) => niveauFiche(ctx, num).res);
  return NIVEAUX.map((L) => {
    const faits = parFiche.reduce((s, r) => s + r[L].faits, 0);
    const total = parFiche.reduce((s, r) => s + r[L].total, 0);
    const points = parFiche.reduce((s, r) => s + r[L].taux * r[L].faits, 0);
    return { niveau: L, faits, total, taux: faits ? points / faits : 0 };
  });
}

export interface Bilan {
  /** premier jour de la période */
  debut: Jour;
  /** séances du jour terminées depuis ce jour */
  seances: number;
  /** réponses données depuis ce jour */
  questions: number;
  /** notions acquises ou solides sur les chapitres donnés, la veille du premier jour, puis aujourd'hui */
  notionsAvant: number;
  notionsMaintenant: number;
  notionsTotal: number;
}

/** Ce qui a été fait et ce qui a progressé depuis un jour donné : le premier du mois pour le bilan du mois. */
export function bilanDepuis(ctx: Contexte, fiches: number[], debut: Jour): Bilan {
  const acquises = (c: Contexte) => fiches.reduce((s, num) => { const e = etatsFiche(c, num); return s + e.acquis + e.solide; }, 0);
  const passe: Etat = { ...ctx.etat, tentatives: {} };
  let questions = 0;
  for (const [k, liste] of Object.entries(ctx.etat.tentatives)) {
    const avant = liste.filter((a) => jourDe(a.t) < debut);
    if (avant.length) passe.tentatives[k] = avant;
    questions += liste.length - avant.length;
  }
  return {
    debut,
    seances: new Set(ctx.etat.seances.filter((x) => x.date >= debut).map((x) => x.date)).size,
    questions,
    notionsAvant: acquises({ ...ctx, etat: passe }),
    notionsMaintenant: acquises(ctx),
    notionsTotal: fiches.reduce((s, num) => s + etatsFiche(ctx, num).total, 0),
  };
}
