// La paillasse Titrage (lib/commun/tp/paillasses/titrage.ts) et ses deux TP : un détartrant à contrôler (indicateur coloré)
// et le degré d'un vinaigre (pH-mètre). Les manipulations sont jouées ici sans le navigateur, geste par geste.
import { describe, expect, it } from "vitest";
import { DILUTION, agite, equivalenceReelle, lecture, pHActuel, pHMelange, pHVu, regles, sondeTrempe, volumeEquivalence, type EtatTitrage, type ReglagesTitrage } from "@/lib/commun/tp/paillasses/titrage";
import { rejoue, type GesteBrut } from "@/lib/commun/tp/types";
import { tp } from "@/lib/serveur/contenu/tp";
import { GRAINES, joueJuste, type EtapeDePaillasse } from "../../outils/tp";

const fort: ReglagesTitrage = { Ca: 0.0976, pKa: null, Va: 10, Cb: 0.1, suivi: "indicateur", indicateur: "bbt", eau: 0, noms: { titrante: "Soude", titree: "Détartrant dilué" } };
const faible: ReglagesTitrage = { Ca: 0.131, pKa: 4.76, Va: 10, Cb: 0.1, suivi: "phmetre", indicateur: "phenolphtaleine", eau: 40, noms: { titrante: "Soude", titree: "Vinaigre dilué" } };
const joue = (r: ReglagesTitrage, gestes: GesteBrut[]): EtatTitrage => rejoue(regles, r, gestes);
const fautes = (r: ReglagesTitrage, gestes: GesteBrut[]) => regles.bilan(r, joue(r, gestes)).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);
const fois = (n: number, g: GesteBrut): GesteBrut[] => Array.from({ length: n }, () => g);

// ---------- les gestes d'un élève soigneux ----------
const rincer: GesteBrut[] = [{ g: "dessous", quoi: "poubelle" }, { g: "remplir", v: 4 }, { g: "couler", v: 4, filet: true }];
const remplir: GesteBrut[] = [{ g: "remplir", v: 26.2 }, { g: "couler", v: 1.2, filet: true }];
const prelever: GesteBrut[] = [{ g: "pipette", ou: "becher" }, { g: "aspirer", v: 10.4 }, { g: "vider", v: 0.4 }, { g: "pipette", ou: "erlenmeyer" }, { g: "vider", v: 10 }, { g: "pipette", ou: "repos" }];
const agiter: GesteBrut[] = [{ g: "barreau" }, { g: "dessous", quoi: "erlenmeyer" }, { g: "agiter", v: 3 }];
/** Verse au filet jusqu'à un peu avant l'équivalence, puis goutte à goutte jusqu'à la première goutte qui la dépasse. */
function verserJusqua(VE: number): { gestes: GesteBrut[]; verse: number } {
  const filet = Math.floor(VE - 0.6);
  const gouttes = Math.ceil(Math.round((VE - filet) * 100) / 5);
  return { gestes: [{ g: "couler", v: filet, filet: true }, ...fois(gouttes, { g: "couler", v: 0.05 })], verse: Math.round((filet + gouttes * 0.05) * 100) / 100 };
}
/** Le titrage colorimétrique soigné d'une situation. */
function colorimetrique(r: ReglagesTitrage): GesteBrut[] {
  const { gestes, verse } = verserJusqua(volumeEquivalence(r));
  return [...rincer, ...remplir, ...prelever, ...fois(3, { g: "goutte" }), ...agiter, ...gestes, { g: "noter", v: verse }];
}
/** Le titrage au pH-mètre soigné d'une situation : des ajouts d'un millilitre, serrés autour du saut. */
function phmetrique(r: ReglagesTitrage): GesteBrut[] {
  const VE = volumeEquivalence(r);
  const large = Math.floor(VE - 1.5);
  const serres = Math.ceil((VE + 1 - large) / 0.2);
  return [...rincer, ...remplir, ...prelever, { g: "eau", v: 40 }, { g: "rincersonde" }, { g: "sonde", dans: true }, ...agiter,
    ...fois(large, { g: "couler", v: 1, filet: true }), ...fois(serres, { g: "couler", v: 0.2, filet: true }), ...fois(3, { g: "couler", v: 1, filet: true }),
    { g: "noter", v: Math.round(VE * 20) / 20 }];
}

