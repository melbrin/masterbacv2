import "server-only";
import { nombre } from "@/lib/commun/format";
import type { ReglagesSpectro } from "@/lib/commun/tp/paillasses/spectro";
import { variante, type Mesures, type Tp } from "./types";

// ---------- Un suivi cinétique ----------
const ATTENTE = 15; // la durée d'attente écrite sur la notice du kit, en minutes
const FOIS = 7; // au bout de sept temps de demi-réaction, la transformation est terminée à plus de 99 %
/**
 * Les jours possibles : la température de l'eau, le temps de demi-réaction à cette température (en secondes) et la
 * concentration finale en diiode (en mmol/L). La graine de l'essai en choisit un. Deux jours sur quatre, la notice suffit.
 */
const JOURS = [
  { eau: "d'une piscine", T: 20, demi: 160, Cfin: 0.9 },
  { eau: "d'une piscine chauffée", T: 28, demi: 100, Cfin: 0.84 },
  { eau: "d'une piscine, un matin frais,", T: 16, demi: 210, Cfin: 0.96 },
  { eau: "d'un spa", T: 34, demi: 75, Cfin: 0.88 },
];
type Jour = (typeof JOURS)[number];
const reglages = (j: Jour): ReglagesSpectro => ({
  mode: "cinetique", lambdaMax: 460, largeur: 50, k: 1, unite: "mmol/L", decimales: 2, couleur: [234, 158, 52], espece: "le diiode",
  gamme: [], Cx: 0, dilution: 1, nom: "le mélange", etiquette: "mélange", Cfin: j.Cfin, demi: j.demi,
  // le temps accéléré : une transformation lente s'accélère davantage, pour que le suivi dure à peu près une minute
  cadence: j.demi > 120 ? 20 : 10,
});

// ce que l'élève calcule avec le temps de demi-réaction qu'il a lu sur sa courbe
const fin = (m: Mesures) => (FOIS * m.tDemi) / 60;

