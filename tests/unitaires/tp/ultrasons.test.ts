// La paillasse « ultrasons » (lib/commun/tp/paillasses/ultrasons.ts) et son TP : un télémètre à régler.
// Les manipulations sont jouées ici sans le navigateur, geste par geste.
import { describe, expect, it } from "vitest";
import { BASES, CABLES, CALIBRES, RAIL, amplitudeRecue, celerite, comparable, dephasage, ecran, emet, hauteurs, longueurOnde, mesuresDuProfesseur, periode, periodesVues, premiereCoincidence, regles, signalVoie, type EtatUltrasons, type ReglagesUltrasons } from "@/lib/commun/tp/paillasses/ultrasons";
import { rejoue, type GesteBrut } from "@/lib/commun/tp/types";
import ultrasons from "@/lib/serveur/contenu/tp/ultrasons";
import { GRAINES, controlesCommuns, joue as joueTp, joueJuste, juste, type EtapeDePaillasse } from "../../outils/tp";

// une salle à 20 °C, un émetteur à 40 kHz : T = 25 µs, v = 343,64 m/s, λ = 8,591 mm
const salle: ReglagesUltrasons = { f: 40000, theta: 20, fixe: -11.5 };
const joue = (r: ReglagesUltrasons, gestes: GesteBrut[]): EtatUltrasons => rejoue(regles, r, gestes);
const fautes = (r: ReglagesUltrasons, gestes: GesteBrut[]) => regles.bilan(r, joue(r, gestes)).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);
const dixieme = (x: number) => Math.round(x * 10) / 10;
/** Ce qu'un élève soigneux lit sur le rail, au demi-millimètre près, en centimètres. */
const lu = (x: number) => Math.round(x * 2) / 20;

// ---------- les gestes d'un élève soigneux ----------
const cabler: GesteBrut[] = [{ g: "relier", a: "gen", b: "em" }, { g: "relier", a: "r1", b: "y1" }, { g: "relier", a: "r2", b: "y2" }];
/** 50 mV par division sur chaque voie, 5 µs par division : deux périodes de quelques divisions de haut. */
const regler: GesteBrut[] = [{ g: "calibre", voie: 1, v: 2 }, { g: "calibre", voie: 2, v: 2 }, { g: "base", v: 2 }];
const noterPeriode = (r: ReglagesUltrasons): GesteBrut => ({ g: "noter", quoi: "periode", v: dixieme(periode(r)) });
/** Le récepteur mobile amené à une position, lue et notée. `ecart` décale l'arrêt ; `erreur` fausse la lecture, en millimètres. */
const position = (quoi: "depart" | "arrivee", x: number, erreur = 0): GesteBrut[] => [{ g: "glisser", x: dixieme(x) }, { g: "noter", quoi, v: lu(dixieme(x) + erreur) }];
/** Les deux positions en phase, à `n` longueurs d'onde l'une de l'autre, et le nombre compté. */
function longueurs(r: ReglagesUltrasons, n: number, compte = n): GesteBrut[] {
  const debut = premiereCoincidence(r);
  return [...position("depart", debut), ...position("arrivee", debut + n * longueurOnde(r)), { g: "noter", quoi: "nombre", v: compte }];
}
/** La manipulation soignée d'une situation. */
const soignee = (r: ReglagesUltrasons): GesteBrut[] => [...cabler, ...regler, noterPeriode(r), ...longueurs(r, 10)];

