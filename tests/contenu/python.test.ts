// Les exercices du hub Python (décision 0016), rejoués avec le vrai Python : celui que l'élève a dans son navigateur
// (Pyodide, servi depuis public/pyodide/), avec le même banc (public/python/banc.mjs).
// Pour chaque exercice : la solution passe toutes les vérifications, le programme de départ n'est pas déjà juste.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadPyodide, type PyodideInterface } from "pyodide";
import { beforeAll, describe, expect, it } from "vitest";
import { NOMS_GENRES, THEMES_PYTHON, VERSION_PYODIDE, reussi, type ResultatPython } from "@/lib/commun/python/types";
import { EXERCICES_PYTHON } from "@/lib/serveur/contenu/python";
import { executer, prepare } from "@/public/python/banc.mjs";

const base = `${join(process.cwd(), "public/pyodide", VERSION_PYODIDE)}/`;
let py: PyodideInterface;

beforeAll(async () => {
  if (!existsSync(join(base, "pyodide.asm.wasm"))) throw new Error("Python n'est pas préparé : lance d'abord node scripts/pyodide.mjs");
  py = await loadPyodide({ indexURL: base, stdout: () => {}, stderr: () => {} });
  await prepare(py);
}, 120_000);

const lance = async (code: string, tests: { nom: string; code: string }[]): Promise<ResultatPython> =>
  (await executer(py, { code, tests, mode: "verifier" })) as ResultatPython;

const textes = (e: (typeof EXERCICES_PYTHON)[number]) => [e.titre, ...e.enonce, ...e.indices, ...e.explication, ...e.tests.map((t) => t.nom), e.depart, e.solution].join("\n");

describe("les exercices du hub Python", () => {
  it("ont des identifiants uniques et bien formés, un thème connu, une fiche de 1 à 14", () => {
    expect(new Set(EXERCICES_PYTHON.map((e) => e.id)).size).toBe(EXERCICES_PYTHON.length);
    const themes = new Set<string>(THEMES_PYTHON.map((t) => t.id));
    for (const e of EXERCICES_PYTHON) {
      expect(e.id, e.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(e.id.length, e.id).toBeGreaterThanOrEqual(3);
      expect(e.id.length, e.id).toBeLessThanOrEqual(40);
      expect(themes.has(e.theme), e.id).toBe(true);
      expect(Object.keys(NOMS_GENRES), e.id).toContain(e.genre);
      expect(Number.isInteger(e.fiche) && e.fiche >= 1 && e.fiche <= 14, e.id).toBe(true);
      expect(e.minutes, e.id).toBeGreaterThanOrEqual(3);
      expect(e.minutes, e.id).toBeLessThanOrEqual(45);
    }
  });

  it("ont un énoncé, des vérifications nommées, des indices et une explication", () => {
    for (const e of EXERCICES_PYTHON) {
      expect(e.enonce.length, e.id).toBeGreaterThan(0);
      expect(e.tests.length, e.id).toBeGreaterThan(0);
      expect(new Set(e.tests.map((t) => t.nom)).size, `${e.id} : deux vérifications du même nom`).toBe(e.tests.length);
      expect(e.indices.length, e.id).toBeGreaterThan(0);
      expect(e.explication.length, e.id).toBeGreaterThan(0);
      expect(e.depart.trim(), e.id).not.toBe(e.solution.trim());
      expect(e.depart.length + e.solution.length, e.id).toBeLessThan(20_000);
    }
  });

  it("sont écrits sans tiret long ni émoji, en tutoyant l'élève, sans les mots que l'application n'emploie pas", () => {
    for (const e of EXERCICES_PYTHON) {
      const t = textes(e);
      const messages = e.tests.map((x) => x.code).join("\n");
      expect(t, e.id).not.toMatch(/[\u2014\u2013]/);
      expect(t, e.id).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(`${t}\n${messages}`, e.id).not.toMatch(/(^|[^\p{L}])(leçons?|découvr\p{L}*|prochainement)(?=[^\p{L}]|$)/iu);
      expect(`${[e.titre, ...e.enonce, ...e.indices, ...e.explication].join("\n")}\n${messages}`, e.id).not.toMatch(/(^|[^\p{L}])(vous|votre|vos)(?=[^\p{L}]|$)/iu);
    }
  });

  it("n'ont pas l'identifiant d'une page du hub", () => {
    for (const e of EXERCICES_PYTHON) expect(e.id, e.id).not.toBe("libre");
  });

  for (const e of EXERCICES_PYTHON) {
    it(`${e.id} : la solution passe toutes les vérifications`, async () => {
      const r = await lance(e.solution, e.tests);
      expect(r.erreur, JSON.stringify(r.erreur)).toBeNull();
      expect(r.tests.filter((t) => !t.ok)).toEqual([]);
      expect(reussi(r)).toBe(true);
    });
    it(`${e.id} : le programme de départ n'est pas déjà juste, et chaque échec s'explique`, async () => {
      const r = await lance(e.depart, e.tests);
      expect(reussi(r)).toBe(false);
      for (const t of r.tests.filter((x) => !x.ok)) expect(t.message.length, `${e.id} : ${t.nom}`).toBeGreaterThan(10);
    });
  }
});
