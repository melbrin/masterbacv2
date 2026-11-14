// La paillasse Titrage (décision 0012) : une burette, un flacon de solution titrante, une prise d'essai à prélever à la
// pipette jaugée, et de quoi repérer l'équivalence : un indicateur coloré, un pH-mètre ou un conductimètre. L'élève fait les gestes du laboratoire : rincer et remplir la
// burette, régler le zéro au robinet, prélever au trait de jauge, verser au filet puis goutte à goutte, lire le volume.
// Chaque geste a ses conséquences : une burette non rincée dilue la solution titrante, une prise mal ajustée décale
// l'équivalence, sans agitation la couleur change en retard.
// Fonctions pures : le navigateur s'en sert pour faire vivre la paillasse, le serveur pour rejouer la manipulation.
// Les volumes sont en millilitres, les concentrations en mol/L.
import { nombre } from "@/lib/commun/format";
import { nombreDe, scoreDesFautes, texteDe, type BilanPaillasse, type Faute, type GesteBrut, type ReglesPaillasse } from "../types";

export interface ReglagesTitrage {
  /** la concentration de l'espèce titrée dans la solution à prélever : c'est ce que le titrage cherche */
  Ca: number;
  /** le pK_A de l'acide titré ; null pour un acide fort */
  pKa: number | null;
  /** le volume de la pipette jaugée */
  Va: number;
  /** la concentration de la solution titrante, dans son flacon */
  Cb: number;
  /** ce qui repère l'équivalence */
  suivi: "indicateur" | "phmetre" | "conductimetre";
  indicateur: "bbt" | "phenolphtaleine";
  /** l'eau distillée à ajouter pour que la sonde trempe ; 0 s'il n'en faut pas */
  eau: number;
  /**
   * Pour un suivi par conductimétrie : les conductivités molaires des ions, en mS·m²/mol. L'ion spectateur qui accompagne
   * l'espèce titrée, l'ion titré, l'ion qui accompagne le réactif titrant, le réactif titrant lui-même.
   */
  ions?: { spectateur: number; titre: number; contre: number; titrant: number };
  /** les noms des solutions : la solution titrante, la solution à titrer ; `etiquette` : ce qui tient sur le flacon, si le nom est long */
  noms: { titrante: string; titree: string; etiquette?: string };
}

export interface EtatTitrage {
  // ----- la burette -----
  /** le volume de liquide dans la burette */
  volume: number;
  /** vrai tant que les parois de la burette sont mouillées d'eau : au départ, elle vient d'être lavée */
  eauBurette: boolean;
  /** vrai si la solution de la burette a été diluée par cette eau */
  dilue: boolean;
  /** ce que la burette a reçu depuis qu'elle a été vide pour la dernière fois */
  recu: number;
  /** vrai si la burette a coulé depuis son dernier remplissage : son niveau a été descendu au robinet */
  descendu: boolean;
  /** ce qui est posé sous la burette */
  dessous: "rien" | "poubelle" | "erlenmeyer";
  /** ce qui a coulé à côté : une burette qui déborde, de la solution versée sans rien dessous */
  renverse: number;
  // ----- la prise d'essai -----
  /** où est la pipette */
  pipette: "repos" | "becher" | "erlenmeyer";
  /** ce que la pipette contient */
  dansPipette: number;
  /** vrai si le liquide est monté jusque dans la propipette */
  aspireTrop: boolean;
  /** le volume de solution à titrer dans l'erlenmeyer */
  prise: number;
  /** l'eau distillée ajoutée dans l'erlenmeyer */
  eau: number;
  /** les gouttes d'indicateur coloré */
  gouttes: number;
  barreau: boolean;
  /** la vitesse de l'agitateur, de 0 à 5 */
  agitation: number;
  /** la sonde du pH-mètre ou du conductimètre : rincée, plongée dans le récipient */
  sondeRincee: boolean;
  sonde: boolean;
  // ----- le titrage -----
  /** la graduation lue au moment où la première goutte tombe dans l'erlenmeyer */
  depart: number | null;
  /** le volume de solution titrante versé dans l'erlenmeyer */
  verse: number;
  /** comment l'équivalence a été franchie : goutte à goutte, ou au filet */
  franchi: "goutte" | "filet" | null;
  /** les relevés de l'appareil : un point à chaque ajout, quand la sonde trempe. `y` : le pH, ou la conductivité en µS/cm */
  releves: { V: number; y: number }[];
  /**
   * Pendant qu'un filet coule, le relevé suit le volume versé : c'est le volume du point que ce filet a posé, à
   * remplacer au morceau suivant. Un ajout ne laisse donc qu'un point, là où le robinet s'est refermé. Null hors d'un filet.
   */
  filetEnCours: number | null;
  /** le volume que l'élève retient pour l'équivalence ; null tant qu'il ne l'a pas noté */
  note: number | null;
  /** le nombre de titrages recommencés */
  essais: number;
}

