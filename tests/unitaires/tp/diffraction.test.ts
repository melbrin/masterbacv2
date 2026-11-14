// La paillasse « diffraction » (lib/commun/tp/paillasses/diffraction.ts) et ses deux TP : le diamètre d'un cheveu
// (étalonnage avec des fentes connues) et une diode laser sans étiquette (interfrange des fentes d'Young).
// Les manipulations sont jouées ici sans le navigateur, geste par geste.
import { describe, expect, it } from "vitest";
import {
  CENTRE, ECRAN_MIN, LARGEUR, diapositive, figureVisible, interfrange, intensite, regles, tacheCentrale,
  type EtatDiffraction, type ReglagesDiffraction,
} from "@/lib/commun/tp/paillasses/diffraction";
import { rejoue, type GesteBrut, type ReglesPaillasse } from "@/lib/commun/tp/types";
import cheveu from "@/lib/serveur/contenu/tp/cheveu";
import young from "@/lib/serveur/contenu/tp/young";
import { GRAINES, controlesCommuns, joueJuste, type EtapeDePaillasse, type ReglesDuTest } from "../../outils/tp";

/** Les TP de diffraction sont en construction : ils ne sont pas inscrits dans l'application, le test donne leurs règles. */
const REGLES: ReglesDuTest = { diffraction: regles as ReglesPaillasse<unknown, unknown> };
const vingtieme = (x: number) => Math.round(x * 20) / 20;
const demi = (x: number) => Math.round(x * 2) / 2;

const BOITE: ReglagesDiffraction["boite"] = [
  { id: "f40", genre: "fente", a: 40, b: 0, nom: "la fente de 40 µm", etiquette: ["fente", "40 µm"] },
  { id: "f60", genre: "fente", a: 60, b: 0, nom: "la fente de 60 µm", etiquette: ["fente", "60 µm"] },
  { id: "f100", genre: "fente", a: 100, b: 0, nom: "la fente de 100 µm", etiquette: ["fente", "100 µm"] },
  { id: "cheveu", genre: "fil", a: 65, b: 0, nom: "le cheveu", etiquette: ["cheveu"] },
  { id: "y30", genre: "young", a: 30, b: 0.3, nom: "les deux fentes écartées de 0,30 mm", etiquette: ["2 fentes", "0,30 mm"] },
];
/** Un étalonnage : laser rouge de 650 nm, trois fentes connues, un cheveu de 65 µm. */
const etalon: ReglagesDiffraction = { lambda: 650, rail: 200, ecran: 100, boite: BOITE, but: { genre: "etalonnage", fentes: ["f40", "f60", "f100"], inconnue: "cheveu", distance: 150 } };
/** Une mesure de longueur d'onde avec les mêmes diapositives. */
const franges: ReglagesDiffraction = { ...etalon, but: { genre: "young", distance: 150 } };
const joue = (r: ReglagesDiffraction, gestes: GesteBrut[]): EtatDiffraction => rejoue(regles, r, gestes);
const fautes = (r: ReglagesDiffraction, gestes: GesteBrut[]) => regles.bilan(r, joue(r, gestes)).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);

