// Le guide de la paillasse Solutions (lib/commun/tp/paillasses/solutions-guide.ts). Un élève de test fait, sans
// réfléchir, exactement ce que le guide lui dit : la solution qu'il obtient doit être sans faute, pour chaque graine du
// TP de dilution. Le guide est donc complet, dans le bon ordre, et il ne tourne jamais en rond.
import { describe, expect, it } from "vitest";
import { priseVoulue, regles, total, verrerie, type EtatSolutions, type ReglagesSolutions } from "@/lib/commun/tp/paillasses/solutions";
import { debitAspire, debitJet, pipetteDuGuide, pose, prochain, type PasDuGuide, type PosesSolutions } from "@/lib/commun/tp/paillasses/solutions-guide";
import { PLAFOND_AVEC_GUIDE, avecMarqueDuGuide, rejoue, type GesteBrut } from "@/lib/commun/tp/types";
import dilution from "@/lib/serveur/contenu/tp/dilution";
import { verifie } from "@/lib/serveur/tp";
import { GRAINES, type EtapeDePaillasse } from "../../outils/tp";

/** L'étape de paillasse du TP, pour une graine. */
function paillasse(graine: number): EtapeDePaillasse {
  const etape = dilution.etapes(graine).find((e) => e.genre === "paillasse");
  if (!etape || etape.genre !== "paillasse") throw new Error("pas de paillasse dans le TP de dilution");
  return etape;
}
const reglages = (graine: number) => paillasse(graine).paillasse.reglages as ReglagesSolutions;
const RIEN: PosesSolutions = { flacon: false, pissette: false };

interface Suivi { etat: EtatSolutions; gestes: GesteBrut[]; cles: string[]; fini: boolean }
interface Eleve {
  /** les morceaux versés en trop avant qu'il relâche un poussoir */
  retardAppui?: number;
  /** des gestes faits avant d'écouter le guide, et ce que la vue retient après eux */
  avant?: GesteBrut[];
  vue?: Partial<PosesSolutions>;
}

/** Ce que verse un morceau d'appui sur un poussoir : gros tant que le débit est fort, petit près du but. */
function morceau(poussoir: string, etat: EtatSolutions, r: ReglagesSolutions): GesteBrut {
  const outil = verrerie(r, etat.outil), recipient = verrerie(r, etat.recipient);
  switch (poussoir) {
    case "verser": return { g: "verser", v: 0.5 };
    case "aspirer": return { g: "aspirer", v: outil && debitAspire(outil, etat.dansOutil) > 1 ? 0.2 : 0.05 };
    case "redescendre": return { g: "vider", v: 0.05 };
    case "vider": return { g: "vider", v: 0.5 };
    case "jet": return { g: "eau", v: recipient && debitJet(recipient, total(etat)) > 2 ? 0.5 : 0.1, jet: true };
    case "goutte": return { g: "eau", v: 0.05 };
    case "agiter": return { g: "agiter" };
    default: return { g: "retourner" };
  }
}

/** L'élève de test : il fait ce que le guide dit, jusqu'à « J'ai fini ». */
function suis(r: ReglagesSolutions, eleve: Eleve = {}): Suivi {
  let etat = rejoue(regles, r, eleve.avant ?? []);
  const gestes: GesteBrut[] = [...(eleve.avant ?? [])];
  let vue: PosesSolutions = { ...RIEN, ...eleve.vue };
  const cles: string[] = [];
  const agit = (g: GesteBrut) => { const suite = regles.geste(r, etat, g); if (suite !== etat) { etat = suite; gestes.push(g); } };
  let dernier: PasDuGuide | null = null;
  for (let tour = 0; tour < 5000; tour++) {
    const p = prochain(r, etat, vue);
    if (p.cle !== dernier?.cle) {
      cles.push(p.cle);
      // une nouvelle consigne : l'élève met un peu de temps à lâcher le poussoir qu'il tenait
      if (dernier?.geste === "maintenir") for (let i = 0; i < (eleve.retardAppui ?? 0); i++) agit(morceau(dernier.poussoir, etat, r));
      dernier = p;
      if (prochain(r, etat, vue).cle !== p.cle) continue;
    }
    switch (p.geste) {
      case "glisser": { const suite = pose(r, etat, vue, p.objet, p.cible === "etagere" ? `etagere-${p.objet}` : p.cible); suite.gestes.forEach(agit); vue = suite.poses; break; }
      case "maintenir": case "toucher": agit(morceau(p.poussoir, etat, r)); break;
      case "bouton":
        if (p.bouton === "fini") return { etat, gestes, cles, fini: true };
        agit({ g: "recommencer" });
        vue = { ...vue, pissette: false };
        break;
    }
  }
  return { etat, gestes, cles, fini: false };
}

