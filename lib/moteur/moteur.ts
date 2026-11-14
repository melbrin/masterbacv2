// Moteur de préparation : des règles écrites, sans IA, prévisibles et testables.
// Portage exact de reference/prototype/site/js/moteur.js. Aucune lecture de base, d'horloge ou de hasard :
// tout arrive par le contexte.
import { ajouteJours, ecartEnJours, jourDeParis, jourDeSemaine } from "@/lib/commun/dates";
import { NIVEAUX, PERIODES } from "./reglages";
import { graineDuJour, melange } from "./tirages";
import type {
  Contexte, Devoir, EntreeCarnet, Etat, FicheSommaire, Format, Genre, ItemSommaire, Jour, NotionSommaire,
  QuizSommaire, Reglages, Resultat, SeanceDuJour, SeancePlan, Sommaire, SommaireIndexe, Tache, Tentative,
} from "./types";

const JOUR_MS = 86_400_000;

// ---- sommaire ----
export function indexeSommaire(sommaire: Sommaire): SommaireIndexe {
  const parNum = new Map<number, FicheSommaire>();
  for (const f of sommaire.fiches) parNum.set(f.num, f);
  const quizParFiche = new Map<number, QuizSommaire[]>();
  for (const q of sommaire.quiz) {
    const liste = quizParFiche.get(q.fiche);
    if (liste) liste.push(q);
    else quizParFiche.set(q.fiche, [q]);
  }
  return { ...sommaire, parNum, quizParFiche };
}

export const cle = (num: number | string, k: Genre, n: number): string => `${Number(num)}-${k}${n}`;
export const cleQuiz = (id: string): string => `quiz:${id}`;

export function decoupe(c: string): { fiche: number; k: Genre; n: number } | null {
  const m = c.match(/^(\d+)-(q|ex)(\d+)$/);
  return m ? { fiche: Number(m[1]), k: m[2] as Genre, n: Number(m[3]) } : null;
}

const info = (ctx: Contexte, num: number): FicheSommaire | undefined => ctx.sommaire.parNum.get(Number(num));
const quizFiche = (ctx: Contexte, num: number): QuizSommaire[] => ctx.sommaire.quizParFiche.get(Number(num)) ?? [];

function ficheConnue(ctx: Contexte, num: number): FicheSommaire {
  const f = info(ctx, num);
  if (!f) throw new RangeError(`fiche inconnue : ${num}`);
  return f;
}

export const jourCourant = (ctx: Contexte): Jour => jourDeParis(new Date(ctx.maintenant));

// ---- tentatives ----
export const tentatives = (etat: Etat, k: string): Tentative[] => etat.tentatives[k] ?? [];
export function derniere(etat: Etat, k: string): Tentative | null {
  const t = tentatives(etat, k);
  return t[t.length - 1] ?? null;
}
export const statut = (etat: Etat, k: string): Resultat | null => derniere(etat, k)?.r ?? null;

export const scoreDe = (r: Resultat): number => (r === "ok" ? 1 : r === "partiel" ? 0.5 : 0);

/** Le résultat d'un exercice corrigé au barème, à partir de son score entre 0 et 1. */
export const resultatDuScore = (s: number): Resultat => (s >= 0.7 ? "ok" : s >= 0.4 ? "partiel" : "ko");

function avanceCarnet(carnet: Record<string, EntreeCarnet>, k: string, r: Resultat, jour: Jour, reglages: Reglages): void {
  const c = carnet[k];
  if (r === "ok") {
    if (c) {
      c.step += 1;
      if (c.step >= reglages.intervalles.length) delete carnet[k];
      else c.due = ajouteJours(jour, reglages.intervalles[c.step]);
    }
  } else carnet[k] = { due: ajouteJours(jour, reglages.intervalles[0]), step: 0 };
}

/** Enregistre une tentative et met le carnet d'erreurs à jour. Renvoie un nouvel état ; l'état reçu n'est pas modifié. */
export function enregistre(ctx: Contexte, k: string, r: Resultat, s?: number | null): Etat {
  const etat = structuredClone(ctx.etat);
  (etat.tentatives[k] ||= []).push({ t: ctx.maintenant, r, s: s ?? scoreDe(r) });
  avanceCarnet(etat.carnet, k, r, jourCourant(ctx), ctx.reglages);
  return etat;
}

