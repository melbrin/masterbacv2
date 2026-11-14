// Le guide de la paillasse « diffraction » (lib/commun/tp/paillasses/diffraction-guide.ts). Un élève de test fait, sans
// réfléchir, exactement ce que le guide lui dit : la manipulation qu'il obtient doit être sans faute, pour chaque TP et
// chaque graine. Le guide est donc complet, dans le bon ordre, et il ne tourne jamais en rond.
import { describe, expect, it } from "vitest";
import { CENTRE, diapositive, interfrange, regles, tacheCentrale, type EtatDiffraction, type ReglagesDiffraction } from "@/lib/commun/tp/paillasses/diffraction";
import { mesure, pointage, pose, prochain, type PasDiffraction, type VueDiffraction } from "@/lib/commun/tp/paillasses/diffraction-guide";
import { rejoue, type GesteBrut } from "@/lib/commun/tp/types";
import cheveu from "@/lib/serveur/contenu/tp/cheveu";
import type { Tp } from "@/lib/serveur/contenu/tp/types";
import young from "@/lib/serveur/contenu/tp/young";
import { GRAINES, type EtapeDePaillasse } from "../../outils/tp";

const vingtieme = (x: number) => Math.round(x * 20) / 20;
/** Ce qu'un élève lit sur la graduation de l'écran : au demi-millimètre près. */
const demi = (x: number) => Math.round(x * 2) / 2;
/** L'étape de paillasse d'un TP, pour une graine. */
function paillasse(t: Tp, graine: number): EtapeDePaillasse {
  const etape = t.etapes(graine).find((e) => e.genre === "paillasse");
  if (!etape || etape.genre !== "paillasse") throw new Error(`pas de paillasse dans ${t.id}`);
  return etape;
}
const reglages = (t: Tp, graine: number) => paillasse(t, graine).paillasse.reglages as ReglagesDiffraction;
const SANS: VueDiffraction = { saisie: null, tenu: null };
/** L'état après quelques gestes de plus. */
const puis = (r: ReglagesDiffraction, etat: EtatDiffraction, gestes: GesteBrut[]): EtatDiffraction => gestes.reduce((e, g) => regles.geste(r, e, g), etat);

interface Suivi { etat: EtatDiffraction; gestes: GesteBrut[]; cles: string[]; etapes: number[]; fini: boolean }
interface Eleve {
  /** les pas que l'élève fait encore, dans son élan, après une nouvelle consigne */
  retard?: number;
  /** des gestes faits avant d'écouter le guide */
  avant?: GesteBrut[];
  /** il manipule au clavier : aucun doigt ne reste posé sur un curseur */
  clavier?: boolean;
}

