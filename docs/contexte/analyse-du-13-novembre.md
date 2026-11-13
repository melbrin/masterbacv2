# Analyse du prototype, 13 novembre 2026

Ce document résume l'analyse faite le 13 novembre 2026, après la livraison du prototype : ce qu'il couvre, ce qu'il montre de fragile, et les cinq ajustements qui en sortent. Il sert de contexte. Les règles à appliquer sont dans `docs/01-cahier-des-charges.md` et `docs/08-moteur.md`.

## Où on en est

- Cinq des six usages de la stratégie sont dans le prototype : la séance du jour, le mode DS, les cours et les quiz, les niveaux, le suivi des parents, plus le plan de l'année. Les sujets du bac n'y sont pas.
- Rien de tout cela n'existe dans l'application en ligne : ni compte, ni base, ni paiement. Le dépôt contient le test gratuit et ses 326 questions.
- La « première version » attendue sous quatre semaines est la bêta fermée du 7 décembre, stabilisée le 11. La vente ouvre le 19.

## Ce que l'analyse a trouvé

Chaque constat a été vérifié sur les données ou sur le code du prototype.

| Constat | Mesure |
| --- | --- |
| La préparation de DS offerte ne montre pas la valeur de l'application | sur un plan « trois jours » du chapitre 9, 4 corrigés sur 5 sont verrouillés pour un compte gratuit |
| Les quiz corrigent sans expliquer | 138 questions sur 161 n'ont pas d'explication |
| Une réussite n'est jamais revue | une question réussie du premier coup ne revient pas, alors que l'état « solide » demande deux réussites à une semaine d'écart |
| Un niveau se valide trop facilement | trois réponses que l'élève juge lui-même réussies suffisent pour le niveau 10 |
| La note estimée n'est pas encore fiable | un nouvel élève obtient 9,4 après cinq réponses, puis 12,7 deux jours plus tard, sans aucune note réelle pour la recaler |
| Le niveau 18 est presque vide | 14 questions de cours et 2 exercices sur les 14 fiches ; aucune question de ce niveau dans les fiches 10 à 13 |
| Deux offres sont affichées avant d'exister | le Pack BAC et « viser 18 » paraissent disponibles |
| Les indices n'en sont pas encore | le premier indice est la liste des notions ; 178 items sur 343 n'ont pas de second indice |
| Le stock de quiz est court | 8 chapitres ont moins de 10 questions aux niveaux 10 et 14 ; la fiche 14 n'en a aucune |

## Ce que dit la recherche sur l'apprentissage

| Résultat | Source | Ce qu'on en tire |
| --- | --- | --- |
| S'interroger et espacer ses révisions sont les deux techniques les mieux notées parmi dix | Dunlosky et collègues, 2013 | le carnet d'erreurs et le retour d'une réussite une semaine plus tard |
| Un retour qui explique aide sur des questions nouvelles, pas seulement sur la question posée | Butler, Godbole et Marsh, 2013 | une explication après chaque question de quiz |
| L'élève qui se juge lui-même se surestime, et retient moins | Dunlosky et Rawson, 2012 | un niveau validé par un test corrigé par le serveur |
| Mélanger les types d'exercices de maths améliore le résultat au test : 61 % contre 38 %, sur 54 classes | Rohrer et collègues, 2020 | la partie « à revoir » de la séance et le DS blanc mélangent les chapitres |
| Le retour sur le travail, la réflexion de l'élève sur ses méthodes et l'engagement des parents font gagner plusieurs mois de progrès | Education Endowment Foundation, synthèses | la correction au barème, les indices, la page parents |

## Les cinq ajustements

1. Dans la préparation de DS offerte, les corrigés du plan sont ouverts.
2. La moyenne de la classe est demandée avec chaque note de DS.
3. Une question réussie du premier coup revient une fois, une semaine plus tard.
4. Un niveau se valide par un quiz corrigé par le serveur ; le barème a une ligne « Rédaction » ; la note estimée ne s'affiche qu'une fois recalée sur une note de DS.
5. Un e-mail rappelle chaque séance d'un plan de DS.

Yane a répondu « Ok » à cette analyse le 13 novembre : les cinq ajustements sont intégrés, et chacun reste retirable (`docs/01-cahier-des-charges.md`, section 4).
