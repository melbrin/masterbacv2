// La paillasse Spectro (lib/commun/tp/paillasses/spectro.ts) et ses deux TP : un dosage par étalonnage et un suivi
// cinétique. Les manipulations sont jouées ici sans le navigateur, geste par geste. Les deux TP sont en construction :
// ils ne sont pas inscrits dans l'application, le test importe donc leurs fichiers et donne les règles.
import { describe, expect, it } from "vitest";
import { LAMBDA, RELEVES_MAX, RESTE, absorbanceBrute, absorbanceJuste, affichage, concentrationDe, dansCuve, dateChrono, fond, forme, nomSolution, regles, type EtatSpectro, type ReglagesSpectro } from "@/lib/commun/tp/paillasses/spectro";
import type { GesteBrut } from "@/lib/commun/tp/types";
import cinetique from "@/lib/serveur/contenu/tp/cinetique";
import etalonnage from "@/lib/serveur/contenu/tp/etalonnage";
import { GRAINES, controlesCommuns, joueJuste, type EtapeDePaillasse, type ReglesDuTest } from "../../outils/tp";

const DOSAGE: ReglagesSpectro = {
  mode: "etalonnage", lambdaMax: 505, largeur: 45, k: 0.052, unite: "mg/L", decimales: 1, couleur: [232, 64, 74], espece: "le colorant",
  gamme: [4, 8, 12, 16, 20], Cx: 13.4, dilution: 2, nom: "la boisson", etiquette: "boisson", Cfin: 0, demi: 1, cadence: 1,
};
/** La même paillasse avec une boisson trop concentrée pour la gamme. */
const FORTE: ReglagesSpectro = { ...DOSAGE, Cx: 27.2 };
const SUIVI: ReglagesSpectro = {
  mode: "cinetique", lambdaMax: 460, largeur: 50, k: 1, unite: "mmol/L", decimales: 2, couleur: [234, 158, 52], espece: "le diiode",
  gamme: [], Cx: 0, dilution: 1, nom: "le mélange", etiquette: "mélange", Cfin: 0.9, demi: 100, cadence: 20,
};
const REGLES = { spectro: regles } as ReglesDuTest;

