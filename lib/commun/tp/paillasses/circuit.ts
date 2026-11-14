// La paillasse Circuits (décision 0012) : un générateur réglable, une boîte de composants, une plaque de montage à trois
// emplacements, une carte d'acquisition, et des fils à tirer d'une borne à l'autre. L'élève fait les gestes du
// laboratoire : choisir le bon conducteur ohmique, poser les composants, régler la tension, câbler la boucle, brancher la
// voie et la masse, décharger le condensateur, régler la durée, lancer l'acquisition, fermer l'interrupteur, lire la courbe.
// Chaque geste a ses conséquences : un fil entre les deux bornes du générateur le met en sécurité, une voie branchée sur
// le conducteur ohmique donne une courbe qui descend, un condensateur non déchargé une courbe qui ne part pas de zéro.
//
// Le montage se lit par ses nœuds : les bornes reliées par des fils forment un nœud. La loi des nœuds donne alors les
// potentiels, quel que soit le câblage : la paillasse ne suppose jamais que le montage est le bon.
// Hors acquisition, le temps n'est pas compté : un condensateur relié à un circuit fermé a fini de se charger. Pendant
// un enregistrement, chaque geste porte l'instant `t` où il est fait, et la courbe continue avec le nouveau circuit.
//
// Fonctions pures : le navigateur s'en sert pour faire vivre la paillasse, le serveur pour rejouer la manipulation.
// Les tensions sont en volts, les résistances en ohms, les capacités en farads, les durées en secondes.
import { nombre, nombreRelatif } from "@/lib/commun/format";
import { nombreDe, scoreDesFautes, texteDe, type BilanPaillasse, type Faute, type GesteBrut, type ReglesPaillasse } from "../types";

// ---------- un réseau, et ce que la loi des nœuds en dit ----------

/** Un réseau de fils, de résistances, de sources et d'un condensateur au plus, avec un appareil qui mesure une tension. */
export interface Reseau {
  /** ce qui relie deux bornes sans résistance : un fil, un interrupteur fermé */
  liens: readonly (readonly [string, string])[];
  resistances: readonly { a: string; b: string; R: number }[];
  /** les sources de tension, chacune avec sa résistance interne ; une source coupée n'est pas dans la liste */
  sources: readonly { plus: string; moins: string; E: number; r: number }[];
  condensateur: { a: string; b: string; C: number } | null;
  /** l'appareil de mesure : il lit la tension entre sa voie et sa masse, à travers sa résistance d'entrée */
  mesure: { voie: string; masse: string; entree: number };
  /** la borne dont le potentiel sert de zéro */
  reference: string;
}

/** Ce que fait un réseau : son condensateur tend vers `uInf` avec le temps caractéristique `tau`, et l'appareil lit a + b × u_C. */
export interface Reponse {
  /** le condensateur : absent du réseau, ses deux bornes reliées par un fil, ou branché */
  condensateur: "absent" | "shunte" | "branche";
  /** la tension vers laquelle le condensateur tend, de sa première borne vers la seconde */
  uInf: number;
  /** la résistance à travers laquelle il se charge, vue de ses bornes */
  Rth: number;
  /** le temps caractéristique : Rth × C ; 0 si le condensateur n'est pas branché */
  tau: number;
  /** la tension mesurée vaut a + b × u_C */
  a: number;
  b: number;
  /** le plus grand courant qui traverse une source, une fois le condensateur chargé */
  courant: number;
}

/** Chaque nœud fuit un peu vers la référence : un nœud relié à rien garde un potentiel défini. En siemens. */
const FUITE = 1e-12;

/** Résout G × x = s par élimination de Gauss, avec pivot partiel. Le système est petit : dix nœuds au plus. */
function resous(G: number[][], s: number[]): number[] {
  const n = s.length;
  const m = G.map((ligne, i) => [...ligne, s[i]]);
  for (let k = 0; k < n; k++) {
    let pivot = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(m[i][k]) > Math.abs(m[pivot][k])) pivot = i;
    [m[k], m[pivot]] = [m[pivot], m[k]];
    for (let i = k + 1; i < n; i++) {
      const f = m[i][k] / m[k][k];
      if (f !== 0) for (let j = k; j <= n; j++) m[i][j] -= f * m[k][j];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let reste = m[i][n];
    for (let j = i + 1; j < n; j++) reste -= m[i][j] * x[j];
    x[i] = reste / m[i][i];
  }
  return x;
}

/**
 * Lit un réseau. Les bornes reliées par des liens forment des nœuds ; la loi des nœuds donne leurs potentiels.
 * Avec un seul condensateur, tout le reste du réseau se ramène à une tension et une résistance vues de ses bornes :
 * u_C(t) = uInf + (u_0 − uInf) × e^(−t/tau), et chaque tension du réseau est une fonction affine de u_C.
 */
