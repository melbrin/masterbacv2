// Les cas de référence du prototype validé le 13 novembre 2026 (docs/08-moteur.md, section 5).
// Tant qu'un seul cas diffère, le portage du moteur n'est pas fini.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as m from "@/lib/moteur";
import type { Contexte, Devoir, Etat, Resultat, SommaireIndexe } from "@/lib/moteur";

const lis = (chemin: string) => readFileSync(new URL(`../../reference/${chemin}`, import.meta.url));
const cas = JSON.parse(lis("moteur-cas-de-reference.json").toString("utf8"));
const fichesBrut = lis("prototype/site/data/fiches.json");
const quizBrut = lis("prototype/site/data/quiz.json");
const sommaire: SommaireIndexe = m.indexeSommaire({
  fiches: JSON.parse(fichesBrut.toString("utf8")).fiches,
  quiz: JSON.parse(quizBrut.toString("utf8")),
});

const ctx = (etat: Etat, maintenant: string): Contexte => ({
  etat: { ...etat, seance: null }, sommaire, maintenant: Date.parse(maintenant), reglages: m.REGLAGES_PROTOTYPE,
});

/** Compare deux valeurs, les nombres à 1e-9 près. */
function compare(obtenu: unknown, attendu: unknown, chemin: string): void {
  if (typeof attendu === "number" && typeof obtenu === "number") {
    expect(Math.abs(obtenu - attendu), chemin).toBeLessThanOrEqual(1e-9);
  } else if (Array.isArray(attendu)) {
    expect(Array.isArray(obtenu), chemin).toBe(true);
    expect((obtenu as unknown[]).length, `${chemin}.length`).toBe(attendu.length);
    attendu.forEach((v, i) => compare((obtenu as unknown[])[i], v, `${chemin}[${i}]`));
  } else if (attendu && typeof attendu === "object") {
    expect(obtenu && typeof obtenu === "object", chemin).toBe(true);
    const o = obtenu as Record<string, unknown>;
    const a = attendu as Record<string, unknown>;
    // undefined et clé absente sont équivalents après passage par JSON
    const cles = (x: Record<string, unknown>) => Object.keys(x).filter((k) => x[k] !== undefined).sort();
    expect(cles(o), `${chemin} (clés)`).toEqual(cles(a));
    for (const k of Object.keys(a)) compare(o[k], a[k], `${chemin}.${k}`);
  } else {
    expect(obtenu ?? null, chemin).toEqual(attendu ?? null);
  }
}

interface Attendus {
  jour: string;
  plans: { entree: Devoir }[];
  quizPour: { entree: { fiches: number[]; n: number; objectif: number; graine: number } }[];
  questionsPassage: { entree: { fiche: number; niveau: number } }[];
  pointsFaibles: { entree: { fiches: number[]; objectif: number; n: number } }[];
  etatsNotions: Record<string, Record<string, string>>;
  [autre: string]: unknown;
}

function releve(c: Contexte, attendus: Attendus) {
  const fiches: Record<string, unknown> = {};
  for (const f of sommaire.fiches) fiches[f.num] = { etats: m.etatsFiche(c, f.num), niveau: m.niveauFiche(c, f.num) };
  const etatsNotions: Record<string, Record<string, string>> = {};
  for (const [num, ids] of Object.entries(attendus.etatsNotions)) {
    etatsNotions[num] = {};
    for (const id of Object.keys(ids)) {
      const notion = sommaire.parNum.get(Number(num))!.liste_notions.find((n) => n.id === id)!;
      etatsNotions[num][id] = m.etatNotion(c, Number(num), notion);
    }
  }
  const s = m.seanceDuJour(c);
  return {
    jour: m.jourCourant(c),
    carnet: m.carnet(c.etat),
    carnetDuJour: m.carnetDuJour(c),
    fiches,
    etatsNotions,
    noteEstimee: m.noteEstimee(c),
    prochainDS: m.prochainDS(c)?.id ?? null,
    dsANoter: m.dsANoter(c).map((x) => x.id),
    lundi: m.lundi(m.jourCourant(c)),
    seancesSemaine: m.seancesSemaine(c),
    periode: m.periodeActuelle(c).id,
    formatPour: Array.from({ length: 11 }, (_, j) => m.formatPour(j)),
    plans: attendus.plans.map((p) => ({ entree: p.entree, sortie: m.construitPlan(c, p.entree) })),
    quizPour: attendus.quizPour.map((q) => ({ entree: q.entree, sortie: m.quizPour(c, q.entree.fiches, q.entree.n, q.entree.objectif, q.entree.graine) })),
    questionsPassage: attendus.questionsPassage.map((p) => ({ entree: p.entree, sortie: m.questionsPassage(c, p.entree.fiche, p.entree.niveau) })),
    pointsFaibles: attendus.pointsFaibles.map((p) => ({ entree: p.entree, sortie: m.pointsFaibles(c, p.entree.fiches, p.entree.objectif, p.entree.n) })),
    seanceDuJour: { revoir: s.revoir, exercice: s.exercice, raison: s.raison, dsId: s.dsId },
  };
}