/** La burette est graduée de 0 à 25 mL ; elle peut contenir un peu plus, au-dessus du zéro. */
export const CAPACITE = 25;
export const AU_DESSUS = 2;
/** Ce que le récipient du titrage peut recevoir d'eau distillée, au plus. */
export const EAU_MAX = 120;
/** Le volume d'une goutte. */
export const GOUTTE = 0.05;
/** Ce que l'eau restée sur les parois enlève à la concentration de la solution titrante. */
export const DILUTION = 0.975;
/** Le retard de la couleur quand rien n'agite le mélange. */
export const RETARD = 0.6;
const KE = 1e-14;
const centieme = (x: number) => Math.round(x * 100) / 100;
const ml = (x: number) => `${nombre(x, 2)} mL`;

const DEPART: EtatTitrage = {
  volume: 0, eauBurette: true, dilue: false, recu: 0, descendu: false, dessous: "rien", renverse: 0,
  pipette: "repos", dansPipette: 0, aspireTrop: false, prise: 0, eau: 0, gouttes: 0, barreau: false, agitation: 0, sondeRincee: false, sonde: false,
  depart: null, verse: 0, franchi: null, releves: [], filetEnCours: null, note: null, essais: 0,
};

/** La graduation en face du niveau du liquide : 0 en haut, 25 en bas ; négative au-dessus du zéro. */
export const lecture = (etat: EtatTitrage): number => centieme(CAPACITE - etat.volume);
/** La concentration de ce qui sort de la burette. */
const titrant = (r: ReglagesTitrage, etat: EtatTitrage): number => r.Cb * (etat.dilue ? DILUTION : 1);
/** Le volume à l'équivalence d'une manipulation sans défaut : n(titré) = n(titrant versé). */
export const volumeEquivalence = (r: ReglagesTitrage): number => (r.Ca * r.Va) / r.Cb;
/** Le volume à l'équivalence de cette manipulation, avec sa prise d'essai et sa burette. */
export const equivalenceReelle = (r: ReglagesTitrage, etat: EtatTitrage): number => (r.Ca * etat.prise) / titrant(r, etat);

/**
 * Le pH du mélange. L'électroneutralité, [H₃O⁺] + [Na⁺] = [A⁻] + [HO⁻], est résolue par dichotomie : la même relation
 * décrit le début, le saut et la fin du titrage, pour un acide fort comme pour un acide faible.
 */
