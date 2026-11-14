// Le guide de la paillasse « doppler » (lib/commun/tp/paillasses/doppler-guide.ts). Un élève de test fait, sans
// réfléchir, exactement ce que le guide lui dit, à son rythme : la manipulation qu'il obtient doit être sans faute, pour
// chaque graine. Le guide est donc complet, dans le bon ordre, et il ne tourne jamais en rond.
import { describe, expect, it } from "vitest";
import { MEMOIRE, chronometre, dernierPassage, dureeDuTrajet, pics, reference, regles, spectre, vitesseAu, type EtatDoppler, type ReglagesDoppler } from "@/lib/commun/tp/paillasses/doppler";
import {
  BANDE, FENETRES, debutDeFenetre, fourchesBonnes, frequenceJuste, pasDuRepere, passageValable, positionsJustes, prochain, repereDans, zoomPossible, zoomer,
  type PasDuGuide, type VueDoppler,
} from "@/lib/commun/tp/paillasses/doppler-guide";
import { PLAFOND_AVEC_GUIDE, avecMarqueDuGuide, rejoue, type GesteBrut } from "@/lib/commun/tp/types";
import doppler from "@/lib/serveur/contenu/tp/doppler";
import { verifie } from "@/lib/serveur/tp";
import { GRAINES, type EtapeDePaillasse } from "../../outils/tp";

/** L'étape de paillasse du TP, pour une graine. */
function paillasse(graine: number): EtapeDePaillasse {
  const etape = doppler.etapes(graine).find((e) => e.genre === "paillasse");
  if (!etape || etape.genre !== "paillasse") throw new Error("pas de paillasse dans le TP");
  return etape;
}
const reglages = (graine: number) => paillasse(graine).paillasse.reglages as ReglagesDoppler;
const centieme = (x: number) => Math.round(x * 100) / 100;

/** Ce que la vue retient à l'ouverture de la paillasse, sans l'heure ni les pics. */
type Ecran = Omit<VueDoppler, "t" | "sommets">;
const VUE: Ecran = { ecran: "banc", zoom: 0, centre: BANDE / 2, repere: 2000, carnet: "ferme", tenu: null };
/** Les sommets des pics du dernier enregistrement, comme la vue les calcule. */
const sommetsDe = (r: ReglagesDoppler, etat: EtatDoppler) => pics(r, spectre(r, etat));
/** Le pas du guide à un instant, pour un état et un écran donnés. */
const pasA = (r: ReglagesDoppler, etat: EtatDoppler, t: number, ecran: Partial<Ecran> = {}): PasDuGuide => prochain(r, etat, { ...VUE, ...ecran, t, sommets: sommetsDe(r, etat) });

interface Suivi { etat: EtatDoppler; gestes: GesteBrut[]; cles: string[]; textes: Set<string>; vue: Ecran; t: number; fini: boolean }
/** Toutes les phrases que le guide a dites dans les essais de ce fichier : le dernier essai les relit. */
const entendues = new Set<string>();
interface Eleve {
  /** le temps que l'élève met entre deux gestes, en secondes */
  rythme?: number;
  /** sa maladresse sur l'écran de l'analyseur, en unités du dessin : il touche à cette distance du pic, deux fois mieux à chaque reprise */
  tremble?: number;
  /** des gestes faits avant d'écouter le guide */
  avant?: GesteBrut[];
  /** ce que la vue retient après ces gestes */
  vue?: Partial<Ecran>;
}

