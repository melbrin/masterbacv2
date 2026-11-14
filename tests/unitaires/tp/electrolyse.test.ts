// La paillasse Électrolyse (lib/commun/tp/paillasses/electrolyse.ts) et son TP : déposer du cuivre sur une plaque et
// comparer sa masse à ce que prévoit la charge qui a circulé. Les manipulations sont jouées ici sans le navigateur,
// geste par geste ; le temps du laboratoire n'avance que par le geste « attendre ».
import { describe, expect, it } from "vitest";
import { nombre } from "@/lib/commun/format";
import { DUREE_MAX, FILM, FILS_MAX, amperemetre, balance, bornes, chronometre, film, intensite, maintenant, masseDe, masseNue, mesuresExactes, montage, regles, type EtatElectrolyse, type ReglagesElectrolyse } from "@/lib/commun/tp/paillasses/electrolyse";
import { FARADAY } from "@/lib/commun/simulations/pile";
import { rejoue, type GesteBrut } from "@/lib/commun/tp/types";
import electrolyse from "@/lib/serveur/contenu/tp/electrolyse";
import { GRAINES, controlesCommuns, joueJuste, type EtapeDePaillasse, type ReglesDuTest } from "../../outils/tp";

// 0,80 A demandés pendant 20 minutes ; 6,0 V au générateur donnent 0,80 A
const r: ReglagesElectrolyse = { electrodes: [{ id: "p1", nom: "plaque 1", masse: 24.317 }, { id: "p2", nom: "plaque 2", masse: 25.126 }], resistance: 7.5, intensite: 0.8, duree: 1200 };
const joue = (gestes: GesteBrut[], reglages = r): EtatElectrolyse => rejoue(regles, reglages, gestes);
const fautes = (gestes: GesteBrut[], reglages = r) => regles.bilan(reglages, joue(gestes, reglages)).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);
const attendre = (v: number): GesteBrut => ({ g: "attendre", v });
const relier = (a: string, b: string): GesteBrut => ({ g: "relier", a, b });
const retirer = (a: string, b: string): GesteBrut => ({ g: "retirer", a, b });
const plaque = (p: string, ou: string): GesteBrut => ({ g: "plaque", p, ou });
const tension = (v: number): GesteBrut => ({ g: "tension", v });
const interrupteur = (ferme: boolean): GesteBrut => ({ g: "interrupteur", ferme });
const chrono = (marche: boolean): GesteBrut => ({ g: "chrono", marche });
const dansLaCuve: GesteBrut[] = [plaque("p1", "cuve"), plaque("p2", "cuve")];
/** Le circuit en série : générateur, interrupteur, ampèremètre, cuve ; la plaque 1 du côté de la borne −. */
const serie: GesteBrut[] = [relier("g+", "k1"), relier("k2", "a"), relier("com", "p2"), relier("p1", "g-")];
/** Le même, la plaque 1 du côté de la borne + : elle devient l'anode. */
const inverse: GesteBrut[] = [relier("g+", "k1"), relier("k2", "a"), relier("com", "p1"), relier("p2", "g-")];

// ---------- un élève qui manipule : il fait un geste, laisse passer le temps, regarde ses appareils, note ce qu'il lit ----------
function eleve(reglages: ReglagesElectrolyse) {
  const gestes: GesteBrut[] = [];
  const etat = () => rejoue(regles, reglages, gestes);
  const fais = (...g: GesteBrut[]) => { gestes.push(...g); };
  return {
    gestes, etat, fais,
    attends: (secondes: number) => fais(attendre(secondes)),
    noteMasse: (erreur = 0) => fais({ g: "noter", quoi: "masse", v: balance(reglages, etat()) + erreur }),
    noteIntensite: (erreur = 0) => fais({ g: "noter", quoi: "intensite", v: Math.abs(amperemetre(reglages, etat())) + erreur }),
    noteDuree: (erreur = 0) => fais({ g: "noter", quoi: "duree", v: chronometre(etat()) + erreur }),
  };
}
type Eleve = ReturnType<typeof eleve>;
/** La tension qui donne l'intensité demandée, au dixième de volt. */
const reglage = (reglages: ReglagesElectrolyse) => Math.round(reglages.intensite * reglages.resistance * 10) / 10;

