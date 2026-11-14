// Les situations des TP virtuels (lib/serveur/contenu/tp.ts) et leur vérification par le serveur (lib/serveur/tp.ts).
// Chaque TP est joué ici sans le navigateur : une fois parfaitement, une fois en se trompant partout.
import { describe, expect, it } from "vitest";
import type { GesteCircuit } from "@/lib/commun/tp/circuit";
import type { GesteTitrage } from "@/lib/commun/tp/titrage";
import type { EtapePublique, ReponseEtape } from "@/lib/commun/tp/types";
import { TP, tp, type EtapeTp, type Mesures, type Tp } from "@/lib/serveur/contenu/tp";
import { bilanDuTp, essaisAReprendre, etapePublique, verifie } from "@/lib/serveur/tp";

const GRAINE = 20261114;
const verser = (v: number, fois: number): GesteTitrage[] => Array.from({ length: fois }, () => ({ g: "verser", v }));
const relier = (fils: [string, string][]): GesteCircuit[] => fils.map(([a, b]) => ({ g: "relier", a, b }));

// la manipulation soignée de chaque TP, et les valeurs qu'un élève soigneux calcule ensuite
const MANIPULATIONS: Record<string, (GesteTitrage | GesteCircuit)[]> = {
  detartrant: [{ g: "rincer" }, { g: "remplir" }, { g: "zero" }, { g: "prise" }, { g: "indicateur" }, { g: "agiter" }, ...verser(1, 9), ...verser(0.2, 3), ...verser(0.05, 4), { g: "noter" }],
  vinaigre: [{ g: "rincer" }, { g: "remplir" }, { g: "zero" }, { g: "prise" }, { g: "sonde" }, { g: "agiter" }, ...verser(1, 12), ...verser(0.2, 10), ...verser(1, 3), { g: "noter", v: 13.1 }],
  condensateur: [...relier([["g+", "k1"], ["k2", "r1"], ["r2", "c1"], ["c2", "g-"], ["voie", "c1"], ["masse", "c2"]]), { g: "acquerir" }, { g: "lire", tau: 3.3 }],
  jauge: [...relier([["d2", "r1"], ["r2", "c1"], ["c2", "gnd"], ["a0", "c1"]]), { g: "acquerir" }, { g: "niveau", h: 4 }, { g: "acquerir" }, { g: "niveau", h: 8 }, { g: "acquerir" }],
};

/** La réponse parfaite à une étape : celle qu'un élève qui a tout compris donnerait. */
function parfaite(t: Tp, etape: EtapeTp, publique: EtapePublique, mesures: Mesures): ReponseEtape {
  switch (etape.genre) {
    case "lecture": return { g: "lecture" };
    case "materiel": return { g: "materiel", choisis: etape.objets.filter((o) => o.utile).map((o) => o.id) };
    case "ordre": {
      // l'élève voit les étapes mélangées : il donne, pour chaque rang du bon ordre, la place de l'étape dans ce qu'il voit
      const montrees = (publique as Extract<EtapePublique, { genre: "ordre" }>).etapes;
      return { g: "ordre", ordre: etape.etapes.map((e) => montrees.indexOf(e)) };
    }
    case "choix": return { g: "choix", choix: typeof etape.bonne === "function" ? etape.bonne(mesures) : etape.bonne };
    case "valeur": return { g: "valeur", valeur: etape.attendu(mesures) };
    case "paillasse": return { g: "paillasse", gestes: MANIPULATIONS[t.id] };
  }
}
/** Une réponse fausse à une étape. */
function fausse(etape: EtapeTp, mesures: Mesures): ReponseEtape {
  switch (etape.genre) {
    case "lecture": return { g: "lecture" };
    case "materiel": return { g: "materiel", choisis: etape.objets.filter((o) => !o.utile).map((o) => o.id) };
    case "ordre": return { g: "ordre", ordre: etape.etapes.map((_, i) => i) };
    case "choix": return { g: "choix", choix: ((typeof etape.bonne === "function" ? etape.bonne(mesures) : etape.bonne) + 1) % etape.options.length };
    case "valeur": return { g: "valeur", valeur: etape.attendu(mesures) * 3 + 7 };
    case "paillasse": return { g: "paillasse", gestes: [] };
  }
}
/** Joue un TP du début à la fin et rend les scores de ses étapes. */
function joue(t: Tp, reponse: (etape: EtapeTp, publique: EtapePublique, mesures: Mesures) => ReponseEtape): { scores: number[]; mesures: Mesures } {
  let mesures: Mesures = {};
  const scores = t.etapes.map((etape) => {
    const verdict = verifie(etape, reponse(etape, etapePublique(etape, GRAINE), mesures), mesures, GRAINE);
    if (!verdict) throw new Error(`réponse refusée à une étape « ${etape.genre} » de ${t.id}`);
    mesures = { ...mesures, ...(verdict.mesures ?? {}) };
    return verdict.retour.score;
  });
  return { scores, mesures };
}

