# Suivi du projet

Ce fichier est la mémoire du projet d'une session à l'autre. Il est chargé au début de chaque session. Tu le mets à jour à la fin de chaque session, et tu le gardes court : ce qui est fini depuis longtemps part dans `docs/journal/`.

## Où on en est

- **Phase en cours** : phase 0, mise en place (du 13 au 15 novembre 2026).
- **Lot en cours** : 0.1, installer le kit, lire la documentation, auditer l'existant, présenter le plan de la phase.
- **Prochaine échéance** : 7 décembre 2026, ouverture de la bêta fermée.
- **État de `main`** : le test gratuit en ligne, sans compte ni base (Next.js 15.5.12, 9 commits).
- **Dossier de travail** : `Documents/App Masterbac/app-masterbac/`, copie neuve du dépôt GitHub faite le 13 novembre. L'ancien dossier `masterbac-simulator/` (travail non enregistré de juillet 2026) est resté intact à côté et n'est pas repris.

## Fait

- 13 novembre 2026 : kit de départ posé dans le dépôt (documentation, règles, prototype figé, cas de référence du moteur, sources et export des 14 fiches).

- 13 novembre 2026 : kit installé sur la branche `lot/0.1-installation-du-kit` (826 fichiers, aucun conflit). Documentation lue. Audit écrit dans `docs/audit-de-l-existant.md`. État de départ mesuré : la compilation et les types passent, il n'y a ni lint configuré ni test, `npm audit` signale 6 failles dont une critique sur Next.js.

## En cours

- Lot 0.1 : synthèse, questions et plan de la phase 0 présentés à Yane le 13 novembre. En attente de son accord pour dérouler les lots 0.2 à 0.5.

## En attente de Yane

| Quoi | Pourquoi | Marche à suivre | Pour quand |
| --- | --- | --- | --- |
| Installer Docker Desktop | sans lui, pas de base locale : le lot 0.4 et les tests de base sont bloqués | télécharger sur docker.com, installer, ouvrir l'application une fois | 14 novembre |
| Installer GitHub CLI (`gh`) et s'y connecter | pour que Claude Code prépare les demandes de fusion | marche à suivre donnée dans la conversation | 14 novembre |
| Valider l'architecture de départ | décision 0001 | lire `docs/02-architecture.md`, section 2, et répondre | 15 novembre |
| Confirmer ou retirer les cinq ajustements, et répondre aux points de la section 7 du cahier des charges | ils fixent le périmètre de la bêta | `docs/01-cahier-des-charges.md`, sections 4 et 7 | 15 novembre |
| Lancer la vérification du compte Stripe | elle prend plusieurs jours | `docs/06-comptes-et-secrets.md`, section 3.5 | tout de suite |
| Ouvrir Resend et ajouter les enregistrements du domaine d'envoi | les e-mails de connexion en dépendent | section 3.4 | tout de suite |
| Ouvrir le projet Supabase de recette | la base des essais | section 3.3 | 16 novembre |
| Vérifier la liste de protection de ses comptes | première menace pour le projet | section 1 | 16 novembre |
| Choisir les élèves de la bêta, avec la date et les chapitres de leur prochain DS | fixe l'ordre de préparation du contenu | une liste de prénoms et d'adresses gardée hors du dépôt ; ne donner à Claude Code que les chapitres et les dates | 22 novembre |

## Prochaines étapes

1. Lot 0.1 : audit de l'existant et plan de la phase 0.
2. Lots 0.2 à 0.5, dans l'ordre de `docs/05-plan-de-livraison.md`.
3. Recette de la phase 0, puis phase 1.

## Décisions récentes

- 0001, architecture de départ : validée par Yane le 13 novembre, sauf le point 7 (paiement), remplacé par la décision 0002.
- 0002, vente sur Shopify, accès ouverts dans l'administration : pas de Stripe dans l'application.
- 0003, version complète en local d'abord ; la mise en ligne et les comptes distants viennent ensuite. Y figure aussi le besoin de faire vivre le contenu (corriger, ajouter exercices et quiz) plus tard.

## Points de vigilance

- Le dépôt ignorait tout le dossier `.claude/` : l'installation du kit a remplacé cette ligne de `.gitignore` pour que les règles soient partagées et que seuls les réglages personnels restent ignorés.
- La page « élite » est fermée par un code écrit en clair dans le programme envoyé au navigateur. Elle reste ainsi jusqu'au lot 1.7.
- Le compte à rebours du test vise encore juin 2026.
- Le dépôt fixe Next.js en 15.5.12. Le minimum corrigé au 13 novembre 2026 est 15.5.29 ou 16.4.5 ; la dernière version est la 16.4.6. La montée de version est le lot 0.3 ; elle passe avant tout le reste du code.
- La politique de sécurité du contenu avec jeton impose le rendu à la demande de toutes les pages. Choix à confirmer par Yane avant le lot 0.3.
- Les écarts entre le kit et les sources officielles sont dans `docs/audit-de-l-existant.md`, section 7. Les relire avant d'installer un outil.
- L'ordinateur n'a ni Docker ni `gh`, et tourne sous Node 24.
