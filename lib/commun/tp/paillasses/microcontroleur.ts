// La paillasse « microcontroleur » (décision 0012) : une carte à microcontrôleur et son moniteur série, une plaque d'essai,
// une boîte de conducteurs ohmiques, et une cuve où trempent les deux lames d'un capteur capacitif. L'élève fait les
// gestes du laboratoire : choisir le bon conducteur ohmique et le piquer sur la plaque d'essai, tirer les fils entre les
// broches, la plaque et le capteur, faire monter ou descendre l'eau, lancer une mesure, lire la durée sur le moniteur et
// le niveau sur la graduation de la cuve, noter les deux dans son carnet, et recommencer pour plusieurs niveaux.
//
// Le programme de la carte : il met la broche D2 à 5 V, et chronomètre le temps que met la tension lue sur A0 (par
// rapport à GND) pour atteindre 63 % de 5 V. Avec le bon montage, cette durée est le temps caractéristique τ = R × C.
// Le montage se lit par ses nœuds, avec la loi des nœuds de la paillasse Circuits : la carte répond à n'importe quel
// câblage. A0 sur la mauvaise rangée, et le programme affiche 0 µs ou abandonne ; les broches 5 V et GND reliées, et la
// carte se coupe.
//
// Fonctions pures : le navigateur s'en sert pour faire vivre la paillasse, le serveur pour rejouer la manipulation.
// Les tensions sont en volts, les résistances en ohms, les capacités en farads, les niveaux en centimètres, les durées
// affichées en microsecondes.
import { nombre } from "@/lib/commun/format";
import { nombreDe, scoreDesFautes, texteDe, type BilanPaillasse, type Faute, type GesteBrut, type ReglesPaillasse } from "../types";
import { ohms, reponse, type Composant, type Reponse, type Reseau } from "./circuit";

export interface ReglagesMicrocontroleur {
  /** la boîte : des conducteurs ohmiques, dont un seul est celui du protocole */
  boite: Composant[];
  /** ce que le protocole demande : le conducteur ohmique à utiliser, et le nombre de niveaux d'eau à relever */
  demande: { R: number; releves: number };
  /** le capteur : sa capacité quand la cuve est vide, et ce que chaque centimètre d'eau lui ajoute */
  C0: number;
  parCm: number;
  /** le niveau d'eau dans la cuve au départ : elle n'est pas vide */
  niveau: number;
}

/** Une ligne du moniteur série : ce que le programme a affiché, et ce qui s'est passé dans le montage à ce moment-là. */
export interface Affichage {
  /** le niveau d'eau au moment de la mesure */
  niveau: number;
  /** la durée affichée, en microsecondes ; null si le programme a abandonné */
  duree: number | null;
  /** « charge » : le capteur s'est chargé de 0 à 5 V à travers une résistance, et A0 lisait sa tension */
  nature: "charge" | "autre";
  /** la résistance à travers laquelle le capteur s'est chargé ; 0 s'il ne se chargeait pas */
  R: number;
}

/** Une ligne du carnet de l'élève : le niveau qu'il a lu sur la cuve, la durée qu'il a lue sur le moniteur. */
export interface Releve {
  h: number;
  t: number;
  /** le rang de la dernière mesure affichée quand il a noté ; −1 si le moniteur était vide */
  mesure: number;
}

export interface EtatMicrocontroleur {
  /** ce qui est piqué sur chaque emplacement de la plaque d'essai : un conducteur ohmique de la boîte, ou rien */
  plaque: (string | null)[];
  /** les fils posés : chacun relie deux bornes */
  fils: [string, string][];
  /** le niveau d'eau dans la cuve */
  niveau: number;
  /** l'eau passée par-dessus bord, en centimètres de cuve */
  deborde: number;
  /** vrai si la carte s'est coupée : une de ses broches débitait trop */
  securite: boolean;
  /** le nombre de fois où elle s'est coupée */
  courts: number;
  /** le nombre de mesures lancées, et les lignes que le moniteur a affichées */
  lancees: number;
  lignes: Affichage[];
  carnet: Releve[];
}

