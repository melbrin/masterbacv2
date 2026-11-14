import "server-only";
import archimede from "./archimede";
import calorimetrie from "./calorimetrie";
import cheveu from "./cheveu";
import chute from "./chute";
import cinetique from "./cinetique";
import condensateur from "./condensateur";
import detartrant from "./detartrant";
import dilution from "./dilution";
import doppler from "./doppler";
import electrolyse from "./electrolyse";
import etalonnage from "./etalonnage";
import focale from "./focale";
import jauge from "./jauge";
import lunette from "./lunette";
import pile from "./pile";
import synthese from "./synthese";
import ultrasons from "./ultrasons";
import vinaigre from "./vinaigre";
import young from "./young";
import type { Tp } from "./types";

export * from "./types";

// Tous les TP, dans l'ordre de la page : la chimie, puis la physique. Chaque TP a son fichier.
// Un TP en construction (`pret: false`) est inscrit ici, mais ne se montre nulle part.
export const TP: Tp[] = [
  detartrant, vinaigre, dilution, etalonnage, cinetique, pile, electrolyse, synthese,
  condensateur, jauge, focale, lunette, cheveu, young, ultrasons, doppler, chute, archimede, calorimetrie,
];

export const tp = (id: string): Tp | null => TP.find((t) => t.id === id) ?? null;
