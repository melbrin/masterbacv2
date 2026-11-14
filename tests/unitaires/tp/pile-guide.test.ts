// Le guide de la paillasse Pile (lib/commun/tp/paillasses/pile-guide.ts). Un élève de test fait, sans réfléchir,
// exactement ce que le guide lui dit : la manipulation qu'il obtient doit être sans faute, pour chaque graine. Le guide
// est donc complet, dans le bon ordre, et il ne tourne jamais en rond. Sur cette paillasse rien ne coule ni ne chauffe :
// un élève lent obtient la même manipulation qu'un élève vif, il n'y a pas de retard à jouer.
import { describe, expect, it } from "vitest";
import { POSITIONS, affichage, clePile, mesure, mesuresExactes, regles, type EtatPile, type ReglagesPile } from "@/lib/commun/tp/paillasses/pile";
import { calibrePour, croixDuFil, essaie, lameDe, nomBorne, nu, pointDuFil, pose, prochain, type PasDuGuide, type PlaceDeBorne, type VuePile } from "@/lib/commun/tp/paillasses/pile-guide";
import { PLAFOND_AVEC_GUIDE, avecMarqueDuGuide, rejoue, type GesteBrut, type ReglesPaillasse } from "@/lib/commun/tp/types";
import pile from "@/lib/serveur/contenu/tp/pile";
import { verifie } from "@/lib/serveur/tp";
import { GRAINES, type EtapeDePaillasse } from "../../outils/tp";

/** L'étape de paillasse du TP, pour une graine. Le TP est en construction : le test donne ses règles au serveur. */
function paillasse(graine: number): EtapeDePaillasse {
  const etape = pile.etapes(graine).find((e) => e.genre === "paillasse");
  if (!etape || etape.genre !== "paillasse") throw new Error("pas de paillasse dans le TP");
  return etape;
}
const reglages = (graine: number) => paillasse(graine).paillasse.reglages as ReglagesPile;
const sesRegles = async () => regles as unknown as ReglesPaillasse<unknown, unknown>;
const position = (nom: string) => POSITIONS.findIndex((p) => p.nom === nom);

interface Suivi { etat: EtatPile; gestes: GesteBrut[]; cles: string[]; etapes: number[]; fini: boolean; recommences: number }
interface Eleve {
  /** des gestes faits avant d'écouter le guide */
  avant?: GesteBrut[];
}

/**
 * L'élève de test : il fait ce que le guide dit, jusqu'à « J'ai fini ». Il lit l'afficheur, écrit la tension sans son
 * signe, puis applique la règle que le guide lui rappelle : sans signe moins, la borne positive est la lame de la borne V.
 */
function suis(r: ReglagesPile, eleve: Eleve = {}): Suivi {
  let etat = rejoue(regles, r, eleve.avant ?? []);
  let gestes: GesteBrut[] = [...(eleve.avant ?? [])];
  let vue: VuePile = { saisie: null };
  let lue = 0;
  let recommences = 0;
  const cles: string[] = [], etapes: number[] = [];
  const agit = (g: GesteBrut) => { const suite = regles.geste(r, etat, g); if (suite !== etat) { etat = suite; gestes.push(g); } };
  let dernier: PasDuGuide | null = null;
  for (let tour = 0; tour < 400; tour++) {
    const p = prochain(r, etat, vue);
    if (p.cle !== dernier?.cle) { cles.push(p.cle); etapes.push(p.etape); dernier = p; }
    switch (p.geste) {
      case "glisser": pose(r, etat, p.objet, p.cible).gestes.forEach(agit); break;
      case "tourner": agit({ g: "selecteur", v: p.vers }); break;
      case "fil": agit({ g: "relier", a: p.de, b: p.vers }); break;
      case "retirer": agit({ g: "retirer", a: p.a, b: p.b }); break;
      case "montrer": {
        const affiche = affichage(r, etat).valeur ?? 0;
        if (vue.saisie === "tension") { lue = Math.abs(affiche); vue = { saisie: "borne" }; break; }
        const couple = mesure(r, etat).couple ?? ["", ""];
        agit({ g: "noter", v: lue, plus: affiche >= 0 ? couple[0] : couple[1] });
        vue = { saisie: null };
        break;
      }
      case "bouton":
        if (p.bouton === "fini") return { etat, gestes, cles, etapes, fini: true, recommences };
        if (p.bouton === "recommencer") { etat = regles.depart(r); gestes = []; vue = { saisie: null }; recommences++; }
        else vue = { saisie: "tension" };
        break;
    }
  }
  return { etat, gestes, cles, etapes, fini: false, recommences };
}

