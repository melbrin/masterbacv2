import "server-only";
import { nombre } from "@/lib/commun/format";
import type { ReglagesDiffraction } from "@/lib/commun/tp/paillasses/diffraction";
import { variante, type Mesures, type Tp } from "./types";

// ---------- Le diamètre d'un cheveu, par diffraction ----------
/** La longueur d'onde du laser, en nanomètres, et la distance de la diapositive à l'écran que donne le protocole, en centimètres. */
const LAMBDA = 650;
const DISTANCE = 150;
/** Les trois fentes de l'étalonnage : leur largeur, en micromètres. */
const FENTES = [40, 60, 100];
/** Les diamètres possibles du cheveu, en micromètres : la graine de l'essai en choisit un. Deux sont fins, deux moyens, deux épais. */
const CHEVEUX = [52, 68, 91, 57, 74, 86];
/** Les limites des trois catégories de cheveux, en micromètres. */
const FIN = 60, EPAIS = 80;

const reglages = (graine: number): ReglagesDiffraction => ({
  lambda: LAMBDA, rail: 200, ecran: 100,
  boite: [
    { id: "f100", genre: "fente", a: 100, b: 0, nom: "la fente de 100 µm", etiquette: ["fente", "100 µm"] },
    { id: "y30", genre: "young", a: 30, b: 0.3, nom: "la diapositive à deux fentes", etiquette: ["2 fentes", "0,30 mm"] },
    { id: "f40", genre: "fente", a: 40, b: 0, nom: "la fente de 40 µm", etiquette: ["fente", "40 µm"] },
    { id: "cheveu", genre: "fil", a: variante(graine, CHEVEUX), b: 0, nom: "le cheveu", etiquette: ["cheveu"] },
    { id: "f60", genre: "fente", a: 60, b: 0, nom: "la fente de 60 µm", etiquette: ["fente", "60 µm"] },
    { id: "f200", genre: "fente", a: 200, b: 0, nom: "la fente de 200 µm", etiquette: ["fente", "200 µm"] },
  ],
  but: { genre: "etalonnage", fentes: FENTES.map((a) => `f${a}`), inconnue: "cheveu", distance: DISTANCE },
});

// ce que l'élève calcule à partir de ses mesures : les largeurs L en millimètres, les fentes en micromètres
const produits = (m: Mesures) => FENTES.map((a, k) => m[`L${k + 1}`] * a);
const constante = (m: Mesures) => produits(m).reduce((s, p) => s + p, 0) / FENTES.length;
const diametre = (m: Mesures) => constante(m) / m.Lx;
/** k = 2 λ D, avec λ en micromètres et D en millimètres : des millimètres fois des micromètres. */
const theorique = (m: Mesures) => 2 * (LAMBDA / 1000) * (m.D * 10);
const ecart = (m: Mesures) => (100 * Math.abs(constante(m) - theorique(m))) / theorique(m);
const categorie = (a: number) => (a < FIN ? 0 : a <= EPAIS ? 1 : 2);
const NOMS = ["fin", "moyen", "épais"];
const PLURIELS = ["fins", "moyens", "épais"];

