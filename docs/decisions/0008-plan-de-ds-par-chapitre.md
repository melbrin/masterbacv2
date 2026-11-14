# 0008. Le plan d'un DS sur plusieurs chapitres répartit ses questions entre les chapitres

Date : 2026-11-14
État : choisie par Claude Code à la demande de Yane (« réfléchis aux meilleures options »), à confirmer

## La question

Yane a demandé si le plan d'un DS avait toujours la même forme, quel que soit le nombre de chapitres. C'était le cas : dans le prototype, une séance « Questions de cours, objectif 10 » donne 4 questions en tout, tirées dans l'ensemble des chapitres. Sur un devoir de deux chapitres essayé le 14 novembre, trois des quatre questions venaient du même chapitre. Un devoir sur trois chapitres n'était donc pas plus préparé qu'un devoir sur un seul, et un chapitre pouvait être presque oublié.

## Les options

1. Garder le plan du prototype.
2. Ajouter des séances quand il y a plus de chapitres.
3. Garder les formats et le nombre de séances, mais donner plus de questions par séance et les répartir entre les chapitres.

## Le choix

L'option 3. Les formats restent ceux du cahier des charges (ils dépendent du nombre de jours avant le devoir) : on ne peut pas ajouter de jours à une semaine. Ce qui change quand le devoir porte sur plusieurs chapitres :

- une séance de questions en donne **deux par chapitre**, jamais moins que le prototype, **huit au plus** ;
- les questions sont tirées **en passant d'un chapitre à l'autre** : aucun chapitre qui a des questions n'est oublié ;
- la durée annoncée suit le nombre de questions : 30 minutes jusqu'à 4 questions, 40 pour 6, 50 pour 8 ;
- les exercices (séance d'exercice, DS blanc) viennent de **chapitres différents** quand c'est possible ;
- le DS blanc garde la durée du devoir : ses exercices, puis une question par chapitre, quatre au plus.

Un devoir sur un seul chapitre garde exactement le plan du prototype.

## Ce que ça change

`lib/moteur/moteur.ts` (`planParChapitre`, `parTour`, paramètre `eviter` d'`exercicePour`), réglages `planParChapitre` et `questionsMaxSeanceDs` : faux dans `REGLAGES_PROTOTYPE`, vrai dans `REGLAGES_ACTUELS`. Les cas de référence passent toujours. Nouveaux tests dans `tests/moteur/parcours.test.ts`. Les plans déjà construits ne changent pas : un plan est construit une fois et gardé tel quel. Pour revenir en arrière : remettre le réglage à faux.
