# Recette : troisième version locale

> Depuis la décision 0014 (14 novembre), l'onglet « Jeux » s'appelle « S'entraîner ». Le labo est à « S'entraîner », puis « Labo » ; les jeux de révision à « S'entraîner », puis « Jeux ».

Date : 14 novembre 2026. Durée : 30 minutes. Elle ajoute le test de calibrage, le parcours, les jeux, la simulation du basketteur, le quiz mélangé et le plan de DS réparti entre les chapitres. Tout tourne sur ton ordinateur, avec des données inventées.

## Avant de commencer

1. Ouvre Docker Desktop.
2. Dans le Terminal, place-toi dans `Documents/App Masterbac/app-masterbac`, puis lance `npm run db:demarrer`, `npm run db:migrer` (une nouvelle table est arrivée), et `npm run dev -- --port 3457`.
3. Ouvre http://localhost:3457. La boîte des e-mails locaux est à http://127.0.0.1:54324.

Si un écran affiche une erreur juste après une de mes modifications, arrête le serveur (Ctrl + C) et relance-le : en développement, il garde parfois une ancienne version d'un fichier.

Deux comptes d'essai existent : `theo.essai@exemple.fr` (Pass, un test de calibrage fait, un DS le 23 novembre) et `nina.essai@exemple.fr` (gratuit, tout neuf). Pour revoir l'arrivée d'un nouvel élève, connecte-toi avec une adresse nouvelle.

## Ce que tu essaies

| N° | Ce que tu fais | Ce que tu dois voir |
| --- | --- | --- |
| 1 | Crée un compte avec une adresse nouvelle | après les trois questions : « Bienvenue Prénom. On commence par un test. », et le lien « Faire le test plus tard » |
| 2 | Coche deux ou trois chapitres, « Commencer le test » | un test de 6 à 9 questions : d'abord l'objectif 10, puis 14, puis 18 |
| 3 | Va au bout du test, « Voir mon parcours » | le résultat par objectif et par chapitre, « Ton point de départ : viser 10 » (ou 14, ou 18), puis ta prochaine étape et tes paliers |
| 4 | Reviens sur Aujourd'hui | une carte « Ton parcours pour viser 14 » : le palier en cours, un signal s'il y en a un, la prochaine étape |
| 5 | En haut à droite, l'icône de carte | la page « Mon parcours » ; « Refaire le test » relance un test |
| 6 | En bas, « Jeux » | dix jeux en trois familles, le quiz mélangé, la simulation ; en haut, le choix « Mes chapitres » ou une fiche |
| 7 | Joue à « Paires », « Cartes mémoire », « Pluie de formules », « Relie », « Qui suis-je ? » | les notions et les relations du tableau « À connaître par cœur » ; à la fin, ton score et ton record |
| 8 | Joue à « Quel chapitre ? » et « La bonne notion » | des titres de questions de cours à ranger ou à relier à une notion |
| 9 | Joue à « Contre la montre » | 90 secondes, la correction après chaque réponse, puis « Temps écoulé ! » et ton score |
| 10 | Joue à « Vrai ou faux » : fais glisser la carte à droite ou à gauche | la carte part du bon côté, la correction s'affiche avec son explication |
| 11 | Joue à « Dans l'ordre » : touche deux étapes | elles échangent leur place ; « Valider l'ordre » donne le bon ordre |
| 12 | « Quiz mélangé » | dix questions tirées dans tes chapitres vus en classe |
| 13 | « Simulation : le basketteur », onglet « Le saut », puis « Le tir » | le joueur saute selon la vitesse choisie ; le ballon suit sa parabole ; « Panier ! » ou « Trop court de … » |
| 14 | Une fiche, onglet « Jeux » | les mêmes jeux, sur ce seul chapitre |
| 15 | DS, « Préparer un DS », dans dix jours, trois chapitres | « Questions de cours, objectif 10 » : six questions, deux par chapitre, 40 minutes |
| 16 | Progrès, puis Jeux | tes records s'affichent sur les cartes des jeux |

## Ce qui n'est pas dans cette version

- De nouvelles questions de quiz : il n'y en a toujours que 5 à 21 par chapitre, aucune pour la fiche 14.
- Le plan de l'année en cinq périodes, la page des parents, l'accord parental avant 15 ans.
- D'autres simulations que le basketteur.
- Les pages du test de niveau et de l'administration ne sont pas réécrites. Le film de présentation montre la première version.
