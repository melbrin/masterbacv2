# Le moteur de préparation : les règles du coach

Le moteur choisit la séance du jour, construit le plan d'un DS, tient le carnet d'erreurs, calcule les niveaux, l'état des notions et la note estimée. Ce sont des règles écrites, sans IA : prévisibles, gratuites, testables.

Il existe déjà, dans le prototype : `reference/prototype/site/js/moteur.js` (293 lignes), avec `etat.js` et `util.js`. Ce document dit comment le réécrire dans l'application, puis comment le faire évoluer.

## 1. La méthode : reproduire d'abord, faire évoluer ensuite

1. **Reproduire.** Tu réécris le moteur en TypeScript dans `lib/moteur/`. Il doit redonner exactement les résultats de `reference/moteur-cas-de-reference.json` à partir des mêmes entrées. Tant qu'un seul cas diffère, le portage n'est pas fini.
2. **Faire évoluer.** Chaque changement de règle passe par un réglage du moteur (section 6), une décision dans `docs/decisions/` et de nouveaux cas de test. Les cas de référence continuent de passer avec les réglages du prototype.

Cette méthode protège ce que Yane a validé le 13 novembre et rend chaque évolution visible.

## 2. Ce que le moteur est, et n'est pas

- Un module pur : aucune lecture de base, aucun appel réseau, aucun accès à l'horloge. L'instant présent et l'état de l'élève lui sont passés en arguments.
- Il tourne sur le serveur. Le navigateur n'en reçoit que les résultats utiles à l'écran.
- Il ne connaît du contenu que le sommaire (fiches, items, notions, quiz : identifiants, niveaux, types, durées), jamais les énoncés ni les corrigés.
- La couche `lib/serveur/` lit la base, construit l'état, appelle le moteur, écrit ce qu'il décide.

## 3. Les conventions

| Sujet | Règle |
| --- | --- |
| Clé d'un item | `<fiche>-q<numéro>` pour une question de cours, `<fiche>-ex<numéro>` pour un exercice, `quiz:<identifiant>` pour une question de quiz |
| Résultat d'une tentative | `ok` vaut 1, `partiel` vaut 0,5, `ko` vaut 0. Un exercice corrigé au barème porte son propre score entre 0 et 1 : `ok` à partir de 0,7, `partiel` à partir de 0,4, `ko` en dessous |
| Jour | une date civile `AAAA-MM-JJ` à l'heure de Paris. Le serveur tourne en UTC : le jour se calcule avec le fuseau `Europe/Paris`, jamais avec l'heure du serveur |
| Écart entre deux jours | un nombre entier de jours civils, sans effet du changement d'heure |
| Semaine | du lundi au dimanche |
| Tirages | reproductibles. `melange(liste, graine)` : générateur congruentiel `s = (s × 1664525 + 1013904223) mod 2^32`, graine nulle remplacée par 1, permutation de la fin vers le début avec `j = s mod (i + 1)`. `graineDuJour(texte)` : empreinte FNV-1a sur 32 bits de la date du jour suivie du texte. Reprendre le code de `util.js` à l'identique, dépassements d'entiers compris |
| Ordre des entrées | l'ordre des items dans le sommaire, des questions dans le quiz, des tentatives et des entrées du carnet fait partie des entrées. Les tris sont stables. L'import du contenu conserve l'ordre de l'export ; l'adaptateur de base range les tentatives par date puis par identifiant, le carnet par date d'entrée |
| Nombres à virgule | comparer les taux et la note estimée avec une tolérance de 1e-9 |

## 4. Les règles du prototype

Les noms entre parenthèses sont ceux des fonctions du prototype.

### 4.1 Le carnet d'erreurs (`enregistre`, `carnet`)

- Une tentative ratée ou réussie en partie place l'item dans le carnet à l'étape 0, avec une échéance 2 jours plus tard.
- Une réussite sur un item du carnet le fait avancer d'une étape. Les intervalles sont 2, 7 et 21 jours : après la première réussite, retour dans 7 jours ; après la deuxième, dans 21 jours ; après la troisième, l'item sort du carnet.
- Un nouvel échec, à n'importe quelle étape, ramène l'item à l'étape 0 et à 2 jours, sans changer sa place dans le carnet.
- Une réussite sur un item absent du carnet ne crée rien.
- Le carnet se lit par échéance croissante. Le carnet du jour contient les items dont l'échéance est aujourd'hui ou passée.
- Le carnet peut se reconstruire en rejouant toutes les tentatives dans l'ordre (`recalculeCarnet`). Un test compare régulièrement le carnet stocké et le carnet reconstruit.

