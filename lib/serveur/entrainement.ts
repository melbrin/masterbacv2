import "server-only";
import { sectionsOuvertes, type IdSection } from "@/lib/commun/entrainement";
import { simulationsVisibles } from "@/lib/serveur/defis";
import { tpVisibles } from "@/lib/serveur/tp";

/** Les sous-sections de « S'entraîner » qui ont quelque chose à montrer à ce compte, dans l'ordre du menu. */
export const sectionsDe = (admin: boolean): IdSection[] =>
  sectionsOuvertes({ labo: simulationsVisibles(admin).length > 0, tp: tpVisibles(admin).length > 0 }).map((s) => s.id);
