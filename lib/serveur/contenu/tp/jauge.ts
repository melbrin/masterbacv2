import "server-only";
import { nombre } from "@/lib/commun/format";
import { ohms } from "@/lib/commun/tp/paillasses/circuit";
import type { ReglagesMicrocontroleur } from "@/lib/commun/tp/paillasses/microcontroleur";
import { variante, type Mesures, type Tp } from "./types";

// ---------- Un capteur capacitif lu par un microcontrôleur ----------
/** Le niveau d'eau en dessous duquel l'arrosage ne doit pas se lancer, en centimètres. */
const RESERVE = 5;
/** Le nombre de niveaux d'eau à relever. */
const RELEVES = 4;
/**
 * Les situations possibles : la graine de l'essai en choisit une. Le conducteur ohmique du protocole, les constantes
 * du capteur (sa capacité cuve vide, en picofarads, et ce que chaque centimètre d'eau lui ajoute), le niveau d'eau au
 * départ, les trois conducteurs ohmiques de la boîte dans leur ordre (deux sont des pièges), et la durée affichée
 * « un matin », en microsecondes : selon la situation, il reste ou non assez d'eau pour arroser.
 */
const SITUATIONS = [
  { R: 1_000_000, C0: 100, parCm: 40, niveau: 3.4, boite: [10_000_000, 1_000_000, 100_000], matin: 310 },
  { R: 2_200_000, C0: 120, parCm: 30, niveau: 5.7, boite: [2_200_000, 220_000, 22_000_000], matin: 495 },
  { R: 1_500_000, C0: 80, parCm: 50, niveau: 2.6, boite: [150_000, 15_000_000, 1_500_000], matin: 660 },
  { R: 1_000_000, C0: 150, parCm: 25, niveau: 6.3, boite: [1_000_000, 10_000_000, 100_000], matin: 215 },
  { R: 2_200_000, C0: 100, parCm: 40, niveau: 4.5, boite: [220_000, 2_200_000, 22_000_000], matin: 748 },
  { R: 1_500_000, C0: 120, parCm: 30, niveau: 1.8, boite: [15_000_000, 150_000, 1_500_000], matin: 351 },
];
const reglages = (graine: number): ReglagesMicrocontroleur => {
  const s = variante(graine, SITUATIONS);
  return {
    boite: s.boite.map((valeur, i) => ({ id: `r${"abc"[i]}`, genre: "resistance", valeur })),
    demande: { R: s.R, releves: RELEVES },
    C0: s.C0 * 1e-12, parCm: s.parCm * 1e-12, niveau: s.niveau,
  };
};

const micros = (t: number) => `${nombre(t, 0)} µs`;
/** La capacité du capteur cuve vide, en picofarads : la durée est en microsecondes, la résistance en ohms. */
const capaciteVide = (m: Mesures) => (m.tau0 / m.R) * 1e6;
/** Ce que chaque centimètre d'eau ajoute à la durée, en microsecondes. */
const parCentimetre = (m: Mesures) => (m.tau - m.tau0) / m.h;
const niveauPour = (duree: number) => (m: Mesures) => (duree - m.tau0) / parCentimetre(m);