describe("données figées du prototype", () => {
  it("ont l'empreinte notée dans les cas de référence", () => {
    const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");
    expect(sha(fichesBrut)).toBe(cas.donnees.sha256["fiches.json"]);
    expect(sha(quizBrut)).toBe(cas.donnees.sha256["quiz.json"]);
  });
});

describe("scénarios à date fixe", () => {
  for (const sc of cas.scenarios) {
    const c = ctx(sc.etat, sc.maintenant);
    const obtenu = releve(c, sc.attendus) as Record<string, unknown>;
    for (const cleAttendue of Object.keys(sc.attendus)) {
      it(`${sc.nom} : ${cleAttendue}`, () => compare(obtenu[cleAttendue], sc.attendus[cleAttendue], cleAttendue));
    }
    it(`${sc.nom} : le carnet stocké est celui qu'on reconstruit en rejouant les tentatives`, () => {
      expect(m.recalculeCarnet(sc.etat.tentatives, m.REGLAGES_PROTOTYPE)).toEqual(sc.etat.carnet);
    });
  }
});

type Action =
  | { type: "vu"; fiche: number; valeur: boolean }
  | { type: "reponse"; cle: string; resultat: Resultat; score?: number }
  | { type: "passage"; fiche: number; niveau: number }
  | { type: "ds"; ds: Devoir }
  | { type: "seance-faite" };

function applique(etat: Etat, a: Action, maintenant: string): Etat {
  const c = ctx(etat, maintenant);
  if (a.type === "reponse") return m.enregistre(c, a.cle, a.resultat, a.score);
  if (a.type === "seance-faite") return m.marqueSeanceFaite(c);
  const suite = structuredClone(etat);
  if (a.type === "vu") suite.vuEnClasse[a.fiche] = a.valeur;
  else if (a.type === "passage") (suite.passages[a.fiche] ||= {})[a.niveau] = c.maintenant;
  else suite.ds.push(a.ds);
  return suite;
}

describe("séquence d'un nouvel élève sur un mois", () => {
  let etat: Etat = cas.sequence.depart;
  const etats: Etat[] = [];
  for (const etape of cas.sequence.etapes) {
    for (const a of etape.actions as Action[]) etat = applique(etat, a, etape.maintenant);
    etats.push(etat);
  }
  cas.sequence.etapes.forEach((etape: { titre: string; maintenant: string; attendus: Attendus }, i: number) => {
    it(etape.titre, () => {
      const obtenu = releve(ctx(etats[i], etape.maintenant), etape.attendus) as Record<string, unknown>;
      for (const k of Object.keys(etape.attendus)) compare(obtenu[k], etape.attendus[k], k);
    });
  });
  it("arrive à l'état final du prototype", () => {
    const final = cas.sequence.etat_final;
    const dernier = etats[etats.length - 1];
    for (const k of ["vuEnClasse", "tentatives", "carnet", "passages", "ds", "seances"] as const) compare(dernier[k], final[k], k);
  });
});
