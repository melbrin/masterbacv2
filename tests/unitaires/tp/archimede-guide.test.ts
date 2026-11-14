// Le guide de la paillasse Archimède (lib/commun/tp/paillasses/archimede-guide.ts). Un élève de test fait, sans
// réfléchir, exactement ce que le guide lui dit : la manipulation qu'il obtient doit être sans faute, pour chaque
// graine. Le guide est donc complet, dans le bon ordre, et il ne tourne jamais en rond.
import { describe, expect, it } from "vitest";
import { COURSE, regles, situation, toutImmerge, type EtatArchimede, type ReglagesArchimede } from "@/lib/commun/tp/paillasses/archimede";
import { descenteCible, pose, prochain, type PasDuGuide, type VueArchimede } from "@/lib/commun/tp/paillasses/archimede-guide";
import { PLAFOND_AVEC_GUIDE, avecMarqueDuGuide, rejoue, type GesteBrut, type ReglesPaillasse } from "@/lib/commun/tp/types";
import archimede from "@/lib/serveur/contenu/tp/archimede";
import { verifie } from "@/lib/serveur/tp";
import { GRAINES, type EtapeDePaillasse } from "../../outils/tp";

/** L'étape de paillasse du TP, pour une graine. Le TP est en construction : le test donne ses règles au serveur. */
function paillasse(graine: number): EtapeDePaillasse {
  const etape = archimede.etapes(graine).find((e) => e.genre === "paillasse");
  if (!etape || etape.genre !== "paillasse") throw new Error("pas de paillasse dans le TP");
  return etape;
}
const reglages = (graine: number) => paillasse(graine).paillasse.reglages as ReglagesArchimede;
const sesRegles = async () => regles as unknown as ReglesPaillasse<unknown, unknown>;

interface Suivi { etat: EtatArchimede; gestes: GesteBrut[]; cles: string[]; etapes: number[]; fini: boolean }
interface Eleve {
  /** les pas de potence faits en trop avant que l'élève réagisse à une nouvelle consigne */
  retard?: number;
  /** des gestes faits avant d'écouter le guide */
  avant?: GesteBrut[];
}
/** Ce que la potence parcourt entre deux regards vers le guide, en centimètres. */
const PAS = 0.25;
const lisPoids = (r: ReglagesArchimede, etat: EtatArchimede) => Math.round(situation(r, etat).force / 0.005) * 0.005;
const lisVolume = (r: ReglagesArchimede, etat: EtatArchimede) => Math.round((situation(r, etat).volume ?? 0) * 2) / 2;

/** L'élève de test : il fait ce que le guide dit, jusqu'à « J'ai fini ». Il lit ses appareils à la demi-graduation. */
function suis(r: ReglagesArchimede, eleve: Eleve = {}): Suivi {
  let etat = rejoue(regles, r, eleve.avant ?? []);
  const gestes: GesteBrut[] = [...(eleve.avant ?? [])];
  let vue: VueArchimede = { saisie: null };
  const cles: string[] = [], etapes: number[] = [];
  const agit = (g: GesteBrut) => { const suite = regles.geste(r, etat, g); if (suite !== etat) { etat = suite; gestes.push(g); } };
  let dernier: PasDuGuide | null = null;
  let sens = 0;
  for (let tour = 0; tour < 3000; tour++) {
    const p = prochain(r, etat, vue);
    if (p.cle !== dernier?.cle) {
      cles.push(p.cle);
      etapes.push(p.etape);
      // une nouvelle consigne : la main qui glissait la potence met un peu de temps à s'arrêter
      if (dernier?.geste === "potence") for (let i = 0; i < (eleve.retard ?? 0); i++) agit({ g: "potence", v: sens * PAS });
      dernier = p;
      if (prochain(r, etat, vue).cle !== p.cle) continue;
    }
    switch (p.geste) {
      case "glisser": pose(r, etat, p.objet, p.cible).gestes.forEach(agit); break;
      case "potence": {
        const ecart = p.vers - etat.descente;
        sens = Math.sign(ecart);
        agit({ g: "potence", v: sens * Math.min(PAS, Math.abs(ecart)) });
        break;
      }
      case "bouton":
        if (p.bouton === "fini") return { etat, gestes, cles, etapes, fini: true };
        vue = { saisie: p.bouton };
        break;
      case "montrer":
        // il lit la loupe, puis il note
        agit(vue.saisie === "poids" ? { g: "noter", quoi: "poids", v: lisPoids(r, etat) } : { g: "noter", quoi: "volume", v: lisVolume(r, etat) });
        vue = { saisie: null };
        break;
    }
  }
  return { etat, gestes, cles, etapes, fini: false };
}

