// Le guide de la paillasse « ccm » (lib/commun/tp/paillasses/ccm-guide.ts). Un élève de test fait, sans réfléchir,
// exactement ce que le guide lui dit : la chromatographie qu'il obtient doit être sans faute, pour chaque graine.
// Le guide est donc complet, dans le bon ordre, et il ne tourne jamais en rond.
import { describe, expect, it } from "vitest";
import { frontActuel, regles, type EtatCcm, type ReglagesCcm } from "@/lib/commun/tp/paillasses/ccm";
import { SORTIE, pose, prochain, type PasCcm, type PosesCcm, type VueCcm } from "@/lib/commun/tp/paillasses/ccm-guide";
import { rejoue, type GesteBrut } from "@/lib/commun/tp/types";
import synthese from "@/lib/serveur/contenu/tp/synthese";
import { GRAINES, type EtapeDePaillasse } from "../../outils/tp";

/** L'étape de chromatographie du TP, pour une graine. */
function paillasse(graine: number): EtapeDePaillasse {
  const etape = synthese.etapes(graine).find((e) => e.genre === "paillasse" && e.paillasse.genre === "ccm");
  if (!etape || etape.genre !== "paillasse") throw new Error("pas de chromatographie dans le TP");
  return etape;
}
const reglages = (graine: number) => paillasse(graine).paillasse.reglages as ReglagesCcm;
const SANS_POSE: PosesCcm = { verse: false, outil: null, capillaire: null, pres: false };
const VUE: VueCcm = { ...SANS_POSE, viseur: 2.5, zero: 0, saisie: null };
const vingtieme = (x: number) => Math.round(x * 20) / 20;

interface Suivi { etat: EtatCcm; gestes: GesteBrut[]; cles: string[]; etapes: number[]; fini: boolean }
interface Eleve {
  /** les morceaux versés ou attendus en trop avant que l'élève relâche un poussoir */
  retard?: number;
  /** des gestes faits avant d'écouter le guide, et ce que la vue retient après eux */
  avant?: GesteBrut[];
  vue?: Partial<VueCcm>;
}

/** L'élève de test : il fait ce que le guide dit, jusqu'à « J'ai fini ». */
function suis(r: ReglagesCcm, eleve: Eleve = {}): Suivi {
  let etat = rejoue(regles, r, eleve.avant ?? []);
  const gestes: GesteBrut[] = [...(eleve.avant ?? [])];
  let vue: VueCcm = { ...VUE, ...eleve.vue };
  const cles: string[] = [], etapes: number[] = [];
  const agit = (g: GesteBrut) => { etat = regles.geste(r, etat, g); gestes.push(g); };
  /** ce que donne un morceau d'appui sur un poussoir maintenu */
  const morceau = (poussoir: string): GesteBrut => (poussoir === "verser" ? { g: "eluant", v: etat.eluant < 0.35 ? 0.05 : 0.02 } : { g: "attendre", v: 0.25 });
  let dernier: PasCcm | null = null;
  for (let tour = 0; tour < 4000; tour++) {
    const p = prochain(r, etat, vue);
    if (p.cle !== dernier?.cle) {
      cles.push(p.cle);
      etapes.push(p.etape);
      // une nouvelle consigne : l'élève met un peu de temps à lâcher le poussoir
      if (dernier?.geste === "maintenir") for (let i = 0; i < (eleve.retard ?? 0); i++) agit(morceau(dernier.poussoir));
      dernier = p;
      if (prochain(r, etat, vue).cle !== p.cle) continue;
    }
    switch (p.geste) {
      case "glisser": { const suite = pose(etat, vue, p.objet, p.cible); suite.gestes.forEach(agit); vue = { ...vue, ...suite.poses }; break; }
      case "maintenir": agit(morceau(p.poussoir)); break;
      case "curseur": vue = p.quoi === "viseur" ? { ...vue, viseur: p.vers } : { ...vue, zero: p.vers }; break;
      case "toucher":
        if (p.poussoir === "tracer" && vue.outil) {
          const avant = etat;
          agit({ g: "trait", h: vue.viseur, outil: vue.outil });
          if (etat !== avant) vue = { ...vue, outil: null };
        } else if (p.poussoir === "deposer" && vue.capillaire) {
          agit({ g: "deposer", de: vue.capillaire.de, ou: vue.capillaire.ou, v: 1.1 });
        } else if (p.poussoir === "lampe") {
          const revele = !etat.uv && !etat.dansCuve && etat.front !== null;
          agit({ g: "uv", marche: !etat.uv });
          if (revele) vue = { ...vue, pres: true };
        } else if (p.poussoir.startsWith("carnet-")) {
          vue = { ...vue, saisie: p.poussoir.slice(7) as VueCcm["saisie"] };
        }
        break;
      // il lit dans la loupe la graduation en face du curseur, et la note
      case "montrer": if (vue.saisie) { agit({ g: "noter", quoi: vue.saisie, v: vingtieme(vue.viseur - vue.zero) }); vue = { ...vue, saisie: null }; } break;
      case "bouton":
        if (p.bouton === "fini") return { etat, gestes, cles, etapes, fini: true };
        if (p.bouton === "nouvelle") { agit({ g: "nouvelle" }); vue = { ...vue, outil: null, capillaire: null, saisie: null }; }
        if (p.bouton === "reposer") vue = { ...vue, outil: null };
        if (p.bouton === "voir") vue = vue.capillaire ? { ...vue, capillaire: null, pres: false } : { ...vue, pres: !vue.pres };
        break;
    }
  }
  return { etat, gestes, cles, etapes, fini: false };
}

