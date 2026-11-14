// Suivi du travail (lib/moteur/suivi.ts) : étapes de la séance du jour, étapes d'une séance de DS,
// séries de séances, chiffres de l'écran des progrès. Des cas écrits à la main, puis des propriétés.
import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import * as m from "@/lib/moteur";
import type { Contexte, Etat, ItemSommaire, Resultat, SeancePlan } from "@/lib/moteur";
import { ajouteJours, jourDeParis } from "@/lib/commun/dates";

const q = (n: number, niveau: number): ItemSommaire => ({ k: "q", n, niveau, type: "Cours", demande: "" });
const petit = m.indexeSommaire({
  fiches: [
    { num: 1, items: [q(1, 10), q(2, 10), q(3, 10), q(4, 14), q(5, 14), q(6, 18), { k: "ex", n: 1, niveau: 10, type: "BAC", duree: 30 }, { k: "ex", n: 2, niveau: 14, type: "BAC", duree: 40 }], liste_notions: [{ id: "n1", refs: [["q", 1]] }, { id: "n2", refs: [["q", 2]] }] },
    { num: 2, items: [q(1, 10), q(2, 14)], liste_notions: [{ id: "n1", refs: [["q", 1]] }] },
  ],
  quiz: [{ id: "A1", fiche: 1, niveau: 10 }, { id: "A2", fiche: 1, niveau: 10 }, { id: "A3", fiche: 1, niveau: 14 }, { id: "B1", fiche: 2, niveau: 10 }],
});
// vendredi 13 novembre 2026, 18 h à Paris
const T = Date.parse("2026-11-13T17:00:00Z");
const JOUR = 86_400_000;
const vide = (): Etat => ({ profil: { objectif: 14 }, vuEnClasse: {}, tentatives: {}, carnet: {}, passages: {}, ds: [], seances: [], seance: null });
const ctx = (etat: Etat, maintenant = T, sommaire = petit): Contexte => ({ etat, sommaire, maintenant, reglages: m.REGLAGES_ACTUELS });
const repond = (etat: Etat, k: string, r: Resultat = "ok", quand = T) => m.enregistre(ctx(etat, quand), k, r);
const seances = (etat: Etat, ...jours: string[]): Etat => ({ ...etat, seances: jours.map((date) => ({ date, minutes: 25 })) });

describe("la séance du jour, étape par étape", () => {
  it("commence par les questions à revoir, passe à l'exercice, puis se termine", () => {
    let etat = vide();
    const s = m.seanceDuJour(ctx(etat));
    etat.seance = s;
    expect(s.revoir.length).toBeGreaterThan(0);
    expect(m.avancementSeance(ctx(etat))).toMatchObject({ etape: 0, totalRevoir: s.revoir.length, exerciceFait: false });
    for (const k of s.revoir) etat = repond(etat, k);
    expect(m.avancementSeance(ctx(etat))).toMatchObject({ etape: 1, quiz: [], questions: [] });
    etat = repond(etat, s.exercice as string, "partiel");
    expect(m.avancementSeance(ctx(etat))).toMatchObject({ etape: 2, exerciceFait: true });
  });
  it("sépare les questions de quiz des questions du carnet qui restent à faire", () => {
    let etat = repond(vide(), "1-q4", "ko", T - 3 * JOUR);
    etat.seance = m.seanceDuJour(ctx(etat));
    expect(etat.seance.revoir[0]).toBe("1-q4");
    const a = m.avancementSeance(ctx(etat));
    expect(a.questions).toEqual(["1-q4"]);
    expect(a.quiz.length).toBe(etat.seance.revoir.length - 1);
    expect(a.quiz.every((id) => !id.startsWith("quiz:"))).toBe(true);
  });
  it("sans la partie à revoir, la séance commence à l'exercice", () => {
    const etat = vide();
    etat.seance = m.seanceDuJour(ctx(etat));
    expect(m.avancementSeance(ctx(etat), false)).toMatchObject({ etape: 1, totalRevoir: 0, quiz: [], questions: [] });
  });
  it("une réponse de la veille ne compte pas pour la séance du jour", () => {
    let etat = vide();
    const s = m.seanceDuJour(ctx(etat));
    etat = repond(etat, s.exercice as string, "ok", T - JOUR);
    etat.seance = s;
    expect(m.avancementSeance(ctx(etat), false).exerciceFait).toBe(false);
  });
  it("une séance marquée faite est finie, même s'il reste des questions", () => {
    const etat = vide();
    etat.seance = { ...m.seanceDuJour(ctx(etat)), faite: true };
    expect(m.avancementSeance(ctx(etat)).etape).toBe(2);
  });
  it("sans exercice à proposer, la séance est finie après la partie à revoir", () => {
    const sansRien = m.indexeSommaire({ fiches: [{ num: 1, items: [], liste_notions: [] }], quiz: [] });
    expect(m.avancementSeance(ctx(vide(), T, sansRien))).toMatchObject({ etape: 2, exercice: null, exerciceFait: false });
  });
});