/** Les broches de la carte : l'alimentation 5 V, la sortie D2, les entrées A0 et A1, la masse. */
export const BROCHES = { v5: "v5", d2: "d2", a0: "a0", a1: "a1", gnd: "gnd" } as const;
/** La plaque d'essai : trois rangées, et deux emplacements, chacun à cheval sur deux rangées voisines. */
export const RANGEES: readonly string[] = ["l1", "l2", "l3"];
export const EMPLACEMENTS = 2;
export const rangeesDe = (emplacement: number): [string, string] => [RANGEES[emplacement], RANGEES[emplacement + 1]];
/** Les deux lames du capteur. */
export const LAMES: readonly [string, string] = ["p1", "p2"];
/** Toutes les bornes de la paillasse. */
export const BORNES: readonly string[] = [...Object.values(BROCHES), ...RANGEES, ...LAMES];
export const FILS_MAX = 10;
/** La cuve fait 12 cm de haut ; au-delà, l'eau déborde. */
export const HAUTEUR = 12;
/** La carte : sa tension, la résistance de sortie d'une broche et de son alimentation, le courant qui la fait se couper. */
export const TENSION = 5;
const R_BROCHE = 25;
const R_ALIMENTATION = 0.5;
const I_SECURITE = 0.15;
/** L'entrée A0 ne prend presque aucun courant. */
const R_ENTREE = 1e10;
/** Le seuil du programme : 63 % de 5 V. Passé un dixième de seconde sans l'atteindre, il abandonne. */
export const SEUIL = TENSION * (1 - Math.exp(-1));
const DELAI = 0.1;
/** Au-delà de cette résistance, le capteur ne se charge plus : il garde sa tension. */
const LENTE = 1e9;
/** Ce que le moniteur garde de mesures, et le carnet de lignes. */
export const LIGNES_MAX = 60;
export const CARNET_MAX = 8;

const centieme = (x: number) => Math.round(x * 100) / 100;
const proche = (x: number, cible: number, tolerance = 0.02) => Math.abs(x - cible) <= tolerance * Math.abs(cible);
const memeFil = (f: readonly [string, string], a: string, b: string) => (f[0] === a && f[1] === b) || (f[0] === b && f[1] === a);

/** Un conducteur ohmique de la boîte, par son nom. */
export const composant = (r: ReglagesMicrocontroleur, id: string | null): Composant | undefined => r.boite.find((c) => c.id === id);
/** L'emplacement où un conducteur ohmique est piqué ; −1 s'il est dans la boîte. */
export const placeDe = (etat: EtatMicrocontroleur, id: string): number => etat.plaque.indexOf(id);
/** La capacité du capteur pour un niveau d'eau. */
export const capacite = (r: ReglagesMicrocontroleur, niveau: number): number => r.C0 + r.parCm * niveau;
/** La durée qu'affiche le programme avec le montage du protocole, en microsecondes : τ = R × C. */
export const dureeAttendue = (r: ReglagesMicrocontroleur, niveau: number, R = r.demande.R): number => Math.round(R * capacite(r, niveau) * 1e6);

type Montage = Pick<EtatMicrocontroleur, "plaque" | "fils" | "niveau">;

/** Le réseau que forme la paillasse quand la broche D2 est à l'état haut (5 V) ou bas (0 V). */
function reseauDe(r: ReglagesMicrocontroleur, e: Montage, haut: boolean): Reseau {
  const resistances = e.plaque.flatMap((id, i) => {
    const c = composant(r, id);
    return c ? [{ a: rangeesDe(i)[0], b: rangeesDe(i)[1], R: c.valeur }] : [];
  });
  return {
    liens: e.fils, resistances,
    sources: [{ plus: BROCHES.d2, moins: BROCHES.gnd, E: haut ? TENSION : 0, r: R_BROCHE }, { plus: BROCHES.v5, moins: BROCHES.gnd, E: TENSION, r: R_ALIMENTATION }],
    condensateur: { a: LAMES[0], b: LAMES[1], C: capacite(r, e.niveau) },
    mesure: { voie: BROCHES.a0, masse: BROCHES.gnd, entree: R_ENTREE },
    reference: BROCHES.gnd,
  };
}

