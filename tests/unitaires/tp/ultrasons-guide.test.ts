// Le guide de la paillasse « ultrasons » (lib/commun/tp/paillasses/ultrasons-guide.ts). Un élève de test fait, sans
// réfléchir, exactement ce que le guide lui dit : la manipulation qu'il obtient doit être sans faute, pour chaque
// graine. Le guide est donc complet, dans le bon ordre, et il ne tourne jamais en rond.
import { describe, expect, it } from "vitest";
import { BASES, CALIBRES, RAIL, amplitudeRecue, decalageDuMobile, longueurOnde, periode, premiereCoincidence, regles, type EtatUltrasons, type ReglagesUltrasons } from "@/lib/commun/tp/paillasses/ultrasons";
import { baseVisee, calibreVise, insecable, periodesEntreCurseurs, prochain, sommetsVisibles, type PasDuGuide, type VueUltrasons } from "@/lib/commun/tp/paillasses/ultrasons-guide";
import { PLAFOND_AVEC_GUIDE, avecMarqueDuGuide, rejoue, type GesteBrut } from "@/lib/commun/tp/types";
import ultrasons from "@/lib/serveur/contenu/tp/ultrasons";
import { verifie } from "@/lib/serveur/tp";
import { GRAINES, type EtapeDePaillasse } from "../../outils/tp";

/** L'étape de paillasse du TP, pour une graine. */
function paillasse(graine: number): EtapeDePaillasse {
  const etape = ultrasons.etapes(graine).find((e) => e.genre === "paillasse");
  if (!etape || etape.genre !== "paillasse") throw new Error("pas de paillasse dans le TP");
  return etape;
}
const reglages = (graine: number) => paillasse(graine).paillasse.reglages as ReglagesUltrasons;
const dixieme = (x: number) => Math.round(x * 10) / 10;

interface Suivi { etat: EtatUltrasons; gestes: GesteBrut[]; cles: string[]; fini: boolean }
/** Toutes les phrases que le guide a dites dans les essais de ce fichier : le dernier essai les relit. */
const entendues = new Set<string>();
interface Eleve {
  /** le nombre de petits déplacements que l'élève fait encore après une nouvelle consigne, avant de réagir */
  retard?: number;
  /** des gestes faits avant d'écouter le guide */
  avant?: GesteBrut[];
  /** ce que la vue retient après ces gestes */
  vue?: Partial<VueUltrasons>;
}

/** L'élève de test : il fait ce que le guide dit, jusqu'à « J'ai fini ». Un récepteur glissé avance d'un petit pas à chaque tour. */
function suis(r: ReglagesUltrasons, eleve: Eleve = {}): Suivi {
  let etat = rejoue(regles, r, eleve.avant ?? []);
  const gestes: GesteBrut[] = [...(eleve.avant ?? [])];
  let vue: VueUltrasons = { curseurs: [2, 7], carnet: "ferme", ...eleve.vue };
  const cles: string[] = [];
  const agit = (g: GesteBrut) => { const suite = regles.geste(r, etat, g); if (suite !== etat) { etat = suite; gestes.push(g); } };
  /** un petit déplacement du récepteur : quatre dixièmes de millimètre à la main, un dixième à la molette de réglage fin */
  const glisse = (p: PasDuGuide) => { if (p.geste === "glisser") agit({ g: "glisser", x: dixieme(Math.max(RAIL.min, Math.min(RAIL.max, etat.x + p.sens * (p.quoi === "mobile" ? 0.4 : 0.1)))) }); };
  let dernier: PasDuGuide | null = null;
  for (let tour = 0; tour < 6000; tour++) {
    const p = prochain(r, etat, vue);
    entendues.add(p.texte);
    if (p.cle !== dernier?.cle) {
      cles.push(p.cle);
      // une nouvelle consigne : l'élève met un peu de temps à réagir, et continue son geste
      if (dernier?.geste === "glisser") for (let i = 0; i < (eleve.retard ?? 0); i++) glisse(dernier);
      dernier = p;
      if (prochain(r, etat, vue).cle !== p.cle) continue;
    }
    switch (p.geste) {
      case "cable": agit({ g: "relier", a: p.de, b: p.vers }); break;
      case "decabler": agit({ g: "retirer", a: p.a, b: p.b }); break;
      case "tourner": {
        // la molette tourne d'un cran à la fois
        const rang = p.molette === "base" ? etat.base : etat.calibres[p.molette === "voie1" ? 0 : 1];
        const suite = rang + Math.sign(p.vers - rang);
        agit(p.molette === "base" ? { g: "base", v: suite } : { g: "calibre", voie: p.molette === "voie1" ? 1 : 2, v: suite });
        break;
      }
      case "curseur": {
        const place = Math.round(p.vers * 50) / 50;
        vue = { ...vue, curseurs: p.lequel === 0 ? [place, vue.curseurs[1]] : [vue.curseurs[0], place] };
        break;
      }
      case "glisser": glisse(p); break;
      case "amener": agit({ g: "glisser", x: p.vers }); break;
      case "bouton":
        if (p.bouton === "fini") return { etat, gestes, cles, fini: true };
        vue = { ...vue, carnet: p.bouton === "carnet" ? "ouvert" : "ferme" };
        break;
      case "ligne": vue = { ...vue, carnet: p.ligne }; break;
      case "ecrire": {
        // il lit l'écran ou la loupe comme un élève soigneux, calcule, et note
        const periodes = periodesEntreCurseurs(r, etat, vue.curseurs) ?? 1;
        const lu = p.ligne === "periode" ? dixieme((Math.abs(vue.curseurs[1] - vue.curseurs[0]) * BASES[etat.base]) / periodes)
          : p.ligne === "nombre" ? Math.round(Math.abs((etat.arrivee?.x ?? 0) - (etat.depart?.x ?? 0)) / longueurOnde(r))
          : Math.round(etat.x * 2) / 20;
        agit({ g: "noter", quoi: p.ligne, v: lu });
        vue = { ...vue, carnet: "ferme" };
        break;
      }
      case "attendre": vue = { ...vue, carnet: "ouvert" }; break;
    }
  }
  return { etat, gestes, cles, fini: false };
}

