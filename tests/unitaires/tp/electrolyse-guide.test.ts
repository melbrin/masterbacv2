// Le guide de la paillasse Électrolyse (lib/commun/tp/paillasses/electrolyse-guide.ts). Un élève de test fait, sans
// réfléchir, exactement ce que le guide lui dit, pendant que le temps du laboratoire passe comme dans la vue : la
// manipulation qu'il obtient doit être sans faute, pour chaque graine, même s'il est lent. Le guide est donc complet,
// dans le bon ordre, et il ne tourne jamais en rond.
import { describe, expect, it } from "vitest";
import { nombre } from "@/lib/commun/format";
import { amperemetre, balance, chronometre, maintenant, masseDe, montage, regles, type EtatElectrolyse, type ReglagesElectrolyse } from "@/lib/commun/tp/paillasses/electrolyse";
import { ajoute, effet, nomBorne, pose, prochain, serie, tensionVoulue, vitesse, type PasDuGuide, type VueElectrolyse } from "@/lib/commun/tp/paillasses/electrolyse-guide";
import { PLAFOND_AVEC_GUIDE, avecMarqueDuGuide, rejoue, type GesteBrut, type ReglesPaillasse } from "@/lib/commun/tp/types";
import electrolyse from "@/lib/serveur/contenu/tp/electrolyse";
import { verifie } from "@/lib/serveur/tp";
import { GRAINES, type EtapeDePaillasse } from "../../outils/tp";

/** L'étape de paillasse du TP, pour une graine. Le TP est en construction : le test donne ses règles au serveur. */
function paillasse(graine: number): EtapeDePaillasse {
  const etape = electrolyse.etapes(graine).find((e) => e.genre === "paillasse");
  if (!etape || etape.genre !== "paillasse") throw new Error("pas de paillasse dans le TP");
  return etape;
}
const reglages = (graine: number) => paillasse(graine).paillasse.reglages as ReglagesElectrolyse;
const sesRegles = async () => regles as unknown as ReglesPaillasse<unknown, unknown>;
const r2 = (x: number) => Math.round(x * 100) / 100;

interface Suivi { etat: EtatElectrolyse; gestes: GesteBrut[]; cles: string[]; etapes: number[]; fini: boolean; recommences: number }
/** Un élève : ses temps sont en dixièmes de seconde, du vrai temps. */
interface Eleve {
  /** le temps qu'il met à lire une nouvelle consigne avant d'agir */
  retard?: number;
  /** le temps pendant lequel il garde encore le doigt sur « Avance rapide » */
  retardAppui?: number;
  /** la durée d'un geste : glisser un objet, tirer un fil, toucher une touche, tourner la molette */
  lenteur?: number;
  /** de combien de volts sa main dépasse la cible, la première fois qu'il tourne la molette */
  maladresse?: number;
  /** des gestes faits avant d'écouter le guide */
  avant?: GesteBrut[];
  /** ce que la vue retient après ces gestes */
  vue?: VueElectrolyse;
}

/**
 * L'élève de test : il fait ce que le guide dit, jusqu'à « J'ai fini ». Le temps du laboratoire passe comme dans la vue :
 * il s'accumule, et s'inscrit avant chaque geste ; il s'arrête pendant qu'on écrit une lecture.
 */
