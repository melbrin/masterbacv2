// La paillasse Électrolyse (décision 0012) : une cuve de sulfate de cuivre, deux plaques de cuivre, un générateur
// réglable, un interrupteur, un ampèremètre, un chronomètre, une balance au milligramme. L'élève pèse la plaque qui
// servira de cathode, monte le circuit en série en tirant les fils, ferme l'interrupteur, règle l'intensité en lisant
// l'ampèremètre, laisse passer le temps, puis rince, sèche et pèse de nouveau la plaque.
// Chaque geste a ses conséquences : la plaque reliée à la borne + du générateur se dissout au lieu de se couvrir de
// cuivre, une plaque pesée mouillée pèse son liquide, une intensité retouchée en route n'est plus celle qu'on a notée,
// un chronomètre lancé en retard ne compte pas tout le temps où le courant a passé.
// Fonctions pures, sans horloge : le temps n'avance que par le geste « attendre ». L'état garde la charge passée au
// dernier changement (le repère) et l'heure : entre deux changements le courant est constant, si bien que deux attentes
// à la suite valent exactement leur somme.
// Les masses sont en grammes, les durées en secondes, les intensités en ampères, les charges en coulombs.
import { nombre } from "@/lib/commun/format";
import { FARADAY } from "@/lib/commun/simulations/pile";
import { nombreDe, scoreDesFautes, texteDe, type BilanPaillasse, type Faute, type GesteBrut, type ReglesPaillasse } from "../types";

export interface Electrode {
  /** quelques lettres minuscules et chiffres : « p1 ». C'est aussi le nom de sa borne. */
  id: string;
  /** dans une phrase : « plaque 1 » */
  nom: string;
  /** sa masse, propre et sèche, avant l'électrolyse */
  masse: number;
}

export interface ReglagesElectrolyse {
  /** les deux plaques de cuivre ; la première est celle que le sujet demande de peser */
  electrodes: [Electrode, Electrode];
  /** ce que le circuit oppose au courant, en ohms : l'intensité vaut la tension du générateur divisée par cette résistance */
  resistance: number;
  /** l'intensité et la durée que le sujet demande */
  intensite: number;
  duree: number;
}

/** Ce qui est sur une plaque : rien, la solution de la cuve, l'eau du rinçage. */
export type Mouille = "sec" | "solution" | "eau";
export interface Plaque {
  ou: "support" | "cuve" | "balance";
  mouille: Mouille;
  /** vrai si la plaque a été séchée sans être rincée : des cristaux de sulfate de cuivre y sont restés */
  residu: boolean;
}

/** Ce qui a traversé la cuve à un instant donné. */
export interface Passage {
  /** la charge passée, comptée positive quand la première plaque est la cathode */
  charge: number;
  /** la charge passée, dans un sens ou dans l'autre */
  quantite: number;
  /** le temps pendant lequel le courant a passé ; puis la part de ce temps où l'ampèremètre était branché à l'envers */
  duree: number;
  envers: number;
}

/** Une pesée notée : ce que la balance affichait, et l'état de la plaque. */
export interface PeseeNotee { v: number; affiche: number; plaque: string; nue: number; film: number }

export interface EtatElectrolyse {
  /** l'heure du laboratoire */
  t: number;
  /** la tension réglée sur le générateur, en volts */
  tension: number;
  /** vrai si l'interrupteur est fermé */
  ferme: boolean;
  /** les fils posés : chacun relie deux bornes */
  fils: [string, string][];
  plaques: Record<string, Plaque>;
  /** ce que la balance retranche : la charge de son plateau au moment de la tare */
  tare: number;
  /** le chronomètre : en marche ou non, l'heure de son dernier départ, ce qu'il avait compté avant */
  chrono: { marche: boolean; depart: number; compte: number };
  /** ce qui avait traversé la cuve au dernier changement, et l'heure de ce changement */
  repere: Passage & { t: number };
  notes: {
    avant?: PeseeNotee;
    apres?: PeseeNotee;
    /** l'intensité notée, et ce que l'ampèremètre affichait */
    intensite?: { v: number; affiche: number };
    /** la durée notée, et ce que le chronomètre affichait */
    duree?: { v: number; affiche: number };
  };
}

