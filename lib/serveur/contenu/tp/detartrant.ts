import "server-only";
import { nombre } from "@/lib/commun/format";
import type { ReglagesTitrage } from "@/lib/commun/tp/paillasses/titrage";
import { variante, type Mesures, type Tp } from "./types";

const ml = (x: number) => `${nombre(x, 2)} mL`;
const mol = (x: number, d = 4) => `${nombre(x, d)} mol/L`;

// ---------- Un titrage colorimétrique ----------
const ETIQUETTE = 2.5; // la concentration annoncée sur le flacon, en mol/L
const DILUTION = 25;
/** Les concentrations possibles de la solution diluée : la graine de l'essai en choisit une. L'une d'elles dément l'étiquette. */
const CONCENTRATIONS = [0.0976, 0.1012, 0.0936, 0.1036];
const concentrationDiluee = (m: Mesures) => (0.1 * m.VE) / 10;
const concentrationFlacon = (m: Mesures) => DILUTION * concentrationDiluee(m);
const ecartEtiquette = (m: Mesures) => (100 * Math.abs(concentrationFlacon(m) - ETIQUETTE)) / ETIQUETTE;
const reglages = (graine: number): ReglagesTitrage => ({
  Ca: variante(graine, CONCENTRATIONS), pKa: null, Va: 10, Cb: 0.1, suivi: "indicateur", indicateur: "bbt", eau: 0,
  noms: { titrante: "Soude", titree: "Détartrant dilué" },
});

