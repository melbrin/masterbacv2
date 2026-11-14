import "server-only";
import { nombre } from "@/lib/commun/format";
import type { Competence, DocumentTp, Paillasse } from "@/lib/commun/tp/types";

// Les TP virtuels (décision 0012) : des situations originales, écrites pour MasterBac, sur les familles de manipulations
// des ECE. Une situation est du contenu : elle reste sur le serveur, avec ses réponses. Le navigateur ne reçoit que
// l'énoncé de chaque étape, et la correction après avoir répondu (lib/serveur/tp.ts).
// Un TP écrit par Claude Code reste un brouillon tant que Yane ne l'a pas validé.

/** Les mesures de l'élève, tirées de sa manipulation rejouée par le serveur : le volume équivalent, un temps caractéristique. */
export type Mesures = Record<string, number>;
type Selon<T> = T | ((m: Mesures) => T);

export type EtapeTp =
  | { genre: "lecture"; titre: string; paragraphes: string[]; documents: DocumentTp[] }
  | { genre: "materiel"; competence: Competence; consigne: string; objets: { id: string; nom: string; utile: boolean; pourquoi: string }[] }
  /** les étapes, dans le bon ordre ; `autres` donne les ordres qui conviennent aussi, par les rangs des étapes */
  | { genre: "ordre"; competence: Competence; consigne: string; etapes: string[]; autres?: number[][] }
  | { genre: "choix"; competence: Competence; question: string; options: string[]; bonne: Selon<number>; explication: Selon<string> }
  | { genre: "paillasse"; competence: Competence; consigne: string; paillasse: Paillasse }
  /** une valeur à calculer à partir de ses propres mesures : l'écart toléré est relatif, ou absolu */
  | { genre: "valeur"; competence: Competence; question: string; unite: string; aide: string; attendu: (m: Mesures) => number; relatif?: number; absolu?: number; decimales: number; detail: (m: Mesures) => string };

export interface Tp {
  id: string;
  titre: string;
  matiere: "chimie" | "physique";
  /** la famille de manipulation, en deux ou trois mots */
  famille: string;
  fiche: number;
  minutes: number;
  accroche: string;
  etat: "brouillon" | "valide";
  etapes: EtapeTp[];
}

const ml = (x: number) => `${nombre(x, 2)} mL`;
const mol = (x: number, d = 4) => `${nombre(x, d)} mol/L`;

// ---------- TP 1 : un titrage colorimétrique ----------
const ETIQUETTE = 2.5; // la concentration annoncée sur le flacon, en mol/L
const DILUTION = 25;
const concentrationDiluee = (m: Mesures) => (0.1 * m.VE) / 10;
const concentrationFlacon = (m: Mesures) => DILUTION * concentrationDiluee(m);
const ecartEtiquette = (m: Mesures) => (100 * Math.abs(concentrationFlacon(m) - ETIQUETTE)) / ETIQUETTE;

const detartrant: Tp = {
  id: "detartrant", titre: "Un détartrant à contrôler", matiere: "chimie", famille: "Titrage colorimétrique", fiche: 10, minutes: 20, etat: "brouillon",
  accroche: "L'étiquette d'un détartrant annonce sa concentration en acide. Vérifie-la par un titrage, à la goutte près.",
  etapes: [
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
      consigne: "Réalise le titrage. Si tu dépasses l'équivalence, recommence : un premier titrage rapide situe le volume, un second le mesure à la goutte près.",
      paillasse: { genre: "titrage", reglages: { Ca: 0.0976, pKa: null, Va: 10, Cb: 0.1, suivi: "indicateur", indicateur: "bbt", eau: 20 } },
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
      explication: (m) => (ecartEtiquette(m) <= 5 ? `Ton écart relatif, ${nombre(ecartEtiquette(m), 1)} %, est inférieur à 5 % : l'indication est correcte.` : `Ton écart relatif, ${nombre(ecartEtiquette(m), 1)} %, dépasse 5 % : avec ta mesure, l'indication ne serait pas correcte. La valeur exacte donne 2,4 % : refais le titrage avec plus de soin.`),
    },
  ],
};

