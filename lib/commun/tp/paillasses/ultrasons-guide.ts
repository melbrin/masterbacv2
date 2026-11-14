// Le guide de la paillasse « ultrasons » : ce qu'un professeur, debout à côté de l'élève, lui dirait de faire maintenant.
// Il se calcule à partir de l'état de la manipulation et de ce que la vue retient en plus : la place où l'élève a lâché
// les deux curseurs de l'écran, et le carnet ouvert ou fermé. Il dit le geste, jamais la mesure : où poser les curseurs,
// quand le récepteur est en phase, mais ni la période ni la graduation à lire.
// Fonctions pures : la vue s'en sert pour placer la main et écrire la phrase ; les tests suivent le guide jusqu'au bout
// et vérifient que la manipulation obtenue est sans faute (tests/unitaires/tp/ultrasons-guide.test.ts).
import { BASES, CALIBRES, DEMI_HAUTEUR, LARGEUR, RAIL, amplitudeRecue, comparable, decalageDuMobile, emet, longueurOnde, periode, periodesVues, signalVoie, source, type EtatUltrasons, type Prise, type ReglagesUltrasons } from "./ultrasons";

/** Les lignes du carnet de mesures, et leur nom. */
export type LigneUltrasons = "periode" | "depart" | "arrivee" | "nombre";
export const LIGNES_DU_CARNET: Record<LigneUltrasons, string> = { periode: "Période du signal", depart: "Position de départ", arrivee: "Position d'arrivée", nombre: "Longueurs d'onde comptées" };

/** Ce que la vue retient en plus de l'état des règles. */
export interface VueUltrasons {
  /**
   * Les deux curseurs de l'écran, A puis B, en divisions depuis le bord gauche : là où l'élève les a lâchés. Pendant
   * qu'il en glisse un, le guide garde l'ancienne place : la consigne ne change pas au passage d'un sommet.
   */
  curseurs: [number, number];
  /** le carnet : fermé, ouvert sur ses lignes, ou une ligne en cours d'écriture */
  carnet: "ferme" | "ouvert" | LigneUltrasons;
}

/** Un pas du guide : la phrase, et le geste à montrer. `etape` : le rang de l'étape du protocole en cours. */
export type PasDuGuide = { cle: string; texte: string; etape: number } & (
  /** tirer un câble d'une prise à l'autre */
  | { geste: "cable"; de: Prise; vers: Prise }
  /** toucher un câble mal placé, puis sa croix, pour le retirer */
  | { geste: "decabler"; a: Prise; b: Prise }
  /** tourner une molette de l'oscilloscope jusqu'au rang `vers` */
  | { geste: "tourner"; molette: "voie1" | "voie2" | "base"; vers: number }
  /** glisser un curseur de l'écran (0 pour A, 1 pour B) jusqu'à la division `vers` */
  | { geste: "curseur"; lequel: 0 | 1; vers: number }
  /** glisser lentement le récepteur mobile, ou le doigt sur la molette de réglage fin, dans un sens : le guide dit quand s'arrêter */
  | { geste: "glisser"; quoi: "mobile" | "fin"; sens: 1 | -1 }
  /** ramener le récepteur mobile près d'une graduation, en millimètres */
  | { geste: "amener"; vers: number }
  /** une touche sous la scène */
  | { geste: "bouton"; bouton: "carnet" | "fermer" | "fini" }
  /** une ligne du carnet ouvert */
  | { geste: "ligne"; ligne: LigneUltrasons }
  /** lire un appareil et écrire la lecture au pavé de chiffres */
  | { geste: "ecrire"; ligne: LigneUltrasons }
  | { geste: "attendre" }
);

