// La paillasse Archimède (lib/commun/tp/paillasses/archimede.ts) et son TP : mesurer une poussée, puis identifier un liquide.
// Les manipulations sont jouées ici sans le navigateur, geste par geste.
import { describe, expect, it } from "vitest";
import { BORD, COURSE, FILM, HAUT_CROCHET, MENISQUE, SECTION_EPROUVETTE, degage, gouttes, liquideDe, mesuresExactes, poids, poidsApparent, poussee, regles, situation, solideDe, toutImmerge, volumeSolide, type EtatArchimede, type ReglagesArchimede } from "@/lib/commun/tp/paillasses/archimede";
import { rejoue, type GesteBrut } from "@/lib/commun/tp/types";
import archimede from "@/lib/serveur/contenu/tp/archimede";
import { GRAINES, controlesCommuns, joueJuste, type EtapeDePaillasse, type ReglesDuTest } from "../../outils/tp";

const r: ReglagesArchimede = {
  solides: [{ id: "a", nom: "cylindre A", hauteur: 7, rho: 2.7 }, { id: "b", nom: "cylindre B", hauteur: 8, rho: 2.5 }, { id: "c", nom: "cylindre C", hauteur: 9, rho: 1.4 }],
  liquides: [{ id: "eau", nom: "l'eau", etiquette: "eau", rho: 1, volume: 57.5 }, { id: "x", nom: "le liquide X", etiquette: "liquide X", rho: 1.15, volume: 54 }],
  demande: "a", reference: "eau", inconnu: "x",
};
const A = solideDe(r, "a")!, EAU = liquideDe(r, "eau")!, X = liquideDe(r, "x")!;
const joue = (gestes: GesteBrut[], reglages = r): EtatArchimede => rejoue(regles, reglages, gestes);
const fautes = (gestes: GesteBrut[], reglages = r) => regles.bilan(reglages, joue(gestes, reglages)).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);
const descendre = (v: number): GesteBrut => ({ g: "potence", v });

// ---------- un élève qui manipule : il fait un geste, regarde ses appareils, note ce qu'il lit ----------
function eleve(reglages: ReglagesArchimede) {
  const gestes: GesteBrut[] = [];
  const etat = () => rejoue(regles, reglages, gestes);
  const voit = () => situation(reglages, etat());
  const fais = (...g: GesteBrut[]) => { gestes.push(...g); };
  return {
    gestes, etat, voit, fais,
    /** lit le dynamomètre à la demi-graduation près, puis note ; `erreur` décale la lecture */
    notePoids: (erreur = 0) => fais({ g: "noter", quoi: "poids", v: Math.round(voit().force / 0.005) * 0.005 + erreur }),
    /** lit le bas du ménisque à la demi-graduation près, puis note */
    noteVolume: (erreur = 0) => fais({ g: "noter", quoi: "volume", v: Math.round((voit().volume ?? 0) * 2) / 2 + erreur }),
    /** descend la potence jusqu'à ce que le solide soit sous la surface d'un bon centimètre, loin du fond */
    immerge: () => {
      const s = solideDe(reglages, etat().accroche)!;
      for (let i = 0; i < 60; i++) {
        const sit = voit();
        if (toutImmerge(sit) && (sit.volume ?? 0) / SECTION_EPROUVETTE - (sit.bas + s.hauteur) >= 1) break;
        fais(descendre(0.5));
      }
    },
    remonte: () => fais(descendre(-etat().descente)),
  };
}

/** La manipulation soignée d'une situation, avec le solide demandé. */
function soignee(reglages: ReglagesArchimede, solide = reglages.demande): GesteBrut[] {
  const e = eleve(reglages);
  e.fais({ g: "accrocher", s: solide });
  e.notePoids();
  e.fais({ g: "poser", l: reglages.reference });
  e.noteVolume();
  e.immerge();
  e.notePoids();
  e.noteVolume();
  e.remonte();
  e.fais({ g: "essuyer", s: solide }, { g: "ranger" }, { g: "poser", l: reglages.inconnu });
  e.immerge();
  e.notePoids();
  e.remonte();
  return e.gestes;
}