// ---------- TP 2 : un titrage suivi au pH-mètre ----------
const DEGRE = 8; // le degré d'acidité annoncé : 8 g d'acide éthanoïque pour 100 g de vinaigre
const vinaigreDilue = (m: Mesures) => (0.1 * m.VE) / 10;
const vinaigreFlacon = (m: Mesures) => 10 * vinaigreDilue(m);
const masseParLitre = (m: Mesures) => vinaigreFlacon(m) * 60;
const degre = (m: Mesures) => (masseParLitre(m) / 1010) * 100;
const ecartDegre = (m: Mesures) => (100 * Math.abs(degre(m) - DEGRE)) / DEGRE;

const vinaigre: Tp = {
  id: "vinaigre", titre: "Le degré d'un vinaigre", matiere: "chimie", famille: "Titrage suivi au pH-mètre", fiche: 10, minutes: 25, etat: "brouillon",
  accroche: "Un vinaigre annonce 8 % d'acidité. Trace la courbe du pH, repère le saut, et vérifie l'étiquette.",
  etapes: [
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
      consigne: "Réalise le titrage. Le pH-mètre relève un point à chaque ajout. Resserre tes ajouts quand le pH monte vite, dépasse le saut, puis lis le volume à l'équivalence.",
      paillasse: { genre: "titrage", reglages: { Ca: 0.131, pKa: 4.76, Va: 10, Cb: 0.1, suivi: "phmetre", indicateur: "phenolphtaleine", eau: 40 } },
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
      explication: (m) => (ecartDegre(m) <= 5 ? `Ton écart relatif, ${nombre(ecartDegre(m), 1)} %, est inférieur à 5 % : l'indication est correcte.` : `Ton écart relatif, ${nombre(ecartDegre(m), 1)} %, dépasse 5 % : avec ta mesure, l'indication ne serait pas correcte. La valeur exacte donne 2,7 % : refais le titrage en serrant tes ajouts près du saut.`),
    },
  ],
};

// ---------- TP 3 : la charge d'un condensateur ----------
const POSSIBLES = [220, 330, 470]; // les capacités possibles, en microfarads
const capaciteMesuree = (m: Mesures) => (m.tau / 10000) * 1e6;
const plusProche = (m: Mesures) => POSSIBLES.reduce((meilleur, c, i) => (Math.abs(c - capaciteMesuree(m)) < Math.abs(POSSIBLES[meilleur] - capaciteMesuree(m)) ? i : meilleur), 0);
const ecartCapacite = (m: Mesures) => (100 * Math.abs(capaciteMesuree(m) - POSSIBLES[plusProche(m)])) / POSSIBLES[plusProche(m)];

