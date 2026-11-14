// La paillasse Titrage (décision 0012) : une burette de soude, une prise d'essai d'acide, un indicateur coloré ou un pH-mètre.
// Un état, des gestes, ce que le matériel répond. Tout est en fonctions pures : le navigateur s'en sert pour dessiner
// la paillasse, le serveur pour rejouer la manipulation de l'élève et la juger.
// Les volumes sont en millilitres, les concentrations en mol/L.
import type { Faute } from "./types";

export interface ReglagesTitrage {
  /** la concentration de l'acide dans la prise d'essai : c'est ce que le titrage cherche */
  Ca: number;
  /** le pK_A de l'acide ; vide pour un acide fort */
  pKa: number | null;
  /** le volume de la prise d'essai */
  Va: number;
  /** la concentration de la soude dans la burette */
  Cb: number;
  /** ce qui repère l'équivalence */
  suivi: "indicateur" | "phmetre";
  indicateur: "bbt" | "phenolphtaleine";
  /** l'eau ajoutée dans le récipient, par exemple pour immerger la sonde du pH-mètre */
  eau: number;
}

export interface EtatTitrage {
  rincee: boolean;
  remplie: boolean;
  zero: boolean;
  prise: boolean;
  indicateur: boolean;
  sonde: boolean;
  agitation: boolean;
  /** le volume de soude versé depuis le remplissage */
  verse: number;
  /** les relevés du pH-mètre : un point à chaque ajout, quand la sonde est dans la solution */
  releves: { V: number; pH: number }[];
  /** le volume que l'élève retient pour l'équivalence ; vide tant qu'il ne l'a pas noté */
  note: number | null;
  /** le nombre de fois où le titrage a été recommencé */
  essais: number;
}

/** Les volumes qu'un geste peut verser : un filet, puis de moins en moins, jusqu'à la goutte. */
export const AJOUTS = [5, 1, 0.2, 0.05] as const;
export type GesteTitrage =
  | { g: "rincer" } | { g: "remplir" } | { g: "zero" } | { g: "prise" } | { g: "indicateur" } | { g: "sonde" } | { g: "agiter" }
  | { g: "verser"; v: number }
  /** note le volume à l'équivalence : le volume lu sur la burette, ou la valeur lue sur la courbe du pH-mètre */
  | { g: "noter"; v?: number }
  | { g: "recommencer" };

/** La burette contient 25 mL. */
export const CAPACITE = 25;
/** Sans réglage du zéro, la burette est remplie au-dessus du trait : toutes les lectures sont décalées d'autant. */
export const DECALAGE = 0.6;
const KE = 1e-14;
const arrondi = (x: number, pas: number) => Math.round(x / pas) * pas;

export const TITRAGE_INITIAL: EtatTitrage = { rincee: false, remplie: false, zero: false, prise: false, indicateur: false, sonde: false, agitation: false, verse: 0, releves: [], note: null, essais: 0 };

/** Le volume de soude à l'équivalence : n(acide) = n(soude versée). */
export const volumeEquivalence = (r: ReglagesTitrage): number => (r.Ca * r.Va) / r.Cb;

/**
 * Le pH du mélange après V mL de soude. L'électroneutralité, [H₃O⁺] + [Na⁺] = [A⁻] + [HO⁻], est résolue par dichotomie :
 * la même relation décrit le début, le saut et la fin du titrage, pour un acide fort comme pour un acide faible.
 */
