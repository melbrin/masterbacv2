# 0009. Un test de calibrage à la première connexion, et un parcours suivi en continu

Date : 2026-11-14
État : demandée par Yane le 14 novembre ; les règles de détail sont à confirmer

## La demande

« Ok pour le test de calibrage, mais c'est aussi à la première connexion pour évaluer le niveau de l'élève et lui proposer un parcours d'amélioration de ses notes. Il faut en temps réel surveiller la progression de l'élève et lui proposer des parcours, il peut refaire le test de calibrage à tout moment. »

## Le test de calibrage

- **Quand.** Juste après la création du compte, l'élève arrive sur le test (il peut le remettre à plus tard). Tant qu'il ne l'a pas fait, l'accueil et le parcours le lui proposent. Il peut le refaire à tout moment ; le parcours le lui propose de nouveau au bout de 30 jours.
- **Sur quoi.** L'élève coche d'abord les chapitres qu'il a vus en classe. Ces chapitres deviennent ses chapitres « vus en classe » : la séance du jour et le parcours portent dessus.
- **Quelles questions.** Des questions de quiz déjà validées, corrigées par le serveur : pour chaque chapitre, une de l'objectif 10, puis une de l'objectif 14, puis une de l'objectif 18, 15 questions au plus. Quand un chapitre n'a pas de question d'un objectif, il en donne une de l'objectif le plus proche. Un chapitre sans question de quiz (la fiche 14 aujourd'hui) ne peut pas être testé.
- **Le résultat.** Les bonnes réponses par objectif et par chapitre, et un point de départ conseillé : le premier objectif où la réussite n'atteint pas 70 %. Ce n'est pas une note sur 20 : la note estimée garde ses conditions (une note de DS et 20 questions travaillées).
- Les réponses du test comptent dans les progrès, comme celles d'un quiz.

## Le parcours

Il est recalculé à chaque affichage à partir des réponses de l'élève : rien n'est gardé à part, donc il est toujours à jour.

- **Les paliers.** Pour chaque objectif jusqu'à la note visée (viser 10, puis 14, puis 18), le nombre de chapitres vus en classe qui l'ont atteint. Le palier en cours est le premier que tous les chapitres n'ont pas atteint.
- **Les étapes**, dans cet ordre : passer le test de calibrage s'il n'a jamais été fait ; cocher ses chapitres ; la séance du DS proche ; la séance du jour ; le carnet d'erreurs ; les tests de passage disponibles ; puis, pour chaque chapitre, son prochain objectif (les chapitres du prochain devoir d'abord, puis les moins avancés) ; refaire le calibrage quand il a plus de 30 jours.
- **Les signaux** (trois au plus) : une pause après 4 jours sans séance ; un rythme de la semaine qui demande une séance chaque jour restant ; l'objectif le plus fragile (au moins trois questions travaillées, moins de 50 % de réussite) ; un test de passage réussi dans la semaine ; la note visée atteinte sur tous les chapitres.

## Mes choix, à confirmer par Yane

- Le test ne force rien : l'élève peut passer à l'application sans le faire.
- Les seuils (15 questions, 30 jours, 4 jours de pause, 50 %) sont des réglages, dans `lib/moteur/reglages.ts`.
- Le parcours ne « devine » pas de note future : il montre des objectifs atteints ou non, chapitre par chapitre. Il ne promet pas une note.
- Le plan de l'année du cahier des charges (cinq périodes) n'est pas fait : le parcours en est la première moitié.

## Ce que ça change

`lib/moteur/parcours.ts` et ses tests, `lib/serveur/commandes/calibrage.ts`, `lib/serveur/suivi.ts`, `app/(appli)/app/calibrage/`, `app/(appli)/app/parcours/`, l'accueil, la migration `20261114120000` (genres de session `calibrage` et `melange`). Le menu : « Parcours » entre dans le menu de l'ordinateur et dans la barre du haut du téléphone.