/** L'élève de test : il fait ce que le guide dit, jusqu'à « J'ai fini ». Le temps passe d'un geste à l'autre. */
function suis(r: ReglagesDoppler, eleve: Eleve = {}): Suivi {
  let etat = rejoue(regles, r, eleve.avant ?? []);
  const gestes: GesteBrut[] = [...(eleve.avant ?? [])];
  let vue: Ecran = { ...VUE, ...eleve.vue };
  const cles: string[] = [];
  const textes = new Set<string>();
  const rythme = eleve.rythme ?? 0.2;
  let t = centieme(Math.max(1, etat.horloge) + rythme);
  const agit = (g: GesteBrut) => { const suite = regles.geste(r, etat, g); if (suite !== etat) { etat = suite; gestes.push(g); } };
  // les pics ne se recalculent que si l'enregistrement change
  let bande = etat.bande, sommets = sommetsDe(r, etat);
  const tentatives = new Map<string, number>();
  let dernier = "";
  for (let tour = 0; tour < 2500; tour++) {
    // la mémoire de l'enregistreur est pleine : il s'arrête tout seul
    if (etat.debut !== null && t - etat.debut >= MEMOIRE) agit({ g: "arreter", t });
    if (etat.bande !== bande) { bande = etat.bande; sommets = sommetsDe(r, etat); }
    const p = prochain(r, etat, { ...vue, t, sommets });
    if (p.cle !== dernier) { cles.push(p.cle); dernier = p.cle; }
    textes.add(p.texte);
    entendues.add(p.texte);
    switch (p.geste) {
      case "tourner":
        // une molette tourne d'un cran à la fois
        if (p.molette === "moteur") agit({ g: "cran", v: etat.cran + Math.sign(p.vers - etat.cran) });
        else vue = { ...vue, ...zoomer(vue.repere, vue.zoom + Math.sign(p.vers - vue.zoom)) };
        break;
      case "fourche": agit({ g: "fourche", n: p.n, x: p.vers }); break;
      case "ramener": agit({ g: "ramener", t }); break;
      case "toucher": agit(p.quoi === "lancer" ? { g: "lancer", t } : etat.debut === null ? { g: "enregistrer", t } : { g: "arreter", t }); break;
      case "viser": {
        const essais = tentatives.get(p.cle) ?? 0;
        tentatives.set(p.cle, essais + 1);
        const ecart = ((eleve.tremble ?? 0) / 2 ** essais) * (FENETRES[vue.zoom] / 320) * (essais % 2 ? -1 : 1);
        vue = { ...vue, repere: repereDans(vue.zoom, vue.centre, p.f + ecart) };
        break;
      }
      case "bouton":
        if (p.bouton === "fini") return { etat, gestes, cles, textes, vue, t, fini: true };
        if (p.bouton === "carnet") vue = { ...vue, carnet: "ouvert" };
        else if (p.bouton === "fermer") vue = { ...vue, carnet: "ferme" };
        else vue = { ...vue, ecran: p.bouton };
        break;
      // ouvrir une ligne montre l'appareil à lire : l'analyseur pour une fréquence, le banc pour le reste
      case "ligne": vue = { ...vue, carnet: p.ligne, ecran: p.ligne === "approche" || p.ligne === "eloignement" ? "spectre" : "banc" }; break;
      case "ecrire": {
        // l'élève lit l'appareil : la règle sous la fourche, le chronomètre, la fréquence du repère
        const passage = dernierPassage(etat);
        const [premiere, seconde] = [...etat.fourches].sort((a, b) => a - b);
        const lu = p.ligne === "x1" ? premiere : p.ligne === "x2" ? seconde : p.ligne === "duree" ? (passage ? chronometre(passage.v, passage.fourches) : 0) : vue.repere;
        agit({ g: "noter", quoi: p.ligne, v: lu });
        vue = { ...vue, carnet: "ferme" };
        break;
      }
      // attendre que le mobile arrive ; ou « Annuler », qui revient aux lignes du carnet
      case "attendre": if (p.cle === "carnet-annuler") vue = { ...vue, carnet: "ouvert" }; break;
    }
    t = centieme(t + (p.cle === "rouler" ? 0.1 : rythme));
  }
  return { etat, gestes, cles, textes, vue, t, fini: false };
}

const fautes = (r: ReglagesDoppler, etat: EtatDoppler) => regles.bilan(r, etat).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);

