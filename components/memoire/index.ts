// Le plateau de chaque jeu de mémoire, par identifiant. Ce fichier n'est pas un composant du navigateur :
// la page du serveur y lit le plateau à monter.
import type { ComponentType } from "react";
import type { PropsMemoire } from "@/lib/commun/memoire";

export const PLATEAUX: Record<string, ComponentType<PropsMemoire>> = {};