/** La masse molaire du cuivre, en g/mol. */
export const M_CUIVRE = 63.5;
/** Le générateur se règle de 0 à 12 V, par dixièmes de volt. */
export const TENSION_MAX = 12;
/** Le nombre de fils de la paillasse. */
export const FILS_MAX = 6;
/** Le temps du laboratoire ne dépasse pas une journée. */
export const DUREE_MAX = 86400;
/** Ce que pèse le liquide resté sur une plaque mouillée, et les cristaux laissés par un séchage sans rinçage. */
export const FILM = { solution: 0.045, eau: 0.038, residu: 0.006 };
/** Les bornes fixes : celles du générateur, de l'interrupteur et de l'ampèremètre. */
export const BORNES = ["g+", "g-", "k1", "k2", "a", "com"] as const;

const centieme = (x: number) => Math.round(x * 100) / 100;
const millieme = (x: number) => Math.round(x * 1000) / 1000;
const grammes = (x: number) => `${nombre(x, 3)} g`;
const amperes = (x: number) => `${nombre(x, 2)} A`;
const secondes = (x: number) => `${nombre(x, 0)} s`;
const memeFil = (f: [string, string], a: string, b: string) => (f[0] === a && f[1] === b) || (f[0] === b && f[1] === a);

/** La masse de cuivre que dépose, ou que dissout, une charge : m = Q × M / (2 × F). */
export const masseDe = (charge: number): number => (charge * M_CUIVRE) / (2 * FARADAY);
/** Toutes les bornes de la paillasse : les bornes fixes, puis une par plaque. */
export const bornes = (r: ReglagesElectrolyse): string[] => [...BORNES, ...r.electrodes.map((e) => e.id)];
export const electrodeDe = (r: ReglagesElectrolyse, id: string | null | undefined): Electrode | null => r.electrodes.find((e) => e.id === id) ?? null;

/** Ce que les fils font du montage. */
export type Montage =
  /** la boucle n'est pas fermée : interrupteur ouvert, fil manquant, plaque hors de la cuve */
  | { etat: "ouvert" }
  /** les deux bornes du générateur sont reliées sans passer par la cuve */
  | { etat: "court-circuit" }
  /** le courant a deux chemins : ce n'est plus un circuit en série */
  | { etat: "derivation" }
  /**
   * Un circuit en série qui traverse la cuve. `cathode` : la plaque du côté de la borne − du générateur. `amperemetre` :
   * 1 si le courant y entre par la borne A, −1 s'il y entre par la borne COM, 0 s'il n'est pas dans la boucle.
   */
  | { etat: "serie"; cathode: string; amperemetre: -1 | 0 | 1; interrupteur: boolean };

/** Lit le montage : les bornes reliées par des fils forment des nœuds ; on cherche les chemins de la borne + à la borne −. */
export function montage(r: ReglagesElectrolyse, etat: EtatElectrolyse): Montage {
  const parent = new Map(bornes(r).map((b) => [b, b]));
  const noeud = (b: string): string => { let x = b; while (parent.get(x) !== x) x = parent.get(x) ?? x; return x; };
  for (const [a, b] of etat.fils) if (parent.has(a) && parent.has(b)) parent.set(noeud(a), noeud(b));
  const plus = noeud("g+"), moins = noeud("g-");
  if (plus === moins) return { etat: "court-circuit" };
  const [p1, p2] = r.electrodes;
  // ce qui laisse passer le courant : l'interrupteur fermé, l'ampèremètre, la cuve quand ses deux plaques y trempent
  const passages = [
    ...(etat.ferme ? [{ nom: "interrupteur", a: noeud("k1"), b: noeud("k2"), entree: "k1" }] : []),
    { nom: "amperemetre", a: noeud("a"), b: noeud("com"), entree: "a" },
    ...(etat.plaques[p1.id]?.ou === "cuve" && etat.plaques[p2.id]?.ou === "cuve" ? [{ nom: "cuve", a: noeud(p1.id), b: noeud(p2.id), entree: p1.id }] : []),
  ].filter((c) => c.a !== c.b);
  // tous les chemins de la borne + à la borne −, sans repasser par le même composant
  const chemins: { nom: string; parA: boolean }[][] = [];
  const cherche = (ici: string, fait: { nom: string; parA: boolean }[]) => {
    if (ici === moins) { chemins.push(fait); return; }
    for (const c of passages) {
      if (fait.some((f) => f.nom === c.nom) || (c.a !== ici && c.b !== ici)) continue;
      cherche(c.a === ici ? c.b : c.a, [...fait, { nom: c.nom, parA: c.a === ici }]);
    }
  };
  cherche(plus, []);
  if (chemins.length === 0) return { etat: "ouvert" };
  if (chemins.length > 1) return { etat: "derivation" };
  const cuve = chemins[0].find((c) => c.nom === "cuve");
  if (!cuve) return { etat: "court-circuit" };
  const amperemetre = chemins[0].find((c) => c.nom === "amperemetre");
  // le courant entre dans la cuve par la plaque du côté + (l'anode) et en sort par l'autre (la cathode)
  return { etat: "serie", cathode: cuve.parA ? p2.id : p1.id, amperemetre: amperemetre ? (amperemetre.parA ? 1 : -1) : 0, interrupteur: chemins[0].some((c) => c.nom === "interrupteur") };
}

