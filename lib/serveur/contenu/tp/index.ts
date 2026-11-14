import "server-only";
import cheveu from "./cheveu";
import chute from "./chute";
import cinetique from "./cinetique";
import condensateur from "./condensateur";
import detartrant from "./detartrant";
import dilution from "./dilution";
import doppler from "./doppler";
import etalonnage from "./etalonnage";
import focale from "./focale";
import jauge from "./jauge";
import lunette from "./lunette";
import serum from "./serum";
import synthese from "./synthese";
import type { Tp } from "./types";
import ultrasons from "./ultrasons";
import vinaigre from "./vinaigre";
import young from "./young";

export * from "./types";

// Les TP de l'application, dans l'ordre de la page : la chimie, puis la physique. Chaque TP a son fichier.
// Seuls les TP relus et essayés sont inscrits ici. Un TP en construction a son fichier dans ce dossier, mais se met
// au point sur son banc de chantier : un fichier à moitié écrit ne doit jamais atteindre les pages des élèves.
export const TP: Tp[] = [detartrant, vinaigre, serum, dilution, etalonnage, cinetique, synthese, condensateur, jauge, focale, lunette, cheveu, young, ultrasons, doppler, chute];

export const tp = (id: string): Tp | null => TP.find((t) => t.id === id) ?? null;