const fautes = (r: ReglagesSolutions, etat: EtatSolutions) => regles.bilan(r, etat).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);

describe("l'élève qui suit le guide de la dilution", () => {
  it("la solution est sans faute, pour chaque graine", () => {
    for (const graine of GRAINES) {
      const r = reglages(graine);
      const s = suis(r);
      expect(s.fini, `graine ${graine} : le guide s'arrête sur ${s.cles.slice(-3).join(", ")}`).toBe(true);
      expect(fautes(r, s.etat), `graine ${graine}`).toEqual([]);
      const b = regles.bilan(r, s.etat);
      expect(b.score).toBe(1);
      // les volumes sont ceux d'une préparation soignée
      expect(Math.abs(b.mesures.Vm - priseVoulue(r, r.fiole))).toBeLessThanOrEqual(0.06);
      expect(Math.abs(b.mesures.Vf - r.fiole)).toBeLessThanOrEqual(0.15);
      // rejouée par le serveur, la liste des gestes redonne le même état
      expect(rejoue(regles, r, s.gestes)).toEqual(s.etat);
    }
  });
  it("un élève qui lâche les poussoirs avec un peu de retard reste sans faute", () => {
    for (const graine of GRAINES.slice(0, 4)) {
      const r = reglages(graine);
      const s = suis(r, { retardAppui: 3 });
      expect(s.fini, `graine ${graine} : ${s.cles.slice(-3).join(", ")}`).toBe(true);
      expect(fautes(r, s.etat), `graine ${graine}`).toEqual([]);
    }
  });
  it("le guide suit l'ordre du protocole, et montre chaque étape", () => {
    const r = reglages(4);
    expect(suis(r).cles).toEqual(["fiole-poser", "mere-flacon", "mere-verser", "mere-ranger", "prise-plonger", "prise-aspirer", "prise-porter", "prise-vider", "prise-ranger",
      "eau-poser", "eau-tiers", "agiter", "eau-col", "eau-goutte", "eau-ranger", "boucher", "retourner", "fini"]);
    // en retard, l'élève dépasse le trait de la pipette, comme tout le monde : le guide le fait redescendre
    expect(suis(r, { retardAppui: 3 }).cles.slice(5, 10)).toEqual(["prise-aspirer", "prise-porter", "prise-ajuster", "prise-porter", "prise-vider"]);
    // le rang de l'étape du protocole reste dans le protocole, et va jusqu'à la dernière
    const protocole = paillasse(4).protocole;
    let etat = regles.depart(r);
    let rang = 0;
    for (const g of suis(r).gestes) {
      etat = regles.geste(r, etat, g);
      const e = prochain(r, etat, RIEN).etape;
      expect(e).toBeLessThan(protocole.length);
      rang = Math.max(rang, e);
    }
    expect(rang).toBe(protocole.length - 1);
  });
  it("il fait prendre la fiole de la commande et la pipette qui donne le bon volume", () => {
    for (const graine of GRAINES) {
      const r = reglages(graine);
      expect(prochain(r, regles.depart(r), RIEN)).toMatchObject({ cle: "fiole-poser", objet: `f${r.fiole}`, cible: "plan" });
      expect(pipetteDuGuide(r)).toBe(priseVoulue(r, r.fiole));
      expect(paillasse(graine).protocole.join(" ")).toContain(`pipette jaugée de ${pipetteDuGuide(r)} mL`);
    }
    // sans la pipette du bon volume sur l'étagère : deux prélèvements à la pipette de 10 mL
    const sans: ReglagesSolutions = { ...reglages(4), etagere: { ...reglages(4).etagere, pipettes: [10, 25] } };
    expect(pipetteDuGuide(sans)).toBe(10);
    const s = suis(sans);
    expect([s.fini, fautes(sans, s.etat), s.etat.apports]).toEqual([true, [], 2]);
    expect(Math.abs(s.etat.prise - 20)).toBeLessThanOrEqual(0.12);
    expect(s.cles.filter((c) => c === "prise-vider")).toHaveLength(2);
  });
  it("les poussoirs ralentissent près du but", () => {
    const pipette = { genre: "pipette", capacite: 20 } as const, fiole = { genre: "fiole", capacite: 100 } as const;
    expect(debitAspire(pipette, 5)).toBeGreaterThan(debitAspire(pipette, 19));
    expect(debitAspire({ genre: "eprouvette", capacite: 25 }, 24)).toBe(3);
    expect([debitJet(fiole, 50), debitJet(fiole, 95), debitJet(fiole, 99.2)]).toEqual([9, 1, 0.5]);
    expect(debitJet({ genre: "becher", capacite: 100 }, 99)).toBe(9);
  });
});