/** Rejoue toutes les tentatives dans l'ordre pour reconstruire le carnet d'erreurs. */
export function recalculeCarnet(tentativesParCle: Record<string, Tentative[]>, reglages: Reglages): Record<string, EntreeCarnet> {
  const ev: (Tentative & { k: string })[] = [];
  for (const [k, liste] of Object.entries(tentativesParCle)) for (const a of liste) ev.push({ k, ...a });
  ev.sort((a, b) => a.t - b.t);
  const carnet: Record<string, EntreeCarnet> = {};
  for (const e of ev) avanceCarnet(carnet, e.k, e.r, jourDeParis(new Date(e.t)), reglages);
  return carnet;
}

export function carnet(etat: Etat, date: Jour | null = null): ({ k: string } & EntreeCarnet)[] {
  return Object.entries(etat.carnet)
    .filter(([, c]) => !date || c.due <= date)
    .sort((a, b) => a[1].due.localeCompare(b[1].due))
    .map(([k, c]) => ({ k, ...c }));
}
export const carnetDuJour = (ctx: Contexte) => carnet(ctx.etat, jourCourant(ctx));

// ---- notions : à voir, en cours, acquis, solide ----
export type EtatNotion = "a-voir" | "en-cours" | "acquis" | "solide";

export function etatNotion(ctx: Contexte, num: number, notion: NotionSommaire): EtatNotion {
  const ts: Tentative[] = [];
  for (const [k, n] of notion.refs) for (const a of tentatives(ctx.etat, cle(num, k, n))) ts.push(a);
  if (!ts.length) return "a-voir";
  ts.sort((a, b) => a.t - b.t);
  const taux = ts.reduce((s, a) => s + a.s, 0) / ts.length;
  const der = ts[ts.length - 1];
  if (taux >= ctx.reglages.tauxReussite && der.r === "ok") {
    const ok = ts.filter((a) => a.r === "ok");
    if (ok.length >= 2 && ok[ok.length - 1].t - ok[0].t >= ctx.reglages.joursPourSolide * JOUR_MS) return "solide";
    return "acquis";
  }
  return "en-cours";
}

export function etatsFiche(ctx: Contexte, num: number): Record<EtatNotion, number> & { total: number } {
  const f = ficheConnue(ctx, num);
  const c = { "a-voir": 0, "en-cours": 0, acquis: 0, solide: 0 };
  for (const n of f.liste_notions) c[etatNotion(ctx, num, n)] += 1;
  return { ...c, total: f.liste_notions.length };
}

// ---- niveau d'un chapitre ----
export interface NiveauFiche {
  atteint: number;
  prochain: number | null;
  testDispo: boolean;
  res: Record<number, { total: number; faits: number; taux: number }>;
}

export function niveauFiche(ctx: Contexte, num: number): NiveauFiche {
  const f = ficheConnue(ctx, num);
  const { etat, reglages } = ctx;
  const res: NiveauFiche["res"] = {};
  for (const L of NIVEAUX) {
    const cles = f.items.filter((i) => i.k === "q" && i.niveau === L).map((i) => cle(num, "q", i.n))
      .concat(quizFiche(ctx, num).filter((q) => q.niveau === L).map((q) => cleQuiz(q.id)));
    const faits = cles.filter((k) => tentatives(etat, k).length);
    const taux = faits.length ? faits.reduce((s, k) => s + (derniere(etat, k) as Tentative).s, 0) / faits.length : 0;
    res[L] = { total: cles.length, faits: faits.length, taux };
  }
  const passages = etat.passages[String(num)] ?? {};
  const critere = (L: number) =>
    res[L].total > 0 && res[L].faits >= Math.min(reglages.itemsPourNiveau, res[L].total) && res[L].taux >= reglages.tauxReussite;
  let atteint = 0;
  for (const L of NIVEAUX) {
    if (critere(L) && (L === 10 || passages[String(L)])) atteint = L;
    else break;
  }
  const prochain = atteint === 18 ? null : atteint === 0 ? 10 : atteint + 4;
  const testDispo = !!prochain && prochain > 10 && critere(prochain) && !passages[String(prochain)]
    && quizFiche(ctx, num).length >= reglages.quizPourPassage;
  return { atteint, prochain, testDispo, res };
}

