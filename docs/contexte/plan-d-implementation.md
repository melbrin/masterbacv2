# Application MasterBac : plan d'implémentation

> Copie du plan d'implémentation du 12 novembre 2026, gardée comme contexte. Le prototype a été livré le 13 novembre et cinq ajustements en sont sortis. En cas d'écart, `docs/01-cahier-des-charges.md` et `docs/05-plan-de-livraison.md` font foi.

2026-11-12 · Yane

Nous faisons grandir le test en ligne qui existe déjà, sans repartir de zéro. Il reçoit les 14 fiches de physique-chimie, un compte élève et le mode DS avant les vacances de Noël, puis le plan de l'année et les niveaux en janvier.

## Ce que l'élève trouvera, et à quelle date

L'application reste celle de la stratégie : un coach qui dit à l'élève quoi travailler ce soir, le corrige et le tient jusqu'au bac. Nous la construisons en trois ouvertures. Chacune est utilisable et vendable seule, si bien qu'un retard sur la suivante ne bloque pas les ventes.

| Ouverture | Date visée | Ce que l'élève trouve | Ce que nous vendons |
| --- | --- | --- | --- |
| Bêta fermée | du 7 au 13 décembre | son compte, les 14 fiches de physique-chimie lisibles sur téléphone, le mode DS, les quiz par chapitre, le carnet d'erreurs | rien : une vingtaine de clients actuels l'essaient avant tout le monde |
| Ouverture | 19 décembre | la même chose, plus le paiement, la page parents et le stage de Noël | le Pass Bac 2027, le mensuel, le stage à l'unité, le tarif clients actuels |
| Coach complet | 15 janvier | la séance du jour, les niveaux 10, 14 et 18 avec leurs tests de passage, le plan de l'année, le premier bac blanc | les mêmes offres, qui s'enrichissent sans que le client rachète quoi que ce soit |

De février à avril arrivent les sujets 2025 et 2026 chronométrés, la correction sur photo en test, le rapport hebdomadaire aux parents, puis les maths dès que leurs fiches sont à jour. Le Pack BAC suit le cahier imprimé, au printemps.

Une règle ne change pas : le test gratuit reste sans compte jusqu'au résultat. Le compte est demandé au moment où l'élève veut garder son score, préparer un DS ou envoyer son bilan à ses parents. C'est là que nous obtenons son adresse, sans freiner l'entrée.

## Le point de départ : un test qui marche et 14 fiches prêtes à devenir des données

Deux actifs existent déjà. L'essentiel du travail consiste à les relier, pas à tout réécrire.

**Le test en ligne.** Son code (dépôt app-masterbac) a été lu pour ce plan, sans rien y modifier.

- Next.js 15, React 19, Tailwind et KaTeX pour les formules, environ 3 800 lignes. Il embarque la mesure d'audience de Vercel.
- 326 questions de quiz (165 en maths, 161 en physique-chimie), six types de questions (QCM, vrai ou faux, texte à trous, lecture graphique, mise en ordre, association), trois niveaux notés 1, 2 et 3 points, quatre modes (diagnostic de 40 questions en 30 minutes, chapitre, express, bac blanc).
- Ni compte, ni base de données, ni paiement : les réponses vivent dans l'onglet du navigateur et disparaissent à sa fermeture.
- La page « élite » est fermée par un code écrit en clair dans le programme envoyé au navigateur. N'importe qui peut le lire : ce n'est pas une protection, le compte la remplacera.
- Le compte à rebours affichait encore « J−13 avant le BAC » lors de la lecture du 11 novembre.
- Les 161 questions de physique-chimie suivent les six anciennes fiches : il faut les ranger dans les 14 nouvelles.

**Les 14 fiches de physique-chimie.** 281 questions de cours, 62 exercices, 188 figures, 536 pages, plus 207 pages de cahiers d'énoncés ; contrôle qualité terminé le 12 novembre 2026. Chaque question porte déjà ce que l'application doit savoir : niveau, type, notions, sessions où elle a été demandée, durée et points pour les exercices, corrigé détaillé avec ses encadrés Retenir, Piège, Méthode et Rédaction. La source de chaque fiche est un fichier texte structuré, d'où sortent aujourd'hui le Word et les PDF. La même source peut produire les données de l'application.