describe("le guide rattrape une préparation mal partie", () => {
  const r = reglages(4);
  const prelever = (pipette: string, V: number): GesteBrut[] => [{ g: "verser", v: V + 10 }, { g: "outil", quoi: pipette, ou: "becher" }, { g: "aspirer", v: V }, { g: "outil", quoi: pipette, ou: "recipient" }, { g: "vider", v: V }];
  it("un bécher gradué à la place de la fiole : il fait poser la bonne fiole, et la solution finit sans faute", () => {
    const s = suis(r, { avant: [{ g: "recipient", quoi: "b100" }, ...prelever("p20", 20)] });
    expect(s.cles[0]).toBe("fiole-changer");
    expect([s.fini, s.etat.recipient, s.etat.essais, fautes(r, s.etat)]).toEqual([true, "f100", 1, []]);
  });
  it("le trait dépassé, trop de solution mère, une éprouvette, l'eau avant le prélèvement : il fait recommencer la solution", () => {
    const cas: GesteBrut[][] = [
      [{ g: "recipient", quoi: "f100" }, ...prelever("p20", 20), { g: "eau", v: 47, jet: true }, { g: "agiter" }, { g: "eau", v: 34 }],
      [{ g: "recipient", quoi: "f100" }, ...prelever("p25", 25)],
      [{ g: "recipient", quoi: "f100" }, ...prelever("e25", 19.4)],
      [{ g: "recipient", quoi: "f100" }, { g: "eau", v: 30 }],
      [{ g: "recipient", quoi: "f100" }, ...prelever("p20", 20), { g: "eau", v: 79.8, jet: true }],
      [{ g: "recipient", quoi: "f100" }, ...prelever("p20", 20), { g: "eau", v: 75 }],
      [{ g: "recipient", quoi: "f100" }, { g: "verser", v: 40 }, { g: "outil", quoi: "p20", ou: "becher" }, { g: "aspirer", v: 30 }],
    ];
    for (const avant of cas) {
      const depart = rejoue(regles, r, avant);
      expect(prochain(r, depart, RIEN), JSON.stringify(avant.slice(-1))).toMatchObject({ cle: "refaire", geste: "bouton", bouton: "recommencer" });
      const s = suis(r, { avant });
      expect([s.fini, s.etat.essais, fautes(r, s.etat)], JSON.stringify(avant.slice(-1))).toEqual([true, 1, []]);
    }
  });
  it("une pipette mal ajustée portée au-dessus de la fiole : il la fait replonger, puis ajuster", () => {
    const etat = rejoue(regles, r, [{ g: "recipient", quoi: "f100" }, { g: "verser", v: 40 }, { g: "outil", quoi: "p20", ou: "becher" }, { g: "aspirer", v: 20.6 }, { g: "outil", quoi: "p20", ou: "recipient" }]);
    expect(prochain(r, etat, RIEN)).toMatchObject({ cle: "prise-replonger", objet: "p20", cible: "becher" });
    expect(prochain(r, { ...etat, ou: "becher" }, RIEN)).toMatchObject({ cle: "prise-ajuster", geste: "toucher", poussoir: "redescendre" });
    // une fois qu'elle a commencé à couler dans la fiole, il la fait vider jusqu'au bout ; puis il fait recommencer
    expect(prochain(r, regles.geste(r, etat, { g: "vider", v: 3 }), RIEN).cle).toBe("prise-vider");
    expect(prochain(r, regles.geste(r, etat, { g: "vider", v: 30 }), RIEN).cle).toBe("refaire");  });
  it("une pipette ajustée se vide jusqu'au bout : le guide ne la fait pas ranger avec un reste, et la limite du trait n'est pas une faute", () => {
    const porte = (V: number): GesteBrut[] => [{ g: "recipient", quoi: "f100" }, { g: "verser", v: 40 }, { g: "outil", quoi: "p20", ou: "becher" }, { g: "aspirer", v: V }, { g: "outil", quoi: "p20", ou: "recipient" }];
    // presque tout a coulé, la fiole a déjà son volume à la tolérance près : il reste à vider
    expect(prochain(r, rejoue(regles, r, [...porte(20.05), { g: "vider", v: 19.95 }]), RIEN)).toMatchObject({ cle: "prise-vider", geste: "maintenir" });
    expect(prochain(r, rejoue(regles, r, [...porte(20.05), { g: "vider", v: 20.05 }]), RIEN).cle).toBe("prise-ranger");
    // un prélèvement juste à la limite de la tolérance est accepté, comme le professeur l'accepte
    for (const V of [19.94, 20.06]) {
      const etat = rejoue(regles, r, [...porte(V), { g: "vider", v: V }, { g: "outil", quoi: "p20", ou: "etagere" }]);
      expect(prochain(r, etat, RIEN).cle, String(V)).toBe("eau-poser");
      expect(prochain(r, rejoue(regles, r, porte(V)), RIEN).cle, String(V)).toBe("prise-vider");
    }
    expect(prochain(r, rejoue(regles, r, [...porte(19.93), { g: "vider", v: 19.93 }, { g: "outil", quoi: "p20", ou: "etagere" }]), RIEN).cle).toBe("refaire");
  });
  it("un bouchon posé trop tôt : il le fait retirer ; un flacon ou une pissette oubliés : il les fait reposer", () => {
    const bouchee = rejoue(regles, r, [{ g: "recipient", quoi: "f100" }, ...prelever("p20", 20), { g: "outil", quoi: "p20", ou: "etagere" }, { g: "boucher", mis: true }]);
    expect(prochain(r, bouchee, RIEN)).toMatchObject({ cle: "deboucher", objet: "bouchon", cible: "rangement-bouchon" });
    const prete = rejoue(regles, r, [{ g: "recipient", quoi: "f100" }, ...prelever("p20", 20), { g: "outil", quoi: "p20", ou: "etagere" }]);
    expect(prochain(r, prete, { flacon: true, pissette: false }).cle).toBe("mere-ranger");
    expect(prochain(r, prete, RIEN).cle).toBe("eau-poser");
  });
  it("une fiole retournée sans bouchon : il fait tout refaire, mais ce qui est renversé reste renversé", () => {
    const s = suis(r, { avant: [{ g: "recipient", quoi: "f100" }, ...prelever("p20", 20), { g: "eau", v: 70 }, { g: "retourner" }] });
    expect([s.fini, fautes(r, s.etat)]).toEqual([true, ["renverse"]]);
  });
});