describe("le solide, le ressort et le liquide", () => {
  it("dans l'air, le dynamomètre indique le poids ; le ressort s'allonge d'autant", () => {
    const etat = joue([{ g: "accrocher", s: "a" }]);
    const sit = situation(r, etat);
    expect(poids(A)).toBeCloseTo(0.6489, 4);
    expect(sit.force).toBeCloseTo(poids(A), 3);
    expect([sit.immerge, sit.fond, sit.volume]).toEqual([0, false, null]);
    // le bas du cylindre : le crochet, moins sa hauteur, moins l'allongement du ressort (4 cm par newton)
    expect(sit.bas).toBeCloseTo(HAUT_CROCHET - 7 - poids(A) / 0.25, 6);
    // sans solide, le dynamomètre est à zéro
    expect(situation(r, joue([])).force).toBe(0);
  });
  it("à mesure que la potence descend, le niveau monte et le dynamomètre remonte, sans à-coup", () => {
    const debut: GesteBrut[] = [{ g: "accrocher", s: "a" }, { g: "poser", l: "eau" }];
    let avant = situation(r, joue(debut));
    expect(avant.volume).toBe(57.5);
    for (let h = 0.1; h <= COURSE; h += 0.1) {
      const sit = situation(r, joue([...debut, descendre(Math.round(h * 10) / 10)]));
      expect(sit.force, `descente ${h}`).toBeLessThanOrEqual(avant.force + 1e-9);
      expect(sit.volume!, `descente ${h}`).toBeGreaterThanOrEqual(avant.volume! - 1e-9);
      // pas de saut : un millimètre de potence change peu la lecture
      expect(Math.abs(sit.force - avant.force)).toBeLessThan(0.03);
      expect(sit.bas).toBeGreaterThanOrEqual(0);
      avant = sit;
    }
  });
  it("entièrement immergé, le solide perd ρ × V × g, et le niveau monte de son volume", () => {
    const e = eleve(r);
    e.fais({ g: "accrocher", s: "a" }, { g: "poser", l: "eau" });
    e.immerge();
    const sit = e.voit();
    expect(toutImmerge(sit) && !sit.fond).toBe(true);
    expect(volumeSolide(A)).toBe(24.5);
    expect(sit.volume).toBe(82);
    expect(poids(A) - sit.force).toBeCloseTo(poussee(1, 24.5), 3);
    expect(poussee(1, 24.5)).toBeCloseTo(1000 * 24.5e-6 * 9.81, 9);
    expect(sit.force).toBeCloseTo(poidsApparent(A, EAU), 3);
    // dans un liquide plus dense, la poussée est plus grande
    expect(poidsApparent(A, X)).toBeLessThan(poidsApparent(A, EAU));
  });
  it("à moitié immergé, il ne reçoit qu'une part de la poussée", () => {
    const debut: GesteBrut[] = [{ g: "accrocher", s: "a" }, { g: "poser", l: "eau" }];
    const e = eleve(r);
    e.fais(...debut);
    while (e.voit().immerge < 0.5) e.fais(descendre(0.1));
    const sit = e.voit();
    expect(sit.immerge).toBeGreaterThan(0.45);
    expect(sit.immerge).toBeLessThan(0.6);
    expect(poids(A) - sit.force).toBeCloseTo(poussee(1, sit.volume! - 57.5), 2);
  });
  it("posé sur le fond, il ne tire presque plus sur le ressort ; potence en bas, le fil est détendu", () => {
    const debut: GesteBrut[] = [{ g: "accrocher", s: "a" }, { g: "poser", l: "eau" }];
    const e = eleve(r);
    e.fais(...debut);
    while (!e.voit().fond) e.fais(descendre(0.1));
    const pose = e.voit();
    expect([pose.bas, pose.volume, toutImmerge(pose)]).toEqual([0, 82, true]);
    expect(pose.force).toBeLessThan(poidsApparent(A, EAU));
    e.fais(descendre(1));
    expect(e.voit().force).toBeLessThan(pose.force - 0.2);
    expect(situation(r, joue([...debut, descendre(COURSE)])).force).toBe(0);
    // sans éprouvette, le solide finit sur le socle
    const socle = situation(r, joue([{ g: "accrocher", s: "a" }, descendre(COURSE)]));
    expect([socle.fond, socle.bas, socle.volume]).toEqual([true, -0.8, null]);
    // dans très peu de liquide, le solide posé dépasse de la surface
    const peu: ReglagesArchimede = { ...r, liquides: [{ ...EAU, volume: 10 }, X] };
    const sec = situation(peu, joue([...debut, descendre(COURSE)], peu));
    expect(sec.fond).toBe(true);
    expect(sec.immerge).toBeCloseTo(10 / (6 - 3.5) / 7, 6);
  });
});