const fautes = (r: ReglagesArchimede, etat: EtatArchimede) => regles.bilan(r, etat).fautes.map((f) => `${f.code}${f.grave ? "!" : ""}`);
const descendre = (v: number): GesteBrut => ({ g: "potence", v });

describe("l'élève qui suit le guide de la poussée d'Archimède", () => {
  it("la manipulation est sans faute, pour chaque graine", () => {
    for (const graine of GRAINES) {
      const r = reglages(graine);
      const s = suis(r);
      expect(s.fini, `graine ${graine} : le guide s'arrête sur ${s.cles.slice(-3).join(", ")}`).toBe(true);
      expect(fautes(r, s.etat), `graine ${graine}`).toEqual([]);
      const bilan = regles.bilan(r, s.etat);
      expect(bilan.score).toBe(1);
      // les cinq mesures sont celles de l'élève, prises avec le cylindre du sujet
      expect(Object.keys(s.etat.notes).sort()).toEqual(["air", "eau:apres", "eau:avant", "eau:poids", "x:poids"]);
      expect(s.etat.notes.air.solide).toBe(r.demande);
      expect(bilan.mesures.V1 - bilan.mesures.V0).toBeGreaterThan(20);
      // rejouée par le serveur, la liste des gestes redonne le même état
      expect(rejoue(regles, r, s.gestes)).toEqual(s.etat);
    }
  });
  it("un élève qui arrête la potence avec un peu de retard reste sans faute", () => {
    for (const graine of GRAINES) {
      for (const retard of [2, 6]) {
        const r = reglages(graine);
        const s = suis(r, { retard });
        expect(s.fini, `graine ${graine}, retard ${retard} : ${s.cles.slice(-3).join(", ")}`).toBe(true);
        expect(fautes(r, s.etat), `graine ${graine}, retard ${retard}`).toEqual([]);
      }
    }
  });
  it("le guide suit l'ordre du protocole, et montre chaque étape", () => {
    const { cles, etapes } = suis(reglages(1));
    expect(cles).toEqual(["accrocher", "noter-poids-air", "lire-poids", "poser-eau", "noter-volume-avant", "lire-volume", "immerger-eau", "noter-poids-eau", "lire-poids",
      "noter-volume-apres", "lire-volume", "remonter", "essuyer", "ranger-eau", "poser-x", "immerger-x", "noter-poids-x", "lire-poids", "fini"]);
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
      for (const saisie of [null, "poids", "volume"] as const) phrases.add(prochain(r, etat, { saisie }).texte);
    }
    expect(phrases.size).toBeGreaterThan(12);
    for (const phrase of phrases) {
      expect(/\d,\d/.test(phrase), phrase).toBe(false);
      expect(/[—–]/.test(phrase), phrase).toBe(false);
      expect(/\b(vous|votre|vos)\b/i.test(phrase), phrase).toBe(false);
    }
  });
  it("la consigne ne clignote pas pendant que la potence glisse", () => {
    const r = reglages(3);
    const debut = rejoue(regles, r, [{ g: "accrocher", s: r.demande }, { g: "noter", quoi: "poids", v: 0.5 }, { g: "poser", l: "eau" }, { g: "noter", quoi: "volume", v: 55 }]);
    // en descendant d'un demi-millimètre à la fois : descendre, puis noter, puis décoller du fond ; jamais de retour en arrière
    let etat = debut;
    const vues: string[] = [];
    for (let i = 0; i < COURSE * 20; i++) {
      etat = regles.geste(r, etat, descendre(0.05));
      const cle = prochain(r, etat, { saisie: null }).cle;
      if (vues[vues.length - 1] !== cle) vues.push(cle);
    }
    expect(vues).toEqual(["immerger-eau", "noter-poids-eau", "decoller-eau"]);
    // en remontant : décoller, noter, puis de nouveau descendre
    const retour: string[] = [];
    for (let i = 0; i < COURSE * 20; i++) {
      etat = regles.geste(r, etat, descendre(-0.05));
      const cle = prochain(r, etat, { saisie: null }).cle;
      if (retour[retour.length - 1] !== cle) retour.push(cle);
    }
    expect(retour).toEqual(["decoller-eau", "noter-poids-eau", "immerger-eau"]);
  });
  it("la potence est envoyée au milieu de la plage où le cylindre est immergé sans toucher le fond", () => {
    for (const graine of GRAINES) {
      const r = reglages(graine);
      for (const l of ["eau", "x"]) {
        const etat = rejoue(regles, r, [{ g: "accrocher", s: r.demande }, { g: "poser", l }]);
        const cible = descenteCible(r, etat);
        expect(cible).not.toBeNull();
        // un bon centimètre de marge de chaque côté : la main de l'élève n'a pas à viser juste
        for (const ecart of [-1, 0, 1]) {
          const sit = situation(r, { ...etat, descente: (cible ?? 0) + ecart });
          expect(toutImmerge(sit) && !sit.fond, `graine ${graine}, ${l}, écart ${ecart}`).toBe(true);
        }
      }
    }
    // sans assez de liquide pour couvrir le cylindre, aucune hauteur ne convient
    const r = reglages(1);
    const peu: ReglagesArchimede = { ...r, liquides: r.liquides.map((l) => ({ ...l, volume: 8 })) };
    expect(descenteCible(peu, rejoue(regles, peu, [{ g: "accrocher", s: peu.demande }, { g: "poser", l: "eau" }]))).toBeNull();
  });
});