const fautes = (r: ReglagesCcm, etat: EtatCcm) => regles.bilan(r, etat).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);

describe("l'élève qui suit le guide de la chromatographie", () => {
  it("la manipulation est sans faute, pour chaque graine", () => {
    for (const graine of GRAINES) {
      const r = reglages(graine);
      const s = suis(r);
      expect(s.fini, `graine ${graine} : le guide s'arrête sur ${s.cles.slice(-3).join(", ")}`).toBe(true);
      expect(fautes(r, s.etat), `graine ${graine}`).toEqual([]);
      expect(regles.bilan(r, s.etat).score).toBe(1);
      // le front est sorti à temps, et les distances sont celles de la plaque
      expect(frontActuel(s.etat)).toBeGreaterThanOrEqual(SORTIE);
      expect(regles.bilan(r, s.etat).mesures.hR / regles.bilan(r, s.etat).mesures.H).toBeCloseTo(r.rfProduit, 1);
      // rejouée par le serveur, la liste des gestes redonne le même état
      expect(rejoue(regles, r, s.gestes)).toEqual(s.etat);
    }
  });
  it("un élève qui lâche les poussoirs avec un peu de retard reste sans faute", () => {
    for (const graine of GRAINES.slice(0, 4)) {
      const r = reglages(graine);
      const s = suis(r, { retard: 3 });
      expect(s.fini, `graine ${graine} : ${s.cles.slice(-3).join(", ")}`).toBe(true);
      expect(fautes(r, s.etat), `graine ${graine}`).toEqual([]);
    }
  });
  it("le guide suit l'ordre du protocole, et montre chaque étape", () => {
    const { cles, etapes } = suis(reglages(1));
    expect(cles).toEqual(["eluant-poser", "eluant-verser", "eluant-ranger", "cuve-fermer", "ligne-crayon", "ligne-viser", "ligne-tracer",
      "depot-a-capillaire", "depot-a-porter", "depot-a-toucher", "depot-p-capillaire", "depot-p-porter", "depot-p-toucher", "depot-r-capillaire", "depot-r-porter", "depot-r-toucher", "depot-ranger",
      "plonger-ouvrir", "plonger", "migrer-fermer", "migrer", "sortir-ouvrir", "sortir", "front-crayon", "front-viser", "front-tracer", "lampe",
      "mesurer-zero", "mesurer-front-noter", "lire", "mesurer-a-viser", "mesurer-a-noter", "lire", "mesurer-r-viser", "mesurer-r-noter", "lire", "fini"]);
    // le rang de l'étape du protocole ne recule jamais, et va jusqu'à la dernière
    expect([...etapes].sort((a, b) => a - b)).toEqual(etapes);
    expect(etapes[etapes.length - 1]).toBe(paillasse(1).protocole.length - 1);
    expect(new Set(etapes).size).toBe(paillasse(1).protocole.length);
  });
});