describe("l'élève qui suit le guide de l'effet Doppler", () => {
  it("la manipulation est sans faute, pour chaque graine", () => {
    for (const graine of GRAINES) {
      const r = reglages(graine);
      const s = suis(r);
      expect(s.fini, `graine ${graine} : le guide s'arrête sur ${s.cles.slice(-3).join(", ")}`).toBe(true);
      expect(fautes(r, s.etat), `graine ${graine}`).toEqual([]);
      expect(regles.bilan(r, s.etat).score).toBe(1);
      // les mesures sont celles d'une manipulation sans défaut : les deux pics, les fourches du professeur, la durée du chronomètre
      const m = regles.bilan(r, s.etat).mesures, ideal = reference(r);
      expect(Math.abs(m.fa - ideal.fa)).toBeLessThanOrEqual(0.75);
      expect(Math.abs(m.fe - ideal.fe)).toBeLessThanOrEqual(0.75);
      expect([m.x1, m.x2, m.dt]).toEqual([100, 300, ideal.dt]);
      // rejouée par le serveur, la liste des gestes redonne le même état
      expect(rejoue(regles, r, s.gestes)).toEqual(s.etat);
    }
  });
  it("un élève lent, ou très lent, reste sans faute : l'enregistrement contient tout le passage", () => {
    for (const rythme of [1.5, 6]) {
      for (const graine of GRAINES.slice(0, 4)) {
        const r = reglages(graine);
        const s = suis(r, { rythme });
        expect(s.fini, `graine ${graine}, un geste toutes les ${rythme} s : ${s.cles.slice(-3).join(", ")}`).toBe(true);
        expect(fautes(r, s.etat), `graine ${graine}, un geste toutes les ${rythme} s`).toEqual([]);
      }
    }
  });
  it("un élève qui touche l'écran de l'analyseur à côté du pic y arrive en zoomant", () => {
    for (const graine of GRAINES.slice(0, 5)) {
      const r = reglages(graine);
      const s = suis(r, { tremble: 5 });
      expect(s.fini, `graine ${graine} : ${s.cles.slice(-3).join(", ")}`).toBe(true);
      expect(fautes(r, s.etat), `graine ${graine}`).toEqual([]);
      // il a zoomé en deux fois : la fenêtre la plus large ne permet pas de viser un pic au doigt
      expect(s.cles.filter((c) => c === "zoom").length).toBeGreaterThanOrEqual(2);
    }
  });
  it("le guide suit l'ordre du protocole, et montre chaque étape", () => {
    const r = reglages(1);
    const { cles, gestes } = suis(r);
    expect(cles).toEqual(["cran", "fourche-1", "fourche-2", "x1-carnet", "x1-ligne", "x1-ecrire", "x2-carnet", "x2-ligne", "x2-ecrire", "enregistrer", "lancer", "rouler", "arreter",
      "duree-carnet", "duree-ligne", "duree-ecrire", "spectre", "viser-approche", "zoom", "repere-approche", "approche-carnet", "approche-ligne", "approche-ecrire",
      "repere-eloignement", "eloignement-carnet", "eloignement-ligne", "eloignement-ecrire", "fini"]);
    // un mobile plus rapide, un son plus aigu : les deux pics sont trop écartés pour la fenêtre la plus serrée, il faut l'élargir d'un cran
    expect(suis(reglages(5)).cles.slice(-7)).toEqual(["approche-ecrire", "zoom-elargir", "viser-eloignement", "eloignement-carnet", "eloignement-ligne", "eloignement-ecrire", "fini"]);
    // le rang de l'étape du protocole ne recule jamais, et reste dans le protocole
    const protocole = paillasse(1).protocole;
    expect(protocole.length).toBe(5);
    let etat = regles.depart(r);
    let rang = 0;
    for (const g of gestes) {
      etat = regles.geste(r, etat, g);
      const e = pasA(r, etat, etat.horloge + 5).etape;
      expect(e).toBeLessThan(protocole.length);
      expect(e).toBeGreaterThanOrEqual(rang);
      rang = e;
    }
    expect(rang).toBe(protocole.length - 1);
  });
  it("le guide dit le geste, jamais la mesure : ni une graduation, ni une durée, ni une fréquence", () => {
    const textes = new Set<string>();
    for (const graine of GRAINES.slice(0, 3)) for (const eleve of [{}, { tremble: 5, rythme: 1.5 }]) for (const texte of suis(reglages(graine), eleve).textes) textes.add(texte);
    expect(textes.size).toBeGreaterThan(30);
    for (const texte of textes) {
      expect(texte, texte).not.toMatch(/\d[\d,]*\s?(cm|m|s|Hz|hertz)(\s|\.|,|$)/);
      expect(texte.length, texte).toBeLessThanOrEqual(126);
    }
  });
});

