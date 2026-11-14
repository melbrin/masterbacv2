// Le registre des jeux de mémoire : leurs noms et leurs familles. Les plateaux sont dans components/memoire/.
import type { JeuMemoire } from "./types";

export * from "./types";

export const JEUX_MEMOIRE: JeuMemoire[] = [];

export const jeuMemoire = (id: string): JeuMemoire | null => JEUX_MEMOIRE.find((j) => j.id === id) ?? null;