// ---------- les gestes d'un élève soigneux ----------
const installer: GesteBrut[] = [{ g: "fixer", on: true }, { g: "laser", on: true }];
const placer = (D: number): GesteBrut[] => [{ g: "ecran", x: D }, { g: "distance", v: D }];
/** Glisse une diapositive, pose les curseurs sur les deux premières extinctions (écartées de `facteur` fois la tache), lit l'écart au demi-millimètre. */
function tache(r: ReglagesDiffraction, id: string, D: number, facteur = 1, lecture = 0): GesteBrut[] {
  const L = tacheCentrale(r.lambda, diapositive(r, id)!.a, D) * facteur;
  const [c1, c2] = [vingtieme(CENTRE - L / 2), vingtieme(CENTRE + L / 2)];
  return [{ g: "diapo", id }, { g: "curseur", k: 1, x: c1 }, { g: "curseur", k: 2, x: c2 }, { g: "mesure", v: demi(c2 - c1) + lecture }];
}
/** L'étalonnage soigné : laser fixé puis allumé, écran placé, les fentes connues, puis la diapositive à mesurer. */
function etalonnage(r: ReglagesDiffraction): GesteBrut[] {
  if (r.but.genre !== "etalonnage") throw new Error("cette paillasse ne fait pas un étalonnage");
  const D = r.but.distance;
  return [...installer, ...placer(D), ...[...r.but.fentes, r.but.inconnue].flatMap((id) => tache(r, id, D)), { g: "laser", on: false }];
}
/** Pose les curseurs sur deux franges séparées de `n` interfranges (décalés de `decalage` mm), lit l'écart et annonce `compte` interfranges. */
function frangesMesurees(r: ReglagesDiffraction, id: string, D: number, n: number, compte = n, decalage = 0, lecture = 0): GesteBrut[] {
  const i = interfrange(r.lambda, diapositive(r, id)!.b, D);
  const [c1, c2] = [vingtieme(CENTRE - (n * i) / 2), vingtieme(CENTRE + (n * i) / 2 + decalage)];
  return [{ g: "diapo", id }, { g: "curseur", k: 1, x: c1 }, { g: "curseur", k: 2, x: c2 }, { g: "mesure", v: demi(c2 - c1) + lecture, n: compte }];
}
/** La mesure soignée d'un interfrange : douze interfranges d'un coup, avec les fentes écartées de 0,30 mm. */
function interferences(r: ReglagesDiffraction): GesteBrut[] {
  const D = r.but.distance;
  return [...installer, ...placer(D), ...frangesMesurees(r, "y30", D, 12), { g: "laser", on: false }];
}

describe("la figure sur l'écran", () => {
  it("la tache centrale d'une fente mesure 2 λ D / a ; l'interfrange de deux fentes, λ D / b", () => {
    // 650 nm, écran à 1,50 m : 19,5 mm pour 100 µm, 48,75 mm pour 40 µm
    expect(tacheCentrale(650, 100, 150)).toBeCloseTo(19.5, 9);
    expect(tacheCentrale(650, 40, 150)).toBeCloseTo(48.75, 9);
    expect(interfrange(650, 0.3, 150)).toBeCloseTo(3.25, 9);
    expect(interfrange(532, 0.4, 150)).toBeCloseTo(1.995, 9);
  });
  it("une fente : un maximum au centre, des extinctions tous les L/2, des taches secondaires bien plus faibles", () => {
    const fente = diapositive(etalon, "f100")!;
    const I = (x: number) => intensite(650, fente, 150, x);
    expect(I(0)).toBe(1);
    expect(I(9.75)).toBeCloseTo(0, 12);
    expect(I(-9.75)).toBeCloseTo(0, 12);
    expect(I(19.5)).toBeCloseTo(0, 12);
    // la première tache secondaire culmine à 4,7 % de la tache centrale, vers une fois et demie la demi-largeur
    expect(I(9.75 * 1.43)).toBeCloseTo(0.0472, 3);
    for (let x = 0.5; x < 9.5; x += 0.5) expect(I(x)).toBeLessThan(I(x - 0.5));
    // un fil donne la même figure qu'une fente de même largeur
    expect(intensite(650, { ...fente, genre: "fil" }, 150, 4)).toBe(I(4));
  });
  it("deux fentes : des franges brillantes tous les interfranges, sombres à mi-chemin, sous l'enveloppe d'une fente", () => {
    const deux = diapositive(etalon, "y30")!;
    const I = (x: number) => intensite(650, deux, 150, x);
    const i = interfrange(650, 0.3, 150);
    expect(I(0)).toBe(1);
    for (const k of [1, 2, 3, 4]) {
      expect(I((k - 0.5) * i)).toBeCloseTo(0, 12);
      // les franges brillantes baissent avec l'enveloppe
      expect(I(k * i)).toBeLessThan(I((k - 1) * i));
      expect(I(k * i)).toBeGreaterThan(0.5);
    }
  });
});