/** Vrai si une broche de la carte débite trop : elle se coupe pour se protéger. */
const tropDeCourant = (r: ReglagesMicrocontroleur, e: Montage, haut: boolean): boolean => reponse(reseauDe(r, e, haut)).courant > I_SECURITE;

/** La tension du capteur une fois le régime établi ; nulle s'il n'est relié à rien qui la fixe. */
const etabli = (rep: Reponse): number => (rep.condensateur === "branche" && rep.Rth < LENTE ? rep.uInf : 0);

/**
 * Ce que le programme affiche pour le montage et le niveau d'eau du moment. Il part du repos, D2 à 0 V ; il met D2 à 5 V,
 * et attend que la tension lue sur A0 atteigne le seuil.
 */
export function mesure(r: ReglagesMicrocontroleur, e: Montage): Affichage {
  const bas = reponse(reseauDe(r, e, false)), haut = reponse(reseauDe(r, e, true));
  const u0 = etabli(bas);
  const depart = haut.a + haut.b * u0;
  const charge = haut.condensateur === "branche" && haut.Rth < LENTE;
  const arrivee = charge ? haut.a + haut.b * haut.uInf : depart;
  // le bon montage : A0 part de 0 V et monte vers 5 V, comme la tension du capteur, à travers une résistance
  const nature = charge && haut.Rth > 2 * R_BROCHE && Math.abs(depart) < 0.1 && Math.abs(arrivee - TENSION) < 0.1 && Math.abs(Math.abs(haut.b) - 1) < 0.02 ? "charge" : "autre";
  const R = charge ? Math.round(haut.Rth - R_BROCHE) : 0;
  let secondes: number | null;
  if (depart >= SEUIL) secondes = 0;
  else if (arrivee < SEUIL) secondes = null;
  else secondes = -haut.tau * Math.log(1 - (SEUIL - depart) / (arrivee - depart));
  return { niveau: e.niveau, duree: secondes === null || secondes > DELAI ? null : Math.round(secondes * 1e6), nature, R };
}

