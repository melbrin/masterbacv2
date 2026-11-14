// Le guide de la paillasse Titrage (lib/commun/tp/paillasses/titrage-guide.ts). Un élève de test fait, sans réfléchir,
// exactement ce que le guide lui dit : la manipulation qu'il obtient doit être sans faute, pour chaque TP et chaque
// graine. Le guide est donc complet, dans le bon ordre, et il ne tourne jamais en rond.
import { describe, expect, it } from "vitest";
import { equivalenceReelle, lecture, regles, type EtatTitrage, type ReglagesTitrage } from "@/lib/commun/tp/paillasses/titrage";
import { AU_FILET, debitFilet, entreGouttes, pose, prochain, type PasDuGuide, type VueTitrage } from "@/lib/commun/tp/paillasses/titrage-guide";
import { PLAFOND_AVEC_GUIDE, avecMarqueDuGuide, guideServi, rejoue, sansMarqueDuGuide, type GesteBrut } from "@/lib/commun/tp/types";
import { tp } from "@/lib/serveur/contenu/tp";
import { verifie } from "@/lib/serveur/tp";
import { GRAINES, type EtapeDePaillasse } from "../../outils/tp";

const TITRAGES = ["detartrant", "vinaigre", "serum"];
/** L'étape de paillasse d'un TP, pour une graine. */
function paillasse(id: string, graine: number): EtapeDePaillasse {
  const etape = tp(id)?.etapes(graine).find((e) => e.genre === "paillasse");
  if (!etape || etape.genre !== "paillasse") throw new Error(`pas de paillasse dans ${id}`);
  return etape;
}
const reglages = (id: string, graine: number) => paillasse(id, graine).paillasse.reglages as ReglagesTitrage;

interface Suivi { etat: EtatTitrage; gestes: GesteBrut[]; cles: string[]; fini: boolean }
interface Eleve {
  /** les morceaux de filet qui coulent encore avant que l'élève réagisse à une nouvelle consigne */
  retardFilet?: number;
  /** les morceaux versés en trop avant qu'il relâche un poussoir */
  retardAppui?: number;
  /** des gestes faits avant d'écouter le guide */
  avant?: GesteBrut[];
  /** ce que la vue retient après ces gestes */
  vue?: Partial<VueTitrage>;
}

/** Ce que verse un morceau d'appui sur un poussoir. */
function morceau(poussoir: string, etat: EtatTitrage, r: ReglagesTitrage): GesteBrut {
  switch (poussoir) {
    case "verser": return { g: "remplir", v: etat.volume < 21 ? 0.25 : 0.05 };
    case "aspirer": return { g: "aspirer", v: etat.dansPipette < r.Va - 1.5 ? 0.1 : 0.05 };
    case "redescendre": return { g: "vider", v: 0.05 };
    case "vider": return { g: "vider", v: 0.2 };
    case "eau": return { g: "eau", v: 0.5 };
    default: return { g: "goutte" };
  }
}

