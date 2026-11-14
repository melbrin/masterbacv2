// La paillasse « optique » (lib/commun/tp/paillasses/optique.ts) et ses deux TP : une lentille à contrôler (relation de
// conjugaison) et une lunette afocale. Les manipulations sont jouées ici sans le navigateur, geste par geste.
import { describe, expect, it } from "vitest";
import {
  DEBUT, ECART, FLOU, NET, course, distanceImage, distanceObjet, imageSurEcran, lentilleDe, mesuresDuProfesseur, position, rangDeLaMesure, regles, vergence,
  type EtatOptique, type ReglagesOptique,
} from "@/lib/commun/tp/paillasses/optique";
import { rejoue, type GesteBrut, type ReglesPaillasse } from "@/lib/commun/tp/types";
import focale from "@/lib/serveur/contenu/tp/focale";
import lunetteTp from "@/lib/serveur/contenu/tp/lunette";
import { GRAINES, controlesCommuns, joueJuste, type EtapeDePaillasse, type ReglesDuTest } from "../../outils/tp";

/** Les TP d'optique sont en construction : ils ne sont pas inscrits dans l'application, le test donne leurs règles. */
const REGLES: ReglesDuTest = { optique: regles as ReglesPaillasse<unknown, unknown> };

const mm = (x: number) => Math.round(x * 10) / 10;
/** Un banc pour mesurer une distance focale : une lentille de 8 δ à étudier (f′ = 12,5 cm), une divergente, deux autres. */
const banc: ReglagesOptique = {
  rail: 120, source: { genre: "lettre", x: 10, taille: 2 },
  boite: [{ id: "div", etiquette: -8, f: -12.5 }, { id: "c3", etiquette: 3, f: 100 / 3 }, { id: "cible", etiquette: 8, f: 12.5 }, { id: "c20", etiquette: 20, f: 5 }],
  supports: [45], recepteur: { genre: "ecran", x: 105 },
  but: { genre: "focale", lentille: "cible", mesures: 3, distances: [30, 24, 18], taille: true },
};
const joue = (r: ReglagesOptique, gestes: GesteBrut[]): EtatOptique => rejoue(regles, r, gestes);
const fautes = (r: ReglagesOptique, gestes: GesteBrut[]) => regles.bilan(r, joue(r, gestes)).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);

// ---------- les gestes d'un élève soigneux ----------
const preparer: GesteBrut[] = [{ g: "salle", on: false }, { g: "lampe", on: true }, { g: "poser", lentille: "cible", sur: "a" }];
/** Place la lentille à la distance `d` de l'objet et l'écran là où l'image est nette, décalé de `decalage`, puis note les trois positions. */
function mesure(r: ReglagesOptique, d: number, decalage = 0, f = lentilleDe(r, "cible")!.f): GesteBrut[] {
  const lentille = r.source.x + d;
  const ecran = mm(lentille + distanceImage(f, d)! + decalage);
  return [{ g: "glisser", quoi: "ecran", x: r.rail }, { g: "glisser", quoi: "a", x: lentille }, { g: "glisser", quoi: "ecran", x: ecran }, { g: "releve", o: r.source.x, a: lentille, e: ecran }];
}
/** La manipulation soignée : trois mesures aux distances du professeur, puis la taille de la dernière image. */
function soignee(r: ReglagesOptique): GesteBrut[] {
  if (r.but.genre !== "focale") throw new Error("ce banc ne mesure pas une distance focale");
  const prof = mesuresDuProfesseur(r, r.but);
  const derniere = prof[prof.length - 1];
  const taille = mm((r.source.genre === "lettre" ? r.source.taille : 0) * (derniere.e - derniere.l) / (derniere.l - derniere.o));
  return [...preparer.map((g) => (g.g === "poser" ? { ...g, lentille: (r.but as { lentille: string }).lentille } : g)), ...prof.flatMap((p) => mesure(r, p.l - p.o)), { g: "taille", v: taille }];
}

