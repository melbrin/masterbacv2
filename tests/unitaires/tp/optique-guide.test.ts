// Le guide de la paillasse « optique » (lib/commun/tp/paillasses/optique-guide.ts). Un élève de test fait, sans
// réfléchir, exactement ce que le guide lui dit : la manipulation qu'il obtient doit être sans faute, pour chaque TP et
// chaque graine. Le guide est donc complet, dans le bon ordre, et il ne tourne jamais en rond.
import { describe, expect, it } from "vitest";
import { imageSurEcran, position, regles, type EtatOptique, type ReglagesOptique } from "@/lib/commun/tp/paillasses/optique";
import { REGLE_AU_REPOS, lectures, placeDeLaRegle, pose, prochain, regleEnPlace, releve, type PasOptique, type PieceOptique, type VueOptique } from "@/lib/commun/tp/paillasses/optique-guide";
import { rejoue, type GesteBrut } from "@/lib/commun/tp/types";
import focale from "@/lib/serveur/contenu/tp/focale";
import lunette from "@/lib/serveur/contenu/tp/lunette";
import type { Tp } from "@/lib/serveur/contenu/tp/types";
import { GRAINES, type EtapeDePaillasse } from "../../outils/tp";

const mm = (x: number) => Math.round(x * 10) / 10;
/** L'étape de paillasse d'un TP, pour une graine. */
function paillasse(t: Tp, graine: number): EtapeDePaillasse {
  const etape = t.etapes(graine).find((e) => e.genre === "paillasse");
  if (!etape || etape.genre !== "paillasse") throw new Error(`pas de paillasse dans ${t.id}`);
  return etape;
}
const reglages = (t: Tp, graine: number) => paillasse(t, graine).paillasse.reglages as ReglagesOptique;

interface Suivi { etat: EtatOptique; gestes: GesteBrut[]; cles: string[]; etapes: number[]; fini: boolean }
interface Eleve {
  /** les pas que l'élève fait encore, dans son élan, après une nouvelle consigne */
  retard?: number;
  /** des gestes faits avant d'écouter le guide */
  avant?: GesteBrut[];
  /** il manipule au clavier : aucun doigt ne reste posé dans la loupe */
  clavier?: boolean;
}

