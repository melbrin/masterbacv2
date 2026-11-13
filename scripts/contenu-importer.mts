// npm run contenu:importer : charge contenu/export/ dans le schéma « contenu » et les figures dans le stockage privé.
// Rejouable : deux imports de suite donnent le même état. Rien n'est écrit si le nettoyage signale un défaut.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { nettoie } from "../lib/commun/html/nettoie.ts";

const { SUPABASE_URL, SUPABASE_SECRET_KEY, APP_ENV } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error("Variables manquantes : SUPABASE_URL ou SUPABASE_SECRET_KEY (npm run env:local).");
if (APP_ENV !== "local" && !process.argv.includes("--distant")) throw new Error("Cet import ne vise que la base locale. Un import distant demande l'accord de Yane.");

const RACINE = join(process.cwd(), "contenu", "export");
const lis = (nom: string) => JSON.parse(readFileSync(join(RACINE, "data", nom), "utf8"));
const defauts: string[] = [];
const citees = new Map<string, { enonce: boolean; corrige: boolean; items: Set<string> }>();

// nettoie un champ HTML ; note où chaque figure est citée (énoncé ou corrigé)
function propre(html: string | null | undefined, ou: string, partie: "enonce" | "corrige", cle?: string): string {
  if (!html) return "";
  const r = nettoie(html, { adresseFigure: (fiche, nom) => `/api/figures/${fiche}/${nom}` });
  for (const p of r.problemes) defauts.push(`${ou} : ${p}`);
  for (const f of r.figures) {
    const c = citees.get(f) ?? { enonce: false, corrige: false, items: new Set<string>() };
    c[partie] = true;
    if (cle && partie === "corrige") c.items.add(cle);
    citees.set(f, c);
  }
  return r.html;
}

const sommaire = lis("fiches.json");
const fiches: unknown[] = [];
const items: unknown[] = [];
for (const [ordre, leger] of sommaire.fiches.entries()) {
  const f = lis(`fiche-${String(leger.num).padStart(2, "0")}.json`);
  const ou = `fiche ${f.num}`;
  fiches.push({
    num: f.num, cle: f.id, titre: f.titre, titre_court: f.titre_court, domaine: f.domaine, ordre,
    sommaire: leger.items.map((i: Record<string, unknown>) => ({ ...i, titre: propre(i.titre as string, `${ou} sommaire`, "enonce") })),
    themes: f.themes.map((t: Record<string, unknown>) => ({
      num: t.num, titre: propre(t.titre as string, `${ou} thème`, "enonce"), preambule: propre(t.preambule as string, `${ou} préambule`, "enonce"),
      questions: (t.questions as { num: number }[]).map((q) => q.num), exercices: (t.exercices as { num: number }[]).map((e) => e.num),
    })),
    notions: f.notions.map((n: { id: string; nom: string; refs: unknown }) => ({ id: n.id, nom: propre(n.nom, `${ou} notion ${n.id}`, "enonce"), refs: n.refs })),
    essentiel_html: propre(f.essentiel, `${ou} essentiel`, "enonce"),
    pieges: f.pieges.map((p: string, i: number) => propre(p, `${ou} piège ${i + 1}`, "enonce")),
    tombe_html: propre(f.tombe, `${ou} tombé`, "enonce"),
  });
  for (const t of f.themes) for (const genre of ["q", "ex"] as const) for (const it of genre === "q" ? t.questions : t.exercices) {
    const cle = `${f.num}-${genre}${it.num}`;
    const ici = `${ou} ${genre}${it.num}`;
    // les indices du prototype : d'abord les notions en jeu, puis la méthode ou le piège tiré du corrigé
    const indices = [
      it.notions_meta ? { genre: "notions", html: propre(it.notions_meta, `${ici} notions`, "enonce") } : null,
      it.indice_methode ? { genre: "methode", html: propre(it.indice_methode, `${ici} indice méthode`, "corrige", cle) } : null,
      !it.indice_methode && it.indice_piege ? { genre: "piege", html: propre(it.indice_piege, `${ici} indice piège`, "corrige", cle) } : null,
    ].filter(Boolean);
    items.push({
      cle, fiche: f.num, genre, numero: it.num, ordre: leger.items.findIndex((i: { k: string; n: number }) => i.k === genre && i.n === it.num),
      theme: t.num, niveau: it.niveau, type: it.type || "", demande: it.demande || "", mention: propre(it.mention, `${ici} mention`, "enonce"),
      points: it.points ?? null, duree: it.duree ?? null,
      titre_html: propre(it.titre, `${ici} titre`, "enonce"), titre_txt: it.titre_txt,
      enonce_html: propre(it.enonce, `${ici} énoncé`, "enonce"), intro_html: propre(it.intro, `${ici} intro`, "enonce"),
      corrige_html: propre(it.corrige, `${ici} corrigé`, "corrige", cle),
      etapes: it.etapes.map((e: { titre: string; html: string }, i: number) => ({
        titre: propre(e.titre, `${ici} étape ${i + 1} titre`, "corrige", cle), html: propre(e.html, `${ici} étape ${i + 1}`, "corrige", cle),
      })),
      indices, notions: it.notions ?? [],
    });
  }
}