export function reponse(n: Reseau): Reponse {
  // les nœuds : chaque borne rejoint le groupe des bornes auxquelles un lien la relie
  const parent = new Map<string, string>();
  const noeud = (borne: string): string => {
    if (!parent.has(borne)) parent.set(borne, borne);
    let x = borne;
    while (parent.get(x) !== x) x = parent.get(x)!;
    return x;
  };
  for (const [a, b] of n.liens) parent.set(noeud(a), noeud(b));
  const reference = noeud(n.reference);
  // chaque nœud autre que la référence a son rang dans le système d'équations
  const rangs = new Map<string, number>();
  const rang = (borne: string): number => {
    const k = noeud(borne);
    if (k === reference) return -1;
    if (!rangs.has(k)) rangs.set(k, rangs.size);
    return rangs.get(k)!;
  };
  for (const d of n.resistances) { rang(d.a); rang(d.b); }
  rang(n.mesure.voie);
  rang(n.mesure.masse);
  for (const s of n.sources) { rang(s.plus); rang(s.moins); }
  if (n.condensateur) { rang(n.condensateur.a); rang(n.condensateur.b); }
  const taille = rangs.size;
  const G = Array.from({ length: taille }, (_, i) => Array.from({ length: taille }, (_, j) => (i === j ? FUITE : 0)));
  const conductance = (a: string, b: string, g: number) => {
    const i = rang(a), j = rang(b);
    if (i === j) return;
    if (i >= 0) G[i][i] += g;
    if (j >= 0) G[j][j] += g;
    if (i >= 0 && j >= 0) { G[i][j] -= g; G[j][i] -= g; }
  };
  for (const d of n.resistances) conductance(d.a, d.b, 1 / d.R);
  conductance(n.mesure.voie, n.mesure.masse, 1 / n.mesure.entree);
  for (const s of n.sources) conductance(s.plus, s.moins, 1 / s.r);
  /** Les potentiels des nœuds quand des courants entrent dans le réseau : chacun par une borne a, pour en sortir par une borne b. */
  const potentiels = (courants: readonly { a: string; b: string; i: number }[]): number[] => {
    const s = new Array<number>(taille).fill(0);
    for (const { a, b, i } of courants) {
      const p = rang(a), q = rang(b);
      if (p !== q) { if (p >= 0) s[p] += i; if (q >= 0) s[q] -= i; }
    }
    return resous(G, s);
  };
  const entre = (v: number[], a: string, b: string): number => (rang(a) < 0 ? 0 : v[rang(a)]) - (rang(b) < 0 ? 0 : v[rang(b)]);
  // le régime permanent : le condensateur chargé ne laisse plus passer de courant
  const repos = potentiels(n.sources.map((s) => ({ a: s.plus, b: s.moins, i: s.E / s.r })));
  const courant = Math.max(0, ...n.sources.map((s) => Math.abs(s.E - entre(repos, s.plus, s.moins)) / s.r));
  const mesure = entre(repos, n.mesure.voie, n.mesure.masse);
  const c = n.condensateur;
  if (!c || rang(c.a) === rang(c.b)) return { condensateur: c ? "shunte" : "absent", uInf: 0, Rth: 0, tau: 0, a: mesure, b: 0, courant };
  // le réseau vu des bornes du condensateur : on y fait entrer un ampère par a, qui ressort par b
  const essai = potentiels([{ a: c.a, b: c.b, i: 1 }]);
  const Rth = entre(essai, c.a, c.b);
  const uInf = entre(repos, c.a, c.b);
  const b = entre(essai, n.mesure.voie, n.mesure.masse) / Rth;
  return { condensateur: "branche", uInf, Rth, tau: Rth * c.C, a: mesure - uInf * b, b, courant };
}

// ---------- la paillasse ----------

export interface Composant {
  /** de 2 à 6 lettres minuscules ou chiffres */
  id: string;
  genre: "resistance" | "condensateur" | "interrupteur";
  /** la résistance en ohms, ou la capacité en farads ; 0 pour un interrupteur */
  valeur: number;
}

export interface ReglagesCircuit {
  /** la boîte : des conducteurs ohmiques dont un seul est celui du protocole, le condensateur à identifier, l'interrupteur */
  boite: Composant[];
  /** ce que le protocole demande : le conducteur ohmique à poser, la tension du générateur */
  demande: { R: number; E: number };
  /** la tension que le condensateur garde en sortant de la boîte : il a servi au groupe d'avant */
  reste: number;
}

/** Un morceau de courbe : à partir de l'instant `de`, la carte lit a + b × u, où u = uInf + (u0 − uInf) × e^(−(t − de)/tau). */
export interface Morceau { de: number; u0: number; uInf: number; tau: number; a: number; b: number }

