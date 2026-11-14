// La paillasse Pile (lib/commun/tp/paillasses/pile.ts) et son TP : construire trois piles, mesurer leur tension, classer
// les métaux. Les manipulations sont jouées ici sans le navigateur, geste par geste.
import { describe, expect, it } from "vitest";
import { FILS_MAX, POSITIONS, affichage, bornes, clePile, mesure, mesuresExactes, potentiel, regles, tensionDe, type EtatPile, type ReglagesPile } from "@/lib/commun/tp/paillasses/pile";
import { rejoue, type GesteBrut } from "@/lib/commun/tp/types";
import pile from "@/lib/serveur/contenu/tp/pile";
import { GRAINES, controlesCommuns, joueJuste, type EtapeDePaillasse, type ReglesDuTest } from "../../outils/tp";

// du zinc, du cuivre et du fer : le fer est entre les deux
const r: ReglagesPile = {
  demiPiles: [
    { id: "zn", metal: "le zinc", symbole: "Zn", solution: "sulfate de zinc", potentiel: -0.762, teinte: 0 },
    { id: "cu", metal: "le cuivre", symbole: "Cu", solution: "sulfate de cuivre", potentiel: 0.337, teinte: 1 },
    { id: "fe", metal: "le fer", symbole: "Fe", solution: "sulfate de fer", potentiel: -0.441, teinte: 2 },
  ],
  piles: [["zn", "cu"], ["fe", "cu"], ["zn", "fe"]],
};
const joue = (gestes: GesteBrut[], reglages = r): EtatPile => rejoue(regles, reglages, gestes);
const fautes = (gestes: GesteBrut[], reglages = r) => regles.bilan(reglages, joue(gestes, reglages)).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);
const position = (nom: string) => POSITIONS.findIndex((p) => p.nom === nom);
const selecteur = (nom: string): GesteBrut => ({ g: "selecteur", v: position(nom) });
const relier = (a: string, b: string): GesteBrut => ({ g: "relier", a, b });
const retirer = (a: string, b: string): GesteBrut => ({ g: "retirer", a, b });
const pont = (a: string, b: string): GesteBrut => ({ g: "pont", a, b });
const lame = (l: string, dans: string): GesteBrut => ({ g: "lame", l, dans });
/** Chaque lame dans sa solution. */
const lames = (reglages: ReglagesPile): GesteBrut[] => reglages.demiPiles.map((d) => lame(d.id, d.id));
/** La pile zinc-cuivre, montée et branchée : borne COM sur le zinc, borne V sur le cuivre. */
const daniell: GesteBrut[] = [...lames(r), pont("zn", "cu"), relier("com", "zn"), relier("v", "cu")];

// ---------- un élève qui manipule : il monte, branche, lit l'afficheur, note ce qu'il lit et la borne qu'il en déduit ----------
function eleve(reglages: ReglagesPile) {
  const gestes: GesteBrut[] = [];
  const etat = () => rejoue(regles, reglages, gestes);
  const fais = (...g: GesteBrut[]) => { gestes.push(...g); };
  return {
    gestes, etat, fais,
    /** lit l'afficheur et note la tension ; la borne positive est celle de la borne V si la tension est positive */
    note: (erreur = 0, inverse = false) => {
      const lu = affichage(reglages, etat()).valeur ?? 0;
      const couple = mesure(reglages, etat()).couple ?? ["?", "?"];
      fais({ g: "noter", v: Math.abs(lu) + erreur, plus: (lu >= 0) !== inverse ? couple[0] : couple[1] });
    },
  };
}

/** La manipulation soignée d'une situation : chaque pile avec la borne COM sur sa première lame et la borne V sur la seconde. */
function soignee(reglages: ReglagesPile): GesteBrut[] {
  const e = eleve(reglages);
  e.fais(...lames(reglages), selecteur("2 V"));
  let branches: [string, string] | null = null;
  for (const [a, b] of reglages.piles) {
    if (branches) e.fais(retirer("com", branches[0]), retirer("v", branches[1]));
    e.fais(pont(a, b), relier("com", a), relier("v", b));
    branches = [a, b];
    e.note();
  }
  return e.gestes;
}

