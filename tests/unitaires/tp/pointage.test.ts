// La paillasse « pointage » (lib/commun/tp/paillasses/pointage.ts) et son TP : une chute filmée.
// Les manipulations sont jouées ici sans le navigateur, geste par geste.
import { describe, expect, it } from "vitest";
import { CAMERA, G, POINTES_MIN, boutsEtalon, centres, dansImage, date, droiteJuste, echelle, grandeurs, moindresCarres, positions, reference, regles, trajectoire, type EtatPointage, type ReglagesPointage } from "@/lib/commun/tp/paillasses/pointage";
import { rejoue, type GesteBrut } from "@/lib/commun/tp/types";
import chute from "@/lib/serveur/contenu/tp/chute";
import { GRAINES, controlesCommuns, joue as joueTp, joueJuste, juste, type EtapeDePaillasse } from "../../outils/tp";

// une balle de golf lâchée sans vitesse, et une boule de polystyrène que l'air freine ; un étalon d'un mètre
const golf: ReglagesPointage = { balle: "la balle de golf", rayon: 0.0215, couleur: "#F3ECE6", masse: 46, x0: 0.8, y0: 1.85, vx: 0, vy: 0, limite: 0, images: 15, dt: 0.04, etalon: 1 };
const polystyrene: ReglagesPointage = { ...golf, balle: "la boule de polystyrène", rayon: 0.03, masse: 2, y0: 1.8, limite: 4.6, images: 16 };
const lancer: ReglagesPointage = { ...golf, balle: "la balle de tennis", masse: 58, x0: 0.25, y0: 0.5, vx: 1.7, vy: 3.6, images: 16 };
const joue = (r: ReglagesPointage, gestes: GesteBrut[]): EtatPointage => rejoue(regles, r, gestes);
const fautes = (r: ReglagesPointage, gestes: GesteBrut[]) => regles.bilan(r, joue(r, gestes)).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);
const dixieme = (x: number) => Math.round(x * 10) / 10;

// ---------- les gestes d'un élève soigneux ----------
/** Les deux repères sur les bouts de l'étalon, et sa longueur. `haut` décale le repère du sommet, en unités de l'image. */
function etalonner(r: ReglagesPointage, longueur = r.etalon, haut = 0): GesteBrut[] {
  const [pied, sommet] = boutsEtalon(r);
  return [{ g: "etalon", bout: "a", x: pied.x, y: pied.y }, { g: "etalon", bout: "b", x: sommet.x, y: sommet.y + haut }, { g: "longueur", v: longueur }];
}
/** L'origine sur le sol, au pied de l'étalon ; `haut` la décale vers le haut, en unités de l'image. */
const origine = (haut = 0): GesteBrut => ({ g: "origine", x: CAMERA.etalon, y: CAMERA.sol - haut });
/** Le pointé de chaque image, au centre de la balle ; `ecart` décale chaque pointé, `sauf` saute des images. */
const pointer = (r: ReglagesPointage, ecart: (i: number) => { x: number; y: number } = () => ({ x: 0, y: 0 }), sauf: number[] = []): GesteBrut[] =>
  centres(r).flatMap((c, i) => (sauf.includes(i) ? [] : [{ g: "pointer", i, x: c.x + ecart(i).x, y: c.y + ecart(i).y }]));
/** La droite réglée au mieux sur les points de l'élève, ses bouts posés au vingtième de m/s ; `biais` fausse sa pente. */
function droite(r: ReglagesPointage, avant: GesteBrut[], biais = 0): GesteBrut {
  const d = droiteJuste(r, joue(r, avant))!;
  const vingtieme = (x: number) => Math.round(x * 20) / 20;
  return { g: "droite", va: vingtieme(d.ordonnee), vb: vingtieme(d.ordonnee + (d.pente + biais) * date(r, r.images - 1)) };
}
/** L'énergie mécanique lue au premier et au dernier point ; `facteur` fausse la lecture. */
function energies(r: ReglagesPointage, avant: GesteBrut[], facteur = 1): GesteBrut[] {
  const tout = grandeurs(r, joue(r, avant));
  return [{ g: "noter", quoi: "debut", v: dixieme(tout[0].Em * facteur) }, { g: "noter", quoi: "fin", v: dixieme(tout[tout.length - 1].Em) }];
}
/** L'exploitation des courbes, après un étalonnage et un pointage donnés. */
const exploiter = (r: ReglagesPointage, avant: GesteBrut[]): GesteBrut[] => [...avant, droite(r, avant), ...energies(r, avant)];
/** La manipulation soignée d'un film. */
const soignee = (r: ReglagesPointage): GesteBrut[] => exploiter(r, [...etalonner(r), origine(), ...pointer(r)]);