export function pHMelange(r: ReglagesTitrage, prise: number, eau: number, verse: number, Cb = r.Cb): number {
  const total = prise + eau + verse;
  if (total <= 0) return 7;
  const acide = (r.Ca * prise) / total;
  const sodium = (Cb * verse) / total;
  const Ka = r.pKa === null ? null : 10 ** -r.pKa;
  let bas = 0, haut = 14;
  for (let i = 0; i < 50; i++) {
    const milieu = (bas + haut) / 2;
    const h = 10 ** -milieu;
    const base = Ka === null ? acide : (acide * Ka) / (Ka + h);
    // trop de charges positives : la solution réelle est moins acide que ce pH d'essai
    if (h + sodium - base - KE / h > 0) bas = milieu; else haut = milieu;
  }
  return (bas + haut) / 2;
}
/** Le pH du contenu de l'erlenmeyer. */
export const pHActuel = (r: ReglagesTitrage, etat: EtatTitrage): number => pHMelange(r, etat.prise, etat.eau, etat.verse, titrant(r, etat));
/** Vrai si le mélange est agité : un barreau dans l'erlenmeyer, l'agitateur en marche. */
export const agite = (etat: EtatTitrage): boolean => etat.barreau && etat.agitation > 0 && etat.dessous === "erlenmeyer";
/** Le pH que montre la couleur : sans agitation, elle a du retard sur ce qui a été versé. */
export const pHVu = (r: ReglagesTitrage, etat: EtatTitrage): number =>
  pHMelange(r, etat.prise, etat.eau, agite(etat) ? etat.verse : Math.max(0, etat.verse - RETARD), titrant(r, etat));
/** Le volume de liquide dans l'erlenmeyer. */
export const dansErlenmeyer = (etat: EtatTitrage): number => etat.prise + etat.eau + etat.verse;
/**
 * La conductivité du mélange, en µS/cm. Avant l'équivalence, l'ion titré est remplacé par l'ion qui accompagne le
 * réactif titrant ; après, le réactif titrant s'accumule. Chaque ion compte pour sa conductivité molaire fois sa concentration.
 */
export function conductivite(r: ReglagesTitrage, etat: EtatTitrage): number {
  const total = dansErlenmeyer(etat);
  if (!r.ions || total <= 0) return 0;
  const depart = r.Ca * etat.prise;
  const ajoute = titrant(r, etat) * etat.verse;
  const somme = r.ions.spectateur * depart + r.ions.titre * Math.max(0, depart - ajoute) + r.ions.contre * ajoute + r.ions.titrant * Math.max(0, ajoute - depart);
  // des mS·m²/mol fois des mol/L donnent des S/m ; un S/m vaut 10 000 µS/cm
  return Math.round(((somme / total) * 10000) * 10) / 10;
}
/** Une droite y = a × V + b. */
export interface Droite { a: number; b: number }
/** La droite qui passe au mieux par des points (moindres carrés) ; null s'il n'y en a pas deux à des volumes différents. */
export function droiteAjustee(points: readonly { V: number; y: number }[]): Droite | null {
  const n = points.length;
  const sx = points.reduce((s, p) => s + p.V, 0), sy = points.reduce((s, p) => s + p.y, 0);
  const sxx = points.reduce((s, p) => s + p.V * p.V, 0), sxy = points.reduce((s, p) => s + p.V * p.y, 0);
  const d = n * sxx - sx * sx;
  if (n < 2 || Math.abs(d) < 1e-9) return null;
  const a = (n * sxy - sx * sy) / d;
  return { a, b: (sy - a * sx) / n };
}
/**
 * Les deux droites d'une courbe de conductimétrie, pour un repère posé au volume donné : chacune passe au mieux par
 * les cinq points les plus proches du repère, de son côté. C'est la méthode du cours : deux droites, et leur croisement
 * à l'équivalence. Près de la cassure, les points voisins suffisent : plus loin, la dilution courbe un peu la courbe.
 */
