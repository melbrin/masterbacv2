# Recette : huitième version locale, « S'entraîner » et les TP où l'on manipule

Date : 14 novembre 2026, le soir. Durée : 45 minutes. Elle répond à tes remarques du 14 novembre : des TP où l'on manipule comme en vrai, une section qui ne s'appelle plus « Jeux », pas de mise en forme « typique des IA ». Tout tourne sur ton ordinateur, avec des données inventées.

## Avant de commencer

1. Ouvre Docker Desktop.
2. Dans le Terminal, place-toi dans `Documents/App Masterbac/app-masterbac`, puis lance `npm run db:demarrer`, `npm run db:migrer` (rien de nouveau dans la base), et `npm run dev -- --port 3457`.
3. Ouvre http://localhost:3457. La boîte des e-mails locaux est à http://127.0.0.1:54324.
4. Si l'application était déjà ouverte dans un onglet, recharge la page avant de commencer. Une page restée ouverte pendant que le programme change peut garder l'ancienne version en mémoire : c'est ce qui t'a montré l'ancienne paillasse à cases à cocher le 14 novembre.

Fais ces essais sur ton téléphone si tu peux : les paillasses sont faites pour le doigt.

## La section « S'entraîner »

| N° | Ce que tu fais | Ce que tu dois voir |
| --- | --- | --- |
| 1 | Touche « S'entraîner », en bas | quatre portes : Labo, TP, Mémoire, Jeux, chacune avec son dessin et ses chiffres |
| 2 | Entre dans « Labo », puis passe à « TP », « Mémoire », « Jeux » par le sous-menu du haut | chaque page a son contenu ; l'onglet « S'entraîner » reste allumé |
| 3 | Reviens à « Aujourd'hui » | un seul bloc « S'entraîner », avec ses quatre entrées |

## Un TP où tu manipules : le détartrant

| N° | Ce que tu fais | Ce que tu dois voir |
| --- | --- | --- |
| 4 | « S'entraîner », « TP » | le sommaire des TP, numérotés, par matière |
| 5 | « Un détartrant à contrôler », « Commencer le TP » | la situation ; ses documents en feuilles de sujet, numérotés |
| 6 | Réponds aux questions jusqu'à « À toi de manipuler », puis « Ouvrir la paillasse » | la paillasse prend tout l'écran : la burette, la loupe, les flacons, la verrerie |
| 7 | Glisse le bécher poubelle sous la burette | il se pose sur l'agitateur |
| 8 | Glisse le flacon de soude en haut de la burette, puis maintiens « Verser » une seconde | la burette se remplit ; la loupe montre le niveau |
| 9 | Pose le doigt sur le robinet et tourne-le vers le bas | goutte à goutte d'abord, puis au filet : la soude part dans le bécher poubelle. La burette est rincée |
| 10 | Referme le robinet. Remplis la burette un peu au-dessus du zéro, puis rouvre à peine le robinet | dans la loupe, le bas du ménisque descend vers le 0. Referme quand il y est |
| 11 | Repose le flacon et le bécher poubelle. Glisse la pipette dans le bécher de détartrant, maintiens « Aspirer » | la loupe passe sur la pipette : le liquide monte vers le trait de jauge |
| 12 | Avec de petits appuis sur « Vider », amène le bas du ménisque sur le trait | le niveau juste sur le trait cuivre |
| 13 | Glisse la pipette au-dessus de l'erlenmeyer, maintiens « Vider » | la prise d'essai est dans l'erlenmeyer |
| 14 | Glisse le flacon de BBT au-dessus de l'erlenmeyer, touche « Goutte » trois fois ; glisse le barreau aimanté | la solution devient jaune |
| 15 | Glisse l'erlenmeyer sous la burette, puis tourne la molette de l'agitateur | le barreau tourne |
| 16 | Ouvre le robinet : au filet d'abord, puis goutte à goutte | là où la goutte tombe, une tache bleue apparaît et s'efface, de plus en plus lentement ; puis tout devient bleu |
| 17 | Ferme le robinet, « Noter le volume » | le regard se rapproche de la loupe ; tu écris le volume que tu lis |
| 18 | « J'ai fini », puis « Oui, j'ai fini » | le professeur dit tes fautes, avec leurs chiffres, et la valeur attendue |
| 19 | Fais les calculs avec ton volume | les valeurs attendues partent de ta mesure ; à la fin, le bilan en A, B, C, D |
| 20 | Refais le TP en bâclant : sans rincer, sans régler le zéro, au filet jusqu'au bout, sans agitation | chaque faute est relevée, et ton volume en porte la trace |
| 21 | Refais encore le TP | la concentration à trouver n'est plus la même ; selon l'essai, l'étiquette est confirmée ou non |