// les temps d'une manipulation soignée
const peseAvant = (e: Eleve) => { e.fais(plaque("p1", "balance")); e.noteMasse(); e.fais(...dansLaCuve); };
const electrolyseDe = (e: Eleve, reglages: ReglagesElectrolyse, duree = reglages.duree) => {
  e.fais(interrupteur(true), chrono(true), tension(reglage(reglages)));
  e.attends(5);
  e.noteIntensite();
  e.attends(duree - 5);
  e.fais(interrupteur(false), chrono(false));
  e.noteDuree();
};
const peseApres = (e: Eleve, rince = true, seche = true) => {
  e.fais(retirer("p1", "g-"), retirer("com", "p1"), plaque("p1", "support"), ...(rince ? [{ g: "rincer", p: "p1" }] : []), ...(seche ? [{ g: "secher", p: "p1" }] : []), plaque("p1", "balance"));
  e.noteMasse();
};

/** La manipulation soignée d'une situation. */
function soignee(reglages: ReglagesElectrolyse): GesteBrut[] {
  const e = eleve(reglages);
  peseAvant(e);
  e.fais(...serie);
  electrolyseDe(e, reglages);
  peseApres(e);
  return e.gestes;
}

describe("le montage", () => {
  it("générateur, interrupteur, ampèremètre et cuve à la suite : un circuit en série, dont la cathode est la plaque du côté de la borne −", () => {
    expect(montage(r, joue([...dansLaCuve, ...serie]))).toEqual({ etat: "ouvert" });
    expect(montage(r, joue([...dansLaCuve, ...serie, interrupteur(true)]))).toEqual({ etat: "serie", cathode: "p1", amperemetre: 1, interrupteur: true });
    expect(montage(r, joue([...dansLaCuve, ...inverse, interrupteur(true)]))).toEqual({ etat: "serie", cathode: "p2", amperemetre: 1, interrupteur: true });
    // l'ordre des composants dans la boucle ne change rien
    const autre = [relier("g+", "p2"), relier("p1", "a"), relier("com", "k1"), relier("k2", "g-")];
    expect(montage(r, joue([...dansLaCuve, ...autre, interrupteur(true)]))).toEqual({ etat: "serie", cathode: "p1", amperemetre: 1, interrupteur: true });
    // sans interrupteur ni ampèremètre, le courant passe dès le dernier fil
    expect(montage(r, joue([...dansLaCuve, relier("g+", "p2"), relier("p1", "g-")]))).toEqual({ etat: "serie", cathode: "p1", amperemetre: 0, interrupteur: false });
  });
  it("l'ampèremètre branché à l'envers affiche une intensité négative", () => {
    const envers = [relier("g+", "k1"), relier("k2", "com"), relier("a", "p2"), relier("p1", "g-")];
    const etat = joue([...dansLaCuve, ...envers, interrupteur(true), tension(6)]);
    expect(montage(r, etat)).toMatchObject({ amperemetre: -1 });
    expect(amperemetre(r, etat)).toBe(-0.8);
    expect(intensite(r, etat)).toBeCloseTo(0.8, 9);
  });
  it("un circuit ouvert : interrupteur ouvert, fil manquant, plaque hors de la cuve", () => {
    expect(montage(r, joue([...dansLaCuve, ...serie.slice(0, 3), interrupteur(true)]))).toEqual({ etat: "ouvert" });
    expect(montage(r, joue([plaque("p1", "cuve"), relier("g+", "k1"), relier("k2", "a"), relier("p1", "g-"), interrupteur(true)]))).toEqual({ etat: "ouvert" });
    expect(montage(r, joue([]))).toEqual({ etat: "ouvert" });
    expect(amperemetre(r, joue([...dansLaCuve, ...serie, tension(6)]))).toBe(0);
  });
  it("un court-circuit : les deux bornes du générateur reliées sans passer par la cuve", () => {
    expect(montage(r, joue([relier("g+", "g-")]))).toEqual({ etat: "court-circuit" });
    expect(montage(r, joue([relier("g+", "a"), relier("com", "g-")]))).toEqual({ etat: "court-circuit" });
    // un fil d'une plaque à l'autre : le courant ne traverse plus la solution
    const pontee = joue([...dansLaCuve, ...serie, relier("p1", "p2"), interrupteur(true), tension(6)]);
    expect(montage(r, pontee)).toEqual({ etat: "court-circuit" });
    expect(intensite(r, pontee)).toBe(0);
  });
  it("une dérivation : l'ampèremètre aux deux plaques de la cuve offre un second chemin au courant", () => {
    const derive = [relier("g+", "k1"), relier("k2", "p2"), relier("p1", "g-"), relier("a", "p2"), relier("com", "p1")];
    const etat = joue([...dansLaCuve, ...derive, interrupteur(true), tension(6)]);
    expect(montage(r, etat)).toEqual({ etat: "derivation" });
    expect([intensite(r, etat), amperemetre(r, etat)]).toEqual([0, 0]);
  });
  it("les fils : entre deux bornes connues, six au plus ; ils ne se pincent que sur une plaque qui trempe", () => {
    expect(bornes(r)).toEqual(["g+", "g-", "k1", "k2", "a", "com", "p1", "p2"]);
    expect(joue([relier("g+", "p1")]).fils).toEqual([]);
    expect(joue([plaque("p1", "cuve"), relier("g+", "p1"), relier("p1", "g+")]).fils).toEqual([["g+", "p1"]]);
    expect(joue([relier("g+", "g+"), relier("g+", "terre"), { g: "relier", a: "g+" }, retirer("g+", "k1")])).toEqual(joue([]));
    expect(joue([relier("g+", "k1"), relier("k1", "k2"), relier("k2", "a"), relier("a", "com"), relier("com", "g-"), relier("g+", "a"), relier("g-", "k1")]).fils).toHaveLength(FILS_MAX);
    expect(joue([relier("g+", "k1"), relier("k2", "a"), retirer("k1", "g+")]).fils).toEqual([["k2", "a"]]);
  });
});

