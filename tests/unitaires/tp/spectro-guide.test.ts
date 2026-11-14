// Le guide de la paillasse Spectro (lib/commun/tp/paillasses/spectro-guide.ts). Un élève de test fait, sans réfléchir,
// exactement ce que le guide lui dit : le dosage et le suivi qu'il obtient doivent être sans faute, pour chaque graine
// des deux TP. Le guide est donc complet, dans le bon ordre, et il ne tourne jamais en rond.
// Ce que le guide ne dit pas (la valeur de l'afficheur, la place de la règle et des repères), l'élève le lit lui-même.
import { describe, expect, it } from "vitest";
import { LAMBDA, absorbanceJuste, affichage, regles, type EtatSpectro, type ReglagesSpectro } from "@/lib/commun/tp/paillasses/spectro";
import { objetDe, penteAjustee, pose, prochain, type PasDuGuide, type VueSpectro } from "@/lib/commun/tp/paillasses/spectro-guide";
import { PLAFOND_AVEC_GUIDE, avecMarqueDuGuide, rejoue, type GesteBrut } from "@/lib/commun/tp/types";
import cinetique from "@/lib/serveur/contenu/tp/cinetique";
import etalonnage from "@/lib/serveur/contenu/tp/etalonnage";
import { verifie } from "@/lib/serveur/tp";
import { GRAINES, type EtapeDePaillasse } from "../../outils/tp";

/** L'étape de paillasse d'un TP, pour une graine. */
function paillasse(t: typeof etalonnage, graine: number): EtapeDePaillasse {
  const etape = t.etapes(graine).find((e) => e.genre === "paillasse");
  if (!etape || etape.genre !== "paillasse") throw new Error(`pas de paillasse dans le TP ${t.id}`);
  return etape;
}
const reglages = (t: typeof etalonnage, graine: number) => paillasse(t, graine).paillasse.reglages as ReglagesSpectro;
const RIEN: VueSpectro = { saisie: false, graphe: false, rapide: false, palier: null };

interface Suivi { etat: EtatSpectro; gestes: GesteBrut[]; cles: string[]; pas: PasDuGuide[]; fini: boolean }
interface Eleve {
  /** la durée d'un geste, en secondes : le temps de la paillasse passe pendant que l'élève agit */
  duree?: number;
  /** des gestes faits avant d'écouter le guide */
  avant?: GesteBrut[];
  /** une absorbance mal recopiée, la première fois, pour cette solution */
  malLue?: string;
  /** une règle posée de travers, une lecture loin du compte, la première fois */
  regle?: number;
  lecture?: number;
}

/** La date où la courbe des relevés passe par une absorbance, entre deux relevés. */
function dateSurCourbe(etat: EtatSpectro, A: number): number {
  const points = etat.mesures;
  const i = points.findIndex((m) => m.lu >= A);
  if (i <= 0) return points[0]?.date ?? 0;
  const a = points[i - 1], b = points[i];
  return Math.round(a.date + ((A - a.lu) / (b.lu - a.lu)) * (b.date - a.date));
}

