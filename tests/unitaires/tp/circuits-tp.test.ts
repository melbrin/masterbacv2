// Les deux TP des paillasses Circuits et Microcontrôleur, joués sans le navigateur du début à la fin : la manipulation
// soignée de chaque situation tirée par la graine, puis des manipulations fautives dont la mesure suit l'élève dans
// l'exploitation. Et la paillasse du microcontrôleur (lib/commun/tp/paillasses/microcontroleur.ts), geste par geste.
import { describe, expect, it } from "vitest";
import { DUREES, POINTS, capacite, regles as circuit, tauAttendu, type ReglagesCircuit } from "@/lib/commun/tp/paillasses/circuit";
import {
  BORNES, FILS_MAX, HAUTEUR, SEUIL, dureeAttendue, mesure, placeDe, rangeesDe, regles as microcontroleur,
  type EtatMicrocontroleur, type ReglagesMicrocontroleur,
} from "@/lib/commun/tp/paillasses/microcontroleur";
import { rejoue, type GesteBrut } from "@/lib/commun/tp/types";
import condensateur from "@/lib/serveur/contenu/tp/condensateur";
import jauge from "@/lib/serveur/contenu/tp/jauge";
import { GRAINES, controlesCommuns, joueJuste, type EtapeDePaillasse, type ReglesDuTest } from "../../outils/tp";

// ces TP sont en construction : ils ne sont pas inscrits dans l'application, le test donne lui-même leurs règles
const REGLES = { circuit, microcontroleur } as ReglesDuTest;
const relier = (fils: [string, string][]): GesteBrut[] => fils.map(([a, b]) => ({ g: "relier", a, b }));

// ---------- un condensateur sans étiquette ----------
const reglagesDe = (etape: EtapeDePaillasse) => etape.paillasse.reglages as ReglagesCircuit;
const nomDe = (r: ReglagesCircuit, genre: string, valeur?: number): string => r.boite.find((c) => c.genre === genre && (valeur === undefined || c.valeur === valeur))!.id;
/** La durée qui montre la montée et le palier, et le point de la courbe le plus proche de 63 % de la tension finale. */
function lecture(tau: number): { duree: number; lu: number } {
  const duree = DUREES.find((d) => d >= 4 * tau && d <= 12 * tau)!;
  const pas = duree / POINTS;
  return { duree, lu: Math.round(Math.round(tau / pas) * pas * 1000) / 1000 };
}
/** La charge du condensateur, faite avec soin ; `resistance` et `decharge` permettent de la faire mal. */
function charge(r: ReglagesCircuit, resistance = r.demande.R, decharge = true): GesteBrut[] {
  const { duree, lu } = lecture(resistance * capacite(r));
  return [
    { g: "poser", quoi: nomDe(r, "interrupteur"), ou: 0 }, { g: "poser", quoi: nomDe(r, "resistance", resistance), ou: 1 }, { g: "poser", quoi: nomDe(r, "condensateur"), ou: 2 },
    { g: "tension", v: r.demande.E },
    ...relier([["g+", "a1"], ["a2", "b1"], ["b2", "c1"], ["c2", "g-"], ["voie", "c1"], ["masse", "c2"]]),
    ...(decharge ? [{ g: "relier", a: "c1", b: "c2" }, { g: "retirer", a: "c1", b: "c2" }] : []),
    { g: "duree", v: duree }, { g: "lancer" }, { g: "basculer" }, { g: "noter", v: lu },
  ];
}

