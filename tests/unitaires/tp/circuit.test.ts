// Les paillasses des TP virtuels (lib/commun/tp) : ce que le matériel répond à chaque geste, et le bilan d'une manipulation.
import { describe, expect, it } from "vitest";
import { CIRCUIT_INITIAL, analyse, bilanCircuit, bornes, defautDuMontage, gesteCircuit, rejoueCircuit, tauVrai, tension, type GesteCircuit, type ReglagesCircuit } from "@/lib/commun/tp/paillasses/circuit";
import { niveauPour } from "@/lib/commun/tp/types";


const rc: ReglagesCircuit = {
  generateur: { plus: "g+", moins: "g-", E: 5 },
  dipoles: [{ id: "K", genre: "interrupteur", bornes: ["k1", "k2"] }, { id: "R", genre: "resistance", bornes: ["r1", "r2"] }, { id: "C", genre: "condensateur", bornes: ["c1", "c2"] }],
  mesure: { voie: "voie", masse: "masse" },
  R: 10000, C: 330e-6, parCm: 0, niveaux: [], lecture: true, duree: 20,
};
const serie: [string, string][] = [["g+", "k1"], ["k2", "r1"], ["r2", "c1"], ["c2", "g-"]];
const relier = (fils: [string, string][]): GesteCircuit[] => fils.map(([a, b]) => ({ g: "relier", a, b }));