/** L'élève de test : il fait ce que le guide dit, jusqu'à « J'ai fini ». */
function suis(r: ReglagesSpectro, eleve: Eleve = {}): Suivi {
  let etat = rejoue(regles, r, eleve.avant ?? []);
  const gestes: GesteBrut[] = [...(eleve.avant ?? [])];
  let vue: VueSpectro = RIEN;
  const cles: string[] = [], pas: PasDuGuide[] = [];
  const dejaFait = new Set<string>();
  const premiereFois = (quoi: string) => { const neuf = !dejaFait.has(quoi); dejaFait.add(quoi); return neuf; };
  const agit = (g: GesteBrut) => { const suite = regles.geste(r, etat, g); if (suite !== etat) { etat = suite; gestes.push(g); } };
  for (let tour = 0; tour < 4000; tour++) {
    const p = prochain(r, etat, vue);
    if (p.cle !== cles[cles.length - 1]) { cles.push(p.cle); pas.push(p); }
    // le temps de la paillasse passe pendant que l'élève fait son geste
    if (r.mode === "cinetique" && (etat.melange !== null || etat.chrono !== null)) agit({ g: "attendre", v: (eleve.duree ?? 1.5) * (vue.rapide ? r.cadence : 1) });
    switch (p.geste) {
      case "glisser": pose(r, etat, p.objet, p.cible).gestes.forEach(agit); break;
      case "tourner": agit({ g: "lambda", v: p.vers }); break;
      case "toucher":
        if (p.touche === "temps") vue = { ...vue, rapide: !vue.rapide };
        else agit(p.touche === "capot" ? { g: "capot", ferme: !etat.capot } : { g: p.touche === "lancer" ? "chrono" : p.touche });
        break;
      case "montrer": {
        const echantillon = [...etat.mesures].reverse().find((m) => m.s === "x" || m.s === "xd");
        if (p.quoi === "afficheur") {
          // l'élève lit l'afficheur et tape ce qu'il lit
          agit({ g: "noter", v: affichage(r, etat) + (eleve.malLue === etat.contenu && premiereFois("lue") ? 0.1 : 0) });
          vue = { ...vue, saisie: false };
        } else if (p.quoi === "regle") {
          agit({ g: "droite", v: (penteAjustee(r, etat.mesures) ?? 0) * (eleve.regle !== undefined && premiereFois("regle") ? eleve.regle : 1.005) });
        } else if (p.quoi === "repere") {
          // le repère là où la règle coupe l'absorbance de l'échantillon, au dixième ; puis « Noter cette concentration »
          const C = (echantillon?.lu ?? 0) / (etat.pente ?? 1);
          agit({ g: "lire", v: Math.round(C * (eleve.lecture !== undefined && premiereFois("lecture") ? eleve.lecture : 1) * 10 ** r.decimales) / 10 ** r.decimales });
          vue = { ...vue, graphe: false };
        } else if (p.quoi === "palier") {
          // le trait sur les derniers points de la courbe, au pas de sa poignée
          vue = { ...vue, palier: Math.round(etat.mesures[etat.mesures.length - 1].lu * 200) / 200 };
        } else {
          // le repère du temps là où la moitié de la valeur finale coupe la courbe ; puis « Noter ce temps »
          agit({ g: "lire", v: eleve.lecture !== undefined && premiereFois("lecture") ? eleve.lecture : dateSurCourbe(etat, (vue.palier ?? 0) / 2) });
          vue = { ...vue, graphe: false };
        }
        break;
      }
      case "bouton":
        if (p.bouton === "fini") return { etat, gestes, cles, pas, fini: true };
        if (p.bouton === "noter") vue = { ...vue, saisie: true };
        else if (p.bouton === "graphe") vue = { ...vue, graphe: true, rapide: false };
        else if (p.bouton === "retour") vue = { ...vue, graphe: false };
        else { agit({ g: "recommencer" }); vue = { ...vue, rapide: false, palier: null }; }
        break;
    }
  }
  return { etat, gestes, cles, pas, fini: false };
}

const fautes = (r: ReglagesSpectro, etat: EtatSpectro) => regles.bilan(r, etat).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);

