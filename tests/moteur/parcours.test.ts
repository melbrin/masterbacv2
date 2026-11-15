// Test de calibrage et parcours (lib/moteur/parcours.ts), plan de DS réparti entre les chapitres (décision 0008).
import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import * as m from "@/lib/moteur";
import type { Contexte, Etat, ItemSommaire, Resultat, Suivi } from "@/lib/moteur";
import { ajouteJours, jourDeParis } from "@/lib/commun/dates";

const q = (n: number, niveau: number, demande = ""): ItemSommaire => ({ k: "q", n, niveau, type: "Cours", demande });
const ex = (n: number, niveau: number, duree: number): ItemSommaire => ({ k: "ex", n, niveau, type: "BAC", duree });
const petit = m.indexeSommaire({
  fiches: [
    { num: 1, items: [q(1, 10), q(2, 10), q(3, 10), q(4, 14), q(5, 14), q(6, 14), q(7, 18), ex(1, 10, 30), ex(2, 14, 40)], liste_notions: [] },
    { num: 2, items: [q(1, 10), q(2, 10), q(3, 10), q(4, 14), q(5, 14), q(6, 18), ex(1, 10, 35), ex(2, 14, 45)], liste_notions: [] },
    { num: 3, items: [q(1, 10), q(2, 10), q(3, 14), q(4, 14), q(5, 18), ex(1, 14, 40)], liste_notions: [] },
    { num: 4, items: [q(1, 10)], liste_notions: [] },
  ],
  quiz: [
    { id: "A10", fiche: 1, niveau: 10 }, { id: "A10b", fiche: 1, niveau: 10 }, { id: "A14", fiche: 1, niveau: 14 }, { id: "A18", fiche: 1, niveau: 18 },
    { id: "B10", fiche: 2, niveau: 10 }, { id: "B14", fiche: 2, niveau: 14 },
    { id: "C14", fiche: 3, niveau: 14 }, { id: "C14b", fiche: 3, niveau: 14 }, { id: "C18", fiche: 3, niveau: 18 },
  ],
});
// le sommaire des vraies fiches, tel que le prototype le fige
const lis = (nom: string) => JSON.parse(readFileSync(new URL(`../../reference/prototype/site/data/${nom}`, import.meta.url), "utf8"));
const grand = m.indexeSommaire({ fiches: lis("fiches.json").fiches, quiz: lis("quiz.json") });
// vendredi 13 novembre 2026, 18 h à Paris
const T = Date.parse("2026-11-13T17:00:00Z");
const JOUR = 86_400_000;
const AUJ = jourDeParis(new Date(T));
const vide = (): Etat => ({ profil: { objectif: 14 }, vuEnClasse: {}, tentatives: {}, carnet: {}, passages: {}, ds: [], seances: [], seance: null });
const ctx = (etat: Etat, maintenant = T, sommaire = petit, reglages = m.REGLAGES_ACTUELS): Contexte => ({ etat, sommaire, maintenant, reglages });
const repond = (etat: Etat, k: string, r: Resultat = "ok", quand = T) => m.enregistre(ctx(etat, quand), k, r);
const vus = (etat: Etat, ...fiches: number[]): Etat => ({ ...etat, vuEnClasse: Object.fromEntries(fiches.map((f) => [String(f), true])) });
const sansSuivi: Suivi = { dernierCalibrage: T - JOUR, seanceDs: null };

describe("questions du test de calibrage", () => {
  it("donne une question d'objectif 10 par chapitre, puis 14, puis 18", () => {
    const ids = m.questionsCalibrage(ctx(vide()), [1, 2, 3], 7);
    const niveau = (id: string) => petit.quiz.find((x) => x.id === id)?.niveau;
    const fiche = (id: string) => petit.quiz.find((x) => x.id === id)?.fiche;
    expect(ids).toHaveLength(8);
    expect(ids.slice(0, 3).map(fiche)).toEqual([1, 2, 3]);
    expect(ids.slice(0, 2).map(niveau)).toEqual([10, 10]);
    // le chapitre 3 n'a pas de question d'objectif 10 : il donne la plus proche
    expect(niveau(ids[2])).toBe(14);
    expect(new Set(ids).size).toBe(ids.length);
    // le chapitre 2 n'a que deux questions : il n'en donne pas une troisième
    expect(ids.filter((id) => fiche(id) === 2)).toHaveLength(2);
  });
  it("écarte les chapitres sans question et ne compte pas deux fois un chapitre", () => {
    expect(m.questionsCalibrage(ctx(vide()), [4], 7)).toEqual([]);
    expect(m.questionsCalibrage(ctx(vide()), [2, 2, 4], 7).sort()).toEqual(["B10", "B14"]);
  });
  it("ne dépasse pas le nombre de questions permis", () => {
    const court = { ...m.REGLAGES_ACTUELS, questionsCalibrage: 4 };
    expect(m.questionsCalibrage(ctx(vide(), T, petit, court), [1, 2, 3], 7)).toHaveLength(4);
  });
  it("propose d'abord une question jamais faite", () => {
    const etat = repond(vide(), "quiz:A10", "ok");
    for (const graine of [1, 2, 3, 4, 5, 6]) expect(m.questionsCalibrage(ctx(etat), [1], graine)[0]).toBe("A10b");
    const rate = repond(repond(vide(), "quiz:A10", "ko"), "quiz:A10b", "ok");
    for (const graine of [1, 2, 3, 4, 5, 6]) expect(m.questionsCalibrage(ctx(rate), [1], graine)[0]).toBe("A10");
  });
});

