// Le guide de la paillasse du microcontrôleur (lib/commun/tp/paillasses/microcontroleur-guide.ts). Un élève de test fait,
// sans réfléchir, exactement ce que le guide lui dit : la manipulation qu'il obtient doit être sans faute, pour chaque
// graine. Le guide est donc complet, dans le bon ordre, et il ne tourne jamais en rond.
import { describe, expect, it } from "vitest";
import { HAUTEUR, dureeAttendue, regles, type EtatMicrocontroleur, type ReglagesMicrocontroleur } from "@/lib/commun/tp/paillasses/microcontroleur";
import { NOMS, niveauxReleves, pose, prochain, prochainNiveau, type PasDuGuide, type VueMicrocontroleur } from "@/lib/commun/tp/paillasses/microcontroleur-guide";
import { rejoue, type GesteBrut } from "@/lib/commun/tp/types";
import jauge from "@/lib/serveur/contenu/tp/jauge";
import { GRAINES, type EtapeDePaillasse } from "../../outils/tp";

/** L'étape de paillasse du TP, pour une graine. */
function paillasse(graine: number): EtapeDePaillasse {
  const etape = jauge.etapes(graine).find((e) => e.genre === "paillasse");
  if (!etape || etape.genre !== "paillasse") throw new Error("pas de paillasse dans le TP");
  return etape;
}
const reglages = (graine: number) => paillasse(graine).paillasse.reglages as ReglagesMicrocontroleur;
const VUE: VueMicrocontroleur = { saisie: null, filChoisi: null };

interface Suivi { etat: EtatMicrocontroleur; gestes: GesteBrut[]; cles: string[]; fini: boolean }
interface Eleve {
  /** des gestes faits avant d'écouter le guide */
  avant?: GesteBrut[];
  /** les morceaux d'eau qui coulent encore avant qu'il lâche un poussoir, quand la consigne change */
  retardAppui?: number;
}

/** L'élève de test : il fait ce que le guide dit, jusqu'à « J'ai fini ». Un appui maintenu verse un demi-millimètre par tour. */
function suis(r: ReglagesMicrocontroleur, eleve: Eleve = {}): Suivi {
  let etat = rejoue(regles, r, eleve.avant ?? []);
  const gestes: GesteBrut[] = [...(eleve.avant ?? [])];
  let vue: VueMicrocontroleur = { ...VUE };
  /** le niveau qu'il vient de lire dans la loupe, au millimètre */
  let lu = 0;
  const cles: string[] = [];
  const agit = (g: GesteBrut) => { const suite = regles.geste(r, etat, g); if (suite !== etat) { etat = suite; gestes.push(g); } };
  let dernier: PasDuGuide | null = null;
  for (let tour = 0; tour < 4000; tour++) {
    const p = prochain(r, etat, vue);
    if (p.cle !== dernier?.cle) {
      cles.push(p.cle);
      // une nouvelle consigne : il met un peu de temps à lâcher le poussoir
      if (dernier?.geste === "maintenir") for (let i = 0; i < (eleve.retardAppui ?? 0); i++) agit({ g: dernier.poussoir, v: 0.05 });
      dernier = p;
      if (prochain(r, etat, vue).cle !== p.cle) continue;
    }
    switch (p.geste) {
      case "glisser": agit(pose(p.objet, p.cible)); break;
      case "relier": agit({ g: "relier", a: p.de, b: p.vers }); break;
      case "toucher":
        if (p.quoi === "fil") vue = { ...vue, filChoisi: `${p.a}:${p.b}` };
        else if (p.quoi === "croix") { agit({ g: "retirer", a: p.a, b: p.b }); vue = { ...vue, filChoisi: null }; }
        else agit({ g: "mesurer" });
        break;
      case "maintenir": agit({ g: p.poussoir, v: 0.05 }); break;
      case "montrer":
        if (p.quoi === "loupe") { lu = Math.round(etat.niveau * 10) / 10; vue = { ...vue, saisie: "duree" }; }
        else { agit({ g: "noter", h: lu, t: etat.lignes[etat.lignes.length - 1]?.duree ?? 0 }); vue = { ...vue, saisie: null }; }
        break;
      case "bouton":
        if (p.bouton === "fini") return { etat, gestes, cles, fini: true };
        if (p.bouton === "noter") vue = { ...vue, saisie: "niveau" };
        if (p.bouton === "effacer") agit({ g: "effacer" });
        break;
    }
  }
  return { etat, gestes, cles, fini: false };
}

