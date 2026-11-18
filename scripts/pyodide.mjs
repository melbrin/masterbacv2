// Prépare Python pour le hub Python (décision 0016) : copie Pyodide depuis node_modules dans public/pyodide/<version>/,
// où l'application le sert elle-même (aucune ressource chargée chez un tiers depuis le navigateur). Le paquet numpy
// n'est pas dans le paquet npm : il est téléchargé une fois, à la fabrication, sur le CDN jsDelivr qui publie la
// distribution de cette version, et gardé seulement si son empreinte SHA-256 est celle du fichier de verrouillage de
// Pyodide (lui-même figé par package-lock.json). Une empreinte différente arrête tout ; sans réseau, seule une
// fabrication en ligne (Vercel, vérifications automatiques) s'arrête, l'ordinateur de travail continue sans numpy.
// Lancé par « npm run dev », « npm run build » et « npm run contenu:verifier » (npm ignore ici les scripts « pre »).
// Rejouable : ce qui est déjà en place n'est ni recopié ni retéléchargé.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const racine = process.cwd();
const paquet = JSON.parse(readFileSync(join(racine, "node_modules/pyodide/package.json"), "utf8"));
const version = paquet.version;
const cible = join(racine, "public/pyodide", version);
mkdirSync(cible, { recursive: true });

// 1. Pyodide lui-même
for (const nom of ["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"]) {
  const vers = join(cible, nom);
  if (!existsSync(vers)) copyFileSync(join(racine, "node_modules/pyodide", nom), vers);
}

// 2. numpy, vérifié par son empreinte
const verrou = JSON.parse(readFileSync(join(cible, "pyodide-lock.json"), "utf8"));
const empreinte = (donnees) => createHash("sha256").update(donnees).digest("hex");
for (const nom of ["numpy"]) {
  const p = verrou.packages[nom];
  const fichier = join(cible, p.file_name);
  if (existsSync(fichier) && empreinte(readFileSync(fichier)) === p.sha256) continue;
  let donnees;
  try {
    const reponse = await fetch(`https://cdn.jsdelivr.net/pyodide/v${version}/full/${p.file_name}`);
    if (!reponse.ok) throw new Error(`réponse ${reponse.status}`);
    donnees = Buffer.from(await reponse.arrayBuffer());
  } catch (e) {
    const message = `Pyodide : ${nom} n'a pas pu être téléchargé (${e instanceof Error ? e.message : e}).`;
    // en ligne, un hub sans numpy ne part pas ; sur l'ordinateur de travail, seuls les programmes qui l'importent le disent
    if (process.env.CI || process.env.VERCEL) throw new Error(message);
    console.warn(`${message} Les programmes qui l'importent ne marcheront pas.`);
    continue;
  }
  // un fichier qui n'est pas celui de la distribution n'est jamais gardé, et la fabrication s'arrête
  if (empreinte(donnees) !== p.sha256) throw new Error(`Pyodide : l'empreinte de ${p.file_name} n'est pas celle du fichier de verrouillage. Rien n'est gardé.`);
  writeFileSync(fichier, donnees);
}
console.log(`Pyodide ${version} prêt dans public/pyodide/${version}/`);
