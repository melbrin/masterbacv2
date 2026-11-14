// Le guide de la paillasse Calorimètre (lib/commun/tp/paillasses/calorimetre-guide.ts). Un élève de test fait, sans
// réfléchir, exactement ce que le guide lui dit, pendant que le temps du laboratoire passe comme dans la vue : la
// manipulation qu'il obtient doit être sans faute, pour chaque graine, même s'il est lent. Le guide est donc complet,
// dans le bon ordre, et il ne tourne jamais en rond.
import { describe, expect, it } from "vitest";
import { T_BAIN, affichage, equilibreIdeal, maintenant, regles, type EtatCalorimetre, type ReglagesCalorimetre } from "@/lib/commun/tp/paillasses/calorimetre";
import { ajoute, debitEau, pose, prochain, vitesse, type PasDuGuide, type PoussoirCalorimetre, type VueCalorimetre } from "@/lib/commun/tp/paillasses/calorimetre-guide";
import { PLAFOND_AVEC_GUIDE, avecMarqueDuGuide, rejoue, type GesteBrut, type ReglesPaillasse } from "@/lib/commun/tp/types";
import calorimetrie from "@/lib/serveur/contenu/tp/calorimetrie";
import { verifie } from "@/lib/serveur/tp";
import { GRAINES, type EtapeDePaillasse } from "../../outils/tp";

/** L'étape de paillasse du TP, pour une graine. Le TP est en construction : le test donne ses règles au serveur. */
function paillasse(graine: number): EtapeDePaillasse {
  const etape = calorimetrie.etapes(graine).find((e) => e.genre === "paillasse");
  if (!etape || etape.genre !== "paillasse") throw new Error("pas de paillasse dans le TP");
  return etape;
}
const reglages = (graine: number) => paillasse(graine).paillasse.reglages as ReglagesCalorimetre;
const sesRegles = async () => regles as unknown as ReglesPaillasse<unknown, unknown>;
const r2 = (x: number) => Math.round(x * 100) / 100;

interface Suivi { etat: EtatCalorimetre; gestes: GesteBrut[]; cles: string[]; etapes: number[]; fini: boolean; recommences: number }
/** Un élève : ses temps sont en dixièmes de seconde, du vrai temps. */
interface Eleve {
  /** le temps qu'il met à lire une nouvelle consigne avant d'agir */
  retard?: number;
  /** le temps pendant lequel il garde encore le doigt sur un poussoir */
  retardAppui?: number;
  /** la durée d'un geste : glisser un objet, toucher une touche */
  lenteur?: number;
  /** des gestes faits avant d'écouter le guide */
  avant?: GesteBrut[];
  /** ce que la vue retient après ces gestes */
  vue?: Partial<VueCalorimetre>;
}

/**
 * L'élève de test : il fait ce que le guide dit, jusqu'à « J'ai fini ». Le temps du laboratoire passe comme dans la vue :
 * il s'accumule, et s'inscrit avant chaque geste ; il s'arrête pendant qu'on verse et pendant qu'on écrit une lecture.
 */