describe("l'onde", () => {
  it("la célérité suit la température, la longueur d'onde suit la célérité et la fréquence", () => {
    expect(celerite(salle)).toBeCloseTo(343.64, 6);
    expect(periode(salle)).toBeCloseTo(25, 9);
    expect(longueurOnde(salle)).toBeCloseTo(8.591, 6);
    expect(celerite({ ...salle, theta: 30 })).toBeGreaterThan(celerite(salle));
    expect(longueurOnde({ ...salle, f: 41000 })).toBeLessThan(longueurOnde(salle));
  });
  it("la première position en phase est sur la course du récepteur mobile, à un nombre entier de longueurs d'onde du récepteur fixe", () => {
    const debut = premiereCoincidence(salle);
    expect(debut).toBeGreaterThanOrEqual(RAIL.min);
    expect(debut).toBeLessThan(RAIL.min + longueurOnde(salle));
    expect((debut - salle.fixe) / longueurOnde(salle)).toBeCloseTo(3, 9);
    expect(mesuresDuProfesseur(salle)).toEqual({ T: 25, x0: 1.43, x1: 10.02, n: 10 });
  });
  it("le signal reçu faiblit quand le récepteur s'éloigne", () => {
    expect(amplitudeRecue(15)).toBeCloseTo(0.12, 9);
    expect(amplitudeRecue(100)).toBeLessThan(amplitudeRecue(20));
  });
});

describe("les câbles", () => {
  it("sans câble, aucun signal ; l'émetteur n'émet que relié à la sortie GÉN", () => {
    const vide = joue(salle, []);
    expect([emet(vide), signalVoie(salle, vide, 1), signalVoie(salle, vide, 2)]).toEqual([false, null, null]);
    // un récepteur branché, mais un émetteur sans alimentation : toujours rien
    const muet = joue(salle, [{ g: "relier", a: "r1", b: "y1" }]);
    expect([emet(muet), signalVoie(salle, muet, 1)]).toEqual([false, null]);
    const juste = joue(salle, cabler);
    expect(emet(juste)).toBe(true);
    expect(signalVoie(salle, juste, 1)).toEqual({ amplitude: amplitudeRecue(-11.5), retard: 0 });
    expect(signalVoie(salle, juste, 2)?.amplitude).toBeCloseTo(amplitudeRecue(30), 9);
    expect(comparable(juste)).toBe(true);
  });
  it("un câble se pose entre deux prises différentes, une seule fois, et il n'y en a que quatre", () => {
    expect(joue(salle, [{ g: "relier", a: "gen", b: "em" }, { g: "relier", a: "em", b: "gen" }]).fils).toEqual([["gen", "em"]]);
    expect(joue(salle, [{ g: "relier", a: "gen", b: "gen" }, { g: "relier", a: "gen", b: "lampe" }, { g: "relier", a: "gen" }]).fils).toEqual([]);
    const tous = joue(salle, [...cabler, { g: "relier", a: "y1", b: "y2" }, { g: "relier", a: "gen", b: "y1" }]);
    expect(tous.fils.length).toBe(CABLES);
    // un câble se retire dans un sens comme dans l'autre ; retirer un câble absent ne change rien
    expect(joue(salle, [...cabler, { g: "retirer", a: "y1", b: "r1" }]).fils).toEqual([["gen", "em"], ["r2", "y2"]]);
    const avant = joue(salle, cabler);
    expect(regles.geste(salle, avant, { g: "retirer", a: "gen", b: "y2" })).toBe(avant);
  });
  it("la sortie GÉN branchée sur une voie y montre son propre signal, et sert aussi de repère", () => {
    const gen = joue(salle, [{ g: "relier", a: "gen", b: "em" }, { g: "relier", a: "gen", b: "y1" }, { g: "relier", a: "r2", b: "y2" }]);
    expect(signalVoie(salle, gen, 1)?.amplitude).toBe(2.5);
    expect(comparable(gen)).toBe(true);
    // la sortie GÉN seule sur une voie, sans émetteur : un signal, mais rien à comparer
    const seul = joue(salle, [{ g: "relier", a: "gen", b: "y2" }]);
    expect([signalVoie(salle, seul, 1), signalVoie(salle, seul, 2)?.amplitude, comparable(seul)]).toEqual([null, 2.5, false]);
  });
  it("les deux récepteurs sur la même voie : leurs signaux s'ajoutent, et il n'y a plus rien à comparer", () => {
    const debut = dixieme(premiereCoincidence(salle));
    const melange = joue(salle, [{ g: "relier", a: "gen", b: "em" }, { g: "relier", a: "r1", b: "y1" }, { g: "relier", a: "r2", b: "r1" }, { g: "glisser", x: debut }]);
    expect(comparable(melange)).toBe(false);
    // en phase, les amplitudes s'ajoutent ; une demi-longueur d'onde plus loin, elles se retranchent
    expect(signalVoie(salle, melange, 1)?.amplitude).toBeCloseTo(amplitudeRecue(-11.5) + amplitudeRecue(debut), 3);
    const oppose = regles.geste(salle, melange, { g: "glisser", x: dixieme(debut + longueurOnde(salle) / 2) });
    expect(signalVoie(salle, oppose, 1)?.amplitude).toBeLessThan(0.03);
    expect(signalVoie(salle, oppose, 2)).toBeNull();
  });
});

