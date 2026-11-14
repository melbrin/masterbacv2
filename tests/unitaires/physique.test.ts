import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  dureeSaut, finDuVol, hauteurMaxSaut, hauteurSaut, instantSol, instantSommetSaut, PANIER, passageAuPanier, PESANTEUR, positionTir,
  sommetTir, TOLERANCE_PANIER, verdictTir, vitesseSaut, vitesseTir, type Tir,
} from "@/lib/commun/physique";

// Les valeurs attendues sont calculées à la main, avec g = 9,81 m·s⁻².
const RACINE_3 = Math.sqrt(3);
const RACINE_2 = Math.sqrt(2);

// Les réglages que les curseurs de la simulation permettent.
const vitesseDeSaut = fc.double({ min: 2, max: 5, noNaN: true });
const tirRegle: fc.Arbitrary<Tir> = fc.record({
  v0: fc.double({ min: 5, max: 10, noNaN: true }),
  angle: fc.double({ min: 30, max: 75, noNaN: true }),
  hauteur: fc.double({ min: 1.8, max: 2.6, noNaN: true }),
});
const part = fc.double({ min: 0, max: 1, noNaN: true });

describe("constantes du modèle", () => {
  it("prend g = 9,81 m·s⁻², le cercle à 4,60 m et à 3,05 m du sol, une tolérance de 0,15 m", () => {
    expect(PESANTEUR).toBe(9.81);
    expect(PANIER).toEqual({ x: 4.6, y: 3.05 });
    expect(TOLERANCE_PANIER).toBe(0.15);
  });
});

describe("le saut", () => {
  it("donne la détente et la durée du saut pour v0 = 3,0 m/s : 0,459 m et 0,612 s", () => {
    // 3² / (2 × 9,81) = 9 / 19,62 et 2 × 3 / 9,81 = 6 / 9,81
    expect(hauteurMaxSaut(3)).toBeCloseTo(0.4587, 4);
    expect(dureeSaut(3)).toBeCloseTo(0.6116, 4);
    expect(instantSommetSaut(3)).toBeCloseTo(0.3058, 4);
  });
  it("donne les valeurs aux deux bouts du curseur : 2,0 et 5,0 m/s", () => {
    expect(hauteurMaxSaut(2)).toBeCloseTo(0.2039, 4); // 4 / 19,62
    expect(dureeSaut(2)).toBeCloseTo(0.4077, 4); // 4 / 9,81
    expect(hauteurMaxSaut(5)).toBeCloseTo(1.2742, 4); // 25 / 19,62
    expect(dureeSaut(5)).toBeCloseTo(1.0194, 4); // 10 / 9,81
  });
  it("suit y(t) = v0·t − ½·g·t² et v_y(t) = v0 − g·t", () => {
    expect(hauteurSaut(3, 0.1)).toBeCloseTo(0.25095, 10); // 0,3 − 4,905 × 0,01
    expect(vitesseSaut(3, 0.1)).toBeCloseTo(2.019, 10); // 3 − 0,981
    expect(hauteurSaut(3, 0.2)).toBeCloseTo(0.4038, 10); // 0,6 − 4,905 × 0,04
    expect(vitesseSaut(3, 0.2)).toBeCloseTo(1.038, 10); // 3 − 1,962
  });
  it("part du sol avec la vitesse v0 et y revient avec la vitesse −v0", () => {
    fc.assert(fc.property(vitesseDeSaut, (v0) => {
      expect(hauteurSaut(v0, 0)).toBe(0);
      expect(vitesseSaut(v0, 0)).toBe(v0);
      expect(hauteurSaut(v0, dureeSaut(v0))).toBeCloseTo(0, 10);
      expect(vitesseSaut(v0, dureeSaut(v0))).toBeCloseTo(-v0, 10);
    }));
  });
  it("a une vitesse nulle au sommet, atteint à la moitié du saut, où la hauteur est maximale", () => {
    fc.assert(fc.property(vitesseDeSaut, part, (v0, k) => {
      const sommet = instantSommetSaut(v0);
      expect(sommet).toBeCloseTo(dureeSaut(v0) / 2, 12);
      expect(vitesseSaut(v0, sommet)).toBeCloseTo(0, 12);
      expect(hauteurSaut(v0, sommet)).toBeCloseTo(hauteurMaxSaut(v0), 12);
      expect(hauteurSaut(v0, k * dureeSaut(v0))).toBeLessThanOrEqual(hauteurMaxSaut(v0) + 1e-12);
    }));
  });
  it("monte et descend de façon symétrique : même hauteur, vitesses opposées, de part et d'autre du sommet", () => {
    fc.assert(fc.property(vitesseDeSaut, part, (v0, k) => {
      const sommet = instantSommetSaut(v0);
      const ecart = k * sommet;
      expect(hauteurSaut(v0, sommet - ecart)).toBeCloseTo(hauteurSaut(v0, sommet + ecart), 10);
      expect(vitesseSaut(v0, sommet - ecart)).toBeCloseTo(-vitesseSaut(v0, sommet + ecart), 10);
    }));
  });
});