describe("la pile et le multimètre", () => {
  it("deux lames dans leurs solutions, un pont salin, la borne COM et la borne V : le voltmètre affiche la tension à vide", () => {
    expect(tensionDe(r, "cu", "zn")).toBe(1.099);
    const etat = joue([...daniell, selecteur("2 V")]);
    expect(mesure(r, etat)).toEqual({ couple: ["cu", "zn"], tension: 1.099, pont: true, court: false });
    expect(affichage(r, etat)).toEqual({ eteint: false, texte: "1,099", unite: "V", valeur: 1.099, depasse: false });
    // le pont salin posé dans l'autre sens, c'est le même pont
    expect(mesure(r, joue([...lames(r), pont("cu", "zn"), relier("com", "zn"), relier("v", "cu")])).tension).toBe(1.099);
  });
  it("les fils inversés changent le signe : la borne V sur la lame négative donne une tension négative", () => {
    const inverse = joue([...lames(r), pont("zn", "cu"), relier("com", "cu"), relier("v", "zn"), selecteur("2 V")]);
    expect(mesure(r, inverse).couple).toEqual(["zn", "cu"]);
    expect(affichage(r, inverse)).toMatchObject({ texte: "−1,099", valeur: -1.099 });
  });
  it("sans pont salin entre les deux béchers, le circuit est ouvert : zéro", () => {
    expect(affichage(r, joue([...lames(r), relier("com", "zn"), relier("v", "cu"), selecteur("2 V")]))).toMatchObject({ texte: "0,000", valeur: 0 });
    // un pont posé entre deux autres béchers ne ferme pas ce circuit-là
    const ailleurs = joue([...lames(r), pont("cu", "fe"), relier("com", "zn"), relier("v", "cu"), selecteur("2 V")]);
    expect(mesure(r, ailleurs)).toEqual({ couple: ["cu", "zn"], tension: 0, pont: false, court: false });
    // le pont rangé, la tension retombe
    expect(affichage(r, joue([...daniell, selecteur("2 V"), { g: "pont", a: "repos" }])).valeur).toBe(0);
    expect(joue([{ g: "pont", a: "repos" }])).toEqual(joue([]));
  });
  it("le calibre : trop petit, l'afficheur dépasse ; trop grand, il perd des chiffres", () => {
    const sur = (nom: string) => affichage(r, joue([...daniell, selecteur(nom)]));
    expect(sur("200 mV")).toEqual({ eteint: false, texte: "1 .", unite: "mV", valeur: null, depasse: true });
    expect(sur("2 V").texte).toBe("1,099");
    expect(sur("20 V")).toMatchObject({ texte: "1,10", valeur: 1.1 });
    expect(sur("200 V")).toMatchObject({ texte: "1,1", valeur: 1.1 });
    // fils inversés et calibre trop petit : le dépassement garde son signe
    expect(affichage(r, joue([...lames(r), pont("zn", "cu"), relier("com", "cu"), relier("v", "zn"), selecteur("200 mV")])).texte).toBe("−1 .");
    // une petite tension se lit en millivolts sur le calibre 200 mV
    const proches: ReglagesPile = { ...r, demiPiles: [r.demiPiles[0], { ...r.demiPiles[1], potentiel: -0.6437 }, r.demiPiles[2]] };
    expect(affichage(proches, joue([...daniell, selecteur("200 mV")], proches))).toEqual({ eteint: false, texte: "118,3", unite: "mV", valeur: 0.1183, depasse: false });
  });
  it("à l'arrêt, en alternatif ou en ampèremètre, l'afficheur ne donne pas la tension", () => {
    expect(affichage(r, joue(daniell))).toMatchObject({ eteint: true, valeur: null });
    expect(affichage(r, joue([...daniell, selecteur("V ~")]))).toMatchObject({ texte: "0,0", unite: "V", valeur: 0 });
    expect(affichage(r, joue([...daniell, selecteur("mA")]))).toMatchObject({ texte: "0,0", unite: "mA", valeur: null });
    expect(joue([{ g: "selecteur", v: 9 }, { g: "selecteur", v: 1.5 }, { g: "selecteur", v: 0 }, { g: "selecteur" }])).toEqual(joue([]));
  });
  it("l'ampèremètre aux bornes de la pile : rien ne limite le courant, le fusible saute", () => {
    expect(joue(daniell).fusible).toBe(true);
    const court = joue([...lames(r), pont("zn", "cu"), relier("com", "zn"), relier("a", "cu")]);
    expect(court.fusible).toBe(false);
    // c'est le dernier geste qui ferme le circuit, quel qu'il soit : un fil, une lame plongée, le pont salin
    expect(joue([...lames(r), relier("com", "zn"), relier("a", "cu"), pont("zn", "cu")]).fusible).toBe(false);
    expect(joue([lame("zn", "zn"), pont("zn", "cu"), relier("com", "zn"), relier("a", "cu"), lame("cu", "cu")]).fusible).toBe(false);
    // sans pont, ou avec les deux fils sur la même lame, il ne passe rien
    expect(joue([...lames(r), relier("com", "zn"), relier("a", "cu")]).fusible).toBe(true);
    expect(joue([...lames(r), pont("zn", "cu"), relier("com", "zn"), relier("a", "zn")]).fusible).toBe(true);
    expect(joue([...lames(r), pont("zn", "cu"), relier("com", "a"), relier("a", "cu"), relier("com", "zn")]).fusible).toBe(true);
    // le fusible sauté, le voltmètre marche encore
    expect(affichage(r, joue([...lames(r), pont("zn", "cu"), relier("com", "zn"), relier("a", "cu"), relier("v", "cu"), selecteur("2 V")])).valeur).toBe(1.099);
  });
  it("un fil d'une lame à l'autre met la pile en court-circuit ; les deux bornes sur la même lame ne mesurent rien", () => {
    const court = joue([...daniell, relier("zn", "cu"), selecteur("2 V")]);
    expect(mesure(r, court)).toEqual({ couple: ["zn", "cu"], tension: 0, pont: true, court: true });
    expect(mesure(r, joue([...lames(r), pont("zn", "cu"), relier("com", "zn"), relier("v", "zn")]))).toEqual({ couple: null, tension: 0, pont: false, court: false });
    // une borne en l'air, ou sur une lame restée sur le plateau
    expect(mesure(r, joue([...lames(r), pont("zn", "cu"), relier("v", "cu")])).couple).toBeNull();
    expect(mesure(r, joue([lame("cu", "cu"), pont("zn", "cu"), relier("com", "zn"), relier("v", "cu")])).couple).toBeNull();
  });
  it("une lame dans la mauvaise solution ne fait plus la même demi-pile", () => {
    // le zinc, plus réducteur que le cuivre, se couvre de cuivre dans le sulfate de cuivre : il prend son potentiel
    expect(potentiel(r, "zn", "cu")).toBe(0.337);
    // le cuivre dans le sulfate de zinc n'a pas ses ions autour de lui : son potentiel est plus bas
    expect(potentiel(r, "cu", "zn")).toBeCloseTo(0.157, 6);
    expect(potentiel(r, "cu", "cu")).toBe(0.337);
    expect(potentiel(r, "cu", "rien")).toBe(0);
    const echangees = joue([lame("zn", "cu"), lame("cu", "zn"), pont("zn", "cu"), relier("com", "zn"), relier("v", "cu"), selecteur("2 V")]);
    expect(affichage(r, echangees).valeur).toBe(-0.18);
  });
});

