// Le guide de la paillasse Circuits (lib/commun/tp/paillasses/circuit-guide.ts). Un élève de test fait, sans réfléchir,
// exactement ce que le guide lui dit : la manipulation qu'il obtient doit être sans faute, pour chaque graine. Le guide
// est donc complet, dans le bon ordre, et il ne tourne jamais en rond.
import { describe, expect, it } from "vitest";
import { DUREES, ecartAdmis, finDe, pasDe, regles, tauAttendu, tensionMesuree, type EtatCircuit, type ReglagesCircuit } from "@/lib/commun/tp/paillasses/circuit";
import { acquisitionValable, dureeConseillee, entreBornes, nomBorne, pose, prochain, toucheDeLaCarte, type PasDuGuide, type VueCircuit } from "@/lib/commun/tp/paillasses/circuit-guide";
import { rejoue, type GesteBrut } from "@/lib/commun/tp/types";
import condensateur from "@/lib/serveur/contenu/tp/condensateur";
import { GRAINES, type EtapeDePaillasse } from "../../outils/tp";

/** L'étape de paillasse du TP, pour une graine. */
function paillasse(graine: number): EtapeDePaillasse {
  const etape = condensateur.etapes(graine).find((e) => e.genre === "paillasse");
  if (!etape || etape.genre !== "paillasse") throw new Error("pas de paillasse dans le TP");
  return etape;
}
const reglages = (graine: number) => paillasse(graine).paillasse.reglages as ReglagesCircuit;
const VUE: VueCircuit = { courbe: false, filChoisi: null, trace: false };

interface Suivi { etat: EtatCircuit; gestes: GesteBrut[]; cles: string[]; fini: boolean }
interface Eleve {
  /** des gestes faits avant d'écouter le guide */
  avant?: GesteBrut[];
  /** les crans de trop qu'il donne à une molette, la première fois qu'il la tourne */
  crans?: number;
  /** le nombre de consignes « attendre » qu'il laisse passer en plus, une fois la courbe tracée */
  lenteur?: number;
}

/** Ce qu'un élève lit sur la courbe : le point où la tension vaut 0,63 fois la valeur du dernier point. */
function lisTau(etat: EtatCircuit): number {
  const acq = etat.acquisition!;
  const pas = pasDe(acq), fin = finDe(acq);
  const cible = 0.632 * tensionMesuree(acq, fin);
  let meilleur = 0;
  for (let k = 0; k * pas <= fin + 1e-9; k++) if (Math.abs(tensionMesuree(acq, k * pas) - cible) < Math.abs(tensionMesuree(acq, meilleur * pas) - cible)) meilleur = k;
  return Math.round(meilleur * pas * 1000) / 1000;
}

