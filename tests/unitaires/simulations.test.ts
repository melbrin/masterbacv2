// Le labo (règles dans lib/commun/simulations, défis dans lib/serveur/contenu/defis) : chaque défi a une réponse,
// calculée ici à part avec la relation du cours.
// Cette réponse doit faire réussir la simulation, y compris arrondie au pas de saisie ; une valeur fausse doit échouer.
import { describe, expect, it } from "vitest";
import { MESURE_SPECTRO, absorbance, absorbanceAffichee, concentrationCuve } from "@/lib/commun/simulations/beer";
import { instantArret, partRestante, tempsEcrit } from "@/lib/commun/simulations/cinetique";
import { concentrationEcrite, concentrationPreparee } from "@/lib/commun/simulations/dilution";
import { pH, pHAffiche } from "@/lib/commun/simulations/ph";
import { FARADAY, arret, autonomie, charge, depot } from "@/lib/commun/simulations/pile";
import { SYNTHESE, obtenu, pese, quantiteEngagee, resultatEcrit } from "@/lib/commun/simulations/synthese";
import { cleNotion, decimalesDuPas, etoilesPour, grandeurs, ID_SIMULATIONS, regles, type Defi, type Valeurs } from "@/lib/commun/simulations";
import { arriveeDuSon, frequenceRecue, positionEmetteur } from "@/lib/commun/simulations/doppler";
import { avancee, dureeChute, positionColis } from "@/lib/commun/simulations/largage";
import { desintegration, dureeEcrite, fraction, NOYAUX } from "@/lib/commun/simulations/radio";
import { instantSeuil, intensite, tau, tension } from "@/lib/commun/simulations/rc";
import { altitudeOpposee, ATMOSPHERE, avance, marche, periode, vitesseCirculaire } from "@/lib/commun/simulations/satellite";
import { tauThermique, temperature } from "@/lib/commun/simulations/temperature";
import { restant, verse, volumeEquivalent, volumeVerse } from "@/lib/commun/simulations/titrage";
import { defi, simulation, SIMULATIONS } from "@/lib/serveur/contenu/defis";

const g = 9.81;
/** G × M_T, en m³·s⁻², avec les valeurs données dans les énoncés. */
const GM = 6.67e-11 * 5.97e24;
const rad = (deg: number) => (deg * Math.PI) / 180;
/** La vitesse qui fait passer le ballon par le centre du cercle, tirée de l'équation de la trajectoire. */
const vitesseDuTir = (angle: number, H: number) => Math.sqrt((g * 4.6 ** 2) / (2 * Math.cos(rad(angle)) ** 2 * (4.6 * Math.tan(rad(angle)) + H - 3.05)));

// la réponse de chaque défi, recalculée ici sans passer par le code des simulations
const REPONSES: Record<string, Valeurs> = {
  "basket-1": { v0: Math.sqrt(2 * g * 0.6) },
  "basket-2": { v0: vitesseDuTir(45, 2.2) },
  "basket-3": { v0: vitesseDuTir(52, 2.6) },
  "largage-1": { d: 12 * Math.sqrt((2 * 20) / g) },
  "largage-2": { v: 60 / Math.sqrt((2 * 45) / g) },
  "largage-3": { H: (g * 30 ** 2) / (2 * 15 ** 2) },
  "rc-1": { R: 2 },
  "rc-2": { R: (10 / Math.log(6 / (6 - 4)) / 470) * 1000 },
  "rc-3": { C: (0.5 / Math.log(300 / 100) / 2) * 1000 },
  "temperature-1": { chauffe: (0.5 * 4180 * (90 - 20)) / 2000 },
  "temperature-2": { date: 12 * Math.log((90 - 20) / (60 - 20)) },
  "temperature-3": { date: (((0.25 * 4180) / (25 * 0.03)) * Math.log((85 - 20) / (50 - 20))) / 60 },
  "doppler-1": { v: 340 * (1 - 300 / 400) },
  "doppler-2": { fE: (440 * (340 - 80)) / 340 },
  "doppler-3": { vkmh: 340 * (1 - 400 / 425) * 3.6 },
  "satellite-1": { v: Math.sqrt((GM) / 6.771e6) / 1000 },
  "satellite-2": { T: (2 * Math.PI * Math.sqrt(7.071e6 ** 3 / GM)) / 60 },
  "satellite-3": { h: Math.cbrt((GM * 86164 ** 2) / (4 * Math.PI ** 2)) / 1000 - 6371 },
  "titrage-1": { V: (0.08 * 20) / 0.1 },
  "titrage-2": { CB: (0.06 * 20) / 12 },
  "titrage-3": { V: (0.05 * 20) / (5 * 0.02) },
  "radio-1": { date: 2 * 8 },
  "radio-2": { date: (5730 * Math.log(1 / 0.6)) / Math.LN2 },
  "radio-3": { demiVie: (24 * Math.LN2) / Math.log(10) },
  "dilution-1": { V: (0.1 * 100) / 0.5 },
  "dilution-2": { Vfille: (20 * 5) / 2 },
  "dilution-3": { m: 0.1 * 0.1 * 249.7 },
  "ph-1": { C: 10 ** -2 * 1000 },
  "ph-2": { rapport: 10 ** (5.2 - 4.8) },
  "ph-3": { F: 10 ** (3.5 - 2) },
  "beer-1": { C: (0.8 * 2) / 0.5 },
  "beer-2": { Cmere: (0.45 / 0.15) * 10 },
  "beer-3": { V: ((0.6 / 0.15) * 50) / 20 },
  "cinetique-1": { date: Math.LN2 / 0.023 },
  "cinetique-2": { date: Math.log(10) / 0.05 },
  "cinetique-3": { k: Math.log(10) / 5 },
  "pile-1": { I: 2 / 10 },
  "pile-2": { m: ((0.5 * 3600) / 96500 / 2) * 65.4 },
  "pile-3": { dureeMin: ((0.5 / 63.5) * 2 * 96500) / 0.8 / 60 },
  "synthese-1": { n: 9 / 180 },
  "synthese-2": { m: (5 / 180 / 0.8) * 138 },
  "synthese-3": { n: 0.024 / (0.8 * 0.6) },
};
// les textes portent des espaces insécables (entre un nombre et son unité, entre les milliers) : ici on compare avec des espaces simples
const net = (texte: string) => texte.replace(/[\u00a0\u202f]/g, " ");
const tous = SIMULATIONS.flatMap((s) => s.defis.map((d) => ({ s, d })));
const arrondi = (d: Defi, v: Valeurs): Valeurs => Object.fromEntries(d.champs.map((c) => [c.id, Math.round(v[c.id] / c.pas) * c.pas]));
const issue = (id: string, saisies: Valeurs) => {
  const x = defi(id)!;
  const lu = grandeurs(x.defi, saisies);
  if (!lu.ok) throw new Error(`valeur hors bornes pour ${id} : ${lu.champ}`);
  const r = regles(x.simulation.id)!.issue(lu.p);
  return { ...r, message: net(r.message) };
};