export function pHMelange(r: ReglagesTitrage, V: number): number {
  const total = r.Va + r.eau + V;
  const acide = (r.Ca * r.Va) / total;
  const sodium = (r.Cb * V) / total;
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

/** Ce que l'élève lit sur la burette : le volume versé, au demi-dixième, décalé si le zéro n'a pas été réglé. */
export const volumeLu = (etat: EtatTitrage): number => arrondi(etat.verse + (etat.zero ? 0 : DECALAGE), 0.05);
/** Le pH du contenu du récipient ; l'eau seule tant que la prise d'essai n'y est pas. */
export const pHActuel = (r: ReglagesTitrage, etat: EtatTitrage): number => (etat.prise ? pHMelange(r, etat.verse) : 7);

/** Applique un geste. Un geste impossible (verser sans avoir rempli la burette) ne change rien. */
export function geste(r: ReglagesTitrage, etat: EtatTitrage, g: GesteTitrage): EtatTitrage {
  switch (g.g) {
    case "rincer": return etat.remplie ? etat : { ...etat, rincee: true };
    case "remplir": return etat.remplie ? etat : { ...etat, remplie: true, zero: false, verse: 0 };
    case "zero": return etat.remplie && etat.verse === 0 ? { ...etat, zero: true } : etat;
    case "prise": return etat.prise ? etat : avecReleve(r, { ...etat, prise: true });
    case "indicateur": return { ...etat, indicateur: true };
    case "sonde": return etat.sonde ? etat : avecReleve(r, { ...etat, sonde: true });
    case "agiter": return { ...etat, agitation: true };
    case "verser": {
      if (!etat.remplie || !etat.prise || !AJOUTS.includes(g.v as (typeof AJOUTS)[number]) || etat.verse >= CAPACITE) return etat;
      return avecReleve(r, { ...etat, verse: Math.min(CAPACITE, arrondi(etat.verse + g.v, 0.05)), note: null });
    }
    case "noter": {
      const v = r.suivi === "indicateur" ? volumeLu(etat) : g.v;
      return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= CAPACITE + DECALAGE ? { ...etat, note: v } : etat;
    }
    case "recommencer": return { ...TITRAGE_INITIAL, rincee: etat.rincee, essais: etat.essais + 1 };
  }
}

/** Ajoute le relevé du pH-mètre pour le volume versé, si la sonde est dans la solution. */
function avecReleve(r: ReglagesTitrage, etat: EtatTitrage): EtatTitrage {
  if (!etat.sonde || !etat.prise || etat.releves.some((p) => p.V === etat.verse)) return etat;
  return { ...etat, releves: [...etat.releves, { V: etat.verse, pH: pHMelange(r, etat.verse) }] };
}

/** Rejoue une suite de gestes depuis le début : c'est ainsi que le serveur retrouve la manipulation de l'élève. */
export const rejoueTitrage = (r: ReglagesTitrage, gestes: readonly GesteTitrage[]): EtatTitrage => gestes.reduce((etat, g) => geste(r, etat, g), TITRAGE_INITIAL);

const ml = (x: number) => `${x.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mL`;

/**
 * Le bilan de la manipulation : le volume retenu pour l'équivalence, la valeur exacte, et les fautes.
 * Une faute légère retire un quart du score, une faute grave la moitié.
 */
export function bilanTitrage(r: ReglagesTitrage, etat: EtatTitrage): { VE: number | null; vrai: number; fautes: Faute[]; score: number } {
  const vrai = volumeEquivalence(r);
  const fautes: Faute[] = [];
  const faute = (code: string, grave: boolean, texte: string) => fautes.push({ code, grave, texte });
  if (!etat.rincee) faute("rincage", false, "Tu n'as pas rincé la burette avec la soude avant de la remplir : l'eau qui reste dilue la soude.");
  if (!etat.zero) faute("zero", true, `Tu n'as pas ajusté le zéro de la burette : tes lectures sont décalées de ${ml(DECALAGE)}.`);
  if (!etat.agitation) faute("agitation", false, "Tu n'as pas lancé l'agitation : le mélange n'est pas homogène, le changement se repère mal.");
  if (r.suivi === "indicateur" && !etat.indicateur) faute("indicateur", true, "Tu n'as pas ajouté l'indicateur coloré : rien ne signale l'équivalence.");
  if (r.suivi === "phmetre" && !etat.sonde) faute("sonde", true, "La sonde du pH-mètre n'était pas dans la solution : il n'y a pas de courbe.");
  if (etat.note === null) {
    faute("note", true, "Tu n'as pas noté le volume à l'équivalence.");
  } else if (r.suivi === "indicateur") {
    const depasse = etat.verse - vrai;
    if (depasse < -0.1) faute("avant", true, `Tu t'es arrêté ${ml(-depasse)} avant l'équivalence : la couleur n'avait pas encore changé pour de bon.`);
    else if (depasse > 0.3) faute("apres", true, `Tu as dépassé l'équivalence de ${ml(depasse)} : près du changement de couleur, il faut verser goutte à goutte.`);
    else if (depasse > 0.12) faute("apres", false, `Tu as dépassé l'équivalence de ${ml(depasse)} : finis goutte à goutte.`);
  } else {
    const autour = etat.releves.map((p) => p.V).filter((V) => Math.abs(V - vrai) <= 1).sort((a, b) => a - b);
    const serre = autour.length >= 4 && autour.every((V, i) => i === 0 || V - autour[i - 1] <= 0.3);
    if (Math.max(0, ...etat.releves.map((p) => p.V)) < vrai + 0.5) faute("avant", true, "Tu t'es arrêté avant la fin du saut de pH : la courbe ne montre pas l'équivalence.");
    else if (!serre) faute("espace", false, "Près du saut de pH, tes ajouts étaient trop espacés pour lire le volume avec précision.");
    const ecart = Math.abs(etat.note - vrai);
    if (ecart > 0.5) faute("lecture", true, `Ta lecture de l'équivalence est à ${ml(ecart)} de la valeur exacte.`);
    else if (ecart > 0.2) faute("lecture", false, `Ta lecture de l'équivalence est à ${ml(ecart)} de la valeur exacte.`);
  }
  const score = Math.max(0, 1 - fautes.reduce((s, f) => s + (f.grave ? 0.5 : 0.25), 0));
  return { VE: etat.note, vrai, fautes, score };
}