describe("le guide rattrape une chromatographie mal partie", () => {
  const r = reglages(2);
  const depot = (s: string, v = 1.5): GesteBrut[] => [{ g: "capillaire", de: "pot", vers: s }, { g: "deposer", de: s, ou: s, v }];
  const rattrape = (avant: GesteBrut[], vue: Partial<VueCcm> = {}) => {
    const s = suis(r, { avant, vue });
    expect(s.fini, s.cles.slice(-3).join(", ")).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
    return s;
  };
  it("trop d'éluant : il fait vider la cuve, puis reverser", () => {
    expect(rattrape([{ g: "eluant", v: 1.5 }]).cles.slice(0, 3)).toEqual(["cuve-vider", "eluant-poser", "eluant-verser"]);
    // cuve fermée, ou flacon encore penché : d'abord ouvrir, d'abord reposer
    expect(rattrape([{ g: "eluant", v: 1.5 }, { g: "couvercle", pose: true }]).cles.slice(0, 2)).toEqual(["cuve-rouvrir", "cuve-vider"]);
    expect(rattrape([{ g: "eluant", v: 1.5 }], { verse: true }).cles[0]).toBe("cuve-reposer");
    expect(rattrape([{ g: "couvercle", pose: true }]).cles[0]).toBe("cuve-ouvrir");
  });
  it("une ligne au stylo, mal placée, un dépôt trop gros, un mauvais repère : il fait prendre une plaque neuve", () => {
    for (const avant of [[{ g: "trait", h: 1, outil: "stylo" }], [{ g: "trait", h: 1.6, outil: "crayon" }], [{ g: "trait", h: 1, outil: "crayon" }, ...depot("a", 6)],
      [{ g: "trait", h: 1, outil: "crayon" }, { g: "capillaire", de: "pot", vers: "a" }, { g: "deposer", de: "a", ou: "p", v: 1.5 }]] as GesteBrut[][]) {
      const s = rattrape(avant);
      expect(s.cles[0]).toBe("nouvelle");
      expect(s.etat.essais).toBe(1);
    }
    // le stylo posé sur la plaque : il le fait reposer avant de tracer, ou avant de changer de plaque
    expect(prochain(r, regles.depart(r), { ...VUE, outil: "stylo" })).toMatchObject({ cle: "ranger-outil", bouton: "reposer" });
    const pret = rejoue(regles, r, [{ g: "eluant", v: 0.5 }, { g: "couvercle", pose: true }]);
    expect(prochain(r, pret, { ...VUE, outil: "stylo" })).toMatchObject({ cle: "ligne-stylo", bouton: "reposer" });
    expect(prochain(r, rejoue(regles, r, [{ g: "trait", h: 1, outil: "stylo" }]), { ...VUE, outil: "stylo" })).toMatchObject({ cle: "gachee-reposer", bouton: "reposer" });
  });
  it("un capillaire trempé dans deux flacons : il le fait remplacer avant le dépôt", () => {
    const s = rattrape([{ g: "capillaire", de: "pot", vers: "a" }, { g: "capillaire", de: "a", vers: "p" }]);
    expect(s.cles).toContain("depot-p-remplacer");
    expect(s.etat.souille).toBe(false);
  });
  it("une plaque noyée, sortie trop tôt, montée jusqu'en haut, au front non marqué : plaque neuve, et tout recommence", () => {
    const debut: GesteBrut[] = [{ g: "trait", h: 1, outil: "crayon" }, ...depot("a"), ...depot("p"), ...depot("r")];
    const noyee = rattrape([{ g: "eluant", v: 1.3 }, ...debut, { g: "plonger" }]);
    expect(noyee.cles.slice(0, 2)).toEqual(["nouvelle", "cuve-vider"]);
    const cuve: GesteBrut[] = [{ g: "eluant", v: 0.5 }, { g: "couvercle", pose: true }, ...debut, { g: "couvercle", pose: false }, { g: "plonger" }, { g: "couvercle", pose: true }];
    for (const suite of [[{ g: "attendre", v: 2 }, { g: "couvercle", pose: false }, { g: "sortir" }], [{ g: "attendre", v: 40 }], [{ g: "attendre", v: 12 }, { g: "couvercle", pose: false }, { g: "sortir" }, { g: "uv", marche: true }]] as GesteBrut[][]) {
      const s = rattrape([...cuve, ...suite]);
      expect(s.cles[0]).toBe("nouvelle");
      // la cuve garde son éluant : seule la plaque est refaite
      expect(s.cles).not.toContain("eluant-verser");
    }
  });
  it("de près, il fait d'abord ranger le capillaire ou reculer : la cuve et les crayons sont hors de vue", () => {
    const depart = regles.depart(r);
    expect(prochain(r, depart, { ...VUE, pres: true })).toMatchObject({ cle: "voir-tout", bouton: "voir" });
    expect(prochain(r, rejoue(regles, r, [{ g: "capillaire", de: "pot", vers: "a" }]), { ...VUE, capillaire: { de: "a", ou: "a" } })).toMatchObject({ cle: "ranger-capillaire", objet: "cap-a", cible: "fiole-a" });
    // la plaque sortie, lampe allumée, vue d'ensemble : il fait se rapprocher pour mesurer
    const sortie = suis(r).gestes.slice(0, -3);
    expect(prochain(r, rejoue(regles, r, sortie), VUE).cle).toBe("mesurer-voir");
  });
});