describe("les gestes sur la paillasse", () => {
  it("au départ : laser sur la table, éteint ; support vide ; rien sur l'écran", () => {
    const debut = joue(etalon, []);
    expect(debut).toEqual({ fixe: false, allume: false, dangers: 0, diapo: null, ecran: 100, curseurs: [45, 75], distance: null, mesures: [] });
    expect(figureVisible(debut)).toBe(false);
    expect(figureVisible(joue(etalon, installer))).toBe(true);
  });
  it("le laser allumé hors de son support est relevé à chaque fois : allumé sur la table, ou repris allumé", () => {
    expect(joue(etalon, installer).dangers).toBe(0);
    expect(joue(etalon, [{ g: "laser", on: true }]).dangers).toBe(1);
    expect(joue(etalon, [{ g: "laser", on: true }, { g: "fixer", on: true }]).dangers).toBe(1);
    expect(joue(etalon, [...installer, { g: "fixer", on: false }]).dangers).toBe(1);
    expect(joue(etalon, [...installer, { g: "laser", on: false }, { g: "fixer", on: false }]).dangers).toBe(0);
    expect(joue(etalon, [{ g: "laser", on: true }, { g: "laser", on: false }, { g: "laser", on: true }]).dangers).toBe(2);
  });
  it("une diapositive se glisse dans le support, se remplace, se retire", () => {
    expect(joue(etalon, [{ g: "diapo", id: "f40" }]).diapo).toBe("f40");
    expect(joue(etalon, [{ g: "diapo", id: "f40" }, { g: "diapo", id: "cheveu" }]).diapo).toBe("cheveu");
    expect(joue(etalon, [{ g: "diapo", id: "f40" }, { g: "diapo", id: "aucune" }]).diapo).toBeNull();
  });
  it("l'écran glisse au millimètre entre 40 cm et le bout du rail ; les curseurs restent sur la graduation", () => {
    expect(joue(etalon, [{ g: "ecran", x: 150.04 }]).ecran).toBe(150);
    expect(joue(etalon, [{ g: "ecran", x: 0 }]).ecran).toBe(ECRAN_MIN);
    expect(joue(etalon, [{ g: "ecran", x: 900 }]).ecran).toBe(200);
    expect(joue(etalon, [{ g: "curseur", k: 1, x: 35.627 }, { g: "curseur", k: 2, x: 999 }]).curseurs).toEqual([35.65, LARGEUR]);
    expect(joue(etalon, [{ g: "curseur", k: 2, x: -5 }]).curseurs).toEqual([45, 0]);
  });
  it("deux déplacements à la suite de l'écran, ou du même curseur, valent le dernier : la liste des gestes peut les regrouper", () => {
    expect(joue(etalon, [{ g: "ecran", x: 120 }, { g: "ecran", x: 150 }])).toEqual(joue(etalon, [{ g: "ecran", x: 150 }]));
    expect(joue(etalon, [{ g: "curseur", k: 1, x: 20 }, { g: "curseur", k: 1, x: 30 }])).toEqual(joue(etalon, [{ g: "curseur", k: 1, x: 30 }]));
  });
  it("une mesure garde ce que l'élève a lu et ce qu'il y avait sur l'écran", () => {
    const etat = joue(etalon, [...installer, ...placer(150), ...tache(etalon, "f100", 150)]);
    expect(etat.distance).toEqual({ v: 150, ecran: 150 });
    expect(etat.mesures).toEqual([{ v: 19.5, n: 1, diapo: "f100", ecran: 150, curseurs: [50.25, 69.75], figure: true }]);
    expect(joue(etalon, [{ g: "mesure", v: 12, n: 4 }]).mesures[0]).toMatchObject({ v: 12, n: 4, diapo: null, figure: false });
  });
  it("un geste inconnu, mal formé ou impossible ne change rien", () => {
    const bizarres: GesteBrut[] = [
      { g: "exploser" }, { g: "fixer" }, { g: "fixer", on: false }, { g: "fixer", on: "oui" }, { g: "laser", on: false }, { g: "laser" }, { g: "diapo" }, { g: "diapo", id: "inconnue" }, { g: "diapo", id: "aucune" },
      { g: "ecran" }, { g: "ecran", x: 100 }, { g: "ecran", x: "loin" }, { g: "curseur", k: 3, x: 20 }, { g: "curseur", x: 20 }, { g: "curseur", k: 1 }, { g: "curseur", k: 1, x: 45 },
      { g: "distance" }, { g: "distance", v: 0 }, { g: "distance", v: 999 }, { g: "mesure" }, { g: "mesure", v: 0 }, { g: "mesure", v: 500 }, { g: "mesure", v: 20, n: 2.5 }, { g: "mesure", v: 20, n: 0 }, { g: "mesure", v: 20, n: "dix" },
    ];
    const debut = joue(etalon, []);
    expect(joue(etalon, bizarres)).toEqual(debut);
    for (const g of bizarres) expect(regles.geste(etalon, debut, g)).toBe(debut);
  });
});