describe("le tir : position et vitesse", () => {
  // v0 = 8 m/s, α = 30°, H = 2,20 m : v0·cos(α) = 4·√3 m/s et v0·sin(α) = 4 m/s
  const tendu: Tir = { v0: 8, angle: 30, hauteur: 2.2 };

  it("part du point de lâcher avec la vitesse v0 inclinée de α", () => {
    expect(positionTir(tendu, 0)).toEqual({ x: 0, y: 2.2 });
    expect(vitesseTir(tendu, 0).vx).toBeCloseTo(4 * RACINE_3, 12);
    expect(vitesseTir(tendu, 0).vy).toBeCloseTo(4, 12);
    fc.assert(fc.property(tirRegle, (tir) => {
      const { vx, vy } = vitesseTir(tir, 0);
      expect(Math.hypot(vx, vy)).toBeCloseTo(tir.v0, 10);
      expect(vy / vx).toBeCloseTo(Math.tan((tir.angle * Math.PI) / 180), 10);
    }));
  });
  it("suit x(t) = v0·cos(α)·t et y(t) = −½·g·t² + v0·sin(α)·t + H", () => {
    const p = positionTir(tendu, 0.5);
    expect(p.x).toBeCloseTo(2 * RACINE_3, 12); // 4·√3 × 0,5
    expect(p.y).toBeCloseTo(2.97375, 12); // −4,905 × 0,25 + 4 × 0,5 + 2,2
    const v = vitesseTir(tendu, 0.5);
    expect(v.vx).toBeCloseTo(4 * RACINE_3, 12);
    expect(v.vy).toBeCloseTo(-0.905, 12); // −9,81 × 0,5 + 4
  });
  it("garde la même vitesse horizontale pendant tout le vol", () => {
    fc.assert(fc.property(tirRegle, part, (tir, k) => {
      const t = k * instantSol(tir);
      expect(vitesseTir(tir, t).vx).toBe(vitesseTir(tir, 0).vx);
      expect(positionTir(tir, t).x).toBeCloseTo(vitesseTir(tir, 0).vx * t, 10);
    }));
  });
  it("perd 9,81 m/s de vitesse verticale par seconde", () => {
    fc.assert(fc.property(tirRegle, part, (tir, k) => {
      const t = k * instantSol(tir);
      expect(vitesseTir(tir, t + 1).vy).toBeCloseTo(vitesseTir(tir, t).vy - 9.81, 10);
    }));
  });
});

