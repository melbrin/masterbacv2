// La paillasse Archimède (décision 0012) : un dynamomètre à ressort sur une potence, des solides à y accrocher, des
// éprouvettes graduées de liquide. L'élève accroche un solide et lit son poids, puis descend la potence : le solide entre
// dans le liquide, le niveau monte et le dynamomètre remonte. Il lit le poids apparent et le volume, essuie le solide,
// et recommence dans un autre liquide.
// Chaque geste a ses conséquences : un solide posé sur le fond ne tire plus sur le ressort, un solide à moitié immergé
// ne reçoit qu'une part de la poussée, un solide mouillé pèse quelques gouttes de trop.
// Fonctions pures : le navigateur s'en sert pour faire vivre la paillasse, le serveur pour rejouer la manipulation.
// Les longueurs sont en centimètres, les volumes en millilitres (1 mL = 1 cm³), les forces en newtons, les masses
// volumiques en g/cm³.
import { nombre } from "@/lib/commun/format";
import { nombreDe, scoreDesFautes, texteDe, type BilanPaillasse, type Faute, type GesteBrut, type ReglesPaillasse } from "../types";

export interface Solide {
  /** quelques lettres minuscules */
  id: string;
  /** dans une phrase : « cylindre A » */
  nom: string;
  /** sa hauteur ; tous les solides de la paillasse ont la même section */
  hauteur: number;
  /** la masse volumique de sa matière */
  rho: number;
}

export interface Liquide {
  id: string;
  /** dans une phrase, avec son article : « l'eau », « le liquide X » */
  nom: string;
  /** ce qui est écrit sur son éprouvette : « eau » */
  etiquette: string;
  rho: number;
  /** le volume de liquide dans son éprouvette */
  volume: number;
}

export interface ReglagesArchimede {
  solides: Solide[];
  liquides: Liquide[];
  /** le solide que le sujet demande d'étudier */
  demande: string;
  /** le liquide dont la masse volumique est connue, puis celui qu'on cherche à identifier */
  reference: string;
  inconnu: string;
}

/** Un relevé : ce que l'élève a noté, et dans quelles conditions il l'a lu. */
export interface Releve {
  /** la valeur notée */
  v: number;
  /** ce que l'appareil indiquait à ce moment-là */
  vrai: number;
  /** le solide accroché ; vide s'il n'y en avait pas dans le liquide */
  solide: string;
  /** la part du solide sous la surface, de 0 à 1 */
  immerge: number;
  /** vrai si le solide reposait sur le fond de l'éprouvette, ou sur le socle */
  fond: boolean;
  /** dans l'air : ce que pesaient les gouttes restées sur le solide ; 0 s'il était sec */
  gouttes: number;
  /** dans un liquide : vrai si le solide y est entré encore mouillé par un autre liquide */
  mele: boolean;
}

export interface EtatArchimede {
  /** de combien la potence est descendue depuis sa position haute */
  descente: number;
  /** le solide accroché au dynamomètre ; null si le crochet est libre */
  accroche: string | null;
  /** l'éprouvette posée sous le dynamomètre, par son liquide ; null s'il n'y en a pas */
  dessous: string | null;
  /** les solides mouillés : le liquide qui les mouille, la part du solide qui a trempé, et s'il s'y est mêlé un autre liquide resté sur le solide */
  humide: Record<string, { liquide: string; part: number; melange: boolean }>;
  /** les relevés : « air », puis pour chaque liquide « avant » (volume sans le solide), « apres » (avec) et « poids » */
  notes: Record<string, Releve>;
}

