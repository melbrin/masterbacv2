// Les paillasses des TP virtuels (lib/commun/tp) : ce que le matériel répond à chaque geste, et le bilan d'une manipulation.
import { describe, expect, it } from "vitest";
import { CIRCUIT_INITIAL, analyse, bilanCircuit, bornes, defautDuMontage, gesteCircuit, rejoueCircuit, tauVrai, tension, type GesteCircuit, type ReglagesCircuit } from "@/lib/commun/tp/circuit";
import { DECALAGE, TITRAGE_INITIAL, bilanTitrage, geste, pHActuel, pHMelange, rejoueTitrage, volumeEquivalence, volumeLu, type GesteTitrage, type ReglagesTitrage } from "@/lib/commun/tp/titrage";
import { niveauPour } from "@/lib/commun/tp/types";

const fort: ReglagesTitrage = { Ca: 0.0976, pKa: null, Va: 10, Cb: 0.1, suivi: "indicateur", indicateur: "bbt", eau: 20 };
const faible: ReglagesTitrage = { Ca: 0.131, pKa: 4.76, Va: 10, Cb: 0.1, suivi: "phmetre", indicateur: "phenolphtaleine", eau: 40 };
const verser = (v: number, fois: number): GesteTitrage[] => Array.from({ length: fois }, () => ({ g: "verser", v }));
const preparation: GesteTitrage[] = [{ g: "rincer" }, { g: "remplir" }, { g: "zero" }, { g: "prise" }, { g: "indicateur" }, { g: "agiter" }];

describe("le pH pendant un titrage", () => {
  it("acide fort : le pH de départ est celui de l'acide dilué, il vaut 7 à l'équivalence, et il saute autour", () => {
    expect(pHMelange(fort, 0)).toBeCloseTo(-Math.log10((0.0976 * 10) / 30), 3);
    const VE = volumeEquivalence(fort);
    expect(VE).toBeCloseTo(9.76, 9);
    expect(pHMelange(fort, VE)).toBeCloseTo(7, 2);
    expect(pHMelange(fort, VE - 0.05)).toBeLessThan(4.5);
    expect(pHMelange(fort, VE + 0.05)).toBeGreaterThan(9.5);
  });
  it("acide faible : pH = pK_A à la demi-équivalence, pH basique à l'équivalence", () => {
    const VE = volumeEquivalence(faible);
    expect(pHMelange(faible, VE / 2)).toBeCloseTo(4.76, 1);
    expect(pHMelange(faible, VE)).toBeGreaterThan(8);
    expect(pHMelange(faible, VE)).toBeLessThan(9);
    expect(pHMelange(faible, 0)).toBeGreaterThan(2.8);
    expect(pHMelange(faible, 0)).toBeLessThan(3.6);
  });
  it("le pH ne fait que monter quand on verse la soude", () => {
    for (const r of [fort, faible]) {
      let avant = pHMelange(r, 0);
      for (let V = 0.05; V <= 25; V += 0.05) {
        const x = pHMelange(r, V);
        expect(x, `V = ${V}`).toBeGreaterThanOrEqual(avant - 1e-9);
        avant = x;
      }
    }
  });
});

describe("les gestes du titrage", () => {
  it("on ne verse pas sans avoir rempli la burette ni préparé la prise d'essai", () => {
    expect(geste(fort, TITRAGE_INITIAL, { g: "verser", v: 1 })).toBe(TITRAGE_INITIAL);
    const remplie = geste(fort, TITRAGE_INITIAL, { g: "remplir" });
    expect(geste(fort, remplie, { g: "verser", v: 1 })).toBe(remplie);
    expect(pHActuel(fort, remplie)).toBe(7);
    const prete = geste(fort, remplie, { g: "prise" });
    expect(geste(fort, prete, { g: "verser", v: 1 }).verse).toBe(1);
    // un volume qui n'est pas proposé est refusé
    expect(geste(fort, prete, { g: "verser", v: 3 })).toBe(prete);
  });
  it("le rinçage se fait avant de remplir, le zéro avant de verser, et la burette ne donne pas plus de 25 mL", () => {
    const remplie = geste(fort, TITRAGE_INITIAL, { g: "remplir" });
    expect(geste(fort, remplie, { g: "rincer" }).rincee).toBe(false);
    const versee = rejoueTitrage(fort, [{ g: "remplir" }, { g: "prise" }, ...verser(1, 2)]);
    expect(geste(fort, versee, { g: "zero" }).zero).toBe(false);
    expect(rejoueTitrage(fort, [{ g: "remplir" }, { g: "prise" }, ...verser(5, 7)]).verse).toBe(25);
  });
  it("sans réglage du zéro, la lecture est décalée", () => {
    const sansZero = rejoueTitrage(fort, [{ g: "remplir" }, { g: "prise" }, ...verser(1, 3)]);
    expect(volumeLu(sansZero)).toBeCloseTo(3 + DECALAGE, 9);
    expect(volumeLu(rejoueTitrage(fort, [{ g: "remplir" }, { g: "zero" }, { g: "prise" }, ...verser(1, 3)]))).toBeCloseTo(3, 9);
  });
  it("le pH-mètre relève un point à chaque ajout, une fois la sonde en place", () => {
    const etat = rejoueTitrage(faible, [{ g: "remplir" }, { g: "zero" }, { g: "prise" }, ...verser(1, 2), { g: "sonde" }, ...verser(1, 3)]);
    expect(etat.releves.map((p) => p.V)).toEqual([2, 3, 4, 5]);
    expect(etat.releves.every((p, i, l) => i === 0 || p.pH > l[i - 1].pH)).toBe(true);
  });
  it("recommencer vide le récipient et la burette, mais garde le rinçage", () => {
    const etat = rejoueTitrage(fort, [...preparation, ...verser(5, 2), { g: "noter" }, { g: "recommencer" }]);
    expect(etat).toMatchObject({ rincee: true, remplie: false, prise: false, verse: 0, note: null, essais: 1 });
  });
});