describe("bilan du test de calibrage", () => {
  const rep = (ids: Record<string, boolean>) => Object.entries(ids).map(([id, juste]) => ({ id, juste }));
  it("compte par objectif et par chapitre", () => {
    const b = m.bilanCalibrage(petit, rep({ A10: true, B10: true, A14: false, B14: true, A18: false, inconnue: true }), m.REGLAGES_ACTUELS);
    expect(b).toMatchObject({ total: 5, bonnes: 3 });
    expect(b.niveaux).toEqual([{ niveau: 10, total: 2, bonnes: 2 }, { niveau: 14, total: 2, bonnes: 1 }, { niveau: 18, total: 1, bonnes: 0 }]);
    expect(b.chapitres).toEqual([{ fiche: 1, total: 3, bonnes: 1 }, { fiche: 2, total: 2, bonnes: 2 }]);
  });
  it("conseille de viser d'abord le premier objectif qui n'est pas tenu à 70 %", () => {
    const d = (ids: Record<string, boolean>) => m.bilanCalibrage(petit, rep(ids), m.REGLAGES_ACTUELS).depart;
    expect(d({ A10: false, B10: true, A14: true })).toBe(10);
    expect(d({ A10: true, B10: true, A14: false, B14: true })).toBe(14);
    expect(d({ A10: true, A14: true, A18: false })).toBe(18);
    expect(d({ A10: true, A14: true, A18: true })).toBe(18);
    // sans question d'un objectif, on y reste
    expect(d({})).toBe(10);
    expect(d({ A10: true })).toBe(14);
  });
});

