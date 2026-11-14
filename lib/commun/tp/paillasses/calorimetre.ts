// La paillasse Calorimètre (décision 0012) : une balance, un calorimètre avec son vase, son couvercle et son agitateur,
// un thermomètre, un bain d'eau bouillante où chauffe un bloc de métal inconnu, une pince. L'élève fait la tare, verse
// l'eau froide, lit sa masse et sa température, porte le bloc chaud dans le calorimètre, ferme, agite, et lit la
// température finale. Le temps du laboratoire passe : le thermomètre met quelques secondes à suivre, le bloc refroidit
// à l'air, la chaleur s'échappe d'un calorimètre ouvert, et sans agitation elle reste autour du bloc.
// Fonctions pures, sans horloge : le temps n'avance que par le geste « attendre ». L'état garde les températures au
// dernier changement (le repère) et l'heure : entre deux changements, tout se calcule par des exponentielles, si bien
// que deux attentes à la suite valent exactement leur somme.
// Les masses sont en grammes, les températures en degrés Celsius, les durées en secondes, les capacités thermiques en J/°C.
import { nombre } from "@/lib/commun/format";
import { nombreDe, scoreDesFautes, texteDe, type BilanPaillasse, type Faute, type GesteBrut, type ReglesPaillasse } from "../types";

export interface ReglagesCalorimetre {
  /** la capacité thermique massique du métal, en J/(kg·°C) : c'est ce que la manipulation cherche */
  cMetal: number;
  /** la masse du bloc */
  masseBloc: number;
  /** la masse du vase vide */
  masseVase: number;
  /** la capacité thermique du calorimètre et de ses accessoires */
  capacite: number;
  /** la température de l'eau froide, et celle de la salle */
  froid: number;
  salle: number;
  /** la masse d'eau que le protocole demande, à 20 % près */
  eauDemandee: number;
}

/** Les températures à un instant donné. */
export interface Instant {
  /** la température du bloc */
  bloc: number;
  /** la température moyenne de l'eau et du vase */
  eau: number;
  /** ce qu'indique le thermomètre */
  lue: number;
  /** de 1 (la chaleur est restée autour du bloc) à 0 (l'eau est à la même température partout) */
  inegal: number;
  /** la température où le bloc et l'eau se rejoignent ; sans bloc dans l'eau, celle de l'eau */
  equilibre: number;
  /** le temps passé calorimètre ouvert depuis que le bloc est dans l'eau */
  ouvert: number;
}

/** Les températures au dernier changement sur la paillasse, et l'heure de ce changement. */
export interface Repere {
  t: number;
  bloc: number;
  eau: number;
  lue: number;
  inegal: number;
  ouvert: number;
  /** la température de l'eau juste avant d'y plonger le bloc */
  avant: number;
  /** l'équilibre que donnerait un calorimètre resté fermé */
  ideal: number;
}

/** Une masse notée : ce que la balance affichait, et ce que le vase contenait vraiment. */
export interface PeseeNotee { v: number; affiche: number; eau: number; surBalance: boolean }
/** Une température notée : ce que le thermomètre indiquait, et où en étaient l'eau et le bloc. */
export interface TemperatureNotee {
  v: number;
  lue: number;
  /** vrai si le thermomètre était dans l'eau */
  trempe: boolean;
  eau: number;
  equilibre: number;
  ideal: number;
  ouvert: number;
  /** le couvercle était posé ; l'eau avait été agitée depuis l'arrivée du bloc */
  couvercle: boolean;
  agite: boolean;
}

export interface EtatCalorimetre {
  /** l'heure du laboratoire */
  t: number;
  /** où est le vase : dans le calorimètre, ou sur le plateau de la balance */
  vase: "calorimetre" | "balance";
  /** la masse d'eau dans le vase */
  eau: number;
  /** ce que la balance retranche : la charge du plateau au moment de la tare */
  tare: number;
  /** l'eau versée au-delà de la contenance du vase */
  renverse: number;
  couvercle: boolean;
  /** vrai tant que l'agitateur remue l'eau */
  agite: boolean;
  /** vrai si l'eau a été agitée depuis que le bloc y est */
  agiteApres: boolean;
  /** le thermomètre : dans le vase, ou sur son support */
  thermometre: boolean;
  /** où est le bloc : dans le bain d'eau bouillante, à l'air dans la pince, ou dans le vase */
  bloc: "bain" | "air" | "vase";
  /** l'heure où le bloc a quitté le bain pour la dernière fois */
  sorti: number;
  /** l'arrivée du bloc dans le vase : sa température, et le temps qu'il venait de passer à l'air */
  entree: { bloc: number; air: number } | null;
  repere: Repere;
  notes: { masse?: PeseeNotee; initiale?: TemperatureNotee; finale?: TemperatureNotee };
}

