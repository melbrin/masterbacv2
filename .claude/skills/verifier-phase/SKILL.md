---
name: verifier-phase
description: Vérifie qu'une phase du plan de livraison est réellement finie, tests, sécurité et conformité compris, puis prépare la recette de Yane. S'emploie avec le numéro de la phase.
disable-model-invocation: true
---

# Vérifier la phase $ARGUMENTS

Tu vérifies que la phase $ARGUMENTS de `docs/05-plan-de-livraison.md` est finie. Tu ne corriges rien pendant la vérification : tu établis l'état exact, puis tu proposes quoi faire.

## 1. Le périmètre

Relis dans `docs/05-plan-de-livraison.md` les lots de la phase et son critère « fini quand ». Relis dans `docs/01-cahier-des-charges.md` les sections des écrans livrés. Dresse la liste de ce qui devait être livré.

## 2. Les vérifications automatiques

Lance, dans cet ordre, et note le résultat exact de chacune :

1. `npm run tout`
2. `npm run test:mutation`
3. `npm run contenu:verifier`
4. La construction de l'application.

Relève la couverture par dossier et compare aux seuils de `docs/04-tests-et-qualite.md`.

## 3. Les relectures

Fais relire tout ce qui a changé depuis le début de la phase :

1. par l'agent `relecteur-securite` ;
2. par l'agent `relecteur-conformite` ;
3. puis lance `/security-review`.

## 4. Les contrôles propres au projet

- Chaque point d'entrée du registre a ses cas dans la matrice des accès.
- Chaque table a ses règles d'accès actives et son fichier pgTAP.
- Les cas d'abus de `docs/03-securite.md` qui concernent les fonctions livrées ont leur test, vert.
- Le tableau `docs/securite/asvs-niveau-2.md` est à jour.
- Aucun secret dans le dépôt ni dans le code compilé pour le navigateur.
- Aucun test désactivé, aucun seuil abaissé, aucune règle de lint coupée depuis le début de la phase. Cherche-les.
- `env.exemple` et `docs/06-comptes-et-secrets.md` listent toutes les variables utilisées.
- Les mots interdits et le tiret long sont absents de l'interface.

## 5. Le critère « fini quand »

Dis s'il est atteint dans la réalité, et sur quelle preuve. Un critère qui dépend d'élèves réels ou d'un achat réel ne se déclare pas atteint sur la foi des tests.

## 6. La recette

Écris `docs/recettes/phase-$ARGUMENTS.md` : ce que Yane essaie sur son téléphone, étape par étape, avec ce qu'il doit voir, en trente minutes au plus. Indique l'adresse de prévisualisation, les comptes d'essai, ce qui est simulé.

## 7. Le compte rendu

Rends à Yane, en français et sans jargon :

- un tableau : ce qui devait être livré, livré ou non, preuve ;
- ce qui reste à faire, par ordre d'importance, avec le temps estimé ;
- ce qui attend une action de sa part ;
- ta conclusion en une ligne : la phase est finie, ou elle ne l'est pas et pourquoi.

Mets à jour `docs/SUIVI.md`. Ne dis pas que la phase est finie s'il manque un seul point.