describe("le pH pendant un titrage", () => {
  it("acide fort : il vaut 7 à l'équivalence, et il saute autour", () => {
    const VE = volumeEquivalence(fort);
    expect(VE).toBeCloseTo(9.76, 9);
    expect(pHMelange(fort, 10, 0, 0)).toBeCloseTo(-Math.log10(0.0976), 2);
    expect(pHMelange(fort, 10, 0, VE)).toBeCloseTo(7, 1);
    expect(pHMelange(fort, 10, 0, VE - 0.05)).toBeLessThan(4.5);
    expect(pHMelange(fort, 10, 0, VE + 0.05)).toBeGreaterThan(9.5);
    // l'eau ajoutée ne déplace pas l'équivalence
    expect(pHMelange(fort, 10, 40, VE)).toBeCloseTo(7, 1);
  });
  it("acide faible : pH = pK_A à la demi-équivalence, pH basique à l'équivalence", () => {
    const VE = volumeEquivalence(faible);
    expect(pHMelange(faible, 10, 40, VE / 2)).toBeCloseTo(4.76, 1);
    expect(pHMelange(faible, 10, 40, VE)).toBeGreaterThan(8);
    expect(pHMelange(faible, 0, 0, 0)).toBe(7);
  });
  it("le pH ne fait que monter quand on verse la solution titrante", () => {
    for (const r of [fort, faible]) {
      let avant = pHMelange(r, 10, r.eau, 0);
      for (let V = 0.05; V <= 25; V += 0.05) {
        const x = pHMelange(r, 10, r.eau, V);
        expect(x, `V = ${V}`).toBeGreaterThanOrEqual(avant - 1e-9);
        avant = x;
      }
    }
  });
});

describe("la burette", () => {
  it("se remplit par le haut, se lit du haut vers le bas, et déborde si on verse trop", () => {
    expect(lecture(joue(fort, []))).toBe(25);
    const remplie = joue(fort, [{ g: "remplir", v: 26 }]);
    expect(lecture(remplie)).toBe(-1);
    const debord = joue(fort, [{ g: "remplir", v: 30 }]);
    expect(debord.volume).toBe(27);
    expect(debord.renverse).toBe(3);
  });
  it("ce qui coule va dans ce qui est dessous ; sans rien dessous, sur la paillasse", () => {
    expect(joue(fort, [{ g: "remplir", v: 25 }, { g: "couler", v: 2 }]).renverse).toBe(2);
    const poubelle = joue(fort, [{ g: "remplir", v: 25 }, { g: "dessous", quoi: "poubelle" }, { g: "couler", v: 2 }]);
    expect([poubelle.renverse, poubelle.verse, lecture(poubelle)]).toEqual([0, 0, 2]);
    const erlen = joue(fort, [{ g: "remplir", v: 25 }, { g: "dessous", quoi: "erlenmeyer" }, { g: "couler", v: 2 }]);
    expect([erlen.verse, erlen.depart]).toEqual([2, 0]);
    // une burette vide ne donne plus rien
    expect(joue(fort, [{ g: "remplir", v: 1 }, { g: "dessous", quoi: "erlenmeyer" }, { g: "couler", v: 5 }]).verse).toBe(1);
  });
  it("rincée avec la solution titrante puis vidée, elle ne la dilue plus ; sinon l'équivalence arrive plus tard", () => {
    const sans = joue(fort, [{ g: "dessous", quoi: "poubelle" }, ...remplir, ...prelever]);
    expect(sans.dilue).toBe(true);
    expect(equivalenceReelle(fort, sans)).toBeCloseTo(9.76 / DILUTION, 6);
    const avec = joue(fort, [...rincer, ...remplir, ...prelever]);
    expect([avec.eauBurette, avec.dilue]).toEqual([false, false]);
    expect(equivalenceReelle(fort, avec)).toBeCloseTo(9.76, 6);
    // un rinçage trop court, ou vidé ailleurs que dans le bécher poubelle, ne compte pas
    expect(joue(fort, [{ g: "dessous", quoi: "poubelle" }, { g: "remplir", v: 1 }, { g: "couler", v: 1 }, ...remplir]).dilue).toBe(true);
  });
  it("au filet, deux morceaux valent leur somme : la liste des gestes peut les regrouper", () => {
    const debut: GesteBrut[] = [...remplir, { g: "dessous", quoi: "erlenmeyer" }];
    const deux = joue(fort, [...debut, { g: "couler", v: 3, filet: true }, { g: "couler", v: 2, filet: true }]);
    const un = joue(fort, [...debut, { g: "couler", v: 5, filet: true }]);
    expect(deux).toEqual(un);
  });
});

