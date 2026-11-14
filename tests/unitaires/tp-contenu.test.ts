// Les situations des TP virtuels (lib/serveur/contenu/tp/) et leur vérification par le serveur (lib/serveur/tp.ts).
// Ici, ce qui vaut pour tous les TP. Chaque TP a en plus son fichier dans tests/unitaires/tp/, où sa manipulation est jouée.
import { describe, expect, it } from "vitest";
import type { EtapePublique } from "@/lib/commun/tp/types";
import { TP as TOUS, tp, variante } from "@/lib/serveur/contenu/tp";
import { GENRES_DE_PAILLASSE, essaisAReprendre, etapePublique, reglesDe, tpVisible, verifie } from "@/lib/serveur/tp";
import { GRAINES, fausse, joue } from "../outils/tp";

// les TP en construction ne sont pas encore jouables : les contrôles portent sur ceux qui se montrent
const TP = TOUS.filter((t) => t.pret !== false);

describe("les situations des TP", () => {
  it("chaque TP a un identifiant unique, court, sans accent", () => {
    expect(new Set(TOUS.map((t) => t.id)).size).toBe(TOUS.length);
    for (const t of TOUS) expect(t.id).toMatch(/^[a-z]{2,20}$/);
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
    it(`${t.id} : une situation à lire, une manipulation au moins, les quatre compétences, des réponses cohérentes`, () => {
      expect(t.etat).toBe("brouillon");
      expect(t.minutes).toBeGreaterThanOrEqual(15);
      const longueurs = new Set<number>();
      for (const graine of GRAINES) {
        const etapes = t.etapes(graine);
        longueurs.add(etapes.length);
        expect(etapes[0].genre).toBe("lecture");
        expect(etapes.filter((e) => e.genre === "paillasse").length).toBeGreaterThanOrEqual(1);
        expect(new Set(etapes.flatMap((e) => (e.genre === "lecture" ? [] : [e.competence])))).toEqual(new Set(["APP", "ANA", "REA", "VAL"]));
        for (const e of etapes) {
          if (e.genre === "materiel") {
            expect(new Set(e.objets.map((o) => o.id)).size).toBe(e.objets.length);
            expect(e.objets.some((o) => o.utile) && e.objets.some((o) => !o.utile)).toBe(true);
          }
          if (e.genre === "ordre") for (const autre of e.autres ?? []) expect([...autre].sort()).toEqual(e.etapes.map((_, i) => i));
          if (e.genre === "choix" && typeof e.bonne === "number") expect(e.bonne).toBeLessThan(e.options.length);
          if (e.genre === "paillasse") {
            expect(GENRES_DE_PAILLASSE).toContain(e.paillasse.genre);
            expect(e.protocole.length).toBeGreaterThanOrEqual(2);
          }
        }
        // ni tiret long ni émoji dans ce que l'élève lit
        expect(/[—–\u{1F300}-\u{1FAFF}]/u.test(JSON.stringify(etapes.map((e) => etapePublique(e, graine))))).toBe(false);
        // la même graine redonne les mêmes étapes
        expect(JSON.stringify(t.etapes(graine).map((e) => etapePublique(e, graine)))).toBe(JSON.stringify(etapes.map((e) => etapePublique(e, graine))));
      }
      // le nombre d'étapes ne dépend pas de la graine : un essai repris retrouve sa place
      expect(longueurs.size).toBe(1);
    });
  }
});

describe("ce que le navigateur reçoit", () => {
  it("aucune étape ne porte sa réponse", () => {
    for (const t of TP) for (const e of t.etapes(GRAINES[0])) {
      const publique = JSON.stringify(etapePublique(e, GRAINES[0]));
      expect(/"(utile|bonne|pourquoi|explication|autres|attendu|detail)"/.test(publique), `${t.id} : ${e.genre}`).toBe(false);
    }
  });
  it("les étapes d'un protocole arrivent mélangées, jamais dans un bon ordre, et toujours pareil pour la même graine", () => {
    for (const t of TP) for (const e of t.etapes(GRAINES[0])) {
      if (e.genre !== "ordre") continue;
      for (const graine of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
        const montrees = (etapePublique(e, graine) as Extract<EtapePublique, { genre: "ordre" }>).etapes;
        expect([...montrees].sort()).toEqual([...e.etapes].sort());
        const rangs = montrees.map((x) => e.etapes.indexOf(x)).join();
        expect([e.etapes.map((_, i) => i), ...(e.autres ?? [])].map((o) => o.join())).not.toContain(rangs);
        expect(etapePublique(e, graine)).toEqual(etapePublique(e, graine));
      }
    }
  });
});

describe("la vérification par le serveur", () => {
  it("chaque genre de paillasse a ses règles", async () => {
    for (const genre of GENRES_DE_PAILLASSE) {
      const regles = await reglesDe(genre);
      expect(regles, genre).not.toBeNull();
    }
    expect(await reglesDe("inconnue")).toBeNull();
    expect(await reglesDe("toString")).toBeNull();
  });
  for (const t of TP) {
    it(`${t.id} : en se trompant partout et sans manipuler, le TP donne D partout, et la suite reste possible`, async () => {
      for (const graine of GRAINES.slice(0, 3)) {
        const { etapes, scores, mesures, bilan } = await joue(t, graine, (e, p, m) => fausse(e, p, m));
        expect(scores.filter((_, i) => etapes[i].genre !== "lecture").every((s) => s === 0), scores.join(" ")).toBe(true);
        expect(bilan).toEqual({ APP: "D", ANA: "D", REA: "D", VAL: "D" });
        // sans mesure de l'élève, le professeur fournit les valeurs : l'exploitation reste calculable
        expect(Object.values(mesures).every((v) => Number.isFinite(v))).toBe(true);
      }
    });
  }
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
