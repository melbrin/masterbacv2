import { describe, expect, it, vi } from "vitest";

// le calcul des droits est pur ; on écarte ce qui lit la base et les cookies
vi.mock("@/lib/serveur/supabase/clients", () => ({ clientUtilisateur: vi.fn(), clientAdmin: vi.fn() }));
const { corrigeOuvert, droitsDepuis, clesDuPlan } = await import("@/lib/serveur/acces");
import type { SeancePlan } from "@/lib/moteur";

const T = Date.parse("2026-11-13T12:00:00Z");
const ligne = (offre: string, o: Partial<{ debut: string; fin: string | null; retire_le: string | null }> = {}) =>
  ({ offre, debut: "2026-11-01T00:00:00Z", fin: null, retire_le: null, ...o });

describe("droits d'un compte", () => {
  it("sans ligne, l'offre est gratuite : ni tous les corrigés, ni le coach", () => {
    expect(droitsDepuis([], T)).toEqual({ offre: "gratuit", tousLesCorriges: false, coach: false });
  });
  it("le Pass, le mensuel, le Pack et la bêta ouvrent tout", () => {
    for (const o of ["pass", "mensuel", "pack", "beta"]) expect(droitsDepuis([ligne(o)], T), o).toMatchObject({ tousLesCorriges: true, coach: true });
  });
  it("les fiches achetées sur la boutique ouvrent les corrigés, pas le coach", () => {
    expect(droitsDepuis([ligne("fiches")], T)).toEqual({ offre: "fiches", tousLesCorriges: true, coach: false });
  });
  it("un droit retiré, expiré ou pas encore commencé ne compte pas", () => {
    expect(droitsDepuis([ligne("pass", { retire_le: "2026-11-10T00:00:00Z" })], T).offre).toBe("gratuit");
    expect(droitsDepuis([ligne("pass", { fin: "2026-11-13T11:59:59Z" })], T).offre).toBe("gratuit");
    expect(droitsDepuis([ligne("pass", { fin: "2026-11-13T12:00:01Z" })], T).offre).toBe("pass");
    expect(droitsDepuis([ligne("pass", { debut: "2026-12-01T00:00:00Z" })], T).offre).toBe("gratuit");
  });
  it("le droit le plus large l'emporte, et une offre inconnue est ignorée", () => {
    expect(droitsDepuis([ligne("fiches"), ligne("pass"), ligne("beta")], T).offre).toBe("pass");
    expect(droitsDepuis([ligne("inventee")], T).offre).toBe("gratuit");
  });
});

describe("ouverture d'un corrigé", () => {
  const gratuit = droitsDepuis([], T);
  const seances: SeancePlan[] = [
    { id: "s1", date: "2026-11-17", titre: "", minutes: 30, faite: false, taches: [{ type: "questions", refs: ["9-q2", "9-q4"] }, { type: "exercice", ref: "9-ex2" }] },
    { id: "s2", date: "2026-11-21", titre: "", minutes: 120, faite: false, taches: [{ type: "ds-blanc", minutes: 120, refs: ["9-ex3"] }, { type: "quiz", ids: ["CS-B01"] }] },
  ];
  const base = { droits: gratuit, jour: "2026-11-13", exerciceDuJour: null, dsOfferts: [] };
  it("avec une offre payante, tout corrigé est ouvert", () => {
    expect(corrigeOuvert("3-ex2", { ...base, droits: droitsDepuis([ligne("pass")], T) })).toBe(true);
  });
  it("en gratuit : la question 1 de chaque fiche, pas l'exercice 1, pas les autres questions", () => {
    expect(corrigeOuvert("9-q1", base)).toBe(true);
    expect(corrigeOuvert("14-q1", base)).toBe(true);
    expect(corrigeOuvert("9-ex1", base)).toBe(false);
    expect(corrigeOuvert("9-q2", base)).toBe(false);
    expect(corrigeOuvert("9-q11", base)).toBe(false);
  });
  it("en gratuit : l'exercice de la séance du jour, et lui seul", () => {
    expect(corrigeOuvert("1-q5", { ...base, exerciceDuJour: "1-q5" })).toBe(true);
    expect(corrigeOuvert("1-q6", { ...base, exerciceDuJour: "1-q5" })).toBe(false);
  });
  it("en gratuit : les items du plan de la préparation offerte, jusqu'au lendemain du devoir", () => {
    const ds = [{ jourDevoir: "2026-11-23", seances }];
    expect(clesDuPlan(seances)).toEqual(["9-q2", "9-q4", "9-ex2", "9-ex3"]);
    for (const k of ["9-q2", "9-q4", "9-ex2", "9-ex3"]) expect(corrigeOuvert(k, { ...base, dsOfferts: ds }), k).toBe(true);
    expect(corrigeOuvert("9-q3", { ...base, dsOfferts: ds })).toBe(false);
    expect(corrigeOuvert("9-q2", { ...base, jour: "2026-11-24", dsOfferts: ds })).toBe(true);
    expect(corrigeOuvert("9-q2", { ...base, jour: "2026-11-25", dsOfferts: ds })).toBe(false);
  });
  it("une clé qui n'est pas celle d'un item est toujours refusée, même avec le Pass", () => {
    const pass = { ...base, droits: droitsDepuis([ligne("pass")], T) };
    for (const k of ["quiz:CS-B01", "9-q1; drop", "", "../9-q1", "9-q"]) expect(corrigeOuvert(k, pass), k).toBe(false);
  });
});
