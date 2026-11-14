// La paillasse « ccm » (lib/commun/tp/paillasses/ccm.ts) : une chromatographie sur couche mince, jouée ici sans le
// navigateur, geste par geste. Le TP qui s'en sert, « synthese », est joué en entier dans reflux.test.ts.
import { describe, expect, it } from "vitest";
import { HAUTEUR, depotSur, distancesExactes, frontActuel, frontVisible, hauteurDepots, regles, taches, type EtatCcm, type ReglagesCcm } from "@/lib/commun/tp/paillasses/ccm";
import { rejoue, type GesteBrut } from "@/lib/commun/tp/types";

const pur: ReglagesCcm = { rfReactif: 0.3, rfProduit: 0.68, reste: false, noms: { reactif: "alcool benzylique", produit: "éthanoate de benzyle", eluant: "cyclohexane et éthanoate d'éthyle" } };
const impur: ReglagesCcm = { ...pur, rfReactif: 0.26, rfProduit: 0.62, reste: true };
const joue = (gestes: GesteBrut[], r: ReglagesCcm = pur): EtatCcm => rejoue(regles, r, gestes);
const fautes = (gestes: GesteBrut[], r: ReglagesCcm = pur) => regles.bilan(r, joue(gestes, r)).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);
const vingtieme = (x: number) => Math.round(x * 20) / 20;

// ---------- les gestes d'un élève soigneux ----------
const cuve: GesteBrut[] = [{ g: "eluant", v: 0.5 }, { g: "couvercle", pose: true }];
const ligne: GesteBrut[] = [{ g: "trait", h: 1, outil: "crayon" }];
const depot = (s: string, v = 1.5): GesteBrut[] => [{ g: "capillaire", de: "pot", vers: s }, { g: "deposer", de: s, ou: s, v }];
const depots: GesteBrut[] = [...depot("a"), ...depot("p"), ...depot("r")];
const migration = (minutes = 12): GesteBrut[] => [{ g: "couvercle", pose: false }, { g: "plonger" }, { g: "couvercle", pose: true }, { g: "attendre", v: minutes }, { g: "couvercle", pose: false }, { g: "sortir" }];
/** Marque le front là où il est, révèle, puis note les trois distances lues à un demi-millimètre près. */
function releve(r: ReglagesCcm, avant: GesteBrut[], decalage = 0): GesteBrut[] {
  const etat = joue(avant, r);
  const front = frontActuel(etat);
  const parcours = front - hauteurDepots(etat);
  return [{ g: "trait", h: vingtieme(front), outil: "crayon" }, { g: "uv", marche: true },
    { g: "noter", quoi: "front", v: vingtieme(parcours) + decalage }, { g: "noter", quoi: "a", v: vingtieme(r.rfReactif * parcours) + decalage }, { g: "noter", quoi: "r", v: vingtieme(r.rfProduit * parcours) + decalage }];
}
/** La chromatographie soignée d'une situation. `change` remplace une partie des gestes pour y glisser une faute. */
function soignee(r: ReglagesCcm = pur, change: { cuve?: GesteBrut[]; ligne?: GesteBrut[]; depots?: GesteBrut[]; migration?: GesteBrut[] } = {}): GesteBrut[] {
  const avant = [...(change.cuve ?? cuve), ...(change.ligne ?? ligne), ...(change.depots ?? depots), ...(change.migration ?? migration())];
  return [...avant, ...releve(r, avant)];
}

describe("la cuve et son éluant", () => {
  it("l'éluant ne se verse que dans la cuve ouverte, et deux morceaux d'un versement valent leur somme", () => {
    expect(joue([{ g: "eluant", v: 0.2 }, { g: "eluant", v: 0.3 }])).toEqual(joue([{ g: "eluant", v: 0.5 }]));
    expect(joue([{ g: "couvercle", pose: true }, { g: "eluant", v: 0.5 }]).eluant).toBe(0);
    expect(joue([{ g: "eluant", v: 9 }]).eluant).toBe(3);
  });
  it("fermée avec son éluant, la cuve se sature ; vidée, elle ne l'est plus", () => {
    expect(joue(cuve).saturee).toBe(true);
    expect(joue([{ g: "couvercle", pose: true }, { g: "couvercle", pose: false }, { g: "eluant", v: 0.5 }]).saturee).toBe(false);
    const videe = joue([...cuve, { g: "couvercle", pose: false }, { g: "vider" }]);
    expect([videe.eluant, videe.saturee]).toEqual([0, false]);
    // on ne vide pas une cuve fermée, ni une cuve où trempe la plaque
    expect(joue([...cuve, { g: "vider" }]).eluant).toBe(0.5);
    expect(joue([{ g: "eluant", v: 0.5 }, { g: "plonger" }, { g: "vider" }]).eluant).toBe(0.5);
  });
});