/** L'élève de test : il fait ce que le guide dit, jusqu'à « J'ai fini ». L'écran et les curseurs avancent d'un petit pas à chaque tour. */
function suis(r: ReglagesDiffraction, eleve: Eleve = {}): Suivi {
  let etat = rejoue(regles, r, eleve.avant ?? []);
  const gestes: GesteBrut[] = [...(eleve.avant ?? [])];
  let vue: VueDiffraction = SANS;
  let ecartLu = 0;
  const cles: string[] = [];
  const etapes: number[] = [];
  const agit = (g: GesteBrut) => { const suite = regles.geste(r, etat, g); if (suite !== etat) { etat = suite; gestes.push(g); } };
  /** le dernier déplacement : un élève qui réagit en retard le prolonge un peu */
  const elan: { dernier: (() => void) | null } = { dernier: null };
  const deplace = (geste: () => void) => { geste(); elan.dernier = geste; };
  const borne = (pas: number, max: number) => Math.max(-max, Math.min(max, pas));
  let dernier: PasDiffraction | null = null;
  for (let tour = 0; tour < 20000; tour++) {
    const p = prochain(r, etat, vue);
    if (p.cle !== dernier?.cle) {
      cles.push(p.cle);
      etapes.push(p.etape);
      const lance = elan.dernier;
      if (lance) for (let i = 0; i < (eleve.retard ?? 0); i++) lance();
      elan.dernier = null;
      dernier = p;
      // « lève le doigt » : la consigne reste jusqu'à ce que le doigt se lève, même s'il a encore glissé un peu
      if (p.geste === "lacher") { vue = { ...vue, tenu: null }; continue; }
      if (prochain(r, etat, vue).cle !== p.cle) continue;
    }
    // le doigt ne reste sur un curseur que pendant qu'il l'ajuste, de près
    const tenu = p.geste === "ajuster" && !eleve.clavier ? p.k : null;
    if (p.geste !== "lacher" && (vue.tenu ?? null) !== tenu) vue = { ...vue, tenu };
    switch (p.geste) {
      case "lacher": vue = { ...vue, tenu: null }; break;
      case "dire": vue = { ...vue, saisie: null }; break;
      case "laser": agit({ g: "laser", on: p.on }); break;
      case "fixer": pose(r, etat, "laser", "support").gestes.forEach(agit); break;
      case "diapo": pose(r, etat, p.id, "porte").gestes.forEach(agit); break;
      case "ecran": { const pas = borne(p.vers - etat.ecran, 4); deplace(() => agit({ g: "ecran", x: Math.round((etat.ecran + pas) * 10) / 10 })); break; }
      case "curseur": { const k = p.k; const pas = borne(p.vers - etat.curseurs[k - 1], 0.5); deplace(() => agit({ g: "curseur", k, x: vingtieme(etat.curseurs[k - 1] + pas) })); break; }
      case "ajuster": { const { k, sens } = p; deplace(() => agit({ g: "curseur", k, x: vingtieme(etat.curseurs[k - 1] + sens * 0.05) })); break; }
      case "bouton":
        if (p.bouton === "fini") return { etat, gestes, cles, etapes, fini: true };
        vue = { ...vue, saisie: p.bouton === "mesure" ? "ecart" : "distance" };
        break;
      case "montrer":
        if (p.quoi === "loupe") { agit({ g: "distance", v: etat.ecran }); vue = { ...vue, saisie: null }; }
        if (p.quoi === "curseurs") {
          // il lit la graduation en face de chaque curseur, au demi-millimètre, et fait la différence
          ecartLu = Math.abs(demi(etat.curseurs[1]) - demi(etat.curseurs[0]));
          if (r.but.genre === "young") vue = { ...vue, saisie: "nombre" };
          else { agit(mesure(ecartLu)); vue = { ...vue, saisie: null }; }
        }
        if (p.quoi === "franges") {
          // il compte les franges sombres d'un curseur à l'autre
          const d = diapositive(r, etat.diapo);
          agit(mesure(ecartLu, Math.round(Math.abs(etat.curseurs[1] - etat.curseurs[0]) / interfrange(r.lambda, d?.b ?? 1, etat.ecran))));
          vue = { ...vue, saisie: null };
        }
        break;
    }
  }
  return { etat, gestes, cles, etapes, fini: false };
}

const fautes = (r: ReglagesDiffraction, etat: EtatDiffraction) => regles.bilan(r, etat).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);
/** Vrai si le laser était éteint à chaque fois que quelque chose a été déplacé : le laser, l'écran, une diapositive. */
function laserCoupeAvantDeDeplacer(r: ReglagesDiffraction, gestes: GesteBrut[]): boolean {
  let etat = regles.depart(r);
  for (const g of gestes) {
    if ((g.g === "fixer" || g.g === "ecran" || g.g === "diapo") && etat.allume) return false;
    etat = regles.geste(r, etat, g);
  }
  return true;
}