**Ce qui manque encore dans le contenu**, et que l'application exige :

- deux ou trois indices par question, puisque le tuteur donne un indice avant le corrigé ;
- un barème par question, étape par étape, pour que l'élève se corrige ;
- des questions de quiz rangées par notion : la stratégie en vise 40 par chapitre, nous en avons environ 11 par fiche ;
- une liste unique des notions du programme, commune aux 14 fiches, pour suivre l'élève notion par notion.

Ces quatre ajouts se préparent avec Claude et se relisent par toi, fiche par fiche, en commençant par les chapitres des prochains DS des élèves de la bêta.

## Cinq choix à faire avant d'écrire une ligne de code

Chaque choix engage plusieurs semaines de travail. Les voici avec leurs options, ce qu'elles apportent, ce qu'elles coûtent, et l'axe que nous retenons.

### 1. Le format : faire grandir le site actuel en application installable

| Option | Pour | Contre |
| --- | --- | --- |
| Application web installable sur l'écran d'accueil, à partir du code actuel | un seul code pour téléphone et ordinateur ; mises à jour immédiates ; aucune commission de magasin d'applications ; le test gratuit actuel sert d'entrée | pas de fiche dans l'App Store ni dans Google Play au lancement ; notifications plus limitées sur iPhone |
| Application native pour iPhone et Android | présence dans les magasins, notifications complètes | deux à trois mois de plus, validation par Apple et Google à chaque version, commission sur les abonnements vendus dans l'application |
| Plateforme de cours en ligne toute faite | en ligne en quelques jours, paiement inclus | ni mode DS, ni plan qui se recalcule, ni niveaux par notion : nous revendrions des pages, ce que la stratégie abandonne |

**Retenu : l'application web installable.** Une version native pourra suivre si les notifications deviennent décisives pour la rétention.

### 2. Le contenu : une seule source, exportée vers l'application

| Option | Pour | Contre |
| --- | --- | --- |
| Export automatique depuis les fichiers des fiches | une correction faite une fois arrive partout (Word, PDF, application) ; chaque formule est contrôlée à l'export ; aucun outil de plus | modifier le contenu passe par les fichiers sources, donc par Claude |
| Outil d'édition en ligne (CMS) | édition dans un navigateur, à plusieurs | deux sources à tenir à jour, ou une migration complète des fiches ; un abonnement de plus |
| Saisie directe dans la base | rapide pour une question isolée | aucune relecture d'ensemble, erreurs invisibles |

**Retenu : l'export.** Le contenu payant reste sur le serveur et n'est envoyé qu'à un compte qui y a droit : rien n'est téléchargeable d'un bloc, ce qui remplace le filigrane des PDF.

### 3. Les comptes : une adresse e-mail et un code, sans mot de passe

| Option | Pour | Contre |
| --- | --- | --- |
| E-mail et code à usage unique | rien à retenir pour l'élève ; nous obtenons son adresse ; marche sur tous les appareils | un e-mail à chaque connexion sur un nouvel appareil |
| Connexion par Google ou Apple | un clic | adresse parfois masquée, dépendance à deux sociétés, élèves sans compte personnel |
| E-mail et mot de passe | habituel | oublis et réinitialisations, sécurité des mots de passe à notre charge |

**Retenu : l'e-mail et un code, avec un lien parent.** Le parent reçoit son propre accès à la page de suivi, et c'est lui qui paie. Avant 15 ans, l'accord d'un parent est demandé à l'inscription (voir les risques).

### 4. La caisse : Stripe dans l'application, Shopify garde la boutique

