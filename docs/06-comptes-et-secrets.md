# Comptes et secrets : ce que Yane ouvre, ce qu'il règle, où va chaque clé

Ce document est écrit pour Yane. Claude Code ne peut pas ouvrir de compte et ne doit jamais voir une clé. Il prépare tout le reste et te guide, étape par étape, au moment où tu en as besoin : demande-lui « guide-moi pour la section 3.3 », il te donnera le chemin exact dans l'écran du jour.

## 1. D'abord, protéger tes propres comptes

La plus grande menace pour l'application n'est pas une faille du code : c'est la prise d'un de tes comptes. Avant d'ouvrir quoi que ce soit, vérifie cette liste. Elle sera recontrôlée avant la bêta et avant l'ouverture.

| À faire | Fait |
| --- | --- |
| Un gestionnaire de mots de passe, avec un mot de passe unique par compte | |
| La double authentification activée sur : la messagerie qui reçoit les e-mails de ces comptes, GitHub, Vercel, Supabase, Stripe, Resend, Cloudflare, le bureau d'enregistrement du nom de domaine, Shopify | |
| Les codes de secours de chaque compte notés hors de l'ordinateur | |
| Aucun compte partagé ; aucun collaborateur inconnu sur GitHub, Vercel et Supabase | |
| Les comptes ouverts au nom de l'entreprise qui encaisse les ventes | |
| Une copie du dépôt gardée ailleurs que sur GitHub, refaite chaque mois : il contient tout le contenu des fiches | |

Trois règles, sans exception :

1. Tu ne colles jamais une clé dans une conversation, un e-mail ou un document. Une clé se copie de l'écran du service vers les réglages de Vercel, de GitHub, ou vers le fichier `.env.local` de ton ordinateur.
2. Si une clé a été vue ailleurs, même une seconde, tu la remplaces (section 6).
3. Pas de capture d'écran où une clé est visible.

## 2. Les comptes, dans l'ordre

| Quand | Compte | Pourquoi | Délai | Coût |
| --- | --- | --- | --- | --- |
| Tout de suite | Stripe | la vérification de l'entreprise prend plusieurs jours | jours | une part de chaque paiement |
| Tout de suite | Resend, et le domaine d'envoi | les e-mails de connexion ; les enregistrements DNS mettent jusqu'à deux jours à être reconnus | heures à 2 jours | gratuit jusqu'à 3 000 e-mails par mois et 100 par jour |
| Avant le 16 novembre | Supabase, projet de recette | la base des essais | minutes | gratuit |
| Avant le 4 décembre | Supabase, projet de production, région Paris | la base réelle | minutes | 25 $ par mois |
| Avant le 4 décembre | Vercel en offre Pro | l'offre gratuite est réservée aux projets non commerciaux | minutes | 20 $ par mois |
| Avant le 14 décembre | Cloudflare, pour le test anti-robot | protéger les inscriptions à l'ouverture publique | minutes | gratuit |
| En janvier | le fournisseur du modèle d'IA | la correction sur photo, en test | minutes | à l'usage, plafonné |

Les prix sont ceux du plan d'implémentation du 12 novembre. Vérifie-les sur la page de chaque service au moment de payer. La limite de 100 e-mails par jour de l'offre gratuite de Resend peut être atteinte un soir de direct : passe à l'offre payante la veille d'un direct annoncé.

## 3. Les réglages attendus, compte par compte

### 3.1 GitHub

- Le dépôt `app-masterbac` reste privé.
- La branche `main` est protégée : fusion par demande de fusion seulement, vérifications automatiques obligatoires, envoi forcé interdit. Selon ton offre GitHub, cette protection peut demander l'offre payante pour un dépôt privé. Sans elle, la règle tient par les permissions de Claude Code, qui lui interdisent d'envoyer sur `main`.
- Les alertes et les mises à jour de sécurité des dépendances sont activées.
- Dans les secrets de l'environnement `production` de GitHub Actions : l'adresse de connexion à la base de production, pour l'action « Migrer la production ». Rien d'autre.

### 3.2 Vercel

- Le projet actuel, relié au dépôt, en offre Pro avant la première vente.
- Les prévisualisations sont protégées : il faut être connecté à Vercel pour les ouvrir.
- Les variables de la section 4, séparées en trois environnements : Production, Preview, Development. Les valeurs de production ne vont que dans Production.
- `CRON_SECRET` : une longue valeur aléatoire, que Claude Code te dira comment générer.