describe("le bilan d'un étalonnage", () => {
  it("une manipulation soignée n'a aucune faute, et l'élève emporte ses largeurs", () => {
    const b = regles.bilan(etalon, joue(etalon, etalonnage(etalon)));
    expect(b.fautes).toEqual([]);
    expect(b.score).toBe(1);
    expect(b.mesures).toEqual({ L1: 49, L2: 32.5, L3: 19.5, Lx: 30, D: 150 });
    expect(b.lignes).toEqual([
      "La fente de 40 µm : tache centrale de 49,0 mm.", "La fente de 60 µm : tache centrale de 32,5 mm.", "La fente de 100 µm : tache centrale de 19,5 mm.",
      "Le cheveu : tache centrale de 30,0 mm.", "Distance de la diapositive à l'écran : D = 150,0 cm.",
    ]);
    // les largeurs de l'élève redonnent le diamètre du cheveu à mieux que 2 % près
    const k = (b.mesures.L1 * 40 + b.mesures.L2 * 60 + b.mesures.L3 * 100) / 3;
    expect(Math.abs(k / b.mesures.Lx - 65) / 65).toBeLessThan(0.02);
  });
  it("sans rien noter, la manipulation vaut zéro, et le professeur donne ses mesures", () => {
    const b = regles.bilan(etalon, joue(etalon, installer));
    expect(b.score).toBe(0);
    expect(b.fautes.map((f) => f.code)).toEqual(["mesures", "distance"]);
    expect(b.mesures).toEqual({ L1: 49, L2: 32.5, L3: 19.5, Lx: 30, D: 150 });
    expect(b.lignes[0]).toBe("Sans mesure notée, on continue avec celles du professeur.");
    expect(b.lignes[1]).toBe("La fente de 40 µm, mesure du professeur : tache centrale de 49,0 mm.");
    expect(b.lignes[5]).toContain("donnée par le professeur");
    // si l'élève a noté une distance sans rien mesurer, les mesures du professeur sont faites à cette distance
    const loin = regles.bilan(etalon, joue(etalon, [...installer, ...placer(180)]));
    expect(loin.mesures).toEqual({ L1: 58.5, L2: 39, L3: 23.5, Lx: 36, D: 180 });
  });
  it("le laser allumé hors de son support est une faute importante, avec le nombre de fois", () => {
    const sansFixer: GesteBrut[] = [{ g: "laser", on: true }, { g: "fixer", on: true }, ...etalonnage(etalon).slice(2)];
    expect(fautes(etalon, sansFixer)).toEqual(["securite!"]);
    const repris = regles.bilan(etalon, joue(etalon, [...etalonnage(etalon).slice(0, -1), { g: "fixer", on: false }, { g: "fixer", on: true }, { g: "fixer", on: false }]));
    expect(repris.fautes.map((f) => f.code)).toEqual(["securite"]);
    expect(repris.fautes[0].texte).toContain("2 fois");
  });
  it("des curseurs mal posés : légère à quelques pour cent, importante au-delà, avec les deux largeurs", () => {
    const debut = [...installer, ...placer(150), ...tache(etalon, "f40", 150), ...tache(etalon, "f60", 150), ...tache(etalon, "f100", 150)];
    expect(fautes(etalon, [...debut, ...tache(etalon, "cheveu", 150, 1.02)])).toEqual([]);
    expect(fautes(etalon, [...debut, ...tache(etalon, "cheveu", 150, 1.07)])).toEqual(["pointage"]);
    expect(fautes(etalon, [...debut, ...tache(etalon, "cheveu", 150, 0.8)])).toEqual(["pointage!"]);
    // les curseurs sur les deuxièmes extinctions : le double de la tache
    const double = regles.bilan(etalon, joue(etalon, [...debut, ...tache(etalon, "cheveu", 150, 2)]));
    expect(double.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["pointage!"]);
    expect(double.fautes[0].texte).toContain("Pour le cheveu, tes curseurs étaient écartés de 60,0 mm ; la tache centrale, d'une extinction à l'autre, mesurait 30,0 mm");
    // la suite se calcule avec ce que l'élève a noté
    expect(double.mesures.Lx).toBe(60);
  });
  it("une lecture fausse de l'écart entre les curseurs", () => {
    const debut = [...installer, ...placer(150), ...tache(etalon, "f40", 150), ...tache(etalon, "f60", 150), ...tache(etalon, "f100", 150)];
    expect(fautes(etalon, [...debut, ...tache(etalon, "cheveu", 150, 1, 0.5)])).toEqual([]);
    expect(fautes(etalon, [...debut, ...tache(etalon, "cheveu", 150, 1, 1)])).toEqual(["lecture"]);
    expect(fautes(etalon, [...debut, ...tache(etalon, "cheveu", 150, 1, -5)])).toEqual(["lecture!"]);
  });
  it("des mesures qui manquent, une mesure sans figure, une mesure refaite", () => {
    const debut = [...installer, ...placer(150)];
    expect(fautes(etalon, [...debut, ...tache(etalon, "f40", 150), ...tache(etalon, "f60", 150), ...tache(etalon, "cheveu", 150)])).toEqual(["mesures"]);
    expect(fautes(etalon, [...debut, ...tache(etalon, "f40", 150), ...tache(etalon, "cheveu", 150)])).toEqual(["mesures!"]);
    expect(fautes(etalon, [...debut, ...tache(etalon, "f40", 150), ...tache(etalon, "f60", 150), ...tache(etalon, "f100", 150)])).toEqual(["mesures!"]);
    expect(fautes(etalon, [...debut, ...tache(etalon, "f40", 150)])).toEqual(["mesures!", "etalonnage!"]);
    // le laser éteint : rien sur l'écran
    expect(fautes(etalon, [{ g: "fixer", on: true }, ...placer(150), ...["f40", "f60", "f100", "cheveu"].flatMap((id) => tache(etalon, id, 150))])).toEqual(["figure!"]);
    // seule la dernière mesure de chaque diapositive compte : une mesure ratée se refait
    expect(fautes(etalon, [...debut, ...tache(etalon, "cheveu", 150, 0.5), ...etalonnage(etalon).slice(4)])).toEqual([]);
    // une mesure faite sans diapositive, ou avec une diapositive qu'on ne demande pas, ne compte pas
    expect(regles.bilan(etalon, joue(etalon, [...debut, { g: "mesure", v: 20 }, ...tache(etalon, "y30", 150)])).score).toBe(0);
  });
  it("l'écran déplacé pendant l'étalonnage, la distance mal lue ou non notée", () => {
    const fentes = (D: number) => [...tache(etalon, "f40", D), ...tache(etalon, "f60", D), ...tache(etalon, "f100", D)];
    expect(fautes(etalon, [...installer, ...placer(150), ...fentes(150), { g: "ecran", x: 152 }, ...tache(etalon, "cheveu", 152)])).toEqual(["ecran", "distance!"]);
    const loin = regles.bilan(etalon, joue(etalon, [...installer, ...placer(150), ...fentes(150), { g: "ecran", x: 170 }, ...tache(etalon, "cheveu", 170)]));
    expect(loin.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["ecran!", "distance!"]);
    expect(loin.fautes[0].texte).toContain("de 150,0 cm à 170,0 cm");
    expect(loin.fautes[1].texte).toContain("puis tu as déplacé l'écran");
    // la distance mal lue : légère à quelques millimètres, importante au-delà du centimètre
    const mesures = ["f40", "f60", "f100", "cheveu"].flatMap((id) => tache(etalon, id, 150));
    expect(fautes(etalon, [...installer, { g: "ecran", x: 150 }, { g: "distance", v: 150.1 }, ...mesures])).toEqual([]);
    expect(fautes(etalon, [...installer, { g: "ecran", x: 150 }, { g: "distance", v: 150.5 }, ...mesures])).toEqual(["distance"]);
    expect(fautes(etalon, [...installer, { g: "ecran", x: 150 }, { g: "distance", v: 105 }, ...mesures])).toEqual(["distance!"]);
    // non notée : une faute légère, et le professeur donne la position de l'écran
    const sans = regles.bilan(etalon, joue(etalon, [...installer, { g: "ecran", x: 150 }, ...mesures]));
    expect(sans.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["distance"]);
    expect(sans.mesures.D).toBe(150);
  });
});