## Le vinaigre, au pH-mètre

| N° | Ce que tu fais | Ce que tu dois voir |
| --- | --- | --- |
| 22 | « Le degré d'un vinaigre », jusqu'à la paillasse | un bécher à la place de l'erlenmeyer, une sonde, l'écran du pH-mètre |
| 23 | Après la prise d'essai : glisse la pissette au-dessus du bécher, maintiens « Eau » | le niveau monte ; il faut environ 40 mL pour que la sonde trempe |
| 24 | Glisse la pissette sur la sonde, puis la sonde dans le bécher | « Tu rinces la sonde », puis le pH s'affiche |
| 25 | Verse par ajouts, plus serrés quand le pH monte vite, jusqu'après le saut ; « Ouvrir la courbe » | la courbe de tes relevés ; un repère à glisser jusqu'au milieu du saut |
| 26 | « Noter ce volume », « J'ai fini » | avec des ajouts trop espacés, le professeur le dit |

## Le sérum physiologique, au conductimètre

| N° | Ce que tu fais | Ce que tu dois voir |
| --- | --- | --- |
| 27 | « Un sérum physiologique à contrôler », jusqu'à la paillasse | le flacon de nitrate d'argent, le conductimètre et sa sonde |
| 28 | Prépare tout comme pour le vinaigre (50 mL d'eau), puis verse par ajouts d'un millilitre jusqu'à 20 mL | la conductivité baisse doucement, puis remonte |
| 29 | « Ouvrir la courbe », glisse le repère sur la rupture de pente, « Noter ce volume » | une courbe en V ; avec trop peu de points d'un côté, le professeur le dit |

## Sur l'ordinateur

| N° | Ce que tu fais | Ce que tu dois voir |
| --- | --- | --- |
| 30 | Ouvre une paillasse sur un grand écran | la scène à gauche, le protocole toujours affiché à droite |
| 31 | Avec la touche Tab, va jusqu'au robinet ; flèches, puis « G » | les flèches ouvrent et ferment ; « G » fait tomber une goutte, « F » verse un millilitre |

## Ce que tu dois me dire

- Est-ce le niveau de manipulation que tu attendais ? Qu'est-ce qui manque encore pour que ce soit « comme en vrai » ?
- Les gestes sont-ils faciles au doigt sur ton téléphone : le robinet, la pipette, la lecture à la loupe ?
- Les petits sons des gestes : on les garde en marche par défaut ?
- Le nom « S'entraîner », la phrase « Calcule, manipule, retiens, joue. », les quatre portes.
- Le style des documents et du sommaire des TP : est-ce assez « maison » ?

## Ce qui n'est pas encore dans cette version

- Quinze autres TP sont en construction sur le même principe : dilution, dosage par étalonnage, cinétique, pile, électrolyse, synthèse, distance focale, lunette, diffraction, interférences, ultrasons, effet Doppler, chute filmée, poussée d'Archimède, calorimétrie. Ils n'apparaissent pas tant qu'ils ne sont pas prêts.
- Les deux TP de circuits (« Un condensateur sans étiquette », « Une jauge de niveau d'eau ») gardent leur ancienne paillasse à boutons en attendant la nouvelle.
- Les TP n'entrent pas encore dans le parcours ni dans les progrès.