describe("le tir : sommet", () => {
  it("donne l'instant, l'abscisse et la hauteur du sommet", () => {
    // v0·sin(α) = 4 m/s : t = 4 / 9,81 ; x = 4·√3 × 4 / 9,81 ; y = 2,2 + 16 / 19,62
    const tendu = sommetTir({ v0: 8, angle: 30, hauteur: 2.2 });
    expect(tendu.t).toBeCloseTo(0.40775, 5);
    expect(tendu.x).toBeCloseTo(2.82496, 5);
    expect(tendu.y).toBeCloseTo(3.01549, 5);
    // v0·sin(α) = 4·√3 m/s : t = 4·√3 / 9,81 ; x = 4 × t ; y = 2,2 + 48 / 19,62
    const cloche = sommetTir({ v0: 8, angle: 60, hauteur: 2.2 });
    expect(cloche.t).toBeCloseTo(0.70624, 5);
    expect(cloche.x).toBeCloseTo(2.82496, 5);
    expect(cloche.y).toBeCloseTo(4.64648, 5);
  });
  it("a une vitesse verticale nulle au sommet, et le ballon n'est jamais plus haut", () => {
    fc.assert(fc.property(tirRegle, part, (tir, k) => {
      const sommet = sommetTir(tir);
      expect(vitesseTir(tir, sommet.t).vy).toBeCloseTo(0, 10);
      expect(positionTir(tir, k * instantSol(tir)).y).toBeLessThanOrEqual(sommet.y + 1e-12);
    }));
  });
  it("monte et descend de façon symétrique autour du sommet", () => {
    fc.assert(fc.property(tirRegle, part, (tir, k) => {
      const sommet = sommetTir(tir);
      const ecart = k * sommet.t;
      expect(positionTir(tir, sommet.t - ecart).y).toBeCloseTo(positionTir(tir, sommet.t + ecart).y, 10);
      expect(vitesseTir(tir, sommet.t - ecart).vy).toBeCloseTo(-vitesseTir(tir, sommet.t + ecart).vy, 10);
    }));
  });
  it("place le sommet au point de lâcher pour un tir horizontal ou vers le bas", () => {
    expect(sommetTir({ v0: 6, angle: 0, hauteur: 2 })).toEqual({ t: 0, x: 0, y: 2 });
    expect(sommetTir({ v0: 6, angle: -20, hauteur: 2 })).toEqual({ t: 0, x: 0, y: 2 });
  });
});

describe("le tir : passage à la hauteur du cercle", () => {
  it("donne l'instant et l'abscisse du passage à 3,05 m en descendant", () => {
    // v0 = 8 m/s, α = 60°, H = 2,20 m : 4,905·t² − 4·√3·t + 0,85 = 0, Δ = 48 − 16,677 = 31,323
    // t = (4·√3 + √31,323) / 9,81 et x = 4 × t
    const passage = passageAuPanier({ v0: 8, angle: 60, hauteur: 2.2 });
    expect(passage?.t).toBeCloseTo(1.27675, 5);
    expect(passage?.x).toBeCloseTo(5.10699, 5);
  });
  it("vaut null quand le sommet est sous 3,05 m", () => {
    expect(passageAuPanier({ v0: 8, angle: 30, hauteur: 2.2 })).toBeNull(); // sommet à 3,015 m
    expect(passageAuPanier({ v0: 5, angle: 30, hauteur: 1.8 })).toBeNull(); // sommet à 2,119 m
    expect(passageAuPanier({ v0: 0, angle: 45, hauteur: 2.2 })).toBeNull();
  });
  it("vaut null pour un tir vers le bas lâché sous le cercle, même rapide", () => {
    expect(passageAuPanier({ v0: 10, angle: -60, hauteur: 2.2 })).toBeNull();
  });
  it("donne le passage d'un ballon lâché au-dessus du cercle", () => {
    // lâché à 4 m sans vitesse verticale : 4,905·t² = 0,95
    const passage = passageAuPanier({ v0: 2, angle: 0, hauteur: 4 });
    expect(passage?.t).toBeCloseTo(Math.sqrt(0.95 / 4.905), 12);
    expect(passage?.x).toBeCloseTo(2 * Math.sqrt(0.95 / 4.905), 12);
  });
  it("existe dès que le sommet atteint 3,05 m ; le ballon est alors à 3,05 m, après le sommet, et il descend", () => {
    fc.assert(fc.property(tirRegle, (tir) => {
      const passage = passageAuPanier(tir);
      const sommet = sommetTir(tir);
      if (!passage) {
        expect(sommet.y).toBeLessThan(PANIER.y + 1e-9);
        return;
      }
      expect(sommet.y).toBeGreaterThanOrEqual(PANIER.y - 1e-9);
      expect(passage.t).toBeGreaterThanOrEqual(sommet.t - 1e-9);
      expect(positionTir(tir, passage.t).y).toBeCloseTo(PANIER.y, 9);
      expect(positionTir(tir, passage.t).x).toBeCloseTo(passage.x, 12);
      expect(vitesseTir(tir, passage.t).vy).toBeLessThanOrEqual(1e-9);
    }));
  });
});

