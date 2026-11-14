// La paillasse « diffraction » (décision 0012) : un laser, un porte-diapositive, un écran sur un rail gradué. L'élève fixe
// le laser sur son support avant de l'allumer, glisse une diapositive dans le support (une fente, un fil, deux fentes
// d'Young), place l'écran, puis mesure la figure avec deux curseurs et la graduation de l'écran : la largeur de la tache
// centrale, d'une extinction à l'autre, ou plusieurs interfranges d'un coup.
// Chaque geste a ses conséquences : un laser allumé hors de son support envoie son faisceau dans la salle ; un écran
// déplacé entre deux mesures fausse l'étalonnage ; un seul interfrange mesuré laisse l'erreur de lecture peser de tout
// son poids.
// Fonctions pures : le navigateur s'en sert pour faire vivre la paillasse, le serveur pour rejouer la manipulation.
// Les longueurs d'onde sont en nanomètres, les fentes en micromètres, leur écart et l'écran en millimètres, le rail en centimètres.
import { nombre } from "@/lib/commun/format";
import { nombreDe, scoreDesFautes, texteDe, type BilanPaillasse, type Faute, type GesteBrut, type ReglesPaillasse } from "../types";

export interface Diapositive {
  /** un nom court : « f40 » */
  id: string;
  /** une fente simple, un fil, ou deux fentes d'Young */
  genre: "fente" | "fil" | "young";
  /** la largeur de la fente ou le diamètre du fil, en micromètres ; pour des fentes d'Young, la largeur de chacune */
  a: number;
  /** l'écart entre les deux fentes d'Young, en millimètres ; 0 pour une fente ou un fil */
  b: number;
  /** son nom dans une phrase : « la fente de 40 µm », « le cheveu » */
  nom: string;
  /** ce qui est écrit sur la monture, en deux lignes au plus : « fente », « 40 µm » */
  etiquette: string[];
}

/** Ce que le TP demande à l'élève. `distance` : la distance de la diapositive à l'écran que donne le protocole, en centimètres. */
export type ButDiffraction =
  /** mesurer la tache centrale des fentes `fentes`, de largeurs connues, puis celle de la diapositive `inconnue` */
  | { genre: "etalonnage"; fentes: string[]; inconnue: string; distance: number }
  /** mesurer l'interfrange avec une diapositive à deux fentes */
  | { genre: "young"; distance: number };

export interface ReglagesDiffraction {
  /** la longueur d'onde du laser */
  lambda: number;
  /** les diapositives de la boîte */
  boite: Diapositive[];
  /** la longueur du rail gradué ; son zéro est sous la diapositive */
  rail: number;
  /** la position de l'écran au départ */
  ecran: number;
  but: ButDiffraction;
}

/** Une mesure notée : ce que l'élève a lu, et ce qu'il y avait sur l'écran à ce moment. */
export interface MesureDiffraction {
  /** la distance entre les deux curseurs, lue par l'élève sur la graduation de l'écran */
  v: number;
  /** le nombre d'interfranges qu'il compte entre les deux curseurs ; 1 pour une tache centrale */
  n: number;
  /** la diapositive dans le support, la position de l'écran et celle des deux curseurs */
  diapo: string | null;
  ecran: number;
  curseurs: [number, number];
  /** vrai si la figure était sur l'écran : laser fixé et allumé */
  figure: boolean;
}

export interface EtatDiffraction {
  /** vrai si le laser est fixé sur son support, face à l'écran */
  fixe: boolean;
  allume: boolean;
  /** le nombre de fois où le laser s'est trouvé allumé hors de son support */
  dangers: number;
  /** la diapositive dans le support ; null s'il est vide */
  diapo: string | null;
  /** la distance de la diapositive à l'écran, lue sur le rail */
  ecran: number;
  /** les deux curseurs de l'écran, repérés sur sa graduation */
  curseurs: [number, number];
  /** la distance notée par l'élève, et la position de l'écran à ce moment */
  distance: { v: number; ecran: number } | null;
  mesures: MesureDiffraction[];
}

