// La paillasse Calorimètre (lib/commun/tp/paillasses/calorimetre.ts) et son TP : identifier un métal par sa capacité
// thermique massique. Les manipulations sont jouées ici sans le navigateur, geste par geste ; le temps du laboratoire
// n'avance que par le geste « attendre ».
import { describe, expect, it } from "vitest";
import { CONTENANCE, DUREE_MAX, T_BAIN, affichage, capaciteBloc, capaciteEau, equilibreIdeal, maintenant, mesuresExactes, regles, type EtatCalorimetre, type ReglagesCalorimetre } from "@/lib/commun/tp/paillasses/calorimetre";
import { rejoue, type GesteBrut } from "@/lib/commun/tp/types";
import calorimetrie from "@/lib/serveur/contenu/tp/calorimetrie";
import { GRAINES, controlesCommuns, joueJuste, type EtapeDePaillasse, type ReglesDuTest } from "../../outils/tp";

// un bloc de fer de 188,2 g, de l'eau à 16,4 °C, une salle à 21 °C
const r: ReglagesCalorimetre = { cMetal: 449, masseBloc: 188.2, masseVase: 87.3, capacite: 90, froid: 16.4, salle: 21, eauDemandee: 150 };
const joue = (gestes: GesteBrut[], reglages = r): EtatCalorimetre => rejoue(regles, reglages, gestes);
const fautes = (gestes: GesteBrut[], reglages = r) => regles.bilan(reglages, joue(gestes, reglages)).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);
const attendre = (v: number): GesteBrut => ({ g: "attendre", v });

// ---------- un élève qui manipule : il fait un geste, laisse passer le temps, regarde ses appareils, note ce qu'il lit ----------
function eleve(reglages: ReglagesCalorimetre) {
  const gestes: GesteBrut[] = [];
  const etat = () => rejoue(regles, reglages, gestes);
  const voit = () => maintenant(reglages, etat());
  const fais = (...g: GesteBrut[]) => { gestes.push(...g); };
  return {
    gestes, etat, voit, fais,
    attends: (secondes: number) => fais(attendre(secondes)),
    /** note ce que la balance affiche */
    noteMasse: (erreur = 0) => fais({ g: "noter", quoi: "masse", v: affichage(reglages, etat()) + erreur }),
    /** lit le thermomètre à la demi-graduation près, puis note */
    noteTemperature: (erreur = 0) => fais({ g: "noter", quoi: "temperature", v: Math.round(voit().lue * 20) / 20 + erreur }),
  };
}
type Eleve = ReturnType<typeof eleve>;

// les temps d'une manipulation soignée
const peser = (e: Eleve, eau = 148.6) => { e.fais({ g: "vase", ou: "balance" }, { g: "tare" }, { g: "verser", v: eau }); e.noteMasse(); e.fais({ g: "vase", ou: "calorimetre" }); };
const mesurerFroid = (e: Eleve, attente = 40) => { e.fais({ g: "thermometre", dans: true }); e.attends(attente); e.noteTemperature(); };
const porter = (e: Eleve, aLair = 12) => { e.fais({ g: "sortir" }); e.attends(aLair); e.fais({ g: "plonger" }); };
const fermerEtAgiter = (e: Eleve, agitation = 90) => { e.attends(8); e.fais({ g: "couvercle", pose: true }, { g: "agiter", on: true }); e.attends(agitation); e.fais({ g: "agiter", on: false }); };

/** La manipulation soignée d'une situation. */
function soignee(reglages: ReglagesCalorimetre): GesteBrut[] {
  const e = eleve(reglages);
  peser(e);
  mesurerFroid(e);
  porter(e);
  fermerEtAgiter(e);
  e.attends(20);
  e.noteTemperature();
  return e.gestes;
}

