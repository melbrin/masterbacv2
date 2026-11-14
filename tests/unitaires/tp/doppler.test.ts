// La paillasse « doppler » (lib/commun/tp/paillasses/doppler.ts) et son TP : un chariot à contrôler.
// Les manipulations sont jouées ici sans le navigateur, geste par geste. Les gestes qui dépendent du temps portent leur instant.
import { describe, expect, it } from "vitest";
import { frequenceRecue } from "@/lib/commun/simulations/doppler";
import {
  MEMOIRE, RAIL, SPECTRE, chronometre, dernierPassage, dureeDuTrajet, enregistreEnEntier, frequenceDuRang, instantDuPassage, mobile, mobileA, passagesEnregistres, pics, reference, regles, roule, spectre, vitesseAu,
  type EtatDoppler, type ReglagesDoppler,
} from "@/lib/commun/tp/paillasses/doppler";
import { rejoue, type GesteBrut } from "@/lib/commun/tp/types";
import doppler from "@/lib/serveur/contenu/tp/doppler";
import { GRAINES, controlesCommuns, joue as joueTp, joueJuste, juste, type EtapeDePaillasse } from "../../outils/tp";

// un émetteur à 4 000 Hz, un mobile qui roule à 2,8 m/s au cran 3 : 4 033,21 Hz à l'approche, 3 967,33 Hz à l'éloignement
const banc: ReglagesDoppler = { fE: 4000, c: 340, cran: 3, v: 2.8 };
const joue = (r: ReglagesDoppler, gestes: GesteBrut[]): EtatDoppler => rejoue(regles, r, gestes);
const fautes = (r: ReglagesDoppler, gestes: GesteBrut[]) => regles.bilan(r, joue(r, gestes)).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);
const centieme = (x: number) => Math.round(x * 100) / 100;

// ---------- les gestes d'un élève soigneux ----------
/** Le cran demandé, les fourches à 100 et 300 cm. */
const preparer = (r: ReglagesDoppler, cran = r.cran, fourches: [number, number] = [100, 300]): GesteBrut[] => [{ g: "cran", v: cran }, { g: "fourche", n: 1, x: fourches[0] }, { g: "fourche", n: 2, x: fourches[1] }];
/** Un passage enregistré : l'enregistrement part `avant` secondes avant le mobile et s'arrête `apres` secondes après son arrivée. */
function passer(r: ReglagesDoppler, cran = r.cran, avant = 1, apres = 1, t0 = 10): GesteBrut[] {
  return [{ g: "enregistrer", t: centieme(t0 - avant) }, { g: "lancer", t: t0 }, { g: "arreter", t: centieme(t0 + dureeDuTrajet(vitesseAu(r, cran)) + apres) }];
}
/** Ce que l'élève lit après ces gestes : les deux positions, la durée du chronomètre, le sommet des deux pics. `fausse` décale chaque lecture. */
function lire(r: ReglagesDoppler, avant: GesteBrut[], fausse: Partial<Record<"x1" | "x2" | "duree" | "approche" | "eloignement", number>> = {}): GesteBrut[] {
  const etat = joue(r, avant);
  const passage = dernierPassage(etat);
  const [a, b] = [...(passage ? passage.fourches : etat.fourches)].sort((u, v) => u - v);
  const sommets = pics(r, spectre(r, etat));
  const notes: [string, number | null][] = [["x1", a], ["x2", b], ["duree", passage ? chronometre(passage.v, passage.fourches) : null], ["approche", sommets.approche], ["eloignement", sommets.eloignement]];
  return notes.flatMap(([quoi, v]) => (v === null ? [] : [{ g: "noter", quoi, v: v + (fausse[quoi as "x1"] ?? 0) }]));
}
/** La manipulation soignée d'une situation. */
function soignee(r: ReglagesDoppler): GesteBrut[] {
  const gestes = [...preparer(r), ...passer(r)];
  return [...gestes, ...lire(r, gestes)];
}