/** L'élève de test : il fait ce que le guide dit, jusqu'à « J'ai fini ». Pendant un enregistrement, le temps passe d'un huitième de sa durée à chaque tour. */
function suis(r: ReglagesCircuit, eleve: Eleve = {}): Suivi {
  let etat = rejoue(regles, r, eleve.avant ?? []);
  const gestes: GesteBrut[] = [...(eleve.avant ?? [])];
  let vue: VueCircuit = { ...VUE };
  let instant = 0;
  let enTrop = eleve.crans ?? 0;
  const cles: string[] = [];
  const agit = (g: GesteBrut) => {
    const complet = vue.trace ? { ...g, t: instant } : g;
    const suite = regles.geste(r, etat, complet);
    if (suite === etat) return;
    // la carte se déclenche : la courbe commence à se tracer
    if (suite.carte === "enregistre" && etat.carte !== "enregistre") { instant = 0; vue = { ...vue, trace: true }; }
    if (suite.carte !== "enregistre") vue = { ...vue, trace: false };
    etat = suite;
    gestes.push(complet);
  };
  let dernier: PasDuGuide | null = null;
  for (let tour = 0; tour < 400; tour++) {
    const p = prochain(r, etat, vue);
    if (p.cle !== dernier?.cle) { cles.push(p.cle); dernier = p; }
    switch (p.geste) {
      case "glisser": agit(pose(p.objet, p.cible)); break;
      case "relier": agit({ g: "relier", a: p.de, b: p.vers }); break;
      case "toucher":
        if (p.quoi === "fil") vue = { ...vue, filChoisi: `${p.a}:${p.b}` };
        else if (p.quoi === "croix") { agit({ g: "retirer", a: p.a, b: p.b }); vue = { ...vue, filChoisi: null }; }
        else if (p.quoi === "carte") agit({ g: toucheDeLaCarte(etat, vue.trace) });
        else agit({ g: "basculer" });
        break;
      case "tourner": {
        // la première fois, sa main va trop loin : le guide le fait revenir
        const vers = p.molette === "tension" ? Math.min(12, p.vers + enTrop * 0.5) : DUREES[Math.min(DUREES.length - 1, DUREES.indexOf(p.vers) + enTrop)];
        enTrop = 0;
        agit(p.molette === "tension" ? { g: "tension", v: vers } : { g: "duree", v: vers });
        break;
      }
      case "attendre":
        instant += (etat.acquisition?.duree ?? 8) / 8;
        if (instant >= (etat.acquisition?.duree ?? 0) + (eleve.lenteur ?? 0)) vue = { ...vue, trace: false };
        break;
      case "bouton":
        if (p.bouton === "fini") return { etat, gestes, cles, fini: true };
        vue = { ...vue, courbe: p.bouton === "courbe" };
        break;
      case "montrer": agit({ g: "noter", v: lisTau(etat) }); vue = { ...vue, courbe: false }; break;
    }
  }
  return { etat, gestes, cles, fini: false };
}

const fautes = (r: ReglagesCircuit, etat: EtatCircuit) => regles.bilan(r, etat).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);
const relier = (fils: [string, string][]): GesteBrut[] => fils.map(([a, b]) => ({ g: "relier", a, b }));
const nom = (r: ReglagesCircuit, genre: string, valeur?: number) => r.boite.find((c) => c.genre === genre && (valeur === undefined || c.valeur === valeur))!.id;

