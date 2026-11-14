import "server-only";
import { nombre } from "@/lib/commun/format";
import type { ReglagesCalorimetre } from "@/lib/commun/tp/paillasses/calorimetre";
import { variante, type Mesures, type Tp } from "./types";

const grammes = (x: number) => `${nombre(x, 1)} g`;
const joules = (x: number) => `${nombre(x, 0)} J`;

// ---------- La capacité thermique massique d'un métal, par la méthode des mélanges ----------
const C_EAU = 4.18;   // J/(g·°C)
const CAPACITE = 90;  // la capacité thermique du calorimètre et de ses accessoires, en J/°C
/** Les métaux de la table, avec leur capacité thermique massique en J/(kg·°C). */
const TABLE = [
  { nom: "aluminium", le: "l'aluminium", du: "de l'aluminium", c: 897 },
  { nom: "fer", le: "le fer", du: "du fer", c: 449 },
  { nom: "zinc", le: "le zinc", du: "du zinc", c: 388 },
  { nom: "étain", le: "l'étain", du: "de l'étain", c: 228 },
  { nom: "plomb", le: "le plomb", du: "du plomb", c: 129 },
];
const majuscule = (texte: string) => texte.charAt(0).toUpperCase() + texte.slice(1);
/** Les blocs possibles : la graine de l'essai en choisit un. Chaque masse échauffe l'eau de 8 à 9 °C. */
const BLOCS = [{ metal: 1, masse: 188.2 }, { metal: 0, masse: 96.4 }, { metal: 2, masse: 221.5 }, { metal: 3, masse: 371 }];
const FROIDS = [16.4, 17.2, 15.8, 18, 16.8];
const VASES = [87.3, 92.6, 84.1];

const reglages = (graine: number): ReglagesCalorimetre => {
  const bloc = variante(graine, BLOCS);
  return { cMetal: TABLE[bloc.metal].c, masseBloc: bloc.masse, masseVase: variante(graine, VASES), capacite: CAPACITE, froid: variante(graine, FROIDS), salle: 21, eauDemandee: 150 };
};

/** L'énergie reçue par l'eau et le calorimètre, en joules. */
const energie = (m: Mesures) => (m.m * C_EAU + CAPACITE) * (m.Tf - m.T1);
/** La capacité thermique massique du métal, en J/(kg·°C), pour un bloc de la masse donnée, sorti de l'eau à 100 °C. */
const capacite = (masse: number) => (m: Mesures) => (1000 * energie(m)) / (masse * (100 - m.Tf));
const plusProche = (c: number) => TABLE.reduce((meilleur, metal, i) => (Math.abs(metal.c - c) < Math.abs(TABLE[meilleur].c - c) ? i : meilleur), 0);