export interface Acquisition {
  /** la durée réglée sur la carte */
  duree: number;
  /** l'instant où l'élève l'a arrêtée ; null si elle est allée au bout */
  arret: number | null;
  /** au déclenchement : la tension du générateur, s'il était en sécurité, et où en était le condensateur */
  E: number;
  securite: boolean;
  condensateur: Reponse["condensateur"];
  /** la courbe : un morceau par circuit ; un geste fait pendant l'enregistrement en ouvre un nouveau */
  morceaux: Morceau[];
}

export interface EtatCircuit {
  /** ce qui est posé sur chaque emplacement de la plaque : un composant de la boîte, ou rien */
  plaque: (string | null)[];
  /** les fils posés : chacun relie deux bornes */
  fils: [string, string][];
  /** la tension réglée sur le générateur */
  E: number;
  /** vrai si l'interrupteur est fermé */
  ferme: boolean;
  /** la tension aux bornes du condensateur, de sa première borne vers la seconde, au dernier geste */
  uC: number;
  /** vrai si le générateur s'est mis en sécurité : il débitait trop */
  securite: boolean;
  /** le nombre de fois où il s'y est mis */
  courts: number;
  /** la durée réglée sur la carte */
  duree: number;
  /** la carte : au repos, prête (elle attend que la tension bouge), ou en train d'enregistrer */
  carte: "repos" | "prete" | "enregistre";
  /** le nombre d'acquisitions lancées */
  lancees: number;
  /** la dernière acquisition déclenchée ; null tant que la carte n'a rien enregistré depuis le dernier lancement */
  acquisition: Acquisition | null;
  /** le temps caractéristique que l'élève a relevé sur la courbe */
  note: number | null;
}

/** La plaque a trois emplacements ; chacun a deux bornes : « a1 » et « a2 » pour le premier. */
export const EMPLACEMENTS = 3;
export const bornesDe = (emplacement: number): [string, string] => [`${"abc"[emplacement]}1`, `${"abc"[emplacement]}2`];
export const GENERATEUR = { plus: "g+", moins: "g-" } as const;
export const CARTE = { voie: "voie", masse: "masse" } as const;
/** Toutes les bornes de la paillasse. */
export const BORNES: readonly string[] = [GENERATEUR.plus, GENERATEUR.moins, ...[0, 1, 2].flatMap(bornesDe), CARTE.voie, CARTE.masse];
/** Le nombre de fils qu'on peut poser : assez pour tous les montages, pas plus. */
export const FILS_MAX = 12;
/** Le générateur se règle de 0 à 12 V, par crans d'un demi-volt. */
export const E_MAX = 12;
export const CRAN = 0.5;
/** La résistance interne du générateur, et le courant au-delà duquel il se met en sécurité. */
export const R_INTERNE = 1;
export const I_SECURITE = 0.3;
/** La carte : sa résistance d'entrée, les tensions qu'elle sait lire (de −10 à 10 V), le nombre de points d'une acquisition. */
export const R_ENTREE = 1e9;
export const CALIBRE = 10;
export const POINTS = 200;
/** Les durées d'acquisition proposées par la molette de la carte. */
export const DUREES: readonly number[] = [1, 2, 5, 10, 20, 50];
/** La carte se déclenche quand la tension mesurée s'écarte de ce seuil. */
const SEUIL = 0.05;
/** Au-delà de cette résistance, le condensateur ne se charge plus à l'échelle d'une séance : il garde sa tension. */
const LENTE = 1e7;
const MORCEAUX_MAX = 24;

const centieme = (x: number) => Math.round(x * 100) / 100;
const millieme = (x: number) => Math.round(x * 1000) / 1000;
/** Arrondit une tension au microvolt : l'état reste lisible, et rejoué il redonne le même. */
const net = (x: number) => Math.round(x * 1e6) / 1e6;
const proche = (x: number, cible: number, tolerance = 0.02) => Math.abs(x - cible) <= tolerance * Math.abs(cible);
const memeFil = (f: readonly [string, string], a: string, b: string) => (f[0] === a && f[1] === b) || (f[0] === b && f[1] === a);

/** Un composant de la boîte, par son nom. */
export const composant = (r: ReglagesCircuit, id: string | null): Composant | undefined => r.boite.find((c) => c.id === id);
/** L'emplacement où un composant est posé ; −1 s'il est dans la boîte. */
export const placeDe = (etat: EtatCircuit, id: string): number => etat.plaque.indexOf(id);
/** La capacité du condensateur de la boîte : c'est ce que le TP cherche. */
export const capacite = (r: ReglagesCircuit): number => r.boite.find((c) => c.genre === "condensateur")?.valeur ?? 1e-6;
/** Le temps caractéristique du montage demandé par le protocole : τ = R × C. */
export const tauAttendu = (r: ReglagesCircuit): number => r.demande.R * capacite(r);

type Montage = Pick<EtatCircuit, "plaque" | "fils" | "E" | "ferme">;