describe("un condensateur sans étiquette", () => {
  const t = condensateur;
  it("une situation à lire, une manipulation, les quatre compétences, rien de la réponse dans le navigateur, D partout sans rien faire", async () => {
    await controlesCommuns(t, REGLES);
    expect(t.etapes(1)).toHaveLength(11);
  });
  it("fait avec soin, le TP donne A partout, quelle que soit la situation tirée", async () => {
    const situations = new Set<string>();
    const conclusions = new Set<number>();
    for (const graine of GRAINES) {
      const partie = await joueJuste(t, graine, (etape) => charge(reglagesDe(etape)), REGLES);
      expect(partie.scores.every((s) => s === 1), `graine ${graine} : ${partie.scores.join(" ")}`).toBe(true);
      expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "A", VAL: "A" });
      expect(partie.fautes).toEqual([[]]);
      const r = reglagesDe(partie.etapes.find((e) => e.genre === "paillasse") as EtapeDePaillasse);
      // la mesure de l'élève : son temps caractéristique, à un point de la courbe près, et le conducteur ohmique du protocole
      expect(partie.mesures.R).toBe(r.demande.R);
      expect(Math.abs(partie.mesures.tau - tauAttendu(r)) / tauAttendu(r)).toBeLessThan(0.03);
      situations.add(`${r.demande.R} ${r.demande.E} ${capacite(r)} ${r.reste}`);
      const identite = partie.retours[partie.retours.length - 3].correction;
      if (identite.genre === "choix") conclusions.add(identite.bonne);
    }
    // la graine change la situation, et la conclusion avec elle : chacune des trois capacités est tirée
    expect(situations.size).toBe(6);
    expect(conclusions).toEqual(new Set([0, 1, 2]));
  });
  it("chaque boîte a le conducteur ohmique du protocole et deux pièges, le condensateur et l'interrupteur", () => {
    for (const graine of GRAINES) {
      const r = reglagesDe(t.etapes(graine).find((e) => e.genre === "paillasse") as EtapeDePaillasse);
      const resistances = r.boite.filter((c) => c.genre === "resistance").map((c) => c.valeur);
      expect(resistances.filter((R) => R === r.demande.R)).toHaveLength(1);
      expect([...resistances].sort((a, b) => a - b)).toEqual([r.demande.R / 10, r.demande.R, r.demande.R * 10]);
      expect(r.boite.map((c) => c.genre).sort()).toEqual(["condensateur", "interrupteur", "resistance", "resistance", "resistance"]);
      expect(new Set(r.boite.map((c) => c.id)).size).toBe(5);
      // le reste de charge se voit sur la courbe, et une des durées de la carte montre la montée et le palier
      expect(r.reste).toBeGreaterThan(0.1 * r.demande.E);
      expect(DUREES.some((d) => d >= 4 * tauAttendu(r) && d <= 12 * tauAttendu(r))).toBe(true);
    }
  });
  it("avec le mauvais conducteur ohmique, la manipulation perd un quart, et l'exploitation se juge sur la mesure de l'élève", async () => {
    for (const graine of GRAINES.slice(0, 3)) {
      const partie = await joueJuste(t, graine, (etape) => charge(reglagesDe(etape), reglagesDe(etape).demande.R / 10), REGLES);
      expect(partie.fautes).toEqual([["resistance"]]);
      expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "B", VAL: "A" });
      // sa capacité se calcule avec le conducteur ohmique qu'il a posé : elle reste la bonne
      const r = reglagesDe(partie.etapes.find((e) => e.genre === "paillasse") as EtapeDePaillasse);
      expect(partie.mesures.R).toBe(r.demande.R / 10);
      expect(Math.abs(partie.mesures.tau / partie.mesures.R - capacite(r)) / capacite(r)).toBeLessThan(0.03);
    }
  });
  it("sans décharger le condensateur, la courbe ne part pas de zéro : la faute est importante", async () => {
    const partie = await joueJuste(t, GRAINES[0], (etape) => charge(reglagesDe(etape), undefined, false), REGLES);
    expect(partie.fautes).toEqual([["decharge"]]);
    expect(partie.retours.find((x) => x.correction.genre === "paillasse")!.score).toBe(0.5);
    expect(partie.bilan.REA).toBe("C");
  });
});

