// Tests de propriété du moteur (docs/08-moteur.md, section 8) : sur des états tirés au hasard,
// des règles qui doivent rester vraies quoi qu'il arrive.
import { readFileSync } from "node:fs";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import * as m from "@/lib/moteur";
import type { Contexte, Devoir, Etat, Resultat } from "@/lib/moteur";
import { ajouteJours, ecartEnJours, jourDeParis } from "@/lib/commun/dates";

const lis = (nom: string) => JSON.parse(readFileSync(new URL(`../../reference/prototype/site/data/${nom}`, import.meta.url), "utf8"));
const sommaire = m.indexeSommaire({ fiches: lis("fiches.json").fiches, quiz: lis("quiz.json") });
const NUMS = sommaire.fiches.map((f) => f.num);
const CLES = [
  ...sommaire.fiches.flatMap((f) => f.items.map((i) => m.cle(f.num, i.k, i.n))),
  ...sommaire.quiz.map((q) => m.cleQuiz(q.id)),
];

const DEBUT = Date.parse("2026-09-01T06:00:00Z");
const FIN = Date.parse("2027-06-17T20:00:00Z");
const instant = fc.integer({ min: DEBUT, max: FIN });
const resultat = fc.constantFrom<Resultat>("ok", "partiel", "ko");
const objectif = fc.constantFrom(10, 14, 18);
const fichesDs = fc.uniqueArray(fc.constantFrom(...NUMS), { minLength: 1, maxLength: 3 });

const vide = (): Etat => ({ profil: { objectif: 14 }, vuEnClasse: {}, tentatives: {}, carnet: {}, passages: {}, ds: [], seances: [], seance: null });
const ctx = (etat: Etat, maintenant: number): Contexte => ({ etat, sommaire, maintenant, reglages: m.REGLAGES_PROTOTYPE });

// un élève : des réponses datées, des chapitres cochés, des DS notés ou non
const eleve = fc.record({
  reponses: fc.array(fc.record({ k: fc.constantFrom(...CLES), r: resultat, t: instant }), { maxLength: 60 }),
  vus: fc.uniqueArray(fc.constantFrom(...NUMS), { maxLength: 6 }),
  objectif,
  devoirs: fc.array(fc.record({ dans: fc.integer({ min: -40, max: 40 }), fiches: fichesDs, note: fc.option(fc.float({ min: 0, max: 20, noNaN: true })), duree: fc.constantFrom(1, 2, 4) }), { maxLength: 4 }),
  maintenant: instant,
}).map(({ reponses, vus, objectif: obj, devoirs, maintenant }) => {
  let etat = vide();
  etat.profil.objectif = obj;
  for (const v of vus) etat.vuEnClasse[v] = true;
  const passees = reponses.filter((x) => x.t <= maintenant).sort((a, b) => a.t - b.t);
  for (const x of passees) etat = m.enregistre(ctx(etat, x.t), x.k, x.r);
  const auj = jourDeParis(new Date(maintenant));
  etat.ds = devoirs.map((d, i): Devoir => ({ id: `ds-${i}`, date: ajouteJours(auj, d.dans), duree: d.duree, fiches: d.fiches, objectif: obj, note: d.dans < 0 ? d.note : null }));
  return ctx(etat, maintenant);
});

const clesDuPlan = (plan: ReturnType<typeof m.construitPlan>) =>
  plan.seances.flatMap((s) => s.taches.flatMap((t) => (t.type === "questions" || t.type === "ds-blanc" ? t.refs : t.type === "exercice" ? [t.ref] : [])));