describe("le guide rattrape une manipulation mal partie", () => {
  const r = reglages(1);
  const autre = r.solides.find((s) => s.id !== r.demande)!.id;
  const rattrape = (avant: GesteBrut[]) => {
    const s = suis(r, { avant });
    expect(s.fini, s.cles.slice(-3).join(", ")).toBe(true);
    expect(fautes(r, s.etat)).toEqual([]);
    return s.cles;
  };
  it("un autre cylindre que celui du sujet, déjà pesé : il le fait reposer, et tout reprendre avec le bon", () => {
    const avant: GesteBrut[] = [{ g: "accrocher", s: autre }, { g: "noter", quoi: "poids", v: 0.6 }];
    expect(regles.bilan(r, rejoue(regles, r, avant)).fautes.map((f) => f.code)).toContain("solide");
    expect(rattrape(avant).slice(0, 4)).toEqual(["decrocher", "accrocher", "noter-poids-air", "lire-poids"]);
  });
  it("un cylindre pesé dans l'air encore mouillé : il le fait essuyer, puis peser de nouveau", () => {
    const avant: GesteBrut[] = [{ g: "accrocher", s: r.demande }, { g: "poser", l: "eau" }, descendre(14), descendre(-14)];
    const mouille = rejoue(regles, r, avant);
    avant.push({ g: "noter", quoi: "poids", v: lisPoids(r, mouille) });
    expect(fautes(r, rejoue(regles, r, avant))).toContain("mouille");
    expect(rattrape(avant).slice(0, 3)).toEqual(["essuyer", "noter-poids-air", "lire-poids"]);
  });
  it("un cylindre posé sur le fond quand le poids apparent a été noté : il le fait décoller, puis noter de nouveau", () => {
    const debut: GesteBrut[] = [{ g: "accrocher", s: r.demande }, { g: "noter", quoi: "poids", v: lisPoids(r, rejoue(regles, r, [{ g: "accrocher", s: r.demande }])) }, { g: "poser", l: "eau" }, descendre(COURSE)];
    const avant: GesteBrut[] = [...debut, { g: "noter", quoi: "poids", v: lisPoids(r, rejoue(regles, r, debut)) }];
    expect(fautes(r, rejoue(regles, r, avant))).toContain("fond!");
    const cles = rattrape(avant);
    // le volume de départ manque : le cylindre sort d'abord du liquide
    expect(cles.slice(0, 3)).toEqual(["remonter", "noter-volume-avant", "lire-volume"]);
    expect(cles).toContain("immerger-eau");
  });
  it("posé sur le fond, tout le reste étant fait : il fait remonter un peu la potence", () => {
    const soignee = suis(r).gestes;
    // la dernière mesure est refaite sur le fond de l'éprouvette
    const bas: GesteBrut[] = [...soignee, descendre(COURSE)];
    const avant: GesteBrut[] = [...bas, { g: "noter", quoi: "poids", v: lisPoids(r, rejoue(regles, r, bas)) }];
    expect(fautes(r, rejoue(regles, r, avant))).toEqual(["fond!"]);
    expect(prochain(r, rejoue(regles, r, avant), { saisie: null })).toMatchObject({ cle: "decoller-x", geste: "potence" });
    expect(rattrape(avant).slice(0, 3)).toEqual(["decoller-x", "noter-poids-x", "lire-poids"]);
  });
  it("un cylindre à moitié immergé quand les lectures ont été notées : il fait descendre, puis noter de nouveau", () => {
    const debut: GesteBrut[] = [{ g: "accrocher", s: r.demande }, { g: "poser", l: "eau" }, descendre(9)];
    let etat = rejoue(regles, r, debut);
    while (situation(r, etat).immerge < 0.5) { debut.push(descendre(0.25)); etat = rejoue(regles, r, debut); }
    const avant: GesteBrut[] = [...debut, { g: "noter", quoi: "poids", v: lisPoids(r, etat) }, { g: "noter", quoi: "volume", v: lisVolume(r, etat) }];
    expect(fautes(r, rejoue(regles, r, avant))).toContain("immersion!");
    const cles = rattrape(avant);
    expect(cles.filter((c) => c === "noter-poids-eau" || c === "noter-volume-apres")).toEqual(["noter-poids-eau", "noter-volume-apres"]);
  });
  it("un cylindre plongé dans le liquide X sans être essuyé : il le fait sortir, essuyer, replonger", () => {
    const sansEssuyer = suis(r).gestes.filter((g) => g.g !== "essuyer");
    expect(fautes(r, rejoue(regles, r, sansEssuyer))).toEqual(["essuyage"]);
    expect(rattrape(sansEssuyer)).toEqual(["remonter", "essuyer", "immerger-x", "noter-poids-x", "lire-poids", "fini"]);
  });
  it("l'éprouvette de liquide X posée la première, ou la potence descendue avant d'accrocher : il fait ranger, remonter", () => {
    expect(rattrape([{ g: "poser", l: "x" }]).slice(0, 5)).toEqual(["accrocher", "noter-poids-air", "lire-poids", "ranger-x", "poser-eau"]);
    expect(rattrape([{ g: "poser", l: "eau" }, descendre(10)]).slice(0, 2)).toEqual(["remonter", "accrocher"]);
    // un autre cylindre descendu dans l'éprouvette : la potence remonte avant qu'on le décroche
    expect(rattrape([{ g: "accrocher", s: autre }, { g: "poser", l: "eau" }, descendre(12)]).slice(0, 3)).toEqual(["remonter", "decrocher", "accrocher"]);
  });
  it("une saisie ouverte : il fait lire la loupe qui convient", () => {
    const etat = rejoue(regles, r, [{ g: "accrocher", s: r.demande }, { g: "poser", l: "eau" }]);
    expect(prochain(r, etat, { saisie: "poids" })).toMatchObject({ cle: "lire-poids", geste: "montrer", quoi: "dynamometre", etape: 0 });
    expect(prochain(r, etat, { saisie: "volume" })).toMatchObject({ cle: "lire-volume", geste: "montrer", quoi: "eprouvette", etape: 1 });
    const dedans = regles.geste(r, etat, descendre(descenteCible(r, etat) ?? 0));
    expect(prochain(r, dedans, { saisie: "poids" }).etape).toBe(3);
    expect(prochain(r, dedans, { saisie: "volume" }).etape).toBe(3);
    const dansX = rejoue(regles, r, [{ g: "accrocher", s: r.demande }, { g: "poser", l: "x" }, descendre(14)]);
    expect(prochain(r, dansX, { saisie: "poids" }).etape).toBe(5);
  });
  it("des réglages sans liquide de référence : il ne reste qu'à appeler le professeur", () => {
    expect(prochain({ ...r, reference: "rien" }, regles.depart(r), { saisie: null }).cle).toBe("fini");
  });
});

