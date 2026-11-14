// La paillasse « ccm » (décision 0012) : une chromatographie sur couche mince. Une cuve et son couvercle, un flacon
// d'éluant, une plaque, un crayon et un stylo, trois flacons (le réactif, le produit synthétisé, l'espèce de référence),
// des capillaires, une lampe UV, une règle. L'élève fait les gestes du laboratoire : verser l'éluant sur un
// demi-centimètre et fermer la cuve, tracer la ligne de dépôt au crayon, déposer chaque solution avec son capillaire,
// plonger la plaque, la sortir avant que le front n'arrive en haut, marquer le front, révéler, mesurer.
// Chaque geste a ses conséquences : une ligne de dépôt noyée et les dépôts se dissolvent, un dépôt trop gros s'étale,
// un capillaire trempé dans deux flacons apporte une tache parasite, un front non marqué disparaît en séchant.
// Fonctions pures : le navigateur s'en sert pour faire vivre la paillasse, le serveur pour rejouer la manipulation.
// Les hauteurs et les distances sont en centimètres, les dépôts en millimètres, les durées en minutes.
import { nombre } from "@/lib/commun/format";
import { nombreDe, scoreDesFautes, texteDe, type BilanPaillasse, type Faute, type GesteBrut, type ReglesPaillasse } from "../types";

/** Les trois solutions, et les trois repères de la ligne de dépôt : A, le réactif ; P, le produit synthétisé ; R, l'espèce de référence. */
export type Solution = "a" | "p" | "r";
export const SOLUTIONS: readonly Solution[] = ["a", "p", "r"];
const estSolution = (x: unknown): x is Solution => x === "a" || x === "p" || x === "r";
/** Ce qui migre sur la plaque : le réactif, ou le produit attendu. */
export type Espece = "reactif" | "produit";
/** Ce que l'élève mesure : la distance parcourue par le front, par la tache du dépôt A, par la tache du dépôt R. */
export type Distance = "front" | "a" | "r";

export interface ReglagesCcm {
  /** le rapport frontal du réactif et celui du produit attendu, dans cet éluant */
  rfReactif: number;
  rfProduit: number;
  /** vrai s'il reste du réactif dans le produit synthétisé : son dépôt donne alors deux taches */
  reste: boolean;
  /** les noms des espèces et de l'éluant, dans une phrase */
  noms: { reactif: string; produit: string; eluant: string };
}

export interface EtatCcm {
  // ----- la cuve -----
  /** la hauteur d'éluant dans la cuve */
  eluant: number;
  couvercle: boolean;
  /** vrai si la cuve a été fermée avec son éluant avant de recevoir la plaque : son air est saturé de vapeurs */
  saturee: boolean;
  // ----- la plaque -----
  /** la hauteur de la ligne de dépôt, depuis le bas de la plaque ; null tant qu'elle n'est pas tracée */
  ligne: number | null;
  /** vrai si la ligne a été tracée au stylo */
  encre: boolean;
  /** le capillaire qui trempe dans chaque flacon : les solutions qu'il a touchées ; null s'il n'y en a pas */
  capillaires: Record<Solution, Solution[] | null>;
  /** sur chaque repère, le diamètre déposé de chaque solution */
  depots: Record<Solution, Record<Solution, number>>;
  /** vrai si un dépôt a été fait avec un capillaire trempé dans deux flacons */
  souille: boolean;
  dansCuve: boolean;
  /** la hauteur d'éluant que la plaque a trouvée dans la cuve ; null tant qu'elle n'y est pas allée */
  bain: number | null;
  /** le temps passé dans la cuve, et la part de ce temps cuve ouverte */
  duree: number;
  ouvert: number;
  /** vrai si les dépôts ont trempé dans l'éluant : ils s'y sont dissous */
  dissous: boolean;
  /** la hauteur du front quand la plaque est sortie de la cuve ; null avant */
  front: number | null;
  /** le trait qui marque le front ; null s'il n'est pas marqué */
  marque: number | null;
  /** vrai quand la plaque a séché : le front ne se voit plus */
  seche: boolean;
  // ----- la révélation et les mesures -----
  uv: boolean;
  /** vrai si la plaque sortie de la cuve est passée sous la lampe UV allumée */
  revelee: boolean;
  /** les distances notées par l'élève, depuis la ligne de dépôt */
  notes: Record<Distance, number | null>;
  /** le nombre de plaques recommencées */
  essais: number;
}