// ---------- les gestes d'un élève qui n'écoute pas encore le guide ----------
const placer: GesteBrut[] = [{ g: "capot", ferme: false }, { g: "placer", dans: true }, { g: "capot", ferme: true }];
const sortir: GesteBrut[] = [{ g: "capot", ferme: false }, { g: "placer", dans: false }, { g: "vider" }];
const rince = (s: string): GesteBrut[] => [{ g: "remplir", s }, { g: "vider" }, { g: "remplir", s }];
/** La molette au maximum d'absorption, puis le blanc. */
const reglage = (r: ReglagesSpectro): GesteBrut[] => [{ g: "tourner" }, { g: "lambda", v: r.lambdaMax }];
const blanc: GesteBrut[] = [...rince("eau"), ...placer, { g: "blanc" }, ...sortir];
/** Mesure une solution et note ce que l'appareil affiche : la note se calcule en rejouant les gestes. */
function mesure(r: ReglagesSpectro, avant: GesteBrut[], s: string, o: { rincer?: boolean; ouvert?: boolean; tournee?: boolean } = {}): GesteBrut[] {
  const gestes = [...avant, ...(o.rincer === false ? [{ g: "remplir", s }] : rince(s)), ...(o.tournee ? [{ g: "tourner" }] : []), ...placer, ...(o.ouvert ? [{ g: "capot", ferme: false }] : [])];
  return [...gestes, { g: "noter", v: affichage(r, rejoue(regles, r, gestes)) }, ...sortir, ...(o.tournee ? [{ g: "tourner" }] : [])];
}

describe("l'élève qui suit le guide du dosage par étalonnage", () => {
  it("le dosage est sans faute, pour chaque graine", () => {
    for (const graine of GRAINES) {
      const r = reglages(etalonnage, graine);
      const s = suis(r);
      expect(s.fini, `graine ${graine} : le guide s'arrête sur ${s.cles.slice(-3).join(", ")}`).toBe(true);
      expect(fautes(r, s.etat), `graine ${graine}`).toEqual([]);
      const b = regles.bilan(r, s.etat);
      expect(b.score).toBe(1);
      // la concentration trouvée est celle de la boisson, au facteur de dilution près
      expect(b.mesures.F).toBe(r.Cx > Math.max(...r.gamme) ? r.dilution : 1);
      expect(Math.abs(b.mesures.C * b.mesures.F - r.Cx) / r.Cx).toBeLessThan(0.03);
      // rejouée par le serveur, la liste des gestes redonne le même état
      expect(rejoue(regles, r, s.gestes)).toEqual(s.etat);
    }
  });
  it("le guide suit l'ordre du protocole, et montre chaque étape", () => {
    const r = reglages(etalonnage, 2);
    const s = suis(r);
    // la longueur d'onde avec la solution la plus concentrée, puis le blanc : après elle, la cuve se rince deux fois à l'eau
    expect(s.cles.slice(0, 17)).toEqual(["s5-remplir", "s5-tourner", "s5-ouvrir", "s5-placer", "s5-fermer", "molette",
      "eau-rouvrir", "eau-sortir", "eau-vider", "eau-rincer", "eau-vider", "eau-rincer", "eau-vider", "eau-remplir", "eau-placer", "eau-fermer", "blanc"]);
    // le zéro se fait sur une eau qui n'absorbe plus rien, au millième près
    expect(Math.abs((s.etat.mesures.find((m) => m.s === "s1")?.lu ?? 0) - absorbanceJuste(r, r.gamme[0]))).toBeLessThanOrEqual(0.003);
    // chaque solution étalon : la cuve sort, se vide, se rince avec la solution, se remplit, retourne dans l'appareil
    expect(s.cles.slice(17, 27)).toEqual(["s1-rouvrir", "s1-sortir", "s1-vider", "s1-rincer", "s1-vider", "s1-remplir", "s1-placer", "s1-fermer", "s1-noter", "lire"]);
    expect(s.cles.slice(-4)).toEqual(["graphe", "regle", "repere", "fini"]);
    // chaque solution se rince, même quand la précédente lui ressemble : c'est le geste du protocole
    for (const solution of ["s1", "s2", "s3", "s4", "s5", "x"]) expect(s.cles.filter((c) => c === `${solution}-rincer`), solution).toHaveLength(1);
    expect(s.etat.mesures.every((m) => m.rincee)).toBe(true);
    // le rang de l'étape du protocole ne recule jamais, reste dans le protocole, et va jusqu'à la dernière
    const rangs = s.pas.map((p) => p.etape);
    expect(rangs).toEqual([...rangs].sort((a, b) => a - b));
    expect([rangs[0], rangs[rangs.length - 1]]).toEqual([0, paillasse(etalonnage, 2).protocole.length - 1]);
    expect(new Set(rangs).size).toBe(paillasse(etalonnage, 2).protocole.length);
  });
  it("la molette s'arrête là où l'absorbance est la plus grande, et le guide ne dit ni cette valeur ni celle de la boisson", () => {
    const r = reglages(etalonnage, 1);
    const s = suis(r);
    const molette = s.pas.find((p) => p.cle === "molette");
    expect(molette).toMatchObject({ geste: "tourner", vers: r.lambdaMax });
    const pleine = rejoue(regles, r, [{ g: "tourner" }, { g: "remplir", s: "s5" }, ...placer]);
    const affiche = (lambda: number) => affichage(r, regles.geste(r, pleine, { g: "lambda", v: lambda }));
    for (let lambda = LAMBDA.min; lambda <= LAMBDA.max; lambda += LAMBDA.pas) expect(affiche(lambda)).toBeLessThanOrEqual(affiche(r.lambdaMax));
    for (const p of s.pas) {
      expect(p.texte, p.cle).not.toContain(String(r.lambdaMax));
      expect(p.texte, p.cle).not.toMatch(/\d,\d/);
    }
  });
  it("une boisson trop concentrée : le guide fait mesurer la boisson diluée, et dit pourquoi", () => {
    const graine = GRAINES.find((g) => reglages(etalonnage, g).Cx > 20) ?? 1;
    const r = reglages(etalonnage, graine);
    const s = suis(r);
    const dilue = s.pas.find((p) => p.cle === "xd-rouvrir");
    expect(dilue?.texte).toContain("sort de la gamme");
    expect(s.cles).toContain("xd-noter");
    expect(regles.bilan(r, s.etat).mesures.F).toBe(r.dilution);
    // dans la gamme, la boisson diluée n'est pas demandée
    const dedans = reglages(etalonnage, GRAINES.find((g) => reglages(etalonnage, g).Cx <= 20) ?? 2);
    expect(suis(dedans).cles.some((c) => c.startsWith("xd-"))).toBe(false);
  });
});