const detartrant: Tp = {
  id: "detartrant", titre: "Un détartrant à contrôler", matiere: "chimie", famille: "Titrage colorimétrique", fiche: 10, minutes: 20, etat: "brouillon",
  accroche: "L'étiquette d'un détartrant annonce sa concentration en acide. Vérifie-la par un titrage, à la goutte près.",
  etapes: (graine) => [
    {
      genre: "lecture", titre: "La situation",
      paragraphes: [
        "Un détartrant pour sanitaires contient de l'acide chlorhydrique. Son étiquette annonce une concentration de 2,5 mol/L.",
        "Tu dois vérifier cette indication par un titrage, avec de la soude de concentration connue.",
        "Le détartrant est trop concentré pour être titré tel quel. Il a déjà été dilué 25 fois : c'est cette solution diluée que tu titres.",
      ],
      documents: [
        { titre: "Le titrage", lignes: ["Équation de la réaction : H₃O⁺ + HO⁻ → 2 H₂O", "Solution titrante : soude de concentration 0,100 mol/L", "Prise d'essai : 10,0 mL de détartrant dilué", "À l'équivalence de ce titrage, le pH vaut 7,0."] },
        { titre: "Trois indicateurs colorés", lignes: ["Hélianthine : rouge, puis jaune. Zone de virage : pH 3,1 à 4,4.", "Bleu de bromothymol : jaune, puis bleu. Zone de virage : pH 6,0 à 7,6.", "Phénolphtaléine : incolore, puis rose. Zone de virage : pH 8,2 à 10."] },
      ],
    },
    {
      genre: "choix", competence: "APP", question: "Que cherche-t-on à déterminer avec ce titrage ?",
      options: ["La concentration en acide chlorhydrique du détartrant", "La concentration de la soude", "Le pH du détartrant", "Le volume du flacon"], bonne: 0,
      explication: "La soude est la solution de concentration connue. Le titrage donne la concentration de l'acide, à comparer avec l'étiquette.",
    },
    {
      genre: "materiel", competence: "ANA", consigne: "Choisis le matériel nécessaire pour titrer la solution diluée.",
      objets: [
        { id: "burette", nom: "Burette graduée de 25 mL", utile: true, pourquoi: "Elle verse la soude et donne le volume versé au dixième de millilitre." },
        { id: "eprouvette", nom: "Éprouvette graduée de 10 mL", utile: false, pourquoi: "Elle n'est pas assez précise pour prélever la prise d'essai." },
        { id: "pipette", nom: "Pipette jaugée de 10,0 mL", utile: true, pourquoi: "Elle prélève la prise d'essai avec précision." },
        { id: "balance", nom: "Balance", utile: false, pourquoi: "On ne pèse rien dans ce titrage." },
        { id: "erlenmeyer", nom: "Erlenmeyer de 100 mL", utile: true, pourquoi: "Il reçoit la prise d'essai. Sa forme permet d'agiter sans éclabousser." },
        { id: "fiole", nom: "Fiole jaugée de 250 mL", utile: false, pourquoi: "Elle sert à diluer, et la dilution est déjà faite." },
        { id: "agitateur", nom: "Agitateur magnétique", utile: true, pourquoi: "Il mélange la solution pendant qu'on verse la soude." },
        { id: "phmetre", nom: "pH-mètre", utile: false, pourquoi: "Ici, c'est l'indicateur coloré qui repère l'équivalence." },
      ],
    },
    {
      genre: "choix", competence: "ANA", question: "Quel indicateur coloré choisis-tu pour repérer l'équivalence ?",
      options: ["L'hélianthine", "Le bleu de bromothymol", "La phénolphtaléine"], bonne: 1,
      explication: "La zone de virage du bleu de bromothymol, de pH 6,0 à 7,6, contient le pH à l'équivalence : 7,0.",
    },
    {
      genre: "ordre", competence: "ANA", consigne: "Remets les étapes du protocole dans l'ordre.",
      etapes: [
        "Rincer la burette avec la soude, la remplir, puis ajuster le zéro.",
        "Prélever 10,0 mL de détartrant dilué avec la pipette jaugée, et les verser dans l'erlenmeyer.",
        "Ajouter quelques gouttes de bleu de bromothymol et lancer l'agitation.",
        "Verser la soude, vite d'abord, puis goutte à goutte près du changement de couleur.",
        "Noter le volume versé quand la couleur change pour de bon.",
      ],
      // préparer la prise d'essai avant la burette convient aussi
      autres: [[1, 0, 2, 3, 4], [1, 2, 0, 3, 4]],
    },
    {
      genre: "paillasse", competence: "REA",
      consigne: "Réalise le titrage sur la paillasse. Tout se fait à la main : tu prends les objets, tu tournes le robinet, tu lis la burette à la loupe. Si tu dépasses l'équivalence, recommence le titrage.",
      protocole: [
        "Rincer la burette : y verser un peu de soude, puis la vider dans le bécher poubelle.",
        "Remplir la burette de soude au-dessus du zéro, puis régler le zéro en ouvrant le robinet au-dessus du bécher poubelle.",
        "Prélever 10,0 mL de détartrant dilué à la pipette jaugée, le bas du ménisque sur le trait de jauge, et les verser dans l'erlenmeyer.",
        "Ajouter quelques gouttes de bleu de bromothymol et le barreau aimanté. Poser l'erlenmeyer sous la burette et lancer l'agitation.",
        "Verser la soude au filet, puis goutte à goutte près du changement de couleur. Fermer le robinet dès que la couleur change pour de bon.",
        "Lire le volume sur la burette, en face du bas du ménisque, et le noter.",
      ],
      paillasse: { genre: "titrage", reglages: reglages(graine) },
    },
    {
      genre: "valeur", competence: "VAL", question: "Calcule la concentration en acide chlorhydrique de la solution diluée.", unite: "mol/L", decimales: 4, relatif: 0.015,
      aide: "À l'équivalence, l'acide et la soude ont réagi mole pour mole : C_A × V_A = C_B × V_E.",
      attendu: concentrationDiluee,
      detail: (m) => `C_A = C_B × V_E / V_A = 0,100 × ${ml(m.VE)} / 10,0 mL = ${mol(concentrationDiluee(m))}.`,
    },
    {
      genre: "valeur", competence: "VAL", question: "Déduis-en la concentration du détartrant du flacon.", unite: "mol/L", decimales: 2, relatif: 0.015,
      aide: "Le détartrant a été dilué 25 fois avant le titrage.",
      attendu: concentrationFlacon,
      detail: (m) => `C = 25 × ${mol(concentrationDiluee(m))} = ${mol(concentrationFlacon(m), 2)}.`,
    },
    {
      genre: "valeur", competence: "VAL", question: "Calcule l'écart relatif entre ta valeur et celle de l'étiquette, en pourcentage.", unite: "%", decimales: 1, absolu: 0.4,
      aide: "Écart relatif : la différence entre les deux valeurs, divisée par la valeur de l'étiquette.",
      attendu: ecartEtiquette,
      detail: (m) => `Écart = |${nombre(concentrationFlacon(m), 2)} − 2,5| / 2,5 = ${nombre(ecartEtiquette(m), 1)} %.`,
    },
    {
      genre: "choix", competence: "VAL", question: "D'après ta mesure, l'indication de l'étiquette est-elle correcte à 5 % près ?",
      options: ["Oui", "Non"], bonne: (m) => (ecartEtiquette(m) <= 5 ? 0 : 1),
      explication: (m) => (ecartEtiquette(m) <= 5 ? `Ton écart relatif, ${nombre(ecartEtiquette(m), 1)} %, est inférieur à 5 % : l'indication est correcte.` : `Ton écart relatif, ${nombre(ecartEtiquette(m), 1)} %, dépasse 5 % : avec ta mesure, l'indication ne serait pas correcte. Une manipulation sans défaut donne ${nombre(ecartEtiquette({ VE: (reglages(graine).Ca * 10) / 0.1 }), 1)} % : si ta manipulation a eu des fautes, refais le titrage avec plus de soin.`),
    },
  ],
};

export default detartrant;