describe("le bilan d'une mesure d'interfrange", () => {
  it("une manipulation soignée n'a aucune faute : douze interfranges d'un coup", () => {
    const b = regles.bilan(franges, joue(franges, interferences(franges)));
    expect(b.fautes).toEqual([]);
    expect(b.score).toBe(1);
    expect(b.mesures).toEqual({ x: 39, n: 12, D: 150, b: 0.3 });
    expect(b.lignes).toEqual(["Avec les deux fentes écartées de 0,30 mm : 12 interfranges sur 39,0 mm.", "Distance des fentes à l'écran : D = 150,0 cm."]);
    // la longueur d'onde retrouvée, à mieux que 1 % près
    expect(Math.abs((b.mesures.x / b.mesures.n) * b.mesures.b * 1e5 / b.mesures.D - 650) / 650).toBeLessThan(0.01);
  });
  it("sans rien noter, la manipulation vaut zéro, et le professeur donne dix interfranges", () => {
    const b = regles.bilan(franges, joue(franges, installer));
    expect(b.score).toBe(0);
    expect(b.fautes.map((f) => f.code)).toEqual(["mesures", "distance"]);
    expect(b.mesures).toEqual({ x: 32.5, n: 10, D: 150, b: 0.3 });
    expect(b.lignes[0]).toContain("Mesure du professeur");
    // si l'élève a noté une distance sans rien mesurer, la mesure du professeur est faite à cette distance
    const loin = regles.bilan(franges, joue(franges, [...installer, ...placer(180)]));
    expect(loin.mesures).toEqual({ x: 39, n: 10, D: 180, b: 0.3 });
  });
  it("la précision dépend du nombre d'interfranges : la même erreur d'un demi-millimètre pèse peu sur douze, lourd sur deux", () => {
    const debut = [...installer, ...placer(150)];
    // un curseur décalé de 0,6 mm, lu comme il est posé
    expect(fautes(franges, [...debut, ...frangesMesurees(franges, "y30", 150, 12, 12, 0.6)])).toEqual([]);
    expect(fautes(franges, [...debut, ...frangesMesurees(franges, "y30", 150, 6, 6, 0.6)])).toEqual(["pointage"]);
    expect(fautes(franges, [...debut, ...frangesMesurees(franges, "y30", 150, 2, 2, 0.6)])).toEqual(["pointage!"]);
    const deux = regles.bilan(franges, joue(franges, [...debut, ...frangesMesurees(franges, "y30", 150, 2, 2, 0.6)]));
    expect(deux.fautes[0].texte).toContain("Tu n'as mesuré que 2 interfranges");
    // une mesure juste sur trop peu d'interfranges reste une faute de méthode, légère
    const juste: GesteBrut[] = [...debut, { g: "diapo", id: "y30" }, { g: "curseur", k: 1, x: 56.75 }, { g: "curseur", k: 2, x: 63.25 }, { g: "mesure", v: 6.5, n: 2 }];
    expect(fautes(franges, juste)).toEqual(["methode"]);
    expect(fautes(franges, [...debut, ...frangesMesurees(franges, "y30", 150, 4)])).toEqual([]);
  });
  it("compter les franges au lieu des intervalles, lire de travers, mesurer avec une fente seule", () => {
    const debut = [...installer, ...placer(150)];
    const compte = regles.bilan(franges, joue(franges, [...debut, ...frangesMesurees(franges, "y30", 150, 12, 13)]));
    expect(compte.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["comptage!"]);
    expect(compte.fautes[0].texte).toContain("il y avait 12 interfranges, pas 13");
    expect(compte.fautes[0].texte).toContain("Tu as compté les franges");
    expect(fautes(franges, [...debut, ...frangesMesurees(franges, "y30", 150, 12, 10)])).toEqual(["comptage!"]);
    expect(fautes(franges, [...debut, ...frangesMesurees(franges, "y30", 150, 12, 12, 0, 1.5)])).toEqual(["lecture"]);
    expect(fautes(franges, [...debut, ...frangesMesurees(franges, "y30", 150, 12, 12, 0, 6)])).toEqual(["lecture!"]);
    const seule = regles.bilan(franges, joue(franges, [...debut, ...tache(franges, "f40", 150)]));
    expect(seule.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["diapositive!"]);
    expect(seule.fautes[0].texte).toContain("la fente de 40 µm");
    expect(fautes(franges, [...debut, { g: "mesure", v: 30, n: 10 }])).toEqual(["diapositive!"]);
    // le laser éteint : pas de franges
    expect(fautes(franges, [{ g: "fixer", on: true }, ...placer(150), ...frangesMesurees(franges, "y30", 150, 12)])).toEqual(["figure!"]);
  });
  it("sans la distance, la longueur d'onde ne se calcule pas : faute importante, et le professeur la donne", () => {
    const b = regles.bilan(franges, joue(franges, [...installer, { g: "ecran", x: 180 }, ...frangesMesurees(franges, "y30", 180, 12), { g: "laser", on: true }]));
    expect(b.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["distance!"]);
    expect(b.mesures.D).toBe(180);
    expect(b.lignes[1]).toContain("donnée par le professeur");
    expect(fautes(franges, [...installer, { g: "laser", on: false }, { g: "fixer", on: false }, { g: "laser", on: true }, { g: "fixer", on: true }, ...placer(150), ...frangesMesurees(franges, "y30", 150, 12)])).toEqual(["securite!"]);
  });
});

