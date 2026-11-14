import "server-only";
import { nombre } from "@/lib/commun/format";
import type { ReglagesSpectro } from "@/lib/commun/tp/paillasses/spectro";
import { variante, type Mesures, type Tp } from "./types";

const mg = (x: number, d = 1) => `${nombre(x, d)} mg/L`;

// ---------- Un dosage par étalonnage ----------
const GAMME = [4, 8, 12, 16, 20]; // les concentrations des solutions étalons, en mg/L
const DILUTION = 2;
const TOLERANCE = 10; // l'écart accepté entre la teneur mesurée et la teneur annoncée, en pourcentage
const DJA = 7; // la dose journalière admissible du rouge allura, en mg par kilogramme et par jour
const MASSE = 50; // la masse de l'adolescent de l'énoncé, en kg
/**
 * Les boissons possibles : la teneur réelle en rouge allura et la teneur annoncée, en mg/L. La graine de l'essai en
 * choisit une. Deux tiennent dans la gamme, deux doivent être mesurées diluées ; dans chaque paire, une dément l'annonce.
 */
const BOISSONS = [
  { marque: "Fraise pétillante", Cx: 13.4, annonce: 14 },
  { marque: "Grenade intense", Cx: 27.2, annonce: 28 },
  { marque: "Fraise pétillante", Cx: 16.9, annonce: 14 },
  { marque: "Grenade intense", Cx: 23.1, annonce: 28 },
];
type Boisson = (typeof BOISSONS)[number];
const reglages = (b: Boisson): ReglagesSpectro => ({
  mode: "etalonnage", lambdaMax: 505, largeur: 45, k: 0.052, unite: "mg/L", decimales: 1, couleur: [232, 64, 74], espece: "le colorant",
  gamme: GAMME, Cx: b.Cx, dilution: DILUTION, nom: "la boisson", etiquette: "boisson", Cfin: 0, demi: 1, cadence: 1,
});

// ce que l'élève calcule avec la concentration qu'il a lue sur sa droite
const teneur = (m: Mesures) => m.F * m.C;
const volumeDja = (m: Mesures) => (DJA * MASSE) / teneur(m);
const ecart = (b: Boisson, m: Mesures) => (100 * Math.abs(teneur(m) - b.annonce)) / b.annonce;