/** La graduation de l'écran va de 0 à 120 mm ; le faisceau arrive en son milieu. */
export const LARGEUR = 120;
export const CENTRE = LARGEUR / 2;
/** L'écran ne s'approche pas à moins de 40 cm de la diapositive. */
export const ECRAN_MIN = 40;
const MESURES_MAX = 24;
/** L'écart relatif toléré sur un interfrange : en dessous de `PRECIS`, la mesure est bonne ; au-delà de `IMPRECIS`, elle est franchement fausse. */
export const PRECIS = 0.02;
const IMPRECIS = 0.05;

const mm = (x: number) => Math.round(x * 10) / 10;
const vingtieme = (x: number) => Math.round(x * 20) / 20;
const enMm = (x: number) => `${nombre(x, 1)} mm`;
const enCm = (x: number) => `${nombre(x, 1)} cm`;
/** Une diapositive de la boîte, par son nom. */
export const diapositive = (r: ReglagesDiffraction, id: string | null): Diapositive | null => (id === null ? null : r.boite.find((d) => d.id === id) ?? null);

// ---------- la figure sur l'écran ----------

/** La largeur de la tache centrale d'une fente ou d'un fil de largeur `a`, d'une extinction à l'autre : L = 2 λ D / a. */
export const tacheCentrale = (lambda: number, a: number, D: number): number => (2 * lambda * D) / (100 * a);
/** L'interfrange de deux fentes écartées de `b` : i = λ D / b. */
export const interfrange = (lambda: number, b: number, D: number): number => (lambda * D * 1e-5) / b;
/** Vrai si la figure est sur l'écran : le laser est fixé sur son support, allumé. */
export const figureVisible = (etat: EtatDiffraction): boolean => etat.fixe && etat.allume;

/**
 * L'intensité lumineuse sur l'écran, de 0 à 1, à `x` millimètres du centre de la figure. Une fente ou un fil de largeur a
 * donne (sin u / u)², avec u = π a x / (λ D). Deux fentes écartées de b y ajoutent les franges : cos²(π b x / (λ D)).
 */
export function intensite(lambda: number, d: Diapositive, D: number, x: number): number {
  const u = (Math.PI * d.a * x * 100) / (lambda * D);
  const enveloppe = Math.abs(u) < 1e-9 ? 1 : (Math.sin(u) / u) ** 2;
  return d.genre === "young" ? enveloppe * Math.cos((Math.PI * x) / interfrange(lambda, d.b, D)) ** 2 : enveloppe;
}

// ---------- les gestes ----------

const DEPART: Omit<EtatDiffraction, "ecran"> = { fixe: false, allume: false, dangers: 0, diapo: null, curseurs: [CENTRE - 15, CENTRE + 15], distance: null, mesures: [] };

/** Applique un geste. Un geste inconnu, mal formé ou impossible ne change rien. */
function geste(r: ReglagesDiffraction, etat: EtatDiffraction, g: GesteBrut): EtatDiffraction {
  const v = nombreDe(g, "v");
  switch (g.g) {
    // fixer le laser sur son support, ou le reprendre : allumé hors de son support, son faisceau part dans la salle
    case "fixer": return typeof g.on === "boolean" && g.on !== etat.fixe ? { ...etat, fixe: g.on, dangers: etat.dangers + (!g.on && etat.allume ? 1 : 0) } : etat;
    case "laser": return typeof g.on === "boolean" && g.on !== etat.allume ? { ...etat, allume: g.on, dangers: etat.dangers + (g.on && !etat.fixe ? 1 : 0) } : etat;
    // glisser une diapositive dans le support ; « aucune » le vide
    case "diapo": {
      const id = texteDe(g, "id");
      const suite = id === "aucune" ? null : diapositive(r, id)?.id;
      return suite === undefined || suite === etat.diapo ? etat : { ...etat, diapo: suite };
    }
    case "ecran": {
      const x = nombreDe(g, "x");
      const ou = x === null ? etat.ecran : mm(Math.max(ECRAN_MIN, Math.min(r.rail, x)));
      return ou === etat.ecran ? etat : { ...etat, ecran: ou };
    }
    case "curseur": {
      const x = nombreDe(g, "x");
      const k = g.k === 1 ? 0 : g.k === 2 ? 1 : null;
      if (x === null || k === null) return etat;
      const ou = vingtieme(Math.max(0, Math.min(LARGEUR, x)));
      return ou === etat.curseurs[k] ? etat : { ...etat, curseurs: k === 0 ? [ou, etat.curseurs[1]] : [etat.curseurs[0], ou] };
    }
    // la distance de la diapositive à l'écran, lue sur le rail
    case "distance": return v !== null && v > 0 && v <= 400 ? { ...etat, distance: { v: mm(v), ecran: etat.ecran } } : etat;
    // ce que l'élève lit entre ses deux curseurs, et le nombre d'interfranges qu'il y compte
    case "mesure": {
      const n = g.n === undefined ? 1 : nombreDe(g, "n");
      if (v === null || v <= 0 || v > 200 || n === null || !Number.isInteger(n) || n < 1 || n > 60) return etat;
      return { ...etat, mesures: [...etat.mesures, { v: mm(v), n, diapo: etat.diapo, ecran: etat.ecran, curseurs: etat.curseurs, figure: figureVisible(etat) }].slice(-MESURES_MAX) };
    }
    default: return etat;
  }
}