describe("la prise d'essai", () => {
  it("la pipette n'aspire que dans le bécher de solution, et se vide là où elle est", () => {
    expect(joue(fort, [{ g: "aspirer", v: 5 }]).dansPipette).toBe(0);
    const pleine = joue(fort, [{ g: "pipette", ou: "becher" }, { g: "aspirer", v: 10.3 }, { g: "vider", v: 0.3 }]);
    expect(pleine.dansPipette).toBe(10);
    expect(joue(fort, prelever).prise).toBe(10);
    // vidée au-dessus de la paillasse, la prise est perdue
    const perdue = joue(fort, [{ g: "pipette", ou: "becher" }, { g: "aspirer", v: 10 }, { g: "pipette", ou: "repos" }, { g: "vider", v: 10 }]);
    expect([perdue.prise, perdue.renverse]).toEqual([0, 10]);
  });
  it("aspirer trop haut fait monter le liquide dans la propipette", () => {
    const trop = joue(fort, [{ g: "pipette", ou: "becher" }, { g: "aspirer", v: 14 }]);
    expect([trop.dansPipette, trop.aspireTrop]).toEqual([12, true]);
  });
  it("une prise mal ajustée déplace l'équivalence d'autant", () => {
    const large = joue(fort, [...rincer, ...remplir, { g: "pipette", ou: "becher" }, { g: "aspirer", v: 10.5 }, { g: "pipette", ou: "erlenmeyer" }, { g: "vider", v: 10.5 }]);
    expect(equivalenceReelle(fort, large)).toBeCloseTo(9.76 * 1.05, 6);
  });
});

describe("le mélange", () => {
  it("sans agitation, la couleur a du retard sur ce qui a été versé", () => {
    const debut: GesteBrut[] = [...rincer, ...remplir, ...prelever, { g: "goutte" }];
    const immobile = joue(fort, [...debut, { g: "dessous", quoi: "erlenmeyer" }, { g: "couler", v: 9.9, filet: true }]);
    expect(agite(immobile)).toBe(false);
    expect(pHActuel(fort, immobile)).toBeGreaterThan(9);
    expect(pHVu(fort, immobile)).toBeLessThan(5);
    const agitee = joue(fort, [...debut, ...agiter, { g: "couler", v: 9.9, filet: true }]);
    expect(agite(agitee)).toBe(true);
    expect(pHVu(fort, agitee)).toBe(pHActuel(fort, agitee));
  });
  it("le pH-mètre relève un point à chaque ajout, si la sonde trempe assez", () => {
    const trempe = joue(faible, [...remplir, ...prelever, { g: "eau", v: 40 }, { g: "sonde", dans: true }, { g: "dessous", quoi: "erlenmeyer" }, { g: "couler", v: 1, filet: true }, { g: "couler", v: 1, filet: true }]);
    expect(sondeTrempe(faible, trempe)).toBe(true);
    expect(trempe.releves.map((p) => p.V)).toEqual([0, 1, 2]);
    const seche = joue(faible, [...remplir, ...prelever, { g: "sonde", dans: true }, { g: "dessous", quoi: "erlenmeyer" }, { g: "couler", v: 1, filet: true }]);
    expect([sondeTrempe(faible, seche), seche.releves.length]).toEqual([false, 0]);
  });
});