describe("l'oscilloscope", () => {
  it("au départ il est mal réglé : des traits plats, des périodes trop serrées", () => {
    const etat = joue(salle, cabler);
    expect(hauteurs(salle, etat).every((h) => h > 0 && h < 0.05)).toBe(true);
    expect(periodesVues(salle, etat)).toBe(400);
  });
  it("la sensibilité fixe la hauteur du signal, la base de temps le nombre de périodes", () => {
    const etat = joue(salle, [...cabler, ...regler]);
    expect(hauteurs(salle, etat)[0]).toBeCloseTo(amplitudeRecue(-11.5) / 0.05, 9);
    expect(hauteurs(salle, etat)[1]).toBeCloseTo(amplitudeRecue(30) / 0.05, 9);
    expect(periodesVues(salle, etat)).toBe(2);
    expect(hauteurs(salle, regles.geste(salle, etat, { g: "calibre", voie: 2, v: 0 }))[1]).toBeGreaterThan(10);
    expect([BASES.length, CALIBRES.length]).toEqual([10, 9]);
  });
  it("l'écran se cale sur la voie 1 ; sans signal sur la voie 1, sur la voie 2", () => {
    const etat = joue(salle, [...cabler, { g: "glisser", x: 40 }]);
    const [a, b] = ecran(salle, etat);
    expect(a?.retard).toBe(0);
    expect(b?.retard).toBeCloseTo(((40 + 11.5) / longueurOnde(salle)) % 1, 9);
    const seule = joue(salle, [{ g: "relier", a: "gen", b: "em" }, { g: "relier", a: "r2", b: "y2" }, { g: "glisser", x: 40 }]);
    expect(ecran(salle, seule)).toEqual([null, { amplitude: amplitudeRecue(40), retard: 0 }]);
    expect(dephasage(salle, seule)).toBeNull();
  });
  it("les deux signaux sont en phase à chaque longueur d'onde, en opposition à mi-chemin", () => {
    const debut = premiereCoincidence(salle), lambda = longueurOnde(salle);
    const a = (x: number) => dephasage(salle, joue(salle, [...cabler, { g: "glisser", x }]))!;
    for (const k of [0, 1, 5, 10]) expect(Math.abs(a(debut + k * lambda))).toBeLessThan(0.007);
    expect(Math.abs(a(debut + 4.5 * lambda))).toBeGreaterThan(0.49);
    expect(a(debut + 2.25 * lambda)).toBeCloseTo(0.25, 1);
    expect(a(debut + 2.75 * lambda)).toBeCloseTo(-0.25, 1);
    // les récepteurs échangés entre les voies : le décalage change de sens
    const echange = joue(salle, [{ g: "relier", a: "gen", b: "em" }, { g: "relier", a: "r1", b: "y2" }, { g: "relier", a: "r2", b: "y1" }, { g: "glisser", x: dixieme(debut + 2.25 * lambda) }]);
    expect(dephasage(salle, echange)).toBeCloseTo(-0.25, 1);
    expect(comparable(echange)).toBe(true);
  });
});

