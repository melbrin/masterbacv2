// Les chiffres de l'entraînement (lib/commun/bilan-entrainement.ts, décision 0015) : ce que le parcours, les progrès
// et l'accueil montrent du labo, des TP, de la mémoire et des jeux.
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { bilanEntrainement, etatDeLOffre, grilleEce, meilleursBilans, niveauHabituel, valeurDuBilan, type Faits, type Offre } from "@/lib/commun/bilan-entrainement";
import type { Bilan, Niveau } from "@/lib/commun/tp/types";

// vendredi 13 novembre 2026, 18 h à Paris
const T = Date.parse("2026-11-13T17:00:00Z");
const JOUR = 86_400_000;
const HEURE = 3_600_000;

const defis = (simulation: string, fiche: number) => [10, 14, 18].map((niveau, i) => ({ id: `${simulation}-${i + 1}`, simulation, rang: i + 1, fiche, niveau }));
const offre: Offre = {
  defis: [...defis("basket", 1), ...defis("largage", 1), ...defis("titrage", 10)],
  tp: [{ id: "chute", fiche: 1 }, { id: "detartrant", fiche: 10 }, { id: "vinaigre", fiche: 10 }],
};
const rien: Faits = { defis: [], tp: [], reprises: [], memoire: [], jeux: [] };

describe("bilans de TP", () => {
  it("un bilan vaut la somme de ses niveaux", () => {
    expect(valeurDuBilan({})).toBe(0);
    expect(valeurDuBilan({ APP: "A", ANA: "B", REA: "C", VAL: "D" })).toBe(6);
  });
  it("garde le meilleur essai de chaque TP ; à valeur égale, le premier", () => {
    const m = meilleursBilans([
      { tp: "chute", bilan: { APP: "B", REA: "B" } },
      { tp: "chute", bilan: { APP: "A", REA: "C" } },
      { tp: "chute", bilan: { APP: "A", REA: "A" } },
      { tp: "detartrant", bilan: { APP: "C" } },
      { tp: "chute", bilan: { APP: "D", REA: "D" } },
    ]);
    expect([...m.keys()]).toEqual(["chute", "detartrant"]);
    expect(m.get("chute")).toEqual({ APP: "A", REA: "A" });
    expect(meilleursBilans([{ tp: "x", bilan: { APP: "A", REA: "C" } }, { tp: "x", bilan: { APP: "B", REA: "B" } }]).get("x")).toEqual({ APP: "A", REA: "C" });
  });
  it("le niveau habituel est la moyenne, ramenée au niveau le plus proche ; à mi-chemin, celui du dessous", () => {
    const cas: [Niveau[], Niveau | null][] = [
      [[], null], [["A"], "A"], [["B"], "B"], [["D"], "D"],
      [["A", "B"], "B"], [["A", "A", "B"], "A"], [["B", "C"], "C"], [["C", "D"], "D"], [["A", "D"], "C"], [["A", "A", "A", "D"], "B"],
    ];
    for (const [niveaux, attendu] of cas) expect(niveauHabituel(niveaux)).toBe(attendu);
  });
  it("la grille donne un niveau par compétence, et rien pour une compétence jamais notée", () => {
    const grille = grilleEce(new Map<string, Bilan>([["a", { APP: "A", REA: "B" }], ["b", { APP: "B", REA: "B", VAL: "D" }]]));
    expect(grille.map((c) => [c.id, c.niveau, c.sur])).toEqual([["APP", "B", 2], ["ANA", null, 0], ["REA", "B", 2], ["VAL", "D", 1]]);
    expect(grille[0]).toMatchObject({ nom: "S'approprier" });
  });
});

describe("où l'élève en est sur ce qui lui est proposé", () => {
  it("garde l'ordre de l'offre, avec les étoiles, les TP terminés et les essais à reprendre", () => {
    const etat = etatDeLOffre(offre, {
      ...rien,
      defis: [{ id: "basket-1", etoiles: 2, quand: T }, { id: "ancien-1", etoiles: 3, quand: T }],
      tp: [{ tp: "detartrant", bilan: { REA: "A" }, quand: T }],
      reprises: [{ tp: "vinaigre", essai: "e1" }],
    });
    expect(etat.defis.map((d) => d.id)).toEqual(offre.defis.map((d) => d.id));
    expect(etat.defis.slice(0, 2).map((d) => d.etoiles)).toEqual([2, null]);
    expect(etat.tp).toEqual([
      { id: "chute", fiche: 1, fini: false, reprise: null },
      { id: "detartrant", fiche: 10, fini: true, reprise: null },
      { id: "vinaigre", fiche: 10, fini: false, reprise: "e1" },
    ]);
  });
});

