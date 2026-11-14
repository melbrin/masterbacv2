// Le guide de la paillasse « reflux » (lib/commun/tp/paillasses/reflux-guide.ts). Un élève de test fait, sans réfléchir,
// exactement ce que le guide lui dit, d'un poste à l'autre : la synthèse qu'il obtient doit être sans faute, pour
// chaque graine. Le guide est donc complet, dans le bon ordre, et il ne tourne jamais en rond.
import { describe, expect, it } from "vitest";
import { affichage, masseExacte, regles, type EtatReflux, type ReglagesReflux } from "@/lib/commun/tp/paillasses/reflux";
import { AU_FILET, GOUTTE, debitFilet, entreGouttes, pose, prochain, type PasReflux, type Poste, type PosesReflux, type VueReflux } from "@/lib/commun/tp/paillasses/reflux-guide";
import { rejoue, type GesteBrut } from "@/lib/commun/tp/types";
import synthese from "@/lib/serveur/contenu/tp/synthese";
import { GRAINES, type EtapeDePaillasse } from "../../outils/tp";

/** L'étape de synthèse du TP, pour une graine. */
function paillasse(graine: number): EtapeDePaillasse {
  const etape = synthese.etapes(graine).find((e) => e.genre === "paillasse" && e.paillasse.genre === "reflux");
  if (!etape || etape.genre !== "paillasse") throw new Error("pas de synthèse dans le TP");
  return etape;
}
const reglages = (graine: number) => paillasse(graine).paillasse.reglages as ReglagesReflux;
const SANS_POSE: PosesReflux = { verse: false, compte: false };
const VUE: VueReflux = { ...SANS_POSE, poste: 1, robinet: 0, saisie: false };
const fois = (n: number, g: GesteBrut): GesteBrut[] => Array.from({ length: n }, () => g);

interface Suivi { etat: EtatReflux; gestes: GesteBrut[]; cles: string[]; etapes: number[]; fini: boolean }
interface Eleve {
  /** les morceaux versés ou attendus en trop avant que l'élève relâche un poussoir, et ceux qui coulent encore au filet avant qu'il réagisse */
  retardAppui?: number;
  retardFilet?: number;
  /** des gestes faits avant d'écouter le guide, et ce que la vue retient après eux */
  avant?: GesteBrut[];
  vue?: Partial<VueReflux>;
}

