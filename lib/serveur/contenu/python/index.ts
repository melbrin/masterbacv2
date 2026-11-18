import "server-only";
import type { ExercicePython } from "@/lib/commun/python/types";
import { EXERCICES_BASES } from "./bases";
import { EXERCICES_CHIMIE } from "./chimie";
import { EXERCICES_ELECTRICITE } from "./electricite";
import { EXERCICES_ENERGIE } from "./energie";
import { EXERCICES_MECANIQUE } from "./mecanique";
import { EXERCICES_MESURE } from "./mesure";
import { EXERCICES_ONDES } from "./ondes";

// Les exercices du hub Python (décision 0016), dans l'ordre de la page du hub. Un énoncé, ses vérifications et sa
// solution sont du contenu : ils restent sur le serveur, qui les envoie au navigateur seulement pour un exercice
// qu'il peut montrer à ce compte (lib/serveur/python.ts). La solution ne part qu'à la demande de l'élève.
// Chaque exercice est rejoué avec le vrai Python dans tests/contenu/python.test.ts : la solution passe toutes les
// vérifications, le programme de départ n'en passe pas toutes.
export const EXERCICES_PYTHON: readonly ExercicePython[] = [
  ...EXERCICES_BASES,
  ...EXERCICES_MECANIQUE,
  ...EXERCICES_ENERGIE,
  ...EXERCICES_ELECTRICITE,
  ...EXERCICES_ONDES,
  ...EXERCICES_CHIMIE,
  ...EXERCICES_MESURE,
];

export const exercicePython = (id: string): ExercicePython | null => EXERCICES_PYTHON.find((e) => e.id === id) ?? null;