describe("le mobile", () => {
  it("prend son élan, roule à vitesse constante, puis s'arrête au bout du rail", () => {
    expect(mobile(2, -1)).toEqual({ x: 0, u: 0 });
    expect(mobile(2, 0)).toEqual({ x: 0, u: 0 });
    // l'élan : 0,40 m parcourus en 0,40 s, à accélération constante
    expect(mobile(2, 0.2).x).toBeCloseTo(0.1, 9);
    expect(mobile(2, 0.2).u).toBeCloseTo(1, 9);
    expect(mobile(2, 0.4).x).toBeCloseTo(0.4, 9);
    expect(mobile(2, 1.4)).toEqual({ x: 2.4, u: 2 });
    expect(dureeDuTrajet(2)).toBeCloseTo(2.2, 9);
    expect(mobile(2, 2.3)).toEqual({ x: RAIL.longueur, u: 0 });
  });
  it("passe devant chaque graduation à l'instant que donne son mouvement", () => {
    for (const x of [0.1, 0.4, 1, 2, 3.5]) expect(mobile(2.8, instantDuPassage(2.8, x)).x).toBeCloseTo(x, 9);
  });
  it("va un quart plus vite ou moins vite à chaque cran", () => {
    expect([1, 2, 3, 4, 5].map((cran) => vitesseAu(banc, cran))).toEqual([1.4, 2.1, 2.8, 3.5, 4.2].map((v) => expect.closeTo(v, 9)));
  });
  it("le chronomètre donne la durée entre les deux fourches, dans un sens comme dans l'autre", () => {
    expect(chronometre(2.8, [100, 300])).toBe(0.714);
    expect(chronometre(2.8, [300, 100])).toBe(0.714);
    // une fourche dans l'élan : le mobile met plus longtemps, sa vitesse moyenne est plus faible
    expect(chronometre(2.8, [10, 210])).toBeGreaterThan(0.714 + 0.03);
    expect(chronometre(2.8, [150, 150])).toBe(0);
  });
});

describe("le spectre", () => {
  const enregistre = joue(banc, [...preparer(banc), ...passer(banc)]);
  it("sans enregistrement, pas de spectre", () => {
    expect(spectre(banc, joue(banc, preparer(banc)))).toEqual([]);
    expect(pics(banc, [])).toEqual({ approche: null, eloignement: null });
  });
  it("un passage enregistré en entier donne deux pics, de part et d'autre de la fréquence émise, là où la relation de l'effet Doppler les attend", () => {
    const s = spectre(banc, enregistre);
    expect(s.length).toBe(Math.round((2 * SPECTRE.demi) / SPECTRE.pas) + 1);
    expect([frequenceDuRang(banc, 0), frequenceDuRang(banc, s.length - 1)]).toEqual([3800, 4200]);
    const { approche, eloignement } = pics(banc, s);
    expect(Math.abs(approche! - frequenceRecue({ fE: 4000, c: 340, v: 2.8 }))).toBeLessThan(0.75);
    expect(Math.abs(eloignement! - frequenceRecue({ fE: 4000, c: 340, v: -2.8 }))).toBeLessThan(0.75);
    // la vitesse tirée des deux sommets est celle du mobile, à 2 % près
    expect(Math.abs((340 * (approche! - eloignement!)) / (approche! + eloignement!) / 2.8 - 1)).toBeLessThan(0.02);
    expect(enregistreEnEntier(enregistre)).toBe(true);
    expect(reference(banc)).toEqual({ fa: approche, fe: eloignement, x1: 100, x2: 300, dt: 0.714 });
  });
  it("le mobile à l'arrêt, avant et après le passage, donne un pic à la fréquence émise ; entre les pics, le spectre reste bas", () => {
    const s = spectre(banc, enregistre);
    const en = (f: number) => s[Math.round((f - 3800) / SPECTRE.pas)];
    expect(en(4000)).toBeGreaterThan(5 * en(4015));
    expect(en(4033)).toBeGreaterThan(5 * en(4015));
    expect(en(4100)).toBe(0);
    // sans passage, il n'y a que ce pic
    const repos = joue(banc, [{ g: "enregistrer", t: 1 }, { g: "arreter", t: 3 }]);
    expect(pics(banc, spectre(banc, repos))).toEqual({ approche: null, eloignement: null });
    expect(spectre(banc, repos)[Math.round(200 / SPECTRE.pas)]).toBeGreaterThan(0.09);
    expect([passagesEnregistres(repos), enregistreEnEntier(repos)]).toEqual([[], false]);
  });
  it("un enregistrement lancé trop tard perd l'approche ; arrêté trop tôt, l'éloignement", () => {
    const milieu = 10 + instantDuPassage(2.8, RAIL.micro);
    const tard = joue(banc, [...preparer(banc), { g: "lancer", t: 10 }, { g: "enregistrer", t: centieme(milieu + 0.05) }, { g: "arreter", t: 14 }]);
    expect(pics(banc, spectre(banc, tard)).approche).toBeNull();
    expect(pics(banc, spectre(banc, tard)).eloignement).not.toBeNull();
    const tot = joue(banc, [...preparer(banc), { g: "enregistrer", t: 9 }, { g: "lancer", t: 10 }, { g: "arreter", t: centieme(milieu - 0.05) }]);
    expect(pics(banc, spectre(banc, tot)).eloignement).toBeNull();
    expect(pics(banc, spectre(banc, tot)).approche).not.toBeNull();
    expect(enregistreEnEntier(tot)).toBe(false);
  });
  it("plus le mobile va vite, plus les deux pics s'écartent", () => {
    const ecart = (cran: number) => { const p = pics(banc, spectre(banc, joue(banc, [...preparer(banc, cran), ...passer(banc, cran)]))); return p.approche! - p.eloignement!; };
    expect(ecart(1)).toBeLessThan(ecart(3));
    expect(ecart(3)).toBeLessThan(ecart(5));
    expect(ecart(3)).toBeCloseTo(65, 0);
  });
});