/** Le montage du protocole : la sortie GÉN vers l'émetteur, le récepteur fixe sur la voie 1, le récepteur mobile sur la voie 2. */
export const MONTAGE: readonly (readonly [Prise, Prise])[] = [["gen", "em"], ["r1", "y1"], ["r2", "y2"]];
const NOMS: Record<Prise, string> = { gen: "la sortie GÉN", y1: "la voie 1", y2: "la voie 2", em: "l'émetteur", r1: "le récepteur fixe", r2: "le récepteur mobile" };
/** Un signal bien cadré monte au plus à cette hauteur, en divisions ; en dessous d'une division, il est trop écrasé. */
const HAUTEUR_VISEE = 3.6;
/** Pour mesurer la période, l'écran montre de deux périodes et demie à quatre et demie. */
const PERIODES = { min: 2.5, max: 4.5 };
/** Un curseur est posé sur un sommet à cette distance près, en divisions : le guide passe alors à l'autre curseur. */
const SUR_SOMMET = 0.08;
/** L'écart des deux curseurs donne la période à cette précision près : la lecture reste sans faute. */
const PRECISION = 0.018;
/** Le récepteur est en phase à cette distance près, en millimètres ; un peu plus loin, il se règle à la molette de réglage fin. */
const EN_PHASE = 0.25;
const TOUT_PRES = 1.2;
/** Le nombre de longueurs d'onde que le protocole demande de compter. */
const A_COMPTER = 10;
/** L'amplitude du signal du récepteur mobile aux deux bouts du rail, en volts : la plus forte près de l'émetteur, puis la plus faible. */
const AMPLITUDES_DU_MOBILE: readonly [number, number] = [amplitudeRecue(RAIL.min), amplitudeRecue(RAIL.max)];

/**
 * Une phrase du guide, prête à s'afficher : les espaces des guillemets et de la ponctuation double ne se coupent pas,
 * pour qu'un guillemet ou un deux-points ne se retrouve pas seul au bout d'une ligne. Sert aux trois guides des ondes.
 */
export const insecable = (texte: string): string => texte.replace(/« /g, "«\u00a0").replace(/ ([»:;?!])/g, "\u00a0$1");

const relies = (etat: EtatUltrasons, a: Prise, b: Prise): boolean => etat.fils.some(([u, v]) => (u === a && v === b) || (u === b && v === a));

/** Le rang de la sensibilité qui cadre le mieux un signal : la plus fine qui le garde dans l'écran. */
export function calibreVise(amplitude: number): number {
  const rang = CALIBRES.findIndex((c) => amplitude / c <= HAUTEUR_VISEE);
  return rang < 0 ? CALIBRES.length - 1 : rang;
}
/** Le rang de la base de temps visée : la plus lente qui montre au plus quatre périodes et demie. */
export function baseVisee(r: ReglagesUltrasons): number {
  return BASES.reduce((rang, base, i) => ((LARGEUR * base) / periode(r) <= PERIODES.max ? i : rang), 0);
}
/** Les sommets de la courbe de la voie 1 que montre l'écran, en divisions depuis le bord gauche. */
export function sommetsVisibles(r: ReglagesUltrasons, etat: EtatUltrasons): number[] {
  const largeur = periode(r) / BASES[etat.base];
  const sommets: number[] = [];
  for (let k = 0; (0.25 + k) * largeur <= LARGEUR - 0.05; k++) sommets.push((0.25 + k) * largeur);
  return sommets;
}
/** Le nombre de périodes entre les deux curseurs, s'ils sont posés sur deux sommets de la voie 1 ; null sinon. */
export function periodesEntreCurseurs(r: ReglagesUltrasons, etat: EtatUltrasons, curseurs: readonly [number, number]): number | null {
  const largeur = periode(r) / BASES[etat.base];
  /** l'écart d'un curseur au sommet le plus proche */
  const auSommet = (div: number) => Math.abs(div - (0.25 + Math.max(0, Math.round(div / largeur - 0.25))) * largeur);
  const ecart = Math.abs(curseurs[1] - curseurs[0]);
  const k = Math.round(ecart / largeur);
  if (k < 1 || Math.abs(ecart - k * largeur) > PRECISION * k * largeur) return null;
  return auSommet(curseurs[0]) <= 0.1 && auSommet(curseurs[1]) <= 0.1 ? k : null;
}

