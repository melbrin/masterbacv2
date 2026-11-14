// Les TP de l'application (lib/serveur/contenu/tp/) et leur vérification par le serveur (lib/serveur/tp.ts).
// Ici, ce qui vaut pour tous les TP inscrits. Chaque TP a en plus son fichier dans tests/unitaires/tp/, où sa
// manipulation est jouée ; un TP en construction y appelle lui-même `controlesCommuns`.
import { describe, expect, it } from "vitest";
import { TP, tp, variante } from "@/lib/serveur/contenu/tp";
import { GENRES_DE_PAILLASSE, essaisAReprendre, reglesDe, tpVisible, verifie } from "@/lib/serveur/tp";
import { GRAINES, controlesCommuns } from "../outils/tp";

describe("les TP de l'application", () => {
  it("chaque TP a un identifiant unique, court, sans accent", () => {
    expect(TP.length).toBeGreaterThanOrEqual(3);
    expect(new Set(TP.map((t) => t.id)).size).toBe(TP.length);
    for (const t of TP) expect(t.id).toMatch(/^[a-z]{2,20}$/);
    expect(tp(TP[0].id)).toBe(TP[0]);
    expect(tp("inconnu")).toBeNull();
  });
  it("un TP en construction ne se montre pas, même à l'administrateur", () => {
    expect(tpVisible({ ...TP[0], pret: false }, true)).toBe(false);
    expect(tpVisible({ ...TP[0], etat: "valide", pret: undefined }, false)).toBe(true);
  });
  it("une valeur tirée avec la graine est toujours la même pour la même graine", () => {
    expect(variante(7, ["a", "b", "c"])).toBe("b");
    expect(variante(-7, ["a", "b", "c"])).toBe("b");
    expect([0, 1, 2, 3].map((g) => variante(g, [10, 20]))).toEqual([10, 20, 10, 20]);
  });
  for (const t of TP) {
    it(`${t.id} : une situation à lire, une manipulation, les quatre compétences, rien de la réponse dans le navigateur, D partout sans rien faire`, async () => {
      await controlesCommuns(t);
    });
  }
});

describe("la vérification par le serveur", () => {
  it("chaque genre de paillasse de l'application a ses règles", async () => {
    expect(GENRES_DE_PAILLASSE).toContain("titrage");
    for (const genre of GENRES_DE_PAILLASSE) expect(await reglesDe(genre), genre).not.toBeNull();
    expect(await reglesDe("inconnue")).toBeNull();
    expect(await reglesDe("toString")).toBeNull();
  });
  it("une réponse qui n'est pas du genre de l'étape est refusée", async () => {
    const etapes = tp("detartrant")!.etapes(GRAINES[0]);
    expect(await verifie(etapes[1], { g: "valeur", valeur: 3 }, {}, GRAINES[0])).toBeNull();
    expect(await verifie(etapes[4], { g: "ordre", ordre: [0, 0, 1, 2, 3] }, {}, GRAINES[0])).toBeNull();
    expect(await verifie(etapes[4], { g: "ordre", ordre: [0, 1, 2] }, {}, GRAINES[0])).toBeNull();
  });
});

describe("le TP laissé en route", () => {
  const le = (heure: number) => `2026-11-14T${String(heure).padStart(2, "0")}:00:00+00:00`;
  it("la page propose de reprendre le dernier essai commencé de chaque TP", () => {
    const reprises = essaisAReprendre([], [{ id: "a", tp: "vinaigre", cree_le: le(9) }, { id: "b", tp: "vinaigre", cree_le: le(11) }, { id: "c", tp: "jauge", cree_le: le(10) }]);
    expect([...reprises]).toEqual([["vinaigre", "b"], ["jauge", "c"]]);
  });
  it("un essai laissé en route ne se propose plus quand le TP a été refait en entier depuis", () => {
    const finis = [{ tp: "vinaigre", cree_le: le(8) }, { tp: "vinaigre", cree_le: le(12) }, { tp: "jauge", cree_le: le(8) }];
    const reprises = essaisAReprendre(finis, [{ id: "b", tp: "vinaigre", cree_le: le(11) }, { id: "c", tp: "jauge", cree_le: le(10) }]);
    expect([...reprises]).toEqual([["jauge", "c"]]);
  });
  it("sans essai commencé, rien à reprendre", () => {
    expect(essaisAReprendre([{ tp: "vinaigre", cree_le: le(8) }], []).size).toBe(0);
  });
});
