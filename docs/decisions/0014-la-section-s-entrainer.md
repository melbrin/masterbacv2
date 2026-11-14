# 0014. La section « Jeux » devient « S'entraîner »

Date : 2026-11-14
État : demandée par Yane le 14 novembre ; le nom et le découpage sont mon choix, à confirmer

## La demande

« La section globale ne doit plus s'appeler "jeux", ce n'est pas cohérent avec tout le contenu. Réfléchis à la meilleure manière de refaire les sections. »

## Ce qui n'allait pas

L'onglet « Jeux » ouvrait une seule longue page qui mélangeait quatre choses : le labo (calculer, puis lancer une simulation), une porte vers les TP, une porte vers la mémoire, et les dix jeux de révision. Le mot « jeux » ne disait ni le labo ni les TP, et les TP et la mémoire étaient cachés derrière une porte en bas de page.

## Ce qui est fait

- **Un nom qui dit ce qu'on y fait : « S'entraîner ».** Tout ce que la section contient est de l'entraînement : au calcul, à la manipulation, à la mémoire, au cours. Les pages disaient déjà « Entraîne-toi aux ECE » et « Entraîne ta mémoire ».
- **Quatre sous-sections, chacune avec sa page et son adresse :**

| Sous-section | Ce que l'élève y fait | Adresse |
| --- | --- | --- |
| Labo | calcule, puis lance la simulation | `/app/labo` |
| TP | manipule comme à l'épreuve d'ECE | `/app/tp` |
| Mémoire | s'entraîne à retenir | `/app/memoire` |
| Jeux | revoit son cours en jouant | `/app/jeux` |

- **Une page d'accueil de la section**, `/app/entrainement` : quatre portes, chacune comme une affiche de nuit avec son dessin et ses chiffres (les étoiles du labo, les TP terminés, les jours de mémoire de la semaine, les parties de la semaine).
- **Un sous-menu** en haut des quatre pages pour passer de l'une à l'autre. Il ne s'affiche pas dans un défi, un TP ou un jeu en cours.
- **Le menu.** En bas du téléphone : Aujourd'hui, Cours, DS, S'entraîner, Progrès. Sur ordinateur : l'entrée « S'entraîner » et ses quatre sous-entrées. Une sous-section sans contenu ne se montre pas.
- **La page d'accueil « Aujourd'hui »** : un seul bloc « S'entraîner » avec ses quatre entrées, à la place des trois cartes.
- Le mot « jeux » ne reste que pour les vrais jeux : les dix jeux de révision et les jeux de mémoire.

## Ce que j'ai écarté

- **« Labo » pour toute la section** : court, et dans le ton d'une application de physique-chimie. Mais la mémoire et les jeux de révision n'ont rien d'un labo.
- **Deux onglets en bas, « Labo » et « Mémoire »** : il aurait fallu sortir « Progrès » ou « DS » de la barre du téléphone, qui n'a que cinq places.
- **« Entraînement »** : le même sens, mais trop long pour un onglet de téléphone.

## Mes choix, à confirmer par Yane

- Le nom « S'entraîner » et la phrase de la page : « Calcule, manipule, retiens, joue. »
- L'ordre des quatre sous-sections : Labo, TP, Mémoire, Jeux.
- Le labo garde son nom. Avec des TP où l'on manipule, « Labo » pourrait prêter à confusion : sa page porte donc le titre « Calcule, puis lance la simulation ».
- Le basketteur en mode libre est à `/app/labo/basket/libre`.
- Les anciennes adresses (`/app/jeux/labo/...`) ne répondent plus. Rien n'est en ligne : aucune redirection n'est posée.
- L'icône de la section : un haltère.

## Ce que ça change

`app/(appli)/app/entrainement/`, `app/(appli)/app/labo/` (déplacé depuis `app/(appli)/app/jeux/labo/`), `app/(appli)/app/jeux/page.tsx`, `app/(appli)/app/page.tsx`, `components/appli/Navigation.tsx`, `components/appli/SousMenu.tsx`, `components/entrainement/Illustrations.tsx`, `lib/commun/entrainement.ts`, `lib/serveur/entrainement.ts`, `app/(appli)/entrainement.css`, `scripts/essais/sections.mts`, `tests/unitaires/entrainement.test.ts`.

Les recettes 3 à 5 et les décisions 0010 et 0011 ont été écrites avant : là où elles disent « l'onglet Jeux » pour le labo, lire « S'entraîner, puis Labo ».
