// Cas limites du moteur, sur un petit sommaire fabriqué pour le test : chapitre sans exercice,
// chapitre sans question, niveau 18 atteint, profil sans objectif.
import { describe, expect, it } from "vitest";
import * as m from "@/lib/moteur";
import type { Contexte, Etat, ItemSommaire, Resultat } from "@/lib/moteur";

const q = (n: number, niveau: number, demande = ""): ItemSommaire => ({ k: "q", n, niveau, type: "Cours", demande });
const sommaire = m.indexeSommaire({
  fiches: [
    // chapitre 1 : des questions aux trois niveaux, pas d'exercice, une seule question de quiz
    { num: 1, items: [q(1, 10), q(2, 10), q(3, 10), q(4, 14), q(5, 14), q(6, 14), q(7, 18), q(8, 18), q(9, 18)], liste_notions: [{ id: "n1", refs: [["q", 1]] }] },
    // chapitre 2 : un exercice sans durée, aucune question
    { num: 2, items: [{ k: "ex", n: 1, niveau: 10, type: "BAC" }], liste_notions: [] },
    // chapitre 3 : vide
    { num: 3, items: [], liste_notions: [] },
  ],
  quiz: [{ id: "A1", fiche: 1, niveau: 10 }, { id: "A2", fiche: 1, niveau: 14 }, { id: "A3", fiche: 1, niveau: 18 }],
});
const T = Date.parse("2026-11-13T17:00:00Z");
const vide = (): Etat => ({ profil: {}, vuEnClasse: {}, tentatives: {}, carnet: {}, passages: {}, ds: [], seances: [], seance: null });
const ctx = (etat: Etat, maintenant = T): Contexte => ({ etat, sommaire, maintenant, reglages: m.REGLAGES_PROTOTYPE });
const repond = (etat: Etat, cles: string[], r: Resultat = "ok") => cles.reduce((e, k) => m.enregistre(ctx(e), k, r), etat);
const toutes = (niveaux: number[]) => sommaire.fiches[0].items.filter((i) => niveaux.includes(i.niveau)).map((i) => m.cle(1, "q", i.n));

describe("niveaux", () => {
  it("monte de 10 à 14 puis 18 avec les tests de passage, et n'a plus de niveau suivant après 18", () => {
    let etat = repond(vide(), toutes([10, 14, 18]));
    expect(m.niveauFiche(ctx(etat), 1)).toMatchObject({ atteint: 10, prochain: 14, testDispo: true });
    etat.passages["1"] = { "14": T };
    expect(m.niveauFiche(ctx(etat), 1)).toMatchObject({ atteint: 14, prochain: 18, testDispo: true });
    etat = { ...etat, passages: { "1": { "14": T, "18": T } } };
    expect(m.niveauFiche(ctx(etat), 1)).toMatchObject({ atteint: 18, prochain: null, testDispo: false });
  });
  it("ne propose pas de test de passage à un chapitre qui a moins de 3 questions de quiz", () => {
    const court = m.indexeSommaire({ fiches: sommaire.fiches, quiz: sommaire.quiz.slice(0, 2) });
    const etat = repond(vide(), toutes([10, 14]));
    expect(m.niveauFiche({ ...ctx(etat), sommaire: court }, 1).testDispo).toBe(false);
  });
  it("un passage de niveau 14 ne suffit pas si le niveau 10 n'est pas atteint", () => {
    const etat = repond(vide(), toutes([14]));
    etat.passages["1"] = { "14": T };
    expect(m.niveauFiche(ctx(etat), 1).atteint).toBe(0);
  });
});

describe("plan d'un DS sans exercice ou sans quiz", () => {
  it("remplace l'exercice type par des questions quand le chapitre n'a pas d'exercice", () => {
    const trois = m.construitPlan(ctx(vide()), { id: "d", date: "2026-11-16", duree: 1, fiches: [1], objectif: 14 });
    expect(trois.seances[2].taches[0]).toMatchObject({ type: "questions" });
    const semaine = m.construitPlan(ctx(vide()), { id: "d", date: "2026-11-23", duree: 1, fiches: [1], objectif: 18 });
    expect(semaine.seances[3]).toMatchObject({ titre: "Exercice type BAC", minutes: 40 });
    expect(semaine.seances[3].taches[0]).toMatchObject({ type: "questions" });
    expect(semaine.seances[2].taches[0]).toMatchObject({ type: "questions", refs: ["1-q4", "1-q5", "1-q6", "1-q7"] });
  });
  it("annonce « 1 question » au singulier, et se passe de quiz quand il n'y en a pas", () => {
    const un = m.indexeSommaire({ fiches: sommaire.fiches, quiz: sommaire.quiz.slice(0, 1) });
    const plan = m.construitPlan({ ...ctx(vide()), sommaire: un }, { id: "d", date: "2026-11-16", duree: 1, fiches: [1], objectif: 10 });
    expect(plan.seances[0].titre).toBe("Test de 1 question");
    const sans = m.construitPlan(ctx(vide()), { id: "d", date: "2026-11-23", duree: 2, fiches: [2], objectif: 10 });
    expect(sans.seances[0].titre).toBe("Le cours en une page");
    expect(sans.seances[3]).toMatchObject({ minutes: 40 });
    expect(sans.seances[3].taches[0]).toMatchObject({ type: "exercice", ref: "2-ex1" });
    expect(sans.seances[5].taches[0]).toMatchObject({ type: "ds-blanc", minutes: 120, refs: [] });
  });
  it("respecte un format imposé par le devoir", () => {
    const plan = m.construitPlan(ctx(vide()), { id: "d", date: "2026-12-13", duree: 1, fiches: [1], objectif: 10, format: "express" });
    expect(plan.format).toBe("express");
  });
});