/** L'élève de test : il fait ce que le guide dit, jusqu'à « J'ai fini ». Une pièce avance d'un petit pas à chaque tour. */
function suis(r: ReglagesOptique, eleve: Eleve = {}): Suivi {
  let etat = rejoue(regles, r, eleve.avant ?? []);
  const gestes: GesteBrut[] = [...(eleve.avant ?? [])];
  let vue: VueOptique = { saisie: null, regle: REGLE_AU_REPOS };
  let notes: Partial<Record<PieceOptique, number>> = {};
  const cles: string[] = [];
  const etapes: number[] = [];
  const agit = (g: GesteBrut) => { const suite = regles.geste(r, etat, g); if (suite !== etat) { etat = suite; gestes.push(g); } };
  /** le dernier déplacement : un élève qui réagit en retard le prolonge un peu */
  const elan: { dernier: { piece: PieceOptique; pas: number } | null } = { dernier: null };
  const deplace = (piece: PieceOptique, pas: number) => { agit({ g: "glisser", quoi: piece, x: mm((position(etat, piece) ?? 0) + pas) }); elan.dernier = { piece, pas }; };
  let dernier: PasOptique | null = null;
  for (let tour = 0; tour < 8000; tour++) {
    const p = prochain(r, etat, vue);
    if (p.cle !== dernier?.cle) {
      cles.push(p.cle);
      etapes.push(p.etape);
      const lance = elan.dernier;
      if (lance) for (let i = 0; i < (eleve.retard ?? 0); i++) deplace(lance.piece, lance.pas);
      elan.dernier = null;
      dernier = p;
      // « lève le doigt » : la consigne reste jusqu'à ce que le doigt se lève, même s'il a encore glissé un peu
      if (p.geste === "lacher") { vue = { ...vue, loupe: false }; continue; }
      if (prochain(r, etat, vue).cle !== p.cle) continue;
    }
    // le doigt n'est dans la loupe que pour les gestes qui s'y font ; il n'en sort que lorsque le guide le dit, ou pour un autre geste
    const dansLaLoupe = !eleve.clavier && (p.geste === "chercher" || (p.geste === "glisser" && p.loupe));
    if (p.geste !== "lacher" && (vue.loupe ?? false) !== dansLaLoupe) vue = { ...vue, loupe: dansLaLoupe };
    switch (p.geste) {
      case "lacher": vue = { ...vue, loupe: false }; break;
      case "dire": vue = { ...vue, saisie: null }; break;
      case "interrupteur": agit({ g: p.lequel, on: p.lequel === "lampe" }); break;
      case "poser": pose(r, p.lentille, `support-${p.sur}`).gestes.forEach(agit); break;
      case "ranger": agit({ g: "ranger", lentille: p.lentille }); break;
      case "glisser": deplace(p.piece, Math.max(-0.5, Math.min(0.5, p.vers - (position(etat, p.piece) ?? 0)))); break;
      case "chercher": deplace(p.piece, p.sens * 0.1); break;
      case "regle": vue = { ...vue, regle: { x: p.x, y: p.y } }; break;
      case "bouton":
        if (p.bouton === "fini") return { etat, gestes, cles, etapes, fini: true };
        if (p.bouton === "positions") { notes = {}; vue = { ...vue, saisie: lectures(r)[0] }; }
        if (p.bouton === "taille") vue = { ...vue, saisie: "taille" };
        break;
      case "montrer":
        if (p.quoi === "loupe" && vue.saisie && vue.saisie !== "taille") {
          // il lit la graduation en face du repère, puis passe à la pièce suivante
          notes[vue.saisie] = position(etat, vue.saisie) ?? 0;
          const suite = lectures(r)[lectures(r).indexOf(vue.saisie) + 1];
          if (suite) vue = { ...vue, saisie: suite };
          else { agit(releve(notes)); vue = { ...vue, saisie: null }; }
        }
        if (p.quoi === "regle") {
          // il lit la règle : du zéro, en bas, à la graduation en face du haut de la lettre
          agit({ g: "taille", v: mm(Math.abs(imageSurEcran(r, etat).taille) / 2 - vue.regle.y) });
          vue = { ...vue, saisie: null };
        }
        break;
    }
  }
  return { etat, gestes, cles, etapes, fini: false };
}

const fautes = (r: ReglagesOptique, etat: EtatOptique) => regles.bilan(r, etat).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);

