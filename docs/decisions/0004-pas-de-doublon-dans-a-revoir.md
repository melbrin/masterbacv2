# 0004. La partie « à revoir » de la séance ne propose pas deux fois la même question

Date : 2026-11-13
État : proposée, à confirmer par Yane

## La question

Les tests de propriété du portage ont montré un défaut du prototype : quand une question de quiz est dans le carnet d'erreurs du jour, le complément de quiz de la partie « à revoir » peut tirer cette même question. L'élève la voit alors deux fois dans la même séance.

## Les options

1. Garder le comportement du prototype.
2. Écarter du complément les questions déjà tirées du carnet.

## Le choix

L'option 2, par un réglage `revoirSansDoublon` : faux dans `REGLAGES_PROTOTYPE`, vrai dans `REGLAGES_ACTUELS`. Les cas de référence passent toujours avec les réglages du prototype.

## Ce que ça change

`lib/moteur/moteur.ts` (`seanceDuJour`), `lib/moteur/reglages.ts`, un cas de test nommé dans `tests/moteur/proprietes.test.ts`. Pour revenir en arrière : remettre le réglage à faux.
