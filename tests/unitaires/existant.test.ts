import { describe, expect, it } from "vitest";
import { ajouteJours, ecartEnJours, jourDeParis, jourDeSemaine, joursAvantLeBac } from "@/lib/commun/dates";
import { decodeChallenge, encodeChallenge } from "@/lib/challenge";
import { createSeededRandom } from "@/lib/seededRandom";
import { selectQuestions } from "@/lib/questionSelector";
import { computeScore } from "@/lib/scoring";
import type { AnswerRecord, Chapter, Difficulty } from "@/lib/types";
import physique from "@/data/questions-physique.json";

describe("dates de Paris", () => {
  it("donne le jour civil de Paris, pas celui du serveur", () => {
    expect(jourDeParis(new Date("2026-11-13T22:59:00Z"))).toBe("2026-11-13");
    expect(jourDeParis(new Date("2026-11-13T23:00:00Z"))).toBe("2026-11-14");
    expect(jourDeParis(new Date("2027-06-15T21:59:59Z"))).toBe("2027-06-15");
    expect(jourDeParis(new Date("2027-06-15T22:00:00Z"))).toBe("2027-06-16");
  });
  it("compte des jours entiers à travers les changements d'heure", () => {
    expect(ecartEnJours("2027-03-27", "2027-03-29")).toBe(2);
    expect(ecartEnJours("2026-10-24", "2026-10-26")).toBe(2);
    expect(ajouteJours("2026-12-31", 1)).toBe("2027-01-01");
    expect(ajouteJours("2028-02-28", 1)).toBe("2028-02-29");
    expect(ajouteJours("2026-11-13", -13)).toBe("2026-10-31");
    expect(jourDeSemaine("2026-11-13")).toBe(5);
  });
  it("compte les jours avant le bac du 16 juin 2027", () => {
    expect(joursAvantLeBac(new Date("2026-11-13T17:00:00Z"))).toBe(215);
    expect(joursAvantLeBac(new Date("2027-06-16T08:00:00Z"))).toBe(0);
    expect(joursAvantLeBac(new Date("2027-07-01T08:00:00Z"))).toBe(0);
  });
});

describe("lien de défi", () => {
  const defi = { seed: 42, name: "Inès", score: 80, grade: 16, mode: "express", subject: "physique" };
  it("se relit à l'identique", () => {
    expect(decodeChallenge(encodeChallenge(defi))).toEqual({ ...defi, chapter: undefined });
  });
  const fabrique = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  it("refuse un mode, une matière ou une note hors bornes", () => {
    expect(decodeChallenge(fabrique({ s: 1, n: "A", p: 50, g: 10, m: "nimporte", j: "maths" }))).toBeNull();
    expect(decodeChallenge(fabrique({ s: 1, n: "A", p: 50, g: 10, m: "express", j: "histoire" }))).toBeNull();
    expect(decodeChallenge(fabrique({ s: 1, n: "A", p: 50, g: 99, m: "express", j: "maths" }))).toBeNull();
  });
  it("refuse un nom trop long ou porteur de balises", () => {
    expect(decodeChallenge(fabrique({ s: 1, n: "x".repeat(25), p: 50, g: 10, m: "express", j: "maths" }))).toBeNull();
    expect(decodeChallenge(fabrique({ s: 1, n: "<script>", p: 50, g: 10, m: "express", j: "maths" }))).toBeNull();
  });
  it("refuse un texte qui n'est pas un lien de défi", () => {
    expect(decodeChallenge("%%%")).toBeNull();
    expect(decodeChallenge(fabrique([1, 2]))).toBeNull();
  });
});

describe("tirage des questions du test", () => {
  const chapitres = (physique as unknown as { chapters: Record<string, Chapter> }).chapters;
  it("donne le même tirage pour la même graine", () => {
    const a = selectQuestions("express", chapitres, undefined, 1234).map((q) => q.id);
    const b = selectQuestions("express", chapitres, undefined, 1234).map((q) => q.id);
    expect(a).toEqual(b);
    expect(a).toHaveLength(10);
    expect(new Set(a).size).toBe(10);
  });
  it("range les questions de la plus simple à la plus difficile", () => {
    const ordre: Record<Difficulty, number> = { basique: 0, classique: 1, expert: 2 };
    const rangs = selectQuestions("diagnostic", chapitres, undefined, 7).map((q) => ordre[q.d]);
    expect(rangs).toEqual([...rangs].sort((x, y) => x - y));
  });
  it("produit des nombres entre 0 et 1", () => {
    const alea = createSeededRandom(99);
    for (let i = 0; i < 100; i++) {
      const x = alea();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe("note du test", () => {
  const reponse = (difficulty: Difficulty, correct: boolean, bonusEarned = false): AnswerRecord => ({
    questionId: "q", correct, time: 10, chapterId: "c", difficulty, skill: "s", bonusEarned, pointsEarned: 0, ref: "",
  });
  it("donne 19 sur 20 pour un sans-faute sans bonus, 20 avec tous les bonus", () => {
    const tout = (bonus: boolean) => (["basique", "classique", "expert"] as Difficulty[]).map((d) => reponse(d, true, bonus));
    expect(computeScore(tout(false)).grade).toBe(19);
    expect(computeScore(tout(true)).grade).toBe(20);
  });
  it("donne 0 sans bonne réponse, et reste entre 0 et 20", () => {
    expect(computeScore([reponse("basique", false)]).grade).toBe(0);
    expect(computeScore([]).grade).toBe(0);
  });
  it("donne 8 sur 20 pour les seules questions basiques réussies", () => {
    expect(computeScore([reponse("basique", true), reponse("classique", false), reponse("expert", false)]).grade).toBe(8);
  });
});
