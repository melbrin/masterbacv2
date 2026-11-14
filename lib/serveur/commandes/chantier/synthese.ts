"use server";

import { regles as ccm } from "@/lib/commun/tp/paillasses/ccm";
import { regles as reflux } from "@/lib/commun/tp/paillasses/reflux";
import tpSynthese from "@/lib/serveur/contenu/tp/synthese";
import { actionDeChantier } from "@/lib/serveur/tp-chantier";

// Le banc de chantier « synthese », en local seulement : il juge une manipulation avec les règles en construction.
export const essayerSynthese = actionDeChantier("synthese", { synthese: tpSynthese }, { ccm, reflux });