describe("carnet d'erreurs", () => {
  it("une échéance est toujours après la tentative qui l'a créée", () => {
    fc.assert(fc.property(eleve, fc.constantFrom(...CLES), fc.constantFrom<Resultat>("partiel", "ko"), (c, k, r) => {
      const suite = m.enregistre(c, k, r);
      expect(suite.carnet[k].due > m.jourCourant(c)).toBe(true);
      expect(suite.carnet[k].step).toBe(0);
    }));
  });
  it("le carnet stocké est celui qu'on reconstruit en rejouant les tentatives", () => {
    fc.assert(fc.property(eleve, (c) => {
      expect(m.recalculeCarnet(c.etat.tentatives, c.reglages)).toEqual(c.etat.carnet);
    }));
  });
  it("trois réussites de suite font sortir une question du carnet, une réussite seule n'y fait rien entrer", () => {
    fc.assert(fc.property(fc.constantFrom(...CLES), instant, (k, t) => {
      let etat = m.enregistre(ctx(vide(), t), k, "ok");
      expect(etat.carnet[k]).toBeUndefined();
      etat = m.enregistre(ctx(etat, t), k, "ko");
      for (let i = 1; i <= 3; i++) {
        expect(etat.carnet[k].step).toBe(i - 1);
        etat = m.enregistre(ctx(etat, t + i * 1000), k, "ok");
      }
      expect(etat.carnet[k]).toBeUndefined();
    }));
  });
  it("enregistrer ne modifie pas l'état reçu", () => {
    fc.assert(fc.property(eleve, fc.constantFrom(...CLES), resultat, (c, k, r) => {
      const avant = structuredClone(c.etat);
      m.enregistre(c, k, r);
      m.marqueSeanceFaite(c);
      expect(c.etat).toEqual(avant);
    }));
  });
  it("le carnet se lit par échéance croissante, et le carnet du jour ne contient rien de futur", () => {
    fc.assert(fc.property(eleve, (c) => {
      const dues = m.carnet(c.etat).map((e) => e.due);
      expect(dues).toEqual([...dues].sort());
      for (const e of m.carnetDuJour(c)) expect(e.due <= m.jourCourant(c)).toBe(true);
    }));
  });
});

describe("plan d'un DS", () => {
  const devoir = fc.record({ dans: fc.integer({ min: 0, max: 30 }), fiches: fichesDs, duree: fc.constantFrom(1, 2, 4), objectif });
  it("n'a jamais deux fois le même item, ni de séance après le devoir ou avant la création", () => {
    fc.assert(fc.property(eleve, devoir, (c, d) => {
      const auj = m.jourCourant(c);
      const ds: Devoir = { id: "essai", date: ajouteJours(auj, d.dans), duree: d.duree, fiches: d.fiches, objectif: d.objectif };
      const plan = m.construitPlan(c, ds);
      const cles = clesDuPlan(plan);
      expect(new Set(cles).size).toBe(cles.length);
      expect(plan.format).toBe(m.formatPour(d.dans));
      for (const s of plan.seances) {
        expect(s.date >= auj).toBe(true);
        expect(s.date <= ds.date).toBe(true);
        expect(s.minutes).toBeGreaterThan(0);
      }
      expect(plan.seances.length).toBe(plan.format === "express" ? 1 : plan.format === "trois-jours" ? 3 : 7);
      const dates = plan.seances.map((s) => s.date);
      expect(dates).toEqual([...dates].sort());
    }));
  });
  it("ne propose que des items des chapitres du devoir", () => {
    fc.assert(fc.property(eleve, devoir, (c, d) => {
      const ds: Devoir = { id: "essai", date: ajouteJours(m.jourCourant(c), d.dans), duree: d.duree, fiches: d.fiches, objectif: d.objectif };
      for (const k of clesDuPlan(m.construitPlan(c, ds))) expect(d.fiches).toContain(m.decoupe(k)!.fiche);
    }));
  });
  it("le format suit le nombre de jours", () => {
    expect([0, 1, 2, 6, 7, 30].map(m.formatPour)).toEqual(["express", "express", "trois-jours", "trois-jours", "semaine", "semaine"]);
  });
});

describe("quiz et test de passage", () => {
  it("un quiz n'a ni doublon, ni plus de questions que demandé, ni question d'un autre chapitre", () => {
    fc.assert(fc.property(eleve, fichesDs, fc.integer({ min: 0, max: 15 }), objectif, fc.integer({ min: 0, max: 2 ** 32 - 1 }), (c, fiches, n, obj, graine) => {
      const ids = m.quizPour(c, fiches, n, obj, graine);
      expect(ids.length).toBeLessThanOrEqual(n);
      expect(new Set(ids).size).toBe(ids.length);
      const permis = new Set(sommaire.quiz.filter((q) => fiches.includes(q.fiche)).map((q) => q.id));
      for (const id of ids) expect(permis.has(id)).toBe(true);
    }));
  });
  it("un test de passage a 5 questions au plus, sans doublon, celles du niveau visé d'abord", () => {
    fc.assert(fc.property(eleve, fc.constantFrom(...NUMS), fc.constantFrom(14, 18), (c, num, L) => {
      const ids = m.questionsPassage(c, num, L);
      expect(ids.length).toBeLessThanOrEqual(5);
      expect(new Set(ids).size).toBe(ids.length);
      const duNiveau = sommaire.quiz.filter((q) => q.fiche === num && q.niveau === L).length;
      const niveaux = ids.map((id) => sommaire.quiz.find((q) => q.id === id)!.niveau);
      expect(niveaux.slice(0, Math.min(5, duNiveau)).every((x) => x === L)).toBe(true);
    }));
  });
  it("le mélange garde les mêmes éléments et ne dépend que de la graine", () => {
    fc.assert(fc.property(fc.array(fc.integer()), fc.integer({ min: -5, max: 2 ** 33 }), (liste, graine) => {
      const a = m.melange(liste, graine);
      expect([...a].sort((x, y) => x - y)).toEqual([...liste].sort((x, y) => x - y));
      expect(m.melange(liste, graine)).toEqual(a);
    }));
    expect(m.melange([1, 2, 3, 4, 5], 0)).toEqual(m.melange([1, 2, 3, 4, 5], 1));
  });
});

