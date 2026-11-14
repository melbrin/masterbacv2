import { describe, expect, it } from "vitest";
import { etiquetteBac, etiquetteDapres, majusculeInitiale, rangFeminin } from "@/lib/commun/format";

describe("étiquettes du bac", () => {
  it("reprend les années données par la fiche", () => {
    expect(etiquetteBac("Demandé en 2025 et 2026")).toBe("Tombé au BAC 2025 et 2026");
    expect(etiquetteBac("Demandée en 2026 (Asie)")).toBe("Tombé au BAC 2026");
    expect(etiquetteBac("Demandée deux fois en 2025")).toBe("Tombé au BAC 2025");
    expect(etiquetteBac("Demandée en 2025 et en 2026")).toBe("Tombé au BAC 2025 et 2026");
    expect(etiquetteBac("Demandé dans quatre exercices en 2025 et 2026")).toBe("Tombé au BAC 2025 et 2026");
    expect(etiquetteBac("Demandé en 2026, 2024 et 2025")).toBe("Tombé au BAC 2024, 2025 et 2026");
  });
  it("n'invente pas d'année quand la fiche n'en donne pas", () => {
    expect(etiquetteBac("Demandée dans presque tous les sujets")).toBe("Tombé au BAC");
    expect(etiquetteBac("")).toBe("Tombé au BAC");
    expect(etiquetteBac("exercice 2026b ou 12026")).toBe("Tombé au BAC");
  });
  it("nomme le sujet d'un exercice construit d'après le bac", () => {
    expect(etiquetteDapres("voir BAC Polynésie 2025")).toBe("D'après le BAC Polynésie 2025");
    expect(etiquetteDapres("voir BAC Métropole, juin 2026")).toBe("D'après le BAC Métropole, juin 2026");
    expect(etiquetteDapres("voir BAC")).toBe("D'après le BAC");
    expect(etiquetteDapres("Asie 2026")).toBe("D'après le BAC Asie 2026");
  });
});

describe("majuscule en tête d'un texte", () => {
  it("met la majuscule, accents compris", () => {
    expect(majusculeInitiale("deuxième loi de Newton")).toBe("Deuxième loi de Newton");
    expect(majusculeInitiale("énergie cinétique, poids")).toBe("Énergie cinétique, poids");
    expect(majusculeInitiale("  poids")).toBe("  Poids");
  });
  it("passe derrière une balise de paragraphe ou de liste", () => {
    expect(majusculeInitiale("<p>si l'axe est orienté vers le haut</p>")).toBe("<p>Si l'axe est orienté vers le haut</p>");
    expect(majusculeInitiale('<ul class="x"><li>poids</li></ul>')).toBe('<ul class="x"><li>Poids</li></ul>');
  });
  it("ne touche ni une majuscule, ni un chiffre, ni une formule en tête", () => {
    expect(majusculeInitiale("Poids")).toBe("Poids");
    expect(majusculeInitiale("2 méthodes")).toBe("2 méthodes");
    expect(majusculeInitiale('<span class="katex">a</span> vaut g')).toBe('<span class="katex">a</span> vaut g');
    expect(majusculeInitiale("")).toBe("");
  });
});

describe("rang d'une séance", () => {
  it("écrit « première », puis le nombre suivi de « e »", () => {
    expect(rangFeminin(1)).toBe("première");
    expect(rangFeminin(2)).toBe("2e");
    expect(rangFeminin(30)).toBe("30e");
  });
});
