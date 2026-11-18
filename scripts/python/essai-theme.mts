// Essaie les exercices d'un seul thème du hub Python (décision 0016), sans passer par les autres fichiers :
//   node --conditions=react-server scripts/python/essai-theme.mts <theme>
//   (thèmes : bases, mecanique, energie, electricite, ondes, chimie, mesure ; « react-server » laisse passer « server-only »)
// Pour chaque exercice : la solution doit passer toutes les vérifications, le programme de départ ne doit pas déjà
// être juste, et chaque échec doit dire quelque chose à l'élève. Le contrôle complet reste tests/contenu/python.test.ts.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadPyodide } from "pyodide";
import { executer, prepare } from "../../public/python/banc.mjs";

interface Test { nom: string; code: string }
interface Exercice { id: string; depart: string; solution: string; tests: Test[] }
interface Resultat { ok: boolean; erreur: { type: string; message: string; ligne: number | null } | null; tests: { nom: string; ok: boolean; message: string }[]; figures: unknown[] }

const theme = process.argv[2];
if (!theme || !/^[a-z]+$/.test(theme)) {
  console.error("Donne le thème : node --conditions=react-server scripts/python/essai-theme.mts mecanique");
  process.exit(2);
}
const racine = process.cwd();
const fichier = await import(pathToFileURL(join(racine, "lib/serveur/contenu/python", `${theme}.ts`)).href);
const exercices = Object.values(fichier).find(Array.isArray) as Exercice[] | undefined;
if (!exercices) throw new Error(`Aucune liste d'exercices dans lib/serveur/contenu/python/${theme}.ts`);

const version = JSON.parse(await (await import("node:fs/promises")).readFile(join(racine, "node_modules/pyodide/package.json"), "utf8")).version as string;
const base = `${join(racine, "public/pyodide", version)}/`;
if (!existsSync(join(base, "pyodide.asm.wasm"))) throw new Error("Python n'est pas préparé : lance d'abord node scripts/pyodide.mjs");
const py = await loadPyodide({ indexURL: base, stdout: () => {}, stderr: () => {} });
await prepare(py);

let ecarts = 0;
for (const e of exercices) {
  const sol = (await executer(py, { code: e.solution, tests: e.tests, mode: "verifier" })) as Resultat;
  const dep = (await executer(py, { code: e.depart, tests: e.tests, mode: "verifier" })) as Resultat;
  const solOk = sol.ok && sol.tests.length > 0 && sol.tests.every((t) => t.ok);
  const depOk = dep.ok && dep.tests.length > 0 && dep.tests.every((t) => t.ok);
  const muets = dep.tests.filter((t) => !t.ok && t.message.length <= 10);
  const statut = solOk && !depOk && muets.length === 0 ? "ok" : "ÉCART";
  if (statut !== "ok") ecarts += 1;
  console.log(`${statut}  ${e.id}`);
  if (!solOk) {
    if (sol.erreur) console.log(`   la solution s'arrête : ${sol.erreur.type} ligne ${sol.erreur.ligne} : ${sol.erreur.message}`);
    for (const t of sol.tests.filter((x) => !x.ok)) console.log(`   la solution échoue à « ${t.nom} » : ${t.message}`);
  }
  if (depOk) console.log("   le programme de départ passe déjà toutes les vérifications");
  for (const t of muets) console.log(`   « ${t.nom} » échoue sans message utile pour l'élève`);
  console.log(`   départ : ${dep.erreur ? `erreur ${dep.erreur.type} ligne ${dep.erreur.ligne}` : "sans erreur"} ; vérifications : ${dep.tests.map((t) => `${t.ok ? "oui" : "non"} « ${t.message || t.nom} »`).join(" | ")}`);
}
console.log(ecarts ? `${ecarts} écart(s) sur ${exercices.length} exercice(s)` : `${exercices.length} exercice(s), aucun écart`);
process.exit(ecarts ? 1 : 0);
