# Règles de sécurité propres à MasterBac

Ces règles complètent les contrôles généraux. Le détail est dans `docs/03-securite.md`.

## Ce qu'il faut signaler à coup sûr

- Un point d'entrée du serveur (action, route, lecture appelée par une page) qui n'est pas créé par `action`, `route` ou `requete`, ou qui ne déclare pas son accès.
- Une identité lue dans un paramètre, un champ de formulaire ou un cookie maison, au lieu de la session vérifiée.
- Un import de `lib/serveur/supabase/admin` hors de `lib/serveur/commandes`, `contenu`, `paiement`, `taches` et `admin`.
- Une clé Supabase, Stripe ou Resend dans une variable `NEXT_PUBLIC_`, dans un composant `"use client"`, dans un journal ou dans un message d'erreur.
- Un corrigé, un barème, un indice non débloqué, une figure de corrigé ou la clé d'un quiz envoyés au navigateur avant le contrôle du droit ou avant la réponse de l'élève.
- Un fichier de code qui importe depuis `contenu/`, `reference/` ou `docs/`, ou un contenu payant placé dans `public/`.
- Une table créée sans `enable row level security`, sans test pgTAP, ou une politique qui donne un droit d'écriture aux rôles `anon` ou `authenticated`.
- Une fonction `security definer` sans `set search_path = ''`, ou exécutable par un rôle du navigateur.
- `dangerouslySetInnerHTML` ailleurs que dans le composant unique qui affiche le contenu nettoyé à l'import.
- Un texte d'utilisateur inséré dans un filtre de requête écrit à la main, dans un en-tête d'e-mail, dans une adresse de redirection ou dans une commande.
- Un droit ouvert autrement que par un message Stripe dont la signature a été vérifiée sur le corps brut, ou un prix lu dans ce que le navigateur envoie.
- Un message Stripe traité sans contrôle d'unicité, ou un montant non comparé à l'achat préparé.
- Une route de tâche planifiée qui ne vérifie pas le secret, ou une tâche qui produit un effet double si on la relance.
- Une adresse e-mail, un code, un jeton ou le contenu d'un formulaire écrits dans un journal.
- Un jeton d'invitation, d'accord parental, de lien d'achat ou de désinscription gardé en clair, sans expiration, ou devinable.
- Un e-mail dont le texte contient une saisie libre d'utilisateur.
- Une réponse connectée sans `Cache-Control: private, no-store`, ou mise en cache par le service worker.
- Un assouplissement de la politique de sécurité du contenu, des en-têtes, d'une limite de débit ou d'une règle de lint de sécurité.
- Un test désactivé, un seuil de couverture abaissé, une vérification de signature contournée pour faire passer une suite.
- Une donnée réelle (adresse, prénom, copie d'élève) dans le dépôt, les tests ou les données d'essai.
- Une dépendance ajoutée sans version exacte ni justification, ou un script d'installation activé sans explication.
- Une modification de `.github/workflows/` qui élargit des permissions, lit un secret de production ou exécute du code venu de l'extérieur.

## Ce qui est normal ici

- La clé publiable de Supabase est utilisée sur le serveur, jamais dans le navigateur : c'est voulu.
- Les écritures passent par le client administrateur dans des commandes déclarées : c'est voulu, car le serveur calcule ce qu'il écrit. Vérifier que chaque commande filtre par la session.
- `style-src-attr 'unsafe-inline'` figure dans la politique de sécurité du contenu pour les formules rendues par KaTeX : c'est voulu.
- Le test gratuit sans compte embarque ses questions et leurs réponses dans le navigateur : ce contenu est gratuit.