describe("le guide rattrape un dosage mal parti", () => {
  const r = reglages(etalonnage, 2);
  const depart = reglage(r);
  const termine = (avant: GesteBrut[], eleve: Eleve = {}) => { const s = suis(r, { ...eleve, avant }); return [s.fini, fautes(r, s.etat)]; };
  it("des mesures sans blanc : il fait faire le blanc, puis les reprendre", () => {
    const avant = mesure(r, mesure(r, depart, "s1"), "s2");
    expect(fautes(r, rejoue(regles, r, avant))).toContain("blanc!");
    expect(prochain(r, rejoue(regles, r, avant), RIEN).cle).toBe("eau-rincer");
    const s = suis(r, { avant });
    expect([s.fini, fautes(r, s.etat)]).toEqual([true, []]);
    expect(s.cles).toEqual(expect.arrayContaining(["blanc", "s1-noter", "s2-noter"]));
  });
  it("une cuve non rincée, un capot resté ouvert, une cuve tournée : il fait reprendre la mesure", () => {
    const pret = [...depart, ...blanc];
    for (const [defaut, code] of [[{ rincer: false }, "rincage"], [{ ouvert: true }, "capot"], [{ tournee: true }, "sens"]] as const) {
      const avant = mesure(r, mesure(r, pret, "s1"), "s2", defaut);
      const etat = rejoue(regles, r, avant);
      expect(fautes(r, etat).map((f) => f.replace("!", "")), code).toContain(code);
      // la solution S1 est bonne : c'est S2 que le guide fait reprendre
      expect(prochain(r, etat, RIEN).cle, code).toMatch(/^s2-/);
      expect(termine(avant), code).toEqual([true, []]);
    }
  });
  it("une longueur d'onde changée en route : il la fait régler de nouveau, et reprendre ce qui a été mesuré ailleurs", () => {
    const une = mesure(r, [...depart, ...blanc], "s1");
    const avant = mesure(r, [...une, { g: "lambda", v: 540 }], "s2");
    const etat = rejoue(regles, r, avant);
    expect(fautes(r, etat)).toEqual(expect.arrayContaining(["blanc", "longueur!"]));
    // la solution la plus concentrée retourne dans l'appareil, pour chercher de nouveau le maximum
    expect(prochain(r, etat, RIEN)).toMatchObject({ cle: "s5-rincer", objet: "s5", cible: "cuve" });
    const s = suis(r, { avant });
    expect([s.fini, fautes(r, s.etat)]).toEqual([true, []]);
    // le blanc et la mesure de S1, faits au maximum d'absorption, valent toujours : seule S2 se reprend
    expect(s.cles).toEqual(expect.arrayContaining(["molette", "s2-noter"]));
    expect(s.cles).not.toEqual(expect.arrayContaining(["blanc"]));
    expect(s.cles).not.toEqual(expect.arrayContaining(["s1-noter"]));
  });
  it("un afficheur mal recopié, une règle de travers, une lecture loin du compte : il fait reprendre", () => {
    const mal = suis(r, { malLue: "s3" });
    expect([mal.fini, fautes(r, mal.etat), mal.cles.filter((c) => c === "s3-noter").length]).toEqual([true, [], 2]);
    const travers = suis(r, { regle: 1.1 });
    expect([travers.fini, fautes(r, travers.etat)]).toEqual([true, []]);
    const loin = suis(r, { lecture: 1.2 });
    expect([loin.fini, fautes(r, loin.etat), loin.cles.filter((c) => c === "graphe").length]).toEqual([true, [], 2]);
    expect(loin.pas.filter((p) => p.cle === "graphe")[1].texte).toContain("loin de ce que donne ta droite");
  });
  it("le graphique ouvert trop tôt, la saisie ouverte : il fait revenir à la paillasse, ou lire l'afficheur", () => {
    const etat = rejoue(regles, r, mesure(r, [...depart, ...blanc], "s1"));
    expect(prochain(r, etat, { ...RIEN, graphe: true })).toMatchObject({ cle: "retour", geste: "bouton", bouton: "retour" });
    expect(prochain(r, etat, { ...RIEN, saisie: true })).toMatchObject({ cle: "lire", geste: "montrer", quoi: "afficheur" });
  });
});