export function droitesAutour(releves: readonly { V: number; y: number }[], repere: number): { avant: Droite | null; apres: Droite | null; croisement: number | null } {
  const tries = [...releves].sort((p, q) => p.V - q.V);
  const avant = droiteAjustee(tries.filter((p) => p.V < repere).slice(-5));
  const apres = droiteAjustee(tries.filter((p) => p.V >= repere).slice(0, 5));
  const croisement = avant && apres && Math.abs(avant.a - apres.a) > 1e-9 ? (apres.b - avant.b) / (avant.a - apres.a) : null;
  return { avant, apres, croisement };
}
/** Vrai si la sonde trempe assez pour mesurer. */
export const sondeTrempe = (r: ReglagesTitrage, etat: EtatTitrage): boolean => etat.sonde && etat.prise + etat.eau >= r.Va + r.eau - 5;

/** Ajoute le relevé de l'appareil pour le volume versé, si la sonde trempe. */
function avecReleve(r: ReglagesTitrage, etat: EtatTitrage): EtatTitrage {
  if (r.suivi === "indicateur" || !sondeTrempe(r, etat) || etat.prise <= 0) return etat;
  const V = centieme(etat.verse);
  return { ...etat, releves: [...etat.releves.filter((p) => p.V !== V), { V, y: r.suivi === "phmetre" ? pHActuel(r, etat) : conductivite(r, etat) }] };
}

/**
 * Applique un geste. Un geste inconnu, mal formé ou impossible ne change rien.
 * Tout geste qui n'est pas un morceau de filet met fin à l'ajout en cours : c'est le cas de « pause », que la paillasse
 * envoie quand le robinet se referme. Deux morceaux de filet à la suite valent donc leur somme, relevés compris.
 */
function geste(r: ReglagesTitrage, etat: EtatTitrage, g: GesteBrut): EtatTitrage {
  const suite = applique(r, etat, g);
  return (g.g === "couler" && g.filet === true) || suite.filetEnCours === null ? suite : { ...suite, filetEnCours: null };
}