/** L'élève de test : il fait ce que le guide dit, jusqu'à « J'ai fini ». L'ampoule coule d'un morceau à chaque tour, robinet ouvert. */
function suis(r: ReglagesReflux, eleve: Eleve = {}): Suivi {
  let etat = rejoue(regles, r, eleve.avant ?? []);
  const gestes: GesteBrut[] = [...(eleve.avant ?? [])];
  let vue: VueReflux = { ...VUE, ...eleve.vue };
  const cles: string[] = [], etapes: number[] = [];
  const agit = (g: GesteBrut) => { etat = regles.geste(r, etat, g); gestes.push(g); };
  const coule = () => { if (vue.robinet > 0 && etat.ampoule && !etat.bouchon) agit({ g: "couler", v: vue.robinet <= AU_FILET ? GOUTTE : 0.25 }); };
  /** ce que donne un morceau d'appui sur un poussoir maintenu : plus petit près du but */
  const morceau = (poussoir: string): GesteBrut => {
    if (poussoir === "mesurer") return { g: "mesurer", v: etat.eprouvette < r.Vc - etat.acide - 3 ? 0.5 : 0.1 };
    if (poussoir === "aspirer") return { g: "aspirer", v: etat.dansPipette < r.Va - 1.5 ? 0.1 : 0.05 };
    return poussoir === "vider" ? { g: "vider", v: 0.2 } : { g: "attendre", v: 0.5 };
  };
  let dernier: PasReflux | null = null;
  for (let tour = 0; tour < 20000; tour++) {
    const p = prochain(r, etat, vue);
    if (p.cle !== dernier?.cle) {
      cles.push(p.cle);
      etapes.push(p.etape);
      // une nouvelle consigne : l'élève met un peu de temps à réagir
      if (dernier?.geste === "maintenir") for (let i = 0; i < (eleve.retardAppui ?? 0); i++) agit(morceau(dernier.poussoir));
      if (vue.robinet > AU_FILET) for (let i = 0; i < (eleve.retardFilet ?? 0); i++) coule();
      dernier = p;
      if (prochain(r, etat, vue).cle !== p.cle) continue;
    }
    switch (p.geste) {
      case "glisser": { const suite = pose(r, etat, vue, p.objet, p.cible); suite.gestes.forEach(agit); vue = { ...vue, ...suite.poses }; break; }
      case "maintenir": agit(morceau(p.poussoir)); break;
      case "toucher": agit(p.poussoir === "redescendre" ? { g: "vider", v: 0.05 } : p.poussoir === "tare" ? { g: "tarer" } : { g: p.poussoir }); break;
      case "tourner":
        if (p.molette === "robinet") vue = { ...vue, robinet: p.vers };
        else agit({ g: p.molette === "support" ? "monter" : p.molette, v: p.vers });
        break;
      case "tirer": agit({ g: "tuyau", a: p.de, b: p.vers, pose: true }); break;
      case "tuyau": agit({ g: "tuyau", a: p.a, b: p.b, pose: false }); break;
      // il lit la balance, et note la masse
      case "montrer": if (vue.saisie) { agit({ g: "noter", v: affichage(r, etat) }); vue = { ...vue, saisie: false }; } break;
      case "bouton":
        if (p.bouton === "fini") return { etat, gestes, cles, etapes, fini: true };
        if (p.bouton === "noter") vue = { ...vue, robinet: 0, saisie: true };
        else vue = { ...vue, poste: Number(p.bouton.slice(6)) as Poste, verse: false, compte: false, robinet: 0, saisie: false };
        break;
    }
    coule();
  }
  return { etat, gestes, cles, etapes, fini: false };
}

const fautes = (r: ReglagesReflux, etat: EtatReflux) => regles.bilan(r, etat).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);

describe("l'élève qui suit le guide de la synthèse", () => {
  it("la manipulation est sans faute, pour chaque graine", () => {
    for (const graine of GRAINES) {
      const r = reglages(graine);
      const s = suis(r);
      expect(s.fini, `graine ${graine} : le guide s'arrête sur ${s.cles.slice(-3).join(", ")}`).toBe(true);
      expect(fautes(r, s.etat), `graine ${graine}`).toEqual([]);
      expect(regles.bilan(r, s.etat).score).toBe(1);
      // la masse pesée est celle d'une manipulation soignée, à quelques dixièmes de gramme près
      expect(Math.abs(regles.bilan(r, s.etat).mesures.m - masseExacte(r))).toBeLessThan(0.5);
      // rejouée par le serveur, la liste des gestes redonne le même état
      expect(rejoue(regles, r, s.gestes)).toEqual(s.etat);
    }
  });
  it("un élève qui réagit avec un peu de retard reste sans faute", () => {
    for (const graine of GRAINES.slice(0, 4)) {
      const r = reglages(graine);
      const s = suis(r, { retardAppui: 3, retardFilet: 8 });
      expect(s.fini, `graine ${graine} : ${s.cles.slice(-3).join(", ")}`).toBe(true);
      expect(fautes(r, s.etat), `graine ${graine}`).toEqual([]);
      // il a dépassé le trait de jauge, comme tout le monde : le guide le lui fait rattraper
      expect(s.cles).toContain("alcool-ajuster");
    }
  });
  it("le guide suit l'ordre du protocole, d'un poste à l'autre, et montre chaque étape", () => {
    const { cles, etapes } = suis(reglages(1));
    expect(cles).toEqual(["equiper-blouse", "equiper-lunettes", "equiper-gants", "alcool-plonger", "alcool-aspirer", "alcool-porter", "alcool-vider", "alcool-ranger",
      "acide-poser", "acide-verser", "acide-ranger", "acide-ballon", "ponce", "gouttes-poser", "gouttes", "gouttes-ranger",
      "aller-2", "support", "chauffe", "pince-ballon", "ballon", "monter", "refrigerant", "pince-refrigerant", "tuyau-arrivee", "tuyau-sortie", "eau-ouvrir", "chauffer", "reflux",
      "couper", "descendre", "refroidir", "eau-fermer", "demonter", "aller-3", "transvaser", "boucher", "agiter-0", "degazer-1", "agiter-1", "degazer-2", "agiter-2", "degazer-3", "reposer", "deboucher",
      "poubelle", "aqueuse-filet", "aqueuse-couler", "aqueuse-ralentir", "aqueuse-guetter", "limite", "tare-poser", "tare", "recueillir-poser", "recueillir", "recueillir-couler", "recueillir-fermer", "peser", "noter", "lire-masse", "fini"]);
    // le rang de l'étape du protocole ne recule jamais, et chaque étape du protocole a son moment
    expect([...etapes].sort((a, b) => a - b)).toEqual(etapes);
    expect(new Set(etapes).size).toBe(paillasse(1).protocole.length);
  });
});