### 4.2 L'état d'une notion (`etatNotion`, `etatsFiche`)

Une notion est reliée à des questions et à des exercices de sa fiche. On rassemble toutes leurs tentatives, par ordre chronologique.

| État | Condition |
| --- | --- |
| à voir | aucune tentative |
| solide | taux de réussite d'au moins 70 % sur toutes les tentatives, dernière tentative réussie, et au moins deux réussites dont la première et la dernière sont séparées d'au moins 7 jours |
| acquis | taux d'au moins 70 % et dernière tentative réussie, sans la condition des 7 jours |
| en cours | tous les autres cas |

### 4.3 Le niveau d'un chapitre (`niveauFiche`)

Pour chaque niveau (10, 14, 18), les items du niveau sont les questions de cours de ce niveau et les questions de quiz de ce niveau. Les exercices n'entrent pas dans ce calcul.

- `faits` : le nombre d'items tentés au moins une fois. `taux` : la moyenne du score de la dernière tentative de chaque item tenté.
- Le critère d'un niveau est rempli si le niveau a des items, si `faits` vaut au moins 3 (ou le nombre total d'items s'il y en a moins de 3) et si `taux` vaut au moins 0,7.
- Le niveau 10 est atteint quand son critère est rempli. Le niveau 14 demande en plus son test de passage réussi, et le niveau 10 atteint. Le niveau 18 de même, après le 14.
- `prochain` : le niveau suivant à atteindre, ou rien après 18.
- Le test de passage est disponible quand le prochain niveau est 14 ou 18, que son critère est rempli, que le test n'a pas encore été réussi et que le chapitre a au moins 3 questions de quiz.

### 4.4 Le test de passage (`questionsPassage`)

Cinq questions : celles du niveau visé, mélangées avec la graine du jour suivie de « p », du numéro de fiche et du niveau ; puis, s'il en manque, les autres questions du chapitre par niveau le plus proche. Réussi à 70 % de bonnes réponses, soit 4 sur 5. Durée : 15 minutes.

### 4.5 La note estimée (`noteEstimee`)

Pour chaque chapitre coché « vu en classe » qui a au moins une tentative :

- `t10`, `t14`, `t18` sont les taux des trois niveaux. Un niveau sans tentative se déduit prudemment de celui d'en dessous : `t10` vaut 0,6 par défaut, `t14` vaut 0,45 × `t10`, `t18` vaut 0,35 × `t14`.
- La note du chapitre vaut `6 + 4 × t10 + 4 × t14 + 6 × t18`.

La note du moteur est la moyenne des notes de chapitre. S'il existe des notes de DS saisies, on prend la moyenne des trois plus récentes, et la valeur finale vaut `0,6 × note du moteur + 0,4 × moyenne des DS` (ou la moyenne des DS seule si aucun chapitre n'a de tentative).

La fourchette : demi-largeur `max(1 ; 3 − 2 × min(1 ; essais / 60) − 0,5 si des notes de DS existent)`, où `essais` est le nombre d'items tentés ; borne basse arrondie à l'entier inférieur et limitée à 0, borne haute arrondie à l'entier supérieur et limitée à 20. La valeur s'arrondit au dixième.

Sans chapitre tenté ni note de DS, il n'y a pas de note estimée.

### 4.6 Le plan d'un DS (`formatPour`, `construitPlan`)

Le format dépend du nombre de jours avant le devoir : express jusqu'à 1 jour, trois jours de 2 à 6, une semaine à partir de 7. Une séance prévue avant la date de création est ramenée à cette date.

