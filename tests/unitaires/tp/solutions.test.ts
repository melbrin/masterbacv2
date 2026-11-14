// La paillasse Solutions (lib/commun/tp/paillasses/solutions.ts) et son TP : préparer une solution par dilution.
// Les manipulations sont jouées ici sans le navigateur, geste par geste. Le TP est en construction : il n'est pas
// inscrit dans l'application, le test importe donc son fichier et donne ses règles.
import { describe, expect, it } from "vitest";
import { BECHER, JUSTESSE_BECHER, JUSTESSE_EPROUVETTE, concentrationEcrite, couches, homogene, lectureOutil, nomDe, pieces, plein, priseVoulue, regles, total, trait, verrerie, type EtatSolutions, type ReglagesSolutions } from "@/lib/commun/tp/paillasses/solutions";
import { rejoue, type GesteBrut } from "@/lib/commun/tp/types";
import dilution from "@/lib/serveur/contenu/tp/dilution";
import { GRAINES, controlesCommuns, joue as joueTp, joueJuste, juste, type EtapeDePaillasse, type ReglesDuTest } from "../../outils/tp";

// la commande la plus courante : 100 mL à 10 mmol/L à partir de 50 mmol/L, soit 20 mL à prélever
const R: ReglagesSolutions = { Cmere: 50, Cfille: 10, unite: "mmol/L", fiole: 100, etagere: { pipettes: [10, 20, 25], eprouvette: 25, fioles: [50, 100], becher: 100 }, teinte: 2, nom: "Eau iodée" };
const joue = (gestes: GesteBrut[], r = R): EtatSolutions => rejoue(regles, r, gestes);
const fautes = (gestes: GesteBrut[], r = R) => regles.bilan(r, joue(gestes, r)).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);
const fois = (n: number, g: GesteBrut): GesteBrut[] => Array.from({ length: n }, () => g);
const REGLES = { solutions: regles } as ReglesDuTest;

// ---------- les gestes d'un élève soigneux ----------
/** Prélève le volume voulu à la pipette jaugée, au trait, et le vide dans le récipient. */
const prelever = (pipette: string, V: number): GesteBrut[] => [
  { g: "verser", v: V + 10 }, { g: "outil", quoi: pipette, ou: "becher" }, { g: "aspirer", v: V + 0.5 }, { g: "vider", v: 0.5 },
  { g: "outil", quoi: pipette, ou: "recipient" }, { g: "vider", v: V }, { g: "outil", quoi: pipette, ou: "etagere" },
];
/** Ajoute l'eau : au jet jusqu'aux deux tiers, on agite, au jet jusqu'à un millilitre du trait, puis vingt gouttes. */
const completer = (capacite: number, dedans: number): GesteBrut[] => {
  const tiers = Math.round(capacite * 0.67 - dedans);
  return [{ g: "eau", v: tiers, jet: true }, { g: "agiter" }, { g: "eau", v: capacite - 1 - dedans - tiers, jet: true }, ...fois(20, { g: "eau", v: 0.05 })];
};
const homogeneiser: GesteBrut[] = [{ g: "boucher", mis: true }, ...fois(3, { g: "retourner" })];
/** La préparation soignée d'une situation. */
function soignee(r: ReglagesSolutions): GesteBrut[] {
  const Vm = priseVoulue(r, r.fiole);
  return [{ g: "recipient", quoi: `f${r.fiole}` }, ...prelever(`p${Vm}`, Vm), ...completer(r.fiole, Vm), ...homogeneiser];
}

