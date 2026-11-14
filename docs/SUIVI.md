# Suivi du projet

Ce fichier est la mémoire du projet d'une session à l'autre. Il est chargé au début de chaque session. Tu le mets à jour à la fin de chaque session, et tu le gardes court : ce qui est fini depuis longtemps part dans `docs/journal/`.

## Où on en est

- **Cap** : une version complète en local d'abord (décision 0003). La mise en ligne et les comptes distants viennent ensuite. La branche se pousse quand la version locale est finie.
- **Vente** : sur Shopify ; les accès s'ouvrent dans l'administration (décision 0002). Pas de Stripe dans l'application.
- **Branche de travail** : `lot/0.2-outillage`, empilée sur `lot/0.1-installation-du-kit`. Rien n'est poussé sur GitHub.
- **Dossier de travail** : `Documents/App Masterbac/app-masterbac/`. L'ancien dossier `masterbac-simulator/` (juillet 2026) est intact à côté et n'est pas repris.
- **Lancer en local** : voir `docs/recettes/version-locale-1.md`. Port 3457 ; le port 3456 est celui de l'ancien dossier.
- **Version locale** : essayée par Yane le 14 novembre. Ses remarques sont traitées dans la deuxième version (décisions 0005 à 0007), puis ses demandes du même jour dans la troisième (décisions 0008 à 0010 : calibrage, parcours, jeux, simulation, quiz mélangé, plan de DS par chapitre) et dans la quatrième (décision 0011 : le labo). Recettes : `docs/recettes/version-locale-3.md` et `version-locale-4.md`. En attente de son essai.

## Fait et vérifié

- Lots 0.1 à 0.3 (partie locale) : kit, audit, Next.js 16.4.5, lint avec frontières d'import, polices locales, en-têtes, compte à rebours 2027.
- Moteur (`lib/moteur/`) : 43 cas de référence, propriétés, cas limites ; couverture 100 % des lignes, 99 % des branches.
- Contenu : nettoyage du HTML, `npm run contenu:verifier`, `npm run contenu:importer` (rejouable, par versions, figures dans un compartiment privé).
- Base locale : trois migrations, règles d'accès sur toutes les tables, schéma `contenu` réservé au serveur, 33 tests pgTAP (`npm run test:db`).
- Serveur : variables validées, session vérifiée par `getClaims()`, fabriques `action` et `requete` avec registre, limite de débit, droits calculés dans `lib/serveur/acces.ts`.
- Écrans, essayés dans le navigateur en largeur téléphone : connexion par code, profil, Aujourd'hui, cours, fiche (six onglets), question et exercice (indices, corrigé après contrôle du droit, autocorrection, barème avec ligne « Rédaction »), quiz corrigé par le serveur, test de passage, carnet, mode DS (création, plan, préparation offerte, note et moyenne de classe), séance du jour, progrès, profil, offres.
- Administration : double authentification, accès ouverts ou préparés pour une adresse, retrait avec motif, signalements, journal.
- Deuxième version locale (14 novembre), essayée dans le navigateur en largeur téléphone avec un compte gratuit puis un Pass : textes réécrits en langue simple ; séance du jour guidée question par question, avec fin automatique, bilan, confettis et séries ; retour animé après l'autocorrection ; mode DS étape par étape, avec l'écran du DS blanc et son minuteur ; année sur « Tombé au BAC » ; questions cumulées par note visée ; écran des progrès avec la courbe des notes, le travail par semaine, la régularité sur quatre semaines, la réussite par objectif et le bilan du mois ; retour au carnet après une question du carnet.
- Défauts trouvés à l'essai et corrigés : la correction de la dernière question d'un quiz disparaissait ; le terminal de développement écrivait l'adresse e-mail et le code de connexion (coupé dans `next.config.ts`).
- Troisième version locale (14 novembre) : test de calibrage à la première connexion et refaisable, parcours recalculé à chaque affichage (paliers, étapes, signaux), dix jeux (sept dans le navigateur, trois corrigés par le serveur), quiz mélangé, simulation du basketteur, plan de DS réparti entre les chapitres, table `parties` (records), menu avec « Jeux » en bas et « Parcours » en haut.
- Essais de la troisième version : calibrage, parcours, quiz mélangé, trois jeux du serveur et plan de DS sur trois chapitres dans le navigateur intégré ; les sept jeux du navigateur et la simulation avec Playwright (`scripts/essais/jeux.mts`), parce que le navigateur intégré met les animations en pause.
- Quatrième version locale (14 novembre), le labo : vingt-quatre défis en huit simulations (basketteur, largage, satellite, thé, effet Doppler, circuit RC, titrage, décroissance radioactive), un défi par objectif. L'élève calcule, entre sa valeur, lance la simulation ; le serveur juge l'essai avec les mêmes règles que le navigateur, compte les essais et donne les étoiles (table `defis`). Les énoncés sont des brouillons, gardés sur le serveur, visibles seulement en local ou par l'administrateur.
- Essais du labo avec Playwright (`scripts/essais/labo.mts`), en largeur téléphone puis sur grand écran et en thème sombre : les vingt-quatre défis joués avec une valeur fausse puis la bonne, les étoiles, le défi fermé, le défi rejoué, sans défilement horizontal ni erreur de page.
- `npm run tout` : lint, types, 290 tests avec couverture (moteur et règles du labo : 100 % des lignes), 25 contrôles de contenu, 49 tests de base, compilation. Vert le 14 novembre.