Le quiz est tiré en premier (10 questions au plus, graine du jour suivie de l'identifiant du DS), pour que le titre de la séance annonce le vrai nombre de questions. Un item choisi pour une séance n'est pas repris dans une autre.

| Format | Séances |
| --- | --- |
| Express | J−1 : « Fiche éclair », 20 min : l'essentiel de chaque chapitre, le quiz, les pièges |
| Trois jours | J−3 : l'essentiel et le test (titre « Le cours en une page » s'il n'y a pas de quiz), 30 min. J−2 : 4 questions ciblées sur les points faibles, 30 min. J−1 : un exercice type (à défaut, 2 questions) et les pièges, 30 min |
| Une semaine | J−7 : l'essentiel et le quiz. J−6 : 4 questions d'objectif 10. J−5 : pour viser 14 ou 18, 3 questions d'objectif 14, plus 1 d'objectif 18 si l'on vise 18 ; pour viser 10, 4 autres questions d'objectif 10. J−4 : un exercice type BAC. J−3 : 3 points faibles et le carnet d'erreurs. J−2 : le DS blanc chronométré, à la durée du devoir. J−1 : la fiche éclair |

Les règles de choix :

- **Points faibles** (`pointsFaibles`) : parmi les questions de cours de niveau inférieur ou égal à l'objectif, dans cet ordre : ratées, réussies en partie, jamais faites et tombées au BAC, jamais faites. Les questions déjà réussies sont exclues. À égalité : niveau croissant, puis numéro.
- **Questions d'un niveau** (`questionsNiveau`) : même ordre de priorité, les questions réussies en dernier ; à égalité, celles tombées au BAC d'abord, puis par numéro.
- **Exercice** (`exercicePour`) : d'abord ceux de niveau inférieur ou égal à l'objectif, puis ceux jamais tentés, puis le plus court.
- **Quiz** (`quizPour`) : les questions de niveau inférieur ou égal à l'objectif, dans l'ordre ratées, jamais faites, réussies, chaque groupe mélangé ; s'il en manque, les niveaux au-dessus, de la même façon.
- **DS blanc** : un exercice, un second si le devoir dure 2 heures ou plus, puis des points faibles (2 si le devoir dure 2 heures ou plus, 3 sinon).

### 4.7 La séance du jour (`seanceDuJour`)

- Une séance par jour. Calculée à la première demande du jour, puis gardée.
- **Chapitres visés.** Ceux du prochain DS s'il a lieu dans 7 jours ou moins ; sinon les chapitres cochés « vu en classe » ; sinon le chapitre 1. La raison est gardée avec la séance : `ds`, `classe` ou `defaut`.
- **À revoir.** Les 3 premiers items du carnet du jour, complétés au besoin par des questions de quiz des chapitres visés.
- **L'exercice.** Pour chaque chapitre visé, dans l'ordre : le niveau travaillé est le prochain niveau à valider, sans dépasser la note visée. On prend une question de cours de ce niveau ou en dessous, pas encore réussie et absente de la partie « à revoir », en préférant dans l'ordre : le niveau travaillé, les questions tombées au BAC, les questions qui ne sont pas de type « Cours », le plus petit numéro. Si aucun chapitre visé n'a de question à proposer, on prend la première question de cours des chapitres visés, au niveau de la note visée ou en dessous.
- La séance vaut 25 minutes. La marquer comme faite l'ajoute aux séances de la semaine.

### 4.8 Le rythme et les périodes

- Séances prévues par semaine : 3 pour viser 10, 4 pour viser 14, 5 pour viser 18.
- Les cinq périodes de l'année et leurs dates sont dans `PERIODES` (`moteur.js`). Les épreuves de spécialité : 16 et 17 juin 2027.

## 5. Les cas de référence

`reference/moteur-cas-de-reference.json` contient les entrées et les résultats attendus, produits par le prototype à date fixe :

| Scénario | Contenu |
| --- | --- |
| `demo` | l'élève de démonstration, le 13 novembre 2026 à 18 h : quatre chapitres vus, deux DS notés, un DS dans six jours |
| `nouveau` | un nouvel élève sans aucune réponse, même date |
| `sequence` | un nouvel élève suivi du 2 novembre au 3 décembre 2026 en cinq étapes datées, avec les actions appliquées à chaque étape et l'état relevé après chacune |

Pour chaque état : le carnet, le carnet du jour, l'état et le niveau de chaque fiche, la note estimée, le prochain DS, les DS à noter, le lundi de la semaine, les séances de la semaine, la période, le format pour 0 à 10 jours, sept plans de DS, quatre tirages de quiz, trois tests de passage, deux listes de points faibles, la séance du jour.

Les données de contenu de ces cas sont figées dans `reference/prototype/site/data/` (`fiches.json` et `quiz.json`). Les tests du moteur lisent ces fichiers, pas le contenu vivant de `contenu/export/`, qui va changer.

Le fichier se régénère avec `reference/prototype/outils/genere_cas_de_reference.py`. Tu ne le régénères pas : il décrit le prototype, qui ne change plus.

## 6. Les évolutions décidées

Le moteur reçoit un objet de réglages. `REGLAGES_PROTOTYPE` reproduit le prototype et sert aux cas de référence. `REGLAGES_ACTUELS` porte les évolutions ci-dessous, chacune avec ses propres cas de test.

| Réglage | Règle | Origine |
| --- | --- | --- |
| Confirmation d'une réussite | Une question de cours ou de quiz réussie à la première tentative revient une seule fois, 7 jours plus tard. Réussie : elle sort. Ratée : elle entre dans le carnet à l'étape 0. Les exercices ne sont pas concernés. Dans la séance, les erreurs passent avant les confirmations. Une confirmation non faite 14 jours après son échéance est abandonnée | ajustement 3 |
| Niveau validé par un test | Chaque niveau, y compris le 10, demande son test de passage, corrigé par le serveur. Les réponses que l'élève juge lui-même ne suffisent plus | ajustement 4 |
| Niveau proposé seulement s'il existe | Un niveau n'est proposé sur un chapitre que s'il y a de quoi le travailler et le tester : au moins 3 questions de cours et 5 questions de quiz de ce niveau. Le test de passage tire alors ses 5 questions dans ce niveau seulement. Sinon le chapitre s'arrête au niveau précédent, l'écran le dit, et l'administration le liste comme contenu manquant | principe des chiffres honnêtes |
| Note estimée affichable | Le calcul ne change pas. L'affichage demande au moins une note de DS saisie et au moins 20 items tentés. Sinon l'écran dit ce qu'il manque | ajustement 4 |
| Ligne « Rédaction » | Le score d'un exercice au barème compte une ligne de rédaction, dont le poids est fixé dans le barème de l'exercice | ajustement 4 |

Les seuils (7 jours, 14 jours, 20 items, 3 et 5 questions) sont des valeurs de départ. Ils se règlent dans un seul fichier et se décident avec Yane.

## 7. Ce qu'il faudra recaler

- **La note estimée.** Elle n'a pas encore été confrontée à de vraies notes. Chaque note de DS saisie, avec la moyenne de classe quand elle est donnée, est gardée pour mesurer l'écart. En juillet, les notes du bac servent au recalage. D'ici là, aucune promesse chiffrée ne s'appuie sur elle.
- **Le plan de l'année.** Le prototype montre les périodes et le rythme. Le recalcul du plan selon les chapitres vus et les séances sautées s'écrit en phase 4, avec ses propres règles et ses propres cas.
- **Les maths.** Le moteur ne dépend pas de la matière. L'arrivée des maths ajoute des fiches et un sélecteur de matière, pas de nouvelles règles.

## 8. Les tests du moteur

- Les cas de référence, tous, à chaque exécution.
- Des tests de propriété, sur des états tirés au hasard : une échéance du carnet est toujours dans le futur de la tentative qui l'a créée ; un plan n'a jamais deux fois le même item ; aucune séance n'est datée après le devoir ni avant la création ; un quiz n'a ni doublon ni plus de questions que demandé ; la note estimée reste entre 0 et 20 et dans sa fourchette ; deux appels avec les mêmes entrées donnent le même résultat.
- Les jours particuliers : changement d'heure de mars et d'octobre, minuit à Paris, 31 décembre, 29 février.
- Couverture des lignes et des branches de `lib/moteur/` : 95 % au moins. Tests de mutation sur ce dossier avant chaque fin de phase.