const condensateur: Tp = {
  id: "condensateur", titre: "Un condensateur sans étiquette", matiere: "physique", famille: "Circuit RC", fiche: 8, minutes: 20, etat: "brouillon",
  accroche: "L'étiquette d'un condensateur est effacée. Branche-le, enregistre sa charge, et retrouve sa capacité.",
  etapes: [
    {
      genre: "lecture", titre: "La situation",
      paragraphes: [
        "On a retrouvé un condensateur dont l'étiquette est effacée. Trois valeurs sont possibles : 220 µF, 330 µF ou 470 µF.",
        "Pour l'identifier, tu le charges à travers une résistance connue, et tu enregistres la tension à ses bornes.",
      ],
      documents: [
        { titre: "Le matériel", lignes: ["Un générateur de tension continue : E = 5,0 V", "Une résistance : R = 10 kΩ", "Un interrupteur et des fils", "Un système d'acquisition : une voie de mesure et sa masse"] },
        { titre: "La charge d'un condensateur", lignes: ["La tension aux bornes du condensateur suit u_C(t) = E × (1 − e^(−t/τ)).", "Le temps caractéristique vaut τ = R × C.", "À la date t = τ, la tension vaut 63 % de sa valeur finale."] },
      ],
    },
    {
      genre: "choix", competence: "APP", question: "Quelle grandeur dois-tu enregistrer au cours du temps ?",
      options: ["La tension aux bornes du condensateur", "La tension aux bornes du générateur", "La température de la résistance"], bonne: 0,
      explication: "C'est la tension du condensateur qui monte peu à peu pendant la charge. Sa courbe donne le temps caractéristique.",
    },
    {
      genre: "choix", competence: "ANA", question: "Comment relier le générateur, l'interrupteur, la résistance et le condensateur ?",
      options: ["En série : une seule boucle", "En dérivation : chacun aux bornes du générateur", "Le condensateur seul aux bornes du générateur"], bonne: 0,
      explication: "Le condensateur se charge à travers la résistance : les quatre composants sont dans la même boucle.",
    },
    {
      genre: "choix", competence: "ANA", question: "Où branches-tu la voie de mesure et la masse ?",
      options: ["Aux deux bornes du condensateur", "Aux deux bornes de la résistance", "Aux deux bornes de l'interrupteur"], bonne: 0,
      explication: "Un appareil qui mesure une tension se branche en dérivation, aux bornes du dipôle étudié.",
    },
    {
      genre: "valeur", competence: "ANA", question: "À quelle tension liras-tu le temps caractéristique sur la courbe ?", unite: "V", decimales: 2, absolu: 0.02,
      aide: "À la date t = τ, la tension vaut 63 % de sa valeur finale. La valeur finale est la tension du générateur.",
      attendu: () => 0.63 * 5,
      detail: () => "0,63 × 5,0 V = 3,15 V.",
    },
    {
      genre: "ordre", competence: "ANA", consigne: "Remets les étapes du protocole dans l'ordre.",
      etapes: [
        "Relier en série le générateur, l'interrupteur ouvert, la résistance et le condensateur.",
        "Brancher la voie de mesure et la masse aux bornes du condensateur.",
        "Lancer l'acquisition, puis fermer l'interrupteur.",
        "Attendre que la tension ne varie plus.",
        "Lire sur la courbe la date où la tension vaut 63 % de sa valeur finale.",
      ],
      autres: [[1, 0, 2, 3, 4]],
    },
    {
      genre: "paillasse", competence: "REA",
      consigne: "Pose les fils : touche une borne, puis une autre. Lance l'acquisition, puis place le repère sur la courbe à la bonne tension et note le temps.",
      paillasse: {
        genre: "circuit",
        reglages: {
          generateur: { plus: "g+", moins: "g-", E: 5 },
          dipoles: [{ id: "K", genre: "interrupteur", bornes: ["k1", "k2"] }, { id: "R", genre: "resistance", bornes: ["r1", "r2"] }, { id: "C", genre: "condensateur", bornes: ["c1", "c2"] }],
          mesure: { voie: "voie", masse: "masse" },
          R: 10000, C: 330e-6, parCm: 0, niveaux: [], lecture: true, duree: 20,
        },
      },
    },
    {
      genre: "valeur", competence: "VAL", question: "Avec ton temps caractéristique, calcule la capacité du condensateur.", unite: "µF", decimales: 0, relatif: 0.02,
      aide: "τ = R × C, avec R en ohms et C en farads. Un microfarad vaut 10⁻⁶ F.",
      attendu: capaciteMesuree,
      detail: (m) => `C = τ / R = ${nombre(m.tau, 2)} s / 10 000 Ω = ${nombre(m.tau / 10000, 6)} F, soit ${nombre(capaciteMesuree(m), 0)} µF.`,
    },
    {
      genre: "choix", competence: "VAL", question: "Quel est ce condensateur ?",
      options: POSSIBLES.map((c) => `${c} µF`), bonne: plusProche,
      explication: (m) => `Ta valeur, ${nombre(capaciteMesuree(m), 0)} µF, est la plus proche de ${POSSIBLES[plusProche(m)]} µF.${plusProche(m) === 1 ? "" : " Le condensateur est en réalité un 330 µF : ta lecture du temps caractéristique est à reprendre."}`,
    },
    {
      genre: "valeur", competence: "VAL", question: "Calcule l'écart relatif entre ta valeur et la capacité que tu as choisie, en pourcentage.", unite: "%", decimales: 1, absolu: 0.5,
      aide: "Écart relatif : la différence entre les deux valeurs, divisée par la valeur de référence.",
      attendu: ecartCapacite,
      detail: (m) => `Écart = |${nombre(capaciteMesuree(m), 0)} − ${POSSIBLES[plusProche(m)]}| / ${POSSIBLES[plusProche(m)]} = ${nombre(ecartCapacite(m), 1)} %.`,
    },
    {
      genre: "choix", competence: "VAL", question: "Le fabricant garantit la capacité à 10 % près. Ta mesure est-elle compatible avec cette valeur ?",
      options: ["Oui", "Non"], bonne: (m) => (ecartCapacite(m) <= 10 ? 0 : 1),
      explication: (m) => (ecartCapacite(m) <= 10 ? `Ton écart, ${nombre(ecartCapacite(m), 1)} %, est inférieur à 10 % : ta mesure est compatible.` : `Ton écart, ${nombre(ecartCapacite(m), 1)} %, dépasse 10 % : ta mesure n'est pas compatible. Reprends la lecture du temps caractéristique.`),
    },
  ],
};

