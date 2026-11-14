# 0010. Dix jeux pour revoir le cours, un quiz mélangé et une simulation

> Depuis la décision 0014 (14 novembre), l'onglet « Jeux » s'appelle « S'entraîner ». Le labo est à « S'entraîner », puis « Labo » ; les jeux de révision à « S'entraîner », puis « Jeux ».

Date : 2026-11-14
État : demandée par Yane le 14 novembre ; la liste des jeux est mon choix, à confirmer

## La demande

« Ajouter une section jeux avec plein de jeux différents, sur les questions de la fiche, les concepts ou le cours, pour travailler son cours de manière ludique », puis : « une dizaine de jeux originaux, éventuellement avec du mouvement », et « des simulations avec un basketteur qui saute ».

## Ce qui a guidé les choix

- **Aucun texte inventé.** Les jeux ne reposent que sur le contenu déjà validé : le tableau « À connaître par cœur » de chaque fiche (notion, relation, à retenir), les titres des questions de cours, les notions qu'elles font travailler, et les 161 questions de quiz.
- **Les bonnes réponses des quiz restent sur le serveur.** Les jeux sur les questions de quiz envoient chaque réponse au serveur, qui corrige et compte le score. Les autres jeux ne reçoivent que ce que tout compte peut déjà lire dans l'onglet L'essentiel.
- **Pas de classement entre élèves** (le cahier des charges l'exclut). Chaque élève a son record à chaque jeu.
- Des jeux originaux : aucun ne reprend le nom, les personnages ou l'habillage d'un jeu existant.

## Les dix jeux

| Jeu | Sur quoi | Corrigé par |
| --- | --- | --- |
| Paires | notion et relation à retrouver, cartes retournées | le navigateur |
| Cartes mémoire | la notion, puis sa relation au dos | le navigateur |
| Pluie de formules | les relations tombent, il faut toucher la bonne notion | le navigateur |
| Relie | relier chaque notion à sa relation | le navigateur |
| Qui suis-je ? | trouver la notion avec le moins d'indices possible | le navigateur |
| Quel chapitre ? | ranger une question dans son chapitre | le navigateur |
| La bonne notion | trouver la notion qu'une question fait travailler | le navigateur |
| Contre la montre | 90 secondes de questions de quiz | le serveur |
| Vrai ou faux | une affirmation à faire glisser à droite ou à gauche | le serveur |
| Dans l'ordre | remettre les étapes d'une méthode dans l'ordre | le serveur |

Les trois derniers enregistrent les réponses comme un quiz : une question ratée va dans le carnet d'erreurs. Les jeux se jouent sur les chapitres vus en classe ou sur un seul chapitre (onglet « Jeux » de chaque fiche).

## Le quiz mélangé

Dix questions tirées dans tous les chapitres vus en classe, les ratées d'abord. Le quiz d'un chapitre tire aussi ses questions à chaque fois : quand le chapitre en a plus de dix, deux quiz de suite ne sont pas les mêmes. Écrire de nouvelles questions de quiz reste à faire, en brouillon, pour validation par Yane.

## La simulation

« Le basketteur » : un saut vertical et un tir au panier, avec la vitesse, l'angle et la hauteur de lâcher à régler. Le modèle est celui de la fiche 1 : chute libre, seul le poids agit. Les calculs sont dans `lib/commun/physique.ts`, avec leurs tests. Le dessin est original et ne représente aucun joueur réel.

## Mes choix, à confirmer par Yane

- Tous les jeux sont ouverts à tous les comptes, offre gratuite comprise.
- Les jeux prennent une place dans la barre du bas du téléphone ; le profil passe dans la barre du haut.
- Le score d'un jeu qui tourne dans le navigateur est annoncé par le navigateur : il ne sert qu'au record personnel.
- La simulation est un contenu nouveau, que Yane n'a pas encore relu : ses textes et ses valeurs (panier à 4,60 m et 3,05 m, g = 9,81 m·s⁻²) sont à valider.

## Ce que ça change

`lib/commun/jeux.ts`, `lib/serveur/jeux.ts`, `lib/serveur/commandes/jeux.ts`, `components/jeux/`, `components/simulations/`, `app/(appli)/app/jeux/`, la table `parties` et son test, le menu.
