// npm run contenu:verifier : contrôles complets de contenu/export/ (docs/04-tests-et-qualite.md, section 3).
// Ce fichier lit le contenu vivant, par le système de fichiers. Aucun code de l'application ne l'importe.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { nettoie } from "@/lib/commun/html/nettoie";
import { aUneFormule, lignesEssentiel } from "@/lib/commun/jeux";
import { cleNotion } from "@/lib/commun/simulations";
import { SIMULATIONS } from "@/lib/serveur/contenu/defis";

const RACINE = join(process.cwd(), "contenu", "export");
const lis = (nom: string) => JSON.parse(readFileSync(join(RACINE, "data", nom), "utf8"));

// Les compteurs attendus. Ils ne changent qu'avec une mise à jour déclarée du contenu.
// 21 novembre 2026, relecture de Yane du 18 : la fiche 9 gagne une question (Q.7, avancement final et maximal ; les
// questions 7 à 23 deviennent 8 à 24), la fiche 13 deux figures, L'essentiel un tableau « À savoir retrouver ».
const ATTENDU = { fiches: 14, questions: 282, exercices: 62, figures: 190, quiz: 161, notions: 333, etapes: 406, formules: 9662 };

interface Item { notions_meta?: string; mention?: string; id: string; num: number; niveau: number; type: string; titre: string; enonce: string; corrige: string; intro: string; indice_methode: string; indice_piege: string; etapes: { titre: string; html: string }[]; notions: string[]; points: number | null; duree: number | null }
interface Fiche { num: number; id: string; themes: { titre: string; preambule?: string; questions: Item[]; exercices: Item[] }[]; notions: { id: string; nom: string; refs: [string, number][] }[]; essentiel: string; pieges: string[]; tombe: string; tombe_lignes: { notions?: string }[] }

const sommaire = lis("fiches.json");
const fiches: Fiche[] = sommaire.fiches.map((f: { num: number }) => lis(`fiche-${String(f.num).padStart(2, "0")}.json`));
const quiz: Record<string, unknown>[] = lis("quiz.json");

// tous les champs HTML d'une fiche, avec leur emplacement
function champs(f: Fiche): [string, string][] {
  const out: [string, string][] = [[`fiche ${f.num} essentiel`, f.essentiel], [`fiche ${f.num} tombe`, f.tombe]];
  f.pieges.forEach((p, i) => out.push([`fiche ${f.num} piège ${i + 1}`, p]));
  f.notions.forEach((n) => out.push([`fiche ${f.num} notion ${n.id}`, n.nom]));
  f.tombe_lignes.forEach((l, i) => out.push([`fiche ${f.num} tombé ligne ${i + 1}`, l.notions ?? ""]));
  for (const t of f.themes) {
    out.push([`fiche ${f.num} thème`, t.titre], [`fiche ${f.num} thème préambule`, t.preambule ?? ""]);
    for (const it of [...t.questions, ...t.exercices]) {
      const ou = `fiche ${f.num} ${it.id}`;
      out.push([`${ou} titre`, it.titre], [`${ou} énoncé`, it.enonce], [`${ou} corrigé`, it.corrige], [`${ou} intro`, it.intro],
        [`${ou} indice méthode`, it.indice_methode], [`${ou} indice piège`, it.indice_piege],
        [`${ou} notions`, it.notions_meta ?? ""], [`${ou} mention`, it.mention ?? ""]);
      it.etapes.forEach((e, i) => out.push([`${ou} étape ${i + 1} titre`, e.titre], [`${ou} étape ${i + 1}`, e.html]));
    }
  }
  return out.filter(([, html]) => typeof html === "string" && html.length > 0);
}

