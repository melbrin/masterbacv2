import { describe, expect, it } from "vitest";
import { corrige, enExposant, norme, saisieDeTrou } from "@/lib/commun/quiz";

describe("correction des quiz", () => {
  it("QCM : seul l'indice de la bonne réponse est juste, un indice hors liste est faux", () => {
    const choix = ["a", "b", "c"];
    expect(corrige("qcm", choix, { c: 1 }, { type: "qcm", choix: 1 })).toEqual({ juste: true, bonneReponse: "b" });
    expect(corrige("qcm", choix, { c: 1 }, { type: "qcm", choix: 0 }).juste).toBe(false);
    expect(corrige("qcm", choix, { c: 1 }, { type: "qcm", choix: 7 }).juste).toBe(false);
  });
  it("vrai ou faux", () => {
    expect(corrige("vrai_faux", undefined, { reponse: false }, { type: "vrai_faux", valeur: false })).toEqual({ juste: true, bonneReponse: "Faux" });
    expect(corrige("vrai_faux", undefined, { reponse: true }, { type: "vrai_faux", valeur: false }).juste).toBe(false);
  });
  it("texte à trous : ignore la casse, les accents, les espaces et les signes de produit ; accepte les équivalents", () => {
    const c = { reponse: "n × V", acceptees: ["quantité de matière"] };
    for (const texte of ["n×V", "N * V", "n.v", "n·V", "Quantite de Matiere", " quantité  de matière "]) {
      expect(corrige("trou", undefined, c, { type: "trou", texte }).juste, texte).toBe(true);
    }
    expect(corrige("trou", undefined, c, { type: "trou", texte: "n + V" }).juste).toBe(false);
    expect(corrige("trou", undefined, c, { type: "trou", texte: "   " }).juste).toBe(false);
    expect(norme("É·T é")).toBe("ete");
  });
  it("association : toutes les paires, dans l'ordre des éléments de gauche", () => {
    const c = { paires: [{ left: "pH < 7", right: "acide" }, { left: "pH > 7", right: "basique" }] };
    expect(corrige("association", undefined, c, { type: "association", droites: ["acide", "basique"] }).juste).toBe(true);
    expect(corrige("association", undefined, c, { type: "association", droites: ["basique", "acide"] }).juste).toBe(false);
    expect(corrige("association", undefined, c, { type: "association", droites: ["acide"] }).juste).toBe(false);
  });
  it("mise en ordre", () => {
    const c = { ordre: ["a", "b", "c"] };
    expect(corrige("ordre", undefined, c, { type: "ordre", elements: ["a", "b", "c"] })).toEqual({ juste: true, bonneReponse: "a, puis b, puis c" });
    expect(corrige("ordre", undefined, c, { type: "ordre", elements: ["b", "a", "c"] }).juste).toBe(false);
  });
  it("une réponse d'un autre type que la question est fausse", () => {
    expect(corrige("qcm", ["a"], { c: 0 }, { type: "vrai_faux", valeur: true }).juste).toBe(false);
    expect(corrige("ordre", undefined, {}, { type: "ordre", elements: [] }).juste).toBe(false);
  });
});

describe("écriture des exposants dans une réponse à trou", () => {
  it("accepte toutes les façons d'écrire une puissance ou un indice", () => {
    const c = { reponse: "10⁻¹⁴", acceptees: ["1e-14"] };
    for (const texte of ["10⁻¹⁴", "10^-14", "10^(-14)", "10 ^ −14", "1e-14"]) expect(corrige("trou", undefined, c, { type: "trou", texte }).juste).toBe(true);
    for (const texte of ["10¹⁴", "10^14", "14", ""]) expect(corrige("trou", undefined, c, { type: "trou", texte }).juste).toBe(false);
    expect(corrige("trou", undefined, { reponse: "U²" }, { type: "trou", texte: "u^2" }).juste).toBe(true);
    expect(corrige("trou", undefined, { reponse: "f'₂" }, { type: "trou", texte: "f'2" }).juste).toBe(true);
  });
  it("monte les chiffres en exposant pendant la saisie, après « ^ » ou la touche d'exposant", () => {
    expect(enExposant("-14")).toBe("⁻¹⁴");
    expect(saisieDeTrou("10", "10^", false)).toEqual({ texte: "10", exposant: true });
    expect(saisieDeTrou("10", "10-", true)).toEqual({ texte: "10⁻", exposant: true });
    expect(saisieDeTrou("10⁻", "10⁻1", true)).toEqual({ texte: "10⁻¹", exposant: true });
    // une lettre termine l'exposant ; sans exposant en cours, rien ne change
    expect(saisieDeTrou("10⁻¹⁴", "10⁻¹⁴ ", true)).toEqual({ texte: "10⁻¹⁴ ", exposant: false });
    expect(saisieDeTrou("10", "104", false)).toEqual({ texte: "104", exposant: false });
    // un effacement ou un collage passent tels quels, sans « ^ »
    expect(saisieDeTrou("10⁻¹", "10⁻", true).texte).toBe("10⁻");
    expect(saisieDeTrou("", "10^-14", false).texte).toBe("10-14");
  });
});
