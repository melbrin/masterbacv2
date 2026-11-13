# Plan de livraison : dans quel ordre, pour quelle date, fini quand

Le plan suit les étapes de `docs/contexte/plan-d-implementation.md`. Chaque phase se découpe en lots. Un lot est une branche et une demande de fusion, que Yane peut essayer en dix minutes sur son téléphone. Une phase n'est finie que lorsque son critère « fini quand » est atteint dans la réalité.

## 1. Les dates qui ne bougent pas

| Date | Ce qui se passe |
| --- | --- |
| 7 décembre 2026 | ouverture de la bêta fermée : une vingtaine de clients actuels |
| 11 décembre 2026 | version stabilisée de la bêta : c'est la « première version » attendue sous quatre semaines |
| 19 décembre 2026 | ouverture au public, paiement compris. Date fixe : si le temps manque, c'est le contenu de l'ouverture qui rétrécit |
| du 19 décembre au 4 janvier | gel : aucune nouvelle fonction, seulement des corrections |
| 15 janvier 2027 | coach complet |
| de février à avril 2027 | sujets, correction sur photo en test, bilan automatique des parents, maths |
| 16 et 17 juin 2027 | épreuves de spécialité |

## 2. Semaine par semaine jusqu'au 13 décembre

| Semaine | Objectif | Ce que Yane doit avoir fait |
| --- | --- | --- |
| du 13 au 15 novembre | phase 0 : le dépôt est sain, outillé, vérifié automatiquement | lancer la vérification du compte Stripe ; ouvrir Supabase (projet de recette) et Resend ; ajouter les enregistrements DNS du domaine d'envoi |
| du 16 au 22 novembre | base, import du contenu, comptes, moteur | remplir `.env.local` et les variables de prévisualisation ; choisir les élèves de la bêta, avec la date et les chapitres de leur prochain DS |
| du 23 au 29 novembre | lecture d'une fiche sur téléphone, signalement d'erreur. Fin de la phase 1 | recette de la phase 1 ; première relecture de contenu ; envoi des invitations à la bêta |
| du 30 novembre au 6 décembre | quiz, carnet, mode DS, rappels, application installable ; production prête | recette de la phase 2 ; relecture du contenu des chapitres de la bêta ; ouvrir le projet Supabase de production ; passer Vercel en offre Pro |
| du 7 au 13 décembre | bêta ouverte, corrections, version stabilisée le 11 ; le paiement se termine en mode test | suivre les élèves de la bêta ; produits Stripe ; export des clients de la boutique ; textes légaux chez le juriste |

Le code du paiement se prépare dès la deuxième semaine de la phase 2, en mode test et derrière un interrupteur éteint. La phase 3 ne dure que six jours : elle ouvre, elle ne construit pas.

## 3. Les phases et leurs lots

### Phase 0. Mise en place (du 13 au 15 novembre)

But : une base saine avant d'ajouter des comptes. Rien ne change pour les élèves.