describe("l'analyseur de spectre", () => {
  it("la fenêtre se resserre autour du repère, et le repère se cale sur son pas", () => {
    expect(FENETRES.map((_, zoom) => pasDuRepere(zoom))).toEqual([20, 10, 5, 2, 1, 0.5, 0.25]);
    expect(debutDeFenetre(0, 4000)).toBe(0);
    expect(debutDeFenetre(5, 4022)).toBe(3922);
    expect(debutDeFenetre(6, 7990)).toBe(7900);
    expect(repereDans(0, 4000, 4033.2)).toBe(4040);
    expect(repereDans(6, 4030, 4033.2)).toBe(4033.25);
    expect(repereDans(6, 4030, 9000)).toBe(4080);
    expect(zoomer(4040, 6)).toEqual({ zoom: 6, centre: 4040, repere: 4040 });
    expect(zoomer(4033, 1)).toEqual({ zoom: 1, centre: 4030, repere: 4030 });
  });
  it("le zoom possible : le plus serré qui garde le pic dans la fenêtre", () => {
    expect(zoomPossible(2000, 4033)).toBe(0);
    expect(zoomPossible(4140, 4033)).toBe(4);
    expect(zoomPossible(4040, 4033)).toBe(6);
    expect(zoomPossible(4033, 3967)).toBe(5);
  });
});

describe("pendant qu'une fourche ou le repère glisse, la consigne ne change pas", () => {
  const r = reglages(2);
  it("la fourche F1 tenue sous le doigt : la consigne reste sur elle, même quand elle passe où il faut", () => {
    const cran: GesteBrut = { g: "cran", v: r.cran };
    for (const x of [20, 60, 100, 180, 320]) {
      const etat = rejoue(regles, r, [cran, { g: "fourche", n: 1, x }]);
      expect(pasA(r, etat, 5, { tenu: "f1" })).toMatchObject({ cle: "fourche-1", geste: "fourche", n: 1, vers: 100 });
    }
    // lâchée où il faut, la consigne passe à la fourche F2 ; la fourche F2 tenue, la consigne reste sur elle
    expect(pasA(r, rejoue(regles, r, [cran, { g: "fourche", n: 1, x: 100 }]), 5)).toMatchObject({ cle: "fourche-2", vers: 300 });
    expect(pasA(r, rejoue(regles, r, [cran, { g: "fourche", n: 1, x: 100 }, { g: "fourche", n: 2, x: 300 }]), 5, { tenu: "f2" }).cle).toBe("fourche-2");
    expect(pasA(r, rejoue(regles, r, [cran, { g: "fourche", n: 1, x: 100 }, { g: "fourche", n: 2, x: 300 }]), 5).cle).toBe("x1-carnet");
    // une première fourche posée loin : la seconde va un mètre plus loin encore
    expect(pasA(r, rejoue(regles, r, [cran, { g: "fourche", n: 1, x: 250 }, { g: "fourche", n: 2, x: 200 }]), 5)).toMatchObject({ cle: "fourche-2", vers: 350 });
    // la fourche F2 restée près du départ sert de première fourche, si la fourche F1 est un mètre plus loin
    expect(pasA(r, rejoue(regles, r, [cran, { g: "fourche", n: 1, x: 250 }]), 5).cle).toBe("x1-carnet");
  });
  it("le repère tenu sous le doigt : la consigne reste sur lui, même quand il passe sur le sommet", () => {
    const s = suis(r);
    const sansFrequences = rejoue(regles, r, s.gestes.filter((g) => g.quoi !== "approche" && g.quoi !== "eloignement"));
    const sommets = sommetsDe(r, sansFrequences);
    const fin = { ...zoomer(sommets.approche!, 6), ecran: "spectre" as const };
    for (const ecart of [-4, -0.5, 0, 0.5, 4]) expect(pasA(r, sansFrequences, 60, { ...fin, repere: sommets.approche! + ecart, tenu: "repere" }).cle).toBe("repere-approche");
    expect(pasA(r, sansFrequences, 60, fin).cle).toBe("approche-carnet");
    expect(pasA(r, sansFrequences, 60, { ...fin, repere: sommets.approche! + 3 })).toMatchObject({ cle: "repere-approche", pres: true });
  });
});