describe("la lecture d'un montage", () => {
  it("un circuit en série, mesuré aux bornes du condensateur", () => {
    expect(analyse(rc, [...serie, ["voie", "c1"], ["masse", "c2"]])).toEqual({ etat: "serie", mesure: "uC", dR: 0, dC: 1 });
    // la voie peut se brancher sur n'importe quelle borne du même nœud
    expect(analyse(rc, [...serie, ["voie", "r2"], ["masse", "g-"]])).toMatchObject({ mesure: "uC" });
    // l'ordre des dipôles dans la boucle ne change rien
    expect(analyse(rc, [["g+", "r1"], ["r2", "k1"], ["k2", "c1"], ["c2", "g-"], ["voie", "c1"], ["masse", "c2"]])).toMatchObject({ etat: "serie", mesure: "uC" });
  });
  it("reconnaît ce que la voie mesure quand elle est mal placée", () => {
    expect(analyse(rc, [...serie, ["voie", "c2"], ["masse", "c1"]])).toMatchObject({ mesure: "uC-inverse" });
    expect(analyse(rc, [...serie, ["voie", "r1"], ["masse", "r2"]])).toMatchObject({ mesure: "uR" });
    expect(analyse(rc, [...serie, ["voie", "g+"], ["masse", "g-"]])).toMatchObject({ mesure: "generateur" });
    expect(analyse(rc, [...serie, ["voie", "k1"], ["masse", "k2"]])).toMatchObject({ mesure: "rien" });
    expect(analyse(rc, serie)).toMatchObject({ etat: "serie", mesure: "absente" });
  });
  it("reconnaît un circuit ouvert, un court-circuit et une dérivation", () => {
    expect(analyse(rc, []).etat).toBe("ouvert");
    expect(analyse(rc, serie.slice(0, 3)).etat).toBe("ouvert");
    expect(analyse(rc, [...serie, ["g+", "g-"]]).etat).toBe("court-circuit");
    expect(analyse(rc, [...serie, ["c1", "c2"]]).etat).toBe("derivation");
    // l'appareil de mesure branché en série coupe le circuit
    expect(analyse(rc, [["g+", "k1"], ["k2", "r1"], ["r2", "voie"], ["masse", "c1"], ["c2", "g-"]]).etat).toBe("ouvert");
    // deux boucles séparées : le condensateur n'est pas dans la boucle du générateur
    expect(analyse(rc, [["g+", "k1"], ["k2", "r1"], ["r2", "g-"], ["c1", "c2"]]).etat).toBe("ouvert");
    expect(bornes(rc)).toHaveLength(10);
  });
  it("dit ce qui ne va pas, ou rien si le montage est le bon", () => {
    expect(defautDuMontage(analyse(rc, [...serie, ["voie", "c1"], ["masse", "c2"]]))).toBeNull();
    expect(defautDuMontage(analyse(rc, [...serie, ["g+", "g-"]]))).toMatch(/^Court-circuit/);
    expect(defautDuMontage(analyse(rc, serie))).toMatch(/n'est pas branchée/);
    expect(defautDuMontage(analyse(rc, [...serie, ["voie", "r1"], ["masse", "r2"]]))).toMatch(/résistance/);
  });
});

describe("la tension mesurée et les gestes du circuit", () => {
  const bon = analyse(rc, [...serie, ["voie", "c1"], ["masse", "c2"]]);
  it("la tension du condensateur monte vers E, et vaut 63 % de E à t = RC", () => {
    expect(tauVrai(rc)).toBeCloseTo(3.3, 9);
    expect(tension(rc, bon, 0, 0)).toBe(0);
    expect(tension(rc, bon, 0, 3.3) / 5).toBeCloseTo(0.632, 3);
    expect(tension(rc, bon, 0, 100)).toBeCloseTo(5, 6);
    // aux bornes de la résistance, la tension part de E et retombe à zéro
    const surR = analyse(rc, [...serie, ["voie", "r1"], ["masse", "r2"]]);
    expect(tension(rc, surR, 0, 0)).toBe(5);
    expect(tension(rc, surR, 0, 100)).toBeCloseTo(0, 6);
    expect(tension(rc, { etat: "ouvert" }, 0, 3)).toBe(0);
  });
  it("on ne pose pas deux fois le même fil, ni un fil sur une borne inconnue ; on peut le retirer", () => {
    let etat = rejoueCircuit(rc, relier(serie));
    expect(etat.fils).toHaveLength(4);
    expect(gesteCircuit(rc, etat, { g: "relier", a: "k1", b: "g+" })).toBe(etat);
    expect(gesteCircuit(rc, etat, { g: "relier", a: "g+", b: "inconnue" })).toBe(etat);
    expect(gesteCircuit(rc, etat, { g: "relier", a: "g+", b: "g+" })).toBe(etat);
    etat = gesteCircuit(rc, etat, { g: "retirer", a: "k1", b: "g+" });
    expect(etat.fils).toHaveLength(3);
    expect(gesteCircuit(rc, CIRCUIT_INITIAL, { g: "lire", tau: -1 })).toBe(CIRCUIT_INITIAL);
    expect(gesteCircuit(rc, CIRCUIT_INITIAL, { g: "niveau", h: 4 })).toBe(CIRCUIT_INITIAL);
  });
  it("le bilan : un bon montage et une bonne lecture ; sinon des fautes", () => {
    const gestes: GesteCircuit[] = [...relier([...serie, ["voie", "c1"], ["masse", "c2"]]), { g: "acquerir" }, { g: "lire", tau: 3.3 }];
    expect(bilanCircuit(rc, rejoueCircuit(rc, gestes))).toEqual({ mesures: { tau: 3.3 }, fautes: [], score: 1 });
    const approx = bilanCircuit(rc, rejoueCircuit(rc, [...gestes.slice(0, -1), { g: "lire", tau: 3.6 }]));
    expect(approx.fautes.map((f) => [f.code, f.grave])).toEqual([["lecture", false]]);
    const surR = bilanCircuit(rc, rejoueCircuit(rc, [...relier([...serie, ["voie", "r1"], ["masse", "r2"]]), { g: "acquerir" }, { g: "lire", tau: 5 }]));
    expect(surR.fautes.map((f) => [f.code, f.grave])).toEqual([["montage", true], ["lecture", true]]);
    expect(surR.score).toBe(0);
    const inverse = bilanCircuit(rc, rejoueCircuit(rc, [...relier([...serie, ["voie", "c2"], ["masse", "c1"]]), { g: "acquerir" }, { g: "lire", tau: 3.3 }]));
    expect(inverse.fautes.map((f) => [f.code, f.grave])).toEqual([["montage", false]]);
    expect(bilanCircuit(rc, CIRCUIT_INITIAL).fautes.map((f) => f.code)).toEqual(["acquisition", "lecture"]);
    // une nouvelle acquisition efface la lecture précédente
    expect(rejoueCircuit(rc, [...gestes, { g: "acquerir" }]).lu).toBeNull();
  });
});

describe("un capteur de niveau sur microcontrôleur", () => {
  const capteur: ReglagesCircuit = {
    generateur: { plus: "d2", moins: "gnd", E: 5 },
    dipoles: [{ id: "R", genre: "resistance", bornes: ["r1", "r2"] }, { id: "C", genre: "condensateur", bornes: ["c1", "c2"] }],
    mesure: { voie: "a0", masse: null },
    R: 1e6, C: 100e-12, parCm: 40e-12, niveaux: [0, 2, 4, 6, 8], lecture: false, duree: 0.002,
  };
  const montage: [string, string][] = [["d2", "r1"], ["r2", "c1"], ["c2", "gnd"], ["a0", "c1"]];
  it("sans masse propre, la voie mesure par rapport à la borne −", () => {
    expect(analyse(capteur, montage)).toMatchObject({ etat: "serie", mesure: "uC" });
    expect(analyse(capteur, [...montage.slice(0, 3), ["a0", "r1"]])).toMatchObject({ mesure: "generateur" });
  });
  it("l'appareil affiche τ = R × C pour chaque niveau d'eau, si le montage est bon", () => {
    const etat = rejoueCircuit(capteur, [...relier(montage), { g: "acquerir" }, { g: "niveau", h: 4 }, { g: "acquerir" }, { g: "niveau", h: 8 }, { g: "acquerir" }, { g: "niveau", h: 5 }]);
    expect(etat.niveau).toBe(8);
    const b = bilanCircuit(capteur, etat);
    expect(b.fautes).toEqual([]);
    expect(b.mesures.tau0).toBeCloseTo(100e-6, 12);
    expect(b.mesures.tau4).toBeCloseTo(260e-6, 12);
    expect(b.mesures.tau8).toBeCloseTo(420e-6, 12);
    // un montage faux n'affiche rien ; deux niveaux ne suffisent pas
    const faux = rejoueCircuit(capteur, [...relier(montage.slice(0, 3)), { g: "acquerir" }]);
    expect(faux.acquisitions[0].tau).toBeNull();
    expect(bilanCircuit(capteur, faux).fautes.map((f) => f.code)).toEqual(["montage", "niveaux"]);
  });
});

describe("le niveau d'une compétence", () => {
  it("A au-dessus de 0,9 ; B à partir de 0,6 ; C à partir de 0,3 ; D en dessous", () => {
    expect([1, 0.9, 0.75, 0.6, 0.5, 0.3, 0.25, 0].map(niveauPour)).toEqual(["A", "A", "B", "B", "C", "C", "D", "D"]);
  });
});
