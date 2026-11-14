"use server";

import { regles as solutions } from "@/lib/commun/tp/paillasses/solutions";
import { regles as spectro } from "@/lib/commun/tp/paillasses/spectro";
import tpDilution from "@/lib/serveur/contenu/tp/dilution";
import tpEtalonnage from "@/lib/serveur/contenu/tp/etalonnage";
import tpCinetique from "@/lib/serveur/contenu/tp/cinetique";
import { actionDeChantier } from "@/lib/serveur/tp-chantier";

// Le banc de chantier « chimie », en local seulement : il juge une manipulation avec les règles en construction.
export const essayerChimie = actionDeChantier("chimie", { dilution: tpDilution, etalonnage: tpEtalonnage, cinetique: tpCinetique }, { solutions, spectro });