describe("registre du labo", () => {
  it("quatorze simulations, trois défis chacune, un par objectif, tous à l'état de brouillon", () => {
    expect(SIMULATIONS.map((s) => s.id)).toEqual(["basket", "largage", "satellite", "temperature", "doppler", "rc", "dilution", "ph", "titrage", "beer", "cinetique", "radio", "pile", "synthese"]);
    // dans l'ordre des fiches : la physique d'abord, la chimie ensuite
    expect(SIMULATIONS.map((s) => s.fiche)).toEqual([1, 1, 3, 5, 6, 8, 9, 9, 10, 10, 11, 11, 12, 13]);
    // chaque simulation a ses règles, et il n'y a pas de règles sans simulation
    expect(ID_SIMULATIONS).toEqual(SIMULATIONS.map((s) => s.id));
    expect(regles("inconnue")).toBeNull();
    expect(regles("constructor")).toBeNull();
    for (const s of SIMULATIONS) {
      expect(s.defis.map((d) => d.niveau), s.id).toEqual([10, 14, 18]);
      expect(s.defis.map((d) => d.id), s.id).toEqual([1, 2, 3].map((n) => `${s.id}-${n}`));
      expect(s.defis.every((d) => d.etat === "brouillon"), s.id).toBe(true);
    }
    expect(new Set(tous.map((x) => x.d.id)).size).toBe(42);
    expect(Object.keys(REPONSES).sort()).toEqual(tous.map((x) => x.d.id).sort());
  });
  it("chaque défi a un énoncé, des données, un rappel du cours et des champs bien bornés", () => {
    for (const { d } of tous) {
      expect(d.titre.length, d.id).toBeGreaterThan(5);
      expect(d.enonce.endsWith("?") || d.enonce.endsWith("."), d.id).toBe(true);
      expect(d.donnees.length, d.id).toBeGreaterThanOrEqual(2);
      expect(d.rappel.length, d.id).toBeGreaterThanOrEqual(1);
      expect(d.champs.length, d.id).toBeGreaterThanOrEqual(1);
      for (const c of d.champs) {
        expect(c.min, d.id).toBeLessThan(c.max);
        expect(c.pas, d.id).toBeGreaterThan(0);
        expect(c.id in d.fixes, `${d.id} : ${c.id} est à la fois fixé et demandé`).toBe(false);
      }
      // ni tiret long ni émoji dans un texte montré à l'élève
      expect(/[—–\u{1F300}-\u{1FAFF}]/u.test(d.titre + d.enonce + d.donnees.map((x) => x.nom + x.valeur).join("")), d.id).toBe(false);
    }
  });
  it("retrouve une simulation et un défi par leur identifiant", () => {
    expect(simulation("rc")?.nom).toBe("Le circuit RC");
    expect(simulation("inconnue")).toBeNull();
    expect(defi("doppler-2")).toMatchObject({ rang: 1, simulation: { id: "doppler" }, defi: { niveau: 14 } });
    expect(defi("doppler-9")).toBeNull();
  });
});