describe("la lumière sur le banc", () => {
  const allume = (ou: { lentille?: string | null; a?: number; ecran?: number; objet?: number }) => ({ lampe: true, salle: false, objet: ou.objet ?? 10, supports: [{ x: ou.a ?? 30, lentille: ou.lentille === undefined ? "cible" : ou.lentille }], ecran: ou.ecran ?? 100 });
  it("lampe éteinte, rien n'arrive sur l'écran ; sans lentille, une lueur sans image", () => {
    expect(imageSurEcran(banc, { ...allume({}), lampe: false })).toEqual({ eclaire: false, taille: 0, flou: 0 });
    expect(imageSurEcran(banc, allume({ lentille: null }))).toEqual({ eclaire: true, taille: 0, flou: Infinity });
  });
  it("l'image est nette là où le dit la relation de conjugaison : 1/OA + 1/OA′ = 1/f′", () => {
    // objet à 20 cm d'une lentille de 12,5 cm : image à 33,3 cm
    expect(distanceImage(12.5, 20)).toBeCloseTo(100 / 3, 9);
    const nette = imageSurEcran(banc, allume({ a: 30, ecran: 30 + 100 / 3 }));
    expect(nette.flou).toBeCloseTo(0, 9);
    // renversée, et agrandie de OA′/OA
    expect(nette.taille).toBeCloseTo(-2 * (100 / 3) / 20, 9);
  });
  it("le flou grandit avec l'écart de l'écran à la bonne position, des deux côtés", () => {
    const flou = (decalage: number) => imageSurEcran(banc, allume({ a: 30, ecran: 30 + 100 / 3 + decalage })).flou;
    for (const d of [0.2, 0.5, 1, 2, 5]) {
      expect(flou(d)).toBeGreaterThan(flou(d / 2));
      // la tache de flou : le rayon de la lentille, fois l'écart, sur la distance de l'image
      expect(flou(d)).toBeCloseTo((2 * d) / (100 / 3), 9);
      expect(flou(-d)).toBeCloseTo(flou(d), 9);
    }
    expect(flou(0.4)).toBeLessThan(NET);
    expect(flou(1)).toBeGreaterThan(NET);
    expect(flou(2)).toBeGreaterThan(FLOU);
  });
  it("un objet à moins d'une distance focale, ou une lentille divergente : aucune image nette, où que soit l'écran", () => {
    expect(distanceImage(12.5, 12.5)).toBeNull();
    expect(distanceImage(12.5, 8)).toBeNull();
    expect(distanceImage(-12.5, 30)).toBeNull();
    for (let ecran = 25; ecran <= 120; ecran += 5) {
      expect(imageSurEcran(banc, allume({ a: 20, ecran })).flou).toBeGreaterThan(FLOU);
      expect(imageSurEcran(banc, allume({ lentille: "div", a: 30, ecran: 33 + ecran - 25 })).flou).toBeGreaterThan(FLOU);
    }
  });
  it("une lunette afocale devant l'œil fictif : image nette, redressée, agrandie de f′1/f′2", () => {
    const lunette: ReglagesOptique = {
      rail: 120, source: { genre: "lointain", x: 12, angle: 0.08 },
      boite: [{ id: "obj", etiquette: 3, f: 100 / 3 }, { id: "ocu", etiquette: 10, f: 10 }],
      supports: [20, 60], recepteur: { genre: "oeil", x: 104, f: 12.5 }, but: { genre: "lunette", objectif: "obj", oculaire: "ocu" },
    };
    const monte = (a: string | null, b: string | null, ecart = 0) => ({ lampe: true, salle: false, objet: 12, supports: [{ x: 20, lentille: a }, { x: 20 + 100 / 3 + 10 + ecart, lentille: b }], ecran: 116.5 });
    // sans lunette : l'œil seul forme une image renversée de taille f′ × angle
    const seul = imageSurEcran(lunette, monte(null, null));
    expect([seul.taille, seul.flou]).toEqual([-1, 0]);
    const afocale = imageSurEcran(lunette, monte("obj", "ocu"));
    expect(afocale.flou).toBeCloseTo(0, 9);
    expect(afocale.taille).toBeCloseTo(1 * (100 / 3) / 10, 9);
    // déréglée d'un centimètre : flou = f′(œil) × rayon × écart / (f′1 × f′2)
    expect(imageSurEcran(lunette, monte("obj", "ocu", 1)).flou).toBeCloseTo((12.5 * 2 * 1) / ((100 / 3) * 10), 9);
    // montée à l'envers, elle rapetisse
    const envers = imageSurEcran(lunette, { ...monte("ocu", "obj"), supports: [{ x: 20, lentille: "ocu" }, { x: 20 + 10 + 100 / 3, lentille: "obj" }] });
    expect(envers.flou).toBeCloseTo(0, 9);
    expect(envers.taille).toBeCloseTo(0.3, 9);
  });
});

