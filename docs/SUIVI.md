# Suivi du projet

Ce fichier est la mémoire du projet d'une session à l'autre. Il est chargé au début de chaque session. Tu le mets à jour à la fin de chaque session, et tu le gardes court : ce qui est fini depuis longtemps part dans `docs/journal/`.

## Où on en est

- **Cap** : une version complète en local d'abord (décision 0003). La mise en ligne et les comptes distants viennent ensuite. La branche se pousse quand la version locale est finie.
- **Vente** : sur Shopify ; les accès s'ouvrent dans l'administration (décision 0002). Pas de Stripe dans l'application.
- **Branche de travail** : `lot/0.2-outillage`, empilée sur `lot/0.1-installation-du-kit`. Rien n'est poussé sur GitHub.
- **Dossier de travail** : `Documents/App Masterbac/app-masterbac/`, copie neuve du dépôt GitHub. L'ancien dossier `masterbac-simulator/` (travail non enregistré de juillet 2026) est intact à côté et n'est pas repris.
- **Lancer en local** : `npm run dev -- --port 3457`, puis http://localhost:3457. Le port 3456 est celui de l'ancien dossier.
- **Bloqué par** : Docker Desktop, pas encore installé. Sans lui, pas de base locale.

## Fait

- Lot 0.1 : kit installé, documentation lue, audit dans `docs/audit-de-l-existant.md` (écarts avec le kit en section 7).
- Lots 0.2 et 0.3, partie locale : versions exactes, Node 24, Next.js 16.4.5, React 19.3.1, KaTeX 0.19.1 ; ESLint avec les frontières d'import ; Vitest ; polices servies par l'application ; en-têtes de sécurité ; compte à rebours sur le 16 juin 2027 ; paramètres d'adresse et lien de défi validés. Vérifié dans le navigateur en 375 points de large.
- Lot 1.4 : moteur porté dans `lib/moteur/`, 43 cas de référence reproduits, tests de propriété et cas limites, couverture 100 % des lignes et 99 % des branches.
- Lot 1.2, partie sans base : nettoyage du HTML (`lib/commun/html/nettoie.ts`) et `npm run contenu:verifier` (9 418 formules, 188 figures, 406 étapes de corrigé).
- `npm run tout` : lint, types, 117 tests avec couverture, contrôle du contenu, compilation. Vert le 13 novembre.

## Reste à faire pour la version locale, dans l'ordre

1. Base locale : `supabase init`, schéma et règles d'accès (comptes, contenu, travail de l'élève, droits), tests pgTAP, types générés.
2. Import du contenu en base et figures dans le stockage privé. Format des sources de quiz, d'indices et de barèmes (décision à écrire).
3. Squelette de `lib/serveur/` : variables d'environnement, session, fabriques `action`, `route`, `requete`, registre, `/api/sante`.
4. Comptes : connexion par code (lu dans la boîte locale), profil, appareils, moins de 15 ans.
5. Administration : double authentification, écran « Accès » (décision 0002), signalements.
6. Écrans de l'élève : cours et fiche, quiz, carnet, mode DS, Aujourd'hui, séance du jour, progrès, plan de l'année, parents, offres (renvoi vers la boutique).
7. Évolutions du moteur de `docs/08-moteur.md`, section 6, dans `REGLAGES_ACTUELS` (seul le réglage de la décision 0004 y est).
8. Playwright, tests de sécurité (cas d'abus), relectures par les agents, fiche de recette.

## Remis à la mise en ligne

Politique de sécurité du contenu avec jeton dans `proxy.ts`, vérifications automatiques GitHub, recherche de secrets à chaque commit, tableau ASVS, envoi réel des e-mails, tâches planifiées, test anti-robot, sonde.

## Dette connue

- Les pages du test d'avant le kit gardent 13 avertissements de lint (règles React récentes) : liste et raison dans `eslint.config.mjs`. Elles seront réécrites avec la charte commune.
- Émojis dans l'interface du test, contraires aux règles de rédaction : à retirer avec la charte.
- `npm audit` : 9 failles modérées, toutes dans les outils de développement (`minimatch`, via ESLint 10). Aucune dans le code livré.
- TypeScript reste en 5.8.3 : la version 7 n'a pas été essayée.

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
