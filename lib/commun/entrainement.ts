// La section « S'entraîner » et ses quatre sous-sections, dans l'ordre du menu : le labo (calculer, puis lancer une
// simulation), les TP (manipuler comme à l'ECE), la mémoire (des jeux pour retenir), les jeux de révision du cours.
// Le menu, le sous-menu, la page de la section et la page « Aujourd'hui » partent de cette liste.
import { JEUX_MEMOIRE } from "@/lib/commun/memoire";

export const ENTRAINEMENT = { nom: "S'entraîner", href: "/app/entrainement", phrase: "Calcule, manipule, retiens, joue." } as const;

export const SECTIONS = [
  { id: "labo", nom: "Labo", href: "/app/labo", phrase: "Calcule, puis lance la simulation." },
  { id: "tp", nom: "TP", href: "/app/tp", phrase: "Manipule comme à l'épreuve d'ECE." },
  { id: "memoire", nom: "Mémoire", href: "/app/memoire", phrase: "Quelques minutes par jour pour mieux retenir." },
  { id: "jeux", nom: "Jeux", href: "/app/jeux", phrase: "Revois ton cours en jouant." },
] as const;

export type Section = (typeof SECTIONS)[number];
export type IdSection = Section["id"];

const sous = (chemin: string, href: string): boolean => chemin === href || chemin.startsWith(`${href}/`);

/** La sous-section à laquelle une adresse appartient : sa page, ou une page intérieure (un défi, un essai de TP, un jeu). */
export const sectionDe = (chemin: string): IdSection | null => SECTIONS.find((s) => sous(chemin, s.href))?.id ?? null;

/** Vrai sur la page « S'entraîner » et dans ses quatre sous-sections : l'onglet du bas du téléphone y reste allumé. */
export const dansEntrainement = (chemin: string): boolean => sous(chemin, ENTRAINEMENT.href) || sectionDe(chemin) !== null;

/**
 * Les sous-sections qui ont quelque chose à montrer. Le labo et les TP dépendent de ce que le serveur peut montrer
 * à ce compte (un brouillon ne se montre qu'en local ou à l'administrateur) ; la mémoire, des jeux installés.
 * Les jeux de révision sont toujours là.
 */
export const sectionsOuvertes = (o: { labo: boolean; tp: boolean }): Section[] =>
  SECTIONS.filter((s) => (s.id !== "labo" || o.labo) && (s.id !== "tp" || o.tp) && (s.id !== "memoire" || JEUX_MEMOIRE.length > 0));