describe("le courant, le temps et le dépôt", () => {
  const pret: GesteBrut[] = [...dansLaCuve, ...serie, interrupteur(true), tension(6)];
  it("l'intensité est la tension du générateur divisée par la résistance du circuit ; l'ampèremètre l'affiche au centième", () => {
    expect(intensite(r, joue(pret))).toBeCloseTo(0.8, 9);
    expect(amperemetre(r, joue(pret))).toBe(0.8);
    expect(amperemetre(r, joue([...pret, tension(5.3)]))).toBe(0.71);
    expect(joue([tension(5.26)]).tension).toBe(5.3);
    expect(joue([tension(-1), tension(13), tension(0), { g: "tension" }])).toEqual(joue([]));
  });
  it("le cuivre se dépose sur la cathode et quitte l'anode : m = I × Δt × M / (2 × F)", () => {
    const fin = joue([...pret, attendre(1200)]);
    const p = maintenant(r, fin);
    expect(p).toEqual({ charge: 960, quantite: 960, duree: 1200, envers: 0 });
    expect(masseDe(960)).toBeCloseTo((0.8 * 1200 * 63.5) / (2 * FARADAY), 12);
    expect(masseDe(960)).toBeCloseTo(0.31585, 5);
    expect(masseNue(r, fin, "p1")).toBeCloseTo(24.317 + 0.31585, 5);
    expect(masseNue(r, fin, "p2")).toBeCloseTo(25.126 - 0.31585, 5);
    expect(masseNue(r, fin, "p9")).toBe(0);
    // polarité inversée : c'est la plaque 1 qui se dissout
    const envers = joue([...dansLaCuve, ...inverse, interrupteur(true), tension(6), attendre(1200)]);
    expect(maintenant(r, envers).charge).toBe(-960);
    expect(masseNue(r, envers, "p1")).toBeCloseTo(24.317 - 0.31585, 5);
  });
  it("interrupteur ouvert, le dépôt s'arrête ; une intensité retouchée change la suite, pas ce qui est déjà déposé", () => {
    const coupe = joue([...pret, attendre(600), interrupteur(false), attendre(600)]);
    expect(maintenant(r, coupe)).toEqual({ charge: 480, quantite: 480, duree: 600, envers: 0 });
    const retouche = joue([...pret, attendre(600), tension(3), attendre(600)]);
    expect(maintenant(r, retouche).charge).toBeCloseTo(480 + 0.4 * 600, 9);
    expect(maintenant(r, retouche).duree).toBe(1200);
    // une plaque sortie de la cuve ouvre le circuit : il faut d'abord en ôter le fil
    expect(joue([...pret, plaque("p1", "support")])).toEqual(joue(pret));
    expect(intensite(r, joue([...pret, retirer("p1", "g-"), plaque("p1", "support")]))).toBe(0);
  });
  it("deux attentes à la suite valent exactement leur somme ; le temps ne recule pas et ne dépasse pas une journée", () => {
    expect(joue([...pret, chrono(true), attendre(12.34), attendre(40.5)])).toEqual(joue([...pret, chrono(true), attendre(52.84)]));
    expect(maintenant(r, joue([...pret, attendre(0.07), attendre(0.07), attendre(0.07)]))).toEqual(maintenant(r, joue([...pret, attendre(0.21)])));
    expect(joue([attendre(-5), attendre(0), attendre(5000), { g: "attendre" }])).toEqual(joue([]));
    expect(joue(Array.from({ length: 30 }, () => attendre(3600))).t).toBe(DUREE_MAX);
  });
  it("le chronomètre compte tant qu'il est en marche, s'arrête, repart, et se remet à zéro", () => {
    expect(chronometre(joue([attendre(50)]))).toBe(0);
    expect(chronometre(joue([chrono(true), attendre(75.4)]))).toBe(75);
    expect(chronometre(joue([chrono(true), attendre(75.4), chrono(false), attendre(100)]))).toBe(75);
    expect(chronometre(joue([chrono(true), attendre(75.4), chrono(false), attendre(100), chrono(true), attendre(10)]))).toBe(85);
    expect(chronometre(joue([chrono(true), attendre(75.4), { g: "zero" }, attendre(8)]))).toBe(8);
    expect(chronometre(joue([chrono(true), attendre(75.4), chrono(false), { g: "zero" }]))).toBe(0);
    expect(joue([{ g: "zero" }, chrono(false)])).toEqual(joue([]));
    expect(joue([chrono(true), chrono(true)])).toEqual(joue([chrono(true)]));
  });
});