describe("les gestes", () => {
  it("une lame trempe dans un bécher libre, un seul à la fois ; elle se repose sur le plateau", () => {
    expect(joue([lame("zn", "zn")]).lames).toEqual({ zn: "zn" });
    expect(joue([lame("zn", "zn"), lame("cu", "zn")]).lames).toEqual({ zn: "zn" });
    expect(joue([lame("zn", "zn"), lame("zn", "cu")]).lames).toEqual({ zn: "cu" });
    expect(joue([lame("zn", "zn"), lame("zn", "plateau")]).lames).toEqual({});
    expect(joue([lame("zn", "plateau"), lame("zn", "evier"), lame("or", "zn"), lame("zn", "zn"), lame("zn", "zn")])).toEqual(joue([lame("zn", "zn")]));
  });
  it("le pont salin relie deux béchers différents, n'importe lesquels", () => {
    expect(joue([pont("zn", "fe")]).pont).toEqual(["zn", "fe"]);
    expect(joue([pont("zn", "cu"), pont("cu", "fe")]).pont).toEqual(["cu", "fe"]);
    expect(joue([pont("zn", "zn"), pont("zn", "or"), { g: "pont" }])).toEqual(joue([]));
    expect(joue([pont("zn", "cu"), pont("cu", "zn")])).toEqual(joue([pont("zn", "cu")]));
  });
  it("les fils : entre deux bornes connues, quatre au plus, un seul par paire de bornes", () => {
    expect(bornes(r)).toEqual(["com", "v", "a", "zn", "cu", "fe"]);
    expect(joue([relier("com", "zn"), relier("zn", "com")]).fils).toEqual([["com", "zn"]]);
    expect(joue([relier("com", "com"), relier("com", "terre"), { g: "relier", a: "com" }, retirer("com", "zn")])).toEqual(joue([]));
    expect(joue([relier("com", "zn"), relier("v", "cu"), relier("a", "fe"), relier("zn", "cu"), relier("cu", "fe")]).fils).toHaveLength(FILS_MAX);
    expect(joue([relier("com", "zn"), relier("v", "cu"), retirer("zn", "com")]).fils).toEqual([["v", "cu"]]);
  });
  it("une tension ne se note que si le multimètre est branché sur deux lames qui trempent, avec l'une d'elles pour borne positive", () => {
    expect(joue([selecteur("2 V"), { g: "noter", v: 1.1, plus: "cu" }]).notes).toEqual({});
    const pret = [...daniell, selecteur("2 V")];
    expect(joue([...pret, { g: "noter", v: 1.1, plus: "fe" }, { g: "noter", v: -1, plus: "cu" }, { g: "noter", v: 900, plus: "cu" }, { g: "noter", plus: "cu" }, { g: "noter", v: 1.1 }])).toEqual(joue(pret));
    const note = joue([...pret, { g: "noter", v: 1.099, plus: "cu" }]).notes;
    expect(note).toEqual({ "cu-zn": { v: 1.099, plus: "cu", couple: ["cu", "zn"], affiche: 1.099, position: position("2 V"), pont: true, court: false, propres: true } });
    expect(clePile("zn", "cu")).toBe("cu-zn");
    // noter de nouveau remplace la mesure
    expect(joue([...pret, { g: "noter", v: 1.099, plus: "cu" }, { g: "noter", v: 1.08, plus: "zn" }]).notes["cu-zn"]).toMatchObject({ v: 1.08, plus: "zn" });
  });
  it("un geste inconnu ou mal formé ne change rien", () => {
    expect(joue([{ g: "souder" }, { g: "lame" }, { g: "lame", l: 3, dans: "zn" }, { g: "relier" }, { g: "retirer" }, { g: "noter" }])).toEqual(joue([]));
  });
});