/** Le réseau que forme la paillasse : ses fils, les composants posés sur la plaque, le générateur, la carte. */
export function reseauDe(r: ReglagesCircuit, e: Montage, source: boolean): Reseau {
  const liens: [string, string][] = [...e.fils];
  const resistances: { a: string; b: string; R: number }[] = [];
  let condensateur: Reseau["condensateur"] = null;
  e.plaque.forEach((id, i) => {
    const c = composant(r, id);
    if (!c) return;
    const [a, b] = bornesDe(i);
    if (c.genre === "resistance") resistances.push({ a, b, R: c.valeur });
    else if (c.genre === "condensateur") condensateur ??= { a, b, C: c.valeur };
    else if (e.ferme) liens.push([a, b]);
  });
  return {
    liens, resistances, condensateur,
    sources: source ? [{ plus: GENERATEUR.plus, moins: GENERATEUR.moins, E: e.E, r: R_INTERNE }] : [],
    mesure: { voie: CARTE.voie, masse: CARTE.masse, entree: R_ENTREE },
    reference: GENERATEUR.moins,
  };
}

/** Ce que fait le montage. Un générateur qui débiterait trop se met en sécurité : il ne fournit plus rien. */
export function regime(r: ReglagesCircuit, e: Montage): Reponse & { securite: boolean } {
  const allume = reponse(reseauDe(r, e, true));
  if (allume.courant <= I_SECURITE) return { ...allume, securite: false };
  return { ...reponse(reseauDe(r, e, false)), securite: true };
}

/** La tension du condensateur à l'instant t d'un enregistrement ; `auGeste` est sa tension au dernier geste. */
function tensionCondensateur(acq: Acquisition, auGeste: number, t: number): number {
  const m = acq.morceaux[acq.morceaux.length - 1];
  return m.tau > 0 ? m.uInf + (m.u0 - m.uInf) * Math.exp(-(t - m.de) / m.tau) : auGeste;
}

/** La tension du condensateur en ce moment : à l'instant t d'un enregistrement en cours, sinon au repos. */
export const tensionActuelle = (etat: EtatCircuit, t: number | null): number =>
  (etat.carte === "enregistre" && etat.acquisition ? tensionCondensateur(etat.acquisition, etat.uC, t ?? etat.acquisition.duree) : etat.uC);

/** La tension que la carte a enregistrée à l'instant t : au-delà de son calibre, elle écrête. */
export function tensionMesuree(acq: Acquisition, t: number): number {
  let m = acq.morceaux[0];
  for (const suivant of acq.morceaux) if (suivant.de <= t) m = suivant;
  const u = m.tau > 0 ? m.uInf + (m.u0 - m.uInf) * Math.exp(-(t - m.de) / m.tau) : 0;
  return Math.max(-CALIBRE, Math.min(CALIBRE, m.a + m.b * u));
}

/** L'écart entre deux points d'une acquisition, et l'instant de son dernier point. */
export const pasDe = (acq: Acquisition): number => acq.duree / POINTS;
export const finDe = (acq: Acquisition): number => (acq.arret === null ? acq.duree : Math.floor(acq.arret / pasDe(acq) + 1e-9) * pasDe(acq));
/**
 * L'écart admis entre le temps noté et le temps caractéristique `tau` de la courbe. La méthode des 63 % se juge à 6 %
 * près (15 % pour une faute grave). S'y ajoute un point de la courbe : le repère va de point en point, et sur une
 * acquisition longue un seul point pèse déjà plusieurs pour cent. Sans cela, une lecture juste compterait comme une faute.
 */
export const ecartAdmis = (acq: Acquisition, tau: number, grave = false): number => (grave ? 0.15 : 0.06) * tau + pasDe(acq);

const morceau = (de: number, uC: number, rep: Reponse): Morceau => ({ de, u0: rep.condensateur === "branche" ? uC : 0, uInf: rep.uInf, tau: rep.tau, a: rep.a, b: rep.b });
const memeCourbe = (m: Morceau, de: number, n: Morceau): boolean => {
  const u = m.tau > 0 ? m.uInf + (m.u0 - m.uInf) * Math.exp(-(de - m.de) / m.tau) : 0;
  return [m.uInf - n.uInf, m.tau - n.tau, m.a - n.a, m.b - n.b, u - n.u0].every((ecart) => Math.abs(ecart) < 1e-9);
};
/** Hors enregistrement, le condensateur est au repos : déchargé par un fil, chargé par un circuit fermé, ou tel qu'il était. */
const auRepos = (rep: Reponse, uC: number): number => (rep.condensateur === "shunte" ? 0 : rep.condensateur === "branche" && rep.Rth < LENTE ? rep.uInf : uC);