function suis(r: ReglagesCalorimetre, eleve: Eleve = {}): Suivi {
  let partie = { etat: rejoue(regles, r, eleve.avant ?? []), gestes: [...(eleve.avant ?? [])], attente: 0 };
  let vue: VueCalorimetre = { verse: false, saisie: null, ...eleve.vue };
  const cles: string[] = [], etapes: number[] = [];
  let recommences = 0;
  const vu = () => (partie.attente > 0 ? regles.geste(r, partie.etat, { g: "attendre", v: partie.attente }) : partie.etat);
  const applique = (g: GesteBrut) => { const suite = regles.geste(r, partie.etat, g); if (suite !== partie.etat) partie = { ...partie, etat: suite, gestes: ajoute(partie.gestes, g) }; };
  const inscrit = () => { if (partie.attente > 0) { applique({ g: "attendre", v: partie.attente }); partie = { ...partie, attente: 0 }; } };
  const agit = (g: GesteBrut) => { inscrit(); applique(g); };
  /** le temps passe : chaque dixième de seconde vaut un dixième de seconde du laboratoire, ou une seconde, selon l'allure */
  const passe = (dixiemes: number) => {
    for (let i = 0; i < dixiemes; i++) {
      partie = { ...partie, attente: r2(partie.attente + 0.1 * vitesse(vu())) };
      if (partie.attente >= 300) inscrit();
    }
  };
  /** un dixième de seconde le doigt sur un poussoir */
  const appuie = (poussoir: PoussoirCalorimetre) => {
    if (poussoir === "verser") agit({ g: "verser", v: r2(debitEau(r, vu()) * 0.1) });
    else if (poussoir === "agiter") { if (!vu().agite) agit({ g: "agiter", on: true }); passe(1); }
  };
  const lache = (poussoir: PoussoirCalorimetre) => { if (poussoir === "agiter" && vu().agite) agit({ g: "agiter", on: false }); };
  const lenteur = eleve.lenteur ?? 8;
  let dernier: PasDuGuide | null = null;
  for (let tour = 0; tour < 8000; tour++) {
    const p = prochain(r, vu(), vue);
    if (p.cle !== dernier?.cle) {
      cles.push(p.cle);
      etapes.push(p.etape);
      // une nouvelle consigne : le doigt reste encore un peu sur le poussoir, puis l'élève lit
      if (dernier?.geste === "maintenir") {
        for (let i = 0; i < (eleve.retardAppui ?? 0); i++) appuie(dernier.poussoir);
        lache(dernier.poussoir);
      }
      if (vue.saisie === null) passe(eleve.retard ?? 0);
      dernier = p;
      if (prochain(r, vu(), vue).cle !== p.cle) continue;
    }
    switch (p.geste) {
      case "glisser": {
        passe(lenteur);
        const suite = pose(r, vu(), vue.verse, p.objet, p.cible);
        suite.gestes.forEach(agit);
        vue = { ...vue, verse: suite.verse };
        break;
      }
      case "toucher": passe(lenteur); agit({ g: "tare" }); break;
      case "maintenir": appuie(p.poussoir); break;
      case "montrer":
        // il lit l'écran de la balance, ou la loupe à la demi-graduation, puis il note ; sinon il attend en regardant
        if (p.cle === "lire-masse") { agit({ g: "noter", quoi: "masse", v: affichage(r, vu()) }); vue = { ...vue, saisie: null }; }
        else if (p.cle === "lire-temperature") { agit({ g: "noter", quoi: "temperature", v: Math.round(maintenant(r, vu()).lue * 20) / 20 }); vue = { ...vue, saisie: null }; }
        else passe(1);
        break;
      case "bouton":
        if (p.bouton === "fini") { inscrit(); return { etat: partie.etat, gestes: partie.gestes, cles, etapes, fini: true, recommences }; }
        if (p.bouton === "recommencer") { partie = { etat: regles.depart(r), gestes: [], attente: 0 }; vue = { verse: false, saisie: null }; recommences++; }
        else { passe(lenteur); vue = { ...vue, saisie: p.bouton }; }
        break;
    }
  }
  inscrit();
  return { etat: partie.etat, gestes: partie.gestes, cles, etapes, fini: false, recommences };
}

const fautes = (r: ReglagesCalorimetre, etat: EtatCalorimetre) => regles.bilan(r, etat).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);