describe("le TP « le diamètre d'un cheveu »", () => {
  const manipulation = (etape: EtapeDePaillasse): GesteBrut[] => etalonnage(etape.paillasse.reglages as ReglagesDiffraction);
  it("passe les contrôles communs à tous les TP", async () => {
    await controlesCommuns(cheveu, REGLES);
  });
  it("fait avec soin, le TP donne A partout, quel que soit le cheveu tiré", async () => {
    const taches = new Set<number>();
    const categories = new Set<number>();
    for (const graine of GRAINES) {
      const partie = await joueJuste(cheveu, graine, manipulation, REGLES);
      expect(partie.scores.every((s) => s === 1), `graine ${graine} : ${partie.scores.join(" ")}`).toBe(true);
      expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "A", VAL: "A" });
      expect(partie.fautes).toEqual([[]]);
      taches.add(partie.mesures.Lx);
      const derniere = partie.retours[partie.retours.length - 1].correction;
      if (derniere.genre === "choix") categories.add(derniere.bonne);
    }
    // la graine change bien le cheveu : six diamètres, et les trois catégories
    expect(taches.size).toBe(6);
    expect(categories).toEqual(new Set([0, 1, 2]));
  });
  it("la mesure soignée redonne le diamètre caché, à mieux que 2,5 % près", () => {
    for (const graine of GRAINES) {
      const etape = cheveu.etapes(graine).find((e) => e.genre === "paillasse") as EtapeDePaillasse;
      const r = etape.paillasse.reglages as ReglagesDiffraction;
      const m = regles.bilan(r, joue(r, etalonnage(r))).mesures;
      const k = (m.L1 * 40 + m.L2 * 60 + m.L3 * 100) / 3;
      const vrai = diapositive(r, "cheveu")!.a;
      expect(Math.abs(k / m.Lx - vrai) / vrai, `graine ${graine}`).toBeLessThan(0.025);
      // toutes les taches tiennent sur la graduation de l'écran
      expect(Math.max(m.L1, m.L2, m.L3, m.Lx)).toBeLessThan(LARGEUR);
    }
  });
});