/** Vrai si la période notée est celle d'une mesure sans faute : l'écran était bien réglé, et la valeur est juste. */
export function periodeJuste(r: ReglagesUltrasons, etat: EtatUltrasons): boolean {
  const lue = etat.periode;
  return lue !== null && Math.abs(lue.note - periode(r)) / periode(r) <= 0.025 && lue.periodes >= 1 && lue.periodes <= 8 && lue.hauteurs.some((h) => h >= 1 && h <= DEMI_HAUTEUR);
}
/** Vrai si la position de départ notée est en phase, bien lue, et laisse au moins cinq longueurs d'onde devant elle. */
export function departJuste(r: ReglagesUltrasons, etat: EtatUltrasons): boolean {
  const d = etat.depart;
  return d !== null && d.ecart !== null && Math.abs(d.ecart) <= 0.06 && Math.abs(d.note * 10 - d.x) <= 0.6 && d.x + 5 * longueurOnde(r) <= RAIL.max;
}
/** Vrai si la position d'arrivée notée est en phase, bien lue, à cinq longueurs d'onde au moins du départ. */
export function arriveeJuste(r: ReglagesUltrasons, etat: EtatUltrasons): boolean {
  const a = etat.arrivee, d = etat.depart;
  return a !== null && d !== null && a.ecart !== null && Math.abs(a.ecart) <= 0.06 && Math.abs(a.note * 10 - a.x) <= 0.6 && Math.round(Math.abs(a.x - d.x) / longueurOnde(r)) >= 5;
}

/**
 * Ce qu'il faut faire maintenant. La fonction rend toujours un pas : le premier geste qui manque, dans l'ordre du
 * protocole. Elle ne lit que ce qu'un professeur verrait par-dessus l'épaule de l'élève.
 */
export function prochain(r: ReglagesUltrasons, etat: EtatUltrasons, v: VueUltrasons): PasDuGuide {
  const p = pasSuivant(r, etat, v);
  return { ...p, texte: insecable(p.texte) };
}