describe("le bilan d'un titrage", () => {
  it("un titrage colorimétrique soigné, fini goutte à goutte, n'a aucune faute", () => {
    // 9 mL au millilitre, puis par 0,2 mL, puis goutte à goutte jusqu'au changement de couleur
    const gestes: GesteTitrage[] = [...preparation, ...verser(1, 9), ...verser(0.2, 3), ...verser(0.05, 4), { g: "noter" }];
    const b = bilanTitrage(fort, rejoueTitrage(fort, gestes));
    expect(b.VE).toBeCloseTo(9.8, 9);
    expect(b.fautes).toEqual([]);
    expect(b.score).toBe(1);
  });
  it("dépasser l'équivalence, oublier le zéro ou l'indicateur coûte des points", () => {
    const depasse = bilanTitrage(fort, rejoueTitrage(fort, [...preparation, ...verser(1, 11), { g: "noter" }]));
    expect(depasse.fautes.map((f) => f.code)).toEqual(["apres"]);
    expect(depasse.fautes[0].grave).toBe(true);
    expect(depasse.score).toBe(0.5);
    const leger = bilanTitrage(fort, rejoueTitrage(fort, [...preparation, ...verser(1, 9), ...verser(0.2, 5), { g: "noter" }]));
    expect(leger.fautes.map((f) => [f.code, f.grave])).toEqual([["apres", false]]);
    const bacle = bilanTitrage(fort, rejoueTitrage(fort, [{ g: "remplir" }, { g: "prise" }, ...verser(1, 8), { g: "noter" }]));
    expect(bacle.fautes.map((f) => f.code).sort()).toEqual(["agitation", "avant", "indicateur", "rincage", "zero"]);
    expect(bacle.score).toBe(0);
    expect(bilanTitrage(fort, TITRAGE_INITIAL).fautes.some((f) => f.code === "note")).toBe(true);
  });
  it("au pH-mètre : il faut dépasser le saut, serrer les ajouts autour, et lire le volume avec précision", () => {
    const debut: GesteTitrage[] = [{ g: "rincer" }, { g: "remplir" }, { g: "zero" }, { g: "prise" }, { g: "sonde" }, { g: "agiter" }];
    const soigne = rejoueTitrage(faible, [...debut, ...verser(1, 12), ...verser(0.2, 10), ...verser(1, 4), { g: "noter", v: 13.1 }]);
    expect(bilanTitrage(faible, soigne)).toMatchObject({ VE: 13.1, fautes: [], score: 1 });
    const espace = rejoueTitrage(faible, [...debut, ...verser(1, 18), { g: "noter", v: 13.4 }]);
    expect(bilanTitrage(faible, espace).fautes.map((f) => f.code)).toEqual(["espace", "lecture"]);
    const court = rejoueTitrage(faible, [...debut, ...verser(1, 12), { g: "noter", v: 12 }]);
    expect(bilanTitrage(faible, court).fautes.map((f) => f.code)).toEqual(["avant", "lecture"]);
    // une valeur notée hors de la burette est refusée
    expect(geste(faible, soigne, { g: "noter", v: 80 }).note).toBe(13.1);
  });
});

// un circuit RC : générateur, interrupteur, résistance, condensateur, et une voie de mesure avec sa masse
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