describe("séance du jour", () => {
  it("prend l'objectif 14 quand le profil n'en a pas, et le chapitre 1 quand rien n'est coché", () => {
    const s = m.seanceDuJour(ctx(vide()));
    expect(s).toMatchObject({ raison: "defaut", exercice: "1-q1", dsId: null });
  });
  it("retombe sur la première question quand tout est réussi", () => {
    const etat = repond({ ...vide(), profil: { objectif: 18 }, vuEnClasse: { 1: true } }, toutes([10, 14, 18]));
    etat.passages["1"] = { "14": T, "18": T };
    expect(m.seanceDuJour(ctx(etat)).exercice).toBe("1-q1");
  });
  it("n'a pas d'exercice quand le chapitre visé n'a aucune question", () => {
    const s = m.seanceDuJour(ctx({ ...vide(), vuEnClasse: { 3: true, 99: true, 2: false } }));
    expect(s).toMatchObject({ raison: "classe", exercice: null, revoir: [] });
    expect(m.chapitresVus(ctx({ ...vide(), vuEnClasse: { 3: true, 99: true, 2: false, 1: true } }))).toEqual([1, 3]);
  });
  it("suit les chapitres du DS proche, pas ceux d'un DS lointain", () => {
    const ds = (date: string) => ({ ...vide(), vuEnClasse: { 1: true }, ds: [{ id: "x", date, duree: 1, fiches: [2], objectif: 14 }] });
    expect(m.seanceDuJour(ctx(ds("2026-11-20")))).toMatchObject({ raison: "ds", dsId: "x", exercice: null });
    expect(m.seanceDuJour(ctx(ds("2026-11-21")))).toMatchObject({ raison: "classe", exercice: "1-q1" });
  });
});

describe("DS et note", () => {
  it("distingue le prochain DS des DS passés sans note", () => {
    const etat = { ...vide(), ds: [
      { id: "passe", date: "2026-11-10", duree: 1, fiches: [1], objectif: 14, note: null },
      { id: "note", date: "2026-11-11", duree: 1, fiches: [1], objectif: 14, note: 12 },
      { id: "loin", date: "2026-12-01", duree: 1, fiches: [1], objectif: 14 },
      { id: "auj", date: "2026-11-13", duree: 1, fiches: [1], objectif: 14 },
    ] };
    expect(m.prochainDS(ctx(etat))?.id).toBe("auj");
    expect(m.dsANoter(ctx(etat)).map((d) => d.id)).toEqual(["passe"]);
    expect(m.prochainDS(ctx(vide()))).toBeNull();
  });
  it("sans chapitre tenté, la note estimée est la moyenne des trois derniers DS", () => {
    const etat = { ...vide(), ds: [8, 10, 12, 14].map((note, i) => ({ id: `d${i}`, date: `2026-10-0${i + 1}`, duree: 1, fiches: [1], objectif: 14, note })) };
    expect(m.noteEstimee(ctx(etat))).toEqual({ valeur: 12, bas: 9, haut: 15, chapitres: 0, essais: 0, notes: 3 });
  });
  it("une notion réussie deux fois à une semaine d'écart devient solide", () => {
    const notion = sommaire.fiches[0].liste_notions[0];
    let etat = m.enregistre(ctx(vide(), T), "1-q1", "ok");
    expect(m.etatNotion(ctx(etat), 1, notion)).toBe("acquis");
    etat = m.enregistre(ctx(etat, T + 7 * 86_400_000), "1-q1", "ok");
    expect(m.etatNotion(ctx(etat), 1, notion)).toBe("solide");
    etat = m.enregistre(ctx(etat, T + 8 * 86_400_000), "1-q1", "ko");
    expect(m.etatNotion(ctx(etat), 1, notion)).toBe("en-cours");
    expect(m.etatNotion(ctx(vide()), 1, notion)).toBe("a-voir");
  });
});
