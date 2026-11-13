// Le texte dit par la voix, scène par scène. L'ordre est celui du film.
// Les nombres sont écrits en lettres pour que la voix les prononce bien.

export const TEXTES = [
  { id: "01-accueil", texte: "Salut, c'est Yane. Je te présente MasterBac : l'application qui te prépare à chaque devoir de physique-chimie, puis au bac. Je te montre tout en moins de trois minutes." },
  { id: "02-connexion", texte: "Pour entrer, pas de mot de passe. Tu donnes ton adresse e-mail, tu reçois un code à six chiffres, et tu es connecté." },
  { id: "03-profil", texte: "Trois questions pour commencer : ton prénom, ta classe, et la note que tu vises. C'est tout. Pas de nom de famille, pas de date de naissance." },
  { id: "04-aujourdhui", texte: "Voici ton écran d'accueil. Chaque soir, l'application te propose une séance de vingt-cinq minutes : quelques questions à revoir, un exercice à rédiger sur papier, puis la correction." },
  { id: "05-cours", texte: "Dans les cours, tu retrouves les quatorze fiches de l'année : deux cent quatre-vingt-une questions de cours, et soixante-deux exercices corrigés." },
  { id: "06-fiche", texte: "Chaque fiche commence par l'essentiel à connaître par cœur, avec toutes les formules. Tu coches les chapitres vus en classe, et l'application suit la progression de ton professeur." },
  { id: "07-question", texte: "Les questions de cours sont classées par objectif : dix, quatorze, ou dix-huit. Tu réponds sur ta feuille. Si tu bloques, tu demandes un indice. Ensuite tu ouvres le corrigé, et tu te notes toi-même : réussi, en partie, ou raté." },
  { id: "08-carnet", texte: "Ce que tu rates part dans ton carnet d'erreurs, et revient deux jours plus tard, puis une semaine après, puis trois semaines après. Tu n'oublies plus rien." },
  { id: "09-quiz", texte: "Chaque chapitre a aussi son quiz, sans chronomètre. Tu réponds, et la correction arrive tout de suite." },
  { id: "10-ds", texte: "Et quand un devoir approche, tu donnes la date, la durée, la note visée et les chapitres. Ton plan de révision sort tout seul, jour par jour, jusqu'à la veille du devoir." },
  { id: "11-exercice", texte: "Les exercices de type bac se corrigent pas à pas, au barème. Pour chaque question, tu compares avec ta copie, et tu coches ce que tu as trouvé. À la fin, tu obtiens ta note, rédaction comprise, et tu vois exactement où tu as perdu des points." },
  { id: "12-progres", texte: "Dans tes progrès, tu suis ton niveau chapitre par chapitre, tes notes de devoir, et ta note estimée dès que tu as assez travaillé." },
  { id: "13-offres", texte: "L'offre gratuite te donne l'exercice du jour, le corrigé de la première question de chaque fiche, et une préparation de devoir complète. Le Pass ouvre tout le reste. Voilà MasterBac, dans sa version actuelle. À très vite." },
] as const;

export type IdScene = (typeof TEXTES)[number]["id"];