describe("la plaque avant la migration", () => {
  it("le premier trait est la ligne de dépôt ; elle ne se retrace plus après les dépôts", () => {
    expect(joue(ligne).ligne).toBe(1);
    expect(joue([{ g: "trait", h: 1.4, outil: "crayon" }, { g: "trait", h: 1, outil: "crayon" }]).ligne).toBe(1);
    expect(joue([...ligne, ...depot("a"), { g: "trait", h: 2, outil: "crayon" }]).ligne).toBe(1);
    expect(joue([{ g: "trait", h: 1, outil: "stylo" }]).encre).toBe(true);
  });
  it("un capillaire neuf ne porte que la solution de son flacon ; déplacé dans un autre flacon, il porte les deux", () => {
    const propre = joue(depot("a"));
    expect(propre.capillaires).toEqual({ a: ["a"], p: null, r: null });
    expect([propre.depots.a, propre.souille]).toEqual([{ a: 1.5, p: 0, r: 0 }, false]);
    const sale = joue([{ g: "capillaire", de: "pot", vers: "a" }, { g: "capillaire", de: "a", vers: "p" }, { g: "deposer", de: "p", ou: "p", v: 1.5 }]);
    expect(sale.capillaires).toEqual({ a: null, p: ["a", "p"], r: null });
    expect([sale.depots.p, sale.souille]).toEqual([{ a: 1.5, p: 1.5, r: 0 }, true]);
    // un capillaire neuf remplace celui qui a trempé dans deux flacons
    expect(joue([{ g: "capillaire", de: "pot", vers: "a" }, { g: "capillaire", de: "a", vers: "p" }, { g: "capillaire", de: "pot", vers: "p" }]).capillaires).toEqual({ a: null, p: ["p"], r: null });
    // un flacon ne reçoit qu'un capillaire, et on ne dépose pas sans capillaire
    expect(joue([...depot("a"), { g: "capillaire", de: "pot", vers: "a" }])).toEqual(propre);
    expect(joue([{ g: "deposer", de: "a", ou: "a", v: 2 }]).depots.a.a).toBe(0);
  });
  it("le dépôt grossit tant que le contact dure : deux touches valent leur somme", () => {
    const debut: GesteBrut[] = [{ g: "capillaire", de: "pot", vers: "r" }];
    expect(joue([...debut, { g: "deposer", de: "r", ou: "r", v: 1 }, { g: "deposer", de: "r", ou: "r", v: 0.7 }])).toEqual(joue([...debut, { g: "deposer", de: "r", ou: "r", v: 1.7 }]));
    expect(depotSur(joue([...debut, { g: "deposer", de: "r", ou: "r", v: 60 }]), "r")).toBe(20);
  });
});

