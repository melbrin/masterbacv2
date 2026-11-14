import "server-only";
import { nombre } from "@/lib/commun/format";
import type { ReglagesTitrage } from "@/lib/commun/tp/paillasses/titrage";
import { variante, type Mesures, type Tp } from "./types";

const ml = (x: number) => `${nombre(x, 2)} mL`;
const mol = (x: number, d = 4) => `${nombre(x, d)} mol/L`;

// ---------- Un titrage suivi par conductimétrie ----------
const ETIQUETTE = 9.0; // la concentration en masse annoncée : 9,0 g de chlorure de sodium par litre
const MASSE_MOLAIRE = 58.5; // le chlorure de sodium, en g/mol
/** Les concentrations possibles du sérum dilué dix fois : la graine de l'essai en choisit une. L'une d'elles dément l'étiquette. */
const CONCENTRATIONS = [0.0154, 0.0149, 0.016, 0.0138];
const serumDilue = (m: Mesures) => (0.01 * m.VE) / 10;
const serum = (m: Mesures) => 10 * serumDilue(m);
const enMasse = (m: Mesures) => serum(m) * MASSE_MOLAIRE;
const ecart = (m: Mesures) => (100 * Math.abs(enMasse(m) - ETIQUETTE)) / ETIQUETTE;
const reglages = (graine: number): ReglagesTitrage => ({
  Ca: variante(graine, CONCENTRATIONS), pKa: null, Va: 10, Cb: 0.01, suivi: "conductimetre", indicateur: "bbt", eau: 50,
  // les conductivités molaires de Na⁺, Cl⁻, NO₃⁻ et Ag⁺, en mS·m²/mol
  ions: { spectateur: 5.01, titre: 7.63, contre: 7.14, titrant: 6.19 },
  noms: { titrante: "Nitrate d'argent", titree: "Sérum dilué", etiquette: "AgNO₃" },
});

