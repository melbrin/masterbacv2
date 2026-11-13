# Suivi du projet

Ce fichier est la mémoire du projet d'une session à l'autre. Il est chargé au début de chaque session. Tu le mets à jour à la fin de chaque session, et tu le gardes court : ce qui est fini depuis longtemps part dans `docs/journal/`.

## Où on en est

- **Phase en cours** : phase 0, mise en place (du 13 au 15 novembre 2026).
- **Lot en cours** : 0.1, installer le kit, lire la documentation, auditer l'existant, présenter le plan de la phase.
- **Prochaine échéance** : 7 décembre 2026, ouverture de la bêta fermée.
- **État de `main`** : le test gratuit en ligne, sans compte ni base (Next.js 15, un seul commit).

## Fait

- 13 novembre 2026 : kit de départ posé dans le dépôt (documentation, règles, prototype figé, cas de référence du moteur, sources et export des 14 fiches).

## En cours

- Rien encore.

## En attente de Yane

| Quoi | Pourquoi | Marche à suivre | Pour quand |
| --- | --- | --- | --- |
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

- 0001, architecture de départ : proposée, à valider.

## Points de vigilance

- Le dépôt ignorait tout le dossier `.claude/` : l'installation du kit a remplacé cette ligne de `.gitignore` pour que les règles soient partagées et que seuls les réglages personnels restent ignorés.
- La page « élite » est fermée par un code écrit en clair dans le programme envoyé au navigateur. Elle reste ainsi jusqu'au lot 1.7.
- Le compte à rebours du test vise encore juin 2026.
- Le dépôt fixe Next.js en 15.5.12, une version antérieure aux correctifs de sécurité du 25 août 2026 (15.5.24 et 16.3.3). La montée de version est le lot 0.3 ; elle passe avant tout le reste du code.