describe("les gestes sur le banc", () => {
  it("au départ : lampe éteinte, salle éclairée, support vide", () => {
    expect(joue(banc, [])).toEqual({ lampe: false, salle: true, objet: 10, supports: [{ x: 45, lentille: null }], ecran: 105, releves: [], tailles: [] });
  });
  it("une pièce glisse au millimètre, bute sur ses voisines et sur les bouts du rail", () => {
    expect(joue(banc, [{ g: "glisser", quoi: "a", x: 31.234 }]).supports[0].x).toBe(31.2);
    expect(joue(banc, [{ g: "glisser", quoi: "a", x: 0 }]).supports[0].x).toBe(10 + ECART);
    expect(joue(banc, [{ g: "glisser", quoi: "a", x: 500 }]).supports[0].x).toBe(105 - ECART);
    expect(joue(banc, [{ g: "glisser", quoi: "ecran", x: 500 }]).ecran).toBe(120);
    expect(joue(banc, [{ g: "glisser", quoi: "ecran", x: 0 }]).ecran).toBe(45 + ECART);
    expect(joue(banc, [{ g: "glisser", quoi: "objet", x: 0 }]).objet).toBe(DEBUT);
    expect(joue(banc, [{ g: "glisser", quoi: "objet", x: 90 }]).objet).toBe(45 - ECART);
    expect(course(banc, joue(banc, []), "a")).toEqual([13, 102]);
    expect(course(banc, joue(banc, []), "b")).toBeNull();
    expect(position(joue(banc, []), "ecran")).toBe(105);
    expect(position(joue(banc, []), "b")).toBeNull();
  });
  it("deux déplacements à la suite de la même pièce valent le dernier : la liste des gestes peut les regrouper", () => {
    const deux = joue(banc, [...preparer, { g: "glisser", quoi: "a", x: 20 }, { g: "glisser", quoi: "a", x: 300 }]);
    const un = joue(banc, [...preparer, { g: "glisser", quoi: "a", x: 300 }]);
    expect(deux).toEqual(un);
  });
  it("une lentille se pose sur un support, se remplace, se range", () => {
    expect(joue(banc, [{ g: "poser", lentille: "cible", sur: "a" }]).supports[0].lentille).toBe("cible");
    expect(joue(banc, [{ g: "poser", lentille: "cible", sur: "a" }, { g: "poser", lentille: "div", sur: "a" }]).supports[0].lentille).toBe("div");
    expect(joue(banc, [{ g: "poser", lentille: "cible", sur: "a" }, { g: "ranger", lentille: "cible" }]).supports[0].lentille).toBeNull();
    // sur un banc à deux supports, une lentille déplacée quitte le premier
    const deux: ReglagesOptique = { ...banc, supports: [30, 60] };
    expect(joue(deux, [{ g: "poser", lentille: "cible", sur: "a" }, { g: "poser", lentille: "cible", sur: "b" }]).supports.map((s) => s.lentille)).toEqual([null, "cible"]);
  });
  it("un relevé garde ce que l'élève a lu et le banc à ce moment ; seuls les douze derniers restent", () => {
    const etat = joue(banc, [...preparer, ...mesure(banc, 20)]);
    expect(etat.releves).toHaveLength(1);
    expect(etat.releves[0]).toMatchObject({ o: 10, a: 30, b: null, e: 63.3, banc: { lampe: true, salle: false, objet: 10, ecran: 63.3 } });
    expect(joue(banc, [{ g: "taille", v: 3.34 }]).tailles[0].v).toBe(3.3);
    // seuls les douze derniers relevés restent : ici, la lentille avance de 3 cm entre deux relevés
    const beaucoup = joue(banc, Array.from({ length: 15 }, (_, i): GesteBrut[] => [{ g: "glisser", quoi: "a", x: 20 + 3 * i }, { g: "releve", a: 20 + 3 * i, e: 105 }]).flat());
    expect(beaucoup.releves.map((x) => x.a)).toEqual(Array.from({ length: 12 }, (_, i) => 29 + 3 * i));
  });
  it("une mesure refaite à la même place remplace l'ancienne, à son rang", () => {
    const trois = [...preparer, ...mesure(banc, 30), ...mesure(banc, 24), ...mesure(banc, 18)];
    // la deuxième mesure refaite à 1 cm de sa place, mal lue cette fois : elle garde son rang
    const refaite = joue(banc, [...trois, { g: "glisser", quoi: "a", x: 35 }, { g: "releve", o: 10, a: 35.4, e: 68.9 }]);
    expect(refaite.releves.map((x) => x.a)).toEqual([40, 35.4, 28]);
    expect(rangDeLaMesure(refaite.releves, refaite)).toBe(1);
    expect(distanceObjet(refaite)).toBe(25);
    // à plus de 2 cm de toute mesure, c'est une nouvelle mesure
    expect(joue(banc, [...trois, { g: "glisser", quoi: "a", x: 31 }, { g: "releve", o: 10, a: 31, e: 68.9 }]).releves).toHaveLength(4);
    // la lunette, elle, garde tous ses relevés
    const lunette: ReglagesOptique = { ...banc, supports: [30, 60], but: { genre: "lunette", objectif: "c3", oculaire: "c20" } };
    expect(joue(lunette, [{ g: "releve", a: 30, b: 60 }, { g: "releve", a: 30, b: 60 }]).releves).toHaveLength(2);
  });
  it("un geste inconnu, mal formé ou impossible ne change rien", () => {
    const bizarres: GesteBrut[] = [
      { g: "exploser" }, { g: "lampe" }, { g: "lampe", on: "oui" }, { g: "lampe", on: false }, { g: "salle", on: true }, { g: "glisser", quoi: "a" }, { g: "glisser", quoi: "b", x: 30 },
      { g: "glisser", quoi: "plafond", x: 30 }, { g: "glisser", x: 30 }, { g: "glisser", quoi: "a", x: 45 }, { g: "poser", lentille: "inconnue", sur: "a" }, { g: "poser", lentille: "cible", sur: "b" },
      { g: "poser", lentille: "cible" }, { g: "ranger", lentille: "cible" }, { g: "ranger" }, { g: "releve" }, { g: "releve", o: 10, e: 60 }, { g: "releve", a: -3, e: 60 }, { g: "releve", a: 30, e: 999 },
      { g: "releve", a: "trente", e: 60 }, { g: "taille" }, { g: "taille", v: 0 }, { g: "taille", v: 80 },
    ];
    const debut = joue(banc, []);
    expect(joue(banc, bizarres)).toEqual(debut);
    // et l'état rendu est le même objet : la vue ne garde pas un geste sans effet
    for (const g of bizarres) expect(regles.geste(banc, debut, g)).toBe(debut);
    const pose = joue(banc, [{ g: "poser", lentille: "cible", sur: "a" }]);
    expect(regles.geste(banc, pose, { g: "poser", lentille: "cible", sur: "a" })).toBe(pose);
  });
  it("un banc où l'objet et l'écran sont fixes ne les laisse pas glisser", () => {
    const fixe: ReglagesOptique = { ...banc, source: { genre: "lointain", x: 12, angle: 0.08 }, supports: [30, 60], recepteur: { genre: "oeil", x: 104, f: 12.5 } };
    const debut = joue(fixe, []);
    expect(debut.ecran).toBe(116.5);
    expect(joue(fixe, [{ g: "glisser", quoi: "objet", x: 30 }, { g: "glisser", quoi: "ecran", x: 80 }])).toEqual(debut);
    expect(course(fixe, debut, "a")).toEqual([15, 57]);
    expect(course(fixe, debut, "b")).toEqual([33, 101]);
  });
});