describe("le thermomètre", () => {
  it("plongé dans l'eau froide, il met quelques secondes à descendre ; lu trop tôt, il est faux", () => {
    const debut: GesteBrut[] = [{ g: "verser", v: 150 }, { g: "thermometre", dans: true }];
    expect(maintenant(r, joue(debut)).lue).toBe(21);
    // au bout de 5 s, il a fait 63 % du chemin de 21 °C à 16,4 °C
    expect(maintenant(r, joue([...debut, attendre(5)])).lue).toBeCloseTo(16.4 + 4.6 * Math.exp(-1), 6);
    expect(maintenant(r, joue([...debut, attendre(40)])).lue).toBeCloseTo(16.4, 2);
    // il ne fait que descendre
    let avant = 21;
    for (let t = 1; t <= 60; t++) {
      const lue = maintenant(r, joue([...debut, attendre(t)])).lue;
      expect(lue).toBeLessThan(avant);
      avant = lue;
    }
  });
  it("hors de l'eau, ou dans un vase vide, il revient lentement à la température de la salle", () => {
    const sorti = joue([{ g: "verser", v: 150 }, { g: "thermometre", dans: true }, attendre(60), { g: "thermometre", dans: false }, attendre(20)]);
    expect(maintenant(r, sorti).lue).toBeCloseTo(21 - 4.6 * Math.exp(-1), 3);
    expect(maintenant(r, joue([{ g: "thermometre", dans: true }, attendre(60)])).lue).toBe(21);
    // l'eau arrive autour du thermomètre déjà en place : il se met à descendre
    expect(maintenant(r, joue([{ g: "thermometre", dans: true }, attendre(60), { g: "verser", v: 150 }, attendre(60)])).lue).toBeCloseTo(16.4, 3);
  });
  it("il ne se plonge que dans le vase du calorimètre", () => {
    expect(joue([{ g: "vase", ou: "balance" }, { g: "thermometre", dans: true }]).thermometre).toBe(false);
    expect(joue([{ g: "thermometre", dans: true }, { g: "thermometre", dans: true }])).toEqual(joue([{ g: "thermometre", dans: true }]));
    expect(joue([{ g: "thermometre", dans: false }])).toEqual(joue([]));
  });
});

describe("le bloc", () => {
  it("à l'air, il perd environ 1 °C toutes les 30 secondes ; remis dans le bain, il reprend 100 °C", () => {
    expect(maintenant(r, joue([attendre(500)])).bloc).toBe(T_BAIN);
    const aLair = joue([{ g: "sortir" }, attendre(30)]);
    expect(maintenant(r, aLair).bloc).toBeCloseTo(99.02, 2);
    expect(maintenant(r, joue([{ g: "sortir" }, attendre(300)])).bloc).toBeCloseTo(21 + 79 * Math.exp(-300 / 2400), 6);
    const remis = joue([{ g: "sortir" }, attendre(300), { g: "rebain" }, attendre(10)]);
    expect(maintenant(r, remis).bloc).toBeGreaterThan(94);
    expect(maintenant(r, remis).bloc).toBeLessThan(98);
    expect(maintenant(r, joue([{ g: "sortir" }, attendre(300), { g: "rebain" }, attendre(120)])).bloc).toBeCloseTo(100, 1);
  });
  it("la pince ne saisit que le bloc du bain, et ne le plonge que dans le calorimètre ouvert", () => {
    expect(joue([{ g: "plonger" }, { g: "rebain" }])).toEqual(joue([]));
    expect(joue([{ g: "sortir" }, { g: "sortir" }])).toEqual(joue([{ g: "sortir" }]));
    expect(joue([{ g: "couvercle", pose: true }, { g: "sortir" }, { g: "plonger" }]).bloc).toBe("air");
    expect(joue([{ g: "vase", ou: "balance" }, { g: "sortir" }, { g: "plonger" }]).bloc).toBe("air");
    const dedans = joue([{ g: "verser", v: 150 }, { g: "sortir" }, attendre(12), { g: "plonger" }]);
    expect(dedans.bloc).toBe("vase");
    expect(dedans.entree).toEqual({ bloc: 99.606, air: 12 });
    // une fois dans l'eau, il n'en sort plus
    expect(joue([{ g: "verser", v: 150 }, { g: "sortir" }, { g: "plonger" }, { g: "sortir" }, { g: "rebain" }]).bloc).toBe("vase");
  });
});