describe("le bilan", () => {
  it("une manipulation soignée n'a aucune faute, et rend la tension et la borne positive de chaque pile", () => {
    const b = regles.bilan(r, joue(soignee(r)));
    expect(b.fautes).toEqual([]);
    expect(b.score).toBe(1);
    expect(b.mesures).toEqual({ U1: 1.099, P1: 1, U2: 0.778, P2: 1, U3: 0.321, P3: 1 });
    expect(b.mesures).toEqual(mesuresExactes(r));
    expect(b.lignes[0]).toBe("Pour la pile zinc-cuivre, tu as noté 1,099 V, borne positive : le cuivre. Sans défaut : 1,099 V, borne positive : le cuivre.");
  });
  it("fils inversés : la tension est négative, mais l'élève qui lit bien le signe trouve la bonne borne", () => {
    const e = eleve(r);
    e.fais(...lames(r), selecteur("2 V"), pont("zn", "cu"), relier("com", "cu"), relier("v", "zn"));
    e.note();
    expect(e.etat().notes["cu-zn"]).toMatchObject({ v: 1.099, plus: "cu", affiche: -1.099, couple: ["zn", "cu"] });
    expect(regles.bilan(r, e.etat()).fautes.map((f) => f.code)).toEqual(["manque"]);
    // il oublie le signe : il prend la lame de la borne V pour la borne positive
    const distrait = eleve(r);
    distrait.fais(...lames(r), selecteur("2 V"), pont("zn", "cu"), relier("com", "cu"), relier("v", "zn"));
    distrait.note(0, true);
    const b = regles.bilan(r, distrait.etat());
    expect(b.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["polarite!", "manque!"]);
    expect(b.fautes[0].texte).toContain("L'afficheur indiquait −1,099 V, avec la borne V sur le zinc et la borne COM sur le cuivre : la borne positive est le cuivre");
    expect(b.mesures.P1).toBe(0);
  });
  it("sans aucune mesure, la manipulation vaut zéro, et le professeur donne ses valeurs", () => {
    const b = regles.bilan(r, joue([...daniell, selecteur("2 V")]));
    expect([b.score, b.fautes.map((f) => f.code)]).toEqual([0, ["mesures"]]);
    expect(b.mesures).toEqual(mesuresExactes(r));
    expect(b.lignes).toEqual(["Sans mesure, on continue avec les valeurs du professeur : 1,099 V pour la pile zinc-cuivre, 0,778 V pour la pile fer-cuivre, 0,321 V pour la pile zinc-fer."]);
  });
  it("une pile oubliée est une faute importante, dite une fois ; le professeur fournit sa tension", () => {
    const e = eleve(r);
    e.fais(...lames(r), selecteur("2 V"), pont("zn", "cu"), relier("com", "zn"), relier("v", "cu"));
    e.note();
    const b = regles.bilan(r, e.etat());
    expect(b.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["manque!"]);
    expect(b.score).toBe(0.5);
    expect(b.mesures).toEqual(mesuresExactes(r));
    expect(b.lignes[1]).toBe("Sans mesure pour la pile fer-cuivre, on continue avec les valeurs du professeur : 0,778 V, borne positive : le cuivre.");
  });
  it("le pont salin oublié, une lame dans la mauvaise solution, un fil d'une lame à l'autre", () => {
    const sansPont = soignee(r).filter((g) => g.g !== "pont").map((g) => (g.g === "noter" ? { ...g, v: 0 } : g));
    expect(fautes(sansPont)).toEqual(["pont!"]);
    expect(regles.bilan(r, joue(sansPont)).mesures.U1).toBe(0);
    // le zinc et le cuivre échangés : la mesure est celle d'une autre pile
    const e = eleve(r);
    e.fais(lame("zn", "cu"), lame("cu", "zn"), lame("fe", "fe"), selecteur("2 V"), pont("zn", "cu"), relier("com", "zn"), relier("v", "cu"));
    e.note();
    const b = regles.bilan(r, e.etat());
    expect(b.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["lame!", "manque!"]);
    expect(b.mesures.U1).toBe(0.18);
    const court = eleve(r);
    court.fais(...daniell, relier("zn", "cu"), selecteur("2 V"));
    court.note();
    expect(regles.bilan(r, court.etat()).fautes.map((f) => f.code)).toEqual(["fils", "manque"]);
    expect(regles.bilan(r, e.etat()).fautes[0].texte).toContain("une lame ne trempait pas dans sa propre solution");
  });
  it("le multimètre mal réglé : calibre trop grand ou trop petit, alternatif, ampèremètre, arrêt", () => {
    const sur = (nom: string, valeur?: number) => {
      const e = eleve(r);
      e.fais(...daniell, selecteur(nom));
      if (valeur === undefined) e.note(); else e.fais({ g: "noter", v: valeur, plus: "cu" });
      return regles.bilan(r, e.etat());
    };
    expect(sur("20 V").fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["calibre", "manque!"]);
    expect(sur("20 V").fautes[0].texte).toContain("tu as mesuré sur le calibre 20 V : l'afficheur ne donnait que 1,10 V. Le calibre 2 V, le plus petit qui dépasse la tension, donne un chiffre de plus");
    expect(sur("20 V").mesures.U1).toBe(1.1);
    expect(sur("200 V").fautes[0].texte).toContain("l'afficheur ne donnait que 1,1 V");
    expect(sur("200 mV", 1).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["calibre!", "manque!"]);
    expect(sur("V ~", 0).fautes.map((f) => f.code)).toEqual(["multimetre", "manque"]);
    expect(sur("V ~", 0).fautes[0].texte).toContain("voltmètre alternatif");
    expect(sur("mA", 0).fautes[0].texte).toContain("sur l'ampèremètre");
    expect(sur("arrêt", 0).fautes[0].texte).toContain("à l'arrêt");
  });
  it("le fusible sauté est une faute importante, même si les mesures sont bonnes ensuite", () => {
    const gestes = soignee(r);
    const avecCourt = [...gestes.slice(0, 5), relier("a", "cu"), relier("com", "zn"), retirer("a", "cu"), retirer("com", "zn"), ...gestes.slice(5)];
    expect(joue(avecCourt).fusible).toBe(false);
    const b = regles.bilan(r, joue(avecCourt));
    expect(b.fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`)).toEqual(["courtcircuit!"]);
    expect(b.mesures).toEqual(mesuresExactes(r));
  });
  it("un afficheur mal lu : un chiffre de travers, ou une valeur sans rapport", () => {
    const avec = (erreur: number) => { const e = eleve(r); e.fais(...daniell, selecteur("2 V")); e.note(erreur); return regles.bilan(r, e.etat()).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`); };
    expect(avec(0)).toEqual(["manque!"]);
    expect(avec(0.003)).toEqual(["lecture", "manque!"]);
    expect(avec(0.2)).toEqual(["lecture!", "manque!"]);
  });
});