describe("l'élève qui suit le guide de calorimétrie", () => {
  it("la manipulation est sans faute, pour chaque graine", () => {
    for (const graine of GRAINES) {
      const r = reglages(graine);
      const s = suis(r);
      expect(s.fini, `graine ${graine} : le guide s'arrête sur ${s.cles.slice(-3).join(", ")}`).toBe(true);
      expect(fautes(r, s.etat), `graine ${graine}`).toEqual([]);
      const bilan = regles.bilan(r, s.etat);
      expect(bilan.score).toBe(1);
      // la masse d'eau est celle du protocole, à quelques grammes ; les températures sont celles d'une manipulation soignée
      expect(Math.abs(bilan.mesures.m - r.eauDemandee)).toBeLessThanOrEqual(5);
      expect(Math.abs(bilan.mesures.T1 - r.froid)).toBeLessThanOrEqual(0.1);
      expect(Math.abs(bilan.mesures.Tf - equilibreIdeal(r, s.etat.eau))).toBeLessThanOrEqual(0.15);
      // le bloc est entré brûlant, et le calorimètre n'a presque rien perdu
      expect(s.etat.entree?.bloc).toBeGreaterThan(99.5);
      // rejouée par le serveur, la liste des gestes redonne le même état ; elle reste courte
      expect(rejoue(regles, r, s.gestes)).toEqual(s.etat);
      expect(s.gestes.length).toBeLessThan(60);
      expect(s.recommences).toBe(0);
    }
  });
  it("un élève lent reste sans faute : il a le temps qu'il aurait au laboratoire", () => {
    // deux secondes pour lire chaque consigne, trois secondes par geste, une demi-seconde pour lâcher un poussoir ; puis le double
    for (const eleve of [{ retard: 20, lenteur: 30, retardAppui: 5 }, { retard: 50, lenteur: 50, retardAppui: 10 }]) {
      for (const graine of GRAINES) {
        const r = reglages(graine);
        const s = suis(r, eleve);
        expect(s.fini, `graine ${graine} : ${s.cles.slice(-3).join(", ")}`).toBe(true);
        expect(fautes(r, s.etat), `graine ${graine}, retard ${eleve.retard}`).toEqual([]);
        expect(rejoue(regles, r, s.gestes)).toEqual(s.etat);
      }
    }
  });
  it("le guide suit l'ordre du protocole, et montre chaque étape", () => {
    const { cles, etapes } = suis(reglages(1));
    expect(cles).toEqual(["peser", "tare", "becher", "verser", "ranger-becher", "noter-masse", "lire-masse", "replacer", "thermometre", "attendre-initiale", "noter-initiale", "lire-temperature",
      "sortir", "plonger", "fermer", "agiter", "noter-finale", "lire-temperature", "fini"]);
    // le rang de l'étape du protocole ne recule jamais, et va jusqu'à la dernière
    expect([...etapes].sort((a, b) => a - b)).toEqual(etapes);
    expect(new Set(etapes)).toEqual(new Set(paillasse(1).protocole.map((_, i) => i)));
  });
  it("il dit le geste, jamais la valeur à lire ; ses phrases tutoient, sans tiret long", () => {
    const r = reglages(2);
    let etat = regles.depart(r);
    const phrases = new Set<string>();
    for (const g of suis(r).gestes) {
      etat = regles.geste(r, etat, g);
      for (const vue of [{ verse: false, saisie: null }, { verse: true, saisie: null }, { verse: false, saisie: "masse" }, { verse: false, saisie: "temperature" }] as const) phrases.add(prochain(r, etat, vue).texte);
    }
    expect(phrases.size).toBeGreaterThan(14);
    for (const phrase of phrases) {
      // la seule valeur dite est celle du protocole : la masse d'eau à verser, et jamais une lecture
      expect(/\d,\d/.test(phrase), phrase).toBe(false);
      expect(/[—–]/.test(phrase), phrase).toBe(false);
      expect(/\b(vous|votre|vos)\b/i.test(phrase), phrase).toBe(false);
    }
  });
  it("une consigne ne clignote pas : pendant qu'on verse, pendant qu'on agite, pendant que le thermomètre descend", () => {
    const r = reglages(3);
    const sans = (cles: string[]) => cles.filter((c, i) => c !== cles[i - 1]);
    // l'eau qui monte dans le vase : verser, puis ranger le bécher
    let etat = rejoue(regles, r, [{ g: "vase", ou: "balance" }, { g: "tare" }]);
    const verse: string[] = [];
    for (let i = 0; i < 400; i++) { etat = regles.geste(r, etat, { g: "verser", v: 0.5 }); verse.push(prochain(r, etat, { verse: true, saisie: null }).cle); }
    expect(sans(verse)).toEqual(["verser", "ranger-becher"]);
    // le thermomètre qui rejoint l'eau : attendre, puis noter
    etat = rejoue(regles, r, [{ g: "vase", ou: "balance" }, { g: "tare" }, { g: "verser", v: 150 }, { g: "noter", quoi: "masse", v: 150 }, { g: "vase", ou: "calorimetre" }, { g: "thermometre", dans: true }]);
    const descend: string[] = [];
    for (let i = 0; i < 200; i++) { etat = regles.geste(r, etat, { g: "attendre", v: 0.5 }); descend.push(prochain(r, etat, { verse: false, saisie: null }).cle); }
    expect(sans(descend)).toEqual(["attendre-initiale", "noter-initiale"]);
    // l'équilibre qui s'installe pendant qu'on agite, puis une fois l'agitateur lâché
    for (const g of [{ g: "noter", quoi: "temperature", v: r.froid }, { g: "sortir" }, { g: "plonger" }, { g: "couvercle", pose: true }, { g: "agiter", on: true }] as GesteBrut[]) etat = regles.geste(r, etat, g);
    const agite: string[] = [];
    for (let i = 0; i < 300; i++) { etat = regles.geste(r, etat, { g: "attendre", v: 0.5 }); agite.push(prochain(r, etat, { verse: false, saisie: null }).cle); }
    etat = regles.geste(r, etat, { g: "agiter", on: false });
    for (let i = 0; i < 300; i++) { etat = regles.geste(r, etat, { g: "attendre", v: 0.5 }); agite.push(prochain(r, etat, { verse: false, saisie: null }).cle); }
    expect(sans(agite)).toEqual(["agiter", "noter-finale"]);
  });
});

