import "server-only";
import { nombre } from "@/lib/commun/format";
import type { ReglagesCcm } from "@/lib/commun/tp/paillasses/ccm";
import { M, RHO, type ReglagesReflux } from "@/lib/commun/tp/paillasses/reflux";
import { variante, type Mesures, type Tp } from "./types";

const g = (x: number, d = 2) => `${nombre(x, d)} g`;
const cm = (x: number) => `${nombre(x, 2)} cm`;

// ---------- La synthèse d'un ester, son rendement, puis le contrôle du produit par chromatographie ----------
/**
 * Les situations possibles : la graine de l'essai en choisit une. Les volumes des réactifs et la durée du chauffage
 * fixent le rendement ; avec un petit excès d'acide, il reste assez d'alcool dans le produit pour que la chromatographie
 * le détecte. Les rapports frontaux changent avec les proportions de l'éluant.
 */
const SITUATIONS = [
  { Va: 10, Vc: 20, duree: 30, recuperation: 0.9, becher: 52.37, rfReactif: 0.3, rfProduit: 0.68, reste: false },
  { Va: 10, Vc: 12, duree: 30, recuperation: 0.88, becher: 48.62, rfReactif: 0.26, rfProduit: 0.62, reste: true },
  { Va: 20, Vc: 25, duree: 40, recuperation: 0.92, becher: 55.14, rfReactif: 0.34, rfProduit: 0.72, reste: true },
  { Va: 10, Vc: 25, duree: 30, recuperation: 0.86, becher: 50.81, rfReactif: 0.28, rfProduit: 0.66, reste: false },
];
const ALCOOL = "alcool benzylique", ACIDE = "acide éthanoïque", ESTER = "éthanoate de benzyle";
const reflux = (graine: number): ReglagesReflux => {
  const s = variante(graine, SITUATIONS);
  return { Va: s.Va, Vc: s.Vc, duree: s.duree, recuperation: s.recuperation, becher: s.becher, noms: { alcool: ALCOOL, acide: ACIDE, ester: ESTER } };
};
const plaque = (graine: number): ReglagesCcm => {
  const s = variante(graine, SITUATIONS);
  return { rfReactif: s.rfReactif, rfProduit: s.rfProduit, reste: s.reste, noms: { reactif: ALCOOL, produit: ESTER, eluant: "cyclohexane et éthanoate d'éthyle" } };
};
/** La quantité d'alcool engagée, et la masse d'ester qu'elle donnerait si la transformation était totale. */
const quantiteAlcool = (Va: number) => (RHO.alcool * Va) / M.alcool;
const masseMaximale = (Va: number) => quantiteAlcool(Va) * M.ester;
const rendement = (m: Mesures, Va: number) => (100 * m.m) / masseMaximale(Va);