describe("le bilan d'une mesure de distance focale", () => {
  it("une manipulation soignée n'a aucune faute, et l'élève emporte ses lectures", () => {
    const b = regles.bilan(banc, joue(banc, soignee(banc)));
    expect(b.fautes).toEqual([]);
    expect(b.score).toBe(1);
    // lentille à 30, 24 puis 18 cm de l'objet ; la dernière image est la plus grande, et la règle y est posée
    expect(b.mesures).toEqual({ xo1: 10, xl1: 40, xe1: 61.4, xo2: 10, xl2: 34, xe2: 60.1, xo3: 10, xl3: 28, xe3: 68.9, xot: 10, xlt: 28, xet: 68.9, t: 4.5 });
    expect(b.lignes).toEqual([
      "Mesure n° 1 : objet à 10,0 cm, lentille à 40,0 cm, écran à 61,4 cm.",
      "Mesure n° 2 : objet à 10,0 cm, lentille à 34,0 cm, écran à 60,1 cm.",
      "Mesure n° 3 : objet à 10,0 cm, lentille à 28,0 cm, écran à 68,9 cm.",
      "Taille de l'image à la mesure n° 3 : 4,5 cm.",
    ]);
  });
  it("sans rien noter, la manipulation vaut zéro, et le professeur donne ses mesures", () => {
    const b = regles.bilan(banc, joue(banc, [...preparer, { g: "glisser", quoi: "a", x: 30 }]));
    expect(b.score).toBe(0);
    expect(b.fautes.map((f) => f.code)).toEqual(["mesures"]);
    expect(b.mesures).toEqual({ xo1: 10, xl1: 40, xe1: 61.4, xo2: 10, xl2: 34, xe2: 60.1, xo3: 10, xl3: 28, xe3: 68.9, xot: 10, xlt: 28, xet: 68.9, t: 4.5 });
    expect(b.lignes[0]).toBe("Sans mesure notée, on continue avec celles du professeur.");
    expect(b.lignes[1]).toContain("donnée par le professeur");
    // chaque mesure du professeur redonne la distance focale
    const but = banc.but as Extract<ReglagesOptique["but"], { genre: "focale" }>;
    for (const p of mesuresDuProfesseur(banc, but)) expect(1 / (1 / (p.l - p.o) + 1 / (p.e - p.l))).toBeCloseTo(12.5, 1);
    // sans distance de protocole, il place la lentille d'après sa distance focale : 31, 25 puis 19 cm
    expect(mesuresDuProfesseur(banc, { ...but, distances: [] }).map((p) => p.l - p.o)).toEqual([31, 25, 19]);
  });
  it("une image floue se relève : faute légère près de la netteté, importante loin, avec l'écart en centimètres", () => {
    const debut = [...preparer, ...mesure(banc, 30), ...mesure(banc, 24)];
    const fin: GesteBrut[] = [{ g: "taille", v: 4.5 }];
    // la dernière image est à 40,9 cm de la lentille : 0,5 cm d'écart reste net, 1 cm est flou, 3 cm est très flou
    expect(fautes(banc, [...debut, ...mesure(banc, 18, 0.5), ...fin])).toEqual([]);
    expect(fautes(banc, [...debut, ...mesure(banc, 18, 1), { g: "taille", v: 4.6 }])).toEqual(["nettete"]);
    expect(fautes(banc, [...debut, ...mesure(banc, 18, -3), { g: "taille", v: 4.2 }])).toEqual(["nettete!", "taille"]);
    const texte = regles.bilan(banc, joue(banc, [...debut, ...mesure(banc, 18, -3)])).fautes[0].texte;
    expect(texte).toContain("mesure n° 3");
    expect(texte).toContain("3,0 cm trop près");
    // dans une salle éclairée, le professeur le dit
    const eclairee = regles.bilan(banc, joue(banc, [...debut.filter((g) => g.g !== "salle"), ...mesure(banc, 18, 1)])).fautes[0];
    expect(eclairee.texte).toContain("Éteins aussi la lumière de la salle");
  });
  it("un objet trop près de la lentille, ou une image au-delà du rail : pas d'image nette possible", () => {
    const trop = joue(banc, [...preparer, { g: "glisser", quoi: "a", x: 20 }, { g: "glisser", quoi: "ecran", x: 60 }, { g: "releve", o: 10, a: 20, e: 60 }]);
    const f = regles.bilan(banc, trop).fautes.find((x) => x.code === "nettete")!;
    expect([f.grave, f.texte.includes("trop près")]).toEqual([true, true]);
    // à 14 cm d'une lentille de 12,5 cm, l'image se forme à 116,7 cm : plus loin que le bout du rail
    const loin = joue(banc, [...preparer, { g: "glisser", quoi: "a", x: 24 }, { g: "glisser", quoi: "ecran", x: 120 }, { g: "releve", o: 10, a: 24, e: 120 }]);
    expect(regles.bilan(banc, loin).fautes.find((x) => x.code === "nettete")!.texte).toContain("plus loin que le bout du rail");
  });
  it("la mauvaise lentille : une divergente, une autre convergente, un support vide, une lampe éteinte", () => {
    const avec = (id: string | null) => [...preparer.filter((g) => g.g !== "poser"), ...(id ? [{ g: "poser", lentille: id, sur: "a" }] : []), ...mesure(banc, 30), ...mesure(banc, 24), ...mesure(banc, 18)];
    const divergente = regles.bilan(banc, joue(banc, avec("div")));
    expect(divergente.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["lentille!", "taille"]);
    expect(divergente.fautes[0].texte).toContain("−8 δ");
    expect(divergente.fautes[0].texte).toContain("divergente");
    expect(regles.bilan(banc, joue(banc, avec("c3"))).fautes[0].texte).toContain("+3 δ");
    expect(regles.bilan(banc, joue(banc, avec(null))).fautes[0].texte).toContain("pas de lentille");
    // la bonne lentille, mais la lampe éteinte : rien à mettre au point
    expect(fautes(banc, [{ g: "poser", lentille: "cible", sur: "a" }, ...mesure(banc, 30), ...mesure(banc, 24), ...mesure(banc, 18)])).toEqual(["lampe!", "taille"]);
  });
  it("une lecture fausse sur le rail : légère à quelques millimètres, importante au-delà", () => {
    const debut = [...preparer, ...mesure(banc, 30), ...mesure(banc, 24)];
    const derniere = mesure(banc, 18).slice(0, 3);
    const fin: GesteBrut[] = [{ g: "taille", v: 4.5 }];
    expect(fautes(banc, [...debut, ...derniere, { g: "releve", o: 10, a: 28, e: 69 }, ...fin])).toEqual([]);
    expect(fautes(banc, [...debut, ...derniere, { g: "releve", o: 10, a: 28.4, e: 68.9 }, ...fin])).toEqual(["lecture"]);
    expect(fautes(banc, [...debut, ...derniere, { g: "releve", o: 10, a: 28, e: 59.9 }, ...fin])).toEqual(["lecture!"]);
    const b = regles.bilan(banc, joue(banc, [...debut, ...derniere, { g: "releve", o: 10, a: 28, e: 59.9 }, ...fin]));
    expect(b.fautes[0].texte).toContain("tu as noté 59,9 cm pour l'écran ; son repère était en face de 68,9 cm");
    // la suite se calcule avec ce que l'élève a noté
    expect(b.mesures.xe3).toBe(59.9);
    // des lectures dans le désordre ne permettent aucun calcul : la suite garde alors les vraies positions
    const desordre = regles.bilan(banc, joue(banc, [...debut, ...derniere, { g: "releve", o: 28, a: 10, e: 68.9 }, ...fin]));
    expect([desordre.mesures.xo3, desordre.mesures.xl3, desordre.mesures.xe3]).toEqual([10, 28, 68.9]);
    expect(desordre.fautes.map((f) => f.code)).toEqual(["lecture"]);
  });
  it("des mesures trop peu nombreuses : il en faut trois, à trois places de la lentille", () => {
    expect(fautes(banc, [...preparer, ...mesure(banc, 24), { g: "taille", v: 2.2 }])).toEqual(["mesures!"]);
    expect(fautes(banc, [...preparer, ...mesure(banc, 30), ...mesure(banc, 18), { g: "taille", v: 4.5 }])).toEqual(["mesures"]);
    // trois relevés, dont deux à la même place : il n'y a que deux mesures
    expect(fautes(banc, [...preparer, ...mesure(banc, 30), ...mesure(banc, 18), ...mesure(banc, 19), { g: "taille", v: 3.9 }])).toEqual(["mesures"]);
    // seules les trois dernières mesures comptent : une mesure ratée ailleurs ne compte plus
    expect(fautes(banc, [...preparer, ...mesure(banc, 45, 6), ...soignee(banc)])).toEqual([]);
    // et une mesure ratée se refait à la même place
    expect(fautes(banc, [...preparer, ...mesure(banc, 30, 6), ...soignee(banc)])).toEqual([]);
  });
  it("la taille de l'image : oubliée, mal lue, prise sur une image floue, ou après avoir déplacé la lentille", () => {
    const mesures = [...preparer, ...mesure(banc, 30), ...mesure(banc, 24), ...mesure(banc, 18)];
    expect(fautes(banc, mesures)).toEqual(["taille"]);
    expect(fautes(banc, [...mesures, { g: "taille", v: 4.6 }])).toEqual([]);
    expect(fautes(banc, [...mesures, { g: "taille", v: 4.9 }])).toEqual(["taille"]);
    expect(fautes(banc, [...mesures, { g: "taille", v: 2 }])).toEqual(["taille!"]);
    expect(fautes(banc, [...mesures, { g: "glisser", quoi: "ecran", x: 80 }, { g: "taille", v: 6 }])).toEqual(["taille"]);
    // l'écran un peu déplacé, l'image encore nette : la taille vaut toujours pour cette mesure
    expect(fautes(banc, [...mesures, { g: "glisser", quoi: "ecran", x: 68.6 }, { g: "taille", v: 4.5 }])).toEqual([]);
    // la lentille déplacée de 5 mm, l'image remise au point : la taille ne va plus avec aucune mesure
    const deplacee = regles.bilan(banc, joue(banc, [...mesures, { g: "glisser", quoi: "ecran", x: 120 }, { g: "glisser", quoi: "a", x: 28.5 }, { g: "glisser", quoi: "ecran", x: 67.1 }, { g: "taille", v: 4.2 }]));
    expect(deplacee.fautes.map((f) => f.code)).toEqual(["taille"]);
    expect(deplacee.fautes[0].texte).toContain("après avoir déplacé");
    // la règle posée sur la deuxième mesure : la taille va avec elle, et la suite le sait
    const deuxieme = regles.bilan(banc, joue(banc, [...preparer, ...mesure(banc, 30), ...mesure(banc, 18), ...mesure(banc, 24), { g: "taille", v: 2.2 }, ...mesure(banc, 18)]));
    expect(deuxieme.fautes).toEqual([]);
    expect([deuxieme.mesures.xlt, deuxieme.mesures.xet, deuxieme.mesures.t]).toEqual([34, 60.1, 2.2]);
    expect(deuxieme.lignes[3]).toBe("Taille de l'image à la mesure n° 3 : 2,2 cm.");
    // sans taille notée, le professeur donne celle que prévoient les positions de la dernière mesure
    expect(regles.bilan(banc, joue(banc, mesures)).mesures.t).toBe(4.5);
    // un banc qui ne demande pas la taille ne la réclame pas
    const sansTaille: ReglagesOptique = { ...banc, but: { genre: "focale", lentille: "cible", mesures: 3, distances: [30, 24, 18], taille: false } };
    const b = regles.bilan(sansTaille, joue(sansTaille, mesures));
    expect([b.fautes, b.mesures.t, b.lignes.length]).toEqual([[], undefined, 3]);
  });
  it("les étiquettes des montures", () => {
    expect([vergence(8), vergence(-8), vergence(2.5)]).toEqual(["+8 δ", "−8 δ", "+2,5 δ"]);
    expect(lentilleDe(banc, "cible")?.f).toBe(12.5);
    expect(lentilleDe(banc, "absente")).toBeNull();
    expect(lentilleDe(banc, null)).toBeNull();
  });
});