describe("le guide rattrape une manipulation mal partie", () => {
  const r = reglages(3);
  const v = vitesseAu(r, r.cran);
  const preparer: GesteBrut[] = [{ g: "cran", v: r.cran }, { g: "fourche", n: 1, x: 100 }, { g: "fourche", n: 2, x: 300 }, { g: "noter", quoi: "x1", v: 100 }, { g: "noter", quoi: "x2", v: 300 }];
  /** un passage enregistré du départ à l'arrivée, lancé à l'instant 10 */
  const passer: GesteBrut[] = [{ g: "enregistrer", t: 9 }, { g: "lancer", t: 10 }, { g: "arreter", t: centieme(11 + dureeDuTrajet(v)) }];
  const refait = (s: Suivi) => s.cles.filter((c) => c === "lancer").length;

  it("un passage au mauvais cran : il dit pourquoi, et fait recommencer", () => {
    const avant = [...preparer.slice(1), ...passer];
    expect(pasA(r, rejoue(regles, r, avant), 20).texte).toContain("au cran 1, pas au cran demandé");
    // au cran 1, le mobile est plus lent : il roule encore quand l'enregistrement s'arrête
    const s = suis(r, { avant });
    expect(s.cles.slice(0, 5)).toEqual(["rouler", "ramener", "cran", "enregistrer", "lancer"]);
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("un mobile lancé sans enregistrement, ou un enregistrement arrêté trop tôt : il fait recommencer", () => {
    const sans = [...preparer, { g: "lancer", t: 10 }];
    expect(pasA(r, rejoue(regles, r, sans), 10.5)).toMatchObject({ cle: "rouler", geste: "attendre" });
    expect(pasA(r, rejoue(regles, r, sans), 10.5).texte).toContain("rien ne l'enregistre");
    expect(pasA(r, rejoue(regles, r, sans), 20).texte).toContain("n'est pas enregistré en entier");
    const s = suis(r, { avant: sans });
    expect(s.fini).toBe(true);
    expect(refait(s)).toBe(1);
    expect(fautes(r, s.etat)).toEqual([]);
    const tropTot = suis(r, { avant: [...preparer, { g: "enregistrer", t: 9 }, { g: "lancer", t: 10 }, { g: "arreter", t: 10.6 }] });
    expect(tropTot.cles.slice(0, 2)).toEqual(["rouler", "ramener"]);
    expect(fautes(r, tropTot.etat)).toEqual([]);
  });
  it("un enregistrement lancé après le mobile, ou qui attend depuis trop longtemps : il le fait arrêter, puis relancer", () => {
    const tard = suis(r, { avant: [...preparer, { g: "lancer", t: 10 }, { g: "enregistrer", t: 10.8 }] });
    expect(tard.cles.slice(0, 5)).toEqual(["rouler", "enregistrement-jeter", "ramener", "enregistrer", "lancer"]);
    expect(fautes(r, tard.etat)).toEqual([]);
    const vieux = rejoue(regles, r, [...preparer, { g: "enregistrer", t: 9 }]);
    expect(pasA(r, vieux, 12).cle).toBe("lancer");
    expect(pasA(r, vieux, 35).cle).toBe("enregistrement-jeter");
    // un enregistrement lancé avant la fin des réglages : il ne servira pas non plus
    expect(pasA(r, rejoue(regles, r, [{ g: "enregistrer", t: 9 }]), 10).cle).toBe("enregistrement-jeter");
    expect(fautes(r, suis(r, { avant: [{ g: "enregistrer", t: 9 }] }).etat)).toEqual([]);
  });
  it("un passage avec les fourches mal placées : il les fait placer, noter, puis recommencer", () => {
    const avant: GesteBrut[] = [{ g: "cran", v: r.cran }, ...passer];
    expect(pasA(r, rejoue(regles, r, avant), 20).texte).toContain("les fourches étaient mal placées");
    const s = suis(r, { avant });
    expect(s.cles.slice(0, 5)).toEqual(["ramener", "fourche-1", "fourche-2", "x1-carnet", "x1-ligne"]);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("une fourche déplacée après la lecture de la règle : il fait relire, ou recommencer si le mobile est déjà passé", () => {
    const deplacee = [...preparer, { g: "fourche", n: 1, x: 120 }];
    expect(pasA(r, rejoue(regles, r, deplacee), 5)).toMatchObject({ cle: "x1-carnet" });
    expect(pasA(r, rejoue(regles, r, deplacee), 5).texte).toContain("n'est pas la bonne");
    expect(fautes(r, suis(r, { avant: deplacee }).etat)).toEqual([]);
    // les positions pas encore notées, le mobile passé, puis une fourche déplacée : la règle ne dit plus où elle était
    const apres = [...preparer.slice(0, 3), ...passer, { g: "fourche", n: 2, x: 250 }];
    expect(passageValable(r, rejoue(regles, r, apres), { sommets: sommetsDe(r, rejoue(regles, r, apres)) })).toBe(false);
    expect(pasA(r, rejoue(regles, r, apres), 20).texte).toContain("Une fourche a bougé depuis le passage");
    const s = suis(r, { avant: apres });
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
    // les positions déjà notées : le passage reste bon, la fourche peut bouger
    expect(passageValable(r, rejoue(regles, r, [...preparer, ...passer, { g: "fourche", n: 2, x: 250 }]), { sommets: sommetsDe(r, rejoue(regles, r, [...preparer, ...passer])) })).toBe(true);
  });
  it("une durée ou une fréquence mal lue : il la fait relire", () => {
    const fait = [...preparer, ...passer];
    const sommets = sommetsDe(r, rejoue(regles, r, fait));
    const avant = [...fait, { g: "noter", quoi: "duree", v: 0.5 }, { g: "noter", quoi: "approche", v: sommets.approche! + 4 }, { g: "noter", quoi: "eloignement", v: sommets.eloignement! }];
    const etat = rejoue(regles, r, avant);
    expect(frequenceJuste(r, etat, "approche", { sommets })).toBe(false);
    expect(frequenceJuste(r, etat, "eloignement", { sommets })).toBe(true);
    expect(pasA(r, etat, 20).texte).toContain("n'est pas celle du chronomètre");
    const s = suis(r, { avant });
    expect(s.cles).toEqual(["duree-carnet", "duree-ligne", "duree-ecrire", "spectre", "viser-approche", "zoom", "repere-approche", "approche-carnet", "approche-ligne", "approche-ecrire", "fini"]);
    expect([...s.textes].some((texte) => texte.includes("n'est pas celle du sommet du pic"))).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("des fréquences notées, puis un nouvel enregistrement : il les fait relire sur le nouveau spectre", () => {
    const premier = suis(r);
    const encore: GesteBrut[] = [{ g: "ramener", t: premier.t + 1 }, { g: "enregistrer", t: premier.t + 2 }, { g: "lancer", t: premier.t + 3 }, { g: "arreter", t: centieme(premier.t + 4 + dureeDuTrajet(v)) }];
    const s = suis(r, { avant: [...premier.gestes, ...encore], vue: premier.vue });
    expect(s.cles).toContain("duree-ecrire");
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("un carnet ouvert trop tôt, un écran qui n'est pas le bon, un zoom perdu loin des pics : il y ramène", () => {
    const depart = regles.depart(r);
    expect(pasA(r, depart, 2, { carnet: "ouvert" })).toMatchObject({ cle: "carnet-fermer", geste: "bouton", bouton: "fermer" });
    expect(pasA(r, depart, 2, { carnet: "duree" }).cle).toBe("carnet-annuler");
    expect(pasA(r, depart, 2, { ecran: "spectre" })).toMatchObject({ cle: "banc", geste: "bouton", bouton: "banc" });
    const perdu = suis(r, { vue: { ecran: "spectre", carnet: "approche", ...zoomer(1000, 6) } });
    expect(perdu.cles.slice(0, 4)).toEqual(["carnet-annuler", "carnet-fermer", "banc", "cran"]);
    expect(perdu.cles).toContain("zoom-elargir");
    expect(perdu.fini).toBe(true);
    expect(fautes(r, perdu.etat)).toEqual([]);
  });
  it("les fourches bien placées, dans un ordre ou dans l'autre ; les positions notées, dans un ordre ou dans l'autre", () => {
    expect(fourchesBonnes([100, 300])).toBe(true);
    expect(fourchesBonnes([300, 100])).toBe(true);
    expect(fourchesBonnes([40, 300])).toBe(false);
    expect(fourchesBonnes([100, 190])).toBe(false);
    const croisees = rejoue(regles, r, [{ g: "fourche", n: 1, x: 300 }, { g: "fourche", n: 2, x: 100 }, { g: "noter", quoi: "x1", v: 300 }, { g: "noter", quoi: "x2", v: 100 }]);
    expect(positionsJustes(croisees, croisees.fourches)).toBe(true);
    expect(positionsJustes(rejoue(regles, r, [{ g: "noter", quoi: "x1", v: 20 }]), [20, 70])).toBe(false);
  });
});

describe("toutes les phrases du guide, entendues dans les essais de ce fichier", () => {
  it("sont courtes (trois lignes au plus sur un téléphone) et ne soufflent aucune valeur", () => {
    expect(entendues.size).toBeGreaterThan(45);
    for (const texte of entendues) {
      expect(texte.length, texte).toBeLessThanOrEqual(126);
      expect(texte, texte).not.toMatch(/\d[\d,]*\s?(cm|m|s|Hz|hertz)(\s|\.|,|$)/);
    }
  });
});

describe("la marque du guide", () => {
  it("le professeur plafonne une manipulation faite avec le guide, et le dit", async () => {
    const etape = paillasse(1);
    const { gestes } = suis(etape.paillasse.reglages as ReglagesDoppler);
    const trouve = async () => regles;
    const seul = await verifie(etape, { g: "paillasse", gestes }, {}, 1, trouve);
    const aide = await verifie(etape, { g: "paillasse", gestes: avecMarqueDuGuide(gestes) }, {}, 1, trouve);
    expect(seul?.retour).toMatchObject({ score: 1, correction: { genre: "paillasse", fautes: [] } });
    expect(aide?.retour).toMatchObject({ score: PLAFOND_AVEC_GUIDE, correction: { genre: "paillasse", fautes: [], guide: true } });
    expect(aide?.mesures).toEqual(seul?.mesures);
  });
});