describe("la migration", () => {
  it("le front monte de moins en moins vite, et s'arrête en haut de la plaque", () => {
    const apres = (minutes: number) => frontActuel(joue([...cuve, ...ligne, ...depots, { g: "couvercle", pose: false }, { g: "plonger" }, { g: "couvercle", pose: true }, { g: "attendre", v: minutes }]));
    expect(apres(0.01)).toBeCloseTo(0.66, 2);
    expect(apres(4)).toBeCloseTo(0.5 + Math.sqrt(10), 2);
    expect(apres(12)).toBe(5.98);
    expect(apres(8) - apres(4)).toBeLessThan(apres(4) - apres(0.01));
    expect(apres(40)).toBe(HAUTEUR);
  });
  it("deux attentes valent leur somme, et cuve ouverte le front monte moins vite", () => {
    const debut: GesteBrut[] = [...cuve, ...ligne, ...depots, { g: "couvercle", pose: false }, { g: "plonger" }];
    expect(joue([...debut, { g: "attendre", v: 3.2 }, { g: "attendre", v: 4.8 }])).toEqual(joue([...debut, { g: "attendre", v: 8 }]));
    const ouverte = joue([...debut, { g: "attendre", v: 10 }]);
    const fermee = joue([...debut, { g: "couvercle", pose: true }, { g: "attendre", v: 10 }]);
    expect([ouverte.ouvert, fermee.ouvert]).toEqual([10, 0]);
    expect(frontActuel(ouverte)).toBeLessThan(frontActuel(fermee));
  });
  it("la plaque n'entre et ne sort que cuve ouverte, et ne retourne pas dans la cuve", () => {
    expect(joue([...cuve, { g: "plonger" }]).dansCuve).toBe(false);
    const dedans: GesteBrut[] = [{ g: "eluant", v: 0.5 }, { g: "plonger" }, { g: "couvercle", pose: true }, { g: "attendre", v: 5 }];
    expect(joue([...dedans, { g: "sortir" }]).dansCuve).toBe(true);
    const sortie = joue([...dedans, { g: "couvercle", pose: false }, { g: "sortir" }, { g: "plonger" }]);
    expect([sortie.dansCuve, sortie.front]).toEqual([false, 4.04]);
    // pendant la migration, on ne trace ni ne dépose
    expect(joue([...dedans, { g: "trait", h: 3, outil: "crayon" }, { g: "capillaire", de: "pot", vers: "a" }, { g: "deposer", de: "a", ou: "a", v: 1 }]).depots.a.a).toBe(0);
  });
  it("une ligne de dépôt sous l'éluant : les dépôts se dissolvent, il n'y a plus de tache", () => {
    const noyee = joue([{ g: "eluant", v: 1.2 }, ...ligne, ...depots, { g: "plonger" }, { g: "attendre", v: 8 }]);
    expect(noyee.dissous).toBe(true);
    expect(taches(pur, noyee)).toEqual({ a: [], p: [], r: [] });
    // l'éluant ajouté pendant que la plaque trempe peut aussi la noyer
    expect(joue([{ g: "eluant", v: 0.5 }, ...ligne, ...depots, { g: "plonger" }, { g: "eluant", v: 0.6 }]).dissous).toBe(true);
    expect(joue([{ g: "eluant", v: 1.2 }, ...ligne, { g: "plonger" }]).dissous).toBe(false);
  });
  it("chaque espèce monte selon son rapport frontal ; le produit impur donne deux taches", () => {
    const avant = [...cuve, ...ligne, ...depots, ...migration()];
    const t = taches(impur, joue(avant, impur));
    const parcours = 5.98 - 1;
    expect(t.a.map((x) => [x.espece, x.h])).toEqual([["reactif", Math.round((1 + 0.26 * parcours) * 100) / 100]]);
    expect(t.r.map((x) => [x.espece, x.h])).toEqual([["produit", Math.round((1 + 0.62 * parcours) * 100) / 100]]);
    expect(t.p.map((x) => [x.espece, x.pale])).toEqual([["reactif", true], ["produit", false]]);
    expect(taches(pur, joue(avant)).p.map((x) => x.espece)).toEqual(["produit"]);
    // avant la migration, les dépôts sont sur la ligne
    expect(taches(pur, joue([...ligne, ...depots])).a[0].h).toBe(1);
  });
});

describe("le front, la lampe et les distances", () => {
  const avant = [...cuve, ...ligne, ...depots, ...migration()];
  it("à la sortie de la cuve le front se voit ; il disparaît dès que l'élève passe à autre chose", () => {
    expect(frontVisible(joue(avant))).toBe(true);
    expect(frontVisible(joue([...avant, { g: "trait", h: 6, outil: "crayon" }]))).toBe(true);
    expect(frontVisible(joue([...avant, { g: "uv", marche: true }]))).toBe(false);
    expect(frontVisible(joue([...avant, { g: "attendre", v: 1 }]))).toBe(false);
    expect(frontVisible(joue([...avant, { g: "noter", quoi: "front", v: 5 }]))).toBe(false);
    expect(frontVisible(joue([]))).toBe(false);
  });
  it("après la migration, le trait marque le front ; la lampe révèle la plaque sortie de la cuve", () => {
    const marquee = joue([...avant, { g: "trait", h: 6, outil: "crayon" }]);
    expect([marquee.ligne, marquee.marque]).toEqual([1, 6]);
    expect(joue([{ g: "uv", marche: true }]).revelee).toBe(false);
    expect(joue([...avant, { g: "uv", marche: true }]).revelee).toBe(true);
    // la lampe déjà allumée révèle la plaque dès qu'elle revient sur la feuille
    const dessous = joue([{ g: "uv", marche: true }, ...avant]);
    expect([dessous.revelee, dessous.seche]).toEqual([true, false]);
  });
  it("une plaque neuve repart de zéro ; la cuve, les capillaires et la lampe restent", () => {
    const etat = joue([...soignee(), { g: "nouvelle" }]);
    expect([etat.ligne, etat.bain, etat.front, etat.notes.front, etat.essais]).toEqual([null, null, null, null, 1]);
    expect([etat.eluant, etat.capillaires.a, etat.uv]).toEqual([0.5, ["a"], true]);
  });
});