describe("l'élève qui suit le guide de la paillasse Circuits", () => {
  it("la manipulation est sans faute, pour chaque graine", () => {
    for (const graine of GRAINES) {
      const r = reglages(graine);
      const s = suis(r);
      expect(s.fini, `graine ${graine} : le guide s'arrête sur ${s.cles.slice(-3).join(", ")}`).toBe(true);
      expect(fautes(r, s.etat), `graine ${graine}`).toEqual([]);
      const b = regles.bilan(r, s.etat);
      expect(b.score).toBe(1);
      // la mesure est celle d'une manipulation soignée, avec le conducteur ohmique du protocole
      expect(b.mesures.R).toBe(r.demande.R);
      expect(Math.abs(b.mesures.tau - tauAttendu(r)) / tauAttendu(r)).toBeLessThan(0.04);
      // rejouée par le serveur, la liste des gestes redonne le même état
      expect(rejoue(regles, r, s.gestes)).toEqual(s.etat);
    }
  });
  it("un élève dont la main va trop loin sur les molettes, et qui tarde après la fin de la courbe, reste sans faute", () => {
    for (const graine of GRAINES.slice(0, 4)) {
      const r = reglages(graine);
      const s = suis(r, { crans: 2, lenteur: 30 });
      expect(s.fini, `graine ${graine} : ${s.cles.slice(-3).join(", ")}`).toBe(true);
      expect(fautes(r, s.etat), `graine ${graine}`).toEqual([]);
      // le guide l'a fait revenir en arrière, sans changer de consigne
      expect(s.cles.filter((c) => c === "tension")).toHaveLength(1);
    }
  });
  it("le guide suit l'ordre du protocole, et montre chaque étape", () => {
    const r = reglages(1);
    const { cles, gestes } = suis(r);
    expect(cles).toEqual(["poser-interrupteur", "poser-resistance", "poser-condensateur", "tension", "relier-g+-a1", "relier-a2-b1", "relier-b2-c1", "relier-c2-g-", "relier-voie-c1", "relier-masse-c2",
      "decharger", "retirer-c1-c2", "croix-c1-c2", "duree", "lancer", "fermer", "trace", "courbe", "courbe-repere", "fini"]);
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
    expect(dureeConseillee(r)).toBe(20);
  });
  it("chaque consigne tutoie l'élève, sans tiret long, et ne donne jamais la valeur à lire sur la courbe", () => {
    const r = reglages(2);
    const vues = new Map<string, string>();
    let etat = regles.depart(r);
    for (const g of suis(r).gestes) { etat = regles.geste(r, etat, g); const p = prochain(r, etat, VUE); vues.set(p.cle, p.texte); }
    vues.set("courbe-repere", prochain(r, etat, { ...VUE, courbe: true }).texte);
    expect(vues.size).toBeGreaterThan(12);
    for (const [cle, texte] of vues) {
      expect(texte, cle).not.toMatch(/[—–]/);
      expect(texte, cle).toMatch(/^(Prends|Tourne|Tire|Décharge|Touche|Ferme|Glisse|Le |La |Ton |Tout |Cette |L')/);
    }
    expect(vues.get("courbe-repere")).not.toMatch(/\d s\b/);
    expect(nomBorne(r, regles.depart(r), "b2")).toBe("la borne droite de l'emplacement 2, vide");
  });
  it("un fil se dit simplement : entre deux bornes, ou entre les deux bornes d'un même appareil", () => {
    const r = reglages(1);
    const etat = rejoue(regles, r, suis(r).gestes.slice(0, 3));
    expect(entreBornes(r, etat, "c1", "c2")).toBe("entre les deux bornes du condensateur");
    expect(entreBornes(r, etat, "a2", "a1")).toBe("entre les deux bornes de l'interrupteur");
    expect(entreBornes(r, regles.depart(r), "b1", "b2")).toBe("entre les deux bornes de l'emplacement 2, vide");
    expect(entreBornes(r, etat, "g-", "g+")).toBe("entre les deux bornes du générateur");
    expect(entreBornes(r, etat, "voie", "masse")).toBe("entre la voie et la masse de la carte");
    expect(entreBornes(r, etat, "voie", "c1")).toBe("entre la voie de la carte et la borne gauche du condensateur");
    expect(entreBornes(r, etat, "a2", "b1")).toMatch(/^entre la borne droite de l'interrupteur et la borne gauche du conducteur ohmique de /);
  });
});

describe("le guide rattrape une manipulation mal partie", () => {
  const r = reglages(3);
  const bonne = nom(r, "resistance", r.demande.R), petite = nom(r, "resistance", r.demande.R / 10), condo = nom(r, "condensateur"), inter = nom(r, "interrupteur");
  const boucle: [string, string][] = [["g+", "a1"], ["a2", "b1"], ["b2", "c1"], ["c2", "g-"]];
  it("le mauvais conducteur ohmique, déjà câblé : il le fait ranger, et prendre le bon", () => {
    const s = suis(r, { avant: [{ g: "poser", quoi: petite, ou: 1 }, { g: "poser", quoi: inter, ou: 0 }, ...relier(boucle.slice(0, 2))] });
    expect(s.cles.slice(0, 3)).toEqual([`ranger-${petite}`, "poser-resistance", "poser-condensateur"]);
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("les composants posés dans un autre ordre : il câble la boucle telle qu'elle est", () => {
    const s = suis(r, { avant: [{ g: "poser", quoi: condo, ou: 0 }, { g: "poser", quoi: bonne, ou: 1 }, { g: "poser", quoi: inter, ou: 2 }] });
    expect(s.cles).toContain("relier-g+-c1");
    expect(s.cles).toContain("relier-voie-a1");
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("la voie et la masse inversées, un fil sur un emplacement vide : il fait retirer ce qui n'est pas à sa place", () => {
    const avant: GesteBrut[] = [{ g: "poser", quoi: inter, ou: 0 }, { g: "poser", quoi: bonne, ou: 1 }, { g: "poser", quoi: condo, ou: 2 }, ...relier([...boucle, ["voie", "c2"], ["masse", "c1"]])];
    const s = suis(r, { avant });
    expect(s.cles).toEqual(expect.arrayContaining(["retirer-voie-c2", "croix-voie-c2", "retirer-masse-c1", "croix-masse-c1", "relier-voie-c1", "relier-masse-c2"]));
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
    // la voie sur la borne voisine, reliée au même nœud : c'est le même montage, le guide n'y touche pas
    const equivalent = suis(r, { avant: [...avant.slice(0, 7), ...relier([["voie", "b2"], ["masse", "g-"]])] });
    expect(equivalent.cles.some((c) => c.startsWith("retirer"))).toBe(true);
    expect(equivalent.cles).not.toContain("retirer-voie-b2");
    expect(fautes(r, equivalent.etat)).toEqual([]);
  });
  it("une courbe enregistrée sans décharger le condensateur : il fait recommencer l'acquisition", () => {
    const avant: GesteBrut[] = [{ g: "poser", quoi: inter, ou: 0 }, { g: "poser", quoi: bonne, ou: 1 }, { g: "poser", quoi: condo, ou: 2 }, { g: "tension", v: r.demande.E },
      ...relier([...boucle, ["voie", "c1"], ["masse", "c2"]]), { g: "duree", v: dureeConseillee(r) }, { g: "lancer" }, { g: "basculer" }];
    const mal = rejoue(regles, r, avant);
    expect(acquisitionValable(r, mal)).toBe(false);
    expect(prochain(r, mal, VUE)).toMatchObject({ cle: "refaire-ouvrir", etape: 6, geste: "toucher", quoi: "interrupteur" });
    // ouverte en grand, cette courbe ne se lit pas : le guide fait revenir à la paillasse
    expect(prochain(r, mal, { ...VUE, courbe: true })).toMatchObject({ cle: "revenir", geste: "bouton", bouton: "revenir" });
    const s = suis(r, { avant });
    expect(s.cles.slice(0, 4)).toEqual(["refaire-ouvrir", "decharger", "retirer-c1-c2", "croix-c1-c2"]);
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
    expect(s.etat.lancees).toBe(2);
  });
  it("une carte lancée trop tôt, une durée trop courte, une tension trop forte : il les fait reprendre", () => {
    const s = suis(r, { avant: [{ g: "tension", v: 12 }, { g: "duree", v: 1 }, { g: "lancer" }] });
    expect(s.cles).toEqual(expect.arrayContaining(["arreter", "tension", "duree"]));
    expect(s.cles.indexOf("arreter")).toBeLessThan(s.cles.indexOf("relier-g+-a1"));
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("un fil entre les deux bornes du générateur : il le fait retirer d'abord ; la mise en sécurité, elle, ne s'efface pas", () => {
    const avant: GesteBrut[] = [{ g: "poser", quoi: inter, ou: 0 }, { g: "poser", quoi: bonne, ou: 1 }, { g: "poser", quoi: condo, ou: 2 }, { g: "tension", v: 9 }, { g: "relier", a: "g+", b: "g-" }];
    expect(prochain(r, rejoue(regles, r, avant), VUE)).toMatchObject({ cle: "retirer-g+-g-", geste: "toucher", quoi: "fil" });
    expect(prochain(r, rejoue(regles, r, avant), { ...VUE, filChoisi: "g+:g-" })).toMatchObject({ cle: "croix-g+-g-", quoi: "croix" });
    const s = suis(r, { avant });
    expect(s.cles.slice(0, 3)).toEqual(["retirer-g+-g-", "croix-g+-g-", "tension"]);
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual(["court"]);
  });
  it("un fil entre les deux bornes du générateur, encore à 0 V : il le fait retirer avant de monter la tension, et rien ne se met en sécurité", () => {
    const avant: GesteBrut[] = [{ g: "poser", quoi: petite, ou: 1 }, { g: "relier", a: "g+", b: "g-" }, { g: "lancer" }];
    const s = suis(r, { avant });
    expect(s.cles.slice(0, 7)).toEqual([`ranger-${petite}`, "poser-interrupteur", "poser-resistance", "poser-condensateur", "arreter", "retirer-g+-g-", "croix-g+-g-"]);
    expect(s.cles.indexOf("croix-g+-g-")).toBeLessThan(s.cles.indexOf("tension"));
    expect(s.fini).toBe(true);
    expect(s.etat.courts).toBe(0);
    expect(fautes(r, s.etat)).toEqual([]);
    // entre plusieurs fils de travers, il désigne celui qui ferait le court-circuit
    const deux = rejoue(regles, r, [{ g: "poser", quoi: inter, ou: 0 }, { g: "poser", quoi: bonne, ou: 1 }, { g: "poser", quoi: condo, ou: 2 }, ...relier([["voie", "a1"], ["g-", "g+"]])]);
    const p = prochain(r, deux, VUE);
    expect(p).toMatchObject({ cle: "retirer-g--g+", geste: "toucher", quoi: "fil" });
    expect(p.texte).toMatch(/^Le fil entre les deux bornes du générateur le mettrait en sécurité dès que la tension monte\. Touche ce fil/);
    // un fil de travers qui ne risque rien attend son tour : la tension d'abord, comme dans le protocole
    expect(prochain(r, rejoue(regles, r, [{ g: "poser", quoi: inter, ou: 0 }, { g: "poser", quoi: bonne, ou: 1 }, { g: "poser", quoi: condo, ou: 2 }, ...relier([["voie", "a1"]])]), VUE).cle).toBe("tension");
  });
  it("un repère mal placé : il fait rouvrir la courbe", () => {
    const s = suis(r);
    const mal = regles.geste(r, s.etat, { g: "noter", v: 1 });
    expect(prochain(r, mal, VUE)).toMatchObject({ cle: "relire", geste: "bouton", bouton: "courbe" });
    expect(prochain(r, s.etat, VUE).cle).toBe("fini");
  });
  it("il ne fait relire la courbe que si le professeur y verrait une faute : un point de côté reste une lecture juste", () => {
    for (const graine of GRAINES) {
      const rg = reglages(graine);
      const s = suis(rg);
      const acq = s.etat.acquisition!;
      const tau = acq.morceaux[0].tau, pas = pasDe(acq);
      // le repère va de point en point : à un point du bon, puis de plus en plus loin
      for (let k = -12; k <= 12; k++) {
        const note = Math.round((lisTau(s.etat) + k * pas) * 1000) / 1000;
        const etat = regles.geste(rg, s.etat, { g: "noter", v: note });
        const faute = fautes(rg, etat).some((f) => f.startsWith("lecture"));
        expect(prochain(rg, etat, VUE).cle === "relire", `graine ${graine}, ${note} s`).toBe(faute);
        expect(faute, `graine ${graine}, ${note} s`).toBe(Math.abs(note - tau) > ecartAdmis(acq, tau));
        if (Math.abs(k) <= 1) expect(faute, `graine ${graine}, à ${k} point du bon`).toBe(false);
      }
      // très loin, la lecture est fausse
      expect(fautes(rg, regles.geste(rg, s.etat, { g: "noter", v: Math.round(2 * tau * 10) / 10 }))).toEqual(["lecture!"]);
    }
  });
  it("sans le composant qu'il faut dans la boîte, le guide ne demande rien d'impossible", () => {
    expect(prochain({ ...r, boite: r.boite.filter((c) => c.genre !== "condensateur") }, regles.depart(r), VUE).cle).toBe("fini");
  });
});