describe("l'élève qui suit le guide du suivi cinétique", () => {
  it("le suivi est sans faute, pour chaque graine", () => {
    for (const graine of GRAINES) {
      const r = reglages(cinetique, graine);
      const s = suis(r);
      expect(s.fini, `graine ${graine} : le guide s'arrête sur ${s.cles.slice(-3).join(", ")}`).toBe(true);
      expect(fautes(r, s.etat), `graine ${graine}`).toEqual([]);
      const b = regles.bilan(r, s.etat);
      expect(b.score).toBe(1);
      expect(Math.abs(b.mesures.tDemi - r.demi) / r.demi).toBeLessThan(0.06);
      expect(rejoue(regles, r, s.gestes)).toEqual(s.etat);
    }
  });
  it("un élève rapide, un élève lent : le suivi reste sans faute", () => {
    for (const graine of GRAINES.slice(0, 4)) {
      const r = reglages(cinetique, graine);
      for (const duree of [0.6, 4]) {
        const s = suis(r, { duree });
        expect(s.fini, `graine ${graine}, ${duree} s par geste : ${s.cles.slice(-3).join(", ")}`).toBe(true);
        expect(fautes(r, s.etat), `graine ${graine}, ${duree} s par geste`).toEqual([]);
        expect(s.etat.essais).toBe(0);
      }
    }
  });
  it("le guide suit l'ordre du protocole, et montre chaque étape", () => {
    const r = reglages(cinetique, 1);
    const s = suis(r);
    expect(s.cles).toEqual(["molette", "eau-remplir", "eau-tourner", "eau-ouvrir", "eau-placer", "eau-fermer", "blanc", "pret-rouvrir", "pret-sortir", "pret-vider",
      "melanger", "lancer", "m-remplir", "m-placer", "m-fermer", "relever", "accelerer", "suivre", "suivre-fin", "courbe", "courbe-palier", "courbe-temps", "fini"]);
    expect(s.pas[0]).toMatchObject({ geste: "tourner", vers: r.lambdaMax });
    const rangs = s.pas.map((p) => p.etape);
    expect(rangs).toEqual([...rangs].sort((a, b) => a - b));
    expect([rangs[0], rangs[rangs.length - 1]]).toEqual([0, paillasse(cinetique, 1).protocole.length - 1]);
    expect(new Set(rangs).size).toBe(paillasse(cinetique, 1).protocole.length);
    // le temps accéléré dépend de la transformation : le suivi dure à peu près une minute
    for (const graine of GRAINES) {
      const reglage = reglages(cinetique, graine);
      expect(6.2 * reglage.demi / reglage.cadence).toBeGreaterThan(40);
      expect(6.2 * reglage.demi / reglage.cadence).toBeLessThan(70);
    }
  });
});