describe("les plaques et la balance", () => {
  it("une plaque va sur le support, dans la cuve ou sur la balance ; sortie de la cuve, elle est mouillée de solution", () => {
    expect(joue([]).plaques).toEqual({ p1: { ou: "support", mouille: "sec", residu: false }, p2: { ou: "support", mouille: "sec", residu: false } });
    expect(joue([plaque("p1", "cuve")]).plaques.p1).toEqual({ ou: "cuve", mouille: "solution", residu: false });
    expect(joue([plaque("p1", "cuve"), plaque("p1", "balance")]).plaques.p1).toEqual({ ou: "balance", mouille: "solution", residu: false });
    expect(joue([plaque("p1", "balance"), plaque("p1", "support")]).plaques.p1).toEqual({ ou: "support", mouille: "sec", residu: false });
    // une seule plaque sur la balance ; pas de place inconnue ; pas de plaque inconnue
    expect(joue([plaque("p1", "balance"), plaque("p2", "balance")]).plaques.p2.ou).toBe("support");
    expect(joue([plaque("p1", "evier"), plaque("p3", "cuve"), plaque("p1", "support"), { g: "plaque", p: "p1" }])).toEqual(joue([]));
  });
  it("rincée, elle porte de l'eau ; séchée, plus rien ; séchée sans rinçage, des cristaux", () => {
    const sortie: GesteBrut[] = [plaque("p1", "cuve"), plaque("p1", "support")];
    expect(film(joue(sortie).plaques.p1)).toBe(FILM.solution);
    expect(film(joue([...sortie, { g: "rincer", p: "p1" }]).plaques.p1)).toBe(FILM.eau);
    expect(film(joue([...sortie, { g: "rincer", p: "p1" }, { g: "secher", p: "p1" }]).plaques.p1)).toBe(0);
    expect(joue([...sortie, { g: "secher", p: "p1" }]).plaques.p1).toEqual({ ou: "support", mouille: "sec", residu: true });
    expect(film(joue([...sortie, { g: "secher", p: "p1" }]).plaques.p1)).toBe(FILM.residu);
    // un rinçage après coup enlève les cristaux ; replongée dans la cuve, la plaque les y laisse
    expect(joue([...sortie, { g: "secher", p: "p1" }, { g: "rincer", p: "p1" }, { g: "secher", p: "p1" }]).plaques.p1).toEqual({ ou: "support", mouille: "sec", residu: false });
    expect(joue([...sortie, { g: "secher", p: "p1" }, plaque("p1", "cuve")]).plaques.p1.residu).toBe(false);
    expect(film(undefined)).toBe(0);
    // on ne rince ni ne sèche une plaque dans la cuve ou sur la balance, ni une plaque déjà sèche
    expect(joue([plaque("p1", "cuve"), { g: "rincer", p: "p1" }, { g: "secher", p: "p1" }])).toEqual(joue([plaque("p1", "cuve")]));
    expect(joue([{ g: "secher", p: "p1" }, { g: "rincer", p: "p9" }, { g: "secher" }])).toEqual(joue([]));
    expect(joue([{ g: "rincer", p: "p1" }, { g: "rincer", p: "p1" }])).toEqual(joue([{ g: "rincer", p: "p1" }]));
  });
  it("la balance affiche au milligramme la plaque posée sur son plateau, avec ce qu'elle porte, moins la tare", () => {
    expect(balance(r, joue([]))).toBe(0);
    expect(balance(r, joue([plaque("p1", "balance")]))).toBe(24.317);
    expect(balance(r, joue([plaque("p1", "cuve"), plaque("p1", "balance")]))).toBe(24.362);
    expect(balance(r, joue([plaque("p1", "balance"), { g: "tare" }]))).toBe(0);
    expect(balance(r, joue([plaque("p1", "balance"), { g: "tare" }, plaque("p1", "support")]))).toBe(-24.317);
    expect(joue([{ g: "tare" }])).toEqual(joue([]));
  });
  it("un geste inconnu, mal formé ou hors bornes ne change rien", () => {
    const bizarres: GesteBrut[] = [{ g: "souder" }, { g: "noter", quoi: "masse", v: 3 }, { g: "noter", quoi: "couleur", v: 3 }, { g: "noter", quoi: "intensite", v: 50 }, { g: "noter", quoi: "duree", v: 1e5 }, { g: "noter", quoi: "duree", v: -3 }, { g: "noter", quoi: "intensite" }, { g: "interrupteur", ferme: false }];
    expect(joue(bizarres)).toEqual(joue([]));
    expect(joue([plaque("p1", "balance"), { g: "noter", quoi: "masse", v: 5000 }])).toEqual(joue([plaque("p1", "balance")]));
  });
});