const serumPhysiologique: Tp = {
  id: "serum", titre: "Un sérum physiologique à contrôler", matiere: "chimie", famille: "Titrage suivi par conductimétrie", fiche: 10, minutes: 25, etat: "brouillon",
  accroche: "Un sérum physiologique annonce 9,0 g de sel par litre. Suis sa conductivité pendant le titrage, et vérifie l'étiquette.",
  etapes: (graine) => [
    {
      genre: "lecture", titre: "La situation",
      paragraphes: [
        "Un sérum physiologique est une solution de chlorure de sodium. Son étiquette annonce 9,0 g de chlorure de sodium par litre.",
        "Tu dois vérifier cette indication en titrant les ions chlorure par une solution de nitrate d'argent. L'équivalence se repère avec un conductimètre.",
        "Le sérum a déjà été dilué 10 fois : c'est cette solution diluée que tu titres.",
      ],
      documents: [
        { titre: "Le titrage", lignes: ["Équation de la réaction : Ag⁺ + Cl⁻ → AgCl. Le chlorure d'argent est un solide blanc.", "Solution titrante : nitrate d'argent de concentration 0,0100 mol/L", "Prise d'essai : 10,0 mL de sérum dilué, avec environ 50 mL d'eau distillée pour immerger la sonde"] },
        { titre: "La conductivité d'une solution", lignes: ["Une solution conduit d'autant mieux le courant qu'elle contient d'ions, et que ces ions conduisent bien.", "Conductivités molaires des ions, en mS·m²/mol : Na⁺ 5,0 ; Cl⁻ 7,6 ; NO₃⁻ 7,1 ; Ag⁺ 6,2", "Sur la courbe de la conductivité en fonction du volume versé, l'équivalence est à la rupture de pente : là où les deux droites se croisent."] },
        { titre: "Données", lignes: ["Masse molaire du chlorure de sodium : 58,5 g/mol", "L'indication de l'étiquette est jugée correcte si l'écart est inférieur à 5 %."] },
      ],
    },
    {
      genre: "choix", competence: "APP", question: "Quels ions du sérum réagissent pendant ce titrage ?",
      options: ["Les ions chlorure", "Les ions sodium", "Les ions nitrate", "Tous les ions du sérum"], bonne: 0,
      explication: "Les ions argent versés réagissent avec les ions chlorure. Les ions sodium ne réagissent pas : ils restent dans la solution.",
    },
    {
      genre: "materiel", competence: "ANA", consigne: "Choisis le matériel nécessaire pour ce titrage suivi par conductimétrie.",
      objets: [
        { id: "burette", nom: "Burette graduée de 25 mL", utile: true, pourquoi: "Elle verse le nitrate d'argent et donne le volume versé." },
        { id: "pipette", nom: "Pipette jaugée de 10,0 mL", utile: true, pourquoi: "Elle prélève la prise d'essai avec précision." },
        { id: "phmetre", nom: "pH-mètre", utile: false, pourquoi: "Le pH ne change presque pas pendant ce titrage : il ne repère pas l'équivalence." },
        { id: "becher", nom: "Bécher de 150 mL", utile: true, pourquoi: "Il reçoit la prise d'essai, l'eau distillée et la sonde." },
        { id: "conductimetre", nom: "Conductimètre", utile: true, pourquoi: "Il mesure la conductivité après chaque ajout." },
        { id: "balance", nom: "Balance", utile: false, pourquoi: "On ne pèse rien dans ce titrage." },
        { id: "pissette", nom: "Pissette d'eau distillée", utile: true, pourquoi: "Elle ajoute l'eau qui immerge la sonde, et sert à rincer la sonde." },
        { id: "indicateur", nom: "Bleu de bromothymol", utile: false, pourquoi: "Ce n'est pas un titrage acide-base : un indicateur de pH ne change pas de couleur à l'équivalence." },
        { id: "agitateur", nom: "Agitateur magnétique", utile: true, pourquoi: "Il mélange la solution pour que la conductivité mesurée soit celle de tout le bécher." },
      ],
    },
    {
      genre: "choix", competence: "ANA", question: "Avant l'équivalence, que devient la conductivité quand on verse le nitrate d'argent ?",
      options: ["Elle baisse un peu", "Elle monte vite", "Elle tombe à zéro"], bonne: 0,
      explication: "Chaque ion chlorure qui réagit est remplacé par un ion nitrate, qui conduit un peu moins bien : la conductivité baisse doucement. Après l'équivalence, les ions argent et nitrate s'accumulent : elle monte.",
    },
    {
      genre: "choix", competence: "ANA", question: "Comment verser le nitrate d'argent pour ce suivi ?",
      options: ["Par ajouts réguliers d'un millilitre, bien au-delà de l'équivalence", "Goutte à goutte du début à la fin", "En serrant les ajouts près de l'équivalence, comme au pH-mètre"], bonne: 0,
      explication: "On cherche deux droites : il faut des points réguliers de chaque côté de la rupture de pente. Les serrer près de l'équivalence ne sert à rien.",
    },
    {
      genre: "ordre", competence: "ANA", consigne: "Remets les étapes du protocole dans l'ordre.",
      etapes: [
        "Rincer la burette avec la solution de nitrate d'argent, la remplir, puis ajuster le zéro.",
        "Prélever 10,0 mL de sérum dilué à la pipette jaugée, les verser dans le bécher, puis ajouter l'eau distillée.",
        "Plonger la sonde du conductimètre et lancer l'agitation.",
        "Verser le nitrate d'argent millilitre par millilitre, en relevant la conductivité à chaque ajout.",
        "Tracer la courbe et lire le volume à la rupture de pente.",
      ],
      autres: [[1, 0, 2, 3, 4], [1, 2, 0, 3, 4]],
    },
    {
      genre: "paillasse", competence: "REA",
      consigne: "Réalise le titrage sur la paillasse. Tout se fait à la main. Le conductimètre relève un point à chaque ajout : verse par ajouts réguliers, dépasse largement l'équivalence, puis lis le volume à la rupture de pente sur ta courbe.",
      protocole: [
        "Rincer la burette : y verser un peu de nitrate d'argent, puis la vider dans le bécher poubelle.",
        "Remplir la burette au-dessus du zéro, puis régler le zéro en ouvrant le robinet au-dessus du bécher poubelle.",
        "Prélever 10,0 mL de sérum dilué à la pipette jaugée, le bas du ménisque sur le trait de jauge, et les verser dans le bécher.",
        "Ajouter environ 50 mL d'eau distillée avec la pissette, puis le barreau aimanté.",
        "Rincer la sonde du conductimètre à l'eau distillée et la plonger dans le bécher. Poser le bécher sous la burette et lancer l'agitation.",
        "Verser le nitrate d'argent par ajouts d'un millilitre environ, jusqu'à 20 mL au moins.",
        "Ouvrir la courbe, placer le repère à la rupture de pente, et noter ce volume.",
      ],
      paillasse: { genre: "titrage", reglages: reglages(graine) },
    },
    {
      genre: "valeur", competence: "VAL", question: "Calcule la concentration en ions chlorure du sérum dilué.", unite: "mol/L", decimales: 4, relatif: 0.02,
      aide: "À l'équivalence, les ions argent versés ont réagi avec tous les ions chlorure, un pour un : C × V = C_Ag × V_E.",
      attendu: serumDilue,
      detail: (m) => `C = C_Ag × V_E / V = 0,0100 × ${ml(m.VE)} / 10,0 mL = ${mol(serumDilue(m))}.`,
    },
    {
      genre: "valeur", competence: "VAL", question: "Déduis-en la concentration en masse de chlorure de sodium du sérum, en grammes par litre.", unite: "g/L", decimales: 2, relatif: 0.02,
      aide: "Le sérum a été dilué 10 fois. Dans le sérum, chaque ion chlorure vient d'un chlorure de sodium : la concentration en masse vaut C × M.",
      attendu: enMasse,
      detail: (m) => `Dans le sérum : C = 10 × ${mol(serumDilue(m))} = ${mol(serum(m), 3)}. En masse : ${nombre(serum(m), 3)} × 58,5 = ${nombre(enMasse(m), 2)} g/L.`,
    },
    {
      genre: "valeur", competence: "VAL", question: "Calcule l'écart relatif entre ta valeur et celle de l'étiquette, en pourcentage.", unite: "%", decimales: 1, absolu: 0.5,
      aide: "Écart relatif : la différence entre les deux valeurs, divisée par la valeur de l'étiquette.",
      attendu: ecart,
      detail: (m) => `Écart = |${nombre(enMasse(m), 2)} − 9,0| / 9,0 = ${nombre(ecart(m), 1)} %.`,
    },
    {
      genre: "choix", competence: "VAL", question: "D'après ta mesure, l'indication de l'étiquette est-elle correcte à 5 % près ?",
      options: ["Oui", "Non"], bonne: (m) => (ecart(m) <= 5 ? 0 : 1),
      explication: (m) => (ecart(m) <= 5
        ? `Ton écart relatif, ${nombre(ecart(m), 1)} %, est inférieur à 5 % : l'indication est correcte.`
        : `Ton écart relatif, ${nombre(ecart(m), 1)} %, dépasse 5 % : avec ta mesure, l'indication ne serait pas correcte. Une manipulation sans défaut donne ${nombre(ecart({ VE: (reglages(graine).Ca * 10) / 0.01 }), 1)} % : si ta manipulation a eu des fautes, refais le titrage.`),
    },
  ],
};

export default serumPhysiologique;
