// Nombres, durées et dates à la française (docs/01-cahier-des-charges.md, section 5).
import { ecartEnJours, jourDeSemaine } from "./dates";

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

const quantieme = (jour: string) => { const j = Number(jour.slice(8, 10)); return j === 1 ? "1er" : String(j); };
const mois = (jour: string) => MOIS[Number(jour.slice(5, 7)) - 1];

/** « jeudi 19 novembre » */
export const dateLongue = (jour: string) => `${JOURS[jourDeSemaine(jour)]} ${quantieme(jour)} ${mois(jour)}`;
/** « 19 novembre » */
export const dateSimple = (jour: string) => `${quantieme(jour)} ${mois(jour)}`;
export const initialeJour = (jour: string) => ["D", "L", "M", "M", "J", "V", "S"][jourDeSemaine(jour)];

/** « aujourd'hui », « demain », « hier », sinon la date. */
export function quand(aujourdhui: string, jour: string): string {
  const n = ecartEnJours(aujourdhui, jour);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return "demain";
  if (n === -1) return "hier";
  return n > 1 && n < 7 ? dateLongue(jour) : dateSimple(jour);
}

/** « 13,5 » */
export const nombre = (x: number, decimales = 1) => x.toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
/** Un nombre qui peut être négatif, avec le vrai signe moins : « −3,43 ». Un zéro ne porte jamais de signe : « 0,00 ». */
export function nombreRelatif(x: number, decimales = 1): string {
  const texte = nombre(Math.abs(x), decimales);
  return x < 0 && /[1-9]/.test(texte) ? `−${texte}` : texte;
}
const EXPOSANTS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** Un nombre en écriture scientifique, avec deux chiffres : « 1,0 × 10⁻² », « 2,5 × 10⁻⁴ ». Entre 1 et 10, la puissance ne s'écrit pas. */
export function puissanceDeDix(x: number, chiffres = 2): string {
  if (!(x > 0) || !Number.isFinite(x)) return nombre(0, chiffres - 1);
  let exposant = Math.floor(Math.log10(x));
  let mantisse = x / 10 ** exposant;
  // 9,96 s'arrondit à 10,0 : la puissance monte d'un cran
  if (Number(mantisse.toFixed(chiffres - 1)) >= 10) { mantisse /= 10; exposant += 1; }
  if (exposant === 0) return nombre(mantisse, chiffres - 1);
  const haut = `${exposant < 0 ? "⁻" : ""}${[...String(Math.abs(exposant))].map((c) => EXPOSANTS[Number(c)]).join("")}`;
  return `${nombre(mantisse, chiffres - 1)}\u00a0×\u00a010${haut}`;
}
/** « 5 » ou « 5,5 » */
export const points = (x: number) => nombre(x, Number.isInteger(x) ? 0 : 1);
/** « 30 min », « 2 h », « 1 h 30 » */
export const duree = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${String(min % 60).padStart(2, "0")}` : ""}`);
export const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
export const p2 = (n: number) => String(n).padStart(2, "0");

/** « première », « 2e », « 30e » : le rang d'une séance dans une phrase (« ta 30e séance »). */
export const rangFeminin = (n: number) => (n === 1 ? "première" : `${n}e`);

/**
 * L'étiquette d'une question tombée au bac, avec les années quand la fiche les donne :
 * « Demandé en 2025 et 2026 » devient « Tombé au BAC 2025 et 2026 ». Sans année connue : « Tombé au BAC ».
 */
export function etiquetteBac(demande: string): string {
  const annees = [...new Set(demande.match(/\b20\d\d\b/g) ?? [])].sort();
  if (!annees.length) return "Tombé au BAC";
  return `Tombé au BAC ${annees.length > 2 ? `${annees.slice(0, -1).join(", ")} et ${annees[annees.length - 1]}` : annees.join(" et ")}`;
}

/** L'étiquette d'un exercice construit d'après un sujet : « voir BAC Polynésie 2025 » devient « D'après le BAC Polynésie 2025 ». */
export function etiquetteDapres(voirBac: string): string {
  const sujet = voirBac.replace(/^voir\s+BAC\s*/i, "").trim();
  return sujet ? `D'après le BAC ${sujet}` : "D'après le BAC";
}

/**
 * Met une majuscule à la première lettre d'un texte déjà nettoyé, même derrière une balise de paragraphe ou de liste.
 * Une formule en tête de texte n'est pas touchée.
 */
export function majusculeInitiale(html: string): string {
  return html.replace(/^((?:\s|<(?:p|div|ul|ol|li|strong|em|b|i)(?:\s[^>]*)?>)*)(\p{Ll})/u, (_, avant: string, lettre: string) => avant + lettre.toLocaleUpperCase("fr-FR"));
}