describe("le bilan", () => {
  it("une manipulation soignée n'a aucune faute, et rend les quatre mesures de l'élève", () => {
    const b = regles.bilan(r, joue(soignee(r)));
    expect(b.fautes).toEqual([]);
    expect(b.score).toBe(1);
    expect(b.mesures).toEqual({ m1: 24.317, m2: 24.633, I: 0.8, dt: 1200 });
    expect(b.lignes).toEqual(["Masses de la plaque : m_1 = 24,317 g avant, m_2 = 24,633 g après.", "Intensité : I = 0,80 A.", `Durée : Δt = ${nombre(1200, 0)} s.`, `Pour une manipulation sans défaut : m_2 − m_1 = 0,316 g, avec I = 0,80 A pendant ${nombre(1200, 0)} s.`]);
  });
  it("sans aucune mesure, la manipulation vaut zéro, et le professeur donne les valeurs du sujet", () => {
    const b = regles.bilan(r, joue([...dansLaCuve, ...serie]));
    expect([b.score, b.fautes.map((f) => f.code)]).toEqual([0, ["mesures"]]);
    expect(b.mesures).toEqual({ m1: 24.317, m2: 24.633, I: 0.8, dt: 1200 });
    expect(mesuresExactes(r, joue([]))).toEqual({ m1: 24.317, m2: 24.633, I: 0.8, dt: 1200 });
  });
  it("chaque mesure oubliée est une faute importante ; le professeur la fournit, d'après l'électrolyse qui a été faite", () => {
    const sans = (rang: number) => { const notes = soignee(r).flatMap((g, i) => (g.g === "noter" ? [i] : [])); return soignee(r).filter((_, i) => i !== notes[rang]); };
    // dans l'ordre de la manipulation : la masse avant, l'intensité, la durée, la masse après
    expect(fautes(sans(0))).toEqual(["pesee!"]);
    expect(fautes(sans(1))).toEqual(["intensite!"]);
    expect(fautes(sans(2))).toEqual(["duree!"]);
    expect(fautes(sans(3))).toEqual(["pesee!"]);
    expect(regles.bilan(r, joue(sans(3))).mesures.m2).toBe(24.633);
    expect(regles.bilan(r, joue(sans(2))).mesures.dt).toBe(1200);
  });
  it("polarité inversée : la plaque pesée était l'anode, elle a perdu de la masse", () => {
    const e = eleve(r);
    peseAvant(e);
    e.fais(...inverse);
    electrolyseDe(e, r);
    peseApres(e);
    const b = regles.bilan(r, e.etat());
    expect(b.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["polarite!", "releves!"]);
    expect(b.fautes[0].texte).toContain("La plaque 1 était reliée à la borne + du générateur : c'est l'anode, où le cuivre se dissout. Elle a perdu 0,316 g au lieu d'en gagner");
    expect(e.etat().notes.apres?.v).toBe(24.001);
    // le calcul de la masse déposée n'a plus de sens : la suite se fait avec les valeurs du sujet
    expect(b.mesures).toEqual({ m1: 24.317, m2: 24.633, I: 0.8, dt: 1200 });
  });
  it("la plaque pesée mouillée pèse son liquide ; séchée sans rinçage, ses cristaux", () => {
    const mouillee = eleve(r);
    peseAvant(mouillee);
    mouillee.fais(...serie);
    electrolyseDe(mouillee, r);
    peseApres(mouillee, false, false);
    const b = regles.bilan(r, mouillee.etat());
    expect(b.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["mouille!"]);
    expect(b.fautes[0].texte).toContain("encore mouillée quand tu l'as pesée après l'électrolyse : le liquide qu'elle porte pèse 0,045 g");
    expect(b.mesures.m2).toBe(24.678);
    // rincée mais pas séchée
    const rincee = eleve(r);
    peseAvant(rincee);
    rincee.fais(...serie);
    electrolyseDe(rincee, r);
    peseApres(rincee, true, false);
    expect(fautes(rincee.gestes)).toEqual(["mouille!"]);
    // séchée sans être rincée
    const cristaux = eleve(r);
    peseAvant(cristaux);
    cristaux.fais(...serie);
    electrolyseDe(cristaux, r);
    peseApres(cristaux, false, true);
    expect(fautes(cristaux.gestes)).toEqual(["rincage"]);
    expect(regles.bilan(r, cristaux.etat()).mesures.m2).toBe(24.639);
    // trempée avant la première pesée
    const trempee = eleve(r);
    trempee.fais(plaque("p1", "cuve"), plaque("p1", "balance"));
    trempee.noteMasse();
    expect(regles.bilan(r, trempee.etat()).fautes.find((f) => f.code === "mouille")?.texte).toContain("avant l'électrolyse");
  });
  it("le chronomètre lancé en retard ne compte pas tout le temps du courant", () => {
    const retard = (secondes: number) => {
      const e = eleve(r);
      peseAvant(e);
      e.fais(...serie, interrupteur(true), tension(6));
      e.attends(secondes);
      e.fais(chrono(true));
      e.noteIntensite();
      e.attends(1200 - secondes);
      e.fais(interrupteur(false), chrono(false));
      e.noteDuree();
      peseApres(e);
      return regles.bilan(r, e.etat());
    };
    // quelques secondes d'écart sont celles de la main qui va de l'interrupteur au chronomètre : jusqu'à 2 % de la durée
    expect(retard(8).fautes).toEqual([]);
    expect(retard(20).fautes).toEqual([]);
    expect(retard(25).fautes.map((f) => f.code)).toEqual(["chrono"]);
    expect(retard(40).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["chrono"]);
    expect(retard(40).fautes[0].texte).toContain(`Le courant a passé pendant ${nombre(1200, 0)} s, mais ton chronomètre a compté ${nombre(1160, 0)} s : il a tourné moins longtemps que le courant`);
    expect(retard(40).mesures.dt).toBe(1160);
    expect(retard(200).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["chrono!"]);
    // le chronomètre laissé en marche après l'ouverture de l'interrupteur
    const e = eleve(r);
    peseAvant(e);
    e.fais(...serie, interrupteur(true), chrono(true), tension(6));
    e.attends(1200);
    e.noteIntensite();
    e.fais(interrupteur(false));
    e.attends(90);
    e.fais(chrono(false));
    e.noteDuree();
    peseApres(e);
    expect(regles.bilan(r, e.etat()).fautes[0].texte).toContain("il a tourné plus longtemps que le courant");
  });
  it("l'intensité : retouchée en route, loin de celle du sujet, ou lue sur un ampèremètre à l'envers", () => {
    // il note 0,80 A, puis baisse la molette à mi-parcours
    const retouchee = eleve(r);
    peseAvant(retouchee);
    retouchee.fais(...serie, interrupteur(true), chrono(true), tension(6));
    retouchee.attends(5);
    retouchee.noteIntensite();
    retouchee.attends(595);
    retouchee.fais(tension(4.5));
    retouchee.attends(600);
    retouchee.fais(interrupteur(false), chrono(false));
    retouchee.noteDuree();
    peseApres(retouchee);
    const b = regles.bilan(r, retouchee.etat());
    expect(b.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["intensite!"]);
    expect(b.fautes[0].texte).toContain("Tu as noté 0,80 A, mais l'intensité a valu 0,70 A en moyenne pendant l'électrolyse");
    // il règle 0,60 A au lieu de 0,80 A, et le note bien
    const faible = eleve(r);
    peseAvant(faible);
    faible.fais(...serie, interrupteur(true), chrono(true), tension(4.5));
    faible.attends(1200);
    faible.noteIntensite();
    faible.fais(interrupteur(false), chrono(false));
    faible.noteDuree();
    peseApres(faible);
    expect(fautes(faible.gestes)).toEqual(["reglage"]);
    // l'ampèremètre à l'envers : il note la valeur sans son signe
    const envers = eleve(r);
    peseAvant(envers);
    envers.fais(relier("g+", "k1"), relier("k2", "com"), relier("a", "p2"), relier("p1", "g-"));
    electrolyseDe(envers, r);
    envers.fais(retirer("p1", "g-"), plaque("p1", "support"), { g: "rincer", p: "p1" }, { g: "secher", p: "p1" }, plaque("p1", "balance"));
    envers.noteMasse();
    expect(fautes(envers.gestes)).toEqual(["amperemetre"]);
  });
  it("aucun courant dans la cuve : circuit ouvert, générateur à zéro, court-circuit, dérivation", () => {
    const sansCourant = (montageFait: GesteBrut[], volts = 6) => {
      const e = eleve(r);
      peseAvant(e);
      e.fais(...montageFait, interrupteur(true), chrono(true), tension(volts));
      e.attends(1200);
      e.noteIntensite();
      e.fais(chrono(false));
      e.noteDuree();
      return regles.bilan(r, e.etat());
    };
    const ouvert = sansCourant(serie.slice(0, 3));
    expect(ouvert.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["electrolyse!", "pesee!", "releves!"]);
    expect(ouvert.fautes[0].texte).toContain("le circuit est resté ouvert");
    expect(sansCourant(serie, 0).fautes[0].texte).toContain("le générateur est resté à 0 V");
    expect(sansCourant([relier("g+", "k1"), relier("k2", "a"), relier("com", "g-")]).fautes[0].texte).toContain("les deux bornes du générateur étaient reliées sans passer par elle");
    expect(sansCourant([relier("g+", "k1"), relier("k2", "p2"), relier("p1", "g-"), relier("a", "p2"), relier("com", "p1")]).fautes[0].texte).toContain("le montage n'était pas un circuit en série");
  });
  it("les lectures : une balance mal lue ou pas à zéro, un chronomètre mal lu, deux plaques différentes, une durée loin de celle du sujet", () => {
    const avec = (rang: number, erreur: number) => {
      const gestes = soignee(r);
      const notes = gestes.flatMap((g, i) => (g.g === "noter" ? [i] : []));
      return gestes.map((g, i) => (i === notes[rang] ? { ...g, v: (g.v as number) + erreur } : g));
    };
    expect(fautes(avec(0, 0.001))).toEqual([]);
    expect(fautes(avec(0, 0.004))).toEqual(["balance"]);
    expect(fautes(avec(3, 0.1))).toEqual(["balance!"]);
    expect(fautes(avec(2, 1))).toEqual([]);
    expect(fautes(avec(2, 5))).toEqual(["chronometre"]);
    expect(fautes(avec(2, 300))).toEqual(["chronometre!"]);
    // la tare faite avec la plaque sur le plateau : la balance n'affiche plus sa masse
    const tare = eleve(r);
    tare.fais(plaque("p1", "balance"), { g: "tare" });
    tare.noteMasse();
    expect(regles.bilan(r, tare.etat()).fautes.find((f) => f.code === "tare")?.texte).toContain("elle affichait 0,000 g pour une plaque de 24,317 g");
    // la tare faite avec la plaque 2, plus lourde : la plaque 1 affiche une masse négative, qui ne se note pas
    const negative = eleve(r);
    negative.fais(plaque("p2", "balance"), { g: "tare" }, plaque("p2", "support"), plaque("p1", "balance"));
    expect(balance(r, negative.etat())).toBe(-0.809);
    negative.noteMasse();
    expect(negative.etat().notes.avant).toBeUndefined();
    // la plaque 1 pesée avant, la plaque 2 après
    const deux = eleve(r);
    peseAvant(deux);
    deux.fais(...serie);
    electrolyseDe(deux, r);
    deux.fais(retirer("com", "p2"), plaque("p2", "support"), { g: "rincer", p: "p2" }, { g: "secher", p: "p2" }, plaque("p2", "balance"));
    deux.noteMasse();
    expect(regles.bilan(r, deux.etat()).fautes.map((f) => f.code)).toContain("plaque");
    // dix minutes au lieu de vingt
    const court = eleve(r);
    peseAvant(court);
    court.fais(...serie);
    electrolyseDe(court, r, 600);
    peseApres(court);
    expect(fautes(court.gestes)).toEqual(["temps"]);
    expect(regles.bilan(r, court.etat()).mesures).toEqual({ m1: 24.317, m2: 24.475, I: 0.8, dt: 600 });
  });
  it("des relevés qui rendent le calcul impossible : une intensité nulle, une durée trop courte", () => {
    const gestes = soignee(r);
    const notes = gestes.flatMap((g, i) => (g.g === "noter" ? [i] : []));
    const nulle = regles.bilan(r, joue(gestes.map((g, i) => (i === notes[1] ? { ...g, v: 0 } : g))));
    expect(nulle.fautes.map((f) => f.code)).toEqual(["intensite", "releves"]);
    expect(nulle.lignes).toHaveLength(1);
    const breve = regles.bilan(r, joue(gestes.map((g, i) => (i === notes[2] ? { ...g, v: 2 } : g))));
    expect(breve.fautes.map((f) => f.code)).toEqual(["chronometre", "releves"]);
  });
});