describe("parcours", () => {
  it("un nouvel élève : le calibrage d'abord, puis cocher ses chapitres, puis la séance du jour", () => {
    const p = m.parcours(ctx(vide()), { dernierCalibrage: null, seanceDs: null });
    expect(p.etapes.map((e) => e.type)).toEqual(["calibrage", "chapitres", "seance"]);
    expect(p.etapes[0]).toEqual({ type: "calibrage", raison: "jamais" });
    expect(p).toMatchObject({ vise: 14, palier: 10, chapitres: [], alertes: [] });
    expect(p.paliers).toEqual([{ niveau: 10, atteints: 0, total: 0 }, { niveau: 14, atteints: 0, total: 0 }]);
  });
  it("donne un objectif par chapitre vu, sans dépasser la note visée, le moins avancé d'abord", () => {
    let etat = vus(vide(), 1, 2);
    for (const k of ["1-q1", "1-q2", "1-q3", "quiz:A10", "quiz:A10b"]) etat = repond(etat, k);
    const p = m.parcours(ctx(etat), sansSuivi);
    expect(p.chapitres.map((c) => [c.fiche, c.atteint, c.prochain])).toEqual([[1, 10, 14], [2, 0, 10]]);
    expect(p.paliers).toEqual([{ niveau: 10, atteints: 1, total: 2 }, { niveau: 14, atteints: 0, total: 2 }]);
    expect(p.palier).toBe(10);
    expect(p.etapes.filter((e) => e.type === "objectif")).toEqual([
      { type: "objectif", fiche: 2, niveau: 10, faits: 0, total: 4, taux: 0 },
      { type: "objectif", fiche: 1, niveau: 14, faits: 0, total: 4, taux: 0 },
    ]);
    // viser 10 : le chapitre 1 n'a plus d'objectif à atteindre
    const dix = m.parcours(ctx({ ...etat, profil: { objectif: 10 } }), sansSuivi);
    expect(dix.chapitres.map((c) => c.prochain)).toEqual([null, 10]);
    expect(dix.paliers).toEqual([{ niveau: 10, atteints: 1, total: 2 }]);
  });
  it("met le chapitre du prochain devoir et sa séance en tête", () => {
    const etat: Etat = { ...vus(vide(), 1, 2), ds: [{ id: "d1", date: ajouteJours(AUJ, 3), duree: 2, fiches: [2], objectif: 14 }] };
    const suivi: Suivi = { dernierCalibrage: T, seanceDs: { id: "d1", seance: "s2", titre: "Exercices ciblés", date: AUJ } };
    const p = m.parcours(ctx(etat), suivi);
    expect(p.etapes[0]).toEqual({ type: "ds", id: "d1", seance: "s2", titre: "Exercices ciblés", jours: 3 });
    expect(p.chapitres.find((c) => c.fiche === 2)?.dansDs).toBe(true);
    expect(p.etapes.filter((e) => e.type === "objectif")[0]).toMatchObject({ fiche: 2 });
    // une séance prévue plus tard, pour un devoir encore loin, n'est pas encore une étape
    const loin: Etat = { ...etat, ds: [{ id: "d1", date: ajouteJours(AUJ, 20), duree: 2, fiches: [2], objectif: 14 }] };
    expect(m.parcours(ctx(loin), { ...suivi, seanceDs: { ...suivi.seanceDs!, date: ajouteJours(AUJ, 13) } }).etapes.some((e) => e.type === "ds")).toBe(false);
    // la séance d'un autre devoir que le prochain ne compte pas
    expect(m.parcours(ctx(etat), { ...suivi, seanceDs: { ...suivi.seanceDs!, id: "autre" } }).etapes.some((e) => e.type === "ds")).toBe(false);
  });
  it("propose le carnet, le test de passage, et retire la séance du jour quand elle est faite", () => {
    let etat = vus(vide(), 1);
    for (const k of ["1-q1", "1-q2", "1-q3", "quiz:A10", "quiz:A10b", "1-q4", "1-q5", "1-q6", "quiz:A14"]) etat = repond(etat, k);
    etat = repond(etat, "1-q7", "ko", T - 3 * JOUR);
    etat = { ...etat, seances: [{ date: AUJ, minutes: 25 }] };
    const p = m.parcours(ctx(etat), sansSuivi);
    expect(p.etapes.map((e) => e.type)).toEqual(["carnet", "passage"]);
    expect(p.etapes[0]).toEqual({ type: "carnet", nombre: 1 });
    expect(p.etapes[1]).toEqual({ type: "passage", fiche: 1, niveau: 14 });
  });
  it("propose de refaire le calibrage au bout de trente jours", () => {
    const etat = { ...vus(vide(), 1), seances: [{ date: AUJ, minutes: 25 }] };
    expect(m.parcours(ctx(etat), { dernierCalibrage: T - 29 * JOUR, seanceDs: null }).etapes.some((e) => e.type === "calibrage")).toBe(false);
    expect(m.parcours(ctx(etat), { dernierCalibrage: T - 30 * JOUR, seanceDs: null }).etapes.at(-1)).toEqual({ type: "calibrage", raison: "ancien" });
  });
  it("signale une pause après quatre jours sans séance, et pas avant", () => {
    const il = (n: number) => ({ ...vus(vide(), 1), seances: [{ date: ajouteJours(AUJ, -n), minutes: 25 }] });
    expect(m.parcours(ctx(il(3)), sansSuivi).alertes.some((a) => a.type === "pause")).toBe(false);
    expect(m.parcours(ctx(il(4)), sansSuivi).alertes[0]).toEqual({ type: "pause", jours: 4 });
    // un élève qui n'a jamais fait de séance n'est pas « en pause »
    expect(m.parcours(ctx(vus(vide(), 1)), sansSuivi).alertes.some((a) => a.type === "pause")).toBe(false);
  });
  it("prévient quand le rythme de la semaine demande une séance chaque jour qui reste", () => {
    // vendredi : il reste vendredi, samedi, dimanche. Viser 14 : quatre séances par semaine.
    const avec = (...jours: string[]) => ({ ...vus(vide(), 1), seances: jours.map((date) => ({ date, minutes: 25 })) });
    expect(m.parcours(ctx(avec("2026-11-09", "2026-11-10")), sansSuivi).alertes.some((a) => a.type === "rythme")).toBe(false);
    expect(m.parcours(ctx(avec("2026-11-12")), sansSuivi).alertes).toContainEqual({ type: "rythme", reste: 3, joursRestants: 3 });
    // la séance du jour est faite : il ne reste que samedi et dimanche pour deux séances
    expect(m.parcours(ctx(avec("2026-11-12", "2026-11-13")), sansSuivi).alertes).toContainEqual({ type: "rythme", reste: 2, joursRestants: 2 });
    expect(m.parcours(ctx(avec("2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12")), sansSuivi).alertes.some((a) => a.type === "rythme")).toBe(false);
  });
  it("signale l'objectif le plus fragile, à partir de trois questions travaillées", () => {
    let etat = vus(vide(), 1, 2);
    etat = repond(repond(etat, "1-q1", "ko"), "1-q2", "ko");
    expect(m.parcours(ctx(etat), sansSuivi).alertes.some((a) => a.type === "fragile")).toBe(false);
    etat = repond(etat, "1-q3", "ok");
    for (const k of ["2-q1", "2-q2", "2-q3"]) etat = repond(etat, k, "ko");
    const a = m.parcours(ctx(etat), sansSuivi).alertes.find((x) => x.type === "fragile");
    expect(a).toEqual({ type: "fragile", fiche: 2, niveau: 10, taux: 0 });
  });
  it("félicite un test de passage réussi dans la semaine, et la note visée atteinte partout", () => {
    let etat = vus(vide(), 1);
    for (const k of ["1-q1", "1-q2", "1-q3", "quiz:A10", "quiz:A10b", "1-q4", "1-q5", "1-q6", "quiz:A14"]) etat = repond(etat, k);
    etat = { ...etat, passages: { "1": { "14": T - 2 * JOUR } } };
    const p = m.parcours(ctx(etat), sansSuivi);
    expect(p.alertes).toContainEqual({ type: "bravo", fiche: 1, niveau: 14 });
    expect(p.alertes).toContainEqual({ type: "but" });
    expect(p).toMatchObject({ palier: null, chapitres: [{ fiche: 1, atteint: 14, prochain: null }] });
    expect(p.etapes.some((e) => e.type === "objectif" || e.type === "passage")).toBe(false);
    const ancien = { ...etat, passages: { "1": { "14": T - 9 * JOUR } } };
    expect(m.parcours(ctx(ancien), sansSuivi).alertes.some((a) => a.type === "bravo")).toBe(false);
  });
  it("prend l'objectif par défaut quand le profil n'en a pas", () => {
    expect(m.parcours(ctx({ ...vide(), profil: {} }), sansSuivi).vise).toBe(14);
  });
});