describe("une séance d'un plan de DS, étape par étape", () => {
  const ds = { id: "d1", date: ajouteJours(jourDeParis(new Date(T)), 9), duree: 2, fiches: [1, 2], objectif: 14 };
  const plan = m.construitPlan(ctx(vide()), ds);
  const depuis = T;

  it("déroule les tâches dans l'ordre, une étape par question, et le DS blanc avant sa correction", () => {
    const premiere = m.etapesDeSeance(plan.seances[0]);
    expect(premiere.map((e) => e.id)).toEqual(["essentiel:1", "essentiel:2", "quiz"]);
    const blanc = m.etapesDeSeance(plan.seances.find((s) => s.taches.some((t) => t.type === "ds-blanc")) as SeancePlan);
    expect(blanc[0]).toMatchObject({ id: "blanc", type: "blanc", minutes: 120 });
    expect(blanc.slice(1).every((e) => e.type === "item" && e.blanc)).toBe(true);
    const derniere = m.etapesDeSeance(plan.seances[plan.seances.length - 1]);
    expect(derniere.map((e) => e.type)).toEqual(["essentiel", "essentiel", "pieges"]);
  });
  it("ne répète pas une étape citée deux fois", () => {
    const s: SeancePlan = { id: "s1", date: ds.date, titre: "", minutes: 30, faite: false, taches: [{ type: "questions", refs: ["1-q1", "1-q1"] }, { type: "exercice", ref: "1-q1" }, { type: "carnet" }, { type: "carnet" }] };
    expect(m.etapesDeSeance(s).map((e) => e.id)).toEqual(["item:1-q1", "carnet"]);
  });
  it("une lecture se coche, une question se fait, un test se termine", () => {
    const s = plan.seances[0];
    const [e1, e2, test] = m.etapesDeSeance(s);
    expect(m.etapeACocher(e1)).toBe(true);
    expect(m.etapeACocher(test)).toBe(false);
    expect(m.prochaineEtape(ctx(vide()), depuis, s)).toBe(0);
    const lue: SeancePlan = { ...s, lues: [e1.id] };
    expect(m.etapeFaite(ctx(vide()), depuis, lue, e1)).toBe(true);
    expect(m.etapeFaite(ctx(vide()), depuis, lue, e2)).toBe(false);
    expect(m.prochaineEtape(ctx(vide()), depuis, lue)).toBe(1);
    // le test : toutes ses questions doivent avoir une réponse depuis la création du plan
    const ids = (test as { ids: string[] }).ids;
    let etat = vide();
    for (const id of ids.slice(1)) etat = repond(etat, m.cleQuiz(id), "ko", T + 1000);
    expect(m.etapeFaite(ctx(etat, T + 2000), depuis, s, test)).toBe(false);
    etat = repond(etat, m.cleQuiz(ids[0]), "ok", T + 1000);
    expect(m.etapeFaite(ctx(etat, T + 2000), depuis, s, test)).toBe(true);
    const tout: SeancePlan = { ...s, lues: [e1.id, e2.id] };
    expect(m.prochaineEtape(ctx(etat, T + 2000), depuis, tout)).toBe(-1);
    expect(m.seancePlanFaite(ctx(etat, T + 2000), depuis, tout)).toBe(true);
    expect(m.seancePlanFaite(ctx(etat, T + 2000), depuis, s)).toBe(false);
  });
  it("une réponse donnée avant la création du plan ne fait pas l'étape", () => {
    const s = plan.seances[1];
    const e = m.etapesDeSeance(s)[0] as { ref: string } & m.EtapePlan;
    expect(e.type).toBe("item");
    const avant = repond(vide(), e.ref, "ok", T - 1000);
    expect(m.etapeFaite(ctx(avant), depuis, s, e)).toBe(false);
    const apres = repond(vide(), e.ref, "ko", T);
    expect(m.etapeFaite(ctx(apres), depuis, s, e)).toBe(true);
  });
  it("une séance cochée à la main est faite ; une séance sans étape ne l'est pas toute seule", () => {
    const sansEtape: SeancePlan = { id: "s9", date: ds.date, titre: "", minutes: 30, faite: false, taches: [{ type: "questions", refs: [] }] };
    expect(m.etapesDeSeance(sansEtape)).toEqual([]);
    expect(m.seancePlanFaite(ctx(vide()), depuis, sansEtape)).toBe(false);
    expect(m.seancePlanFaite(ctx(vide()), depuis, { ...sansEtape, faite: true })).toBe(true);
    expect(m.seancePlanFaite(ctx(vide()), depuis, { ...plan.seances[0], faite: true })).toBe(true);
  });
  it("un test sans question ne se valide pas tout seul", () => {
    const s: SeancePlan = { id: "s1", date: ds.date, titre: "", minutes: 30, faite: false, taches: [{ type: "quiz", ids: [] }] };
    expect(m.etapeFaite(ctx(vide()), depuis, s, m.etapesDeSeance(s)[0])).toBe(false);
  });
});

