"use server";

import { regles as circuit } from "@/lib/commun/tp/paillasses/circuit";
import { regles as microcontroleur } from "@/lib/commun/tp/paillasses/microcontroleur";
import tpCondensateur from "@/lib/serveur/contenu/tp/condensateur";
import tpJauge from "@/lib/serveur/contenu/tp/jauge";
import { actionDeChantier } from "@/lib/serveur/tp-chantier";

// Le banc de chantier « circuits », en local seulement : il juge une manipulation avec les règles en construction.
export const essayerCircuits = actionDeChantier("circuits", { condensateur: tpCondensateur, jauge: tpJauge }, { circuit, microcontroleur });