describe("l'étagère", () => {
  it("range les pièces sous un nom court, et ne connaît que les siennes", () => {
    expect(pieces(R).map(nomDe)).toEqual(["p10", "p20", "p25", "e25", "f50", "f100", "b100"]);
    expect(verrerie(R, "p20")).toEqual({ genre: "pipette", capacite: 20 });
    expect(verrerie(R, "e25")).toEqual({ genre: "eprouvette", capacite: 25 });
    expect(verrerie(R, "b100")).toEqual({ genre: "becher", capacite: 100 });
    for (const nom of [null, "", "p5", "p20.0", "f250", "e10", "b50", "x20", "p", "pvingt"]) expect(verrerie(R, nom), String(nom)).toBeNull();
  });
  it("le trait d'une fiole est juste, la graduation d'un bécher ne l'est pas", () => {
    expect(trait({ genre: "fiole", capacite: 100 })).toBe(100);
    expect(trait({ genre: "becher", capacite: 100 })).toBe(100 * JUSTESSE_BECHER);
    expect(plein({ genre: "pipette", capacite: 20 })).toBe(23);
    expect(plein({ genre: "eprouvette", capacite: 25 })).toBe(26);
  });
  it("poser un autre récipient vide le premier et compte une solution recommencée", () => {
    const etat = joue([{ g: "recipient", quoi: "b100" }, ...prelever("p20", 20), { g: "eau", v: 30 }, { g: "recipient", quoi: "f100" }]);
    expect([etat.recipient, etat.prise, etat.eau, etat.essais]).toEqual(["f100", 0, 0, 1]);
    // le même récipient, ou un récipient encore vide : rien à recommencer
    expect(joue([{ g: "recipient", quoi: "f50" }, { g: "recipient", quoi: "f50" }, { g: "recipient", quoi: "f100" }]).essais).toBe(0);
    // une pipette n'est pas un récipient
    expect(joue([{ g: "recipient", quoi: "p20" }]).recipient).toBeNull();
  });
});

describe("le prélèvement", () => {
  it("le flacon se verse dans le bécher, qui déborde au-delà de sa contenance", () => {
    expect(joue([{ g: "verser", v: 30 }]).becher).toBe(30);
    const trop = joue([{ g: "verser", v: 50 }, { g: "verser", v: 25 }]);
    expect([trop.becher, trop.renverse]).toEqual([BECHER, 15]);
  });
  it("la pipette n'aspire que ce que le bécher contient, et le lui rend quand on laisse redescendre", () => {
    expect(joue([{ g: "aspirer", v: 5 }]).dansOutil).toBe(0);
    expect(joue([{ g: "outil", quoi: "p20", ou: "becher" }, { g: "aspirer", v: 5 }]).dansOutil).toBe(0);
    const juste = joue([{ g: "verser", v: 12 }, { g: "outil", quoi: "p20", ou: "becher" }, { g: "aspirer", v: 20.5 }]);
    expect([juste.dansOutil, juste.becher]).toEqual([12, 0]);
    const ajustee = joue([{ g: "verser", v: 30 }, { g: "outil", quoi: "p20", ou: "becher" }, { g: "aspirer", v: 20.4 }, { g: "vider", v: 0.4 }]);
    expect([ajustee.dansOutil, ajustee.becher, lectureOutil(R, ajustee)]).toEqual([20, 10, 20]);
    // le bécher plein ne reprend pas tout : le reste coule à côté
    const plein = joue([{ g: "verser", v: 40 }, { g: "outil", quoi: "p25", ou: "becher" }, { g: "aspirer", v: 25 }, { g: "verser", v: 45 }, { g: "vider", v: 25 }]);
    expect([plein.becher, plein.renverse]).toEqual([BECHER, 25]);
  });
  it("aspirer trop haut fait monter le liquide dans la poire", () => {
    const trop = joue([{ g: "verser", v: 40 }, { g: "outil", quoi: "p20", ou: "becher" }, { g: "aspirer", v: 30 }]);
    expect([trop.dansOutil, trop.aspireTrop, trop.becher]).toEqual([23, true, 17]);
    // en butée, insister ne change plus rien
    expect(joue([{ g: "verser", v: 40 }, { g: "outil", quoi: "p20", ou: "becher" }, { g: "aspirer", v: 30 }, { g: "aspirer", v: 5 }])).toEqual(trop);
    const limite = joue([{ g: "verser", v: 40 }, { g: "outil", quoi: "p20", ou: "becher" }, { g: "aspirer", v: 23 }]);
    expect([limite.dansOutil, limite.aspireTrop]).toEqual([23, false]);
  });
  it("prélever dans le flacon marche, et se remarque", () => {
    const etat = joue([{ g: "outil", quoi: "p10", ou: "flacon" }, { g: "aspirer", v: 10.2 }, { g: "vider", v: 0.2 }]);
    expect([etat.dansOutil, etat.dansFlacon, etat.becher]).toEqual([10, true, 0]);
  });
  it("l'outil se vide là où il est ; rangé ou remplacé, il est vidé à l'évier", () => {
    const debut: GesteBrut[] = [{ g: "recipient", quoi: "f100" }, { g: "verser", v: 30 }, { g: "outil", quoi: "p20", ou: "becher" }, { g: "aspirer", v: 20 }];
    const dans = joue([...debut, { g: "outil", quoi: "p20", ou: "recipient" }, { g: "vider", v: 30 }]);
    expect([dans.prise, dans.dansOutil, dans.parEprouvette]).toEqual([20, 0, 0]);
    expect(joue([...debut, { g: "outil", quoi: "p20", ou: "etagere" }]).outil).toBeNull();
    const autre = joue([...debut, { g: "outil", quoi: "p10", ou: "becher" }]);
    expect([autre.outil, autre.dansOutil]).toEqual(["p10", 0]);
    // ranger un outil qui n'est pas sorti, viser un récipient absent, prendre une fiole pour outil : rien ne bouge
    expect(joue([{ g: "outil", quoi: "p10", ou: "etagere" }, { g: "outil", quoi: "p10", ou: "recipient" }, { g: "outil", quoi: "f50", ou: "becher" }, { g: "outil", quoi: "p10", ou: "poche" }])).toEqual(joue([]));
  });
  it("une éprouvette graduée délivre moins que ce qu'on y lit", () => {
    const etat = joue([{ g: "recipient", quoi: "f100" }, { g: "verser", v: 30 }, { g: "outil", quoi: "e25", ou: "becher" }, { g: "aspirer", v: 19.4 }]);
    expect(lectureOutil(R, etat)).toBeCloseTo(20, 6);
    const versee = joue([{ g: "recipient", quoi: "f100" }, { g: "verser", v: 30 }, { g: "outil", quoi: "e25", ou: "becher" }, { g: "aspirer", v: 19.4 }, { g: "outil", quoi: "e25", ou: "recipient" }, { g: "vider", v: 19.4 }]);
    expect([versee.prise, versee.parEprouvette]).toEqual([19.4, 19.4]);
    expect(19.4 / JUSTESSE_EPROUVETTE).toBeCloseTo(20, 6);
    // elle ne se remplit pas au-delà de son bord, sans monter dans une poire
    const pleine = joue([{ g: "verser", v: 60 }, { g: "outil", quoi: "e25", ou: "becher" }, { g: "aspirer", v: 40 }]);
    expect([pleine.dansOutil, pleine.aspireTrop, pleine.becher]).toEqual([26, false, 34]);
  });
});

