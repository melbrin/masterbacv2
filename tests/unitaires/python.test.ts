// Le hub Python (décision 0016) : les graduations de ses figures, et ce qui fait une réussite.
import { describe, expect, it } from "vitest";
import { ecrisNombre, graduations } from "@/lib/commun/python/graduations";
import { reussi, type ResultatPython } from "@/lib/commun/python/types";

describe("les graduations des figures", () => {
  it("tombent sur des valeurs rondes, environ autant que demandé", () => {
    expect(graduations([0, 10], 5)).toEqual({ valeurs: [0, 2, 4, 6, 8, 10], pas: 2 });
    expect(graduations([-0.3, 2.6], 5).valeurs).toEqual([0, 0.5, 1, 1.5, 2, 2.5]);
    expect(graduations([0, 1], 4).pas).toBe(0.25);
    expect(graduations([0.001, 0.0034], 4).pas).toBeCloseTo(0.0005, 12);
  });
  it("ne montrent pas « -0 » ni de reste de calcul", () => {
    const { valeurs } = graduations([-1, 1], 4);
    expect(valeurs).toEqual([-1, -0.5, 0, 0.5, 1]);
    expect(Object.is(valeurs[2], -0)).toBe(false);
  });
  it("s'écrivent à la française", () => {
    expect(ecrisNombre(0, 1)).toBe("0");
    expect(ecrisNombre(2.5, 0.5)).toBe("2,5");
    expect(ecrisNombre(0.25, 0.25)).toBe("0,25");
    expect(ecrisNombre(-1.5, 0.5)).toBe("−1,5");
    expect(ecrisNombre(40, 20)).toBe("40");
    expect(ecrisNombre(0.0005, 0.0005)).toBe("5×10⁻⁴");
    expect(ecrisNombre(300000, 100000)).toBe("3×10⁵");
    expect(ecrisNombre(1e-5, 1e-5)).toBe("10⁻⁵");
    expect(ecrisNombre(-0.04, 5)).toBe("0");
  });
});

describe("une réussite", () => {
  const base: ResultatPython = { ok: true, erreur: null, figures: [], tests: [] };
  it("demande un programme sans erreur et toutes les vérifications justes", () => {
    expect(reussi({ ...base, tests: [{ nom: "a", ok: true, message: "" }, { nom: "b", ok: true, message: "" }] })).toBe(true);
    expect(reussi({ ...base, tests: [{ nom: "a", ok: true, message: "" }, { nom: "b", ok: false, message: "non" }] })).toBe(false);
    expect(reussi({ ...base, ok: false, tests: [{ nom: "a", ok: true, message: "" }] })).toBe(false);
  });
  it("n'existe pas sans vérification", () => {
    expect(reussi(base)).toBe(false);
  });
});