describe("les gestes", () => {
  it("le mobile ne part que du début du rail, et ne se ramène qu'une fois arrivé", () => {
    const parti = joue(banc, [...preparer(banc), { g: "lancer", t: 10 }]);
    expect([parti.auDepart, parti.passages.length, parti.passages[0]]).toEqual([false, 1, { t: 10, cran: 3, v: expect.closeTo(2.8, 9), fourches: [100, 300] }]);
    expect(roule(parti, 10.5)).toBe(true);
    expect(roule(parti, 12)).toBe(false);
    // pas de second lancement tant que le mobile n'est pas revenu ; pas de retour tant qu'il roule
    expect(regles.geste(banc, parti, { g: "lancer", t: 11 })).toBe(parti);
    expect(regles.geste(banc, parti, { g: "ramener", t: 10.5 })).toBe(parti);
    const revenu = regles.geste(banc, parti, { g: "ramener", t: 12 });
    expect(revenu.auDepart).toBe(true);
    expect(regles.geste(banc, revenu, { g: "ramener", t: 13 })).toBe(revenu);
    expect(joue(banc, [{ g: "lancer", t: 10 }, { g: "ramener", t: 14 }, { g: "lancer", t: 15 }]).passages.length).toBe(2);
  });
  it("le mobile est là où son dernier lancement le mène", () => {
    const etat = joue(banc, [...preparer(banc), { g: "lancer", t: 10 }]);
    expect(mobileA(etat, 9)).toEqual({ x: 0, u: 0 });
    expect(mobileA(etat, 10 + instantDuPassage(2.8, 2)).x).toBeCloseTo(2, 9);
    expect(mobileA(etat, 20)).toEqual({ x: RAIL.longueur, u: 0 });
    expect(mobileA(regles.geste(banc, etat, { g: "ramener", t: 20 }), 21)).toEqual({ x: 0, u: 0 });
    expect(mobileA(joue(banc, []), 5)).toEqual({ x: 0, u: 0 });
  });
  it("l'enregistreur se lance, puis s'arrête ; il garde trente secondes au plus", () => {
    const etat = joue(banc, [{ g: "arreter", t: 1 }, { g: "enregistrer", t: 2 }, { g: "enregistrer", t: 3 }, { g: "arreter", t: 5.004 }]);
    expect([etat.debut, etat.bande]).toEqual([null, { debut: 2, fin: 5 }]);
    expect(joue(banc, [{ g: "enregistrer", t: 2 }, { g: "arreter", t: 60 }]).bande).toEqual({ debut: 2, fin: 2 + MEMOIRE });
    expect(joue(banc, [{ g: "enregistrer", t: 2 }, { g: "arreter", t: 2 }]).bande).toBeNull();
  });
  it("un geste daté d'avant le dernier instant connu est refusé", () => {
    const etat = joue(banc, [{ g: "enregistrer", t: 8 }, { g: "lancer", t: 10 }]);
    for (const g of [{ g: "arreter", t: 9 }, { g: "ramener", t: 9.5 }, { g: "arreter" }, { g: "arreter", t: "tard" }, { g: "arreter", t: 2e6 }] as GesteBrut[]) expect(regles.geste(banc, etat, g)).toBe(etat);
  });
  it("une fourche reste sur sa course, au demi-centimètre ; deux déplacements à la suite valent le dernier : la liste des gestes peut les regrouper", () => {
    expect(joue(banc, [{ g: "fourche", n: 1, x: 123.3 }, { g: "fourche", n: 2, x: 250.26 }]).fourches).toEqual([123.5, 250.5]);
    expect(joue(banc, [{ g: "fourche", n: 1, x: 5 }, { g: "fourche", n: 2, x: 395 }, { g: "fourche", n: 3, x: 100 }, { g: "fourche", x: 100 }]).fourches).toEqual([20, 70]);
    expect(joue(banc, [{ g: "fourche", n: 1, x: 80 }, { g: "fourche", n: 1, x: 100 }, { g: "cran", v: 5 }, { g: "cran", v: 3 }])).toEqual(joue(banc, [{ g: "fourche", n: 1, x: 100 }, { g: "cran", v: 3 }]));
  });
  it("un geste inconnu, mal formé ou hors bornes ne change rien", () => {
    const bizarres: GesteBrut[] = [
      { g: "klaxonner" }, { g: "cran", v: 0 }, { g: "cran", v: 6 }, { g: "cran", v: 2.5 }, { g: "cran" }, { g: "lancer" }, { g: "enregistrer", t: -3 },
      { g: "noter", quoi: "approche", v: 4030 }, { g: "noter", quoi: "x1", v: 500 }, { g: "noter", quoi: "x2", v: -1 }, { g: "noter", quoi: "duree", v: 0 }, { g: "noter", quoi: "duree", v: 500 }, { g: "noter", quoi: "vitesse", v: 3 }, { g: "noter", quoi: "x1" },
    ];
    expect(joue(banc, bizarres)).toEqual(joue(banc, []));
    const etat = joue(banc, soignee(banc));
    for (const g of [...bizarres.slice(0, 7), { g: "noter", quoi: "approche", v: 0 }, { g: "noter", quoi: "eloignement", v: 30000 }, ...bizarres.slice(8)] as GesteBrut[]) expect(regles.geste(banc, etat, g)).toBe(etat);
  });
});