describe("le guide rattrape une synthèse mal partie", () => {
  const r = reglages(1);
  const equipement: GesteBrut[] = ["blouse", "lunettes", "gants"].map((quoi) => ({ g: "equiper", quoi, porte: true }));
  const rempli: GesteBrut[] = [...equipement, { g: "pipette", ou: "flacon" }, { g: "aspirer", v: r.Va }, { g: "pipette", ou: "ballon" }, { g: "vider", v: r.Va }, { g: "pipette", ou: "repos" },
    { g: "mesurer", v: r.Vc }, { g: "verser", vers: "ballon" }, { g: "ponce" }, ...fois(5, { g: "goutte" })];
  const monte: GesteBrut[] = [{ g: "placer", quoi: "support" }, { g: "placer", quoi: "chauffe" }, { g: "placer", quoi: "pinceb" }, { g: "ballon", ou: "montage" }, { g: "monter", v: 3 }, { g: "placer", quoi: "refrigerant" }, { g: "placer", quoi: "pincer" }];
  const rattrape = (avant: GesteBrut[], vue: Partial<VueReflux> = {}) => {
    const s = suis(r, { avant, vue });
    expect(s.fini, s.cles.slice(-3).join(", ")).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
    return s;
  };
  it("des tuyaux à l'envers, posés avant de chauffer : il les fait retirer, puis rebrancher", () => {
    const s = rattrape([...rempli, ...monte, { g: "tuyau", a: "robinet", b: "haut", pose: true }, { g: "tuyau", a: "bas", b: "evier", pose: true }], { poste: 2 });
    expect(s.cles.slice(0, 4)).toEqual(["tuyau-retirer-robinet-haut", "tuyau-retirer-bas-evier", "tuyau-arrivee", "tuyau-sortie"]);
    // le robinet d'eau déjà ouvert : il le fait fermer avant de toucher aux tuyaux
    expect(rattrape([...rempli, ...monte, { g: "tuyau", a: "robinet", b: "haut", pose: true }, { g: "eau", v: 2 }], { poste: 2 }).cles.slice(0, 2)).toEqual(["eau-avant", "tuyau-retirer-robinet-haut"]);
  });
  it("un thermostat trop fort, un ballon monté vide, une éprouvette trop pleine", () => {
    expect(rattrape([...rempli, ...monte, { g: "tuyau", a: "robinet", b: "bas", pose: true }, { g: "tuyau", a: "haut", b: "evier", pose: true }, { g: "eau", v: 1 }, { g: "thermostat", v: 6 }], { poste: 2 }).cles[0]).toBe("chauffer-moins");
    const vide = rattrape([...equipement, ...monte.slice(0, 4)], { poste: 2 });
    expect(vide.cles.slice(0, 3)).toEqual(["retour-ballon", "aller-1", "alcool-plonger"]);
    expect(rattrape([...equipement, { g: "mesurer", v: 24 }]).cles).toContain("acide-reverser");
    // un chauffage lancé avec une pièce en moins : d'abord couper
    const sansPince = rejoue(regles, r, [...rempli, ...monte.slice(0, 6), { g: "thermostat", v: 4 }]);
    expect(prochain(r, sansPince, { ...VUE, poste: 2 })).toMatchObject({ cle: "couper-avant", molette: "thermostat", vers: 0 });
  });
  it("une pipette mal ajustée portée au-dessus du ballon : il la fait replonger", () => {
    const s = rattrape([...equipement, { g: "pipette", ou: "flacon" }, { g: "aspirer", v: r.Va + 0.8 }, { g: "pipette", ou: "ballon" }]);
    expect(s.cles.slice(0, 3)).toEqual(["alcool-plonger", "alcool-ajuster", "alcool-porter"]);
  });
  it("à la séparation : un robinet ouvert sans rien dessous, un bouchon resté en place", () => {
    const { gestes } = suis(r);
    const lave = gestes.slice(0, gestes.findIndex((g) => g.g === "poubelle"));
    const etat = rejoue(regles, r, lave);
    expect(prochain(r, etat, { ...VUE, poste: 3, robinet: 0.7 })).toMatchObject({ cle: "fermer", molette: "robinet", vers: 0 });
    expect(prochain(r, regles.geste(r, etat, { g: "bouchon", pose: true }), { ...VUE, poste: 3 })).toMatchObject({ cle: "deboucher", objet: "bouchon", cible: "repos-bouchon" });
    // la saisie ouverte : il fait lire la balance ; au mauvais poste : il y conduit, un poste à la fois
    expect(prochain(r, etat, { ...VUE, poste: 3, saisie: true }).cle).toBe("lire-masse");
    expect(prochain(r, etat, VUE)).toMatchObject({ cle: "aller-2", bouton: "poste-2" });
    expect(prochain(r, etat, { ...VUE, poste: 2 })).toMatchObject({ cle: "aller-3", bouton: "poste-3" });
    expect(prochain(r, rejoue(regles, r, rempli), { ...VUE, poste: 3 })).toMatchObject({ cle: "aller-2", bouton: "poste-2" });
  });
});

