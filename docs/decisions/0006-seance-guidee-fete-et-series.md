# 0006. La séance du jour se déroule étape par étape, sa fin se fête, et les séries encouragent la régularité

Date : 2026-11-14
État : demandée par Yane le 14 novembre ; les règles des séries sont à confirmer

## La question

Dans la première version locale, la séance du jour était une liste de liens vers les cours. Une fois sa question faite, l'élève se retrouvait dans la fiche, avec « question suivante », et rien ne lui disait de revenir finir sa séance. Rien ne montrait non plus que l'exercice du jour était enregistré. Le prototype, lui, déroulait la séance question par question : c'était un écart de mon portage.

Yane demande en plus : une animation quand l'élève se note, une fin de séance fêtée (« Bravo ! Tu as terminé ta première séance », « ta 30e séance », avec des confettis) et des séries de jours d'affilée qui encouragent.

## Le choix

- **Une adresse par étape.** `/app/seance` dit où on en est et mène à la suite. `/app/seance/<question>` affiche une question de la séance, dans la séance. Après la correction, un seul bouton : « Question suivante », « Passer à l'exercice », puis « Terminer ma séance ».
- **L'avancement se lit dans les réponses du jour** (`avancementSeance`) : rien n'est gardé à part, donc la séance reprend là où elle s'est arrêtée.
- **Se corriger sur l'exercice du jour termine la séance**, comme dans le prototype. C'est le serveur qui le constate (`seCorriger`), pas le navigateur.
- **Le retour après la correction** : le bouton choisi reste marqué, une pastille animée et une phrase disent ce qui est noté. Les animations ne se jouent pas si l'élève a demandé moins d'animations à son appareil.
- **Le bilan de fin de séance** : « Bravo Prénom ! Tu as terminé ta première séance », des confettis, trois chiffres (séances faites, jours d'affilée, séances de la semaine).
- **Les séries** (`series`) :
  - *jours d'affilée* : les jours consécutifs avec une séance terminée. La série tient jusqu'au soir : hier compte tant que la séance du jour reste à faire.
  - *record* : la plus longue suite de jours.
  - *semaines d'affilée à ton rythme* : les semaines consécutives où le nombre de séances prévu pour la note visée (3, 4 ou 5) est atteint. La semaine en cours compte dès qu'elle l'atteint et ne coupe pas la série avant d'être finie.

## À confirmer par Yane

- Le cahier des charges disait « une séance sautée ne casse rien ». Une série de jours, elle, se casse quand on saute un jour. C'est pour cela que j'ai ajouté la série de semaines, qui suit le rythme prévu (3 séances par semaine pour viser 10) : un élève qui tient son rythme garde une série même sans travailler tous les jours. C'est mon interprétation de « séries d'affilée ».
- Rien ne punit une série cassée : l'écran dit seulement « Reviens demain pour commencer une nouvelle série ».

## Ce que ça change

`lib/moteur/suivi.ts` (règles ajoutées, celles du prototype ne changent pas), `tests/moteur/suivi.test.ts`, `lib/serveur/commandes/cours.ts` et `seance.ts`, `app/(appli)/app/seance/**`, `components/appli/ItemTravail.tsx`, `VueItem.tsx`, `Minuteur.tsx`, `Confettis.tsx`, les écrans Aujourd'hui et Progrès. Aucune migration.
