import "server-only";
import { nombre, nombreRelatif } from "@/lib/commun/format";
import { G, reference, type ReglagesPointage } from "@/lib/commun/tp/paillasses/pointage";
import { variante, type Mesures, type Tp } from "./types";

// ---------- Une chute filmée : le pointage d'une vidéo, la vitesse verticale, l'énergie mécanique ----------
/** La variation de l'énergie mécanique, en pourcentage, sous laquelle on néglige les frottements de l'air. */
const SEUIL = 5;
/** Les films possibles : la graine de l'essai en choisit un. Deux balles tombent en chute libre ; l'air freine les deux autres. */
const FILMS: { recit: string; nom: string; reglages: Omit<ReglagesPointage, "etalon" | "dt"> }[] = [
  { recit: "une balle de golf lâchée sans vitesse, du haut d'un escabeau", nom: "une balle de golf", reglages: { balle: "la balle de golf", rayon: 0.0215, couleur: "#F3ECE6", masse: 46, x0: 0.8, y0: 1.85, vx: 0, vy: 0, limite: 0, images: 15 } },
  { recit: "une boule de polystyrène lâchée sans vitesse, du haut d'un escabeau", nom: "une boule de polystyrène", reglages: { balle: "la boule de polystyrène", rayon: 0.03, couleur: "#BFD9F2", masse: 2, x0: 0.8, y0: 1.8, vx: 0, vy: 0, limite: 4.6, images: 16 } },
  { recit: "une balle de tennis lancée en cloche", nom: "une balle de tennis", reglages: { balle: "la balle de tennis", rayon: 0.033, couleur: "#D9E26A", masse: 58, x0: 0.35, y0: 0.5, vx: 1.7, vy: 3.6, limite: 0, images: 16 } },
  { recit: "une balle en mousse lancée en cloche", nom: "une balle en mousse", reglages: { balle: "la balle en mousse", rayon: 0.035, couleur: "#F0948A", masse: 4, x0: 0.35, y0: 0.45, vx: 2.2, vy: 4.2, limite: 6, images: 16 } },
];
/** Les longueurs possibles de l'étalon, en mètres. */
const ETALONS = [1, 0.8, 0.5];
/** La caméra filme 25 images par seconde. */
const DUREE = 0.04;
const film = (graine: number) => variante(graine, FILMS);
const reglages = (graine: number): ReglagesPointage => ({ ...film(graine).reglages, dt: DUREE, etalon: variante(graine, ETALONS) });

const ecartPente = (m: Mesures) => (100 * Math.abs(Math.abs(m.pente) - G)) / G;
const variation = (m: Mesures) => (m.Em0 > 0 ? (100 * Math.abs(m.Em1 - m.Em0)) / m.Em0 : 100);