function suis(r: ReglagesElectrolyse, eleve: Eleve = {}): Suivi {
  let partie = { etat: rejoue(regles, r, eleve.avant ?? []), gestes: [...(eleve.avant ?? [])], attente: 0 };
  let vue: VueElectrolyse = eleve.vue ?? { saisie: null };
  let rapide = false;
  let maladresse = eleve.maladresse ?? 0;
  let recommences = 0;
  const cles: string[] = [], etapes: number[] = [];
  const vu = () => (partie.attente > 0 ? regles.geste(r, partie.etat, { g: "attendre", v: partie.attente }) : partie.etat);
  const applique = (g: GesteBrut) => { const suite = regles.geste(r, partie.etat, g); if (suite !== partie.etat) partie = { ...partie, etat: suite, gestes: ajoute(partie.gestes, g) }; };
  const inscrit = () => { if (partie.attente > 0) { applique({ g: "attendre", v: partie.attente }); partie = { ...partie, attente: 0 }; } };
  const agit = (g: GesteBrut) => { inscrit(); applique(g); };
  /** le temps passe, s'il a de quoi passer : au rythme du vrai, ou en avance rapide */
  const passe = (dixiemes: number) => {
    for (let i = 0; i < dixiemes && vue.saisie === null; i++) {
      partie = { ...partie, attente: r2(partie.attente + 0.1 * vitesse(r, vu(), rapide)) };
      if (partie.attente >= 600) inscrit();
    }
  };
  const lenteur = eleve.lenteur ?? 8;
  let dernier: PasDuGuide | null = null;
  for (let tour = 0; tour < 6000; tour++) {
    const p = prochain(r, vu(), vue);
    if (p.cle !== dernier?.cle) {
      cles.push(p.cle);
      etapes.push(p.etape);
      // une nouvelle consigne : le doigt reste encore un peu sur « Avance rapide », puis l'élève lit
      if (dernier?.geste === "maintenir") { passe(eleve.retardAppui ?? 0); rapide = false; }
      passe(eleve.retard ?? 0);
      dernier = p;
      if (prochain(r, vu(), vue).cle !== p.cle) continue;
    }
    switch (p.geste) {
      case "glisser": passe(lenteur); pose(r, vu(), p.objet, p.cible).gestes.forEach(agit); break;
      case "fil": passe(lenteur); agit({ g: "relier", a: p.de, b: p.vers }); break;
      case "retirer": passe(lenteur); agit({ g: "retirer", a: p.a, b: p.b }); break;
      case "toucher":
        passe(lenteur);
        agit(p.touche === "interrupteur" ? { g: "interrupteur", ferme: !vu().ferme } : p.touche === "chrono" ? { g: "chrono", marche: !vu().chrono.marche } : { g: p.touche });
        break;
      case "tourner": {
        // la molette passe par les tensions intermédiaires : le courant change pendant le geste
        const de = vu().tension, vers = p.vers + maladresse;
        maladresse = 0;
        for (let i = 1; i <= 4; i++) { passe(lenteur / 4); agit({ g: "tension", v: Math.round((de + ((vers - de) * i) / 4) * 10) / 10 }); }
        break;
      }
      case "maintenir": rapide = true; passe(1); break;
      case "montrer": {
        // il lit l'écran de l'appareil, puis il note
        const lue = p.quoi === "balance" ? balance(r, vu()) : p.quoi === "amperemetre" ? Math.abs(amperemetre(r, vu())) : chronometre(vu());
        agit({ g: "noter", quoi: p.quoi === "balance" ? "masse" : p.quoi === "amperemetre" ? "intensite" : "duree", v: lue });
        vue = { saisie: null };
        break;
      }
      case "bouton":
        if (p.bouton === "fini") { inscrit(); return { etat: partie.etat, gestes: partie.gestes, cles, etapes, fini: true, recommences }; }
        if (p.bouton === "recommencer") { partie = { etat: regles.depart(r), gestes: [], attente: 0 }; vue = { saisie: null }; rapide = false; recommences++; }
        else if (p.bouton === "noter") { passe(lenteur); vue = { saisie: "choix" }; }
        else if (p.bouton === "annuler") vue = { saisie: null };
        else vue = { saisie: p.bouton };
        break;
    }
  }
  inscrit();
  return { etat: partie.etat, gestes: partie.gestes, cles, etapes, fini: false, recommences };
}

const fautes = (r: ReglagesElectrolyse, etat: EtatElectrolyse) => regles.bilan(r, etat).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);
const attendre = (v: number): GesteBrut => ({ g: "attendre", v });
const relier = (a: string, b: string): GesteBrut => ({ g: "relier", a, b });
const plaque = (p: string, ou: string): GesteBrut => ({ g: "plaque", p, ou });
const libre: VueElectrolyse = { saisie: null };