describe("poser un objet", () => {
  const r = reglages(1);
  const s = r.demande;
  const autre = r.solides.find((x) => x.id !== s)!.id;
  const depart = regles.depart(r);
  it("donne aux règles le geste qui convient, et dit ce qui s'est passé", () => {
    expect(pose(r, depart, `sol-${s}`, "crochet")).toMatchObject({ gestes: [{ g: "accrocher", s }] });
    expect(pose(r, depart, "ep-eau", "dessous").gestes).toEqual([{ g: "poser", l: "eau" }]);
    const accroche = rejoue(regles, r, [{ g: "accrocher", s }, { g: "poser", l: "eau" }]);
    expect(pose(r, accroche, `sol-${s}`, `etagere-${s}`).gestes).toEqual([{ g: "decrocher" }]);
    expect(pose(r, accroche, "ep-eau", "repos-eau").gestes).toEqual([{ g: "ranger" }]);
    const mouille = rejoue(regles, r, [{ g: "accrocher", s }, { g: "poser", l: "eau" }, descendre(14), descendre(-14)]);
    expect(pose(r, mouille, "papier", "pendu").gestes).toEqual([{ g: "essuyer", s }]);
    // reposé mouillé sur l'étagère, il s'essuie aussi là
    const repose = rejoue(regles, r, [{ g: "accrocher", s }, { g: "poser", l: "eau" }, descendre(14), descendre(-14), { g: "decrocher" }]);
    expect(pose(r, repose, "papier", `etagere-${s}`).gestes).toEqual([{ g: "essuyer", s }]);
    for (const [etat, objet, cible] of [[depart, `sol-${s}`, "crochet"], [depart, "ep-eau", "dessous"], [accroche, `sol-${s}`, `etagere-${s}`], [accroche, "ep-eau", "repos-eau"], [mouille, "papier", "pendu"]] as const) {
      expect(pose(r, etat, objet, cible).message.length).toBeGreaterThan(10);
    }
  });
  it("un geste impossible ne donne rien aux règles, et la phrase dit pourquoi", () => {
    const dedans = rejoue(regles, r, [{ g: "accrocher", s }, { g: "poser", l: "eau" }, descendre(14)]);
    expect(pose(r, dedans, `sol-${s}`, `etagere-${s}`)).toEqual({ gestes: [], message: expect.stringContaining("remonte d'abord la potence") });
    expect(pose(r, dedans, "ep-eau", "repos-eau")).toEqual({ gestes: [], message: expect.stringContaining("remonte d'abord la potence") });
    expect(pose(r, dedans, "papier", "pendu")).toEqual({ gestes: [], message: expect.stringContaining("sors-le avant de l'essuyer") });
    expect(pose(r, dedans, `sol-${autre}`, "crochet")).toEqual({ gestes: [], message: expect.stringContaining("décroche-le d'abord") });
    expect(pose(r, dedans, "ep-x", "dessous")).toEqual({ gestes: [], message: expect.stringContaining("range-la d'abord") });
    // crochet nu descendu dans l'éprouvette, cylindre qui pend trop bas pour l'éprouvette
    const bas = rejoue(regles, r, [{ g: "poser", l: "eau" }, descendre(13)]);
    expect(pose(r, bas, `sol-${s}`, "crochet")).toEqual({ gestes: [], message: expect.stringContaining("remonte d'abord la potence") });
    expect(pose(r, bas, "ep-eau", "repos-eau").message).toContain("Le crochet est dans l'éprouvette");
    const pend = rejoue(regles, r, [{ g: "accrocher", s }, descendre(10)]);
    expect(pose(r, pend, "ep-eau", "dessous")).toEqual({ gestes: [], message: expect.stringContaining("pend trop bas") });
    // un cylindre sec ne s'essuie pas
    expect(pose(r, rejoue(regles, r, [{ g: "accrocher", s }]), "papier", "pendu")).toEqual({ gestes: [], message: expect.stringContaining("déjà sec") });
  });
  it("un objet ou une cible inconnus ne changent rien", () => {
    for (const [objet, cible] of [["licorne", "crochet"], ["sol-z", "crochet"], ["ep-huile", "dessous"], ["papier", "pendu"], ["papier", "etagere-z"]]) {
      expect(pose(r, depart, objet, cible)).toEqual({ gestes: [], message: "" });
    }
  });
});

describe("la marque du guide", () => {
  it("le professeur plafonne une manipulation faite avec le guide, et le dit", async () => {
    for (const graine of GRAINES.slice(0, 3)) {
      const etape = paillasse(graine);
      const { gestes } = suis(etape.paillasse.reglages as ReglagesArchimede);
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