function applique(r: ReglagesTitrage, etat: EtatTitrage, g: GesteBrut): EtatTitrage {
  const v = nombreDe(g, "v");
  const positif = v !== null && v > 0 && v <= 30 ? centieme(v) : null;
  switch (g.g) {
    // verser la solution titrante du flacon dans la burette
    case "remplir": {
      if (positif === null) return etat;
      const place = CAPACITE + AU_DESSUS - etat.volume;
      const entre = Math.min(positif, place);
      return { ...etat, volume: centieme(etat.volume + entre), recu: centieme(etat.recu + entre), descendu: false, dilue: etat.dilue || etat.eauBurette, renverse: centieme(etat.renverse + positif - entre), note: null };
    }
    // poser quelque chose sous la burette
    case "dessous": {
      const quoi = texteDe(g, "quoi");
      return quoi === "rien" || quoi === "poubelle" || quoi === "erlenmeyer" ? { ...etat, dessous: quoi } : etat;
    }
    // ce qui sort par le robinet : `filet` dit si la solution coulait en filet, ou tombait goutte à goutte
    case "couler": {
      if (positif === null || etat.volume <= 0) return etat;
      const sort = Math.min(positif, etat.volume);
      const reste = centieme(etat.volume - sort);
      const burette = { ...etat, volume: reste, descendu: true, note: null };
      if (etat.dessous === "rien") return { ...burette, renverse: centieme(etat.renverse + sort) };
      if (etat.dessous === "poubelle") {
        // une burette vidée après avoir reçu assez de solution titrante est rincée : ses parois ne portent plus d'eau
        return reste === 0 ? { ...burette, eauBurette: etat.recu >= 3 ? false : etat.eauBurette, dilue: false, recu: 0 } : burette;
      }
      const avant = etat.verse;
      const verse = centieme(avant + sort);
      const equivalence = equivalenceReelle(r, etat);
      const franchi = etat.prise > 0 && avant < equivalence && verse >= equivalence ? (g.filet === true ? "filet" : "goutte") : etat.franchi;
      // le point posé par le morceau de filet d'avant est remplacé : un ajout ne laisse qu'un relevé
      const releves = g.filet === true && etat.filetEnCours !== null ? etat.releves.filter((p) => p.V !== etat.filetEnCours) : etat.releves;
      const apres = avecReleve(r, { ...burette, releves, verse, franchi, depart: etat.depart ?? lecture(etat), ...(reste === 0 ? { recu: 0 } : {}) });
      return { ...apres, filetEnCours: g.filet === true && apres.releves.some((p) => p.V === verse) ? verse : null };
    }
    // la pipette jaugée : la poser dans le bécher de solution, au-dessus de l'erlenmeyer, ou la reposer
    case "pipette": {
      const ou = texteDe(g, "ou");
      return ou === "repos" || ou === "becher" || ou === "erlenmeyer" ? { ...etat, pipette: ou } : etat;
    }
    case "aspirer": {
      if (positif === null || etat.pipette !== "becher") return etat;
      const plein = r.Va * 1.2;
      return { ...etat, dansPipette: centieme(Math.min(plein, etat.dansPipette + positif)), aspireTrop: etat.aspireTrop || etat.dansPipette + positif > plein };
    }
    case "vider": {
      if (positif === null || etat.dansPipette <= 0) return etat;
      const sort = Math.min(positif, etat.dansPipette);
      const pipette = { ...etat, dansPipette: centieme(etat.dansPipette - sort) };
      if (etat.pipette === "becher") return pipette;
      if (etat.pipette === "erlenmeyer") return avecReleve(r, { ...pipette, prise: centieme(etat.prise + sort) });
      return { ...pipette, renverse: centieme(etat.renverse + sort) };
    }
    // l'eau distillée de la pissette, dans l'erlenmeyer
    case "eau": return v === null || v <= 0 || v > EAU_MAX ? etat : avecReleve(r, { ...etat, eau: centieme(Math.min(EAU_MAX, etat.eau + v)) });
    case "goutte": return { ...etat, gouttes: Math.min(30, etat.gouttes + 1) };
    case "barreau": return { ...etat, barreau: true };
    case "agiter": return v !== null && v >= 0 && v <= 5 ? { ...etat, agitation: Math.round(v) } : etat;
    case "rincersonde": return { ...etat, sondeRincee: true };
    case "sonde": return avecReleve(r, { ...etat, sonde: g.dans === true });
    // le volume que l'élève retient pour l'équivalence : ce qu'il lit sur la burette, ou sur sa courbe
    case "noter": return v !== null && v >= 0 && v <= CAPACITE + AU_DESSUS ? { ...etat, note: centieme(v) } : etat;
    // un nouveau titrage : l'erlenmeyer est lavé, la burette reste comme elle est
    case "recommencer":
      return { ...DEPART, volume: etat.volume, eauBurette: etat.eauBurette, dilue: etat.dilue, recu: etat.recu, descendu: etat.descendu, renverse: etat.renverse, dessous: etat.dessous === "erlenmeyer" ? "rien" : etat.dessous, essais: etat.essais + 1 };
    default: return etat;
  }
}