## Film de présentation

- `scripts/presentation/` : `textes.mts` (ce que dit la voix), `voix.mts` (ElevenLabs, clé lue dans `ELEVENLABS_API_KEY`, jamais écrite), `filmer.mts` (parcours filmé en local avec Playwright, puis montage avec ffmpeg).
- Refaire le film sans refaire la voix : `node scripts/presentation/filmer.mts sorties/presentation sorties/presentation/masterbac-presentation.mp4`, serveur et base locale démarrés. Le dossier `sorties/` n'est pas suivi par git.
- Ajouts du 13 novembre : `@playwright/test` 1.65.0 (prévu pour les parcours), ffmpeg installé sur l'ordinateur par Homebrew.
- Depuis le 14 novembre, le parcours de `filmer.mts` ne correspond plus aux écrans (séance et mode DS guidés, nouveaux textes) : il faut l'adapter avant de retourner le film.

## Reste à faire pour la version locale

1. Évolutions du moteur de `docs/08-moteur.md`, section 6 : retour d'une réussite à 7 jours, niveau 10 validé par test, niveau proposé seulement s'il existe.
2. Parents : invitation, page de suivi, bilan. Accord parental avant 15 ans (aujourd'hui le compte reste limité, sans moyen de le débloquer).
3. Plan de l'année. Vrai ou faux à justifier. (Le DS blanc a son écran depuis le 14 novembre : énoncés seuls, minuteur, puis correction partie par partie.)
4. Compte : trois appareils, e-mail de nouvelle connexion, « mes données » (téléchargement, suppression).
5. Test gratuit : rattacher le résultat au compte, « Envoyer à mes parents », page élite sur le compte.
6. Administration : relecture des brouillons de contenu, invitations à la bêta, recherche des signalements traités.
7. Rappels par e-mail et tâches planifiées (testables dans la boîte locale).
8. Application installable : manifeste, service worker, page hors ligne.
9. Tests : intégration des commandes contre la base locale, parcours Playwright, 28 cas d'abus, matrice des accès depuis le registre. Relectures par `relecteur-securite` et `relecteur-conformite`.
10. Format des sources de quiz, d'indices et de barèmes (décision à écrire), puis préparation du contenu en brouillon.
11. Suites des demandes du 14 novembre : écrire de nouvelles questions de quiz, en brouillon, pour avoir plusieurs quiz par chapitre (il y en a 5 à 21 par chapitre, aucune pour la fiche 14) ; d'autres simulations pour le labo (lentille et lunette, poussée d'Archimède, énergie mécanique, particule dans un champ électrique, pH, pile) ; faire entrer les jeux, le labo et le calibrage dans le parcours, les progrès, la page des parents et le bilan.
12. Relire dans la langue de la décision 0005 les pages du test de niveau et de l'administration.