describe("l'entraînement dans le parcours (décision 0015)", () => {
  // le labo du petit sommaire : deux simulations au chapitre 1, une au chapitre 2 ; trois défis chacune, un par objectif
  const defis = (simulation: string, fiche: number, etoiles: (number | null)[] = [null, null, null]): m.DefiSuivi[] =>
    [10, 14, 18].map((niveau, i) => ({ id: `${simulation}-${i + 1}`, simulation, rang: i + 1, fiche, niveau, etoiles: etoiles[i] }));
  const tp = (id: string, fiche: number, fini = false, reprise: string | null = null): m.TpSuivi => ({ id, fiche, fini, reprise });
  const avec = (entrainement: NonNullable<Suivi["entrainement"]>): Suivi => ({ ...sansSuivi, entrainement });
  const pratique = (p: m.Parcours) => p.etapes.filter((e) => e.type === "defi" || e.type === "tp");
  // le chapitre 1 a atteint l'objectif 10 et travaille le 14 ; le chapitre 2 commence
  const lance = () => {
    let etat = vus(vide(), 1, 2);
    for (const k of ["1-q1", "1-q2", "1-q3", "quiz:A10", "quiz:A10b"]) etat = repond(etat, k);
    return etat;
  };

  it("sans entraînement, le parcours ne propose ni défi ni TP", () => {
    expect(pratique(m.parcours(ctx(lance()), sansSuivi))).toEqual([]);
    expect(pratique(m.parcours(ctx(lance()), avec({ defis: [], tp: [] })))).toEqual([]);
  });
  it("après l'objectif d'un chapitre, propose son défi du labo puis son TP", () => {
    const p = m.parcours(ctx(lance()), avec({ defis: [...defis("basket", 1), ...defis("ph", 2)], tp: [tp("chute", 1), tp("dilution", 2)] }));
    expect(p.etapes.filter((e) => e.type !== "seance").map((e) => [e.type, (e as { fiche: number }).fiche])).toEqual([
      ["objectif", 2], ["defi", 2], ["tp", 2], ["objectif", 1], ["defi", 1], ["tp", 1],
    ]);
    expect(pratique(p)[0]).toEqual({ type: "defi", fiche: 2, simulation: "ph", defi: "ph-1", rang: 1, niveau: 10 });
    expect(pratique(p)[1]).toEqual({ type: "tp", fiche: 2, tp: "dilution", reprise: null });
  });
  it("un défi ne dépasse pas l'objectif que l'élève travaille sur le chapitre", () => {
    // chapitre 2 : objectif 10 en cours, le défi d'objectif 10 est réussi, celui d'objectif 14 attend
    const p = m.parcours(ctx(lance()), avec({ defis: [...defis("basket", 1, [3, null, null]), ...defis("ph", 2, [2, null, null])], tp: [] }));
    expect(pratique(p)).toEqual([{ type: "defi", fiche: 1, simulation: "basket", defi: "basket-2", rang: 2, niveau: 14 }]);
    // viser 10 : le chapitre 1 a atteint la note visée, ses défis d'objectif 14 ne sont pas proposés
    const dix = m.parcours(ctx({ ...lance(), profil: { objectif: 10 } }), avec({ defis: defis("basket", 1, [3, null, null]), tp: [] }));
    expect(pratique(dix)).toEqual([]);
  });
  it("là où la note visée est atteinte, l'entraînement continue, après les autres chapitres", () => {
    const etat = { ...lance(), profil: { objectif: 10 } };
    const p = m.parcours(ctx(etat), avec({ defis: [...defis("basket", 1), ...defis("ph", 2)], tp: [tp("chute", 1)] }));
    expect(p.chapitres.map((c) => c.prochain)).toEqual([null, 10]);
    expect(pratique(p).map((e) => [e.type, e.fiche])).toEqual([["defi", 2], ["defi", 1], ["tp", 1]]);
    expect(pratique(p)[1]).toMatchObject({ defi: "basket-1", niveau: 10 });
  });
  it("avec deux simulations, prend le défi du plus petit objectif ; à objectif égal, la première du labo", () => {
    const deux = (a: (number | null)[], b: (number | null)[]) => pratique(m.parcours(ctx(lance()), avec({ defis: [...defis("basket", 1, a), ...defis("largage", 1, b)], tp: [] })));
    expect(deux([null, null, null], [null, null, null])[0]).toMatchObject({ defi: "basket-1" });
    expect(deux([3, null, null], [null, null, null])[0]).toMatchObject({ defi: "largage-1", niveau: 10 });
    expect(deux([3, null, null], [1, null, null])[0]).toMatchObject({ defi: "basket-2", niveau: 14 });
    // tout ce qui reste dépasse l'objectif 14 du chapitre
    expect(deux([3, 3, null], [1, 2, null])).toEqual([]);
    expect(deux([3, 3, 3], [1, 2, 3])).toEqual([]);
  });
  it("dans une simulation, c'est le premier défi non réussi qui compte, quel que soit l'ordre de la liste", () => {
    const melanges = [...defis("basket", 1)].reverse();
    expect(pratique(m.parcours(ctx(lance()), avec({ defis: melanges, tp: [] })))[0]).toMatchObject({ defi: "basket-1", rang: 1 });
  });
  it("propose d'abord le TP laissé en route, jamais un TP terminé", () => {
    const de = (...liste: m.TpSuivi[]) => pratique(m.parcours(ctx(lance()), avec({ defis: [], tp: liste }))).filter((e) => e.fiche === 1);
    expect(de(tp("chute", 1), tp("pendule", 1))).toEqual([{ type: "tp", fiche: 1, tp: "chute", reprise: null }]);
    expect(de(tp("chute", 1), tp("pendule", 1, false, "essai-7"))).toEqual([{ type: "tp", fiche: 1, tp: "pendule", reprise: "essai-7" }]);
    expect(de(tp("chute", 1, true), tp("pendule", 1))).toEqual([{ type: "tp", fiche: 1, tp: "pendule", reprise: null }]);
    // un TP terminé puis recommencé reste terminé : le parcours ne le redemande pas
    expect(de(tp("chute", 1, true, "essai-9"))).toEqual([]);
  });
  it("ne propose rien pour un chapitre qui n'est pas vu en classe", () => {
    const p = m.parcours(ctx(lance()), avec({ defis: defis("satellite", 3), tp: [tp("archimede", 3)] }));
    expect(pratique(p)).toEqual([]);
  });
  it("un chapitre dont le test de passage est disponible garde son entraînement à sa place", () => {
    let etat = vus(vide(), 1);
    for (const k of ["1-q1", "1-q2", "1-q3", "quiz:A10", "quiz:A10b", "1-q4", "1-q5", "1-q6", "quiz:A14"]) etat = repond(etat, k);
    etat = { ...etat, seances: [{ date: AUJ, minutes: 25 }] };
    const p = m.parcours(ctx(etat), avec({ defis: defis("basket", 1), tp: [tp("chute", 1)] }));
    expect(p.etapes.map((e) => e.type)).toEqual(["passage", "defi", "tp"]);
  });
});