/** Une paillasse jouée geste par geste : on y lit l'afficheur comme l'élève le lit. */
function paillasse(r: ReglagesSpectro) {
  const p = {
    etat: regles.depart(r), gestes: [] as GesteBrut[],
    fait(...liste: GesteBrut[]) { for (const g of liste) { p.etat = regles.geste(r, p.etat, g); p.gestes.push(g); } return p; },
    affiche: () => affichage(r, p.etat),
    fautes: () => regles.bilan(r, p.etat).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`),
  };
  return p;
}
type Paillasse = ReturnType<typeof paillasse>;

// ---------- les gestes d'un élève soigneux ----------
const placer: GesteBrut[] = [{ g: "capot", ferme: false }, { g: "placer", dans: true }, { g: "capot", ferme: true }];
const sortir: GesteBrut[] = [{ g: "capot", ferme: false }, { g: "placer", dans: false }];
/** Rincer la cuve avec une solution, puis la remplir. */
const rince = (s: string): GesteBrut[] => [{ g: "remplir", s }, { g: "vider" }, { g: "remplir", s }];
/** Le blanc : une cuve d'eau distillée, rincée, dans l'appareil fermé. */
const blanc: GesteBrut[] = [...rince("eau"), ...placer, { g: "blanc" }, ...sortir, { g: "vider" }];
/** Chercher le maximum d'absorption avec la solution la plus concentrée de la gamme. */
const reglage = (r: ReglagesSpectro): GesteBrut[] => [{ g: "tourner" }, { g: "remplir", s: `s${r.gamme.length}` }, ...placer, { g: "lambda", v: r.lambdaMax }, ...sortir, { g: "vider" }];
/** Mesure une solution et note ce que l'appareil affiche, plus une erreur de lecture éventuelle. */
function mesure(p: Paillasse, s: string, o: { rincer?: boolean; erreur?: number; ouvert?: boolean } = {}): Paillasse {
  p.fait(...(o.rincer === false ? [{ g: "remplir", s }] : rince(s)), ...placer, ...(o.ouvert ? [{ g: "capot", ferme: false }] : []));
  return p.fait({ g: "noter", v: p.affiche() + (o.erreur ?? 0) }, ...sortir, { g: "vider" });
}
const etalons = (p: Paillasse) => p.etat.mesures.filter((m) => /^s\d$/.test(m.s));
/** La pente de la droite qui passe par l'origine et au plus près des points de l'élève. */
const pente = (r: ReglagesSpectro, p: Paillasse) => etalons(p).reduce((s, m) => s + r.gamme[Number(m.s[1]) - 1] * m.lu, 0) / etalons(p).reduce((s, m) => s + r.gamme[Number(m.s[1]) - 1] ** 2, 0);
/** Trace la droite, puis lit la concentration de l'échantillon au dixième. */
function exploite(r: ReglagesSpectro, p: Paillasse, o: { droite?: number; lecture?: number } = {}): Paillasse {
  const k = pente(r, p) * (o.droite ?? 1);
  const echantillon = [...p.etat.mesures].reverse().find((m) => m.s === "x" || m.s === "xd");
  p.fait({ g: "droite", v: k });
  return echantillon ? p.fait({ g: "lire", v: Math.round(((echantillon.lu / k) * (o.lecture ?? 1)) * 10) / 10 }) : p;
}
/** Le dosage soigné d'une situation : si la boisson sort de la gamme, on mesure la boisson diluée. */
function dosage(r: ReglagesSpectro): Paillasse {
  const p = paillasse(r).fait(...reglage(r), ...blanc);
  r.gamme.forEach((_, i) => mesure(p, `s${i + 1}`));
  mesure(p, "x");
  if (p.etat.mesures[p.etat.mesures.length - 1].lu > Math.max(...etalons(p).map((m) => m.lu))) mesure(p, "xd");
  return exploite(r, p);
}
/** Lit le temps de demi-réaction sur la courbe des relevés : la date où l'absorbance vaut la moitié de la dernière. */
function demiSurCourbe(p: Paillasse): number {
  const points = p.etat.mesures;
  const moitie = points[points.length - 1].lu / 2;
  const i = points.findIndex((m) => m.lu >= moitie);
  if (i <= 0) return points[0].date;
  const a = points[i - 1], b = points[i];
  return Math.round(a.date + ((moitie - a.lu) / (b.lu - a.lu)) * (b.date - a.date));
}
/** Le suivi soigné d'une situation. `o` y glisse un défaut : un chronomètre en retard, un arrêt trop tôt, des relevés espacés. */
function suivi(r: ReglagesSpectro, o: { retard?: number; jusqua?: number; pas?: number; blanc?: boolean; lecture?: number | null } = {}): Paillasse {
  const p = paillasse(r).fait({ g: "tourner" }, { g: "lambda", v: r.lambdaMax }, ...(o.blanc === false ? [] : blanc), { g: "melanger" });
  if (o.retard) p.fait({ g: "attendre", v: o.retard });
  p.fait({ g: "chrono" }, { g: "attendre", v: 3 }, { g: "remplir", s: "m" }, { g: "attendre", v: 4 }, ...placer, { g: "attendre", v: 3 });
  const depuis = () => p.etat.t - (p.etat.melange ?? 0);
  while (depuis() < (o.jusqua ?? 6.2) * r.demi) p.fait({ g: "relever" }, { g: "attendre", v: o.pas ?? (depuis() < 2 * r.demi ? 20 : 60) });
  p.fait({ g: "relever" });
  return o.lecture === null ? p : p.fait({ g: "lire", v: o.lecture ?? demiSurCourbe(p) });
}

describe("ce que l'appareil mesure", () => {
  it("la bande d'absorption a son maximum à la longueur d'onde du colorant", () => {
    expect(forme(DOSAGE, 505)).toBe(1);
    expect(forme(DOSAGE, 500)).toBeCloseTo(forme(DOSAGE, 510), 12);
    expect(forme(DOSAGE, 500)).toBeLessThan(1);
    expect(forme(DOSAGE, 620)).toBeLessThan(0.01);
    expect([fond(700), fond(400)]).toEqual([0.05, 0.1]);
  });
  it("sans défaut, l'absorbance affichée est proportionnelle à la concentration, à très peu près", () => {
    expect(absorbanceJuste(DOSAGE, 0)).toBe(0);
    for (const C of DOSAGE.gamme) expect(Math.abs(absorbanceJuste(DOSAGE, C) / (DOSAGE.k * C) - 1), `${C} mg/L`).toBeLessThan(0.012);
    // au-delà de la gamme, la lumière parasite empêche l'absorbance de suivre : la droite ne vaut plus
    expect(absorbanceJuste(DOSAGE, 60)).toBeLessThan(DOSAGE.k * 60 * 0.96);
  });
  it("les solutions de la paillasse ont leur concentration et leur nom", () => {
    expect(["eau", "s1", "s5", "x", "xd"].map((s) => concentrationDe(DOSAGE, s, 0, null))).toEqual([0, 4, 20, 13.4, 6.7]);
    for (const s of ["s6", "s0", "m", "a", "y", ""]) expect(concentrationDe(DOSAGE, s, 0, null), s).toBeNull();
    expect(["eau", "s3", "x", "xd", "m", "a"].map((s) => nomSolution(DOSAGE, s))).toEqual(["l'eau distillée", "S3", "la boisson", "la boisson diluée 2 fois", "le mélange", "la solution incolore"]);
    // le mélange n'existe qu'une fois les deux solutions réunies ; l'espèce colorée s'y forme peu à peu
    expect(["eau", "a", "b", "m", "s1"].map((s) => concentrationDe(SUIVI, s, 50, null))).toEqual([0, 0, 0, null, null]);
    expect(concentrationDe(SUIVI, "m", 10, 10)).toBe(0);
    expect(concentrationDe(SUIVI, "m", 110, 10)).toBeCloseTo(0.45, 12);
    expect(concentrationDe(SUIVI, "m", 5000, 10)).toBeCloseTo(0.9, 6);
  });
});

describe("la molette, le capot et la cuve", () => {
  it("au départ, la molette est loin du maximum, le capot fermé, la cuve vide et tournée d'un quart de tour", () => {
    const etat = regles.depart(DOSAGE);
    expect([etat.lambda, etat.capot, etat.enPlace, etat.contenu, etat.lisse, etat.blanc]).toEqual([620, true, false, null, false, null]);
    expect(regles.depart({ ...DOSAGE, lambdaMax: 630 }).lambda).toBe(450);
    expect(affichage(DOSAGE, etat)).toBe(0);
  });
  it("la molette s'arrête tous les 5 nm, entre 400 et 700 nm", () => {
    expect(paillasse(DOSAGE).fait({ g: "lambda", v: 507 }).etat.lambda).toBe(505);
    expect(paillasse(DOSAGE).fait({ g: "lambda", v: 700 }).etat.lambda).toBe(LAMBDA.max);
    expect(paillasse(DOSAGE).fait({ g: "lambda", v: 705 }, { g: "lambda", v: 380 }, { g: "lambda" }, { g: "lambda", v: 620 }).etat).toEqual(regles.depart(DOSAGE));
  });
  it("la cuve n'entre dans le porte-cuve, et n'en sort, que capot ouvert", () => {
    expect(paillasse(DOSAGE).fait({ g: "placer", dans: true }).etat.enPlace).toBe(false);
    const dedans = paillasse(DOSAGE).fait(...placer);
    expect([dedans.etat.enPlace, dedans.etat.capot]).toEqual([true, true]);
    expect(dedans.fait({ g: "placer", dans: false }).etat.enPlace).toBe(true);
    expect(dedans.fait(...sortir).etat.enPlace).toBe(false);
  });
  it("dans l'appareil, la cuve ne se remplit pas, ne se vide pas, ne se tourne pas", () => {
    const p = paillasse(DOSAGE).fait({ g: "remplir", s: "s3" }, ...placer);
    const avant = p.etat;
    expect(p.fait({ g: "vider" }, { g: "remplir", s: "s4" }, { g: "tourner" }).etat).toBe(avant);
    // sur la paillasse : une cuve pleine ne reçoit rien de plus, une cuve vide ne se vide pas
    expect(paillasse(DOSAGE).fait({ g: "remplir", s: "s3" }, { g: "remplir", s: "s4" }).etat.contenu).toBe("s3");
    expect(paillasse(DOSAGE).fait({ g: "vider" }, { g: "remplir", s: "sirop" }, { g: "remplir" }).etat).toEqual(regles.depart(DOSAGE));
    expect(paillasse(DOSAGE).fait({ g: "tourner" }).etat.lisse).toBe(true);
  });
  it("une cuve vidée garde un peu de la solution d'avant ; rincée avec la solution, elle n'en garde presque rien", () => {
    const neuve = paillasse(DOSAGE).fait({ g: "remplir", s: "s5" });
    expect(dansCuve(DOSAGE, neuve.etat)).toBe(20);
    const sansRincer = neuve.fait({ g: "vider" }, { g: "remplir", s: "s1" });
    expect(dansCuve(DOSAGE, sansRincer.etat)).toBeCloseTo((1 - RESTE) * 4 + RESTE * 20, 12);
    const rincee = paillasse(DOSAGE).fait({ g: "remplir", s: "s5" }, { g: "vider" }, ...rince("s1"));
    expect(dansCuve(DOSAGE, rincee.etat)).toBeCloseTo(4, 0);
    expect(Math.abs(dansCuve(DOSAGE, rincee.etat) - 4) / 4).toBeLessThan(0.03);
  });
});

describe("l'afficheur", () => {
  const pleine = (s: string) => paillasse(DOSAGE).fait({ g: "tourner" }, { g: "lambda", v: 505 }, { g: "remplir", s }, ...placer);
  it("sans blanc, la cuve et l'eau s'ajoutent à ce que la solution absorbe", () => {
    expect(pleine("eau").affiche()).toBeCloseTo(fond(505), 2);
    expect(pleine("s3").affiche()).toBeCloseTo(fond(505) + 0.052 * 12, 2);
  });
  it("après le blanc, l'eau donne zéro et une solution son absorbance ; l'absorbance est la plus grande au maximum", () => {
    const p = paillasse(DOSAGE).fait({ g: "tourner" }, { g: "lambda", v: 505 }, ...blanc, ...rince("s3"), ...placer);
    expect(p.etat.blanc).toMatchObject({ lambda: 505, defaut: "" });
    expect(Math.abs(p.affiche() / (0.052 * 12) - 1)).toBeLessThan(0.015);
    const autour = [480, 495, 505, 515, 530].map((v) => paillasse(DOSAGE).fait({ g: "tourner" }, { g: "remplir", s: "s3" }, ...placer, { g: "lambda", v }).affiche());
    expect(Math.max(...autour)).toBe(autour[2]);
    expect(autour[0]).toBeLessThan(autour[1]);
    expect(autour[4]).toBeLessThan(autour[3]);
  });
  it("capot ouvert, la lumière de la salle fait baisser l'absorbance ; cuve tournée, elle la fait monter", () => {
    const juste = pleine("s4").affiche();
    expect(pleine("s4").fait({ g: "capot", ferme: false }).affiche()).toBeLessThan(juste - 0.2);
    const tournee = paillasse(DOSAGE).fait({ g: "lambda", v: 505 }, { g: "remplir", s: "s4" }, ...placer);
    expect(tournee.affiche()).toBeGreaterThan(juste + 0.5);
    // une cuve vide dans l'appareil absorbe un peu plus qu'une cuve d'eau
    expect(paillasse(DOSAGE).fait({ g: "tourner" }, { g: "lambda", v: 505 }, ...placer).affiche()).toBeGreaterThan(pleine("eau").affiche());
    expect(absorbanceBrute(DOSAGE, regles.depart(DOSAGE))).toBeCloseTo(0, 12);
  });
  it("le blanc retient ce qui n'allait pas : pas de cuve, du colorant dans l'eau, capot ouvert, cuve tournée", () => {
    const defaut = (...gestes: GesteBrut[]) => paillasse(DOSAGE).fait({ g: "lambda", v: 505 }, ...gestes, { g: "blanc" }).etat.blanc?.defaut;
    expect(defaut()).toBe("cuve");
    expect(defaut({ g: "tourner" }, ...placer)).toBe("cuve");
    expect(defaut({ g: "tourner" }, { g: "remplir", s: "s2" }, ...placer)).toBe("solution");
    // de l'eau versée dans une cuve qui vient de contenir S5, sans rinçage
    expect(defaut({ g: "tourner" }, { g: "remplir", s: "s5" }, { g: "vider" }, { g: "remplir", s: "eau" }, ...placer)).toBe("solution");
    expect(defaut({ g: "tourner" }, { g: "remplir", s: "s5" }, { g: "vider" }, ...rince("eau"), ...placer)).toBe("");
    expect(defaut({ g: "tourner" }, { g: "remplir", s: "eau" }, { g: "capot", ferme: false }, { g: "placer", dans: true })).toBe("capot");
    expect(defaut({ g: "remplir", s: "eau" }, ...placer)).toBe("sens");
  });
});

describe("les mesures", () => {
  it("une absorbance se note pour la solution qui est dans l'appareil ; la noter de nouveau remplace la première", () => {
    expect(paillasse(DOSAGE).fait({ g: "noter", v: 0.4 }).etat.mesures).toEqual([]);
    expect(paillasse(DOSAGE).fait({ g: "tourner" }, ...placer, { g: "noter", v: 0.4 }).etat.mesures).toEqual([]);
    const p = paillasse(DOSAGE).fait(...reglage(DOSAGE), ...blanc, ...rince("s2"), ...placer, { g: "noter", v: 0.5 }, { g: "noter", v: 0.4161 });
    expect(p.etat.mesures).toHaveLength(1);
    expect(p.etat.mesures[0]).toMatchObject({ s: "s2", lu: 0.416, affiche: p.affiche(), lambda: 505, capot: true, lisse: true, blanc: "bon" });
    expect(Math.abs(p.etat.mesures[0].pollution)).toBeLessThan(0.01);
    expect(p.fait({ g: "noter", v: 9 }, { g: "noter" }, { g: "noter", v: -3 }, { g: "relever" }, { g: "melanger" }, { g: "chrono" }).etat.mesures).toHaveLength(1);
  });
  it("la droite et la lecture se retiennent ; recommencer efface la série et garde l'appareil", () => {
    const p = dosage(DOSAGE);
    expect(p.etat.pente).toBeCloseTo(0.052, 2);
    expect(p.etat.lue).toBeCloseTo(13.4, 0);
    expect(p.fait({ g: "droite", v: -1 }, { g: "droite" }, { g: "lire", v: -4 }, { g: "lire" }).etat.pente).toBeCloseTo(0.052, 2);
    const apres = p.fait({ g: "recommencer" }).etat;
    expect([apres.mesures, apres.pente, apres.lue, apres.essais, apres.lambda, apres.blanc?.defaut]).toEqual([[], null, null, 1, 505, ""]);
    expect(paillasse(DOSAGE).fait({ g: "recommencer" }).etat).toEqual(regles.depart(DOSAGE));
  });
  it("le temps passe, le chronomètre part quand on le lance, et les relevés portent sa date", () => {
    const p = paillasse(SUIVI).fait({ g: "attendre", v: 12.5 });
    expect([p.etat.t, dateChrono(p.etat)]).toEqual([12.5, 0]);
    p.fait({ g: "tourner" }, { g: "lambda", v: 460 }, ...blanc, { g: "remplir", s: "m" });
    expect(p.etat.contenu).toBeNull();
    p.fait({ g: "melanger" }, { g: "melanger" }, { g: "attendre", v: 5 }, { g: "chrono" }, { g: "remplir", s: "m" }, ...placer, { g: "attendre", v: 95 }, { g: "relever" });
    expect([p.etat.melange, p.etat.chrono, dateChrono(p.etat)]).toEqual([12.5, 17.5, 95]);
    expect(p.etat.mesures).toHaveLength(1);
    expect(p.etat.mesures[0]).toMatchObject({ s: "m", date: 95, heure: 112.5, blanc: "bon" });
    // au bout d'un temps de demi-réaction, la moitié de l'absorbance finale, à la dilution près d'une cuve mouillée
    expect(p.etat.mesures[0].lu).toBeCloseTo(0.45 * (1 - RESTE), 2);
    // sans chronomètre lancé, sans cuve en place, ou en mode étalonnage : pas de relevé
    expect(paillasse(SUIVI).fait({ g: "melanger" }, { g: "remplir", s: "m" }, ...placer, { g: "relever" }, { g: "noter", v: 0.2 }, { g: "droite", v: 1 }).etat.mesures).toEqual([]);
    expect(paillasse(SUIVI).fait({ g: "melanger" }, { g: "chrono" }, { g: "relever" }).etat.mesures).toEqual([]);
    // un nouveau mélange : l'ancien quitte la cuve, qui revient sur la paillasse, rincée
    const neuf = paillasse(SUIVI).fait(...p.gestes, { g: "recommencer" }).etat;
    expect([neuf.melange, neuf.chrono, neuf.contenu, neuf.mesures, neuf.enPlace, neuf.residu]).toEqual([null, null, null, [], false, 0]);
    expect(p.fait(...sortir, { g: "recommencer" }).etat).toMatchObject({ melange: null, contenu: null, enPlace: false });
  });
  it("deux attentes à la suite valent leur somme : la liste des gestes peut les regrouper", () => {
    const debut: GesteBrut[] = [{ g: "melanger" }, { g: "chrono" }];
    expect(paillasse(SUIVI).fait(...debut, { g: "attendre", v: 7.25 }, { g: "attendre", v: 12.5 }).etat).toEqual(paillasse(SUIVI).fait(...debut, { g: "attendre", v: 19.75 }).etat);
    expect(paillasse(SUIVI).fait({ g: "attendre", v: 4000 }, { g: "attendre", v: -1 }, { g: "attendre" }).etat).toEqual(regles.depart(SUIVI));
  });
  it("un suivi ne garde pas plus de relevés que prévu", () => {
    const p = suivi(SUIVI, { pas: 1, jusqua: 4.5, lecture: null });
    expect(p.etat.mesures).toHaveLength(RELEVES_MAX);
  });
  it("un geste inconnu, mal formé ou impossible ne change rien", () => {
    const bizarres: GesteBrut[] = [{ g: "exploser" }, { g: "capot" }, { g: "capot", ferme: true }, { g: "placer" }, { g: "placer", dans: false }, { g: "vider" }, { g: "noter", v: 0.3 }, { g: "relever" }, { g: "lire", v: -1 }, { g: "droite", v: 500 }];
    expect(paillasse(DOSAGE).fait(...bizarres).etat).toEqual(regles.depart(DOSAGE));
  });
});

describe("le bilan d'un dosage par étalonnage", () => {
  it("un dosage soigné n'a aucune faute, et rend la concentration lue sur la droite", () => {
    const b = regles.bilan(DOSAGE, dosage(DOSAGE).etat);
    expect(b.fautes).toEqual([]);
    expect(b.score).toBe(1);
    expect(b.mesures.F).toBe(1);
    expect(b.mesures.C).toBeCloseTo(13.4, 0);
    expect(b.lignes[1]).toContain("F = 1");
  });
  it("une boisson qui sort de la gamme se mesure diluée : le facteur de dilution suit l'élève", () => {
    const p = dosage(FORTE);
    expect(p.etat.mesures.map((m) => m.s)).toEqual(["s1", "s2", "s3", "s4", "s5", "x", "xd"]);
    const b = regles.bilan(FORTE, p.etat);
    expect(b.fautes).toEqual([]);
    expect(b.mesures.F).toBe(2);
    expect(b.mesures.C).toBeCloseTo(13.6, 0);
    // lue telle quelle sur la droite, hors de la gamme : la faute est importante
    const telle = paillasse(FORTE).fait(...reglage(FORTE), ...blanc);
    FORTE.gamme.forEach((_, i) => mesure(telle, `s${i + 1}`));
    expect(exploite(FORTE, mesure(telle, "x")).fautes()).toEqual(["horsgamme!"]);
    expect(regles.bilan(FORTE, telle.etat).mesures.F).toBe(1);
  });
  it("sans rien mesurer, la manipulation vaut zéro, et le professeur donne ses valeurs", () => {
    const b = regles.bilan(FORTE, regles.depart(FORTE));
    expect([b.score, b.fautes.map((f) => f.code), b.mesures]).toEqual([0, ["mesure"], { C: 13.6, F: 2 }]);
    expect(regles.bilan(DOSAGE, paillasse(DOSAGE).fait(...reglage(DOSAGE), ...blanc).etat).mesures).toEqual({ C: 13.4, F: 1 });
  });
  /** Le dosage d'un élève dont on change un geste : `avant` remplace le réglage et le blanc, `chaque` dit comment mesurer chaque solution. */
  const variante = (o: { avant?: GesteBrut[]; chaque?: (s: string) => Parameters<typeof mesure>[2]; solutions?: string[]; exploite?: Parameters<typeof exploite>[2] | null }) => {
    const p = paillasse(DOSAGE).fait(...(o.avant ?? [...reglage(DOSAGE), ...blanc]));
    for (const s of o.solutions ?? ["s1", "s2", "s3", "s4", "s5", "x"]) mesure(p, s, o.chaque?.(s));
    return o.exploite === null ? p : exploite(DOSAGE, p, o.exploite);
  };
  it("le blanc : oublié, mal fait, ou fait avant de changer de longueur d'onde", () => {
    expect(variante({ avant: reglage(DOSAGE) }).fautes()).toEqual(["blanc!"]);
    const sansRincer: GesteBrut[] = [...reglage(DOSAGE), { g: "remplir", s: "eau" }, ...placer, { g: "blanc" }, ...sortir, { g: "vider" }];
    expect(variante({ avant: sansRincer }).fautes()).toEqual(["blanc!"]);
    expect(regles.bilan(DOSAGE, variante({ avant: sansRincer }).etat).fautes[0].texte).toContain("du colorant");
    const sansCuve: GesteBrut[] = [...reglage(DOSAGE), { g: "blanc" }];
    expect(regles.bilan(DOSAGE, variante({ avant: sansCuve }).etat).fautes[0].texte).toContain("sans cuve");
    const ouvert: GesteBrut[] = [...reglage(DOSAGE), ...rince("eau"), { g: "capot", ferme: false }, { g: "placer", dans: true }, { g: "blanc" }, { g: "placer", dans: false }, { g: "vider" }];
    expect(regles.bilan(DOSAGE, variante({ avant: ouvert }).etat).fautes[0].texte).toContain("capot ouvert");
    // le blanc à 505 nm, les mesures à 520 nm
    const ailleurs = variante({ avant: [...reglage(DOSAGE), ...blanc, { g: "lambda", v: 520 }] });
    expect(ailleurs.fautes()).toEqual(["blanc", "longueur"]);
  });
  it("la longueur d'onde : loin du maximum, très loin, ou changée en route", () => {
    const a = (v: number): GesteBrut[] => [{ g: "tourner" }, { g: "lambda", v }, ...blanc];
    expect(variante({ avant: a(510) }).fautes()).toEqual([]);
    expect(variante({ avant: a(480) }).fautes()).toEqual(["longueur"]);
    expect(regles.bilan(DOSAGE, variante({ avant: a(480) }).etat).fautes[0].texte).toContain("73 %");
    expect(variante({ avant: a(560) }).fautes()).toEqual(["longueur!"]);
    const p = paillasse(DOSAGE).fait(...reglage(DOSAGE), ...blanc);
    ["s1", "s2", "s3"].forEach((s) => mesure(p, s));
    p.fait({ g: "lambda", v: 525 });
    ["s4", "s5", "x"].forEach((s) => mesure(p, s));
    expect(exploite(DOSAGE, p).fautes()).toEqual(expect.arrayContaining(["blanc", "longueur!"]));
  });
  it("le capot ouvert et la cuve tournée faussent la mesure : légère pour un étalon, importante pour l'échantillon ou pour plusieurs", () => {
    expect(variante({ chaque: (s) => ({ ouvert: s === "s3" }) }).fautes()).toEqual(expect.arrayContaining(["capot"]));
    expect(variante({ chaque: (s) => ({ ouvert: s === "x" }) }).fautes()).toEqual(expect.arrayContaining(["capot!"]));
    expect(variante({ chaque: (s) => ({ ouvert: s === "s3" || s === "s4" }) }).fautes()).toEqual(expect.arrayContaining(["capot!"]));
    const texte = regles.bilan(DOSAGE, variante({ chaque: (s) => ({ ouvert: s === "s3" }) }).etat).fautes.find((f) => f.code === "capot")?.texte ?? "";
    expect(texte).toContain("S3");
    expect(texte).toContain(absorbanceJuste(DOSAGE, 12).toFixed(3).replace(".", ","));
    // la cuve jamais tournée : le blanc et toutes les mesures sont faits à travers les faces dépolies
    const jamais = variante({ avant: [...reglage(DOSAGE).slice(1), ...blanc] });
    expect(jamais.fautes()).toEqual(expect.arrayContaining(["blanc!", "sens!"]));
    // tournée par mégarde pour une seule solution étalon
    const p = paillasse(DOSAGE).fait(...reglage(DOSAGE), ...blanc);
    mesure(p, "s1");
    p.fait({ g: "tourner" });
    mesure(p, "s2");
    p.fait({ g: "tourner" });
    ["s3", "s4", "s5", "x"].forEach((s) => mesure(p, s));
    expect(exploite(DOSAGE, p).fautes()).toEqual(expect.arrayContaining(["sens"]));
  });
  it("une cuve non rincée garde la trace de la solution d'avant", () => {
    const une = variante({ chaque: (s) => ({ rincer: s !== "s1" }) });
    expect(une.fautes()).toEqual(["rincage"]);
    expect(regles.bilan(DOSAGE, une.etat).fautes[0].texte).toContain("8 %");
    const toutes = variante({ chaque: () => ({ rincer: false }) });
    expect(toutes.fautes()).toEqual(["rincage!"]);
    expect(regles.bilan(DOSAGE, toutes.etat).fautes[0].texte).toContain("2 autres solutions");
    // rincée une fois avec la solution, la cuve n'est pas reprochée, même s'il y reste une trace d'une solution bien plus concentrée
    const apres = mesure(mesure(paillasse(FORTE).fait(...reglage(FORTE), ...blanc), "x"), "s1");
    expect(apres.etat.mesures[1]).toMatchObject({ s: "s1", rincee: true });
    expect(Math.abs(apres.etat.mesures[1].pollution)).toBeGreaterThan(0.03);
    expect(apres.fautes()).not.toContain("rincage");
    expect(mesure(paillasse(FORTE).fait(...reglage(FORTE), ...blanc), "s1", { rincer: false }).etat.mesures[0].rincee).toBe(false);
  });
  it("une absorbance mal recopiée, une gamme incomplète, pas d'échantillon", () => {
    expect(variante({ chaque: (s) => ({ erreur: s === "s2" ? 0.012 : 0 }) }).fautes()).toEqual(["lecture"]);
    expect(variante({ chaque: (s) => ({ erreur: s === "x" ? -0.1 : 0 }) }).fautes()).toEqual(["lecture!"]);
    expect(variante({ solutions: ["s1", "s2", "s4", "s5", "x"] }).fautes()).toEqual(["gamme"]);
    expect(variante({ solutions: ["s2", "s5", "x"] }).fautes()).toEqual(["gamme!"]);
    expect(variante({ solutions: ["s5", "x"], exploite: null }).fautes()).toEqual(["gamme!", "droite!", "concentration!"]);
    expect(variante({ solutions: ["s1", "s2", "s3", "s4", "s5"] }).fautes()).toEqual(["echantillon!"]);
    expect(regles.bilan(DOSAGE, variante({ solutions: ["s1", "s2", "s3", "s4", "s5"] }).etat).mesures).toEqual({ C: 13.4, F: 1 });
  });
  it("la droite mal posée, la concentration mal lue : jugées sur les points de l'élève", () => {
    expect(variante({ exploite: { droite: 1.04 } }).fautes()).toEqual(["droite"]);
    expect(variante({ exploite: { droite: 0.9 } }).fautes()).toEqual(["droite!"]);
    expect(regles.bilan(DOSAGE, variante({ exploite: { droite: 0.9 } }).etat).fautes[0].texte).toContain("trop bas");
    expect(variante({ exploite: null }).fautes()).toEqual(["droite!", "concentration!"]);
    // une lecture sur un graphique se juge à quelques dixièmes près
    expect(variante({ exploite: { lecture: 1.02 } }).fautes()).toEqual([]);
    expect(variante({ exploite: { lecture: 1.04 } }).fautes()).toEqual(["concentration"]);
    expect(variante({ exploite: { lecture: 0.8 } }).fautes()).toEqual(["concentration!"]);
    // sans blanc, les points sont décalés, mais une droite bien posée sur ces points n'est pas une faute de plus
    expect(variante({ avant: reglage(DOSAGE) }).fautes()).not.toContain("droite");
  });
});

describe("le bilan d'un suivi cinétique", () => {
  it("un suivi soigné n'a aucune faute, et rend le temps de demi-réaction lu sur la courbe", () => {
    const p = suivi(SUIVI);
    const b = regles.bilan(SUIVI, p.etat);
    expect(b.fautes).toEqual([]);
    expect(b.score).toBe(1);
    expect(Math.abs(b.mesures.tDemi - 100)).toBeLessThanOrEqual(4);
    expect(b.lignes[0]).toContain("t½");
  });
  it("sans mélange, ou sans relevé, le suivi vaut zéro, et le professeur donne sa valeur", () => {
    const rien = regles.bilan(SUIVI, regles.depart(SUIVI));
    expect([rien.score, rien.fautes.map((f) => f.code), rien.mesures]).toEqual([0, ["suivi"], { tDemi: 100 }]);
    expect(rien.fautes[0].texte).toContain("mélangé");
    const sansReleve = regles.bilan(SUIVI, paillasse(SUIVI).fait({ g: "melanger" }, { g: "chrono" }, { g: "attendre", v: 600 }).etat);
    expect([sansReleve.score, sansReleve.fautes[0].texte.includes("relevé")]).toEqual([0, true]);
  });
  it("le chronomètre lancé en retard décale toutes les dates : la lecture se juge sur la courbe de l'élève", () => {
    const p = suivi(SUIVI, { retard: 8 });
    expect(p.fautes()).toEqual(["chrono"]);
    expect(Math.abs((p.etat.lue ?? 0) - 92)).toBeLessThanOrEqual(4);
    expect(suivi(SUIVI, { retard: 30 }).fautes()).toEqual(["chrono!"]);
    expect(regles.bilan(SUIVI, suivi(SUIVI, { retard: 30 }).etat).fautes[0].texte).toContain("30 s après");
    expect(suivi(SUIVI, { retard: 3 }).fautes()).toEqual([]);
    // une transformation rapide laisse quand même cinq secondes pour lancer le chronomètre
    expect(suivi({ ...SUIVI, demi: 60 }, { retard: 4.5 }).fautes()).toEqual([]);
    expect(suivi({ ...SUIVI, demi: 60 }, { retard: 6 }).fautes()).toEqual(["chrono"]);
    // le chronomètre ne se lance qu'une fois par mélange
    const relance = paillasse(SUIVI).fait({ g: "melanger" }, { g: "chrono" }, { g: "attendre", v: 30 });
    expect(relance.fait({ g: "chrono" }).etat.chrono).toBe(0);
  });
  it("arrêté trop tôt, relevé trop rarement, mal lu ou pas lu", () => {
    const tot = suivi(SUIVI, { jusqua: 3 });
    expect(tot.fautes()).toEqual(["fin!"]);
    expect(regles.bilan(SUIVI, tot.etat).fautes[0].texte).toContain("montait encore");
    // trois relevés pendant la montée suffisent pour lire la courbe ; deux, non
    expect(suivi(SUIVI, { pas: 60 }).fautes()).toEqual([]);
    expect(suivi(SUIVI, { pas: 75 }).fautes()).toEqual(["releves"]);
    expect(suivi(SUIVI, { pas: 200 }).fautes()).toEqual(expect.arrayContaining(["releves!"]));
    // une lecture sur un graphique : à un dixième près du temps de demi-réaction, elle est juste
    expect(suivi(SUIVI, { lecture: 108 }).fautes()).toEqual([]);
    expect(suivi(SUIVI, { lecture: 115 }).fautes()).toEqual(["lecture"]);
    expect(suivi(SUIVI, { lecture: 130 }).fautes()).toEqual(["lecture!"]);
    expect(suivi(SUIVI, { lecture: null }).fautes()).toEqual(["lecture!"]);
    expect(regles.bilan(SUIVI, suivi(SUIVI, { lecture: null }).etat).mesures).toEqual({ tDemi: 100 });
  });
  it("sans blanc, la courbe est décalée : c'est le blanc qui est reproché, pas la lecture de cette courbe", () => {
    const p = suivi(SUIVI, { blanc: false });
    expect(p.etat.mesures[0].blanc).toBe("aucun");
    expect(p.fautes()).toEqual(["blanc!"]);
    expect(p.etat.lue).toBeLessThan(96);
    // mais une lecture très loin du compte se remarque quand même
    expect(suivi(SUIVI, { blanc: false, lecture: 180 }).fautes()).toEqual(["blanc!", "lecture!"]);
  });
});

describe("les deux TP de la paillasse Spectro", () => {
  const manipulation = (etape: EtapeDePaillasse): GesteBrut[] => {
    const r = etape.paillasse.reglages as ReglagesSpectro;
    return (r.mode === "cinetique" ? suivi(r) : dosage(r)).gestes;
  };
  const conclusion = async (t: typeof etalonnage, graine: number) => {
    const partie = await joueJuste(t, graine, manipulation, REGLES);
    const derniere = partie.retours[partie.retours.length - 1].correction;
    return { partie, bonne: derniere.genre === "choix" ? derniere.bonne : -1 };
  };
  for (const t of [etalonnage, cinetique]) {
    it(`${t.id} : passe les contrôles communs à tous les TP`, async () => {
      await controlesCommuns(t, REGLES);
    });
    it(`${t.id} : fait avec soin, le TP donne A partout, quelle que soit la situation tirée`, async () => {
      for (const graine of GRAINES) {
        const { partie } = await conclusion(t, graine);
        expect(partie.scores.every((s) => s === 1), `graine ${graine} : ${partie.scores.join(" ")}`).toBe(true);
        expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "A", VAL: "A" });
        expect(partie.fautes).toEqual([[]]);
      }
    });
  }
  it("etalonnage : selon la boisson tirée, elle se mesure telle quelle ou diluée, et l'annonce est confirmée ou démentie", async () => {
    const vues = new Set<string>();
    for (const graine of GRAINES) {
      const { partie, bonne } = await conclusion(etalonnage, graine);
      vues.add(`F = ${partie.mesures.F}, ${bonne === 0 ? "oui" : "non"}`);
    }
    expect(vues).toEqual(new Set(["F = 1, oui", "F = 1, non", "F = 2, oui", "F = 2, non"]));
    expect([etalonnage.fiche, etalonnage.etapes(1).length]).toEqual([10, 10]);
  });
  it("cinetique : selon la température tirée, l'attente de la notice suffit ou non", async () => {
    const vues = new Map<number, number>();
    for (const graine of GRAINES) {
      const { partie, bonne } = await conclusion(cinetique, graine);
      const r = (partie.etapes.find((e) => e.genre === "paillasse") as EtapeDePaillasse).paillasse.reglages as ReglagesSpectro;
      expect(Math.abs(partie.mesures.tDemi - r.demi) / r.demi).toBeLessThan(0.05);
      vues.set(r.demi, bonne);
    }
    expect([...vues].sort((a, b) => a[0] - b[0])).toEqual([[75, 0], [100, 0], [160, 1], [210, 1]]);
    expect([cinetique.fiche, cinetique.etapes(1).length]).toEqual([11, 9]);
  });
});