// quiz : l'énoncé et les choix d'un côté, la clé de correction et l'explication de l'autre
const quiz = lis("quiz.json").map((q: Record<string, unknown>, ordre: number) => {
  const base = { id: q.id, fiche: q.fiche, ordre, niveau: q.niveau, type: q.type, explication: (q.explanation as string) ?? "" };
  if (q.type === "qcm") return { ...base, enonce: { q: q.q, choix: q.o }, correction: { c: q.c } };
  if (q.type === "vrai_faux") return { ...base, enonce: { q: q.q }, correction: { reponse: q.answer } };
  if (q.type === "trou") return { ...base, enonce: { q: q.q }, correction: { reponse: q.answer, acceptees: q.acceptedAnswers ?? [] } };
  if (q.type === "association") {
    const paires = q.pairs as { left: string; right: string }[];
    return { ...base, enonce: { q: q.q, gauches: paires.map((p) => p.left), droites: paires.map((p) => p.right) }, correction: { paires } };
  }
  if (q.type === "ordre") return { ...base, enonce: { q: q.q, elements: q.items }, correction: { ordre: q.items } };
  defauts.push(`quiz ${String(q.id)} : type inconnu`);
  return base;
});

// figures présentes sur le disque
const presentes: string[] = [];
for (const dossier of readdirSync(join(RACINE, "figs"))) {
  if (!/^\d{2}$/.test(dossier)) continue;
  for (const nom of readdirSync(join(RACINE, "figs", dossier))) if (nom.endsWith(".webp")) presentes.push(`${dossier}/${nom}`);
}
for (const f of citees.keys()) if (!presentes.includes(f)) defauts.push(`figure citée mais absente : ${f}`);
const figures = presentes.map((chemin) => {
  const c = citees.get(chemin);
  return { chemin, fiche: Number(chemin.slice(0, 2)), corrige_seul: !!c && c.corrige && !c.enonce, items: c ? [...c.items] : [] };
});

if (defauts.length) {
  console.error(`Import refusé : ${defauts.length} défaut(s).`);
  for (const d of defauts.slice(0, 30)) console.error(`  ${d}`);
  process.exit(1);
}

const charge = { fiches, items, quiz, figures };
const empreinte = createHash("sha256").update(JSON.stringify(charge)).digest("hex");
const resume = { fiches: fiches.length, items: items.length, quiz: quiz.length, figures: figures.length };
const base = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const { data, error } = await base.rpc("contenu_importe", { p: { ...charge, empreinte, resume } });
if (error) throw new Error(`Import refusé par la base : ${error.message}`);

let envoyees = 0;
if (!data.inchange || process.argv.includes("--figures")) {
  for (const chemin of presentes) {
    const { error: e } = await base.storage.from("figures").upload(chemin, readFileSync(join(RACINE, "figs", chemin)), { contentType: "image/webp", upsert: true });
    if (e) throw new Error(`Figure ${chemin} refusée : ${e.message}`);
    envoyees += 1;
  }
}
console.log(data.inchange ? `Contenu inchangé : version ${data.version}.` : `Contenu importé : version ${data.version}.`, JSON.stringify({ ...resume, figures_envoyees: envoyees }));