describe("plan d'un DS sur plusieurs chapitres (décision 0008)", () => {
  const ds = (fiches: number[], dans: number, duree = 2, objectif = 14) => ({ id: "d", date: ajouteJours(AUJ, dans), duree, fiches, objectif });
  const refsDe = (plan: ReturnType<typeof m.construitPlan>) => plan.seances.flatMap((s) => s.taches.flatMap((t) => (t.type === "questions" || t.type === "ds-blanc" ? t.refs : t.type === "exercice" ? [t.ref] : [])));
  const ficheDe = (ref: string) => m.decoupe(ref)?.fiche;

  it("un seul chapitre : le plan est celui du prototype", () => {
    for (const dans of [0, 1, 3, 6, 7, 15]) {
      expect(m.construitPlan(ctx(vide()), ds([1], dans))).toEqual(m.construitPlan(ctx(vide(), T, petit, m.REGLAGES_PROTOTYPE), ds([1], dans)));
    }
  });
  it("garde le format et le nombre de séances du prototype", () => {
    for (const dans of [1, 4, 9]) {
      const a = m.construitPlan(ctx(vide()), ds([1, 2, 3], dans));
      const b = m.construitPlan(ctx(vide(), T, petit, m.REGLAGES_PROTOTYPE), ds([1, 2, 3], dans));
      expect(a.format).toBe(b.format);
      expect(a.seances.map((s) => [s.id, s.date, s.titre])).toEqual(b.seances.map((s) => [s.id, s.date, s.titre]));
    }
  });
  it("une séance de questions en donne deux par chapitre, en passant d'un chapitre à l'autre", () => {
    const plan = m.construitPlan(ctx(vide()), ds([1, 2, 3], 9));
    const dix = plan.seances[1];
    const refs = (dix.taches[0] as { refs: string[] }).refs;
    expect(dix.titre).toBe("Questions de cours, objectif 10");
    expect(refs).toHaveLength(6);
    expect(refs.map(ficheDe)).toEqual([1, 2, 3, 1, 2, 3]);
    expect(dix.minutes).toBe(40);
    // deux chapitres : quatre questions, comme le prototype, mais deux par chapitre
    const deux = m.construitPlan(ctx(vide()), ds([1, 2], 9)).seances[1];
    expect((deux.taches[0] as { refs: string[] }).refs.map(ficheDe)).toEqual([1, 2, 1, 2]);
    expect(deux.minutes).toBe(30);
  });
  it("quand un chapitre n'a plus de question, les autres complètent", () => {
    const plan = m.construitPlan(ctx(vide()), ds([1, 4], 9, 2, 10));
    const refs = plan.seances.slice(1, 3).flatMap((s) => (s.taches[0] as { refs: string[] }).refs);
    expect(refs).toEqual(["4-q1", "1-q1", "1-q2", "1-q3"].sort((a, b) => refs.indexOf(a) - refs.indexOf(b)));
    expect(refs.filter((r) => ficheDe(r) === 4)).toEqual(["4-q1"]);
    expect(new Set(refs).size).toBe(refs.length);
  });
  it("les exercices viennent de chapitres différents, et le DS blanc garde une question par chapitre", () => {
    // sur les vraies fiches du prototype : elles ont assez de questions pour toutes les séances
    const vrai = (d: ReturnType<typeof ds>) => m.construitPlan(ctx(vide(), T, grand), d);
    const plan = vrai(ds([1, 2, 3], 9));
    const exos = refsDe(plan).filter((r) => r.includes("-ex"));
    expect(exos).toHaveLength(3);
    expect(new Set(exos.map(ficheDe)).size).toBe(3);
    const blanc = plan.seances.flatMap((s) => s.taches).find((t) => t.type === "ds-blanc") as { refs: string[] };
    expect(blanc.refs.filter((r) => r.includes("-q")).map(ficheDe).sort()).toEqual([1, 2, 3]);
    // un devoir d'une heure : un exercice et trois questions
    const court = vrai(ds([1, 2], 9, 1)).seances.flatMap((s) => s.taches).find((t) => t.type === "ds-blanc") as { refs: string[] };
    expect(court.refs.filter((r) => r.includes("-ex"))).toHaveLength(1);
    expect(court.refs.filter((r) => r.includes("-q"))).toHaveLength(3);
    // quatre chapitres ou plus : quatre questions au plus dans le DS blanc
    const large = vrai(ds([1, 2, 3, 4, 5], 9)).seances.flatMap((s) => s.taches).find((t) => t.type === "ds-blanc") as { refs: string[] };
    expect(large.refs.filter((r) => r.includes("-q"))).toHaveLength(4);
  });
  it("viser 18 ajoute une question d'objectif 18 par chapitre, trois au plus", () => {
    const plan = m.construitPlan(ctx(vide()), ds([1, 2, 3], 9, 2, 18));
    const refs = (plan.seances[2].taches[0] as { refs: string[] }).refs;
    expect(plan.seances[2].titre).toBe("Questions de cours, objectif 18");
    expect(refs.filter((r) => ["1-q7", "2-q6", "3-q5"].includes(r))).toHaveLength(3);
  });
  it("les formats courts répartissent aussi leurs questions", () => {
    const trois = m.construitPlan(ctx(vide()), ds([1, 2, 3], 4));
    expect(trois.format).toBe("trois-jours");
    expect((trois.seances[1].taches[0] as { refs: string[] }).refs.map(ficheDe)).toEqual([1, 2, 3, 1, 2, 3]);
    expect(trois.seances[2].taches[0]).toMatchObject({ type: "exercice" });
    const express = m.construitPlan(ctx(vide()), ds([1, 2], 1));
    expect(express.seances).toHaveLength(1);
    expect(express.seances[0].taches.map((t) => t.type)).toEqual(["essentiel", "essentiel", "quiz", "pieges"]);
  });
  it("sans exercice dans les chapitres, la séance d'exercice donne des questions", () => {
    const sansExo = m.indexeSommaire({ fiches: [{ num: 1, items: [q(1, 10), q(2, 10), q(3, 14)], liste_notions: [] }, { num: 2, items: [q(1, 10), q(2, 14)], liste_notions: [] }], quiz: [] });
    const semaine = m.construitPlan(ctx(vide(), T, sansExo), ds([1, 2], 9));
    expect(semaine.seances[0].titre).toBe("Le cours en une page");
    expect(semaine.seances[3].taches[0].type).toBe("questions");
    const trois = m.construitPlan(ctx(vide(), T, sansExo), ds([1, 2], 4));
    expect(trois.seances[0].titre).toBe("Le cours en une page");
    expect(trois.seances[2].taches[0].type).toBe("questions");
  });
});