describe("les situations des TP", () => {
  it("quatre TP, deux en chimie et deux en physique, tous à l'état de brouillon", () => {
    expect(TP.map((t) => t.id)).toEqual(["detartrant", "vinaigre", "condensateur", "jauge"]);
    expect(TP.map((t) => t.matiere)).toEqual(["chimie", "chimie", "physique", "physique"]);
    expect(TP.every((t) => t.etat === "brouillon")).toBe(true);
    expect(tp("jauge")?.titre).toBe("Une jauge de niveau d'eau");
    expect(tp("inconnu")).toBeNull();
    expect(Object.keys(MANIPULATIONS).sort()).toEqual(TP.map((t) => t.id).sort());
  });
  for (const t of TP) {
    it(`${t.id} : une situation à lire, une manipulation, les quatre compétences, des réponses cohérentes`, () => {
      expect(t.etapes[0].genre).toBe("lecture");
      expect(t.etapes.filter((e) => e.genre === "paillasse")).toHaveLength(1);
      expect(new Set(t.etapes.flatMap((e) => (e.genre === "lecture" ? [] : [e.competence])))).toEqual(new Set(["APP", "ANA", "REA", "VAL"]));
      expect(t.minutes).toBeGreaterThanOrEqual(15);
      for (const e of t.etapes) {
        if (e.genre === "materiel") {
          expect(new Set(e.objets.map((o) => o.id)).size).toBe(e.objets.length);
          expect(e.objets.some((o) => o.utile) && e.objets.some((o) => !o.utile)).toBe(true);
        }
        if (e.genre === "ordre") for (const autre of e.autres ?? []) expect([...autre].sort()).toEqual(e.etapes.map((_, i) => i));
        if (e.genre === "choix" && typeof e.bonne === "number") expect(e.bonne).toBeLessThan(e.options.length);
      }
      // ni tiret long ni émoji dans ce que l'élève lit
      expect(/[—–\u{1F300}-\u{1FAFF}]/u.test(JSON.stringify(t.etapes.map((e) => etapePublique(e, GRAINE))))).toBe(false);
    });
  }
});

describe("ce que le navigateur reçoit", () => {
  it("aucune étape ne porte sa réponse", () => {
    for (const t of TP) for (const e of t.etapes) {
      const publique = JSON.stringify(etapePublique(e, GRAINE));
      expect(publique.includes('"utile"') || publique.includes('"bonne"') || publique.includes('"pourquoi"') || publique.includes('"explication"') || publique.includes('"autres"'), `${t.id} : ${e.genre}`).toBe(false);
    }
  });
  it("les étapes d'un protocole arrivent mélangées, jamais dans un bon ordre, et toujours pareil pour la même graine", () => {
    for (const t of TP) for (const e of t.etapes) {
      if (e.genre !== "ordre") continue;
      for (const graine of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
        const montrees = (etapePublique(e, graine) as Extract<EtapePublique, { genre: "ordre" }>).etapes;
        expect([...montrees].sort()).toEqual([...e.etapes].sort());
        const rangs = montrees.map((x) => e.etapes.indexOf(x)).join();
        expect([e.etapes.map((_, i) => i), ...(e.autres ?? [])].map((o) => o.join())).not.toContain(rangs);
        expect(etapePublique(e, graine)).toEqual(etapePublique(e, graine));
      }
    }
  });
});

