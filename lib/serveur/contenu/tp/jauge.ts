import "server-only";
import { nombre } from "@/lib/commun/format";
import type { Mesures, Tp } from "./types";

// ---------- TP 4 : un capteur sur microcontrôleur ----------
const parCentimetre = (m: Mesures) => ((m.tau8 - m.tau0) / 8) * 1e6; // en microsecondes par centimètre
const TAU_MYSTERE = 310; // en microsecondes
const niveauMystere = (m: Mesures) => (TAU_MYSTERE - m.tau0 * 1e6) / parCentimetre(m);

const jauge: Tp = {
  id: "jauge", titre: "Une jauge de niveau d'eau", matiere: "physique", famille: "Capteur et microcontrôleur", fiche: 8, minutes: 25, etat: "brouillon",
  accroche: "Deux plaques dans une cuve forment un condensateur. Câble-le sur un microcontrôleur et fais-en une jauge.",
  etapes: () => [
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
      protocole: [
        "Câbler le montage, cuve vide.",
        "Lancer une mesure et relever τ pour la cuve vide.",
        "Ajouter de l'eau jusqu'à un niveau repéré, puis relever τ.",
        "Recommencer pour plusieurs niveaux d'eau.",
        "Comparer les valeurs de τ pour vérifier la loi du capteur.",
      ],
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

export default jauge;