/** L'élève de test : il fait ce que le guide dit, jusqu'à « J'ai fini ». Le temps passe d'un morceau à chaque tour. */
function suis(r: ReglagesTitrage, eleve: Eleve = {}): Suivi {
  let etat = rejoue(regles, r, eleve.avant ?? []);
  const gestes: GesteBrut[] = [...(eleve.avant ?? [])];
  let vue: VueTitrage = { flacon: false, outil: null, robinet: 0, saisie: false, courbe: false, ...eleve.vue };
  const cles: string[] = [];
  const agit = (g: GesteBrut) => { etat = regles.geste(r, etat, g); gestes.push(g); };
  /** la burette coule d'un morceau si le robinet est ouvert */
  const coule = () => {
    if (vue.robinet <= 0 || etat.volume <= 0) return;
    agit(vue.robinet <= AU_FILET ? { g: "couler", v: 0.05 } : { g: "couler", v: 0.05, filet: true });
  };
  const tourne = (vers: number) => { if (vers === 0 && vue.robinet > 0) agit({ g: "pause" }); vue = { ...vue, robinet: vers }; };
  let dernier: PasDuGuide | null = null;
  for (let tour = 0; tour < 20000; tour++) {
    const p = prochain(r, etat, vue);
    if (p.cle !== dernier?.cle) {
      cles.push(p.cle);
      // une nouvelle consigne : l'élève met un peu de temps à réagir
      if (dernier?.geste === "maintenir") for (let i = 0; i < (eleve.retardAppui ?? 0); i++) agit(morceau(dernier.poussoir, etat, r));
      if (vue.robinet > AU_FILET) for (let i = 0; i < (eleve.retardFilet ?? 0); i++) coule();
      dernier = p;
      if (prochain(r, etat, vue).cle !== p.cle) continue;
    }
    switch (p.geste) {
      case "glisser": { const suite = pose(r, etat, vue, p.objet, p.cible); suite.gestes.forEach(agit); vue = { ...vue, ...suite.poses }; break; }
      case "maintenir": case "toucher": agit(morceau(p.poussoir, etat, r)); break;
      case "tourner": if (p.molette === "robinet") tourne(p.vers); else agit({ g: "agiter", v: p.vers }); break;
      case "bouton":
        if (p.bouton === "fini") return { etat, gestes, cles, fini: true };
        if (p.bouton === "noter") { tourne(0); vue = { ...vue, saisie: true }; }
        if (p.bouton === "courbe") { tourne(0); vue = { ...vue, courbe: true }; }
        if (p.bouton === "recommencer") { agit({ g: "recommencer" }); vue = { ...vue, robinet: 0, outil: null, saisie: false, courbe: false }; }
        break;
      case "montrer":
        // il lit la loupe, ou il place le repère sur la courbe, puis il note
        if (p.cle === "lire") { agit({ g: "noter", v: lecture(etat) }); vue = { ...vue, saisie: false }; }
        if (p.quoi === "repere") { agit({ g: "noter", v: Math.round(equivalenceReelle(r, etat) * 20) / 20 }); vue = { ...vue, courbe: false }; }
        break;
      case "attendre": break;
    }
    coule();
  }
  return { etat, gestes, cles, fini: false };
}

const fautes = (r: ReglagesTitrage, etat: EtatTitrage) => regles.bilan(r, etat).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);

describe("l'élève qui suit le guide du titrage", () => {
  for (const id of TITRAGES) {
    it(`${id} : la manipulation est sans faute, pour chaque graine`, () => {
      for (const graine of GRAINES) {
        const r = reglages(id, graine);
        const s = suis(r);
        expect(s.fini, `${id} graine ${graine} : le guide s'arrête sur ${s.cles.slice(-3).join(", ")}`).toBe(true);
        expect(fautes(r, s.etat), `${id} graine ${graine}`).toEqual([]);
        expect(regles.bilan(r, s.etat).score).toBe(1);
        // la mesure est celle d'une manipulation soignée
        expect(Math.abs(regles.bilan(r, s.etat).mesures.VE - equivalenceReelle(r, s.etat))).toBeLessThanOrEqual(0.12);
        // rejouée par le serveur, la liste des gestes redonne le même état
        expect(rejoue(regles, r, s.gestes)).toEqual(s.etat);
      }
    });
    it(`${id} : un élève qui réagit avec un peu de retard reste sans faute`, () => {
      for (const graine of GRAINES.slice(0, 4)) {
        const r = reglages(id, graine);
        const s = suis(r, { retardFilet: 8, retardAppui: 3 });
        expect(s.fini, `${id} graine ${graine} : ${s.cles.slice(-3).join(", ")}`).toBe(true);
        expect(fautes(r, s.etat), `${id} graine ${graine}`).toEqual([]);
      }
    });
  }

  it("le guide suit l'ordre du protocole, et montre chaque étape", () => {
    const r = reglages("detartrant", 1);
    // un élève qui relâche un peu tard : il dépasse le zéro et le trait de jauge, comme tout le monde
    const { cles } = suis(r, { retardAppui: 3 });
    const attendues = ["rincer-poubelle", "rincer-flacon", "rincer-verser", "rincer-vider", "rincer-attendre", "remplir-fermer", "remplir-verser", "zero-ouvrir", "zero-attendre", "zero-fermer",
      "ranger-flacon", "ranger-poubelle", "prise-plonger", "prise-aspirer", "prise-porter", "prise-ajuster", "prise-porter", "prise-vider", "prise-ranger", "indicateur-poser", "indicateur-gouttes", "indicateur-ranger",
      "barreau", "placer", "agiter", "titrage-filet", "titrage-surveiller", "titrage-ralentir", "titrage-guetter", "titrage-fermer", "noter", "lire", "fini"];
    expect(cles).toEqual(attendues);
    // le rang de l'étape du protocole ne recule jamais, et reste dans le protocole
    const protocole = paillasse("detartrant", 1).protocole;
    let etat = regles.depart(r);
    let rang = 0;
    for (const g of suis(r).gestes) {
      etat = regles.geste(r, etat, g);
      const e = prochain(r, etat, { flacon: false, outil: null, robinet: 0, saisie: false, courbe: false }).etape;
      expect(e).toBeLessThan(protocole.length);
      rang = Math.max(rang, e);
    }
    expect(rang).toBe(protocole.length - 1);
  });

  it("avec une sonde : l'eau, le barreau, la sonde rincée puis plongée, des ajouts, la courbe", () => {
    for (const [id, cle] of [["vinaigre", "titrage-saut"], ["serum", "titrage-arret"]] as const) {
      const { cles } = suis(reglages(id, 2));
      const rangs = ["eau-poser", "eau-verser", "barreau", "sonde-rincer", "eau-ranger", "sonde-plonger", "placer", "agiter", "titrage-ajout", cle, "courbe", "courbe-repere", "fini"].map((c) => cles.indexOf(c));
      expect(rangs.every((x) => x >= 0), `${id} : ${cles.join(" ")}`).toBe(true);
      expect([...rangs].sort((a, b) => a - b)).toEqual(rangs);
      expect(paillasse(id, 2).protocole.length).toBe(7);
    }
  });
});