describe("le bilan d'un titrage avec indicateur", () => {
  it("une manipulation soignée n'a aucune faute", () => {
    const b = regles.bilan(fort, joue(fort, colorimetrique(fort)));
    expect(b.fautes).toEqual([]);
    expect(b.score).toBe(1);
    expect(b.mesures).toEqual({ VE: 9.8 });
  });
  it("sans rien verser, la manipulation vaut zéro, et le professeur donne sa valeur", () => {
    const b = regles.bilan(fort, joue(fort, []));
    expect(b.score).toBe(0);
    expect(b.mesures).toEqual({ VE: 9.76 });
    expect(regles.bilan(fort, joue(fort, [...rincer, ...remplir, ...prelever])).score).toBe(0);
  });
  it("franchir l'équivalence au filet est une faute importante, même en s'arrêtant tout près", () => {
    const debut: GesteBrut[] = [...rincer, ...remplir, ...prelever, { g: "goutte" }, ...agiter];
    expect(fautes(fort, [...debut, { g: "couler", v: 9.8, filet: true }, { g: "noter", v: 9.8 }])).toEqual(["apres!"]);
    // goutte à goutte, mais trois gouttes de trop : une faute légère ; dix de trop : importante
    expect(fautes(fort, [...debut, { g: "couler", v: 9, filet: true }, ...fois(19, { g: "couler", v: 0.05 }), { g: "noter", v: 9.95 }])).toEqual(["apres"]);
    expect(fautes(fort, [...debut, { g: "couler", v: 9, filet: true }, ...fois(26, { g: "couler", v: 0.05 }), { g: "noter", v: 10.3 }])).toEqual(["apres!"]);
    // arrêté avant le changement de couleur
    expect(fautes(fort, [...debut, { g: "couler", v: 9, filet: true }, { g: "noter", v: 9 }])).toEqual(["avant!"]);
  });
  it("le zéro : une burette pas au zéro décale la lecture, sauf si l'élève retranche la lecture de départ", () => {
    const debut: GesteBrut[] = [...rincer, { g: "remplir", v: 24.5 }, ...prelever, { g: "goutte" }, ...agiter];
    const { gestes, verse } = verserJusqua(9.76);
    // le niveau de départ est à 0,50 mL : la burette affiche 10,30 à la fin
    expect(fautes(fort, [...debut, ...gestes, { g: "noter", v: verse + 0.5 }])).toEqual(["zero!"]);
    expect(fautes(fort, [...debut, ...gestes, { g: "noter", v: verse }])).toEqual([]);
  });
  it("une lecture fausse, un indicateur oublié, une prise mal ajustée, pas d'agitation, pas de rinçage", () => {
    const { gestes, verse } = verserJusqua(9.76);
    const propre: GesteBrut[] = [...rincer, ...remplir, ...prelever, ...fois(2, { g: "goutte" }), ...agiter, ...gestes];
    expect(fautes(fort, [...propre, { g: "noter", v: verse + 0.1 }])).toEqual(["lecture"]);
    expect(fautes(fort, [...propre, { g: "noter", v: verse + 1 }])).toEqual(["lecture!"]);
    expect(fautes(fort, propre)).toEqual(["note!"]);
    expect(fautes(fort, [...rincer, ...remplir, ...prelever, ...agiter, ...gestes, { g: "noter", v: verse }])).toEqual(["indicateur!"]);
    expect(fautes(fort, [...rincer, ...remplir, ...prelever, { g: "goutte" }, { g: "dessous", quoi: "erlenmeyer" }, ...gestes, { g: "noter", v: verse }])).toContain("agitation");
    const sansRincer = joue(fort, [{ g: "dessous", quoi: "poubelle" }, ...remplir, ...prelever, { g: "goutte" }, ...agiter, ...verserJusqua(9.76 / DILUTION).gestes]);
    expect(regles.bilan(fort, { ...sansRincer, note: sansRincer.verse }).fautes.map((f) => f.code)).toEqual(["rincage"]);
    const malPrelevee: GesteBrut[] = [{ g: "pipette", ou: "becher" }, { g: "aspirer", v: 10.2 }, { g: "pipette", ou: "erlenmeyer" }, { g: "vider", v: 10.2 }];
    const etat = joue(fort, [...rincer, ...remplir, ...malPrelevee, { g: "goutte" }, ...agiter, ...verserJusqua(9.76 * 1.02).gestes]);
    expect(regles.bilan(fort, { ...etat, note: etat.verse }).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["prise"]);
  });
  it("recommencer le titrage lave l'erlenmeyer et garde la burette", () => {
    const etat = joue(fort, [...colorimetrique(fort), { g: "recommencer" }]);
    expect([etat.prise, etat.verse, etat.gouttes, etat.note, etat.essais, etat.dessous]).toEqual([0, 0, 0, null, 1, "rien"]);
    expect([etat.eauBurette, etat.volume > 10]).toEqual([false, true]);
  });
  it("un geste inconnu, mal formé ou hors bornes ne change rien", () => {
    const bizarres: GesteBrut[] = [{ g: "exploser" }, { g: "couler" }, { g: "couler", v: -3 }, { g: "couler", v: "beaucoup" }, { g: "remplir", v: 400 }, { g: "dessous", quoi: "plafond" }, { g: "pipette", ou: "poche" }, { g: "agiter", v: 12 }, { g: "noter", v: 99 }];
    expect(joue(fort, bizarres)).toEqual(joue(fort, []));
  });
});