// ---- chapitres vus en classe ----
export function chapitresVus(ctx: Contexte): number[] {
  // les clés numériques d'un objet sortent par ordre croissant, comme dans le prototype
  return Object.keys(ctx.etat.vuEnClasse).filter((k) => ctx.etat.vuEnClasse[k]).map(Number)
    .sort((a, b) => a - b).filter((n) => info(ctx, n));
}

// ---- note estimée, avec sa fourchette ----
export interface NoteEstimee {
  valeur: number;
  bas: number;
  haut: number;
  chapitres: number;
  essais: number;
  notes: number;
}

export function noteEstimee(ctx: Contexte): NoteEstimee | null {
  let somme = 0, nb = 0, essais = 0;
  for (const num of chapitresVus(ctx)) {
    const { res } = niveauFiche(ctx, num);
    if (!res[10].faits && !res[14].faits && !res[18].faits) continue;
    // ce qu'on ne sait pas encore d'un niveau se déduit prudemment du niveau d'en dessous
    const t10 = res[10].faits ? res[10].taux : 0.6;
    const t14 = res[14].faits ? res[14].taux : 0.45 * t10;
    const t18 = res[18].faits ? res[18].taux : 0.35 * t14;
    somme += 6 + 4 * t10 + 4 * t14 + 6 * t18;
    nb += 1;
    essais += res[10].faits + res[14].faits + res[18].faits;
  }
  const notes = ctx.etat.ds.filter((d) => d.note != null).sort((a, b) => a.date.localeCompare(b.date)).slice(-3).map((d) => d.note as number);
  if (!nb && !notes.length) return null;
  let valeur: number | null = nb ? somme / nb : null;
  if (notes.length) {
    const moy = notes.reduce((s, x) => s + x, 0) / notes.length;
    valeur = valeur == null ? moy : 0.6 * valeur + 0.4 * moy;
  }
  const v = valeur as number;
  const demi = Math.max(1, 3 - 2 * Math.min(1, essais / 60) - (notes.length ? 0.5 : 0));
  return {
    valeur: Math.round(v * 10) / 10,
    bas: Math.max(0, Math.floor(v - demi)),
    haut: Math.min(20, Math.ceil(v + demi)),
    chapitres: nb, essais, notes: notes.length,
  };
}

// ---- DS ----
export function prochainDS(ctx: Contexte): Devoir | null {
  const auj = jourCourant(ctx);
  return ctx.etat.ds.filter((d) => d.date >= auj).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
}
export function dsANoter(ctx: Contexte): Devoir[] {
  const auj = jourCourant(ctx);
  return ctx.etat.ds.filter((d) => d.date < auj && d.note == null);
}

export const formatPour = (jours: number): Format => (jours <= 1 ? "express" : jours <= 6 ? "trois-jours" : "semaine");

type Question = ItemSommaire & { fiche: number; cle: string };

function questionsDe(ctx: Contexte, fiches: number[], objectif: number): Question[] {
  const out: Question[] = [];
  for (const num of fiches) for (const i of ficheConnue(ctx, num).items) if (i.k === "q" && i.niveau <= objectif) out.push({ ...i, fiche: num, cle: cle(num, "q", i.n) });
  return out;
}
// priorité : ratées, puis en partie, puis jamais faites et tombées au BAC, puis les autres jamais faites
function rangPriorite(etat: Etat, q: Question): number {
  const s = statut(etat, q.cle);
  if (s === "ko") return 0;
  if (s === "partiel") return 1;
  if (!s && q.demande) return 2;
  if (!s) return 3;
  return 4;
}
const un = (x: unknown): number => (x ? 1 : 0);