describe("séries", () => {
  const auj = jourDeParis(new Date(T)); // vendredi 13 novembre 2026
  const j = (n: number) => ajouteJours(auj, n);

  it("sans séance, tout est à zéro", () => {
    expect(m.series(ctx(vide()))).toEqual({ total: 0, jours: 0, record: 0, semaines: 0 });
  });
  it("compte les jours d'affilée jusqu'à aujourd'hui", () => {
    expect(m.series(ctx(seances(vide(), j(-2), j(-1), j(0))))).toMatchObject({ total: 3, jours: 3, record: 3 });
  });
  it("la série tient jusqu'au soir : hier compte tant que la séance du jour reste à faire", () => {
    expect(m.series(ctx(seances(vide(), j(-2), j(-1))))).toMatchObject({ total: 2, jours: 2, record: 2 });
  });
  it("un jour sauté remet la série à zéro, le record reste", () => {
    expect(m.series(ctx(seances(vide(), j(-6), j(-5), j(-4), j(-2))))).toMatchObject({ total: 4, jours: 0, record: 3 });
    expect(m.series(ctx(seances(vide(), j(-6), j(-5), j(-4), j(0))))).toMatchObject({ total: 4, jours: 1, record: 3 });
  });
  it("ne compte pas deux fois le même jour", () => {
    expect(m.series(ctx(seances(vide(), j(0), j(0))))).toMatchObject({ total: 1, jours: 1, record: 1 });
  });
  it("compte les semaines d'affilée au rythme prévu pour la note visée", () => {
    // viser 14 : quatre séances par semaine. Semaine du 2 novembre : quatre séances. Semaine en cours : deux.
    const etat = seances(vide(), "2026-11-02", "2026-11-03", "2026-11-05", "2026-11-06", "2026-11-09", "2026-11-10");
    expect(m.series(ctx(etat)).semaines).toBe(1);
    // la semaine en cours atteint quatre séances : elle compte aussi
    const plus = seances(vide(), "2026-11-02", "2026-11-03", "2026-11-05", "2026-11-06", "2026-11-09", "2026-11-10", "2026-11-12", "2026-11-13");
    expect(m.series(ctx(plus)).semaines).toBe(2);
    // viser 10 : trois séances suffisent
    const dix: Etat = { ...seances(vide(), "2026-11-02", "2026-11-03", "2026-11-05"), profil: { objectif: 10 } };
    expect(m.series(ctx(dix)).semaines).toBe(1);
    // une semaine manquée coupe la série
    const coupee = seances(vide(), "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-11-09");
    expect(m.series(ctx(coupee)).semaines).toBe(0);
  });
  it("prend l'objectif par défaut quand le profil n'en a pas", () => {
    const etat: Etat = { ...seances(vide(), "2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12"), profil: {} };
    expect(m.series(ctx(etat)).semaines).toBe(1);
  });
});