describe("les gestes", () => {
  it("un seul solide au crochet ; on ne l'accroche ni ne le décroche dans une éprouvette", () => {
    expect(joue([{ g: "accrocher", s: "a" }, { g: "accrocher", s: "b" }]).accroche).toBe("a");
    expect(joue([{ g: "accrocher", s: "a" }, { g: "decrocher" }, { g: "accrocher", s: "b" }]).accroche).toBe("b");
    expect(joue([{ g: "decrocher" }]).accroche).toBeNull();
    // crochet descendu dans l'éprouvette : il faut remonter la potence
    const bas: GesteBrut[] = [{ g: "poser", l: "eau" }, descendre(8)];
    expect(joue([...bas, { g: "accrocher", s: "a" }]).accroche).toBeNull();
    const dedans: GesteBrut[] = [{ g: "accrocher", s: "a" }, { g: "poser", l: "eau" }, descendre(15)];
    expect(joue([...dedans, { g: "decrocher" }]).accroche).toBe("a");
    expect(joue([...dedans, descendre(-15), { g: "decrocher" }]).accroche).toBeNull();
    // sans éprouvette dessous, le solide se décroche à toute hauteur
    expect(joue([{ g: "accrocher", s: "a" }, descendre(15), { g: "decrocher" }]).accroche).toBeNull();
  });
  it("une éprouvette se glisse sous le dynamomètre, ou en sort, seulement quand rien ne pend plus bas que son bord", () => {
    expect(BORD).toBeCloseTo(17.67, 2);
    expect(joue([{ g: "poser", l: "eau" }, { g: "poser", l: "x" }]).dessous).toBe("eau");
    expect(joue([{ g: "poser", l: "eau" }, { g: "ranger" }, { g: "poser", l: "x" }]).dessous).toBe("x");
    expect(joue([{ g: "ranger" }]).dessous).toBeNull();
    const bas: GesteBrut[] = [{ g: "accrocher", s: "a" }, descendre(10)];
    expect(degage(r, joue(bas))).toBe(false);
    expect(joue([...bas, { g: "poser", l: "eau" }]).dessous).toBeNull();
    const dedans: GesteBrut[] = [{ g: "accrocher", s: "a" }, { g: "poser", l: "eau" }, descendre(15)];
    expect(joue([...dedans, { g: "ranger" }]).dessous).toBe("eau");
    expect(joue([...dedans, descendre(-15), { g: "ranger" }]).dessous).toBeNull();
    // le crochet nu gêne aussi quand il est descendu dans l'éprouvette
    expect(degage(r, joue([descendre(13)]))).toBe(false);
    expect(degage(r, joue([descendre(12)]))).toBe(true);
  });
  it("la potence reste dans sa course, et deux déplacements dans le même sens valent leur somme", () => {
    expect(joue([descendre(40)]).descente).toBe(0);
    expect(joue([descendre(20), descendre(20)]).descente).toBe(COURSE);
    expect(joue([descendre(-3)]).descente).toBe(0);
    const debut: GesteBrut[] = [{ g: "accrocher", s: "a" }, { g: "poser", l: "eau" }];
    expect(joue([...debut, descendre(7.35), descendre(6.4)])).toEqual(joue([...debut, descendre(13.75)]));
    expect(joue([...debut, descendre(20), descendre(-4.2), descendre(-9.05)])).toEqual(joue([...debut, descendre(20), descendre(-13.25)]));
    expect(joue([...debut, descendre(15), descendre(15)])).toEqual(joue([...debut, descendre(COURSE)]));
  });
  it("un solide sorti du liquide est mouillé : il pèse quelques gouttes de plus, jusqu'à ce qu'on l'essuie", () => {
    const e = eleve(r);
    e.fais({ g: "accrocher", s: "a" }, { g: "poser", l: "eau" });
    expect(e.etat().humide).toEqual({});
    e.immerge();
    e.remonte();
    expect(e.etat().humide).toEqual({ a: { liquide: "eau", part: 1, melange: false } });
    expect(e.voit().force).toBeCloseTo(poids(A) + FILM, 3);
    // trempé à moitié seulement, il ne porte que la moitié des gouttes
    const demi = eleve(r);
    demi.fais({ g: "accrocher", s: "a" }, { g: "poser", l: "eau" });
    while (demi.voit().immerge < 0.5) demi.fais(descendre(0.05));
    const part = demi.voit().immerge;
    demi.remonte();
    expect(demi.etat().humide.a.part).toBeCloseTo(part, 9);
    expect(gouttes(demi.etat(), "a")).toBeCloseTo(FILM * part, 9);
    expect(demi.voit().force).toBeCloseTo(poids(A) + FILM * part, 3);
    // replongé, il retrouve le même équilibre qu'un solide sec
    const sec = eleve(r);
    sec.fais({ g: "accrocher", s: "a" }, { g: "poser", l: "eau" });
    sec.immerge();
    demi.immerge();
    expect(demi.voit()).toEqual(sec.voit());
    // on n'essuie pas un solide qui est dans le liquide
    const dans = eleve(r);
    dans.fais({ g: "accrocher", s: "a" }, { g: "poser", l: "eau" });
    dans.immerge();
    dans.fais({ g: "essuyer", s: "a" });
    expect(dans.etat().humide.a).toBeDefined();
    e.fais({ g: "essuyer", s: "a" });
    expect(e.etat().humide).toEqual({});
    expect(e.voit().force).toBeCloseTo(poids(A), 3);
    // essuyer un solide sec, ou inconnu, ne change rien
    expect(joue([{ g: "essuyer", s: "a" }, { g: "essuyer", s: "z" }])).toEqual(joue([]));
  });
  it("plongé encore mouillé dans un autre liquide, le solide y mêle le premier ; reposé mouillé, il le reste", () => {
    const e = eleve(r);
    e.fais({ g: "accrocher", s: "a" }, { g: "poser", l: "eau" });
    e.immerge();
    e.remonte();
    e.fais({ g: "ranger" }, { g: "poser", l: "x" });
    e.immerge();
    expect(e.etat().humide.a).toEqual({ liquide: "x", part: 1, melange: true });
    e.remonte();
    e.fais({ g: "ranger" }, { g: "decrocher" });
    expect(e.etat().humide.a).toEqual({ liquide: "x", part: 1, melange: true });
    // essuyé sur la paillasse, il est de nouveau sec
    e.fais({ g: "essuyer", s: "a" });
    expect(e.etat().humide).toEqual({});
  });
  it("une lecture se range selon ce qui est sous le dynamomètre au moment où elle est notée", () => {
    const e = eleve(r);
    // sans solide, rien à peser ; sans éprouvette, pas de volume
    e.fais({ g: "noter", quoi: "poids", v: 0.5 }, { g: "noter", quoi: "volume", v: 50 });
    expect(e.etat().notes).toEqual({});
    e.fais({ g: "accrocher", s: "a" });
    e.notePoids();
    e.fais({ g: "poser", l: "eau" });
    e.noteVolume();
    e.immerge();
    e.notePoids();
    e.noteVolume();
    const notes = e.etat().notes;
    expect(Object.keys(notes)).toEqual(["air", "eau:avant", "eau:poids", "eau:apres"]);
    expect(notes.air).toEqual({ v: 0.65, vrai: 0.649, solide: "a", immerge: 0, fond: false, gouttes: 0, mele: false });
    expect(notes["eau:avant"]).toEqual({ v: 57.5, vrai: 57.5, solide: "", immerge: 0, fond: false, gouttes: 0, mele: false });
    expect(notes["eau:apres"]).toMatchObject({ v: 82, vrai: 82, solide: "a", immerge: 1 });
    expect(notes["eau:poids"]).toMatchObject({ v: 0.41, vrai: 0.409, solide: "a", immerge: 1, fond: false });
    // noter de nouveau remplace la lecture
    e.fais({ g: "noter", quoi: "volume", v: 81.5 });
    expect(e.etat().notes["eau:apres"].v).toBe(81.5);
  });
  it("un geste inconnu, mal formé ou hors bornes ne change rien", () => {
    const bizarres: GesteBrut[] = [{ g: "plonger" }, { g: "accrocher" }, { g: "accrocher", s: "z" }, { g: "accrocher", s: 3 }, { g: "poser", l: "huile" }, { g: "poser" }, { g: "potence" },
      { g: "potence", v: 0 }, { g: "potence", v: 400 }, { g: "potence", v: "bas" }, { g: "noter", quoi: "masse", v: 3 }, { g: "noter", v: 3 }, { g: "essuyer" }, { g: "ranger" }, { g: "decrocher" }];
    expect(joue(bizarres)).toEqual(joue([]));
    const debut: GesteBrut[] = [{ g: "accrocher", s: "a" }, { g: "poser", l: "eau" }];
    expect(joue([...debut, { g: "noter", quoi: "poids", v: -1 }, { g: "noter", quoi: "poids", v: 9 }, { g: "noter", quoi: "poids" }, { g: "noter", quoi: "volume", v: 900 }, { g: "noter", quoi: "volume", v: -2 }])).toEqual(joue(debut));
  });
});