const fautes = (r: ReglagesUltrasons, etat: EtatUltrasons) => regles.bilan(r, etat).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);

describe("l'élève qui suit le guide des ultrasons", () => {
  it("la manipulation est sans faute, pour chaque graine", () => {
    for (const graine of GRAINES) {
      const r = reglages(graine);
      const s = suis(r);
      expect(s.fini, `graine ${graine} : le guide s'arrête sur ${s.cles.slice(-3).join(", ")}`).toBe(true);
      expect(fautes(r, s.etat), `graine ${graine}`).toEqual([]);
      expect(regles.bilan(r, s.etat).score).toBe(1);
      // la mesure est celle d'une manipulation soignée : dix longueurs d'onde, une période à 2 % près
      const m = regles.bilan(r, s.etat).mesures;
      expect(m.n).toBe(10);
      expect(Math.abs(m.T - periode(r)) / periode(r)).toBeLessThan(0.02);
      expect(Math.abs((m.x1 - m.x0) * 10 - 10 * longueurOnde(r))).toBeLessThan(0.8);
      // rejouée par le serveur, la liste des gestes redonne le même état
      expect(rejoue(regles, r, s.gestes)).toEqual(s.etat);
    }
  });
  it("un élève qui réagit avec un peu de retard reste sans faute", () => {
    for (const graine of GRAINES.slice(0, 4)) {
      const r = reglages(graine);
      const s = suis(r, { retard: 3 });
      expect(s.fini, `graine ${graine} : ${s.cles.slice(-3).join(", ")}`).toBe(true);
      expect(fautes(r, s.etat), `graine ${graine}`).toEqual([]);
    }
  });
  it("le guide suit l'ordre du protocole, et montre chaque étape", () => {
    const r = reglages(1);
    const { cles, gestes } = suis(r);
    const attendues = ["cable-emetteur", "cable-fixe", "cable-mobile", "sensibilite-1", "sensibilite-2", "base", "periode-curseur-a", "periode-curseur-b", "periode-carnet", "periode-ligne", "periode-ecrire",
      "depart-gauche", "depart-fin", "depart-carnet", "depart-ligne", "depart-ecrire", "arrivee-glisser", "arrivee-fin", "arrivee-carnet", "arrivee-ligne", "arrivee-ecrire", "nombre-carnet", "nombre-ligne", "nombre-ecrire", "fini"];
    expect(cles).toEqual(attendues);
    // le rang de l'étape du protocole ne recule jamais, et reste dans le protocole
    const protocole = paillasse(1).protocole;
    let etat = regles.depart(r);
    let rang = 0;
    for (const g of gestes) {
      etat = regles.geste(r, etat, g);
      const e = prochain(r, etat, { curseurs: [2, 7], carnet: "ferme" }).etape;
      expect(e).toBeLessThan(protocole.length);
      expect(e).toBeGreaterThanOrEqual(rang);
      rang = e;
    }
    expect(rang).toBe(protocole.length - 1);
  });
  it("pendant que le récepteur s'éloigne, la consigne ne change pas à chaque retour en phase", () => {
    const r = reglages(2);
    const { cles } = suis(r);
    expect(cles.filter((c) => c === "arrivee-glisser").length).toBe(1);
    expect(cles.filter((c) => c === "arrivee-carnet").length).toBe(1);
  });
  it("le guide dit le geste, jamais la mesure : ni la période, ni une graduation", () => {
    const r = reglages(1);
    const s = suis(r);
    let etat = regles.depart(r);
    const textes = new Set<string>();
    for (const g of s.gestes) {
      etat = regles.geste(r, etat, g);
      for (const carnet of ["ferme", "ouvert", "periode", "depart", "arrivee"] as const) textes.add(prochain(r, etat, { curseurs: [2, 7], carnet }).texte);
    }
    // aucune valeur chiffrée avec son unité : ni période, ni graduation, ni écart
    for (const texte of textes) expect(texte, texte).not.toMatch(/\d[\d,]*\s?(µs|cm|mm|div|V|Hz)/);
    // et des phrases courtes : trois lignes au plus sur un téléphone
    for (const texte of textes) expect(texte.length, texte).toBeLessThanOrEqual(126);
  });
  it("la sensibilité du récepteur mobile convient d'un bout à l'autre du rail : le guide n'y revient pas pendant le déplacement", () => {
    for (const graine of GRAINES) {
      const r = reglages(graine);
      const s = suis(r);
      expect(s.cles.filter((c) => c.startsWith("sensibilite")).length, `graine ${graine}`).toBe(2);
      for (const x of [RAIL.min, RAIL.max]) {
        const hauteur = amplitudeRecue(x) / CALIBRES[s.etat.calibres[1]];
        expect(hauteur).toBeGreaterThanOrEqual(1);
        expect(hauteur).toBeLessThanOrEqual(4);
      }
    }
    // un signal encore lisible ici, mais qui faiblira plus loin : le guide fait gagner un cran avant de partir
    const r = reglages(1);
    const etat = rejoue(regles, r, [{ g: "relier", a: "gen", b: "em" }, { g: "relier", a: "r1", b: "y1" }, { g: "relier", a: "r2", b: "y2" }, { g: "calibre", voie: 1, v: 2 }, { g: "calibre", voie: 2, v: 3 }]);
    expect(prochain(r, etat, { curseurs: [2, 7], carnet: "ferme" })).toMatchObject({ cle: "sensibilite-2", geste: "tourner", molette: "voie2", vers: 2 });
    expect(prochain(r, etat, { curseurs: [2, 7], carnet: "ferme" }).texte).toContain("faiblira");
    // et un signal qui tient ici, loin de l'émetteur, mais sortirait de l'écran au retour
    const loin = rejoue(regles, r, [{ g: "relier", a: "gen", b: "em" }, { g: "relier", a: "r1", b: "y1" }, { g: "relier", a: "r2", b: "y2" }, { g: "calibre", voie: 1, v: 2 }, { g: "calibre", voie: 2, v: 1 }, { g: "glisser", x: 124 }]);
    expect(prochain(r, loin, { curseurs: [2, 7], carnet: "ferme" })).toMatchObject({ cle: "sensibilite-2", vers: 2 });
    expect(prochain(r, loin, { curseurs: [2, 7], carnet: "ferme" }).texte).toContain("sortira");
  });
});