describe("la solution fille", () => {
  const debut: GesteBrut[] = [{ g: "recipient", quoi: "f100" }, ...prelever("p20", 20)];
  it("l'eau s'ajoute au jet ou goutte à goutte ; au-delà du col, la fiole déborde", () => {
    const etat = joue([...debut, { g: "eau", v: 60, jet: true }, { g: "eau", v: 0.05 }]);
    expect([etat.eau, total(etat), etat.auJet]).toEqual([60.05, 80.05, false]);
    const debord = joue([...debut, { g: "eau", v: 90, jet: true }]);
    expect([total(debord), debord.renverse, debord.auJet]).toEqual([104.5, 5.5, true]);
    // sans récipient, ou sans volume, rien
    expect(joue([{ g: "eau", v: 10 }, { g: "recipient", quoi: "f100" }, { g: "eau" }, { g: "eau", v: -2 }])).toEqual(joue([{ g: "recipient", quoi: "f100" }]));
  });
  it("le jet ne doit pas servir dans le dernier demi-millilitre sous le trait", () => {
    expect(joue([...debut, { g: "eau", v: 79.5, jet: true }]).auJet).toBe(false);
    expect(joue([...debut, { g: "eau", v: 79.6, jet: true }]).auJet).toBe(true);
    expect(joue([...debut, { g: "eau", v: 79, jet: true }, { g: "eau", v: 1 }]).auJet).toBe(false);
    // dans un bécher, pas de col : le jet ne se remarque pas
    expect(joue([{ g: "recipient", quoi: "b100" }, ...prelever("p20", 20), { g: "eau", v: 86, jet: true }]).auJet).toBe(false);
  });
  it("agiter avant le col commence le mélange ; ce qui est ajouté ensuite flotte au-dessus", () => {
    const avant = joue([...debut, { g: "eau", v: 47, jet: true }]);
    expect([homogene(avant), couches(R, avant)]).toEqual([false, { limite: 20, bas: 50, haut: 0 }]);
    const agitee = joue([...debut, { g: "eau", v: 47, jet: true }, { g: "agiter" }]);
    expect([agitee.agite, agitee.melange, homogene(agitee)]).toEqual([true, 67, true]);
    expect(couches(R, agitee).bas).toBeCloseTo((50 * 20) / 67, 9);
    const completee = joue([...debut, ...completer(100, 20)]);
    expect([total(completee), homogene(completee), completee.melange]).toEqual([100, false, 67]);
    expect(couches(R, completee)).toEqual({ limite: 67, bas: (50 * 20) / 67, haut: 0 });
    // agiter trop tôt, ou quand le liquide est déjà dans le col, ne compte pas comme l'agitation aux deux tiers
    expect(joue([...debut, { g: "agiter" }]).agite).toBe(false);
    expect(joue([...debut, { g: "eau", v: 5 }, { g: "agiter" }]).agite).toBe(false);
    const tard = joue([...debut, { g: "eau", v: 80 }, { g: "agiter" }]);
    expect([tard.agite, tard.melange]).toEqual([false, 92]);
    // dans un bécher, remuer mélange tout
    const becher = joue([{ g: "recipient", quoi: "b100" }, ...prelever("p20", 20), { g: "eau", v: 86 }, { g: "agiter" }]);
    expect([homogene(becher), becher.agite]).toEqual([true, true]);
    // une fiole vide ne s'agite pas
    expect(joue([{ g: "recipient", quoi: "f100" }, { g: "agiter" }])).toEqual(joue([{ g: "recipient", quoi: "f100" }]));
  });
  it("bouchée et retournée trois fois, la solution est homogène ; chaque retournement rapproche le haut du bas", () => {
    const prete: GesteBrut[] = [...debut, ...completer(100, 20), { g: "boucher", mis: true }];
    const une = joue([...prete, { g: "retourner" }]);
    expect([une.retournements, homogene(une)]).toEqual([1, false]);
    expect(couches(R, une).haut).toBeCloseTo(10 / 3, 9);
    expect(couches(R, une).bas).toBeGreaterThan(10);
    const trois = joue([...prete, ...fois(3, { g: "retourner" })]);
    expect([homogene(trois), couches(R, trois)]).toEqual([true, { limite: 100, bas: 10, haut: 10 }]);
    // de l'eau ajoutée après coup défait l'homogénéité
    const apres = joue([...prete, ...fois(3, { g: "retourner" }), { g: "boucher", mis: false }, { g: "eau", v: 0.5 }]);
    expect([homogene(apres), apres.retournements]).toEqual([false, 0]);
  });
  it("sur une fiole bouchée, ce qu'on verse coule à côté ; un bécher ne se bouche pas", () => {
    const etat = joue([...debut, { g: "boucher", mis: true }, { g: "eau", v: 10 }]);
    expect([etat.eau, etat.renverse]).toEqual([0, 10]);
    expect(joue([{ g: "recipient", quoi: "b100" }, { g: "boucher", mis: true }]).bouche).toBe(false);
    expect(joue([...debut, { g: "boucher" }]).bouche).toBe(false);
  });
  it("retournée sans bouchon, la fiole se vide sur la paillasse", () => {
    const etat = joue([...debut, ...completer(100, 20), { g: "retourner" }]);
    expect([etat.prise, etat.eau, etat.perdue, etat.renverse]).toEqual([0, 0, true, 100]);
    // une fiole vide se retourne sans dégât
    expect(joue([{ g: "recipient", quoi: "f100" }, { g: "retourner" }]).perdue).toBe(false);
  });
  it("recommencer vide et rince le récipient, et garde la verrerie en place", () => {
    const etat = joue([...debut, { g: "eau", v: 90, jet: true }, { g: "recommencer" }]);
    expect([etat.recipient, etat.prise, etat.eau, etat.auJet, etat.essais, etat.becher]).toEqual(["f100", 0, 0, false, 1, 10]);
    expect(joue([{ g: "recommencer" }])).toEqual(joue([]));
  });
  it("deux morceaux d'un même versement valent leur somme : la liste des gestes peut les regrouper", () => {
    const paires: [GesteBrut[], GesteBrut[], GesteBrut[]][] = [
      [[], [{ g: "verser", v: 22 }, { g: "verser", v: 45 }], [{ g: "verser", v: 67 }]],
      [[{ g: "verser", v: 40 }, { g: "outil", quoi: "p20", ou: "becher" }], [{ g: "aspirer", v: 14.2 }, { g: "aspirer", v: 9.9 }], [{ g: "aspirer", v: 24.1 }]],
      [[{ g: "verser", v: 18 }, { g: "outil", quoi: "p20", ou: "becher" }], [{ g: "aspirer", v: 14.2 }, { g: "aspirer", v: 9.9 }], [{ g: "aspirer", v: 24.1 }]],
      [[{ g: "verser", v: 40 }, { g: "outil", quoi: "p20", ou: "becher" }, { g: "aspirer", v: 21 }], [{ g: "vider", v: 0.35 }, { g: "vider", v: 0.65 }], [{ g: "vider", v: 1 }]],
      [debut, [{ g: "eau", v: 51.3, jet: true }, { g: "eau", v: 28.4, jet: true }], [{ g: "eau", v: 79.7, jet: true }]],
      [debut, [{ g: "eau", v: 79.4, jet: true }, { g: "eau", v: 9, jet: true }], [{ g: "eau", v: 88.4, jet: true }]],
      [[...debut, { g: "eau", v: 79, jet: true }], [{ g: "eau", v: 0.05 }, { g: "eau", v: 0.05 }], [{ g: "eau", v: 0.1 }]],
    ];
    for (const [avant, deux, un] of paires) expect(joue([...avant, ...deux]), JSON.stringify(un)).toEqual(joue([...avant, ...un]));
  });
  it("un geste inconnu, mal formé ou hors bornes ne change rien", () => {
    const bizarres: GesteBrut[] = [
      { g: "exploser" }, { g: "verser" }, { g: "verser", v: -3 }, { g: "verser", v: "beaucoup" }, { g: "verser", v: 4000 }, { g: "recipient", quoi: "f250" }, { g: "recipient" },
      { g: "outil", quoi: "p5", ou: "becher" }, { g: "outil" }, { g: "vider", v: 2 }, { g: "aspirer", v: 2 }, { g: "eau", v: 5 }, { g: "agiter" }, { g: "boucher", mis: true }, { g: "retourner" }, { g: "recommencer" },
    ];
    expect(joue(bizarres)).toEqual(joue([]));
  });
});