/** L'eau bouillante du bain. */
export const T_BAIN = 100;
/** La capacité thermique massique de l'eau, en J/(g·°C). */
export const C_EAU = 4.18;
/** Ce que le vase peut contenir d'eau. */
export const CONTENANCE = 300;
/** Le temps du laboratoire ne dépasse pas une journée. */
export const DUREE_MAX = 86400;
/** Le bloc reprend 100 °C dans le bain en une minute ; à l'air, il perd environ 1 °C toutes les 30 secondes. */
export const TAU_BAIN = 20;
export const TAU_AIR = 2400;
/** L'échange entre le bloc et l'eau, puis l'égalisation de l'eau : rapides si on agite, lents sinon. */
export const TAU_ECHANGE = 45;
export const TAU_ECHANGE_AGITE = 12;
export const TAU_MELANGE = 150;
export const TAU_MELANGE_AGITE = 4;
/** Un calorimètre ouvert rejoint lentement la température de la salle. */
export const TAU_PERTES = 900;
/** Le thermomètre suit l'eau en quelques secondes, l'air plus lentement. */
export const TAU_THERMOMETRE = 5;
export const TAU_THERMOMETRE_AIR = 20;
/** Tant que l'eau n'est pas mélangée, le thermomètre, loin du bloc, ne voit qu'une part de l'échauffement. */
export const RETARD = 0.7;

const centieme = (x: number) => Math.round(x * 100) / 100;
const millieme = (x: number) => Math.round(x * 1000) / 1000;
const dixieme = (x: number) => Math.round(x * 10) / 10;
const grammes = (x: number) => `${nombre(x, 1)} g`;
const degres = (x: number) => `${nombre(x, 1)} °C`;
/** Une température notée par l'élève, avec son deuxième chiffre s'il en a écrit un : « 25,25 °C ». */
const notee = (x: number) => `${nombre(x, Math.round(x * 100) % 10 === 0 ? 1 : 2)} °C`;
/** « 45 s », « 2 min 30 s » */
const temps = (s: number) => (s < 60 ? `${nombre(s, 0)} s` : `${Math.floor(Math.round(s) / 60)} min ${String(Math.round(s) % 60).padStart(2, "0")} s`);

/** La capacité thermique du bloc, puis celle de l'eau avec le calorimètre. */
export const capaciteBloc = (r: ReglagesCalorimetre): number => (r.masseBloc * r.cMetal) / 1000;
export const capaciteEau = (r: ReglagesCalorimetre, eau: number): number => eau * C_EAU + r.capacite;
/** La température finale d'une manipulation sans défaut : le bloc à 100 °C, l'eau froide, aucune perte. */
export function equilibreIdeal(r: ReglagesCalorimetre, eau: number): number {
  const Cb = capaciteBloc(r), Ce = capaciteEau(r, eau);
  return (Cb * T_BAIN + Ce * r.froid) / (Cb + Ce);
}
/** Ce que la balance affiche, au dixième de gramme : la charge du plateau, moins la tare. */
export const affichage = (r: ReglagesCalorimetre, etat: EtatCalorimetre): number => dixieme((etat.vase === "balance" ? r.masseVase + etat.eau : 0) - etat.tare);

/** Une somme d'exponentielles : Σ k × e^(−a × t). */
type Termes = { k: number; a: number }[];
const somme = (u: Termes, t: number) => u.reduce((s, x) => s + x.k * Math.exp(-x.a * t), 0);
/** Ce qu'indique, après la durée t, un thermomètre de retard tau qui suit la température u, parti de la lecture `depart`. */
function suit(u: Termes, depart: number, tau: number, t: number): number {
  const v = u.map((x) => ({ k: x.k / (1 - x.a * tau), a: x.a }));
  return somme(v, t) + (depart - somme(v, 0)) * Math.exp(-t / tau);
}