describe("l'élève qui suit le guide de l'électrolyse", () => {
  it("la manipulation est sans faute, pour chaque graine", () => {
    for (const graine of GRAINES) {
      const r = reglages(graine);
      const s = suis(r);
      expect(s.fini, `graine ${graine} : le guide s'arrête sur ${s.cles.slice(-3).join(", ")}`).toBe(true);
      expect(fautes(r, s.etat), `graine ${graine}`).toEqual([]);
      const bilan = regles.bilan(r, s.etat);
      expect(bilan.score).toBe(1);
      // la plaque 1 a reçu le dépôt que prévoit la charge qui a circulé ; l'intensité et la durée sont celles du sujet
      const passage = maintenant(r, s.etat);
      expect(bilan.mesures.m1).toBe(r.electrodes[0].masse);
      expect(bilan.mesures.m2 - bilan.mesures.m1).toBeCloseTo(masseDe(passage.charge), 3);
      expect(Math.abs(bilan.mesures.I - r.intensite)).toBeLessThanOrEqual(0.06 * r.intensite);
      expect(Math.abs(bilan.mesures.dt - r.duree)).toBeLessThanOrEqual(10);
      expect(Math.abs(bilan.mesures.dt - passage.duree)).toBeLessThanOrEqual(5);
      // rejouée par le serveur, la liste des gestes redonne le même état ; elle reste courte
      expect(rejoue(regles, r, s.gestes)).toEqual(s.etat);
      expect(s.gestes.length).toBeLessThan(80);
      expect(s.recommences).toBe(0);
    }
  });
  it("un élève lent ou maladroit reste sans faute : la main qui va de l'interrupteur au chronomètre a le temps", () => {
    // deux secondes pour lire chaque consigne et trois par geste ; puis cinq secondes pour lire ; puis une molette tournée trop loin
    for (const eleve of [{ retard: 20, lenteur: 30, retardAppui: 5 }, { retard: 50, lenteur: 30, retardAppui: 10 }, { retard: 10, lenteur: 12, retardAppui: 3, maladresse: 1.4 }]) {
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
    expect(cles).toEqual(["peser", "noter-masse", "choisir-masse", "lire-masse", "plonger-p1", "plonger-p2", "fil-g+-k1", "fil-k2-a", "fil-com-p2", "fil-p1-g-",
      "fermer", "chrono", "regler", "noter-intensite", "choisir-intensite", "lire-intensite", "avancer", "couper", "arreter", "noter-duree", "choisir-duree", "lire-duree",
      "retirer-p1-g-", "sortir", "rincer", "secher", "peser", "noter-masse", "choisir-masse", "lire-masse", "fini"]);
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
      for (const saisie of [null, "choix", "masse", "intensite", "duree"] as const) phrases.add(prochain(r, etat, { saisie }).texte);
    }
    expect(phrases.size).toBeGreaterThan(20);
    for (const phrase of phrases) {
      // les seules valeurs dites sont celles du sujet : l'intensité à régler, la durée à attendre ; jamais une lecture
      expect(/\d,\d/.test(phrase.replace(`${nombre(r.intensite, 2)} A`, "")), phrase).toBe(false);
      expect(/[—–]/.test(phrase), phrase).toBe(false);
      expect(/\b(vous|votre|vos)\b/i.test(phrase), phrase).toBe(false);
    }
  });
  it("une consigne ne clignote pas : pendant que la molette tourne, pendant que le temps file", () => {
    const r = reglages(1);
    const sans = (cles: string[]) => cles.filter((c, i) => c !== cles[i - 1]);
    const pret: GesteBrut[] = [plaque("p1", "balance"), { g: "noter", quoi: "masse", v: r.electrodes[0].masse }, plaque("p1", "cuve"), plaque("p2", "cuve"), ...serie(r).map(([a, b]) => relier(a, b)),
      { g: "interrupteur", ferme: true }, { g: "chrono", marche: true }];
    // la tension monte de zéro à son maximum, un dixième de volt à la fois : régler, noter, puis de nouveau régler
    let etat = rejoue(regles, r, pret);
    const monte: string[] = [];
    for (let v = 0.1; v <= 12; v = Math.round((v + 0.1) * 10) / 10) { etat = regles.geste(r, etat, { g: "tension", v }); monte.push(prochain(r, etat, libre).cle); }
    expect(sans(monte)).toEqual(["regler", "noter-intensite", "regler"]);
    // le temps file : avancer, puis couper le courant
    etat = rejoue(regles, r, [...pret, { g: "tension", v: tensionVoulue(r) }, { g: "noter", quoi: "intensite", v: r.intensite }]);
    const file: string[] = [];
    for (let i = 0; i < 400; i++) { etat = regles.geste(r, etat, attendre(4)); file.push(prochain(r, etat, libre).cle); }
    expect(sans(file)).toEqual(["avancer", "couper"]);
  });
});