describe("l'élève qui suit le guide du banc d'optique", () => {
  for (const t of [focale, lunette]) {
    it(`${t.id} : la manipulation est sans faute, pour chaque graine`, () => {
      for (const graine of GRAINES) {
        const r = reglages(t, graine);
        const s = suis(r);
        expect(s.fini, `${t.id} graine ${graine} : le guide s'arrête sur ${s.cles.slice(-3).join(", ")}`).toBe(true);
        expect(fautes(r, s.etat), `${t.id} graine ${graine}`).toEqual([]);
        expect(regles.bilan(r, s.etat).score).toBe(1);
        // rejouée par le serveur, la liste des gestes redonne le même état
        expect(rejoue(regles, r, s.gestes)).toEqual(s.etat);
        // le rang de l'étape du protocole ne recule jamais, et le guide va jusqu'à la dernière
        expect([...s.etapes].sort((a, b) => a - b)).toEqual(s.etapes);
        expect(s.etapes[s.etapes.length - 1]).toBe(paillasse(t, graine).protocole.length - 1);
      }
    });
    it(`${t.id} : un élève qui réagit avec un peu de retard reste sans faute`, () => {
      for (const graine of GRAINES) {
        const r = reglages(t, graine);
        const s = suis(r, { retard: 3 });
        expect(s.fini, `${t.id} graine ${graine} : ${s.cles.slice(-3).join(", ")}`).toBe(true);
        expect(fautes(r, s.etat), `${t.id} graine ${graine}`).toEqual([]);
      }
    });
  }

  it("focale : le guide suit l'ordre du protocole, et ses clés ne changent qu'avec le geste", () => {
    const { cles } = suis(reglages(focale, 1));
    expect(cles).toEqual(["salle", "lampe", "lentille",
      "lentille-1", "nettete-1-approcher", "nettete-1-finir", "nettete-1-lacher", "positions-1", "lire-objet", "lire-a", "lire-ecran",
      // la deuxième image se forme près de la première : l'écran se règle tout de suite dans la loupe
      "lentille-2", "nettete-2-finir", "nettete-2-lacher", "positions-2", "lire-objet", "lire-a", "lire-ecran",
      "lentille-3", "nettete-3-approcher", "nettete-3-finir", "nettete-3-lacher", "positions-3", "lire-objet", "lire-a", "lire-ecran",
      "taille-noter", "taille-regle", "taille-lire", "fini"]);
  });
  it("au clavier, aucun doigt ne reste dans la loupe : le guide passe de la netteté à la lecture, et la manipulation reste sans faute", () => {
    for (const t of [focale, lunette]) {
      for (const graine of GRAINES) {
        const r = reglages(t, graine);
        const s = suis(r, { clavier: true });
        expect(s.fini, `${t.id} graine ${graine}`).toBe(true);
        expect(s.cles.filter((c) => c.endsWith("-lacher"))).toEqual([]);
        expect(fautes(r, s.etat), `${t.id} graine ${graine}`).toEqual([]);
      }
    }
  });
  it("lunette : l'image sans lunette d'abord, puis les deux lentilles, le réglage, les positions, l'image à travers elle", () => {
    const { cles } = suis(reglages(lunette, 2));
    expect(cles).toEqual(["salle", "lampe", "sans-noter", "sans-regle", "sans-lire", "objectif", "oculaire",
      "reglage-approcher", "reglage-finir", "reglage-lacher", "positions", "lire-a", "lire-b", "avec-noter", "avec-regle", "avec-lire", "fini"]);
  });
  it("il dit le geste, jamais la mesure : le sens où glisser l'écran, pas la place de l'image nette", () => {
    const r = reglages(focale, 1);
    const pret = rejoue(regles, r, [{ g: "salle", on: false }, { g: "lampe", on: true }, { g: "poser", lentille: "cible", sur: "a" }, { g: "glisser", quoi: "a", x: 40 }]);
    const vue: VueOptique = { saisie: null, regle: REGLE_AU_REPOS };
    // l'écran est trop loin : le guide le fait rapprocher, sans écrire de graduation ; la main s'arrête avant l'image
    const nette = 40 + 1 / (1 / 13.6 - 1 / 30);
    const loin = prochain(r, pret, vue);
    expect(loin).toMatchObject({ cle: "nettete-1-approcher", geste: "glisser", piece: "ecran", vers: mm(nette + 1.5), loupe: false });
    expect(loin.texte).not.toMatch(/\d/);
    // trop près : il le fait éloigner ; à deux centimètres de l'image nette, il envoie dans la loupe, sans dire jusqu'où
    expect(prochain(r, regles.geste(r, pret, { g: "glisser", quoi: "ecran", x: 50 }), vue)).toMatchObject({ cle: "nettete-1-approcher", vers: mm(nette - 1.5) });
    const fin = prochain(r, regles.geste(r, pret, { g: "glisser", quoi: "ecran", x: nette + 2 }), vue);
    expect(fin).toMatchObject({ cle: "nettete-1-finir", geste: "chercher", piece: "ecran", sens: -1 });
    expect(fin).not.toHaveProperty("vers");
    expect(prochain(r, regles.geste(r, pret, { g: "glisser", quoi: "ecran", x: nette - 2 }), vue)).toMatchObject({ cle: "nettete-1-finir", sens: 1 });
    // l'image nette : il fait lever le doigt posé dans la loupe, puis il fait noter
    const net = regles.geste(r, pret, { g: "glisser", quoi: "ecran", x: nette });
    expect(prochain(r, net, { ...vue, loupe: true })).toMatchObject({ cle: "nettete-1-lacher", geste: "lacher" });
    expect(prochain(r, net, vue)).toMatchObject({ cle: "positions-1", geste: "bouton", bouton: "positions" });
    // pendant une lecture, il fait lire la loupe, sans la valeur
    const lire = prochain(r, net, { ...vue, saisie: "ecran" });
    expect(lire).toMatchObject({ cle: "lire-ecran", geste: "montrer", quoi: "loupe" });
    expect(lire.texte).not.toMatch(/\d/);
  });
  it("de près, un petit déplacement se finit dans la loupe : la consigne ne change pas, la main change d'endroit", () => {
    const r = reglages(focale, 1);
    const avant: GesteBrut[] = [{ g: "salle", on: false }, { g: "lampe", on: true }, { g: "poser", lentille: "cible", sur: "a" }];
    const vue: VueOptique = { saisie: null, regle: REGLE_AU_REPOS };
    const loin = prochain(r, rejoue(regles, r, avant), vue);
    expect(loin).toMatchObject({ cle: "lentille-1", geste: "glisser", piece: "a", vers: 40, loupe: false });
    const pres = prochain(r, rejoue(regles, r, [...avant, { g: "glisser", quoi: "a", x: 41.4 }]), vue);
    expect(pres).toMatchObject({ cle: "lentille-1", geste: "glisser", piece: "a", vers: 40, loupe: true });
    expect(pres.texte).toBe(loin.texte);
    // à un centimètre près, la lentille est à sa place
    expect(prochain(r, rejoue(regles, r, [...avant, { g: "glisser", quoi: "a", x: 40.8 }]), vue).cle).toBe("nettete-1-approcher");
  });
  it("une lecture ouverte au mauvais moment : il fait annuler", () => {
    const r = reglages(focale, 1);
    const depart = regles.depart(r);
    expect(prochain(r, depart, { saisie: "taille", regle: REGLE_AU_REPOS })).toMatchObject({ cle: "taille-annuler", geste: "dire" });
    expect(prochain(r, depart, { saisie: "objet", regle: REGLE_AU_REPOS })).toMatchObject({ cle: "lire-annuler", geste: "dire" });
    // l'élève de test annule, et reprend le fil
    const s = suis(r);
    expect(s.cles).not.toContain("taille-annuler");
  });
});