describe("chiffres des progrès", () => {
  it("range les réponses et les séances dans leur semaine", () => {
    let etat = repond(vide(), "1-q1", "ok", T);
    etat = repond(etat, "1-q2", "ko", T - 7 * JOUR);
    etat = repond(etat, "quiz:A1", "ok", T - 7 * JOUR);
    etat = repond(etat, "1-q3", "ok", T - 60 * JOUR);
    etat = seances(etat, "2026-11-13", "2026-11-04", "2026-11-04");
    const semaines = m.travailParSemaine(ctx(etat), 4);
    expect(semaines.map((s) => s.lundi)).toEqual(["2026-10-19", "2026-10-26", "2026-11-02", "2026-11-09"]);
    expect(semaines.map((s) => s.questions)).toEqual([0, 0, 2, 1]);
    expect(semaines.map((s) => s.seances)).toEqual([0, 0, 1, 1]);
  });
  it("donne la réussite à chaque objectif sur les chapitres choisis", () => {
    let etat = repond(vide(), "1-q1", "ok");
    etat = repond(etat, "1-q2", "ko");
    etat = repond(etat, "2-q1", "partiel");
    const [dix, quatorze, dixHuit] = m.reussiteParNiveau(ctx(etat), [1, 2]);
    // objectif 10 : trois questions de cours et deux de quiz dans la fiche 1, une de cours et une de quiz dans la fiche 2
    expect(dix).toMatchObject({ niveau: 10, faits: 3, total: 7 });
    expect(dix.taux).toBeCloseTo(0.5);
    expect(quatorze).toMatchObject({ niveau: 14, faits: 0, taux: 0 });
    expect(dixHuit).toMatchObject({ niveau: 18, faits: 0, total: 1 });
    expect(m.reussiteParNiveau(ctx(etat), [])).toEqual([10, 14, 18].map((niveau) => ({ niveau, faits: 0, total: 0, taux: 0 })));
  });
  it("fait le bilan depuis un jour donné : séances, réponses, notions gagnées", () => {
    let etat = repond(vide(), "1-q1", "ok", T - 20 * JOUR);
    etat = repond(etat, "1-q2", "ok", T - 2 * JOUR);
    etat = repond(etat, "quiz:A1", "ko", T);
    etat = seances(etat, "2026-10-20", "2026-11-02", "2026-11-13", "2026-11-13");
    expect(m.bilanDepuis(ctx(etat), [1, 2], "2026-11-01")).toEqual({ debut: "2026-11-01", seances: 2, questions: 2, notionsAvant: 1, notionsMaintenant: 2, notionsTotal: 3 });
    expect(m.bilanDepuis(ctx(etat), [1, 2], "2026-09-01")).toMatchObject({ seances: 3, questions: 3, notionsAvant: 0, notionsMaintenant: 2 });
    expect(m.bilanDepuis(ctx(etat), [1, 2], "2026-12-01")).toMatchObject({ seances: 0, questions: 0, notionsAvant: 2, notionsMaintenant: 2 });
    expect(m.bilanDepuis(ctx(etat), [], "2026-11-01")).toMatchObject({ notionsAvant: 0, notionsMaintenant: 0, notionsTotal: 0 });
  });
});