describe("le bilan d'un titrage au pH-mètre", () => {
  it("une manipulation soignée n'a aucune faute", () => {
    const b = regles.bilan(faible, joue(faible, phmetrique(faible)));
    expect(b.fautes).toEqual([]);
    expect(b.mesures).toEqual({ VE: 13.1 });
  });
  it("il faut dépasser le saut, serrer les ajouts autour, rincer la sonde, et lire le volume avec précision", () => {
    const debut: GesteBrut[] = [...rincer, ...remplir, ...prelever, { g: "eau", v: 40 }, { g: "rincersonde" }, { g: "sonde", dans: true }, ...agiter];
    expect(fautes(faible, [...debut, ...fois(18, { g: "couler", v: 1, filet: true }), { g: "noter", v: 13.4 }])).toEqual(["espace", "lecture"]);
    expect(fautes(faible, [...debut, ...fois(12, { g: "couler", v: 1, filet: true }), { g: "noter", v: 12 }])).toEqual(["avant!", "lecture!"]);
    const sansRincerSonde = phmetrique(faible).filter((g) => g.g !== "rincersonde");
    expect(fautes(faible, sansRincerSonde)).toEqual(["rincersonde"]);
    const sansSonde = phmetrique(faible).filter((g) => g.g !== "sonde");
    expect(fautes(faible, sansSonde)).toContain("sonde!");
    const sansEau = phmetrique(faible).filter((g) => g.g !== "eau");
    expect(fautes(faible, sansEau)).toContain("sonde!");
  });
});

describe("les deux TP de titrage", () => {
  const manipulation = (etape: EtapeDePaillasse): GesteBrut[] => {
    const r = etape.paillasse.reglages as ReglagesTitrage;
    return r.suivi === "indicateur" ? colorimetrique(r) : phmetrique(r);
  };
  for (const id of ["detartrant", "vinaigre"]) {
    it(`${id} : fait avec soin, le TP donne A partout, quelle que soit la situation tirée`, async () => {
      const vues = new Set<number>();
      for (const graine of GRAINES) {
        const partie = await joueJuste(tp(id)!, graine, manipulation);
        expect(partie.scores.every((s) => s === 1), `graine ${graine} : ${partie.scores.join(" ")}`).toBe(true);
        expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "A", VAL: "A" });
        expect(partie.fautes).toEqual([[]]);
        vues.add(partie.mesures.VE);
      }
      // la graine change bien la situation
      expect(vues.size).toBe(4);
    });
  }
  it("l'exploitation se juge sur les mesures de l'élève : une étiquette démentie par sa mesure appelle « Non »", async () => {
    const t = tp("detartrant")!;
    const conclusions = new Set<number>();
    for (const graine of GRAINES) {
      const partie = await joueJuste(t, graine, manipulation);
      const derniere = partie.retours[partie.retours.length - 1].correction;
      if (derniere.genre === "choix") conclusions.add(derniere.bonne);
    }
    // selon la situation tirée, l'étiquette est confirmée ou démentie
    expect(conclusions).toEqual(new Set([0, 1]));
  });
});