| Lot | Contenu |
| --- | --- |
| 0.1 | Installer le kit. Lire la documentation. Auditer l'existant dans `docs/audit-de-l-existant.md` : ce qui marche, ce qui est fragile, ce qui doit changer. Présenter le plan de la phase à Yane |
| 0.2 | Outillage : version de Node, scripts de `docs/04-tests-et-qualite.md`, Vitest, Playwright, règles de lint (frontières d'import, HTML interdit hors du composant de contenu), recherche de secrets avant chaque commit, vérifications automatiques GitHub, mises à jour hebdomadaires des dépendances, modèle de demande de fusion |
| 0.3 | Montée de Next.js sur la dernière version corrigée de la branche 16. `proxy.ts` avec les en-têtes de sécurité et la politique de sécurité du contenu. Polices servies par l'application. Compte à rebours sur le 16 juin 2027, titres « BAC 2027 », textes conformes aux règles de rédaction |
| 0.4 | Base locale Supabase. Squelette de `lib/serveur/` : variables d'environnement validées, session, fabriques `action`, `route`, `requete`, registre. Route `/api/sante`. Un premier test vert à chaque niveau |
| 0.5 | Tableau ASVS de `docs/securite/`. La liste, pas à pas, de ce que Yane doit faire cette semaine |

**Fini quand** : `npm run tout` est vert sur la machine et dans GitHub ; sur la prévisualisation, le test actuel marche comme avant (son parcours automatique passe) ; la sonde trouve les en-têtes de sécurité.

### Phase 1. Socle (du 16 au 29 novembre)

But : un élève se connecte et lit une fiche.

| Lot | Contenu |
| --- | --- |
| 1.1 | Schéma de la base et règles d'accès : comptes, contenu, travail de l'élève. Tests pgTAP pour les sept rôles. Types générés |
| 1.2 | Import du contenu : schémas, nettoyage du HTML, rendu des formules, figures dans le stockage privé, versions. `npm run contenu:verifier`. Le quiz devient une source par fiche |
| 1.3 | Comptes : connexion par code, profil, trois appareils, moins de 15 ans et accord parental, accès sur invitation, e-mails |
| 1.4 | Moteur : portage exact, cas de référence, tests de propriété |
| 1.5 | Lire une fiche sur téléphone : liste des cours et « vu en classe », six onglets, question et exercice avec indices, corrigé, autocorrection et barème pas à pas, tentatives et carnet. Charte, thème clair et thème sombre du prototype |
| 1.6 | Signaler une erreur. Administration : connexion avec double authentification, liste des signalements |
| 1.7 | La page « élite » passe sur le compte : plus de code dans le programme envoyé au navigateur. Le résultat du test gratuit se rattache au compte |

**Fini quand** : un élève test se connecte et lit une fiche entière sur son téléphone, formules et figures comprises.

### Phase 2. Mode DS et bêta (du 30 novembre au 13 décembre)

But : des élèves préparent un vrai DS.

| Lot | Contenu |
| --- | --- |
| 2.1 | Quiz : sessions, correction sur le serveur, cinq types, explications, quiz du chapitre, bilan |
| 2.2 | Carnet d'erreurs : écran, révision, confirmation d'une réussite à 7 jours |
| 2.3 | Mode DS : création, trois formats, plan, séance cochée, pièges, quiz de séance, DS blanc chronométré, note et moyenne de classe, préparation offerte avec ses corrigés ouverts |
| 2.4 | Tâches planifiées. Rappel de séance, rappel de note, désinscription en un clic |
| 2.5 | Écran « Aujourd'hui » : comptes à rebours, préparation en cours, DS à noter, carnet du jour |
| 2.6 | Application installable : manifeste, service worker, page hors ligne |
| 2.7 | Bêta : invitations, droit de bêta, tableau de suivi du critère de fin |
| 2.8 | Production : migrations, import du contenu, sonde, revue « avant ouverture » de `docs/03-securite.md`. Mise en ligne de la bêta le 7 décembre |
| 2.9 | Semaine de bêta : corrections. Version stabilisée le 11 décembre |

**Fini quand** : dix élèves ont préparé un vrai DS avec l'application. Le tableau de suivi de la bêta le mesure.

### Phase 3. Caisse et ouverture (du 14 au 19 décembre)

But : un parent paie, le public entre.

| Lot | Contenu |
| --- | --- |
| 3.1 | Droits : table, calcul complet des accès, écran des offres |
| 3.2 | Paiement : achat, webhook, écran de retour, e-mail « accès ouvert », portail client, résiliation en ligne, rapprochement quotidien |
| 3.3 | Clients actuels : import lancé par Yane, reconnaissance par l'adresse, tarif à 59 €, fiches retrouvées |
| 3.4 | Parents : invitation, page de suivi, bilan envoyé depuis l'administration, lien d'achat |
| 3.5 | Textes légaux en brouillon, demande de rétractation, « mes données » (téléchargement, suppression du compte), brouillon du registre des traitements |
| 3.6 | Stage de Noël : inscription, confirmation, lien du direct la veille |
| 3.7 | Ouverture au public : test anti-robot, inscriptions ouvertes, « Envoyer à mes parents », exercice du jour, accueil mis à jour |
| 3.8 | Passage au réel : clés réelles posées par Yane, un achat réel par Yane puis son remboursement, revue « avant ouverture », sonde |

**Fini quand** : un parent achète le Pass depuis le lien envoyé par son enfant, en production.

### Gel (du 19 décembre au 4 janvier)

Aucune nouvelle fonction. Corrections de ce que la bêta et les premiers clients remontent, une par une, chacune avec son test. Le travail de la phase 4 avance sur des branches, sans mise en ligne.

### Phase 4. Coach complet (du 5 au 15 janvier)

| Lot | Contenu |
| --- | --- |
| 4.1 | Séance du jour en trois étapes, rythme de la semaine |
| 4.2 | Niveaux validés par test de passage, écran des progrès : notions, niveaux, note estimée quand elle est affichable, courbe des notes |
| 4.3 | Plan de l'année : périodes, parcours, recalcul |
| 4.4 | Bac blanc de janvier : sujet composé, chronométré, corrigé au barème |
| 4.5 | Bilan du mois pour l'élève |

**Fini quand** : un élève inscrit le 15 janvier reçoit sa séance du lendemain sans que personne n'intervienne.

### Phase 5. Sujets, correction, maths (de février à avril)

| Lot | Contenu |
| --- | --- |
| 5.1 | Sujets 2025 et 2026 chronométrés, par exercice ou en entier, une fois leur mise en ligne validée par Yane |
| 5.2 | Correction sur photo, en test pour les élèves de la bêta : dépôt, traitement, retour indicatif, mesure de l'écart avec un professeur, plafonds, interrupteur |
| 5.3 | Bilan des parents envoyé automatiquement le dimanche |
| 5.4 | Maths : matière, fiches, quiz, sélecteur, quand leurs fiches sont à jour |
| 5.5 | Stage de printemps. Bac blanc d'avril |
| 5.6 | Pack BAC : achat avec adresse de livraison, dépôt des copies, correction par un professeur |

**Fini quand** : sur 30 copies de la bêta, l'écart entre la correction sur photo et celle d'un professeur est mesuré et jugé acceptable par Yane.

### Phase 6. Sprint et bilan (de mai à juillet)

Mai et juin ne demandent aucune fonction nouvelle : bac blanc de fin mai, stage du sprint, tenue en charge, surveillance. En juillet : saisie des notes du bac, comparaison avec les notes estimées, bilan des deux preuves (les notes montent, les élèves restent), préparation de la promotion suivante.

En réserve, derrière des interrupteurs éteints, à ouvrir sur décision de Yane : code de groupe pour une classe, garantie mesurée, vidéos de cours, notifications sur le téléphone.

## 4. Si le temps manque

L'ordre de coupe est écrit d'avance. Il s'applique dans cet ordre, sur décision de Yane :

1. Le plan de l'année devient un plan fixe par objectif, sans recalcul.
2. Les tests de passage attendent février : le niveau se calcule sur les quiz seuls.
3. Le bilan hebdomadaire des parents reste un envoi déclenché à la main le dimanche.
4. Le format « Une semaine » du mode DS attend ; « Express » et « Trois jours » restent.
5. La correction sur photo glisse après le bac blanc d'avril.

Ne se coupent jamais : le compte, le mode DS, le paiement, le bouton « signaler une erreur ». Ne se coupent pas non plus : les tests, les règles d'accès, la revue de sécurité avant une ouverture. Quand le temps manque, on livre moins de fonctions, pas des fonctions moins sûres.

Tu préviens Yane dès qu'un lot prend du retard sur ce tableau, avec ce que tu proposes de couper. Tu n'attends pas la veille.

## 5. La méthode de travail

1. **Un lot à la fois.** Tu présentes d'abord ton plan pour le lot : ce que l'élève pourra faire, les fichiers touchés, les tests prévus, les risques. Yane dit oui, puis tu codes.
2. **Une branche par lot**, nommée `lot/<numéro>-<sujet>`. Des commits petits. Tu ne pousses jamais sur `main`.
3. **Les tests avec le code**, pas après. Pour une règle du moteur, un droit ou une règle d'accès, le test s'écrit d'abord.
4. **Avant la demande de fusion** : `npm run tout`, relecture par `relecteur-securite` et `relecteur-conformite`, fiche de recette.
5. **Yane essaie** sur la prévisualisation, puis fusionne. Rien ne part en ligne sans son essai sur téléphone.
6. **Fin de session** : `docs/SUIVI.md` à jour. Ce fichier est la mémoire du projet d'une session à l'autre.
7. **Quand tu attends Yane** (un compte, une clé, une relecture), tu l'écris dans `docs/SUIVI.md`, section « En attente de Yane », avec la marche à suivre, et tu avances sur ce qui ne dépend pas de lui.
8. **Fin de phase** : `/verifier-phase <numéro>`.

## 6. Qui fait quoi

| Qui | Fait quoi |
| --- | --- |
| Yane | tranche ; ouvre les comptes et pose les clés ; relit le contenu ; essaie sur son téléphone ; fusionne ; lance les migrations de production ; écrit aux élèves et aux parents |
| Claude Code | tout le reste : code, tests, migrations, scripts, documentation, brouillons de contenu et de textes légaux, fiches de recette, marches à suivre pour Yane |

Yane dispose d'une douzaine d'heures par semaine. Tu organises ton travail pour lui en demander le moins possible et au bon moment : des questions groupées, des marches à suivre exactes, des recettes courtes.