export function pointsFaibles(ctx: Contexte, fiches: number[], objectif: number, n: number, exclure: ReadonlySet<string> = new Set()): string[] {
  const rang = (q: Question) => rangPriorite(ctx.etat, q);
  return questionsDe(ctx, fiches, objectif)
    .filter((q) => !exclure.has(q.cle) && rang(q) < 4)
    .sort((a, b) => rang(a) - rang(b) || a.niveau - b.niveau || a.n - b.n)
    .slice(0, n).map((q) => q.cle);
}
function questionsNiveau(ctx: Contexte, fiches: number[], L: number, n: number, exclure: ReadonlySet<string>): string[] {
  const rang = (q: Question) => rangPriorite(ctx.etat, q);
  return questionsDe(ctx, fiches, L).filter((q) => q.niveau === L && !exclure.has(q.cle))
    .sort((a, b) => rang(a) - rang(b) || un(b.demande) - un(a.demande) || a.n - b.n)
    .slice(0, n).map((q) => q.cle);
}
// « eviter » : les chapitres qui ont déjà un exercice dans le plan passent après les autres (décision 0008).
// Vide, il ne change rien au tri du prototype.
function exercicePour(ctx: Contexte, fiches: number[], objectif: number, exclure: ReadonlySet<string>, eviter: ReadonlySet<number> = new Set()): Question | null {
  const ex: Question[] = [];
  for (const num of fiches) for (const i of ficheConnue(ctx, num).items) if (i.k === "ex") ex.push({ ...i, fiche: num, cle: cle(num, "ex", i.n) });
  const fait = (e: Question) => un(tentatives(ctx.etat, e.cle).length);
  const tri = ex.filter((e) => !exclure.has(e.cle))
    .sort((a, b) => un(eviter.has(a.fiche)) - un(eviter.has(b.fiche)) || un(a.niveau > objectif) - un(b.niveau > objectif) || fait(a) - fait(b) || (a.duree || 99) - (b.duree || 99));
  return tri[0] ?? null;
}

/** Tire n éléments en passant d'un chapitre à l'autre, pour qu'aucun chapitre du devoir ne soit oublié (décision 0008). */
function parTour(fiches: number[], n: number, candidats: (fiche: number) => string[]): string[] {
  const files = fiches.map((f) => candidats(f));
  const out: string[] = [];
  for (let rang = 0; out.length < n && files.some((l) => rang < l.length); rang++) {
    for (const l of files) if (rang < l.length && out.length < n) out.push(l[rang]);
  }
  return out;
}

export function quizPour(ctx: Contexte, fiches: number[], n: number, objectif: number, graine: number): string[] {
  const { etat } = ctx;
  const tous = fiches.flatMap((num) => quizFiche(ctx, num));
  const range = (liste: QuizSommaire[], g: number) => {
    const pas = liste.filter((q) => !tentatives(etat, cleQuiz(q.id)).length);
    const rates = liste.filter((q) => statut(etat, cleQuiz(q.id)) === "ko");
    const reste = liste.filter((q) => statut(etat, cleQuiz(q.id)) === "ok");
    return [...melange(rates, g), ...melange(pas, g + 1), ...melange(reste, g + 2)];
  };
  // d'abord les questions de l'objectif ; si le chapitre en a trop peu, on complète avec le niveau au-dessus
  const dessus = NIVEAUX.filter((L) => L > objectif).flatMap((L, i) => range(tous.filter((q) => q.niveau === L), graine + 3 + i));
  return [...range(tous.filter((q) => q.niveau <= objectif), graine), ...dessus].slice(0, n).map((q) => q.id);
}

const nQuestions = (n: number) => `${n} question${n > 1 ? "s" : ""}`;