describe("le TP « une lentille à contrôler »", () => {
  const manipulation = (etape: EtapeDePaillasse): GesteBrut[] => soignee(etape.paillasse.reglages as ReglagesOptique);
  it("passe les contrôles communs à tous les TP", async () => {
    await controlesCommuns(focale, REGLES);
  });
  it("fait avec soin, le TP donne A partout, quelle que soit la lentille tirée", async () => {
    const focales = new Set<number>();
    for (const graine of GRAINES) {
      const partie = await joueJuste(focale, graine, manipulation, REGLES);
      expect(partie.scores.every((s) => s === 1), `graine ${graine} : ${partie.scores.join(" ")}`).toBe(true);
      expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "A", VAL: "A" });
      expect(partie.fautes).toEqual([[]]);
      const m = partie.mesures;
      focales.add(Math.round(10 / (1 / (m.xl1 - m.xo1) + 1 / (m.xe1 - m.xl1))) / 10);
    }
    // la graine change bien la lentille : six distances focales possibles
    expect(focales.size).toBe(6);
  });
  it("chaque mesure soignée redonne la distance focale cachée, à mieux que 1 % près", async () => {
    for (const graine of GRAINES) {
      const etape = focale.etapes(graine).find((e) => e.genre === "paillasse") as EtapeDePaillasse;
      const r = etape.paillasse.reglages as ReglagesOptique;
      const f = lentilleDe(r, "cible")!.f;
      const m = regles.bilan(r, joue(r, soignee(r))).mesures;
      for (const k of [1, 2, 3]) expect(Math.abs(1 / (1 / (m[`xl${k}`] - m[`xo${k}`]) + 1 / (m[`xe${k}`] - m[`xl${k}`])) - f) / f).toBeLessThan(0.01);
      // les distances du protocole donnent une image qui tient sur le rail et sur l'écran
      expect(m.xe1 <= r.rail && m.xe2 <= r.rail && m.xe3 <= r.rail).toBe(true);
      expect(m.t).toBeLessThan(8);
    }
  });
  it("la conclusion se juge sur la mesure de l'élève : selon la lentille tirée, la monture est confirmée ou démentie", async () => {
    const conclusions = new Set<number>();
    for (const graine of GRAINES) {
      const partie = await joueJuste(focale, graine, manipulation, REGLES);
      const derniere = partie.retours[partie.retours.length - 1].correction;
      if (derniere.genre === "choix") conclusions.add(derniere.bonne);
    }
    expect(conclusions).toEqual(new Set([0, 1]));
  });
  it("une mise au point ratée change les valeurs attendues à l'exploitation, pas la justesse du calcul", async () => {
    // l'élève note une image floue : sa distance focale est fausse, mais son calcul, fait avec ses lectures, est juste
    const floue = (etape: EtapeDePaillasse): GesteBrut[] => {
      const r = etape.paillasse.reglages as ReglagesOptique;
      return [...preparer, ...mesure(r, 30, 4), ...mesure(r, 24, 4), ...mesure(r, 18, 4), { g: "taille", v: 3 }];
    };
    const partie = await joueJuste(focale, 6, floue, REGLES);
    expect(partie.fautes[0]).toContain("nettete");
    expect(partie.bilan.VAL).toBe("A");
    expect(partie.bilan.REA).not.toBe("A");
  });
});