describe("les gestes", () => {
  it("le récepteur mobile reste sur sa course, au dixième de millimètre", () => {
    expect(joue(salle, [{ g: "glisser", x: 52.34 }]).x).toBe(52.3);
    expect(joue(salle, [{ g: "glisser", x: 5 }, { g: "glisser", x: 140 }, { g: "glisser" }]).x).toBe(30);
  });
  it("deux déplacements à la suite valent le dernier : la liste des gestes peut les regrouper", () => {
    expect(joue(salle, [...cabler, { g: "glisser", x: 40 }, { g: "glisser", x: 62.5 }])).toEqual(joue(salle, [...cabler, { g: "glisser", x: 62.5 }]));
    expect(joue(salle, [{ g: "base", v: 5 }, { g: "base", v: 2 }, { g: "calibre", voie: 1, v: 4 }, { g: "calibre", voie: 1, v: 2 }])).toEqual(joue(salle, [{ g: "base", v: 2 }, { g: "calibre", voie: 1, v: 2 }]));
  });
  it("un geste inconnu, mal formé ou hors bornes ne change rien", () => {
    const bizarres: GesteBrut[] = [
      { g: "exploser" }, { g: "base", v: 12 }, { g: "base", v: 2.5 }, { g: "base" }, { g: "calibre", voie: 3, v: 2 }, { g: "calibre", voie: 1, v: -1 }, { g: "calibre", v: 2 },
      { g: "glisser", x: "loin" }, { g: "noter", quoi: "periode", v: 0 }, { g: "noter", quoi: "periode" }, { g: "noter", quoi: "depart", v: 14 }, { g: "noter", quoi: "arrivee", v: -1 },
      { g: "noter", quoi: "nombre", v: 2.5 }, { g: "noter", quoi: "nombre", v: 0 }, { g: "noter", quoi: "humeur", v: 3 },
    ];
    expect(joue(salle, bizarres)).toEqual(joue(salle, []));
    const etat = joue(salle, soignee(salle));
    for (const g of bizarres) expect(regles.geste(salle, etat, g)).toBe(etat);
  });
});