describe("note estimée et niveaux", () => {
  it("la note reste entre 0 et 20 et dans sa fourchette", () => {
    fc.assert(fc.property(eleve, (c) => {
      const n = m.noteEstimee(c);
      if (!n) {
        expect(c.etat.ds.some((d) => d.note != null)).toBe(false);
        return;
      }
      expect(n.valeur).toBeGreaterThanOrEqual(0);
      expect(n.valeur).toBeLessThanOrEqual(20);
      expect(n.bas).toBeGreaterThanOrEqual(0);
      expect(n.haut).toBeLessThanOrEqual(20);
      expect(n.bas).toBeLessThanOrEqual(n.valeur);
      expect(n.haut).toBeGreaterThanOrEqual(n.valeur);
    }));
  });
  it("un niveau n'est atteint que si le précédent l'est, et 14 ou 18 demandent leur test de passage", () => {
    fc.assert(fc.property(eleve, fc.constantFrom(...NUMS), (c, num) => {
      const nv = m.niveauFiche(c, num);
      expect([0, 10, 14, 18]).toContain(nv.atteint);
      expect(nv.atteint).toBeLessThanOrEqual(10); // aucun test de passage n'a été réussi dans ces états
      expect(nv.prochain).toBe(nv.atteint === 0 ? 10 : 14);
      for (const L of [10, 14, 18]) {
        expect(nv.res[L].faits).toBeLessThanOrEqual(nv.res[L].total);
        expect(nv.res[L].taux).toBeGreaterThanOrEqual(0);
        expect(nv.res[L].taux).toBeLessThanOrEqual(1);
      }
      const e = m.etatsFiche(c, num);
      expect(e["a-voir"] + e["en-cours"] + e.acquis + e.solide).toBe(e.total);
    }));
  });
  it("sans chapitre tenté ni note de DS, il n'y a pas de note estimée", () => {
    expect(m.noteEstimee(ctx(vide(), DEBUT))).toBeNull();
  });
  it("le score d'un exercice au barème donne ok à 0,7, partiel à 0,4, ko en dessous", () => {
    expect([1, 0.7, 0.69, 0.4, 0.39, 0].map(m.resultatDuScore)).toEqual(["ok", "ok", "partiel", "partiel", "ko", "ko"]);
  });
});