/** La plaque fait 7 cm de haut. La ligne de dépôt se trace à 1 cm du bas, l'éluant se verse sur un demi-centimètre. */
export const HAUTEUR = 7;
export const LIGNE = 1;
export const ELUANT = 0.5;
export const ELUANT_MAX = 3;
/** Au-delà de ce diamètre, un dépôt s'étale. */
export const DEPOT_FIN = 3.5;
const DEPOT_MAX = 20;
/** La montée du front : (front − niveau)² = MONTEE × durée. Cuve ouverte, l'éluant s'évapore et le front monte moins vite. */
const MONTEE = 2.5;
const OUVERTE = 0.4;
/** Le parcours du front sur la plaque du professeur : ligne à 1 cm, front arrêté à 6 cm. */
const PARCOURS = 5;
const centieme = (x: number) => Math.round(x * 100) / 100;
const cm = (x: number) => `${nombre(x, 2)} cm`;

const SANS_DEPOT: Record<Solution, number> = { a: 0, p: 0, r: 0 };
const DEPART: EtatCcm = {
  eluant: 0, couvercle: false, saturee: false,
  ligne: null, encre: false, capillaires: { a: null, p: null, r: null }, depots: { a: SANS_DEPOT, p: SANS_DEPOT, r: SANS_DEPOT }, souille: false,
  dansCuve: false, bain: null, duree: 0, ouvert: 0, dissous: false, front: null, marque: null, seche: false,
  uv: false, revelee: false, notes: { front: null, a: null, r: null }, essais: 0,
};

/** La hauteur des dépôts : sur la ligne, ou à 1 cm du bas si l'élève ne l'a pas tracée. */
export const hauteurDepots = (etat: EtatCcm): number => etat.ligne ?? LIGNE;
/** Le plus gros diamètre déposé sur un repère. */
export const depotSur = (etat: EtatCcm, ou: Solution): number => Math.max(...SOLUTIONS.map((s) => etat.depots[ou][s]));
const aDesDepots = (etat: EtatCcm): boolean => SOLUTIONS.some((ou) => depotSur(etat, ou) > 0);
/** La hauteur du front de l'éluant sur la plaque, depuis son bas : il monte de moins en moins vite, et s'arrête en haut. */
export function frontActuel(etat: EtatCcm): number {
  if (etat.front !== null) return etat.front;
  if (etat.bain === null || etat.bain <= 0) return 0;
  return centieme(Math.min(HAUTEUR, etat.bain + Math.sqrt(MONTEE * Math.max(0, etat.duree - OUVERTE * etat.ouvert))));
}
/** Vrai si le front se voit encore : la plaque trempe, ou vient de sortir de la cuve. */
export const frontVisible = (etat: EtatCcm): boolean => frontActuel(etat) > 0 && (etat.dansCuve || !etat.seche);

/** Une tache sur la plaque : l'espèce, la hauteur de son centre depuis le bas, son diamètre au dépôt ; `pale` pour une trace. */
export interface Tache { espece: Espece; h: number; taille: number; pale: boolean }
/**
 * Les taches de chaque dépôt, là où elles en sont de leur migration. Elles ne se voient que sous la lampe UV.
 * Le produit synthétisé donne la tache de l'espèce attendue, et une tache pâle de réactif s'il en reste.
 */