describe("bilan de l'entraînement", () => {
  it("sans rien de fait, tout est à zéro et l'offre est comptée", () => {
    const b = bilanEntrainement(offre, rien, T);
    expect(b.labo).toEqual({ defis: 9, reussis: 0, etoiles: 0, etoilesMax: 27, parNiveau: [10, 14, 18].map((niveau) => ({ niveau, defis: 3, reussis: 0 })) });
    expect(b.tp).toMatchObject({ tp: 3, finis: 0 });
    expect(b.tp.grille.every((c) => c.niveau === null)).toBe(true);
    expect(b.memoire).toEqual({ jours: 0, parties: 0 });
    expect(b.jeux).toEqual({ parties: 0 });
    expect(b.semaine).toEqual({ debut: "2026-11-09", defis: 0, tp: 0, parties: 0 });
    expect(b.mois).toEqual({ debut: "2026-11-01", defis: 0, tp: 0, parties: 0 });
    expect([...b.chapitres.keys()]).toEqual([1, 10]);
    expect(b.chapitres.get(1)).toMatchObject({ defis: 6, reussis: 0, etoiles: 0, tp: 1, tpFinis: 0 });
  });
  it("compte les défis réussis par objectif et par chapitre, avec leurs étoiles", () => {
    const b = bilanEntrainement(offre, { ...rien, defis: [
      { id: "basket-1", etoiles: 3, quand: T - 2 * JOUR }, { id: "basket-2", etoiles: 1, quand: T - JOUR }, { id: "titrage-1", etoiles: 2, quand: T - 20 * JOUR },
    ] }, T);
    expect(b.labo).toMatchObject({ reussis: 3, etoiles: 6 });
    expect(b.labo.parNiveau).toEqual([{ niveau: 10, defis: 3, reussis: 2 }, { niveau: 14, defis: 3, reussis: 1 }, { niveau: 18, defis: 3, reussis: 0 }]);
    expect(b.chapitres.get(1)).toMatchObject({ defis: 6, reussis: 2, etoiles: 4 });
    expect(b.chapitres.get(1)?.parNiveau.get(10)).toEqual({ defis: 2, reussis: 1 });
    expect(b.chapitres.get(10)?.parNiveau.get(10)).toEqual({ defis: 1, reussis: 1 });
    // cette semaine : depuis lundi 9 ; ce mois-ci : depuis le 1er
    expect(b.semaine.defis).toBe(2);
    expect(b.mois.defis).toBe(2);
  });
  it("ne compte pas ce que la section ne propose plus à ce compte", () => {
    const b = bilanEntrainement(offre, { ...rien, defis: [{ id: "ancien-1", etoiles: 3, quand: T }], tp: [{ tp: "ancien", bilan: { REA: "A" }, quand: T }] }, T);
    expect(b.labo).toMatchObject({ reussis: 0, etoiles: 0 });
    expect(b.tp.finis).toBe(0);
    expect(b.semaine).toMatchObject({ defis: 0, tp: 0 });
  });
  it("un TP refait ne compte qu'une fois, et garde son meilleur bilan", () => {
    const b = bilanEntrainement(offre, { ...rien, tp: [
      { tp: "detartrant", bilan: { APP: "B", ANA: "B", REA: "B", VAL: "C" }, quand: T - 3 * JOUR },
      { tp: "detartrant", bilan: { APP: "A", ANA: "A", REA: "B", VAL: "A" }, quand: T - JOUR },
      { tp: "chute", bilan: { APP: "A", ANA: "C", REA: "B", VAL: "D" }, quand: T - 25 * JOUR },
    ] }, T);
    expect(b.tp.finis).toBe(2);
    expect(b.tp.meilleurs.get("detartrant")).toMatchObject({ VAL: "A" });
    // analyser : A et C donnent B ; valider : A et D sont à mi-chemin de B et C, donc C
    expect(b.tp.grille.map((c) => c.niveau)).toEqual(["A", "B", "B", "C"]);
    expect(b.chapitres.get(10)).toMatchObject({ tp: 2, tpFinis: 1 });
    expect(b.semaine.tp).toBe(1);
    // le TP du 19 octobre n'est pas de ce mois-ci
    expect(b.mois.tp).toBe(1);
  });
  it("compte les jours de mémoire à l'heure de Paris, sur les sept derniers jours", () => {
    const minuit = Date.parse("2026-11-11T23:00:00Z"); // minuit à Paris, le 12
    const b = bilanEntrainement(offre, { ...rien, memoire: [minuit - HEURE / 2, minuit + HEURE / 2, minuit + HEURE, T - 7 * JOUR - HEURE, T - 8 * JOUR], jeux: [T - HEURE, T - 6 * JOUR, T - 30 * JOUR] }, T);
    expect(b.memoire).toEqual({ jours: 2, parties: 3 });
    expect(b.jeux).toEqual({ parties: 2 });
    // lundi 9 novembre : trois parties de mémoire et une de jeux depuis ; ce mois-ci : tout sauf celle du 14 octobre
    expect(b.semaine.parties).toBe(4);
    expect(b.mois.parties).toBe(7);
  });
  it("une partie datée du futur ne compte pas dans les sept derniers jours", () => {
    expect(bilanEntrainement(offre, { ...rien, memoire: [T + HEURE] }, T).memoire).toEqual({ jours: 0, parties: 0 });
  });
  it("propriétés : les sommes se recoupent, rien ne dépasse l'offre", () => {
    const instant = fc.integer({ min: T - 60 * JOUR, max: T });
    const faits = fc.record({
      defis: fc.uniqueArray(fc.record({ id: fc.constantFrom(...offre.defis.map((d) => d.id), "ancien-1"), etoiles: fc.integer({ min: 1, max: 3 }), quand: instant }), { selector: (d) => d.id }),
      tp: fc.array(fc.record({ tp: fc.constantFrom("chute", "detartrant", "vinaigre", "ancien"), bilan: fc.record({ APP: fc.constantFrom<Niveau>("A", "B", "C", "D"), REA: fc.constantFrom<Niveau>("A", "B", "C", "D") }), quand: instant }), { maxLength: 8 }),
      memoire: fc.array(instant, { maxLength: 20 }),
      jeux: fc.array(instant, { maxLength: 20 }),
    });
    fc.assert(fc.property(faits, (f) => {
      const b = bilanEntrainement(offre, { ...f, reprises: [] }, T);
      const chapitres = [...b.chapitres.values()];
      expect(b.labo.parNiveau.reduce((s, n) => s + n.defis, 0)).toBe(b.labo.defis);
      expect(b.labo.parNiveau.reduce((s, n) => s + n.reussis, 0)).toBe(b.labo.reussis);
      expect(chapitres.reduce((s, c) => s + c.reussis, 0)).toBe(b.labo.reussis);
      expect(chapitres.reduce((s, c) => s + c.etoiles, 0)).toBe(b.labo.etoiles);
      expect(chapitres.reduce((s, c) => s + c.tpFinis, 0)).toBe(b.tp.finis);
      for (const c of chapitres) expect([...c.parNiveau.values()].reduce((s, n) => s + n.reussis, 0)).toBe(c.reussis);
      expect(b.labo.reussis).toBeLessThanOrEqual(b.labo.defis);
      expect(b.labo.etoiles).toBeLessThanOrEqual(b.labo.etoilesMax);
      expect(b.tp.finis).toBeLessThanOrEqual(b.tp.tp);
      expect(b.memoire.jours).toBeLessThanOrEqual(Math.min(8, b.memoire.parties));
      // la semaine est dans le mois, sauf quand le mois commence en cours de semaine
      expect(b.semaine.defis).toBeLessThanOrEqual(b.labo.reussis);
      expect(b.mois.defis).toBeLessThanOrEqual(b.labo.reussis);
      expect(b.mois.tp).toBeLessThanOrEqual(b.tp.finis);
      for (const c of b.tp.grille) expect(c.sur).toBeLessThanOrEqual(b.tp.finis);
    }));
  });
});