/** Le bilan de la manipulation : le volume retenu pour l'équivalence, et les fautes relevées par le professeur. */
function bilan(r: ReglagesTitrage, etat: EtatTitrage): BilanPaillasse {
  const exact = volumeEquivalence(r);
  const fautes: Faute[] = [];
  const faute = (code: string, grave: boolean, texte: string) => fautes.push({ code, grave, texte });
  const reelle = etat.prise > 0 ? equivalenceReelle(r, etat) : exact;
  const recipient = r.suivi === "indicateur" ? "l'erlenmeyer" : "le bécher";
  const appareil = r.suivi === "conductimetre" ? "du conductimètre" : "du pH-mètre";

  if (etat.verse <= 0) {
    faute("titrage", true, `Tu n'as rien versé dans ${recipient} : le titrage n'est pas fait.`);
  } else {
    // la burette
    if (etat.dilue) faute("rincage", false, `Tu n'as pas rincé la burette avec la solution titrante avant de la remplir : l'eau restée sur les parois l'a diluée, et l'équivalence arrive ${ml(reelle - (r.Ca * etat.prise) / r.Cb)} trop tard.`);
    // la prise d'essai
    const ecartPrise = etat.prise - r.Va;
    if (etat.prise <= 0) faute("prise", true, `Il n'y avait pas de prise d'essai dans ${recipient} : tu as versé la solution titrante dans un récipient vide.`);
    else if (Math.abs(ecartPrise) > 0.3) faute("prise", true, `Ta prise d'essai fait ${ml(etat.prise)} au lieu de ${ml(r.Va)} : le bas du ménisque doit arriver juste sur le trait de jauge.`);
    else if (Math.abs(ecartPrise) > 0.06) faute("prise", false, `Ta prise d'essai fait ${ml(etat.prise)} au lieu de ${ml(r.Va)} : ajuste le bas du ménisque sur le trait de jauge.`);
    if (etat.aspireTrop) faute("propipette", false, "Tu as aspiré trop haut : le liquide est monté dans la propipette.");
    // le mélange
    if (!agite(etat)) faute("agitation", false, "Le mélange n'était pas agité : la couleur change en retard, loin de l'endroit où la goutte tombe.");
    if (r.suivi === "indicateur" && etat.gouttes === 0) faute("indicateur", true, "Tu n'as pas ajouté l'indicateur coloré : rien ne signale l'équivalence.");
    if (r.suivi !== "indicateur") {
      if (!etat.sonde && etat.releves.length === 0) faute("sonde", true, `La sonde ${appareil} n'était pas dans la solution : il n'y a pas de courbe.`);
      else if (!sondeTrempe(r, etat) && etat.releves.length < 4) faute("sonde", true, "La sonde ne trempait pas assez : ajoute de l'eau distillée pour la recouvrir.");
      if (!etat.sondeRincee) faute("rincersonde", false, "Tu n'as pas rincé la sonde à l'eau distillée avant de la plonger.");
    }
    if (etat.renverse > 0.3) faute("renverse", false, `Tu as renversé ${ml(etat.renverse)} sur la paillasse : on ne verse jamais sans récipient dessous, et on ne remplit pas la burette à ras bord.`);
    // l'équivalence
    if (etat.prise > 0 && r.suivi === "indicateur" && etat.gouttes > 0) {
      const depasse = etat.verse - reelle;
      if (depasse < -0.1) faute("avant", true, `Tu t'es arrêté ${ml(-depasse)} avant l'équivalence : la couleur n'avait pas encore changé pour de bon.`);
      else if (etat.franchi === "filet") faute("apres", true, `Tu as franchi l'équivalence au filet, et tu l'as dépassée de ${ml(Math.max(0, depasse))} : près du changement de couleur, ferme le robinet jusqu'au goutte à goutte.`);
      else if (depasse > 0.3) faute("apres", true, `Tu as dépassé l'équivalence de ${ml(depasse)} : dès que la couleur change pour de bon, ferme le robinet.`);
      else if (depasse > 0.12) faute("apres", false, `Tu as dépassé l'équivalence de ${ml(depasse)} : dès que la couleur change pour de bon, ferme le robinet.`);
    }
    if (etat.prise > 0 && r.suivi === "phmetre" && etat.releves.length > 0) {
      const volumes = etat.releves.map((p) => p.V).sort((a, b) => a - b);
      const autour = volumes.filter((V) => Math.abs(V - reelle) <= 1);
      const serre = autour.length >= 4 && autour.every((V, i) => i === 0 || V - autour[i - 1] <= 0.35);
      if (volumes[volumes.length - 1] < reelle + 0.5) faute("avant", true, "Tu t'es arrêté avant la fin du saut de pH : la courbe ne montre pas l'équivalence.");
      else if (!serre) faute("espace", false, "Près du saut de pH, tes ajouts étaient trop espacés pour lire le volume avec précision.");
    }
    if (etat.prise > 0 && r.suivi === "conductimetre" && etat.releves.length > 0) {
      // deux droites se tracent avec des points de chaque côté de la rupture de pente : inutile de les serrer, il en faut assez
      const avant = etat.releves.filter((p) => p.V < reelle - 0.5).length;
      const apres = etat.releves.filter((p) => p.V > reelle + 0.5).length;
      if (apres === 0) faute("avant", true, "Tu t'es arrêté avant la rupture de pente : la courbe ne montre pas l'équivalence.");
      else if (apres < 4) faute("apres", false, `Après la rupture de pente, tu n'as que ${apres} point${apres > 1 ? "s" : ""} : il en faut au moins quatre pour tracer la seconde droite.`);
      if (avant < 4) faute("espace", false, `Avant la rupture de pente, tu n'as que ${avant} point${avant > 1 ? "s" : ""} : il en faut au moins quatre pour tracer la première droite.`);
    }
    // ce que l'élève retient
    if (etat.note === null) {
      faute("note", true, "Tu n'as pas noté le volume à l'équivalence.");
    } else if (r.suivi === "indicateur") {
      // Le volume versé vaut la lecture finale moins la lecture de départ. L'élève note ce qu'il lit sur la burette : sa
      // valeur porte le décalage du zéro. Elle est juste si elle est proche du volume versé, ou proche de la graduation
      // en face du ménisque quand le zéro était réglé à une goutte près : une bonne lecture n'est jamais une faute de lecture.
      const decalage = etat.depart ?? 0;
      const erreur = etat.note - etat.verse;
      const lu = erreur - decalage;
      if (Math.abs(erreur) > 0.07 && Math.abs(lu) <= 0.07) {
        if (Math.abs(decalage) > 0.07) faute("zero", Math.abs(decalage) > 0.2, `La burette n'était pas au zéro au départ : le niveau était ${decalage < 0 ? "au-dessus du zéro" : `à ${ml(decalage)}`}. Ton volume est décalé d'autant. Règle le zéro au robinet avant de commencer.`);
      } else if (Math.abs(erreur) > 0.07) {
        const ecart = Math.min(Math.abs(erreur), Math.abs(lu));
        faute("lecture", ecart > 0.2, `Tu as noté ${ml(etat.note)} ; le bas du ménisque est en face de ${ml(etat.verse + decalage)}. Lis la graduation en face du bas du ménisque.`);
      }
    } else if (r.suivi === "phmetre") {
      const ecart = Math.abs(etat.note - reelle);
      if (ecart > 0.5) faute("lecture", true, `Ta lecture de l'équivalence sur la courbe est à ${ml(ecart)} du saut de pH.`);
      else if (ecart > 0.2) faute("lecture", false, `Ta lecture de l'équivalence sur la courbe est à ${ml(ecart)} du saut de pH.`);
    } else {
      const ecart = Math.abs(etat.note - reelle);
      if (ecart > 0.8) faute("lecture", true, `Ta lecture de l'équivalence sur la courbe est à ${ml(ecart)} de la rupture de pente.`);
      else if (ecart > 0.3) faute("lecture", false, `Ta lecture de l'équivalence sur la courbe est à ${ml(ecart)} de la rupture de pente.`);
    }
  }
  const lignes = etat.note === null
    ? [`Sans volume noté, on continue avec la valeur du professeur : V_E = ${ml(exact)}.`]
    : [`Ton volume à l'équivalence : V_E = ${ml(etat.note)}.`, `Valeur attendue pour une manipulation sans défaut : ${ml(exact)}.`];
  // sans rien verser, la manipulation n'est pas faite
  return { score: etat.verse <= 0 ? 0 : scoreDesFautes(fautes), fautes, mesures: { VE: etat.note ?? centieme(exact) }, lignes };
}

export const regles: ReglesPaillasse<ReglagesTitrage, EtatTitrage> = { depart: () => DEPART, geste, bilan };
