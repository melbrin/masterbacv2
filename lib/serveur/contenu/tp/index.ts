import "server-only";
import condensateur from "./condensateur";
import detartrant from "./detartrant";
import jauge from "./jauge";
import serum from "./serum";
import synthese from "./synthese";
import type { Tp } from "./types";
import vinaigre from "./vinaigre";

export * from "./types";

// Les TP de l'application, dans l'ordre de la page : la chimie, puis la physique. Chaque TP a son fichier.
// Seuls les TP relus et essayés sont inscrits ici. Un TP en construction a son fichier dans ce dossier, mais se met
// au point sur son banc de chantier : un fichier à moitié écrit ne doit jamais atteindre les pages des élèves.
export const TP: Tp[] = [detartrant, vinaigre, serum, synthese, condensateur, jauge];

export const tp = (id: string): Tp | null => TP.find((t) => t.id === id) ?? null;