// ---------- la paillasse du microcontrôleur ----------
// un capteur de 100 pF cuve vide, 40 pF de plus par centimètre d'eau ; le conducteur ohmique du protocole fait 1 MΩ
const m: ReglagesMicrocontroleur = {
  boite: [{ id: "ra", genre: "resistance", valeur: 10_000_000 }, { id: "rb", genre: "resistance", valeur: 1_000_000 }, { id: "rc", genre: "resistance", valeur: 100_000 }],
  demande: { R: 1_000_000, releves: 4 },
  C0: 100e-12, parCm: 40e-12, niveau: 3.4,
};
const joue = (gestes: GesteBrut[], r = m): EtatMicrocontroleur => rejoue(microcontroleur, r, gestes);
const fautes = (gestes: GesteBrut[], r = m) => microcontroleur.bilan(r, joue(gestes, r)).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);
/** Le montage du protocole : D2, le conducteur ohmique entre les rangées 1 et 2, A0 et une lame sur la rangée 2, l'autre lame à GND. */
const MONTAGE: [string, string][] = [["d2", "l1"], ["a0", "l2"], ["p1", "l2"], ["p2", "gnd"]];
const cabler = (resistance = "rb", fils = MONTAGE): GesteBrut[] => [{ g: "poser", quoi: resistance, ou: 0 }, ...relier(fils)];
/**
 * Les relevés d'un élève soigneux : il amène l'eau à chaque niveau, lance une mesure, et note le niveau qu'il lit
 * (au millimètre) et la durée que le moniteur affiche. `avant` : les gestes déjà faits.
 */
function releves(r: ReglagesMicrocontroleur, avant: GesteBrut[], niveaux: number[], lu: (h: number) => number = (h) => h): GesteBrut[] {
  const gestes = [...avant];
  for (const h of niveaux) {
    const niveau = joue(gestes, r).niveau;
    if (h < niveau) gestes.push({ g: "vider", v: Math.round((niveau - h) * 100) / 100 });
    if (h > niveau) gestes.push({ g: "verser", v: Math.round((h - niveau) * 100) / 100 });
    gestes.push({ g: "mesurer" });
    const lignes = joue(gestes, r).lignes;
    gestes.push({ g: "noter", h: lu(h), t: lignes[lignes.length - 1]?.duree ?? 0 });
  }
  return gestes;
}
const NIVEAUX = [0, 2.8, 5.5, 8.2];
const soignee = (r = m, resistance = "rb"): GesteBrut[] => releves(r, cabler(resistance), NIVEAUX);