/** Le plan d'un DS, construit une fois à la création et gardé tel quel. */
export function construitPlan(ctx: Contexte, ds: Devoir, depuis: Jour = jourCourant(ctx)): { format: Format; seances: SeancePlan[] } {
  const j = ecartEnJours(depuis, ds.date);
  const format = ds.format || formatPour(j);
  const F = ds.fiches;
  const obj = ds.objectif;
  const pris = new Set<string>();
  const garde = (liste: string[]) => { liste.forEach((k) => pris.add(k)); return liste; };
  const seances: SeancePlan[] = [];
  const date = (n: number) => { const d = ajouteJours(ds.date, -n); return d < depuis ? depuis : d; };
  const add = (n: number, titre: string, minutes: number, taches: Tache[]) =>
    seances.push({ id: "s" + (seances.length + 1), date: date(n), titre, minutes, taches, faite: false });
  const g = graineDuJour(jourCourant(ctx), ds.id);
  // le quiz est tiré d'abord, pour que le titre de la séance annonce le vrai nombre de questions
  const qz = quizPour(ctx, F, ctx.reglages.questionsQuizDs, obj, g);
  const quiz: Tache[] = qz.length ? [{ type: "quiz", ids: qz }] : [];
  const essentiel: Tache[] = F.map((f) => ({ type: "essentiel", fiche: f }));
  const pieges: Tache = { type: "pieges", fiches: F };
  const faibles = (n: number): Tache => ({ type: "questions", refs: garde(pointsFaibles(ctx, F, obj, n, pris)) });
  const exercice = (e: Question): Tache => ({ type: "exercice", ref: e.cle, minutes: e.duree });
  if (ctx.reglages.planParChapitre && F.length > 1) {
    seances.push(...planParChapitre(ctx, { ...ds, format }, { quiz, essentiel, pieges, date, nbQuiz: qz.length }));
    return { format, seances };
  }
  if (format === "express") {
    add(1, "Fiche éclair", 20, [...essentiel, ...quiz, pieges]);
  } else if (format === "trois-jours") {
    add(3, qz.length ? `Test de ${nQuestions(qz.length)}` : "Le cours en une page", 30, [...essentiel, ...quiz]);
    add(2, "Exercices ciblés sur tes points faibles", 30, [faibles(4)]);
    const ex = exercicePour(ctx, F, obj, pris);
    add(1, "Un exercice type", 30, [ex ? exercice(ex) : faibles(2), pieges]);
  } else {
    add(7, qz.length ? `Le cours en une page et ${nQuestions(qz.length)}` : "Le cours en une page", 30, [...essentiel, ...quiz]);
    add(6, "Questions de cours, objectif 10", 30, [{ type: "questions", refs: garde(questionsNiveau(ctx, F, 10, 4, pris)) }]);
    if (obj >= 14) {
      add(5, `Questions de cours, objectif ${obj}`, 30, [{
        type: "questions",
        refs: garde(questionsNiveau(ctx, F, Math.min(obj, 14), 3, pris).concat(obj === 18 ? questionsNiveau(ctx, F, 18, 1, pris) : [])),
      }]);
    } else add(5, "Questions de cours, deuxième passage", 30, [{ type: "questions", refs: garde(questionsNiveau(ctx, F, 10, 4, pris)) }]);
    const ex1 = exercicePour(ctx, F, obj, pris);
    if (ex1) pris.add(ex1.cle);
    add(4, "Exercice type BAC", ex1?.duree || 40, [ex1 ? exercice(ex1) : faibles(3)]);
    add(3, "Points faibles et carnet d'erreurs", 30, [faibles(3), { type: "carnet" }]);
    const blanc: string[] = [];
    const ex2 = exercicePour(ctx, F, obj, pris);
    if (ex2) { blanc.push(ex2.cle); pris.add(ex2.cle); }
    if (ds.duree >= 2) { const ex3 = exercicePour(ctx, F, obj, pris); if (ex3) { blanc.push(ex3.cle); pris.add(ex3.cle); } }
    blanc.push(...garde(pointsFaibles(ctx, F, obj, ds.duree >= 2 ? 2 : 3, pris)));
    add(2, "DS blanc chronométré", ds.duree * 60, [{ type: "ds-blanc", minutes: ds.duree * 60, refs: blanc }]);
    add(1, "Fiche éclair", 20, [...essentiel, pieges]);
  }
  return { format, seances };
}

/**
 * Le plan d'un devoir qui porte sur plusieurs chapitres (décision 0008). Les formats et le nombre de séances
 * sont ceux du prototype ; ce qui change : une séance de questions en donne deux par chapitre (au moins autant
 * que le prototype, huit au plus), tirées en passant d'un chapitre à l'autre, sa durée suit le nombre de questions,
 * et les exercices viennent de chapitres différents quand c'est possible.
 */