describe("le tir : verdict", () => {
  it("marque avec v0 = 7,45 m/s et α = 45° depuis H = 2,20 m", () => {
    // v0·cos(α) = v0·sin(α) = 7,45 / √2 ; Δ = 7,45² / 2 − 16,677 = 11,07425
    // t = (7,45 / √2 + √11,07425) / 9,81 = 0,87622 s, d'où x = 4,616 m : à 1,6 cm du centre du cercle
    const tir: Tir = { v0: 7.45, angle: 45, hauteur: 2.2 };
    expect(passageAuPanier(tir)?.t).toBeCloseTo(0.87622, 5);
    expect(passageAuPanier(tir)?.x).toBeCloseTo(4.61589, 5);
    expect(verdictTir(tir)).toEqual({ resultat: "reussi" });
  });
  it("marque en plein centre avec la vitesse que donne l'équation de la trajectoire", () => {
    // à 45°, y(x) = 3,05 pour x = 4,60 donne v0² = g × 4,6² / (4,6 − 0,85)
    const tir: Tir = { v0: Math.sqrt((PESANTEUR * 4.6 * 4.6) / 3.75), angle: 45, hauteur: 2.2 };
    expect(passageAuPanier(tir)?.x).toBeCloseTo(4.6, 10);
    expect(verdictTir(tir)).toEqual({ resultat: "reussi" });
  });
  it("marque avec les vitesses voisines que le curseur permet, et plus au-delà", () => {
    const a45 = (v0: number) => verdictTir({ v0, angle: 45, hauteur: 2.2 }).resultat;
    expect([7.3, 7.35, 7.4, 7.45, 7.5, 7.55].map(a45)).toEqual(["court", "reussi", "reussi", "reussi", "reussi", "long"]);
    expect(verdictTir({ v0: 7.35, angle: 52, hauteur: 2.2 })).toEqual({ resultat: "reussi" });
    expect(verdictTir({ v0: 9.75, angle: 75, hauteur: 2.2 })).toEqual({ resultat: "reussi" });
  });
  it("dit de combien un tir est trop court", () => {
    // v0 = 7 m/s, α = 45° : Δ = 24,5 − 16,677 = 7,823 ; t = (7 / √2 + √7,823) / 9,81 ; x = 7 / √2 × t = 3,9087 m
    const x = (7 / RACINE_2) * ((7 / RACINE_2 + Math.sqrt(7.823)) / 9.81);
    expect(x).toBeCloseTo(3.9087, 4);
    expect(verdictTir({ v0: 7, angle: 45, hauteur: 2.2 })).toEqual({ resultat: "court", ecart: expect.closeTo(4.6 - x, 10) });
    expect(verdictTir({ v0: 7, angle: 45, hauteur: 2.2 })).toEqual({ resultat: "court", ecart: expect.closeTo(0.6913, 4) });
  });
  it("dit de combien un tir est trop long", () => {
    // v0 = 8 m/s, α = 60° : x = 5,1070 m au passage à 3,05 m
    expect(verdictTir({ v0: 8, angle: 60, hauteur: 2.2 })).toEqual({ resultat: "long", ecart: expect.closeTo(0.507, 4) });
  });
  it("dit que le ballon ne monte pas assez haut, et donne la hauteur du sommet", () => {
    // v0 = 8 m/s, α = 30° : sommet à 2,2 + 16 / 19,62 = 3,0155 m
    expect(verdictTir({ v0: 8, angle: 30, hauteur: 2.2 })).toEqual({ resultat: "trop-bas", sommet: expect.closeTo(3.0155, 4) });
    expect(verdictTir({ v0: 10, angle: -60, hauteur: 2.2 })).toEqual({ resultat: "trop-bas", sommet: 2.2 });
  });
  it("réussit à moins de 0,15 m du centre du cercle, et seulement là", () => {
    fc.assert(fc.property(tirRegle, (tir) => {
      const verdict = verdictTir(tir);
      const passage = passageAuPanier(tir);
      if (verdict.resultat === "trop-bas") {
        expect(passage).toBeNull();
        expect(verdict.sommet).toBe(sommetTir(tir).y);
        expect(verdict.sommet).toBeLessThan(PANIER.y + 1e-9);
        return;
      }
      expect(passage).not.toBeNull();
      const x = passage?.x ?? Number.NaN;
      if (verdict.resultat === "reussi") expect(Math.abs(x - PANIER.x)).toBeLessThan(TOLERANCE_PANIER);
      if (verdict.resultat === "court") {
        expect(verdict.ecart).toBeGreaterThanOrEqual(TOLERANCE_PANIER);
        expect(x).toBeCloseTo(PANIER.x - verdict.ecart, 12);
      }
      if (verdict.resultat === "long") {
        expect(verdict.ecart).toBeGreaterThanOrEqual(TOLERANCE_PANIER);
        expect(x).toBeCloseTo(PANIER.x + verdict.ecart, 12);
      }
    }));
  });
});