describe("le programme de la carte", () => {
  it("avec le bon montage, il affiche le temps caractéristique : τ = R × C, pour chaque niveau d'eau", () => {
    const etat = joue(cabler());
    expect(mesure(m, etat)).toMatchObject({ niveau: 3.4, duree: 236, nature: "charge" });
    // la résistance vue par le capteur : celle du conducteur ohmique, à l'entrée de la carte près
    expect(Math.abs(mesure(m, etat).R - 1_000_000)).toBeLessThan(200);
    for (const h of [0, 2, 4.5, 8, 12]) {
      const affiche = mesure(m, { ...etat, niveau: h });
      expect(affiche.nature).toBe("charge");
      expect(Math.abs(affiche.duree! - dureeAttendue(m, h))).toBeLessThanOrEqual(1);
    }
    expect([dureeAttendue(m, 0), dureeAttendue(m, 8), dureeAttendue(m, 8, 100_000)]).toEqual([100, 420, 42]);
    expect(SEUIL).toBeCloseTo(3.16, 2);
  });
  it("le conducteur ohmique sur l'autre emplacement, ou les lames échangées : la mesure est la même", () => {
    const autre = joue([{ g: "poser", quoi: "rb", ou: 1 }, ...relier([["d2", "l3"], ["a0", "l2"], ["p2", "l2"], ["p1", "gnd"]])]);
    expect(mesure(m, autre)).toMatchObject({ duree: 236, nature: "charge" });
    expect(rangeesDe(1)).toEqual(["l2", "l3"]);
  });
  it("un montage faux : 0 µs si A0 voit 5 V tout de suite, « délai dépassé » si elle ne voit jamais le seuil", () => {
    // A0 du côté de D2 : elle lit 5 V dès le départ
    expect(mesure(m, joue(cabler("rb", [["d2", "l1"], ["a0", "l1"], ["p1", "l2"], ["p2", "gnd"]])))).toMatchObject({ duree: 0, nature: "autre" });
    // la broche 5 V à la place de D2 : le capteur est chargé en permanence
    expect(mesure(m, joue(cabler("rb", [["v5", "l1"], ["a0", "l2"], ["p1", "l2"], ["p2", "gnd"]])))).toMatchObject({ duree: 0, nature: "autre" });
    // une lame en l'air : aucun courant ne passe, et A0 suit D2 sans attendre
    expect(mesure(m, joue(cabler("rb", MONTAGE.slice(0, 3))))).toMatchObject({ duree: 0, nature: "autre" });
    // A1 à la place de A0, D2 oubliée, pas de conducteur ohmique, rien du tout : la tension lue sur A0 ne monte pas
    expect(mesure(m, joue(cabler("rb", [["d2", "l1"], ["a1", "l2"], ["p1", "l2"], ["p2", "gnd"]])))).toMatchObject({ duree: null, nature: "autre" });
    expect(mesure(m, joue(cabler("rb", MONTAGE.slice(1))))).toMatchObject({ duree: null, nature: "autre" });
    expect(mesure(m, joue(relier(MONTAGE)))).toMatchObject({ duree: null, nature: "autre", R: 0 });
    expect(mesure(m, joue([]))).toEqual({ niveau: 3.4, duree: null, nature: "autre", R: 0 });
    // sans conducteur ohmique, D2 reliée droit au capteur : il se charge d'un coup, la durée est presque nulle
    expect(mesure(m, joue(relier([["d2", "l2"], ["a0", "l2"], ["p1", "l2"], ["p2", "gnd"]])))).toMatchObject({ duree: 0, nature: "autre" });
  });
});