describe("le bilan", () => {
  it("une manipulation soignée n'a aucune faute", () => {
    const b = regles.bilan(banc, joue(banc, soignee(banc)));
    expect(b.fautes).toEqual([]);
    expect(b.score).toBe(1);
    expect(b.mesures).toEqual({ fa: 4032.75, fe: 3967.75, x1: 100, x2: 300, dt: 0.714 });
    expect(b.lignes[0]).toMatch(/4\s032,75 Hz à l'approche/);
  });
  it("sans rien faire, la manipulation vaut zéro, et le professeur donne ses valeurs", () => {
    const b = regles.bilan(banc, joue(banc, []));
    expect(b.score).toBe(0);
    expect(b.fautes.map((f) => f.code)).toEqual(["passage"]);
    expect(b.mesures).toEqual({ fa: 4032.75, fe: 3967.75, x1: 100, x2: 300, dt: 0.714 });
  });
  it("un mauvais cran : la vitesse mesurée n'est pas celle qu'on cherche", () => {
    const gestes = [...preparer(banc, 2), ...passer(banc, 2)];
    expect(fautes(banc, [...gestes, ...lire(banc, gestes)])).toEqual(["reglage!"]);
    // le cran changé après le passage ne compte pas : c'est le cran du passage mesuré qui compte
    const apres = [...preparer(banc), ...passer(banc), { g: "cran", v: 5 } as GesteBrut];
    expect(fautes(banc, [...apres, ...lire(banc, apres)])).toEqual([]);
  });
  it("un enregistrement oublié, sans passage, lancé trop tard, arrêté trop tôt, ou trop court", () => {
    const milieu = 10 + instantDuPassage(2.8, RAIL.micro);
    const avec = (enregistrement: GesteBrut[]) => { const gestes = [...preparer(banc), ...enregistrement]; return fautes(banc, [...gestes, ...lire(banc, gestes)]); };
    expect(avec([{ g: "lancer", t: 10 }])).toEqual(["enregistrement!"]);
    expect(avec([{ g: "enregistrer", t: 2 }, { g: "arreter", t: 5 }, { g: "lancer", t: 10 }])).toEqual(["enregistrement!"]);
    expect(avec([{ g: "lancer", t: 10 }, { g: "enregistrer", t: centieme(milieu + 0.05) }, { g: "arreter", t: 14 }])).toEqual(["enregistrement!"]);
    expect(avec([{ g: "enregistrer", t: 9 }, { g: "lancer", t: 10 }, { g: "arreter", t: centieme(milieu - 0.05) }])).toEqual(["enregistrement!"]);
    // les deux pics sont là, mais l'un est à peine formé
    expect(avec([{ g: "enregistrer", t: 9 }, { g: "lancer", t: 10 }, { g: "arreter", t: centieme(milieu + 0.2) }])).toEqual(["enregistrement"]);
    // une fréquence notée de force alors que le pic manque : la faute le dit avec le chiffre noté
    const sansEloignement: GesteBrut[] = [...preparer(banc), { g: "enregistrer", t: 9 }, { g: "lancer", t: 10 }, { g: "arreter", t: centieme(milieu - 0.05) }];
    const b = regles.bilan(banc, joue(banc, [...sansEloignement, ...lire(banc, sansEloignement), { g: "noter", quoi: "eloignement", v: 3990 }]));
    expect(b.fautes.map((f) => f.code)).toEqual(["enregistrement"]);
    expect(b.fautes[0].texte).toMatch(/3\s990,00 Hz pour l'éloignement/);
  });
  it("une fréquence mal lue sur le spectre, ou pas notée", () => {
    const gestes = [...preparer(banc), ...passer(banc)];
    expect(fautes(banc, [...gestes, ...lire(banc, gestes, { approche: 0.75 })])).toEqual([]);
    expect(fautes(banc, [...gestes, ...lire(banc, gestes, { approche: 2 })])).toEqual(["spectre"]);
    expect(fautes(banc, [...gestes, ...lire(banc, gestes, { eloignement: 32 })])).toEqual(["spectre!"]);
    expect(fautes(banc, [...gestes, ...lire(banc, gestes).slice(0, 4)])).toEqual(["spectre!"]);
  });
  it("des fourches mal placées : dans l'élan du mobile, ou trop serrées", () => {
    const avec = (fourches: [number, number]) => { const gestes = [...preparer(banc, 3, fourches), ...passer(banc)]; return fautes(banc, [...gestes, ...lire(banc, gestes)]); };
    expect(avec([20, 220])).toEqual(["fourches"]);
    expect(avec([150, 200])).toEqual(["fourches"]);
    expect(avec([300, 60])).toEqual([]);
    // sans y toucher, les fourches sont là où on les trouve en arrivant : trop près du départ
    const gestes = [{ g: "cran", v: 3 } as GesteBrut, ...passer(banc)];
    expect(fautes(banc, [...gestes, ...lire(banc, gestes)])).toEqual(["fourches"]);
  });
  it("la règle et le chronomètre mal lus, ou pas notés", () => {
    const gestes = [...preparer(banc), ...passer(banc)];
    expect(fautes(banc, [...gestes, ...lire(banc, gestes, { x2: 0.5 })])).toEqual([]);
    expect(fautes(banc, [...gestes, ...lire(banc, gestes, { x2: 1.5 })])).toEqual(["regle"]);
    expect(fautes(banc, [...gestes, ...lire(banc, gestes, { x1: 10 })])).toEqual(["regle!"]);
    expect(fautes(banc, [...gestes, ...lire(banc, gestes, { duree: 0.01 })])).toEqual(["chrono"]);
    expect(fautes(banc, [...gestes, ...lire(banc, gestes, { duree: 0.3 })])).toEqual(["chrono!"]);
    expect(fautes(banc, [...gestes, ...lire(banc, gestes).filter((g) => g.quoi !== "x1")])).toEqual(["regle!"]);
    expect(fautes(banc, [...gestes, ...lire(banc, gestes).filter((g) => g.quoi !== "duree")])).toEqual(["chrono!"]);
    // les positions peuvent se noter dans un ordre ou dans l'autre
    const croisees = lire(banc, gestes).map((g) => (g.quoi === "x1" ? { ...g, v: 300 } : g.quoi === "x2" ? { ...g, v: 100 } : g));
    expect(regles.bilan(banc, joue(banc, [...gestes, ...croisees])).mesures).toMatchObject({ x1: 100, x2: 300 });
    // les positions se notent souvent avant le passage, une fourche après l'autre : elles se jugent sur la place des fourches au passage
    const avant: GesteBrut[] = [{ g: "cran", v: 3 }, { g: "fourche", n: 1, x: 100 }, { g: "noter", quoi: "x1", v: 100 }, { g: "fourche", n: 2, x: 300 }, { g: "noter", quoi: "x2", v: 300 }, ...passer(banc)];
    expect(fautes(banc, [...avant, ...lire(banc, avant).filter((g) => g.quoi !== "x1" && g.quoi !== "x2")])).toEqual([]);
    // sans passage, elles se jugent sur la place des fourches sur le rail
    expect(fautes(banc, [...preparer(banc), { g: "noter", quoi: "x1", v: 100 }, { g: "noter", quoi: "x2", v: 290 }])).toContain("regle!");
    // une durée notée avant tout passage : le chronomètre n'avait rien mesuré
    expect(fautes(banc, [...preparer(banc), { g: "noter", quoi: "duree", v: 0.7 }])).toContain("chrono!");
    // des fourches déplacées après le passage : la règle ne dit plus la distance chronométrée
    const deplacees: GesteBrut[] = [...gestes, { g: "fourche", n: 2, x: 350 }];
    expect(fautes(banc, [...deplacees, ...lire(banc, gestes).map((g) => (g.quoi === "x2" ? { ...g, v: 350 } : g))])).toEqual(["regle!"]);
  });
  it("les mesures gardées sont celles de l'élève, même fausses : la suite du TP se calcule avec elles", () => {
    const gestes = [...preparer(banc, 5), ...passer(banc, 5)];
    const b = regles.bilan(banc, joue(banc, [...gestes, ...lire(banc, gestes)]));
    expect(b.fautes.map((f) => f.code)).toEqual(["reglage"]);
    expect((340 * (b.mesures.fa - b.mesures.fe)) / (b.mesures.fa + b.mesures.fe)).toBeCloseTo(4.2, 0);
    expect(b.mesures.dt).toBe(chronometre(4.2, [100, 300]));
  });
});

describe("le TP du chariot à contrôler", () => {
  // le TP est en construction : il n'est pas inscrit dans l'application, le test donne donc ses règles
  const REGLES = { doppler: regles };
  const manipulation = (etape: EtapeDePaillasse): GesteBrut[] => soignee(etape.paillasse.reglages as ReglagesDoppler);
  it("a la forme d'un TP : une situation à lire, les quatre compétences, rien de la réponse dans le navigateur, D partout sans rien faire", async () => {
    await controlesCommuns(doppler, REGLES);
  });
  it("fait avec soin, le TP donne A partout, quelle que soit la situation tirée", async () => {
    const situations = new Set<string>();
    const conclusions = new Set<number>();
    for (const graine of GRAINES) {
      const partie = await joueJuste(doppler, graine, manipulation, REGLES);
      expect(partie.scores.every((s) => s === 1), `graine ${graine} : ${partie.scores.join(" ")}`).toBe(true);
      expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "A", VAL: "A" });
      expect(partie.fautes).toEqual([[]]);
      situations.add(`${partie.mesures.fa} ${partie.mesures.dt}`);
      // une manipulation soignée met les deux méthodes d'accord
      const accord = partie.retours[partie.retours.length - 2].correction;
      expect(accord.genre === "choix" && accord.bonne).toBe(0);
      const derniere = partie.retours[partie.retours.length - 1].correction;
      if (derniere.genre === "choix") conclusions.add(derniere.bonne);
    }
    // la graine change la situation ; selon la vitesse du mobile, la limite est respectée ou non
    expect(situations.size).toBeGreaterThanOrEqual(6);
    expect(conclusions).toEqual(new Set([0, 1]));
  });
  it("une fourche dans l'élan du mobile se voit dans l'exploitation : les deux méthodes ne s'accordent plus", async () => {
    const pressee = (etape: EtapeDePaillasse): GesteBrut[] => {
      const r = etape.paillasse.reglages as ReglagesDoppler;
      const gestes = [...preparer(r, r.cran, [10, 120]), ...passer(r)];
      return [...gestes, ...lire(r, gestes)];
    };
    const partie = await joueTp(doppler, 1, (etape, publique, mesures) => juste(etape, publique, mesures, pressee), REGLES);
    expect(partie.fautes).toEqual([["fourches"]]);
    expect(partie.bilan).toMatchObject({ REA: "B", VAL: "A" });
    const accord = partie.retours[partie.retours.length - 2].correction;
    expect(accord.genre === "choix" && accord.bonne).toBe(1);
  });
});
