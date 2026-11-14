import { describe, expect, it } from "vitest";
import { etiquetteBac, etiquetteDapres, majusculeInitiale, nombreRelatif, puissanceDeDix, rangFeminin } from "@/lib/commun/format";

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

describe("nombre qui peut être négatif", () => {
  it("écrit le vrai signe moins, et jamais de signe devant zéro", () => {
    expect(nombreRelatif(-3.426, 2)).toBe("−3,43");
    expect(nombreRelatif(3.426, 2)).toBe("3,43");
    expect(nombreRelatif(-0.004, 2)).toBe("0,00");
    expect(nombreRelatif(-0, 1)).toBe("0,0");
    expect(nombreRelatif(-19.81)).toBe("−19,8");
  });
});

describe("écriture scientifique", () => {
  const net = (texte: string) => texte.replace(/\u00a0/g, " ");
  it("écrit deux chiffres et une puissance de dix", () => {
    expect(net(puissanceDeDix(0.01))).toBe("1,0 × 10⁻²");
    expect(net(puissanceDeDix(2.5e-4))).toBe("2,5 × 10⁻⁴");
    expect(net(puissanceDeDix(6.02e23, 3))).toBe("6,02 × 10²³");
    expect(net(puissanceDeDix(340))).toBe("3,4 × 10²");
  });
  it("n'écrit pas la puissance entre 1 et 10, et remonte d'un cran quand l'arrondi donne 10", () => {
    expect(puissanceDeDix(3.16)).toBe("3,2");
    expect(net(puissanceDeDix(9.96e-3))).toBe("1,0 × 10⁻²");
    expect(puissanceDeDix(0)).toBe("0,0");
  });
});