function planParChapitre(
  ctx: Contexte, ds: Devoir & { format: Format },
  p: { quiz: Tache[]; essentiel: Tache[]; pieges: Tache; date: (n: number) => Jour; nbQuiz: number },
): SeancePlan[] {
  const F = ds.fiches;
  const obj = ds.objectif;
  const pris = new Set<string>();
  const fichesExo = new Set<number>();
  const seances: SeancePlan[] = [];
  const add = (n: number, titre: string, minutes: number, taches: Tache[]) =>
    seances.push({ id: "s" + (seances.length + 1), date: p.date(n), titre, minutes, taches, faite: false });
  const garde = (liste: string[]) => { liste.forEach((k) => pris.add(k)); return liste; };
  const combien = (base: number) => Math.min(ctx.reglages.questionsMaxSeanceDs, Math.max(base, 2 * F.length));
  const minutes = (n: number) => (n > 4 ? 30 + 10 * Math.ceil((n - 4) / 2) : 30);
  const faibles = (base: number) => { const n = combien(base); return garde(parTour(F, n, (f) => pointsFaibles(ctx, [f], obj, n, pris))); };
  const duNiveau = (L: number, base: number) => { const n = combien(base); return garde(parTour(F, n, (f) => questionsNiveau(ctx, [f], L, n, pris))); };
  const questions = (refs: string[]): Tache => ({ type: "questions", refs });
  const exo = (): Question | null => {
    const e = exercicePour(ctx, F, obj, pris, fichesExo);
    if (e) { pris.add(e.cle); fichesExo.add(e.fiche); }
    return e;
  };
  if (ds.format === "express") {
    add(1, "Fiche éclair", 20, [...p.essentiel, ...p.quiz, p.pieges]);
  } else if (ds.format === "trois-jours") {
    add(3, p.nbQuiz ? `Test de ${nQuestions(p.nbQuiz)}` : "Le cours en une page", 30, [...p.essentiel, ...p.quiz]);
    const cibles = faibles(4);
    add(2, "Exercices ciblés sur tes points faibles", minutes(cibles.length), [questions(cibles)]);
    const e = exo();
    add(1, "Un exercice type", 30, [e ? { type: "exercice", ref: e.cle, minutes: e.duree } : questions(faibles(2)), p.pieges]);
  } else {
    add(7, p.nbQuiz ? `Le cours en une page et ${nQuestions(p.nbQuiz)}` : "Le cours en une page", 30, [...p.essentiel, ...p.quiz]);
    const dix = duNiveau(10, 4);
    add(6, "Questions de cours, objectif 10", minutes(dix.length), [questions(dix)]);
    if (obj >= 14) {
      // viser 18 : une question d'objectif 18 par chapitre, trois au plus, prises sur la place de la séance
      const n18 = obj === 18 ? Math.min(F.length, 3) : 0;
      const n14 = Math.min(combien(3), ctx.reglages.questionsMaxSeanceDs - n18);
      const suite = garde(parTour(F, n14, (f) => questionsNiveau(ctx, [f], 14, n14, pris)));
      if (n18) suite.push(...garde(parTour(F, n18, (f) => questionsNiveau(ctx, [f], 18, 1, pris))));
      add(5, `Questions de cours, objectif ${obj}`, minutes(suite.length), [questions(suite)]);
    } else {
      const encore = duNiveau(10, 4);
      add(5, "Questions de cours, deuxième passage", minutes(encore.length), [questions(encore)]);
    }
    const ex1 = exo();
    add(4, "Exercice type BAC", ex1?.duree || 40, [ex1 ? { type: "exercice", ref: ex1.cle, minutes: ex1.duree } : questions(faibles(3))]);
    const reprises = faibles(3);
    add(3, "Points faibles et carnet d'erreurs", minutes(reprises.length), [questions(reprises), { type: "carnet" }]);
    const blanc: string[] = [];
    const ex2 = exo();
    if (ex2) blanc.push(ex2.cle);
    if (ds.duree >= 2) { const ex3 = exo(); if (ex3) blanc.push(ex3.cle); }
    // le DS blanc garde la durée du devoir : une question par chapitre, quatre au plus
    const nBlanc = Math.min(4, Math.max(ds.duree >= 2 ? 2 : 3, F.length));
    blanc.push(...garde(parTour(F, nBlanc, (f) => pointsFaibles(ctx, [f], obj, nBlanc, pris))));
    add(2, "DS blanc chronométré", ds.duree * 60, [{ type: "ds-blanc", minutes: ds.duree * 60, refs: blanc }]);
    add(1, "Fiche éclair", 20, [...p.essentiel, p.pieges]);
  }
  return seances;
}