describe("le TP du dépôt de cuivre", () => {
  // le TP est en construction : il n'est pas inscrit dans l'application, le test donne ses règles
  const sesRegles = { electrolyse: regles } as ReglesDuTest;
  const manipulation = (etape: EtapeDePaillasse): GesteBrut[] => soignee(etape.paillasse.reglages as ReglagesElectrolyse);
  it("une situation à lire, une manipulation, les quatre compétences, rien de la réponse dans le navigateur, D partout sans rien faire", async () => {
    await controlesCommuns(electrolyse, sesRegles);
    expect(electrolyse.etapes(1)).toHaveLength(11);
    expect(electrolyse.fiche).toBe(12);
  });
  it("fait avec soin, le TP donne A partout, et la relation est vérifiée, quelle que soit la situation tirée", async () => {
    const intensites = new Set<number>(), durees = new Set<number>(), depots = new Set<number>();
    for (const graine of GRAINES) {
      const partie = await joueJuste(electrolyse, graine, manipulation, sesRegles);
      expect(partie.scores.every((s) => s === 1), `graine ${graine} : ${partie.scores.join(" ")}`).toBe(true);
      expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "A", VAL: "A" });
      expect(partie.fautes).toEqual([[]]);
      const reglages = (partie.etapes.find((e) => e.genre === "paillasse") as EtapeDePaillasse).paillasse.reglages as ReglagesElectrolyse;
      intensites.add(reglages.intensite);
      durees.add(reglages.duree);
      depots.add(Math.round((partie.mesures.m2 - partie.mesures.m1) * 1000));
      // l'écart entre la masse déposée et la masse prévue reste sous 2 %, et la conclusion est « Oui »
      const ecart = partie.retours.flatMap((x) => (x.correction.genre === "valeur" ? [x.correction] : []))[3];
      expect(Number(ecart.attendu.replace(",", ".").replace(" %", "")), `graine ${graine}`).toBeLessThan(2);
      const conclusion = partie.retours.flatMap((x) => (x.correction.genre === "choix" ? [x.correction] : [])).pop();
      expect(conclusion?.bonne).toBe(0);
    }
    // la graine change bien la situation : l'intensité, la durée, et donc la masse déposée
    expect(intensites.size).toBe(4);
    expect(durees.size).toBe(3);
    expect(depots.size).toBeGreaterThanOrEqual(5);
  });
  it("l'exploitation se juge sur les mesures de l'élève : une plaque pesée mouillée fait conclure « Non »", async () => {
    const baclee = (etape: EtapeDePaillasse): GesteBrut[] => {
      const reglages = etape.paillasse.reglages as ReglagesElectrolyse;
      const e = eleve(reglages);
      peseAvant(e);
      e.fais(...serie);
      electrolyseDe(e, reglages);
      peseApres(e, false, false);
      return e.gestes;
    };
    const partie = await joueJuste(electrolyse, 4, baclee, sesRegles);
    expect(partie.fautes).toEqual([["mouille"]]);
    expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "C", VAL: "A" });
    const conclusion = partie.retours.flatMap((x) => (x.correction.genre === "choix" ? [x.correction] : [])).pop();
    expect(conclusion?.bonne).toBe(1);
  });
});