describe("le bilan d'une chromatographie", () => {
  it("une manipulation soignée n'a aucune faute, et rend les distances de l'élève", () => {
    for (const r of [pur, impur]) {
      const b = regles.bilan(r, joue(soignee(r), r));
      expect(b.fautes).toEqual([]);
      expect(b.score).toBe(1);
      expect(b.mesures).toEqual({ H: 5, hA: vingtieme(r.rfReactif * 4.98), hR: vingtieme(r.rfProduit * 4.98) });
      expect(b.lignes[0]).toContain("H = 5,00 cm");
    }
    expect(regles.bilan(impur, joue(soignee(impur), impur)).lignes[1]).toContain("deux taches");
    expect(regles.bilan(pur, joue(soignee())).lignes[1]).toContain("une seule tache");
  });
  it("sans migration, la manipulation vaut zéro, et le professeur donne sa plaque", () => {
    for (const gestes of [[], [...cuve, ...ligne, ...depots], [...cuve, ...ligne, ...depots, { g: "couvercle", pose: false }, { g: "plonger" }]] as GesteBrut[][]) {
      const b = regles.bilan(pur, joue(gestes));
      expect(b.score).toBe(0);
      expect(b.fautes.map((f) => f.code)).toEqual(["migration"]);
      expect(b.mesures).toEqual(distancesExactes(pur));
      expect(b.mesures).toEqual({ H: 5, hA: 1.5, hR: 3.4 });
      expect(b.lignes[0]).toContain("plaque du professeur");
    }
  });
  it("la cuve : pas d'éluant, trop, trop peu, jamais fermée, ouverte pendant la migration", () => {
    expect(fautes(soignee(pur, { cuve: [] }))).toContain("eluant!");
    expect(fautes(soignee(pur, { cuve: [{ g: "eluant", v: 0.9 }, { g: "couvercle", pose: true }] }))).toEqual(["eluant"]);
    expect(fautes(soignee(pur, { cuve: [{ g: "eluant", v: 0.2 }, { g: "couvercle", pose: true }] }))).toEqual(["eluant"]);
    expect(fautes(soignee(pur, { cuve: [{ g: "eluant", v: 0.5 }] }))).toEqual(["couvercle"]);
    const ouverte: GesteBrut[] = [{ g: "couvercle", pose: false }, { g: "plonger" }, { g: "attendre", v: 14 }, { g: "sortir" }];
    expect(fautes(soignee(pur, { migration: ouverte }))).toEqual(["couvercle"]);
    const b = regles.bilan(pur, joue(soignee(pur, { cuve: [{ g: "eluant", v: 0.5 }], migration: ouverte })));
    expect(b.fautes.map((f) => f.code)).toEqual(["couvercle"]);
    expect(b.fautes[0].texte).toContain("ni avant");
  });
  it("la ligne de dépôt : oubliée, mal placée, au stylo, noyée", () => {
    expect(fautes(soignee(pur, { ligne: [] }))).toEqual(["ligne"]);
    expect(fautes(soignee(pur, { ligne: [{ g: "trait", h: 1.6, outil: "crayon" }] }))).toEqual(["ligne"]);
    expect(fautes(soignee(pur, { ligne: [{ g: "trait", h: 1, outil: "stylo" }] }))).toEqual(["stylo"]);
    const noyee = fautes(soignee(pur, { cuve: [{ g: "eluant", v: 1.3 }, { g: "couvercle", pose: true }] }));
    expect(noyee).toContain("noye!");
    expect(noyee).not.toContain("eluant");
  });
  it("les dépôts : un oubli, un mauvais repère, un capillaire pour deux flacons, un dépôt trop gros", () => {
    expect(fautes(soignee(pur, { depots: [...depot("a"), ...depot("p")] }))).toEqual(["depot!"]);
    expect(fautes(soignee(pur, { depots: [...depot("a"), ...depot("p"), { g: "capillaire", de: "pot", vers: "r" }, { g: "deposer", de: "r", ou: "a", v: 1.5 }] }))).toEqual(["depot!", "repere!"]);
    const unSeul: GesteBrut[] = [...depot("a"), { g: "capillaire", de: "a", vers: "p" }, { g: "deposer", de: "p", ou: "p", v: 1.5 }, ...depot("r")];
    expect(fautes(soignee(pur, { depots: unSeul }))).toEqual(["capillaire"]);
    expect(fautes(soignee(pur, { depots: [...depot("a"), ...depot("p", 5), ...depot("r")] }))).toEqual(["gros"]);
    expect(fautes(soignee(pur, { depots: [...depot("a"), ...depot("p", 9), ...depot("r")] }))).toEqual(["gros!"]);
  });
  it("la migration : sortie trop tôt, front arrivé en haut, plaque laissée dans la cuve", () => {
    expect(fautes(soignee(pur, { migration: migration(3) }))).toEqual(["court"]);
    expect(fautes(soignee(pur, { migration: migration(0.5) }))).toEqual(["court!"]);
    expect(fautes(soignee(pur, { migration: migration(30) }))).toEqual(["haut!"]);
    expect(fautes([...cuve, ...ligne, ...depots, { g: "couvercle", pose: false }, { g: "plonger" }, { g: "couvercle", pose: true }, { g: "attendre", v: 12 }])).toEqual(["sortie!", "note!"]);
  });
  it("le front : non marqué, marqué de travers ; la plaque non révélée", () => {
    const avant = [...cuve, ...ligne, ...depots, ...migration()];
    const notes = releve(pur, avant).slice(2);
    expect(fautes([...avant, { g: "uv", marche: true }, ...notes])).toEqual(["front"]);
    expect(fautes([...avant, { g: "trait", h: 5.7, outil: "crayon" }, { g: "uv", marche: true }, { g: "noter", quoi: "front", v: 4.7 }, ...notes.slice(1)])).toEqual(["front"]);
    expect(fautes([...avant, { g: "trait", h: 5, outil: "crayon" }, { g: "uv", marche: true }, { g: "noter", quoi: "front", v: 4 }, ...notes.slice(1)])).toEqual(["front!"]);
    expect(fautes([...avant, { g: "trait", h: 6, outil: "crayon" }, ...notes])).toEqual(["uv!"]);
  });
  it("les distances : oubliées, lues de travers, mesurées depuis le bas de la plaque", () => {
    const avant = [...cuve, ...ligne, ...depots, ...migration()];
    const gestes = releve(pur, avant);
    expect(fautes([...avant, ...gestes.slice(0, 2)])).toEqual(["note!"]);
    expect(fautes([...avant, ...gestes.slice(0, 4)])).toEqual(["note!"]);
    expect(regles.bilan(pur, joue([...avant, ...gestes.slice(0, 4)])).mesures).toEqual(distancesExactes(pur));
    expect(fautes([...avant, ...gestes.slice(0, 4), { g: "noter", quoi: "r", v: 3.65 }])).toEqual(["lecture"]);
    expect(fautes([...avant, ...gestes.slice(0, 4), { g: "noter", quoi: "r", v: 2.6 }])).toEqual(["lecture!"]);
    // le zéro de la règle au bas de la plaque : tout est décalé d'un centimètre
    const decale = regles.bilan(pur, joue([...avant, ...releve(pur, avant, 1)]));
    expect(decale.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["zero!"]);
    expect(decale.fautes[0].texte).toContain("décalées de 1,01 cm");
    expect(fautes([...avant, ...releve(pur, avant, 0.3)])).toEqual(["zero"]);
    // les distances de l'élève le suivent, même fausses
    expect(decale.mesures.H).toBe(6);
  });
  it("un geste inconnu, mal formé ou hors bornes ne change rien", () => {
    const bizarres: GesteBrut[] = [{ g: "secouer" }, { g: "eluant" }, { g: "eluant", v: -1 }, { g: "eluant", v: "beaucoup" }, { g: "eluant", v: 400 }, { g: "couvercle" }, { g: "couvercle", pose: "oui" },
      { g: "trait", h: 1 }, { g: "trait", h: 9, outil: "crayon" }, { g: "trait", h: 1, outil: "feutre" }, { g: "capillaire", de: "pot", vers: "z" }, { g: "capillaire", de: "a", vers: "p" }, { g: "capillaire", de: "p", vers: "p" },
      { g: "deposer", de: "a", ou: "z", v: 1 }, { g: "sortir" }, { g: "attendre", v: 0 }, { g: "attendre", v: 5 }, { g: "uv" }, { g: "uv", marche: false }, { g: "noter", quoi: "front", v: 12 }, { g: "noter", quoi: "p", v: 2 }, { g: "noter", quoi: "a" }, { g: "vider" }];
    expect(joue(bizarres)).toEqual(joue([]));
  });
});