/** Les températures à l'heure de l'état : le repère, vieilli du temps écoulé depuis. */
export function maintenant(r: ReglagesCalorimetre, etat: EtatCalorimetre): Instant {
  const p = etat.repere;
  const dt = etat.t - p.t;
  const trempe = etat.thermometre && etat.eau > 0;
  if (etat.bloc !== "vase") {
    // le bloc est dans le bain ou à l'air ; l'eau du vase ne change pas
    const vers = etat.bloc === "bain" ? T_BAIN : r.salle;
    const bloc = vers + (p.bloc - vers) * Math.exp(-dt / (etat.bloc === "bain" ? TAU_BAIN : TAU_AIR));
    const cible = trempe ? p.eau : r.salle;
    const lue = cible + (p.lue - cible) * Math.exp(-dt / (trempe ? TAU_THERMOMETRE : TAU_THERMOMETRE_AIR));
    return { bloc, eau: p.eau, lue, inegal: p.inegal, equilibre: p.eau, ouvert: p.ouvert };
  }
  // le bloc est dans le vase : lui et l'eau se rejoignent, pendant que l'ensemble dérive vers la salle si rien ne le ferme
  const Cb = capaciteBloc(r), Ce = capaciteEau(r, etat.eau);
  const depart = (Cb * p.bloc + Ce * p.eau) / (Cb + Ce);
  const echange = 1 / (etat.agite ? TAU_ECHANGE_AGITE : TAU_ECHANGE);
  const pertes = etat.couvercle ? 0 : 1 / TAU_PERTES;
  const melange = 1 / (etat.agite ? TAU_MELANGE_AGITE : TAU_MELANGE);
  const equilibre = r.salle + (depart - r.salle) * Math.exp(-pertes * dt);
  const bloc = equilibre + (p.bloc - depart) * Math.exp(-echange * dt);
  const eau = equilibre + (p.eau - depart) * Math.exp(-echange * dt);
  const inegal = p.inegal * Math.exp(-melange * dt);
  let lue = r.salle + (p.lue - r.salle) * Math.exp(-dt / TAU_THERMOMETRE_AIR);
  if (trempe) {
    // le réservoir du thermomètre voit l'eau, moins la part de l'échauffement restée autour du bloc
    const k = -RETARD * p.inegal;
    lue = suit([
      { k: r.salle, a: 0 }, { k: depart - r.salle, a: pertes }, { k: p.eau - depart, a: echange },
      { k: k * (r.salle - p.avant), a: melange }, { k: k * (depart - r.salle), a: pertes + melange }, { k: k * (p.eau - depart), a: echange + melange },
    ], p.lue, TAU_THERMOMETRE, dt);
  }
  return { bloc, eau, lue, inegal, equilibre, ouvert: p.ouvert + (etat.couvercle ? 0 : dt) };
}

/** Le repère à l'heure de l'état : à prendre avant tout geste qui change ce qui se passe. Sans temps écoulé, le repère ne bouge pas. */
function avance(r: ReglagesCalorimetre, etat: EtatCalorimetre): Repere {
  if (etat.t === etat.repere.t) return etat.repere;
  const m = maintenant(r, etat);
  return { t: etat.t, bloc: m.bloc, eau: m.eau, lue: m.lue, inegal: m.inegal, ouvert: m.ouvert, avant: etat.repere.avant, ideal: etat.repere.ideal };
}

const depart = (r: ReglagesCalorimetre): EtatCalorimetre => ({
  t: 0, vase: "calorimetre", eau: 0, tare: 0, renverse: 0, couvercle: false, agite: false, agiteApres: false, thermometre: false, bloc: "bain", sorti: 0, entree: null,
  repere: { t: 0, bloc: T_BAIN, eau: r.salle, lue: r.salle, inegal: 0, ouvert: 0, avant: r.salle, ideal: r.salle },
  notes: {},
});