const fautes = (r: ReglagesPile, etat: EtatPile) => regles.bilan(r, etat).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);
const lame = (l: string, dans: string): GesteBrut => ({ g: "lame", l, dans });
const relier = (a: string, b: string): GesteBrut => ({ g: "relier", a, b });

describe("l'élève qui suit le guide de la pile", () => {
  it("la manipulation est sans faute, pour chaque graine", () => {
    for (const graine of GRAINES) {
      const r = reglages(graine);
      const s = suis(r);
      expect(s.fini, `graine ${graine} : le guide s'arrête sur ${s.cles.slice(-3).join(", ")}`).toBe(true);
      expect(fautes(r, s.etat), `graine ${graine}`).toEqual([]);
      const bilan = regles.bilan(r, s.etat);
      expect(bilan.score).toBe(1);
      // les trois tensions et les trois bornes positives sont celles d'une manipulation sans défaut
      expect(bilan.mesures).toEqual(mesuresExactes(r));
      // le fusible est intact, et il ne reste que les deux fils de la dernière pile
      expect(s.etat.fusible).toBe(true);
      expect(s.etat.fils).toHaveLength(2);
      // rejouée par le serveur, la liste des gestes redonne le même état
      expect(rejoue(regles, r, s.gestes)).toEqual(s.etat);
      expect(s.recommences).toBe(0);
    }
  });
  it("le guide suit l'ordre du protocole, et montre chaque étape", () => {
    // graine 1 : zinc, cuivre, argent
    const r = reglages(1);
    const { cles, etapes } = suis(r);
    expect(r.demiPiles.map((d) => d.id)).toEqual(["zn", "cu", "ag"]);
    expect(cles).toEqual(["lame-zn", "lame-cu", "lame-ag", "pont-cu-zn", "selecteur", "fil-com-zn", "fil-v-cu", "noter-cu-zn", "lire-tension", "borne",
      "pont-ag-cu", "retirer-com-zn", "fil-com-ag", "noter-ag-cu", "lire-tension", "borne",
      "pont-ag-zn", "retirer-v-cu", "fil-v-zn", "noter-ag-zn", "lire-tension", "borne", "fini"]);
    // le rang de l'étape du protocole ne recule jamais, et va jusqu'à la dernière
    expect([...etapes].sort((a, b) => a - b)).toEqual(etapes);
    expect(new Set(etapes)).toEqual(new Set(paillasse(1).protocole.map((_, i) => i)));
  });
  it("il dit le geste, jamais la tension ni la borne positive ; ses phrases tutoient, sans tiret long", () => {
    for (const graine of GRAINES.slice(0, 4)) {
      const r = reglages(graine);
      let etat = regles.depart(r);
      const phrases = new Set<string>();
      for (const g of suis(r).gestes) {
        etat = regles.geste(r, etat, g);
        for (const saisie of [null, "tension", "borne"] as const) phrases.add(prochain(r, etat, { saisie }).texte);
      }
      expect(phrases.size).toBeGreaterThan(12);
      for (const phrase of phrases) {
        expect(/\d,\d/.test(phrase), phrase).toBe(false);
        expect(/[—–]/.test(phrase), phrase).toBe(false);
        expect(/\b(vous|votre|vos)\b/i.test(phrase), phrase).toBe(false);
      }
      // la consigne de la borne positive rappelle la règle du signe, sans nommer de métal
      const regle = prochain(r, etat, { saisie: "borne" }).texte;
      expect(regle).toContain("borne V");
      expect(regle).toContain("borne COM");
      for (const d of r.demiPiles) expect(regle).not.toContain(nu(d.metal));
    }
  });
  it("le calibre demandé est le plus petit qui dépasse la tension de la pile", () => {
    const r = reglages(1);
    for (const [a, b] of r.piles) expect(POSITIONS[calibrePour(r, a, b)].nom).toBe("2 V");
    // une pile de moins de 200 mV, une pile de plus de 2 V
    const faible: ReglagesPile = { ...r, demiPiles: r.demiPiles.map((d) => (d.id === "cu" ? { ...d, potentiel: -0.65 } : d)) };
    expect(POSITIONS[calibrePour(faible, "zn", "cu")].nom).toBe("200 mV");
    const forte: ReglagesPile = { ...r, demiPiles: r.demiPiles.map((d) => (d.id === "cu" ? { ...d, potentiel: 1.8 } : d)) };
    expect(POSITIONS[calibrePour(forte, "zn", "cu")].nom).toBe("20 V");
    for (const reglage of [faible, forte]) {
      const s = suis(reglage);
      expect(s.fini).toBe(true);
      expect(fautes(reglage, s.etat)).toEqual([]);
    }
  });
});