describe("la vérification par le serveur", () => {
  for (const t of TP) {
    it(`${t.id} : fait parfaitement, le TP donne A partout`, () => {
      const { scores } = joue(t, (e, p, m) => parfaite(t, e, p, m));
      expect(scores.every((s) => s === 1), scores.join(" ")).toBe(true);
      expect(bilanDuTp(t, scores)).toEqual({ APP: "A", ANA: "A", REA: "A", VAL: "A" });
    });
    it(`${t.id} : en se trompant partout, le TP donne D partout, et la suite reste possible`, () => {
      const { scores, mesures } = joue(t, (e, _p, m) => fausse(e, m));
      expect(scores.filter((_, i) => t.etapes[i].genre !== "lecture").every((s) => s === 0), scores.join(" ")).toBe(true);
      expect(bilanDuTp(t, scores)).toEqual({ APP: "D", ANA: "D", REA: "D", VAL: "D" });
      // sans mesure de l'élève, le professeur fournit les valeurs : l'exploitation reste calculable
      expect(Object.values(mesures).every((v) => Number.isFinite(v) && v > 0)).toBe(true);
    });
  }
  it("une réponse qui n'est pas du genre de l'étape est refusée", () => {
    const t = tp("detartrant")!;
    expect(verifie(t.etapes[1], { g: "valeur", valeur: 3 }, {}, GRAINE)).toBeNull();
    expect(verifie(t.etapes[4], { g: "ordre", ordre: [0, 0, 1, 2, 3] }, {}, GRAINE)).toBeNull();
    expect(verifie(t.etapes[4], { g: "ordre", ordre: [0, 1, 2] }, {}, GRAINE)).toBeNull();
  });
  it("le matériel : une seule erreur vaut la moitié ; un protocole avec deux étapes voisines échangées aussi", () => {
    const t = tp("detartrant")!;
    const materiel = t.etapes[2] as Extract<EtapeTp, { genre: "materiel" }>;
    const utiles = materiel.objets.filter((o) => o.utile).map((o) => o.id);
    expect(verifie(materiel, { g: "materiel", choisis: utiles.slice(1) }, {}, GRAINE)?.retour.score).toBe(0.5);
    expect(verifie(materiel, { g: "materiel", choisis: [...utiles, "balance"] }, {}, GRAINE)?.retour.score).toBe(0.5);
    const ordre = t.etapes[4] as Extract<EtapeTp, { genre: "ordre" }>;
    const montrees = (etapePublique(ordre, GRAINE) as Extract<EtapePublique, { genre: "ordre" }>).etapes;
    const place = (rangs: number[]) => rangs.map((i) => montrees.indexOf(ordre.etapes[i]));
    // préparer la prise d'essai avant la burette convient aussi
    expect(verifie(ordre, { g: "ordre", ordre: place([1, 0, 2, 3, 4]) }, {}, GRAINE)?.retour.score).toBe(1);
    expect(verifie(ordre, { g: "ordre", ordre: place([0, 1, 2, 4, 3]) }, {}, GRAINE)?.retour.score).toBe(0.5);
    expect(verifie(ordre, { g: "ordre", ordre: place([4, 3, 2, 1, 0]) }, {}, GRAINE)?.retour.score).toBe(0);
  });
  it("l'exploitation se juge sur les mesures de l'élève, même imprécises", () => {
    const t = tp("detartrant")!;
    // un titrage qui dépasse l'équivalence : 11 mL versés
    const bacle = verifie(t.etapes[5], { g: "paillasse", gestes: [{ g: "rincer" }, { g: "remplir" }, { g: "zero" }, { g: "prise" }, { g: "indicateur" }, { g: "agiter" }, ...verser(1, 11), { g: "noter" }] }, {}, GRAINE)!;
    expect(bacle.retour.score).toBe(0.5);
    expect(bacle.mesures).toEqual({ VE: 11 });
    // la concentration attendue vient de son volume, pas de la valeur exacte
    expect(verifie(t.etapes[6], { g: "valeur", valeur: 0.11 }, bacle.mesures!, GRAINE)?.retour.score).toBe(1);
    expect(verifie(t.etapes[6], { g: "valeur", valeur: 0.0976 }, bacle.mesures!, GRAINE)?.retour.score).toBe(0);
    // avec 11 mL, l'écart à l'étiquette est de 10 % : la bonne conclusion est « Non »
    expect(verifie(t.etapes[9], { g: "choix", choix: 1 }, bacle.mesures!, GRAINE)?.retour.score).toBe(1);
  });
});

describe("le TP laissé en route", () => {
  const le = (heure: number) => `2026-11-14T${String(heure).padStart(2, "0")}:00:00+00:00`;
  it("la page propose de reprendre le dernier essai commencé de chaque TP", () => {
    const reprises = essaisAReprendre([], [{ id: "a", tp: "vinaigre", cree_le: le(9) }, { id: "b", tp: "vinaigre", cree_le: le(11) }, { id: "c", tp: "jauge", cree_le: le(10) }]);
    expect([...reprises]).toEqual([["vinaigre", "b"], ["jauge", "c"]]);
  });
  it("un essai laissé en route ne se propose plus quand le TP a été refait en entier depuis", () => {
    const finis = [{ tp: "vinaigre", cree_le: le(8) }, { tp: "vinaigre", cree_le: le(12) }, { tp: "jauge", cree_le: le(8) }];
    const reprises = essaisAReprendre(finis, [{ id: "b", tp: "vinaigre", cree_le: le(11) }, { id: "c", tp: "jauge", cree_le: le(10) }]);
    expect([...reprises]).toEqual([["jauge", "c"]]);
  });
  it("sans essai commencé, rien à reprendre", () => {
    expect(essaisAReprendre([{ tp: "vinaigre", cree_le: le(8) }], []).size).toBe(0);
  });
});