describe("le bilan d'une préparation", () => {
  it("une préparation soignée n'a aucune faute, et rend les volumes réels", () => {
    const b = regles.bilan(R, joue(soignee(R)));
    expect(b.fautes).toEqual([]);
    expect(b.score).toBe(1);
    expect(b.mesures).toEqual({ Vm: 20, Vf: 100, C: 10 });
    expect(b.lignes.join(" ")).toContain("V_m = 20,00 mL");
  });
  it("deux prélèvements à la pipette de 10 mL valent un prélèvement à celle de 20 mL", () => {
    const deux: GesteBrut[] = [{ g: "recipient", quoi: "f100" }, ...prelever("p10", 10), ...prelever("p10", 10), ...completer(100, 20), ...homogeneiser];
    expect(fautes(deux)).toEqual([]);
  });
  it("sans rien préparer, la manipulation vaut zéro, et le professeur donne ses valeurs", () => {
    const b = regles.bilan(R, joue([]));
    expect([b.score, b.fautes.map((f) => f.code), b.mesures]).toEqual([0, ["solution"], { Vm: 20, Vf: 100, C: 10 }]);
    expect(regles.bilan(R, joue([{ g: "recipient", quoi: "f100" }, { g: "eau", v: 100 }])).score).toBe(0);
    // la fiole retournée sans bouchon : il ne reste rien à contrôler
    const perdue = regles.bilan(R, joue([{ g: "recipient", quoi: "f100" }, ...prelever("p20", 20), ...completer(100, 20), { g: "retourner" }]));
    expect([perdue.score, perdue.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)]).toEqual([0, ["renverse!"]]);
    expect(perdue.fautes[0].texte).toContain("100,00 mL");
  });
  it("la mauvaise verrerie donne une solution imprécise : éprouvette graduée, bécher", () => {
    // l'élève lit 20 mL sur l'éprouvette : elle n'en délivre que 19,4
    const eprouvette: GesteBrut[] = [
      { g: "recipient", quoi: "f100" }, { g: "verser", v: 30 }, { g: "outil", quoi: "e25", ou: "becher" }, { g: "aspirer", v: 19.4 }, { g: "outil", quoi: "e25", ou: "recipient" }, { g: "vider", v: 19.4 },
      ...completer(100, 19.4), ...homogeneiser,
    ];
    const b = regles.bilan(R, joue(eprouvette));
    expect(b.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["preleveur!"]);
    expect(b.fautes[0].texte).toContain("20,00 mL");
    // la concentration réellement obtenue suit les volumes réels : 3 % sous la commande
    expect(b.mesures).toEqual({ Vm: 19.4, Vf: 100, C: 9.7 });
    // une éprouvette mal lue en plus : le volume lui-même est faux
    const malLue = eprouvette.map((g) => (g.v === 19.4 ? { ...g, v: 23 } : g));
    expect(fautes(malLue)).toEqual(["preleveur!", "prise!", "trait!"]);
    // dans le bécher, le niveau à la graduation « 100 » fait 106 mL
    const becher: GesteBrut[] = [{ g: "recipient", quoi: "b100" }, ...prelever("p20", 20), { g: "eau", v: 40, jet: true }, { g: "agiter" }, { g: "eau", v: 46, jet: true }, { g: "agiter" }];
    const bb = regles.bilan(R, joue(becher));
    expect(bb.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["recipient!"]);
    expect(bb.mesures.Vf).toBe(106);
    expect(bb.mesures.C).toBeCloseTo((50 * 20) / 106, 12);
    expect(fautes([{ g: "recipient", quoi: "b100" }, ...prelever("p20", 20), { g: "eau", v: 40, jet: true }, { g: "agiter" }])).toEqual(["recipient!", "trait!"]);
  });
  it("la mauvaise contenance : trop ou trop peu de solution mère, ou un volume de solution qui n'est pas celui demandé", () => {
    const pipette25: GesteBrut[] = [{ g: "recipient", quoi: "f100" }, ...prelever("p25", 25), ...completer(100, 25), ...homogeneiser];
    const b = regles.bilan(R, joue(pipette25));
    expect(b.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["prise!"]);
    expect(b.fautes[0].texte).toContain("trop concentrée");
    expect(fautes([{ g: "recipient", quoi: "f100" }, ...prelever("p10", 10), ...completer(100, 10), ...homogeneiser])).toEqual(["prise!"]);
    // la bonne concentration, mais dans la fiole de 50 mL
    const petite: GesteBrut[] = [{ g: "recipient", quoi: "f50" }, ...prelever("p10", 10), ...completer(50, 10), ...homogeneiser];
    expect(fautes(petite)).toEqual(["volume"]);
    expect(regles.bilan(R, joue(petite)).mesures).toEqual({ Vm: 10, Vf: 50, C: 10 });
  });
  it("un prélèvement mal ajusté, dans le flacon, ou aspiré trop haut", () => {
    const malAjuste: GesteBrut[] = [{ g: "verser", v: 30 }, { g: "outil", quoi: "p20", ou: "becher" }, { g: "aspirer", v: 20.2 }, { g: "outil", quoi: "p20", ou: "recipient" }, { g: "vider", v: 20.2 }];
    expect(fautes([{ g: "recipient", quoi: "f100" }, ...malAjuste, ...completer(100, 20.2), ...homogeneiser])).toEqual(["prise"]);
    const flacon: GesteBrut[] = [{ g: "outil", quoi: "p20", ou: "flacon" }, { g: "aspirer", v: 24 }, { g: "vider", v: 3 }, { g: "outil", quoi: "p20", ou: "recipient" }, { g: "vider", v: 20 }];
    expect(fautes([{ g: "recipient", quoi: "f100" }, ...flacon, ...completer(100, 20), ...homogeneiser])).toEqual(["flacon", "propipette"]);    // juste à la limite, un prélèvement n'est pas une faute : les écarts se comptent au centième
    const ajuste = (V: number): GesteBrut[] => [{ g: "recipient", quoi: "f100" }, { g: "verser", v: 30 }, { g: "outil", quoi: "p20", ou: "becher" }, { g: "aspirer", v: V }, { g: "outil", quoi: "p20", ou: "recipient" }, { g: "vider", v: V }, ...completer(100, V), ...homogeneiser];
    expect([fautes(ajuste(19.94)), fautes(ajuste(20.06)), fautes(ajuste(19.93)), fautes(ajuste(20.07))]).toEqual([[], [], ["prise"], ["prise"]]);
  });
  it("le trait de jauge : dépassé, pas atteint, ou atteint au jet", () => {
    const debut: GesteBrut[] = [{ g: "recipient", quoi: "f100" }, ...prelever("p20", 20), { g: "eau", v: 47, jet: true }, { g: "agiter" }];
    const fin = (eau: GesteBrut[]) => fautes([...debut, ...eau, ...homogeneiser]);
    expect(fin([{ g: "eau", v: 32, jet: true }, { g: "eau", v: 1.1 }])).toEqual([]);
    expect(fin([{ g: "eau", v: 32, jet: true }, { g: "eau", v: 1.3 }])).toEqual(["trait"]);
    expect(fin([{ g: "eau", v: 32, jet: true }, { g: "eau", v: 2 }])).toEqual(["trait!"]);
    expect(fin([{ g: "eau", v: 32, jet: true }, { g: "eau", v: 0.7 }])).toEqual(["trait"]);
    // juste à la limite, au-dessus comme au-dessous : pas de faute
    expect([fin([{ g: "eau", v: 32, jet: true }, { g: "eau", v: 0.85 }]), fin([{ g: "eau", v: 32, jet: true }, { g: "eau", v: 1.15 }])]).toEqual([[], []]);
    expect(fin([{ g: "eau", v: 32, jet: true }, { g: "eau", v: 0.84 }])).toEqual(["trait"]);
    expect(fin([{ g: "eau", v: 30, jet: true }])).toEqual(["trait!"]);
    // au jet jusqu'au trait, par chance : le volume est bon, le geste ne l'est pas
    expect(fin([{ g: "eau", v: 33, jet: true }])).toEqual(["jet"]);
    // au jet, et dépassé : c'est le dépassement qui compte
    expect(fin([{ g: "eau", v: 35, jet: true }])).toEqual(["trait!"]);
    // sans eau du tout
    expect(fautes([{ g: "recipient", quoi: "f100" }, ...prelever("p20", 20), ...homogeneiser])).toEqual(["trait!"]);
  });
  it("le mélange : pas d'agitation aux deux tiers, pas de retournement, ou trop peu", () => {
    const sansAgiter: GesteBrut[] = [{ g: "recipient", quoi: "f100" }, ...prelever("p20", 20), { g: "eau", v: 79, jet: true }, ...fois(20, { g: "eau", v: 0.05 }), ...homogeneiser];
    expect(fautes(sansAgiter)).toEqual(["agitation"]);
    const prete: GesteBrut[] = [{ g: "recipient", quoi: "f100" }, ...prelever("p20", 20), ...completer(100, 20)];
    const b = regles.bilan(R, joue(prete));
    expect(b.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["homogene!"]);
    expect(b.fautes[0].texte).toContain(concentrationEcrite(R, 1000 / 67));
    expect(fautes([...prete, { g: "boucher", mis: true }, ...fois(2, { g: "retourner" })])).toEqual(["homogene"]);
  });
  it("ce qui est renversé sur la paillasse se remarque", () => {
    expect(fautes([{ g: "verser", v: 70 }, ...soignee(R).filter((g) => g.g !== "verser"), { g: "verser", v: 0.01 }])).toEqual(["renverse"]);
  });
  it("les concentrations s'écrivent avec trois chiffres", () => {
    expect([concentrationEcrite(R, 10), concentrationEcrite(R, 5), concentrationEcrite(R, 12.5), concentrationEcrite(R, 0.02), concentrationEcrite(R, 125), concentrationEcrite(R, 0)])
      .toEqual(["10,0 mmol/L", "5,00 mmol/L", "12,5 mmol/L", "0,0200 mmol/L", "125 mmol/L", "0,00 mmol/L"]);
  });
});