// ---------- le bilan ----------

type ButEtalonnage = Extract<ButDiffraction, { genre: "etalonnage" }>;
type ButYoung = Extract<ButDiffraction, { genre: "young" }>;
const ecartDes = (m: MesureDiffraction): number => Math.abs(m.curseurs[1] - m.curseurs[0]);
const Maj = (texte: string): string => texte.charAt(0).toUpperCase() + texte.slice(1);
/** La dernière mesure notée qui remplit une condition. */
const derniere = (etat: EtatDiffraction, garde: (m: MesureDiffraction) => boolean): MesureDiffraction | null => [...etat.mesures].reverse().find(garde) ?? null;

/** Les fautes communes aux deux manipulations : le laser allumé hors de son support, la distance mal lue ou non notée. */
function fautesCommunes(etat: EtatDiffraction, ecran: number | null, sansDistance: boolean, faute: (code: string, grave: boolean, texte: string) => void): void {
  if (etat.dangers > 0) faute("securite", true, `Tu as eu le laser allumé hors de son support${etat.dangers > 1 ? `, ${etat.dangers} fois` : ""} : son faisceau est parti dans la salle, à hauteur des yeux. On fixe le laser face à l'écran avant de l'allumer, et on l'éteint avant de le déplacer.`);
  if (!etat.distance) faute("distance", sansDistance, "Tu n'as pas noté la distance entre la diapositive et l'écran.");
  else if (ecran !== null) {
    const ecart = Math.abs(etat.distance.v - ecran);
    if (ecart > 0.1001) faute("distance", ecart > 1, etat.distance.ecran !== ecran && Math.abs(etat.distance.v - etat.distance.ecran) <= 0.1001
      ? `Tu as noté D = ${enCm(etat.distance.v)}, puis tu as déplacé l'écran : pendant ta mesure, il était en face de ${enCm(ecran)}. Lis la distance une fois l'écran en place, et n'y touche plus.`
      : `Tu as noté D = ${enCm(etat.distance.v)} ; le repère de l'écran était en face de ${enCm(ecran)}. Lis la graduation en face du repère, à la loupe.`);
  }
}

