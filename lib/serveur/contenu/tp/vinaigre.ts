import "server-only";
import { nombre } from "@/lib/commun/format";
import type { ReglagesTitrage } from "@/lib/commun/tp/paillasses/titrage";
import { variante, type Mesures, type Tp } from "./types";

const ml = (x: number) => `${nombre(x, 2)} mL`;
const mol = (x: number, d = 4) => `${nombre(x, d)} mol/L`;

// ---------- Un titrage suivi au pH-mètre ----------
const DEGRE = 8; // le degré d'acidité annoncé : 8 g d'acide éthanoïque pour 100 g de vinaigre
/** Les concentrations possibles du vinaigre dilué : la graine de l'essai en choisit une. L'une d'elles dément l'étiquette. */
const CONCENTRATIONS = [0.131, 0.1385, 0.1245, 0.1335];
const vinaigreDilue = (m: Mesures) => (0.1 * m.VE) / 10;
const vinaigreFlacon = (m: Mesures) => 10 * vinaigreDilue(m);
const masseParLitre = (m: Mesures) => vinaigreFlacon(m) * 60;
const degre = (m: Mesures) => (masseParLitre(m) / 1010) * 100;
const ecartDegre = (m: Mesures) => (100 * Math.abs(degre(m) - DEGRE)) / DEGRE;
const reglages = (graine: number): ReglagesTitrage => ({
  Ca: variante(graine, CONCENTRATIONS), pKa: 4.76, Va: 10, Cb: 0.1, suivi: "phmetre", indicateur: "phenolphtaleine", eau: 40,
  noms: { titrante: "Soude", titree: "Vinaigre dilué" },
});