// ---- propriétés, sur le sommaire du prototype ----
const NUMS = grand.fiches.map((f) => f.num);
const CLES = [...grand.fiches.flatMap((f) => f.items.map((i) => m.cle(f.num, i.k, i.n))), ...grand.quiz.map((x) => m.cleQuiz(x.id))];
const instant = fc.integer({ min: Date.parse("2026-09-01T06:00:00Z"), max: Date.parse("2027-06-17T20:00:00Z") });
const resultat = fc.constantFrom<Resultat>("ok", "partiel", "ko");
const eleve = fc.record({
  reponses: fc.array(fc.record({ k: fc.constantFrom(...CLES), r: resultat, t: instant }), { maxLength: 50 }),
  vusEnClasse: fc.uniqueArray(fc.constantFrom(...NUMS), { maxLength: 6 }),
  objectif: fc.constantFrom(10, 14, 18),
  jours: fc.array(fc.integer({ min: 0, max: 40 }), { maxLength: 20 }),
  maintenant: instant,
}).map(({ reponses, vusEnClasse, objectif, jours, maintenant }) => {
  let etat = vide();
  etat.profil.objectif = objectif;
  for (const v of vusEnClasse) etat.vuEnClasse[v] = true;
  for (const x of reponses.filter((r) => r.t <= maintenant).sort((a, b) => a.t - b.t)) etat = m.enregistre(ctx(etat, x.t, grand), x.k, x.r);
  const auj = jourDeParis(new Date(maintenant));
  etat.seances = jours.map((n) => ({ date: ajouteJours(auj, -n), minutes: 25 }));
  return ctx(etat, maintenant, grand);
});

