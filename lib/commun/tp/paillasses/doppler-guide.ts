// Le guide de la paillasse « doppler » : ce qu'un professeur, debout à côté de l'élève, lui dirait de faire maintenant.
// Il se calcule à partir de l'état de la manipulation et de ce que la vue retient en plus : l'heure, l'écran affiché,
// le zoom et le repère de l'analyseur, le carnet, ce que l'élève tient sous son doigt, et les sommets des deux pics du
// spectre. Il dit le geste, jamais la mesure : quelle fourche glisser, quand lancer et quand arrêter, quel pic viser,
// mais ni une graduation, ni une durée, ni une fréquence.
// La logique de l'analyseur que la vue fait vivre (la fenêtre, le pas du repère, le zoom) est ici aussi : les tests
// peuvent ainsi la jouer. Fonctions pures : la vue s'en sert pour placer la main et écrire la phrase ; les tests suivent
// le guide jusqu'au bout et vérifient que la manipulation obtenue est sans faute (tests/unitaires/tp/doppler-guide.test.ts).
import { FOURCHES, chronometre, dernierPassage, dureeDuTrajet, enregistreEnEntier, passagesEnregistres, roule, type EtatDoppler, type ReglagesDoppler } from "./doppler";
import { insecable } from "./ultrasons-guide";

// ---------- l'analyseur de spectre ----------

/** Les largeurs de fenêtre de l'analyseur, en hertz : de la plus large à la plus serrée. */
export const FENETRES = [8000, 4000, 2000, 800, 400, 200, 100];
/** L'analyseur montre les fréquences de 0 à 8 000 Hz. */
export const BANDE = 8000;
/** Le pas du repère : un quatre-centième de la fenêtre. Vingt hertz sur la fenêtre la plus large, un quart de hertz sur la plus serrée. */
export const pasDuRepere = (zoom: number): number => FENETRES[zoom] / 400;
/** La fréquence du bord gauche de la fenêtre, quand elle est centrée au mieux sur `centre`. */
export function debutDeFenetre(zoom: number, centre: number): number {
  const largeur = FENETRES[zoom], pas = pasDuRepere(zoom);
  return Math.max(0, Math.min(BANDE - largeur, Math.round((centre - largeur / 2) / pas) * pas));
}
/** Le repère posé près d'une fréquence : il se cale sur le pas de la fenêtre, et reste dans la fenêtre. */
export function repereDans(zoom: number, centre: number, f: number): number {
  const debut = debutDeFenetre(zoom, centre), pas = pasDuRepere(zoom);
  return Math.max(debut, Math.min(debut + FENETRES[zoom], debut + Math.round((f - debut) / pas) * pas));
}
/** Tourner la molette du zoom : la fenêtre se resserre autour du repère, et le repère se cale sur le nouveau pas. */
export function zoomer(repere: number, suite: number): { zoom: number; centre: number; repere: number } {
  const pas = pasDuRepere(suite);
  const ici = Math.round(repere / pas) * pas;
  const debut = debutDeFenetre(suite, ici);
  return { zoom: suite, centre: ici, repere: Math.max(debut, Math.min(debut + FENETRES[suite], ici)) };
}
/** Vrai si une fréquence se voit dans la fenêtre, à plus d'une fraction de fenêtre de ses bords : un douzième, pour être à l'aise. */
function dansLaFenetre(zoom: number, centre: number, f: number, fraction = 1 / 12): boolean {
  const debut = debutDeFenetre(zoom, centre), marge = FENETRES[zoom] * fraction;
  return f >= debut + marge && f <= debut + FENETRES[zoom] - marge;
}
/** Le zoom le plus serré qui garde une fréquence dans la fenêtre, quand la fenêtre se resserre autour du repère. */
export function zoomPossible(repere: number, f: number): number {
  for (let zoom = FENETRES.length - 1; zoom > 0; zoom--) if (dansLaFenetre(zoom, zoomer(repere, zoom).centre, f)) return zoom;
  return 0;
}

// ---------- ce que le guide regarde ----------

/** Les lignes du carnet de mesures, et leur nom. */
export type LigneDoppler = "x1" | "x2" | "duree" | "approche" | "eloignement";
export const LIGNES_DU_CARNET: Record<LigneDoppler, string> = {
  x1: "Position de la première fourche", x2: "Position de la seconde fourche", duree: "Durée du chronomètre", approche: "Fréquence à l'approche", eloignement: "Fréquence à l'éloignement",
};