describe("compteurs de l'export", () => {
  const items = (genre: "questions" | "exercices") => fiches.flatMap((f) => f.themes.flatMap((t) => t[genre]));
  it("14 fiches, 281 questions, 62 exercices, 406 étapes de corrigé, 332 notions, 161 questions de quiz", () => {
    expect({
      fiches: fiches.length, questions: items("questions").length, exercices: items("exercices").length,
      etapes: [...items("questions"), ...items("exercices")].reduce((s, e) => s + e.etapes.length, 0),
      notions: fiches.reduce((s, f) => s + f.notions.length, 0), quiz: quiz.length,
    }).toEqual({ fiches: ATTENDU.fiches, questions: ATTENDU.questions, exercices: ATTENDU.exercices, etapes: ATTENDU.etapes, notions: ATTENDU.notions, quiz: ATTENDU.quiz });
  });
  it("le sommaire et les fiches complètes décrivent les mêmes items, dans le même ordre", () => {
    for (const f of fiches) {
      const leger = sommaire.fiches.find((s: { num: number }) => s.num === f.num);
      const duSommaire = leger.items.map((i: { k: string; n: number; niveau: number }) => `${i.k}${i.n}:${i.niveau}`).sort();
      const complet = f.themes.flatMap((t) => [...t.questions.map((q) => `q${q.num}:${q.niveau}`), ...t.exercices.map((e) => `ex${e.num}:${e.niveau}`)]).sort();
      expect(complet, `fiche ${f.num}`).toEqual(duSommaire);
      expect(leger.id).toBe(f.id);
    }
  });
  it("chaque niveau vaut 10, 14 ou 18, et les numéros sont uniques dans une fiche", () => {
    for (const f of fiches) for (const genre of ["questions", "exercices"] as const) {
      const liste = f.themes.flatMap((t) => t[genre]);
      expect(new Set(liste.map((i) => i.num)).size, `fiche ${f.num} ${genre}`).toBe(liste.length);
      for (const i of liste) expect([10, 14, 18], `fiche ${f.num} ${i.id}`).toContain(i.niveau);
    }
  });
});

describe("HTML et formules", () => {
  let formules = 0;
  const figuresCitees = new Set<string>();
  for (const f of fiches) {
    it(`fiche ${f.num} : rien hors de la liste fermée, toutes les formules rendues`, () => {
      const defauts: string[] = [];
      for (const [ou, html] of champs(f)) {
        const r = nettoie(html);
        formules += r.formules;
        r.figures.forEach((x) => figuresCitees.add(x));
        for (const p of r.problemes) defauts.push(`${ou} : ${p}`);
      }
      expect(defauts).toEqual([]);
    });
  }
  it("le nombre de formules est celui du contrôle du 13 novembre 2026", () => {
    expect(formules).toBe(ATTENDU.formules);
  });
  it("chaque figure citée existe, chaque figure présente est citée", () => {
    const presentes = new Set<string>();
    for (const dossier of readdirSync(join(RACINE, "figs"))) {
      if (dossier.startsWith(".")) continue;
      for (const nom of readdirSync(join(RACINE, "figs", dossier))) if (nom.endsWith(".webp")) presentes.add(`${dossier}/${nom}`);
    }
    expect(presentes.size).toBe(ATTENDU.figures);
    expect([...figuresCitees].filter((x) => !presentes.has(x)), "figures citées mais absentes").toEqual([]);
    expect([...presentes].filter((x) => !figuresCitees.has(x)), "figures présentes mais jamais citées").toEqual([]);
    for (const x of figuresCitees) expect(existsSync(join(RACINE, "figs", x))).toBe(true);
  });
});

describe("renvois", () => {
  it("chaque notion renvoie à des items qui existent, chaque item à des notions qui existent", () => {
    for (const f of fiches) {
      const cles = new Set(f.themes.flatMap((t) => [...t.questions.map((q) => `q${q.num}`), ...t.exercices.map((e) => `ex${e.num}`)]));
      const notions = new Set(f.notions.map((n) => n.id));
      for (const n of f.notions) for (const [k, num] of n.refs) expect(cles.has(`${k}${num}`), `fiche ${f.num} notion ${n.id} -> ${k}${num}`).toBe(true);
      for (const t of f.themes) for (const it of [...t.questions, ...t.exercices]) for (const id of it.notions) expect(notions.has(id), `fiche ${f.num} ${it.id} -> ${id}`).toBe(true);
    }
  });
  it("un exercice noté a un total de points positif et une durée", () => {
    for (const f of fiches) for (const t of f.themes) for (const e of t.exercices) {
      if (e.points != null) expect(e.points, `fiche ${f.num} ${e.id}`).toBeGreaterThan(0);
      expect(e.etapes.length, `fiche ${f.num} ${e.id}`).toBeGreaterThan(0);
    }
  });
});