describe("la bonne réponse fait réussir la simulation, une mauvaise la fait échouer", () => {
  for (const { s, d } of tous) {
    it(`${d.id} : ${d.titre}`, () => {
      const exacte = REPONSES[d.id];
      for (const c of d.champs) {
        expect(exacte[c.id], `${d.id} : la réponse est dans les bornes du champ`).toBeGreaterThan(c.min);
        expect(exacte[c.id]).toBeLessThan(c.max);
      }
      expect(issue(d.id, exacte)).toMatchObject({ reussi: true });
      // l'élève saisit au pas du champ : la réponse arrondie réussit encore
      expect(issue(d.id, arrondi(d, exacte)), "réponse arrondie au pas").toMatchObject({ reussi: true });
      // une erreur de 15 % dans un sens ou dans l'autre échoue, avec une phrase qui se termine par un point
      for (const facteur of [0.85, 1.15]) {
        const fausse = Object.fromEntries(d.champs.map((c) => [c.id, Math.min(c.max, Math.max(c.min, exacte[c.id] * facteur))]));
        const r = issue(d.id, fausse);
        expect(r.reussi, `${d.id} × ${facteur}`).toBe(false);
        expect(r.message.endsWith(".")).toBe(true);
      }
      // de quoi animer : une durée et une cadence positives, des mesures à tout instant
      const lu = grandeurs(d, arrondi(d, exacte));
      if (!lu.ok) throw new Error("bornes");
      const r = regles(s.id)!;
      expect(r.duree(lu.p)).toBeGreaterThan(0);
      expect(r.cadence(lu.p)).toBeGreaterThan(0);
      for (const t of [0, r.duree(lu.p) / 2, r.duree(lu.p)]) {
        const mesures = r.mesures(lu.p, t);
        expect(mesures.length).toBeGreaterThanOrEqual(3);
        expect(mesures.every((x) => x.nom && x.valeur && !x.valeur.includes("NaN"))).toBe(true);
      }
    });
  }
});

describe("valeurs saisies", () => {
  const d = defi("basket-2")!.defi;
  it("accepte une valeur dans les bornes et lui ajoute les données de l'énoncé", () => {
    expect(grandeurs(d, { v0: 7.44 })).toEqual({ ok: true, p: { mode: 1, angle: 45, hauteur: 2.2, v0: 7.44 } });
  });
  it("refuse une valeur absente, hors bornes ou qui n'est pas un nombre", () => {
    expect(grandeurs(d, {})).toEqual({ ok: false, champ: "v0" });
    expect(grandeurs(d, { v0: 4.9 })).toEqual({ ok: false, champ: "v0" });
    expect(grandeurs(d, { v0: 10.5 })).toEqual({ ok: false, champ: "v0" });
    expect(grandeurs(d, { v0: Number.NaN })).toEqual({ ok: false, champ: "v0" });
    expect(grandeurs(d, { v0: Number.POSITIVE_INFINITY })).toEqual({ ok: false, champ: "v0" });
  });
  it("ne laisse pas l'élève changer une donnée de l'énoncé", () => {
    const lu = grandeurs(d, { v0: 7.44, angle: 80, hauteur: 9 });
    expect(lu).toMatchObject({ ok: true, p: { angle: 45, hauteur: 2.2 } });
  });
});

describe("pas de saisie", () => {
  it("donne le nombre de décimales à écrire", () => {
    expect([1, 0.1, 0.01, 0.001, 5].map(decimalesDuPas)).toEqual([0, 1, 2, 3, 0]);
  });
});

describe("étoiles", () => {
  it("trois au premier essai, deux jusqu'au troisième, une ensuite", () => {
    expect([0, 1, 2, 3, 4, 20].map(etoilesPour)).toEqual([3, 3, 2, 2, 1, 1]);
  });
});

describe("messages du basketteur", () => {
  it("dit si le saut est trop bas ou trop haut, et pourquoi le tir échoue", () => {
    expect(issue("basket-1", { v0: 3 }).message).toMatch(/^Trop bas/);
    expect(issue("basket-1", { v0: 4 }).message).toMatch(/^Trop haut/);
    expect(issue("basket-2", { v0: 7 }).message).toMatch(/^Trop court de/);
    expect(issue("basket-2", { v0: 8 }).message).toMatch(/^Trop long de/);
    expect(issue("basket-2", { v0: 5 }).message).toMatch(/ne monte pas assez haut/);
    expect(issue("basket-2", { v0: 7.44 }).message).toBe("Panier !");
  });
});