describe("l'élève qui suit le guide de la paillasse de diffraction", () => {
  for (const t of [cheveu, young]) {
    it(`${t.id} : la manipulation est sans faute, pour chaque graine`, () => {
      for (const graine of GRAINES) {
        const r = reglages(t, graine);
        const s = suis(r);
        expect(s.fini, `${t.id} graine ${graine} : le guide s'arrête sur ${s.cles.slice(-3).join(", ")}`).toBe(true);
        expect(fautes(r, s.etat), `${t.id} graine ${graine}`).toEqual([]);
        expect(regles.bilan(r, s.etat).score).toBe(1);
        // rejouée par le serveur, la liste des gestes redonne le même état
        expect(rejoue(regles, r, s.gestes)).toEqual(s.etat);
        // le laser se coupe avant de déplacer quoi que ce soit, et il est éteint à la fin
        expect(laserCoupeAvantDeDeplacer(r, s.gestes), `${t.id} graine ${graine}`).toBe(true);
        expect(s.etat.allume).toBe(false);
        expect(s.etat.dangers).toBe(0);
        // le rang de l'étape du protocole ne recule jamais, et le guide va jusqu'à la dernière
        expect([...s.etapes].sort((a, b) => a - b)).toEqual(s.etapes);
        expect(s.etapes[s.etapes.length - 1]).toBe(paillasse(t, graine).protocole.length - 1);
      }
    });
    it(`${t.id} : un élève qui réagit avec un peu de retard, ou qui manipule au clavier, reste sans faute`, () => {
      for (const graine of GRAINES) {
        const r = reglages(t, graine);
        for (const eleve of [{ retard: 3 }, { clavier: true }]) {
          const s = suis(r, eleve);
          expect(s.fini, `${t.id} graine ${graine} : ${s.cles.slice(-3).join(", ")}`).toBe(true);
          expect(fautes(r, s.etat), `${t.id} graine ${graine}`).toEqual([]);
          expect(laserCoupeAvantDeDeplacer(r, s.gestes)).toBe(true);
        }
      }
    });
  }

  it("cheveu : le guide suit l'ordre du protocole, et ses clés ne changent qu'avec le geste", () => {
    const { cles } = suis(reglages(cheveu, 1));
    const figure = (id: string) => [`${id}-diapo`, "allumer", `${id}-curseur-1`, `${id}-curseur-2`, `${id}-noter`, `${id}-ajuster-1`, `${id}-lacher`, `${id}-ajuster-2`, `${id}-lacher`, `${id}-lire`];
    expect(cles).toEqual(["fixer", "ecran", "distance", "distance-lire",
      ...figure("f40"), "eteindre", ...figure("f60"), "eteindre", ...figure("f100"), "eteindre", ...figure("cheveu"), "eteindre-fin", "fini"]);
  });
  it("young : le laser, les deux fentes, l'écran et la distance, puis les curseurs, la lecture et le comptage", () => {
    const { cles } = suis(reglages(young, 2));
    expect(cles).toEqual(["fixer", "fentes-diapo", "ecran", "distance", "distance-lire", "allumer", "fentes-curseur-1", "fentes-curseur-2",
      "fentes-noter", "fentes-ajuster-1", "fentes-lacher", "fentes-ajuster-2", "fentes-lacher", "fentes-lire", "fentes-compter", "eteindre-fin", "fini"]);
  });
  it("il dit le geste, jamais la mesure : la zone sombre où poser le curseur, le sens où l'ajuster, pas la graduation", () => {
    const r = reglages(cheveu, 1);
    const pret = rejoue(regles, r, [{ g: "fixer", on: true }, { g: "ecran", x: 150 }, { g: "distance", v: 150 }, { g: "diapo", id: "f40" }, { g: "laser", on: true }]);
    const L = tacheCentrale(r.lambda, 40, 150);
    // en vue d'ensemble : la main amène le curseur dans la zone sombre ; la phrase ne dit aucune graduation
    const gros = prochain(r, pret, SANS);
    expect(gros).toMatchObject({ cle: "f40-curseur-1", geste: "curseur", k: 1, vers: CENTRE - L / 2 });
    expect(gros.texte.replace("curseur 1", "")).not.toMatch(/\d/);
    // à un millimètre et demi près, le curseur est posé : le guide passe à l'autre, puis fait noter
    const poses = puis(r, pret, [{ g: "curseur", k: 1, x: CENTRE - L / 2 + 1.2 }, { g: "curseur", k: 2, x: CENTRE + L / 2 - 1.2 }]);
    expect(prochain(r, poses, SANS)).toMatchObject({ cle: "f40-noter", geste: "bouton", bouton: "mesure" });
    // de près : le sens seulement ; le guide ne dit pas jusqu'où
    const ajuster = prochain(r, poses, { saisie: "ecart", tenu: null });
    expect(ajuster).toMatchObject({ cle: "f40-ajuster-1", geste: "ajuster", k: 1, sens: -1 });
    expect(ajuster).not.toHaveProperty("vers");
    expect(ajuster.texte.replace("curseur 1", "")).not.toMatch(/\d/);
    // le curseur au milieu de la zone sombre : le doigt se lève ; puis l'autre curseur, puis la lecture, sans la valeur
    const un = regles.geste(r, poses, { g: "curseur", k: 1, x: CENTRE - L / 2 });
    expect(prochain(r, un, { saisie: "ecart", tenu: 1 })).toMatchObject({ cle: "f40-lacher", geste: "lacher" });
    expect(prochain(r, un, { saisie: "ecart", tenu: null })).toMatchObject({ cle: "f40-ajuster-2", geste: "ajuster", k: 2, sens: 1 });
    const deux = regles.geste(r, un, { g: "curseur", k: 2, x: CENTRE + L / 2 });
    const lire = prochain(r, deux, { saisie: "ecart", tenu: null });
    expect(lire).toMatchObject({ cle: "f40-lire", geste: "montrer", quoi: "curseurs" });
    expect(lire.texte).not.toMatch(/\d/);
  });
  it("young : il fait pointer deux franges sombres éloignées, et compter soi-même les interfranges", () => {
    const r = reglages(young, 1);
    const fentes = diapositive(r, "y20")!;
    const p = pointage(r, fentes, 150);
    const i = interfrange(r.lambda, fentes.b, 150);
    // un nombre impair d'interfranges, au moins cinq, autour du centre ; les deux curseurs sur des franges sombres
    expect(p.n).toBeGreaterThanOrEqual(5);
    expect(p.n % 2).toBe(1);
    expect((p.droite - p.gauche) / i).toBeCloseTo(p.n, 9);
    expect(Math.cos((Math.PI * (p.gauche - CENTRE)) / i) ** 2).toBeCloseTo(0, 9);
    // la consigne du comptage ne donne pas le nombre
    const compter = prochain(r, rejoue(regles, r, suis(r).gestes.filter((g) => g.g !== "mesure" && !(g.g === "laser" && g.on === false))), { saisie: "nombre", tenu: null });
    expect(compter).toMatchObject({ cle: "fentes-compter", geste: "montrer", quoi: "franges" });
    expect(compter.texte).not.toMatch(/\d/);
  });
  it("une lecture ouverte au mauvais moment : il fait annuler", () => {
    const r = reglages(cheveu, 1);
    const depart = regles.depart(r);
    expect(prochain(r, depart, { saisie: "distance" })).toMatchObject({ cle: "distance-annuler", geste: "dire" });
    expect(prochain(r, depart, { saisie: "ecart" })).toMatchObject({ cle: "mesure-annuler", geste: "dire" });
    expect(prochain(r, depart, { saisie: "nombre" })).toMatchObject({ cle: "mesure-annuler", geste: "dire" });
  });
});