const fautes = (r: ReglagesMicrocontroleur, etat: EtatMicrocontroleur) => regles.bilan(r, etat).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);
const relier = (fils: [string, string][]): GesteBrut[] => fils.map(([a, b]) => ({ g: "relier", a, b }));
const nom = (r: ReglagesMicrocontroleur, valeur: number) => r.boite.find((c) => c.valeur === valeur)!.id;
const MONTAGE: [string, string][] = [["d2", "l1"], ["a0", "l2"], ["p1", "l2"], ["p2", "gnd"]];

describe("l'élève qui suit le guide de la paillasse du microcontrôleur", () => {
  it("la manipulation est sans faute, pour chaque graine", () => {
    for (const graine of GRAINES) {
      const r = reglages(graine);
      const s = suis(r);
      expect(s.fini, `graine ${graine} : le guide s'arrête sur ${s.cles.slice(-3).join(", ")}`).toBe(true);
      expect(fautes(r, s.etat), `graine ${graine}`).toEqual([]);
      const b = regles.bilan(r, s.etat);
      expect(b.score).toBe(1);
      // le carnet : la cuve vide, puis trois niveaux de plus en plus hauts, jusqu'au-dessus de 8 cm
      expect(niveauxReleves(r, s.etat)).toEqual([0, 2.8, 5.6, 8.4]);
      expect(b.mesures).toMatchObject({ h: 8.4, R: r.demande.R });
      expect(Math.abs(b.mesures.tau0 - dureeAttendue(r, 0))).toBeLessThanOrEqual(1);
      // rejouée par le serveur, la liste des gestes redonne le même état
      expect(rejoue(regles, r, s.gestes)).toEqual(s.etat);
    }
  });
  it("un élève qui lâche les poussoirs avec un peu de retard reste sans faute, et la cuve ne déborde pas", () => {
    for (const graine of GRAINES.slice(0, 4)) {
      const r = reglages(graine);
      const s = suis(r, { retardAppui: 12 });
      expect(s.fini, `graine ${graine} : ${s.cles.slice(-3).join(", ")}`).toBe(true);
      expect(fautes(r, s.etat), `graine ${graine}`).toEqual([]);
      expect(s.etat.deborde).toBe(0);
      expect(s.etat.niveau).toBeLessThan(HAUTEUR);
      // aucune consigne ne revient : un niveau dépassé reste bon
      expect(new Set(s.cles).size).toBe(s.cles.length - 6);
    }
  });
  it("le guide suit l'ordre du protocole, et montre chaque étape", () => {
    const r = reglages(1);
    const { cles, gestes } = suis(r);
    expect(cles).toEqual(["piquer", "relier-d2-l1", "relier-a0-l2", "relier-p1-l2", "relier-p2-gnd",
      "vider-1", "mesurer-1", "noter-1", "lire-niveau", "lire-duree", "verser-2", "mesurer-2", "noter-2", "lire-niveau", "lire-duree",
      "verser-3", "mesurer-3", "noter-3", "lire-niveau", "lire-duree", "verser-4", "mesurer-4", "noter-4", "lire-niveau", "lire-duree", "fini"]);
    // le rang de l'étape du protocole reste dans le protocole, ne recule pas, et va jusqu'à la dernière
    const protocole = paillasse(1).protocole;
    let etat = regles.depart(r);
    let rang = 0;
    for (const g of gestes) {
      etat = regles.geste(r, etat, g);
      const e = prochain(r, etat, VUE).etape;
      expect(e).toBeLessThan(protocole.length);
      expect(e).toBeGreaterThanOrEqual(rang);
      rang = e;
    }
    expect(rang).toBe(protocole.length - 1);
  });
  it("chaque consigne tutoie l'élève, sans tiret long, et ne donne jamais le niveau ni la durée à lire", () => {
    const r = reglages(2);
    const vues = new Map<string, string>();
    let etat = regles.depart(r);
    for (const g of suis(r).gestes) { etat = regles.geste(r, etat, g); const p = prochain(r, etat, VUE); vues.set(p.cle, p.texte); }
    for (const saisie of ["niveau", "duree"] as const) { const p = prochain(r, etat, { ...VUE, saisie }); vues.set(p.cle, p.texte); }
    expect(vues.size).toBeGreaterThan(12);
    for (const [cle, texte] of vues) {
      expect(texte, cle).not.toMatch(/[—–]/);
      expect(texte, cle).not.toMatch(/\d+ (µs|cm)/);
      expect(texte, cle).toMatch(/^(Prends|Tire|Garde|Touche|Lis|Lâche|La |Ton |Une |Le )/);
    }
    expect(Object.keys(NOMS)).toHaveLength(10);
    // la cuve vide : le niveau est celui que le protocole donne, la loupe n'a rien à faire lire
    const vide = regles.geste(r, regles.depart(r), { g: "vider", v: 12 });
    expect(prochain(r, vide, { ...VUE, saisie: "niveau" })).toMatchObject({ cle: "lire-niveau", texte: "La cuve est vide : écris 0 avec les chiffres, puis touche « Noter »." });
    expect(prochain(r, regles.depart(r), { ...VUE, saisie: "niveau" }).texte).toMatch(/^Lis dans la loupe/);
  });
});