// ---------- la lunette afocale ----------

/** Un banc pour construire une lunette : un objet lointain, deux supports, un œil fictif ; objectif de 3 δ, oculaire de 10 δ. */
const lunette: ReglagesOptique = {
  rail: 120, source: { genre: "lointain", x: 12, angle: 0.12 },
  boite: [{ id: "c10", etiquette: 10, f: 10 }, { id: "d10", etiquette: -10, f: -10 }, { id: "c3", etiquette: 3, f: 100 / 3 }],
  supports: [20, 46], recepteur: { genre: "oeil", x: 104, f: 12.5 }, but: { genre: "lunette", objectif: "c3", oculaire: "c10" },
};
const eclairer: GesteBrut[] = [{ g: "salle", on: false }, { g: "lampe", on: true }];
/** Monte les deux lentilles, écarte l'oculaire de `ecart` centimètres de la position afocale, note les deux positions. */
function monter(r: ReglagesOptique, ecart = 0, a = (r.but as { objectif: string }).objectif, b = (r.but as { oculaire: string }).oculaire): GesteBrut[] {
  const [f1, f2] = [lentilleDe(r, a)!.f, lentilleDe(r, b)!.f];
  const x2 = mm(r.supports[0] + Math.abs(f1) + Math.abs(f2) + ecart);
  return [{ g: "poser", lentille: a, sur: "a" }, { g: "poser", lentille: b, sur: "b" }, { g: "glisser", quoi: "b", x: x2 }, { g: "releve", a: r.supports[0], b: x2 }];
}
/** La manipulation soignée : l'image sans lunette, la lunette afocale, ses positions, l'image à travers elle. */
function lunetteSoignee(r: ReglagesOptique): GesteBrut[] {
  if (r.but.genre !== "lunette" || r.source.genre !== "lointain" || r.recepteur.genre !== "oeil") throw new Error("ce banc ne construit pas une lunette");
  const sans = r.recepteur.f * r.source.angle;
  const G = lentilleDe(r, r.but.objectif)!.f / lentilleDe(r, r.but.oculaire)!.f;
  return [...eclairer, { g: "taille", v: mm(sans) }, ...monter(r), { g: "taille", v: mm(sans * G) }];
}