describe("les phrases du guide", () => {
  it("un guillemet ou un deux-points ne se retrouve jamais seul au bout d'une ligne", () => {
    expect(insecable("Touche « J'ai fini » pour appeler le professeur.")).toBe("Touche «\u00a0J'ai fini\u00a0» pour appeler le professeur.");
    expect(insecable("Presque : encore un peu ; tu y es ? Oui !")).toBe("Presque\u00a0: encore un peu\u00a0; tu y es\u00a0? Oui\u00a0!");
    expect(prochain(reglages(1), regles.depart(reglages(1)), { curseurs: [2, 7], carnet: "ferme" }).texte).toContain("l'émetteur E\u00a0: pose le doigt");
  });
});

describe("les réglages que vise le guide", () => {
  const r = reglages(1);
  it("une sensibilité qui garde le signal dans l'écran, sur plusieurs divisions", () => {
    expect(calibreVise(0.14)).toBe(2);   // 50 mV par division : 2,8 divisions
    expect(calibreVise(0.079)).toBe(2);  // 1,6 division
    expect(calibreVise(2.5)).toBe(6);    // la sortie GÉN : 1 V par division
    expect(calibreVise(50)).toBe(8);
  });
  it("une base de temps qui montre trois ou quatre périodes", () => {
    for (const graine of GRAINES) {
      const vues = (10 * BASES[baseVisee(reglages(graine))]) / periode(reglages(graine));
      expect(vues).toBeGreaterThan(3.5);
      expect(vues).toBeLessThanOrEqual(4.5);
    }
  });
  it("les curseurs mesurent un nombre entier de périodes quand ils sont sur deux sommets de la voie 1", () => {
    const etat = rejoue(regles, r, [{ g: "relier", a: "gen", b: "em" }, { g: "relier", a: "r1", b: "y1" }, { g: "relier", a: "r2", b: "y2" }, { g: "base", v: 3 }]);
    const sommets = sommetsVisibles(r, etat);
    expect(sommets.length).toBe(4);
    expect(sommets[1] - sommets[0]).toBeCloseTo(periode(r) / 10, 9);
    expect(periodesEntreCurseurs(r, etat, [sommets[0], sommets[3]])).toBe(3);
    expect(periodesEntreCurseurs(r, etat, [sommets[2], sommets[1]])).toBe(1);
    expect(periodesEntreCurseurs(r, etat, [sommets[0], sommets[0]])).toBeNull();
    expect(periodesEntreCurseurs(r, etat, [sommets[0], sommets[3] + 0.2])).toBeNull();
    // deux passages par zéro sont bien à une période l'un de l'autre, mais ce ne sont pas des sommets
    expect(periodesEntreCurseurs(r, etat, [sommets[0] + 0.6, sommets[1] + 0.6])).toBeNull();
  });
});