describe("poser un objet de la chromatographie", () => {
  const r = reglages(1);
  const depart = regles.depart(r);
  it("donne aux règles le geste qui convient, et retient ce qui est posé", () => {
    expect(pose(depart, SANS_POSE, "eluant", "versoir")).toMatchObject({ gestes: [], poses: { verse: true } });
    expect(pose(depart, { ...SANS_POSE, verse: true }, "eluant", "repos-eluant").poses.verse).toBe(false);
    expect(pose(depart, SANS_POSE, "couvercle", "ouverture").gestes).toEqual([{ g: "couvercle", pose: true }]);
    expect(pose(depart, SANS_POSE, "plaque", "cuve")).toMatchObject({ gestes: [{ g: "plonger" }], poses: SANS_POSE });
    expect(pose(depart, SANS_POSE, "plaque", "feuille").gestes).toEqual([{ g: "sortir" }]);
    expect(pose(depart, SANS_POSE, "cuve", "bidon").gestes).toEqual([{ g: "vider" }]);
    expect(pose(depart, { ...SANS_POSE, capillaire: { de: "a", ou: "a" } }, "crayon", "plaque").poses).toMatchObject({ outil: "crayon", capillaire: null });
    expect(pose(depart, SANS_POSE, "capillaire", "fiole-p").gestes).toEqual([{ g: "capillaire", de: "pot", vers: "p" }]);
    expect(pose(depart, { ...SANS_POSE, outil: "crayon" }, "cap-a", "repere-p").poses).toMatchObject({ outil: null, capillaire: { de: "a", ou: "p" } });
    expect(pose(depart, { ...SANS_POSE, capillaire: { de: "a", ou: "a" } }, "cap-a", "fiole-a")).toMatchObject({ gestes: [], poses: { capillaire: null } });
    expect(pose(depart, SANS_POSE, "cap-a", "fiole-r").gestes).toEqual([{ g: "capillaire", de: "a", vers: "r" }]);
  });
  it("un geste impossible dit pourquoi, et ne change rien", () => {
    const fermee = { ...depart, couvercle: true };
    for (const [objet, cible] of [["eluant", "versoir"], ["plaque", "cuve"], ["plaque", "feuille"]]) {
      expect(pose(fermee, SANS_POSE, objet, cible)).toMatchObject({ gestes: [], poses: SANS_POSE, message: "La cuve est fermée : retire d'abord le couvercle." });
    }
    expect(pose(depart, { ...SANS_POSE, verse: true }, "couvercle", "ouverture")).toMatchObject({ gestes: [], message: "Le flacon d'éluant est encore au-dessus de la cuve : repose-le d'abord." });
    for (const [objet, cible] of [["licorne", "cuve"], ["capillaire", "fiole-z"], ["cap-z", "fiole-a"], ["cap-a", "plafond"]]) expect(pose(depart, SANS_POSE, objet, cible)).toEqual({ gestes: [], poses: SANS_POSE, message: "" });
    // la plaque dans une cuve vide, ou trop pleine : la phrase dit ce qu'on voit
    expect(pose(depart, SANS_POSE, "plaque", "cuve").message).toContain("pas d'éluant");
    expect(pose({ ...depart, eluant: 1.2 }, SANS_POSE, "plaque", "cuve").message).toContain("trempe dans l'éluant");
    expect(pose({ ...depart, eluant: 0.5 }, SANS_POSE, "plaque", "cuve").message).toContain("son bas trempe");
  });
});