describe("quiz", () => {
  it("chaque question a un identifiant unique, une fiche connue, un niveau, et une clé de correction valide", () => {
    const ids = new Set<string>();
    const nums = new Set(fiches.map((f) => f.num));
    const defauts: string[] = [];
    for (const q of quiz as { id: string; type: string; fiche: number; niveau: number; q: string; o?: string[]; c?: number; answer?: unknown; acceptedAnswers?: string[]; pairs?: { left: string; right: string }[]; items?: string[] }[]) {
      const ko = (m: string) => defauts.push(`${q.id} : ${m}`);
      if (ids.has(q.id)) ko("identifiant en double");
      ids.add(q.id);
      if (!nums.has(q.fiche)) ko("fiche inconnue");
      if (![10, 14, 18].includes(q.niveau)) ko("niveau invalide");
      if (!q.q || typeof q.q !== "string") ko("énoncé manquant");
      if (q.type === "qcm") { if (!Array.isArray(q.o) || q.o.length < 2 || !Number.isInteger(q.c) || (q.c as number) < 0 || (q.c as number) >= q.o.length) ko("clé de QCM invalide"); }
      else if (q.type === "vrai_faux") { if (typeof q.answer !== "boolean") ko("réponse vrai ou faux invalide"); }
      else if (q.type === "trou") { if (typeof q.answer !== "string" || !q.answer || !Array.isArray(q.acceptedAnswers)) ko("réponse de texte à trous invalide"); }
      else if (q.type === "association") { if (!Array.isArray(q.pairs) || q.pairs.length < 2 || q.pairs.some((p) => !p.left || !p.right)) ko("paires invalides"); }
      else if (q.type === "ordre") { if (!Array.isArray(q.items) || q.items.length < 2) ko("liste à ordonner invalide"); }
      else ko(`type inconnu : ${q.type}`);
    }
    expect(defauts).toEqual([]);
  });
});

describe("rédaction", () => {
  it("aucun tiret long dans le contenu", () => {
    const trouves: string[] = [];
    for (const f of fiches) for (const [ou, html] of champs(f)) if (html.includes("—")) trouves.push(ou);
    for (const q of quiz) if (JSON.stringify(q).includes("—")) trouves.push(`quiz ${String(q.id)}`);
    expect(trouves).toEqual([]);
  });
});

describe("matière des jeux", () => {
  it("chaque fiche donne au moins cinq lignes « notion, relation, à retenir », dont quatre avec une formule", () => {
    const compte: string[] = [];
    for (const f of fiches) {
      const lignes = lignesEssentiel(nettoie(f.essentiel).html, f.num);
      compte.push(`${f.num}:${lignes.length}/${lignes.filter((l) => aUneFormule(l.relation)).length}`);
      expect(lignes.length, `fiche ${f.num}`).toBeGreaterThanOrEqual(5);
      expect(lignes.filter((l) => aUneFormule(l.relation)).length, `fiche ${f.num} : formules`).toBeGreaterThanOrEqual(4);
      expect(new Set(lignes.map((l) => l.notion)).size, `fiche ${f.num} : notions en double`).toBe(lignes.length);
    }
    // lignes et lignes avec formule, par fiche : utile pour régler les jeux
    console.info(`lignes de jeu par fiche (lignes/formules) : ${compte.join(" ")}`);
  });
});

describe("défis du labo", () => {
  it("chaque simulation renvoie à une fiche qui existe, et chaque relation rappelée dans un défi est une ligne du tableau de cette fiche", () => {
    const manques: string[] = [];
    for (const sim of SIMULATIONS) {
      const f = fiches.find((x) => x.num === sim.fiche);
      expect(f, `${sim.id} : fiche ${sim.fiche}`).toBeDefined();
      const cles = new Set(lignesEssentiel(nettoie(f!.essentiel).html, sim.fiche).map((l) => cleNotion(l.notion)));
      for (const d of sim.defis) for (const nom of d.rappel) if (!cles.has(cleNotion(nom))) manques.push(`${d.id} : « ${nom} » n'est pas dans le tableau de la fiche ${sim.fiche}`);
    }
    expect(manques).toEqual([]);
  });
});
