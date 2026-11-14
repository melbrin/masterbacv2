// Le labo (règles dans lib/commun/simulations, défis dans lib/serveur/contenu/defis) : chaque défi a une réponse,
// calculée ici à part avec la relation du cours.
// Cette réponse doit faire réussir la simulation, y compris arrondie au pas de saisie ; une valeur fausse doit échouer.
import { describe, expect, it } from "vitest";
import { cleNotion, decimalesDuPas, etoilesPour, grandeurs, ID_SIMULATIONS, regles, type Defi, type Valeurs } from "@/lib/commun/simulations";
import { arriveeDuSon, frequenceRecue, positionEmetteur } from "@/lib/commun/simulations/doppler";
import { avancee, dureeChute, positionColis } from "@/lib/commun/simulations/largage";
import { instantSeuil, intensite, tau, tension } from "@/lib/commun/simulations/rc";
import { tauThermique, temperature } from "@/lib/commun/simulations/temperature";
import { defi, simulation, SIMULATIONS } from "@/lib/serveur/contenu/defis";

const g = 9.81;
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
};
const tous = SIMULATIONS.flatMap((s) => s.defis.map((d) => ({ s, d })));
const arrondi = (d: Defi, v: Valeurs): Valeurs => Object.fromEntries(d.champs.map((c) => [c.id, Math.round(v[c.id] / c.pas) * c.pas]));
const issue = (id: string, saisies: Valeurs) => {
  const x = defi(id)!;
  const lu = grandeurs(x.defi, saisies);
  if (!lu.ok) throw new Error(`valeur hors bornes pour ${id} : ${lu.champ}`);
  const r = regles(x.simulation.id)!.issue(lu.p);
  // les messages portent une espace insécable entre un nombre et son unité : ici on compare avec des espaces simples
  return { ...r, message: r.message.replace(/\u00a0/g, " ") };
};

describe("registre du labo", () => {
  it("cinq simulations, trois défis chacune, un par objectif, tous à l'état de brouillon", () => {
    expect(SIMULATIONS.map((s) => s.id)).toEqual(["basket", "largage", "rc", "temperature", "doppler"]);
    // chaque simulation a ses règles, et il n'y a pas de règles sans simulation
    expect(ID_SIMULATIONS).toEqual(SIMULATIONS.map((s) => s.id));
    expect(regles("inconnue")).toBeNull();
    expect(regles("constructor")).toBeNull();
    for (const s of SIMULATIONS) {
      expect(s.defis.map((d) => d.niveau), s.id).toEqual([10, 14, 18]);
      expect(s.defis.map((d) => d.id), s.id).toEqual([1, 2, 3].map((n) => `${s.id}-${n}`));
      expect(s.defis.every((d) => d.etat === "brouillon"), s.id).toBe(true);
    }
    expect(new Set(tous.map((x) => x.d.id)).size).toBe(15);
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
