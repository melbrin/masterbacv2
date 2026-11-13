# Référence : ce que Yane a validé le 13 novembre 2026

Ce dossier est figé. Il sert de modèle pour les écrans, les textes et les règles du coach. On ne le modifie pas, aucun fichier de code ne l'importe, et il ne part jamais dans un déploiement.

| Chemin | Contenu | À quoi il sert |
| --- | --- | --- |
| `prototype/` | le prototype de l'application, en HTML, CSS et JavaScript, avec son contenu figé | la référence des écrans, de la charte, des textes et de l'enchaînement ; le code d'origine du moteur |
| `captures/telephone/`, `captures/ordinateur/` | 26 écrans du prototype, en 390 × 844 et en 1280 × 900 | voir un écran sans lancer le prototype |
| `moteur-cas-de-reference.json` | les entrées et les résultats attendus du moteur | les tests du portage du moteur (`docs/08-moteur.md`) |

Sur les captures de téléphone, prises en pleine page, la barre d'onglets du bas apparaît à la hauteur d'un écran, au milieu de l'image : c'est un effet de la capture, pas de la mise en page.

Les captures portent le nom de leur écran : `aujourdhui`, `seance`, `cours`, `fiche-09` et ses onglets, `fiche-09-q12` (une question), `fiche-09-ex1` (un exercice), `quiz-09`, `ds`, `ds-nouveau`, `ds-c` (un plan de DS), `dsblanc-ds-c`, `carnet`, `progres`, `plan`, `parents`, `offres`, `paiement-pass`, `profil`, `bienvenue`, `test`, `compte`.

Ce que le prototype simule, et que l'application doit faire pour de vrai : la connexion, les e-mails, le paiement, le stockage (tout est dans le navigateur), le barème des exercices (points répartis à parts égales), les indices (tirés des encadrés des corrigés). Les étiquettes « Prévu pour… » affichées sur chaque écran sont des repères du plan : elles ne font pas partie de l'application.