function bilanEtalonnage(r: ReglagesDiffraction, but: ButEtalonnage, etat: EtatDiffraction): BilanPaillasse {
  const fautes: Faute[] = [];
  const faute = (code: string, grave: boolean, texte: string) => fautes.push({ code, grave, texte });
  const voulues = [...but.fentes, but.inconnue].flatMap((id) => { const d = diapositive(r, id); return d ? [d] : []; });
  const retenues = voulues.map((d) => ({ d, m: derniere(etat, (m) => m.diapo === d.id) }));
  const faites = retenues.flatMap((x) => (x.m ? [{ d: x.d, m: x.m }] : []));
  const ecran = faites.length > 0 ? faites[faites.length - 1].m.ecran : null;

  if (faites.length === 0) faute("mesures", true, "Tu n'as noté aucune largeur de tache : la manipulation n'est pas faite.");
  else {
    // ----- les mesures qui manquent -----
    const manquantes = retenues.filter((x) => !x.m).map((x) => x.d);
    const inconnue = manquantes.find((d) => d.id === but.inconnue);
    if (inconnue) faute("mesures", true, `Tu n'as pas mesuré la tache centrale que donne ${inconnue.nom} : c'est elle qu'on cherche.`);
    const fentes = manquantes.filter((d) => d.id !== but.inconnue);
    if (fentes.length > 0) faute(inconnue ? "etalonnage" : "mesures", fentes.length > 1, `Il manque la mesure de ${fentes.map((d) => d.nom).join(", de ")} : l'étalonnage se fait avec toutes les fentes de largeur connue.`);
    // ----- une mesure sans figure -----
    const aveugle = faites.find((x) => !x.m.figure);
    if (aveugle) faute("figure", true, `Tu as noté une largeur pour ${aveugle.d.nom} alors que le laser n'éclairait pas la diapositive : il n'y avait pas de figure sur l'écran.`);
    // ----- les curseurs sur les deux premières extinctions, puis la lecture : on juge la plus fausse -----
    let pointee: { poids: number; grave: boolean; texte: string } | null = null;
    let lue: { ecart: number; texte: string } | null = null;
    for (const { d, m } of faites) {
      if (!m.figure) continue;
      const tache = tacheCentrale(r.lambda, d.a, m.ecran);
      const ecart = Math.abs(ecartDes(m) - tache);
      if (ecart > Math.max(0.8, 0.04 * tache) && (!pointee || ecart / tache > pointee.poids)) {
        pointee = { poids: ecart / tache, grave: ecart > Math.max(2, 0.1 * tache), texte: `Pour ${d.nom}, tes curseurs étaient écartés de ${enMm(ecartDes(m))} ; la tache centrale, d'une extinction à l'autre, mesurait ${enMm(tache)}. Pose chaque curseur au milieu de la zone sombre qui borde la tache centrale.` };
      }
      const lecture = Math.abs(m.v - ecartDes(m));
      if (lecture > 0.6001 && (!lue || lecture > lue.ecart)) lue = { ecart: lecture, texte: `Pour ${d.nom}, tu as noté ${enMm(m.v)} ; tes curseurs étaient écartés de ${enMm(ecartDes(m))}. Lis la graduation en face de chaque curseur, puis fais la différence.` };
    }
    if (pointee) faute("pointage", pointee.grave, pointee.texte);
    if (lue) faute("lecture", lue.ecart > 2, lue.texte);
    // ----- l'écran ne bouge pas pendant l'étalonnage -----
    const positions = faites.map((x) => x.m.ecran);
    const [pres, loin] = [Math.min(...positions), Math.max(...positions)];
    if (loin - pres > 0.5) faute("ecran", (loin - pres) / loin > 0.03, `Tu as déplacé l'écran entre tes mesures : de ${enCm(pres)} à ${enCm(loin)}. La largeur de la tache dépend de la distance : tout l'étalonnage se fait sans toucher à l'écran.`);
  }
  fautesCommunes(etat, ecran, false, faute);

  // ----- ce que l'élève emporte : ses lectures, ou celles du professeur pour les mesures qui manquent -----
  const D = etat.distance?.v ?? ecran ?? but.distance;
  const mesures: Record<string, number> = {};
  const lignes: string[] = faites.length === 0 ? ["Sans mesure notée, on continue avec celles du professeur."] : [];
  retenues.forEach(({ d, m }, k) => {
    const cle = d.id === but.inconnue ? "Lx" : `L${k + 1}`;
    // le professeur mesure là où était l'écran de l'élève ; sans aucune mesure, à la distance que l'élève emporte
    mesures[cle] = m?.v ?? Math.round(2 * tacheCentrale(r.lambda, d.a, ecran ?? D)) / 2;
    lignes.push(`${Maj(d.nom)}${m ? "" : ", mesure du professeur"} : tache centrale de ${enMm(mesures[cle])}.`);
  });
  mesures.D = D;
  lignes.push(`Distance de la diapositive à l'écran${etat.distance ? "" : ", donnée par le professeur"} : D = ${enCm(D)}.`);
  return { score: faites.length === 0 ? 0 : scoreDesFautes(fautes), fautes, mesures, lignes };
}