/** L'intensité du courant qui traverse la cuve. */
export function intensite(r: ReglagesElectrolyse, etat: EtatElectrolyse): number {
  return montage(r, etat).etat === "serie" && etat.tension > 0 ? etat.tension / r.resistance : 0;
}
/** Ce que l'ampèremètre affiche, au centième d'ampère : négatif s'il est branché à l'envers, nul s'il n'est pas dans la boucle. */
export function amperemetre(r: ReglagesElectrolyse, etat: EtatElectrolyse): number {
  const m = montage(r, etat);
  return m.etat === "serie" ? centieme(m.amperemetre * intensite(r, etat)) + 0 : 0;
}
/** Ce que le chronomètre affiche, en secondes entières. */
export const chronometre = (etat: EtatElectrolyse): number => Math.floor(etat.chrono.compte + (etat.chrono.marche ? etat.t - etat.chrono.depart : 0) + 1e-9);

/** Ce qui a traversé la cuve à l'heure de l'état : le repère, plus le courant constant qui a passé depuis. */
export function maintenant(r: ReglagesElectrolyse, etat: EtatElectrolyse): Passage {
  const p = etat.repere;
  const dt = etat.t - p.t;
  const m = montage(r, etat);
  const I = intensite(r, etat);
  if (dt <= 0 || I <= 0 || m.etat !== "serie") return { charge: p.charge, quantite: p.quantite, duree: p.duree, envers: p.envers };
  const sens = m.cathode === r.electrodes[0].id ? 1 : -1;
  return { charge: p.charge + sens * I * dt, quantite: p.quantite + I * dt, duree: p.duree + dt, envers: p.envers + (m.amperemetre === -1 ? dt : 0) };
}
/** Le repère à l'heure de l'état : à prendre avant tout geste qui change le courant. Sans temps écoulé, il ne bouge pas. */
const avance = (r: ReglagesElectrolyse, etat: EtatElectrolyse): EtatElectrolyse["repere"] => (etat.t === etat.repere.t ? etat.repere : { t: etat.t, ...maintenant(r, etat) });

/** La masse d'une plaque sans rien dessus : sa masse de départ, plus le cuivre déposé, moins le cuivre dissous. */
export function masseNue(r: ReglagesElectrolyse, etat: EtatElectrolyse, id: string): number {
  const e = electrodeDe(r, id);
  if (!e) return 0;
  return Math.max(0, e.masse + (id === r.electrodes[0].id ? 1 : -1) * masseDe(maintenant(r, etat).charge));
}
/** Ce que pèse ce qui est resté sur une plaque : le liquide qui la mouille, les cristaux d'un séchage sans rinçage. */
export const film = (p: Plaque | undefined): number => (!p ? 0 : (p.mouille === "sec" ? 0 : FILM[p.mouille]) + (p.residu ? FILM.residu : 0));
/** Ce que la balance affiche, au milligramme : la plaque posée sur son plateau, avec ce qu'elle porte, moins la tare. */
export function balance(r: ReglagesElectrolyse, etat: EtatElectrolyse): number {
  const posee = r.electrodes.find((e) => etat.plaques[e.id]?.ou === "balance");
  return millieme((posee ? masseNue(r, etat, posee.id) + film(etat.plaques[posee.id]) : 0) - etat.tare) + 0;
}