describe("le guide rattrape une manipulation mal partie", () => {
  const r = reglages(3);
  const bonne = nom(r, r.demande.R), petite = nom(r, r.demande.R / 10);
  it("le mauvais conducteur ohmique, et des mesures notées avec lui : il le fait changer, effacer, et tout reprendre", () => {
    const avant: GesteBrut[] = [{ g: "poser", quoi: petite, ou: 0 }, ...relier(MONTAGE), { g: "mesurer" }, { g: "noter", h: r.niveau, t: dureeAttendue(r, r.niveau, r.demande.R / 10) }];
    expect(fautes(r, rejoue(regles, r, avant))).toContain("resistance");
    const s = suis(r, { avant });
    expect(s.cles.slice(0, 3)).toEqual([`ranger-${petite}`, "piquer", "effacer-1"]);
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("A0 du mauvais côté, la broche 5 V à la place de D2 : il fait retirer les fils qui ne sont pas à leur place", () => {
    const s = suis(r, { avant: [{ g: "poser", quoi: bonne, ou: 0 }, ...relier([["v5", "l1"], ["a0", "l1"], ["p1", "l2"], ["p2", "gnd"]])] });
    expect(s.cles).toEqual(expect.arrayContaining(["retirer-v5-l1", "croix-v5-l1", "retirer-a0-l1", "croix-a0-l1", "relier-d2-l1", "relier-a0-l2"]));
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("le conducteur ohmique sur l'autre emplacement, D2 de l'autre côté, les lames échangées : le montage est bon, le guide le garde", () => {
    const s = suis(r, { avant: [{ g: "poser", quoi: bonne, ou: 1 }, ...relier([["d2", "l3"], ["a0", "l2"], ["p2", "l2"], ["p1", "gnd"]])] });
    expect(s.cles[0]).toBe("vider-1");
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
    // à moitié câblé dans ce sens, il continue dans ce sens
    const moitie = rejoue(regles, r, [{ g: "poser", quoi: bonne, ou: 1 }, ...relier([["d2", "l3"], ["p2", "l2"]])]);
    expect(prochain(r, moitie, VUE)).toMatchObject({ cle: "relier-a0-l2", geste: "relier" });
  });
  it("une carte coupée par un court-circuit : il fait retirer le fil ; la coupure, elle, ne s'efface pas", () => {
    const avant: GesteBrut[] = [{ g: "poser", quoi: bonne, ou: 0 }, { g: "relier", a: "v5", b: "gnd" }];
    const p = prochain(r, rejoue(regles, r, avant), VUE);
    expect(p).toMatchObject({ cle: "retirer-v5-gnd", geste: "toucher", quoi: "fil" });
    expect(p.texte).toMatch(/^La carte s'est coupée/);
    const s = suis(r, { avant });
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual(["court"]);
  });
  it("une ligne mal lue ou notée devant un moniteur vide : il la fait effacer et noter de nouveau", () => {
    const debut: GesteBrut[] = [{ g: "poser", quoi: bonne, ou: 0 }, ...relier(MONTAGE), { g: "noter", h: 1, t: 1 }, { g: "vider", v: 12 }, { g: "mesurer" }, { g: "noter", h: 0.6, t: dureeAttendue(r, 0) }];
    const s = suis(r, { avant: debut });
    expect(s.cles.slice(0, 4)).toEqual(["effacer-2", "effacer-1", "noter-1", "lire-niveau"]);
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("il ne fait effacer une ligne que si le professeur y verrait une faute : deux graduations de côté restent une lecture juste", () => {
    const debut: GesteBrut[] = [{ g: "poser", quoi: bonne, ou: 0 }, ...relier(MONTAGE), { g: "mesurer" }];
    const niveau = rejoue(regles, r, debut).niveau;
    for (const ecart of [-0.6, -0.3, -0.25, -0.2, -0.1, -0.05, 0, 0.05, 0.1, 0.2, 0.25, 0.3, 0.6]) {
      const etat = rejoue(regles, r, [...debut, { g: "noter", h: Math.round((niveau + ecart) * 100) / 100, t: dureeAttendue(r, niveau) }]);
      const faute = fautes(r, etat).some((f) => f.startsWith("niveau"));
      expect(faute, `à ${ecart} cm`).toBe(Math.abs(ecart) > 0.2);
      expect(prochain(r, etat, VUE).cle === "effacer-1", `à ${ecart} cm`).toBe(faute);
    }
    expect(fautes(r, rejoue(regles, r, [...debut, { g: "noter", h: niveau + 0.6, t: dureeAttendue(r, niveau) }]))).toContain("niveau!");
    expect(fautes(r, rejoue(regles, r, [...debut, { g: "noter", h: niveau + 0.3, t: dureeAttendue(r, niveau) }]))).toContain("niveau");
  });
  it("des niveaux trop proches, ou relevés sans la cuve vide : il fait compléter le carnet", () => {
    const serres = [{ g: "poser", quoi: bonne, ou: 0 }, ...relier(MONTAGE), { g: "vider", v: 12 },
      ...[0, 1, 2, 3].flatMap((h): GesteBrut[] => [...(h ? [{ g: "verser", v: 1 }] : []), { g: "mesurer" }, { g: "noter", h, t: dureeAttendue(r, h) }])];
    expect(fautes(r, rejoue(regles, r, serres))).toEqual(["etendue"]);
    const s = suis(r, { avant: serres });
    expect(niveauxReleves(r, s.etat)).toEqual([0, 1, 2, 3, 5.8, 8.6]);
    expect(fautes(r, s.etat)).toEqual([]);
    // la cuve presque pleine d'abord : il fait vider pour la mesure à vide, puis viser le milieu de ce qui reste
    const plein = Math.round((11 - r.niveau) * 100) / 100;
    const haut = suis(r, { avant: [{ g: "poser", quoi: bonne, ou: 0 }, ...relier(MONTAGE), { g: "verser", v: plein }, { g: "mesurer" }, { g: "noter", h: 11, t: dureeAttendue(r, 11) }] });
    expect(haut.cles.slice(0, 2)).toEqual(["vider-2", "mesurer-2"]);
    expect(haut.fini).toBe(true);
    expect(fautes(r, haut.etat)).toEqual([]);
    expect(niveauxReleves(r, haut.etat)).toEqual([0, 3.7, 6.15, 11]);
    expect(prochainNiveau(r, haut.etat)).toBeNull();
  });
  it("sans le bon conducteur ohmique dans la boîte, le guide ne demande rien d'impossible", () => {
    expect(prochain({ ...r, boite: r.boite.filter((c) => c.valeur !== r.demande.R) }, regles.depart(r), VUE).cle).toBe("fini");
  });
});