describe("séance du jour", () => {
  it("donne le même résultat pour les mêmes entrées, 3 items à revoir au plus, et un exercice des chapitres visés", () => {
    fc.assert(fc.property(eleve, (c) => {
      const s = m.seanceDuJour(c);
      expect(m.seanceDuJour(c)).toEqual(s);
      expect(s.date).toBe(m.jourCourant(c));
      expect(s.revoir.length).toBeLessThanOrEqual(3);
      // avec les réglages actuels, aucune question n'apparaît deux fois (décision 0004)
      const actuel = m.seanceDuJour({ ...c, reglages: m.REGLAGES_ACTUELS });
      expect(new Set(actuel.revoir).size).toBe(actuel.revoir.length);
      expect(actuel.revoir.length).toBeGreaterThanOrEqual(new Set(s.revoir).size);
      if (s.exercice) expect(s.revoir).not.toContain(s.exercice);
      const ds = m.prochainDS(c);
      if (s.raison === "ds") {
        expect(ecartEnJours(s.date, ds!.date)).toBeLessThanOrEqual(7);
        expect(ds!.fiches).toContain(m.decoupe(s.exercice!)!.fiche);
      } else if (s.raison === "defaut") {
        expect(m.chapitresVus(c)).toEqual([]);
        expect(m.decoupe(s.exercice!)!.fiche).toBe(1);
      } else expect(m.chapitresVus(c)).toContain(m.decoupe(s.exercice!)!.fiche);
    }));
  });
  it("le prototype pouvait proposer deux fois la même question à revoir ; les réglages actuels ne le font plus", () => {
    const t = Date.parse("2026-09-03T16:00:00Z");
    const etat = m.enregistre(ctx({ ...vide(), vuEnClasse: { 10: true }, profil: { objectif: 18 } }, Date.parse("2026-08-31T16:00:00Z")), "quiz:CS-E10", "ko");
    const proto = m.seanceDuJour(ctx(etat, t)).revoir;
    const actuel = m.seanceDuJour({ ...ctx(etat, t), reglages: m.REGLAGES_ACTUELS }).revoir;
    expect(proto.filter((k) => k === "quiz:CS-E10")).toHaveLength(2);
    expect(actuel.filter((k) => k === "quiz:CS-E10")).toHaveLength(1);
    expect(actuel).toHaveLength(3);
  });
  it("une séance déjà calculée aujourd'hui est gardée telle quelle", () => {
    const c = ctx(vide(), DEBUT);
    const gardee = { ...m.seanceDuJour(c), etape: 2 };
    expect(m.seanceDuJour(ctx({ ...vide(), seance: gardee }, DEBUT))).toBe(gardee);
    const faite = m.marqueSeanceFaite(ctx({ ...vide(), seance: gardee }, DEBUT));
    expect(faite.seance?.faite).toBe(true);
    expect(m.marqueSeanceFaite(ctx(faite, DEBUT)).seances).toHaveLength(1);
  });
});

describe("jours particuliers, à l'heure de Paris", () => {
  const le = (iso: string) => ctx(vide(), Date.parse(iso));
  it("minuit à Paris change de jour, pas minuit UTC", () => {
    expect(m.jourCourant(le("2026-12-31T22:59:59Z"))).toBe("2026-12-31");
    expect(m.jourCourant(le("2026-12-31T23:00:00Z"))).toBe("2027-01-01");
  });
  it("le changement d'heure ne décale ni l'échéance du carnet ni le lundi", () => {
    // nuit du 27 au 28 mars 2027 : passage à l'heure d'été
    expect(m.enregistre(le("2027-03-27T22:30:00Z"), "1-q1", "ko").carnet["1-q1"].due).toBe("2027-03-29");
    // nuit du 24 au 25 octobre 2026 : passage à l'heure d'hiver
    expect(m.enregistre(le("2026-10-24T21:30:00Z"), "1-q1", "ko").carnet["1-q1"].due).toBe("2026-10-26");
    expect(m.lundi("2027-03-28")).toBe("2027-03-22");
    expect(m.lundi("2027-03-29")).toBe("2027-03-29");
  });
  it("le 29 février et le 31 décembre se traversent sans erreur", () => {
    expect(m.enregistre(le("2028-02-27T12:00:00Z"), "1-q1", "ko").carnet["1-q1"].due).toBe("2028-02-29");
    expect(m.enregistre(le("2026-12-30T12:00:00Z"), "1-q1", "ko").carnet["1-q1"].due).toBe("2027-01-01");
  });
  it("la semaine va du lundi au dimanche", () => {
    const etat = { ...vide(), seances: ["2026-11-08", "2026-11-09", "2026-11-15", "2026-11-16"].map((date) => ({ date, minutes: 25 })) };
    expect(m.seancesSemaine(ctx(etat, Date.parse("2026-11-13T17:00:00Z")))).toBe(2);
  });
  it("les périodes couvrent l'année, et une date hors période retombe sur la première", () => {
    expect(m.periodeActuelle(le("2026-12-19T10:00:00Z")).id).toBe("noel");
    expect(m.periodeActuelle(le("2027-06-17T10:00:00Z")).id).toBe("final");
    expect(m.periodeActuelle(le("2027-08-01T10:00:00Z")).id).toBe("t1");
    expect(m.seancesPrevues(m.REGLAGES_PROTOTYPE, 18)).toBe(5);
    expect(m.seancesPrevues(m.REGLAGES_PROTOTYPE, 12)).toBe(4);
  });
  it("une fiche inconnue est refusée", () => {
    expect(() => m.niveauFiche(le("2026-11-13T10:00:00Z"), 99)).toThrow(RangeError);
    expect(m.decoupe("pas-une-cle")).toBeNull();
  });
});