describe("le guide rattrape une manipulation mal partie", () => {
  const r = reglages("detartrant", 3);
  it("une burette remplie sans rinçage : il la fait vider, puis remplir de nouveau", () => {
    const s = suis(r, { avant: [{ g: "remplir", v: 26 }] });
    expect(s.cles.slice(0, 3)).toEqual(["rincer-poubelle", "rincer-vider", "rincer-attendre"]);
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("un niveau qui passe devant le zéro pendant le remplissage n'est pas un zéro réglé", () => {
    const vue: VueTitrage = { flacon: true, outil: null, robinet: 0, saisie: false, courbe: false };
    const rincee = rejoue(regles, r, [{ g: "dessous", quoi: "poubelle" }, { g: "remplir", v: 4 }, { g: "couler", v: 4, filet: true }, { g: "pause" }]);
    const auZero = regles.geste(r, rincee, { g: "remplir", v: 25 });
    expect(lecture(auZero)).toBe(0);
    expect(prochain(r, auZero, vue).cle).toBe("remplir-verser");
    const auDessus = regles.geste(r, auZero, { g: "remplir", v: 0.4 });
    expect(prochain(r, auDessus, vue).cle).toBe("zero-ouvrir");
    // descendu au robinet jusqu'au zéro : cette fois, il est réglé
    const regle = Array.from({ length: 8 }, () => ({ g: "couler", v: 0.05 })).reduce((e, g) => regles.geste(r, e, g), auDessus);
    expect(lecture(regle)).toBe(0);
    expect(prochain(r, regle, vue).cle).toBe("ranger-flacon");
  });
  it("un robinet ouvert sans rien dessous : il le fait fermer d'abord", () => {
    const avant: GesteBrut[] = [{ g: "remplir", v: 10 }];
    const etat = rejoue(regles, r, avant);
    expect(prochain(r, etat, { flacon: true, outil: null, robinet: 1, saisie: false, courbe: false }).cle).toBe("renverse");
    // on ne déplace rien pendant que la burette coule
    const p = prochain(r, { ...etat, dessous: "erlenmeyer" }, { flacon: true, outil: null, robinet: 0.3, saisie: false, courbe: false });
    expect([p.cle, p.geste]).toEqual(["fermer", "tourner"]);
  });
  it("une équivalence dépassée au filet : il fait recommencer le titrage, qui finit sans faute", () => {
    const debut: GesteBrut[] = [{ g: "dessous", quoi: "poubelle" }, { g: "remplir", v: 4 }, { g: "couler", v: 4, filet: true }, { g: "remplir", v: 25 }, { g: "dessous", quoi: "rien" },
      { g: "pipette", ou: "becher" }, { g: "aspirer", v: 10 }, { g: "pipette", ou: "erlenmeyer" }, { g: "vider", v: 10 }, { g: "pipette", ou: "repos" },
      { g: "goutte" }, { g: "goutte" }, { g: "barreau" }, { g: "dessous", quoi: "erlenmeyer" }, { g: "agiter", v: 3 }, { g: "couler", v: 12, filet: true }, { g: "pause" }];
    const etat = rejoue(regles, r, debut);
    expect(fautes(r, etat)).toContain("apres!");
    expect(prochain(r, etat, { flacon: false, outil: null, robinet: 0, saisie: false, courbe: false })).toMatchObject({ cle: "titrage-refaire", geste: "bouton", bouton: "recommencer" });
    const s = suis(r, { avant: debut });
    expect(s.fini).toBe(true);
    expect(s.etat.essais).toBe(1);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("une prise d'essai fausse : il la fait refaire", () => {
    const avant: GesteBrut[] = [{ g: "pipette", ou: "becher" }, { g: "aspirer", v: 9 }, { g: "pipette", ou: "erlenmeyer" }, { g: "vider", v: 9 }];
    const s = suis(r, { avant });
    expect(s.cles).toContain("prise-refaire");
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("une pipette mal ajustée portée au-dessus du récipient : il la fait replonger", () => {
    const etat = rejoue(regles, r, [{ g: "pipette", ou: "becher" }, { g: "aspirer", v: 11 }, { g: "pipette", ou: "erlenmeyer" }]);
    const vue: VueTitrage = { flacon: false, outil: null, robinet: 0, saisie: false, courbe: false };
    // la burette passe d'abord : le guide suit le protocole
    expect(prochain(r, etat, vue).cle).toBe("rincer-poubelle");
    const prete = { ...etat, eauBurette: false, volume: 25, descendu: true };
    expect(prochain(r, prete, vue)).toMatchObject({ cle: "prise-plonger", objet: "pipette", cible: "becher" });
    expect(prochain(r, { ...prete, pipette: "becher" }, vue)).toMatchObject({ cle: "prise-ajuster", geste: "toucher", poussoir: "redescendre" });
  });
});

describe("poser un objet", () => {
  const r = reglages("vinaigre", 1);
  const depart = regles.depart(r);
  const rien = { flacon: false, outil: null } as const;
  it("donne aux règles le geste qui convient, et retient les outils posés", () => {
    expect(pose(r, depart, rien, "soude", "burette")).toMatchObject({ gestes: [], poses: { flacon: true } });
    expect(pose(r, depart, { flacon: true, outil: null }, "soude", "rangement-soude").poses.flacon).toBe(false);
    expect(pose(r, depart, rien, "poubelle", "dessous").gestes).toEqual([{ g: "dessous", quoi: "poubelle" }]);
    expect(pose(r, depart, rien, "pipette", "becher").gestes).toEqual([{ g: "pipette", ou: "becher" }]);
    expect(pose(r, depart, rien, "pissette", "vase").poses.outil).toBe("pissette");
    expect(pose(r, depart, rien, "pissette", "sonde").gestes).toEqual([{ g: "rincersonde" }]);
    expect(pose(r, depart, rien, "sonde", "vase").gestes).toEqual([{ g: "sonde", dans: true }]);
    expect(pose(r, depart, rien, "sonde", "rangement-compte").gestes).toEqual([{ g: "sonde", dans: false }]);
    expect(pose(r, depart, rien, "barreau", "vase").gestes).toEqual([{ g: "barreau" }]);
  });
  it("la pipette laisse la place : un outil posé au-dessus du récipient la renvoie à son rangement, et l'inverse", () => {
    const pipette = { ...depart, pipette: "erlenmeyer" as const };
    expect(pose(r, pipette, rien, "pissette", "vase").gestes).toEqual([{ g: "pipette", ou: "repos" }]);
    expect(pose(r, pipette, rien, "erlenmeyer", "dessous").gestes).toEqual([{ g: "dessous", quoi: "erlenmeyer" }, { g: "pipette", ou: "repos" }]);
    expect(pose(r, depart, { flacon: false, outil: "pissette" }, "pipette", "vase").poses.outil).toBeNull();
    expect(pose(r, depart, { flacon: false, outil: "pissette" }, "pipette", "becher").poses.outil).toBe("pissette");
  });
  it("un objet inconnu ne change rien, et chaque geste a sa phrase", () => {
    expect(pose(r, depart, rien, "licorne", "vase")).toEqual({ gestes: [], poses: rien, message: "" });
    // un objet posé qui permet un geste le dit à part : la vue l'ajoute quand le guide est coupé
    expect(pose(r, depart, rien, "soude", "burette").conseil).toContain("« Verser »");
    expect(pose(r, depart, rien, "pipette", "becher").conseil).toContain("« Aspirer »");
    expect(pose(r, depart, rien, "pipette", "vase").conseil).toContain("« Vider »");
    expect(pose(r, depart, rien, "pissette", "vase").conseil).toContain("« Eau »");
    expect(pose(r, depart, rien, "compte", "vase").conseil).toContain("« Goutte »");
    expect(pose(r, depart, rien, "barreau", "vase").conseil).toBeUndefined();
    for (const [objet, cible] of [["soude", "burette"], ["poubelle", "dessous"], ["erlenmeyer", "dessous"], ["pipette", "vase"], ["pissette", "vase"], ["compte", "vase"], ["barreau", "vase"], ["sonde", "vase"], ["pipette", "rangement-pipette"]]) {
      expect(pose(r, depart, rien, objet, cible).message.length).toBeGreaterThan(10);
    }
  });
});

describe("le robinet", () => {
  it("goutte à goutte d'abord, de plus en plus vite ; au filet ensuite, de plus en plus fort", () => {
    expect(entreGouttes(0.05)).toBeCloseTo(1.1, 9);
    expect(entreGouttes(AU_FILET)).toBeCloseTo(0.25, 9);
    expect(entreGouttes(0.3)).toBeLessThan(entreGouttes(0.1));
    expect(debitFilet(AU_FILET)).toBeCloseTo(0.3, 9);
    expect(debitFilet(1)).toBeCloseTo(1.5, 9);
  });
});

describe("la marque du guide", () => {
  const gestes: GesteBrut[] = [{ g: "dessous", quoi: "poubelle" }, { g: "remplir", v: 4 }];
  it("s'ajoute une seule fois, et se retire avant de rejouer", () => {
    expect(guideServi(gestes)).toBe(false);
    const marques = avecMarqueDuGuide(avecMarqueDuGuide(gestes));
    expect(marques).toEqual([...gestes, { g: "guide" }]);
    expect(guideServi(marques)).toBe(true);
    expect(sansMarqueDuGuide(marques)).toEqual(gestes);
  });
  it("le professeur plafonne une manipulation faite avec le guide, et le dit", async () => {
    for (const id of TITRAGES) {
      const etape = paillasse(id, 1);
      const { gestes: soignes } = suis(etape.paillasse.reglages as ReglagesTitrage);
      const seul = await verifie(etape, { g: "paillasse", gestes: soignes }, {}, 1);
      const aide = await verifie(etape, { g: "paillasse", gestes: avecMarqueDuGuide(soignes) }, {}, 1);
      expect(seul?.retour).toMatchObject({ score: 1, correction: { genre: "paillasse", fautes: [] } });
      expect(seul?.retour.correction).not.toHaveProperty("guide");
      expect(aide?.retour).toMatchObject({ score: PLAFOND_AVEC_GUIDE, correction: { genre: "paillasse", fautes: [], guide: true } });
      // la marque ne change ni les fautes ni les mesures
      expect(aide?.mesures).toEqual(seul?.mesures);
      // une manipulation fautive n'est pas remontée par le plafond
      const rate = await verifie(etape, { g: "paillasse", gestes: avecMarqueDuGuide([]) }, {}, 1);
      expect(rate?.retour.score).toBe(0);
    }
  });
});
