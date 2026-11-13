# Prototype de l'application MasterBac

Prototype du 13 novembre 2026, physique-chimie de terminale. Il a servi à valider les écrans et les règles du coach : séance du jour, mode DS, cours et quiz des 14 fiches, niveaux 10, 14 et 18, plan de l'année, page parents, offres. Il est figé : on ne le modifie pas.

## Le lancer

```
cd site
python3 -m http.server 8765 --bind 127.0.0.1
```

Puis ouvrir `http://127.0.0.1:8765/index.html`. Ouvrir `index.html` depuis le disque ne fonctionne pas : les modules JavaScript et les données demandent un serveur, même local.

Il n'y a pas de serveur applicatif. L'état de l'élève est gardé dans le navigateur (localStorage, clé `masterbac-prototype-v1`). Dans Profil, « Remettre le profil de démonstration » repart de l'état d'origine, et « Essayer comme un nouvel élève » montre l'entrée d'un compte gratuit.

## Ce que contient le dossier

| Chemin | Rôle |
| --- | --- |
| `site/index.html`, `site/app.css` | la page et la feuille de style : charte, thème clair et thème sombre, mise en page téléphone et ordinateur |
| `site/js/moteur.js` | les règles du coach, sans IA : carnet d'erreurs, niveaux, note estimée, séance du jour, plans de DS. C'est le code à réécrire dans `lib/moteur/` |
| `site/js/etat.js` | l'état de l'élève, le profil de démonstration, le profil d'un nouvel élève |
| `site/js/util.js` | dates, nombres, tirages reproductibles (`melange`, `graineDuJour`), rendu des formules |
| `site/js/main.js`, `site/js/vues/` | la navigation et un fichier par écran |
| `site/js/travail.js`, `site/js/quiz.js` | une question ou un exercice avec indices, corrigé et autocorrection ; le quiz et ses cinq types de questions |
| `site/data/`, `site/figs/` | le contenu exporté des 14 fiches le 13 novembre 2026, figé. Les cas de référence du moteur en dépendent |
| `site/fonts/`, `site/katex/` | les polices (Archivo, Atkinson Hyperlegible Next) et KaTeX, servis avec le site |
| `outils/genere_cas_de_reference.py` | a produit `../moteur-cas-de-reference.json` |
| `outils/parcours.py`, `outils/capture.py` | parcourent le prototype dans un navigateur sans tête, relèvent les erreurs et prennent des captures |
| `outils/range_quiz.py` | a rangé les 161 questions du test en ligne dans les 14 fiches, avec leur niveau |
| `outils/package.json` | les paquets d'où viennent les polices et KaTeX |

Les scripts Python demandent Playwright (`pip install playwright`) et Chrome. Le chemin de Chrome se règle en tête de chaque script (`CHROME`).