describe("poser un objet", () => {
  const r = reglages(4);
  const depart = regles.depart(r);
  it("donne aux règles le geste qui convient, et retient ce qui est tenu au-dessus d'un récipient", () => {
    expect(pose(r, depart, RIEN, "f100", "plan")).toMatchObject({ gestes: [{ g: "recipient", quoi: "f100" }], poses: RIEN });
    expect(pose(r, depart, RIEN, "p20", "becher").gestes).toEqual([{ g: "outil", quoi: "p20", ou: "becher" }]);
    expect(pose(r, depart, RIEN, "p20", "flacon").gestes).toEqual([{ g: "outil", quoi: "p20", ou: "flacon" }]);
    expect(pose(r, depart, RIEN, "p20", "etagere-p20").gestes).toEqual([{ g: "outil", quoi: "p20", ou: "etagere" }]);
    expect(pose(r, depart, RIEN, "flacon", "becher")).toMatchObject({ gestes: [], poses: { flacon: true, pissette: false } });
    expect(pose(r, depart, { flacon: true, pissette: false }, "flacon", "rangement-flacon").poses.flacon).toBe(false);
    expect(pose(r, depart, RIEN, "pissette", "recipient").poses.pissette).toBe(true);
    expect(pose(r, depart, RIEN, "bouchon", "recipient").gestes).toEqual([{ g: "boucher", mis: true }]);
    expect(pose(r, depart, RIEN, "bouchon", "rangement-bouchon").gestes).toEqual([{ g: "boucher", mis: false }]);
  });
  it("l'outil de prélèvement laisse la place au-dessus de la fiole : plein, il retourne dans le bécher ; vide, sur l'étagère", () => {
    const vide = rejoue(regles, r, [{ g: "recipient", quoi: "f100" }, { g: "outil", quoi: "p20", ou: "recipient" }]);
    expect(pose(r, vide, RIEN, "pissette", "recipient").gestes).toEqual([{ g: "outil", quoi: "p20", ou: "etagere" }]);
    const pleine = rejoue(regles, r, [{ g: "recipient", quoi: "f100" }, { g: "verser", v: 30 }, { g: "outil", quoi: "p20", ou: "becher" }, { g: "aspirer", v: 20 }, { g: "outil", quoi: "p20", ou: "recipient" }]);
    expect(pose(r, pleine, RIEN, "bouchon", "recipient").gestes).toEqual([{ g: "boucher", mis: true }, { g: "outil", quoi: "p20", ou: "becher" }]);
    // la pipette qui arrive au-dessus de la fiole renvoie la pissette, et une nouvelle fiole aussi
    expect(pose(r, vide, { flacon: false, pissette: true }, "p10", "recipient").poses.pissette).toBe(false);
    expect(pose(r, vide, { flacon: false, pissette: true }, "f50", "plan").poses.pissette).toBe(false);
  });
  it("un objet inconnu ne change rien, et chaque geste a sa phrase", () => {
    expect(pose(r, depart, RIEN, "licorne", "plan")).toEqual({ gestes: [], poses: RIEN, message: "" });
    for (const [objet, cible] of [["f100", "plan"], ["b100", "plan"], ["p20", "becher"], ["e25", "becher"], ["p20", "flacon"], ["p20", "recipient"], ["p20", "etagere-p20"], ["flacon", "becher"], ["pissette", "recipient"], ["pissette", "rangement-pissette"], ["bouchon", "recipient"]]) {
      expect(pose(r, depart, RIEN, objet, cible).message.length, `${objet} sur ${cible}`).toBeGreaterThan(10);
    }
    const pleine = rejoue(regles, r, [{ g: "verser", v: 30 }]);
    // le geste qui suit est un conseil, à part : la vue ne le montre que guide coupé
    expect(pose(r, pleine, RIEN, "p20", "becher")).toMatchObject({ message: "La pipette trempe dans le bécher.", conseil: expect.stringContaining("Aspirer") });
    expect(pose(r, depart, RIEN, "p20", "etagere-p20").conseil).toBeUndefined();
    expect(pose(r, rejoue(regles, r, [{ g: "recipient", quoi: "f100" }, { g: "boucher", mis: true }]), RIEN, "pissette", "recipient").message).toContain("bouchée");
  });
});

describe("la marque du guide", () => {
  it("le professeur plafonne une préparation faite avec le guide, et le dit", async () => {
    const etape = paillasse(1);
    const trouve = async () => regles as Parameters<typeof verifie>[4] extends ((genre: string) => Promise<infer R>) | undefined ? R : never;
    const { gestes } = suis(etape.paillasse.reglages as ReglagesSolutions);
    const seul = await verifie(etape, { g: "paillasse", gestes }, {}, 1, trouve);
    const aide = await verifie(etape, { g: "paillasse", gestes: avecMarqueDuGuide(gestes) }, {}, 1, trouve);
    expect(seul?.retour).toMatchObject({ score: 1, correction: { genre: "paillasse", fautes: [] } });
    expect(aide?.retour).toMatchObject({ score: PLAFOND_AVEC_GUIDE, correction: { genre: "paillasse", fautes: [], guide: true } });
    expect(aide?.mesures).toEqual(seul?.mesures);
  });
});