describe("le guide rattrape une manipulation mal partie", () => {
  const r = reglages(1);
  const [p1, p2] = r.electrodes.map((e) => e.id);
  const pesee: GesteBrut[] = [plaque(p1, "balance"), { g: "noter", quoi: "masse", v: r.electrodes[0].masse }];
  const montee: GesteBrut[] = [...pesee, plaque(p1, "cuve"), plaque(p2, "cuve"), ...serie(r).map(([a, b]) => relier(a, b))];
  const lancee: GesteBrut[] = [...montee, { g: "interrupteur", ferme: true }, { g: "chrono", marche: true }, { g: "tension", v: tensionVoulue(r) }, { g: "noter", quoi: "intensite", v: r.intensite }];
  const rattrape = (avant: GesteBrut[], vue?: VueElectrolyse) => {
    const s = suis(r, { avant, vue });
    expect(s.fini, s.cles.slice(-3).join(", ")).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
    expect(rejoue(regles, r, s.gestes)).toEqual(s.etat);
    return s;
  };
  it("les plaques plongées avant la pesée : il fait sortir la plaque 1, la rincer, la sécher, puis la peser", () => {
    expect(rattrape([plaque(p1, "cuve"), plaque(p2, "cuve"), relier(p1, "g-")]).cles.slice(0, 6)).toEqual(["retirer-p1-g-", "sortir", "rincer", "secher", "peser", "noter-masse"]);
    // séchée sans être rincée : des cristaux restent, il la fait rincer
    expect(rattrape([plaque(p1, "cuve"), plaque(p1, "support"), { g: "secher", p: p1 }]).cles.slice(0, 3)).toEqual(["rincer", "secher", "peser"]);
  });
  it("une balance pas à zéro, ou prise par l'autre plaque : il fait reposer, toucher « Tare », libérer", () => {
    expect(rattrape([plaque(p1, "balance"), { g: "tare" }]).cles.slice(0, 4)).toEqual(["reposer", "tare", "peser", "noter-masse"]);
    expect(rattrape([plaque(p2, "balance")]).cles.slice(0, 2)).toEqual(["liberer", "peser"]);
    // pesée mouillée : la note ne vaut rien, il fait reposer la plaque et tout reprendre
    const mouillee: GesteBrut[] = [plaque(p1, "cuve"), plaque(p1, "balance"), { g: "noter", quoi: "masse", v: 24 }];
    expect(fautes(r, rejoue(regles, r, mouillee))).toContain("mouille!");
    expect(rattrape(mouillee).cles.slice(0, 4)).toEqual(["reposer", "rincer", "secher", "peser"]);
  });
  it("un montage à l'envers, un fil en trop, un interrupteur déjà fermé : il fait ouvrir, retirer, puis tirer les bons fils", () => {
    // la plaque 1 du côté de la borne +
    const envers: GesteBrut[] = [...pesee, plaque(p1, "cuve"), plaque(p2, "cuve"), relier("g+", "k1"), relier("k2", "a"), relier("com", p1), relier(p2, "g-")];
    expect(rattrape(envers).cles.slice(0, 4)).toEqual(["retirer-com-p1", "retirer-p2-g-", "fil-com-p2", "fil-p1-g-"]);
    // l'ampèremètre à l'envers, l'interrupteur fermé
    const amperemetre: GesteBrut[] = [...pesee, plaque(p1, "cuve"), plaque(p2, "cuve"), relier("g+", "k1"), relier("k2", "com"), relier("a", p2), relier(p1, "g-"), { g: "interrupteur", ferme: true }];
    expect(rattrape(amperemetre).cles.slice(0, 5)).toEqual(["ouvrir", "retirer-k2-com", "retirer-a-p2", "fil-k2-a", "fil-com-p2"]);
    // un fil qui met le générateur en court-circuit
    expect(rattrape([...montee, relier("g+", "g-")]).cles.slice(0, 2)).toEqual(["retirer-g+-g-", "fermer"]);
    // un autre montage en série, tout aussi juste, n'est pas défait : l'ampèremètre avant l'interrupteur
    const autre: GesteBrut[] = [...pesee, plaque(p1, "cuve"), plaque(p2, "cuve"), relier("g+", "a"), relier("com", "k1"), relier("k2", p2), relier(p1, "g-")];
    expect(rattrape(autre).cles[0]).toBe("fermer");
  });
  it("le courant a passé dans le mauvais sens, ou sans pesée de départ : il fait tout recommencer", () => {
    const envers: GesteBrut[] = [...pesee, plaque(p1, "cuve"), plaque(p2, "cuve"), relier("g+", "k1"), relier("k2", "a"), relier("com", p1), relier(p2, "g-"), { g: "interrupteur", ferme: true }, { g: "tension", v: 6 }, attendre(60)];
    expect(prochain(r, rejoue(regles, r, envers), libre)).toMatchObject({ cle: "recommencer", geste: "bouton", bouton: "recommencer" });
    expect(rattrape(envers).recommences).toBe(1);
    const sansPesee: GesteBrut[] = [plaque(p1, "cuve"), plaque(p2, "cuve"), ...serie(r).map(([a, b]) => relier(a, b)), { g: "interrupteur", ferme: true }, { g: "tension", v: 6 }, attendre(30)];
    expect(prochain(r, rejoue(regles, r, sansPesee), libre).texte).toContain("sa masse de départ est perdue");
    expect(rattrape(sansPesee).recommences).toBe(1);
    // l'ampèremètre à l'envers pendant que le courant passait
    const aLenvers: GesteBrut[] = [...pesee, plaque(p1, "cuve"), plaque(p2, "cuve"), relier("g+", "k1"), relier("k2", "com"), relier("a", p2), relier(p1, "g-"), { g: "interrupteur", ferme: true }, { g: "tension", v: 6 }, attendre(30)];
    expect(prochain(r, rejoue(regles, r, aLenvers), libre).texte).toContain("à l'envers");
    // l'électrolyse finie sans que l'intensité ait été notée
    const sansIntensite: GesteBrut[] = [...montee, { g: "interrupteur", ferme: true }, { g: "chrono", marche: true }, { g: "tension", v: tensionVoulue(r) }, attendre(r.duree), { g: "interrupteur", ferme: false }];
    expect(prochain(r, rejoue(regles, r, sansIntensite), libre).texte).toContain("l'intensité n'a pas été notée");
    expect(rattrape(sansIntensite).recommences).toBe(1);
  });
  it("un chronomètre parti bien avant le courant : il le fait remettre à zéro", () => {
    const avant: GesteBrut[] = [...montee, { g: "chrono", marche: true }, attendre(60), { g: "interrupteur", ferme: true }];
    expect(rattrape(avant).cles.slice(0, 2)).toEqual(["zero", "regler"]);
    // oublié : il le fait lancer ; arrêté en route : il le fait relancer
    expect(rattrape([...montee, { g: "interrupteur", ferme: true }]).cles[0]).toBe("chrono");
    expect(rattrape([...lancee, attendre(300), { g: "chrono", marche: false }, { g: "chrono", marche: true }]).cles[0]).toBe("avancer");
  });
  it("la molette retouchée, l'intensité notée avant le réglage, l'interrupteur ouvert trop tôt : il fait régler, noter, refermer", () => {
    expect(rattrape([...lancee, { g: "tension", v: 9 }]).cles.slice(0, 2)).toEqual(["regler", "avancer"]);
    const tot: GesteBrut[] = [...montee, { g: "interrupteur", ferme: true }, { g: "chrono", marche: true }, { g: "noter", quoi: "intensite", v: 0 }];
    expect(rattrape(tot).cles.slice(0, 4)).toEqual(["regler", "noter-intensite", "choisir-intensite", "lire-intensite"]);
    const coupee: GesteBrut[] = [...lancee, attendre(r.duree / 2), { g: "interrupteur", ferme: false }];
    const s = rattrape(coupee);
    expect(s.cles.slice(0, 3)).toEqual(["fermer", "avancer", "couper"]);
    expect(prochain(r, rejoue(regles, r, coupee), libre).texte).toContain("n'a pas assez duré");
  });
  it("la plaque pesée mouillée à la fin, ou la durée notée avant l'arrêt du chronomètre : il fait reprendre", () => {
    const finie: GesteBrut[] = [...lancee, attendre(r.duree), { g: "interrupteur", ferme: false }];
    // la durée notée chronomètre en marche : il le fait arrêter, puis noter de nouveau
    expect(rattrape([...finie, { g: "noter", quoi: "duree", v: r.duree }, attendre(5)]).cles.slice(0, 3)).toEqual(["arreter", "noter-duree", "choisir-duree"]);
    const notee: GesteBrut[] = [...finie, { g: "chrono", marche: false }, { g: "noter", quoi: "duree", v: r.duree }];
    // la plaque portée encore mouillée sur la balance, et pesée
    const mouillee: GesteBrut[] = [...notee, { g: "retirer", a: p1, b: "g-" }, plaque(p1, "balance"), { g: "noter", quoi: "masse", v: 24.6 }];
    expect(fautes(r, rejoue(regles, r, mouillee))).toContain("mouille!");
    expect(rattrape(mouillee).cles).toEqual(["reposer", "rincer", "secher", "peser", "noter-masse", "choisir-masse", "lire-masse", "fini"]);
  });
  it("une saisie ouverte : il fait lire l'appareil ; un choix ouvert au mauvais moment : il fait annuler", () => {
    const depart = regles.depart(r);
    expect(prochain(r, depart, { saisie: "choix" })).toMatchObject({ cle: "annuler", geste: "bouton", bouton: "annuler", etape: 0 });
    expect(rattrape([], { saisie: "choix" }).cles.slice(0, 2)).toEqual(["annuler", "peser"]);
    const surBalance = regles.geste(r, depart, plaque(p1, "balance"));
    expect(prochain(r, surBalance, { saisie: "choix" })).toMatchObject({ cle: "choisir-masse", bouton: "masse" });
    expect(prochain(r, surBalance, { saisie: "masse" })).toMatchObject({ cle: "lire-masse", geste: "montrer", quoi: "balance", etape: 0 });
    const enCours = rejoue(regles, r, [...lancee, attendre(10)]);
    expect(prochain(r, enCours, { saisie: "intensite" })).toMatchObject({ cle: "lire-intensite", quoi: "amperemetre", etape: 2 });
    expect(prochain(r, enCours, { saisie: "duree" })).toMatchObject({ cle: "lire-duree", quoi: "chronometre", etape: 3 });
    expect(prochain(r, enCours, { saisie: "masse" }).etape).toBe(5);
    expect(prochain(r, enCours, { saisie: "choix" }).cle).toBe("annuler");
  });
});