describe("le film", () => {
  it("sans frottement, la balle suit la parabole de la chute libre", () => {
    const images = trajectoire(lancer);
    expect(images.length).toBe(16);
    for (const m of images) {
      expect(m.x).toBeCloseTo(0.25 + 1.7 * m.t, 9);
      expect(m.y).toBeCloseTo(0.5 + 3.6 * m.t - 0.5 * G * m.t ** 2, 9);
      expect(m.vy).toBeCloseTo(3.6 - G * m.t, 9);
    }
    expect(date(lancer, 5)).toBeCloseTo(0.2, 12);
  });
  it("l'air freine la boule légère : elle tombe moins vite, et sa vitesse reste sous sa vitesse limite", () => {
    const libre = trajectoire({ ...polystyrene, limite: 0 }), freinee = trajectoire(polystyrene);
    const fin = freinee.length - 1;
    expect(freinee[fin].y).toBeGreaterThan(libre[fin].y + 0.25);
    expect(Math.abs(freinee[fin].vy)).toBeLessThan(4.6);
    expect(Math.abs(freinee[fin].vy)).toBeGreaterThan(3.5);
    // la chute d'un corps freiné par l'air, avec une force en v² : v = v_lim × tanh(g × t / v_lim)
    expect(Math.abs(freinee[fin].vy)).toBeCloseTo(4.6 * Math.tanh((G * 0.6) / 4.6), 6);
  });
  it("la caméra place le sol, l'étalon et la balle dans l'image", () => {
    expect(dansImage(0, 0)).toEqual({ x: 40, y: 446 });
    expect(boutsEtalon(golf)).toEqual([{ x: 40, y: 446 }, { x: 40, y: 241 }]);
    const balle = centres(golf);
    expect(balle[0]).toEqual({ x: 204, y: 446 - 1.85 * 205 });
    // toute la course de la balle tient dans l'image
    for (const r of [golf, polystyrene, lancer]) for (const c of centres(r)) expect(c.x > 10 && c.x < CAMERA.l - 10 && c.y > 10 && c.y < CAMERA.sol).toBe(true);
  });
  it("un pointage sans défaut donne la pente −g et une énergie mécanique constante en chute libre, pas quand l'air freine", () => {
    expect(reference(golf)).toEqual({ pente: -9.81, Em0: 834.8, Em1: 834.8 });
    const freinee = reference(polystyrene);
    expect(freinee.pente).toBeGreaterThan(-7.5);
    expect(freinee.Em1).toBeLessThan(0.8 * freinee.Em0);
  });
});