/** Ce que la vue retient en plus de l'état des règles. */
export interface VueDoppler {
  /** l'heure de la paillasse, en secondes */
  t: number;
  ecran: "banc" | "spectre";
  /** l'analyseur : le rang de sa fenêtre, la fréquence autour de laquelle elle s'est resserrée, la fréquence du repère */
  zoom: number;
  centre: number;
  repere: number;
  /** le carnet : fermé, ouvert sur ses lignes, ou une ligne en cours d'écriture */
  carnet: "ferme" | "ouvert" | LigneDoppler;
  /** ce que l'élève tient sous son doigt : une fourche, ou le repère du spectre. Tant qu'il le tient, la consigne reste sur lui. */
  tenu: "f1" | "f2" | "repere" | null;
  /** les sommets des deux pics du spectre du dernier enregistrement (`pics`) : la vue les calcule une fois par enregistrement */
  sommets: { approche: number | null; eloignement: number | null };
}

/** Un pas du guide : la phrase, et le geste à montrer. `etape` : le rang de l'étape du protocole en cours. */
export type PasDuGuide = { cle: string; texte: string; etape: number } & (
  /** tourner la molette du moteur jusqu'au cran `vers`, ou celle du zoom jusqu'au rang `vers` */
  | { geste: "tourner"; molette: "moteur" | "zoom"; vers: number }
  /** glisser une fourche optique jusqu'à la graduation `vers`, en centimètres */
  | { geste: "fourche"; n: 1 | 2; vers: number }
  /** prendre le mobile au bout du rail et le poser au départ */
  | { geste: "ramener" }
  /** toucher une commande du banc : la touche de l'enregistreur, le poussoir du mobile */
  | { geste: "toucher"; quoi: "enregistreur" | "lancer" }
  /** toucher l'écran de l'analyseur à la fréquence `f`, pour y poser le repère ; `pres` : il y est presque, il reste à l'ajuster */
  | { geste: "viser"; f: number; pres: boolean }
  /** une touche sous la scène */
  | { geste: "bouton"; bouton: "carnet" | "spectre" | "banc" | "fermer" | "fini" }
  /** une ligne du carnet ouvert */
  | { geste: "ligne"; ligne: LigneDoppler }
  /** lire un appareil et écrire la lecture au pavé de chiffres */
  | { geste: "ecrire"; ligne: LigneDoppler }
  | { geste: "attendre" }
);

/** Là où le guide montre de poser les fourches, en centimètres : comme le professeur. */
const FOURCHE_1 = 100, FOURCHE_2 = 300;
/** La première fourche se place au-delà de cette graduation, et la seconde au moins à cet écart de la première, en centimètres. */
const DEBUT = 50, ECART = 100;
/** Une position est bien lue à cette distance près, en centimètres ; une durée, à ce nombre de secondes près. */
const LECTURE = 0.3, CHRONO = 0.001;
/** Le repère est sur le sommet d'un pic à cette fréquence près, en hertz. */
const SUR_LE_SOMMET = 0.75;
/** Au-delà de cette durée, en secondes, un enregistrement qui attend le mobile risque de remplir sa mémoire. */
const VIEUX = 20;
/** Le zoom à partir duquel le repère avance assez finement pour lire le sommet d'un pic. */
const ZOOM_FIN = 5;

const dansLOrdre = (f: readonly [number, number]): [number, number] => (f[0] <= f[1] ? [f[0], f[1]] : [f[1], f[0]]);
/** Vrai si les deux fourches sont bien placées : la première là où le mobile a fini de prendre son élan, la seconde un mètre plus loin au moins. */
export function fourchesBonnes(f: readonly [number, number]): boolean {
  const [a, b] = dansLOrdre(f);
  return a >= DEBUT && b - a >= ECART;
}
/** Vrai si les deux positions notées sont celles des fourches données. */
export function positionsJustes(etat: EtatDoppler, fourches: readonly [number, number]): boolean {
  if (etat.x1 === null || etat.x2 === null) return false;
  const notees = dansLOrdre([etat.x1, etat.x2]), vraies = dansLOrdre(fourches);
  return Math.abs(notees[0] - vraies[0]) <= LECTURE && Math.abs(notees[1] - vraies[1]) <= LECTURE;
}
/**
 * Vrai si le dernier passage du mobile est celui qu'il faut : au cran demandé, les fourches bien placées, enregistré
 * en entier et seul sur sa bande, avec ses deux pics. Si une fourche a bougé depuis, il faut que sa position soit déjà notée.
 */