// ---- propriétés, sur le sommaire du prototype ----
const lis = (nom: string) => JSON.parse(readFileSync(new URL(`../../reference/prototype/site/data/${nom}`, import.meta.url), "utf8"));
const grand = m.indexeSommaire({ fiches: lis("fiches.json").fiches, quiz: lis("quiz.json") });
const NUMS = grand.fiches.map((f) => f.num);
const CLES = [...grand.fiches.flatMap((f) => f.items.map((i) => m.cle(f.num, i.k, i.n))), ...grand.quiz.map((x) => m.cleQuiz(x.id))];
const instant = fc.integer({ min: Date.parse("2026-09-01T06:00:00Z"), max: Date.parse("2027-06-17T20:00:00Z") });
const resultat = fc.constantFrom<Resultat>("ok", "partiel", "ko");

const eleve = fc.record({
  reponses: fc.array(fc.record({ k: fc.constantFrom(...CLES), r: resultat, t: instant }), { maxLength: 50 }),
  vus: fc.uniqueArray(fc.constantFrom(...NUMS), { maxLength: 5 }),
  objectif: fc.constantFrom(10, 14, 18),
  jours: fc.array(fc.integer({ min: 0, max: 60 }), { maxLength: 40 }),
  maintenant: instant,
}).map(({ reponses, vus, objectif, jours, maintenant }) => {
  let etat = vide();
  etat.profil.objectif = objectif;
  for (const v of vus) etat.vuEnClasse[v] = true;
  for (const x of reponses.filter((r) => r.t <= maintenant).sort((a, b) => a.t - b.t)) etat = m.enregistre(ctx(etat, x.t, grand), x.k, x.r);
  const auj = jourDeParis(new Date(maintenant));
  etat.seances = jours.map((n) => ({ date: ajouteJours(auj, -n), minutes: 25 }));
  return ctx(etat, maintenant, grand);
});

