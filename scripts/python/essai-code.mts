// Essaie un programme quelconque contre les vérifications d'un exercice du hub Python (décision 0016) :
//   node --conditions=react-server scripts/python/essai-code.mts <theme> <id de l'exercice> <fichier .py>
// Sert à relire un exercice : une autre solution juste doit passer, une erreur d'élève plausible doit échouer avec un
// message utile. Affiche le résultat complet en JSON.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadPyodide } from "pyodide";
import { executer, prepare } from "../../public/python/banc.mjs";

const [theme, id, fichier] = process.argv.slice(2);
if (!theme || !id || !fichier) {
  console.error("Usage : node --conditions=react-server scripts/python/essai-code.mts <theme> <id> <fichier.py>");
  process.exit(2);
}
const racine = process.cwd();
const source = await import(pathToFileURL(join(racine, "lib/serveur/contenu/python", `${theme}.ts`)).href);
const exercices = (Object.values(source).find(Array.isArray) ?? []) as { id: string; tests: { nom: string; code: string }[] }[];
const exercice = exercices.find((e) => e.id === id);
if (!exercice) throw new Error(`Exercice ${id} introuvable dans le thème ${theme}`);
const version = JSON.parse(await readFile(join(racine, "node_modules/pyodide/package.json"), "utf8")).version as string;
const sorties: string[] = [];
const py = await loadPyodide({ indexURL: `${join(racine, "public/pyodide", version)}/`, stdout: (t: string) => sorties.push(t), stderr: (t: string) => sorties.push(t) });
await prepare(py);
const code = await readFile(fichier, "utf8");
const r = await executer(py, { code, tests: exercice.tests, mode: "verifier" });
console.log(JSON.stringify({ affiche: sorties, ...r, figures: (r as { figures: unknown[] }).figures.length }, null, 2));