describe("le largage", () => {
  it("la chute dure √(2H/g) et le colis avance de v × t", () => {
    expect(dureeChute(20)).toBeCloseTo(2.019, 3);
    expect(avancee({ v: 12, H: 20 })).toBeCloseTo(24.23, 2);
    expect(positionColis({ v: 12, H: 20 }, 0)).toEqual({ x: 0, y: 20 });
    expect(positionColis({ v: 12, H: 20 }, 1)).toEqual({ x: 12, y: 20 - 0.5 * g });
    // après l'arrivée au sol, le colis ne bouge plus
    expect(positionColis({ v: 12, H: 20 }, 10).y).toBeCloseTo(0, 9);
    expect(positionColis({ v: 12, H: 20 }, -1)).toEqual({ x: 0, y: 20 });
  });
  it("dit de combien et de quel côté le colis manque la cible", () => {
    expect(issue("largage-1", { d: 30 }).message).toBe("Le colis tombe 5,8 m avant la cible.");
    expect(issue("largage-1", { d: 20 }).message).toBe("Le colis tombe 4,2 m après la cible.");
  });
});

describe("le circuit RC", () => {
  const charge = { E: 5, R: 2, C: 1000, seuil: 5 * (1 - Math.exp(-1)), decharge: 0 };
  it("τ = RC, avec R en kilo-ohm et C en microfarad", () => {
    expect(tau(charge)).toBe(2);
    expect(tau({ R: 19.4, C: 470 })).toBeCloseTo(9.118, 3);
  });
  it("en charge : 63 % de E à t = τ, presque E à 5τ, intensité maximale au départ", () => {
    expect(tension(charge, 0)).toBe(0);
    expect(tension(charge, 2) / 5).toBeCloseTo(0.632, 3);
    expect(tension(charge, 10) / 5).toBeGreaterThan(0.99);
    expect(intensite(charge, 0)).toBe(2.5);
    expect(intensite(charge, 10)).toBeLessThan(0.02);
    expect(instantSeuil(charge)).toBeCloseTo(2, 9);
  });
  it("en décharge : 37 % de la tension de départ à t = τ, intensité négative", () => {
    const decharge = { E: 300, R: 2, C: 228, seuil: 100, decharge: 1 };
    expect(tension(decharge, 0)).toBe(300);
    expect(tension(decharge, tau(decharge)) / 300).toBeCloseTo(0.368, 3);
    expect(intensite(decharge, 0)).toBe(-150);
    expect(instantSeuil(decharge)).toBeCloseTo(0.228 * 2 * Math.log(3), 9);
  });
  it("dit si la lampe s'allume trop tôt ou trop tard", () => {
    expect(issue("rc-2", { R: 10 }).message).toMatch(/trop tôt\.$/);
    expect(issue("rc-2", { R: 30 }).message).toMatch(/trop tard\.$/);
    expect(issue("rc-2", { R: 19.4 }).message).toBe("La tension atteint 4,00 V à 10,0 s : la lampe s'allume à la bonne date.");
    // en décharge, la lampe s'éteint quand la tension tombe au seuil
    expect(issue("rc-3", { C: 228 }).message).toBe("La tension tombe à 100 V à 0,501 s : la lampe s'éteint à la bonne date.");
    expect(issue("rc-3", { C: 300 }).message).toMatch(/^La tension tombe à 100 V à 0,659 s\. Il fallait 0,500 s : c'est trop tard\.$/);
  });
});

describe("la température", () => {
  it("en chauffe : la température monte en ligne droite, puis s'arrête quand on coupe, et ne dépasse pas 100 °C", () => {
    const p = { mode: 0, m: 0.5, c: 4180, P: 2000, theta0: 20, chauffe: 73 };
    expect(temperature(p, 0)).toBe(20);
    expect(temperature(p, 73)).toBeCloseTo(89.86, 2);
    expect(temperature(p, 500)).toBeCloseTo(89.86, 2);
    expect(temperature({ ...p, chauffe: 300 }, 300)).toBe(100);
    expect(issue("temperature-1", { chauffe: 300 }).message).toMatch(/^L'eau bout/);
    expect(issue("temperature-1", { chauffe: 40 }).message).toMatch(/chauffe plus longtemps\.$/);
    expect(issue("temperature-1", { chauffe: 78 }).message).toMatch(/trop longtemps\.$/);
  });
  it("en refroidissement : part de θ_0, tend vers la température de la pièce", () => {
    const p = { mode: 1, theta0: 90, thetaTh: 20, tau: 720 };
    expect(temperature(p, 0)).toBe(90);
    expect(temperature(p, 720)).toBeCloseTo(20 + 70 / Math.E, 9);
    expect(temperature(p, 720 * 20)).toBeCloseTo(20, 4);
    expect(issue("temperature-2", { date: 3 }).message).toMatch(/trop tôt\.$/);
    expect(issue("temperature-2", { date: 12 }).message).toMatch(/trop tard\.$/);
  });
  it("le temps caractéristique est donné, ou vaut m × c / (h × S)", () => {
    expect(tauThermique({ tau: 720 })).toBe(720);
    expect(tauThermique({ m: 0.25, c: 4180, h: 25, S: 0.03 })).toBeCloseTo(1393.33, 2);
  });
});

describe("l'effet Doppler", () => {
  it("f_R = f_E × c / (c − v) : plus aigu quand l'émetteur approche, inchangé à l'arrêt", () => {
    expect(frequenceRecue({ fE: 300, v: 85, c: 340 })).toBeCloseTo(400, 9);
    expect(frequenceRecue({ fE: 300, v: 0, c: 340 })).toBe(300);
    expect(frequenceRecue({ fE: 400, vkmh: 72, c: 340 })).toBeCloseTo(425, 9);
  });
  it("l'émetteur avance vers l'auditeur sans le dépasser, et le son met moins d'une demi-seconde à arriver", () => {
    const p = { fE: 300, v: 85, c: 340 };
    expect(positionEmetteur(p, 0.6)).toBe(40);
    expect(positionEmetteur(p, 0)).toBeCloseTo(-11, 9);
    expect(arriveeDuSon(p)).toBeCloseTo(111 / 340, 9);
    expect(arriveeDuSon({ fE: 300, v: 150, c: 340 })).toBeLessThan(0.5);
  });
  it("dit si le son est trop grave ou trop aigu", () => {
    expect(issue("doppler-1", { v: 40 }).message).toMatch(/trop grave\.$/);
    expect(issue("doppler-1", { v: 120 }).message).toMatch(/trop aigu\.$/);
  });
});

describe("clé d'une notion", () => {
  it("garde le texte avant la formule, sans casse ni apostrophe courbe", () => {
    expect(cleNotion("Charge sous $E$")).toBe("charge sous");
    expect(cleNotion('Charge sous <span class="math inline"><span class="katex">E</span></span>')).toBe("charge sous");
    expect(cleNotion("Instant d’un seuil $U_s$")).toBe("instant d'un seuil");
    expect(cleNotion("  Effet   Doppler ")).toBe("effet doppler");
  });
});

describe("le satellite", () => {
  const iss = { mode: 0, h: 400, v: 7.67, tol: 0.015 };
  it("vitesse et durée d'un tour sur une orbite circulaire", () => {
    expect(vitesseCirculaire(400)).toBeCloseTo(7.669, 3);
    expect(periode(400) / 60).toBeCloseTo(92.5, 1);
    // un tour dure la circonférence divisée par la vitesse
    expect(periode(700)).toBeCloseTo((2 * Math.PI * 7071) / vitesseCirculaire(700), 6);
  });
  it("à la bonne vitesse, le satellite garde son altitude et boucle son tour", () => {
    const m = marche(iss, periode(400));
    expect(m.tombe).toBe(false);
    expect(m.r - 6371).toBeGreaterThan(395);
    expect(m.r - 6371).toBeLessThan(405);
    expect(m.angle / (2 * Math.PI)).toBeCloseTo(1, 2);
    expect(m.trace.length).toBeGreaterThan(50);
    expect(marche(iss, 0)).toMatchObject({ t: 0, angle: 0, r: 6771, tombe: false });
  });
  it("trop lent, il rentre dans l'atmosphère ; trop rapide, il monte ; bien trop rapide, il s'échappe", () => {
    const lent = marche({ ...iss, v: 7.2 }, periode(400));
    expect(lent.tombe).toBe(true);
    expect(lent.t).toBeLessThan(periode(400));
    expect(lent.r - 6371).toBeLessThanOrEqual(ATMOSPHERE);
    expect(altitudeOpposee({ ...iss, v: 7.2 })).toBeLessThan(0);
    expect(altitudeOpposee({ ...iss, v: 8 })).toBeGreaterThan(1500);
    expect(altitudeOpposee({ ...iss, v: vitesseCirculaire(400) })).toBeCloseTo(400, 6);
    expect(altitudeOpposee({ ...iss, v: 11 })).toBe(Number.POSITIVE_INFINITY);
    expect(issue("satellite-1", { v: 7.2 }).message).toMatch(/^Trop lent : le satellite descend jusqu'à l'atmosphère/);
    expect(issue("satellite-1", { v: 7.6 }).message).toMatch(/^Trop lent : l'orbite n'est plus circulaire\. Le satellite descend jusqu'à \d+ km d'altitude\.$/);
    expect(issue("satellite-1", { v: 8 }).message).toMatch(/^Trop rapide : l'orbite n'est plus circulaire/);
    expect(net(regles("satellite")!.issue({ ...iss, v: 11 }).message)).toBe("Trop rapide : le satellite s'échappe et ne revient pas.");
  });
  it("dit si la photo est prise trop tôt ou trop tard, et si le satellite est trop bas ou trop haut", () => {
    expect(issue("satellite-2", { T: 90 }).message).toMatch(/n'a fait que 0,91 tour : c'est trop tôt\.$/);
    expect(issue("satellite-2", { T: 110 }).message).toMatch(/a déjà fait 1,11 tour : c'est trop tard\.$/);
    expect(issue("satellite-3", { h: 20000 }).message).toMatch(/^Trop bas : le satellite fait un tour en 11 h \d\d min/);
    expect(issue("satellite-3", { h: 50000 }).message).toMatch(/^Trop haut/);
    expect(issue("satellite-3", { h: 35780 }).message).toBe("Le satellite fait un tour en 23 h 56 min, comme la Terre : il reste au-dessus de la station.");
    expect(avance({ h: 35780 }, 86164)).toBeCloseTo(0, 0);
    expect(avance({ h: 20000 }, 86164)).toBeGreaterThan(300);
  });
});

describe("le titrage", () => {
  const p = { CA: 0.08, VA: 20, CB: 0.1, a: 1, b: 1, V: 16 };
  it("à l'équivalence, les réactifs sont dans les proportions de l'équation", () => {
    expect(volumeEquivalent(p)).toBeCloseTo(16, 9);
    // cinq ions fer(II) pour un ion permanganate
    expect(volumeEquivalent({ CA: 0.05, VA: 20, CB: 0.02, a: 5, b: 1 })).toBeCloseTo(10, 9);
    expect(restant(p, 0)).toBeCloseTo(1.6, 9);
    expect(restant(p, 8)).toBeCloseTo(0.8, 9);
    expect(restant(p, 16)).toBeCloseTo(0, 9);
    expect(restant(p, 99)).toBe(0);
  });
  it("la burette s'arrête au volume choisi, ou à celui que l'énoncé fixe", () => {
    expect(verse(p, 5)).toBe(5);
    expect(verse(p, 40)).toBe(16);
    expect(verse(p, -1)).toBe(0);
    expect(volumeVerse({ ...p, Vfixe: 12 })).toBe(12);
  });
  it("dit ce qui manque, ou de combien l'équivalence est dépassée", () => {
    expect(issue("titrage-1", { V: 12 }).message).toBe("La solution n'a pas changé de couleur : il manque 4,0 mL pour atteindre l'équivalence.");
    expect(issue("titrage-1", { V: 18.5 }).message).toBe("La solution a changé de couleur dès 16,0 mL : tu as dépassé l'équivalence de 2,5 mL.");
    expect(issue("titrage-2", { CB: 0.05 }).message).toMatch(/trop diluée\.$/);
    expect(issue("titrage-2", { CB: 0.2 }).message).toMatch(/dès 6,0 mL au lieu de 12,0 mL : la solution titrante est trop concentrée\.$/);
  });
});

describe("la décroissance radioactive", () => {
  const iode = { demiVie: 8, date: 16, cible: 0.25, tol: 0.006, unite: 0, activite: 0 };
  it("il reste la moitié des noyaux après une demi-vie, le quart après deux", () => {
    expect(fraction(iode, 0)).toBe(1);
    expect(fraction(iode, 8)).toBeCloseTo(0.5, 12);
    expect(fraction(iode, 16)).toBeCloseTo(0.25, 12);
    expect(fraction(iode, -3)).toBe(1);
  });
  it("le dessin suit la loi : à tout instant, le nombre de noyaux allumés est celui de la loi, à un noyau près", () => {
    for (const t of [0, 3, 8, 16, 30, 60]) {
      const allumes = Array.from({ length: NOYAUX }, (_, i) => desintegration(iode, i)).filter((x) => x > t).length;
      expect(Math.abs(allumes - NOYAUX * fraction(iode, t)), `t = ${t}`).toBeLessThanOrEqual(1);
    }
  });
  it("écrit les durées dans l'unité du défi, et dit si c'est trop tôt, trop tard, ou si la demi-vie est mal choisie", () => {
    expect(net(dureeEcrite(iode, 16))).toBe("16,0 j");
    expect(net(dureeEcrite({ unite: 1 }, 4220))).toBe("4 220 ans");
    expect(issue("radio-1", { date: 10 }).message).toBe("Après 10,0 j, il reste encore 42,0 % des noyaux. Il en faut 25,0 % : c'est trop tôt.");
    expect(issue("radio-1", { date: 30 }).message).toMatch(/il ne reste que 7,4 % des noyaux\. Il en fallait 25,0 % : c'est trop tard\.$/);
    expect(issue("radio-2", { date: 4220 }).message).toBe("Après 4 220 ans, il reste 60,0 % de l'activité : c'est la valeur attendue.");
    expect(issue("radio-3", { demiVie: 12 }).message).toBe("En 24,0 h, il reste 25,0 % de l'activité au lieu de 10,0 % : la demi-vie est trop longue.");
    expect(issue("radio-3", { demiVie: 4 }).message).toMatch(/la demi-vie est trop courte\.$/);
  });
  it("donne à l'écran la durée d'une unité de temps, pour dire l'allure de l'animation", () => {
    expect(regles("radio")!.secondes!({ unite: 0 })).toBe(86400);
    expect(regles("radio")!.secondes!({ unite: 2 })).toBe(3600);
    expect(regles("titrage")!.secondes!({})).toBeNull();
    expect(regles("basket")!.secondes).toBeUndefined();
  });
});

describe("préparer une solution", () => {
  it("dilution : C_mère × V_mère = C_fille × V_fille ; dissolution : C = m / (M × V)", () => {
    expect(concentrationPreparee({ mode: 0, Cmere: 0.5, V: 20, Vfille: 100 })).toBeCloseTo(0.1, 12);
    expect(concentrationPreparee({ mode: 1, Cmere: 0.02, V: 5, Vfille: 50 })).toBeCloseTo(0.002, 12);
    expect(concentrationPreparee({ mode: 2, m: 2.497, M: 249.7, Vfille: 100 })).toBeCloseTo(0.1, 12);
    expect(net(concentrationEcrite({ milli: 1 }, 0.002))).toBe("2,00 mmol/L");
    expect(net(concentrationEcrite({ milli: 0 }, 0.1))).toBe("0,100 mol/L");
  });
  it("dit si la solution est trop concentrée ou trop diluée", () => {
    expect(issue("dilution-1", { V: 30 }).message).toBe("Ta solution est à 0,150 mol/L au lieu de 0,100 mol/L : elle est trop concentrée.");
    expect(issue("dilution-2", { Vfille: 100 }).message).toBe("Ta solution est à 1,00 mmol/L au lieu de 2,00 mmol/L : elle est trop diluée.");
    expect(issue("dilution-3", { m: 2.5 }).message).toBe("Ta solution est à 0,100 mol/L : c'est la concentration voulue.");
  });
});

describe("le pH", () => {
  it("pH = −log([H₃O⁺]), pH = pK_A quand il y a autant d'acide que de base, une unité de plus quand on dilue dix fois", () => {
    expect(pH({ mode: 0, C: 10 })).toBeCloseTo(2, 12);
    expect(pH({ mode: 1, pKA: 4.8, rapport: 1 })).toBeCloseTo(4.8, 12);
    expect(pH({ mode: 2, pH0: 2, F: 10 })).toBeCloseTo(3, 12);
  });
  it("le pH-mètre part de 7 et rejoint le pH de la solution", () => {
    expect(pHAffiche({ mode: 0, C: 10 }, 0)).toBe(7);
    expect(pHAffiche({ mode: 0, C: 10 }, 1)).toBeLessThan(7);
    expect(pHAffiche({ mode: 0, C: 10 }, 99)).toBeCloseTo(2, 12);
  });
  it("dit si la solution est trop acide ou pas assez", () => {
    expect(issue("ph-1", { C: 5 }).message).toBe("Le pH-mètre affiche 2,30 au lieu de 2,00 : la solution n'est pas assez acide.");
    expect(issue("ph-1", { C: 20 }).message).toBe("Le pH-mètre affiche 1,70 au lieu de 2,00 : la solution est trop acide.");
  });
});

describe("le spectrophotomètre", () => {
  it("A = k × C, pour la solution qui est dans la cuve", () => {
    expect(absorbance({ mode: 0, k: 0.25, C: 3.2 })).toBeCloseTo(0.8, 12);
    expect(concentrationCuve({ mode: 1, Cmere: 30, F: 10 })).toBeCloseTo(3, 12);
    expect(concentrationCuve({ mode: 2, Cmere: 20, V: 10, Vfille: 50 })).toBeCloseTo(4, 12);
  });
  it("l'affichage reste à zéro tant que la lampe est éteinte, puis rejoint l'absorbance", () => {
    const p = { mode: 0, k: 0.25, C: 3.2 };
    expect(absorbanceAffichee(p, 0)).toBe(0);
    expect(absorbanceAffichee(p, MESURE_SPECTRO.lampe)).toBe(0);
    expect(absorbanceAffichee(p, MESURE_SPECTRO.fin)).toBeCloseTo(0.8, 12);
  });
  it("dit si la solution est trop concentrée ou trop diluée", () => {
    expect(issue("beer-1", { C: 2 }).message).toBe("Le spectrophotomètre affiche A = 0,50 au lieu de 0,80 : la solution est trop diluée.");
    expect(issue("beer-1", { C: 5 }).message).toMatch(/A = 1,25 au lieu de 0,80 : la solution est trop concentrée\.$/);
  });
});

describe("la cinétique d'ordre 1", () => {
  it("la moitié du réactif a disparu au bout de ln 2 / k", () => {
    const p = { k: Math.LN2 / 30, date: 30, unite: 0 };
    expect(partRestante(p, 0)).toBe(1);
    expect(partRestante(p, 30)).toBeCloseTo(0.5, 12);
    expect(partRestante(p, 60)).toBeCloseTo(0.25, 12);
    expect(instantArret(p)).toBe(30);
    expect(instantArret({ dateFixe: 5, k: 1 })).toBe(5);
    expect(net(tempsEcrit(p, 30.1))).toBe("30,1 s");
    expect(net(tempsEcrit({ unite: 1 }, 46.1))).toBe("46,1 min");
  });
  it("dit si c'est trop tôt, trop tard, trop lent ou trop rapide", () => {
    expect(issue("cinetique-1", { date: 20 }).message).toBe("Après 20,0 s, il reste encore 63,1 % du réactif. Il en faut 50,0 % : c'est trop tôt.");
    expect(issue("cinetique-1", { date: 60 }).message).toMatch(/il ne reste que 25,2 % du réactif\. Il en fallait 50,0 % : c'est trop tard\.$/);
    expect(issue("cinetique-3", { k: 0.2 }).message).toBe("En 5,0 min, il reste 36,8 % du réactif au lieu de 10,0 % : la réaction est trop lente.");
    expect(issue("cinetique-3", { k: 1 }).message).toMatch(/la réaction est trop rapide\.$/);
  });
});

describe("la pile et l'électrolyse", () => {
  it("Q = I × Δt = n(e⁻) × F", () => {
    // une pile de 2,0 A·h qui débite 0,20 A tient 10 h
    expect(autonomie({ mode: 0, Q: 2, I: 0.2 })).toBeCloseTo(36000, 6);
    // une mole de zinc donne deux moles d'électrons
    expect(autonomie({ mode: 1, m: 65.4, M: 65.4, z: 2, I: 1 })).toBeCloseTo(2 * FARADAY, 6);
    const cuivrage = { mode: 2, I: 0.8, M: 63.5, z: 2, dureeMin: 31.7 };
    expect(depot(cuivrage, 31.7 * 60)).toBeCloseTo(0.5006, 4);
    expect(depot(cuivrage, 1e9)).toBeCloseTo(0.5006, 4);
    expect(arret(cuivrage)).toBe(1902);
    expect(charge(cuivrage, 100)).toBeCloseTo(80, 9);
    expect(charge({ mode: 0, Q: 2, I: 0.2 }, 1e9)).toBeCloseTo(7200, 6);
  });
  it("dit pourquoi la pile ne tient pas la durée voulue, et pourquoi le dépôt n'a pas la bonne masse", () => {
    expect(issue("pile-1", { I: 0.5 }).message).toBe("La pile est vide au bout de 4,00 h au lieu de 10,00 h : le courant est trop fort.");
    expect(issue("pile-1", { I: 0.1 }).message).toBe("La pile tiendrait 20,00 h : la lampe pourrait recevoir plus de courant.");
    expect(issue("pile-2", { m: 0.3 }).message).toBe("Le zinc est épuisé au bout de 0,49 h au lieu de 1,00 h : il en faut plus.");
    expect(issue("pile-2", { m: 1 }).message).toMatch(/^La pile pourrait débiter 1,64 h : il y a plus de zinc qu'il n'en faut\.$/);
    expect(issue("pile-3", { dureeMin: 20 }).message).toBe("Le dépôt ne pèse que 0,32 g au lieu de 0,50 g : l'électrolyse est trop courte.");
    expect(issue("pile-3", { dureeMin: 45 }).message).toMatch(/au lieu de 0,50 g : l'électrolyse est trop longue\.$/);
  });
});

describe("la synthèse", () => {
  it("le rendement réduit ce qu'on récupère, et les rendements de deux étapes se multiplient", () => {
    expect(obtenu({ mode: 0, n: 0.05, M: 180 })).toBeCloseTo(9, 12);
    expect(obtenu({ mode: 1, m: 138, Mr: 138, Mp: 180, rendement: 0.8 })).toBeCloseTo(144, 9);
    expect(obtenu({ mode: 2, n: 0.05, rendement: 0.8, rendement2: 0.6 })).toBeCloseTo(0.024, 12);
    expect(quantiteEngagee({ mode: 1, m: 4.79, Mr: 138 })).toBeCloseTo(0.03471, 5);
    expect(quantiteEngagee({ mode: 0, n: 0.05 })).toBe(0.05);
    expect(net(resultatEcrit({ mode: 2 }, 0.024))).toBe("0,024 mol");
    expect(net(resultatEcrit({ mode: 0 }, 9))).toBe("9,00 g");
  });
  it("la balance n'affiche rien pendant la réaction, puis monte jusqu'au résultat", () => {
    const p = { mode: 0, n: 0.05, M: 180 };
    expect(pese(p, 0)).toBe(0);
    expect(pese(p, SYNTHESE.reaction)).toBe(0);
    expect(pese(p, SYNTHESE.fin)).toBeCloseTo(9, 12);
  });
  it("dit s'il manque du réactif ou s'il y en a trop", () => {
    expect(issue("synthese-1", { n: 0.03 }).message).toBe("On récupère 5,40 g de produit au lieu de 9,00 g : il manque du réactif.");
    expect(issue("synthese-1", { n: 0.08 }).message).toMatch(/14,40 g de produit au lieu de 9,00 g : il y a trop de réactif\.$/);
  });
});

describe("l'allure de l'animation des simulations de chimie", () => {
  it("n'a pas de sens quand la manipulation est montrée en quelques secondes ; se compte en secondes ou en minutes pour la cinétique", () => {
    for (const id of ["dilution", "ph", "beer", "synthese"]) expect(regles(id)!.secondes!({}), id).toBeNull();
    expect(regles("cinetique")!.secondes!({ unite: 0 })).toBe(1);
    expect(regles("cinetique")!.secondes!({ unite: 1 })).toBe(60);
    expect(regles("pile")!.secondes).toBeUndefined();
  });
});