export function passageValable(r: ReglagesDoppler, etat: EtatDoppler, v: Pick<VueDoppler, "sommets">): boolean {
  const p = dernierPassage(etat);
  if (!p || p.cran !== r.cran || !fourchesBonnes(p.fourches) || etat.debut !== null || !etat.bande) return false;
  const enregistres = passagesEnregistres(etat);
  if (enregistres.length !== 1 || enregistres[0] !== p || !enregistreEnEntier(etat) || v.sommets.approche === null || v.sommets.eloignement === null) return false;
  return positionsJustes(etat, p.fourches) || (etat.fourches[0] === p.fourches[0] && etat.fourches[1] === p.fourches[1]);
}
/** Vrai si la fréquence notée pour un pic est bien celle du sommet de ce pic, sur le spectre d'aujourd'hui. */
export function frequenceJuste(r: ReglagesDoppler, etat: EtatDoppler, quoi: "approche" | "eloignement", v: Pick<VueDoppler, "sommets">): boolean {
  const f = etat[quoi];
  return f !== null && f.pic !== null && f.pic === v.sommets[quoi] && f.entier && f.cran === r.cran && Math.abs(f.note - f.pic) <= SUR_LE_SOMMET;
}

/**
 * Ce qu'il faut faire maintenant. La fonction rend toujours un pas : le premier geste qui manque, dans l'ordre du
 * protocole. Elle ne lit que ce qu'un professeur verrait par-dessus l'épaule de l'élève.
 */
export function prochain(r: ReglagesDoppler, etat: EtatDoppler, v: VueDoppler): PasDuGuide {
  const p = pasSuivant(r, etat, v);
  return { ...p, texte: insecable(p.texte) };
}