describe("le guide rattrape une manipulation mal partie", () => {
  const r = reglages(1);
  const rattrape = (avant: GesteBrut[]) => {
    const s = suis(r, { avant });
    expect(s.fini, s.cles.slice(-3).join(", ")).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
    expect(rejoue(regles, r, s.gestes)).toEqual(s.etat);
    return s;
  };
  const montee: GesteBrut[] = [lame("zn", "zn"), lame("cu", "cu"), lame("ag", "ag"), { g: "selecteur", v: position("2 V") }, relier("com", "zn"), relier("v", "cu")];
  it("deux lames échangées : il les fait reposer, puis plonger chacune dans sa solution", () => {
    const s = rattrape([lame("zn", "cu"), lame("cu", "zn")]);
    expect(s.cles.slice(0, 5)).toEqual(["reposer-zn", "reposer-cu", "lame-zn", "lame-cu", "lame-ag"]);
  });
  it("une pile mesurée sans pont salin, ou sur un mauvais calibre : il la fait monter comme il faut, puis mesurer de nouveau", () => {
    const sansPont: GesteBrut[] = [...montee, { g: "noter", v: 0, plus: "cu" }];
    expect(fautes(r, rejoue(regles, r, sansPont))).toContain("pont!");
    expect(rattrape(sansPont).cles.slice(0, 4)).toEqual(["pont-cu-zn", "noter-cu-zn", "lire-tension", "borne"]);
    const grosCalibre: GesteBrut[] = [...montee, { g: "pont", a: "zn", b: "cu" }, { g: "selecteur", v: position("200 V") }, { g: "noter", v: 1.1, plus: "cu" }];
    expect(fautes(r, rejoue(regles, r, grosCalibre))).toContain("calibre");
    expect(rattrape(grosCalibre).cles.slice(0, 2)).toEqual(["selecteur", "noter-cu-zn"]);
    // un dépassement sur le calibre 200 mV, le voltmètre en alternatif : même chemin
    for (const nom of ["200 mV", "V ~"]) expect(rattrape([...montee, { g: "pont", a: "zn", b: "cu" }, { g: "selecteur", v: position(nom) }, { g: "noter", v: 1, plus: "cu" }]).cles[0]).toBe("selecteur");
  });
  it("un fil sur la borne mA : il le fait retirer avant de poser le pont salin, et le fusible ne saute pas", () => {
    const avant: GesteBrut[] = [lame("zn", "zn"), lame("cu", "cu"), relier("a", "zn"), relier("com", "cu")];
    // posé maintenant, le pont salin ferait sauter le fusible
    expect(regles.geste(r, rejoue(regles, r, avant), { g: "pont", a: "zn", b: "cu" }).fusible).toBe(false);
    const s = rattrape(avant);
    expect(s.cles.slice(0, 3)).toEqual(["retirer-a-zn", "lame-ag", "pont-cu-zn"]);
    expect(s.etat.fusible).toBe(true);
  });
  it("le fusible a sauté : il fait tout recommencer, et la manipulation reprise est sans faute", () => {
    const avant: GesteBrut[] = [lame("zn", "zn"), lame("cu", "cu"), { g: "pont", a: "zn", b: "cu" }, relier("a", "zn"), relier("com", "cu")];
    expect(fautes(r, rejoue(regles, r, avant))).toContain("courtcircuit!");
    expect(prochain(r, rejoue(regles, r, avant), { saisie: null })).toMatchObject({ cle: "recommencer", geste: "bouton", bouton: "recommencer" });
    const s = rattrape(avant);
    expect(s.recommences).toBe(1);
    expect(s.gestes[0]).toEqual(lame("zn", "zn"));
  });
  it("des fils en trop, deux fils sur la même lame, un fil d'une lame à l'autre : il les fait retirer un par un", () => {
    const debut: GesteBrut[] = [lame("zn", "zn"), lame("cu", "cu"), lame("ag", "ag"), { g: "pont", a: "zn", b: "cu" }, { g: "selecteur", v: position("2 V") }];
    // les deux bornes sur le zinc, et un fil du zinc au cuivre
    const s = rattrape([...debut, relier("com", "zn"), relier("v", "zn"), relier("zn", "cu")]);
    expect(s.cles.slice(0, 3)).toEqual(["retirer-v-zn", "retirer-zn-cu", "fil-v-cu"]);
    // la borne V déjà sur une lame de la pile : la borne COM va sur l'autre
    expect(rattrape([...debut, relier("v", "zn")]).cles[0]).toBe("fil-com-cu");
    // la borne COM sur la lame d'une autre pile, la borne V des deux côtés
    expect(rattrape([...debut, relier("com", "ag"), relier("v", "cu"), relier("v", "zn")]).cles.slice(0, 3)).toEqual(["retirer-com-ag", "retirer-v-zn", "fil-com-zn"]);
  });
  it("une saisie ouverte : il fait lire l'afficheur, puis rappelle la règle du signe", () => {
    const etat = rejoue(regles, r, [...montee, { g: "pont", a: "zn", b: "cu" }]);
    expect(prochain(r, etat, { saisie: null })).toMatchObject({ cle: "noter-cu-zn", geste: "bouton", bouton: "noter", etape: 4 });
    expect(prochain(r, etat, { saisie: "tension" })).toMatchObject({ cle: "lire-tension", geste: "montrer", quoi: "afficheur", etape: 4 });
    expect(prochain(r, etat, { saisie: "borne" })).toMatchObject({ cle: "borne", geste: "montrer", etape: 4 });
    // à partir de la deuxième pile, tout tient dans la dernière étape du protocole
    const apres = regles.geste(r, etat, { g: "noter", v: 1.093, plus: "cu" });
    expect(prochain(r, apres, { saisie: null })).toMatchObject({ cle: "pont-ag-cu", etape: 5 });
    expect(prochain(r, apres, { saisie: "tension" }).etape).toBe(5);
  });
  it("des réglages dont une pile nomme un métal absent : il ne reste qu'à appeler le professeur", () => {
    expect(prochain({ ...r, piles: [["zn", "or"]] }, regles.depart(r), { saisie: null }).cle).toBe("fini");
  });
});