describe("l'échange dans le calorimètre", () => {
  const debut: GesteBrut[] = [{ g: "verser", v: 150 }, { g: "thermometre", dans: true }, attendre(60), { g: "sortir" }, { g: "plonger" }, { g: "couvercle", pose: true }];
  it("fermé, le calorimètre garde l'énergie : ce que le bloc cède, l'eau et le vase le reçoivent", () => {
    const Cb = capaciteBloc(r), Ce = capaciteEau(r, 150);
    expect(Cb).toBeCloseTo(84.5, 1);
    expect(Ce).toBeCloseTo(717, 6);
    for (const t of [5, 30, 120, 600]) {
      const m = maintenant(r, joue([...debut, attendre(t)]));
      expect(Cb * (100 - m.bloc), `à ${t} s`).toBeCloseTo(Ce * (m.eau - 16.4), 6);
      expect(m.equilibre).toBeCloseTo(equilibreIdeal(r, 150), 9);
    }
    const fin = maintenant(r, joue([...debut, attendre(600)]));
    expect(fin.bloc).toBeCloseTo(fin.eau, 3);
    expect(fin.eau).toBeCloseTo(25.214, 2);
    expect(fin.ouvert).toBe(0);
  });
  it("sans agitation, la chaleur reste autour du bloc : le thermomètre est en retard sur l'eau", () => {
    const immobile = maintenant(r, joue([...debut, attendre(60)]));
    expect(immobile.inegal).toBeCloseTo(Math.exp(-60 / 150), 9);
    expect(immobile.eau - immobile.lue).toBeGreaterThan(2);
    const agite = maintenant(r, joue([...debut, { g: "agiter", on: true }, attendre(60)]));
    expect(agite.inegal).toBeLessThan(1e-6);
    expect(agite.eau - agite.lue).toBeLessThan(0.1);
    // et l'échange lui-même va plus vite quand on agite
    expect(agite.eau).toBeGreaterThan(immobile.eau + 1.5);
    // sans jamais agiter, il faut un quart d'heure pour que le thermomètre rejoigne l'équilibre
    expect(maintenant(r, joue([...debut, attendre(120)])).lue).toBeLessThan(23.5);
    expect(maintenant(r, joue([...debut, attendre(900)])).lue).toBeCloseTo(25.21, 1);
  });
  it("le thermomètre ne fait que monter, sans à-coup, que l'on agite ou non", () => {
    for (const agiter of [true, false]) {
      let avant = maintenant(r, joue(debut)).lue;
      for (let t = 2; t <= 400; t += 2) {
        const lue = maintenant(r, joue([...debut, ...(agiter ? [{ g: "agiter", on: true }] : []), attendre(t)])).lue;
        expect(lue, `à ${t} s`).toBeGreaterThanOrEqual(avant - 1e-9);
        expect(lue - avant).toBeLessThan(1.5);
        avant = lue;
      }
    }
  });
  it("ouvert, le calorimètre perd de la chaleur vers la salle : l'équilibre baisse", () => {
    const ouvert = [...debut.slice(0, -1), { g: "agiter", on: true }];
    const m = maintenant(r, joue([...ouvert, attendre(300)]));
    expect(m.ouvert).toBe(300);
    expect(equilibreIdeal(r, 150) - m.equilibre).toBeCloseTo((equilibreIdeal(r, 150) - 21) * (1 - Math.exp(-300 / 900)), 6);
    expect(m.eau).toBeCloseTo(m.equilibre, 3);
    // le couvercle posé en route arrête les pertes
    const ferme = maintenant(r, joue([...ouvert, attendre(100), { g: "couvercle", pose: true }, attendre(500)]));
    expect(ferme.ouvert).toBe(100);
    expect(ferme.equilibre).toBeCloseTo(maintenant(r, joue([...ouvert, attendre(100)])).equilibre, 9);
  });
  it("un bloc plongé dans un vase sans eau n'échauffe que le calorimètre", () => {
    const sec = maintenant(r, joue([{ g: "thermometre", dans: true }, { g: "sortir" }, { g: "plonger" }, attendre(600)]));
    // le vase seul s'échauffe beaucoup, puis l'ensemble, ouvert, redescend vers la salle
    expect(sec.eau).toBeGreaterThan(35);
    expect(sec.eau).toBeCloseTo(sec.bloc, 3);
    expect(sec.lue).toBe(21);
  });
});

