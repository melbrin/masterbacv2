// Le hub Python (décision 0016) : ce qu'un compte peut voir. Un brouillon ne se montre qu'en local ou à
// l'administrateur ; l'interrupteur fermé retire tout. Les pages et les deux actions passent par exercicePourCompte.
import { beforeEach, describe, expect, it, vi } from "vitest";

const ENV = vi.hoisted(() => ({ APP_ENV: "production", HUB_PYTHON: "ouvert" }));
vi.mock("@/lib/serveur/env", () => ({ env: () => ENV }));
vi.mock("@/lib/serveur/supabase/clients", () => ({ clientUtilisateur: async () => { throw new Error("pas de base dans ce test"); } }));

import { EXERCICES_PYTHON } from "@/lib/serveur/contenu/python";
import { exercicePourCompte, exerciceVisible, exercicesVisibles, hubOuvert } from "@/lib/serveur/python";

const modele = EXERCICES_PYTHON[0];
const brouillon = { ...modele, etat: "brouillon" as const };
const valide = { ...modele, etat: "valide" as const };

describe("ce qu'un compte voit du hub Python", () => {
  beforeEach(() => {
    ENV.APP_ENV = "production";
    ENV.HUB_PYTHON = "ouvert";
  });

  it("un brouillon ne se montre pas à un élève, sur la recette comme en production", () => {
    expect(exerciceVisible(brouillon, false)).toBe(false);
    ENV.APP_ENV = "recette";
    expect(exerciceVisible(brouillon, false)).toBe(false);
  });
  it("l'administrateur voit les brouillons ; en local, tout le monde les voit", () => {
    expect(exerciceVisible(brouillon, true)).toBe(true);
    ENV.APP_ENV = "local";
    expect(exerciceVisible(brouillon, false)).toBe(true);
  });
  it("un exercice validé se montre à tous", () => {
    expect(exerciceVisible(valide, false)).toBe(true);
  });
  it("l'interrupteur fermé retire tout, même à l'administrateur et en local", () => {
    ENV.HUB_PYTHON = "ferme";
    expect(hubOuvert()).toBe(false);
    expect(exerciceVisible(valide, true)).toBe(false);
    ENV.APP_ENV = "local";
    expect(exercicesVisibles(true)).toEqual([]);
  });
  it("une page ou une action ne trouve ni un exercice inconnu, ni un brouillon pour un élève", () => {
    expect(exercicePourCompte("inconnu", true)).toBeNull();
    const brouillons = EXERCICES_PYTHON.filter((e) => e.etat === "brouillon");
    for (const e of brouillons) {
      expect(exercicePourCompte(e.id, false), e.id).toBeNull();
      expect(exercicePourCompte(e.id, true)?.id, e.id).toBe(e.id);
    }
    expect(exercicesVisibles(false).every((e) => e.etat === "valide")).toBe(true);
  });
});