/** Applique un geste. Un geste inconnu, mal formé ou impossible ne change rien. */
function geste(r: ReglagesCalorimetre, etat: EtatCalorimetre, g: GesteBrut): EtatCalorimetre {
  const v = nombreDe(g, "v");
  switch (g.g) {
    // le temps du laboratoire passe
    case "attendre":
      return v === null || v <= 0 || v > 3600 || etat.t + v > DUREE_MAX ? etat : { ...etat, t: centieme(etat.t + v) };
    // porter le vase sur la balance, ou le remettre dans le calorimètre : il faut qu'il soit libre
    case "vase": {
      const ou = texteDe(g, "ou");
      if ((ou !== "balance" && ou !== "calorimetre") || ou === etat.vase || etat.couvercle || etat.thermometre || etat.agite || etat.bloc === "vase") return etat;
      return { ...etat, vase: ou, repere: avance(r, etat) };
    }
    case "tare": {
      const charge = etat.vase === "balance" ? centieme(r.masseVase + etat.eau) : 0;
      return charge === etat.tare ? etat : { ...etat, tare: charge };
    }
    // verser l'eau froide dans le vase ; ce qui dépasse sa contenance déborde
    case "verser": {
      if (v === null || v <= 0 || v > CONTENANCE || etat.couvercle || etat.bloc === "vase") return etat;
      const entre = Math.min(v, centieme(CONTENANCE - etat.eau));
      const repere = avance(r, etat);
      return { ...etat, eau: centieme(etat.eau + entre), renverse: centieme(etat.renverse + v - entre), repere: etat.eau > 0 ? repere : { ...repere, eau: r.froid } };
    }
    case "couvercle": {
      const pose = g.pose === true;
      return pose === etat.couvercle || etat.vase !== "calorimetre" ? etat : { ...etat, couvercle: pose, repere: avance(r, etat) };
    }
    // l'agitateur est celui du calorimètre : il ne remue que l'eau du vase qui s'y trouve
    case "agiter": {
      const on = g.on === true;
      if (on === etat.agite || (on && (etat.eau <= 0 || etat.vase !== "calorimetre"))) return etat;
      return { ...etat, agite: on, agiteApres: etat.agiteApres || (on && etat.bloc === "vase"), repere: avance(r, etat) };
    }
    case "thermometre": {
      const dans = g.dans === true;
      return dans === etat.thermometre || (dans && etat.vase !== "calorimetre") ? etat : { ...etat, thermometre: dans, repere: avance(r, etat) };
    }
    // la pince saisit le bloc et le sort du bain ; elle peut l'y remettre
    case "sortir":
      return etat.bloc === "bain" ? { ...etat, bloc: "air", sorti: etat.t, repere: avance(r, etat) } : etat;
    case "rebain":
      return etat.bloc === "air" ? { ...etat, bloc: "bain", repere: avance(r, etat) } : etat;
    // le bloc entre dans le vase, s'il est dans le calorimètre et ouvert
    case "plonger": {
      if (etat.bloc !== "air" || etat.vase !== "calorimetre" || etat.couvercle) return etat;
      const p = avance(r, etat);
      const Cb = capaciteBloc(r), Ce = capaciteEau(r, etat.eau);
      return {
        ...etat, bloc: "vase", agiteApres: etat.agite, entree: { bloc: millieme(p.bloc), air: centieme(etat.t - etat.sorti) },
        repere: { ...p, inegal: 1, ouvert: 0, avant: p.eau, ideal: (Cb * p.bloc + Ce * p.eau) / (Cb + Ce) },
      };
    }
    // noter une lecture : la masse sur la balance, ou la température sur le thermomètre
    case "noter": {
      const quoi = texteDe(g, "quoi");
      if (v === null) return etat;
      if (quoi === "masse") {
        if (v < 0 || v > 2000) return etat;
        return { ...etat, notes: { ...etat.notes, masse: { v: centieme(v), affiche: affichage(r, etat), eau: etat.eau, surBalance: etat.vase === "balance" } } };
      }
      if (quoi === "temperature") {
        if (v < -20 || v > 150) return etat;
        const m = maintenant(r, etat);
        const releve: TemperatureNotee = {
          v: centieme(v), lue: millieme(m.lue), trempe: etat.thermometre && etat.eau > 0, eau: millieme(m.eau), equilibre: millieme(m.equilibre),
          ideal: millieme(etat.repere.ideal), ouvert: centieme(m.ouvert), couvercle: etat.couvercle, agite: etat.agiteApres,
        };
        return { ...etat, notes: { ...etat.notes, [etat.bloc === "vase" ? "finale" : "initiale"]: releve } };
      }
      return etat;
    }
    default: return etat;
  }
}

/** Les valeurs d'une manipulation sans défaut, pour la masse d'eau qui est dans le vase : ce que le professeur fournit quand une mesure manque. */
export function mesuresExactes(r: ReglagesCalorimetre, etat: EtatCalorimetre): Record<"m" | "T1" | "Tf", number> {
  const eau = etat.eau > 0 ? etat.eau : r.eauDemandee;
  return { m: centieme(eau), T1: r.froid, Tf: centieme(equilibreIdeal(r, eau)) };
}