describe("le guide rattrape une manipulation mal partie", () => {
  const r = reglages(1);
  const pesee: GesteBrut[] = [{ g: "vase", ou: "balance" }, { g: "tare" }, { g: "verser", v: 148 }, { g: "noter", quoi: "masse", v: 148 }, { g: "vase", ou: "calorimetre" }];
  const froide: GesteBrut[] = [...pesee, { g: "thermometre", dans: true }, { g: "attendre", v: 60 }, { g: "noter", quoi: "temperature", v: r.froid }];
  const rattrape = (avant: GesteBrut[], vue?: Partial<VueCalorimetre>) => {
    const s = suis(r, { avant, vue });
    expect(s.fini, s.cles.slice(-3).join(", ")).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
    expect(rejoue(regles, r, s.gestes)).toEqual(s.etat);
    return s;
  };
  it("l'eau versée avant la tare : il fait tout recommencer, et la manipulation reprise est sans faute", () => {
    for (const avant of [[{ g: "verser", v: 150 }], [{ g: "vase", ou: "balance" }, { g: "verser", v: 150 }, { g: "noter", quoi: "masse", v: 237 }]] as GesteBrut[][]) {
      expect(prochain(r, rejoue(regles, r, avant), { verse: false, saisie: null })).toMatchObject({ cle: "recommencer", geste: "bouton", bouton: "recommencer" });
      const s = rattrape(avant);
      expect(s.recommences).toBe(1);
      // la liste repart de zéro : le temps d'un geste, puis le vase sur la balance
      expect(s.gestes.slice(0, 2)).toEqual([{ g: "attendre", v: 8 }, { g: "vase", ou: "balance" }]);
    }
  });
  it("le bloc plongé sans masse d'eau ou sans température de départ : il fait tout recommencer", () => {
    const sansMasse = rejoue(regles, r, [{ g: "verser", v: 150 }, { g: "sortir" }, { g: "plonger" }]);
    expect(prochain(r, sansMasse, { verse: false, saisie: null })).toMatchObject({ cle: "recommencer", etape: 3 });
    const sansDepart = rejoue(regles, r, [...pesee, { g: "sortir" }, { g: "plonger" }]);
    expect(prochain(r, sansDepart, { verse: false, saisie: null }).texte).toContain("température de départ");
    expect(rattrape([...pesee, { g: "sortir" }, { g: "plonger" }]).recommences).toBe(1);
  });
  it("trop peu d'eau, déjà notée : il fait revenir le vase sur la balance, compléter, et peser de nouveau", () => {
    const avant: GesteBrut[] = [{ g: "vase", ou: "balance" }, { g: "tare" }, { g: "verser", v: 80 }, { g: "noter", quoi: "masse", v: 80 }, { g: "vase", ou: "calorimetre" }, { g: "thermometre", dans: true }];
    expect(rattrape(avant).cles.slice(0, 7)).toEqual(["retirer-thermometre", "peser", "becher", "verser", "ranger-becher", "noter-masse", "lire-masse"]);
    // la tare faite, puis l'eau versée dans le calorimètre : la balance peut encore donner sa masse
    expect(rattrape([{ g: "vase", ou: "balance" }, { g: "tare" }, { g: "vase", ou: "calorimetre" }, { g: "verser", v: 150 }]).cles.slice(0, 3)).toEqual(["peser", "noter-masse", "lire-masse"]);
  });
  it("une température lue trop tôt, ou thermomètre à l'air : il fait attendre, puis noter de nouveau", () => {
    const tot: GesteBrut[] = [...pesee, { g: "thermometre", dans: true }, { g: "attendre", v: 2 }, { g: "noter", quoi: "temperature", v: 19 }];
    expect(fautes(r, rejoue(regles, r, tot))).toContain("stabilisation!");
    expect(rattrape(tot).cles.slice(0, 3)).toEqual(["attendre-initiale", "noter-initiale", "lire-temperature"]);
    const alair: GesteBrut[] = [...pesee, { g: "noter", quoi: "temperature", v: 21 }];
    expect(fautes(r, rejoue(regles, r, alair))).toContain("thermometre!");
    expect(rattrape(alair).cles.slice(0, 4)).toEqual(["thermometre", "attendre-initiale", "noter-initiale", "lire-temperature"]);
  });
  it("le bloc resté à l'air : il le fait remettre dans l'eau bouillante, attendre, puis le reprendre", () => {
    const avant: GesteBrut[] = [...froide, { g: "sortir" }, { g: "attendre", v: 90 }];
    expect(maintenant(r, rejoue(regles, r, avant)).bloc).toBeLessThan(T_BAIN - 2);
    expect(rattrape(avant).cles.slice(0, 4)).toEqual(["rebain", "attendre-bain", "sortir", "plonger"]);
    // sorti dès le début : il attend au chaud pendant la pesée
    expect(rattrape([{ g: "sortir" }]).cles.slice(0, 2)).toEqual(["rebain", "peser"]);
    // sorti alors que le couvercle ferme le calorimètre : le couvercle d'abord, vite
    expect(rattrape([...froide, { g: "couvercle", pose: true }, { g: "sortir" }]).cles.slice(0, 3)).toEqual(["ouvrir", "plonger", "fermer"]);
  });
  it("le couvercle posé avant le bloc, le thermomètre retiré : il fait ouvrir, replonger", () => {
    expect(rattrape([...froide, { g: "couvercle", pose: true }]).cles.slice(0, 3)).toEqual(["ouvrir", "sortir", "plonger"]);
    expect(rattrape([...froide, { g: "thermometre", dans: false }]).cles.slice(0, 2)).toEqual(["thermometre", "sortir"]);
    // retiré après l'arrivée du bloc : il le fait replonger avant d'agiter
    expect(rattrape([...froide, { g: "sortir" }, { g: "plonger" }, { g: "couvercle", pose: true }, { g: "thermometre", dans: false }]).cles.slice(0, 2)).toEqual(["thermometre", "agiter"]);
  });
  it("une température finale lue sans couvercle ni agitation : il fait fermer, agiter, puis lire de nouveau", () => {
    const avant: GesteBrut[] = [...froide, { g: "sortir" }, { g: "plonger" }, { g: "attendre", v: 20 }];
    avant.push({ g: "noter", quoi: "temperature", v: Math.round(maintenant(r, rejoue(regles, r, avant)).lue * 20) / 20 });
    expect(fautes(r, rejoue(regles, r, avant))).toEqual(expect.arrayContaining(["agitation!", "couvercle"]));
    expect(rattrape(avant).cles).toEqual(["fermer", "agiter", "noter-finale", "lire-temperature", "fini"]);
  });
  it("le bécher laissé penché, une saisie ouverte : il fait ranger, lire", () => {
    const avant: GesteBrut[] = [{ g: "vase", ou: "balance" }, { g: "tare" }, { g: "verser", v: 150 }];
    expect(rattrape(avant, { verse: true }).cles.slice(0, 2)).toEqual(["ranger-becher", "noter-masse"]);
    const etat = rejoue(regles, r, avant);
    expect(prochain(r, etat, { verse: false, saisie: "masse" })).toMatchObject({ cle: "lire-masse", geste: "montrer", quoi: "balance", etape: 0 });
    expect(prochain(r, etat, { verse: false, saisie: "temperature" })).toMatchObject({ cle: "lire-temperature", quoi: "loupe", etape: 1 });
    expect(prochain(r, rejoue(regles, r, [...froide, { g: "sortir" }, { g: "plonger" }]), { verse: false, saisie: "temperature" }).etape).toBe(4);
  });
  it("le vase resté sur la balance au moment de plonger le bloc : il le fait remettre, le bloc au chaud", () => {
    // la température de départ notée, puis le vase reporté sur la balance
    const avant: GesteBrut[] = [...froide, { g: "thermometre", dans: false }, { g: "vase", ou: "balance" }];
    expect(rattrape(avant).cles.slice(0, 3)).toEqual(["replacer", "thermometre", "sortir"]);
    expect(prochain(r, rejoue(regles, r, [...avant, { g: "sortir" }]), { verse: false, saisie: null })).toMatchObject({ cle: "rebain", objet: "bloc", cible: "bain" });
  });
});