function pasSuivant(r: ReglagesUltrasons, etat: EtatUltrasons, v: VueUltrasons): PasDuGuide {
  const E = { cables: 0, sensibilites: 1, base: 2, periode: 3, depart: 4, arrivee: 5 };
  const lambda = longueurOnde(r);

  /** Noter une lecture : ouvrir le carnet, toucher la ligne, lire l'appareil et écrire. */
  const noter = (ligne: LigneUltrasons, etape: number, carnet: string, ecrire: string): PasDuGuide => {
    if (v.carnet === ligne) return { cle: `${ligne}-ecrire`, etape, texte: ecrire, geste: "ecrire", ligne };
    if (v.carnet === "ouvert") return { cle: `${ligne}-ligne`, etape, texte: `Touche la ligne « ${LIGNES_DU_CARNET[ligne]} ».`, geste: "ligne", ligne };
    if (v.carnet !== "ferme") return { cle: "carnet-annuler", etape, texte: "Ce n'est pas cette ligne qu'il faut écrire maintenant : touche « Annuler ».", geste: "attendre" };
    return { cle: `${ligne}-carnet`, etape, texte: carnet, geste: "bouton", bouton: "carnet" };
  };
  const mobile = (cle: string, etape: number, texte: string, sens: 1 | -1): PasDuGuide => ({ cle, etape, texte, geste: "glisser", quoi: "mobile", sens });
  const fin = (cle: string, etape: number, texte: string, sens: 1 | -1): PasDuGuide => ({ cle, etape, texte, geste: "glisser", quoi: "fin", sens });
  const LIRE_LE_RAIL = "Lis dans la loupe la graduation en face du repère, au demi-millimètre près. Écris-la en centimètres.";

  /** Le premier geste qui manque. */
  const pas = (): PasDuGuide => {
    // ----- les câbles : l'émetteur alimenté, un récepteur sur chaque voie -----
    if (!emet(etat) || !comparable(etat)) {
      const enTrop = etat.fils.find(([a, b]) => !MONTAGE.some(([u, w]) => (u === a && w === b) || (u === b && w === a)));
      if (enTrop) return { cle: `cable-retirer-${enTrop[0]}-${enTrop[1]}`, etape: E.cables, texte: `Ce câble, entre ${NOMS[enTrop[0]]} et ${NOMS[enTrop[1]]}, n'est pas à sa place : touche-le, puis touche la croix.`, geste: "decabler", a: enTrop[0], b: enTrop[1] };
      if (!relies(etat, "gen", "em")) return { cle: "cable-emetteur", etape: E.cables, texte: "Tire un câble de la sortie GÉN jusqu'à l'émetteur E : pose le doigt sur la prise rouge, puis glisse jusqu'à l'autre.", geste: "cable", de: "gen", vers: "em" };
      if (!relies(etat, "r1", "y1")) return { cle: "cable-fixe", etape: E.cables, texte: "Tire un câble du récepteur fixe R1 jusqu'à l'entrée de la voie 1.", geste: "cable", de: "r1", vers: "y1" };
      return { cle: "cable-mobile", etape: E.cables, texte: "Tire un câble du récepteur mobile R2 jusqu'à l'entrée de la voie 2.", geste: "cable", de: "r2", vers: "y2" };
    }

    // ----- la sensibilité de chaque voie : un signal de plusieurs divisions, qui tient dans l'écran -----
    for (const voie of [1, 2] as const) {
      const signal = signalVoie(r, etat, voie);
      if (!signal) continue;
      const calibre = CALIBRES[etat.calibres[voie - 1]];
      const hauteur = signal.amplitude / calibre;
      // le signal du récepteur mobile faiblit quand il s'éloigne de l'émetteur : sa sensibilité doit convenir d'un bout à l'autre du rail
      const [forte, faible] = source(etat, voie) === "mobile" ? AMPLITUDES_DU_MOBILE : [signal.amplitude, signal.amplitude];
      if (faible / calibre >= 1 && forte / calibre <= DEMI_HAUTEUR) continue;
      const texte = forte / calibre > DEMI_HAUTEUR
        ? (hauteur > DEMI_HAUTEUR ? `Le signal de la voie ${voie} sort de l'écran : tourne sa molette vers la droite, jusqu'à ce qu'il tienne dans l'écran.`
          : `Le signal de la voie ${voie} sortira de l'écran quand R2 se rapprochera : tourne sa molette d'un cran vers la droite.`)
        : hauteur < 1 ? `Le signal de la voie ${voie} est trop écrasé : tourne sa molette vers la gauche, jusqu'à ce qu'il occupe plusieurs divisions.`
          : `Le signal de la voie ${voie} faiblira quand R2 s'éloignera : tourne encore sa molette d'un cran vers la gauche.`;
      return { cle: `sensibilite-${voie}`, etape: E.sensibilites, texte, geste: "tourner", molette: voie === 1 ? "voie1" : "voie2", vers: calibreVise(forte) };
    }

    // ----- la base de temps : trois ou quatre périodes pour mesurer ; ensuite, de quoi comparer les deux courbes -----
    const vues = periodesVues(r, etat);
    const mesuree = periodeJuste(r, etat);
    if (mesuree ? vues < 1 || vues > 8 : vues < PERIODES.min || vues > PERIODES.max) {
      return {
        cle: "base", etape: E.base, geste: "tourner", molette: "base", vers: baseVisee(r),
        texte: vues > PERIODES.max ? "Les périodes sont trop serrées : tourne la molette de la base de temps vers la gauche, jusqu'à en voir trois ou quatre."
          : "Trop peu de périodes à l'écran : tourne la molette de la base de temps vers la droite, jusqu'à en voir trois ou quatre.",
      };
    }

    // ----- la période : les deux curseurs sur deux sommets, puis le calcul -----
    if (!mesuree) {
      const reprise = etat.periode ? "Ta période est à reprendre. " : "";
      if (periodesEntreCurseurs(r, etat, v.curseurs) === null) {
        const sommets = sommetsVisibles(r, etat);
        if (Math.abs(v.curseurs[0] - sommets[0]) > SUR_SOMMET) return { cle: "periode-curseur-a", etape: E.periode, texte: `${reprise}Glisse le curseur A sur le premier sommet de la courbe de la voie 1.`, geste: "curseur", lequel: 0, vers: sommets[0] };
        return { cle: "periode-curseur-b", etape: E.periode, texte: "Glisse le curseur B sur le dernier sommet de la courbe de la voie 1.", geste: "curseur", lequel: 1, vers: sommets[sommets.length - 1] };
      }
      return noter("periode", E.periode, `${reprise}Les deux curseurs sont sur deux sommets. Ouvre le carnet pour noter la période.`,
        "Calcule la période : l'écart des curseurs fois la base de temps, divisé par le nombre de périodes entre eux. Écris-la en µs.");
    }

    // où se trouve le récepteur mobile par rapport à la position en phase la plus proche
    const decalage = (decalageDuMobile(r, etat) ?? 0) * lambda;
    // ----- la position de départ : en phase, près du début du rail -----
    if (!departJuste(r, etat)) {
      // une position déjà notée, à reprendre : le guide dit ce qui n'allait pas, en phrases plus courtes
      const d = etat.depart;
      const malLue = d !== null && d.ecart !== null && Math.abs(d.ecart) <= 0.06 && Math.abs(d.note * 10 - d.x) > 0.6;
      const reprise = !d ? "" : d.ecart === null || Math.abs(d.ecart) > 0.06 ? "Ta position de départ n'était pas en phase. " : malLue ? "Ta position de départ est mal lue. " : "Ta position de départ est trop loin sur le rail. ";
      // la dernière position de départ qui laisse dix longueurs d'onde devant elle
      const limite = RAIL.max - 0.3 - A_COMPTER * lambda;
      if (etat.x > limite + lambda / 2) {
        return { cle: "depart-reculer", etape: E.depart, texte: reprise ? `${reprise}Ramène R2 au début du rail, près de R1.` : "Ramène le récepteur R2 au début du rail, près de R1 : il lui faut de la place pour s'éloigner.", geste: "amener", vers: RAIL.min + 1 };
      }
      let visee = etat.x - decalage;
      while (visee < RAIL.min) visee += lambda;
      while (visee > limite) visee -= lambda;
      const ecart = etat.x - visee;
      if (Math.abs(ecart) > TOUT_PRES) {
        const cote = ecart > 0 ? "gauche" : "droite";
        return mobile(`depart-${cote}`, E.depart, reprise ? `${reprise}Fais glisser lentement R2 vers la ${cote}, jusqu'à aligner les sommets.`
          : `Fais glisser lentement R2 vers la ${cote}. Arrête-toi quand les sommets des deux courbes sont alignés.`, ecart > 0 ? -1 : 1);
      }
      if (Math.abs(ecart) > EN_PHASE) {
        return fin("depart-fin", E.depart, reprise ? `${reprise}Finis au réglage fin, dans le sens de la flèche.`
          : "Presque. Glisse le doigt sur le réglage fin, dans le sens de la flèche, jusqu'à aligner les sommets des deux courbes.", ecart > 0 ? -1 : 1);
      }
      return noter("depart", E.depart, malLue ? "Ta position de départ est mal lue. Ne touche pas à R2 : ouvre le carnet et relis le rail à la loupe."
        : "Les deux signaux sont en phase : ne touche plus à R2. Ouvre le carnet pour noter sa position de départ.", LIRE_LE_RAIL);
    }

    // ----- la position d'arrivée : dix retours en phase plus loin -----
    const depart = etat.depart?.x ?? etat.x;
    const k = Math.min(A_COMPTER, Math.floor((RAIL.max - 0.3 - depart) / lambda));
    if (!arriveeJuste(r, etat)) {
      const a = etat.arrivee;
      const malLue = a !== null && a.ecart !== null && Math.abs(a.ecart) <= 0.06 && Math.abs(a.note * 10 - a.x) > 0.6;
      const reprise = !a ? "" : a.ecart === null || Math.abs(a.ecart) > 0.06 ? "Ta position d'arrivée n'était pas en phase. " : malLue ? "Ta position d'arrivée est mal lue. " : "Ta position d'arrivée est trop près du départ. ";
      const enPhase = etat.x - decalage;
      const passes = Math.round((enPhase - depart) / lambda);
      const compter = reprise ? `${reprise}Éloigne lentement R2 en comptant les retours en phase. Arrête-toi au ${k}e.`
        : `Éloigne lentement R2 et compte chaque retour en phase, quand les sommets s'alignent de nouveau. Arrête-toi au ${k}e.`;
      const revenir = `${reprise}Tu as dépassé le ${k}e retour en phase : reviens lentement vers la gauche.`;
      if (passes < k) return mobile("arrivee-glisser", E.arrivee, compter, 1);
      if (passes > k) return mobile("arrivee-revenir", E.arrivee, revenir, -1);
      if (Math.abs(decalage) > TOUT_PRES) return decalage > 0 ? mobile("arrivee-revenir", E.arrivee, revenir, -1) : mobile("arrivee-glisser", E.arrivee, compter, 1);
      if (Math.abs(decalage) > EN_PHASE) {
        return fin("arrivee-fin", E.arrivee, reprise ? `${reprise}Finis au réglage fin, dans le sens de la flèche.`
          : `C'est le ${k}e retour en phase. Finis au réglage fin, dans le sens de la flèche, jusqu'à aligner les sommets des deux courbes.`, decalage > 0 ? -1 : 1);
      }
      return noter("arrivee", E.arrivee, malLue ? "Ta position d'arrivée est mal lue. Ne touche pas à R2 : ouvre le carnet et relis le rail à la loupe."
        : `C'est le ${k}e retour en phase : ne touche plus à R2. Ouvre le carnet pour noter sa position d'arrivée.`, LIRE_LE_RAIL);
    }

    // ----- le nombre de longueurs d'onde -----
    const parcourues = Math.round(Math.abs((etat.arrivee?.x ?? depart) - depart) / lambda);
    if (etat.nombre !== parcourues) {
      return noter("nombre", E.arrivee, etat.nombre === null ? "Il reste à noter le nombre de longueurs d'onde. Ouvre le carnet." : "Ton nombre de longueurs d'onde ne va pas avec tes deux positions. Ouvre le carnet pour le corriger.",
        "Écris le nombre de retours en phase comptés entre tes deux positions : c'est le nombre de longueurs d'onde.");
    }
    return { cle: "fini", etape: E.arrivee, texte: "Tout est noté. Touche « J'ai fini » pour appeler le professeur.", geste: "bouton", bouton: "fini" };
  };

  const p = pas();
  // le carnet ouvert sans rien à y écrire : on le referme avant de manipuler
  const auCarnet = p.geste === "ligne" || p.geste === "ecrire" || p.cle === "carnet-annuler";
  if (v.carnet === "ouvert" && !auCarnet) return { cle: "carnet-fermer", etape: p.etape, texte: "Ferme le carnet : il reste un geste à faire avant d'écrire.", geste: "bouton", bouton: "fermer" };
  if (v.carnet !== "ferme" && v.carnet !== "ouvert" && !auCarnet) return { cle: "carnet-annuler", etape: p.etape, texte: "Il reste un geste à faire avant d'écrire : touche « Annuler ».", geste: "attendre" };
  return p;
}