describe("poser un objet, tirer un fil", () => {
  const r = reglages(1);
  const depart = regles.depart(r);
  it("donne aux règles le geste qui convient, et dit ce qui s'est passé", () => {
    expect(pose(r, depart, "lame-zn", "becher-zn")).toEqual({ gestes: [lame("zn", "zn")], message: "La lame de zinc trempe dans le sulfate de zinc.", claque: false });
    // une lame plus réductrice que le métal de la solution se couvre d'un dépôt
    expect(pose(r, depart, "lame-zn", "becher-cu").message).toContain("Un dépôt se forme sur la lame.");
    expect(pose(r, depart, "lame-ag", "becher-cu").message).toBe("La lame d'argent trempe dans le sulfate de cuivre.");
    const trempe = regles.geste(r, depart, lame("zn", "zn"));
    expect(pose(r, trempe, "lame-zn", "plateau-zn")).toMatchObject({ gestes: [lame("zn", "plateau")], message: "La lame de zinc est reposée sur le plateau." });
    expect(pose(r, depart, "pont", "pont-0-1")).toMatchObject({ gestes: [{ g: "pont", a: "zn", b: "cu" }], message: "Le pont salin relie le sulfate de zinc et le sulfate de cuivre." });
    expect(pose(r, regles.geste(r, depart, { g: "pont", a: "zn", b: "cu" }), "pont", "pont-repos")).toMatchObject({ gestes: [{ g: "pont", a: "repos" }], message: "Le pont salin est rangé." });
  });
  it("un geste impossible ne donne rien aux règles, et la phrase dit pourquoi", () => {
    const trempe = regles.geste(r, depart, lame("zn", "zn"));
    expect(pose(r, trempe, "lame-cu", "becher-zn")).toEqual({ gestes: [], message: "Il y a déjà une lame dans ce bécher : retire-la d'abord.", claque: false });
    expect(pose(r, trempe, "lame-zn", "becher-zn").message).toBe("La lame de zinc est déjà dans ce bécher.");
    expect(pose(r, depart, "lame-zn", "plateau-zn").message).toBe("La lame de zinc est déjà sur le plateau.");
    expect(pose(r, depart, "pont", "pont-repos").message).toBe("Le pont salin est déjà à son crochet.");
    expect(pose(r, regles.geste(r, depart, { g: "pont", a: "zn", b: "cu" }), "pont", "pont-0-1").message).toBe("Le pont salin est déjà là.");
    for (const [objet, cible] of [["licorne", "becher-zn"], ["lame-or", "becher-zn"], ["lame-zn", "becher-or"], ["pont", "pont-0-7"]]) {
      expect(pose(r, depart, objet, cible)).toEqual({ gestes: [], message: "", claque: false });
    }
  });
  it("le fusible qui saute se remarque, quel que soit le geste qui ferme le circuit", () => {
    const pret = rejoue(regles, r, [lame("zn", "zn"), lame("cu", "cu"), relier("a", "zn"), relier("com", "cu")]);
    expect(pose(r, pret, "pont", "pont-0-1")).toMatchObject({ gestes: [{ g: "pont", a: "zn", b: "cu" }], message: expect.stringContaining("le fusible du multimètre vient de sauter"), claque: true });
    const sansFil = rejoue(regles, r, [lame("zn", "zn"), lame("cu", "cu"), { g: "pont", a: "zn", b: "cu" }, relier("a", "zn")]);
    expect(essaie(r, sansFil, relier("com", "cu"), "Un fil relie la borne COM et la lame de cuivre.", "plus de fil")).toMatchObject({ claque: true });
    // un fil sans danger, puis un cinquième fil
    expect(essaie(r, depart, relier("com", "zn"), "Un fil relie la borne COM et la lame de zinc.", "plus de fil")).toEqual({ gestes: [relier("com", "zn")], message: "Un fil relie la borne COM et la lame de zinc.", claque: false });
    const quatre = rejoue(regles, r, [relier("com", "zn"), relier("v", "cu"), relier("com", "ag"), relier("v", "zn")]);
    expect(essaie(r, quatre, relier("a", "ag"), "fait", "Il n'y a plus de fil sur la paillasse.")).toEqual({ gestes: [], message: "Il n'y a plus de fil sur la paillasse.", claque: false });
  });
  it("les noms des lames et des bornes", () => {
    expect(r.demiPiles.map(lameDe)).toEqual(["lame de zinc", "lame de cuivre", "lame d'argent"]);
    expect(["com", "v", "a", "zn", "ag", "or"].map((id) => nomBorne(r, id))).toEqual(["la borne COM", "la borne V", "la borne mA", "la lame de zinc", "la lame d'argent", "cette borne"]);
    expect(nu("l'étain")).toBe("étain");
    expect(clePile("zn", "cu")).toBe("cu-zn");
  });
});