export function taches(r: ReglagesCcm, etat: EtatCcm): Record<Solution, Tache[]> {
  const depart = hauteurDepots(etat);
  const parcours = Math.max(0, frontActuel(etat) - depart);
  const contenu: Record<Solution, { espece: Espece; part: number }[]> = {
    a: [{ espece: "reactif", part: 1 }],
    p: [{ espece: "produit", part: 1 }, ...(r.reste ? [{ espece: "reactif" as const, part: 0.7 }] : [])],
    r: [{ espece: "produit", part: 1 }],
  };
  const sur = (ou: Solution): Tache[] => {
    if (etat.dissous) return [];
    return (["reactif", "produit"] as const).flatMap((espece) => {
      const parts = SOLUTIONS.flatMap((s) => contenu[s].filter((c) => c.espece === espece && etat.depots[ou][s] > 0).map((c) => ({ taille: etat.depots[ou][s] * c.part, pale: c.part < 1 })));
      if (parts.length === 0) return [];
      const rf = espece === "reactif" ? r.rfReactif : r.rfProduit;
      return [{ espece, h: centieme(depart + rf * parcours), taille: centieme(Math.max(...parts.map((p) => p.taille))), pale: parts.every((p) => p.pale) }];
    });
  };
  return { a: sur("a"), p: sur("p"), r: sur("r") };
}

/** La plaque trempe : elle retient le niveau le plus haut qu'elle a trouvé, et ses dépôts se dissolvent s'il les atteint. */
function trempe(etat: EtatCcm): EtatCcm {
  if (!etat.dansCuve) return etat;
  return { ...etat, bain: Math.max(etat.bain ?? 0, etat.eluant), dissous: etat.dissous || (aDesDepots(etat) && etat.eluant >= hauteurDepots(etat)) };
}

/** Applique un geste. Un geste inconnu, mal formé ou impossible ne change rien. */
function geste(_r: ReglagesCcm, etat: EtatCcm, g: GesteBrut): EtatCcm {
  const v = nombreDe(g, "v");
  const positif = v !== null && v > 0 && v <= 60 ? centieme(v) : null;
  switch (g.g) {
    // verser l'éluant dans la cuve ouverte
    case "eluant": return positif === null || etat.couvercle ? etat : trempe({ ...etat, eluant: centieme(Math.min(ELUANT_MAX, etat.eluant + positif)) });
    // vider la cuve dans le bidon de récupération
    case "vider": return etat.couvercle || etat.dansCuve || etat.eluant <= 0 ? etat : { ...etat, eluant: 0, saturee: false };
    case "couvercle": {
      if (typeof g.pose !== "boolean" || g.pose === etat.couvercle) return etat;
      return { ...etat, couvercle: g.pose, saturee: etat.saturee || (g.pose && etat.eluant > 0 && !etat.dansCuve) };
    }
    // un trait sur la plaque posée sur la feuille : la ligne de dépôt avant la migration, la marque du front après
    case "trait": {
      const h = nombreDe(g, "h");
      const outil = texteDe(g, "outil");
      if (h === null || h < 0.1 || h > HAUTEUR - 0.1 || (outil !== "crayon" && outil !== "stylo") || etat.dansCuve) return etat;
      if (etat.front !== null) return { ...etat, marque: centieme(h) };
      if (etat.bain !== null || aDesDepots(etat)) return etat;
      return { ...etat, ligne: centieme(h), encre: etat.encre || outil === "stylo" };
    }
    // un capillaire trempe dans un flacon : un neuf, pris dans le pot, ou celui d'un autre flacon
    case "capillaire": {
      const de = texteDe(g, "de");
      const vers = texteDe(g, "vers");
      if (!estSolution(vers)) return etat;
      const place = etat.capillaires[vers];
      // un capillaire neuf prend la place libre, ou remplace un capillaire qui a trempé dans deux flacons
      if (de === "pot") return place === null || place.length > 1 ? { ...etat, capillaires: { ...etat.capillaires, [vers]: [vers] } } : etat;
      if (place !== null || !estSolution(de) || de === vers) return etat;
      const porte = etat.capillaires[de];
      return porte === null ? etat : { ...etat, capillaires: { ...etat.capillaires, [de]: null, [vers]: [...porte.filter((s) => s !== vers), vers] } };
    }
    // toucher la plaque avec le capillaire d'un flacon : le dépôt grossit tant que le contact dure
    case "deposer": {
      const de = texteDe(g, "de");
      const ou = texteDe(g, "ou");
      if (positif === null || !estSolution(de) || !estSolution(ou) || etat.dansCuve || etat.bain !== null) return etat;
      const porte = etat.capillaires[de];
      if (porte === null) return etat;
      const lot = { ...etat.depots[ou] };
      for (const s of porte) lot[s] = centieme(Math.min(DEPOT_MAX, lot[s] + positif));
      return { ...etat, depots: { ...etat.depots, [ou]: lot }, souille: etat.souille || porte.length > 1 };
    }
    case "plonger": return etat.dansCuve || etat.couvercle || etat.bain !== null ? etat : trempe({ ...etat, dansCuve: true });
    // le temps passe : dans la cuve, le front monte ; sortie, la plaque sèche
    case "attendre": {
      if (positif === null) return etat;
      if (etat.dansCuve) return { ...etat, duree: centieme(Math.min(240, etat.duree + positif)), ouvert: etat.couvercle ? etat.ouvert : centieme(Math.min(240, etat.ouvert + positif)) };
      return etat.front !== null && !etat.seche ? { ...etat, seche: true } : etat;
    }
    case "sortir": return !etat.dansCuve || etat.couvercle ? etat : { ...etat, dansCuve: false, front: frontActuel(etat), revelee: etat.uv };
    // la lampe UV : le temps de l'allumer, l'éluant s'est évaporé
    case "uv": {
      if (typeof g.marche !== "boolean" || g.marche === etat.uv) return etat;
      const eclaire = g.marche && etat.front !== null;
      return { ...etat, uv: g.marche, revelee: etat.revelee || eclaire, seche: etat.seche || eclaire };
    }
    // une distance lue sur la règle
    case "noter": {
      const quoi = texteDe(g, "quoi");
      if (v === null || v < 0 || v > HAUTEUR || (quoi !== "front" && quoi !== "a" && quoi !== "r")) return etat;
      return { ...etat, notes: { ...etat.notes, [quoi]: centieme(v) }, seche: etat.seche || etat.front !== null };
    }
    // une plaque neuve : la cuve, les capillaires et la lampe restent comme ils sont
    case "nouvelle": return { ...DEPART, eluant: etat.eluant, couvercle: etat.couvercle, saturee: etat.saturee, capillaires: etat.capillaires, uv: etat.uv, essais: etat.essais + 1 };
    default: return etat;
  }
}

