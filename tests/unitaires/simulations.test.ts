// Le labo (règles dans lib/commun/simulations, défis dans lib/serveur/contenu/defis) : chaque défi a une réponse,
// calculée ici à part avec la relation du cours.
// Cette réponse doit faire réussir la simulation, y compris arrondie au pas de saisie ; une valeur fausse doit échouer.
import { describe, expect, it } from "vitest";
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