describe("poser un objet", () => {
  const r = reglages(1);
  const [p1, p2] = r.electrodes.map((e) => e.id);
  const depart = regles.depart(r);
  it("donne aux règles le geste qui convient, et dit ce qui s'est passé", () => {
    expect(pose(r, depart, `plaque-${p1}`, "balance")).toEqual({ gestes: [plaque(p1, "balance")], message: "La plaque 1 est sur le plateau de la balance." });
    expect(pose(r, depart, `plaque-${p1}`, `cuve-${p1}`)).toEqual({ gestes: [plaque(p1, "cuve")], message: "La plaque 1 trempe dans la solution de sulfate de cuivre." });
    const trempee = regles.geste(r, depart, plaque(p1, "cuve"));
    expect(pose(r, trempee, `plaque-${p1}`, `support-${p1}`)).toEqual({ gestes: [plaque(p1, "support")], message: "La plaque 1 est au support : elle est mouillée." });
    const sortie = regles.geste(r, trempee, plaque(p1, "support"));
    expect(pose(r, sortie, "pissette", `support-${p1}`)).toEqual({ gestes: [{ g: "rincer", p: p1 }], message: "Tu rinces la plaque 1 à l'eau distillée." });
    expect(pose(r, sortie, "seche", `support-${p1}`).message).toBe("Tu sèches la plaque 1. La solution laisse des cristaux bleus sur le cuivre.");
    const rincee = regles.geste(r, sortie, { g: "rincer", p: p1 });
    expect(pose(r, rincee, "seche", `support-${p1}`)).toEqual({ gestes: [{ g: "secher", p: p1 }], message: "Tu sèches la plaque 1." });
    expect(pose(r, regles.geste(r, depart, plaque(p1, "balance")), `plaque-${p1}`, `support-${p1}`).message).toBe("La plaque 1 est au support.");
  });
  it("un geste impossible ne donne rien aux règles, et la phrase dit pourquoi", () => {
    const cablee = rejoue(regles, r, [plaque(p1, "cuve"), relier(p1, "g-")]);
    expect(pose(r, cablee, `plaque-${p1}`, `support-${p1}`)).toEqual({ gestes: [], message: "Un fil est pincé sur la plaque 1 : ôte-le d'abord." });
    expect(pose(r, regles.geste(r, depart, plaque(p2, "balance")), `plaque-${p1}`, "balance")).toEqual({ gestes: [], message: "Il y a déjà une plaque sur la balance." });
    expect(pose(r, depart, `plaque-${p1}`, `support-${p1}`).message).toBe("La plaque 1 y est déjà.");
    expect(pose(r, depart, "pissette", `support-${p1}`).message).toBe("Tu rinces la plaque 1 à l'eau distillée.");
    expect(pose(r, regles.geste(r, depart, { g: "rincer", p: p1 }), "pissette", `support-${p1}`).message).toBe("La plaque 1 vient d'être rincée.");
    expect(pose(r, depart, "seche", `support-${p1}`).message).toBe("La plaque 1 est déjà sèche.");
    expect(pose(r, regles.geste(r, depart, plaque(p1, "cuve")), "pissette", `support-${p1}`).message).toContain("n'est pas au support");
    for (const [objet, cible] of [["licorne", "balance"], ["plaque-p9", "balance"], ["pissette", "support-p9"]]) expect(pose(r, depart, objet, cible)).toEqual({ gestes: [], message: "" });
  });
});