const NOMS: Record<Solution, string> = { a: "A (le réactif)", p: "P (le produit synthétisé)", r: "R (la référence)" };

/** Les distances que donne une plaque sans défaut : celles du professeur. */
export const distancesExactes = (r: ReglagesCcm): { H: number; hA: number; hR: number } => ({ H: PARCOURS, hA: centieme(r.rfReactif * PARCOURS), hR: centieme(r.rfProduit * PARCOURS) });

/** Le bilan de la manipulation : les distances retenues, et les fautes relevées par le professeur. */
function bilan(r: ReglagesCcm, etat: EtatCcm): BilanPaillasse {
  const fautes: Faute[] = [];
  const faute = (code: string, grave: boolean, texte: string) => fautes.push({ code, grave, texte });
  const fait = etat.bain !== null && etat.duree > 0;

  if (!fait) {
    faute("migration", true, "Tu n'as pas fait migrer la plaque dans la cuve : la chromatographie n'est pas faite.");
  } else {
    const depart = hauteurDepots(etat);
    const bain = etat.bain ?? 0;
    const front = frontActuel(etat);
    const parcours = Math.max(0, front - depart);
    // la cuve
    if (bain <= 0) faute("eluant", true, "Il n'y avait pas d'éluant dans la cuve : rien n'a migré sur la plaque.");
    else if (etat.dissous) faute("noye", true, `La ligne de dépôt trempait dans l'éluant : tes dépôts étaient à ${cm(depart)} du bas de la plaque, et l'éluant montait à ${cm(bain)}. Ils se sont dissous dans la cuve. L'éluant doit rester sous la ligne de dépôt.`);
    else if (bain > 0.8) faute("eluant", false, `Tu as versé ${cm(bain)} d'éluant au lieu d'un demi-centimètre : le niveau arrive tout près de la ligne de dépôt.`);
    else if (bain < 0.3) faute("eluant", false, `Tu n'as versé que ${cm(bain)} d'éluant : il en faut un demi-centimètre pour que le bas de la plaque trempe franchement.`);
    if (bain > 0 && !etat.saturee && etat.ouvert > 0) faute("couvercle", false, "Tu n'as pas fermé la cuve, ni avant d'y poser la plaque, ni pendant la migration : l'éluant s'évapore, et le front monte moins vite.");
    else if (bain > 0 && !etat.saturee) faute("couvercle", false, "Tu n'as pas fermé la cuve après avoir versé l'éluant : son air n'était pas saturé de vapeurs quand tu y as posé la plaque.");
    else if (bain > 0 && etat.ouvert > 0) faute("couvercle", false, `La cuve est restée ouverte pendant ${nombre(etat.ouvert, 0)} min de migration : l'éluant s'évapore, et le front monte moins vite.`);
    // la ligne de dépôt
    if (etat.ligne === null) faute("ligne", false, "Tu n'as pas tracé la ligne de dépôt : sans elle, on ne sait plus d'où mesurer les distances.");
    else if (!etat.dissous && Math.abs(etat.ligne - LIGNE) > 0.15) faute("ligne", false, `Ta ligne de dépôt est à ${cm(etat.ligne)} du bas de la plaque, au lieu de 1 cm.`);
    if (etat.encre) faute("stylo", false, "Tu as tracé la ligne de dépôt au stylo : l'éluant entraîne l'encre, qui migre avec tes taches. On trace toujours au crayon à papier.");
    // les dépôts
    const manquants = SOLUTIONS.filter((ou) => depotSur(etat, ou) <= 0);
    const deplaces = SOLUTIONS.filter((ou) => SOLUTIONS.some((s) => s !== ou && etat.depots[ou][s] > 0));
    if (manquants.length > 0) faute("depot", true, `Il manque ${manquants.length > 1 ? "les dépôts" : "le dépôt"} ${manquants.map((s) => NOMS[s]).join(" et ")} : il faut les trois pour comparer le produit au réactif et à la référence.`);
    if (deplaces.length > 0 && etat.souille) faute("capillaire", false, "Tu as trempé le même capillaire dans deux flacons : il a apporté une tache parasite sur la plaque. Un capillaire ne sert qu'à une solution.");
    else if (deplaces.length > 0) faute("repere", true, `Sur le repère ${deplaces.map((s) => s.toUpperCase()).join(" et le repère ")}, tu as déposé une autre solution que la sienne : la plaque ne se lit plus.`);
    const gros = SOLUTIONS.map((ou) => ({ ou, d: depotSur(etat, ou) })).sort((x, y) => y.d - x.d)[0];
    if (gros.d > DEPOT_FIN) faute("gros", gros.d > 2 * DEPOT_FIN, `Ton dépôt ${gros.ou.toUpperCase()} fait ${nombre(gros.d, 1)} mm de large : la tache s'étale et se lit mal. Touche la plaque très brièvement, pour un dépôt de 2 mm environ.`);
    // la migration
    if (bain > 0) {
      if (etat.front === null) faute("sortie", true, "La plaque est encore dans la cuve : il fallait la sortir, marquer le front et la révéler.");
      if (front >= HAUTEUR) faute("haut", true, "Le front de l'éluant a atteint le haut de la plaque : on ne sait plus quelle distance il aurait parcourue, et les rapports frontaux sont faussés. Sors la plaque quand le front est à 1 cm du haut.");
      else if (parcours < 3) faute("court", parcours < 1.5, `Tu as sorti la plaque trop tôt : le front n'a parcouru que ${cm(parcours)} depuis la ligne de dépôt. Les taches sont mal séparées.`);
    }
    if (etat.front !== null && bain > 0) {
      // le front se marque dès la sortie de la cuve
      const ecart = etat.marque === null ? 0 : Math.abs(etat.marque - etat.front);
      if (front >= HAUTEUR) { /* arrivé en haut, le front ne se marque plus : la faute est déjà relevée */ }
      else if (etat.marque === null) faute("front", false, "Tu n'as pas marqué le front de l'éluant au crayon dès la sortie de la cuve : l'éluant s'évapore, et le front disparaît.");
      else if (ecart > 0.15) faute("front", ecart > 0.5, `Ton trait est à ${cm(ecart)} du front de l'éluant : marque-le dès la sortie de la cuve, tant qu'il se voit.`);
      if (!etat.revelee) faute("uv", true, "Tu n'as pas révélé la plaque sous la lampe UV : ces espèces sont incolores, leurs taches ne se voient pas à l'œil nu.");
    }
    // les distances : l'élève mesure jusqu'à son trait, et jusqu'au centre de chaque tache
    const lisible = (s: Solution) => etat.front !== null && etat.revelee && !etat.dissous && etat.depots[s][s] > 0 && !deplaces.includes(s);
    const attendus: { quoi: Distance; nom: string; vrai: number | null }[] = [
      { quoi: "front", nom: "le front de l'éluant", vrai: etat.front === null ? null : Math.max(0, (etat.marque ?? etat.front) - depart) },
      { quoi: "a", nom: "la tache du dépôt A", vrai: lisible("a") ? r.rfReactif * parcours : null },
      { quoi: "r", nom: "la tache du dépôt R", vrai: lisible("r") ? r.rfProduit * parcours : null },
    ];
    const oublis = attendus.filter((x) => etat.notes[x.quoi] === null);
    if (oublis.length === 3) faute("note", true, "Tu n'as noté aucune distance : il faut celle du front de l'éluant et celles des taches, mesurées depuis la ligne de dépôt.");
    else if (oublis.length > 0) faute("note", true, `Tu n'as pas noté la distance parcourue par ${oublis.map((x) => x.nom).join(", ni par ")}.`);
    const ecarts = attendus.flatMap((x) => { const note = etat.notes[x.quoi]; return note === null || x.vrai === null ? [] : [{ nom: x.nom, note, vrai: x.vrai, ecart: note - x.vrai }]; });
    if (ecarts.length > 0) {
      const moyen = ecarts.reduce((s, e) => s + e.ecart, 0) / ecarts.length;
      const pire = [...ecarts].sort((x, y) => Math.abs(y.ecart) - Math.abs(x.ecart))[0];
      // la même erreur sur toutes les distances : la règle n'avait pas son zéro sur la ligne de dépôt
      if (ecarts.length >= 2 && Math.abs(moyen) > 0.3 && ecarts.every((e) => Math.abs(e.ecart - moyen) <= 0.15)) {
        faute("zero", Math.abs(moyen) >= 0.6, `Tes distances sont toutes décalées de ${cm(Math.abs(moyen))} : tu n'as pas mesuré depuis la ligne de dépôt. Place le zéro de la règle sur la ligne de dépôt, ou retranche sa graduation.`);
      } else if (Math.abs(pire.ecart) > 0.2) {
        // la règle, son zéro et le curseur se placent chacun à un demi-millimètre près : deux millimètres d'écart ne sont pas une faute
        faute("lecture", Math.abs(pire.ecart) > 0.5, `Tu as noté ${cm(pire.note)} pour ${pire.nom} ; la bonne distance est ${cm(pire.vrai)}. Vise le centre de la tache, ou le trait du front, et lis la graduation à la loupe.`);
      }
    }
  }
  const exact = distancesExactes(r);
  const { front: H, a: hA, r: hR } = etat.notes;
  const notees = H !== null && hA !== null && hR !== null && H >= 0.5;
  const mesures = notees ? { H, hA, hR } : exact;
  const lignes = [
    notees
      ? `Tes distances, depuis la ligne de dépôt : front de l'éluant, H = ${cm(H)} ; tache du dépôt A, h_A = ${cm(hA)} ; tache du dépôt R, h_R = ${cm(hR)}.`
      : `Sans toutes tes distances, on continue avec la plaque du professeur : H = ${cm(exact.H)} ; h_A = ${cm(exact.hA)} ; h_R = ${cm(exact.hR)}.`,
    `Sur une plaque sans défaut, le dépôt P donne ${r.reste ? "deux taches : l'une à la hauteur de celle du dépôt R, l'autre à la hauteur de celle du dépôt A" : "une seule tache, à la hauteur de celle du dépôt R"}.`,
  ];
  // sans migration, la manipulation n'est pas faite
  return { score: fait ? scoreDesFautes(fautes) : 0, fautes, mesures, lignes };
}

export const regles: ReglesPaillasse<ReglagesCcm, EtatCcm> = { depart: () => DEPART, geste, bilan };