describe("le temps et les versements", () => {
  it("deux attentes à la suite valent exactement leur somme, quoi qu'il se passe sur la paillasse", () => {
    const debut: GesteBrut[] = [{ g: "verser", v: 150 }, { g: "thermometre", dans: true }, attendre(7.3), { g: "sortir" }, attendre(11), { g: "plonger" }, { g: "agiter", on: true }];
    expect(joue([...debut, attendre(12.34), attendre(40.5)])).toEqual(joue([...debut, attendre(52.84)]));
    expect(maintenant(r, joue([...debut, attendre(12.34), attendre(40.5)]))).toEqual(maintenant(r, joue([...debut, attendre(52.84)])));
    expect(joue([attendre(0.07), attendre(0.07), attendre(0.07)])).toEqual(joue([attendre(0.21)]));
  });
  it("le temps du laboratoire ne recule pas et ne dépasse pas une journée", () => {
    expect(joue([attendre(-5), attendre(0), attendre(5000)])).toEqual(joue([]));
    const fin = joue(Array.from({ length: 30 }, () => attendre(3600)));
    expect(fin.t).toBe(DUREE_MAX);
  });
  it("deux versements à la suite valent leur somme ; ce qui dépasse la contenance du vase déborde", () => {
    const debut: GesteBrut[] = [{ g: "thermometre", dans: true }, attendre(30)];
    expect(joue([...debut, { g: "verser", v: 61.37 }, { g: "verser", v: 88.2 }])).toEqual(joue([...debut, { g: "verser", v: 149.57 }]));
    const plein = joue([{ g: "verser", v: 280 }, { g: "verser", v: 50 }]);
    expect([plein.eau, plein.renverse]).toEqual([CONTENANCE, 30]);
    expect(plein).toEqual(joue([{ g: "verser", v: 280 }, { g: "verser", v: 20 }, { g: "verser", v: 30 }]));
    // on ne verse ni dans un calorimètre fermé, ni sur le bloc
    expect(joue([{ g: "couvercle", pose: true }, { g: "verser", v: 50 }]).eau).toBe(0);
    expect(joue([{ g: "verser", v: 100 }, { g: "sortir" }, { g: "plonger" }, { g: "verser", v: 50 }]).eau).toBe(100);
  });
});

describe("la balance et le vase", () => {
  it("la balance affiche la charge de son plateau, moins la tare", () => {
    expect(affichage(r, joue([]))).toBe(0);
    expect(affichage(r, joue([{ g: "vase", ou: "balance" }]))).toBe(87.3);
    const taree = joue([{ g: "vase", ou: "balance" }, { g: "tare" }]);
    expect(affichage(r, taree)).toBe(0);
    expect(affichage(r, joue([{ g: "vase", ou: "balance" }, { g: "tare" }, { g: "verser", v: 148.63 }]))).toBe(148.6);
    // sans tare, la masse du vase s'ajoute à celle de l'eau
    expect(affichage(r, joue([{ g: "vase", ou: "balance" }, { g: "verser", v: 148.63 }]))).toBe(235.9);
    // le vase enlevé, la balance tarée affiche une masse négative
    expect(affichage(r, joue([{ g: "vase", ou: "balance" }, { g: "tare" }, { g: "vase", ou: "calorimetre" }]))).toBe(-87.3);
    // une tare qui ne change rien n'est pas un geste
    expect(joue([{ g: "tare" }])).toEqual(joue([]));
  });
  it("le vase ne se déplace que libre : sans couvercle, sans thermomètre, sans agitation, sans le bloc", () => {
    expect(joue([{ g: "vase", ou: "balance" }]).vase).toBe("balance");
    expect(joue([{ g: "vase", ou: "calorimetre" }])).toEqual(joue([]));
    expect(joue([{ g: "couvercle", pose: true }, { g: "vase", ou: "balance" }]).vase).toBe("calorimetre");
    expect(joue([{ g: "thermometre", dans: true }, { g: "vase", ou: "balance" }]).vase).toBe("calorimetre");
    expect(joue([{ g: "verser", v: 100 }, { g: "agiter", on: true }, { g: "vase", ou: "balance" }]).vase).toBe("calorimetre");
    expect(joue([{ g: "sortir" }, { g: "plonger" }, { g: "vase", ou: "balance" }]).vase).toBe("calorimetre");
    // le couvercle et l'agitateur sont ceux du calorimètre
    expect(joue([{ g: "vase", ou: "balance" }, { g: "couvercle", pose: true }]).couvercle).toBe(false);
    expect(joue([{ g: "vase", ou: "balance" }, { g: "verser", v: 100 }, { g: "agiter", on: true }]).agite).toBe(false);
    expect(joue([{ g: "agiter", on: true }]).agite).toBe(false);
    expect(joue([{ g: "couvercle", pose: true }, { g: "couvercle", pose: false }]).couvercle).toBe(false);
  });
  it("un geste inconnu, mal formé ou hors bornes ne change rien", () => {
    const bizarres: GesteBrut[] = [{ g: "chauffer" }, { g: "attendre" }, { g: "attendre", v: "longtemps" }, { g: "verser" }, { g: "verser", v: -4 }, { g: "verser", v: 5000 }, { g: "vase", ou: "evier" }, { g: "vase" },
      { g: "noter", quoi: "masse" }, { g: "noter", quoi: "masse", v: -3 }, { g: "noter", quoi: "masse", v: 9000 }, { g: "noter", quoi: "temperature", v: 400 }, { g: "noter", quoi: "volume", v: 3 }, { g: "noter", v: 3 }];
    expect(joue(bizarres)).toEqual(joue([]));
  });
});