const synthese: Tp = {
  id: "synthese", titre: "Un parfum de jasmin", matiere: "chimie", famille: "Synthèse organique", fiche: 13, minutes: 30, etat: "brouillon",
  accroche: "L'éthanoate de benzyle donne au jasmin son odeur. Fabrique-le par chauffage à reflux, pèse-le, puis contrôle-le par chromatographie.",
  etapes: (graine) => {
    const s = variante(graine, SITUATIONS);
    const Va = `${nombre(s.Va, 1)} mL`;
    const Vc = `${nombre(s.Vc, 0)} mL`;
    return [
      {
        genre: "lecture", titre: "La situation",
        paragraphes: [
          "Une savonnerie artisanale veut parfumer ses savons au jasmin sans acheter d'arôme tout fait. L'espèce qui donne son odeur à la fleur est l'éthanoate de benzyle : elle se prépare à partir d'alcool benzylique et d'acide éthanoïque.",
          "Tu réalises cette synthèse au laboratoire, par chauffage à reflux. Tu isoles ensuite le produit et tu le pèses, pour calculer le rendement.",
          "Enfin, tu contrôles ton produit par chromatographie sur couche mince : contient-il bien l'espèce attendue, et reste-t-il du réactif ?",
        ],
        documents: [
          { titre: "La synthèse", lignes: [
            "Équation de la réaction : C₇H₈O + C₂H₄O₂ ⇌ C₉H₁₀O₂ + H₂O (alcool benzylique + acide éthanoïque ⇌ éthanoate de benzyle + eau)",
            `Réactifs : ${Va} d'alcool benzylique et ${Vc} d'acide éthanoïque. L'acide éthanoïque est en excès.`,
            `La transformation est lente et limitée. Quelques gouttes d'acide sulfurique la catalysent, et on chauffe à reflux pendant ${s.duree} min.`,
            "Sécurité : l'acide éthanoïque et l'acide sulfurique sont corrosifs, les vapeurs sont inflammables. Blouse, lunettes, gants, et aucune flamme.",
          ] },
          { titre: "Données", lignes: [
            "Alcool benzylique : masse molaire 108 g/mol ; masse volumique 1,04 g/mL",
            "Acide éthanoïque : masse molaire 60,0 g/mol ; masse volumique 1,05 g/mL",
            "Éthanoate de benzyle : masse molaire 150 g/mol ; masse volumique 1,06 g/mL ; très peu soluble dans l'eau",
            "Eau salée, pour le lavage : masse volumique 1,15 g/mL. Les acides s'y dissolvent.",
          ] },
          { titre: "Le contrôle par chromatographie", lignes: [
            "Trois dépôts sur la plaque : A, l'alcool benzylique ; P, le produit synthétisé ; R, l'éthanoate de benzyle du commerce.",
            "Éluant : un mélange de cyclohexane et d'éthanoate d'éthyle. Les taches, incolores, se révèlent sous une lampe UV.",
            "Rapport frontal d'une espèce : R_f = h / H. On mesure depuis la ligne de dépôt : h jusqu'au centre de la tache, H jusqu'au front de l'éluant.",
          ] },
        ],
      },
      {
        genre: "choix", competence: "APP", question: "Pourquoi chauffe-t-on le mélange à reflux ?",
        options: [
          "Pour accélérer la transformation sans perdre de matière",
          "Pour augmenter le rendement : chauffer déplace l'équilibre vers l'ester",
          "Pour évaporer l'eau qui se forme",
          "Pour éliminer l'acide sulfurique",
        ], bonne: 0,
        explication: "La température est un facteur cinétique : chauffer accélère la transformation. Le réfrigérant condense les vapeurs, qui retombent dans le ballon : on chauffe sans rien perdre. Chauffer ne change pas le rendement d'une estérification.",
      },
      {
        genre: "materiel", competence: "ANA", consigne: "Choisis le matériel de la synthèse par chauffage à reflux.",
        objets: [
          { id: "ballon", nom: "Ballon de 100 mL", utile: true, pourquoi: "Il contient le mélange réactionnel." },
          { id: "chauffe", nom: "Chauffe-ballon", utile: true, pourquoi: "Il chauffe sans flamme : les vapeurs sont inflammables." },
          { id: "bec", nom: "Bec Bunsen", utile: false, pourquoi: "Aucune flamme près de vapeurs inflammables." },
          { id: "refrigerant", nom: "Réfrigérant à boules", utile: true, pourquoi: "Il condense les vapeurs, qui retombent dans le ballon." },
          { id: "bouchon", nom: "Bouchon pour fermer le haut du réfrigérant", utile: false, pourquoi: "Le haut du réfrigérant reste ouvert : sinon la pression monte dans le montage." },
          { id: "support", nom: "Support élévateur", utile: true, pourquoi: "On le descend pour écarter tout de suite le chauffe-ballon." },
          { id: "ponce", nom: "Pierre ponce", utile: true, pourquoi: "Elle régularise l'ébullition et évite les projections." },
          { id: "pipette", nom: `Pipette jaugée de ${Va}`, utile: true, pourquoi: "Elle prélève avec précision le réactif limitant, celui dont dépend le rendement." },
          { id: "burette", nom: "Burette graduée", utile: false, pourquoi: "Elle sert aux titrages." },
          { id: "ampoule", nom: "Ampoule à décanter", utile: true, pourquoi: "Elle sépare la phase organique, qui contient l'ester, de la phase aqueuse." },
        ],
      },
      {
        genre: "ordre", competence: "ANA", consigne: "Remets les étapes de la synthèse dans l'ordre.",
        etapes: [
          "Mettre la blouse, les lunettes et les gants.",
          "Verser dans le ballon l'alcool benzylique, l'acide éthanoïque, la pierre ponce et quelques gouttes d'acide sulfurique.",
          "Fixer le ballon dans le chauffe-ballon, le surmonter du réfrigérant, puis faire circuler l'eau.",
          "Chauffer à reflux pendant la durée prévue.",
          "Couper le chauffage, descendre le support élévateur et laisser refroidir.",
          "Séparer la phase organique dans l'ampoule à décanter, puis la peser.",
        ],
      },
      {
        genre: "paillasse", competence: "REA",
        consigne: "Réalise la synthèse sur la paillasse. Elle a trois postes : la préparation, le montage, la séparation. Tout se fait à la main, et rien n'est interdit : à toi de suivre le protocole.",
        protocole: [
          "Mettre la blouse, les lunettes et les gants avant de toucher au premier flacon.",
          `Prélever ${Va} d'alcool benzylique à la pipette jaugée, le bas du ménisque sur le trait de jauge, et les verser dans le ballon.`,
          `Mesurer ${Vc} d'acide éthanoïque à l'éprouvette graduée, en lisant le niveau à la loupe, et les verser dans le ballon.`,
          "Ajouter quelques grains de pierre ponce, puis cinq gouttes d'acide sulfurique.",
          "Au poste du montage : poser le support élévateur, puis le chauffe-ballon. Fixer une pince sur la potence, y placer le ballon, et monter le support jusqu'à ce que le chauffe-ballon entoure le ballon.",
          "Poser le réfrigérant à boules sur le ballon, et le tenir par la seconde pince.",
          "Brancher les deux tuyaux : l'eau arrive par le bas du réfrigérant et repart par le haut, vers l'évier. Ouvrir le robinet d'eau.",
          `Régler le thermostat pour une ébullition douce, et chauffer à reflux pendant ${s.duree} min, en suivant le chronomètre.`,
          "Couper le chauffage, descendre le support élévateur et laisser refroidir cinq minutes.",
          "Porter le ballon au poste de séparation, et verser son contenu dans l'ampoule à décanter, qui contient déjà l'eau salée.",
          "Boucher l'ampoule. L'agiter trois fois, en dégazant après chaque agitation. Laisser reposer trois minutes, puis retirer le bouchon.",
          "Placer le bécher poubelle sous l'ampoule et faire couler la phase aqueuse. Fermer le robinet juste quand la limite entre les deux phases y arrive.",
          "Poser le bécher sec sur la balance et faire la tare. Y recueillir la phase organique, le reposer sur la balance, et noter la masse.",
        ],
        paillasse: { genre: "reflux", reglages: reflux(graine) },
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule la masse maximale d'éthanoate de benzyle que cette synthèse peut donner.", unite: "g", decimales: 1, relatif: 0.015,
        aide: "L'alcool benzylique est le réactif limitant : n = ρ × V / M. Une mole d'alcool donne au plus une mole d'ester, et m_max = n × M.",
        attendu: () => masseMaximale(s.Va),
        detail: () => `n(alcool) = 1,04 × ${nombre(s.Va, 1)} / 108 = ${nombre(quantiteAlcool(s.Va), 4)} mol. Une mole d'alcool donne au plus une mole d'ester : m_max = ${nombre(quantiteAlcool(s.Va), 4)} × 150 = ${g(masseMaximale(s.Va), 1)}.`,
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule le rendement de ta synthèse, en pourcentage, avec la masse que tu as pesée.", unite: "%", decimales: 1, absolu: 1,
        aide: "Le rendement est la masse obtenue divisée par la masse maximale.",
        attendu: (m) => rendement(m, s.Va),
        detail: (m) => `Rendement = m / m_max = ${g(m.m)} / ${g(masseMaximale(s.Va), 1)} = ${nombre(rendement(m, s.Va), 1)} %.`,
      },
      {
        genre: "paillasse", competence: "REA",
        consigne: "Contrôle ton produit par chromatographie sur couche mince. Trois dépôts : A, l'alcool benzylique ; P, ton produit ; R, l'éthanoate de benzyle du commerce. Note bien tes trois distances : tu en auras besoin pour la suite.",
        protocole: [
          "Verser l'éluant dans la cuve sur un demi-centimètre, en lisant la hauteur à la loupe. Reposer le flacon et fermer la cuve.",
          "Poser le crayon à papier sur la plaque. Amener sa pointe à 1 cm du bas, en lisant la règle à la loupe, et tracer la ligne de dépôt.",
          "Tremper un capillaire neuf dans le flacon A, le poser sur le repère A et toucher la plaque très brièvement. Faire de même pour P, puis pour R, avec un capillaire neuf à chaque fois.",
          "Ouvrir la cuve, y glisser la plaque, et refermer. La ligne de dépôt doit rester au-dessus de l'éluant.",
          "Laisser monter l'éluant. Ouvrir la cuve et sortir la plaque quand le front arrive à 1 cm du haut.",
          "Marquer tout de suite le front au crayon.",
          "Allumer la lampe UV : les taches apparaissent.",
          "Glisser la règle pour mettre son zéro sur la ligne de dépôt. Amener le curseur sur le trait du front, puis au centre de la tache du dépôt A, puis de celle du dépôt R. Lire chaque distance à la loupe et la noter dans le carnet.",
        ],
        paillasse: { genre: "ccm", reglages: plaque(graine) },
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule le rapport frontal de l'éthanoate de benzyle, avec les distances de ta plaque (dépôt R).", unite: "sans unité", decimales: 2, absolu: 0.02,
        aide: "Le rapport frontal est la distance parcourue par la tache, divisée par celle parcourue par le front de l'éluant : R_f = h / H.",
        attendu: (m) => m.hR / m.H,
        detail: (m) => `R_f = h_R / H = ${cm(m.hR)} / ${cm(m.H)} = ${nombre(m.hR / m.H, 2)}.`,
      },
      {
        genre: "valeur", competence: "VAL", question: "Calcule le rapport frontal de l'alcool benzylique (dépôt A).", unite: "sans unité", decimales: 2, absolu: 0.02,
        aide: "Même relation, avec la tache du dépôt A : R_f = h / H.",
        attendu: (m) => m.hA / m.H,
        detail: (m) => `R_f = h_A / H = ${cm(m.hA)} / ${cm(m.H)} = ${nombre(m.hA / m.H, 2)}.`,
      },
      {
        genre: "choix", competence: "VAL", question: "Que montre la chromatographie sur le produit que tu as synthétisé (dépôt P) ?",
        options: [
          "Il contient l'éthanoate de benzyle, et aucune autre espèce n'est détectée",
          "Il contient l'éthanoate de benzyle, mais il reste de l'alcool benzylique",
          "Il ne contient pas d'éthanoate de benzyle",
          "Il ne contient que de l'alcool benzylique",
        ], bonne: s.reste ? 1 : 0,
        explication: s.reste
          ? "Le dépôt P donne une tache à la hauteur de celle de la référence : ton produit contient bien l'éthanoate de benzyle. Il en donne une seconde, à la hauteur de celle de l'alcool benzylique : il reste du réactif. Le produit n'est pas pur, et le rendement calculé avec la masse pesée est un peu surestimé."
          : "Le dépôt P ne donne qu'une tache, à la hauteur de celle de la référence : ton produit contient bien l'éthanoate de benzyle, et la chromatographie ne détecte aucune autre espèce. Une seule tache ne prouve pas tout : une impureté qui ne se révèle pas sous la lampe passerait inaperçue.",
      },
    ];
  },
};

export default synthese;
