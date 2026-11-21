import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { aUneFormule, ID_JEUX, jeu, JEUX, lignesEssentiel, melangeGraine, tire } from "@/lib/commun/jeux";

describe("tirage des jeux", () => {
  it("la même graine donne le même ordre, et rien n'est perdu ni ajouté", () => {
    fc.assert(fc.property(fc.array(fc.integer(), { maxLength: 30 }), fc.integer({ min: 0, max: 2 ** 31 }), (liste, graine) => {
      const a = melangeGraine(liste, graine);
      expect(melangeGraine(liste, graine)).toEqual(a);
      expect([...a].sort((x, y) => x - y)).toEqual([...liste].sort((x, y) => x - y));
    }));
  });
  it("ne modifie pas la liste reçue, et deux graines donnent en général deux ordres", () => {
    const liste = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const copie = liste.slice();
    const a = melangeGraine(liste, 7);
    expect(liste).toEqual(copie);
    expect(melangeGraine(liste, 8)).not.toEqual(a);
    expect(melangeGraine(liste, 0)).toEqual(melangeGraine(liste, 1));
  });
  it("tire au plus n éléments, tous différents", () => {
    expect(tire([1, 2, 3, 4, 5], 3, 42)).toHaveLength(3);
    expect(new Set(tire([1, 2, 3, 4, 5], 3, 42)).size).toBe(3);
    expect(tire([1, 2], 5, 42)).toHaveLength(2);
    expect(tire([1, 2], -1, 42)).toEqual([]);
  });
});

describe("lignes des tableaux de L'essentiel", () => {
  const html = `<h3>À connaître par cœur</h3><table><colgroup><col style="width: 33%"></colgroup><thead><tr class="header"><th>Notion</th><th>Relation</th><th>À retenir</th></tr></thead>
<tbody><tr class="odd"><td>Chute libre</td><td><span class="math inline"><span class="katex">a = g</span></span></td><td>Seul le poids agit.</td></tr>
<tr class="even"><td>Vitesse</td><td>v = d / t</td><td>En <span class="math inline"><span class="katex">m/s</span></span>.</td></tr>
<tr class="odd"><td>Incomplète</td><td></td><td>Rien</td></tr>
<tr class="even"><td>Deux cellules</td><td>x</td></tr></tbody></table>
<h3>À savoir retrouver</h3><table><thead><tr class="header"><th>Notion</th><th>Relation</th><th>Comment la retrouver</th></tr></thead>
<tbody><tr class="odd"><td>Durée de chute</td><td>t = √(2H/g)</td><td>Écrivez z(t) = 0.</td></tr></tbody></table>
<h3>Votre parcours</h3><table><tbody><tr><td>Objectif 10</td><td>Q.1</td><td>Ex. 1</td></tr></tbody></table>`;
  it("lit les tableaux de relations, une ligne par notion, et écarte les lignes incomplètes", () => {
    const lignes = lignesEssentiel(html, 3);
    expect(lignes.map((l) => l.id)).toEqual(["3-1", "3-2", "3-3"]);
    expect(lignes[0]).toMatchObject({ fiche: 3, notion: "Chute libre", retenir: "Seul le poids agit.", nature: "coeur" });
    expect(lignes[2]).toMatchObject({ notion: "Durée de chute", retenir: "Écrivez z(t) = 0.", nature: "retrouver" });
    expect(lignes[0].relation).toContain("katex");
    expect(lignes[1].relation).toBe("v = d / t");
  });
  it("ne lit pas le tableau du parcours, ni un tableau sans en-tête de relations, et renvoie une liste vide sans tableau", () => {
    expect(lignesEssentiel(html, 3).some((l) => l.notion === "Objectif 10")).toBe(false);
    expect(lignesEssentiel("<p>Pas de tableau</p>", 1)).toEqual([]);
    expect(lignesEssentiel("<table><tr><td>a</td><td>b</td><td>c</td></tr>", 1)).toEqual([]);
    expect(lignesEssentiel("<table><thead><tr><th>Notion</th><th>Relation</th><th>À retenir</th></tr></thead><tr><td>a</td><td>b</td><td>c</td></tr>", 1)).toHaveLength(1);
  });
  it("repère les cellules qui portent une formule", () => {
    const [a, b] = lignesEssentiel(html, 3);
    expect(aUneFormule(a.relation)).toBe(true);
    expect(aUneFormule(b.relation)).toBe(false);
  });
});

describe("liste des jeux", () => {
  it("compte dix jeux aux identifiants uniques, dont trois corrigés par le serveur", () => {
    expect(JEUX).toHaveLength(10);
    expect(new Set(ID_JEUX).size).toBe(10);
    expect(JEUX.filter((j) => j.serveur).map((j) => j.id)).toEqual(["chrono", "vraifaux", "ordre"]);
    expect(jeu("paires")?.nom).toBe("Paires");
    expect(jeu("inconnu")).toBeNull();
  });
});