/** Applique un geste. Un geste inconnu, mal formé ou impossible ne change rien. */
function geste(r: ReglagesMicrocontroleur, etat: EtatMicrocontroleur, g: GesteBrut): EtatMicrocontroleur {
  const v = nombreDe(g, "v"), a = texteDe(g, "a"), b = texteDe(g, "b"), quoi = texteDe(g, "quoi");
  /** Après un geste qui touche au câblage : la carte au repos se coupe-t-elle ? */
  const cable = (suite: EtatMicrocontroleur): EtatMicrocontroleur => {
    const securite = tropDeCourant(r, suite, false);
    return { ...suite, securite, courts: etat.courts + (securite && !etat.securite ? 1 : 0) };
  };
  switch (g.g) {
    // prendre un conducteur ohmique dans la boîte, ou sur la plaque d'essai, et le piquer sur un emplacement libre
    case "poser": {
      const ou = nombreDe(g, "ou");
      if (!composant(r, quoi) || ou === null || !Number.isInteger(ou) || ou < 0 || ou >= EMPLACEMENTS || etat.plaque[ou] !== null) return etat;
      return cable({ ...etat, plaque: etat.plaque.map((id, i) => (i === ou ? quoi : id === quoi ? null : id)) });
    }
    case "ranger": return quoi !== null && etat.plaque.includes(quoi) ? cable({ ...etat, plaque: etat.plaque.map((id) => (id === quoi ? null : id)) }) : etat;
    case "relier":
      if (a === null || b === null || a === b || !BORNES.includes(a) || !BORNES.includes(b) || etat.fils.length >= FILS_MAX || etat.fils.some((f) => memeFil(f, a, b))) return etat;
      return cable({ ...etat, fils: [...etat.fils, [a, b]] });
    case "retirer": return a !== null && b !== null && etat.fils.some((f) => memeFil(f, a, b)) ? cable({ ...etat, fils: etat.fils.filter((f) => !memeFil(f, a, b)) }) : etat;
    // l'eau : elle monte quand on en verse, jusqu'au bord ; elle descend quand on ouvre la vidange
    case "verser": {
      if (v === null || v <= 0 || v > HAUTEUR) return etat;
      const monte = Math.min(centieme(v), centieme(HAUTEUR - etat.niveau));
      return { ...etat, niveau: centieme(etat.niveau + monte), deborde: centieme(etat.deborde + centieme(v) - monte) };
    }
    case "vider": return v === null || v <= 0 || v > HAUTEUR || etat.niveau <= 0 ? etat : { ...etat, niveau: centieme(Math.max(0, etat.niveau - centieme(v))) };
    // le bouton de la carte : le programme fait une mesure et l'écrit sur le moniteur
    case "mesurer": {
      if (etat.securite || etat.lignes.length >= LIGNES_MAX) return etat;
      // la broche D2 passe à 5 V : si elle débite trop, la carte se coupe au lieu de mesurer
      if (tropDeCourant(r, etat, true)) return { ...etat, securite: true, courts: etat.courts + 1, lancees: etat.lancees + 1 };
      return { ...etat, lancees: etat.lancees + 1, lignes: [...etat.lignes, mesure(r, etat)] };
    }
    // le carnet : le niveau lu sur la cuve, la durée lue sur le moniteur
    case "noter": {
      const h = nombreDe(g, "h"), t = nombreDe(g, "t");
      if (h === null || t === null || h < 0 || h > 20 || t < 0 || t > 1e6 || etat.carnet.length >= CARNET_MAX) return etat;
      return { ...etat, carnet: [...etat.carnet, { h: centieme(h), t: Math.round(t), mesure: etat.lignes.length - 1 }] };
    }
    case "effacer": return etat.carnet.length ? { ...etat, carnet: etat.carnet.slice(0, -1) } : etat;
    default: return etat;
  }
}

// ---------- le bilan ----------

/** En dessous de ce niveau, la cuve est vide : les lames ne trempent plus. */
const VIDE = 0.05;
const cm = (h: number, decimales = 1) => `${nombre(h, decimales)} cm`;
const micros = (t: number) => `${nombre(t, 0)} µs`;
/** Un niveau d'eau dit simplement : « la cuve vide », « 4,2 cm d'eau ». */
const eau = (h: number) => (h <= VIDE ? "la cuve vide" : `${cm(h)} d'eau`);

/** Ce qui ne va pas dans une mesure qui n'est pas celle du protocole, dit par le professeur. */
function defaut(ligne: Affichage): string {
  if (ligne.duree === 0) return "le moniteur a affiché 0 µs : la tension lue sur A0 dépassait déjà le seuil du programme au départ. A0 se branche entre le conducteur ohmique et le capteur, et c'est D2, pas la broche 5 V, qui charge le capteur.";
  if (ligne.duree === null) return "le moniteur a affiché « délai dépassé » : la tension lue sur A0 n'a jamais atteint le seuil du programme. D2 doit charger le capteur à travers le conducteur ohmique, A0 se brancher entre les deux, et l'autre lame du capteur aller à GND.";
  return "la tension lue sur A0 n'était pas celle du capteur en train de se charger de 0 à 5 V : D2, le conducteur ohmique et le capteur doivent se suivre, avec A0 entre le conducteur ohmique et le capteur, et l'autre lame à GND.";
}

/** Le bilan de la manipulation : les relevés du carnet repris par l'exploitation, et les fautes dites par le professeur. */

/**
 * Vrai si le niveau noté est celui de la mesure. La loupe est graduée au millimètre, et la surface de l'eau y dessine
 * un ménisque d'un bon millimètre : lue au creux ou au bord, à une demi-graduation près, la lecture est juste à deux
 * millimètres près. La petite marge évite qu'un arrondi du calcul fasse d'une lecture à deux graduations une faute.
 */