describe("poser un objet, monter une pièce", () => {
  const r = reglages(1);
  const depart = regles.depart(r);
  it("donne aux règles le geste qui convient, et retient ce qui est posé", () => {
    expect(pose(r, depart, SANS_POSE, "lunettes", "toi").gestes).toEqual([{ g: "equiper", quoi: "lunettes", porte: true }]);
    expect(pose(r, depart, SANS_POSE, "acide", "tube").poses.verse).toBe(true);
    expect(pose(r, depart, { verse: true, compte: false }, "acide", "flacon-acide").poses.verse).toBe(false);
    expect(pose(r, depart, SANS_POSE, "sulfurique", "col").poses.compte).toBe(true);
    expect(pose(r, { ...depart, pipette: "ballon" }, SANS_POSE, "sulfurique", "col").gestes).toEqual([{ g: "pipette", ou: "repos" }]);
    expect(pose(r, depart, { verse: false, compte: true }, "pipette", "col")).toMatchObject({ gestes: [{ g: "pipette", ou: "ballon" }], poses: { compte: false } });
    expect(pose(r, depart, SANS_POSE, "pipette", "alcool").gestes).toEqual([{ g: "pipette", ou: "flacon" }]);
    expect(pose(r, { ...depart, eprouvette: 12 }, SANS_POSE, "eprouvette", "col").gestes).toEqual([{ g: "verser", vers: "ballon" }]);
    expect(pose(r, { ...depart, eprouvette: 12 }, SANS_POSE, "eprouvette", "flacon-acide").gestes).toEqual([{ g: "verser", vers: "flacon" }]);
    expect(pose(r, depart, SANS_POSE, "support", "socle").gestes).toEqual([{ g: "placer", quoi: "support" }]);
    expect(pose(r, depart, SANS_POSE, "pince-2", "noix-r").gestes).toEqual([{ g: "placer", quoi: "pincer" }]);
    expect(pose(r, depart, SANS_POSE, "pince-1", "noix-b").gestes).toEqual([{ g: "placer", quoi: "pinceb" }]);
    expect(pose(r, depart, SANS_POSE, "bouchon", "entonnoir").gestes).toEqual([{ g: "bouchon", pose: true }]);
    expect(pose(r, depart, SANS_POSE, "poubelle", "sous").gestes).toEqual([{ g: "poubelle", sous: true }]);
    expect(pose(r, depart, SANS_POSE, "becher", "balance").gestes).toEqual([{ g: "becher", ou: "balance" }]);
    expect(pose(r, depart, SANS_POSE, "becher", "sous").gestes).toEqual([{ g: "becher", ou: "sous" }]);
    expect(pose(r, { ...depart, becher: "sous" }, SANS_POSE, "becher", "repos-becher").gestes).toEqual([{ g: "becher", ou: "paillasse" }]);
  });
  it("un geste refusé dit pourquoi, et ne change rien", () => {
    const refus: [string, string, string][] = [["chauffe", "plateau", "d'abord le support"], ["refrigerant", "col-ballon", "d'abord le ballon"], ["ballon", "place-ballon", "une pince"], ["ballon", "entonnoir", "vide"],
      ["eprouvette", "col", "vide"], ["support", "repos-support", "retire-le"], ["pinceb", "ratelier", "seule à tenir"], ["refrigerant", "repos-refrigerant", "déjà rangé"]];
    const monte = rejoue(regles, r, [{ g: "placer", quoi: "support" }, { g: "placer", quoi: "chauffe" }, { g: "placer", quoi: "pinceb" }, { g: "ballon", ou: "montage" }]);
    for (const [objet, cible, mot] of refus) {
      const etat = objet === "support" || objet === "pinceb" ? monte : depart;
      const suite = pose(r, etat, SANS_POSE, objet, cible);
      expect(suite.gestes, `${objet} sur ${cible}`).toEqual([]);
      expect(suite.message, `${objet} sur ${cible}`).toContain(mot);
    }
    expect(pose(r, { ...depart, porte: { blouse: true, lunettes: false, gants: false } }, SANS_POSE, "blouse", "toi")).toMatchObject({ gestes: [], message: "Tu portes déjà la blouse." });
    expect(pose(r, depart, SANS_POSE, "licorne", "col")).toEqual({ gestes: [], poses: SANS_POSE, message: "" });
    // sans réfrigérant tenu, le ballon ne sort pas du montage ; l'ampoule bouchée ne reçoit rien
    const pose2 = rejoue(regles, r, [{ g: "placer", quoi: "support" }, { g: "placer", quoi: "chauffe" }, { g: "monter", v: 3 }, { g: "ballon", ou: "montage" }, { g: "placer", quoi: "refrigerant" }]);
    expect(pose(r, pose2, SANS_POSE, "ballon", "valet").message).toContain("retire-le d'abord");
    expect(pose(r, { ...depart, alcool: 10, bouchon: true }, SANS_POSE, "ballon", "entonnoir").message).toContain("bouchée");
  });
});

describe("le robinet de l'ampoule", () => {
  it("goutte à goutte d'abord, de plus en plus vite ; au filet ensuite, de plus en plus fort", () => {
    expect(entreGouttes(0.05)).toBeCloseTo(0.9, 9);
    expect(entreGouttes(AU_FILET)).toBeCloseTo(0.2, 9);
    expect(entreGouttes(0.25)).toBeLessThan(entreGouttes(0.1));
    expect(debitFilet(AU_FILET)).toBeCloseTo(0.8, 9);
    expect(debitFilet(1)).toBeCloseTo(6, 9);
    expect(GOUTTE).toBe(0.2);
  });
});