describe("le tir : fin du vol", () => {
  it("donne l'instant où le ballon touche le sol", () => {
    // v0 = 8 m/s, α = 30°, H = 2,20 m : t = (4 + √(16 + 43,164)) / 9,81
    expect(instantSol({ v0: 8, angle: 30, hauteur: 2.2 })).toBeCloseTo(1.19183, 5);
    // lâché sans vitesse à 4,905 m : ½·g·t² = 4,905, donc t = 1 s
    expect(instantSol({ v0: 0, angle: 0, hauteur: 4.905 })).toBeCloseTo(1, 12);
    expect(instantSol({ v0: 7, angle: 50, hauteur: 0 })).toBeCloseTo((2 * 7 * Math.sin((50 * Math.PI) / 180)) / 9.81, 12);
  });
  it("arrive au sol à la hauteur zéro, en descendant, après le sommet", () => {
    fc.assert(fc.property(tirRegle, (tir) => {
      const t = instantSol(tir);
      expect(positionTir(tir, t).y).toBeCloseTo(0, 9);
      expect(vitesseTir(tir, t).vy).toBeLessThan(0);
      expect(t).toBeGreaterThan(sommetTir(tir).t);
    }));
  });
  it("arrête le vol dans le cercle si le tir est réussi, au sol sinon", () => {
    const reussi: Tir = { v0: 7.45, angle: 45, hauteur: 2.2 };
    expect(finDuVol(reussi)).toBe(passageAuPanier(reussi)?.t);
    expect(positionTir(reussi, finDuVol(reussi)).y).toBeCloseTo(3.05, 10);
    for (const rate of [{ v0: 7, angle: 45, hauteur: 2.2 }, { v0: 8, angle: 60, hauteur: 2.2 }, { v0: 8, angle: 30, hauteur: 2.2 }]) {
      expect(finDuVol(rate)).toBe(instantSol(rate));
      expect(positionTir(rate, finDuVol(rate)).y).toBeCloseTo(0, 10);
    }
    fc.assert(fc.property(tirRegle, (tir) => {
      expect(finDuVol(tir)).toBe(verdictTir(tir).resultat === "reussi" ? passageAuPanier(tir)?.t : instantSol(tir));
    }));
  });
});