/** L'intensité de la pesanteur, en N/kg. */
export const G = 9.81;
/** Une éprouvette de 100 mL : sa section intérieure, et la hauteur de son bord au-dessus de son fond. */
export const CAPACITE = 100;
export const SECTION_EPROUVETTE = 6;
export const BORD = CAPACITE / SECTION_EPROUVETTE + 1;
/** La section des solides : des cylindres qui entrent dans l'éprouvette. */
export const SECTION_SOLIDE = 3.5;
/** Le dynamomètre : son calibre, et la raideur de son ressort (1 N l'allonge de 4 cm). */
export const CALIBRE = 1;
export const RAIDEUR = 0.25;
/** La course de la potence. Quand elle est en haut, ressort au repos, le crochet est à cette hauteur au-dessus du fond de l'éprouvette. */
export const COURSE = 23;
export const HAUT_CROCHET = 30;
/** Le socle de la potence, un peu plus bas que le fond intérieur d'une éprouvette posée dessus. */
export const SOCLE = -0.8;
/** Ce que pèsent les gouttes restées sur un solide mouillé sur toute sa hauteur. */
export const FILM = 0.015;
/** La hauteur du ménisque : lire son bord au lieu de son creux ajoute cette valeur au volume. */
export const MENISQUE = 0.5;

const centieme = (x: number) => Math.round(x * 100) / 100;
const millieme = (x: number) => Math.round(x * 1000) / 1000;
const borne = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));
/** « 0,41 N », ou « 0,405 N » quand le troisième chiffre compte. */
const newtons = (x: number) => `${nombre(x, Math.round(x * 1000) % 10 === 0 ? 2 : 3)} N`;
const ml = (x: number) => `${nombre(x, 1)} mL`;

const DEPART: EtatArchimede = { descente: 0, accroche: null, dessous: null, humide: {}, notes: {} };

export const solideDe = (r: ReglagesArchimede, id: string | null): Solide | null => r.solides.find((s) => s.id === id) ?? null;
export const liquideDe = (r: ReglagesArchimede, id: string | null): Liquide | null => r.liquides.find((l) => l.id === id) ?? null;
/** Le volume d'un solide, en cm³. */
export const volumeSolide = (s: Solide): number => SECTION_SOLIDE * s.hauteur;
/** Le poids d'un solide, en N. */
export const poids = (s: Solide): number => (s.rho * volumeSolide(s) * G) / 1000;
/** La poussée d'Archimède sur un volume immergé : ρ × g × V, avec ρ en g/cm³ et V en cm³. */
export const poussee = (rho: number, volume: number): number => (rho * volume * G) / 1000;
/** Ce qu'indique le dynamomètre quand le solide est entièrement dans le liquide, sans toucher le fond. */
export const poidsApparent = (s: Solide, l: Liquide): number => poids(s) - poussee(l.rho, volumeSolide(s));

/** Ce qui se passe sous le dynamomètre, pour une hauteur de potence donnée. */
export interface Situation {
  /** la part du solide sous la surface, de 0 à 1 */
  immerge: number;
  /** vrai si le solide repose sur le fond de l'éprouvette, ou sur le socle : le ressort ne porte plus tout */
  fond: boolean;
  /** ce qu'indique le dynamomètre */
  force: number;
  /** la hauteur du bas du solide (ou du crochet nu) au-dessus du fond de l'éprouvette */
  bas: number;
  /** le niveau lu sur l'éprouvette posée dessous : le liquide et la partie immergée du solide ; null sans éprouvette */
  volume: number | null;
}

/**
 * L'équilibre du solide. Le ressort s'allonge de force / RAIDEUR ; la poussée grandit avec la profondeur immergée, qui
 * fait elle-même monter le niveau. Le tout se résout d'un coup : la profondeur varie en ligne droite avec la descente.
 */
