---
paths:
  - "app/**/route.ts"
  - "app/**/actions.ts"
  - "app/**/page.tsx"
  - "lib/serveur/**"
  - "proxy.ts"
---

# Code du serveur

Référence : `docs/02-architecture.md` (sections 2.3, 4 et 5) et `docs/03-securite.md`.

- Tout fichier de `lib/serveur/` commence par `import "server-only"`.
- Un point d'entrée se crée par `action`, `route` ou `requete`, avec son accès déclaré. Un fichier `"use server"` n'exporte rien d'autre. Chaque point d'entrée a ses cas dans la matrice des accès.
- La session se vérifie dans la fonction qui lit ou écrit la donnée, jamais seulement dans le proxy ou dans une mise en page.
- L'identité vient de la session. Jamais d'un paramètre, d'un champ de formulaire ou d'un en-tête.
- Les lectures de données personnelles passent par `clientUtilisateur()`. Le client administrateur ne s'importe que depuis `commandes/`, `contenu/`, `paiement/`, `taches/` et `admin/`, et chaque usage filtre explicitement par la session.
- Les droits se calculent dans `lib/serveur/acces.ts`, nulle part ailleurs.
- Toute entrée passe par un schéma borné avant le moindre traitement.
- Un corrigé, un barème ou la clé d'un quiz ne figurent dans une réponse qu'après contrôle du droit, ou après la réponse de l'élève.
- Aucun texte d'utilisateur dans un filtre de requête écrit à la main, une redirection, un en-tête d'e-mail.
- Une commande renvoie un résultat typé. Vers le navigateur : un message en français et un numéro de suivi, jamais une trace ni une requête.
- Les journaux ne contiennent ni adresse e-mail, ni code, ni jeton, ni contenu de formulaire.
- Webhook Stripe : signature vérifiée sur le corps brut, message traité une seule fois, montant comparé à l'achat préparé, tout dans une transaction.
- Tâche planifiée : secret vérifié en temps constant, une exécution par période, relance sans effet double.
- Une action sensible ou coûteuse a sa limite de débit.
- Les réponses connectées portent `Cache-Control: private, no-store`.
- Les variables d'environnement se lisent dans `lib/serveur/env.ts`, nulle part ailleurs.