const vinaigre: Tp = {
  id: "vinaigre", titre: "Le degré d'un vinaigre", matiere: "chimie", famille: "Titrage suivi au pH-mètre", fiche: 10, minutes: 25, etat: "brouillon",
  accroche: "Un vinaigre annonce 8 % d'acidité. Trace la courbe du pH, repère le saut, et vérifie l'étiquette.",
  etapes: (graine) => [
    {
      genre: "lecture", titre: "La situation",
      paragraphes: [
        "L'étiquette d'un vinaigre blanc annonce 8 % d'acidité : 8,0 g d'acide éthanoïque pour 100 g de vinaigre. On dit aussi 8 degrés.",
        "Tu dois vérifier cette indication par un titrage suivi au pH-mètre.",
        "Le vinaigre a déjà été dilué 10 fois : c'est cette solution diluée que tu titres.",
      ],
      documents: [
        { titre: "Le titrage", lignes: ["Équation de la réaction : CH₃COOH + HO⁻ → CH₃COO⁻ + H₂O", "Solution titrante : soude de concentration 0,100 mol/L", "Prise d'essai : 10,0 mL de vinaigre dilué, avec environ 40 mL d'eau distillée pour immerger la sonde"] },
        { titre: "Lire une courbe de titrage", lignes: ["À l'équivalence, le pH saute brusquement.", "Le volume à l'équivalence V_E est le volume au milieu du saut."] },
        { titre: "Données", lignes: ["Masse molaire de l'acide éthanoïque : 60,0 g/mol", "Masse volumique du vinaigre : 1,01 g/mL. Un litre de vinaigre pèse donc 1 010 g."] },
      ],
    },
    {
      genre: "choix", competence: "APP", question: "Pourquoi ajoute-t-on de l'eau distillée dans le bécher ?",
      options: ["Pour que la sonde du pH-mètre soit bien immergée", "Pour diluer l'acide et changer le volume à l'équivalence", "Pour colorer la solution"], bonne: 0,
      explication: "L'eau ajoutée ne change pas la quantité d'acide dans le bécher : le volume à l'équivalence reste le même.",
    },
    {
      genre: "materiel", competence: "ANA", consigne: "Choisis le matériel nécessaire pour ce titrage suivi au pH-mètre.",
      objets: [
        { id: "burette", nom: "Burette graduée de 25 mL", utile: true, pourquoi: "Elle verse la soude et donne le volume versé." },
        { id: "fiole", nom: "Fiole jaugée de 100 mL", utile: false, pourquoi: "Elle sert à diluer, et la dilution est déjà faite." },
        { id: "pipette", nom: "Pipette jaugée de 10,0 mL", utile: true, pourquoi: "Elle prélève la prise d'essai avec précision." },
        { id: "becher", nom: "Bécher de 100 mL", utile: true, pourquoi: "Il reçoit la prise d'essai, l'eau et la sonde." },
        { id: "balance", nom: "Balance", utile: false, pourquoi: "On ne pèse rien dans ce titrage." },
        { id: "phmetre", nom: "pH-mètre étalonné", utile: true, pourquoi: "Il mesure le pH après chaque ajout de soude." },
        { id: "eprouvette", nom: "Éprouvette graduée de 50 mL", utile: true, pourquoi: "Elle mesure l'eau distillée : pour ce volume, la précision n'a pas d'importance." },
        { id: "spectro", nom: "Spectrophotomètre", utile: false, pourquoi: "Il mesure une absorbance : il ne sert pas ici." },
        { id: "agitateur", nom: "Agitateur magnétique", utile: true, pourquoi: "Il mélange la solution pour que le pH mesuré soit le bon." },
      ],
    },
    {
      genre: "choix", competence: "ANA", question: "Comment verser la soude pour bien repérer le saut de pH ?",
      options: ["Millilitre par millilitre, du début à la fin", "Par ajouts plus petits quand le pH monte vite, en continuant après le saut", "D'un seul trait, jusqu'à 25 mL"], bonne: 1,
      explication: "Près du saut, des ajouts serrés donnent assez de points pour lire le volume. Il faut aussi dépasser le saut pour le voir en entier.",
    },
    {
      genre: "ordre", competence: "ANA", consigne: "Remets les étapes du protocole dans l'ordre.",
      etapes: [
        "Rincer la burette avec la soude, la remplir, puis ajuster le zéro.",
        "Prélever 10,0 mL de vinaigre dilué à la pipette jaugée, les verser dans le bécher, puis ajouter l'eau distillée.",
        "Plonger la sonde du pH-mètre et lancer l'agitation.",
        "Verser la soude par ajouts successifs, en relevant le pH à chaque ajout.",
        "Tracer la courbe et lire le volume au milieu du saut de pH.",
      ],
      autres: [[1, 0, 2, 3, 4], [1, 2, 0, 3, 4]],
    },
    {
      genre: "paillasse", competence: "REA",
      consigne: "Réalise le titrage sur la paillasse. Tout se fait à la main. Le pH-mètre relève un point à chaque ajout : resserre tes ajouts quand le pH monte vite, dépasse le saut, puis lis le volume à l'équivalence sur ta courbe.",
      protocole: [
        "Rincer la burette : y verser un peu de soude, puis la vider dans le bécher poubelle.",
        "Remplir la burette de soude au-dessus du zéro, puis régler le zéro en ouvrant le robinet au-dessus du bécher poubelle.",
        "Prélever 10,0 mL de vinaigre dilué à la pipette jaugée, le bas du ménisque sur le trait de jauge, et les verser dans le bécher.",
        "Ajouter environ 40 mL d'eau distillée avec la pissette, puis le barreau aimanté.",
        "Rincer la sonde du pH-mètre à l'eau distillée et la plonger dans le bécher. Poser le bécher sous la burette et lancer l'agitation.",
        "Verser la soude par ajouts : larges au début, serrés quand le pH monte vite, jusqu'après le saut.",
        "Ouvrir la courbe, placer le repère au milieu du saut de pH, et noter ce volume.",
      ],
      paillasse: { genre: "titrage", reglages: reglages(graine) },
    },
    {
      genre: "valeur", competence: "VAL", question: "Calcule la concentration en acide éthanoïque du vinaigre dilué.", unite: "mol/L", decimales: 3, relatif: 0.015,
      aide: "À l'équivalence, l'acide et la soude ont réagi mole pour mole : C_A × V_A = C_B × V_E.",
      attendu: vinaigreDilue,
      detail: (m) => `C_A = C_B × V_E / V_A = 0,100 × ${ml(m.VE)} / 10,0 mL = ${mol(vinaigreDilue(m), 3)}.`,
    },
    {
      genre: "valeur", competence: "VAL", question: "Déduis-en la concentration du vinaigre du commerce.", unite: "mol/L", decimales: 2, relatif: 0.015,
      aide: "Le vinaigre a été dilué 10 fois avant le titrage.",
      attendu: vinaigreFlacon,
      detail: (m) => `C = 10 × ${mol(vinaigreDilue(m), 3)} = ${mol(vinaigreFlacon(m), 2)}.`,
    },
    {
      genre: "valeur", competence: "VAL", question: "Calcule la masse d'acide éthanoïque dans un litre de vinaigre.", unite: "g", decimales: 1, relatif: 0.015,
      aide: "Dans un litre, la quantité d'acide vaut C. Sa masse est m = n × M.",
      attendu: masseParLitre,
      detail: (m) => `m = ${nombre(vinaigreFlacon(m), 2)} mol × 60,0 g/mol = ${nombre(masseParLitre(m), 1)} g.`,
    },
    {
      genre: "valeur", competence: "VAL", question: "Calcule le degré d'acidité : la masse d'acide, en grammes, dans 100 g de vinaigre.", unite: "g", decimales: 1, absolu: 0.15,
      aide: "Un litre de vinaigre pèse 1 010 g et contient la masse d'acide que tu viens de calculer.",
      attendu: degre,
      detail: (m) => `Dans 100 g : ${nombre(masseParLitre(m), 1)} g × 100 / 1 010 = ${nombre(degre(m), 1)} g. Le vinaigre titre ${nombre(degre(m), 1)} degrés.`,
    },
    {
      genre: "choix", competence: "VAL", question: "D'après ta mesure, l'indication « 8 % » est-elle correcte à 5 % près ?",
      options: ["Oui", "Non"], bonne: (m) => (ecartDegre(m) <= 5 ? 0 : 1),
      explication: (m) => (ecartDegre(m) <= 5 ? `Ton écart relatif, ${nombre(ecartDegre(m), 1)} %, est inférieur à 5 % : l'indication est correcte.` : `Ton écart relatif, ${nombre(ecartDegre(m), 1)} %, dépasse 5 % : avec ta mesure, l'indication ne serait pas correcte. Une manipulation sans défaut donne ${nombre(ecartDegre({ VE: (reglages(graine).Ca * 10) / 0.1 }), 1)} % : si ta manipulation a eu des fautes, refais le titrage en serrant tes ajouts près du saut.`),
    },
  ],
};

export default vinaigre;