## Remis à la mise en ligne

Politique de sécurité du contenu avec jeton, vérifications automatiques GitHub, recherche de secrets à chaque commit, tableau ASVS, envoi réel des e-mails, test anti-robot, sonde.

## Dette et écarts connus

- Un composant d'interface peut importer les actions de `lib/serveur/commandes/` : c'est la seule exception à la frontière d'import, écrite dans `eslint.config.mjs`.
- `enregistreTentative` écrit la tentative puis le carnet en deux requêtes, pas dans une transaction. À regrouper dans une fonction de base.
- Les lectures du contenu passent par des fonctions SQL réservées au rôle de service, pour ne pas exposer le schéma `contenu`.
- Le plan d'un DS est gardé en JSON dans la table `ds`, pas dans une table `ds_seances`. Les étapes de lecture cochées y sont aussi (champ `lues`), écrites en lecture puis écriture, sans verrou.
- Le droit « fiches » ouvre les corrigés de toutes les fiches, pas seulement de celles achetées.
- Le score d'un jeu qui tourne dans le navigateur est annoncé par le navigateur (`verifiee` à faux dans `parties`). Il ne sert qu'au record personnel.
- Les nouvelles commandes (calibrage, jeux, défis du labo) n'ont pas encore leurs cas dans la matrice des accès, qui reste à écrire (point 9).
- Les règles de calcul du labo sont dans le code envoyé au navigateur, puisqu'il anime la simulation : un élève qui lit ce code peut retrouver une réponse. Il n'y a ni classement ni contenu payant derrière.
- `scripts/essais/jeux.mts` (sept jeux et simulation libre) et `scripts/essais/labo.mts` (vingt-quatre défis) jouent avec le compte local `theo.essai@exemple.fr`. Ce sont des essais à la main, à transformer en parcours Playwright (point 9). Celui du labo veut un compte sans ligne dans la table `defis`.
- Les pages du test d'avant le kit gardent 13 avertissements de lint et des émojis. Elles seront réécrites avec la charte commune.
- `npm audit` : 9 failles modérées, toutes dans les outils de développement. TypeScript reste en 5.8.3.

## En attente de Yane

| Quoi | Pourquoi | Marche à suivre | Pour quand |
| --- | --- | --- | --- |
| Essayer la deuxième version locale | vérifier que ses remarques du 14 novembre sont bien traitées | `docs/recettes/version-locale-2.md` | 16 novembre |
| Confirmer les décisions 0004 à 0007 | séries de jours et de semaines, liste des questions ouverte sur la note visée | lire la partie « À confirmer » de chaque décision | 16 novembre |
| Essayer la troisième version locale | calibrage, parcours, dix jeux, simulation, plan de DS par chapitre | `docs/recettes/version-locale-3.md` | 16 novembre |
| Confirmer les décisions 0008 à 0010 | plan de DS par chapitre, règles du calibrage et du parcours, liste des jeux, place des jeux dans le menu, valeurs de la simulation | lire la partie « à confirmer » de chaque décision | 16 novembre |
| Essayer la quatrième version locale, le labo | calculer, entrer sa valeur, lancer la simulation | `docs/recettes/version-locale-4.md` | 16 novembre |
| Valider ou corriger les vingt-quatre énoncés du labo, et confirmer la décision 0011 | ce sont des brouillons : ils ne se montrent qu'en local tant qu'ils ne sont pas validés | la partie « Ce que tu dois me dire » de la recette, puis la partie « à confirmer » de la décision | 18 novembre |
| Valider l'architecture de départ | décision 0001 | lire `docs/02-architecture.md`, section 2, et répondre | 15 novembre |
| Confirmer ou retirer les cinq ajustements, et répondre aux points de la section 7 du cahier des charges | ils fixent le périmètre de la bêta | `docs/01-cahier-des-charges.md`, sections 4 et 7 | 15 novembre |
| Ouvrir Resend et ajouter les enregistrements du domaine d'envoi | les e-mails de connexion en dépendent | section 3.4 | tout de suite |
| Ouvrir le projet Supabase de recette | la base des essais | section 3.3 | 16 novembre |
| Vérifier la liste de protection de ses comptes | première menace pour le projet | section 1 | 16 novembre |
| Choisir les élèves de la bêta, avec la date et les chapitres de leur prochain DS | fixe l'ordre de préparation du contenu | une liste de prénoms et d'adresses gardée hors du dépôt ; ne donner à Claude Code que les chapitres et les dates | 22 novembre |