export function situation(r: ReglagesArchimede, etat: EtatArchimede): Situation {
  const s = solideDe(r, etat.accroche);
  const l = liquideDe(r, etat.dessous);
  const crochet = HAUT_CROCHET - etat.descente;
  if (!s) return { immerge: 0, fond: false, force: 0, bas: crochet, volume: l ? l.volume : null };
  const P = poids(s);
  /** la hauteur du solide qui a déjà trempé : hors du liquide, elle porte des gouttes */
  const trempe = (etat.humide[s.id]?.part ?? 0) * s.hauteur;
  const parGoutte = FILM / s.hauteur;
  /** le bas du solide si le ressort était au repos */
  const repos = crochet - s.hauteur;
  let profondeur = 0;
  if (l) {
    const niveau = l.volume / SECTION_EPROUVETTE;
    const parCm = poussee(l.rho, SECTION_SOLIDE);
    const monte = 1 - SECTION_SOLIDE / SECTION_EPROUVETTE;
    // tant que le liquide ne dépasse pas la partie déjà mouillée, chaque centimètre immergé reprend aussi ses gouttes
    profondeur = (niveau - (repos - (P + parGoutte * trempe) / RAIDEUR)) / (monte + (parCm + parGoutte) / RAIDEUR);
    if (profondeur > trempe) profondeur = (niveau - (repos - P / RAIDEUR)) / (monte + parCm / RAIDEUR);
    profondeur = borne(profondeur, 0, s.hauteur);
  }
  let force = P + parGoutte * Math.max(0, trempe - profondeur) - profondeur * (l ? poussee(l.rho, SECTION_SOLIDE) : 0);
  let bas = repos - force / RAIDEUR;
  const sol = l ? 0 : SOCLE;
  const fond = bas < sol - 1e-9;
  if (fond) {
    // le solide repose : le ressort ne garde que l'allongement que la potence lui laisse
    bas = sol;
    force = Math.max(0, RAIDEUR * (repos - sol));
    if (l) profondeur = Math.min(s.hauteur, l.volume / (SECTION_EPROUVETTE - SECTION_SOLIDE));
  }
  return { immerge: profondeur / s.hauteur, fond, force: millieme(force), bas, volume: l ? centieme(l.volume + SECTION_SOLIDE * profondeur) : null };
}

/** Ce que pèsent les gouttes restées sur un solide, hors du liquide. */
export const gouttes = (etat: EtatArchimede, solide: string): number => FILM * (etat.humide[solide]?.part ?? 0);

/** Vrai si le solide est entièrement sous la surface. */
export const toutImmerge = (sit: Situation): boolean => sit.immerge >= 0.999;

/**
 * Vrai si rien ne pend plus bas que le bord d'une éprouvette. Il le faut pour glisser une éprouvette sous le dynamomètre
 * ou l'en retirer, et pour accrocher ou décrocher un solide au-dessus d'une éprouvette.
 */
export function degage(r: ReglagesArchimede, etat: EtatArchimede): boolean {
  const s = solideDe(r, etat.accroche);
  const crochet = HAUT_CROCHET - etat.descente;
  return (s ? crochet - s.hauteur - (poids(s) + gouttes(etat, s.id)) / RAIDEUR : crochet) >= BORD;
}