// ---- séance du jour : à revoir, un exercice sur papier, la correction ----
export function seanceDuJour(ctx: Contexte): SeanceDuJour {
  const { etat, reglages } = ctx;
  const auj = jourCourant(ctx);
  if (etat.seance && etat.seance.date === auj) return etat.seance;
  const ds = prochainDS(ctx);
  const proche = !!ds && ecartEnJours(auj, ds.date) <= reglages.joursDsProche;
  // sans chapitre coché, on part du premier chapitre de la progression habituelle
  const vus = chapitresVus(ctx);
  const cibles = proche && ds ? ds.fiches : vus.length ? vus : [1];
  const obj = etat.profil.objectif || reglages.objectifParDefaut;
  const revoir = carnetDuJour(ctx).slice(0, 3).map((e) => e.k);
  if (revoir.length < 3) {
    const graine = graineDuJour(auj, "rev");
    if (reglages.revoirSansDoublon) {
      // décision 0004 : le complément ne reprend pas une question déjà tirée du carnet
      const complement = quizPour(ctx, cibles, 3, obj, graine).map(cleQuiz).filter((k) => !revoir.includes(k));
      revoir.push(...complement.slice(0, 3 - revoir.length));
    } else revoir.push(...quizPour(ctx, cibles, 3 - revoir.length, obj, graine).map(cleQuiz));
  }
  // l'exercice : le prochain niveau à valider du chapitre, une question pas encore réussie, de préférence tombée au BAC
  let choix: Question | null = null;
  for (const num of cibles) {
    const nv = niveauFiche(ctx, num);
    const vise = Math.min(nv.prochain || obj, obj);
    const cand = questionsDe(ctx, [num], vise)
      .filter((q) => statut(etat, q.cle) !== "ok" && !revoir.includes(q.cle))
      .sort((a, b) => un(b.niveau === vise) - un(a.niveau === vise) || un(b.demande) - un(a.demande)
        || un(a.type === "Cours") - un(b.type === "Cours") || a.n - b.n);
    if (cand.length) { choix = cand[0]; break; }
  }
  if (!choix) choix = questionsDe(ctx, cibles, obj)[0] ?? null;
  return {
    date: auj, revoir, exercice: choix ? choix.cle : null, etape: 0, faite: false,
    raison: proche ? "ds" : vus.length ? "classe" : "defaut", dsId: proche && ds ? ds.id : null,
  };
}

/** Marque la séance du jour comme faite. Renvoie un nouvel état. */
export function marqueSeanceFaite(ctx: Contexte): Etat {
  const etat = structuredClone(ctx.etat);
  const auj = jourCourant(ctx);
  if (!etat.seances.some((s) => s.date === auj)) etat.seances.push({ date: auj, minutes: ctx.reglages.minutesSeance });
  if (etat.seance) etat.seance.faite = true;
  return etat;
}

// ---- rythme et périodes ----
export function periodeActuelle(ctx: Contexte) {
  const auj = jourCourant(ctx);
  return PERIODES.find((p) => auj >= p.debut && auj <= p.fin) ?? PERIODES[0];
}
export function lundi(jour: Jour): Jour {
  return ajouteJours(jour, -((jourDeSemaine(jour) + 6) % 7));
}
export function seancesSemaine(ctx: Contexte): number {
  const l = lundi(jourCourant(ctx));
  const dimanche = ajouteJours(l, 6);
  return ctx.etat.seances.filter((s) => s.date >= l && s.date <= dimanche).length;
}
export const seancesPrevues = (reglages: Reglages, objectif: number): number =>
  reglages.seancesParSemaine[objectif] ?? reglages.seancesParSemaine[reglages.objectifParDefaut];

// ---- test de passage ----
export function questionsPassage(ctx: Contexte, num: number, L: number): string[] {
  const pool = quizFiche(ctx, num);
  const meme = pool.filter((q) => q.niveau === L);
  const autres = pool.filter((q) => q.niveau !== L).sort((a, b) => Math.abs(a.niveau - L) - Math.abs(b.niveau - L));
  return [...melange(meme, graineDuJour(jourCourant(ctx), "p" + num + L)), ...autres]
    .slice(0, ctx.reglages.questionsPassage).map((q) => q.id);
}