const cheveu: Tp = {
  id: "cheveu", titre: "Le diamètre d'un cheveu", matiere: "physique", famille: "Diffraction", fiche: 6, minutes: 25, etat: "brouillon",
  accroche: "Un cheveu est trop fin pour une règle. Étalonne la figure de diffraction avec trois fentes connues, puis mesure-le au laser.",
  etapes: (graine) => [
    {
      genre: "lecture", titre: "La situation",
      paragraphes: [
        `Un laboratoire de soins capillaires classe les cheveux en trois catégories : fins, de diamètre inférieur à ${FIN} µm ; moyens, de ${FIN} à ${EPAIS} µm ; épais, au-delà de ${EPAIS} µm.`,
        "On t'a confié un cheveu, tendu dans une monture de diapositive. Tu dois mesurer son diamètre pour le classer.",
        "Aucune règle n'est assez fine. Mais éclairé par un laser, un cheveu donne la même figure de diffraction qu'une fente de même largeur. Tu étalonnes donc la figure avec trois fentes de largeurs connues, puis tu mesures celle du cheveu.",
      ],
      documents: [
        { titre: "La diffraction par une fente", lignes: ["Un laser éclaire une fente fine, de largeur a. Sur un écran placé à la distance D, on voit une tache centrale très lumineuse, bordée de taches plus petites.", "Largeur de la tache centrale, d'une extinction à l'autre : L = 2 λ D / a", "Pour un laser et une distance fixés, L est proportionnelle à 1/a : L = k / a, avec k = 2 λ D.", "Un fil donne la même figure qu'une fente de même largeur."] },
        { titre: "Le matériel", lignes: [`Un laser rouge : λ = ${LAMBDA} nm`, `Trois fentes de largeurs connues : ${FENTES.join(" µm, ")} µm`, "Un écran gradué en millimètres, avec deux curseurs", "Un rail gradué en millimètres : son zéro est sous la diapositive."] },
        { titre: "La sécurité", lignes: ["Le faisceau d'un laser ne doit jamais atteindre un œil, même par reflet.", "On fixe le laser sur son support, face à l'écran, avant de l'allumer.", "On l'éteint avant de déplacer quoi que ce soit : le laser, l'écran, une diapositive. Les mains ne passent pas dans le faisceau."] },
      ],
    },
    {
      genre: "choix", competence: "APP", question: "Pourquoi peut-on mesurer un cheveu avec des fentes ?",
      options: ["Un cheveu donne la même figure de diffraction qu'une fente de même largeur", "Un cheveu laisse passer la lumière comme une fente", "Les fentes ont été découpées avec un cheveu", "Le laser grossit l'image du cheveu sur l'écran"], bonne: 0,
      explication: "Un fil et une fente de même largeur diffractent la lumière de la même façon. Si la tache du cheveu a la largeur de celle d'une fente de 70 µm, le cheveu mesure 70 µm.",
    },
    {
      genre: "choix", competence: "ANA", question: "Sans toucher au laser ni à l'écran, tu remplaces une fente par une fente deux fois plus étroite. Que devient la tache centrale ?",
      options: ["Elle devient deux fois plus large", "Elle devient deux fois plus étroite", "Elle garde la même largeur", "Elle disparaît"], bonne: 0,
      explication: "L = k / a : la largeur de la tache est inversement proportionnelle à celle de la fente. Plus la fente est étroite, plus la lumière s'étale.",
    },
    {
      genre: "materiel", competence: "ANA", consigne: "Choisis le matériel nécessaire pour étalonner la figure, puis mesurer le cheveu.",
      objets: [
        { id: "laser", nom: "Laser", utile: true, pourquoi: "Sa lumière n'a qu'une longueur d'onde, et son faisceau est fin : la figure est nette." },
        { id: "lampe", nom: "Lampe blanche", utile: false, pourquoi: "Sa lumière mélange toutes les longueurs d'onde : les taches se recouvrent et se brouillent." },
        { id: "fentes", nom: "Fentes de largeurs connues", utile: true, pourquoi: "Elles servent à l'étalonnage : on mesure la tache que donne chaque largeur connue." },
        { id: "young", nom: "Diapositive à deux fentes", utile: false, pourquoi: "Deux fentes donnent des franges d'interférences : ce n'est pas la figure qu'on étalonne ici." },
        { id: "ecran", nom: "Écran gradué, avec deux curseurs", utile: true, pourquoi: "La figure s'y forme, et les curseurs repèrent les deux extinctions qui bordent la tache centrale." },
        { id: "lentille", nom: "Lentille convergente", utile: false, pourquoi: "La figure s'observe directement sur un écran éloigné : aucune lentille n'est nécessaire." },
        { id: "rail", nom: "Rail gradué", utile: true, pourquoi: "Il donne la distance entre la diapositive et l'écran, qui ne doit pas changer pendant l'étalonnage." },
      ],
    },
    {
      genre: "ordre", competence: "ANA", consigne: "Remets les étapes du protocole dans l'ordre.",
      etapes: [
        "Fixer le laser sur son support, face à l'écran, sans l'allumer.",
        "Placer l'écran à la distance voulue de la diapositive, et noter cette distance.",
        "Glisser une fente connue dans le support, allumer le laser et mesurer la largeur de la tache centrale.",
        "Éteindre le laser, puis recommencer avec les autres fentes connues, sans déplacer l'écran.",
        "Remplacer la fente par le cheveu et mesurer la largeur de sa tache centrale.",
      ],
      // placer l'écran avant d'installer le laser convient aussi
      autres: [[1, 0, 2, 3, 4]],
    },
    {
      genre: "paillasse", competence: "REA",
      consigne: "Mesure la tache centrale de chaque fente, puis celle du cheveu. Tout se fait à la main : tu fixes le laser avant de l'allumer, tu places l'écran, tu glisses les diapositives dans le support, tu poses les deux curseurs sur les extinctions. Le laser s'éteint avant de déplacer quoi que ce soit.",
      protocole: [
        "Fixer le laser sur son support, face à l'écran, sans l'allumer.",
        `Placer l'écran à ${DISTANCE} cm de la diapositive, ou un peu plus loin : le glisser sur le rail, puis noter la distance lue à la loupe. Ne plus y toucher.`,
        `Glisser la fente de ${FENTES[0]} µm dans le support, puis allumer le laser. Poser un curseur dans chacune des deux zones sombres qui bordent la tache centrale. Noter la mesure : de près, finir de placer chaque curseur au milieu de sa zone sombre, puis lire la distance entre les deux.`,
        `Éteindre le laser avant de changer de diapositive. Recommencer avec les fentes de ${FENTES[1]} µm et de ${FENTES[2]} µm, sans déplacer l'écran.`,
        "Éteindre le laser, remplacer la fente par le cheveu, et mesurer sa tache centrale de la même façon.",
        "Éteindre le laser : la manipulation est finie.",
      ],
      paillasse: { genre: "diffraction", reglages: reglages(graine) },
    },
    {
      genre: "valeur", competence: "VAL", question: "Calcule le produit L × a pour chacune des trois fentes, puis la moyenne k de ces trois produits.", unite: "mm·µm", decimales: 0, relatif: 0.01,
      aide: "Garde L en millimètres et a en micromètres : le produit est en mm·µm. Si L = k / a, les trois produits sont presque égaux.",
      attendu: constante,
      detail: (m) => `${FENTES.map((a, k) => `${nombre(m[`L${k + 1}`], 1)} × ${a} = ${nombre(produits(m)[k], 0)}`).join(" ; ")}. Moyenne : k = ${nombre(constante(m), 0)} mm·µm.`,
    },
    {
      genre: "valeur", competence: "VAL", question: "Déduis-en le diamètre du cheveu.", unite: "µm", decimales: 1, relatif: 0.015,
      aide: "Le cheveu suit la même loi que les fentes : L = k / a, donc a = k / L.",
      attendu: diametre,
      detail: (m) => `a = k / L = ${nombre(constante(m), 0)} / ${nombre(m.Lx, 1)} = ${nombre(diametre(m), 1)} µm.`,
    },
    {
      genre: "valeur", competence: "VAL", question: "Vérifie ton étalonnage : calcule l'écart relatif, en pourcentage, entre ton k et la valeur théorique 2 λ D.", unite: "%", decimales: 1, absolu: 0.3,
      aide: `Avec λ en micromètres et D en millimètres, 2 λ D est en mm·µm, comme ton k. Ici, λ = ${nombre(LAMBDA / 1000, 3)} µm.`,
      attendu: ecart,
      detail: (m) => `2 λ D = 2 × ${nombre(LAMBDA / 1000, 3)} µm × ${nombre(m.D * 10, 0)} mm = ${nombre(theorique(m), 0)} mm·µm. Écart = |${nombre(constante(m), 0)} − ${nombre(theorique(m), 0)}| / ${nombre(theorique(m), 0)} = ${nombre(ecart(m), 1)} %. ${ecart(m) <= 3 ? "Ton étalonnage s'accorde avec la loi de la diffraction." : "L'écart est grand : une mesure de tache ou de distance est à revoir."}`,
    },
    {
      genre: "choix", competence: "VAL", question: "D'après ta mesure, dans quelle catégorie ranges-tu ce cheveu ?",
      options: [`Fin : moins de ${FIN} µm`, `Moyen : de ${FIN} à ${EPAIS} µm`, `Épais : plus de ${EPAIS} µm`], bonne: (m) => categorie(diametre(m)),
      explication: (m) => {
        const vrai = variante(graine, CHEVEUX);
        const sien = categorie(diametre(m));
        return `Ton diamètre, ${nombre(diametre(m), 1)} µm, classe ce cheveu parmi les cheveux ${PLURIELS[sien]}.${categorie(vrai) === sien ? "" : ` Une manipulation sans défaut donne ${vrai} µm, un cheveu ${NOMS[categorie(vrai)]} : si la tienne a eu des fautes, refais tes mesures avec plus de soin.`}`;
      },
    },
  ],
};

export default cheveu;