describe("le guide rattrape une manipulation mal partie", () => {
  const r = reglages(cheveu, 4);
  it("le laser allumé sur la table : il le fait éteindre tout de suite, puis fixer ; la faute de sécurité reste", () => {
    const avant: GesteBrut[] = [{ g: "laser", on: true }];
    const p = prochain(r, rejoue(regles, r, avant), SANS);
    expect(p).toMatchObject({ cle: "eteindre", geste: "laser", on: false });
    expect(p.texte).toContain("Éteins tout de suite le laser");
    const s = suis(r, { avant });
    expect(s.cles.slice(0, 2)).toEqual(["eteindre", "fixer"]);
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual(["securite!"]);
  });
  it("le laser allumé trop tôt, l'écran encore trop près : il le fait éteindre avant de déplacer l'écran", () => {
    const avant: GesteBrut[] = [{ g: "fixer", on: true }, { g: "laser", on: true }];
    const s = suis(r, { avant });
    expect(s.cles.slice(0, 3)).toEqual(["eteindre", "ecran", "distance"]);
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
    expect(laserCoupeAvantDeDeplacer(r, s.gestes.slice(avant.length))).toBe(true);
  });
  it("l'écran déplacé en cours d'étalonnage : la distance se relit, et les mesures déjà faites se refont", () => {
    const complet = suis(r);
    // deux fentes mesurées, puis l'écran glissé dix centimètres plus loin
    const fin = complet.gestes.findIndex((g) => g.g === "diapo" && g.id === "f100");
    const avant: GesteBrut[] = [...complet.gestes.slice(0, fin), { g: "ecran", x: 160 }];
    const p = prochain(r, rejoue(regles, r, avant), SANS);
    expect(p).toMatchObject({ cle: "distance", geste: "bouton", bouton: "distance" });
    expect(p.texte).toContain("L'écran a bougé");
    const s = suis(r, { avant });
    expect(s.cles.slice(0, 3)).toEqual(["distance", "distance-lire", "f40-diapo"]);
    expect(rejoue(regles, r, s.gestes.slice(0, avant.length + 1)).distance).toEqual({ v: 160, ecran: 160 });
    expect(s.fini).toBe(true);
    expect(s.etat.ecran).toBe(160);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("l'écran déplacé une fois tout mesuré : les mesures restent acquises, il ne fait rien refaire", () => {
    const complet = suis(r);
    const apres = puis(r, complet.etat, [{ g: "ecran", x: 120 }, { g: "fixer", on: false }]);
    expect(fautes(r, apres)).toEqual([]);
    expect(prochain(r, apres, SANS)).toMatchObject({ cle: "fini", geste: "bouton", bouton: "fini" });
    const y = reglages(young, 1);
    expect(prochain(y, puis(y, suis(y).etat, [{ g: "ecran", x: 120 }]), SANS).cle).toBe("fini");
  });
  it("une tache mal pointée, une lecture fausse : il fait refaire ces mesures, et elles seules", () => {
    const complet = suis(r);
    const L = tacheCentrale(r.lambda, 60, complet.etat.ecran);
    const avant: GesteBrut[] = [...complet.gestes, { g: "diapo", id: "f60" }, { g: "laser", on: true },
      { g: "curseur", k: 1, x: CENTRE - L / 2 - 3 }, { g: "curseur", k: 2, x: CENTRE + L / 2 + 3 }, { g: "mesure", v: demi(L + 6) },
      { g: "diapo", id: "cheveu" }, { g: "mesure", v: 5 }];
    expect(fautes(r, rejoue(regles, r, avant)).sort()).toEqual(["lecture!", "pointage!"]);
    const s = suis(r, { avant });
    expect(s.cles[0]).toBe("eteindre");
    expect(s.cles).toContain("f60-diapo");
    expect(s.cles).not.toContain("f40-diapo");
    expect(s.cles).not.toContain("f100-diapo");
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("young : une fente simple dans le support, puis des interfranges mal comptés : la diapositive se change, la mesure se refait", () => {
    const y = reglages(young, 3);
    const avant: GesteBrut[] = [{ g: "fixer", on: true }, { g: "diapo", id: "f70" }];
    const p = prochain(y, rejoue(regles, y, avant), SANS);
    expect(p).toMatchObject({ cle: "fentes-diapo", geste: "diapo", id: "y20" });
    expect(p.texte).toContain("pas de franges d'interférences");
    expect(fautes(y, suis(y, { avant }).etat)).toEqual([]);
    // des fentes déjà en place : le guide les garde, même si ce ne sont pas celles qu'il aurait choisies
    expect(suis(y, { avant: [{ g: "fixer", on: true }, { g: "diapo", id: "y50" }] }).etat.mesures.map((m) => m.diapo)).toEqual(["y50"]);
    // une mesure avec un interfrange de trop : elle se refait
    const complet = suis(y);
    const fausse = complet.etat.mesures[0];
    const mal: GesteBrut[] = [...complet.gestes.filter((g) => !(g.g === "laser" && g.on === false)), { g: "mesure", v: fausse.v, n: fausse.n + 1 }];
    expect(fautes(y, rejoue(regles, y, mal))).toEqual(["comptage!"]);
    expect(prochain(y, rejoue(regles, y, mal), SANS)).toMatchObject({ cle: "fentes-noter", geste: "bouton", bouton: "mesure" });
    const s = suis(y, { avant: mal });
    // les curseurs sont restés en place : il reste à relire, et à recompter
    expect(s.cles).toEqual(["fentes-noter", "fentes-lire", "fentes-compter", "eteindre-fin", "fini"]);
    expect(s.fini).toBe(true);
    expect(fautes(y, s.etat)).toEqual([]);
  });
});

describe("ce que la vue fait de ses gestes", () => {
  const r = reglages(cheveu, 1);
  const depart = regles.depart(r);
  it("poser le laser sur son support le fixe ; le reprendre allumé alerte", () => {
    expect(pose(r, depart, "laser", "support")).toMatchObject({ gestes: [{ g: "fixer", on: true }], alerte: false });
    expect(pose(r, depart, "laser", "table")).toEqual({ gestes: [], message: "" });
    const allume = rejoue(regles, r, [{ g: "fixer", on: true }, { g: "laser", on: true }]);
    const repris = pose(r, allume, "laser", "table");
    expect(repris).toMatchObject({ gestes: [{ g: "fixer", on: false }], alerte: true });
    expect(repris.message).toContain("Son faisceau part dans la salle");
  });
  it("poser une diapositive la glisse dans le support ; le conseil ne vient que si la figure est sur l'écran", () => {
    expect(pose(r, depart, "f40", "porte")).toEqual({ gestes: [{ g: "diapo", id: "f40" }], message: "Dans le support : la fente de 40 µm.", conseil: undefined });
    const allume = rejoue(regles, r, [{ g: "fixer", on: true }, { g: "laser", on: true }]);
    expect(pose(r, allume, "cheveu", "porte").conseil).toBe("Regarde l'écran, en haut.");
    expect(pose(r, depart, "licorne", "porte")).toEqual({ gestes: [], message: "" });
    expect(pose(r, depart, "f40", "table")).toEqual({ gestes: [], message: "" });
  });
  it("une mesure porte l'écart lu, et le nombre d'interfranges s'il y en a", () => {
    expect(mesure(32.5)).toEqual({ g: "mesure", v: 32.5 });
    expect(mesure(44.5, 9)).toEqual({ g: "mesure", v: 44.5, n: 9 });
  });
});