const cinetique: Tp = {
  id: "cinetique", titre: "Suivre une transformation dans le temps", matiere: "chimie", famille: "Suivi cinétique", fiche: 11, minutes: 20, etat: "brouillon",
  accroche: "Un test pour l'eau des piscines demande d'attendre avant de lire sa couleur. Suis la transformation au spectrophotomètre, et dis si l'attente suffit.",
  etapes: (graine) => {
    const j = variante(graine, JOURS);
    return [
      {
        genre: "lecture", titre: "La situation",
        paragraphes: [
          "Certains traitements sans chlore pour piscines et spas libèrent dans l'eau des ions peroxodisulfate. Un kit permet de contrôler leur concentration : on ajoute à un échantillon d'eau un réactif qui contient des ions iodure, et le mélange jaunit peu à peu.",
          `Aujourd'hui, tu testes l'eau ${j.eau} à ${j.T} °C. La transformation est lente : tu dois savoir combien de temps attendre avant de lire la couleur.`,
          "Tu la suis au spectrophotomètre, puis tu lis son temps de demi-réaction sur la courbe.",
        ],
        documents: [
          {
            titre: "La transformation", lignes: [
              "Équation de la réaction : S₂O₈²⁻ + 2 I⁻ → 2 SO₄²⁻ + I₂",
              "Les ions iodure sont en large excès : la transformation s'arrête quand tous les ions peroxodisulfate ont réagi.",
              "Seul le diiode I₂ est coloré : l'absorbance du mélange est proportionnelle à sa concentration.",
              "Le diiode absorbe surtout le bleu : son maximum d'absorption est à 460 nm.",
            ],
          },
          {
            titre: "Le temps de demi-réaction", lignes: [
              "C'est la durée au bout de laquelle l'avancement atteint la moitié de sa valeur finale.",
              "Sur la courbe de l'absorbance au cours du temps, c'est la date où l'absorbance vaut la moitié de sa valeur finale.",
              `Au bout de ${FOIS} fois cette durée, la transformation est terminée à plus de 99 %.`,
            ],
          },
          { titre: "La notice du kit", lignes: [`« Ajouter le réactif à l'échantillon d'eau. Attendre ${ATTENTE} minutes, puis comparer la couleur à l'échelle de teintes. »`, "La notice ne dit rien de la température de l'eau."] },
        ],
      },
      {
        genre: "choix", competence: "APP", question: "Pourquoi peut-on suivre cette transformation au spectrophotomètre ?",
        options: ["Parce qu'une seule espèce du mélange est colorée : le diiode qui se forme", "Parce que les ions iodure absorbent la lumière", "Parce que la transformation est très rapide", "Parce que le mélange s'échauffe"], bonne: 0,
        explication: "Les réactifs sont incolores, le diiode est coloré : l'absorbance du mélange suit la concentration du diiode, donc l'avancement de la transformation.",
      },
      {
        genre: "choix", competence: "ANA", question: "Comment l'absorbance du mélange doit-elle évoluer au cours du temps ?",
        options: ["Elle augmente, de moins en moins vite, jusqu'à une valeur finale", "Elle diminue jusqu'à zéro", "Elle augmente à vitesse constante, sans s'arrêter", "Elle reste constante"], bonne: 0,
        explication: "Le diiode se forme : l'absorbance augmente. La vitesse diminue à mesure que les ions peroxodisulfate disparaissent, et l'absorbance se stabilise quand ils ont tous réagi.",
      },
      {
        genre: "materiel", competence: "ANA", consigne: "Choisis le matériel nécessaire pour ce suivi.",
        objets: [
          { id: "spectro", nom: "Spectrophotomètre", utile: true, pourquoi: "Il mesure l'absorbance du mélange à chaque relevé." },
          { id: "balance", nom: "Balance", utile: false, pourquoi: "Les deux solutions sont déjà préparées : il n'y a rien à peser." },
          { id: "chronometre", nom: "Chronomètre", utile: true, pourquoi: "Il donne la date de chaque relevé, à partir de l'instant du mélange." },
          { id: "cuve", nom: "Cuve de spectrophotomètre", utile: true, pourquoi: "Elle contient le mélange que le faisceau traverse." },
          { id: "plaque", nom: "Plaque chauffante", utile: false, pourquoi: "On ne chauffe pas : la température doit rester celle de l'eau testée." },
          { id: "eau", nom: "Eau distillée", utile: true, pourquoi: "Elle sert à faire le blanc avant le suivi." },
          { id: "burette", nom: "Burette graduée", utile: false, pourquoi: "On ne fait pas de titrage : les deux solutions se versent d'un coup." },
          { id: "becher", nom: "Bécher", utile: true, pourquoi: "On y mélange les deux solutions à l'instant zéro." },
        ],
      },
      {
        genre: "ordre", competence: "ANA", consigne: "Remets les étapes du protocole dans l'ordre.",
        etapes: [
          "Régler la longueur d'onde et faire le blanc avec une cuve d'eau distillée.",
          "Mélanger les deux solutions et lancer le chronomètre au même instant.",
          "Remplir la cuve avec le mélange, la placer dans l'appareil et fermer le capot.",
          "Relever l'absorbance à intervalles, jusqu'à ce qu'elle ne change plus.",
          "Lire le temps de demi-réaction sur la courbe.",
        ],
      },
      {
        genre: "paillasse", competence: "REA",
        consigne: "Fais le suivi sur la paillasse. Tout se fait à la main : tu règles l'appareil, tu mélanges, tu lances le chronomètre, tu relèves. Le temps de la paillasse peut s'accélérer : une touche est là pour ça.",
        protocole: [
          "Tourner la molette de longueur d'onde jusqu'à 460 nm, le maximum d'absorption du diiode.",
          "Rincer la cuve à l'eau distillée, puis la remplir d'eau distillée. Ouvrir le capot, glisser la cuve dans le porte-cuve, ses faces lisses sur le trajet du faisceau, refermer et appuyer sur « Blanc ». Sortir la cuve et la vider.",
          "Verser la solution de peroxodisulfate dans le bécher d'iodure de potassium, et lancer le chronomètre au même instant.",
          "Remplir aussitôt la cuve avec le mélange, la placer dans l'appareil et fermer le capot.",
          "Appuyer sur « Relever », puis accélérer le temps. Relever régulièrement tant que l'absorbance monte, puis de moins en moins souvent.",
          "Continuer jusqu'à ce que l'absorbance ne change plus.",
          "Ouvrir la courbe. Glisser le trait de la valeur finale sur le palier : le graphique trace la moitié de cette valeur. Placer le repère du temps là où elle coupe la courbe, et noter ce temps.",
        ],
        paillasse: { genre: "spectro", reglages: reglages(j) },
      },
      {
        genre: "valeur", competence: "VAL", question: "Au bout de quelle durée la transformation est-elle terminée à plus de 99 % ? Donne-la en minutes.", unite: "min", decimales: 1, relatif: 0.02,
        aide: `Il faut attendre ${FOIS} fois le temps de demi-réaction. Une minute dure 60 secondes.`,
        attendu: fin,
        detail: (m) => `Durée = ${FOIS} × ${nombre(m.tDemi, 0)} s = ${nombre(FOIS * m.tDemi, 0)} s, soit ${nombre(fin(m), 1)} min.`,
      },
      {
        genre: "choix", competence: "VAL", question: "L'eau d'un spa est plus chaude que celle d'une piscine. Que devient le temps de demi-réaction quand la température augmente ?",
        options: ["Il diminue", "Il augmente", "Il ne change pas"], bonne: 0,
        explication: "La température est un facteur cinétique : plus elle est élevée, plus la transformation est rapide, et plus le temps de demi-réaction est court.",
      },
      {
        genre: "choix", competence: "VAL", question: `La notice demande d'attendre ${ATTENTE} minutes. D'après ta mesure, est-ce suffisant aujourd'hui ?`,
        options: ["Oui", "Non"], bonne: (m) => (fin(m) <= ATTENTE ? 0 : 1),
        explication: (m) => (fin(m) <= ATTENTE
          ? `D'après ta mesure, la transformation est terminée au bout de ${nombre(fin(m), 1)} min : les ${ATTENTE} minutes de la notice suffisent à ${j.T} °C.`
          : `D'après ta mesure, il faut ${nombre(fin(m), 1)} min pour que la transformation soit terminée : à ${j.T} °C, les ${ATTENTE} minutes de la notice ne suffisent pas, et la couleur lue trop tôt sous-estime la concentration.`),
      },
    ];
  },
};

export default cinetique;