const etalonnage: Tp = {
  id: "etalonnage", titre: "Doser un colorant par étalonnage", matiere: "chimie", famille: "Dosage par étalonnage", fiche: 10, minutes: 25, etat: "brouillon",
  accroche: "Une boisson rouge annonce sa teneur en colorant. Mesure une gamme au spectrophotomètre, trace la droite d'étalonnage, et vérifie.",
  etapes: (graine) => {
    const b = variante(graine, BOISSONS);
    return [
      {
        genre: "lecture", titre: "La situation",
        paragraphes: [
          "Le rouge allura, noté E129 sur les étiquettes, est un colorant de synthèse : il donne leur couleur à des sodas, des sirops et des bonbons.",
          `Pour sa boisson « ${b.marque} », un fabricant annonce ${nombre(b.annonce, 0)} mg de rouge allura par litre.`,
          "Tu dois vérifier cette teneur par un dosage par étalonnage, au spectrophotomètre.",
        ],
        documents: [
          {
            titre: "Le dosage par étalonnage", lignes: [
              "Une solution colorée absorbe une partie de la lumière qui la traverse. L'appareil mesure son absorbance A, une grandeur sans unité.",
              "Loi de Beer-Lambert : pour une solution peu concentrée, l'absorbance est proportionnelle à la concentration C du colorant. A = k × C.",
              "On mesure l'absorbance de solutions étalons, de concentrations connues. On trace la droite, puis on y lit la concentration de l'échantillon.",
              "La droite ne vaut que dans la gamme : un échantillon qui absorbe plus que la solution étalon la plus concentrée se mesure dilué.",
            ],
          },
          {
            titre: "Sur la paillasse", lignes: [
              `Une gamme de cinq solutions étalons de rouge allura, S1 à S5 : ${GAMME.join(", ").replace(/, (\d+)$/, " et $1")} mg/L`,
              `La boisson, et la même boisson diluée ${DILUTION} fois à la fiole jaugée`,
              "De l'eau distillée : c'est le solvant de toutes ces solutions",
              "Le rouge allura absorbe surtout le bleu-vert : son maximum d'absorption est entre 480 et 530 nm.",
            ],
          },
          { titre: "Le colorant et la santé", lignes: [`Dose journalière admissible du rouge allura : ${DJA} mg par kilogramme de masse corporelle et par jour`, "C'est la quantité qu'une personne peut absorber chaque jour, toute sa vie, sans risque connu."] },
        ],
      },
      {
        genre: "choix", competence: "APP", question: "Que mesure le spectrophotomètre ?",
        options: ["L'absorbance de la solution", "La concentration du colorant", "La masse de colorant dans la cuve", "La couleur de la solution"], bonne: 0,
        explication: "L'appareil affiche une absorbance. C'est la droite d'étalonnage qui permet de passer de l'absorbance à la concentration.",
      },
      {
        genre: "choix", competence: "ANA", question: "Sur quelle longueur d'onde règles-tu l'appareil ?",
        options: ["Celle du maximum d'absorption du colorant", "Une longueur d'onde du rouge, la couleur de la boisson", "N'importe laquelle : la droite s'adapte", "Celle où le colorant absorbe le moins"], bonne: 0,
        explication: "Au maximum d'absorption, l'absorbance est la plus grande pour une même concentration : la mesure est la plus sensible. Une solution rouge laisse passer le rouge : elle l'absorbe très peu.",
      },
      {
        genre: "materiel", competence: "ANA", consigne: "Choisis le matériel nécessaire pour ce dosage.",
        objets: [
          { id: "spectro", nom: "Spectrophotomètre", utile: true, pourquoi: "Il mesure l'absorbance de chaque solution." },
          { id: "burette", nom: "Burette graduée", utile: false, pourquoi: "Ce dosage n'est pas un titrage : on ne verse aucune solution titrante." },
          { id: "cuve", nom: "Cuve de spectrophotomètre", utile: true, pourquoi: "Elle contient la solution que le faisceau traverse." },
          { id: "gamme", nom: "Solutions étalons S1 à S5", utile: true, pourquoi: "Leurs concentrations sont connues : elles donnent la droite d'étalonnage." },
          { id: "phmetre", nom: "pH-mètre", utile: false, pourquoi: "Le pH ne dit rien de la concentration du colorant." },
          { id: "eau", nom: "Eau distillée", utile: true, pourquoi: "Elle sert à faire le blanc : c'est le solvant des solutions." },
          { id: "balance", nom: "Balance", utile: false, pourquoi: "Les solutions étalons sont déjà préparées : il n'y a rien à peser." },
          { id: "poubelle", nom: "Bécher poubelle", utile: true, pourquoi: "On y vide la cuve entre deux mesures." },
          { id: "conductimetre", nom: "Conductimètre", utile: false, pourquoi: "Il mesure une conductivité, pas une absorbance." },
        ],
      },
      {
        genre: "ordre", competence: "ANA", consigne: "Remets les étapes du protocole dans l'ordre.",
        etapes: [
          "Régler la longueur d'onde sur le maximum d'absorption du colorant.",
          "Faire le blanc avec une cuve d'eau distillée.",
          "Mesurer l'absorbance de chaque solution étalon, en rinçant la cuve avec la solution avant de la remplir.",
          "Tracer la droite d'étalonnage.",
          "Mesurer l'absorbance de la boisson.",
          "Lire la concentration de la boisson sur la droite.",
        ],
        // mesurer la boisson avant de tracer la droite convient aussi
        autres: [[0, 1, 2, 4, 3, 5]],
      },
      {
        genre: "paillasse", competence: "REA",
        consigne: "Fais le dosage sur la paillasse. Tout se fait à la main : tu tournes la molette, tu remplis la cuve, tu la glisses dans l'appareil, tu lis l'afficheur. Si la boisson absorbe plus que ta gamme, mesure la boisson diluée.",
        protocole: [
          "Remplir la cuve de solution S5. Ouvrir le capot, glisser la cuve dans le porte-cuve, ses faces lisses sur le trajet du faisceau, et refermer le capot.",
          "Tourner la molette de longueur d'onde jusqu'à la plus grande absorbance. Sortir la cuve et la vider dans le bécher poubelle.",
          "Rincer la cuve à l'eau distillée, puis la remplir d'eau distillée. La placer, fermer le capot et appuyer sur « Blanc ».",
          "Pour chaque solution étalon, de S1 à S5 : rincer la cuve avec la solution, la remplir, la placer, fermer le capot, lire l'absorbance et la noter.",
          `Mesurer la boisson de la même façon. Si son absorbance dépasse celle de S5, mesurer la boisson diluée ${DILUTION} fois.`,
          "Ouvrir le graphique. Poser la règle sur les points : elle part de l'origine et passe au plus près de tous.",
          "Placer le repère là où la droite coupe l'absorbance de la boisson, et noter la concentration.",
        ],
        paillasse: { genre: "spectro", reglages: reglages(b) },
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule la concentration en rouge allura de la boisson.", unite: "mg/L", decimales: 1, relatif: 0.02,
        aide: "La concentration lue sur la droite est celle de la solution mesurée. Si cette solution était diluée, multiplie par le facteur de dilution F.",
        attendu: teneur,
        detail: (m) => (m.F > 1 ? `C_b = F × C = ${nombre(m.F, 0)} × ${mg(m.C)} = ${mg(teneur(m))}.` : `Tu as mesuré la boisson sans la diluer : C_b = C = ${mg(teneur(m))}.`),
      },
      {
        genre: "valeur", competence: "VAL", question: `Calcule le volume de cette boisson qui apporte à un adolescent de ${MASSE} kg sa dose journalière admissible de rouge allura.`, unite: "L", decimales: 1, relatif: 0.03,
        aide: `La dose journalière de cet adolescent est de ${DJA} × ${MASSE} = ${DJA * MASSE} mg. Divise cette masse par la concentration de la boisson.`,
        attendu: volumeDja,
        detail: (m) => `V = ${DJA * MASSE} mg / ${mg(teneur(m))} = ${nombre(volumeDja(m), 1)} L. Personne ne boit autant en un jour : cette boisson reste très loin de la dose journalière admissible.`,
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule l'écart relatif entre ta concentration et la teneur annoncée, en pourcentage.", unite: "%", decimales: 1, absolu: 0.5,
        aide: "Écart relatif : la différence entre les deux valeurs, divisée par la teneur annoncée.",
        attendu: (m) => ecart(b, m),
        detail: (m) => `Écart = |${nombre(teneur(m), 1)} − ${nombre(b.annonce, 1)}| / ${nombre(b.annonce, 1)} = ${nombre(ecart(b, m), 1)} %.`,
      },
      {
        genre: "choix", competence: "VAL", question: `D'après ta mesure, la teneur annoncée est-elle respectée à ${TOLERANCE} % près ?`,
        options: ["Oui", "Non"], bonne: (m) => (ecart(b, m) <= TOLERANCE ? 0 : 1),
        explication: (m) => (ecart(b, m) <= TOLERANCE
          ? `Ton écart relatif, ${nombre(ecart(b, m), 1)} %, est inférieur à ${TOLERANCE} % : la teneur annoncée est respectée.`
          : `Ton écart relatif, ${nombre(ecart(b, m), 1)} %, dépasse ${TOLERANCE} % : avec ta mesure, la teneur annoncée n'est pas respectée. Une manipulation sans défaut donne ${nombre((100 * Math.abs(b.Cx - b.annonce)) / b.annonce, 1)} % : si ta manipulation a eu des fautes, refais le dosage avec plus de soin.`),
      },
    ];
  },
};

export default etalonnage;
