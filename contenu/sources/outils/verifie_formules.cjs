// Contrôle des formules exportées : chacune doit passer dans KaTeX, le moteur de rendu de l'application.
// usage : node outils/verifie_formules.cjs <dossier de sortie de l'export>
//   (KaTeX installé à côté : npm install katex@0.16.11, ou NODE_PATH vers son node_modules)
// Les macros sont celles de l'application : couleurs des termes (\cR, \cV, \cO, \cB) et repère d'équation (\lbl).
const fs = require('fs');
const path = require('path');
const katex = require('katex');

const MACROS = {
  '\\cR': '\\htmlClass{c-r}{#1}',
  '\\cV': '\\htmlClass{c-v}{#1}',
  '\\cO': '\\htmlClass{c-o}{#1}',
  '\\cB': '\\htmlClass{c-b}{#1}',
  '\\lbl': '\\qquad(\\text{#1})',
};

const dossier = process.argv[2];
const formules = JSON.parse(fs.readFileSync(path.join(dossier, 'data', 'formules.json'), 'utf8'));
let erreurs = 0;
for (const f of formules) {
  try {
    katex.renderToString(f.tex, {
      displayMode: f.display, throwOnError: true, strict: 'ignore', macros: { ...MACROS },
      trust: (ctx) => ctx.command === '\\htmlClass',
    });
  } catch (e) {
    erreurs += 1;
    if (erreurs <= 30) console.log(`fiche ${f.fiche} : ${e.message.split('\n')[0]}\n    ${f.tex.slice(0, 160)}`);
  }
}
console.log(`${formules.length} formules contrôlées, ${erreurs} en erreur`);
process.exit(erreurs ? 1 : 0);