describe("le guide rattrape une manipulation mal partie", () => {
  const r = reglages(focale, 6);
  const allume: GesteBrut[] = [{ g: "salle", on: false }, { g: "lampe", on: true }, { g: "poser", lentille: "cible", sur: "a" }];
  it("une lentille divergente sur le support : il fait poser la bonne, qui prend sa place", () => {
    const avant: GesteBrut[] = [{ g: "poser", lentille: "div", sur: "a" }];
    const p = prochain(r, rejoue(regles, r, [...avant, { g: "salle", on: false }, { g: "lampe", on: true }]), { saisie: null, regle: REGLE_AU_REPOS });
    expect(p).toMatchObject({ cle: "lentille", geste: "poser", lentille: "cible", sur: "a" });
    expect(p.texte).toContain("Ce n'est pas la bonne lentille");
    const s = suis(r, { avant });
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("une mesure floue déjà notée : il la fait refaire à la même place, elle remplace l'ancienne", () => {
    const avant: GesteBrut[] = [...allume, { g: "glisser", quoi: "a", x: 40 }, { g: "glisser", quoi: "ecran", x: 70 }, { g: "releve", o: 10, a: 40, e: 70 }];
    expect(fautes(r, rejoue(regles, r, avant))).toContain("nettete!");
    const s = suis(r, { avant });
    expect(s.cles.slice(0, 4)).toEqual(["nettete-1-approcher", "nettete-1-finir", "nettete-1-lacher", "positions-1"]);
    expect(s.fini).toBe(true);
    expect(s.etat.releves).toHaveLength(3);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("une lecture fausse : il fait relire, sans rien déplacer", () => {
    const nette = mm(40 + 1 / (1 / 12.3 - 1 / 30));
    const avant: GesteBrut[] = [...allume, { g: "glisser", quoi: "a", x: 40 }, { g: "glisser", quoi: "ecran", x: nette }, { g: "releve", o: 10, a: 40.6, e: nette }];
    const p = prochain(r, rejoue(regles, r, avant), { saisie: null, regle: REGLE_AU_REPOS });
    expect(p).toMatchObject({ cle: "positions-1", geste: "bouton", bouton: "positions" });
    expect(p.texte).toContain("relis à la loupe");
    const s = suis(r, { avant });
    expect(s.fini).toBe(true);
    expect(s.etat.releves[0].a).toBe(40);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("une mesure impossible à refaire, la lentille trop près de l'objet : trois mesures de plus la font sortir du compte", () => {
    const avant: GesteBrut[] = [...allume, { g: "glisser", quoi: "a", x: 20 }, { g: "glisser", quoi: "ecran", x: 60 }, { g: "releve", o: 10, a: 20, e: 60 }];
    const s = suis(r, { avant });
    expect(s.fini).toBe(true);
    expect(s.etat.releves).toHaveLength(4);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("l'écran devant la place de la lentille : il le fait d'abord éloigner", () => {
    const avant: GesteBrut[] = [...allume, { g: "glisser", quoi: "a", x: 20 }, { g: "glisser", quoi: "ecran", x: 30 }];
    const s = suis(r, { avant });
    expect(s.cles[0]).toBe("ecran-degager");
    expect(s.fini).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("la lentille déplacée après les trois mesures : il fait refaire la plus proche avant de sortir la règle", () => {
    const complet = suis(r);
    const sansTaille = complet.gestes.filter((g) => g.g !== "taille");
    const avant: GesteBrut[] = [...sansTaille, { g: "glisser", quoi: "ecran", x: 120 }, { g: "glisser", quoi: "a", x: 33 }];
    const p = prochain(r, rejoue(regles, r, avant), { saisie: null, regle: REGLE_AU_REPOS });
    expect(p.texte).toContain("La lentille a bougé depuis tes mesures");
    const s = suis(r, { avant });
    expect(s.fini).toBe(true);
    expect(s.etat.releves).toHaveLength(3);
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("une image plus grande que la règle : il fait revenir à une autre mesure, où la règle suffit", () => {
    // la troisième mesure, la lentille à 15 cm de l'objet : l'image est nette, mais haute de 9 cm
    const avant: GesteBrut[] = [...allume,
      { g: "glisser", quoi: "a", x: 40 }, { g: "glisser", quoi: "ecran", x: 60.8 }, { g: "releve", o: 10, a: 40, e: 60.8 },
      { g: "glisser", quoi: "a", x: 34 }, { g: "glisser", quoi: "ecran", x: 59.2 }, { g: "releve", o: 10, a: 34, e: 59.2 },
      { g: "glisser", quoi: "a", x: 25 }, { g: "glisser", quoi: "ecran", x: 93.3 }, { g: "releve", o: 10, a: 25, e: 93.3 }];
    const etat = rejoue(regles, r, avant);
    expect(fautes(r, etat)).toEqual(["taille"]);
    expect(Math.abs(imageSurEcran(r, etat).taille)).toBeGreaterThan(8);
    const p = prochain(r, etat, { saisie: null, regle: REGLE_AU_REPOS });
    expect(p.texte).toContain("trop grande pour la règle");
    expect(p).toMatchObject({ geste: "glisser", piece: "a", vers: 34 });
    const s = suis(r, { avant });
    expect(s.fini).toBe(true);
    expect(s.etat.releves).toHaveLength(3);
    // la règle a servi sur la mesure n° 2, refaite à un centimètre près de sa place
    expect(Math.abs(s.etat.tailles[s.etat.tailles.length - 1].banc.supports[0].x - 34)).toBeLessThanOrEqual(1);
    expect(regles.bilan(r, s.etat).lignes.join(" ")).toContain("Taille de l'image à la mesure n° 2");
    expect(fautes(r, s.etat)).toEqual([]);
  });
  it("lunette : des lentilles posées trop tôt, ou montées à l'envers, se rangent puis se remontent dans le bon ordre", () => {
    const l = reglages(lunette, 1);
    const but = l.but as Extract<ReglagesOptique["but"], { genre: "lunette" }>;
    const envers: GesteBrut[] = [{ g: "poser", lentille: but.oculaire, sur: "a" }, { g: "poser", lentille: but.objectif, sur: "b" }];
    const s = suis(l, { avant: envers });
    expect(s.cles.slice(0, 5)).toEqual(["salle", "lampe", `sans-ranger-${but.oculaire}`, `sans-ranger-${but.objectif}`, "sans-noter"]);
    expect(s.fini).toBe(true);
    expect(s.etat.supports.map((x) => x.lentille)).toEqual([but.objectif, but.oculaire]);
    expect(fautes(l, s.etat)).toEqual([]);
    // la référence déjà mesurée, la lunette à l'envers : une lentille ne se prend que dans la boîte. L'objectif y retourne,
    // puis il se pose sur le premier support, où il prend la place de l'oculaire ; l'oculaire se pose ensuite sur le second.
    const reference = suis(l).gestes.slice(0, 3);
    expect(reference.map((g) => g.g)).toEqual(["salle", "lampe", "taille"]);
    const p = prochain(l, rejoue(regles, l, [...reference, ...envers]), { saisie: null, regle: REGLE_AU_REPOS });
    expect(p).toMatchObject({ cle: "objectif-ranger", geste: "ranger", lentille: but.objectif });
    const t = suis(l, { avant: [...reference, ...envers] });
    expect(t.cles.slice(0, 3)).toEqual(["objectif-ranger", "objectif", "oculaire"]);
    expect(t.fini).toBe(true);
    expect(t.etat.supports.map((x) => x.lentille)).toEqual([but.objectif, but.oculaire]);
    expect(fautes(l, t.etat)).toEqual([]);
  });
  it("lunette : un objectif poussé trop loin ne laisse plus la place à l'oculaire : il le fait reculer", () => {
    const l = reglages(lunette, 2);
    const reference = suis(l).gestes.slice(0, 3);
    const avant: GesteBrut[] = [...reference, { g: "glisser", quoi: "b", x: 100 }, { g: "glisser", quoi: "a", x: 90 }];
    const s = suis(l, { avant });
    expect(s.cles).toContain("objectif-reculer");
    expect(s.fini).toBe(true);
    expect(fautes(l, s.etat)).toEqual([]);
  });
});

describe("ce que la vue fait de ses gestes", () => {
  const r = reglages(focale, 1);
  it("poser une lentille donne le geste aux règles, et dit sur quel support", () => {
    expect(pose(r, "cible", "support-a")).toMatchObject({ gestes: [{ g: "poser", lentille: "cible", sur: "a" }], piece: "a" });
    expect(pose(r, "cible", "support-a").message).toContain("+8 δ");
    expect(pose(reglages(lunette, 1), "c4", "support-b").message).toContain("le second support");
    expect(pose(r, "licorne", "support-a")).toEqual({ gestes: [], piece: null, message: "" });
    expect(pose(r, "cible", "plafond")).toEqual({ gestes: [], piece: null, message: "" });
  });
  it("un relevé lit l'objet, la lentille et l'écran ; pour la lunette, les deux lentilles", () => {
    expect(lectures(r)).toEqual(["objet", "a", "ecran"]);
    expect(lectures(reglages(lunette, 1))).toEqual(["a", "b"]);
    expect(releve({ objet: 10, a: 40, ecran: 61.4 })).toEqual({ g: "releve", o: 10, a: 40, e: 61.4 });
    expect(releve({ a: 20, b: 63.3 })).toEqual({ g: "releve", a: 20, b: 63.3 });
  });
  it("la règle se pose le zéro sur le bas de la lettre, son bord contre la lettre", () => {
    expect(placeDeLaRegle(-4)).toEqual({ x: 1.29, y: -2 });
    expect(regleEnPlace({ x: 1.29, y: -2 }, 4)).toBe(true);
    expect(regleEnPlace({ x: 1.6, y: -1.95 }, -4)).toBe(true);
    expect(regleEnPlace({ x: 1.29, y: -1.8 }, 4)).toBe(false);
    expect(regleEnPlace({ x: 0.5, y: -2 }, 4)).toBe(false);
    expect(regleEnPlace(REGLE_AU_REPOS, 4)).toBe(false);
  });
});