const jauge: Tp = {
  id: "jauge", titre: "Une jauge de niveau d'eau", matiere: "physique", famille: "Capteur et microcontrôleur", fiche: 8, minutes: 25, etat: "brouillon",
  accroche: "Deux lames dans une cuve forment un condensateur. Câble-le sur un microcontrôleur, fais monter l'eau, et fais-en une jauge.",
  etapes: (graine) => {
    const s = variante(graine, SITUATIONS);
    const R = ohms(s.R);
    const boite = [...s.boite].sort((a, b) => a - b).map(ohms);
    const matin = niveauPour(s.matin);
    return [
      {
        genre: "lecture", titre: "La situation",
        paragraphes: [
          "Au fond d'un potager, une cuve récupère l'eau de pluie pour l'arrosage automatique. Pour connaître son niveau, deux lames métalliques vernies plongent dans la cuve : elles forment un condensateur, dont la capacité augmente quand l'eau monte.",
          "Une carte à microcontrôleur charge ce capteur à travers un conducteur ohmique et chronomètre sa charge : plus il y a d'eau, plus la charge est lente.",
          `Tu dois câbler le capteur, relever la durée affichée pour plusieurs niveaux d'eau, puis t'en servir pour savoir s'il reste au moins ${RESERVE} cm d'eau un matin d'arrosage.`,
        ],
        documents: [
          { titre: "Le capteur", lignes: [
            "Capacité du capteur : C = C_0 + k × h, où h est le niveau d'eau en centimètres.",
            "Chargé à travers un conducteur ohmique de résistance R, il a pour temps caractéristique τ = R × C.",
            "À la date t = τ, la tension à ses bornes vaut 63 % de sa valeur finale.",
          ] },
          { titre: "La carte à microcontrôleur", lignes: [
            "Broche 5 V : une tension de 5,0 V en permanence. Broche GND : la masse de la carte.",
            "Broche D2 : une sortie, que le programme met à 0 V ou à 5,0 V.",
            "Broches A0 et A1 : des entrées, qui mesurent une tension par rapport à GND.",
            "Le programme : à chaque appui sur le bouton de la carte, il met D2 à 5,0 V et chronomètre le temps que met la tension lue sur A0 pour atteindre 63 % de 5,0 V. Il écrit cette durée sur le moniteur série, puis remet D2 à 0 V.",
          ] },
          { titre: "Ce que le protocole impose", lignes: [
            `Conducteur ohmique : R = ${R}. La boîte en contient trois : ${boite.join(", ")}.`,
            "Plaque d'essai : trois rangées de trous. Les trous d'une même rangée sont reliés entre eux ; un conducteur ohmique se pique à cheval sur deux rangées voisines.",
            `Relever la durée pour ${RELEVES} niveaux d'eau, de la cuve vide jusqu'à 8 cm d'eau au moins.`,
          ] },
        ],
      },
      {
        genre: "choix", competence: "APP", question: "Que mesure le programme pour connaître le niveau d'eau ?",
        options: ["La masse d'eau dans la cuve", "La durée que met le capteur à se charger", "La température de l'eau", "La résistance du conducteur ohmique"], bonne: 1,
        explication: "Plus il y a d'eau, plus la capacité du capteur est grande, et plus sa charge est lente : τ = R × C. La durée affichée suit le niveau.",
      },
      {
        genre: "valeur", competence: "ANA", question: "À quelle tension, lue sur A0, le programme arrête-t-il son chronomètre ?", unite: "V", decimales: 2, absolu: 0.03,
        aide: "Le programme attend 63 % de la tension finale. D2 charge le capteur sous 5,0 V.",
        attendu: () => 0.63 * 5,
        detail: () => "0,63 × 5,0 V = 3,15 V. À cet instant, la durée écoulée vaut τ.",
      },
      {
        genre: "choix", competence: "ANA", question: "Où branches-tu la broche A0 ?",
        options: ["Sur la rangée reliée à D2", "Sur la broche GND", "Sur la rangée commune au conducteur ohmique et au capteur", "Sur la broche 5 V"], bonne: 2,
        explication: "A0 mesure la tension aux bornes du capteur : elle se branche entre le conducteur ohmique et le capteur, et l'autre lame du capteur va à GND.",
      },
      {
        genre: "ordre", competence: "ANA", consigne: "Remets les étapes de la manipulation dans l'ordre.",
        etapes: [
          "Piquer le conducteur ohmique sur la plaque d'essai et câbler le montage : D2, le conducteur ohmique, le capteur, GND, et A0.",
          "Vider la cuve, lancer une mesure et noter la durée pour la cuve vide.",
          "Verser de l'eau et lire le niveau sur la graduation de la cuve.",
          "Lancer une mesure, puis noter le niveau et la durée dans le carnet.",
          "Recommencer pour d'autres niveaux, jusqu'à 8 cm d'eau au moins.",
        ],
      },
      {
        genre: "paillasse", competence: "REA",
        consigne: "Câble le capteur sur la carte, puis relève la durée pour plusieurs niveaux d'eau. Tout se fait à la main : tu piques le conducteur ohmique, tu tires les fils, tu verses et tu vides l'eau en maintenant l'appui, tu lis le niveau à la loupe et la durée sur le moniteur, et tu notes les deux dans ton carnet.",
        protocole: [
          `Prendre dans la boîte le conducteur ohmique de ${R} et le piquer sur la plaque d'essai, à cheval sur deux rangées. Sa valeur est écrite dessus.`,
          "Tirer un fil de la broche D2 à l'une de ces deux rangées.",
          "Relier l'autre rangée à la broche A0 et à une lame du capteur.",
          "Relier l'autre lame du capteur à la broche GND.",
          "Vider la cuve : maintenir « Vider » jusqu'à ce qu'il ne reste plus d'eau. Appuyer sur le bouton « Mesurer » de la carte.",
          "Lire la durée sur le moniteur, et noter dans le carnet le niveau, 0 cm, et cette durée.",
          "Verser de l'eau, lire le niveau à la loupe sur la graduation de la cuve, lancer une mesure, et noter le niveau et la durée.",
          `Recommencer pour avoir ${RELEVES} niveaux en tout, jusqu'à 8 cm d'eau au moins.`,
        ],
        paillasse: { genre: "microcontroleur", reglages: reglages(graine) },
      },
      {
        genre: "valeur", competence: "VAL", question: "Avec ta mesure pour la cuve vide, calcule la capacité du capteur quand il n'y a pas d'eau.", unite: "pF", decimales: 0, relatif: 0.02,
        aide: "C = τ / R. Une microseconde vaut 10⁻⁶ s, un picofarad vaut 10⁻¹² F.",
        attendu: capaciteVide,
        detail: (m) => `C_0 = τ / R = ${micros(m.tau0)} / ${ohms(m.R)} = ${nombre(capaciteVide(m), 0)} pF.`,
      },
      {
        genre: "valeur", competence: "VAL", question: "De combien de microsecondes la durée augmente-t-elle pour chaque centimètre d'eau ?", unite: "µs", decimales: 1, relatif: 0.02,
        aide: "Compare ta mesure pour la cuve vide et ta mesure au niveau le plus haut : divise l'écart entre les deux durées par l'écart entre les deux niveaux.",
        attendu: parCentimetre,
        detail: (m) => `Entre la cuve vide et ${nombre(m.h, 1)} cm : (${nombre(m.tau, 0)} − ${nombre(m.tau0, 0)}) / ${nombre(m.h, 1)} = ${nombre(parCentimetre(m), 1)} µs par centimètre.`,
      },
      {
        genre: "valeur", competence: "VAL", question: `Un matin, le moniteur affiche ${micros(s.matin)}. Quel est le niveau d'eau dans la cuve ?`, unite: "cm", decimales: 1, absolu: 0.15,
        aide: "La durée augmente régulièrement avec le niveau. Pars de la durée pour la cuve vide, puis utilise l'augmentation par centimètre.",
        attendu: matin,
        detail: (m) => `h = (${nombre(s.matin, 0)} − ${nombre(m.tau0, 0)}) / ${nombre(parCentimetre(m), 1)} = ${nombre(matin(m), 1)} cm.`,
      },
      {
        genre: "choix", competence: "VAL", question: `L'arrosage ne doit se lancer que s'il reste au moins ${RESERVE} cm d'eau dans la cuve. Ce matin-là, peut-il se lancer ?`,
        options: ["Oui", "Non"], bonne: (m) => (matin(m) >= RESERVE ? 0 : 1),
        explication: (m) => (matin(m) >= RESERVE
          ? `D'après tes mesures, il reste ${nombre(matin(m), 1)} cm d'eau : c'est au moins ${RESERVE} cm, l'arrosage peut se lancer.`
          : `D'après tes mesures, il ne reste que ${nombre(matin(m), 1)} cm d'eau : c'est moins de ${RESERVE} cm, l'arrosage ne doit pas se lancer.`),
      },
    ];
  },
};

export default jauge;