| Option | Pour | Contre |
| --- | --- | --- |
| Stripe dans l'application, pour toutes les offres qui ouvrent un accès | une seule source de vérité pour les droits ; mensuel, résiliation et remboursements gérés par Stripe ; pas d'abonnement fixe | un compte de plus à ouvrir ; les clients paient ailleurs que dans la boutique actuelle |
| Shopify pour tout, avec un message envoyé à l'application à chaque commande payée | la boutique et ses clients restent au même endroit | le mensuel demande une application d'abonnement de plus ; chaque droit d'accès doit être recopié d'un système à l'autre |
| Les deux : Shopify pour le Pass, Stripe pour le mensuel | chacun fait ce qu'il fait le mieux | deux intégrations à maintenir, deux endroits où chercher un paiement |

**Retenu : Stripe pour tout ce qui ouvre l'application.** Shopify reste la vitrine et la caisse des produits physiques, d'abord le cahier imprimé du printemps. Les clients actuels sont reconnus à leur adresse e-mail : leurs achats Shopify sont importés une fois, et ils retrouvent leurs fiches en se connectant avec la même adresse.

### 5. La correction : d'abord le barème, puis la photo, puis le professeur

| Option | Pour | Contre |
| --- | --- | --- |
| L'élève se corrige au barème | disponible tout de suite ; apprend à lire un barème ; aucun coût | l'élève peut se surnoter |
| Correction de la copie photographiée, par l'IA, sur nos corrigés | le retour que l'élève attend d'un professeur | un coût par copie, des erreurs possibles, des copies d'élèves mineurs à protéger |
| Correction par un professeur | la plus fiable, l'argument qui rassure les parents | du temps : réservée au Pack et plafonnée |

**Retenu : les trois, dans cet ordre**, comme le prévoit la stratégie. Au lancement, le corrigé se déroule étape par étape et l'élève coche les points obtenus. La photo arrive en test en février, pour les élèves de la bêta d'abord. Le professeur corrige les deux bacs blancs du Pack.

## Comment une fiche devient une séance

La fiche reste la seule source : une correction faite une fois se retrouve dans le Word, le PDF et l'application. Ce que l'élève fait revient au moteur, qui ajuste la séance suivante et nourrit le bilan envoyé aux parents.

| Pièce | Rôle | Outil |
| --- | --- | --- |
| Export | transforme chaque fiche en données, contrôle les formules et les renvois | un script dans le dossier des fiches, lancé après chaque correction |
| Base de contenu et comptes | garde le contenu, les comptes, les résultats et les droits d'accès | Supabase, hébergé à Paris |
| Moteur de préparation | choisit les questions du jour, construit le plan d'un DS, calcule les niveaux | des règles écrites dans l'application, sans IA au lancement : prévisibles, gratuites et testables |
| Application | ce que voient l'élève et le parent, sur téléphone et sur ordinateur | le site Next.js actuel, hébergé chez Vercel |
| E-mails | codes de connexion, bilan des parents | Resend, depuis une adresse MasterBac |
| Paiement | Pass, mensuel, stages, remboursements | Stripe |

## Six étapes jusqu'au bac, chacune avec son critère de fin

Une étape n'est finie que lorsque son critère est atteint, pas lorsque le code est écrit. La date du 19 décembre est fixe, parce que les vacances de Noël sont un moment de vente : si le temps manque, c'est le contenu de l'ouverture qui rétrécit, selon l'ordre de coupe des risques.