### 3.3 Supabase

Deux projets : `masterbac-recette` et `masterbac-production`. Le second en région Paris, en offre Pro (sauvegarde quotidienne, pas de mise en pause). Un projet gratuit se met en pause après une semaine sans activité : la recette redémarre d'un clic.

Pour chaque projet, l'état attendu :

| Réglage | État attendu |
| --- | --- |
| Clés | les nouvelles clés, publiable et secrète. Les anciennes clés `anon` et `service_role` désactivées une fois l'application branchée sur les nouvelles |
| Connexion | par e-mail seulement ; aucun fournisseur tiers ; pas de connexion anonyme |
| Code de connexion | 6 chiffres, valable 10 minutes |
| Gabarit de l'e-mail | le code seul, sans lien cliquable ; texte fourni par Claude Code |
| Envoi des e-mails | par Resend (serveur SMTP `smtp.resend.com`, port 465, utilisateur `resend`, mot de passe : la clé Resend), depuis l'adresse d'envoi MasterBac |
| Limites d'envoi | relevées à la valeur que Claude Code t'indiquera, une fois Resend branché |
| Test anti-robot | activé à l'ouverture publique, avec la clé secrète de Cloudflare |
| Double authentification | par application d'authentification, activée (elle sert à ton accès administrateur) |
| Interface de données | le schéma `contenu` n'est pas exposé |
| Stockage | aucun compartiment public |
| Mot de passe de la base | dans ton gestionnaire de mots de passe |

Claude Code tient ces réglages par écrit dans `supabase/config.toml` pour la base locale, et la sonde vérifie de l'extérieur ce qui peut l'être. Les migrations de la recette et de la production ne partent qu'avec ton accord.

### 3.4 Resend

- Le domaine d'envoi est un sous-domaine réservé aux e-mails de l'application. Tu ajoutes chez ton gestionnaire de nom de domaine les enregistrements que Resend affiche (SPF, DKIM), plus un enregistrement DMARC que Claude Code te donnera.
- Une clé par environnement, limitée à l'envoi, pour ce seul domaine.
- Une adresse de réponse que tu lis.

### 3.5 Stripe