describe("le TP « une diode laser sans étiquette »", () => {
  const manipulation = (etape: EtapeDePaillasse): GesteBrut[] => interferences(etape.paillasse.reglages as ReglagesDiffraction);
  it("passe les contrôles communs à tous les TP", async () => {
    await controlesCommuns(young, REGLES);
  });
  it("fait avec soin, le TP donne A partout, et la diode retrouvée est la bonne", async () => {
    const diodes = new Set<number>();
    for (const graine of GRAINES) {
      const etape = young.etapes(graine).find((e) => e.genre === "paillasse") as EtapeDePaillasse;
      const lambda = (etape.paillasse.reglages as ReglagesDiffraction).lambda;
      const partie = await joueJuste(young, graine, manipulation, REGLES);
      expect(partie.scores.every((s) => s === 1), `graine ${graine} : ${partie.scores.join(" ")}`).toBe(true);
      expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "A", VAL: "A" });
      expect(partie.fautes).toEqual([[]]);
      const m = partie.mesures;
      expect(Math.abs((m.x / m.n) * m.b * 1e5 / m.D - lambda) / lambda).toBeLessThan(0.01);
      const derniere = partie.retours[partie.retours.length - 1].correction;
      expect(derniere.genre === "choix" && [635, 660, 685][derniere.bonne]).toBe(lambda);
      diodes.add(lambda);
    }
    // la graine change bien la diode
    expect(diodes).toEqual(new Set([635, 660, 685]));
  });
  it("mesurée sur deux interfranges seulement, la longueur d'onde peut désigner la mauvaise diode", async () => {
    // un demi-millimètre de trop sur deux interfranges : 8 % d'erreur
    const hative = (etape: EtapeDePaillasse): GesteBrut[] => {
      const r = etape.paillasse.reglages as ReglagesDiffraction;
      return [...installer, ...placer(150), ...frangesMesurees(r, "y30", 150, 2, 2, 0.5)];
    };
    const partie = await joueJuste(young, 1, hative, REGLES);
    expect(partie.fautes[0]).toEqual(["pointage"]);
    // l'exploitation, faite avec ses mesures, reste juste ; mais la conclusion désigne une autre diode que celle du laser
    expect(partie.bilan.VAL).toBe("A");
    const derniere = partie.retours[partie.retours.length - 1].correction;
    expect(derniere.genre === "choix" && derniere.explication).toContain("Une manipulation sans défaut donne 635 nm");
  });
});