describe("le bilan", () => {
  it("une manipulation soignée n'a aucune faute, et rend les cinq mesures de l'élève", () => {
    const b = regles.bilan(r, joue(soignee(r)));
    expect(b.fautes).toEqual([]);
    expect(b.score).toBe(1);
    expect(b.mesures).toEqual({ P: 0.65, V0: 57.5, V1: 82, Pe: 0.41, Px: 0.375 });
    expect(b.lignes).toHaveLength(5);
    expect(b.lignes[0]).toBe("Poids dans l'air : P = 0,65 N.");
  });
  it("sans aucune mesure, la manipulation vaut zéro, et le professeur donne ses valeurs", () => {
    const b = regles.bilan(r, joue([{ g: "accrocher", s: "a" }, { g: "poser", l: "eau" }, descendre(15)]));
    expect([b.score, b.fautes.map((f) => f.code)]).toEqual([0, ["mesures"]]);
    expect(b.mesures).toEqual(mesuresExactes(r, A));
    expect(b.mesures).toEqual({ P: 0.649, V0: 57.5, V1: 82, Pe: 0.409, Px: 0.373 });
    expect(regles.bilan(r, joue([])).score).toBe(0);
  });
  it("chaque mesure oubliée est une faute importante ; le professeur la fournit pour la suite", () => {
    const sans = (cle: (g: GesteBrut, i: number, tous: GesteBrut[]) => boolean) => soignee(r).filter((g, i, tous) => !cle(g, i, tous));
    const notes = soignee(r).flatMap((g, i) => (g.g === "noter" ? [i] : []));
    // dans l'ordre de la manipulation : poids dans l'air, volume de départ, poids apparent, volume avec le solide, poids dans le liquide X
    expect(fautes(sans((_, i) => i === notes[0]))).toEqual(["poids!"]);
    expect(fautes(sans((_, i) => i === notes[1]))).toEqual(["volume!"]);
    expect(fautes(sans((_, i) => i === notes[2]))).toEqual(["apparent!"]);
    expect(fautes(sans((_, i) => i === notes[3]))).toEqual(["volume!"]);
    expect(fautes(sans((_, i) => i === notes[4]))).toEqual(["inconnu!"]);
    expect(fautes(sans((g) => g.quoi === "volume"))).toEqual(["volume!"]);
    const b = regles.bilan(r, joue(sans((_, i) => i === notes[4])));
    expect(b.mesures.Px).toBe(0.373);
    expect(b.score).toBe(0.5);
  });
  it("le solide qui touche le fond : le dynamomètre indique trop peu, et le professeur le dit avec ses chiffres", () => {
    const e = eleve(r);
    e.fais({ g: "accrocher", s: "a" });
    e.notePoids();
    e.fais({ g: "poser", l: "eau" });
    e.noteVolume();
    while (!e.voit().fond) e.fais(descendre(0.5));
    e.fais(descendre(0.5));
    e.notePoids();
    e.noteVolume();
    e.remonte();
    e.fais({ g: "essuyer", s: "a" }, { g: "ranger" }, { g: "poser", l: "x" });
    e.immerge();
    e.notePoids();
    const b = regles.bilan(r, e.etat());
    expect(b.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["fond!"]);
    expect(b.fautes[0].texte).toContain("sans toucher le fond, il indique 0,409 N");
    // sa mesure porte la trace du geste : un poids apparent trop faible
    expect(b.mesures.Pe).toBeLessThan(0.3);
    // posé sur le socle, le solide n'est pas pesé non plus
    expect(fautes([{ g: "accrocher", s: "a" }, descendre(COURSE), { g: "noter", quoi: "poids", v: 0 }])).toContain("fond!");
  });
  it("le solide pas entièrement immergé : faute légère s'il dépasse à peine, importante sinon", () => {
    const partiel = (part: number) => {
      const e = eleve(r);
      e.fais({ g: "accrocher", s: "a" });
      e.notePoids();
      e.fais({ g: "poser", l: "eau" });
      e.noteVolume();
      while (e.voit().immerge < part) e.fais(descendre(0.05));
      e.notePoids();
      e.immerge();
      e.noteVolume();
      e.remonte();
      e.fais({ g: "essuyer", s: "a" }, { g: "ranger" }, { g: "poser", l: "x" });
      e.immerge();
      e.notePoids();
      return regles.bilan(r, e.etat());
    };
    expect(partiel(0.5).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["immersion!"]);
    expect(partiel(0.5).fautes[0].texte).toMatch(/immergé qu'à 5\d % dans l'eau quand tu as lu le dynamomètre/);
    expect(partiel(0.93).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["immersion"]);
    // un volume lu avant la fin de l'immersion
    const e = eleve(r);
    e.fais({ g: "accrocher", s: "a" }, { g: "poser", l: "eau" });
    while (e.voit().immerge < 0.3) e.fais(descendre(0.05));
    e.noteVolume();
    expect(regles.bilan(r, e.etat()).fautes.find((f) => f.code === "immersion")?.texte).toContain("quand tu as lu le volume");
  });
  it("le solide mouillé : pesé dans l'air avec ses gouttes, ou plongé dans l'autre liquide sans être essuyé", () => {
    // il pèse le solide après l'avoir plongé, sans l'essuyer
    const e = eleve(r);
    e.fais({ g: "accrocher", s: "a" }, { g: "poser", l: "eau" });
    e.noteVolume();
    e.immerge();
    e.notePoids();
    e.noteVolume();
    e.remonte();
    e.notePoids();
    e.fais({ g: "essuyer", s: "a" }, { g: "ranger" }, { g: "poser", l: "x" });
    e.immerge();
    e.notePoids();
    const b = regles.bilan(r, e.etat());
    expect(b.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["mouille"]);
    expect(b.mesures.P).toBe(0.665);
    // il ne l'essuie pas entre les deux liquides
    expect(fautes(soignee(r).filter((g) => g.g !== "essuyer"))).toEqual(["essuyage"]);
  });
  it("les lectures : un dynamomètre mal lu, le bord du ménisque, une graduation de travers", () => {
    const avec = (rang: number, erreur: number) => {
      const gestes = soignee(r);
      const notes = gestes.flatMap((g, i) => (g.g === "noter" ? [i] : []));
      return gestes.map((g, i) => (i === notes[rang] ? { ...g, v: (g.v as number) + erreur } : g));
    };
    expect(fautes(avec(0, 0.01))).toEqual([]);
    expect(fautes(avec(0, 0.02))).toEqual(["dynamometre"]);
    expect(fautes(avec(2, -0.1))).toEqual(["dynamometre!"]);
    expect(fautes(avec(1, MENISQUE))).toEqual(["menisque"]);
    expect(fautes(avec(3, MENISQUE))).toEqual(["menisque"]);
    expect(fautes(avec(1, -1))).toEqual(["eprouvette"]);
    expect(fautes(avec(3, 5))).toEqual(["eprouvette!"]);
    expect(regles.bilan(r, joue(avec(1, MENISQUE))).fautes[0].texte).toContain("Tu as noté 58,0 mL ; le bas du ménisque était à 57,5 mL");
    // les deux niveaux lus au bord du ménisque : la différence reste juste, la faute est dite une fois
    const deux = avec(1, MENISQUE).map((g, i, tous) => (i === tous.flatMap((x, j) => (x.g === "noter" ? [j] : []))[3] ? { ...g, v: (g.v as number) + MENISQUE } : g));
    expect(fautes(deux)).toEqual(["menisque"]);
    expect(regles.bilan(r, joue(deux)).mesures).toMatchObject({ V0: 58, V1: 82.5 });
  });
  it("un autre solide que celui du sujet est une faute légère ; deux solides mêlés, une faute importante", () => {
    const autre = regles.bilan(r, joue(soignee(r, "b")));
    expect(autre.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["solide"]);
    expect(autre.mesures.V1 - autre.mesures.V0).toBe(28);
    // pesé dans l'air avec le cylindre A, plongé avec le cylindre B
    const e = eleve(r);
    e.fais({ g: "accrocher", s: "a" });
    e.notePoids();
    e.fais({ g: "decrocher" }, { g: "accrocher", s: "b" }, { g: "poser", l: "eau" });
    e.noteVolume();
    e.immerge();
    e.notePoids();
    e.noteVolume();
    e.remonte();
    e.fais({ g: "essuyer", s: "b" }, { g: "ranger" }, { g: "poser", l: "x" });
    e.immerge();
    e.notePoids();
    expect(regles.bilan(r, e.etat()).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["melange!"]);
  });
  it("des relevés qui rendent le calcul impossible : le professeur donne ses valeurs", () => {
    const gestes = soignee(r);
    const notes = gestes.flatMap((g, i) => (g.g === "noter" ? [i] : []));
    // le volume avec le solide noté plus petit que le volume de départ
    const b = regles.bilan(r, joue(gestes.map((g, i) => (i === notes[3] ? { ...g, v: 50 } : g))));
    expect(b.fautes.map((f) => f.code)).toEqual(["eprouvette", "releves"]);
    expect(b.mesures).toEqual(mesuresExactes(r, A));
    expect(b.score).toBe(0);
    // un poids apparent noté plus grand que le poids dans l'air
    const c = regles.bilan(r, joue(gestes.map((g, i) => (i === notes[2] ? { ...g, v: 0.9 } : g))));
    expect(c.fautes.map((f) => f.code)).toEqual(["dynamometre", "releves"]);
    expect(c.lignes).toHaveLength(1);
  });
  it("des réglages sans liquide de référence ne donnent pas de bilan", () => {
    expect(regles.bilan({ ...r, reference: "rien" }, joue([]))).toEqual({ score: 0, fautes: [], mesures: {}, lignes: [] });
    expect(mesuresExactes({ ...r, reference: "rien", inconnu: "rien" }, A)).toMatchObject({ V0: 0, Pe: 0, Px: 0 });
  });
});

