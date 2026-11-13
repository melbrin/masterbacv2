# 0002. La vente reste sur Shopify, les accès s'ouvrent dans l'administration

Date : 2026-11-13
État : décidée par Yane le 13 novembre 2026

## La question

Comment un élève obtient-il un accès payant ? Le kit prévoyait le paiement dans l'application, par la page hébergée de Stripe, avec un droit ouvert par message signé.

## Les options

1. Paiement dans l'application par Stripe (décision 0001, point 7).
2. Achat sur la boutique Shopify, puis accès ouvert à la main dans l'administration de l'application.

## Le choix

L'option 2. Yane a un compte Stripe mais ne veut pas le relier à l'application. Les clients achètent sur Shopify ; Yane, ou une personne de confiance, leur ouvre ensuite l'accès depuis l'administration.

## Ce que ça change

- L'application n'encaisse rien et ne parle pas à Stripe. Pas de webhook, pas de clé Stripe, pas de variables `STRIPE_*`.
- La table `droits` reste la seule source des accès. Ses origines deviennent : `administration`, `import` (clients actuels), `beta`. L'origine `stripe` disparaît.
- L'administration reçoit un écran « Accès » : chercher un compte par adresse, ouvrir un droit (offre, date de fin, référence de commande Shopify, motif), le retirer, voir l'historique. Chaque action est journalisée.
- Un accès peut être préparé pour une adresse qui n'a pas encore de compte : il s'attache au compte à la première connexion avec cette adresse.
- L'écran des offres présente les offres et renvoie vers la boutique. Il n'a pas de bouton de paiement.
- Sortent du périmètre : la page de paiement, la case de renonciation au délai de rétractation dans l'application, le portail client, la résiliation en ligne, le rapprochement quotidien, le lien d'achat envoyé au parent. La rétractation et le remboursement se traitent sur Shopify ; Yane retire ensuite le droit dans l'administration.
- Les cas d'abus 7 et 9 de `docs/03-securite.md` changent de forme : un droit ne naît que d'une action d'administrateur journalisée, jamais d'une valeur envoyée par le navigateur. Le cas 8 (tarif clients actuels) disparaît de l'application.
- Le critère de fin de la phase 3 (« un parent achète le Pass depuis le lien envoyé par son enfant ») devient : « un client achète sur Shopify et son accès est ouvert dans l'administration en moins de deux minutes ».
- À prévoir plus tard, sur décision : une ouverture automatique de l'accès à partir des commandes Shopify (message signé de Shopify), pour ne plus le faire à la main.

Les documents `docs/01`, `02`, `03`, `05` et `06` décrivent encore Stripe. Cette décision l'emporte ; ils seront mis à jour au fil des lots concernés.