describe("les gestes sur la paillasse du microcontrôleur", () => {
  it("un conducteur ohmique se pique sur un emplacement libre, se déplace, se range", () => {
    let etat = joue([{ g: "poser", quoi: "rb", ou: 0 }]);
    expect([etat.plaque, placeDe(etat, "rb"), placeDe(etat, "ra")]).toEqual([["rb", null], 0, -1]);
    expect(microcontroleur.geste(m, etat, { g: "poser", quoi: "ra", ou: 0 })).toBe(etat);
    etat = microcontroleur.geste(m, etat, { g: "poser", quoi: "rb", ou: 1 });
    expect(etat.plaque).toEqual([null, "rb"]);
    etat = microcontroleur.geste(m, etat, { g: "ranger", quoi: "rb" });
    expect(etat.plaque).toEqual([null, null]);
    expect(microcontroleur.geste(m, etat, { g: "ranger", quoi: "rb" })).toBe(etat);
  });
  it("l'eau monte quand on verse, jusqu'au bord, et descend quand on vide ; deux morceaux valent leur somme", () => {
    expect(joue([{ g: "verser", v: 2.35 }]).niveau).toBe(5.75);
    expect(joue([{ g: "vider", v: 1.4 }]).niveau).toBe(2);
    expect(joue([{ g: "vider", v: 9 }]).niveau).toBe(0);
    const deborde = joue([{ g: "verser", v: 10 }]);
    expect([deborde.niveau, deborde.deborde]).toEqual([HAUTEUR, 1.4]);
    expect(joue([{ g: "verser", v: 0.35 }, { g: "verser", v: 0.2 }, { g: "verser", v: 0.07 }])).toEqual(joue([{ g: "verser", v: 0.62 }]));
    expect(joue([{ g: "verser", v: 8.5 }, { g: "verser", v: 0.3 }])).toEqual(joue([{ g: "verser", v: 8.8 }]));
    expect(joue([{ g: "vider", v: 3.1 }, { g: "vider", v: 0.5 }])).toEqual(joue([{ g: "vider", v: 3.6 }]));
    // une cuve vide ne se vide plus
    const vide = joue([{ g: "vider", v: 12 }]);
    expect(microcontroleur.geste(m, vide, { g: "vider", v: 1 })).toBe(vide);
  });
  it("une broche en court-circuit coupe la carte ; elle repart quand le fil est retiré", () => {
    let etat = joue([{ g: "relier", a: "v5", b: "gnd" }]);
    expect([etat.securite, etat.courts]).toEqual([true, 1]);
    // coupée, la carte ne mesure plus
    expect(microcontroleur.geste(m, etat, { g: "mesurer" })).toBe(etat);
    etat = microcontroleur.geste(m, etat, { g: "retirer", a: "v5", b: "gnd" });
    expect([etat.securite, etat.courts]).toEqual([false, 1]);
    // D2 reliée à GND : la carte ne se coupe qu'au moment où le programme met D2 à 5 V
    const d2 = joue([{ g: "relier", a: "d2", b: "gnd" }]);
    expect(d2.securite).toBe(false);
    const coupee = microcontroleur.geste(m, d2, { g: "mesurer" });
    expect([coupee.securite, coupee.courts, coupee.lancees, coupee.lignes.length]).toEqual([true, 1, 1, 0]);
    expect(joue([{ g: "relier", a: "d2", b: "v5" }]).securite).toBe(true);
    // à travers un conducteur ohmique, aucune broche ne débite trop
    expect(joue([{ g: "poser", quoi: "rc", ou: 0 }, ...relier([["v5", "l1"], ["l2", "gnd"]])]).securite).toBe(false);
  });
  it("le carnet garde ce que l'élève note, avec la mesure affichée à ce moment-là ; une ligne s'efface", () => {
    let etat = joue([...cabler(), { g: "mesurer" }, { g: "noter", h: 3.4, t: 236 }, { g: "noter", h: 9.87, t: 12.4 }]);
    expect(etat.carnet).toEqual([{ h: 3.4, t: 236, mesure: 0 }, { h: 9.87, t: 12, mesure: 0 }]);
    etat = microcontroleur.geste(m, etat, { g: "effacer" });
    expect(etat.carnet).toHaveLength(1);
    expect(joue([{ g: "noter", h: 2, t: 100 }]).carnet).toEqual([{ h: 2, t: 100, mesure: -1 }]);
    expect(joue(Array.from({ length: 12 }, () => ({ g: "noter", h: 1, t: 1 }))).carnet).toHaveLength(8);
    expect(joue([...cabler(), ...Array.from({ length: 80 }, () => ({ g: "mesurer" }))]).lignes).toHaveLength(60);
  });
  it("un geste inconnu, mal formé ou hors bornes ne change rien", () => {
    const etat = joue(cabler());
    const bizarres: GesteBrut[] = [
      { g: "exploser" }, { g: "poser", quoi: "lampe", ou: 0 }, { g: "poser", quoi: "ra", ou: 2 }, { g: "poser", quoi: "ra", ou: 0.5 }, { g: "poser", quoi: "ra" },
      { g: "relier", a: "d2" }, { g: "relier", a: "d2", b: "d2" }, { g: "relier", a: "d2", b: "l1" }, { g: "relier", a: "d2", b: "plafond" }, { g: "retirer", a: "a1", b: "gnd" },
      { g: "verser" }, { g: "verser", v: -1 }, { g: "verser", v: 40 }, { g: "vider", v: "tout" }, { g: "noter", h: 3 }, { g: "noter", h: -1, t: 100 }, { g: "noter", h: 3, t: 5e6 }, { g: "effacer" },
    ];
    for (const g of bizarres) expect(microcontroleur.geste(m, etat, g), JSON.stringify(g)).toBe(etat);
    const tous = BORNES.flatMap((a, i) => BORNES.slice(i + 1).map((b): [string, string] => [a, b]));
    expect(joue(relier(tous)).fils).toHaveLength(FILS_MAX);
  });
});