// ---------- TP 4 : un capteur sur microcontrôleur ----------
const parCentimetre = (m: Mesures) => ((m.tau8 - m.tau0) / 8) * 1e6; // en microsecondes par centimètre
const TAU_MYSTERE = 310; // en microsecondes
const niveauMystere = (m: Mesures) => (TAU_MYSTERE - m.tau0 * 1e6) / parCentimetre(m);

const jauge: Tp = {
  id: "jauge", titre: "Une jauge de niveau d'eau", matiere: "physique", famille: "Capteur et microcontrôleur", fiche: 8, minutes: 25, etat: "brouillon",
  accroche: "Deux plaques dans une cuve forment un condensateur. Câble-le sur un microcontrôleur et fais-en une jauge.",
  etapes: [
    {
      genre: "lecture", titre: "La situation",
      paragraphes: [
        "Pour arroser un potager au bon moment, on veut connaître le niveau d'eau d'une cuve. Deux plaques métalliques plongent dans la cuve : elles forment un condensateur, dont la capacité augmente avec le niveau d'eau.",
        "Un microcontrôleur charge ce capteur à travers une résistance et mesure le temps caractéristique de la charge.",
        "Tu dois câbler le capteur, vérifier qu'il suit la loi annoncée, puis trouver un niveau inconnu.",
      ],
      documents: [
        { titre: "Le capteur", lignes: ["Capacité du capteur : C = C_0 + k × h, où h est le niveau d'eau en centimètres.", "Résistance du montage : R = 1,0 MΩ", "Temps caractéristique de la charge : τ = R × C"] },
        { titre: "Le microcontrôleur", lignes: ["La broche D2 fournit une tension de 5,0 V.", "La broche A0 mesure une tension par rapport à la broche GND.", "Le programme met D2 à 5,0 V, puis mesure le temps que met la tension lue sur A0 pour atteindre 63 % de 5,0 V. Il affiche ce temps : c'est τ."] },
      ],
    },
    {
      genre: "choix", competence: "APP", question: "Que mesure le microcontrôleur pour connaître le niveau d'eau ?",
      options: ["Le temps caractéristique de la charge du capteur", "La masse d'eau dans la cuve", "La température de l'eau"], bonne: 0,
      explication: "Plus il y a d'eau, plus la capacité est grande, et plus la charge est lente : τ = R × C.",
    },
    {
      genre: "choix", competence: "ANA", question: "À quelle tension, lue sur A0, le programme doit-il arrêter son chronomètre ?",
      options: ["2,5 V", "3,15 V", "5,0 V"], bonne: 1,
      explication: "À la date t = τ, la tension vaut 63 % de 5,0 V, soit 3,15 V.",
    },
    {
      genre: "choix", competence: "ANA", question: "Où branches-tu la broche A0 ?",
      options: ["Au point commun à la résistance et au capteur", "Sur la broche D2", "Sur la broche GND"], bonne: 0,
      explication: "A0 mesure la tension aux bornes du capteur : entre le point commun à la résistance et au capteur, et GND.",
    },
    {
      genre: "ordre", competence: "ANA", consigne: "Remets les étapes de la mesure dans l'ordre.",
      etapes: [
        "Câbler le montage, cuve vide.",
        "Lancer une mesure et relever τ pour la cuve vide.",
        "Ajouter de l'eau jusqu'à un niveau repéré, puis relever τ.",
        "Recommencer pour plusieurs niveaux d'eau.",
        "Comparer les valeurs de τ pour vérifier la loi du capteur.",
      ],
    },
    {
      genre: "paillasse", competence: "REA",
      consigne: "Pose les fils : touche une broche ou une borne, puis une autre. Lance ensuite une mesure pour au moins trois niveaux d'eau, dont la cuve vide et 8 cm.",
      paillasse: {
        genre: "circuit",
        reglages: {
          generateur: { plus: "d2", moins: "gnd", E: 5 },
          dipoles: [{ id: "R", genre: "resistance", bornes: ["r1", "r2"] }, { id: "C", genre: "condensateur", bornes: ["c1", "c2"] }],
          mesure: { voie: "a0", masse: null },
          R: 1e6, C: 100e-12, parCm: 40e-12, niveaux: [0, 2, 4, 6, 8], lecture: false, duree: 0.002,
        },
      },
    },
    {
      genre: "valeur", competence: "VAL", question: "Calcule la capacité du capteur quand la cuve est vide.", unite: "pF", decimales: 0, relatif: 0.02,
      aide: "C = τ / R. Une microseconde vaut 10⁻⁶ s, un picofarad vaut 10⁻¹² F.",
      attendu: (m) => (m.tau0 / 1e6) * 1e12,
      detail: (m) => `C_0 = τ / R = ${nombre(m.tau0 * 1e6, 0)} µs / 1,0 MΩ = ${nombre((m.tau0 / 1e6) * 1e12, 0)} pF.`,
    },
    {
      genre: "valeur", competence: "VAL", question: "De combien de microsecondes τ augmente-t-il pour chaque centimètre d'eau ?", unite: "µs", decimales: 0, absolu: 1,
      aide: "Compare deux mesures : divise l'écart entre les deux valeurs de τ par l'écart entre les deux niveaux.",
      attendu: parCentimetre,
      detail: (m) => `Entre la cuve vide et 8 cm : (${nombre(m.tau8 * 1e6, 0)} − ${nombre(m.tau0 * 1e6, 0)}) / 8 = ${nombre(parCentimetre(m), 0)} µs par centimètre.`,
    },
    {
      genre: "choix", competence: "VAL", question: "Tes mesures suivent-elles la loi annoncée, C = C_0 + k × h ?",
      options: ["Oui : τ augmente de la même valeur chaque fois que le niveau monte de 2 cm", "Non : τ ne change pas avec le niveau", "Non : τ double chaque fois que le niveau monte de 2 cm"], bonne: 0,
      explication: "τ augmente de 80 µs tous les 2 cm : il varie de façon affine avec le niveau, comme la capacité.",
    },
    {
      genre: "valeur", competence: "VAL", question: "Un jour, le microcontrôleur affiche τ = 310 µs. Quel est le niveau d'eau dans la cuve ?", unite: "cm", decimales: 2, absolu: 0.1,
      aide: "Pars de la valeur de τ pour la cuve vide, puis utilise l'augmentation par centimètre.",
      attendu: niveauMystere,
      detail: (m) => `h = (310 − ${nombre(m.tau0 * 1e6, 0)}) / ${nombre(parCentimetre(m), 0)} = ${nombre(niveauMystere(m), 2)} cm.`,
    },
  ],
};

export const TP: Tp[] = [detartrant, vinaigre, condensateur, jauge];

export const tp = (id: string): Tp | null => TP.find((t) => t.id === id) ?? null;