describe("le bilan", () => {
  it("une manipulation soignée n'a aucune faute, et rend les trois mesures de l'élève", () => {
    const b = regles.bilan(r, joue(soignee(r)));
    expect(b.fautes).toEqual([]);
    expect(b.score).toBe(1);
    expect(b.mesures).toEqual({ m: 148.6, T1: 16.4, Tf: 25.2 });
    expect(b.lignes).toEqual(["Masse d'eau : m = 148,6 g.", "Température de l'eau froide : θ₁ = 16,4 °C.", "Température finale : θ₂ = 25,2 °C.", "Pour une manipulation sans défaut avec 148,6 g d'eau : θ₁ = 16,4 °C, θ₂ = 25,3 °C."]);
  });
  it("sans aucune mesure, la manipulation vaut zéro, et le professeur donne ses valeurs", () => {
    const b = regles.bilan(r, joue([{ g: "vase", ou: "balance" }, { g: "tare" }, { g: "verser", v: 140 }]));
    expect([b.score, b.fautes.map((f) => f.code)]).toEqual([0, ["mesures"]]);
    expect(b.mesures).toEqual({ m: 140, T1: 16.4, Tf: 25.7 });
    // sans eau versée, il prend la masse du protocole
    expect(regles.bilan(r, joue([])).mesures).toEqual(mesuresExactes(r, joue([])));
    expect(regles.bilan(r, joue([])).mesures.m).toBe(150);
  });
  it("chaque mesure oubliée est une faute importante ; le professeur la fournit pour la suite", () => {
    const sans = (rang: number) => { const notes = soignee(r).flatMap((g, i) => (g.g === "noter" ? [i] : [])); return soignee(r).filter((_, i) => i !== notes[rang]); };
    expect(fautes(sans(0))).toEqual(["masse!"]);
    expect(fautes(sans(1))).toEqual(["initiale!"]);
    expect(fautes(sans(2))).toEqual(["finale!"]);
    expect(regles.bilan(r, joue(sans(2))).mesures.Tf).toBe(25.28);
  });
  it("sans tare, la balance affiche aussi le vase : la masse notée est fausse, sauf si l'élève retranche le vase", () => {
    const e = eleve(r);
    e.fais({ g: "vase", ou: "balance" }, { g: "verser", v: 148.6 });
    e.noteMasse();
    e.fais({ g: "vase", ou: "calorimetre" });
    mesurerFroid(e);
    porter(e);
    fermerEtAgiter(e);
    e.attends(20);
    e.noteTemperature();
    const b = regles.bilan(r, e.etat());
    expect(b.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["tare!"]);
    expect(b.fautes[0].texte).toContain("elle affichait 235,9 g, et non la masse d'eau, 148,6 g");
    expect(b.mesures.m).toBe(235.9);
    // il a lu 235,9 g mais noté la différence avec le vase vide : pas de faute
    const avise = e.gestes.map((g) => (g.quoi === "masse" ? { ...g, v: 148.6 } : g));
    expect(fautes(avise)).toEqual([]);
    // la masse notée le vase revenu dans le calorimètre : la balance n'affiche plus rien d'utile
    const tard = eleve(r);
    tard.fais({ g: "vase", ou: "balance" }, { g: "verser", v: 148.6 }, { g: "vase", ou: "calorimetre" });
    tard.noteMasse();
    expect(regles.bilan(r, tard.etat()).fautes.find((f) => f.code === "tare")?.texte).toContain("Le vase n'était pas sur la balance quand tu as noté 0,0 g : il contenait 148,6 g d'eau");
    // une balance tarée affiche une masse négative quand le vase est parti : elle ne se note pas
    const parti = eleve(r);
    parti.fais({ g: "vase", ou: "balance" }, { g: "tare" }, { g: "verser", v: 148.6 }, { g: "vase", ou: "calorimetre" });
    parti.noteMasse();
    expect(parti.etat().notes.masse).toBeUndefined();
    // une balance mal lue
    const malLue = soignee(r).map((g) => (g.quoi === "masse" ? { ...g, v: 146.8 } : g));
    expect(fautes(malLue)).toEqual(["balance"]);
    expect(fautes(soignee(r).map((g) => (g.quoi === "masse" ? { ...g, v: 184.6 } : g)))).toEqual(["balance!"]);
  });
  it("la quantité d'eau : trop peu, trop, ou pas du tout", () => {
    const avec = (eau: number) => {
      const e = eleve(r);
      // au-delà de la contenance du vase, il verse en deux fois
      e.fais({ g: "vase", ou: "balance" }, { g: "tare" }, { g: "verser", v: Math.min(eau, 280) }, ...(eau > 280 ? [{ g: "verser", v: eau - 280 }] : []));
      e.noteMasse();
      e.fais({ g: "vase", ou: "calorimetre" });
      mesurerFroid(e);
      porter(e);
      fermerEtAgiter(e);
      e.attends(20);
      e.noteTemperature();
      return e.gestes;
    };
    expect(fautes(avec(100))).toEqual(["eau"]);
    expect(fautes(avec(200))).toEqual(["eau"]);
    expect(fautes(avec(125))).toEqual([]);
    expect(fautes(avec(340))).toEqual(["eau", "renverse"]);
    // sans eau, le thermomètre reste dans l'air
    const sec = eleve(r);
    mesurerFroid(sec);
    porter(sec);
    sec.attends(100);
    sec.noteTemperature();
    expect(fautes(sec.gestes)).toEqual(["masse!", "eau!", "thermometre!", "couvercle!", "releves!"]);
  });
  it("la température de l'eau froide lue trop tôt : le thermomètre n'avait pas fini de descendre", () => {
    const presse = (attente: number) => { const e = eleve(r); peser(e); mesurerFroid(e, attente); porter(e); fermerEtAgiter(e); e.attends(20); e.noteTemperature(); return e.gestes; };
    expect(fautes(presse(3))).toEqual(["stabilisation!"]);
    expect(fautes(presse(14))).toEqual(["stabilisation"]);
    expect(fautes(presse(25))).toEqual([]);
    const b = regles.bilan(r, joue(presse(3)));
    expect(b.fautes[0].texte).toContain("le thermomètre indiquait 18,9 °C et n'avait pas fini de descendre ; l'eau était à 16,4 °C");
    // sa mesure porte la trace du geste : une eau froide trop chaude
    expect(b.mesures.T1).toBe(18.9);
    // le thermomètre resté sur son support
    const oublie = eleve(r);
    peser(oublie);
    oublie.noteTemperature();
    expect(regles.bilan(r, oublie.etat()).fautes.map((f) => f.code)).toContain("thermometre");
  });
  it("le bloc qui traîne à l'air n'est plus à 100 °C ; remis trop peu de temps dans le bain, non plus", () => {
    const lent = (aLair: number) => { const e = eleve(r); peser(e); mesurerFroid(e); porter(e, aLair); fermerEtAgiter(e); e.attends(20); e.noteTemperature(); return e.gestes; };
    expect(fautes(lent(28))).toEqual([]);
    expect(fautes(lent(45))).toEqual(["transport"]);
    expect(fautes(lent(150))).toEqual(["transport!"]);
    const b = regles.bilan(r, joue(lent(150)));
    expect(b.fautes[0].texte).toContain("Le bloc est resté 2 min 30 s à l'air avant d'entrer dans le calorimètre : il n'était plus qu'à 95,2 °C");
    // la température finale s'en ressent
    expect(b.mesures.Tf).toBeLessThan(regles.bilan(r, joue(soignee(r))).mesures.Tf - 0.3);
    // sorti, refroidi, remis dix secondes dans le bain, puis porté vite
    const e = eleve(r);
    peser(e);
    mesurerFroid(e);
    e.fais({ g: "sortir" });
    e.attends(600);
    e.fais({ g: "rebain" });
    e.attends(10);
    porter(e);
    fermerEtAgiter(e);
    e.attends(20);
    e.noteTemperature();
    const remis = regles.bilan(r, e.etat());
    expect(remis.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["transport!"]);
    expect(remis.fautes[0].texte).toContain("il n'était pas resté assez longtemps dans l'eau bouillante");
    // le bloc laissé dans le bain, ou dans la pince
    const sansBloc = eleve(r);
    peser(sansBloc);
    mesurerFroid(sansBloc);
    sansBloc.fais({ g: "sortir" });
    expect(fautes(sansBloc.gestes)).toEqual(["bloc!", "finale!"]);
  });
  it("la température finale lue trop tôt, sans agiter, ou calorimètre ouvert", () => {
    // il agite dix secondes et lit aussitôt
    const presse = eleve(r);
    peser(presse);
    mesurerFroid(presse);
    porter(presse);
    fermerEtAgiter(presse, 10);
    presse.noteTemperature();
    expect(fautes(presse.gestes)).toEqual(["equilibre!"]);
    expect(regles.bilan(r, presse.etat()).fautes[0].texte).toMatch(/le thermomètre indiquait \d\d,\d °C et montait encore ; l'équilibre est à 25,2 °C/);
    // il n'agite pas et lit au bout de deux minutes : la chaleur est restée autour du bloc
    const immobile = eleve(r);
    peser(immobile);
    mesurerFroid(immobile);
    porter(immobile);
    immobile.attends(8);
    immobile.fais({ g: "couvercle", pose: true });
    immobile.attends(120);
    immobile.noteTemperature();
    const b = regles.bilan(r, immobile.etat());
    expect(b.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["agitation!"]);
    expect(b.fautes[0].texte).toContain("Tu n'as pas agité : la chaleur est restée autour du bloc");
    expect(b.mesures.Tf).toBeLessThan(23.5);
    // il n'agite pas mais attend une demi-heure : la lecture est bonne, le geste manque
    immobile.attends(1800);
    immobile.noteTemperature();
    expect(regles.bilan(r, immobile.etat()).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["agitation"]);
    // il oublie le couvercle : cinq minutes ouvert, la chaleur s'en va
    const ouvert = eleve(r);
    peser(ouvert);
    mesurerFroid(ouvert);
    porter(ouvert);
    ouvert.fais({ g: "agiter", on: true });
    ouvert.attends(300);
    ouvert.fais({ g: "agiter", on: false });
    ouvert.noteTemperature();
    const c = regles.bilan(r, ouvert.etat());
    expect(c.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["couvercle!"]);
    expect(c.fautes[0].texte).toContain("Le calorimètre est resté ouvert 5 min 00 s pendant l'échange");
    // ouvert une minute et demie : une faute légère ; rouvert juste avant de lire : le geste manque quand même
    const peu = eleve(r);
    peser(peu);
    mesurerFroid(peu);
    porter(peu);
    peu.fais({ g: "agiter", on: true });
    peu.attends(90);
    peu.noteTemperature();
    expect(fautes(peu.gestes)).toEqual(["couvercle"]);
    const vite = eleve(r);
    peser(vite);
    mesurerFroid(vite);
    porter(vite);
    fermerEtAgiter(vite);
    vite.fais({ g: "couvercle", pose: false });
    vite.attends(5);
    vite.noteTemperature();
    expect(regles.bilan(r, vite.etat()).fautes.map((f) => f.texte)).toEqual(["Tu as lu la température finale calorimètre ouvert : pose le couvercle dès que le bloc est dans l'eau, pour que la chaleur ne s'échappe pas."]);
    // le thermomètre retiré avant la lecture finale
    const retire = eleve(r);
    peser(retire);
    mesurerFroid(retire);
    retire.fais({ g: "thermometre", dans: false });
    porter(retire);
    fermerEtAgiter(retire);
    retire.noteTemperature();
    expect(fautes(retire.gestes)).toEqual(["thermometre!"]);
  });
  it("un thermomètre mal lu, et des relevés qui rendent le calcul impossible", () => {
    const avec = (rang: number, erreur: number) => {
      const gestes = soignee(r);
      const notes = gestes.flatMap((g, i) => (g.g === "noter" ? [i] : []));
      return gestes.map((g, i) => (i === notes[rang] ? { ...g, v: (g.v as number) + erreur } : g));
    };
    expect(fautes(avec(1, 0.1))).toEqual([]);
    expect(fautes(avec(1, 0.3))).toEqual(["lecture"]);
    expect(fautes(avec(2, -2))).toEqual(["lecture!"]);
    expect(regles.bilan(r, joue(avec(2, -2))).fautes[0].texte).toContain("Tu as noté 23,2 °C ; le thermomètre indiquait 25,2 °C");
    const b = regles.bilan(r, joue(avec(2, -10)));
    expect(b.fautes.map((f) => f.code)).toEqual(["lecture", "releves"]);
    expect(b.mesures).toEqual(mesuresExactes(r, joue(soignee(r))));
    expect(b.lignes).toHaveLength(1);
    expect(regles.bilan(r, joue(avec(2, 72))).fautes.map((f) => f.code)).toEqual(["lecture", "releves"]);
    expect(regles.bilan(r, joue(avec(0, -140))).fautes.map((f) => f.code)).toEqual(["balance", "releves"]);
  });
});

describe("le TP de calorimétrie", () => {
  // le TP est en construction : il n'est pas inscrit dans l'application, le test donne ses règles
  const sesRegles = { calorimetre: regles } as ReglesDuTest;
  const manipulation = (etape: EtapeDePaillasse): GesteBrut[] => soignee(etape.paillasse.reglages as ReglagesCalorimetre);
  it("une situation à lire, une manipulation, les quatre compétences, rien de la réponse dans le navigateur, D partout sans rien faire", async () => {
    await controlesCommuns(calorimetrie, sesRegles);
    expect(calorimetrie.etapes(1)).toHaveLength(10);
    expect(calorimetrie.fiche).toBe(5);
  });
  it("fait avec soin, le TP donne A partout, et le métal retrouvé est le bon, quelle que soit la situation tirée", async () => {
    const metaux = new Set<number>(), froids = new Set<number>(), trouves = new Set<number>();
    for (const graine of GRAINES) {
      const partie = await joueJuste(calorimetrie, graine, manipulation, sesRegles);
      expect(partie.scores.every((s) => s === 1), `graine ${graine} : ${partie.scores.join(" ")}`).toBe(true);
      expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "A", VAL: "A" });
      expect(partie.fautes).toEqual([[]]);
      const reglages = (partie.etapes.find((e) => e.genre === "paillasse") as EtapeDePaillasse).paillasse.reglages as ReglagesCalorimetre;
      metaux.add(reglages.cMetal);
      froids.add(reglages.froid);
      const metal = partie.retours.flatMap((x) => (x.correction.genre === "choix" ? [x.correction] : []))[1];
      expect(metal.explication, `graine ${graine}`).not.toContain("en réalité");
      trouves.add(metal.bonne);
      // la capacité trouvée est à moins de 3 % de celle de la table
      const ecart = partie.retours.flatMap((x) => (x.correction.genre === "valeur" ? [x.correction] : []))[2];
      expect(Number(ecart.attendu.replace(",", ".").replace(" %", ""))).toBeLessThan(3);
    }
    // la graine change bien la situation : le métal du bloc, la température de l'eau
    expect(metaux.size).toBe(4);
    expect(trouves.size).toBe(4);
    expect(froids.size).toBe(5);
  });
  it("l'exploitation se juge sur les mesures de l'élève : un bloc qui a traîné et un calorimètre ouvert font prendre le fer pour du zinc", async () => {
    const baclee = (etape: EtapeDePaillasse): GesteBrut[] => {
      const e = eleve(etape.paillasse.reglages as ReglagesCalorimetre);
      peser(e);
      mesurerFroid(e);
      porter(e, 240);
      e.fais({ g: "agiter", on: true });
      e.attends(240);
      e.noteTemperature();
      return e.gestes;
    };
    // la graine 4 tire le bloc de fer
    const partie = await joueJuste(calorimetrie, 4, baclee, sesRegles);
    expect(partie.fautes).toEqual([["transport", "couvercle"]]);
    expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "D", VAL: "A" });
    const metal = partie.retours.flatMap((x) => (x.correction.genre === "choix" ? [x.correction] : []))[1];
    expect(metal.bonne).toBe(2);
    expect(metal.explication).toContain("Le bloc était en réalité en fer");
  });
});
