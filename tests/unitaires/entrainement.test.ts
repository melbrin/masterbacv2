// La section « S'entraîner » (lib/commun/entrainement) : ses sous-sections, les adresses qui en font partie, celles qui se montrent.
import { describe, expect, it } from "vitest";
import { ENTRAINEMENT, SECTIONS, dansEntrainement, sectionDe, sectionsOuvertes } from "@/lib/commun/entrainement";
import { JEUX_MEMOIRE } from "@/lib/commun/memoire";

describe("les sous-sections de « S'entraîner »", () => {
  it("sont quatre, dans l'ordre du menu : le labo, les TP, la mémoire, les jeux", () => {
    expect(SECTIONS.map((s) => s.nom)).toEqual(["Labo", "TP", "Mémoire", "Jeux"]);
    expect(SECTIONS.map((s) => s.href)).toEqual(["/app/labo", "/app/tp", "/app/memoire", "/app/jeux"]);
    expect(new Set(SECTIONS.map((s) => s.id)).size).toBe(4);
  });

  it("une adresse appartient à la sous-section dont elle prolonge l'adresse", () => {
    expect(sectionDe("/app/labo")).toBe("labo");
    expect(sectionDe("/app/labo/basket/2")).toBe("labo");
    expect(sectionDe("/app/labo/basket/libre")).toBe("labo");
    expect(sectionDe("/app/tp/essai/3f0c")).toBe("tp");
    expect(sectionDe("/app/memoire/cases")).toBe("memoire");
    expect(sectionDe("/app/jeux/partie/3f0c")).toBe("jeux");
  });

  it("une adresse qui commence seulement pareil n'en fait pas partie", () => {
    for (const chemin of ["/app", "/app/laboratoire", "/app/tpe", "/app/jeuxvideo", "/app/quiz/3f0c", ENTRAINEMENT.href]) expect(sectionDe(chemin), chemin).toBeNull();
  });

  it("l'onglet « S'entraîner » reste allumé sur sa page et dans ses quatre sous-sections, nulle part ailleurs", () => {
    for (const chemin of [ENTRAINEMENT.href, "/app/labo", "/app/labo/rc/1", "/app/tp", "/app/memoire/cases", "/app/jeux"]) expect(dansEntrainement(chemin), chemin).toBe(true);
    for (const chemin of ["/app", "/app/cours", "/app/ds", "/app/progres", "/app/fiche/01", "/app/entrainements"]) expect(dansEntrainement(chemin), chemin).toBe(false);
  });

  it("le labo et les TP ne se montrent que s'ils ont du contenu pour ce compte ; les jeux de révision sont toujours là", () => {
    const memoire = JEUX_MEMOIRE.length > 0 ? ["memoire"] : [];
    const ouvertes = (o: { labo: boolean; tp: boolean }) => sectionsOuvertes(o).map((s) => s.id);
    expect(ouvertes({ labo: true, tp: true })).toEqual(["labo", "tp", ...memoire, "jeux"]);
    expect(ouvertes({ labo: false, tp: true })).toEqual(["tp", ...memoire, "jeux"]);
    expect(ouvertes({ labo: true, tp: false })).toEqual(["labo", ...memoire, "jeux"]);
    expect(ouvertes({ labo: false, tp: false })).toEqual([...memoire, "jeux"]);
  });
});
