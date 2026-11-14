# Recette : deuxième version locale

Date : 14 novembre 2026. Durée : 25 minutes. Elle reprend tes remarques du 14 novembre. Tout tourne sur ton ordinateur, avec des données inventées.

## Avant de commencer

1. Ouvre Docker Desktop.
2. Dans le Terminal, place-toi dans `Documents/App Masterbac/app-masterbac`, puis lance `npm run db:demarrer`, et `npm run dev -- --port 3457`.
3. Ouvre http://localhost:3457/app. La boîte des e-mails locaux est à http://127.0.0.1:54324.

Un compte d'essai existe : `theo.essai@exemple.fr` (Pass, un DS le 23 novembre, trois notes de DS). Pour voir l'offre gratuite, connecte-toi avec une adresse nouvelle.

## Ce que tu essaies

| N° | Ce que tu fais | Ce que tu dois voir |
| --- | --- | --- |
| 1 | Ouvre Aujourd'hui | « Voici ta séance du jour » (plus de « ce soir »), « Je saisis la date de mon prochain DS », « Si tu rates une séance, son contenu se reporte sur la séance du lendemain » |
| 2 | « Commencer ma séance », puis « Commencer la séance » | tu arrives droit sur la première question, dans la séance : les étapes en haut, pas de « question suivante » de la fiche |
| 3 | Demande l'indice 1 | il commence par une majuscule |
| 4 | « Voir le corrigé », puis note-toi | le bouton choisi reste coloré, une pastille s'anime, une phrase dit ce qui est noté, puis un seul bouton mène à la suite |
| 5 | Va jusqu'à l'exercice et note-toi | le bouton devient « Terminer ma séance » |
| 6 | « Terminer ma séance » | des confettis, « Bravo Prénom ! Tu as terminé ta première séance », trois chiffres : séances faites, jours d'affilée, séances de la semaine |
| 7 | Reviens sur Aujourd'hui | les étapes de la séance sont cochées, le bouton dit « Voir mon bilan » |
| 8 | Cours | « Les 14 fiches de l'année, avec toutes les questions tombées au bac de 2004 à 2026 » |
| 9 | Une fiche, onglet Questions de cours | trois boutons « Viser 10 », « Viser 14 », « Viser 18 » ; « Viser 14 » montre aussi les questions de l'objectif 10 ; les étiquettes disent « Tombé au BAC 2026 » |
| 10 | Onglet Exercices type BAC | « D'après le BAC Polynésie 2025 » sur l'exercice 2 de la fiche 1 |
| 11 | Sur une question, « Signaler une erreur » | un espace entre le texte et les boutons |
| 12 | DS, « Préparer un DS », une date dans dix jours, deux chapitres | sous la date, la règle des formats ; un plan en sept séances, chaque étape avec sa case |
| 13 | « Commencer cette séance » | l'essentiel s'affiche dans le mode DS (l'onglet DS reste allumé), avec « J'ai relu : étape suivante » |
| 14 | Enchaîne les étapes jusqu'au test, fais-le | à la dernière question, la correction reste affichée ; « Étape suivante » te ramène au plan |
| 15 | Fin de la séance | des confettis, « Séance terminée, bravo ! », le compteur passe à 1/7 |
| 16 | Dans le plan, ouvre l'étape « DS blanc » | les énoncés seuls, un minuteur, puis « J'ai fini l'épreuve : passer à la correction » |
| 17 | Progrès (avec `theo.essai@exemple.fr`) | la courbe des trois notes de DS, « Ce mois-ci », le travail par semaine, la régularité sur quatre semaines, la réussite par objectif |
| 18 | Carnet d'erreurs, ouvre une question, note-toi | « Retour au carnet » |
| 19 | Administration (`/admin`, avec ton compte administrateur) | la liste « Signalements à traiter », avec la référence de la question et le message |

## Ce qui n'est pas dans cette version

- La section de jeux, le test de calibrage, plusieurs quiz par chapitre, les quiz qui mélangent les chapitres : à cadrer ensemble avant de coder.
- Le plan d'un DS a toujours la même forme, quel que soit le nombre de chapitres.
- Les pages du test de niveau et de l'administration n'ont pas été réécrites.
- Le film de présentation montre l'ancienne version.

## Ce que je n'ai pas essayé moi-même

- Le thème sombre et la largeur ordinateur des nouveaux écrans (un seul coup d'œil sur Aujourd'hui en grand).
- L'étape « DS blanc » et l'étape « carnet » d'un plan de DS, la correction d'un exercice au barème dans une séance de DS.
- Une série de plusieurs jours à l'écran : elle est testée par le calcul, pas dans le navigateur.
- Le signalement jusqu'à l'administration.