const depart = (r: ReglagesElectrolyse): EtatElectrolyse => ({
  t: 0, tension: 0, ferme: false, fils: [], tare: 0, chrono: { marche: false, depart: 0, compte: 0 },
  plaques: Object.fromEntries(r.electrodes.map((e) => [e.id, { ou: "support", mouille: "sec", residu: false }])),
  repere: { t: 0, charge: 0, quantite: 0, duree: 0, envers: 0 },
  notes: {},
});

/** Applique un geste. Un geste inconnu, mal formé ou impossible ne change rien. */
function geste(r: ReglagesElectrolyse, etat: EtatElectrolyse, g: GesteBrut): EtatElectrolyse {
  const v = nombreDe(g, "v");
  switch (g.g) {
    // le temps du laboratoire passe
    case "attendre":
      return v === null || v <= 0 || v > 3600 || etat.t + v > DUREE_MAX ? etat : { ...etat, t: centieme(etat.t + v) };
    // la molette du générateur
    case "tension": {
      if (v === null || v < 0 || v > TENSION_MAX) return etat;
      const tension = Math.round(v * 10) / 10;
      return tension === etat.tension ? etat : { ...etat, tension, repere: avance(r, etat) };
    }
    case "interrupteur": {
      const ferme = g.ferme === true;
      return ferme === etat.ferme ? etat : { ...etat, ferme, repere: avance(r, etat) };
    }
    // un fil ne se pince que sur une plaque qui trempe dans la cuve
    case "relier": {
      const a = texteDe(g, "a"), b = texteDe(g, "b");
      const connues = bornes(r);
      if (a === null || b === null || a === b || !connues.includes(a) || !connues.includes(b) || etat.fils.length >= FILS_MAX || etat.fils.some((f) => memeFil(f, a, b))) return etat;
      if ([a, b].some((x) => etat.plaques[x] !== undefined && etat.plaques[x].ou !== "cuve")) return etat;
      return { ...etat, fils: [...etat.fils, [a, b]], repere: avance(r, etat) };
    }
    case "retirer": {
      const a = texteDe(g, "a"), b = texteDe(g, "b");
      return a !== null && b !== null && etat.fils.some((f) => memeFil(f, a, b)) ? { ...etat, fils: etat.fils.filter((f) => !memeFil(f, a, b)), repere: avance(r, etat) } : etat;
    }
    // porter une plaque : dans la cuve, sur le support, sur la balance. Il faut d'abord en ôter les fils.
    case "plaque": {
      const e = electrodeDe(r, texteDe(g, "p")), ou = texteDe(g, "ou");
      const p = e ? etat.plaques[e.id] : undefined;
      if (!e || !p || (ou !== "support" && ou !== "cuve" && ou !== "balance") || ou === p.ou || etat.fils.some((f) => f.includes(e.id))) return etat;
      if (ou === "balance" && r.electrodes.some((x) => etat.plaques[x.id]?.ou === "balance")) return etat;
      // plongée dans la cuve, la plaque y laisse ses cristaux ; sortie de la cuve, elle est mouillée de solution
      const suite: Plaque = ou === "cuve" ? { ou, mouille: "solution", residu: false } : { ...p, ou, mouille: p.ou === "cuve" ? "solution" : p.mouille };
      return { ...etat, plaques: { ...etat.plaques, [e.id]: suite }, repere: avance(r, etat) };
    }
    // rincer à l'eau distillée, puis sécher : sur le support
    case "rincer": {
      const e = electrodeDe(r, texteDe(g, "p"));
      const p = e ? etat.plaques[e.id] : undefined;
      return e && p && p.ou === "support" && (p.mouille !== "eau" || p.residu) ? { ...etat, plaques: { ...etat.plaques, [e.id]: { ...p, mouille: "eau", residu: false } } } : etat;
    }
    case "secher": {
      const e = electrodeDe(r, texteDe(g, "p"));
      const p = e ? etat.plaques[e.id] : undefined;
      return e && p && p.ou === "support" && p.mouille !== "sec" ? { ...etat, plaques: { ...etat.plaques, [e.id]: { ...p, mouille: "sec", residu: p.residu || p.mouille === "solution" } } } : etat;
    }
    case "tare": {
      const posee = r.electrodes.find((e) => etat.plaques[e.id]?.ou === "balance");
      const charge = posee ? millieme(masseNue(r, etat, posee.id) + film(etat.plaques[posee.id])) : 0;
      return charge === etat.tare ? etat : { ...etat, tare: charge };
    }
    // le chronomètre : départ, arrêt, remise à zéro
    case "chrono": {
      const marche = g.marche === true;
      if (marche === etat.chrono.marche) return etat;
      return { ...etat, chrono: marche ? { ...etat.chrono, marche: true, depart: etat.t } : { marche: false, depart: etat.chrono.depart, compte: centieme(etat.chrono.compte + etat.t - etat.chrono.depart) } };
    }
    case "zero":
      return etat.chrono.compte === 0 && (!etat.chrono.marche || etat.chrono.depart === etat.t) ? etat : { ...etat, chrono: { marche: etat.chrono.marche, depart: etat.t, compte: 0 } };
    // noter une lecture : la masse sur la balance, l'intensité sur l'ampèremètre, la durée sur le chronomètre
    case "noter": {
      const quoi = texteDe(g, "quoi");
      if (v === null || v < 0) return etat;
      if (quoi === "masse") {
        const posee = r.electrodes.find((e) => etat.plaques[e.id]?.ou === "balance");
        if (!posee || v > 2000) return etat;
        const note: PeseeNotee = { v: millieme(v), affiche: balance(r, etat), plaque: posee.id, nue: millieme(masseNue(r, etat, posee.id)), film: millieme(film(etat.plaques[posee.id])) };
        // avant que le moindre courant ait passé, c'est la pesée de départ ; ensuite, la pesée finale
        return { ...etat, notes: { ...etat.notes, [maintenant(r, etat).quantite > 0 ? "apres" : "avant"]: note } };
      }
      if (quoi === "intensite") return v > 20 ? etat : { ...etat, notes: { ...etat.notes, intensite: { v: millieme(v), affiche: amperemetre(r, etat) } } };
      if (quoi === "duree") return v > DUREE_MAX ? etat : { ...etat, notes: { ...etat.notes, duree: { v: centieme(v), affiche: chronometre(etat) } } };
      return etat;
    }
    default: return etat;
  }
}

