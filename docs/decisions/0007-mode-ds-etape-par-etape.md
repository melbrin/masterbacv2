# 0007. Une séance de préparation de DS se suit étape par étape, dans le mode DS

Date : 2026-11-14
État : demandée par Yane le 14 novembre

## La question

Le plan d'un DS listait des liens vers les cours, comme dans le prototype. En ouvrant « L'essentiel », l'élève quittait le mode DS, ne pouvait pas dire « j'ai fait » et ne savait pas comment passer à la suite.

## Le choix

- **Chaque séance du plan a ses étapes** (`etapesDeSeance`) : une lecture par chapitre, le test, une étape par question, les pièges, le carnet, et pour le DS blanc l'épreuve puis la correction de chaque partie.
- **Chaque étape a sa page dans le mode DS** : `/app/ds/<devoir>/<séance>/<rang>`. Le contenu s'y affiche (l'essentiel, les pièges, la question et sa correction, les énoncés du DS blanc avec un minuteur). Un bouton mène à l'étape suivante ; « Passer cette étape » et « Retour au plan » restent disponibles.
- **Ce qui dit qu'une étape est faite** :
  - une question ou un exercice : l'élève s'est corrigé dessus depuis la création du plan ;
  - le test : il a répondu à toutes ses questions depuis la création du plan ;
  - une lecture, le carnet, l'épreuve du DS blanc : il la coche lui-même (bouton « J'ai relu », « C'est fait », « J'ai fini l'épreuve »).
- **Une séance est faite** quand toutes ses étapes le sont, ou quand l'élève la coche à la main comme avant. Le plan fête la séance terminée.
- **Où c'est gardé** : les étapes cochées vont dans le plan gardé en base (champ `lues` de chaque séance, dans la colonne `seances` de la table `ds`). Les autres étapes se lisent dans les réponses de l'élève. Aucune migration.
- Le test lancé depuis une séance y ramène à la fin.
- Le DS blanc a maintenant son écran : les énoncés seuls et un minuteur. Le minuteur est un confort, il ne note rien.

## Ce qui ne change pas

Le plan lui-même : il est toujours construit une fois par `construitPlan` et gardé tel quel. Le format dépend toujours du nombre de jours avant le devoir, pas du nombre de chapitres (voir la question ouverte dans `docs/SUIVI.md`).

## Ce que ça change

`lib/moteur/suivi.ts` et `types.ts` (champ `lues`), `lib/serveur/commandes/ds.ts` (`cocherEtape`), `lib/serveur/commandes/quiz.ts`, `app/(appli)/app/ds/[id]/**`, `components/appli/QuizJoueur.tsx`.