describe("le bilan d'une lunette afocale", () => {
  it("une manipulation soignée n'a aucune faute, et l'élève emporte ses positions et ses deux tailles", () => {
    const b = regles.bilan(lunette, joue(lunette, lunetteSoignee(lunette)));
    expect(b.fautes).toEqual([]);
    expect(b.score).toBe(1);
    // objectif à 20,0 cm, oculaire 43,3 cm plus loin ; l'image passe de 1,5 cm à 5,0 cm
    expect(b.mesures).toEqual({ x1: 20, x2: 63.3, y0: 1.5, y1: 5 });
    expect(b.lignes).toEqual(["Sans la lunette, l'image mesure 1,5 cm.", "Objectif à 20,0 cm, oculaire à 63,3 cm.", "À travers la lunette, l'image mesure 5,0 cm."]);
  });
  it("sans rien noter, la manipulation vaut zéro, et le professeur donne ses mesures", () => {
    const b = regles.bilan(lunette, joue(lunette, [...eclairer, { g: "poser", lentille: "c3", sur: "a" }]));
    expect(b.score).toBe(0);
    expect(b.fautes.map((f) => f.code)).toEqual(["mesures"]);
    expect(b.mesures).toEqual({ x1: 20, x2: 63.3, y0: 1.5, y1: 5 });
    expect(b.lignes[1]).toContain("Positions données par le professeur");
  });
  it("une lunette mal réglée n'est pas afocale : légère près de la netteté, importante loin", () => {
    const avec = (ecart: number, taille: number) => fautes(lunette, [...eclairer, { g: "taille", v: 1.5 }, ...monter(lunette, ecart), { g: "taille", v: taille }]);
    // 0,3 cm d'écart reste net ; 0,8 cm est flou ; 2 cm est très flou
    expect(avec(0.3, 5)).toEqual([]);
    expect(avec(0.8, 5)).toEqual(["afocale"]);
    expect(avec(-2, 5)).toEqual(["afocale!", "image"]);
    const texte = regles.bilan(lunette, joue(lunette, [...eclairer, { g: "taille", v: 1.5 }, ...monter(lunette, 0.8)])).fautes[0].texte;
    expect(texte).toContain("à 44,1 cm l'une de l'autre ; il fallait 43,3 cm");
  });
  it("le choix des lentilles : une divergente, la lunette montée à l'envers, une lentille qui manque", () => {
    const debut: GesteBrut[] = [...eclairer, { g: "taille", v: 1.5 }];
    const divergente = regles.bilan(lunette, joue(lunette, [...debut, ...monter(lunette, 0, "c3", "d10"), { g: "taille", v: 3 }]));
    expect(divergente.fautes.map((f) => f.code)).toContain("lentilles");
    expect(divergente.fautes.find((f) => f.code === "lentilles")!.texte).toContain("−10 δ");
    const envers = regles.bilan(lunette, joue(lunette, [...debut, ...monter(lunette, 0, "c10", "c3"), { g: "taille", v: 0.5 }]));
    expect(envers.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["lentilles!"]);
    expect(envers.fautes[0].texte).toContain("à l'envers");
    // à l'envers, l'image est plus petite que sans la lunette
    expect(Math.abs(imageSurEcran(lunette, joue(lunette, [...debut, ...monter(lunette, 0, "c10", "c3")])).taille)).toBeCloseTo(0.45, 2);
    const seule = fautes(lunette, [...debut, { g: "poser", lentille: "c3", sur: "a" }, { g: "releve", a: 20, b: 46 }]);
    expect(seule).toEqual(["lentilles!", "image!"]);
  });
  it("les mesures oubliées ou mal lues : la référence sans lunette, les positions, l'image", () => {
    expect(fautes(lunette, lunetteSoignee(lunette).filter((g) => !(g.g === "taille" && g.v === 1.5)))).toEqual(["reference!"]);
    expect(fautes(lunette, lunetteSoignee(lunette).map((g) => (g.g === "taille" && g.v === 1.5 ? { ...g, v: 1.7 } : g)))).toEqual(["reference"]);
    expect(fautes(lunette, lunetteSoignee(lunette).map((g) => (g.g === "taille" && g.v === 1.5 ? { ...g, v: 2.5 } : g)))).toEqual(["reference!"]);
    expect(fautes(lunette, lunetteSoignee(lunette).filter((g) => g.g !== "releve"))).toEqual(["releve!"]);
    expect(fautes(lunette, lunetteSoignee(lunette).map((g) => (g.g === "releve" ? { ...g, b: 63.7 } : g)))).toEqual(["lecture"]);
    expect(fautes(lunette, lunetteSoignee(lunette).map((g) => (g.g === "releve" ? { ...g, a: 30 } : g)))).toEqual(["lecture!"]);
    expect(fautes(lunette, lunetteSoignee(lunette).slice(0, -1))).toEqual(["image!"]);
    expect(fautes(lunette, [...lunetteSoignee(lunette).slice(0, -1), { g: "taille", v: 5.4 }])).toEqual(["image"]);
    expect(fautes(lunette, [...lunetteSoignee(lunette).slice(0, -1), { g: "taille", v: 3 }])).toEqual(["image!"]);
    // lampe éteinte : rien à mesurer
    expect(fautes(lunette, lunetteSoignee(lunette).filter((g) => g.g !== "lampe"))).toEqual(["lampe!", "lampe!"]);
    // des positions notées dans le désordre : la suite garde celles du professeur
    const desordre = regles.bilan(lunette, joue(lunette, lunetteSoignee(lunette).map((g) => (g.g === "releve" ? { ...g, a: 63.3, b: 20 } : g))));
    expect([desordre.mesures.x1, desordre.mesures.x2]).toEqual([20, 63.3]);
  });
});