/** Termine l'enregistrement en cours : à l'instant t si l'élève l'arrête, sinon au bout de sa durée. */
function termine(r: ReglagesCircuit, etat: EtatCircuit, t: number | null): EtatCircuit {
  const acq = etat.acquisition;
  if (!acq) return { ...etat, carte: "repos" };
  const uC = tensionCondensateur(acq, etat.uC, t ?? acq.duree);
  return { ...etat, carte: "repos", uC: net(auRepos(regime(r, etat), uC)), acquisition: { ...acq, arret: t } };
}

/** Ce qu'un geste qui touche au circuit change : le générateur, le condensateur, et la carte si elle guette ou enregistre. */
function physique(r: ReglagesCircuit, avant: EtatCircuit, apres: EtatCircuit, t: number | null): EtatCircuit {
  const ancien = regime(r, avant), nouveau = regime(r, apres);
  const courts = avant.courts + (nouveau.securite && !ancien.securite ? 1 : 0);
  const acq = avant.acquisition;
  let uC = t !== null && acq ? tensionCondensateur(acq, avant.uC, t) : avant.uC;
  if (nouveau.condensateur === "shunte") uC = 0;
  if (t !== null && acq) {
    // en plein enregistrement : la courbe continue avec le nouveau circuit
    const suivant = morceau(t, uC, nouveau);
    const inchangee = memeCourbe(acq.morceaux[acq.morceaux.length - 1], t, suivant) || acq.morceaux.length >= MORCEAUX_MAX;
    return { ...apres, uC: net(uC), securite: nouveau.securite, courts, acquisition: inchangee ? acq : { ...acq, morceaux: [...acq.morceaux, suivant] } };
  }
  if (avant.carte === "prete") {
    // la carte guette la tension : elle se déclenche si ce geste la fait bouger, tout de suite ou en chargeant le condensateur
    const lue = ancien.a + ancien.b * avant.uC;
    const aussitot = nouveau.a + nouveau.b * uC;
    const ensuite = nouveau.condensateur === "branche" && nouveau.Rth < LENTE ? nouveau.a + nouveau.b * nouveau.uInf : aussitot;
    if (Math.abs(aussitot - lue) > SEUIL || Math.abs(ensuite - lue) > SEUIL) {
      const acquisition: Acquisition = { duree: apres.duree, arret: null, E: apres.E, securite: nouveau.securite, condensateur: nouveau.condensateur, morceaux: [morceau(0, uC, nouveau)] };
      return { ...apres, uC: net(uC), securite: nouveau.securite, courts, carte: "enregistre", acquisition };
    }
  }
  // hors enregistrement, le temps n'est pas compté : le condensateur a fini de se charger ou de se décharger
  return { ...apres, uC: net(auRepos(nouveau, uC)), securite: nouveau.securite, courts };
}

/** Ce qu'un geste change sur la paillasse, sans la physique ; l'état lui-même si le geste est inconnu, mal formé ou impossible. */
function change(r: ReglagesCircuit, etat: EtatCircuit, g: GesteBrut): EtatCircuit {
  const v = nombreDe(g, "v"), a = texteDe(g, "a"), b = texteDe(g, "b"), quoi = texteDe(g, "quoi");
  switch (g.g) {
    // prendre un composant dans la boîte, ou sur la plaque, et le poser sur un emplacement libre
    case "poser": {
      const ou = nombreDe(g, "ou");
      if (!composant(r, quoi) || ou === null || !Number.isInteger(ou) || ou < 0 || ou >= EMPLACEMENTS || etat.plaque[ou] !== null) return etat;
      return { ...etat, plaque: etat.plaque.map((id, i) => (i === ou ? quoi : id === quoi ? null : id)) };
    }
    case "ranger": return quoi !== null && etat.plaque.includes(quoi) ? { ...etat, plaque: etat.plaque.map((id) => (id === quoi ? null : id)) } : etat;
    // la molette du générateur
    case "tension": return v !== null && v >= 0 && v <= E_MAX && Number.isInteger(v / CRAN) && v !== etat.E ? { ...etat, E: v } : etat;
    case "basculer": return etat.plaque.some((id) => composant(r, id)?.genre === "interrupteur") ? { ...etat, ferme: !etat.ferme } : etat;
    case "relier":
      if (a === null || b === null || a === b || !BORNES.includes(a) || !BORNES.includes(b) || etat.fils.length >= FILS_MAX || etat.fils.some((f) => memeFil(f, a, b))) return etat;
      return { ...etat, fils: [...etat.fils, [a, b]] };
    case "retirer": return a !== null && b !== null && etat.fils.some((f) => memeFil(f, a, b)) ? { ...etat, fils: etat.fils.filter((f) => !memeFil(f, a, b)) } : etat;
    default: return etat;
  }
}

