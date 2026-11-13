# 0003. Une version complète en local d'abord, la mise en ligne ensuite

Date : 2026-11-13
État : décidée par Yane le 13 novembre 2026

## La question

Dans quel ordre avancer : lot par lot avec une mise en ligne à chaque phase, ou une version complète sur l'ordinateur de Yane avant tout réglage en ligne ?

## Le choix

On construit d'abord une version complète en local : base locale (Supabase dans Docker), e-mails lus dans la boîte locale, données inventées. Yane l'essaie sur son ordinateur. Les comptes en ligne (Supabase, Resend, Vercel), la recette et la production viennent ensuite. La branche est poussée sur GitHub quand la version locale est finie.

## Ce que ça change

- L'ordre des lots suit ce qui se teste en local : outillage, montée de Next.js, moteur, base et import du contenu, comptes, administration des accès, lecture d'une fiche, quiz, carnet, mode DS, écran « Aujourd'hui », séance du jour, progrès, plan de l'année, parents.
- Restent pour la mise en ligne : envoi réel des e-mails, tâches planifiées, test anti-robot, en-têtes vérifiés par la sonde sur un environnement déployé, sauvegardes, textes légaux validés.
- Le niveau de test et de sécurité ne baisse pas : chaque lot garde ses tests et ses règles d'accès. Les relectures par les agents se font avant la première demande de fusion.
- Les dates du plan (`docs/05-plan-de-livraison.md`) sont à revoir avec Yane quand la version locale est finie.

## À ne pas oublier : faire vivre le contenu

Le contenu actuel des 14 fiches est validé et entre tel quel. Yane veut pouvoir, plus tard, corriger et ajouter des exercices, des questions de cours et des quiz. Le chemin prévu est celui de `docs/07-contenu.md` : la source reste `fiche.md` et les fichiers de contenu propres à l'application, puis export, vérification, import par version. À décider au moment voulu : si Yane édite ces fichiers avec l'aide de Claude Code, ou s'il lui faut un écran de saisie dans l'administration. Le schéma de la base (versions, états brouillon et validé, archives) doit le permettre dès le départ.