describe("le TP de dilution", () => {
  const manipulation = (etape: EtapeDePaillasse): GesteBrut[] => soignee(etape.paillasse.reglages as ReglagesSolutions);
  it("passe les contrôles communs à tous les TP", async () => {
    await controlesCommuns(dilution, REGLES);
    expect(dilution.fiche).toBe(9);
  });
  it("fait avec soin, le TP donne A partout, quelle que soit la commande tirée", async () => {
    const vues = new Set<string>();
    for (const graine of GRAINES) {
      const partie = await joueJuste(dilution, graine, manipulation, REGLES);
      expect(partie.scores.every((s) => s === 1), `graine ${graine} : ${partie.scores.join(" ")}`).toBe(true);
      expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "A", VAL: "A" });
      expect(partie.fautes).toEqual([[]]);
      expect(partie.etapes.length).toBe(10);
      vues.add(`${partie.mesures.Vm} dans ${partie.mesures.Vf}`);
    }
    // la graine change bien la commande
    expect(vues).toEqual(new Set(["20 dans 100", "10 dans 100", "25 dans 100", "10 dans 50"]));
  });
  it("le protocole donné sur la paillasse nomme la verrerie de la commande tirée", () => {
    for (const graine of GRAINES) {
      const etape = dilution.etapes(graine).find((e) => e.genre === "paillasse") as EtapeDePaillasse;
      const r = etape.paillasse.reglages as ReglagesSolutions;
      expect(etape.protocole.join(" ")).toContain(`fiole jaugée de ${r.fiole} mL`);
      expect(etape.protocole.join(" ")).toContain(`pipette jaugée de ${priseVoulue(r, r.fiole)} mL`);
      expect(verrerie(r, `p${priseVoulue(r, r.fiole)}`)).not.toBeNull();
    }
  });
  it("l'exploitation se juge sur les volumes de l'élève : une solution préparée à l'éprouvette ne respecte pas la tolérance", async () => {
    const aLEprouvette = (etape: EtapeDePaillasse): GesteBrut[] => {
      const r = etape.paillasse.reglages as ReglagesSolutions;
      const delivre = Math.round(priseVoulue(r, r.fiole) * JUSTESSE_EPROUVETTE * 100) / 100;
      return [
        { g: "recipient", quoi: `f${r.fiole}` }, { g: "verser", v: 40 }, { g: "outil", quoi: "e25", ou: "becher" }, { g: "aspirer", v: delivre }, { g: "outil", quoi: "e25", ou: "recipient" }, { g: "vider", v: delivre },
        ...completer(r.fiole, delivre), ...homogeneiser,
      ];
    };
    for (const graine of GRAINES.slice(0, 4)) {
      const partie = await joueTp(dilution, graine, (etape, publique, mesures) => juste(etape, publique, mesures, aLEprouvette), REGLES);
      expect(partie.fautes).toEqual([["preleveur"]]);
      // la manipulation perd des points, pas l'exploitation : elle est juste avec les volumes de l'élève
      expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "C", VAL: "A" });
      const derniere = partie.retours[partie.retours.length - 1].correction;
      expect(derniere.genre === "choix" && derniere.bonne).toBe(1);
      const soigneuse = await joueJuste(dilution, graine, manipulation, REGLES);
      const conclusion = soigneuse.retours[soigneuse.retours.length - 1].correction;
      expect(conclusion.genre === "choix" && conclusion.bonne).toBe(0);
    }
  });
});