const chute: Tp = {
  id: "chute", titre: "Une chute filmée", matiere: "physique", famille: "Mécanique, pointage vidéo", fiche: 1, minutes: 25, etat: "brouillon",
  accroche: "Une balle filmée devant un étalon. Pointe-la image par image, trace sa vitesse et son énergie, et dis si l'air la freine.",
  etapes: (graine) => {
    const r = reglages(graine);
    const { recit, nom } = film(graine);
    const ideal = reference(r);
    const etalon = `${nombre(r.etalon, 2)} m`;
    return [
      {
        genre: "lecture", titre: "La situation",
        paragraphes: [
          `En cours de sport, on a filmé ${recit}. La caméra était fixe, face au mur. Une règle étalon de ${etalon} était posée contre ce mur, debout sur le sol.`,
          "On veut savoir si l'air freine cette balle, ou si l'on peut négliger ses frottements : le mouvement serait alors une chute libre.",
          "Tu dois exploiter la vidéo avec un logiciel de pointage : étalonner l'image, pointer la balle sur chaque image, puis étudier sa vitesse verticale et son énergie mécanique.",
        ],
        documents: [
          { titre: "La vidéo", lignes: ["La caméra filme 25 images par seconde.", `Contre le mur : un étalon de ${etalon}, debout sur le sol.`, `La balle : ${nom}, de masse ${nombre(r.masse, 0)} g.`] },
          { titre: "Une chute libre", lignes: ["La balle n'est soumise qu'à son poids.", "Avec un axe vertical orienté vers le haut, sa vitesse verticale v_y est une fonction affine du temps, de pente −g.", "Intensité de la pesanteur : g = 9,81 m/s²."] },
          { titre: "Les énergies", lignes: ["Énergie cinétique : E_c = ½ × m × v².", "Énergie potentielle de pesanteur : E_pp = m × g × y, où y est l'altitude au-dessus du sol.", "Énergie mécanique : E_m = E_c + E_pp. Elle se conserve quand les frottements sont négligeables."] },
        ],
      },
      {
        genre: "choix", competence: "APP", question: "Si les frottements de l'air sont négligeables, que doit montrer l'exploitation de la vidéo ?",
        options: [
          "La vitesse verticale suit une droite de pente −g, et l'énergie mécanique reste constante",
          "La vitesse verticale reste constante, et l'énergie mécanique diminue",
          "La vitesse verticale suit une droite de pente −g, et l'énergie mécanique diminue",
          "L'énergie cinétique reste constante",
        ], bonne: 0,
        explication: "Sans frottement, la balle n'est soumise qu'à son poids. Son accélération vaut g : sa vitesse verticale perd 9,81 m/s chaque seconde. Et son énergie mécanique se conserve.",
      },
      {
        genre: "valeur", competence: "APP", question: "La caméra filme 25 images par seconde. Quelle durée sépare deux images ?", unite: "ms", decimales: 0, absolu: 0.5,
        aide: "Une seconde est partagée en 25 intervalles égaux. Une seconde vaut 1 000 ms.",
        attendu: () => 1000 * DUREE,
        detail: () => "1 s / 25 = 0,040 s, soit 40 ms.",
      },
      {
        genre: "materiel", competence: "ANA", consigne: "Choisis ce qu'il faut pour filmer un mouvement que l'on pourra exploiter.",
        objets: [
          { id: "camera", nom: "Caméra sur un pied, face au mur", utile: true, pourquoi: "La caméra ne doit pas bouger : le repère est lié à l'image." },
          { id: "chronometre", nom: "Chronomètre", utile: false, pourquoi: "La vidéo donne le temps : 40 ms entre deux images." },
          { id: "etalon", nom: "Règle étalon, contre le mur", utile: true, pourquoi: "Elle donne l'échelle : sans elle, les distances de l'image ne sont pas en mètres." },
          { id: "main", nom: "Caméra tenue à la main, qui suit la balle", utile: false, pourquoi: "Si la caméra bouge, les positions pointées ne veulent plus rien dire." },
          { id: "balance", nom: "Balance", utile: true, pourquoi: "La masse de la balle sert à calculer ses énergies." },
          { id: "dynamometre", nom: "Dynamomètre", utile: false, pourquoi: "On ne mesure aucune force ici." },
          { id: "logiciel", nom: "Logiciel de pointage", utile: true, pourquoi: "Il enregistre la position de la balle sur chaque image et calcule les vitesses." },
          { id: "thermometre", nom: "Thermomètre", utile: false, pourquoi: "La température ne joue pas dans cette étude." },
        ],
      },
      {
        genre: "choix", competence: "ANA", question: "Où doit se trouver l'étalon pour que l'échelle soit juste ?",
        options: ["Dans le plan du mouvement de la balle", "Le plus près possible de la caméra", "N'importe où, pourvu qu'il soit dans l'image"], bonne: 0,
        explication: "Un objet plus proche de la caméra paraît plus grand. L'étalon et la balle doivent être à la même distance de la caméra pour avoir la même échelle.",
      },
      {
        genre: "ordre", competence: "ANA", consigne: "Remets les étapes de l'exploitation dans l'ordre.",
        etapes: [
          "Étalonner l'image : placer les deux repères sur les bouts de l'étalon et indiquer sa longueur.",
          "Poser l'origine du repère sur le sol.",
          "Pointer le centre de la balle sur chaque image.",
          "Tracer la vitesse verticale et ajuster une droite sur ses points.",
          "Tracer les énergies et relever l'énergie mécanique au début et à la fin.",
        ],
        // l'origine avant l'échelle, ou les énergies avant la vitesse : ces ordres conviennent aussi
        autres: [[1, 0, 2, 3, 4], [0, 1, 2, 4, 3], [1, 0, 2, 4, 3]],
      },
      {
        genre: "paillasse", competence: "REA",
        consigne: "Exploite la vidéo. Tout se fait à la main : tu glisses les repères, tu pointes la balle du doigt en regardant la loupe, tu règles la droite sur tes points. Ce sont tes pointés qui servent aux calculs.",
        protocole: [
          // la longueur et son unité ne se séparent pas en fin de ligne
          `Échelle : glisser les deux repères sur les deux bouts de l'étalon, puis dire sa longueur (${nombre(r.etalon, 2)}\u00a0m).`,
          "Origine : glisser l'origine du repère sur le sol, au pied de l'étalon.",
          "Pointage : sur chaque image, viser le centre de la balle en regardant la loupe. Ne sauter aucune image.",
          "Courbes, vitesse verticale : régler les deux bouts de la droite pour qu'elle passe au milieu des points, puis la garder.",
          "Courbes, énergies : placer le repère sur le premier point, lire l'énergie mécanique et la noter. Recommencer sur le dernier point.",
        ],
        paillasse: { genre: "pointage", reglages: r },
      },
      {
        genre: "valeur", competence: "VAL", question: "Compare la pente de ta droite à g : calcule l'écart relatif entre sa valeur absolue et 9,81 m/s², en pourcentage.", unite: "%", decimales: 1, absolu: 0.3,
        aide: "Écart relatif : la différence entre les deux valeurs, divisée par 9,81.",
        attendu: ecartPente,
        detail: (m) => `Écart = |${nombre(Math.abs(m.pente), 2)} − 9,81| / 9,81 = ${nombre(ecartPente(m), 1)} %.`,
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule la variation relative de l'énergie mécanique entre le début et la fin du mouvement, en pourcentage.", unite: "%", decimales: 1, absolu: 0.3,
        aide: "Variation relative : la différence entre les deux énergies, divisée par l'énergie du début.",
        attendu: variation,
        detail: (m) => `Variation = |${nombre(m.Em1, 1)} − ${nombre(m.Em0, 1)}| / ${nombre(m.Em0, 1)} = ${nombre(variation(m), 1)} %.`,
      },
      {
        genre: "choix", competence: "VAL", question: `On néglige les frottements de l'air quand l'énergie mécanique varie de moins de 5 %. D'après tes mesures, peut-on les négliger pour ${r.balle} ?`,
        options: ["Oui : c'est une chute libre", "Non : l'air freine la balle"], bonne: (m) => (variation(m) <= SEUIL ? 0 : 1),
        explication: (m) => {
          const attendue = variation({ Em0: ideal.Em0, Em1: ideal.Em1 });
          return `Ton énergie mécanique varie de ${nombre(variation(m), 1)} % : ${variation(m) <= SEUIL ? "c'est moins que 5 %, les frottements sont négligeables" : "c'est plus que 5 %, les frottements ne sont pas négligeables"}. Un pointage sans défaut donne une variation de ${nombre(attendue, 1)} %, et une pente de ${nombreRelatif(ideal.pente, 2)} m/s² pour la vitesse verticale.`;
        },
      },
    ];
  },
};

export default chute;
