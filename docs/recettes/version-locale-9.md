# Recette : neuvième version locale, l'entraînement dans le parcours et les progrès

Date : 15 novembre 2026. Durée : quinze minutes, sans compter le TP. Elle suit ton « Oui, commence » du 15 novembre : ce que l'élève fait dans « S'entraîner » compte maintenant dans son parcours et dans ses progrès (décision 0015).

## Avant de commencer

1. Ouvre Docker Desktop.
2. Dans le Terminal, place-toi dans `Documents/App Masterbac/app-masterbac`, puis lance `npm run db:demarrer` et `npm run dev -- --port 3457`. Rien de nouveau dans la base.
3. Ouvre http://localhost:3457. Si l'application était déjà ouverte dans un onglet, recharge la page.
4. Il te faut un compte avec au moins un chapitre coché « Vu en classe », parmi ceux qui ont un TP ou une simulation : par exemple la fiche 1 (chute libre) et la fiche 10 (titrages). Pour cocher : « Cours », ouvre la fiche, coche « Vu en classe ».

## Le parcours te propose un défi et un TP

| N° | Ce que tu fais | Ce que tu dois voir |
| --- | --- | --- |
| 1 | Ouvre « Mon parcours » (l'icône de carte, en haut à droite sur téléphone) | dans « Ensuite », après « Atteins l'objectif 10 » d'un chapitre : « Réussis un défi du labo : Le basketteur », puis « Fais un TP : Une chute filmée » ; pareil pour le chapitre suivant |
| 2 | Touche l'étape du défi | le défi s'ouvre directement |
| 3 | Réussis-le, puis reviens à « Mon parcours » | l'étape a changé : le parcours propose un autre défi du même chapitre, à l'objectif que tu travailles |
| 4 | Touche une étape « Fais un TP » | la page des TP s'ouvre à la hauteur de ce TP ; il porte la marque « Dans ton parcours » |
| 5 | Commence ce TP, valide une question, puis reviens à « Mon parcours » | l'étape est devenue « Termine ton TP » ; elle rouvre le TP là où tu l'as laissé |
| 6 | Descends en bas du parcours | dans chaque palier, sous le chapitre : « Labo : 1 défi réussi sur 2 » ; puis un bloc « Tes TP, pour l'épreuve d'ECE » qui compte les TP terminés sur tes chapitres |
| 7 | Ouvre « S'entraîner », puis « Labo » | les simulations que ton parcours propose portent la marque « Dans ton parcours » |

## Les progrès

| N° | Ce que tu fais | Ce que tu dois voir |
| --- | --- | --- |
| 8 | Ouvre « Progrès » | sous « Ce mois-ci », une deuxième rangée : défis du labo réussis, TP terminés, parties jouées |
| 9 | Regarde sous le graphique des semaines | une phrase : « Cette semaine, à l'entraînement : … » (seulement si tu as fait quelque chose depuis lundi) |
| 10 | Descends à « À l'entraînement » | « Au labo » : tes étoiles, et les défis réussis par objectif. « En TP » : une grille comme celle de l'épreuve, une ligne par compétence, une case cochée par ligne. « Mémoire et jeux » : tes jours et tes parties des sept derniers jours |
| 11 | Descends à « Chapitre par chapitre » | sous chaque chapitre qui a un défi ou un TP : « Labo : 3 étoiles sur 18 · TP : 1 terminé sur 4 » |

## L'accueil

| N° | Ce que tu fais | Ce que tu dois voir |
| --- | --- | --- |
| 12 | Ouvre « Aujourd'hui », descends au bloc « S'entraîner » | sous chaque entrée, où tu en es : tes étoiles, tes TP terminés, tes jours de mémoire, tes parties. Ce sont les mêmes chiffres que sur les portes de « S'entraîner » |
| 13 | Regarde la carte « Ton parcours » | la « Prochaine étape » peut être un défi ou un TP, quand ta séance et ton carnet sont faits |

## Ce que tu dois me dire

Les choix de détail sont dans `docs/decisions/0015-l-entrainement-dans-le-parcours.md`, partie « Mes choix ». Les trois qui comptent le plus :

1. Le défi et le TP viennent juste après l'objectif du chapitre. Les veux-tu plus haut dans le parcours ?
2. Un TP terminé une fois n'est plus proposé, même avec un mauvais bilan. Faut-il le reproposer tant qu'il reste un C ou un D ?
3. Un défi réussi ou un TP terminé ne change pas l'objectif atteint. Est-ce bien ce que tu veux ?

Sans réponse de ta part, je garde ces choix.

## Ce qui a été essayé, et ce qui ne l'a pas été

Essayé le 15 novembre par un robot qui joue comme un élève, dans un vrai navigateur, en largeur téléphone (`scripts/essais/parcours-entrainement.mts`) : il crée un compte, coche les fiches 1 et 10, suit l'étape du défi et le réussit, suit l'étape du TP, le laisse en route, le reprend depuis son parcours, le fait en entier avec le guide (bilan A, A, B, A), joue une partie de mémoire, puis relit le parcours, l'accueil, les progrès, la section, le labo et la page des TP. Aucun écart, aucune erreur de page. Les mêmes pages ont été photographiées et regardées à 720 et à 1219 points de large, et en thème sombre.

Pas essayé :

- Un vrai téléphone.
- Un compte qui prépare un DS en même temps.

Pour relancer l'essai, ordinateur ouvert, serveur et base démarrés (compte quatre minutes) :

```bash
node scripts/essais/parcours-entrainement.mts sorties/parcours /tmp/session-parcours.json eleve.essai@exemple.fr
```

L'adresse doit être neuve : change-la à chaque essai. L'écran de l'ordinateur doit rester ouvert : rabattu, l'ordinateur dort et le robot se bloque sur les gestes maintenus.