describe("le logiciel de pointage", () => {
  it("sans longueur d'étalon, pas d'échelle ni de courbes", () => {
    const etat = joue(golf, [...etalonner(golf).slice(0, 2), origine(), ...pointer(golf)]);
    expect([echelle(etat), positions(golf, etat), grandeurs(golf, etat), droiteJuste(golf, etat)]).toEqual([null, [], [], null]);
    // deux repères au même endroit ne font pas une échelle non plus
    expect(echelle(joue(golf, [{ g: "etalon", bout: "a", x: 100, y: 100 }, { g: "etalon", bout: "b", x: 100, y: 100.4 }, { g: "longueur", v: 1 }]))).toBeNull();
  });
  it("avec l'échelle et l'origine, les pointés deviennent des positions en mètres", () => {
    const etat = joue(golf, [...etalonner(golf), origine(), ...pointer(golf)]);
    expect(echelle(etat)).toBeCloseTo(1 / 205, 9);
    const p = positions(golf, etat);
    expect(p.length).toBe(15);
    expect(p[0].x).toBeCloseTo(0.8, 3);
    expect(p[0].y).toBeCloseTo(1.85, 3);
    expect(p[5]).toMatchObject({ image: 5, t: 0.2 });
  });
  it("la vitesse se prend entre le point d'avant et le point d'après ; les énergies suivent", () => {
    const etat = joue(golf, [...etalonner(golf), origine(), ...pointer(golf)]);
    const tout = grandeurs(golf, etat);
    // ni le premier ni le dernier point n'ont de vitesse
    expect(tout.map((p) => p.image)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    for (const p of tout) {
      expect(p.vy).toBeCloseTo(-G * p.t, 1);
      expect(p.vx).toBeCloseTo(0, 6);
      expect(p.Ec).toBeCloseTo(0.5 * 46 * p.vy ** 2, 9);
      expect(p.Epp).toBeCloseTo(46 * G * p.y, 9);
      expect(p.Em).toBeCloseTo(834.8, -1);
    }
    expect(droiteJuste(golf, etat)!.pente).toBeCloseTo(-9.81, 1);
  });
  it("la droite des moindres carrés passe au mieux par les points", () => {
    expect(moindresCarres([{ t: 0, v: 1 }, { t: 1, v: 3 }, { t: 2, v: 5 }])).toEqual({ pente: 2, ordonnee: 1 });
    const d = moindresCarres([{ t: 0, v: 0 }, { t: 1, v: 1 }, { t: 2, v: 0 }])!;
    expect([d.pente, d.ordonnee]).toEqual([0, 1 / 3]);
    expect(moindresCarres([{ t: 1, v: 2 }])).toBeNull();
    expect(moindresCarres([{ t: 1, v: 2 }, { t: 1, v: 4 }])).toBeNull();
    expect(moindresCarres([])).toBeNull();
  });
  it("un étalon compté deux fois trop long double toutes les distances : la pente double, les énergies quadruplent", () => {
    const juste = joue(golf, [...etalonner(golf), origine(), ...pointer(golf)]);
    const double = joue(golf, [...etalonner(golf, 2), origine(), ...pointer(golf)]);
    expect(droiteJuste(golf, double)!.pente).toBeCloseTo(2 * droiteJuste(golf, juste)!.pente, 6);
    expect(grandeurs(golf, double)[6].Ec).toBeCloseTo(4 * grandeurs(golf, juste)[6].Ec, 6);
  });
  it("une image sautée fausse la vitesse de ses voisines : l'écart entre les deux points n'est plus centré", () => {
    const etat = joue(golf, [...etalonner(golf), origine(), ...pointer(golf, undefined, [6])]);
    const tout = grandeurs(golf, etat);
    expect(tout.map((p) => p.image)).toEqual([1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13]);
    const voisine = tout.find((p) => p.image === 5)!;
    expect(Math.abs(voisine.vy - -G * voisine.t)).toBeGreaterThan(0.15);
    expect(Math.abs(tout[0].vy - -G * tout[0].t)).toBeLessThan(0.02);
  });
  it("une origine posée trop haut décale l'énergie potentielle, pas la vitesse", () => {
    const sol = grandeurs(golf, joue(golf, [...etalonner(golf), origine(), ...pointer(golf)]));
    const haut = grandeurs(golf, joue(golf, [...etalonner(golf), origine(41), ...pointer(golf)]));
    expect(haut[3].vy).toBeCloseTo(sol[3].vy, 9);
    expect(sol[3].Epp - haut[3].Epp).toBeCloseTo(46 * G * 0.2, 6);
  });
});

describe("les gestes", () => {
  it("un repère, l'origine ou un pointé restent dans l'image, au dixième d'unité", () => {
    const etat = joue(golf, [{ g: "etalon", bout: "a", x: 40.26, y: 445.96 }, { g: "origine", x: 12.34, y: 400 }, { g: "pointer", i: 3, x: 200.05, y: 99.94 }]);
    expect([etat.a, etat.origine, etat.posee, etat.pointes[3]]).toEqual([{ x: 40.3, y: 446 }, { x: 12.3, y: 400 }, true, { x: 200.1, y: 99.9 }]);
  });
  it("un nouveau pointé remplace l'ancien ; deux déplacements à la suite valent le dernier : la liste des gestes peut les regrouper", () => {
    expect(joue(golf, [{ g: "pointer", i: 2, x: 10, y: 10 }, { g: "pointer", i: 2, x: 204, y: 80 }])).toEqual(joue(golf, [{ g: "pointer", i: 2, x: 204, y: 80 }]));
    expect(joue(golf, [{ g: "etalon", bout: "b", x: 60, y: 300 }, { g: "etalon", bout: "b", x: 40, y: 241 }, { g: "origine", x: 9, y: 9 }, { g: "origine", x: 40, y: 446 }]))
      .toEqual(joue(golf, [{ g: "etalon", bout: "b", x: 40, y: 241 }, { g: "origine", x: 40, y: 446 }]));
  });
  it("la droite et les énergies ne se gardent que lorsque les courbes existent", () => {
    const sans = joue(golf, [...etalonner(golf), origine(), ...pointer(golf).slice(0, 3)]);
    expect(regles.geste(golf, sans, { g: "droite", va: 0, vb: -5 })).toBe(sans);
    expect(regles.geste(golf, sans, { g: "noter", quoi: "debut", v: 800 })).toBe(sans);
    const avec = joue(golf, [...etalonner(golf), origine(), ...pointer(golf), { g: "droite", va: 0, vb: -5.6 }, { g: "noter", quoi: "fin", v: 830 }]);
    expect(avec.droite).toMatchObject({ pente: -10, ordonnee: 0 });
    expect(avec.droite!.juste).toBeCloseTo(-9.81, 1);
    expect(avec.fin!.note).toBe(830);
    expect(avec.fin!.calcul).toBeCloseTo(834.8, -1);
  });
  it("un geste inconnu, mal formé ou hors bornes ne change rien", () => {
    const bizarres: GesteBrut[] = [
      { g: "filmer" }, { g: "etalon", bout: "c", x: 10, y: 10 }, { g: "etalon", bout: "a", x: -4, y: 10 }, { g: "etalon", bout: "a", x: 10 }, { g: "longueur", v: 0 }, { g: "longueur", v: 500 }, { g: "longueur" },
      { g: "origine", x: 10, y: 900 }, { g: "origine", x: "ici", y: 3 }, { g: "pointer", i: 15, x: 10, y: 10 }, { g: "pointer", i: 1.5, x: 10, y: 10 }, { g: "pointer", i: -1, x: 10, y: 10 }, { g: "pointer", x: 10, y: 10 },
      { g: "pointer", i: 2, x: 400, y: 10 }, { g: "droite", va: 0, vb: -5 }, { g: "noter", quoi: "debut", v: 3 },
    ];
    expect(joue(golf, bizarres)).toEqual(joue(golf, []));
    const etat = joue(golf, soignee(golf));
    for (const g of [...bizarres.slice(0, 14), { g: "droite", va: 80, vb: 0 }, { g: "droite", va: 0 }, { g: "noter", quoi: "milieu", v: 3 }, { g: "noter", quoi: "debut", v: -3 }, { g: "noter", quoi: "fin" }] as GesteBrut[]) expect(regles.geste(golf, etat, g)).toBe(etat);
  });
});

describe("le bilan", () => {
  it("une exploitation soignée n'a aucune faute", () => {
    const b = regles.bilan(golf, joue(golf, soignee(golf)));
    expect(b.fautes).toEqual([]);
    expect(b.score).toBe(1);
    expect(b.mesures.pente).toBeCloseTo(-9.81, 1);
    expect(b.mesures.Em0).toBeCloseTo(834.8, 0);
    expect(Math.abs(b.mesures.Em1 - b.mesures.Em0) / b.mesures.Em0).toBeLessThan(0.01);
    expect(b.lignes[0]).toContain("−9,8");
  });
  it("sans rien faire, la manipulation vaut zéro, et le professeur donne ses valeurs", () => {
    const b = regles.bilan(golf, joue(golf, []));
    expect(b.score).toBe(0);
    expect(b.fautes.map((f) => f.code)).toEqual(["pointage"]);
    expect(b.mesures).toEqual({ pente: -9.81, Em0: 834.8, Em1: 834.8 });
  });
  it("un étalonnage faux : une longueur mal dite, des repères mal posés, pas de longueur du tout", () => {
    const avec = (etalonnage: GesteBrut[]) => fautes(golf, exploiter(golf, [...etalonnage, origine(), ...pointer(golf)]));
    expect(avec(etalonner(golf, 0.5))).toEqual(["etalon!"]);
    expect(avec(etalonner(golf, 1, 3))).toEqual([]);
    expect(avec(etalonner(golf, 1, 8))).toEqual(["etalon"]);
    expect(avec(etalonner(golf, 1, 30))).toEqual(["etalon!"]);
    // sans longueur, il n'y a pas de courbes : ni droite, ni énergies
    expect(fautes(golf, [...etalonner(golf).slice(0, 2), origine(), ...pointer(golf)])).toEqual(["etalon!", "droite!", "energie!"]);
    const texte = regles.bilan(golf, joue(golf, exploiter(golf, [...etalonner(golf, 0.5), origine(), ...pointer(golf)]))).fautes[0].texte;
    expect(texte).toContain("0,50 m à un étalon de 1,00 m");
  });
  it("une origine oubliée, ou posée loin du sol", () => {
    const avec = (o: GesteBrut[]) => fautes(golf, exploiter(golf, [...etalonner(golf), ...o, ...pointer(golf)]));
    expect(avec([])).toEqual(["origine!"]);
    expect(avec([origine(4)])).toEqual([]);
    expect(avec([origine(10)])).toEqual(["origine"]);
    expect(avec([origine(-10)])).toEqual(["origine"]);
    expect(avec([origine(40)])).toEqual(["origine!"]);
    // sa place le long du sol ne compte pas
    expect(avec([{ g: "origine", x: 250, y: 446 }])).toEqual([]);
  });
  it("des pointés bâclés, des images sautées, trop peu d'images", () => {
    // chaque pointé à la distance `a` du centre, dans une direction qui change d'une image à l'autre
    const autour = (a: number) => (i: number) => ({ x: a * Math.cos(2.4 * i), y: a * Math.sin(2.4 * i) });
    const avec = (pointage: GesteBrut[]) => fautes(golf, exploiter(golf, [...etalonner(golf), origine(), ...pointage]));
    expect(avec(pointer(golf, autour(1.5)))).toEqual([]);
    expect(avec(pointer(golf, autour(3)))).toEqual(["pointes"]);
    expect(avec(pointer(golf, autour(6)))).toEqual(["pointes!"]);
    expect(avec(pointer(golf, undefined, [4, 9]))).toEqual(["sautees"]);
    expect(avec(pointer(golf, undefined, [2, 4, 6, 9]))).toEqual(["sautees!"]);
    expect(fautes(golf, [...etalonner(golf), origine(), ...pointer(golf).slice(0, POINTES_MIN - 1)])).toEqual(["pointage!", "droite!", "energie!"]);
    expect(fautes(golf, [...etalonner(golf), origine()])).toEqual(["pointage!", "droite!", "energie!"]);
    // des pointés bâclés se voient dans les résultats : l'énergie mécanique ne paraît plus constante
    const bacle = regles.bilan(golf, joue(golf, exploiter(golf, [...etalonner(golf), origine(), ...pointer(golf, autour(6))])));
    expect(Math.abs(bacle.mesures.Em1 - bacle.mesures.Em0) / bacle.mesures.Em0).toBeGreaterThan(0.05);
    expect(bacle.fautes[0].texte).toMatch(/en moyenne à 2,9 cm du centre/);
  });
  it("une droite mal ajustée, une énergie mal lue", () => {
    const avant: GesteBrut[] = [...etalonner(golf), origine(), ...pointer(golf)];
    expect(fautes(golf, [...avant, droite(golf, avant, 0.2), ...energies(golf, avant)])).toEqual([]);
    expect(fautes(golf, [...avant, droite(golf, avant, 0.7), ...energies(golf, avant)])).toEqual(["droite"]);
    expect(fautes(golf, [...avant, droite(golf, avant, -3), ...energies(golf, avant)])).toEqual(["droite!"]);
    expect(fautes(golf, [...avant, ...energies(golf, avant)])).toEqual(["droite!"]);
    expect(fautes(golf, [...avant, droite(golf, avant), ...energies(golf, avant, 1.03)])).toEqual(["lecture"]);
    expect(fautes(golf, [...avant, droite(golf, avant), ...energies(golf, avant, 0.5)])).toEqual(["lecture!"]);
    expect(fautes(golf, [...avant, droite(golf, avant), energies(golf, avant)[0]])).toEqual(["energie!"]);
    expect(fautes(golf, [...avant, droite(golf, avant)])).toEqual(["energie!"]);
  });
  it("quand l'air freine la balle, la manipulation soignée le montre : une pente loin de −g, une énergie qui baisse", () => {
    const b = regles.bilan(polystyrene, joue(polystyrene, soignee(polystyrene)));
    expect(b.fautes).toEqual([]);
    expect(b.mesures.pente).toBeGreaterThan(-7.5);
    expect(b.mesures.Em1).toBeLessThan(0.8 * b.mesures.Em0);
  });
});

describe("le TP de la chute filmée", () => {
  // le TP est en construction : il n'est pas inscrit dans l'application, le test donne donc ses règles
  const REGLES = { pointage: regles };
  const manipulation = (etape: EtapeDePaillasse): GesteBrut[] => soignee(etape.paillasse.reglages as ReglagesPointage);
  it("a la forme d'un TP : une situation à lire, les quatre compétences, rien de la réponse dans le navigateur, D partout sans rien faire", async () => {
    await controlesCommuns(chute, REGLES);
  });
  it("fait avec soin, le TP donne A partout, quel que soit le film tiré", async () => {
    const films = new Set<string>();
    const conclusions = new Set<number>();
    for (const graine of GRAINES) {
      const partie = await joueJuste(chute, graine, manipulation, REGLES);
      expect(partie.scores.every((s) => s === 1), `graine ${graine} : ${partie.scores.join(" ")}`).toBe(true);
      expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "A", VAL: "A" });
      expect(partie.fautes).toEqual([[]]);
      films.add(`${partie.mesures.pente} ${partie.mesures.Em0}`);
      const derniere = partie.retours[partie.retours.length - 1].correction;
      if (derniere.genre === "choix") conclusions.add(derniere.bonne);
    }
    // la graine change le film et l'étalon ; selon la balle, les frottements sont négligeables ou non
    expect(films.size).toBeGreaterThanOrEqual(4);
    expect(conclusions).toEqual(new Set([0, 1]));
  });
  it("une balle en chute libre appelle « Oui », une balle freinée par l'air « Non »", async () => {
    // les graines 4 et 2 tirent les deux chutes libres, les graines 1 et 3 les deux balles légères
    for (const [graine, attendue] of [[4, 0], [2, 0], [1, 1], [3, 1]]) {
      const partie = await joueJuste(chute, graine, manipulation, REGLES);
      const derniere = partie.retours[partie.retours.length - 1].correction;
      expect(derniere.genre === "choix" && derniere.bonne, `graine ${graine}`).toBe(attendue);
    }
  });
  it("un étalon mal compté se voit dans l'exploitation : elle se calcule avec les valeurs de l'élève", async () => {
    // la graine 4 tire la balle de golf, en chute libre ; l'élève donne 1,60 m à un étalon de 0,80 m
    const fausse = (etape: EtapeDePaillasse): GesteBrut[] => {
      const r = etape.paillasse.reglages as ReglagesPointage;
      return exploiter(r, [...etalonner(r, 2 * r.etalon), origine(), ...pointer(r)]);
    };
    const partie = await joueTp(chute, 4, (etape, publique, mesures) => juste(etape, publique, mesures, fausse), REGLES);
    expect(partie.fautes).toEqual([["etalon"]]);
    expect(partie.bilan.REA).toBe("C");
    expect(partie.bilan.VAL).toBe("A");
    // la pente trouvée est le double de g : l'écart relatif vaut 100 %
    expect(partie.mesures.pente).toBeCloseTo(-19.6, 0);
    const ecart = partie.retours[partie.retours.length - 3].correction;
    expect(ecart.genre === "valeur" && ecart.attendu).toMatch(/^(99|100|101),\d %$/);
  });
});