describe("le circuit, le temps du laboratoire, la liste des gestes", () => {
  const r = reglages(1);
  const [p1, p2] = r.electrodes.map((e) => e.id);
  const montee = rejoue(regles, r, [plaque(p1, "cuve"), plaque(p2, "cuve"), ...serie(r).map(([a, b]) => relier(a, b))]);
  it("le montage du protocole est un circuit en série, la plaque 1 à la cathode, l'ampèremètre dans le bon sens", () => {
    expect(montage(r, regles.geste(r, montee, { g: "interrupteur", ferme: true }))).toEqual({ etat: "serie", cathode: p1, amperemetre: 1, interrupteur: true });
    expect(tensionVoulue(r)).toBeCloseTo(r.intensite * r.resistance, 1);
    expect(["g+", "g-", "k1", "a", "com", p1].map((id) => nomBorne(r, id))).toEqual(["la borne + du générateur", "la borne − du générateur", "l'interrupteur", "la borne A de l'ampèremètre", "la borne COM de l'ampèremètre", "la plaque 1"]);
    expect(nomBorne(r, "inconnue")).toBe("la plaque");
  });
  it("la phrase dit ce que fait le circuit après un geste", () => {
    const ferme = regles.geste(r, montee, { g: "interrupteur", ferme: true });
    expect(effet(r, montee)).toBe("");
    expect(effet(r, ferme)).toContain("il reste à monter la tension");
    expect(effet(r, regles.geste(r, ferme, { g: "tension", v: 6 }))).toBe(" Le courant passe.");
    expect(effet(r, regles.geste(r, ferme, relier("g+", "g-")))).toContain("en sécurité");
    // l'ampèremètre branché aux deux plaques de la cuve, en dérivation
    const derivation = rejoue(regles, r, [plaque(p1, "cuve"), plaque(p2, "cuve"), relier("g+", "k1"), relier("k2", p2), relier(p1, "g-"), relier("a", p2), relier("com", p1), { g: "interrupteur", ferme: true }]);
    expect(effet(r, derivation)).toContain("deux chemins");
  });
  it("le temps ne passe que si le courant passe ou si le chronomètre tourne ; l'avance rapide ralentit près de la durée demandée", () => {
    expect(vitesse(r, montee, false)).toBe(0);
    expect(vitesse(r, montee, true)).toBe(0);
    const chrono = regles.geste(r, montee, { g: "chrono", marche: true });
    expect([vitesse(r, chrono, false), vitesse(r, chrono, true)]).toEqual([1, 120]);
    const lancee = rejoue(regles, r, [plaque(p1, "cuve"), plaque(p2, "cuve"), ...serie(r).map(([a, b]) => relier(a, b)), { g: "interrupteur", ferme: true }, { g: "tension", v: tensionVoulue(r) }]);
    expect([vitesse(r, lancee, false), vitesse(r, lancee, true)]).toEqual([1, 120]);
    const apres = (secondes: number) => regles.geste(r, lancee, attendre(secondes));
    expect(vitesse(r, apres(r.duree - 91), true)).toBe(120);
    expect(vitesse(r, apres(r.duree - 60), true)).toBe(15);
    expect(vitesse(r, apres(r.duree + 20), true)).toBe(15);
    expect(vitesse(r, apres(r.duree + 40), true)).toBe(120);
    expect(vitesse(r, apres(r.duree - 60), false)).toBe(1);
  });
  it("deux attentes à la suite se regroupent dans la liste ; rejouée, elle donne le même état", () => {
    let gestes: GesteBrut[] = [];
    for (const g of [attendre(0.5), attendre(12.25), { g: "chrono", marche: true }, attendre(3600), attendre(1), { g: "tension", v: 2 }, { g: "tension", v: 3 }] as GesteBrut[]) gestes = ajoute(gestes, g);
    expect(gestes).toEqual([attendre(12.75), { g: "chrono", marche: true }, attendre(3600), attendre(1), { g: "tension", v: 2 }, { g: "tension", v: 3 }]);
    expect(rejoue(regles, r, [{ g: "chrono", marche: true }, attendre(12.75)])).toEqual(rejoue(regles, r, [{ g: "chrono", marche: true }, attendre(0.5), attendre(12.25)]));
  });
});

describe("la marque du guide", () => {
  it("le professeur plafonne une manipulation faite avec le guide, et le dit", async () => {
    for (const graine of GRAINES.slice(0, 3)) {
      const etape = paillasse(graine);
      const { gestes } = suis(etape.paillasse.reglages as ReglagesElectrolyse);
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