/** Applique un geste. Un geste inconnu, mal formé ou impossible ne change rien. */
function geste(r: ReglagesArchimede, etat: EtatArchimede, g: GesteBrut): EtatArchimede {
  const v = nombreDe(g, "v");
  switch (g.g) {
    // accrocher un solide au dynamomètre : le crochet doit être libre, et accessible au-dessus de l'éprouvette
    case "accrocher": {
      const s = solideDe(r, texteDe(g, "s"));
      if (!s || etat.accroche !== null) return etat;
      const suite = { ...etat, accroche: s.id };
      return etat.dessous === null || degage(r, suite) ? suite : etat;
    }
    case "decrocher":
      return etat.accroche !== null && (etat.dessous === null || degage(r, etat)) ? { ...etat, accroche: null } : etat;
    // glisser une éprouvette sous le dynamomètre, ou la remettre à sa place
    case "poser": {
      const l = liquideDe(r, texteDe(g, "l"));
      return l && etat.dessous === null && degage(r, etat) ? { ...etat, dessous: l.id } : etat;
    }
    case "ranger":
      return etat.dessous !== null && degage(r, etat) ? { ...etat, dessous: null } : etat;
    // monter ou descendre la potence : `v` est le déplacement, positif vers le bas
    case "potence": {
      if (v === null || v === 0 || Math.abs(v) > COURSE) return etat;
      const descente = centieme(borne(etat.descente + v, 0, COURSE));
      if (descente === etat.descente) return etat;
      const suite = { ...etat, descente };
      // un solide qui entre dans un liquide en ressort mouillé ; s'il portait déjà un autre liquide, il l'y mêle
      const immerge = etat.accroche === null || etat.dessous === null ? 0 : situation(r, suite).immerge;
      if (etat.accroche === null || etat.dessous === null || immerge <= 0) return suite;
      const avant = etat.humide[etat.accroche];
      const melange = avant !== undefined && (avant.melange || avant.liquide !== etat.dessous);
      return { ...suite, humide: { ...etat.humide, [etat.accroche]: { liquide: etat.dessous, part: Math.max(avant?.part ?? 0, immerge), melange } } };
    }
    // essuyer un solide : sur la paillasse, ou accroché hors du liquide
    case "essuyer": {
      const s = solideDe(r, texteDe(g, "s"));
      if (!s || !etat.humide[s.id] || (s.id === etat.accroche && situation(r, etat).immerge > 0)) return etat;
      return { ...etat, humide: Object.fromEntries(Object.entries(etat.humide).filter(([id]) => id !== s.id)) };
    }
    // noter une lecture : le poids sur le dynamomètre, ou le volume sur l'éprouvette posée dessous
    case "noter": {
      const quoi = texteDe(g, "quoi");
      const sit = situation(r, etat);
      const dans = sit.immerge > 0;
      if (quoi === "poids") {
        if (v === null || v < 0 || v > 5 || etat.accroche === null) return etat;
        const releve: Releve = { v: millieme(v), vrai: sit.force, solide: etat.accroche, immerge: sit.immerge, fond: sit.fond, gouttes: dans ? 0 : millieme(gouttes(etat, etat.accroche)), mele: dans && etat.humide[etat.accroche]?.melange === true };
        return { ...etat, notes: { ...etat.notes, [dans ? `${etat.dessous}:poids` : "air"]: releve } };
      }
      if (quoi === "volume") {
        if (v === null || v < 0 || v > 200 || etat.dessous === null || sit.volume === null) return etat;
        const releve: Releve = { v: centieme(v), vrai: sit.volume, solide: dans ? etat.accroche ?? "" : "", immerge: sit.immerge, fond: sit.fond, gouttes: 0, mele: false };
        return { ...etat, notes: { ...etat.notes, [`${etat.dessous}:${dans ? "apres" : "avant"}`]: releve } };
      }
      return etat;
    }
    default: return etat;
  }
}

/** Les valeurs d'une manipulation sans défaut, pour un solide : ce que le professeur fournit quand une mesure manque. */
export function mesuresExactes(r: ReglagesArchimede, s: Solide): Record<"P" | "V0" | "V1" | "Pe" | "Px", number> {
  const ref = liquideDe(r, r.reference), x = liquideDe(r, r.inconnu);
  return {
    P: millieme(poids(s)), V0: centieme(ref?.volume ?? 0), V1: centieme((ref?.volume ?? 0) + volumeSolide(s)),
    Pe: millieme(ref ? poidsApparent(s, ref) : 0), Px: millieme(x ? poidsApparent(s, x) : 0),
  };
}