describe("le bilan", () => {
  it("une manipulation soignée n'a aucune faute", () => {
    const b = regles.bilan(salle, joue(salle, soignee(salle)));
    expect(b.fautes).toEqual([]);
    expect(b.score).toBe(1);
    expect(b.mesures).toEqual({ T: 25, x0: 1.45, x1: 10, n: 10 });
    expect(b.lignes[0]).toContain("25,0 µs");
  });
  it("le récepteur fixe peut se brancher sur la voie 2, ou la sortie GÉN servir de repère : la mesure reste juste", () => {
    const echange: GesteBrut[] = [{ g: "relier", a: "gen", b: "em" }, { g: "relier", a: "r1", b: "y2" }, { g: "relier", a: "r2", b: "y1" }];
    expect(fautes(salle, [...echange, ...regler, noterPeriode(salle), ...longueurs(salle, 10)])).toEqual([]);
    // avec la sortie GÉN pour repère, les positions en phase sont décalées, mais toujours espacées d'une longueur d'onde
    const gen: GesteBrut[] = [{ g: "relier", a: "gen", b: "em" }, { g: "relier", a: "gen", b: "y1" }, { g: "relier", a: "r2", b: "y2" }];
    const debut = premiereCoincidence(salle) + 0.63 * longueurOnde(salle);
    const reglage: GesteBrut[] = [{ g: "calibre", voie: 1, v: 6 }, { g: "calibre", voie: 2, v: 2 }, { g: "base", v: 2 }];
    expect(fautes(salle, [...gen, ...reglage, noterPeriode(salle), ...position("depart", debut), ...position("arrivee", debut + 10 * longueurOnde(salle)), { g: "noter", quoi: "nombre", v: 10 }])).toEqual([]);
  });
  it("sans rien noter, la manipulation vaut zéro, et le professeur donne ses valeurs", () => {
    for (const gestes of [[], [...cabler, ...regler, { g: "glisser", x: 80 }] as GesteBrut[]]) {
      const b = regles.bilan(salle, joue(salle, gestes));
      expect(b.score).toBe(0);
      expect(b.fautes.map((f) => f.code)).toEqual(["mesures"]);
      expect(b.mesures).toEqual({ T: 25, x0: 1.43, x1: 10.02, n: 10 });
    }
  });
  it("sans câbles, l'écran ne montre rien : les relevés ne valent rien", () => {
    expect(fautes(salle, [...regler, noterPeriode(salle), ...longueurs(salle, 10)])).toEqual(["branchement!"]);
    // la période se mesure avec un seul récepteur, pas la longueur d'onde
    const unSeul: GesteBrut[] = [{ g: "relier", a: "gen", b: "em" }, { g: "relier", a: "r1", b: "y1" }];
    expect(fautes(salle, [...unSeul, ...regler, noterPeriode(salle), ...longueurs(salle, 10)])).toEqual(["branchement!"]);
    expect(fautes(salle, [...unSeul, ...regler, noterPeriode(salle)])).toEqual(["positions!"]);
  });
  it("un oscilloscope mal réglé au moment de mesurer la période", () => {
    const sans = (reglage: GesteBrut[]) => fautes(salle, [...cabler, ...reglage, noterPeriode(salle), ...regler, ...longueurs(salle, 10)]);
    // un trait plat, un signal qui sort de l'écran
    expect(sans([{ g: "base", v: 2 }])).toEqual(["sensibilite"]);
    expect(sans([{ g: "base", v: 2 }, { g: "calibre", voie: 1, v: 0 }, { g: "calibre", voie: 2, v: 0 }])).toEqual(["sensibilite"]);
    // une seule voie lisible suffit pour la période
    expect(sans([{ g: "base", v: 2 }, { g: "calibre", voie: 1, v: 2 }])).toEqual([]);
    // des périodes trop serrées, ou moins d'une période à l'écran
    expect(sans([{ g: "calibre", voie: 1, v: 2 }, { g: "base", v: 6 }])).toEqual(["base"]);
    expect(sans([{ g: "calibre", voie: 1, v: 2 }, { g: "base", v: 1 }])).toEqual(["base"]);
    // quatre ou huit périodes se lisent encore
    expect(sans([{ g: "calibre", voie: 1, v: 2 }, { g: "base", v: 4 }])).toEqual([]);
  });
  it("une période mal lue", () => {
    const avec = (T: number) => fautes(salle, [...cabler, ...regler, { g: "noter", quoi: "periode", v: T }, ...longueurs(salle, 10)]);
    expect(avec(25.4)).toEqual([]);
    expect(avec(26)).toEqual(["periode"]);
    expect(avec(50)).toEqual(["periode!"]);
    expect(avec(12.5)).toEqual(["periode!"]);
    expect(fautes(salle, [...cabler, ...regler, ...longueurs(salle, 10)])).toEqual(["periode!"]);
  });
  it("un arrêt hors phase, une lecture fausse sur le rail", () => {
    const debut = premiereCoincidence(salle), fin = debut + 10 * longueurOnde(salle);
    const avec = (arrivee: GesteBrut[]) => fautes(salle, [...cabler, ...regler, noterPeriode(salle), ...position("depart", debut), ...arrivee, { g: "noter", quoi: "nombre", v: 10 }]);
    expect(avec(position("arrivee", fin + 0.3))).toEqual([]);
    expect(avec(position("arrivee", fin + 0.9))).toEqual(["phase"]);
    expect(avec(position("arrivee", fin - 2.5))).toEqual(["phase!"]);
    expect(avec(position("arrivee", fin, 1))).toEqual(["lecture"]);
    expect(avec(position("arrivee", fin, -4))).toEqual(["lecture!"]);
    // la faute se dit avec ses chiffres
    const texte = regles.bilan(salle, joue(salle, [...cabler, ...regler, noterPeriode(salle), ...position("depart", debut + 2), ...position("arrivee", fin), { g: "noter", quoi: "nombre", v: 10 }])).fautes[0].texte;
    expect(texte).toContain("position de départ");
    expect(texte).toMatch(/à \d,\d mm du bon endroit/);
  });
  it("un comptage faux, trop peu de longueurs d'onde, des relevés manquants", () => {
    const debut: GesteBrut[] = [...cabler, ...regler, noterPeriode(salle)];
    expect(fautes(salle, [...debut, ...longueurs(salle, 9, 10)])).toEqual(["comptage!"]);
    // compter aussi les oppositions de phase double le nombre
    expect(fautes(salle, [...debut, ...longueurs(salle, 5, 10)])).toEqual(["comptage!"]);
    expect(fautes(salle, [...debut, ...longueurs(salle, 2)])).toEqual(["peu"]);
    expect(fautes(salle, [...debut, ...longueurs(salle, 10).slice(0, -1)])).toEqual(["comptage!"]);
    expect(fautes(salle, [...debut, ...longueurs(salle, 10).slice(0, 2)])).toEqual(["positions!"]);
    // sans nombre noté, le professeur donne celui qui sépare les deux positions
    expect(regles.bilan(salle, joue(salle, [...debut, ...longueurs(salle, 7).slice(0, -1)])).mesures.n).toBe(7);
  });
  it("les fautes s'ajoutent : une faute légère retire un quart, une faute importante la moitié", () => {
    const b = regles.bilan(salle, joue(salle, [...cabler, ...regler, { g: "noter", quoi: "periode", v: 26 }, ...longueurs(salle, 2)]));
    expect(b.fautes.map((f) => f.code)).toEqual(["periode", "peu"]);
    expect(b.score).toBe(0.5);
    // l'élève garde ses mesures, même imprécises : la suite du TP se calcule avec elles
    expect(b.mesures.T).toBe(26);
    expect(b.mesures.n).toBe(2);
  });
});