describe("le TP de la poussée d'Archimède", () => {
  // le TP est en construction : il n'est pas inscrit dans l'application, le test donne ses règles
  const sesRegles = { archimede: regles } as ReglesDuTest;
  const manipulation = (etape: EtapeDePaillasse): GesteBrut[] => soignee(etape.paillasse.reglages as ReglagesArchimede);
  it("une situation à lire, une manipulation, les quatre compétences, rien de la réponse dans le navigateur, D partout sans rien faire", async () => {
    await controlesCommuns(archimede, sesRegles);
    expect(archimede.etapes(1)).toHaveLength(11);
    expect(archimede.fiche).toBe(4);
  });
  it("fait avec soin, le TP donne A partout, quelle que soit la situation tirée", async () => {
    const solides = new Set<string>(), liquides = new Set<number>(), identifies = new Set<number>();
    for (const graine of GRAINES) {
      const partie = await joueJuste(archimede, graine, manipulation, sesRegles);
      expect(partie.scores.every((s) => s === 1), `graine ${graine} : ${partie.scores.join(" ")}`).toBe(true);
      expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "A", VAL: "A" });
      expect(partie.fautes).toEqual([[]]);
      const reglages = (partie.etapes.find((e) => e.genre === "paillasse") as EtapeDePaillasse).paillasse.reglages as ReglagesArchimede;
      solides.add(reglages.demande);
      liquides.add(liquideDe(reglages, "x")!.rho);
      // la relation est vérifiée, et le liquide retrouvé est bien celui du flacon
      const [verifiee, identifie] = partie.retours.flatMap((x) => (x.correction.genre === "choix" ? [x.correction] : [])).slice(-2);
      expect(verifiee.bonne).toBe(0);
      expect(identifie.explication).not.toContain("en réalité");
      identifies.add(identifie.bonne);
    }
    // la graine change bien la situation : le cylindre, et le liquide du flacon
    expect(solides.size).toBe(3);
    expect(liquides.size).toBe(4);
    expect(identifies.size).toBe(4);
  });
  it("l'exploitation se juge sur les mesures de l'élève : un solide posé sur le fond fausse la conclusion, pas le calcul", async () => {
    const baclee = (etape: EtapeDePaillasse): GesteBrut[] => {
      const reglages = etape.paillasse.reglages as ReglagesArchimede;
      const e = eleve(reglages);
      e.fais({ g: "accrocher", s: reglages.demande });
      e.notePoids();
      e.fais({ g: "poser", l: "eau" });
      e.noteVolume();
      e.fais(descendre(COURSE - 1));
      e.notePoids();
      e.noteVolume();
      e.remonte();
      e.fais({ g: "ranger" }, { g: "poser", l: "x" });
      e.immerge();
      e.notePoids();
      return e.gestes;
    };
    const partie = await joueJuste(archimede, 3, baclee, sesRegles);
    expect(partie.fautes).toEqual([["fond", "essuyage"]]);
    expect(partie.scores[4]).toBe(0.25);
    expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "D", VAL: "A" });
    // avec ce poids apparent trop faible, la relation ne semble pas vérifiée : « Non » est la réponse juste
    const verifiee = partie.retours.flatMap((x) => (x.correction.genre === "choix" ? [x.correction] : [])).slice(-2)[0];
    expect(verifiee.bonne).toBe(1);
  });
});