describe("la croix qui retire un fil", () => {
  // les bornes de la paillasse Pile, lames plongées, puis celles de la paillasse Électrolyse (components/tp/paillasses/)
  const pile: PlaceDeBorne[] = [{ id: "com", x: 48, y: 138 }, { id: "v", x: 104, y: 138 }, { id: "a", x: 160, y: 138 }, { id: "zn", x: 62, y: 341 }, { id: "cu", x: 180, y: 341 }, { id: "ag", x: 298, y: 341 }];
  const electrolyse: PlaceDeBorne[] = [{ id: "g-", x: 30, y: 54 }, { id: "g+", x: 98, y: 54 }, { id: "k1", x: 156, y: 54 }, { id: "k2", x: 204, y: 54 }, { id: "a", x: 262, y: 54 }, { id: "com", x: 328, y: 54 },
    { id: "p1", x: 154, y: 185 }, { id: "p2", x: 206, y: 185 }];
  const distance = (bornes: PlaceDeBorne[], p: { x: number; y: number }) => Math.min(...bornes.map((b) => Math.hypot(p.x - b.x, p.y - b.y)));
  it("un fil pend en son milieu, d'autant plus qu'il est long ; ses bouts sont sur ses bornes", () => {
    const a = { x: 0, y: 0 }, b = { x: 100, y: 0 };
    expect(pointDuFil(a, b, 0)).toEqual(a);
    expect(pointDuFil(a, b, 1)).toEqual(b);
    // 100 unités de long : une flèche de 24, donc un milieu 12 unités plus bas
    expect(pointDuFil(a, b, 0.5)).toEqual({ x: 50, y: 12 });
    expect(pointDuFil(a, { x: 400, y: 0 }, 0.5).y).toBe(17);
  });
  it("au milieu du fil quand rien ne le couvre : c'est la croix du kit", () => {
    for (const [a, b] of [["com", "zn"], ["v", "cu"], ["com", "ag"], ["v", "zn"], ["com", "v"]]) {
      const croix = croixDuFil(pile, a, b);
      const pa = pile.find((x) => x.id === a)!, pb = pile.find((x) => x.id === b)!;
      expect(croix).toMatchObject({ secours: false, ou: pointDuFil(pa, pb, 0.5) });
    }
    // le montage du protocole de l'électrolyse : aucun de ses fils ne passe sous une borne
    for (const [a, b] of [["g+", "k1"], ["k2", "a"], ["com", "p2"], ["p1", "g-"]]) expect(croixDuFil(electrolyse, a, b)?.secours, `${a}-${b}`).toBe(false);
  });
  it("sous une autre borne, la croix du kit ne se touche plus : une croix de secours va là où le fil est dégagé", () => {
    // de la borne COM à la borne mA, le fil passe sous la borne V ; d'une lame à l'autre, sous la lame du milieu
    for (const [bornes, a, b] of [[pile, "com", "a"], [pile, "zn", "ag"], [electrolyse, "g-", "k1"], [electrolyse, "k2", "com"], [electrolyse, "g+", "k2"], [electrolyse, "k1", "a"]] as const) {
      const croix = croixDuFil([...bornes], a, b);
      expect(croix?.secours, `${a}-${b}`).toBe(true);
      // la croix de secours est sur le fil, hors de la zone de toucher de toute borne
      expect(croix!.libre).toBeGreaterThan(24);
      expect(distance([...bornes], croix!.ou)).toBeCloseTo(croix!.libre, 9);
    }
    // sur les deux paillasses, tout fil possible a une croix qui se touche
    for (const bornes of [pile, electrolyse]) {
      for (const a of bornes) for (const b of bornes) {
        if (a.id >= b.id) continue;
        const croix = croixDuFil(bornes, a.id, b.id);
        expect(croix, `${a.id}-${b.id}`).not.toBeNull();
        if (croix!.secours) expect(croix!.libre, `${a.id}-${b.id}`).toBeGreaterThan(24);
        else expect(distance(bornes.filter((x) => x.id !== a.id && x.id !== b.id), croix!.ou), `${a.id}-${b.id}`).toBeGreaterThanOrEqual(24);
      }
    }
    expect(croixDuFil(pile, "com", "or")).toBeNull();
  });
});

describe("la marque du guide", () => {
  it("le professeur plafonne une manipulation faite avec le guide, et le dit", async () => {
    for (const graine of GRAINES.slice(0, 3)) {
      const etape = paillasse(graine);
      const { gestes } = suis(etape.paillasse.reglages as ReglagesPile);
      const seul = await verifie(etape, { g: "paillasse", gestes }, {}, graine, sesRegles);
      const aide = await verifie(etape, { g: "paillasse", gestes: avecMarqueDuGuide(gestes) }, {}, graine, sesRegles);
      expect(seul?.retour).toMatchObject({ score: 1, correction: { genre: "paillasse", fautes: [] } });
      expect(seul?.retour.correction).not.toHaveProperty("guide");
      expect(aide?.retour).toMatchObject({ score: PLAFOND_AVEC_GUIDE, correction: { genre: "paillasse", fautes: [], guide: true } });
      // la marque ne change ni les fautes ni les mesures
      expect(aide?.mesures).toEqual(seul?.mesures);
    }
  });
});
