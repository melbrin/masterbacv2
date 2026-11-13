# Suivi du projet

Ce fichier est la mémoire du projet d'une session à l'autre. Il est chargé au début de chaque session. Tu le mets à jour à la fin de chaque session, et tu le gardes court : ce qui est fini depuis longtemps part dans `docs/journal/`.

## Où on en est

- **Cap** : une version complète en local d'abord (décision 0003). La mise en ligne et les comptes distants viennent ensuite. La branche se pousse quand la version locale est finie.
- **Vente** : sur Shopify ; les accès s'ouvrent dans l'administration (décision 0002). Pas de Stripe dans l'application.
- **Branche de travail** : `lot/0.2-outillage`, empilée sur `lot/0.1-installation-du-kit`. Rien n'est poussé sur GitHub.
- **Dossier de travail** : `Documents/App Masterbac/app-masterbac/`. L'ancien dossier `masterbac-simulator/` (juillet 2026) est intact à côté et n'est pas repris.
- **Lancer en local** : voir `docs/recettes/version-locale-1.md`. Port 3457 ; le port 3456 est celui de l'ancien dossier.
- **Première version locale** : essayable depuis le 13 novembre. En attente de l'essai de Yane.

## Fait et vérifié

- Lots 0.1 à 0.3 (partie locale) : kit, audit, Next.js 16.4.5, lint avec frontières d'import, polices locales, en-têtes, compte à rebours 2027.
- Moteur (`lib/moteur/`) : 43 cas de référence, propriétés, cas limites ; couverture 100 % des lignes, 99 % des branches.
- Contenu : nettoyage du HTML, `npm run contenu:verifier`, `npm run contenu:importer` (rejouable, par versions, figures dans un compartiment privé).
- Base locale : trois migrations, règles d'accès sur toutes les tables, schéma `contenu` réservé au serveur, 33 tests pgTAP (`npm run test:db`).
- Serveur : variables validées, session vérifiée par `getClaims()`, fabriques `action` et `requete` avec registre, limite de débit, droits calculés dans `lib/serveur/acces.ts`.
- Écrans, essayés dans le navigateur en largeur téléphone : connexion par code, profil, Aujourd'hui, cours, fiche (six onglets), question et exercice (indices, corrigé après contrôle du droit, autocorrection, barème avec ligne « Rédaction »), quiz corrigé par le serveur, test de passage, carnet, mode DS (création, plan, préparation offerte, note et moyenne de classe), séance du jour, progrès, profil, offres.
- Administration : double authentification, accès ouverts ou préparés pour une adresse, retrait avec motif, signalements, journal.
- `npm run tout` : lint, types, 133 tests avec couverture, 23 contrôles de contenu, 33 tests de base, compilation. Vert le 13 novembre.

## Reste à faire pour la version locale

1. Évolutions du moteur de `docs/08-moteur.md`, section 6 : retour d'une réussite à 7 jours, niveau 10 validé par test, niveau proposé seulement s'il existe.
2. Parents : invitation, page de suivi, bilan. Accord parental avant 15 ans (aujourd'hui le compte reste limité, sans moyen de le débloquer).
3. Plan de l'année. DS blanc avec chronomètre et énoncés seuls. Vrai ou faux à justifier.
4. Compte : trois appareils, e-mail de nouvelle connexion, « mes données » (téléchargement, suppression).
5. Test gratuit : rattacher le résultat au compte, « Envoyer à mes parents », page élite sur le compte.
6. Administration : relecture des brouillons de contenu, invitations à la bêta, recherche des signalements traités.
7. Rappels par e-mail et tâches planifiées (testables dans la boîte locale).
8. Application installable : manifeste, service worker, page hors ligne.
9. Tests : intégration des commandes contre la base locale, parcours Playwright, 28 cas d'abus, matrice des accès depuis le registre. Relectures par `relecteur-securite` et `relecteur-conformite`.
10. Format des sources de quiz, d'indices et de barèmes (décision à écrire), puis préparation du contenu en brouillon.

## Remis à la mise en ligne

Politique de sécurité du contenu avec jeton, vérifications automatiques GitHub, recherche de secrets à chaque commit, tableau ASVS, envoi réel des e-mails, test anti-robot, sonde.

## Dette et écarts connus

- Un composant d'interface peut importer les actions de `lib/serveur/commandes/` : c'est la seule exception à la frontière d'import, écrite dans `eslint.config.mjs`.
- `enregistreTentative` écrit la tentative puis le carnet en deux requêtes, pas dans une transaction. À regrouper dans une fonction de base.
- Les lectures du contenu passent par des fonctions SQL réservées au rôle de service, pour ne pas exposer le schéma `contenu`.
- Le plan d'un DS est gardé en JSON dans la table `ds`, pas dans une table `ds_seances`.
- Le droit « fiches » ouvre les corrigés de toutes les fiches, pas seulement de celles achetées.
- Les pages du test d'avant le kit gardent 13 avertissements de lint et des émojis. Elles seront réécrites avec la charte commune.
- `npm audit` : 9 failles modérées, toutes dans les outils de développement. TypeScript reste en 5.8.3.

## En attente de Yane

| Quoi | Pourquoi | Marche à suivre | Pour quand |
| --- | --- | --- | --- |
| Installer Docker Desktop | sans lui, pas de base locale : le lot 0.4 et les tests de base sont bloqués | télécharger sur docker.com, installer, ouvrir l'application une fois | 14 novembre |
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
- 0003, version complète en local d'abord ; la mise en ligne et les comptes distants viennent ensuite. Y figure aussi le besoin de faire vivre le contenu (corriger, ajouter exercices et quiz) plus tard.

## Points de vigilance

- Le dépôt ignorait tout le dossier `.claude/` : l'installation du kit a remplacé cette ligne de `.gitignore` pour que les règles soient partagées et que seuls les réglages personnels restent ignorés.
- La page « élite » est fermée par un code écrit en clair dans le programme envoyé au navigateur. Elle reste ainsi jusqu'au lot 1.7.
- Le compte à rebours du test vise encore juin 2026.
- Le dépôt fixe Next.js en 15.5.12. Le minimum corrigé au 13 novembre 2026 est 15.5.29 ou 16.4.5 ; la dernière version est la 16.4.6. La montée de version est le lot 0.3 ; elle passe avant tout le reste du code.
- La politique de sécurité du contenu avec jeton impose le rendu à la demande de toutes les pages. Choix à confirmer par Yane avant le lot 0.3.
- Les écarts entre le kit et les sources officielles sont dans `docs/audit-de-l-existant.md`, section 7. Les relire avant d'installer un outil.
- L'ordinateur n'a ni Docker ni `gh`, et tourne sous Node 24.