| Étape | Dates | Ce qui est livré | Fini quand |
| --- | --- | --- | --- |
| 0. Cadrage | 13 au 15 novembre | les cinq choix tranchés ; les comptes Supabase, Stripe et Resend ouverts ; la liste des notions du programme | tu as répondu aux décisions de la dernière section |
| 1. Socle | 16 au 29 novembre | l'export des 14 fiches ; le compte par e-mail ; la lecture d'une fiche sur téléphone ; les 161 quiz rangés dans les 14 fiches | un élève test se connecte et lit une fiche entière sur son téléphone, formules et figures comprises |
| 2. Mode DS et bêta | 30 novembre au 13 décembre | le mode DS en trois formats ; les quiz par chapitre ; le carnet d'erreurs ; le bouton « signaler une erreur » ; la bêta avec une vingtaine de clients actuels à partir du 7 décembre | dix élèves ont préparé un vrai DS avec l'application |
| 3. Caisse et ouverture | 14 au 19 décembre | le paiement Stripe ; l'accès des clients actuels ; la page parents ; les conditions de vente ; le stage de Noël | un parent achète le Pass depuis le lien envoyé par son enfant |
| 4. Coach complet | 5 au 15 janvier | la séance du jour ; les niveaux 10, 14 et 18 avec leurs tests de passage ; le plan de l'année ; le bac blanc | un élève inscrit le 15 janvier reçoit sa séance du lendemain sans que personne n'intervienne |
| 5. Sujets et correction | février à avril | les sujets 2025 et 2026 chronométrés ; la correction sur photo en test ; le rapport hebdomadaire aux parents ; les maths | sur 30 copies de la bêta, l'écart entre la correction sur photo et celle d'un professeur est mesuré et jugé acceptable |

Pendant les vacances de Noël, du 19 décembre au 4 janvier, aucune nouvelle fonction : le stage en direct, le suivi des premiers clients et la correction de ce que la bêta a remonté. Le sprint de mai et juin ne demande pas de développement nouveau ; il repose sur ce qui existe.

**Hypothèse de rythme** : une douzaine d'heures par semaine de ton côté, le code écrit par Claude Code, le contenu préparé par Claude et relu par toi. Si le rythme réel est plus faible, l'ordre de coupe s'applique et l'ouverture du 19 décembre ne bouge pas.

## Ce que tu fais, dans l'ordre

Un projet de cette taille se pilote avec trois outils simples : une liste de tâches, un rendez-vous fixe chaque semaine, et le critère « fini quand » de chaque étape.

**Cette semaine (étape 0)**