/** Applique un geste. Un geste inconnu, mal formé ou impossible ne change rien. */
function geste(r: ReglagesCircuit, etat: EtatCircuit, g: GesteBrut): EtatCircuit {
  const t = nombreDe(g, "t"), v = nombreDe(g, "v");
  const acq = etat.acquisition;
  // pendant un enregistrement, un geste qui porte son instant le modifie ; sans instant, l'acquisition est allée au bout avant lui
  const vivant = etat.carte === "enregistre" && acq !== null && t !== null && t >= acq.morceaux[acq.morceaux.length - 1].de && t < acq.duree;
  const base = etat.carte === "enregistre" && !vivant ? termine(r, etat, null) : etat;
  const instant = vivant && t !== null ? millieme(t) : null;
  switch (g.g) {
    // la carte : prête, elle efface la courbe d'avant et attend que la tension bouge
    case "lancer": return base.carte === "repos" ? { ...base, carte: "prete", lancees: base.lancees + 1, acquisition: null, note: null } : etat;
    case "arreter":
      if (etat.carte === "prete") return { ...etat, carte: "repos" };
      return etat.carte === "enregistre" ? (instant === null ? base : termine(r, etat, instant)) : etat;
    case "duree": return v !== null && DUREES.includes(v) && v !== base.duree ? { ...base, duree: v } : etat;
    // le temps caractéristique que l'élève retient : la place de son repère sur la courbe
    case "noter": return v !== null && v > 0 && v <= 1000 && base.acquisition !== null ? { ...base, note: millieme(v) } : etat;
    default: {
      const suite = change(r, base, g);
      return suite === base ? etat : physique(r, base, suite, instant);
    }
  }
}

// ---------- le bilan ----------

/** Une résistance dite simplement : « 680 Ω », « 6,8 kΩ », « 150 kΩ ». */
export const ohms = (R: number): string => {
  const [x, unite] = R >= 1e6 ? [R / 1e6, "MΩ"] : R >= 1000 ? [R / 1000, "kΩ"] : [R, "Ω"];
  const centiemes = Math.round(x * 100);
  return `${nombre(x, centiemes % 100 === 0 ? 0 : centiemes % 10 === 0 ? 1 : 2)} ${unite}`;
};
const volts = (u: number, decimales = 2) => `${nombreRelatif(u, decimales)} V`;
const secondes = (t: number, decimales = 2) => `${nombre(t, decimales)} s`;
const duree = (t: number) => secondes(t, Number.isInteger(t) ? 0 : 1);

/** Pourquoi la carte, lancée, n'a rien enregistré : le professeur regarde le montage tel qu'il est. */
function sansCourbe(r: ReglagesCircuit, etat: EtatCircuit): string {
  if (etat.lancees === 0) return "Tu n'as pas lancé d'acquisition : il n'y a pas de courbe à exploiter.";
  const debut = "Tu as lancé l'acquisition, mais la carte n'a rien enregistré : la tension qu'elle mesure n'a jamais bougé.";
  // le montage, interrupteur fermé : ce qu'il aurait donné
  const rep = regime(r, { ...etat, ferme: true });
  if (rep.securite) return `${debut} Le générateur est en sécurité : ses deux bornes sont reliées sans aucune résistance entre elles.`;
  if (rep.condensateur === "absent") return `${debut} Le condensateur n'est pas sur la plaque.`;
  if (rep.condensateur === "shunte") return `${debut} Un fil relie encore les deux bornes du condensateur : il ne peut pas se charger.`;
  if (etat.E === 0) return `${debut} Le générateur est resté à 0 V.`;
  if (rep.Rth >= LENTE) return `${debut} Même avec l'interrupteur fermé, la boucle ne se ferme pas : il manque un fil, ou un composant n'est relié que d'un côté.`;
  if (Math.abs(rep.b) < 0.5) return `${debut} La voie et la masse de la carte ne sont pas aux bornes du condensateur.`;
  if (!etat.ferme && etat.plaque.some((id) => composant(r, id)?.genre === "interrupteur")) return `${debut} Il restait à fermer l'interrupteur.`;
  return `${debut} Le condensateur était déjà chargé quand tu l'as lancée : ouvre l'interrupteur, décharge le condensateur, lance l'acquisition, puis ferme l'interrupteur.`;
}