- Compte vérifié : identité, SIRET, compte bancaire.
- Les produits et tarifs : Pass Bac 2027 à 79 €, Pass au tarif clients actuels à 59 €, Mensuel à 9,99 € par mois, Stage à 29 €, Pack BAC à 149 € (désactivé jusqu'au printemps), et le bon de réduction de 29 € pour le Pass pris dans les 7 jours après un stage. En mode test, un script de Claude Code les crée. En mode réel, tu lances ce même script toi-même, ou tu les crées à la main d'après sa liste.
- Une clé restreinte pour l'application : elle ne peut que créer des pages de paiement et des sessions de portail, et lire ou modifier clients et abonnements. Claude Code te donne la liste exacte des permissions.
- Le point de réception des messages (`/api/stripe/webhook`), abonné aux événements : `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`. Son secret de signature va dans Vercel.
- Le portail client activé : mise à jour de la carte, factures, résiliation de l'abonnement.
- Les reçus envoyés par Stripe au payeur.
- À demander à ton comptable avant l'ouverture : le régime de TVA et les mentions à faire figurer sur les reçus.

### 3.6 Cloudflare (test anti-robot)

Un site déclaré pour app.masterbac.fr, en mode le moins intrusif. La clé du site va dans la variable publique, la clé secrète dans Vercel et dans Supabase.

### 3.7 Le nom de domaine

Les enregistrements du domaine d'envoi (section 3.4). Rien d'autre ne change : app.masterbac.fr pointe déjà vers Vercel.

## 4. Les variables d'environnement

Le fichier `env.exemple`, à la racine, en donne la liste à jour. Il ne contient que des noms.

| Variable | Rôle | D'où elle vient | Secret |
| --- | --- | --- | --- |
| `APP_ENV` | `local`, `recette` ou `production` ; protège contre une commande lancée au mauvais endroit | à écrire | non |
| `APP_URL` | l'adresse de l'application, pour les liens des e-mails | à écrire | non |
| `SUPABASE_URL` | l'adresse du projet | Supabase | non |
| `SUPABASE_PUBLISHABLE_KEY` | clé publiable, utilisée par le serveur au nom de la personne connectée | Supabase | non, mais elle n'est pas envoyée au navigateur |
| `SUPABASE_SECRET_KEY` | clé secrète : tous les droits sur la base | Supabase | oui, la plus sensible |
| `STRIPE_SECRET_KEY` | clé restreinte de l'application | Stripe | oui |
| `STRIPE_WEBHOOK_SECRET` | secret de signature des messages | Stripe | oui |
| `STRIPE_PRICE_PASS`, `STRIPE_PRICE_PASS_CLIENT`, `STRIPE_PRICE_MENSUEL`, `STRIPE_PRICE_STAGE`, `STRIPE_PRICE_PACK`, `STRIPE_COUPON_STAGE` | identifiants des tarifs et du bon de réduction | Stripe | non |
| `RESEND_API_KEY` | envoi des e-mails de l'application | Resend | oui |
| `EMAIL_FROM`, `EMAIL_REPLY_TO` | adresse d'envoi, adresse de réponse | à écrire | non |
| `CRON_SECRET` | protège les tâches planifiées | à générer | oui |
| `HASH_PEPPER` | secret qui sert à calculer les empreintes (adresses des clients actuels, adresses IP) ; le changer rend ces empreintes inutilisables | à générer | oui |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | clé du site pour le test anti-robot | Cloudflare | non |
| `TURNSTILE_SECRET_KEY` | clé secrète du test anti-robot | Cloudflare | oui |
| `AI_API_KEY`, `AI_BUDGET_MENSUEL_EUROS` | correction sur photo (phase 5) | fournisseur du modèle ; à écrire | oui ; non |

En local, `npm run env:local` prépare `.env.local` avec les valeurs de la base locale. Tu n'y ajoutes à la main que la clé Stripe de test. `npm run env:verifier` te dit ce qui manque, par son nom, sans rien afficher.

## 5. Où va chaque clé

| Clé | Vercel Production | Vercel Preview | `.env.local` | GitHub Actions |
| --- | --- | --- | --- | --- |
| Supabase production | oui | jamais | jamais | l'adresse de connexion, pour les migrations seulement |
| Supabase recette | non | oui | non | non |
| Supabase local | non | non | oui | générée à chaque exécution |
| Stripe réel | oui | jamais | jamais | non |
| Stripe test | non | oui | oui | non |
| Resend production | oui | non | non | non |
| Resend recette | non | oui | non | non |

Une prévisualisation ne reçoit jamais une clé de production. Ton ordinateur non plus.

## 6. Remplacer une clé

À faire dès qu'une clé a pu être vue, et une fois par an.

1. Crée la nouvelle clé dans le service.
2. Pose-la dans Vercel (et dans Supabase pour la clé de Resend ou du test anti-robot).
3. Redéploie, puis lance la sonde.
4. Supprime l'ancienne clé dans le service.
5. Note la date dans `docs/exploitation.md`, sans la clé.

Pour `HASH_PEPPER`, ne change rien sans en parler à Claude Code : les empreintes existantes devront être recalculées.

## 7. Ton accès administrateur

Ton compte devient administrateur par une commande SQL que tu lances toi-même dans l'éditeur SQL de Supabase. Claude Code te la donne. Aucune page de l'application ne permet de se donner ce rôle. À ta première connexion à l'administration, tu enregistres une application d'authentification : elle te sera demandée à chaque fois.

## 8. Importer les clients actuels

1. Dans Shopify, exporte les commandes des fiches au format CSV.
2. Dépose le fichier dans le dossier `secrets/import/` du dépôt, sur ton ordinateur. Ce dossier n'est jamais envoyé sur GitHub, et Claude Code n'a pas le droit de le lire.
3. Lance la commande d'import que Claude Code t'indique. Elle n'enregistre que l'empreinte de chaque adresse et les produits achetés, puis affiche un décompte, sans aucune adresse.
4. Supprime le fichier.

Pour écrire cette commande, Claude Code n'a besoin que de la ligne de titres du fichier, que tu peux lui recopier : elle ne contient aucune donnée de client.

## 9. Ce que tu signes

Chaque service qui traite des données de tes élèves est un sous-traitant au sens du RGPD : Supabase, Vercel, Stripe, Resend, Cloudflare. Chacun propose un accord de traitement des données à accepter dans son espace client. Garde-en une copie. Ton juriste te dira ce que la politique de confidentialité doit en dire.
