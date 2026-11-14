# 0011. Le labo : calculer d'abord, puis lancer la simulation

Date : 2026-11-14
État : demandée par Yane le 14 novembre ; les énoncés des défis sont des brouillons, à valider

## La demande

« Il faut lier l'utile à l'agréable. Pour des jeux comme celui du basketteur, il faudrait d'abord que l'élève procède à des calculs, et ensuite, quand il trouve les bonnes valeurs, il doit les mettre dans la simulation et il valide quand le jeu est réussi. Il faut mettre beaucoup plus de jeux, par exemple avec l'électricité, la température, le son (effet Doppler), la chute libre. Il faut que ça claque : c'est la part la plus importante de l'application pour donner envie aux élèves d'y revenir. »

## Le principe

- Un défi a un énoncé court, des données et une valeur à calculer. L'élève calcule, entre sa valeur, puis lance la simulation.
- Le défi n'est réussi que si la simulation réussit : le ballon entre dans le panier, le colis tombe sur la cible, la lampe s'allume à la bonne date.
- Un essai raté dit ce qui s'est passé (« Trop court de 0,42 m. ») et l'élève corrige sa valeur.
- Trois étoiles au premier essai, deux jusqu'au troisième, une ensuite. Les étoiles récompensent le calcul, pas le tâtonnement.
- Chaque simulation a trois défis, un par objectif (10, 14, 18). Un défi s'ouvre quand le précédent est réussi.
- Les relations du cours sont à un appui : ce sont les lignes du tableau « À connaître par cœur » de la fiche. Elles s'ouvrent seules au deuxième essai raté.
- Rejouer un défi réussi ne change pas ses étoiles. La même valeur ratée ne se relance pas deux fois de suite.

## Les cinq simulations

| Simulation | Fiche | Défi objectif 10 | Défi objectif 14 | Défi objectif 18 |
| --- | --- | --- | --- | --- |
| Le basketteur | 1 | vitesse du saut pour gagner 0,60 m | vitesse du tir à 45° | vitesse du tir en suspension, à 52° |
| Le largage | 1 | distance où lâcher le colis | vitesse du drone | altitude du drone |
| Le circuit RC | 8 | résistance pour 63 % de E à 2,0 s | résistance pour un seuil à 10 s | capacité pour une décharge de 0,50 s |
| Le thé | 5 | durée de chauffe de l'eau | temps d'attente avant de boire | même question, avec le temps caractéristique à calculer |
| L'effet Doppler | 6 | vitesse du véhicule | fréquence émise | vitesse en km/h à partir d'une mesure |

La simulation libre du basketteur (décision 0010) reste, sous « Aller plus loin » et depuis la page du basketteur.

## Qui juge

- Le navigateur anime la scène avec les règles de `lib/commun/simulations/` : des fonctions pures, sans horloge ni hasard.
- Le serveur refait le calcul avec les mêmes règles (commande `defis.valider`), compte les essais et donne les étoiles (table `defis`). Un élève ne peut pas se déclarer un défi réussi.
- Les règles de calcul sont dans le code envoyé au navigateur, puisqu'il anime. Un élève qui lit ce code peut retrouver une réponse. Il n'y a rien à y gagner : pas de classement, pas de contenu payant derrière.

## Les énoncés sont des brouillons

- Les énoncés sont dans `lib/serveur/contenu/defis.ts`, à l'état « brouillon ». Ils ne se montrent qu'en local, ou à l'administrateur. Ils ne partent pas dans le code envoyé au navigateur : la page d'un défi n'envoie que l'énoncé du défi ouvert, après ce contrôle.
- Pour ouvrir un défi aux élèves : Yane le relit, puis son état passe à « valide ».
- Chaque réponse est recalculée à part, avec la relation du cours, dans `tests/unitaires/simulations.test.ts`. La réponse arrondie au pas de saisie doit réussir, une erreur de 15 % doit échouer.
- `npm run contenu:verifier` contrôle que chaque relation rappelée dans un défi est une ligne du tableau de la fiche.

## Mes choix, à confirmer par Yane

- Le labo est ouvert à tous les comptes, offre gratuite comprise, comme les autres jeux. Il est en tête de la page des jeux.
- La règle des étoiles (3, 2, 2, puis 1).
- Les tolérances : 0,15 m autour du centre du cercle, 3 cm sur la hauteur du saut, 1 m autour de la cible du largage, 1 °C sur la température, 1,5 % à 2,5 % sur la date du circuit RC, 2 Hz à 0,5 Hz sur la fréquence.
- Les valeurs des énoncés : panier à 4,60 m et 3,05 m, g = 9,81 m·s⁻², c = 340 m/s pour le son, 4 180 J·kg⁻¹·K⁻¹ pour l'eau.
- La scène de nuit, dans le thème clair comme dans le thème sombre.
- Les étoiles n'entrent pas encore dans le parcours ni dans les progrès.

## Ce que ça change

`lib/commun/simulations/` (règles), `lib/serveur/contenu/defis.ts` (énoncés), `lib/serveur/defis.ts`, `lib/serveur/commandes/defis.ts`, `components/simulations/` (cadre `Labo`, scènes, horloge, terrain, étoiles, vignette), `app/(appli)/app/jeux/labo/`, `app/(appli)/labo.css`, la table `defis` et son test, la page des jeux, `scripts/essais/labo.mts`.