function pasSuivant(r: ReglagesDoppler, etat: EtatDoppler, v: VueDoppler): PasDuGuide {
  const E = { cran: 0, fourches: 1, passage: 2, chrono: 3, spectre: 4 };
  const dernier = dernierPassage(etat);

  /** Noter une lecture : ouvrir le carnet, toucher la ligne, lire l'appareil et écrire. */
  const noter = (ligne: LigneDoppler, etape: number, carnet: string, ecrire: string): PasDuGuide => {
    if (v.carnet === ligne) return { cle: `${ligne}-ecrire`, etape, texte: ecrire, geste: "ecrire", ligne };
    if (v.carnet === "ouvert") return { cle: `${ligne}-ligne`, etape, texte: `Touche la ligne « ${LIGNES_DU_CARNET[ligne]} ».`, geste: "ligne", ligne };
    if (v.carnet !== "ferme") return { cle: "carnet-annuler", etape, texte: "Ce n'est pas cette ligne qu'il faut écrire maintenant : touche « Annuler ».", geste: "attendre" };
    return { cle: `${ligne}-carnet`, etape, texte: carnet, geste: "bouton", bouton: "carnet" };
  };
  /** Noter la position d'une fourche, lue à la loupe ; null si les deux positions notées sont celles des fourches données. */
  const noterPositions = (fourches: readonly [number, number], enPlace: string): PasDuGuide | null => {
    if (positionsJustes(etat, fourches)) return null;
    const premiere = etat.x1 === null || Math.abs(etat.x1 - dansLOrdre(fourches)[0]) > LECTURE;
    const ligne = premiere ? "x1" : "x2", nom = premiere ? "la première fourche" : "la seconde fourche";
    const carnet = etat[ligne] === null ? `${premiere ? enPlace : ""}Ouvre le carnet pour noter la position de ${nom}.` : `La position notée pour ${nom} n'est pas la bonne : ouvre le carnet pour la relire.`;
    return noter(ligne, E.fourches, carnet, "Lis dans la loupe la graduation en face du repère de la fourche, au demi-centimètre près. Écris-la en centimètres.");
  };
  const surLeBanc = (pas: PasDuGuide): PasDuGuide => (v.ecran === "banc" ? pas : { cle: "banc", etape: pas.etape, texte: "Cette étape se fait sur le banc : touche « Revenir au banc ».", geste: "bouton", bouton: "banc" });

  /** Le premier geste qui manque. */
  const pas = (): PasDuGuide => {
    // ----- pendant que le mobile roule, on ne touche à rien -----
    if (roule(etat, v.t)) {
      return {
        cle: "rouler", etape: E.passage, geste: "attendre",
        texte: etat.debut !== null ? "Le mobile roule et le micro l'enregistre : ne touche à rien. Attends qu'il soit au bout du rail."
          : "Le mobile roule, mais rien ne l'enregistre : ce passage sera à refaire. Attends qu'il soit au bout du rail.",
      };
    }

    // ----- le passage du mobile : au bon cran, les fourches en place et notées, enregistré du départ à l'arrivée -----
    if (!passageValable(r, etat, v)) {
      const cranBon = etat.cran === r.cran, enPlace = fourchesBonnes(etat.fourches) && v.tenu !== "f1" && v.tenu !== "f2";
      const pret = cranBon && enPlace && positionsJustes(etat, etat.fourches);
      const stop = (cle: string, texte: string): PasDuGuide => surLeBanc({ cle, etape: E.passage, texte, geste: "toucher", quoi: "enregistreur" });
      if (etat.debut !== null) {
        // un enregistrement tourne : il sert s'il a commencé juste avant ce passage, et s'il ne contient que lui
        const debut = etat.debut;
        const surLaBande = etat.passages.filter((q) => q.t + dureeDuTrajet(q.v) > debut);
        if (dernier && surLaBande.length === 1 && surLaBande[0] === dernier && dernier.t >= debut && dernier.cran === r.cran && fourchesBonnes(dernier.fourches)) {
          return stop("arreter", "Le mobile est arrivé au bout du rail. Touche « Arrêter » pour arrêter l'enregistrement.");
        }
        if (!etat.auDepart || !pret || surLaBande.length > 0 || v.t - debut > VIEUX) return stop("enregistrement-jeter", "Cet enregistrement ne servira pas : touche « Arrêter ». Tu en lanceras un autre juste avant le mobile.");
        return surLeBanc({ cle: "lancer", etape: E.passage, texte: "L'enregistrement tourne. Touche « Lancer » pour faire partir le mobile.", geste: "toucher", quoi: "lancer" });
      }
      if (!etat.auDepart) {
        // un passage a eu lieu, et il ne convient pas : on dit pourquoi, puis on recommence
        const pourquoi = !dernier ? "" : dernier.cran !== r.cran ? `Ce passage s'est fait au cran ${dernier.cran}, pas au cran demandé : il est à refaire. `
          : !fourchesBonnes(dernier.fourches) ? "Au passage, les fourches étaient mal placées : il est à refaire. "
            : !etat.bande || passagesEnregistres(etat)[0] !== dernier || !enregistreEnEntier(etat) ? "Ce passage n'est pas enregistré en entier : il est à refaire. "
              : "Une fourche a bougé depuis le passage : il est à refaire. ";
        return surLeBanc({ cle: "ramener", etape: E.passage, texte: `${pourquoi}Ramène le mobile au départ du rail.`, geste: "ramener" });
      }
      if (!cranBon) return surLeBanc({ cle: "cran", etape: E.cran, texte: `Tourne la molette du moteur jusqu'au cran demandé par le sujet : le cran ${r.cran}.`, geste: "tourner", molette: "moteur", vers: r.cran });
      if (!enPlace) {
        // la fourche F1 d'abord, si elle ne peut pas servir de première fourche ; puis la fourche F2, un mètre plus loin
        const [f1] = etat.fourches;
        const premiereBonne = f1 >= DEBUT && f1 <= FOURCHES.max - ECART;
        if (v.tenu === "f1" || (v.tenu !== "f2" && !premiereBonne)) {
          return surLeBanc({ cle: "fourche-1", etape: E.fourches, texte: "Glisse la fourche F1 le long du rail, plus loin que le premier demi-mètre : le mobile y a fini de prendre son élan.", geste: "fourche", n: 1, vers: FOURCHE_1 });
        }
        return surLeBanc({ cle: "fourche-2", etape: E.fourches, texte: "Glisse la fourche F2 plus loin sur le rail : à un mètre au moins de la fourche F1.", geste: "fourche", n: 2, vers: f1 <= FOURCHE_2 - ECART ? FOURCHE_2 : f1 + ECART });
      }
      const positions = noterPositions(etat.fourches, "Les fourches sont en place. ");
      if (positions) return positions;
      return surLeBanc({ cle: "enregistrer", etape: E.passage, texte: "Touche « Enregistrer » : le micro doit capter tout le passage du mobile.", geste: "toucher", quoi: "enregistreur" });
    }

    // ----- le passage est bon : ce qu'il reste à lire sur le banc -----
    const passage = dernier!;
    const positions = noterPositions(passage.fourches, "");
    if (positions) return positions;
    const affichee = chronometre(passage.v, passage.fourches);
    if (!etat.duree || etat.duree.passage?.t !== passage.t || Math.abs(etat.duree.note - affichee) > CHRONO) {
      return noter("duree", E.chrono, etat.duree ? "La durée notée n'est pas celle du chronomètre : ouvre le carnet pour la relire." : "Le passage est enregistré. Ouvre le carnet pour noter la durée du chronomètre.",
        "Lis la durée affichée par le chronomètre des fourches, et écris-la en secondes.");
    }

    // ----- le spectre : le repère sur le sommet de chaque pic, en zoomant -----
    for (const quoi of ["approche", "eloignement"] as const) {
      if (frequenceJuste(r, etat, quoi, v)) continue;
      const f = v.sommets[quoi]!;
      const cote = quoi === "approche" ? "de droite, celui de l'approche" : "de gauche, celui de l'éloignement";
      const reprise = etat[quoi] ? "La fréquence notée n'est pas celle du sommet du pic. " : "";
      if (Math.abs(v.repere - f) <= SUR_LE_SOMMET && v.zoom >= ZOOM_FIN && v.tenu !== "repere") {
        return noter(quoi, E.spectre, `Le repère est sur le sommet du pic. Ouvre le carnet pour noter la fréquence ${quoi === "approche" ? "à l'approche" : "à l'éloignement"}.`, "Lis la fréquence affichée au repère : c'est elle que tu écris, en hertz.");
      }
      if (v.ecran !== "spectre") return { cle: "spectre", etape: E.spectre, texte: `${reprise || "Tout est noté sur le banc. "}Touche « Spectre » pour voir le spectre du son enregistré.`, geste: "bouton", bouton: "spectre" };
      /** Poser le repère : de loin sur le pic, puis, tout zoomé, sur son sommet. */
      const viser = (): PasDuGuide => {
        if (v.zoom === FENETRES.length - 1) {
          const pres = v.tenu !== "repere" && Math.abs(v.repere - f) <= 5;
          return { cle: `repere-${quoi}`, etape: E.spectre, geste: "viser", f, pres, texte: pres ? `Presque. Glisse doucement le repère jusqu'au sommet du pic ${cote}.` : `${reprise}Pose le repère sur le sommet du pic ${cote}.` };
        }
        // de loin, les trois pics ne font qu'un trait ; de près, celui de l'approche est à droite, celui de l'éloignement à gauche
        const separes = (Math.abs(f - r.fE) / FENETRES[v.zoom]) * 320 >= 6;
        return { cle: `viser-${quoi}`, etape: E.spectre, geste: "viser", f, pres: false, texte: `${reprise}Touche le pic ${separes ? cote : "du spectre"}${reprise ? "." : " : le repère se pose là où tu touches."}` };
      };
      if (v.tenu === "repere") return viser();
      // le pic se voit s'il est dans la fenêtre, même près d'un bord
      if (!dansLaFenetre(v.zoom, v.centre, f, 1 / 40)) return { cle: "zoom-elargir", etape: E.spectre, texte: `Le pic ${quoi === "approche" ? "de l'approche" : "de l'éloignement"} n'est pas dans la fenêtre : tourne la molette du zoom d'un cran vers la gauche.`, geste: "tourner", molette: "zoom", vers: Math.max(0, v.zoom - 1) };
      // le repère paraît posé sur le pic : on zoome, aussi loin que le pic reste dans la fenêtre ; sinon, on le pose d'abord
      const surLePic = Math.abs(v.repere - f) <= (FENETRES[v.zoom] * 10) / 320;
      const possible = zoomPossible(v.repere, f);
      if (surLePic && possible > v.zoom) return { cle: "zoom", etape: E.spectre, texte: "Tourne la molette du zoom vers la droite : la fenêtre se resserre autour du repère, et les pics se séparent.", geste: "tourner", molette: "zoom", vers: possible };
      return viser();
    }
    return { cle: "fini", etape: E.spectre, texte: "Tout est noté. Touche « J'ai fini » pour appeler le professeur.", geste: "bouton", bouton: "fini" };
  };

  const p = pas();
  // le carnet ouvert sans rien à y écrire : on le referme avant de manipuler
  const auCarnet = p.geste === "ligne" || p.geste === "ecrire" || p.cle === "carnet-annuler";
  if (v.carnet === "ouvert" && !auCarnet) return { cle: "carnet-fermer", etape: p.etape, texte: "Ferme le carnet : il reste un geste à faire avant d'écrire.", geste: "bouton", bouton: "fermer" };
  if (v.carnet !== "ferme" && v.carnet !== "ouvert" && !auCarnet) return { cle: "carnet-annuler", etape: p.etape, texte: "Il reste un geste à faire avant d'écrire : touche « Annuler ».", geste: "attendre" };
  return p;
}