describe("le TP « une lunette sur le banc d'optique »", () => {
  const manipulation = (etape: EtapeDePaillasse): GesteBrut[] => lunetteSoignee(etape.paillasse.reglages as ReglagesOptique);
  it("passe les contrôles communs à tous les TP", async () => {
    await controlesCommuns(lunetteTp, REGLES);
  });
  it("fait avec soin, le TP donne A partout, quelles que soient les lentilles tirées", async () => {
    const grossissements = new Set<number>();
    const conclusions = new Set<number>();
    for (const graine of GRAINES) {
      const partie = await joueJuste(lunetteTp, graine, manipulation, REGLES);
      expect(partie.scores.every((s) => s === 1), `graine ${graine} : ${partie.scores.join(" ")}`).toBe(true);
      expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "A", VAL: "A" });
      expect(partie.fautes).toEqual([[]]);
      grossissements.add(Math.round((10 * partie.mesures.y1) / partie.mesures.y0) / 10);
      const derniere = partie.retours[partie.retours.length - 1].correction;
      if (derniere.genre === "choix") conclusions.add(derniere.bonne);
    }
    // la graine change bien les lentilles : quatre grossissements, et une conclusion qui dépend d'eux
    expect(grossissements).toEqual(new Set([2, 2.5, 4, 5]));
    expect(conclusions).toEqual(new Set([0, 1]));
  });
  it("chaque lunette du TP tient sur le rail, et son image sur l'écran et sous la règle", () => {
    for (const graine of GRAINES) {
      const etape = lunetteTp.etapes(graine).find((e) => e.genre === "paillasse") as EtapeDePaillasse;
      const r = etape.paillasse.reglages as ReglagesOptique;
      const m = regles.bilan(r, joue(r, lunetteSoignee(r))).mesures;
      expect(m.x2).toBeLessThanOrEqual(course(r, joue(r, []), "b")![1]);
      expect(m.y1).toBeLessThanOrEqual(8);
    }
  });
});
