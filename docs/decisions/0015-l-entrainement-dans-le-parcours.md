# 0015. L'entraînement entre dans le parcours et dans les progrès

Date : 2026-11-15
État : principe accepté par Yane le 15 novembre (« Oui, commence ») ; les règles de détail sont mon choix, à confirmer

## La demande

Le 15 novembre, après son essai des vingt TP, Yane demande la suite des développements. Je lui propose de commencer par ceci : « Un TP fait, une étoile du labo ou un jeu de mémoire entre dans le parcours et dans les progrès. Aujourd'hui, ces sections vivent à part. » Il répond : « Oui, commence ».

Les décisions 0011 et 0013 notaient déjà ce manque : les étoiles du labo et la mémoire n'entraient ni dans le parcours ni dans les progrès.

## Ce qui est fait

### Dans le parcours

Le parcours propose deux nouvelles étapes, pour chaque chapitre vu en classe :

- **Un défi du labo.** Dans chaque simulation du chapitre, le premier défi qui n'est pas réussi. S'il y a deux simulations, celle dont le défi a le plus petit objectif ; à objectif égal, la première du labo. Le défi n'est proposé que s'il ne dépasse pas l'objectif que l'élève travaille sur ce chapitre.
- **Un TP.** Celui que l'élève a laissé en route (« Termine ton TP »), sinon le premier du chapitre qu'il n'a pas terminé. Un TP terminé une fois n'est plus demandé.

Leur place : juste après l'objectif du chapitre. L'ordre des étapes devient : calibrage, chapitres à cocher, séance du DS, séance du jour, carnet, tests de passage, puis chapitre par chapitre : son objectif, son défi, son TP. Les chapitres gardent leur ordre (ceux du prochain devoir d'abord, puis les moins avancés). Là où la note visée est atteinte, l'entraînement continue, à la fin, sans dépasser la note visée.

Une étape au plus de chaque genre par chapitre. Rien n'est proposé pour un chapitre qui n'est pas vu en classe.

Sur la page du parcours :

- chaque palier dit, chapitre par chapitre, les défis du labo réussis à cet objectif ;
- un bloc « Tes TP, pour l'épreuve d'ECE » compte les TP terminés sur les chapitres vus en classe.

Sur la page du labo et sur celle des TP, ce que le parcours propose porte la marque « Dans ton parcours ». Le lien d'une étape « TP » ouvre la page des TP à la hauteur du TP.

### Dans les progrès

- **Ce mois-ci** : trois chiffres de plus, les défis du labo réussis, les TP terminés, les parties jouées (mémoire et jeux de révision).
- **Sous le travail de la semaine** : une phrase dit ce qui a été fait à l'entraînement depuis lundi.
- **À l'entraînement**, une nouvelle partie :
  - au labo : les étoiles, et les défis réussis objectif par objectif ;
  - en TP : la grille de l'élève, présentée comme la grille d'évaluation de l'épreuve. Une ligne par compétence, une case par niveau, la case de son niveau habituel cochée ;
  - mémoire et jeux : les jours d'entraînement et les parties des sept derniers jours.
- **Chapitre par chapitre** : les étoiles du labo et les TP terminés du chapitre.

### Sur l'accueil et dans la section

Le bloc « S'entraîner » de l'accueil ne dit plus ce que chaque sous-section contient (« 42 défis ») mais où l'élève en est (« 12 étoiles sur 126 »). Ce sont les mêmes chiffres que sur les portes de la section : ils se calculent à un seul endroit.

## Les règles de calcul

- **Rien n'est gardé à part.** Comme le parcours, tout se recompte à chaque affichage à partir de ce que l'élève a fait : défis réussis, essais de TP, parties.
- **Le niveau habituel d'une compétence** : on prend le meilleur essai de chaque TP terminé, puis la moyenne des niveaux (A vaut 3, D vaut 0), ramenée au niveau le plus proche. À mi-chemin entre deux niveaux, on garde celui du dessous.
- **Les jours** sont ceux de Paris. La semaine commence le lundi, le mois le premier.
- **Un TP refait** ne compte qu'une fois.
- **Un brouillon** que le compte ne voit pas n'est ni proposé ni compté.

## Ce que ça ne change pas

- **L'objectif atteint.** Il reste : 70 % de réussite aux questions du chapitre, et un test de passage pour les objectifs 14 et 18. Un défi réussi ou un TP terminé n'y compte pas. La page du parcours le dit.
- **La note estimée**, la séance du jour, le plan d'un DS, les signaux du parcours.
- **La mémoire et les jeux de révision** ne sont pas des étapes du parcours : ils ne visent pas un chapitre. Ils comptent dans les progrès et sur l'accueil.
- Les cas de référence du moteur. Sans l'entraînement, le parcours rend exactement les étapes d'avant : un test de propriété le vérifie.

## Ce que j'ai écarté

- **Faire compter un défi dans l'objectif atteint.** Ce serait changer la règle des niveaux du prototype, validée par Yane.
- **Toutes les étapes d'entraînement après tous les objectifs.** Avec trois chapitres, elles ne se verraient jamais dans les sept étapes affichées.
- **Une étape « mémoire » chaque jour.** Le parcours dit comment viser une note sur ses chapitres ; la mémoire est une habitude à part.
- **Un nouveau réglage dans le moteur.** La règle n'a pas de seuil, et elle ne s'applique que si le serveur donne l'entraînement au parcours.

## Mes choix, à confirmer par Yane

1. Le défi et le TP viennent juste après l'objectif du chapitre, et non en tête du parcours.
2. Un défi n'est proposé que jusqu'à l'objectif travaillé : un élève qui vise 10 ne reçoit pas un défi d'objectif 14.
3. Le parcours propose un TP dès que le chapitre est vu en classe, sans attendre l'objectif 10.
4. Un TP terminé une fois, même avec un mauvais bilan, n'est plus proposé par le parcours. Il reste à refaire depuis la page des TP.
5. Le niveau habituel d'une compétence prend le meilleur essai de chaque TP, et tombe sur le niveau du dessous à mi-chemin.
6. Les phrases des étapes : « Réussis un défi du labo », « Fais un TP », « Termine ton TP », et la marque « Dans ton parcours ».
7. La mémoire et les jeux ne sont pas des étapes du parcours.

## Ce qui reste

- La page des parents et le bilan qui leur est envoyé n'existent pas encore : l'entraînement y entrera avec eux.
- Rien ne félicite encore un TP terminé ou un défi réussi dans les signaux du parcours.
- La séance du jour ne propose pas de défi à la fin.

## Ce que ça change

`lib/moteur/parcours.ts` (étapes `defi` et `tp`, type `Suivi`) et ses tests, `lib/commun/bilan-entrainement.ts` et ses tests, `lib/serveur/entrainement.ts`, `lib/serveur/suivi.ts`, `lib/serveur/tp.ts`, `app/(appli)/app/parcours/`, `app/(appli)/app/progres/`, `app/(appli)/app/page.tsx`, `app/(appli)/app/entrainement/`, `app/(appli)/app/labo/page.tsx`, `app/(appli)/app/tp/page.tsx`, `components/tp/GrilleEce.tsx`, `app/(appli)/tp.css`, `app/(appli)/complements.css`, `scripts/essais/parcours-entrainement.mts`, `scripts/essais/outils.mts`.

Aucune table nouvelle, aucune commande nouvelle : seulement des lectures, faites avec les droits de l'élève.