describe("poser un objet", () => {
  const r = reglages(1);
  const depart = regles.depart(r);
  it("donne aux règles le geste qui convient, et dit ce qui s'est passé", () => {
    expect(pose(r, depart, false, "vase", "plateau")).toMatchObject({ gestes: [{ g: "vase", ou: "balance" }], verse: false });
    const surBalance = regles.geste(r, depart, { g: "vase", ou: "balance" });
    expect(pose(r, surBalance, true, "vase", "cavite")).toMatchObject({ gestes: [{ g: "vase", ou: "calorimetre" }], verse: false });
    // le bécher ne donne rien aux règles : il se penche, ou retourne sur l'étagère
    expect(pose(r, depart, false, "eau", "au-dessus")).toMatchObject({ gestes: [], verse: true, conseil: expect.stringContaining("« Verser »") });
    expect(pose(r, depart, true, "eau", "repos-eau")).toMatchObject({ gestes: [], verse: false });
    expect(pose(r, depart, true, "couvercle", "calorimetre")).toMatchObject({ gestes: [{ g: "couvercle", pose: true }], verse: false });
    expect(pose(r, regles.geste(r, depart, { g: "couvercle", pose: true }), false, "couvercle", "repos-couvercle").gestes).toEqual([{ g: "couvercle", pose: false }]);
    expect(pose(r, depart, false, "thermometre", "dans-le-vase")).toMatchObject({ gestes: [{ g: "thermometre", dans: true }], message: expect.stringContaining("il n'y a pas d'eau") });
    const eau = regles.geste(r, depart, { g: "verser", v: 150 });
    expect(pose(r, eau, false, "thermometre", "dans-le-vase")).toMatchObject({ message: expect.stringContaining("son niveau se met à bouger"), conseil: expect.stringContaining("loupe") });
    expect(pose(r, regles.geste(r, eau, { g: "thermometre", dans: true }), false, "thermometre", "repos-thermometre").gestes).toEqual([{ g: "thermometre", dans: false }]);
    expect(pose(r, eau, false, "pince", "bain")).toMatchObject({ gestes: [{ g: "sortir" }], conseil: expect.stringContaining("tout de suite") });
    const sorti = regles.geste(r, eau, { g: "sortir" });
    expect(pose(r, sorti, false, "bloc", "bain").gestes).toEqual([{ g: "rebain" }]);
    expect(pose(r, sorti, true, "bloc", "au-fond")).toMatchObject({ gestes: [{ g: "plonger" }], verse: false });
  });
  it("un geste impossible ne donne rien aux règles, et la phrase dit pourquoi", () => {
    const eau = regles.geste(r, depart, { g: "verser", v: 150 });
    const ferme = regles.geste(r, eau, { g: "couvercle", pose: true });
    const refus = (etat: EtatCalorimetre, objet: string, cible: string, mots: string) => expect(pose(r, etat, false, objet, cible)).toEqual({ gestes: [], verse: false, message: expect.stringContaining(mots) });
    refus(ferme, "vase", "plateau", "enlève d'abord le couvercle");
    refus(regles.geste(r, eau, { g: "thermometre", dans: true }), "vase", "plateau", "retire-le d'abord");
    refus(rejoue(regles, r, [{ g: "verser", v: 150 }, { g: "sortir" }, { g: "plonger" }]), "vase", "plateau", "il reste dans le calorimètre");
    refus(regles.geste(r, eau, { g: "agiter", on: true }), "vase", "plateau", "lâche-le d'abord");
    refus(ferme, "eau", "au-dessus", "enlève le couvercle pour verser");
    refus(rejoue(regles, r, [{ g: "verser", v: 150 }, { g: "sortir" }, { g: "plonger" }]), "eau", "au-dessus", "on n'y ajoute plus d'eau");
    const surBalance = regles.geste(r, depart, { g: "vase", ou: "balance" });
    refus(surBalance, "couvercle", "calorimetre", "il n'y a rien à fermer");
    refus(surBalance, "thermometre", "dans-le-vase", "se plonge dans le calorimètre");
    refus(depart, "couvercle", "repos-couvercle", "déjà sur l'étagère");
    refus(depart, "thermometre", "repos-thermometre", "déjà sur son support");
    refus(regles.geste(r, eau, { g: "sortir" }), "pince", "bain", "la pince n'a rien à saisir");
    refus(regles.geste(r, ferme, { g: "sortir" }), "bloc", "au-fond", "le bloc ne peut pas y entrer");
    refus(regles.geste(r, surBalance, { g: "sortir" }), "bloc", "au-fond", "remets-le dans le calorimètre");
    refus(depart, "bloc", "au-fond", "n'est pas dans la pince");
    refus(depart, "bloc", "bain", "n'est pas dans la pince");
    expect(pose(r, depart, true, "licorne", "bain")).toEqual({ gestes: [], verse: true, message: "" });
  });
});