export const niveauBienLu = (note: number, niveau: number): boolean => Math.abs(note - niveau) <= 0.2 + 1e-6;

function bilan(r: ReglagesMicrocontroleur, etat: EtatMicrocontroleur): BilanPaillasse {
  const fautes: Faute[] = [];
  const faute = (code: string, grave: boolean, texte: string) => fautes.push({ code, grave, texte });
  /** les lignes du carnet, chacune avec la mesure que le moniteur affichait quand elle a été notée */
  const notes = etat.carnet.flatMap((n) => (etat.lignes[n.mesure] ? [{ ...n, ligne: etat.lignes[n.mesure] }] : []));
  /** celles qui viennent d'une vraie mesure : le capteur se chargeait, et le programme a affiché une durée */
  const bonnes = notes.filter((n) => n.ligne.nature === "charge" && n.ligne.duree !== null);
  let R = r.demande.R;

  if (etat.lignes.length === 0) {
    faute("mesure", true, etat.securite || etat.courts > 0
      ? "La carte s'est coupée : une de ses broches était en court-circuit, et le moniteur n'a rien affiché. Vérifie ton câblage : la broche 5 V et la broche D2 ne se relient jamais directement à GND."
      : "Tu n'as lancé aucune mesure : le moniteur n'a rien affiché.");
  } else if (notes.length === 0) {
    faute("carnet", true, "Tu n'as rien noté dans ton carnet : après chaque mesure, il faut y écrire le niveau lu sur la cuve et la durée lue sur le moniteur.");
  } else {
    // le montage
    const fausse = notes.find((n) => n.ligne.nature !== "charge" || n.ligne.duree === null);
    if (fausse) faute("montage", true, `Pour ${eau(fausse.ligne.niveau)}, ${defaut(fausse.ligne)}`);
    // le conducteur ohmique
    const resistance = bonnes[0]?.ligne.R;
    if (resistance !== undefined) {
      const pose = r.boite.find((c) => proche(resistance, c.valeur));
      if (!pose) faute("resistance", true, `Le capteur se chargeait à travers ${ohms(resistance)} : le protocole demande un seul conducteur ohmique, celui de ${ohms(r.demande.R)}.`);
      else {
        R = pose.valeur;
        if (R !== r.demande.R) faute("resistance", false, `Tu as piqué le conducteur ohmique de ${ohms(R)} au lieu de celui de ${ohms(r.demande.R)} : les durées ne sont plus celles que le protocole prévoit. Lis la valeur écrite sur le composant.`);
      }
    }
    // la lecture du niveau : chaque ligne du carnet face au niveau de la cuve au moment de sa mesure
    const ecarts = notes.map((n) => ({ n, ecart: Math.abs(n.h - n.ligne.niveau) })).sort((x, y) => y.ecart - x.ecart);
    const pire = ecarts[0];
    if (!niveauBienLu(pire.n.h, pire.n.ligne.niveau)) {
      faute("niveau", pire.ecart > 0.5 + 1e-6, `Tu as noté ${cm(pire.n.h)} pour une mesure faite avec ${eau(pire.n.ligne.niveau)} : à la loupe, lis la graduation en face du creux de la surface de l'eau, et relance une mesure après chaque changement de niveau.`);
    }
    // la recopie de la durée
    const recopie = notes.map((n) => ({ n, ecart: n.ligne.duree === null ? Infinity : Math.abs(n.t - n.ligne.duree) })).sort((x, y) => y.ecart - x.ecart)[0];
    if (recopie.ecart > 1) {
      faute("duree", recopie.n.ligne.duree === null || recopie.ecart > 0.05 * recopie.n.ligne.duree,
        recopie.n.ligne.duree === null ? `Tu as noté ${micros(recopie.n.t)} alors que le moniteur affichait « délai dépassé ».` : `Tu as noté ${micros(recopie.n.t)} alors que le moniteur affichait ${micros(recopie.n.ligne.duree)}.`);
    }
    // les niveaux relevés : assez nombreux, assez écartés, cuve vide comprise
    const niveaux = bonnes.map((n) => n.ligne.niveau).sort((x, y) => x - y).filter((h, i, tous) => i === 0 || h - tous[i - 1] > 0.3);
    if (niveaux.length < r.demande.releves) {
      faute("releves", niveaux.length < 2, `Ton carnet compte ${niveaux.length > 1 ? `${niveaux.length} niveaux d'eau différents` : niveaux.length === 1 ? "un seul niveau d'eau" : "aucune mesure valable"} : il en fallait ${r.demande.releves}.`);
    } else if (niveaux[niveaux.length - 1] - niveaux[0] < 6) {
      faute("etendue", false, `Tes niveaux vont de ${cm(niveaux[0])} à ${cm(niveaux[niveaux.length - 1])} : ils sont trop proches pour bien voir comment la durée varie. Va de la cuve vide jusqu'à 8 cm d'eau au moins.`);
    }
    if (niveaux.length >= 1 && niveaux[0] > VIDE) faute("vide", false, `Tu n'as pas fait de mesure pour la cuve vide : ton niveau le plus bas est ${cm(niveaux[0])}. Ouvre la vidange jusqu'à ce qu'il ne reste plus d'eau.`);
  }
  if (etat.lignes.length > 0) {
    if (etat.deborde > 0.2) faute("deborde", false, `Tu as fait déborder la cuve : ${cm(etat.deborde)} d'eau sont passés par-dessus bord. Relâche « Verser » avant le haut de la graduation.`);
    if (etat.courts > 0) faute("court", false, `La carte s'est coupée ${etat.courts > 1 ? `${etat.courts} fois` : "une fois"} : une de ses broches était en court-circuit. La broche 5 V et la broche D2 ne se relient jamais directement à GND.`);
  }

  // ce que l'exploitation reprend : la mesure cuve vide, et la mesure au niveau le plus haut
  const parNiveau = [...bonnes].sort((x, y) => x.ligne.niveau - y.ligne.niveau);
  const vide = parNiveau.find((n) => n.ligne.niveau <= VIDE);
  const haute = parNiveau[parNiveau.length - 1];
  const suivi = vide !== undefined && haute !== undefined && haute.h > 1 && haute.t > vide.t;
  const mesures = suivi
    ? { tau0: vide.t, h: haute.h, tau: haute.t, R }
    : { tau0: dureeAttendue(r, 0), h: 8, tau: dureeAttendue(r, 8), R: r.demande.R };
  const lignes = suivi
    ? [`Tes mesures : ${micros(mesures.tau0)} pour la cuve vide, ${micros(mesures.tau)} pour ${cm(mesures.h)} d'eau, avec le conducteur ohmique de ${ohms(R)}.`, `Valeurs attendues pour une manipulation sans défaut : ${micros(dureeAttendue(r, 0))} pour la cuve vide, ${micros(dureeAttendue(r, mesures.h))} pour ${cm(mesures.h)} d'eau, avec R = ${ohms(r.demande.R)}.`]
    : [`Ton carnet n'a pas à la fois une mesure pour la cuve vide et une mesure pour un niveau plus haut : on continue avec les valeurs du professeur, ${micros(mesures.tau0)} pour la cuve vide et ${micros(mesures.tau)} pour ${cm(mesures.h)} d'eau, avec R = ${ohms(r.demande.R)}.`];
  // sans aucune mesure, la manipulation n'est pas faite
  return { score: etat.lignes.length === 0 ? 0 : scoreDesFautes(fautes), fautes, mesures, lignes };
}

const depart = (r: ReglagesMicrocontroleur): EtatMicrocontroleur => ({
  plaque: Array.from({ length: EMPLACEMENTS }, () => null), fils: [], niveau: centieme(r.niveau), deborde: 0, securite: false, courts: 0, lancees: 0, lignes: [], carnet: [],
});

export const regles: ReglesPaillasse<ReglagesMicrocontroleur, EtatMicrocontroleur> = { depart, geste, bilan };