describe("le bilan des relevés", () => {
  it("une manipulation soignée n'a aucune faute, et ses mesures sont celles du carnet", () => {
    const b = microcontroleur.bilan(m, joue(soignee()));
    expect(b.fautes).toEqual([]);
    expect(b.score).toBe(1);
    expect(b.mesures).toEqual({ tau0: 100, h: 8.2, tau: 428, R: 1_000_000 });
    expect(b.lignes[0]).toContain("428 µs pour 8,2 cm");
  });
  it("sans rien faire, la manipulation vaut zéro, et le professeur donne ses valeurs", () => {
    const b = microcontroleur.bilan(m, joue([]));
    expect([b.score, b.fautes.map((f) => f.code)]).toEqual([0, ["mesure"]]);
    expect(b.mesures).toEqual({ tau0: 100, h: 8, tau: 420, R: 1_000_000 });
    // des mesures sans rien noter, ou des lignes notées devant un moniteur vide
    expect(fautes([...cabler(), { g: "mesurer" }])).toEqual(["carnet!"]);
    expect(fautes([...cabler(), { g: "noter", h: 3.4, t: 236 }, { g: "mesurer" }])).toEqual(["carnet!"]);
    // une carte coupée avant toute mesure
    expect(microcontroleur.bilan(m, joue([{ g: "relier", a: "v5", b: "gnd" }, { g: "mesurer" }])).fautes[0].texte).toMatch(/s'est coupée/);
  });
  it("un montage faux se lit sur le moniteur, et le professeur dit pourquoi", () => {
    const direct = releves(m, cabler("rb", [["d2", "l1"], ["a0", "l1"], ["p1", "l2"], ["p2", "gnd"]]), NIVEAUX);
    expect(fautes(direct)).toEqual(["montage!", "releves!"]);
    expect(microcontroleur.bilan(m, joue(direct)).fautes[0].texte).toMatch(/affiché 0 µs/);
    // le fil de D2 oublié : rien ne charge le capteur
    const ouvert = releves(m, cabler("rb", MONTAGE.slice(1)), NIVEAUX);
    expect(microcontroleur.bilan(m, joue(ouvert)).fautes.map((f) => f.code)).toEqual(["montage", "duree", "releves"]);
    expect(microcontroleur.bilan(m, joue(ouvert)).fautes[0].texte).toMatch(/délai dépassé/);
    // noter un nombre quand le moniteur dit « délai dépassé »
    const invente = [...cabler("rb", MONTAGE.slice(1)), { g: "mesurer" }, { g: "noter", h: 3.4, t: 236 }];
    expect(fautes(invente)).toEqual(["montage!", "duree!", "releves!"]);
    // deux conducteurs ohmiques en série, de la rangée 1 à la rangée 3
    const deux = releves(m, [{ g: "poser", quoi: "rb", ou: 0 }, { g: "poser", quoi: "rc", ou: 1 }, ...relier([["d2", "l1"], ["a0", "l3"], ["p1", "l3"], ["p2", "gnd"]])], NIVEAUX);
    expect(fautes(deux)).toEqual(["resistance!"]);
    expect(microcontroleur.bilan(m, joue(deux)).fautes[0].texte).toMatch(/1,1 MΩ/);
    // un second conducteur ohmique aux bornes du capteur : il ne se charge qu'à moitié, mais assez pour passer le seuil
    const pont = releves(m, [{ g: "poser", quoi: "rc", ou: 0 }, { g: "poser", quoi: "rb", ou: 1 }, ...relier([["d2", "l1"], ["a0", "l2"], ["p1", "l2"], ["p2", "gnd"], ["l3", "gnd"]])], NIVEAUX);
    expect(joue(pont).lignes[0]).toMatchObject({ nature: "autre" });
    expect(joue(pont).lignes[0].duree).toBeGreaterThan(0);
    expect(microcontroleur.bilan(m, joue(pont)).fautes[0].texte).toMatch(/n'était pas celle du capteur en train de se charger de 0 à 5 V/);
    // corrigé en cours de route : seules les lignes notées avec le mauvais montage comptent contre l'élève
    const corrige = releves(m, [...invente.slice(0, -1), { g: "relier", a: "d2", b: "l1" }], NIVEAUX);
    expect(fautes(corrige)).toEqual([]);
  });
  it("le mauvais conducteur ohmique : la faute est légère, et les mesures suivent l'élève", () => {
    const b = microcontroleur.bilan(m, joue(soignee(m, "rc")));
    expect(b.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["resistance"]);
    expect(b.mesures).toEqual({ tau0: 10, h: 8.2, tau: 43, R: 100_000 });
  });
  it("le niveau mal lu, la durée mal recopiée, une mesure oubliée après avoir changé le niveau", () => {
    // lu au bord du ménisque plutôt qu'en son creux, à une demi-graduation près : la lecture reste juste
    expect(fautes(releves(m, cabler(), NIVEAUX, (h) => (h === 5.5 ? 5.6 : h)))).toEqual([]);
    expect(fautes(releves(m, cabler(), NIVEAUX, (h) => (h === 5.5 ? 5.7 : h === 8.2 ? 8 : h)))).toEqual([]);
    expect(fautes(releves(m, cabler(), NIVEAUX, (h) => (h === 5.5 ? 5.8 : h)))).toEqual(["niveau"]);
    expect(fautes(releves(m, cabler(), NIVEAUX, (h) => (h === 5.5 ? 6.5 : h)))).toEqual(["niveau!"]);
    const recopie = soignee().map((g) => (g.g === "noter" && g.h === 5.5 ? { ...g, t: 330 } : g));
    expect(fautes(recopie)).toEqual(["duree"]);
    expect(fautes(soignee().map((g) => (g.g === "noter" && g.h === 5.5 ? { ...g, t: 230 } : g)))).toEqual(["duree!"]);
    // l'eau a monté, mais le moniteur affiche encore l'ancienne mesure
    const oubli = [...releves(m, cabler(), NIVEAUX.slice(0, 3)), { g: "verser", v: 2.7 }, { g: "noter", h: 8.2, t: 320 }];
    expect(fautes(oubli)).toEqual(["niveau!", "releves"]);
    expect(microcontroleur.bilan(m, joue(oubli)).fautes[0].texte).toMatch(/noté 8,2 cm pour une mesure faite avec 5,5 cm d'eau/);
  });
  it("trop peu de niveaux, des niveaux trop proches, pas de mesure pour la cuve vide, une cuve qui déborde", () => {
    expect(fautes(releves(m, cabler(), [0, 4, 8.2]))).toEqual(["releves"]);
    expect(fautes(releves(m, cabler(), [0]))).toEqual(["releves!"]);
    expect(fautes(releves(m, cabler(), [0, 1.5, 3, 4.5]))).toEqual(["etendue"]);
    // sans mesure pour la cuve vide, l'exploitation part des valeurs du professeur
    const sansVide = microcontroleur.bilan(m, joue(releves(m, cabler(), [1, 3.5, 6, 8.5])));
    expect(sansVide.fautes.map((f) => f.code)).toEqual(["vide"]);
    expect(sansVide.mesures).toEqual({ tau0: 100, h: 8, tau: 420, R: 1_000_000 });
    // deux mesures au même niveau n'en font qu'une
    expect(fautes(releves(m, cabler(), [0, 4, 4.1, 8.2]))).toEqual(["releves"]);
    expect(fautes(releves(m, [...cabler(), { g: "verser", v: 10 }], NIVEAUX))).toEqual(["deborde"]);
    expect(fautes(releves(m, [{ g: "relier", a: "v5", b: "gnd" }, { g: "retirer", a: "v5", b: "gnd" }, ...cabler()], NIVEAUX))).toEqual(["court"]);
  });
});

describe("une jauge de niveau d'eau", () => {
  const t = jauge;
  const reglagesDeLaJauge = (etape: EtapeDePaillasse) => etape.paillasse.reglages as ReglagesMicrocontroleur;
  const manipulation = (etape: EtapeDePaillasse, resistance?: number): GesteBrut[] => {
    const r = reglagesDeLaJauge(etape);
    return releves(r, cabler(r.boite.find((c) => c.valeur === (resistance ?? r.demande.R))!.id), NIVEAUX);
  };
  it("une situation à lire, une manipulation, les quatre compétences, rien de la réponse dans le navigateur, D partout sans rien faire", async () => {
    await controlesCommuns(t, REGLES);
    expect(t.etapes(1)).toHaveLength(10);
  });
  it("fait avec soin, le TP donne A partout, quelle que soit la situation tirée", async () => {
    const situations = new Set<string>();
    const conclusions = new Set<number>();
    for (const graine of GRAINES) {
      const partie = await joueJuste(t, graine, manipulation, REGLES);
      expect(partie.scores.every((s) => s === 1), `graine ${graine} : ${partie.scores.join(" ")}`).toBe(true);
      expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "A", VAL: "A" });
      expect(partie.fautes).toEqual([[]]);
      const r = reglagesDeLaJauge(partie.etapes.find((e) => e.genre === "paillasse") as EtapeDePaillasse);
      // les mesures de l'élève : ce que le moniteur a affiché pour la cuve vide et pour son niveau le plus haut
      expect(partie.mesures.R).toBe(r.demande.R);
      expect(Math.abs(partie.mesures.tau0 - dureeAttendue(r, 0))).toBeLessThanOrEqual(1);
      expect(Math.abs(partie.mesures.tau - dureeAttendue(r, 8.2))).toBeLessThanOrEqual(1);
      situations.add(`${r.demande.R} ${r.C0} ${r.parCm} ${r.niveau}`);
      const conclusion = partie.retours[partie.retours.length - 1].correction;
      if (conclusion.genre === "choix") conclusions.add(conclusion.bonne);
    }
    // la graine change la situation, et la conclusion avec elle : il reste assez d'eau, ou pas
    expect(situations.size).toBe(6);
    expect(conclusions).toEqual(new Set([0, 1]));
  });
  it("chaque boîte a le conducteur ohmique du protocole et deux pièges ; la cuve n'est jamais vide au départ", () => {
    for (const graine of GRAINES) {
      const r = reglagesDeLaJauge(t.etapes(graine).find((e) => e.genre === "paillasse") as EtapeDePaillasse);
      expect(r.boite.map((c) => c.valeur).sort((a, b) => a - b)).toEqual([r.demande.R / 10, r.demande.R, r.demande.R * 10]);
      expect(new Set(r.boite.map((c) => c.id)).size).toBe(3);
      expect(r.niveau).toBeGreaterThan(1);
      expect(r.niveau).toBeLessThan(HAUTEUR);
      // même avec le plus gros conducteur ohmique et la cuve pleine, le programme n'abandonne pas
      const gros = r.boite.find((c) => c.valeur === r.demande.R * 10)!.id;
      expect(mesure(r, { ...joue(cabler(gros), r), niveau: HAUTEUR }).duree).not.toBeNull();
    }
  });
  it("avec le mauvais conducteur ohmique, la manipulation perd un quart, et l'exploitation se juge sur les mesures de l'élève", async () => {
    for (const graine of GRAINES.slice(0, 3)) {
      const partie = await joueJuste(t, graine, (etape) => manipulation(etape, reglagesDeLaJauge(etape).demande.R / 10), REGLES);
      expect(partie.fautes).toEqual([["resistance"]]);
      expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "B", VAL: "A" });
      expect(partie.mesures.R).toBe(reglagesDeLaJauge(partie.etapes.find((e) => e.genre === "paillasse") as EtapeDePaillasse).demande.R / 10);
    }
  });
});