describe("le temps du laboratoire et le bécher", () => {
  const r = reglages(1);
  it("le temps passe dix fois plus vite, sauf quand un geste presse", () => {
    const eau = rejoue(regles, r, [{ g: "verser", v: 150 }]);
    expect(vitesse(eau)).toBe(10);
    // le bloc à l'air, puis dans un calorimètre encore ouvert : au rythme réel
    const sorti = regles.geste(r, eau, { g: "sortir" });
    expect(vitesse(sorti)).toBe(1);
    const plonge = regles.geste(r, sorti, { g: "plonger" });
    expect(vitesse(plonge)).toBe(1);
    // dès qu'on ferme, ou qu'on agite, le temps reprend sa course
    expect(vitesse(regles.geste(r, plonge, { g: "couvercle", pose: true }))).toBe(10);
    expect(vitesse(regles.geste(r, plonge, { g: "agiter", on: true }))).toBe(10);
    expect(vitesse(regles.geste(r, sorti, { g: "rebain" }))).toBe(10);
  });
  it("le bécher verse vite, puis doucement à l'approche de la masse demandée", () => {
    const avec = (v: number) => rejoue(regles, r, [{ g: "verser", v }]);
    expect(debitEau(r, regles.depart(r))).toBe(30);
    expect(debitEau(r, avec(100))).toBe(30);
    expect(debitEau(r, avec(r.eauDemandee - 40))).toBe(8);
    expect(debitEau(r, avec(r.eauDemandee + 30))).toBe(8);
  });
  it("deux attentes, ou deux versements, à la suite se regroupent dans la liste ; rejouée, elle donne le même état", () => {
    let gestes: GesteBrut[] = [];
    for (const g of [{ g: "verser", v: 30 }, { g: "verser", v: 0.8 }, { g: "attendre", v: 0.5 }, { g: "attendre", v: 12.25 }, { g: "thermometre", dans: true }, { g: "attendre", v: 3600 }, { g: "attendre", v: 1 }] as GesteBrut[]) gestes = ajoute(gestes, g);
    expect(gestes).toEqual([{ g: "verser", v: 30.8 }, { g: "attendre", v: 12.75 }, { g: "thermometre", dans: true }, { g: "attendre", v: 3600 }, { g: "attendre", v: 1 }]);
    const unAun: GesteBrut[] = [{ g: "verser", v: 30 }, { g: "verser", v: 0.8 }, { g: "attendre", v: 0.5 }, { g: "attendre", v: 12.25 }, { g: "thermometre", dans: true }];
    expect(rejoue(regles, r, gestes.slice(0, 3))).toEqual(rejoue(regles, r, unAun));
  });
});

describe("la marque du guide", () => {
  it("le professeur plafonne une manipulation faite avec le guide, et le dit", async () => {
    for (const graine of GRAINES.slice(0, 3)) {
      const etape = paillasse(graine);
      const { gestes } = suis(etape.paillasse.reglages as ReglagesCalorimetre);
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
