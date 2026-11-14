"use server";

import { regles as ultrasons } from "@/lib/commun/tp/paillasses/ultrasons";
import { regles as pointage } from "@/lib/commun/tp/paillasses/pointage";
import { regles as doppler } from "@/lib/commun/tp/paillasses/doppler";
import tpUltrasons from "@/lib/serveur/contenu/tp/ultrasons";
import tpChute from "@/lib/serveur/contenu/tp/chute";
import tpDoppler from "@/lib/serveur/contenu/tp/doppler";
import { actionDeChantier } from "@/lib/serveur/tp-chantier";

// Le banc de chantier « ondes », en local seulement : il juge une manipulation avec les règles en construction.
export const essayerOndes = actionDeChantier("ondes", { ultrasons: tpUltrasons, chute: tpChute, doppler: tpDoppler }, { ultrasons, pointage, doppler });