/** Les valeurs d'une manipulation sans défaut : celles de l'électrolyse faite si elle a déposé du cuivre sur la plaque pesée, sinon celles du sujet. */
export function mesuresExactes(r: ReglagesElectrolyse, etat: EtatElectrolyse): Record<"m1" | "m2" | "I" | "dt", number> {
  const p = maintenant(r, etat);
  const pesee = electrodeDe(r, etat.notes.avant?.plaque ?? etat.notes.apres?.plaque) ?? r.electrodes[0];
  const sens = pesee.id === r.electrodes[0].id ? 1 : -1;
  const faite = sens * p.charge > 0.5 && p.duree > 0;
  const I = faite ? p.quantite / p.duree : r.intensite, dt = faite ? p.duree : r.duree;
  return { m1: millieme(pesee.masse), m2: millieme(pesee.masse + masseDe(faite ? sens * p.charge : I * dt)), I: millieme(I), dt: centieme(dt) };
}

/** Le bilan de la manipulation : les deux pesées, l'intensité et la durée de l'élève, et les fautes relevées par le professeur. */
function bilan(r: ReglagesElectrolyse, etat: EtatElectrolyse): BilanPaillasse {
  const fautes: Faute[] = [];
  const faute = (code: string, grave: boolean, texte: string) => fautes.push({ code, grave, texte });
  const { avant, apres, intensite: courant, duree } = etat.notes;
  const rien = !avant && !apres && !courant && !duree;
  const p = maintenant(r, etat);
  const exact = mesuresExactes(r, etat);
  const pesee = electrodeDe(r, avant?.plaque ?? apres?.plaque) ?? r.electrodes[0];
  const sens = pesee.id === r.electrodes[0].id ? 1 : -1;
  const moyenne = p.duree > 0 ? p.quantite / p.duree : 0;

  if (rien) {
    faute("mesures", true, "Tu n'as noté aucune mesure : la manipulation n'est pas faite.");
  } else {
    // l'électrolyse elle-même
    if (p.quantite <= 0) {
      const m = montage(r, etat);
      faute("electrolyse", true, `Aucun courant n'a traversé la cuve : ${m.etat === "court-circuit" ? "les deux bornes du générateur étaient reliées sans passer par elle" : m.etat === "derivation" ? "le montage n'était pas un circuit en série" : etat.tension <= 0 ? "le générateur est resté à 0 V" : "le circuit est resté ouvert"}. Le générateur, l'interrupteur, l'ampèremètre et la cuve se suivent dans une seule boucle.`);
    } else if (sens * p.charge < 0) {
      faute("polarite", true, `La ${pesee.nom} était reliée à la borne + du générateur : c'est l'anode, où le cuivre se dissout. Elle a perdu ${grammes(-masseDe(sens * p.charge))} au lieu d'en gagner. Le cuivre se dépose sur la cathode, la plaque reliée à la borne −.`);
    }
    // les pesées
    if (!avant) faute("pesee", true, "Tu n'as pas pesé la plaque avant l'électrolyse : sans masse de départ, la masse déposée ne se calcule pas.");
    if (!apres) faute("pesee", true, "Tu n'as pas pesé la plaque après l'électrolyse.");
    if (avant && apres && avant.plaque !== apres.plaque) faute("plaque", true, `Tu as pesé la ${electrodeDe(r, avant.plaque)?.nom} avant l'électrolyse et la ${electrodeDe(r, apres.plaque)?.nom} après : c'est la même plaque, la cathode, qu'il faut peser deux fois.`);
    const mouillee = [avant, apres].find((n) => n !== undefined && n.film >= 0.02);
    if (mouillee) faute("mouille", true, `La plaque était encore mouillée quand tu l'as pesée ${mouillee === avant ? "avant" : "après"} l'électrolyse : le liquide qu'elle porte pèse ${grammes(mouillee.film)}. Rince-la à l'eau distillée, puis sèche-la.`);
    else if ([avant, apres].some((n) => n !== undefined && n.film > 0)) faute("rincage", false, `Tu as séché la plaque sans la rincer : des cristaux de sulfate de cuivre y sont restés, et pèsent ${grammes(FILM.residu)}. Rince-la à l'eau distillée avant de la sécher.`);
    const pesees = [avant, apres].filter((n): n is PeseeNotee => n !== undefined);
    const malLue = pesees.reduce<PeseeNotee | null>((a, n) => (a === null || Math.abs(n.v - n.affiche) > Math.abs(a.v - a.affiche) ? n : a), null);
    if (malLue && Math.abs(malLue.v - malLue.affiche) > 0.0015) faute("balance", Math.abs(malLue.v - malLue.affiche) > 0.02, `Tu as noté ${grammes(malLue.v)} ; la balance affichait ${grammes(malLue.affiche)}.`);
    const decalee = pesees.find((n) => Math.abs(n.affiche - n.nue - n.film) > 0.0015);
    if (decalee) faute("tare", true, `La balance n'était pas à zéro avant d'y poser la plaque : elle affichait ${grammes(decalee.affiche)} pour une plaque de ${grammes(decalee.nue + decalee.film)}. Appuie sur « Tare », plateau vide, avant chaque pesée.`);
    // l'intensité
    if (!courant) faute("intensite", true, "Tu n'as pas noté l'intensité du courant.");
    else if (p.duree > 0) {
      if (Math.abs(courant.v - moyenne) > 0.015) faute("intensite", Math.abs(courant.v - moyenne) > 0.1 * moyenne, `Tu as noté ${amperes(courant.v)}, mais l'intensité a valu ${amperes(moyenne)} en moyenne pendant l'électrolyse. Règle-la au début, puis ne touche plus à la molette.`);
      // le sujet demande un courant « voisin de » sa valeur : à 10 % près, l'intensité notée fait foi
      else if (Math.abs(moyenne - r.intensite) > 0.1 * r.intensite) faute("reglage", false, `Le sujet demandait ${amperes(r.intensite)} ; tu as travaillé à ${amperes(moyenne)}. Tourne la molette du générateur jusqu'à lire la bonne intensité sur l'ampèremètre.`);
      if (p.envers > 0) faute("amperemetre", false, "L'ampèremètre était branché à l'envers : il affichait une intensité négative. Le courant y entre par la borne A et en sort par la borne COM.");
    }
    // la durée
    if (!duree) faute("duree", true, "Tu n'as pas noté la durée de l'électrolyse.");
    else if (p.duree > 0) {
      const retard = p.duree - duree.v;
      if (Math.abs(duree.v - duree.affiche) > 1.5) faute("chronometre", Math.abs(duree.v - duree.affiche) > 30, `Tu as noté ${secondes(duree.v)} ; le chronomètre affichait ${secondes(duree.affiche)}.`);
      // quelques secondes d'écart sont celles de la main qui va de l'interrupteur au chronomètre : elles ne comptent pas
      else if (Math.abs(retard) > Math.max(15, 0.02 * p.duree)) faute("chrono", Math.abs(retard) > 0.05 * p.duree, `Le courant a passé pendant ${secondes(p.duree)}, mais ton chronomètre a compté ${secondes(duree.v)} : ${retard > 0 ? "il a tourné moins longtemps que le courant" : "il a tourné plus longtemps que le courant"}. Lance-le en fermant l'interrupteur, arrête-le en l'ouvrant.`);
      if (Math.abs(p.duree - r.duree) > 0.2 * r.duree) faute("temps", false, `Le sujet demandait une électrolyse de ${secondes(r.duree)} ; la tienne a duré ${secondes(p.duree)}.`);
    }
  }

  // les mesures de l'élève ; celles qui manquent sont celles du professeur
  let mesures = { m1: avant?.v ?? exact.m1, m2: apres?.v ?? exact.m2, I: courant?.v ?? exact.I, dt: duree?.v ?? exact.dt };
  const impossible = mesures.m2 - mesures.m1 < 0.005 ? `la masse après l'électrolyse, ${grammes(mesures.m2)}, ne dépasse pas la masse de départ, ${grammes(mesures.m1)}`
    : mesures.I < 0.02 ? `une intensité de ${amperes(mesures.I)} ne dépose rien` : mesures.dt < 10 ? `une durée de ${secondes(mesures.dt)} est trop courte` : null;
  const sujet = { m1: millieme(pesee.masse), m2: millieme(pesee.masse + masseDe(r.intensite * r.duree)), I: r.intensite, dt: r.duree };
  const lignes: string[] = [];
  if (!rien && impossible) {
    faute("releves", true, `Tes relevés ne permettent pas le calcul : ${impossible}. On continue avec les valeurs du professeur.`);
    mesures = sujet;
  }
  if (rien) mesures = sujet;
  if (rien || impossible) {
    lignes.push(`Sans mesure utilisable, on continue avec les valeurs du professeur : m_1 = ${grammes(sujet.m1)}, m_2 = ${grammes(sujet.m2)}, I = ${amperes(sujet.I)}, Δt = ${secondes(sujet.dt)}.`);
  } else {
    lignes.push(avant && apres ? `Masses de la plaque : m_1 = ${grammes(mesures.m1)} avant, m_2 = ${grammes(mesures.m2)} après.` : `Masses de la plaque, complétées par le professeur : m_1 = ${grammes(mesures.m1)} avant, m_2 = ${grammes(mesures.m2)} après.`);
    lignes.push(courant ? `Intensité : I = ${amperes(mesures.I)}.` : `Sans intensité notée, on continue avec la valeur du professeur : I = ${amperes(mesures.I)}.`);
    lignes.push(duree ? `Durée : Δt = ${secondes(mesures.dt)}.` : `Sans durée notée, on continue avec la valeur du professeur : Δt = ${secondes(mesures.dt)}.`);
    lignes.push(`Pour une manipulation sans défaut : m_2 − m_1 = ${grammes(exact.m2 - exact.m1)}, avec I = ${amperes(exact.I)} pendant ${secondes(exact.dt)}.`);
  }
  // sans aucune mesure, la manipulation n'est pas faite
  return { score: rien ? 0 : scoreDesFautes(fautes), fautes, mesures, lignes };
}

export const regles: ReglesPaillasse<ReglagesElectrolyse, EtatElectrolyse> = { depart, geste, bilan };