describe("le TP du télémètre", () => {
  // le TP est en construction : il n'est pas inscrit dans l'application, le test donne donc ses règles
  const REGLES = { ultrasons: regles };
  const manipulation = (etape: EtapeDePaillasse): GesteBrut[] => soignee(etape.paillasse.reglages as ReglagesUltrasons);
  it("a la forme d'un TP : une situation à lire, les quatre compétences, rien de la réponse dans le navigateur, D partout sans rien faire", async () => {
    await controlesCommuns(ultrasons, REGLES);
  });
  it("fait avec soin, le TP donne A partout, quelle que soit la situation tirée", async () => {
    const situations = new Set<string>();
    const conclusions = new Set<number>();
    for (const graine of GRAINES) {
      const partie = await joueJuste(ultrasons, graine, manipulation, REGLES);
      expect(partie.scores.every((s) => s === 1), `graine ${graine} : ${partie.scores.join(" ")}`).toBe(true);
      expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "A", VAL: "A" });
      expect(partie.fautes).toEqual([[]]);
      situations.add(`${partie.mesures.T} ${partie.mesures.x0}`);
      // une mesure soignée est en accord avec la valeur attendue à la température de la salle
      const accord = partie.retours[partie.retours.length - 2].correction;
      expect(accord.genre === "choix" && accord.bonne).toBe(0);
      const derniere = partie.retours[partie.retours.length - 1].correction;
      if (derniere.genre === "choix") conclusions.add(derniere.bonne);
    }
    // la graine change bien la situation, et selon la température le réglage du robot convient ou non
    expect(situations.size).toBeGreaterThanOrEqual(6);
    expect(conclusions).toEqual(new Set([0, 1]));
  });
  it("une mesure bâclée se voit dans l'exploitation : elle se calcule avec les valeurs de l'élève", async () => {
    // une seule longueur d'onde, et deux périodes prises pour une
    const baclee = (etape: EtapeDePaillasse): GesteBrut[] => {
      const r = etape.paillasse.reglages as ReglagesUltrasons;
      return [...cabler, ...regler, { g: "noter", quoi: "periode", v: dixieme(2 * periode(r)) }, ...longueurs(r, 1)];
    };
    const partie = await joueTp(ultrasons, 1, (etape, publique, mesures) => juste(etape, publique, mesures, baclee), REGLES);
    expect(partie.fautes).toEqual([["periode", "peu"]]);
    expect(partie.bilan.REA).toBe("D");
    // les calculs justes à partir de mesures fausses restent justes ; la célérité trouvée, elle, est loin du compte
    expect(partie.bilan.VAL).toBe("A");
    const accord = partie.retours[partie.retours.length - 2].correction;
    expect(accord.genre === "choix" && accord.bonne).toBe(1);
  });
});