describe("le guide rattrape un suivi mal parti", () => {
  const r = reglages(cinetique, 1);
  const pret: GesteBrut[] = [...reglage(r), ...blanc];
  const melange = (retard: number): GesteBrut[] => [...pret, { g: "melanger" }, { g: "attendre", v: retard }, { g: "chrono" }, { g: "remplir", s: "m" }, ...placer];
  it("un chronomètre lancé trop tard : il fait refaire le mélange", () => {
    const avant = melange(0.2 * r.demi);
    expect(prochain(r, rejoue(regles, r, avant), RIEN)).toMatchObject({ cle: "refaire", geste: "bouton", bouton: "recommencer" });
    const s = suis(r, { avant });
    expect([s.fini, s.etat.essais, fautes(r, s.etat)]).toEqual([true, 1, []]);
    // un chronomètre qui n'est toujours pas lancé : passé le délai, le mélange est aussi à refaire
    const attente: GesteBrut[] = [...pret, { g: "melanger" }, { g: "attendre", v: 2 }];
    expect(prochain(r, rejoue(regles, r, attente), RIEN).cle).toBe("lancer");
    expect(prochain(r, rejoue(regles, r, [...attente, { g: "attendre", v: 0.2 * r.demi }]), RIEN).cle).toBe("refaire");
  });
  it("un mélange fait sans blanc, un relevé capot ouvert, un début sans relevé : il fait refaire le mélange", () => {
    const cas: GesteBrut[][] = [
      [{ g: "tourner" }, { g: "lambda", v: r.lambdaMax }, { g: "melanger" }, { g: "chrono" }],
      [...melange(1), { g: "capot", ferme: false }, { g: "attendre", v: 5 }, { g: "relever" }],
      [...melange(1), { g: "attendre", v: 2 * r.demi }],
    ];
    for (const avant of cas) {
      expect(prochain(r, rejoue(regles, r, avant), RIEN).cle, JSON.stringify(avant.slice(-2))).toBe("refaire");
      const s = suis(r, { avant });
      expect([s.fini, s.etat.essais, fautes(r, s.etat)], JSON.stringify(avant.slice(-2))).toEqual([true, 1, []]);
    }
  });
  it("une cuve restée pleine d'eau, un mélange oublié dans l'appareil : il fait vider la cuve avant de la remplir", () => {
    const avant: GesteBrut[] = [...reglage(r), ...rince("eau"), ...placer, { g: "blanc" }, { g: "melanger" }, { g: "chrono" }];
    expect(prochain(r, rejoue(regles, r, avant), RIEN).cle).toBe("m-rouvrir");
    const s = suis(r, { avant });
    expect([s.fini, s.etat.essais, fautes(r, s.etat)]).toEqual([true, 0, []]);
  });
  it("une courbe ouverte trop tôt, une lecture loin du compte : il fait revenir, ou reprendre la lecture", () => {
    const avant = [...melange(1), { g: "relever" }];
    expect(prochain(r, rejoue(regles, r, avant), { ...RIEN, graphe: true })).toMatchObject({ cle: "retour", bouton: "retour" });
    const loin = suis(r, { lecture: 1.6 * r.demi });
    expect([loin.fini, fautes(r, loin.etat), loin.cles.filter((c) => c === "courbe").length]).toEqual([true, [], 2]);
    expect(loin.pas.filter((p) => p.cle === "courbe")[1].texte).toContain("loin de ce que donne ta courbe");
  });
});