/** Le bilan de la manipulation : les cinq mesures de l'élève, et les fautes relevées par le professeur. */
function bilan(r: ReglagesArchimede, etat: EtatArchimede): BilanPaillasse {
  const ref = liquideDe(r, r.reference), x = liquideDe(r, r.inconnu), demande = solideDe(r, r.demande);
  if (!ref || !x || !demande) return { score: 0, fautes: [], mesures: {}, lignes: [] };
  const fautes: Faute[] = [];
  const faute = (code: string, grave: boolean, texte: string) => fautes.push({ code, grave, texte });
  const n = etat.notes;
  const air = n.air, avant = n[`${ref.id}:avant`], apres = n[`${ref.id}:apres`], pe = n[`${ref.id}:poids`], px = n[`${x.id}:poids`];
  const rien = !air && !avant && !apres && !pe && !px;
  const avecSolide = [air, apres, pe, px].filter((p): p is Releve => p !== undefined && p.solide !== "");
  const utilises = [...new Set(avecSolide.map((p) => p.solide))];
  const s = (utilises.length === 1 ? solideDe(r, utilises[0]) : null) ?? demande;
  const exact = mesuresExactes(r, s);
  const dans = (cle: Releve) => (cle === px ? x.nom : ref.nom);

  if (rien) {
    faute("mesures", true, "Tu n'as noté aucune mesure : la manipulation n'est pas faite.");
  } else {
    // ce qui manque
    if (!air) faute("poids", true, "Tu n'as pas noté le poids du solide dans l'air : sans lui, la poussée ne se calcule pas.");
    if (!avant && !apres) faute("volume", true, `Tu n'as noté aucun volume sur l'éprouvette : le volume du solide est la différence entre le niveau avec le solide et le niveau sans lui, dans ${ref.nom}.`);
    else if (!avant) faute("volume", true, `Tu n'as pas noté le volume de départ, avant d'immerger le solide dans ${ref.nom}.`);
    else if (!apres) faute("volume", true, `Tu n'as pas noté le volume lu quand le solide est immergé dans ${ref.nom}.`);
    if (!pe) faute("apparent", true, `Tu n'as pas noté le poids apparent du solide dans ${ref.nom}.`);
    if (!px) faute("inconnu", true, `Tu n'as pas noté le poids apparent du solide dans ${x.nom}.`);
    // le solide
    if (utilises.length > 1) {
      faute("melange", true, `Tes mesures ne portent pas toutes sur le même solide (${utilises.map((id) => solideDe(r, id)?.nom ?? id).join(", ")}) : la poussée se calcule pour un seul solide, pesé dans l'air puis dans le liquide.`);
    } else if (utilises.length === 1 && s.id !== demande.id) {
      faute("solide", false, `Le sujet demandait le ${demande.nom} ; tu as travaillé avec le ${s.nom}.`);
    }
    // l'immersion
    const immerges = [apres, pe, px].filter((p): p is Releve => p !== undefined);
    const moins = immerges.reduce<Releve | null>((pire, p) => (pire === null || p.immerge < pire.immerge ? p : pire), null);
    if (moins && moins.immerge < 0.999) {
      faute("immersion", moins.immerge < 0.9, `Le solide n'était immergé qu'à ${nombre(100 * moins.immerge, 0)} % dans ${dans(moins)} quand tu as ${moins === apres ? "lu le volume" : "lu le dynamomètre"} : la poussée ne porte que sur la partie immergée. Descends la potence jusqu'à ce que le solide soit entièrement sous la surface.`);
    }
    const pose = [pe, px].find((p) => p?.fond);
    if (pose) {
      const attendu = poidsApparent(solideDe(r, pose.solide) ?? s, pose === px ? x : ref);
      faute("fond", true, `Le solide touchait le fond de l'éprouvette quand tu as lu le dynamomètre dans ${dans(pose)} : le fond portait une partie de son poids. Le dynamomètre indiquait ${newtons(pose.vrai)} ; sans toucher le fond, il indique ${newtons(millieme(attendu))}. Remonte un peu la potence.`);
    } else if (air?.fond) {
      faute("fond", true, "Le solide reposait sur le socle quand tu l'as pesé dans l'air : le socle portait une partie de son poids. Remonte la potence pour qu'il pende librement.");
    }
    // le solide mouillé
    if (air && air.gouttes >= 0.002) faute("mouille", false, `Le solide était encore mouillé quand tu l'as pesé dans l'air : ses gouttes ajoutent ${newtons(air.gouttes)} à son poids. Essuie-le, ou pèse-le avant de le plonger.`);
    const mele = [pe, px].find((p) => p?.mele);
    if (mele) faute("essuyage", false, `Tu as plongé dans ${dans(mele)} un solide encore mouillé par ${mele === px ? ref.nom : x.nom} : essuie-le avant de changer de liquide, pour ne pas mêler les deux.`);
    // les lectures
    const forces = [air, pe, px].filter((p): p is Releve => p !== undefined);
    const pire = forces.reduce<Releve | null>((a, p) => (a === null || Math.abs(p.v - p.vrai) > Math.abs(a.v - a.vrai) ? p : a), null);
    if (pire && Math.abs(pire.v - pire.vrai) > 0.012) {
      faute("dynamometre", Math.abs(pire.v - pire.vrai) > 0.05, `Tu as noté ${newtons(pire.v)} ${pire === air ? "dans l'air" : `dans ${dans(pire)}`} ; le dynamomètre indiquait ${newtons(pire.vrai)}. Lis la graduation en face de l'index, l'œil à sa hauteur.`);
    }
    const volumes = [avant, apres].filter((p): p is Releve => p !== undefined);
    // un niveau lu une demi-graduation trop haut : c'est le bord du ménisque qui a été lu
    const auBord = (p: Releve) => p.v - p.vrai > 0.3 && p.v - p.vrai <= MENISQUE + 0.25;
    const haut = volumes.find(auBord);
    const loin = volumes.reduce<Releve | null>((a, p) => (!auBord(p) && Math.abs(p.v - p.vrai) > 0.3 && (a === null || Math.abs(p.v - p.vrai) > Math.abs(a.v - a.vrai)) ? p : a), null);
    if (haut) faute("menisque", false, `Tu as noté ${ml(haut.v)} ; le bas du ménisque était à ${ml(haut.vrai)}. Le volume se lit en face du creux du ménisque, pas de ses bords.`);
    if (loin) faute("eprouvette", Math.abs(loin.v - loin.vrai) > 1.5, `Tu as noté ${ml(loin.v)} ; le niveau était à ${ml(loin.vrai)}. Lis la graduation en face du bas du ménisque.`);
  }

  // les mesures de l'élève ; celles qui manquent sont celles du professeur
  let mesures = { P: air?.v ?? exact.P, V0: avant?.v ?? exact.V0, V1: apres?.v ?? exact.V1, Pe: pe?.v ?? exact.Pe, Px: px?.v ?? exact.Px };
  const lignes: string[] = [];
  const impossible = mesures.V1 - mesures.V0 < 1 ? `le volume avec le solide, ${ml(mesures.V1)}, ne dépasse pas le volume de départ, ${ml(mesures.V0)}`
    : mesures.P - mesures.Pe <= 0 || mesures.P - mesures.Px <= 0 ? `le poids dans l'air, ${newtons(mesures.P)}, ne dépasse pas le poids apparent` : null;
  if (!rien && impossible) {
    faute("releves", true, `Tes relevés ne permettent pas le calcul : ${impossible}. On continue avec les valeurs du professeur.`);
    mesures = exact;
  }
  if (rien || impossible) {
    lignes.push(`Sans mesure utilisable, on continue avec les valeurs du professeur pour le ${s.nom} : P = ${newtons(exact.P)}, V_0 = ${ml(exact.V0)}, V_1 = ${ml(exact.V1)}, P_eau = ${newtons(exact.Pe)}, P_X = ${newtons(exact.Px)}.`);
  } else {
    lignes.push(air ? `Poids dans l'air : P = ${newtons(mesures.P)}.` : `Sans poids noté dans l'air, on continue avec la valeur du professeur : P = ${newtons(mesures.P)}.`);
    lignes.push(avant && apres ? `Volumes dans ${ref.nom} : V_0 = ${ml(mesures.V0)} sans le solide, V_1 = ${ml(mesures.V1)} avec le solide.` : `Volumes dans ${ref.nom}, complétés par le professeur : V_0 = ${ml(mesures.V0)} sans le solide, V_1 = ${ml(mesures.V1)} avec le solide.`);
    lignes.push(pe ? `Poids apparent dans ${ref.nom} : P_eau = ${newtons(mesures.Pe)}.` : `Sans poids apparent noté dans ${ref.nom}, on continue avec la valeur du professeur : P_eau = ${newtons(mesures.Pe)}.`);
    lignes.push(px ? `Poids apparent dans ${x.nom} : P_X = ${newtons(mesures.Px)}.` : `Sans poids apparent noté dans ${x.nom}, on continue avec la valeur du professeur : P_X = ${newtons(mesures.Px)}.`);
    lignes.push(`Pour une manipulation sans défaut avec le ${s.nom} : P = ${newtons(exact.P)}, V_1 − V_0 = ${ml(exact.V1 - exact.V0)}, P_eau = ${newtons(exact.Pe)}, P_X = ${newtons(exact.Px)}.`);
  }
  // sans aucune mesure, la manipulation n'est pas faite
  return { score: rien ? 0 : scoreDesFautes(fautes), fautes, mesures, lignes };
}

export const regles: ReglesPaillasse<ReglagesArchimede, EtatArchimede> = { depart: () => DEPART, geste, bilan };
