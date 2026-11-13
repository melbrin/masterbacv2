---
paths:
  - "app/**/*.tsx"
  - "components/**"
  - "app/**/*.css"
---

# Interface

Référence : `docs/01-cahier-des-charges.md` (sections 3 et 5), `reference/prototype/` et `reference/captures/`.

- Le prototype fixe les écrans, les textes, la charte, le thème clair et le thème sombre. Reprends-les, puis applique le cahier des charges là où il s'en écarte.
- Téléphone d'abord : 390 points de large, pas de défilement horizontal, zones de toucher d'au moins 44 points. L'ordinateur vient ensuite.
- L'application tutoie l'élève. Les pages du parent le vouvoient. « cours », jamais « leçon ». Jamais « découvrez », « découvre » ni « prochainement ». Pas de tiret long, pas d'émoji.
- Nombres, durées et dates à la française, par les fonctions de `lib/commun/` : « 13,5 », « 1 h 30 », « jeudi 19 novembre ».
- Un composant `"use client"` n'importe ni `lib/serveur/` ni `lib/moteur/`, et ne reçoit que les données utiles à l'écran.
- `dangerouslySetInnerHTML` est interdit, sauf dans le composant unique qui affiche le contenu déjà nettoyé et rendu à l'import.
- Les formules arrivent déjà rendues. Pas de rendu KaTeX dans le navigateur pour le contenu des fiches.
- Aucune ressource chargée chez un tiers : polices, icônes et feuilles de style sont servies par l'application.
- Chaque écran a ses états : chargement, vide, erreur, hors ligne. Un message d'erreur dit ce qui s'est passé et quoi faire.
- Un formulaire se valide sur le serveur ; la validation dans le navigateur n'est qu'un confort.
- Accessibilité : titres dans l'ordre, libellé pour chaque champ, texte de remplacement pour chaque image, focus visible, navigation au clavier, contrastes suffisants, changements d'état annoncés, préférence « moins d'animations » respectée.
- Une fonction pas encore livrée ne s'affiche pas comme disponible. Une donnée simulée ne s'affiche pas comme réelle.
- Le chronomètre affiché dans le navigateur est un confort ; le temps qui compte est celui du serveur.