/** Le bilan de la manipulation : la masse d'eau et les deux températures de l'élève, et les fautes relevées par le professeur. */
function bilan(r: ReglagesCalorimetre, etat: EtatCalorimetre): BilanPaillasse {
  const fautes: Faute[] = [];
  const faute = (code: string, grave: boolean, texte: string) => fautes.push({ code, grave, texte });
  const { masse, initiale, finale } = etat.notes;
  const rien = !masse && !initiale && !finale;
  const exact = mesuresExactes(r, etat);

  if (rien) {
    faute("mesures", true, "Tu n'as noté aucune mesure : la manipulation n'est pas faite.");
  } else {
    // la masse d'eau
    if (!masse) {
      faute("masse", true, "Tu n'as pas noté la masse d'eau versée dans le vase.");
    } else if (Math.abs(masse.v - masse.eau) > 0.35) {
      if (Math.abs(masse.v - masse.affiche) > 0.15) faute("balance", Math.abs(masse.v - masse.eau) > 5, `Tu as noté ${grammes(masse.v)} ; la balance affichait ${grammes(masse.affiche)}, et le vase contenait ${grammes(masse.eau)} d'eau.`);
      else if (masse.surBalance) faute("tare", true, `La balance n'était pas à zéro avec le vase vide : elle affichait ${grammes(masse.affiche)}, et non la masse d'eau, ${grammes(masse.eau)}. Pose le vase vide, appuie sur « Tare », puis verse l'eau.`);
      else faute("tare", true, `Le vase n'était pas sur la balance quand tu as noté ${grammes(masse.v)} : il contenait ${grammes(masse.eau)} d'eau. Verse l'eau dans le vase posé sur la balance, après la tare.`);
    }
    if (etat.eau <= 0) faute("eau", true, "Il n'y a pas d'eau dans le vase du calorimètre : rien n'y reçoit l'énergie du bloc.");
    else if (Math.abs(etat.eau - r.eauDemandee) > 0.2 * r.eauDemandee) faute("eau", false, `Tu as versé ${grammes(etat.eau)} d'eau ; le protocole en demande environ ${nombre(r.eauDemandee, 0)} g.`);
    if (etat.renverse > 5) faute("renverse", false, `Tu as fait déborder le vase : ${grammes(etat.renverse)} d'eau sur la paillasse.`);
    // la température de l'eau froide
    if (!initiale) faute("initiale", true, "Tu n'as pas noté la température de l'eau froide, avant d'y plonger le bloc.");
    else if (!initiale.trempe) faute("thermometre", true, `Le thermomètre n'était pas dans l'eau quand tu as noté ${notee(initiale.v)} : il indiquait la température de l'air.`);
    else if (Math.abs(initiale.lue - initiale.eau) > 0.15) {
      faute("stabilisation", Math.abs(initiale.lue - initiale.eau) > 0.5, `Tu as lu la température de l'eau trop tôt : le thermomètre indiquait ${degres(initiale.lue)} et n'avait pas fini de ${initiale.lue > initiale.eau ? "descendre" : "monter"} ; l'eau était à ${degres(initiale.eau)}. Attends que le niveau ne bouge plus.`);
    }
    // le bloc
    if (etat.bloc !== "vase" || !etat.entree) {
      faute("bloc", true, "Le bloc n'est pas dans le calorimètre : l'échange de chaleur n'a pas eu lieu.");
    } else if (etat.entree.bloc < 99) {
      const aLair = (T_BAIN - r.salle) * (1 - Math.exp(-etat.entree.air / TAU_AIR));
      faute("transport", etat.entree.bloc < 97, T_BAIN - etat.entree.bloc > aLair + 0.5
        ? `Le bloc n'était qu'à ${degres(etat.entree.bloc)} en entrant dans le calorimètre : il n'était pas resté assez longtemps dans l'eau bouillante pour reprendre 100 °C.`
        : `Le bloc est resté ${temps(etat.entree.air)} à l'air avant d'entrer dans le calorimètre : il n'était plus qu'à ${degres(etat.entree.bloc)}, et non à 100 °C. Porte-le d'un geste, sans attendre.`);
    }
    // la température finale
    if (!finale) {
      faute("finale", true, "Tu n'as pas noté la température finale, une fois le bloc dans l'eau.");
    } else {
      const retard = finale.equilibre - finale.lue;
      if (!finale.trempe) {
        if (!fautes.some((f) => f.code === "thermometre")) faute("thermometre", true, `Le thermomètre n'était pas dans l'eau quand tu as noté ${notee(finale.v)} : il indiquait la température de l'air.`);
      } else if (!finale.agite) {
        faute("agitation", Math.abs(retard) > 0.5, Math.abs(retard) > 0.15
          ? `Tu n'as pas agité : la chaleur est restée autour du bloc. Le thermomètre indiquait ${degres(finale.lue)} alors que l'équilibre est à ${degres(finale.equilibre)}. Agite jusqu'à ce que la température ne varie plus.`
          : "Tu n'as pas agité l'eau : sans agitation, la température met très longtemps à devenir la même partout. Agite dès que le bloc est dans l'eau.");
      } else if (Math.abs(retard) > 0.15) {
        faute("equilibre", Math.abs(retard) > 0.5, `Tu as lu la température finale trop tôt : le thermomètre indiquait ${degres(finale.lue)} et ${retard > 0 ? "montait" : "descendait"} encore ; l'équilibre est à ${degres(finale.equilibre)}. Attends que le niveau ne bouge plus.`);
      }
      const perte = finale.ideal - finale.equilibre;
      if (perte > 0.25) faute("couvercle", perte > 0.8, `Le calorimètre est resté ouvert ${temps(finale.ouvert)} pendant l'échange : la chaleur s'échappe, et l'équilibre est ${degres(perte)} plus bas qu'il ne devrait. Pose le couvercle dès que le bloc est dans l'eau.`);
      else if (!finale.couvercle) faute("couvercle", false, "Tu as lu la température finale calorimètre ouvert : pose le couvercle dès que le bloc est dans l'eau, pour que la chaleur ne s'échappe pas.");
    }
    // les lectures du thermomètre
    const lues = [initiale, finale].filter((n): n is TemperatureNotee => n !== undefined && n.trempe);
    const pire = lues.reduce<TemperatureNotee | null>((a, n) => (a === null || Math.abs(n.v - n.lue) > Math.abs(a.v - a.lue) ? n : a), null);
    if (pire && Math.abs(pire.v - pire.lue) > 0.15) faute("lecture", Math.abs(pire.v - pire.lue) > 1, `Tu as noté ${notee(pire.v)} ; le thermomètre indiquait ${degres(pire.lue)}. Lis la graduation en face du haut de la colonne.`);
  }

  // les mesures de l'élève ; celles qui manquent sont celles du professeur
  let mesures = { m: masse?.v ?? exact.m, T1: initiale?.v ?? exact.T1, Tf: finale?.v ?? exact.Tf };
  const impossible = mesures.m < 20 ? `une masse d'eau de ${grammes(mesures.m)} est trop petite`
    : mesures.Tf - mesures.T1 < 0.5 ? `la température finale, ${degres(mesures.Tf)}, ne dépasse pas celle de l'eau froide, ${degres(mesures.T1)}`
      : T_BAIN - mesures.Tf < 5 ? `la température finale, ${degres(mesures.Tf)}, est trop proche de celle du bain` : null;
  const lignes: string[] = [];
  if (!rien && impossible) {
    faute("releves", true, `Tes relevés ne permettent pas le calcul : ${impossible}. On continue avec les valeurs du professeur.`);
    mesures = exact;
  }
  if (rien || impossible) {
    lignes.push(`Sans mesure utilisable, on continue avec les valeurs du professeur : m = ${grammes(exact.m)}, θ₁ = ${degres(exact.T1)}, θ₂ = ${degres(exact.Tf)}.`);
  } else {
    lignes.push(masse ? `Masse d'eau : m = ${grammes(mesures.m)}.` : `Sans masse notée, on continue avec la valeur du professeur : m = ${grammes(mesures.m)}.`);
    lignes.push(initiale ? `Température de l'eau froide : θ₁ = ${notee(mesures.T1)}.` : `Sans température de départ notée, on continue avec la valeur du professeur : θ₁ = ${degres(mesures.T1)}.`);
    lignes.push(finale ? `Température finale : θ₂ = ${notee(mesures.Tf)}.` : `Sans température finale notée, on continue avec la valeur du professeur : θ₂ = ${degres(mesures.Tf)}.`);
    lignes.push(`Pour une manipulation sans défaut avec ${grammes(exact.m)} d'eau : θ₁ = ${degres(exact.T1)}, θ₂ = ${degres(exact.Tf)}.`);
  }
  // sans aucune mesure, la manipulation n'est pas faite
  return { score: rien ? 0 : scoreDesFautes(fautes), fautes, mesures, lignes };
}

export const regles: ReglesPaillasse<ReglagesCalorimetre, EtatCalorimetre> = { depart, geste, bilan };
