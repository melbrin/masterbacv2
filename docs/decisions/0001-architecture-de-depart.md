# 0001. Architecture de départ

Date : 2026-11-13
État : proposée le 13 novembre 2026, à valider par Yane en phase 0

## La question

Sur quelle structure construire l'application complète, du compte de l'élève jusqu'à la correction sur photo, en restant sûr, testable et tenable par une seule personne aidée de Claude Code.

## Les options

Elles sont détaillées, avec ce qu'elles apportent et ce qu'elles coûtent, dans `docs/02-architecture.md`, section 2, et dans `docs/contexte/plan-d-implementation.md` pour les cinq choix du 12 novembre.

## Le choix

1. Un seul dépôt et une seule application Next.js, découpée en modules.
2. Next.js sur la dernière version corrigée de la branche 16, hébergé chez Vercel, fonctions à Paris.
3. Le navigateur ne parle jamais à la base. Tout passe par le serveur, et les règles d'accès de la base restent actives partout.
4. Comptes par adresse e-mail et code à usage unique, avec Supabase Auth.
5. Contenu importé en base depuis l'export des fiches, jamais embarqué dans l'application.
6. Moteur de préparation pur, sur le serveur, d'abord identique au prototype.
7. Paiement par la page hébergée de Stripe ; droits ouverts par message signé.
8. Limitation de débit, tâches planifiées, file d'attente et mesure d'usage sans service supplémentaire.
9. Application installable, avec un service worker minimal.

Les cinq ajustements du 13 novembre sont intégrés au cahier des charges.

## Ce que ça change

Tout le dépôt. Revenir sur le point 3 obligerait à réécrire les lectures et les règles d'accès ; les autres points se remplacent module par module.