function bilanYoung(r: ReglagesDiffraction, but: ButYoung, etat: EtatDiffraction): BilanPaillasse {
  const fautes: Faute[] = [];
  const faute = (code: string, grave: boolean, texte: string) => fautes.push({ code, grave, texte });
  const retenue = derniere(etat, (m) => diapositive(r, m.diapo)?.genre === "young");
  const fentes = diapositive(r, retenue?.diapo ?? null);
  const autre = derniere(etat, () => true);

  if (!autre) faute("mesures", true, "Tu n'as noté aucune mesure : la manipulation n'est pas faite.");
  else if (!retenue || !fentes) {
    const d = diapositive(r, autre.diapo);
    faute("diapositive", true, d ? `Tu as mesuré avec ${d.nom} : elle ne donne pas de franges d'interférences. Il faut une diapositive à deux fentes.` : "Tu as mesuré sans diapositive dans le support : il faut une diapositive à deux fentes pour obtenir des franges.");
  } else if (!retenue.figure) faute("figure", true, "Tu as noté une mesure alors que le laser n'éclairait pas la diapositive : il n'y avait pas de franges sur l'écran.");
  else {
    const i = interfrange(r.lambda, fentes.b, retenue.ecran);
    const ecart = ecartDes(retenue);
    const entre = ecart / i;
    const compte = Math.round(entre);
    const erreur = Math.abs(retenue.v / retenue.n - i) / i;
    const peu = compte < 4 ? ` Tu n'as mesuré que ${compte} interfrange${compte > 1 ? "s" : ""} : à cette échelle, un demi-millimètre d'erreur pèse ${nombre((100 * 0.5) / Math.max(ecart, 0.5), 0)} %. Mesure le plus d'interfranges possible d'un coup, puis divise.` : "";
    if (retenue.n !== compte) {
      faute("comptage", true, `Entre tes deux curseurs, il y avait ${compte} interfrange${compte > 1 ? "s" : ""}, pas ${retenue.n}.${retenue.n === compte + 1 ? " Tu as compté les franges : entre deux franges voisines, il n'y a qu'un interfrange." : ""} Compte les intervalles d'un curseur à l'autre.`);
    } else if (erreur > PRECIS) {
      const lecture = Math.abs(retenue.v - ecart);
      const pointage = Math.abs(entre - compte) * i;
      if (lecture > 0.6001 && lecture >= pointage) faute("lecture", erreur > IMPRECIS, `Tu as noté ${enMm(retenue.v)} ; tes curseurs étaient écartés de ${enMm(ecart)}. Lis la graduation en face de chaque curseur, puis fais la différence.${peu}`);
      else faute("pointage", erreur > IMPRECIS, `Ton interfrange s'écarte de ${nombre(100 * erreur, 0)} % de celui de la figure : tes curseurs encadraient ${nombre(entre, 1)} interfranges, pas un nombre entier. Pose chaque curseur au milieu d'une frange sombre.${peu}`);
    } else if (compte < 4) {
      faute("methode", false, `Ta valeur est bonne, mais tu as eu de la chance.${peu}`);
    }
  }
  fautesCommunes(etat, retenue?.ecran ?? null, true, faute);

  // ----- ce que l'élève emporte -----
  const reference = fentes ?? r.boite.find((d) => d.genre === "young") ?? null;
  const b = reference?.b ?? 0.3;
  const D = etat.distance?.v ?? retenue?.ecran ?? but.distance;
  // sans mesure de l'élève, le professeur mesure dix interfranges à la distance que l'élève emporte
  const duProfesseur = Math.round(2 * 10 * interfrange(r.lambda, b, D)) / 2;
  const mesures = { x: retenue?.v ?? duProfesseur, n: retenue?.n ?? 10, D, b };
  const lignes = [
    retenue && reference ? `Avec ${reference.nom} : ${mesures.n} interfrange${mesures.n > 1 ? "s" : ""} sur ${enMm(mesures.x)}.` : `Mesure du professeur, avec ${reference?.nom ?? "deux fentes"} : ${mesures.n} interfranges sur ${enMm(mesures.x)}.`,
    `Distance des fentes à l'écran${etat.distance ? "" : ", donnée par le professeur"} : D = ${enCm(D)}.`,
  ];
  return { score: autre ? scoreDesFautes(fautes) : 0, fautes, mesures, lignes };
}

/** Le bilan de la manipulation : les largeurs et les distances retenues, et les fautes relevées par le professeur. */
const bilan = (r: ReglagesDiffraction, etat: EtatDiffraction): BilanPaillasse => (r.but.genre === "etalonnage" ? bilanEtalonnage(r, r.but, etat) : bilanYoung(r, r.but, etat));

export const regles: ReglesPaillasse<ReglagesDiffraction, EtatDiffraction> = { depart: (r) => ({ ...DEPART, ecran: r.ecran }), geste, bilan };