describe("le TP des trois piles", () => {
  // le TP est en construction : il n'est pas inscrit dans l'application, le test donne ses règles
  const sesRegles = { pile: regles } as ReglesDuTest;
  const manipulation = (etape: EtapeDePaillasse): GesteBrut[] => soignee(etape.paillasse.reglages as ReglagesPile);
  it("une situation à lire, une manipulation, les quatre compétences, rien de la réponse dans le navigateur, D partout sans rien faire", async () => {
    await controlesCommuns(pile, sesRegles);
    expect(pile.etapes(1)).toHaveLength(10);
    expect(pile.fiche).toBe(12);
  });
  it("fait avec soin, le TP donne A partout ; le classement et la meilleure pile changent avec le métal tiré", async () => {
    const metaux = new Set<string>(), classements = new Set<number>(), meilleures = new Set<number>();
    for (const graine of GRAINES) {
      const partie = await joueJuste(pile, graine, manipulation, sesRegles);
      expect(partie.scores.every((s) => s === 1), `graine ${graine} : ${partie.scores.join(" ")}`).toBe(true);
      expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "A", VAL: "A" });
      expect(partie.fautes).toEqual([[]]);
      const reglages = (partie.etapes.find((e) => e.genre === "paillasse") as EtapeDePaillasse).paillasse.reglages as ReglagesPile;
      const m = reglages.demiPiles[2];
      metaux.add(m.id);
      const choix = partie.retours.flatMap((x) => (x.correction.genre === "choix" ? [x.correction] : []));
      // l'argent est moins réducteur que le cuivre : il passe en dernier, et la pile zinc-argent devient la plus forte
      expect(choix[2].bonne, m.id).toBe(m.id === "ag" ? 1 : 0);
      expect(choix[3].bonne, m.id).toBe(m.id === "ag" ? 2 : 0);
      classements.add(choix[2].bonne);
      meilleures.add(choix[3].bonne);
      // la tension prévue pour la troisième pile est celle qui a été mesurée
      const valeurs = partie.retours.flatMap((x) => (x.correction.genre === "valeur" ? [x.correction] : []));
      expect(valeurs[0].attendu).toBe(`${Math.abs(tensionDe(reglages, "zn", m.id)).toFixed(3).replace(".", ",")} V`);
      expect(valeurs[1].attendu).toBe("0,0 %");
    }
    // la graine change bien la situation : le troisième métal, et avec lui les conclusions
    expect(metaux.size).toBe(4);
    expect(classements).toEqual(new Set([0, 1]));
    expect(meilleures).toEqual(new Set([0, 2]));
  });
  it("l'exploitation se juge sur les mesures de l'élève : une borne positive mal lue change son classement, pas la justesse de son raisonnement", async () => {
    // pour la pile fer-cuivre, il donne le fer pour borne positive
    const distraite = (etape: EtapeDePaillasse): GesteBrut[] => {
      const reglages = etape.paillasse.reglages as ReglagesPile;
      return soignee(reglages).map((g) => (g.g === "noter" && g.plus === "cu" && Math.abs((g.v as number) - Math.abs(tensionDe(reglages, "cu", reglages.demiPiles[2].id))) < 1e-9 ? { ...g, plus: reglages.demiPiles[2].id } : g));
    };
    // la graine 4 tire le fer
    const partie = await joueJuste(pile, 4, distraite, sesRegles);
    expect(partie.fautes).toEqual([["polarite"]]);
    expect(partie.bilan).toEqual({ APP: "A", ANA: "A", REA: "C", VAL: "A" });
    const choix = partie.retours.flatMap((x) => (x.correction.genre === "choix" ? [x.correction] : []));
    // avec le fer à la borne positive, ses mesures le placent après le cuivre
    expect(choix[2].bonne).toBe(1);
    // et la tension prévue pour la pile zinc-fer devient la somme des deux autres : l'écart avec sa mesure est énorme
    const valeurs = partie.retours.flatMap((x) => (x.correction.genre === "valeur" ? [x.correction] : []));
    expect(valeurs[0].detail).toContain("la tension est la somme des deux");
    expect(Number(valeurs[1].attendu.replace(",", ".").replace(" %", ""))).toBeGreaterThan(50);
  });
});