describe("le guide rattrape une manipulation mal partie", () => {
  const r = reglages(3);
  const montage: GesteBrut[] = [{ g: "relier", a: "gen", b: "em" }, { g: "relier", a: "r1", b: "y1" }, { g: "relier", a: "r2", b: "y2" }];
  const reglage: GesteBrut[] = [{ g: "calibre", voie: 1, v: 2 }, { g: "calibre", voie: 2, v: 2 }, { g: "base", v: 3 }];
  it("des câbles mal placés : il les fait retirer, puis poser les bons", () => {
    const s = suis(r, { avant: [{ g: "relier", a: "gen", b: "y1" }, { g: "relier", a: "r1", b: "r2" }] });
    expect(s.cles.slice(0, 5)).toEqual(["cable-retirer-gen-y1", "cable-retirer-r1-r2", "cable-emetteur", "cable-fixe", "cable-mobile"]);
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("un montage différent mais juste (les récepteurs échangés entre les voies) : il le garde", () => {
    const s = suis(r, { avant: [{ g: "relier", a: "gen", b: "em" }, { g: "relier", a: "r1", b: "y2" }, { g: "relier", a: "r2", b: "y1" }] });
    expect(s.cles[0]).toBe("sensibilite-1");
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("une période notée de travers, ou sur un écran mal réglé : il la fait reprendre", () => {
    const fausse = suis(r, { avant: [...montage, ...reglage, { g: "noter", quoi: "periode", v: 50 }] });
    expect(fausse.cles.slice(0, 3)).toEqual(["periode-curseur-a", "periode-curseur-b", "periode-carnet"]);
    expect(prochain(r, rejoue(regles, r, [...montage, ...reglage, { g: "noter", quoi: "periode", v: 50 }]), { curseurs: [2, 7], carnet: "ferme" }).texte).toContain("à reprendre");
    expect(fautes(r, fausse.etat)).toEqual([]);
    const illisible = suis(r, { avant: [...montage, { g: "noter", quoi: "periode", v: 25 }] });
    expect(illisible.cles).toContain("periode-ecrire");
    expect(fautes(r, illisible.etat)).toEqual([]);
  });
  it("un récepteur parti trop loin : il le fait ramener au début du rail", () => {
    const s = suis(r, { avant: [...montage, { g: "glisser", x: 110 }] });
    expect(s.cles).toContain("depart-reculer");
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("une position de départ notée hors phase, mal lue, ou trop loin : il dit ce qui ne va pas, et la fait reprendre", () => {
    const debut = premiereCoincidence(r);
    const mesuree: GesteBrut[] = [...montage, ...reglage, { g: "noter", quoi: "periode", v: dixieme(periode(r)) }];
    const vue: VueUltrasons = { curseurs: [2, 7], carnet: "ferme" };
    const pasHorsPhase: GesteBrut[] = [...mesuree, { g: "glisser", x: dixieme(debut + 3) }, { g: "noter", quoi: "depart", v: (debut + 3) / 10 }];
    expect(prochain(r, rejoue(regles, r, pasHorsPhase), vue).texte).toMatch(/^Ta position de départ n'était pas en phase\. Fais glisser lentement R2 vers la gauche/);
    const horsPhase = suis(r, { avant: pasHorsPhase });
    expect(horsPhase.cles[0]).toBe("depart-gauche");
    expect(fautes(r, horsPhase.etat)).toEqual([]);
    const pasMalLue: GesteBrut[] = [...mesuree, { g: "glisser", x: dixieme(debut) }, { g: "noter", quoi: "depart", v: debut / 10 + 0.3 }];
    expect(prochain(r, rejoue(regles, r, pasMalLue), vue).texte).toMatch(/^Ta position de départ est mal lue\. Ne touche pas à R2/);
    const malLue = suis(r, { avant: pasMalLue });
    expect(malLue.cles[0]).toBe("depart-carnet");
    expect(fautes(r, malLue.etat)).toEqual([]);
    // en phase et bien lue, mais au bout du rail : il ne reste pas la place de compter
    const loin = dixieme(debut + 11 * longueurOnde(r));
    const pasTropLoin: GesteBrut[] = [...mesuree, { g: "glisser", x: loin }, { g: "noter", quoi: "depart", v: loin / 10 }];
    expect(prochain(r, rejoue(regles, r, pasTropLoin), vue).texte).toMatch(/^Ta position de départ est trop loin sur le rail\. Ramène R2 au début du rail/);
    const tropLoin = suis(r, { avant: pasTropLoin });
    expect(tropLoin.cles[0]).toBe("depart-reculer");
    expect(fautes(r, tropLoin.etat)).toEqual([]);
  });
  it("une position d'arrivée notée hors phase, mal lue, ou trop près du départ : il dit ce qui ne va pas, et la fait reprendre", () => {
    const debut = dixieme(premiereCoincidence(r));
    const parti: GesteBrut[] = [...montage, ...reglage, { g: "noter", quoi: "periode", v: dixieme(periode(r)) }, { g: "glisser", x: debut }, { g: "noter", quoi: "depart", v: debut / 10 }];
    const vue: VueUltrasons = { curseurs: [2, 7], carnet: "ferme" };
    const fin = dixieme(debut + 10 * longueurOnde(r));
    const cas: [GesteBrut[], RegExp, string][] = [
      [[{ g: "glisser", x: dixieme(fin - 2.5) }, { g: "noter", quoi: "arrivee", v: (fin - 2.5) / 10 }], /^Ta position d'arrivée n'était pas en phase\. Éloigne lentement R2 en comptant/, "arrivee-glisser"],
      [[{ g: "glisser", x: fin }, { g: "noter", quoi: "arrivee", v: fin / 10 - 0.4 }], /^Ta position d'arrivée est mal lue\. Ne touche pas à R2/, "arrivee-carnet"],
      [[{ g: "glisser", x: dixieme(debut + 2 * longueurOnde(r)) }, { g: "noter", quoi: "arrivee", v: dixieme(debut + 2 * longueurOnde(r)) / 10 }], /^Ta position d'arrivée est trop près du départ\. Éloigne lentement R2 en comptant/, "arrivee-glisser"],
    ];
    for (const [gestes, phrase, cle] of cas) {
      expect(prochain(r, rejoue(regles, r, [...parti, ...gestes]), vue).texte).toMatch(phrase);
      const s = suis(r, { avant: [...parti, ...gestes] });
      expect(s.cles[0]).toBe(cle);
      expect(s.fini).toBe(true);
      expect(fautes(r, s.etat)).toEqual([]);
      expect(s.etat.nombre).toBe(10);
    }
  });
  it("un dixième retour en phase dépassé : il fait revenir en arrière ; un nombre mal compté : il le fait corriger", () => {
    const debut = dixieme(premiereCoincidence(r));
    const avant: GesteBrut[] = [...montage, ...reglage, { g: "noter", quoi: "periode", v: dixieme(periode(r)) }, { g: "glisser", x: debut }, { g: "noter", quoi: "depart", v: debut / 10 }];
    const depasse = suis(r, { avant: [...avant, { g: "glisser", x: dixieme(debut + 11.4 * longueurOnde(r)) }] });
    expect(depasse.cles[0]).toBe("arrivee-revenir");
    expect(fautes(r, depasse.etat)).toEqual([]);
    const fin = dixieme(debut + 10 * longueurOnde(r));
    const malCompte = suis(r, { avant: [...avant, { g: "glisser", x: fin }, { g: "noter", quoi: "arrivee", v: fin / 10 }, { g: "noter", quoi: "nombre", v: 9 }] });
    expect(malCompte.cles).toEqual(["nombre-carnet", "nombre-ligne", "nombre-ecrire", "fini"]);
    expect(malCompte.etat.nombre).toBe(10);
  });
  it("un carnet ouvert trop tôt, ou sur la mauvaise ligne : il le fait refermer", () => {
    const etat = regles.depart(r);
    expect(prochain(r, etat, { curseurs: [2, 7], carnet: "ouvert" })).toMatchObject({ cle: "carnet-fermer", geste: "bouton", bouton: "fermer" });
    expect(prochain(r, etat, { curseurs: [2, 7], carnet: "depart" }).cle).toBe("carnet-annuler");
    const s = suis(r, { vue: { carnet: "nombre" } });
    expect(s.cles.slice(0, 3)).toEqual(["carnet-annuler", "carnet-fermer", "cable-emetteur"]);
    expect(s.fini).toBe(true);
  });
  it("le décalage du récepteur mobile change de signe de part et d'autre d'une position en phase", () => {
    const debut = premiereCoincidence(r);
    const en = (x: number) => decalageDuMobile(r, rejoue(regles, r, [...montage, { g: "glisser", x }]))!;
    expect(en(debut + 2)).toBeGreaterThan(0.15);
    expect(en(debut + longueurOnde(r) - 2)).toBeLessThan(-0.15);
    expect(decalageDuMobile(r, regles.depart(r))).toBeNull();
    // les récepteurs échangés entre les voies : le décalage garde son sens
    expect(decalageDuMobile(r, rejoue(regles, r, [{ g: "relier", a: "gen", b: "em" }, { g: "relier", a: "r1", b: "y2" }, { g: "relier", a: "r2", b: "y1" }, { g: "glisser", x: dixieme(debut + 2) }]))).toBeGreaterThan(0.15);
  });
});

describe("toutes les phrases du guide, entendues dans les essais de ce fichier", () => {
  it("sont courtes (trois lignes au plus sur un téléphone) et ne soufflent aucune valeur", () => {
    expect(entendues.size).toBeGreaterThan(45);
    for (const texte of entendues) {
      expect(texte.length, texte).toBeLessThanOrEqual(126);
      expect(texte, texte).not.toMatch(/\d[\d,]*\s?(µs|cm|mm|div|V|Hz)/);
    }
  });
});

describe("la marque du guide", () => {
  it("le professeur plafonne une manipulation faite avec le guide, et le dit", async () => {
    const etape = paillasse(1);
    const { gestes } = suis(etape.paillasse.reglages as ReglagesUltrasons);
    const trouve = async () => regles;
    const seul = await verifie(etape, { g: "paillasse", gestes }, {}, 1, trouve);
    const aide = await verifie(etape, { g: "paillasse", gestes: avecMarqueDuGuide(gestes) }, {}, 1, trouve);
    expect(seul?.retour).toMatchObject({ score: 1, correction: { genre: "paillasse", fautes: [] } });
    expect(aide?.retour).toMatchObject({ score: PLAFOND_AVEC_GUIDE, correction: { genre: "paillasse", fautes: [], guide: true } });
    expect(aide?.mesures).toEqual(seul?.mesures);
  });
});