/** Le bilan de la manipulation : le temps caractéristique relevé, le conducteur ohmique utilisé, et les fautes dites par le professeur. */
function bilan(r: ReglagesCircuit, etat: EtatCircuit): BilanPaillasse {
  const C = capacite(r);
  const fautes: Faute[] = [];
  const faute = (code: string, grave: boolean, texte: string) => fautes.push({ code, grave, texte });
  const acq = etat.acquisition;
  /** le conducteur ohmique de la boucle, s'il y en a un seul ; sinon celui du protocole */
  let R = r.demande.R;
  /** le temps caractéristique que la courbe permet de lire ; null si elle n'en montre pas */
  let lisible: number | null = null;
  /** ce qu'un élève lit s'il place le repère à 63 % du palier sans voir que la courbe ne part pas de zéro */
  let naif: number | null = null;

  if (!acq) {
    faute("acquisition", true, sansCourbe(r, etat));
  } else {
    const m = acq.morceaux[0];
    const E = acq.E;
    const fenetre = acq.arret ?? acq.duree;
    const Rth = m.tau / C;
    // la courbe est une exponentielle dès que le condensateur se charge ou se décharge à travers une résistance
    lisible = acq.condensateur === "branche" && Rth >= 10 && Rth < LENTE ? m.tau : null;
    /** vrai si la courbe est celle de la charge du condensateur, à l'endroit ou à l'envers */
    let charge = false;
    if (acq.securite) {
      faute("montage", true, "Pendant l'acquisition, le générateur était en sécurité : ses deux bornes étaient reliées sans aucune résistance entre elles, et il ne fournissait plus aucune tension.");
    } else if (acq.condensateur === "absent") {
      faute("montage", true, "Le condensateur n'était pas dans le circuit pendant l'acquisition : la courbe n'est pas celle de sa charge.");
    } else if (acq.condensateur === "shunte") {
      // la carte guettait déjà quand le fil de décharge a été posé : c'est la décharge qui l'a déclenchée
      faute("montage", true, Math.abs(m.a) < SEUIL
        ? "La carte s'est déclenchée quand tu as relié les deux bornes du condensateur : elle a enregistré sa décharge, pas sa charge. Décharge le condensateur et retire le fil avant de lancer l'acquisition."
        : "Un fil reliait les deux bornes du condensateur pendant l'acquisition : il ne pouvait pas se charger. Ce fil sert à le décharger, puis il se retire.");
    } else if (Rth >= LENTE) {
      faute("montage", true, "Pendant l'acquisition, aucun courant ne chargeait le condensateur : la boucle n'était pas fermée, ou la carte était branchée dans la boucle au lieu d'être aux bornes du condensateur.");
    } else if (E === 0) {
      faute("tension", true, "Le générateur est resté à 0 V : rien ne chargeait le condensateur.");
    } else if (!proche(Math.abs(m.uInf), E)) {
      faute("montage", true, `Le condensateur ne se chargeait que jusqu'à ${volts(Math.abs(m.uInf))}, pas jusqu'à la tension du générateur (${volts(E, 1)}) : tes composants ne forment pas une seule boucle.`);
    } else {
      const sens = Math.sign(m.uInf);
      const nulle = Math.abs(m.a) < 0.02 * E;
      if (Math.abs(m.b - sens) < 0.02 && nulle) {
        charge = true;
      } else if (Math.abs(m.b + sens) < 0.02 && nulle) {
        charge = true;
        faute("montage", false, "La voie et la masse de la carte sont inversées : ta courbe est négative. La voie va sur la borne du condensateur qui est du côté de la borne + du générateur.");
      } else if (Math.abs(Math.abs(m.b) - 1) < 0.02 && proche(Math.abs(m.a), E)) {
        faute("montage", true, `La voie ne mesurait pas la tension du condensateur, mais celle du reste de la boucle : la courbe part de ${volts(tensionMesuree(acq, 0))} et revient vers 0 au lieu de monter. La voie et la masse se branchent aux deux bornes du condensateur.`);
      } else if (Math.abs(m.b) < 0.02) {
        faute("montage", true, "La voie et la masse n'étaient pas aux bornes du condensateur : la tension mesurée ne dépend pas de sa charge, et la courbe est une droite.");
      } else {
        faute("montage", true, "La voie et la masse n'étaient pas aux deux bornes du condensateur : la courbe n'est pas celle de sa charge.");
      }
    }
    if (charge) {
      // le conducteur ohmique
      const pose = r.boite.find((c) => c.genre === "resistance" && proche(Rth, c.valeur));
      if (Rth < 10) {
        faute("resistance", true, "Il n'y avait aucun conducteur ohmique dans la boucle : le condensateur s'est chargé d'un coup, et la courbe est une marche.");
      } else if (!pose) {
        faute("resistance", true, `La boucle contenait ${ohms(Math.round(Rth))} de résistance : le protocole demande un seul conducteur ohmique, celui de ${ohms(r.demande.R)}.`);
      } else {
        R = pose.valeur;
        if (R !== r.demande.R) faute("resistance", false, `Tu as posé le conducteur ohmique de ${ohms(R)} au lieu de celui de ${ohms(r.demande.R)} : le temps caractéristique n'est plus celui que le protocole prévoit. Lis la valeur écrite sur le composant.`);
      }
      // la tension du générateur
      if (E > CALIBRE) faute("tension", true, `Tu as réglé le générateur sur ${volts(E, 1)} : c'est plus que ce que la carte sait lire (${volts(CALIBRE, 0)}), et le haut de la courbe est écrêté.`);
      else if (E !== r.demande.E) faute("tension", false, `Tu as réglé le générateur sur ${volts(E, 1)} au lieu de ${volts(r.demande.E, 1)}.`);
      if (lisible !== null) {
        // la décharge : la courbe doit partir de zéro
        if (Math.abs(m.u0) > 0.02 * E) {
          const reste = Math.exp(-1) * m.uInf / (m.uInf - m.u0);
          naif = reste > 0 && reste < 1 ? -m.tau * Math.log(reste) : 0;
          faute("decharge", Math.abs(m.u0) > 0.1 * E, `Le condensateur n'était pas déchargé : la courbe part de ${volts(tensionMesuree(acq, 0))} au lieu de 0. Avant de lancer l'acquisition, relie ses deux bornes par un fil, puis retire ce fil.`);
        }
        // la durée : il faut voir la montée, puis le palier
        const atteint = Math.round(100 * (1 - Math.exp(-fenetre / m.tau) * (1 - m.u0 / m.uInf)));
        const quoi = acq.arret === null ? `Ton acquisition dure ${duree(fenetre)}` : `Tu as arrêté l'acquisition à ${secondes(fenetre, 1)}`;
        if (fenetre < 4 * m.tau) faute("duree", false, `${quoi} : à la fin, la tension n'est qu'à ${atteint} % de sa valeur finale, et le palier ne se voit pas. Il faut une durée plus longue, d'environ cinq fois le temps caractéristique.`);
        else if (fenetre > 12 * m.tau) faute("duree", false, `${quoi} : la montée n'occupe que le début de l'écran, où elle est écrasée, et le repère ne se place plus avec précision. Il faut une durée plus courte, d'environ cinq fois le temps caractéristique.`);
        // un geste pendant l'enregistrement
        const derange = acq.morceaux[1];
        if (derange && derange.de < Math.min(fenetre, 5 * m.tau)) faute("touche", false, `Tu as touché au circuit pendant l'acquisition, à t = ${secondes(derange.de, 1)} : la courbe n'est plus celle d'une seule charge.`);
      }
    }
    if (etat.courts > 0 && !acq.securite) faute("court", false, `Pendant le montage, le générateur s'est mis en sécurité ${etat.courts > 1 ? `${etat.courts} fois` : "une fois"} : ses deux bornes étaient reliées sans aucune résistance entre elles. Vérifie ton câblage avant de monter la tension.`);
    // ce que l'élève retient
    if (etat.note === null) {
      faute("note", true, "Tu n'as pas relevé le temps caractéristique sur la courbe.");
    } else if (lisible === null) {
      faute("lecture", true, "Ta courbe ne montre pas la charge du condensateur à travers un conducteur ohmique : on ne peut pas y lire de temps caractéristique.");
    } else {
      const ecart = Math.abs(etat.note - lisible);
      // un repère placé à 63 % du palier sur une courbe qui ne part pas de zéro : la faute est la décharge oubliée, déjà dite
      const explique = naif !== null && Math.abs(etat.note - naif) <= ecartAdmis(acq, naif);
      const texte = `Tu as noté τ = ${secondes(etat.note)} ; le temps caractéristique de ton montage vaut ${secondes(lisible)}. Sur une courbe qui part de zéro, c'est l'instant où la tension vaut 0,63 fois sa valeur finale : place le repère là.`;
      if (!explique && ecart > ecartAdmis(acq, lisible, true)) faute("lecture", true, texte);
      else if (!explique && ecart > ecartAdmis(acq, lisible)) faute("lecture", false, texte);
    }
  }
  const attendu = centieme(tauAttendu(r));
  const lignes = etat.note === null || !acq
    ? [`Sans temps relevé, on continue avec les valeurs du professeur : τ = ${secondes(attendu)}, avec R = ${ohms(r.demande.R)}.`]
    : [`Ton temps caractéristique : τ = ${secondes(etat.note)}, avec le conducteur ohmique de ${ohms(R)}.`, `Valeur attendue pour une manipulation sans défaut : τ = ${secondes(attendu)}, avec R = ${ohms(r.demande.R)}.`];
  const mesures = etat.note === null || !acq ? { tau: attendu, R: r.demande.R } : { tau: etat.note, R };
  // sans courbe, la manipulation n'est pas faite
  return { score: acq ? scoreDesFautes(fautes) : 0, fautes, mesures, lignes };
}

const depart = (r: ReglagesCircuit): EtatCircuit => ({
  plaque: Array.from({ length: EMPLACEMENTS }, () => null), fils: [], E: 0, ferme: false, uC: r.reste, securite: false, courts: 0,
  duree: 2, carte: "repos", lancees: 0, acquisition: null, note: null,
});

export const regles: ReglesPaillasse<ReglagesCircuit, EtatCircuit> = { depart, geste, bilan };