const calorimetrie: Tp = {
  id: "calorimetrie", titre: "Un métal à identifier", matiere: "physique", famille: "Calorimétrie", fiche: 5, minutes: 25, etat: "brouillon",
  accroche: "Un bloc de métal gris, sans marque. Plonge-le brûlant dans l'eau froide d'un calorimètre : l'échauffement de l'eau dit de quel métal il est fait.",
  etapes: (graine) => {
    const r = reglages(graine);
    const bloc = variante(graine, BLOCS);
    const c = capacite(bloc.masse);
    const trouve = (m: Mesures) => plusProche(c(m));
    const ecart = (m: Mesures) => (100 * Math.abs(c(m) - TABLE[trouve(m)].c)) / TABLE[trouve(m)].c;
    return [
      {
        genre: "lecture", titre: "La situation",
        paragraphes: [
          "Un atelier de fonderie récupère des chutes de métal. Un bloc gris est arrivé sans marque : aluminium, fer, zinc, étain ou plomb ?",
          "Pour le savoir sans l'abîmer, tu vas mesurer sa capacité thermique massique. Le bloc chauffe dans l'eau bouillante, puis tu le plonges dans l'eau froide d'un calorimètre.",
          "Plus le métal a une grande capacité thermique massique, plus il échauffe l'eau.",
        ],
        documents: [
          { titre: "La méthode des mélanges", lignes: ["Dans le calorimètre fermé, le bloc chaud cède de l'énergie à l'eau et au calorimètre, jusqu'à ce que tout soit à la même température θ₂.", "Énergie reçue par l'eau et le calorimètre, partis de θ₁ : Q = (m × c_eau + C) × (θ₂ − θ₁)", "Énergie cédée par le bloc, sorti de l'eau bouillante à 100 °C : Q = m_bloc × c × (100 − θ₂)", "Sans perte, ces deux énergies sont égales."] },
          { titre: "Données", lignes: [`Masse du bloc : m_bloc = ${grammes(bloc.masse)}`, "Capacité thermique massique de l'eau : c_eau = 4,18 J/(g·°C)", "Capacité thermique du calorimètre et de ses accessoires : C = 90 J/°C", "À l'air libre, le bloc chaud perd environ 1 °C toutes les 30 secondes."] },
          { titre: "Capacités thermiques massiques", lignes: TABLE.map((metal) => `${majuscule(metal.nom)} : ${nombre(metal.c, 0)} J/(kg·°C)`) },
        ],
      },
      {
        genre: "choix", competence: "APP", question: "Dans le calorimètre, qui cède de l'énergie et qui en reçoit ?",
        options: ["Le bloc en cède ; l'eau et le calorimètre en reçoivent", "L'eau en cède ; le bloc en reçoit", "Le bloc et l'eau en cèdent tous les deux à l'air de la salle", "Personne : la température ne change pas"], bonne: 0,
        explication: "Le bloc sort de l'eau bouillante : il est plus chaud que l'eau. Il se refroidit en cédant de l'énergie, que l'eau et le calorimètre reçoivent en s'échauffant.",
      },
      {
        genre: "materiel", competence: "ANA", consigne: "Choisis le matériel nécessaire pour cette mesure.",
        objets: [
          { id: "calorimetre", nom: "Calorimètre avec couvercle et agitateur", utile: true, pourquoi: "Il isole l'eau et le bloc de la salle : l'énergie cédée par le bloc reste dans l'eau." },
          { id: "becher", nom: "Bécher en verre, sans couvercle", utile: false, pourquoi: "Il laisse la chaleur s'échapper : l'énergie du bloc ne resterait pas dans l'eau." },
          { id: "balance", nom: "Balance au dixième de gramme", utile: true, pourquoi: "Elle donne la masse d'eau versée dans le vase." },
          { id: "thermometre", nom: "Thermomètre gradué au dixième de degré", utile: true, pourquoi: "L'eau ne s'échauffe que de quelques degrés : il faut lire au dixième." },
          { id: "grosthermometre", nom: "Thermomètre gradué de 5 °C en 5 °C", utile: false, pourquoi: "L'eau ne s'échauffe que de quelques degrés : ses graduations sont trop espacées." },
          { id: "pince", nom: "Pince", utile: true, pourquoi: "Elle sort le bloc de l'eau bouillante sans se brûler, et le porte d'un geste." },
          { id: "burette", nom: "Burette graduée", utile: false, pourquoi: "Elle sert aux titrages : rien n'est versé goutte à goutte ici." },
          { id: "voltmetre", nom: "Voltmètre", utile: false, pourquoi: "Aucune tension n'est mesurée." },
        ],
      },
      {
        genre: "ordre", competence: "ANA", consigne: "Remets les étapes du protocole dans l'ordre.",
        etapes: [
          "Poser le vase vide sur la balance, faire la tare, verser l'eau froide et noter sa masse.",
          "Replacer le vase dans le calorimètre, plonger le thermomètre et noter la température une fois stable.",
          "Sortir le bloc de l'eau bouillante avec la pince et le plonger aussitôt dans le calorimètre.",
          "Fermer le couvercle et agiter.",
          "Noter la température quand elle ne varie plus.",
        ],
      },
      {
        genre: "paillasse", competence: "REA",
        consigne: "Fais la mesure sur la paillasse. Tout se fait à la main : tu portes le vase, tu verses, tu lis la balance et le thermomètre, tu portes le bloc avec la pince. Le temps du laboratoire passe dix fois plus vite pendant les attentes : une lecture faite trop tôt est fausse.",
        protocole: [
          "Porter le vase du calorimètre sur la balance, appuyer sur « Tare », puis verser environ 150 g d'eau froide. Noter la masse affichée.",
          "Remettre le vase dans le calorimètre et y plonger le thermomètre. Attendre que le niveau ne bouge plus, puis noter la température.",
          "Saisir le bloc avec la pince dans l'eau bouillante, et le porter aussitôt dans le calorimètre.",
          "Poser le couvercle, puis agiter.",
          "Suivre le thermomètre. Quand le niveau ne bouge plus, noter la température finale.",
        ],
        paillasse: { genre: "calorimetre", reglages: r },
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule l'énergie reçue par l'eau et le calorimètre.", unite: "J", decimales: 0, relatif: 0.01,
        aide: "Q = (m × c_eau + C) × (θ₂ − θ₁), avec m en grammes, c_eau = 4,18 J/(g·°C) et C = 90 J/°C.",
        attendu: energie,
        detail: (m) => `Q = (${nombre(m.m, 1)} × 4,18 + 90) × (${nombre(m.Tf, 1)} − ${nombre(m.T1, 1)}) = ${nombre(m.m * C_EAU + CAPACITE, 0)} × ${nombre(m.Tf - m.T1, 1)} = ${joules(energie(m))}.`,
      },
      {
        genre: "valeur", competence: "VAL", question: "Déduis-en la capacité thermique massique du métal.", unite: "J/(kg·°C)", decimales: 0, relatif: 0.015,
        aide: "Le bloc a cédé cette énergie en passant de 100 °C à θ₂ : Q = m_bloc × c × (100 − θ₂). Exprime la masse du bloc en kilogrammes.",
        attendu: c,
        detail: (m) => `c = Q / (m_bloc × (100 − θ₂)) = ${nombre(energie(m), 0)} / (${nombre(bloc.masse / 1000, 4)} × ${nombre(100 - m.Tf, 1)}) = ${nombre(c(m), 0)} J/(kg·°C).`,
      },
      {
        genre: "choix", competence: "VAL", question: "De quel métal le bloc est-il fait ?",
        options: TABLE.map((metal) => majuscule(metal.le)), bonne: trouve,
        explication: (m) => `Ta valeur, ${nombre(c(m), 0)} J/(kg·°C), est la plus proche de celle ${TABLE[trouve(m)].du} : ${nombre(TABLE[trouve(m)].c, 0)} J/(kg·°C).${trouve(m) === bloc.metal ? "" : ` Le bloc était en réalité en ${TABLE[bloc.metal].nom} : ta manipulation a perdu de la chaleur, ou une lecture est à reprendre.`}`,
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule l'écart relatif entre ta valeur et celle de la table pour ce métal, en pourcentage.", unite: "%", decimales: 1, absolu: 0.5,
        aide: "Écart relatif : la différence entre les deux valeurs, divisée par la valeur de la table.",
        attendu: ecart,
        detail: (m) => `Écart = |${nombre(c(m), 0)} − ${nombre(TABLE[trouve(m)].c, 0)}| / ${nombre(TABLE[trouve(m)].c, 0)} = ${nombre(ecart(m), 1)} %.`,
      },
      {
        genre: "choix", competence: "VAL", question: "Si le bloc avait traîné à l'air avant d'entrer dans le calorimètre, la capacité thermique calculée aurait été :",
        options: ["Trop faible", "Trop grande", "La même"], bonne: 0,
        explication: "Le bloc entre moins chaud : il cède moins d'énergie, et la température finale est plus basse. Comme le calcul suppose toujours un départ à 100 °C, la capacité trouvée est trop faible. Oublier le couvercle a le même effet.",
      },
    ];
  },
};

export default calorimetrie;