describe("poser un objet", () => {
  const dosage = reglages(etalonnage, 1), suivi = reglages(cinetique, 1);
  it("donne aux règles le geste qui convient", () => {
    const depart = regles.depart(dosage);
    expect(pose(dosage, depart, "s3", "cuve").gestes).toEqual([{ g: "remplir", s: "s3" }]);
    expect(pose(dosage, depart, "cuve", "poubelle").gestes).toEqual([{ g: "vider" }]);
    expect(pose(dosage, depart, "cuve", "porte")).toMatchObject({ gestes: [{ g: "placer", dans: true }], conseil: expect.stringContaining("capot") });
    expect(pose(dosage, depart, "cuve", "repos").gestes).toEqual([{ g: "placer", dans: false }]);
    // un suivi : le tube se verse dans le bécher, et le bécher donne l'iodure seul, puis le mélange
    const avant = regles.depart(suivi);
    expect(pose(suivi, avant, "b", "becher")).toMatchObject({ gestes: [{ g: "melanger" }], conseil: expect.stringContaining("chronomètre") });
    expect(pose(suivi, avant, "becher", "cuve").gestes).toEqual([{ g: "remplir", s: "a" }]);
    expect(pose(suivi, regles.geste(suivi, avant, { g: "melanger" }), "becher", "cuve").gestes).toEqual([{ g: "remplir", s: "m" }]);
    expect([objetDe("m"), objetDe("a"), objetDe("s2")]).toEqual(["becher", "becher", "s2"]);
  });
  it("un objet inconnu, ou posé au mauvais endroit, ne change rien ; chaque geste a sa phrase", () => {
    const depart = regles.depart(dosage);
    for (const [objet, cible] of [["licorne", "cuve"], ["s3", "poubelle"], ["cuve", "cuve"], ["b", "cuve"], ["m", "cuve"]]) expect(pose(dosage, depart, objet, cible), `${objet} sur ${cible}`).toEqual({ gestes: [], message: "" });
    for (const [objet, cible] of [["eau", "cuve"], ["s1", "cuve"], ["x", "cuve"], ["xd", "cuve"], ["cuve", "poubelle"], ["cuve", "porte"], ["cuve", "repos"]]) expect(pose(dosage, depart, objet, cible).message.length, `${objet} sur ${cible}`).toBeGreaterThan(10);
    expect(pose(dosage, depart, "xd", "cuve").message).toContain("diluée");
  });
});

describe("la marque du guide", () => {
  it("le professeur plafonne une manipulation faite avec le guide, et le dit", async () => {
    const trouve = async () => regles as Parameters<typeof verifie>[4] extends ((genre: string) => Promise<infer R>) | undefined ? R : never;
    for (const t of [etalonnage, cinetique]) {
      const etape = paillasse(t, 1);
      const { gestes } = suis(etape.paillasse.reglages as ReglagesSpectro);
      const seul = await verifie(etape, { g: "paillasse", gestes }, {}, 1, trouve);
      const aide = await verifie(etape, { g: "paillasse", gestes: avecMarqueDuGuide(gestes) }, {}, 1, trouve);
      expect(seul?.retour, t.id).toMatchObject({ score: 1, correction: { genre: "paillasse", fautes: [] } });
      expect(aide?.retour, t.id).toMatchObject({ score: PLAFOND_AVEC_GUIDE, correction: { genre: "paillasse", fautes: [], guide: true } });
      expect(aide?.mesures).toEqual(seul?.mesures);
    }
  });
});
