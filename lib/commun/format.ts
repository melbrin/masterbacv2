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
/** « 5 » ou « 5,5 » */
export const points = (x: number) => nombre(x, Number.isInteger(x) ? 0 : 1);
/** « 30 min », « 2 h », « 1 h 30 » */
export const duree = (min: number) => (min < 60 ? `${min} min` : `${Math.floor(min / 60)} h${min % 60 ? ` ${String(min % 60).padStart(2, "0")}` : ""}`);
export const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
export const p2 = (n: number) => String(n).padStart(2, "0");