describe("propriétés du suivi", () => {
  it("la séance du jour : ce qui reste à revoir vient de la séance, et une séance finie n'a plus rien à faire", () => {
    fc.assert(fc.property(eleve, fc.boolean(), (c, avecRevoir) => {
      const s = m.seanceDuJour(c);
      const a = m.avancementSeance(c, avecRevoir);
      for (const id of a.quiz) expect(s.revoir).toContain(m.cleQuiz(id));
      for (const k of a.questions) expect(s.revoir).toContain(k);
      expect(a.quiz.length + a.questions.length).toBeLessThanOrEqual(a.totalRevoir);
      if (a.etape === 0) expect(a.quiz.length + a.questions.length).toBeGreaterThan(0);
      if (a.etape === 1) expect(a.exerciceFait).toBe(false);
      if (a.etape === 2) expect(a.quiz.length + a.questions.length === 0 && (a.exerciceFait || a.exercice === null)).toBe(true);
    }));
  });
  it("répondre à tout ce que demande la séance la termine", () => {
    fc.assert(fc.property(eleve, resultat, (c, r) => {
      const s = m.seanceDuJour(c);
      let etat: Etat = { ...c.etat, seance: s };
      for (const k of [...s.revoir, ...(s.exercice ? [s.exercice] : [])]) etat = m.enregistre({ ...c, etat }, k, r);
      expect(m.avancementSeance({ ...c, etat }).etape).toBe(2);
    }));
  });
  it("un plan de DS : chaque question du plan a son étape, sans doublon, et le DS blanc précède sa correction", () => {
    fc.assert(fc.property(eleve, fc.uniqueArray(fc.constantFrom(...NUMS), { minLength: 1, maxLength: 3 }), fc.integer({ min: 0, max: 30 }), fc.constantFrom(1, 2, 4), (c, fiches, dans, duree) => {
      const plan = m.construitPlan(c, { id: "p", date: ajouteJours(m.jourCourant(c), dans), duree, fiches, objectif: c.etat.profil.objectif as number });
      for (const s of plan.seances) {
        const etapes = m.etapesDeSeance(s);
        expect(new Set(etapes.map((e) => e.id)).size).toBe(etapes.length);
        const refs = s.taches.flatMap((t) => (t.type === "questions" || t.type === "ds-blanc" ? t.refs : t.type === "exercice" ? [t.ref] : []));
        expect(etapes.filter((e) => e.type === "item").map((e) => (e as { ref: string }).ref).sort()).toEqual([...new Set(refs)].sort());
        const rangBlanc = etapes.findIndex((e) => e.type === "blanc");
        if (rangBlanc >= 0) expect(etapes.every((e, i) => !(e.type === "item" && e.blanc) || i > rangBlanc)).toBe(true);
      }
    }));
  });
  it("un plan de DS : faire chaque étape dans l'ordre termine la séance, pas avant", () => {
    fc.assert(fc.property(eleve, fc.uniqueArray(fc.constantFrom(...NUMS), { minLength: 1, maxLength: 2 }), fc.integer({ min: 0, max: 20 }), resultat, (c, fiches, dans, r) => {
      const plan = m.construitPlan(c, { id: "p", date: ajouteJours(m.jourCourant(c), dans), duree: 2, fiches, objectif: 14 });
      const depuis = c.maintenant;
      for (const s0 of plan.seances) {
        let s: SeancePlan = s0;
        let etat = c.etat;
        const etapes = m.etapesDeSeance(s);
        etapes.forEach((e, i) => {
          const ici = { ...c, etat };
          expect(m.seancePlanFaite(ici, depuis, s)).toBe(false);
          expect(m.prochaineEtape(ici, depuis, s)).toBe(i);
          if (e.type === "item") etat = m.enregistre({ ...c, etat }, e.ref, r);
          else if (e.type === "quiz") for (const id of e.ids) etat = m.enregistre({ ...c, etat }, m.cleQuiz(id), r);
          else s = { ...s, lues: [...(s.lues ?? []), e.id] };
        });
        expect(m.prochaineEtape({ ...c, etat }, depuis, s)).toBe(-1);
        expect(m.seancePlanFaite({ ...c, etat }, depuis, s)).toBe(etapes.length > 0);
      }
    }));
  });
  it("séries : le record borne la série en cours, le total borne le record, et finir la séance du jour ne fait jamais baisser la série", () => {
    fc.assert(fc.property(eleve, (c) => {
      const s = m.series(c);
      expect(s.jours).toBeLessThanOrEqual(s.record);
      expect(s.record).toBeLessThanOrEqual(s.total);
      expect(s.semaines).toBeGreaterThanOrEqual(0);
      const apres = m.series({ ...c, etat: m.marqueSeanceFaite(c) });
      expect(apres.jours).toBeGreaterThanOrEqual(Math.max(1, s.jours));
      expect(apres.semaines).toBeGreaterThanOrEqual(s.semaines);
      expect(apres.total).toBeGreaterThanOrEqual(s.total);
    }));
  });
  it("progrès : les semaines se suivent, rien n'est compté deux fois, les taux restent entre 0 et 1", () => {
    fc.assert(fc.property(eleve, fc.integer({ min: 1, max: 12 }), (c, n) => {
      const semaines = m.travailParSemaine(c, n);
      expect(semaines.length).toBe(n);
      semaines.forEach((s, i) => { if (i) expect(s.lundi).toBe(ajouteJours(semaines[i - 1].lundi, 7)); });
      expect(semaines[n - 1].lundi).toBe(m.lundi(m.jourCourant(c)));
      const toutes = Object.values(c.etat.tentatives).reduce((a, l) => a + l.length, 0);
      expect(semaines.reduce((a, s) => a + s.questions, 0)).toBeLessThanOrEqual(toutes);
      for (const r of m.reussiteParNiveau(c, NUMS)) {
        expect(r.faits).toBeLessThanOrEqual(r.total);
        expect(r.taux).toBeGreaterThanOrEqual(0);
        expect(r.taux).toBeLessThanOrEqual(1);
      }
      const demain = m.bilanDepuis(c, NUMS, ajouteJours(m.jourCourant(c), 1));
      expect(demain).toMatchObject({ seances: 0, questions: 0 });
      expect(demain.notionsAvant).toBe(demain.notionsMaintenant);
      expect(demain.notionsMaintenant).toBeLessThanOrEqual(demain.notionsTotal);
      const toujours = m.bilanDepuis(c, NUMS, "2000-01-01");
      expect(toujours.notionsAvant).toBe(0);
      expect(toujours.questions).toBe(toutes);
      expect(toujours.seances).toBe(m.series(c).total);
    }));
  });
});