1. Réponds aux décisions de la dernière section. Une réponse courte suffit pour chacune.
2. Ouvre trois comptes au nom de l'entreprise qui encaisse aujourd'hui les ventes Shopify : Supabase (choisis la région Paris), Stripe (pièce d'identité, SIRET et compte bancaire ; la vérification prend quelques jours, d'où l'urgence) et Resend (il enverra les codes de connexion depuis une adresse MasterBac).
3. Passe le projet Vercel à l'offre Pro avant la première vente : l'offre gratuite est réservée aux projets non commerciaux.
4. Donne à Claude Code l'accès au dépôt app-masterbac. Claude prépare le fichier CLAUDE.md à poser à sa racine : règles du projet, commandes, ce qui est interdit.
5. Choisis une vingtaine de clients actuels pour la bêta, si possible dans des classes différentes. Claude rédige le message d'invitation.

**Chaque dimanche, trente minutes**

- Ouvre la liste des tâches de l'annexe : coche ce qui est fini, choisis trois tâches pour la semaine, pas plus.
- Relis le critère « fini quand » de l'étape en cours. S'il ne sera pas atteint à temps, applique l'ordre de coupe plutôt que de décaler l'ouverture.
- Note en une ligne ce qui a bloqué : c'est ce qui permet de recaler la semaine suivante.

**Qui fait quoi pendant chaque étape**

| Qui | Fait quoi |
| --- | --- |
| Toi | les choix, les comptes et les paiements, la relecture du contenu, les essais sur ton téléphone, les messages aux clients |
| Claude Code | le code de l'application, dans le dépôt, une fonction à la fois, avec ses tests |
| Claude | l'export des fiches, les indices, les barèmes et les quiz à relire, la page de vente et les conditions de vente à faire valider |

**Travailler avec Claude Code sans te perdre**

1. Une demande, une fonction, décrite par ce que l'élève doit pouvoir faire : « un élève saisit son e-mail, reçoit un code, arrive sur ses fiches ».
2. Claude Code travaille sur une branche et propose une demande de fusion. Tu l'essaies sur l'adresse de prévisualisation que Vercel crée pour chaque branche, puis tu fusionnes.
3. Rien ne part en ligne sans que tu l'aies essayé sur ton téléphone.
4. Les clés secrètes (Stripe, Supabase, Resend) ne s'écrivent jamais dans le code ni dans une conversation : elles se saisissent dans les réglages de Vercel.
5. Les mises en ligne se font en semaine et en journée, jamais un soir de veille de DS.

## Ce que l'application coûtera chaque mois

Au lancement, environ 45 $ par mois de frais fixes, plus une petite part de chaque paiement. Un Pass vendu par mois couvre l'hébergement.

| Poste | Offre | Prix | Pourquoi cette offre |
| --- | --- | --- | --- |
| Hébergement de l'application | [Vercel Pro](https://vercel.com/pricing) | 20 $ par mois | l'offre gratuite est réservée aux projets personnels non commerciaux |
| Base de données et comptes | [Supabase Pro](https://supabase.com/pricing) | 25 $ par mois | l'offre gratuite met le projet en pause après une semaine d'inactivité et n'a pas de sauvegarde quotidienne |
| E-mails de connexion | [Resend](https://resend.com/pricing) | gratuit jusqu'à 3 000 e-mails par mois et 100 par jour, puis 20 $ par mois pour 50 000 | l'envoi intégré à Supabase est limité à quelques e-mails par heure et réservé aux essais |
| Paiement | [Stripe](https://stripe.com/fr/pricing) | 1,5 % + 0,25 € par carte européenne standard | soit 0,40 € sur un mois à 9,99 €, 0,69 € sur un stage à 29 €, 1,44 € sur un Pass à 79 € |
| Correction sur photo, à partir de février | un modèle d'IA appelé par l'application | coût par copie à mesurer pendant le test | le tarif décide si elle reste dans le Pass ou rejoint le Pack |

Un point de vigilance : la limite de 100 e-mails par jour de l'offre gratuite de Resend peut être atteinte un soir de direct TikTok. Il faut passer à l'offre payante la veille d'un direct annoncé.

## Ce qui peut dérailler, et ce que nous coupons en premier

| Risque | Parade |
| --- | --- |
| Le temps : une seule personne pour le code, le contenu et les ventes | Claude Code écrit le code, Claude prépare le contenu, tu tranches et tu essaies ; l'ordre de coupe ci-dessous est écrit dès maintenant |
| Une erreur dans un corrigé, un quiz ou un barème | les 14 fiches passent le contrôle qualité avant l'export ; un bouton « signaler une erreur » sur chaque question ; la correction se fait dans la source, puis un nouvel export |
| Des élèves mineurs | données hébergées à Paris ; le minimum demandé (e-mail, prénom, classe) ; ni publicité ni revente. En France, un mineur consent seul au traitement de ses données pour un service en ligne à partir de 15 ans ; en dessous, l'accord d'un parent est requis ([CNIL](https://www.cnil.fr/fr/droits-numeriques-des-mineurs-la-cnil-publie-les-resultats-du-sondage-et-de-la-consultation-publique)) |
| Les règles de la vente en ligne | avant le paiement, une case par laquelle le client demande l'accès immédiat et renonce au délai de rétractation de 14 jours, possible pour un contenu numérique ([article L221-28](https://www.legalplace.fr/guides/droit-retractation-internet/)[ du Code de la consommation](https://www.legalplace.fr/guides/droit-retractation-internet/)) ; la fonction de rétractation en ligne exigée depuis le 19 juin 2026 ([Que Choisir](https://www.quechoisir.org/actualite-achats-en-ligne-les-sites-doivent-desormais-proposer-un-bouton-de-retractation-n177246/)) ; la résiliation du mensuel en ligne, en quelques clics ([décret du 31 mai 2023](https://blog.avocats.deloitte.fr/la-resiliation-en-3-clics-nouvel-outil-au-service-des-consommateurs/)). Les conditions de vente sont à faire relire par un juriste |
| Le partage de compte | un compte par élève, une connexion par code envoyé à son adresse, un nombre d'appareils actifs limité |
| La dépendance à TikTok | l'adresse demandée pour garder son score, l'adresse du parent, le fichier des clients actuels |
| Une panne un soir de DS | sauvegarde quotidienne de la base (offre Pro), page de maintenance prête, mises en ligne en journée seulement |

**L'ordre de coupe**, si le temps manque, à appliquer dans cet ordre :

1. Le plan de l'année devient un plan fixe par objectif (10, 14 ou 18), sans recalcul.
2. Les tests de passage de niveau attendent février : le niveau se calcule sur les quiz seuls.
3. Le rapport hebdomadaire aux parents devient un e-mail envoyé à la main le dimanche.
4. Le format « Une semaine » du mode DS attend ; « Express » et « Trois jours » restent.
5. La correction sur photo glisse après le bac blanc d'avril.

Ce qui ne se coupe jamais : le compte, le mode DS, le paiement et le bouton « signaler une erreur ».

## Six décisions à prendre cette semaine

Chacune débloque une étape. Une réponse courte suffit : oui, non, ou la variante que tu préfères.

| Décision | Recommandation | Ce qu'elle débloque |
| --- | --- | --- |
| Format : une application web installable, construite à partir du test actuel | oui | tout le reste |
| Caisse : Stripe pour tout ce qui ouvre l'application, Shopify pour les produits physiques | oui | l'ouverture du compte Stripe, à lancer cette semaine à cause des délais de vérification |
| Ouverture du 19 décembre : physique-chimie seule (14 fiches, mode DS, quiz), Pass et mensuel en vente dès ce jour, maths quand leurs fiches seront à jour | oui | le périmètre des étapes 1 à 3 |
| Comptes : e-mail et code, lien parent, accord parental demandé avant 15 ans | oui | l'étape 1 |
| Bêta : une vingtaine de clients actuels du 7 au 13 décembre, accès offert jusqu'au 19 décembre, puis le tarif clients actuels | oui | le message d'invitation, à envoyer fin novembre |
| Contenu à produire avant le 13 décembre : indices, barèmes et quiz des 14 fiches, préparés par Claude et relus par toi | oui, en commençant par les chapitres des prochains DS des élèves de la bêta | le mode DS et l'autocorrection |

## Sources

- Stratégie « MasterBac 2027 : des fiches de l'élite au coach de l'année » (11 novembre 2026) et lecture du code du test en ligne, dépôt app-masterbac (12 novembre 2026).
- Hébergement : [tarifs Vercel](https://vercel.com/platforms/pricing), offre gratuite réservée à un usage personnel et non commercial.
- Base de données : [tarifs Supabase](https://supabase.com/pricing), [régions disponibles](https://supabase.com/docs/guides/platform/regions), [envoi des e-mails par un service externe](https://supabase.com/docs/guides/auth/auth-smtp).
- E-mails : [tarifs Resend](https://resend.com/pricing).
- Paiement : [Stripe, tarifs en France](https://stripe.com/fr/lp/payments/payments-platform).
- Shopify, pour l'option non retenue : [liens de panier avec attributs](https://shopify.dev/docs/apps/build/checkout/create-cart-permalinks).
- Mineurs : [CNIL, droits numériques des mineurs](https://www.cnil.fr/fr/droits-numeriques-des-mineurs-la-cnil-publie-les-resultats-du-sondage-et-de-la-consultation-publique), [CNIL, recommandation sur la capacité d'agir des mineurs en ligne](https://www.cnil.fr/fr/recommandation-1-encadrer-la-capacite-dagir-des-mineurs-en-ligne).
- Vente en ligne : [droit de rétractation et contenus numériques](https://www.legalplace.fr/guides/droit-retractation-internet/), [bouton de rétractation depuis le 19 juin 2026](https://www.quechoisir.org/actualite-achats-en-ligne-les-sites-doivent-desormais-proposer-un-bouton-de-retractation-n177246/), [résiliation en ligne des contrats](https://blog.avocats.deloitte.fr/la-resiliation-en-3-clics-nouvel-outil-au-service-des-consommateurs/).