## Décisions récentes

- 0001, architecture de départ : validée par Yane le 13 novembre, sauf le point 7 (paiement), remplacé par la décision 0002.
- 0002, vente sur Shopify, accès ouverts dans l'administration : pas de Stripe dans l'application.
- 0004, pas de doublon dans la partie « à revoir » de la séance : proposée, à confirmer.
- 0008, plan de DS réparti entre les chapitres : choisie par Claude Code à la demande de Yane, à confirmer.
- 0009, test de calibrage et parcours suivi en continu : demandée par Yane, règles de détail à confirmer.
- 0010, dix jeux, quiz mélangé, simulation du basketteur : demandée par Yane, liste des jeux à confirmer.
- 0011, le labo, calculer d'abord puis lancer la simulation : demandée par Yane le 14 novembre ; énoncés en brouillon, règle des étoiles et tolérances à confirmer.
- 0005, textes de l'interface en langue simple, année sur « Tombé au BAC », questions cumulées par note visée : demandée par Yane le 14 novembre.
- 0006, séance du jour guidée, fin de séance fêtée, séries de jours et de semaines : demandée par Yane ; les règles des séries sont à confirmer.
- 0007, mode DS étape par étape : demandée par Yane le 14 novembre.
- 0003, version complète en local d'abord ; la mise en ligne et les comptes distants viennent ensuite. Y figure aussi le besoin de faire vivre le contenu (corriger, ajouter exercices et quiz) plus tard.

## Points de vigilance

- Le dépôt ignorait tout le dossier `.claude/` : l'installation du kit a remplacé cette ligne de `.gitignore` pour que les règles soient partagées et que seuls les réglages personnels restent ignorés.
- La page « élite » est fermée par un code écrit en clair dans le programme envoyé au navigateur. Elle reste ainsi jusqu'au lot 1.7.
- Next.js est en 16.4.5, le minimum corrigé au 13 novembre 2026 ; la dernière version est la 16.4.6.
- La politique de sécurité du contenu avec jeton impose le rendu à la demande de toutes les pages. Choix à confirmer par Yane avant le lot 0.3.
- Les écarts entre le kit et les sources officielles sont dans `docs/audit-de-l-existant.md`, section 7. Les relire avant d'installer un outil.
- L'ordinateur a Docker Desktop, ffmpeg et Node 24 ; il n'a pas `gh`.
- En développement, une commande du serveur modifiée n'est parfois rechargée qu'à la modification suivante : en cas de doute pendant un essai, relancer le serveur.
- Une règle `@container` ne s'applique pas à l'élément qui porte `container-type`, seulement à ce qu'il contient : la grille à deux colonnes se met sur un élément intérieur (`.labo-colonnes`, `.simu-panneau`).
- Une action qui écrit recharge la page en cours (c'est ainsi que Next.js fonctionne). Un écran qui doit garder un retour à l'écran après l'action (verdict, correction) a donc une adresse qui ne dépend pas de l'avancement, ou un composant qui reste monté.