describe("propriétés du calibrage, du parcours et du plan réparti", () => {
  it("calibrage : jamais deux fois la même question, jamais plus que permis, seulement des chapitres demandés", () => {
    fc.assert(fc.property(eleve, fc.uniqueArray(fc.constantFrom(...NUMS), { minLength: 1, maxLength: 14 }), fc.integer({ min: 1, max: 2 ** 30 }), (c, fiches, graine) => {
      const ids = m.questionsCalibrage(c, fiches, graine);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBeLessThanOrEqual(c.reglages.questionsCalibrage);
      for (const id of ids) expect(fiches).toContain(grand.quiz.find((x) => x.id === id)?.fiche);
      const avecQuiz = fiches.filter((n) => (grand.quizParFiche.get(n) ?? []).length > 0);
      // chaque chapitre qui a des questions en reçoit au moins une, tant que la place le permet
      const servis = new Set(ids.map((id) => grand.quiz.find((x) => x.id === id)?.fiche));
      expect(servis.size).toBe(Math.min(avecQuiz.length, c.reglages.questionsCalibrage));
      const bilan = m.bilanCalibrage(grand, ids.map((id, i) => ({ id, juste: i % 2 === 0 })), c.reglages);
      expect(bilan.total).toBe(ids.length);
      expect(bilan.niveaux.reduce((s, n) => s + n.total, 0)).toBe(ids.length);
      expect(bilan.chapitres.reduce((s, n) => s + n.bonnes, 0)).toBe(bilan.bonnes);
      expect([10, 14, 18]).toContain(bilan.depart);
    }));
  });
  it("parcours : les objectifs ne dépassent pas la note visée, les paliers comptent les chapitres vus, trois alertes au plus", () => {
    fc.assert(fc.property(eleve, fc.option(instant), (c, dernier) => {
      const p = m.parcours(c, { dernierCalibrage: dernier !== null && dernier <= c.maintenant ? dernier : null, seanceDs: null });
      const vise = c.etat.profil.objectif as number;
      expect(p.vise).toBe(vise);
      expect(p.chapitres.map((x) => x.fiche)).toEqual(m.chapitresVus(c));
      for (const x of p.chapitres) if (x.prochain !== null) expect(x.prochain).toBeLessThanOrEqual(vise);
      for (const e of p.etapes) if (e.type === "objectif" || e.type === "passage") expect(e.niveau).toBeLessThanOrEqual(vise);
      for (const pal of p.paliers) { expect(pal.total).toBe(p.chapitres.length); expect(pal.atteints).toBeLessThanOrEqual(pal.total); }
      expect(p.paliers.map((x) => x.niveau)).toEqual([10, 14, 18].filter((L) => L <= vise));
      expect(p.alertes.length).toBeLessThanOrEqual(3);
      // tant que la séance du jour n'est pas faite, elle figure dans les étapes
      expect(p.etapes.some((e) => e.type === "seance")).toBe(!c.etat.seances.some((s) => s.date === m.jourCourant(c)));
      // chaque chapitre vu qui a encore un objectif à atteindre a exactement une étape
      const cibles = p.etapes.filter((e) => e.type === "objectif" || e.type === "passage").map((e) => (e as { fiche: number }).fiche).sort((a, b) => a - b);
      expect(cibles).toEqual(p.chapitres.filter((x) => x.prochain !== null).map((x) => x.fiche));
    }));
  });
  it("entraînement : un défi et un TP au plus par chapitre vu, jamais réussis, jamais au-dessus de l'objectif travaillé ; le reste du parcours ne bouge pas", () => {
    const defi = fc.record({ simulation: fc.constantFrom("a", "b", "c", "d"), rang: fc.integer({ min: 1, max: 3 }), fiche: fc.constantFrom(...NUMS), etoiles: fc.option(fc.integer({ min: 1, max: 3 })) });
    const unTp = fc.record({ id: fc.constantFrom("t1", "t2", "t3", "t4", "t5"), fiche: fc.constantFrom(...NUMS), fini: fc.boolean(), reprise: fc.option(fc.constant("essai")) });
    fc.assert(fc.property(eleve, fc.array(defi, { maxLength: 12 }), fc.uniqueArray(unTp, { maxLength: 5, selector: (t) => t.id }), (c, tirage, tps) => {
      // une simulation appartient à un seul chapitre, et chacun de ses rangs n'a qu'un défi
      const chapitre = new Map<string, number>();
      const vusIds = new Set<string>();
      const defis: m.DefiSuivi[] = [];
      for (const d of tirage) {
        const fiche = chapitre.get(d.simulation) ?? d.fiche;
        chapitre.set(d.simulation, fiche);
        const id = `${d.simulation}-${d.rang}`;
        if (vusIds.has(id)) continue;
        vusIds.add(id);
        defis.push({ id, simulation: d.simulation, rang: d.rang, fiche, niveau: [10, 14, 18][d.rang - 1], etoiles: d.etoiles });
      }
      const sans = m.parcours(c, { dernierCalibrage: null, seanceDs: null });
      const p = m.parcours(c, { dernierCalibrage: null, seanceDs: null, entrainement: { defis, tp: tps } });
      const pratique = p.etapes.filter((e) => e.type === "defi" || e.type === "tp");
      // sans les étapes d'entraînement, c'est le parcours d'avant, dans le même ordre
      expect(p.etapes.filter((e) => e.type !== "defi" && e.type !== "tp")).toEqual(sans.etapes);
      expect({ ...p, etapes: [] }).toEqual({ ...sans, etapes: [] });
      const vise = c.etat.profil.objectif as number;
      for (const e of pratique) {
        const chap = p.chapitres.find((x) => x.fiche === e.fiche);
        expect(chap).toBeDefined();
        if (e.type === "defi") {
          const d = defis.find((x) => x.id === e.defi);
          expect(d).toMatchObject({ fiche: e.fiche, etoiles: null, niveau: e.niveau, rang: e.rang });
          expect(e.niveau).toBeLessThanOrEqual(chap?.prochain ?? vise);
          // aucun défi de la même simulation ne reste à réussir avant lui
          expect(defis.some((x) => x.simulation === e.simulation && x.etoiles === null && x.rang < e.rang)).toBe(false);
        } else {
          const t = tps.find((x) => x.id === e.tp);
          expect(t).toMatchObject({ fiche: e.fiche, fini: false });
          expect(e.reprise).toBe(t?.reprise ?? null);
        }
      }
      for (const x of p.chapitres) {
        expect(pratique.filter((e) => e.fiche === x.fiche && e.type === "defi").length).toBeLessThanOrEqual(1);
        expect(pratique.filter((e) => e.fiche === x.fiche && e.type === "tp").length).toBe(tps.some((t) => t.fiche === x.fiche && !t.fini) ? 1 : 0);
      }
    }));
  });
  it("plan réparti : jamais deux fois la même question, jamais plus de huit par séance, aucun chapitre oublié quand il a des candidates", () => {
    const actuels = (c: Contexte): Contexte => ({ ...c, reglages: m.REGLAGES_ACTUELS });
    fc.assert(fc.property(eleve, fc.uniqueArray(fc.constantFrom(...NUMS), { minLength: 2, maxLength: 6 }), fc.integer({ min: 0, max: 30 }), fc.constantFrom(1, 2, 4), (c0, fiches, dans, duree) => {
      const c = actuels(c0);
      const objectif = c.etat.profil.objectif as number;
      const plan = m.construitPlan(c, { id: "p", date: ajouteJours(m.jourCourant(c), dans), duree, fiches, objectif });
      const proto = m.construitPlan({ ...c, reglages: m.REGLAGES_PROTOTYPE }, { id: "p", date: ajouteJours(m.jourCourant(c), dans), duree, fiches, objectif });
      expect(plan.format).toBe(proto.format);
      expect(plan.seances.map((s) => s.date)).toEqual(proto.seances.map((s) => s.date));
      const toutes = plan.seances.flatMap((s) => s.taches.flatMap((t) => (t.type === "questions" || t.type === "ds-blanc" ? t.refs : t.type === "exercice" ? [t.ref] : [])));
      expect(new Set(toutes).size).toBe(toutes.length);
      for (const ref of toutes) expect(fiches).toContain(m.decoupe(ref)?.fiche);
      for (const s of plan.seances) {
        for (const t of s.taches) if (t.type === "questions") expect(t.refs.length).toBeLessThanOrEqual(c.reglages.questionsMaxSeanceDs);
        expect(s.minutes).toBeGreaterThan(0);
      }
      if (plan.format === "semaine") {
        // la première séance de questions d'objectif 10 sert chaque chapitre qui a une question de ce niveau
        const dix = (plan.seances[1].taches[0] as { refs: string[] }).refs;
        const avecDix = fiches.filter((n) => grand.parNum.get(n)?.items.some((i) => i.k === "q" && i.niveau === 10));
        const servis = new Set(dix.map((r) => m.decoupe(r)?.fiche));
        expect(servis.size).toBe(Math.min(avecDix.length, c.reglages.questionsMaxSeanceDs));
      }
    }));
  });
});
